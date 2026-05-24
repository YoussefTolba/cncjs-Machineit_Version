@echo off
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

call :RunCNCjs
exit /b %errorlevel%

:RunCNCjs
call :FindLanIp
if not defined LAN_IP (
    echo.
    echo Could not find a 192.168.1.x IPv4 address.
    echo Browser tabs were not opened because you asked not to use any other IP.
    echo Check your Wi-Fi/Ethernet connection, then open the correct 192.168.1.x address manually.
    echo.
    pause
    exit /b 1
)

set "WORKSPACE_URL=http://%LAN_IP%:8000/"
set "PENDANT_URL=http://%LAN_IP%:8000/pendant/"

echo.
echo Using LAN address: %LAN_IP%
echo Desktop workspace: %WORKSPACE_URL%
echo Phone pendant:      %PENDANT_URL%
echo Autolevel extension is embedded in the CNCjs workspace.
echo.

echo Starting CNCjs workspace server on port 8080...
call :IsPortListening 8080
if errorlevel 1 (
    start "CNCjs Workspace Assets 8080" /D "%CD%" cmd /k npm run start-app-dev
) else (
    echo Port 8080 is already running. Reusing it.
)

echo Starting CNCjs server on port 8000...
call :IsPortListening 8000
if errorlevel 1 (
    start "CNCjs Server 8000" /D "%CD%" cmd /k node .\bin\cncjs --port 8000 --mount "/pendant:%PENDANT_DIR%"
) else (
    echo Port 8000 is already running. Reusing it.
)

echo.
echo Waiting for the CNCjs workspace to answer on port 8000...
call :WaitForUrl "http://127.0.0.1:8000/" 90
if errorlevel 1 (
    echo.
    echo Workspace did not answer on port 8000.
    echo Check the "CNCjs Server 8000" window for errors.
    pause
    exit /b 1
)

echo Waiting for the pendant to answer on port 8000...
call :WaitForUrl "http://127.0.0.1:8000/pendant/" 60
if errorlevel 1 (
    echo.
    echo Pendant did not answer on port 8000.
    echo Check the "CNCjs Server 8000" window for errors.
    pause
    exit /b 1
)

echo Opening browser tabs...
start "" "%WORKSPACE_URL%"
start "" "%PENDANT_URL%"

echo.
echo Browser tabs opened.
echo Keep the "CNCjs Workspace Assets 8080" and "CNCjs Server 8000" windows open while using CNCjs.
timeout /t 3 /nobreak >nul
exit /b 0

:FindLanIp
set "LAN_IP="
for /f "tokens=2 delims=:" %%I in ('ipconfig ^| findstr /R /C:"IPv4.*192\.168\.1\."') do (
    if not defined LAN_IP set "LAN_IP=%%I"
)
if defined LAN_IP (
    for /f "tokens=* delims= " %%A in ("%LAN_IP%") do set "LAN_IP=%%A"
)
exit /b 0

:WaitForUrl
set "WAIT_URL=%~1"
set "WAIT_SECONDS=%~2"
for /l %%S in (1,1,%WAIT_SECONDS%) do (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing '%WAIT_URL%' -TimeoutSec 2; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 300) { exit 0 } } catch { exit 1 }"
    if not errorlevel 1 exit /b 0
    timeout /t 1 /nobreak >nul
)
exit /b 1

:IsPortListening
netstat -ano | findstr /R /C:":%~1 .*LISTENING" >nul
exit /b %errorlevel%
