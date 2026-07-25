[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot

Push-Location $projectRoot
try {
  docker compose down
  if ($LASTEXITCODE -ne 0) {
    throw 'Der Familienplaner konnte nicht sauber beendet werden.'
  }
  Write-Host 'LX Family Planner wurde beendet. Daten und Sicherungen bleiben erhalten.'
} finally {
  Pop-Location
}
