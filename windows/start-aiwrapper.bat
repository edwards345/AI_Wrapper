@echo off
title AI Wrapper Server
cd /d "%~dp0\.."

:: Ensure Node.js is in PATH
set "PATH=%ProgramFiles%\nodejs;%LOCALAPPDATA%\Programs\nodejs;%PATH%"

:: Check if Node.js is available
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Node.js is not installed.
    echo  Download it from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if dependencies are installed
if not exist "node_modules" (
    echo  First run - installing dependencies...
    call npm install
    cd src\web\client
    call npm install
    call npm run build
    cd ..\..\..
)

:: Start server and open browser
echo.
echo  ========================================
echo    AI Wrapper - Multi-LLM Prompt Tool
echo  ========================================
echo.
echo  Starting server at http://localhost:3456
echo  Press Ctrl+C or close this window to stop.
echo.

start /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3456"

call npx tsx src\web\server.ts
