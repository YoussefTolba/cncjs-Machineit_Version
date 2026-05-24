@echo off
if /i not "%~1"=="__run" (
    start "CNCjs" cmd /k ""%~f0" __run"
    exit /b
)

cd /d "%~dp0"

set "NODE_ENV=development"
set "PENDANT_DIR=%CD%\pendants\phone"

echo Building CNCjs development files...
powershell -ExecutionPolicy Bypass -File scripts\build-dev.ps1
if errorlevel 1 (
    echo.
    echo Build failed.
    pause
    exit /b 1
)

echo Starting CNCjs web app on port 8080...
start "CNCjs Web App" cmd /k "npm run start-app-dev"

echo Starting CNCjs server on port 8000...
echo Choose the working network address from the list CNCjs prints below.
echo Phone pendant will be available at /pendant/
echo Autolevel extension is embedded in the CNCjs workspace.
echo Leave this window open while using CNCjs.
echo.

node .\bin\cncjs --port 8000 --mount /pendant:"%PENDANT_DIR%"
