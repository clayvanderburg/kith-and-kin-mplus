# Kith and Kin — Mythic+ Night Group Generator ⚔️💎

A themed World of Warcraft web application tailored for the guild **Kith and Kin** to run their weekly Mythic Plus events smoothly, fairly, and with style.

---

## ✨ Features

- **🏰 Guild Crest & Mythic Keystone Visuals**:
  - Dark gothic Azeroth aesthetic with glowing keystone animations.
  - Official WoW class colors for all 13 classes (Death Knight through Warrior).
  - Procedural sound effects powered by the Web Audio API (Keystone socket chime, fanfare, locks, and clicks — no external audio assets needed).

- **🛡️ Roster & Role Flexibility**:
  - Add, edit, and remove guild members with support for multi-role players (e.g. Tank + DPS, Healer + DPS).
  - Set key comfort ranges (e.g. `+4` to `+10`) and optionally record their in-game keystone.
  - Quick attendance checkboxes so you can keep your full guild roster saved without deleting absent players.
  - One-click bulk Import/Export format to easily paste rosters from or to Discord.

- **⚡ Intelligent Group Solver**:
  - Assembles standard 5-man parties (1 Tank, 1 Healer, 3 DPS).
  - Maximizes the number of full parties by flexing multi-role players into whatever the roster needs most.
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
