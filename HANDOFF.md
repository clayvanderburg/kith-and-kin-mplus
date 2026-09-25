# Kith & Kin Mythic+ Night — Complete Handoff & Architecture Dossier

**Author:** Antigravity (Google DeepMind)  
**Recipient Agent:** Claude / Codex / Hermes / Grok  
**Last Updated:** 2026-09-25  
**Canonical Local Path:** `C:\Users\MadKing\.gemini\antigravity\scratch\kith-and-kin-mplus`  
**Live Application:** `https://knkmplus.netlify.app`  
**GitHub Repository:** `https://github.com/clayvanderburg/kith-and-kin-mplus`  
**Shared Multi-Agent Hub:** `F:\MadKing\grok-shared\agents-hub`  

---

## 1. Executive Summary

This repository contains the full production stack for **Kith & Kin's Friday Mythic+ Keystone Night**, an active World of Warcraft guild event. It was designed to solve the weekly guild dilemma: getting 20–40 players formed into balanced 5-man parties (1 Tank, 1 Healer, 3 DPS) matching key levels, honoring flexible players, mentoring lower-geared members who need carries, and rewarding presence over elitism.

The application has 3 primary client-facing interfaces:
1. **Control Center (`index.html`):** The officer war-room. Features the algorithmic group formation solver, live party keystone roulette, attendee status toggles, dungeon run logging, private officer player dossiers, and the AI Guild Chronicler.
2. **Player View (`signup.html`):** The mobile-friendly member sign-up portal. Roster search across all 689 guild members, role selectors, key goals (+6-8 Hero Crest, +10-12 Vault, +12+ IO push), and squad vibes.
3. **The Hall of Champions (`leaderboard.html`):** A seasonal participation leaderboard that celebrates attendance, role flexing, carrying guildies, and leadership.

It is backed by a **100% serverless Discord application** hosted on Netlify Functions (`netlify/functions/discord.js`), enabling the entire guild to sign up, form groups, roll keys, and check leaderboards without leaving Discord.

---

## 2. Core Feature Walkthrough

### A. The Hall of Champions (Participation Leaderboard)
- **The Philosophy:** Traditional WoW leaderboards rank players solely by Raider.IO score or parse percentages. Kith & Kin's board is participation-based to reward guild citizenship.
- **Scoring Code:**
  - **Attendance:** `+15 pts` per Friday night attended.
  - **Keystones Completed:** `+10 pts` base per completed key; `+5 pts` bonus for timed keys; `+2 pts` per key level above +10.
  - **Role Flexibility:** `+5 pts` per night for Dual-Role flex (Tank/DPS, etc.); `+10 pts` for Triple Flex (Tank/Healer/DPS).
  - **Born Leader (👑):** `+8 pts` per night willing to lead and navigate.
  - **Stonk Back (🏋️):** `+8 pts` per night volunteering "My back is stronk" to carry heavy keys.
  - **Carry Shepherd (🎒):** `+15 pts` per dungeon run completed while grouped with a member marked as needing a carry.
- **Top 3 Olympic Dais:** Visual podium with 🥇 Gold (#1 Adrenaline, 542 pts), 🥈 Silver (#2 Stirlingskat, 538 pts), and 🥉 Bronze (#3 Bungulator, 490 pts).
- **Points Audit Modal:** Clicking any member or their "Audit" button opens an itemized popover detailing every attendance point, role bonus, badge, and logged dungeon keystone.
- **Demo Showcase vs. Live Data Toggle:** An instant toggle on the toolbar switches between the rich 18-member fake dataset (`DEMO_PLAYERS`) and live database records.

### B. Group Formation Solver (`bot/solver.js` & `app.js`)
- Solves optimal 5-man parties (1 Tank, 1 Healer, 3 DPS).
- Matches compatible key ranges (`keyMin` to `keyMax`).
- Pairs players marked as `need_carry` with players marked as `willing_carry` ("Stronk Back").
- Handles voluntary bench/reserves (`isReserve: true`) when attendance is not a clean multiple of 5.

### C. Keystone Roulette & Rolling UI (`bot/roll-ui.js` & `app.js`)
- Calculates which keystone owned by party members is most beneficial for the group.
- Animated roulette wheel for officer excitement.
- Exclusions allow rolling a different key if a party member dislikes a specific dungeon.

### D. AI Guild Chronicler (`chronicler.js` & `netlify/functions/chronicler-recap.js`)
- Gathers the evening's completed dungeon runs, party comps, depleted keys, and heroics.
- Prompts Google Gemini Flash to write a high-fantasy, humorous, lore-rich narrative chronicling Friday's adventures in the style of Azerothian scribes.
- Output can be copied directly to Discord announcements.

### E. Discord Bot (`netlify/functions/discord.js` & `bot/embeds.js`)
- Runs serverlessly on Netlify Edge via Ed25519 webhook signature verification.
- Slash command `/mplus leaderboard` renders rich embeds matching the web leaderboard dais and standings 4–10.
- Interactive buttons allow refreshing standings and reviewing the scoring code directly in Discord.

---

## 3. Important Implementation Nuances

1. **Universal Calculation Engine (`leaderboard-engine.js`):**
   - The engine is isomorphic (works in Browser `window.LeaderboardEngine` and Node.js `require`).
   - Copies exist at:
     - `leaderboard-engine.js` (Web root)
     - `bot/leaderboard-engine.js` (Bot)
     - `netlify/functions/leaderboard-engine.js` (Netlify Function)
   - *Rule:* Always update all three copies or use `Copy-Item` from root when modifying scoring rules or demo players.
2. **Fallback Logic:**
   - In `computeLeaderboardStandings(players, state, forceLive = false)`, the engine safely defaults to `DEMO_PLAYERS` unless `forceLive` is explicitly passed or the live season database has accumulated $\ge 10$ logged dungeon runs. This ensures the demo showcase displays cleanly during officer previews even with partial database stubs.
3. **Password Gate Status:**
   - The officer passphrase gate (`#officerGate` in `index.html`) is currently disabled in `app.js` and `player-stats.js` for frictionless testing. Do not re-enable it without Clay's instruction.
4. **Discord REST Deployment:**
   - When adding or modifying slash commands, run `node bot/deploy-commands.js` to push definitions to Discord's API.

---

## 4. Useful Terminal Commands

```powershell
# Check git status
git status

# Deploy slash commands to Discord
node bot/deploy-commands.js

# Test Netlify functions locally
node -e "require('./netlify/functions/discord.js'); console.log('OK');"

# Sync gh-pages branch with main
git checkout gh-pages; git merge main; git push origin gh-pages; git checkout main
```
