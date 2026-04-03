# AI Wrapper - Windows Installer Script
# Run: Right-click > "Run with PowerShell" or: powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = "Stop"
$InstallDir = "$env:LOCALAPPDATA\AIWrapper"
$RepoUrl = "https://github.com/edwards345/AI_Wrapper.git"
$ConfigDir = "$env:USERPROFILE\.aiwrapper"

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host "    AI Wrapper - Windows 11 Installer" -ForegroundColor Cyan
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host ""

# --- Step 1: Check/Install Node.js ---
Write-Host "  [1/6] Checking for Node.js..." -ForegroundColor Yellow
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "  Node.js not found. Installing via winget..." -ForegroundColor Yellow
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } else {
        Write-Host "  ERROR: winget not available. Please install Node.js manually from https://nodejs.org/" -ForegroundColor Red
        Read-Host "  Press Enter to exit"
        exit 1
    }
}
$nodeVersion = node --version
Write-Host "  Node.js $nodeVersion found." -ForegroundColor Green

# --- Step 2: Check/Install Git ---
Write-Host "  [2/6] Checking for Git..." -ForegroundColor Yellow
$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) {
    Write-Host "  Git not found. Installing via winget..." -ForegroundColor Yellow
    winget install Git.Git --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}
Write-Host "  Git found." -ForegroundColor Green

# --- Step 3: Clone or update repository ---
Write-Host "  [3/6] Setting up AI Wrapper..." -ForegroundColor Yellow
if (Test-Path "$InstallDir\.git") {
    Write-Host "  Updating existing installation..."
    Push-Location $InstallDir
    git pull
    Pop-Location
} else {
    if (Test-Path $InstallDir) { Remove-Item $InstallDir -Recurse -Force }
    git clone $RepoUrl $InstallDir
}
Write-Host "  Code ready." -ForegroundColor Green

# --- Step 4: Install dependencies ---
Write-Host "  [4/6] Installing dependencies..." -ForegroundColor Yellow
Push-Location $InstallDir
npm install
Push-Location "src\web\client"
npm install
Pop-Location
Pop-Location
Write-Host "  Dependencies installed." -ForegroundColor Green

# --- Step 5: Build ---
Write-Host "  [5/6] Building..." -ForegroundColor Yellow
Push-Location $InstallDir
npm run build
Pop-Location
Write-Host "  Build complete." -ForegroundColor Green

# --- Step 6: API Key Setup ---
Write-Host ""
Write-Host "  [6/6] API Key Setup" -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path $ConfigDir)) { New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null }
$envFile = "$ConfigDir\.env"

if (Test-Path $envFile) {
    Write-Host "  API keys already configured at $envFile" -ForegroundColor Green
    $reconfigure = Read-Host "  Reconfigure? (y/N)"
    if ($reconfigure -ne "y") { goto createShortcut }
}

$keys = @()

Write-Host ""
Write-Host "  Enter API keys (press Enter to skip any):" -ForegroundColor Cyan
Write-Host "  Get keys from the URLs shown below." -ForegroundColor DarkGray
Write-Host ""

$anthropic = Read-Host "  Anthropic (https://console.anthropic.com)"
if ($anthropic) { $keys += "ANTHROPIC_API_KEY=$anthropic" }

$openai = Read-Host "  OpenAI (https://platform.openai.com)"
if ($openai) { $keys += "OPENAI_API_KEY=$openai" }

$gemini = Read-Host "  Gemini (https://aistudio.google.com/app/apikey)"
if ($gemini) { $keys += "GEMINI_API_KEY=$gemini" }

$xai = Read-Host "  xAI/Grok (https://console.x.ai)"
if ($xai) { $keys += "XAI_API_KEY=$xai" }

if ($keys.Count -gt 0) {
    $keys -join "`n" | Set-Content -Path $envFile -NoNewline
    Write-Host ""
    Write-Host "  Saved $($keys.Count) key(s) to $envFile" -ForegroundColor Green
} else {
    Write-Host "  No keys entered. Run this installer again or edit $envFile manually." -ForegroundColor Yellow
}

:createShortcut

# --- Create Desktop Shortcut ---
Write-Host ""
Write-Host "  Creating desktop shortcut..." -ForegroundColor Yellow

$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = "$desktopPath\AI Wrapper.lnk"
$WshShell = New-Object -ComObject WScript.Shell
$shortcut = $WshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "$InstallDir\windows\start-aiwrapper.bat"
$shortcut.WorkingDirectory = $InstallDir
$shortcut.Description = "AI Wrapper - Multi-LLM Prompt Tool"
$shortcut.Save()

Write-Host "  Desktop shortcut created!" -ForegroundColor Green

# --- Create Start Menu Shortcut ---
$startMenuPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
$startShortcutPath = "$startMenuPath\AI Wrapper.lnk"
$shortcut2 = $WshShell.CreateShortcut($startShortcutPath)
$shortcut2.TargetPath = "$InstallDir\windows\start-aiwrapper.bat"
$shortcut2.WorkingDirectory = $InstallDir
$shortcut2.Description = "AI Wrapper - Multi-LLM Prompt Tool"
$shortcut2.Save()

Write-Host "  Start Menu shortcut created!" -ForegroundColor Green

# --- Done ---
Write-Host ""
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host "    Installation Complete!" -ForegroundColor Cyan
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  To start: Double-click 'AI Wrapper' on your Desktop" -ForegroundColor White
Write-Host "  Or search 'AI Wrapper' in the Start Menu" -ForegroundColor White
Write-Host ""

$launch = Read-Host "  Launch now? (Y/n)"
if ($launch -ne "n") {
    Start-Process "$InstallDir\windows\start-aiwrapper.bat"
}
