param([string]$ServerUrl = 'https://sportsensemble-api.onrender.com')
$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$env:GRADLE_USER_HOME = Join-Path $project '.tools/gradle'
$env:ANDROID_USER_HOME = Join-Path $project '.private/android-user'
$env:ANDROID_SDK_HOME = $null
if (Test-Path (Join-Path $project '.tools/android-sdk')) { $env:ANDROID_HOME = Join-Path $project '.tools/android-sdk' }
if (-not (Test-Path (Join-Path $PSScriptRoot 'gradlew.bat'))) { throw 'Préparer les outils Android avant de compiler. Voir ANDROID.md.' }
$javaInfo = (& java -XshowSettings:properties -version 2>&1 | Out-String)
if ($javaInfo -match 'java.home = ([^\r\n]+)') { $env:JAVA_HOME = $Matches[1].Trim() }
$checkDirectory = Join-Path $project '.private/android-api-check'
New-Item -ItemType Directory -Force $checkDirectory | Out-Null
$androidJar = Join-Path $env:ANDROID_HOME 'platforms/android-36/android.jar'
& (Join-Path $env:JAVA_HOME 'bin/javac.exe') -encoding UTF-8 -cp $androidJar -d $checkDirectory (Join-Path $PSScriptRoot 'app/src/main/java/fr/sportsensemble/agenda/Api.java') (Join-Path $PSScriptRoot 'tests/ApiContractCheck.java')
if ($LASTEXITCODE -ne 0) { throw 'Compilation des tests Android impossible.' }
& (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp "$checkDirectory;$androidJar" fr.sportsensemble.agenda.ApiContractCheck
if ($LASTEXITCODE -ne 0) { throw 'Les tests du client Android ont échoué.' }
Push-Location $PSScriptRoot
try {
    if ($ServerUrl -notmatch '^https://[a-z0-9.-]+(?::[0-9]{1,5})?$') { throw 'ServerUrl doit être une origine HTTPS sans chemin.' }
    $arguments = @('--no-daemon', '--console=plain', ':app:assembleRelease', ':app:lintRelease', "-PmobileServer=$ServerUrl")
    & './gradlew.bat' @arguments
    if ($LASTEXITCODE -ne 0) { throw 'La compilation Android a échoué. Lire les erreurs ci-dessus.' }
    $apk = Join-Path $PSScriptRoot 'app/build/outputs/apk/release/app-release.apk'
    $ready = Join-Path $PSScriptRoot 'SportsEnsemble-Agenda.apk'
    $staging = Join-Path $PSScriptRoot 'SportsEnsemble-Agenda.apk.new'
    $expectedAndroidRoot = [IO.Path]::GetFullPath($PSScriptRoot) + [IO.Path]::DirectorySeparatorChar
    foreach ($apkPath in @($apk, $ready, $staging)) {
        if (-not [IO.Path]::GetFullPath($apkPath).StartsWith($expectedAndroidRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Chemin APK hors du projet Android.' }
    }
    Copy-Item -LiteralPath $apk -Destination $staging -Force
    Move-Item -LiteralPath $staging -Destination $ready -Force
    Write-Host "APK prêt : $PSScriptRoot\SportsEnsemble-Agenda.apk"
} finally { Pop-Location }
