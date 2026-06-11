@echo off
cd /d "%~dp0\.."

set "NODE_ENV=development"

if not defined CNCJS_NODE_EXE (
    echo CNCJS_NODE_EXE is not set.
    exit /b 1
)

if not defined PENDANT_DIR (
    set "PENDANT_DIR=%CD%\pendants\phone"
)

if not defined AUTOLEVEL_SHARED_DIR (
    set "AUTOLEVEL_SHARED_DIR=%CD%\src\shared\autolevel"
)

"%CNCJS_NODE_EXE%" ".\bin\cncjs" --port 8000 --mount "/pendant:%PENDANT_DIR%" --mount "/autolevel-shared:%AUTOLEVEL_SHARED_DIR%"
