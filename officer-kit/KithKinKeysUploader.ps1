<#
  Kith & Kin key uploader (no Node.js needed).
  Watches the KithKinKeys addon's saved file and sends everyone's keystones to the site
  whenever WoW saves it (/reload, logout, or exiting the game).

  Normally started by "Start Key Uploader" (made by Install.cmd). Close the window to stop it.
    -Once        upload once and exit
    -ConfigDir   where config.json lives (default: %APPDATA%\KithKinKeys)
#>
param(
  [switch]$Once,
  [string]$ConfigDir = (Join-Path $env:APPDATA 'KithKinKeys')
)

$ErrorActionPreference = 'Stop'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch { }
$Host.UI.RawUI.WindowTitle = 'Kith & Kin Key Uploader'

function Write-Log([string]$msg) {
  $line = '[{0}] {1}' -f (Get-Date -Format 'HH:mm:ss'), $msg
  Write-Host $line
  try { Add-Content -Path (Join-Path $ConfigDir 'uploader.log') -Value $line -Encoding UTF8 } catch { }
}

function Read-Config {
  $file = Join-Path $ConfigDir 'config.json'
  if (-not (Test-Path $file)) { throw "Not set up yet. Run Install.cmd from the officer kit first." }
  $cfg = Get-Content $file -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($env:KK_UPLOADER_KEY) { return @{ site = $cfg.site.TrimEnd('/'); wowPath = $cfg.wowPath; key = $env:KK_UPLOADER_KEY } }
  # The passphrase is stored encrypted for this Windows user only (Windows DPAPI).
  $secure = ConvertTo-SecureString $cfg.passphrase
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  return @{ site = $cfg.site.TrimEnd('/'); wowPath = $cfg.wowPath; key = $plain }
}

# Reads: KithKinKeysDB = { ["keys"] = { ["Name-Realm"] = { ["level"] = 12, ["name"] = "Name", ... }, ... } }
function ConvertFrom-SavedVariables([string]$text) {
  $keys = New-Object System.Collections.ArrayList
  $start = $text.IndexOf('["keys"]')
  if ($start -lt 0) { return ,$keys }
  $blockRe = [regex]'\["([^"]+)"\]\s*=\s*\{([^{}]*)\}'
  $fieldRe = [regex]'\["(\w+)"\]\s*=\s*("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false)'
  foreach ($m in $blockRe.Matches($text, $start)) {
    $entry = @{}
    foreach ($f in $fieldRe.Matches($m.Groups[2].Value)) {
      $raw = $f.Groups[2].Value
      if ($raw.StartsWith('"')) { $val = [regex]::Replace($raw.Substring(1, $raw.Length - 2), '\\(.)', '$1') }
      elseif ($raw -eq 'true') { $val = $true }
      elseif ($raw -eq 'false') { $val = $false }
      else { $val = [double]$raw }
      $entry[$f.Groups[1].Value] = $val
    }
    if ($entry.ContainsKey('name') -and $entry.ContainsKey('level')) { [void]$keys.Add($entry) }
  }
  return ,$keys
}

function Get-SavedVariableFiles([string]$wowPath) {
  $accounts = Join-Path $wowPath 'WTF\Account'
  if (-not (Test-Path $accounts)) { return @() }
  return @(Get-ChildItem -Path $accounts -Directory | ForEach-Object {
    Join-Path $_.FullName 'SavedVariables\KithKinKeys.lua'
  } | Where-Object { Test-Path $_ })
}

function Send-Keys($cfg, [string]$file) {
  $keys = ConvertFrom-SavedVariables (Get-Content $file -Raw -Encoding UTF8)
  if ($keys.Count -eq 0) { Write-Log "No keystones in the file yet. In WoW: wait a few seconds after logging in, then /reload."; return }
  $json = @{ source = 'KithKinKeys'; keys = @($keys) } | ConvertTo-Json -Depth 5 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $out = Invoke-RestMethod -Method Post -Uri ($cfg.site + '/api/keys') -Body $bytes `
    -ContentType 'application/json; charset=utf-8' -Headers @{ 'x-sync-secret' = $cfg.key } -TimeoutSec 30
  Write-Log ("Sent {0} keys: {1} matched, {2} updated, {3} not on the roster, {4} from last week." -f $keys.Count, $out.matched, $out.updated, $out.unknown, $out.stale)
}

$cfg = Read-Config
$seen = @{}
$warned = $false
Write-Log "Watching for WoW saves in $($cfg.wowPath). Leave this window open (minimize it). Close it to stop."
while ($true) {
  $files = Get-SavedVariableFiles $cfg.wowPath
  if ($files.Count -eq 0 -and -not $warned) {
    Write-Log 'No KithKinKeys data yet. Log into WoW with the addon enabled, wait a few seconds, then /reload.'
    $warned = $true
  }
  foreach ($file in $files) {
    $item = Get-Item $file -ErrorAction SilentlyContinue  # WoW may be rewriting the file right now
    if (-not $item) { continue }
    $stamp = $item.LastWriteTimeUtc.Ticks
    if ($seen[$file] -eq $stamp) { continue }
    try {
      Send-Keys $cfg $file
      $seen[$file] = $stamp
    } catch {
      $code = $null
      try { $code = [int]$_.Exception.Response.StatusCode } catch { }
      if ($code -eq 401) { Write-Log 'The site rejected the officer passphrase. Run Install.cmd again with the current passphrase.'; $seen[$file] = $stamp }
      else { Write-Log "Upload failed ($($_.Exception.Message)). Will retry." }
    }
  }
  if ($Once) { break }
  Start-Sleep -Seconds 20
}
