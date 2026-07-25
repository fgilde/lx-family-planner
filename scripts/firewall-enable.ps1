[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
$isAdministrator = $principal.IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdministrator) {
  $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  $process = Start-Process `
    -FilePath 'powershell.exe' `
    -ArgumentList $arguments `
    -Verb RunAs `
    -Wait `
    -PassThru
  exit $process.ExitCode
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$environmentFile = Join-Path $projectRoot '.env'
$hostPort = '3001'

if (Test-Path -LiteralPath $environmentFile) {
  $portLine = Get-Content -LiteralPath $environmentFile |
    Where-Object { $_ -match '^\s*HOST_PORT\s*=' } |
    Select-Object -Last 1
  if ($portLine) {
    $configuredPort = ($portLine -split '=', 2)[1].Trim()
    if ($configuredPort -match '^\d{1,5}$') {
      $hostPort = $configuredPort
    }
  }
}

$ruleName = 'LX Family Planner (privates Heimnetz)'
$existingRule = Get-NetFirewallRule `
  -DisplayName $ruleName `
  -ErrorAction SilentlyContinue
if ($existingRule) {
  $existingRule | Remove-NetFirewallRule
}

New-NetFirewallRule `
  -DisplayName $ruleName `
  -Description 'Erlaubt den Zugriff auf LX Family Planner ausschließlich in privaten Netzwerken.' `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort $hostPort `
  -Profile Private |
  Out-Null

Write-Host "Die private Heimnetzfreigabe für TCP-Port $hostPort ist aktiv."
