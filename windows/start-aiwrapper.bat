@echo off
title AI Wrapper Server
cd /d "%~dp0\.."

echo.
echo  ========================================
echo    AI Wrapper - Multi-LLM Prompt Tool
echo  ========================================
echo.
echo  Starting server...
echo.

:: Check if Node.js is available
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Node.js is not installed.
    echo  Download it from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules" (
    echo  Installing dependencies...
    call npm install
    echo.
)

:: Check if client is built
if not exist "src\web\client\dist\index.html" (
    echo  Building frontend...
    cd src\web\client
    call npm install
    call npm run build
    cd ..\..\..
    echo.
)

:: Start server in background and open browser
echo  Server starting at http://localhost:3456
echo  Opening browser...
echo.
echo  Press Ctrl+C or close this window to stop.
echo  ========================================
echo.

:: Wait 2 seconds then open browser
start /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3456"

:: Run the server (this blocks until Ctrl+C)
call npx tsx src\web\server.ts
