@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\firewall-enable.ps1"
set "result=%errorlevel%"
echo.
pause
exit /b %result%
