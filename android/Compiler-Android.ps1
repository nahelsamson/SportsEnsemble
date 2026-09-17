param()
$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$env:GRADLE_USER_HOME = Join-Path $project '.tools/gradle'
$env:ANDROID_USER_HOME = Join-Path $project '.private/android-user'
$env:ANDROID_SDK_HOME = $null
if (Test-Path (Join-Path $project '.tools/android-sdk')) { $env:ANDROID_HOME = Join-Path $project '.tools/android-sdk' }
if (-not (Test-Path (Join-Path $PSScriptRoot 'gradlew.bat'))) { throw 'Préparer les outils Android avant de compiler. Voir ANDROID.md.' }
$javaInfo = (& java -XshowSettings:properties -version 2>&1 | Out-String)
if ($javaInfo -match 'java.home = ([^\r\n]+)') { $env:JAVA_HOME = $Matches[1].Trim() }
Push-Location $PSScriptRoot
try {
    $arguments = @('--no-daemon', '--console=plain', ':app:assembleDebug', ':app:lintDebug')
    $addressFile = Join-Path $project 'mobile-server-url.txt'
    if (Test-Path $addressFile) {
        $address = [IO.File]::ReadAllText($addressFile).Trim()
        if ($address -match '^https://[a-z0-9.-]+(?::[0-9]{1,5})?$') { $arguments += "-PmobileServer=$address" }
    }
    & './gradlew.bat' @arguments
    if ($LASTEXITCODE -ne 0) { throw 'La compilation Android a échoué. Lire les erreurs ci-dessus.' }
    $apk = Join-Path $PSScriptRoot 'app/build/outputs/apk/debug/app-debug.apk'
    $ready = Join-Path $PSScriptRoot 'SportsEnsemble-Agenda.apk'
    $staging = Join-Path $PSScriptRoot 'SportsEnsemble-Agenda.apk.new'
    Copy-Item -LiteralPath $apk -Destination $staging -Force
    Move-Item -LiteralPath $staging -Destination $ready -Force
    Write-Host "APK prêt : $PSScriptRoot\SportsEnsemble-Agenda.apk"
} finally { Pop-Location }
