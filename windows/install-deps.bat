@echo off
cd /d "%~dp0\.."

:: Refresh PATH to pick up newly installed Node.js
set "PATH=%ProgramFiles%\nodejs;%LOCALAPPDATA%\Programs\nodejs;%PATH%"

echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Failed to install root dependencies
    exit /b 1
)

echo Installing client dependencies...
cd src\web\client
call npm install
if %errorlevel% neq 0 (
    echo Failed to install client dependencies
    exit /b 1
)

echo Building client...
call npm run build
if %errorlevel% neq 0 (
    echo Failed to build client
    exit /b 1
)

cd ..\..\..
echo Done.
