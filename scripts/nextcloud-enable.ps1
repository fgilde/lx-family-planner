[CmdletBinding()]
param(
  [int]$Port = 8080,
  [string]$AdminUser = 'familyadmin',
  [switch]$NoStart
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$environmentFile = Join-Path $projectRoot '.env'
$exampleFile = Join-Path $projectRoot '.env.example'

function New-RandomSecret {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  return [Convert]::ToHexString($bytes).ToLowerInvariant()
}

function Get-EnvironmentValue {
  param([Parameter(Mandatory = $true)][string]$Name)
  if (-not (Test-Path -LiteralPath $environmentFile)) {
    return ''
  }
  $line = Get-Content -LiteralPath $environmentFile |
    Where-Object { $_ -match "^\s*$([Regex]::Escape($Name))\s*=" } |
    Select-Object -Last 1
  if (-not $line) {
    return ''
  }
  return ($line -split '=', 2)[1].Trim()
}

function Set-EnvironmentValue {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Value
  )
  $lines = @(
    if (Test-Path -LiteralPath $environmentFile) {
      Get-Content -LiteralPath $environmentFile
    }
  )
  $found = $false
  $updated = foreach ($line in $lines) {
    if ($line -match "^\s*$([Regex]::Escape($Name))\s*=") {
      if (-not $found) {
        "$Name=$Value"
        $found = $true
      }
    } else {
      $line
    }
  }
  if (-not $found) {
    $updated += "$Name=$Value"
  }
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllLines(
    $environmentFile,
    [string[]]$updated,
    $encoding
  )
}

function Ensure-RandomEnvironmentValue {
  param([Parameter(Mandatory = $true)][string]$Name)
  $current = Get-EnvironmentValue -Name $Name
  if (
    -not $current -or
    $current -eq 'disabled-profile' -or
    $current -like 'change-me*'
  ) {
    $current = New-RandomSecret
    Set-EnvironmentValue -Name $Name -Value $current
  }
  return $current
}

if (-not (Test-Path -LiteralPath $environmentFile)) {
  Copy-Item -LiteralPath $exampleFile -Destination $environmentFile
}

$localAddress = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object {
    $_.IPAddress -notlike '127.*' -and
    $_.IPAddress -notlike '169.254.*'
  } |
  Sort-Object InterfaceMetric |
  Select-Object -First 1 -ExpandProperty IPAddress

$trustedDomains = @('localhost', 'nextcloud', $env:COMPUTERNAME)
if ($localAddress) {
  $trustedDomains += $localAddress
}
$trustedDomains = ($trustedDomains | Where-Object { $_ } | Select-Object -Unique) -join ' '
$publicUrl = Get-EnvironmentValue -Name 'NEXTCLOUD_PUBLIC_URL'
if (-not $publicUrl -and $localAddress) {
  $publicUrl = "http://${localAddress}:$Port"
}

Set-EnvironmentValue -Name 'COMPOSE_PROFILES' -Value 'nextcloud'
Set-EnvironmentValue -Name 'NEXTCLOUD_PORT' -Value ([string]$Port)
if ($publicUrl) {
  Set-EnvironmentValue -Name 'NEXTCLOUD_PUBLIC_URL' -Value $publicUrl
}
Set-EnvironmentValue -Name 'NEXTCLOUD_ADMIN_USER' -Value $AdminUser
Set-EnvironmentValue -Name 'NEXTCLOUD_TRUSTED_DOMAINS' -Value $trustedDomains
$adminPassword = Ensure-RandomEnvironmentValue -Name 'NEXTCLOUD_ADMIN_PASSWORD'
$null = Ensure-RandomEnvironmentValue -Name 'NEXTCLOUD_DB_PASSWORD'
$null = Ensure-RandomEnvironmentValue -Name 'NEXTCLOUD_DB_ROOT_PASSWORD'
$null = Ensure-RandomEnvironmentValue -Name 'NEXTCLOUD_REDIS_PASSWORD'

Write-Host ''
Write-Host 'Nextcloud wurde sicher für den Docker-Stack vorbereitet.'
Write-Host "Benutzer: $AdminUser"
Write-Host "Einmaliges Startpasswort: $adminPassword"
Write-Host 'Das Passwort steht zusätzlich geschützt in der lokalen .env-Datei.'
Write-Host ''

if (-not $NoStart) {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker wurde nicht gefunden.'
  }
  Push-Location $projectRoot
  try {
    & docker compose up -d --build
    if ($LASTEXITCODE -ne 0) {
      throw 'Der Docker-Stack konnte nicht gestartet werden.'
    }

    Write-Host 'Die Nextcloud-Ersteinrichtung wird abgeschlossen ...'
    $ready = $false
    for ($attempt = 1; $attempt -le 60; $attempt++) {
      $status = & docker compose exec -T --user www-data nextcloud `
        php occ status --output=json 2>$null
      if ($LASTEXITCODE -eq 0 -and ($status -join '') -match '"installed":true') {
        $ready = $true
        break
      }
      Start-Sleep -Seconds 5
    }
    if (-not $ready) {
      & docker compose ps
      throw 'Nextcloud wurde nicht innerhalb von fünf Minuten bereit.'
    }

    $enabledApps = & docker compose exec -T --user www-data nextcloud `
      php occ app:list --enabled 2>$null
    if (($enabledApps -join "`n") -notmatch '(?m)^\s*-\s+calendar:') {
      Write-Host 'Die Nextcloud-Kalenderoberfläche wird installiert ...'
      & docker compose exec -T --user www-data nextcloud `
        php occ app:install calendar --no-interaction
      if ($LASTEXITCODE -ne 0) {
        Write-Warning (
          'Die zusätzliche Kalenderoberfläche konnte noch nicht installiert ' +
          'werden. Der CalDAV-Abgleich von LX Family bleibt verfügbar.'
        )
      }
    }
    & docker compose exec -T --user www-data nextcloud `
      php occ background:cron | Out-Null
  } finally {
    Pop-Location
  }
  $hostName = if ($localAddress) { $localAddress } else { 'localhost' }
  Write-Host "Nextcloud ist vollständig bereit: http://${hostName}:$Port"
}
