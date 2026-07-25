[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot

Push-Location $projectRoot
try {
  docker compose exec -T family-planner node server/backup.js
  if ($LASTEXITCODE -ne 0) {
    throw 'Die Datenbanksicherung ist fehlgeschlagen.'
  }
  Write-Host 'Die Sicherung liegt im Ordner backups.'
} finally {
  Pop-Location
}
