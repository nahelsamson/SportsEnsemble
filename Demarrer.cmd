@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js est necessaire pour ce lanceur. Tu peux aussi ouvrir index.html directement.
  pause
  exit /b 1
)
node server.cjs
pause
