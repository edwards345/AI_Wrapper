@echo off
echo.
echo  ========================================
echo    AI Wrapper - Quick Installer
echo  ========================================
echo.
echo  This will install AI Wrapper on your PC.
echo  Press any key to continue or close this window to cancel.
pause >nul

powershell -ExecutionPolicy Bypass -File "%~dp0install.ps1"
