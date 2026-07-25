[CmdletBinding()]
param(
  [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$dataDirectory = Join-Path $projectRoot 'data'
$backupDirectory = Join-Path $projectRoot 'backups'
$environmentFile = Join-Path $projectRoot '.env'
$sourceDatabase = Join-Path $projectRoot 'family_planner.sqlite'
$targetDatabase = Join-Path $dataDirectory 'family_planner.sqlite'
$legacyDatabase = Join-Path $projectRoot 'family_db.json'
$targetLegacyDatabase = Join-Path $dataDirectory 'family_db.json'

function Write-Utf8WithoutBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function New-AppSecret {
  $bytes = New-Object byte[] 48
  $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $generator.GetBytes($bytes)
  } finally {
    $generator.Dispose()
  }
  return [Convert]::ToBase64String($bytes)
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

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker wurde nicht gefunden. Bitte Docker Desktop installieren und starten.'
}

Push-Location $projectRoot
try {
  docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    throw 'Docker ist installiert, aber nicht gestartet. Bitte Docker Desktop öffnen.'
  }

  New-Item -ItemType Directory -Force -Path $dataDirectory, $backupDirectory |
    Out-Null

  if (-not (Test-Path -LiteralPath $environmentFile)) {
    $secret = New-AppSecret
    $content = @"
# Automatisch beim ersten Docker-Start erzeugt.
APP_SECRET=$secret
HOST_PORT=3001

# Optional: eigene, getrennte Schnittstelle für Automationen.
# AGENT_API_KEY=

# Optional: weitere freigegebene Rezeptseiten, kommagetrennt.
# RECIPE_HOSTS=chefkoch.de,www.chefkoch.de,lecker.de,www.lecker.de
"@
    Write-Utf8WithoutBom -Path $environmentFile -Content $content
    Write-Host 'Sichere lokale Konfiguration wurde in .env angelegt.'
  } else {
    $configuredSecret = Get-EnvironmentValue -Name 'APP_SECRET'
    if (
      [string]::IsNullOrWhiteSpace($configuredSecret) -or
      $configuredSecret -eq 'change-me-use-at-least-32-random-characters'
    ) {
      throw 'Bitte APP_SECRET in .env durch einen langen, zufälligen Wert ersetzen.'
    }
  }

  if (-not (Test-Path -LiteralPath $targetDatabase)) {
    if (Test-Path -LiteralPath $sourceDatabase) {
      $backupCreated = $false
      if (Get-Command node -ErrorAction SilentlyContinue) {
        & node --env-file-if-exists=.env server/backup.js
        if ($LASTEXITCODE -ne 0) {
          throw 'Die Sicherung der bisherigen Datenbank ist fehlgeschlagen.'
        }
        $latestBackup = Get-ChildItem -LiteralPath $backupDirectory -File -Filter '*.sqlite' |
          Sort-Object LastWriteTime -Descending |
          Select-Object -First 1
        if ($latestBackup) {
          Copy-Item -LiteralPath $latestBackup.FullName -Destination $targetDatabase
          $backupCreated = $true
        }
      }

      if (-not $backupCreated) {
        Copy-Item -LiteralPath $sourceDatabase -Destination $targetDatabase
        foreach ($suffix in @('-wal', '-shm')) {
          $sidecar = "$sourceDatabase$suffix"
          if (Test-Path -LiteralPath $sidecar) {
            Copy-Item -LiteralPath $sidecar -Destination "$targetDatabase$suffix"
          }
        }
      }
      Write-Host 'Der vorhandene Familienbestand wurde in den Docker-Datenordner übernommen.'
    } elseif (
      (Test-Path -LiteralPath $legacyDatabase) -and
      -not (Test-Path -LiteralPath $targetLegacyDatabase)
    ) {
      Copy-Item -LiteralPath $legacyDatabase -Destination $targetLegacyDatabase
      Write-Host 'Die bisherige JSON-Datenbank wird beim ersten Containerstart importiert.'
    }
  }

  $composeArguments = @('compose', 'up', '-d', '--remove-orphans')
  if (-not $SkipBuild) {
    $composeArguments += '--build'
  }
  & docker @composeArguments
  if ($LASTEXITCODE -ne 0) {
    throw 'Der Docker-Container konnte nicht gestartet werden.'
  }

  $hostPort = Get-EnvironmentValue -Name 'HOST_PORT' -Fallback '3001'
  $isHealthy = $false
  for ($attempt = 0; $attempt -lt 30; $attempt += 1) {
    try {
      $health = Invoke-RestMethod `
        -Uri "http://127.0.0.1:$hostPort/api/health" `
        -Method Get `
        -TimeoutSec 2
      if ($health.success -eq $true) {
        $isHealthy = $true
        break
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  if (-not $isHealthy) {
    docker compose logs --tail 80 family-planner
    throw 'Der Container läuft, aber der Gesundheitscheck antwortet noch nicht.'
  }

  $networkAddress = "http://DEINE-PC-IP:$hostPort"
  try {
    $defaultRoute = Get-NetRoute `
      -DestinationPrefix '0.0.0.0/0' `
      -ErrorAction Stop |
      Sort-Object RouteMetric, InterfaceMetric |
      Select-Object -First 1
    $localAddress = Get-NetIPAddress `
      -InterfaceIndex $defaultRoute.InterfaceIndex `
      -AddressFamily IPv4 `
      -ErrorAction Stop |
      Where-Object {
        $_.IPAddress -notlike '169.254.*' -and
        $_.IPAddress -ne '127.0.0.1'
      } |
      Select-Object -ExpandProperty IPAddress -First 1
    if ($localAddress) {
      $networkAddress = "http://${localAddress}:$hostPort"
    }
  } catch {
    # Die App läuft trotzdem; die Adresse kann über ipconfig ermittelt werden.
  }

  Write-Host ''
  Write-Host 'LX Family Planner läuft.'
  Write-Host "Auf diesem PC: http://localhost:$hostPort"
  Write-Host "Im Heimnetz:   $networkAddress"
  Write-Host ''
  docker compose ps
} finally {
  Pop-Location
}
