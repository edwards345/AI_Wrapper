@echo off
echo.
echo  ========================================
echo    AI Wrapper - Build Installer
echo  ========================================
echo.

:: Check for Inno Setup
set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if not exist "%ISCC%" (
    set "ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe"
)
if not exist "%ISCC%" (
    echo  Inno Setup 6 not found.
    echo  Download free from: https://jrsoftware.org/isdl.php
    echo.
    echo  After installing, run this script again.
    pause
    exit /b 1
)

echo  Found Inno Setup at: %ISCC%
echo  Building installer...
echo.

:: Create output directory
if not exist "%~dp0output" mkdir "%~dp0output"

:: Compile
"%ISCC%" "%~dp0setup.iss"

if %errorlevel% equ 0 (
    echo.
    echo  ========================================
    echo    Installer created successfully!
    echo    File: %~dp0output\AIWrapper-Setup.exe
    echo  ========================================
    echo.
    explorer "%~dp0output"
) else (
    echo.
    echo  Build failed. Check errors above.
)

pause
