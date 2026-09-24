# 🏰 Kith & Kin — Friday Mythic+ Night User Guide

Welcome to the **Kith & Kin Mythic+ Night** bot and web companion! This guide shows how Friday Night sign-ups, Raid-Helper style cards, and automated party balancing work.

---

## 📸 The Friday Event Window (Raid-Helper Style)

Whenever you post `/mplus post-signup`, the bot posts an interactive Friday Night event card in your Discord channel:

```
┌─────────────────────────────────────────────────────────────┐
│ 🏰 Friday Mythic+ Keystone Night                            │
│ Conquer Midnight Season 2 keystones! Match IO ranges,      │
│ balance Bloodlust & BRez, pair carries, and form parties.  │
│                                                             │
│ 👑 Host: MadKing  •  👥 Attending: 14 (+1 absent)           │
│ 📅 Event: Every Friday  •  ⏰ Time: 8:00 PM EST             │
│ ⏳ Kickoff: in 18 hours (<t:TIMESTAMP:R>)                    │
│ ─────────────────────────────────────────────────────────── │
│ 🛡️ Tanks: 3  •  💚 Healers: 3  •  ⚔️ DPS: 8  •  🏰 Groups: 3│
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ ⚔️ Death Knight (2)     🪓 Warrior (1)        🌿 Druid (1)   │
│ 🛡️ 1. MadKing (3.1k•+14) 🛡️ 1. Adrenaline(2.9k) 💚 1. Holy (2.9k)│
│ ⚔️ 2. Azerite (2.8k•+12)                                    │
│                                                             │
│ 🛡️ Paladin (2)          🏹 Hunter (2)         🔥 Warlock (1) │
│ ⚔️ 1. KingRaven (2.7k)   ⚔️ 1. Starkatt (2.9k) ⚔️ 1. Sloppy (2.5k)│
│ 💚 2. Athene (2.6k)      ⚔️ 2. Towlie (2.6k)                 │
│                                                             │
│ 🎭 Squad Preferences & Vibe:                                │
│ 🎒 Needs Carry (2): Totess, Logic                           │
│ 🏋️ Back is Stronk (2): MadKing, Starkatt                    │
│ 💩 Shitter Alt Squad (3): Sloppy, Azerite, Towlie           │
│ 💤 Absent (1): Tyberia                                      │
└─────────────────────────────────────────────────────────────┘
  [Tank 🛡️]   [Healer 💚]   [DPS ⚔️]   [Can't Make It 💤]
  [Need Carry 🎒]  [Stronk Back 🏋️]  [Shitter Alt 💩]  [Form Groups 🏰]  [Web View 🌐]
```

---

## 🙋‍♂️ For Guild Members (How to Sign Up in 5 Seconds)

### 1. Click Your Role Button
At the bottom of the Friday event card, click your role:
- `[Tank 🛡️]`
- `[Healer 💚]`
- `[DPS ⚔️]`

### 2. Confirm Character Name
A small popup window will appear:
- **Character Name**: Type your WoW character name (defaults to your Discord name).
- **Key Range**: e.g., `8-14` (what key levels you want to run tonight).
- Click **Submit**!

> ⚡ **Raider.IO Magic**: The bot automatically checks Raider.IO to fetch your real item level, Midnight Season 2 IO score, and active keystone!

### 3. (Optional) Pick Your Vibe
Click any of the second-row buttons:
- `[Need Carry 🎒]`: Alerts the group generator to pair you with high-IO carries.
- `[Stronk Back 🏋️]`: Marks you willing to anchor and carry members needing keys.
- `[Shitter Alt 💩]`: Marks you for the "Shitter Alt Squad" so you run with other chill/alt keys.
- `[Can't Make It 💤]`: If something comes up and you can no longer attend.

---

## 👑 For Officers / MadKing (Managing the Event)

### 1. Post the Sign-up Card for Friday
In your `#mythic-plus` or `#announcements` channel:
```
/mplus post-signup
```
This drops the interactive Friday event card with live countdown and one-click buttons.

