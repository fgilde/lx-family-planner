$ErrorActionPreference = "Stop"

Write-Host "Building LX Family Planner Android APK ..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\.."

Write-Host "[1/3] Building Web Assets with Vite ..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    throw "Vite build failed."
}

Write-Host "[2/3] Syncing Capacitor Android Assets ..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    throw "Capacitor sync failed."
}

$jdkPath = "C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot"
if (Test-Path -LiteralPath $jdkPath) {
    $env:JAVA_HOME = $jdkPath
    $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
}

$hasReleaseSigning = (
    $env:LX_ANDROID_KEYSTORE -and
    $env:LX_ANDROID_STORE_PASSWORD -and
    $env:LX_ANDROID_KEY_ALIAS -and
    $env:LX_ANDROID_KEY_PASSWORD
)
$buildKind = if ($hasReleaseSigning) { "release" } else { "debug" }
$gradleTask = if ($hasReleaseSigning) { "assembleRelease" } else { "assembleDebug" }

Write-Host "[3/3] Compiling $buildKind APK with Gradle ..." -ForegroundColor Yellow
Push-Location "android"
try {
    & .\gradlew.bat $gradleTask
    if ($LASTEXITCODE -ne 0) {
        throw "Gradle build failed."
    }
} finally {
    Pop-Location
}

$apkSource = if ($hasReleaseSigning) {
    "android\app\build\outputs\apk\release\app-release.apk"
} else {
    "android\app\build\outputs\apk\debug\app-debug.apk"
}
if (-not (Test-Path -LiteralPath $apkSource)) {
    throw "APK file not found: $apkSource"
}

$gradle = Get-Content -LiteralPath "android\app\build.gradle" -Raw
$package = Get-Content -LiteralPath "package.json" -Raw | ConvertFrom-Json
$versionMatch = [regex]::Match($gradle, 'versionCode\s+(\d+)')
$versionCode = if ($versionMatch.Success) {
    [int]$versionMatch.Groups[1].Value
} else {
    1
}

$apkDirectory = "data\apk"
New-Item -ItemType Directory -Force -Path $apkDirectory | Out-Null
$apkDestination = Join-Path $apkDirectory "latest.apk"
Copy-Item -LiteralPath $apkSource -Destination $apkDestination -Force
Copy-Item -LiteralPath $apkSource -Destination "LX-Family-Planner.apk" -Force

$fileInfo = Get-Item -LiteralPath $apkDestination
$checksum = (Get-FileHash -LiteralPath $apkDestination -Algorithm SHA256).Hash.ToLowerInvariant()
$metadata = [ordered]@{
    versionName = [string]$package.version
    versionCode = $versionCode
    buildKind = $buildKind
    builtAt = $fileInfo.LastWriteTimeUtc.ToString("o")
    sha256 = $checksum
}
$metadataJson = $metadata | ConvertTo-Json
$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText(
    (Join-Path (Resolve-Path -LiteralPath $apkDirectory) "version.json"),
    $metadataJson,
    $utf8WithoutBom
)

Write-Host "`nSUCCESS: $buildKind Android APK created." -ForegroundColor Green
Write-Host "File: $((Get-Item -LiteralPath 'LX-Family-Planner.apk').FullName)" -ForegroundColor Cyan
Write-Host "Size: $([math]::Round($fileInfo.Length / 1MB, 2)) MB" -ForegroundColor Cyan
Write-Host "Server copy: $((Get-Item -LiteralPath $apkDestination).FullName)`n" -ForegroundColor Green
