@echo off
title Kith ^& Kin officer kit
REM Runs install.ps1 from this folder. Nothing is hidden; read install.ps1 to see every step.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
echo.
pause
