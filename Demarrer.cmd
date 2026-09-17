@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Installe Node.js 22 ou plus recent depuis https://nodejs.org puis relance ce fichier.
  goto :echec
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)"
if errorlevel 1 (
  echo Cette version de Node.js est trop ancienne. Installe Node.js 22 ou plus recent.
  goto :echec
)
where npm >nul 2>nul
if errorlevel 1 (
  echo npm est introuvable. Reinstalle Node.js avec npm puis relance ce fichier.
  goto :echec
)
node -e "require('mongodb'); require.resolve('leaflet/dist/leaflet.js'); require.resolve('leaflet/dist/leaflet.css')" >nul 2>nul
if errorlevel 1 goto :installer
call npm ls --omit=dev --depth=0 >nul 2>nul
if errorlevel 1 goto :installer
goto :demarrer

:installer
echo Installation des dependances du site. Une connexion Internet est necessaire.
call npm ci --no-audit --no-fund
if errorlevel 1 (
  echo Installation interrompue. Verifie Internet et les messages ci-dessus, puis relance ce fichier.
  goto :echec
)

:demarrer
node server.cjs
set "sports_exit_code=%errorlevel%"
pause
exit /b %sports_exit_code%

:echec
pause
exit /b 1
