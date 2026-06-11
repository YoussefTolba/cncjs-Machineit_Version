$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Babel = Join-Path $Root "node_modules\@babel\cli\bin\babel.js"
$Scanner = Join-Path $Root "node_modules\i18next-scanner\bin\cli.js"
$Webpack = Join-Path $Root "node_modules\webpack-cli\bin\cli.js"

function Resolve-NodeRuntime {
    $Candidates = @()

    if ($env:CNCJS_NODE_EXE) {
        $Candidates += $env:CNCJS_NODE_EXE
    }

    $Candidates += @(
        (Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\gnode.exe"),
        (Join-Path $env:ProgramFiles "nodejs\gnode.exe"),
        "node"
    )

    foreach ($Candidate in $Candidates) {
        if ($Candidate -eq "node" -or (Test-Path -LiteralPath $Candidate)) {
            return $Candidate
        }
    }

    throw "Unable to find Node.js. Install Node.js 18+ or set CNCJS_NODE_EXE to a working node.exe/gnode.exe path."
}

$Node = Resolve-NodeRuntime
$env:CNCJS_NODE_EXE = $Node

function Invoke-NodeScript {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ScriptPath,

        [string[]]$ScriptArguments = @()
    )

    & $Node $ScriptPath @ScriptArguments
    if ($LASTEXITCODE -ne 0) {
        throw "$ScriptPath failed with exit code $LASTEXITCODE"
    }
}

Set-Location $Root
Write-Host "Using Node runtime: $Node"

# Sync package dependencies
Invoke-NodeScript "scripts\package-sync.js"

# Prepare output directory
if (Test-Path -Path "output") {
    Remove-Item -Recurse -Force "output"
}
New-Item -ItemType Directory -Path "output"

# Navigate to the src directory
Push-Location -Path "src"
New-Item -ItemType Directory -Force -Path "../output/cncjs"
Copy-Item -Path "package.json" -Destination "../output/cncjs/"

# Compile JavaScript files with Babel
$env:NODE_ENV = "development"
Invoke-NodeScript $Babel @(
    "*.js",
    "--config-file", "../babel.config.js",
    "--out-dir", "../output/cncjs"
)

Invoke-NodeScript $Babel @(
    "electron-app/**/*.js",
    "--config-file", "../babel.config.js",
    "--out-dir", "../output/cncjs/electron-app"
)
Pop-Location

# Compile server code with Babel
$PreviousBabelEnv = $env:BABEL_ENV
$env:BABEL_ENV = "server"
New-Item -ItemType Directory -Force -Path "output/cncjs/server"
Invoke-NodeScript $Babel @("-d", "output/cncjs/server", "src/server")
if ($null -eq $PreviousBabelEnv) {
    Remove-Item Env:\BABEL_ENV -ErrorAction SilentlyContinue
} else {
    $env:BABEL_ENV = $PreviousBabelEnv
}

# Scan i18n translations
Invoke-NodeScript $Scanner @(
    "--config", "i18next-scanner.server.config.js",
    "src/server/**/*.{html,js,jsx}",
    "!src/server/i18n/**",
    "!**/node_modules/**"
)

Invoke-NodeScript $Webpack @("--config", "webpack.config.development.js")

Invoke-NodeScript $Scanner @(
    "--config", "i18next-scanner.app.config.js",
    "src/app/**/*.{html,js,jsx}",
    "!src/app/i18n/**",
    "!**/node_modules/**"
)

# Copy necessary files
New-Item -ItemType Directory -Force -Path "output/cncjs/app"
New-Item -ItemType Directory -Force -Path "output/cncjs/server"
New-Item -ItemType Directory -Force -Path "output/cncjs/shared"
Copy-Item -Path "src/app/favicon.ico" -Destination "output/cncjs/app"
Copy-Item -Path "src/app/i18n" -Destination "output/cncjs/app" -Recurse
Copy-Item -Path "src/app/images" -Destination "output/cncjs/app" -Recurse
Copy-Item -Path "src/app/assets" -Destination "output/cncjs/app" -Recurse
Copy-Item -Path "src/server/i18n" -Destination "output/cncjs/server" -Recurse
Copy-Item -Path "src/server/views" -Destination "output/cncjs/server" -Recurse
Copy-Item -Path "src/shared/*" -Destination "output/cncjs/shared" -Recurse

Write-Host "Build complete." -ForegroundColor Green
