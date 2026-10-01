<#
  Kith & Kin officer kit installer. Run it through Install.cmd (double-click).
  1. Finds World of Warcraft and copies the KithKinKeys addon into Interface\AddOns
  2. Asks for the officer passphrase once, checks it with the site, saves it encrypted for this Windows user
  3. Puts a "Start Key Uploader" shortcut on the desktop (and, if you say yes, in Startup)
  Nothing runs hidden, no scheduled tasks, no admin rights needed. Re-run any time to update.
#>
param(
  [string]$Site = 'https://knkmplus.netlify.app',
  [string]$WowPath = '',
  [string]$ConfigDir = (Join-Path $env:APPDATA 'KithKinKeys'),
  [switch]$NoShortcuts
)
$ErrorActionPreference = 'Stop'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch { }
$kit = Split-Path -Parent $MyInvocation.MyCommand.Path

function Say([string]$msg, [string]$color = 'Gray') { Write-Host $msg -ForegroundColor $color }

function Test-WowRoot([string]$p) {
  if (-not $p) { return $false }
  return (Test-Path (Join-Path $p 'Wow.exe')) -or (Test-Path (Join-Path $p 'Interface'))
}

function Find-Wow {
  $tries = New-Object System.Collections.ArrayList
  if ($WowPath) { [void]$tries.Add($WowPath) }
  # Blizzard's installer records the location here (read-only lookup).
  foreach ($reg in 'HKLM:\SOFTWARE\WOW6432Node\Blizzard Entertainment\World of Warcraft', 'HKLM:\SOFTWARE\Blizzard Entertainment\World of Warcraft') {
    try {
      $install = (Get-ItemProperty -Path $reg -ErrorAction Stop).InstallPath
      if ($install) { [void]$tries.Add($install); [void]$tries.Add((Join-Path (Split-Path $install -Parent) '_retail_')) }
    } catch { }
  }
  foreach ($d in 'C', 'D', 'E', 'F', 'G') {
    foreach ($rest in 'Program Files (x86)\World of Warcraft\_retail_', 'Program Files\World of Warcraft\_retail_', 'World of Warcraft\_retail_', 'Games\World of Warcraft\_retail_', 'Battle.net\World of Warcraft\_retail_') {
      [void]$tries.Add("${d}:\$rest")
    }
  }
  foreach ($p in $tries) {
    if (Test-WowRoot $p) { return (Resolve-Path $p).Path }
    $retail = Join-Path $p '_retail_'
    if (Test-WowRoot $retail) { return (Resolve-Path $retail).Path }
  }
  return $null
}

Say ''
Say '=== Kith & Kin officer kit ===' 'Yellow'

# 1) WoW + addon
$wow = Find-Wow
while (-not $wow) {
  Say "Couldn't find World of Warcraft automatically." 'Red'
  $typed = Read-Host 'Paste the path to your "World of Warcraft\_retail_" folder'
  $typed = $typed.Trim('"', ' ')
  if (Test-WowRoot $typed) { $wow = $typed }
  elseif (Test-WowRoot (Join-Path $typed '_retail_')) { $wow = Join-Path $typed '_retail_' }
}
Say "WoW found: $wow" 'Green'
# In the zip the addon sits next to this script; in the repo it lives in ..\addon\.
$addonSrc = Join-Path $kit 'KithKinKeys'
if (-not (Test-Path $addonSrc)) { $addonSrc = Join-Path (Split-Path $kit -Parent) 'addon\KithKinKeys' }
if (-not (Test-Path $addonSrc)) { throw "The KithKinKeys addon folder is missing from the kit ($kit)." }
$addonDest = Join-Path $wow 'Interface\AddOns\KithKinKeys'
New-Item -ItemType Directory -Force -Path $addonDest | Out-Null
Copy-Item -Path (Join-Path $addonSrc '*') -Destination $addonDest -Recurse -Force
Say "Addon installed: $addonDest" 'Green'