### 2. Form Groups with One Click
When it's time to play (or when you have enough people):
- Click `[Form Groups 🏰]` on the embed, or type:
  ```
  /mplus form
  ```
The solver instantly builds optimal 5-man parties considering:
- **1 Tank, 1 Healer, 3 DPS** per party.
- **Bloodlust & Battle Res** guaranteed in every group.
- **Balanced Average IO**: No single stacked group while others struggle.
- **Carry Pairing**: Matches "Need Carry" members with "Stronk Back" veterans.
- **Shitter Alt Isolation**: Bundles all "Shitter" opt-ins together into their own squad.
- **Keystone Assignment**: Matches group comfort with dungeons from Midnight Season 2.

### 3. Clear Groups for Next Week
```
/mplus clear
```
Clears the generated groups while preserving your roster.

### 4. Direct Slash Command Sign-up (Alternative to Buttons)
Members can also sign up with a single typed command:
```
/mplus signup character:MadKing role:Tank min_key:10 max_key:16 carry_pref:willing_carry
```

---

## 🎲 Keystone Roulette, Dungeon Pool & Key Sync (New!)

### 1. Active Dungeon Pool & Exclusions
Don't want to run a specific dungeon tonight (e.g. everyone hates *Kings' Rest* or you already did *Voidscar Arena*)?
- In the **Active Dungeon Pool** section on the web dashboard, simply **click any dungeon chip** to toggle it:
  - 🟩 **Green (Active)**: Eligible to be rolled and assigned.
  - 🟥 **Red / Strikethrough (Excluded)**: Completely excluded from group generation, random rolls, and party suggestions!
- Quick actions: Click **"Include All"** or **"Reset"** to restore all 8 Midnight Season 2 dungeons.

### 2. Keystone Roulette & Quick Assign
Roll a keystone on the fly and immediately assign it to your parties:
- **Source**:
  - `🎲 Random from Allowed Pool`: Picks an un-excluded dungeon at random.
  - `🔑 Random from Held Keys`: Picks randomly from keystones your attending members actually hold in their bags!
  - `🎯 Specific Dungeon (Manual)`: Select a specific dungeon directly.
- **Key Level**: Set the target difficulty (e.g., `+12`).
- **Assign To**: Choose **All Formed Groups** or a specific party (**Party 1**, **Party 2**, etc.).
- Hit **"🎲 Roll Keystone!"** — it plays a fanfare, shows who is holding the key, and updates the party card.

### 3. Quick Reroll & Manual Pick per Party Card
On every formed group card:
- Click the **`🎲 Roll`** button next to the dungeon name to reroll a key specifically for that party from the allowed pool.
- Use the **inline dungeon dropdown** to manually switch that party's dungeon at any time.

### 4. 🔑 Sync Keys Button
- Click the **`🔑 Sync Keys`** button in the Roster toolbar to automatically query Raider.IO for all attending members, pulling their latest bags/completed keystones and updating their key ranges in real time.
- In Discord: Click `[Sync Keys 🔑]` on the event card, or use `/mplus sync-keys`.

### 5. Discord Keystone Commands
- `/mplus roll-key`: Rolls a random keystone (optional `source:pool|held`, `level:12`, `exclude:Kings' Rest`).
- `/mplus sync-keys`: Refreshes attending members' keys from Raider.IO.
- `[Roll Key 🎲]` and `[Sync Keys 🔑]` buttons right on the Discord sign-up message!

---

## 🌐 Live Two-Way Web Dashboard

You can manage groups in Discord or on the website — they stay 100% in sync!
- **URL**: [https://knkmplus.netlify.app](https://knkmplus.netlify.app)
- Click `[Web View 🌐]` directly on the Discord card.
- In the web app, you can manually drag/drop players between groups, lock players into specific parties, reroll unlocked spots, or import the entire 690+ member guild roster.
- Any change made on the web dashboard updates Discord, and any Discord button click updates the website.
