@echo off
REM Starts the key uploader in a small minimized window. Close that window to stop it.
REM To start it with Windows: right-click this file > Create shortcut, then move the shortcut
REM into the folder that opens when you press Win+R and type  shell:startup
cd /d "%~dp0\.."
start "Kith & Kin Key Uploader" /min node tools\key-uploader.js
echo Key uploader started (minimized window "Kith & Kin Key Uploader").
echo In WoW: /kkkeys, wait 5 seconds, then /reload.
