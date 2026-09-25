# Kith & Kin Mythic+ Night — Claude Project Guide

**Project Name:** Kith and Kin Mythic+ Night Web Dashboard & Discord Serverless Bot  
**Canonical Repo:** `C:\Users\MadKing\.gemini\antigravity\scratch\kith-and-kin-mplus`  
**GitHub:** `https://github.com/clayvanderburg/kith-and-kin-mplus` (`main` and `gh-pages`)  
**Live Site:** `https://knkmplus.netlify.app`  
**Discord Bot Interactions Endpoint:** `https://knkmplus.netlify.app/api/discord`  
**Multi-Agent Hub:** `F:\MadKing\grok-shared\agents-hub` (Jarvis F: drive)

---

## 1. Overview & Purpose

This system manages Friday Mythic+ Keystone Nights for the **Kith and Kin** World of Warcraft guild (US Perenolde, Korgath, Moon Guard, Frostmane, Cairne).

It solves the weekly guild puzzle:
1. **Roster Signups:** Members register their characters, roles (Tank/Healer/DPS), keystone brackets (+6-8 Hero crest, +10-12 Vault, +12+ IO push), and preferences (Born Leader, Stronk Back carry, Needs Carry, Voluntary Reserve, Shitter alt squad).
2. **Smart Group Formation:** An algorithmic solver balances 5-man parties (1 Tank, 1 Healer, 3 DPS) matching key brackets and player synergy.
3. **Keystone Management:** Real-time keystone rolling, Raider.IO data sync (iLvl/IO score), and dungeon tracking.
4. **Participation Leaderboard ("The Hall of Champions"):** A seasonal ranking system that values guild citizenship—attendance (+15/night), completed/timed keys (+10 base, +5 timed, +2/lvl > 10), role flexibility (+5 dual, +10 triple), leadership (+8/night), carry mentorship (+15/carry run), and stronk backs (+8/night)—over raw parses.
5. **Discord Integration:** A complete 100% serverless Discord application hosted on Netlify Functions with slash commands, interactive buttons, select menus, and modals.
6. **AI Guild Chronicler:** An automated narrative engine using Gemini Flash to write lore-themed recap chronicles of Friday dungeon adventures.

---

## 2. Key Pages & Routes

