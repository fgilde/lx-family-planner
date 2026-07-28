@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\nextcloud-enable.ps1"
if errorlevel 1 (
  echo.
  echo Nextcloud konnte nicht aktiviert werden.
  pause
  exit /b 1
)
echo.
echo Fertig. Du kannst dieses Fenster schliessen.
pause
