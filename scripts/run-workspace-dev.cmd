@echo off
cd /d "%~dp0\.."

set "NODE_ENV=development"

if not defined CNCJS_NODE_EXE (
    echo CNCJS_NODE_EXE is not set.
    exit /b 1
)

if not defined WEBPACK_CLI (
    set "WEBPACK_CLI=%CD%\node_modules\webpack-cli\bin\cli.js"
)

"%CNCJS_NODE_EXE%" "%WEBPACK_CLI%" serve --progress --config webpack.config.development.js
