@echo off
cd /d "%~dp0"

set "NODE_ENV=development"
set "PENDANT_DIR=%CD%\pendants\phone"
set "AUTOLEVEL_SHARED_DIR=%CD%\src\shared\autolevel"
set "WEBPACK_CLI=%CD%\node_modules\webpack-cli\bin\cli.js"

call :FindNode
if errorlevel 1 (
    echo.
    echo Could not find a working Node.js runtime.
    echo Install Node.js 18+ or set CNCJS_NODE_EXE to a working node.exe or gnode.exe path.
    echo.
    pause
    exit /b 1
)

echo Using Node runtime: %CNCJS_NODE_EXE%

if not exist "output\cncjs\server-cli.js" (
    echo No existing development build was found.
    echo Run "Launch CNCjs Dev.bat" first to build and run, then use this file for run-only starts.
    echo.
    pause
    exit /b 1
)

echo Running CNCjs from the existing development build...
echo.

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

echo Using LAN address: %LAN_IP%
echo Desktop workspace: %WORKSPACE_URL%
echo Phone pendant:      %PENDANT_URL%
echo.

echo Starting CNCjs workspace server on port 8080...
call :IsPortListening 8080
if errorlevel 1 (
    start "CNCjs Workspace Assets 8080" /D "%CD%" cmd /k call scripts\run-workspace-dev.cmd
) else (
    echo Port 8080 is already running. Reusing it.
)

echo Starting CNCjs server on port 8000...
call :IsPortListening 8000
if errorlevel 1 (
    start "CNCjs Server 8000" /D "%CD%" cmd /k call scripts\run-server-dev.cmd
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
call :WaitForUrl "http://127.0.0.1:8000/pendant/" 20
if errorlevel 1 (
    echo.
    echo Pendant did not answer yet on port 8000.
    echo Opening the pendant tab anyway; refresh it after the CNCjs server finishes warming up.
)

echo Opening browser tabs...
start "" "%WORKSPACE_URL%"
start "" "%PENDANT_URL%"

echo.
echo Browser tabs opened.
echo Keep the "CNCjs Workspace Assets 8080" and "CNCjs Server 8000" windows open while using CNCjs.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 3"
exit /b 0

:FindNode
if defined CNCJS_NODE_EXE (
    if /I "%CNCJS_NODE_EXE%"=="node" exit /b 0
    if exist "%CNCJS_NODE_EXE%" exit /b 0
    echo CNCJS_NODE_EXE points to a missing file: %CNCJS_NODE_EXE%
    exit /b 1
)

set "CANDIDATE_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\gnode.exe"
if exist "%CANDIDATE_NODE%" (
    set "CNCJS_NODE_EXE=%CANDIDATE_NODE%"
    exit /b 0
)

set "CANDIDATE_NODE=%ProgramFiles%\nodejs\gnode.exe"
if exist "%CANDIDATE_NODE%" (
    set "CNCJS_NODE_EXE=%CANDIDATE_NODE%"
    exit /b 0
)

where node >nul 2>nul
if not errorlevel 1 (
    set "CNCJS_NODE_EXE=node"
    exit /b 0
)

exit /b 1

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
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 1"
)
exit /b 1

:IsPortListening
netstat -ano | findstr /R /C:":%~1 .*LISTENING" >nul
exit /b %errorlevel%