# 2) Passphrase
New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null
$configFile = Join-Path $ConfigDir 'config.json'
$encrypted = $null
if (Test-Path $configFile) {
  $old = Get-Content $configFile -Raw -Encoding UTF8 | ConvertFrom-Json
  $keep = Read-Host 'A passphrase is already saved. Keep it? (Y/n)'
  if ($keep -notmatch '^[nN]') { $encrypted = $old.passphrase }
}
while (-not $encrypted) {
  $secure = Read-Host 'Officer passphrase (same one you type on the Control Center)' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  try {
    $body = [Text.Encoding]::UTF8.GetBytes((@{ key = $plain.Trim() } | ConvertTo-Json -Compress))
    $res = Invoke-RestMethod -Method Post -Uri ($Site.TrimEnd('/') + '/api/officer-auth') -Body $body -ContentType 'application/json; charset=utf-8' -TimeoutSec 20
    if ($res.ok) { $encrypted = ConvertFrom-SecureString $secure; Say 'Passphrase accepted.' 'Green' }
  } catch {
    $code = $null
    try { $code = [int]$_.Exception.Response.StatusCode } catch { }
    if ($code -eq 401) { Say 'That passphrase was not accepted. Try again.' 'Red' }
    elseif ($code -eq 429) { Say 'Too many tries. Wait a minute and try again.' 'Red'; Start-Sleep -Seconds 60 }
    else { Say "Couldn't reach the site ($($_.Exception.Message)). Check your internet and try again." 'Red' }
  }
}
@{ site = $Site; wowPath = $wow; passphrase = $encrypted } | ConvertTo-Json | Set-Content -Path $configFile -Encoding UTF8
Copy-Item -Path (Join-Path $kit 'KithKinKeysUploader.ps1') -Destination (Join-Path $ConfigDir 'KithKinKeysUploader.ps1') -Force

# 3) Launcher + shortcuts
$launcher = Join-Path $ConfigDir 'Start Key Uploader.cmd'
@(
  '@echo off',
  'title Kith ^& Kin Key Uploader',
  'powershell -NoProfile -ExecutionPolicy Bypass -File "%APPDATA%\KithKinKeys\KithKinKeysUploader.ps1"',
  'pause'
) | Set-Content -Path $launcher -Encoding ASCII
Say "Launcher: $launcher" 'Green'

if (-not $NoShortcuts) {
  $shell = New-Object -ComObject WScript.Shell
  $made = @()
  $desktop = [Environment]::GetFolderPath('Desktop')
  $targets = @(Join-Path $desktop 'Kith & Kin Key Uploader.lnk')
  $auto = Read-Host 'Start the uploader automatically when Windows starts? (Y/n)'
  if ($auto -notmatch '^[nN]') { $targets += Join-Path ([Environment]::GetFolderPath('Startup')) 'Kith & Kin Key Uploader.lnk' }
  foreach ($t in $targets) {
    $lnk = $shell.CreateShortcut($t)
    $lnk.TargetPath = $launcher
    $lnk.WorkingDirectory = $ConfigDir
    $lnk.WindowStyle = 7  # minimized
    $lnk.Description = 'Sends guild keystones from the KithKinKeys addon to the M+ site'
    $lnk.Save()
    $made += $t
  }
  Say ('Shortcuts: ' + ($made -join '; ')) 'Green'
}

Say ''
Say 'All set. Next:' 'Yellow'
Say '  1. Start WoW (enable "KithKinKeys" in the AddOns list if it is off).'
Say '  2. Start the uploader from the desktop shortcut (it opens minimized).'
Say '  3. Keys upload whenever WoW saves: /reload, logout, or quitting.'
$start = Read-Host 'Start the uploader now? (Y/n)'
if ($start -notmatch '^[nN]') { Start-Process -FilePath $launcher -WindowStyle Minimized }
