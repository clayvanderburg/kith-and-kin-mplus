@echo off
REM One-time setup for automatic keystones (no admin rights needed):
REM  1) copies the KithKinKeys addon into WoW
REM  2) runs the uploader in the background now and every time you log into Windows
cd /d "%~dp0\.."
node tools\install-addon.js || goto :eof

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS=%STARTUP%\KithKinKeyUploader.vbs"
> "%VBS%" echo Set sh = CreateObject("WScript.Shell")
>> "%VBS%" echo sh.CurrentDirectory = "%CD%"
>> "%VBS%" echo sh.Run "cmd /c node tools\key-uploader.js >> tools\key-uploader.log 2>&1", 0, False

REM Stop an older copy if one is already running, then start fresh.
wmic process where "name='node.exe' and commandline like '%%key-uploader.js%%'" call terminate >nul 2>&1
wscript "%VBS%"

echo.
echo Done. The uploader runs in the background (and starts with Windows).
echo In WoW: log in, type /kkkeys, then /reload. Uploads are listed in tools\key-uploader.log
