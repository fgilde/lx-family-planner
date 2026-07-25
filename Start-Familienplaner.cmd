@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\docker-start.ps1"
set "result=%errorlevel%"
echo.
pause
exit /b %result%