| Route / File | Title | Description |
|--------------|-------|-------------|
| `index.html` | **Control Center** | Officer management console. Party formation solver, keystone roulette, attendance toggles, dungeon run logging, Chronicler AI recap modal, and player season dossiers. *(Password gate `#officerGate` is currently bypassed for frictionless preview).* |
| `signup.html` | **Player View** | Mobile-first self-service sign-up portal for guild members. Live search across 689 guild members, role selectors, key goals, squad vibes, and Discord sync status. |
| `leaderboard.html` | **The Hall of Champions** | Seasonal participation leaderboard. Features Olympic podium (🥇 #1 center, 🥈 #2 left, 🥉 #3 right), scoring code rules grid, filter pills, full standings table, individual points audit modal, and an authentic Discord client preview modal. |
| `styles.css` | **Theme & UI** | Unified obsidian and dark crimson aesthetic (`#0a0a0c`, `#141014`, `#800020`, `#f5d061`, `#e2e8f0`). Responsive, fantasy-styled typography (Cinzel & Inter). |

---

## 3. Architecture & File Layout

```text
kith-and-kin-mplus/
├── index.html                     # Officer Control Center
├── signup.html                    # Member RSVP portal
├── leaderboard.html               # The Hall of Champions participation board
├── styles.css                     # Primary unified CSS
├── app.js                         # Control Center orchestrator & solver UI
├── signup.js                      # Player sign-up orchestrator
├── leaderboard.js                 # Leaderboard orchestrator, Web Audio FX, filters
├── leaderboard-engine.js          # Universal isomorphic calculation engine & demo dataset
├── player-stats.js                # Season dossiers, private officer notes, run tracking
├── chronicler.js                  # AI Guild Chronicler frontend (Gemini Flash)
├── run-matcher.js                 # Smart party keystone matching logic
├── netlify.toml                   # Netlify redirect rules, function bundle, cache headers
│
├── netlify/functions/             # Serverless backend (AWS Lambda on Netlify)
│   ├── discord.js                 # Discord Interactions HTTP POST webhook endpoint
│   ├── state.js                   # /api/state: public view (GET), officer full view + writes (x-sync-secret)
│   ├── lib/live-state.js          # Netlify Blobs reader/merger/writer (helper, not an endpoint)
│   ├── lib/auth.js                # Secret checks + public state projection (helper)
│   ├── chronicler-recap.js        # Gemini Flash AI chronicle generator
│   ├── bnet-login.js              # Battle.net OAuth redirect
│   ├── bnet-callback.js           # Battle.net OAuth token handler
│   ├── me.js                      # Character profile & guild validation
│   ├── player-session.js          # Session state
│   └── officer-auth.js            # Officer passphrase verification
│
├── bot/                           # Discord Bot codebase
│   ├── bot.js                     # Standalone Discord.js gateway client (local/persistent)
│   ├── commands.js                # Discord slash command definitions
│   ├── deploy-commands.js         # REST deployer for slash commands (guild + global)
│   ├── embeds.js                  # Discord Embed and Component Builders
│   ├── solver.js                  # Mythic+ 5-man party formation solver
│   ├── roll-ui.js                 # Keystone rolling button workflows
│   ├── roster-search.js           # Fuzzy search across guild roster
│   ├── sync.js                    # Remote state sync & Raider.IO polling
│   ├── leaderboard-engine.js      # Re-exports ../leaderboard-engine.js (single source)
│   └── guild-roster.json          # 689 imported Kith & Kin characters
```

---

## 4. State Storage & Netlify Blobs

State is persisted serverlessly using **Netlify Blobs** (`@netlify/blobs`):
- **Store Name:** `mplus-state`
- **Blob Key:** `current_state` (strong consistency)
- **Fallback:** Local `/tmp/kk_mplus_state.json` if blobs are unreachable.

### State Schema
```javascript
{
  players: [
    {
      id: "kk-adrenaline",
      name: "Adrenaline",
      className: "Warrior",
      realm: "Perenolde",
      region: "us",
      ilvl: 322,
      io: 3236,
      roles: ["Tank", "DPS"],
      keyMin: 14,
      keyMax: 18,
      ownedKey: "Murder Row +16",
      attending: true,
      carryPreference: "willing_carry", // 'none' | 'need_carry' | 'willing_carry'
      isLeader: false,
      isReserve: false,
      isShitter: false,
      discordId: "1234567890"
    }
  ],
  formedGroups: [
    {
      id: "group-1",
      name: "Group 1",
      tank: { ... },
      healer: { ... },
      dps: [ { ... }, { ... }, { ... } ],
      targetKeyRange: [12, 16],
      rolledKey: "Murder Row +14"
    }
  ],
  benchedPlayers: [],
  runs: [],                        // Completed dungeon run logs
  runNotes: {},                    // Officer private dossiers and notes
  lastUpdated: "ISO-Timestamp"
}
```

---

## 5. Discord Bot & Slash Commands

The bot operates **100% serverlessly** via `netlify/functions/discord.js`. Discord sends Ed25519-signed HTTP POST requests directly to `https://knkmplus.netlify.app/api/discord`.

### Registered Slash Commands
- `/mplus leaderboard [view: auto|live|demo]`: Participation leaderboard embed. `auto` (default) shows live standings once 10+ keys are logged, otherwise a clearly labeled DEMO.
- `/mplus roster`: Returns the current Friday night signup roster card.
- `/mplus post-signup`: Posts an interactive signup card into the channel with buttons.
- `/mplus signup [character] [role] [min_key] [max_key]`: Self-service signup command.
- `/mplus form [strategy]`: Form groups (Captains/High Council only).
- `/mplus roll-key`: Interactive UI to roll an optimal keystone for a group.
- `/mplus sync-keys`: Refreshes iLvl and IO from Raider.IO.
- `/mplus web`: Posts a direct link to the web app.
- `/mplus clear`: Clears formed groups while preserving signups.

To re-deploy slash commands to Discord:
```powershell
node bot/deploy-commands.js
```

---

## 6. Development & Deployment Guidelines

1. **Deployments:**
   - Any commit pushed to `origin/main` automatically triggers Netlify continuous deployment.
   - Always keep `gh-pages` fast-forwarded: `git checkout gh-pages; git merge main; git push origin gh-pages; git checkout main`.
2. **Universal Leaderboard Engine:**
   - `leaderboard-engine.js` lives only at the repo root. `bot/leaderboard-engine.js` re-exports it; `netlify.toml` bundles it into functions.
3. **Officer access:**
   - Viewing the Control Center is open. Saving, private notes and the Chronicler ask for `OFFICER_KEY` once per browser session (kept in sessionStorage). There are no default secrets: missing env vars mean access is refused.
4. **Environment Variables on Netlify:**
   - `DISCORD_PUBLIC_KEY`: Discord application public key for Ed25519 request signature verification.
   - `DISCORD_TOKEN` / `DISCORD_CLIENT_ID`: Bot token and application ID.
   - `GEMINI_API_KEY`: Used by `netlify/functions/chronicler-recap.js` for lore chronicles (officer-only endpoint).
   - `SYNC_SECRET`: trusted writer key (bot scripts). `OFFICER_KEY`: passphrase officers type. `SESSION_SECRET`: signs Battle.net login cookies.
   - Optional: `EVENT_TIME_ZONE` (default America/New_York), `EVENT_HOUR` (default 20), `HOST_NAME` (default MadKing).
   - `BNET_CLIENT_ID` / `BNET_CLIENT_SECRET`: Battle.net OAuth.

---

## 7. Automatic Data (no player input needed)

| What | How | Where |
|------|-----|-------|
| Raider.IO score + ilvl for the whole guild | Scheduled every 15 min, ~170 characters per run (attendees first, then oldest). Stored in blob `scores`, overlaid on every read. | `netlify/functions/refresh-scores.js`, `lib/jobs.js` |
| Friday keys + attendance | Scheduled every 15 min Fri/Sat UTC; inside the night window (kickoff −2h to +9h ET) pulls attendees' **and their alts'** Raider.IO recent runs, logs each run once per character (`rio-<keystone_run_id>`), links hand-logged duplicates, records who showed up in blob `nights`. | `netlify/functions/sync-night.js`, `lib/jobs.js` |
| Alts | Characters are tied to one person by Battle.net account (`bnetId` + `accountChars` from login) and Discord account (`discordId`). Every player gets a hashed `personId`; the leaderboard merges a person's characters into one row. | `lib/live-state.js#assignPeople`, `leaderboard-engine.js#aggregatePeople` |
| Current keystones | No web API exposes bag keystones. The standalone `addon/KithKinKeys` addon speaks LibKeystone (BigWigs), Open Raid (Details!, via bundled LibDeflate), Astral Keys (incl. guild sync relays of offline members) and chat keystone links; `tools/key-uploader.js` on an officer's PC posts them to `/api/keys` after `/reload`/logout. Keys older than the Tuesday reset are cleared. | `addon/`, `tools/`, `netlify/functions/keys.js` |
| Officer "Sync Raider.IO" button | `POST /api/refresh-now`: attendees' scores + latest Friday's runs immediately. | `netlify/functions/refresh-now.js` |

Setup on the officer PC: `node tools\install-addon.js` once, then `tools\start-key-uploader.cmd` (minimized window; add a shortcut to shell:startup to auto-start).
