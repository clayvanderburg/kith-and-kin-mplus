KITH & KIN OFFICER KIT - share keystones with the M+ site
==========================================================

What it does
  Your WoW addon (KithKinKeys) hears guildmates' keystones in game - from BigWigs,
  Details!, Astral Keys and keystone links in chat. A small uploader window sends them
  to https://knkmplus.netlify.app whenever WoW saves (/reload, logout, quitting).
  The more officers run this, the more keys the site sees.

Install (2 minutes, no admin, no Node.js)
  1. Unzip this folder anywhere (Desktop is fine).
  2. Double-click Install.cmd.
  3. Type the officer passphrase when asked (the one you use on the Control Center).
  4. Say Y to "start automatically" if this is your gaming PC.

Use
  - Play as normal. Do /reload once after logging in so the first batch uploads.
  - The "Kith & Kin Key Uploader" window shows what it sent. Minimize it, don't close it.

Update or change passphrase
  Double-click Install.cmd again.

Remove
  Delete the "Kith & Kin Key Uploader" shortcut from your Desktop and from Startup
  (Win+R, type shell:startup), delete %APPDATA%\KithKinKeys, and delete
  World of Warcraft\_retail_\Interface\AddOns\KithKinKeys.

Windows warning?
  If Windows says the file is from the internet: right-click Install.cmd > Properties >
  tick "Unblock" > OK, then run it again. Everything is plain text you can read.
