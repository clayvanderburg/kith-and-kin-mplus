# Kith and Kin — Mythic+ Night Group Generator ⚔️💎

A themed World of Warcraft web application tailored for the guild **Kith and Kin** to run their weekly Mythic Plus events smoothly, fairly, and with style.

---

## ✨ Features

- **🏰 Guild Crest & Mythic Keystone Visuals**:
  - Dark gothic Azeroth aesthetic with glowing keystone animations.
  - Official WoW class colors for all 13 classes (Death Knight through Warrior).
  - Procedural sound effects powered by the Web Audio API (Keystone socket chime, fanfare, locks, and clicks — no external audio assets needed).

- **🛡️ Roster, Raider.IO API & Gear Stats**:
  - Live character lookups powered by the free public **Raider.IO REST API** (no key required!).
  - Displays **Equipped Item Level** (e.g. `634 iLvl`) and **Mythic+ Score / IO** with official rating tier color brackets.
  - Character portrait avatars automatically pulled from the Blizzard / Raider.IO render service.
  - One-click **"🔄 Sync Raider.IO"** button to bulk update ratings and item levels for all attending guild members.
  - Add, edit, and remove guild members with support for multi-role players (e.g. Tank + DPS, Healer + DPS).
  - Configurable Realm & Region (defaults to `Area 52`, `US`).
  - Set key comfort ranges (e.g. `+4` to `+10`) and record in-game keystones.
  - Quick attendance checkboxes so you can keep your full guild roster saved without deleting absent players.

- **⚡ Intelligent Group Solver**:
  - Assembles standard 5-man parties (1 Tank, 1 Healer, 3 DPS).
  - **⚖️ Equalize Average Group M+ Score (IO)**: Balances veterans and newer members across teams so every group has a balanced, comparable average rating.
  - **⚡ Bloodlust / Heroism Priority**: Intelligently spreads Mages, Shamans, Hunters, and Evokers across teams so every party has Lust.
  - **🔄 Battle Resurrection Priority**: Distributes Druids, Paladins, Death Knights, and Warlocks so every team has an in-combat rez.
  - Multiple matching modes:
    - **Balanced Key Levels**: Groups players with overlapping key comfort brackets and calculates the ideal target key level.
    - **Guild Mixer**: Blends seasoned veterans with newer players and avoids duplicate classes.
    - **Complete Chaos**: Pure randomized valid compositions for wild fun runs.
  - Generates fun party nicknames (*"Keystone Crushers"*, *"The Floor Inspectors"*, *"Wipe on 1% Survivors"*, etc.).
  - Randomly rolls dungeons from The War Within dungeon pool (or prioritizes keys actually owned by party members!).
  - Lock individual parties to keep them stable while re-rolling the rest.
  - **Tavern Reserves / Bench**: Displays surplus players and clearly indicates what role is needed to form another group.

- **💬 Discord Ready**:
  - One-click **"Copy Discord Post"** generates clean Discord Markdown with role emojis and line-ups ready to paste into guild chat or announcement channels.

---

## 🚀 How to Run

Simply open `index.html` in any modern web browser:

- Double-click `index.html`, or
- Run a quick local server in this directory:
  ```powershell
  npx serve .
  # or
  python -m http.server 8080
  ```
  Then browse to `http://localhost:8080`.
