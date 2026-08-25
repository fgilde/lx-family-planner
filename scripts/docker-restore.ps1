[CmdletBinding()]
param(
  [string]$BackupFile = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backupDirectory = Join-Path $projectRoot 'backups'
$serviceWasRunning = $false
$restoreFinished = $false

if ($BackupFile) {
  if (
    [System.IO.Path]::GetFileName($BackupFile) -ne $BackupFile -or
    $BackupFile -notmatch '^family-planner-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.sqlite$'
  ) {
    throw 'Bitte nur den Dateinamen einer LX-Sicherung aus backups angeben.'
  }
  if (-not (Test-Path -LiteralPath (Join-Path $backupDirectory $BackupFile))) {
    throw 'Die ausgewählte Sicherung wurde im Backup-Ordner nicht gefunden.'
  }
}

Push-Location $projectRoot
try {
  $containerId = (& docker compose ps -q family-planner).Trim()
  if ($LASTEXITCODE -ne 0) {
    throw 'Docker Compose ist nicht erreichbar.'
  }
  if ($containerId) {
    $serviceWasRunning = $true
    Write-Host 'LX Family wird für die Wiederherstellung angehalten ...'
    & docker compose stop family-planner
    if ($LASTEXITCODE -ne 0) {
      throw 'LX Family konnte nicht angehalten werden.'
    }
  }

  $restoreArguments = @(
    'compose', 'run', '--rm', '--no-deps', 'family-planner',
    'node', 'server/backup.js', '--restore'
  )
  if ($BackupFile) {
    $restoreArguments += "/app/backups/$BackupFile"
  }
  $restoreArguments += '--confirm-stopped'
  & docker @restoreArguments
  if ($LASTEXITCODE -ne 0) {
    throw 'Die geprüfte Datenbank-Wiederherstellung ist fehlgeschlagen.'
  }

  Write-Host 'LX Family wird mit der wiederhergestellten Datenbank gestartet ...'
  & docker compose up -d --no-build family-planner
  if ($LASTEXITCODE -ne 0) {
    throw 'LX Family konnte nach der Wiederherstellung nicht gestartet werden.'
  }
  $serviceWasRunning = $false
  $restoreFinished = $true
  Write-Host 'Wiederherstellung erfolgreich. Die vorherige Datenbank wurde zusätzlich in backups gesichert.'
} finally {
  if ($serviceWasRunning) {
    & docker compose up -d --no-build family-planner | Out-Null
  }
  if (-not $restoreFinished) {
    Write-Warning 'Wiederherstellung abgebrochen; die vorherige Datenbank bleibt erhalten.'
  }
  Pop-Location
}
