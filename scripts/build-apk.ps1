$ErrorActionPreference = "Stop"

Write-Host "Building LX Family Planner Android APK ..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\.."

$googleServicesFile = "android\app\google-services.json"
if (-not (Test-Path -LiteralPath $googleServicesFile)) {
    throw @"
Native Android push is not configured.
Download google-services.json for package com.lxfamily.planner from Firebase
and save it as android\app\google-services.json.
See README.md: Native Android-Benachrichtigungen.
"@
}
try {
    $googleServices = Get-Content -LiteralPath $googleServicesFile -Raw |
        ConvertFrom-Json
    $androidClient = @(
        $googleServices.client |
            Where-Object {
                $_.client_info.android_client_info.package_name -eq
                    "com.lxfamily.planner"
            }
    )
    if (-not $androidClient.Count) {
        throw "Firebase file does not contain com.lxfamily.planner."
    }
} catch {
    throw "google-services.json is invalid: $($_.Exception.Message)"
}

Write-Host "[1/3] Building Web Assets with Vite ..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    throw "Vite build failed."
}

# The public download APK belongs to the web server, not inside the Android app
# itself. Removing it from the generated web bundle prevents recursive APK growth
# when a new mobile release is built from an existing release.
$distDirectory = (Resolve-Path -LiteralPath "dist").Path
$capacitorApkBundle = Join-Path $distDirectory "apk"
if (
    (Test-Path -LiteralPath $capacitorApkBundle) -and
    $capacitorApkBundle.StartsWith(
        "$distDirectory$([System.IO.Path]::DirectorySeparatorChar)",
        [System.StringComparison]::OrdinalIgnoreCase
    )
) {
    Remove-Item -LiteralPath $capacitorApkBundle -Recurse -Force
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

function New-SecureSigningPassword {
    $bytes = New-Object byte[] 36
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
    } finally {
        $generator.Dispose()
    }
    $encoded = [Convert]::ToBase64String($bytes)
    return $encoded.TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

$localSigningDirectory = "data\android-signing"
$localSigningConfig = Join-Path $localSigningDirectory "signing.json"
$localKeystore = Join-Path $localSigningDirectory "lx-family-release.jks"
$environmentSigningConfigured = (
    $env:LX_ANDROID_KEYSTORE -and
    $env:LX_ANDROID_STORE_PASSWORD -and
    $env:LX_ANDROID_KEY_ALIAS -and
    $env:LX_ANDROID_KEY_PASSWORD
)

if (-not $environmentSigningConfigured) {
    New-Item -ItemType Directory -Force -Path $localSigningDirectory |
        Out-Null

    if (
        (Test-Path -LiteralPath $localSigningConfig) -and
        (Test-Path -LiteralPath $localKeystore)
    ) {
        $savedSigning = Get-Content -LiteralPath $localSigningConfig -Raw |
            ConvertFrom-Json
    } else {
        $signingPassword = New-SecureSigningPassword
        $signingAlias = "lx-family"
        $keytool = if ($env:JAVA_HOME) {
            Join-Path $env:JAVA_HOME "bin\keytool.exe"
        } else {
            "keytool"
        }
        & $keytool `
            -genkeypair `
            -keystore $localKeystore `
            -storepass $signingPassword `
            -keypass $signingPassword `
            -alias $signingAlias `
            -keyalg RSA `
            -keysize 4096 `
            -validity 10000 `
            -dname "CN=LX Family Planner, OU=LaxX Lab, O=LaxX Lab, C=DE"
        if ($LASTEXITCODE -ne 0) {
            throw "Android release signing key could not be created."
        }
        $savedSigning = [ordered]@{
            storePassword = $signingPassword
            keyAlias = $signingAlias
            keyPassword = $signingPassword
        }
        $signingJson = $savedSigning | ConvertTo-Json
        $signingUtf8 = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText(
            (Join-Path (Resolve-Path -LiteralPath $localSigningDirectory) "signing.json"),
            $signingJson,
            $signingUtf8
        )
        Write-Host "A private release signing key was created in data/android-signing." -ForegroundColor Green
        Write-Host "Back up this directory securely. Future app updates need the same key." -ForegroundColor Yellow
    }

    $env:LX_ANDROID_KEYSTORE = (
        Resolve-Path -LiteralPath $localKeystore
    ).Path
    $env:LX_ANDROID_STORE_PASSWORD = [string]$savedSigning.storePassword
    $env:LX_ANDROID_KEY_ALIAS = [string]$savedSigning.keyAlias
    $env:LX_ANDROID_KEY_PASSWORD = [string]$savedSigning.keyPassword
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

$publicApkDirectory = "public\apk"
New-Item -ItemType Directory -Force -Path $publicApkDirectory | Out-Null
Copy-Item -LiteralPath $apkSource -Destination (
    Join-Path $publicApkDirectory "latest.apk"
) -Force
[System.IO.File]::WriteAllText(
    (Join-Path (Resolve-Path -LiteralPath $publicApkDirectory) "version.json"),
    $metadataJson,
    $utf8WithoutBom
)

Write-Host "`nSUCCESS: $buildKind Android APK created." -ForegroundColor Green
Write-Host "File: $((Get-Item -LiteralPath 'LX-Family-Planner.apk').FullName)" -ForegroundColor Cyan
Write-Host "Size: $([math]::Round($fileInfo.Length / 1MB, 2)) MB" -ForegroundColor Cyan
Write-Host "Server copy: $((Get-Item -LiteralPath $apkDestination).FullName)`n" -ForegroundColor Green
Write-Host "Landing-page copy: $((Get-Item -LiteralPath 'public\apk\latest.apk').FullName)`n" -ForegroundColor Green
