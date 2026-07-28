[CmdletBinding()]
param(
  [switch]$SkipPull
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$dataDirectory = Join-Path $projectRoot 'data'
$backupDirectory = Join-Path $projectRoot 'backups'
$environmentFile = Join-Path $projectRoot '.env'
$databaseFile = Join-Path $dataDirectory 'family_planner.sqlite'
$rollbackImage = 'lx-family-planner:rollback'
$activeImage = 'lx-family-planner:local'
$expectedVersion = ''

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [Parameter(Mandatory = $true)][string]$FailureMessage
  )

  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw $FailureMessage
  }
}

function Get-EnvironmentValue {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [string]$Fallback = ''
  )

  if (-not (Test-Path -LiteralPath $environmentFile)) {
    return $Fallback
  }
  $line = Get-Content -LiteralPath $environmentFile |
    Where-Object { $_ -match "^\s*$([Regex]::Escape($Name))\s*=" } |
    Select-Object -Last 1
  if (-not $line) {
    return $Fallback
  }
  return ($line -split '=', 2)[1].Trim()
}

function Wait-FamilyPlanner {
  param(
    [Parameter(Mandatory = $true)][string]$HostPort,
    [int]$Attempts = 40,
    [string]$ExpectedVersion = ''
  )

  for ($attempt = 0; $attempt -lt $Attempts; $attempt += 1) {
    try {
      $health = Invoke-RestMethod `
        -Uri "http://127.0.0.1:$HostPort/api/health" `
        -Method Get `
        -TimeoutSec 2
      if (
        $health.success -eq $true -and
        (
          -not $ExpectedVersion -or
          [string]$health.version -eq $ExpectedVersion
        )
      ) {
        return $true
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  return $false
}

function Restore-DatabaseBackup {
  param(
    [Parameter(Mandatory = $true)][string]$BackupFile
  )

  $resolvedRoot = [System.IO.Path]::GetFullPath($projectRoot).TrimEnd('\')
  $resolvedData = [System.IO.Path]::GetFullPath($dataDirectory)
  $resolvedBackup = [System.IO.Path]::GetFullPath($BackupFile)
  if (
    -not $resolvedData.StartsWith(
      "$resolvedRoot\",
      [System.StringComparison]::OrdinalIgnoreCase
    )
  ) {
    throw 'Der Datenordner liegt unerwartet außerhalb des Projekts.'
  }
  if (
    -not $resolvedBackup.StartsWith(
      ([System.IO.Path]::GetFullPath($backupDirectory).TrimEnd('\') + '\'),
      [System.StringComparison]::OrdinalIgnoreCase
    )
  ) {
    throw 'Die ausgewählte Sicherung liegt nicht im Backup-Ordner.'
  }

  foreach ($target in @(
    $databaseFile,
    "$databaseFile-wal",
    "$databaseFile-shm"
  )) {
    if (Test-Path -LiteralPath $target) {
      Remove-Item -LiteralPath $target -Force
    }
  }
  Copy-Item -LiteralPath $resolvedBackup -Destination $databaseFile
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker wurde nicht gefunden.'
}

Push-Location $projectRoot
$serviceStopped = $false
$backupFile = ''
$previousImageId = ''
$hostPort = Get-EnvironmentValue -Name 'HOST_PORT' -Fallback '3001'
try {
  Invoke-Checked `
    -Command 'docker' `
    -Arguments @('info') `
    -FailureMessage 'Docker ist nicht erreichbar.'

  $containerId = (
    & docker compose ps -q family-planner
  ).Trim()
  if ($LASTEXITCODE -ne 0 -or -not $containerId) {
    throw 'Der Familienplaner läuft noch nicht. Bitte zuerst Start-Familienplaner.cmd ausführen.'
  }

  $previousImageId = (
    & docker inspect --format '{{.Image}}' $containerId
  ).Trim()
  if ($LASTEXITCODE -ne 0 -or -not $previousImageId) {
    throw 'Das aktuell laufende Programmabbild konnte nicht ermittelt werden.'
  }

  if (-not $SkipPull -and (Test-Path -LiteralPath (Join-Path $projectRoot '.git'))) {
    $trackedChanges = (& git status --porcelain --untracked-files=no)
    if ($LASTEXITCODE -ne 0) {
      throw 'Der Git-Status konnte nicht geprüft werden.'
    }
    if ($trackedChanges) {
      throw @'
Auf dem Server liegen lokale Änderungen an Programmdateien.
Das Update wurde sicherheitshalber abgebrochen. Bitte diese Änderungen zuerst sichern oder einchecken.
'@
    }
    Write-Host '1/6 Neue Programmversion abrufen ...'
    Invoke-Checked `
      -Command 'git' `
      -Arguments @('pull', '--ff-only') `
      -FailureMessage 'Die neue Version konnte nicht vollständig geladen werden.'
  } else {
    Write-Host '1/6 Git-Aktualisierung übersprungen.'
  }

  $expectedVersion = (
    Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') |
      ConvertFrom-Json
  ).version
  if (-not $expectedVersion) {
    throw 'Die Versionsnummer der neuen Programmversion konnte nicht gelesen werden.'
  }

  Write-Host '2/6 Bisherige Version für eine Rückkehr sichern ...'
  Invoke-Checked `
    -Command 'docker' `
    -Arguments @('tag', $previousImageId, $rollbackImage) `
    -FailureMessage 'Die bisherige Docker-Version konnte nicht vorgemerkt werden.'

  Write-Host '3/6 Neue Version bauen, während die App weiterläuft ...'
  Invoke-Checked `
    -Command 'docker' `
    -Arguments @('compose', 'build', '--pull', 'family-planner') `
    -FailureMessage 'Die neue Version konnte nicht gebaut werden. Die bisherige App läuft unverändert weiter.'

  Write-Host '4/6 App kurz anhalten und konsistente Sicherung erstellen ...'
  Invoke-Checked `
    -Command 'docker' `
    -Arguments @('compose', 'stop', 'family-planner') `
    -FailureMessage 'Der Familienplaner konnte nicht sauber angehalten werden.'
  $serviceStopped = $true

  $backupNamesBefore = @(
    Get-ChildItem -LiteralPath $backupDirectory -File -Filter '*.sqlite' |
      Select-Object -ExpandProperty Name
  )
  Invoke-Checked `
    -Command 'docker' `
    -Arguments @(
      'compose', 'run', '--rm', '--no-deps',
      'family-planner', 'node', 'server/backup.js'
    ) `
    -FailureMessage 'Die Sicherung vor dem Update ist fehlgeschlagen.'

  $newBackup = Get-ChildItem -LiteralPath $backupDirectory -File -Filter '*.sqlite' |
    Where-Object { $backupNamesBefore -notcontains $_.Name } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if (-not $newBackup) {
    throw 'Die neu erstellte Datenbanksicherung wurde nicht gefunden.'
  }
  $backupFile = $newBackup.FullName
  $manifestFile = "$backupFile.manifest.json"
  if (-not (Test-Path -LiteralPath $manifestFile)) {
    throw 'Das Prüfmanifest der Sicherung fehlt.'
  }
  $containerBackup = "/app/backups/$([System.IO.Path]::GetFileName($backupFile))"
  Invoke-Checked `
    -Command 'docker' `
    -Arguments @(
      'compose', 'run', '--rm', '--no-deps',
      'family-planner', 'node', 'server/updateSimulation.js',
      '--database', $containerBackup
    ) `
    -FailureMessage 'Die neue Version hat die sichere Update-Simulation nicht bestanden.'

  Write-Host '5/6 Neue Version starten ...'
  Invoke-Checked `
    -Command 'docker' `
    -Arguments @(
      'compose', 'up', '-d', '--no-build', '--remove-orphans'
    ) `
    -FailureMessage 'Die neue Version konnte nicht gestartet werden.'
  $serviceStopped = $false

  if (-not (
    Wait-FamilyPlanner `
      -HostPort $hostPort `
      -ExpectedVersion $expectedVersion
  )) {
    docker compose logs --tail 100 family-planner
    throw "Die erwartete Version $expectedVersion hat den Gesundheitscheck nicht bestanden."
  }

  Write-Host '6/6 Familieninhalte und Einstellungen vergleichen ...'
  $containerManifest = "/app/backups/$([System.IO.Path]::GetFileName($manifestFile))"
  Invoke-Checked `
    -Command 'docker' `
    -Arguments @(
      'compose', 'exec', '-T', 'family-planner',
      'node', 'server/dataIntegrity.js',
      '--compare', $containerManifest
    ) `
    -FailureMessage 'Die Datenprüfung nach dem Update hat Abweichungen gefunden.'

  Write-Host ''
  Write-Host 'Update erfolgreich.'
  Write-Host "Version: $expectedVersion"
  Write-Host "Sicherung: $backupFile"
  Write-Host "Familienplaner: http://localhost:$hostPort"
} catch {
  $updateError = $_
  Write-Warning $updateError.Exception.Message

  if ($serviceStopped -or $backupFile) {
    Write-Warning 'Die bisherige Version wird automatisch wiederhergestellt ...'
    & docker compose stop family-planner *> $null
    if ($backupFile) {
      Restore-DatabaseBackup -BackupFile $backupFile
    }
    if ($previousImageId) {
      & docker tag $previousImageId $activeImage
    }
    & docker compose up -d --no-build --remove-orphans
    if (-not (Wait-FamilyPlanner -HostPort $hostPort -Attempts 30)) {
      throw 'Update und automatische Wiederherstellung sind fehlgeschlagen. Die Sicherung liegt im Ordner backups.'
    }
    Write-Warning 'Die vorherige Version läuft wieder; die Datenbank wurde aus der Sicherung wiederhergestellt.'
  }
  throw $updateError
} finally {
  Pop-Location
}
