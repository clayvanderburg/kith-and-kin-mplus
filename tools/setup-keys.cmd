@echo off
REM One-time setup for automatic keystones:
REM  1) copies the KithKinKeys addon into WoW
REM  2) starts the uploader now and every time you log into Windows
cd /d "%~dp0\.."
node tools\install-addon.js || goto :eof
schtasks /Create /F /SC ONLOGON /RL LIMITED /TN "KithKin Key Uploader" /TR "cmd /c cd /d \"%CD%\" && node tools\key-uploader.js >> tools\key-uploader.log 2>&1"
schtasks /Run /TN "KithKin Key Uploader"
echo.
echo Done. In WoW: log in, type /kkkeys, then /reload. Check tools\key-uploader.log for uploads.
