# 🏰 Kith & Kin — Mythic+ Night Complete User Guide

> **Live Web App:** [https://knkmplus.netlify.app](https://knkmplus.netlify.app)  
> **Bot Invite Link:** [Click to Invite Bot to Discord](https://discord.com/oauth2/authorize?client_id=1552791262447280128&permissions=277025507392&scope=bot%20applications.commands)  
> **Event Kickoff:** Every Friday @ 8:00 PM EST

---

## ⚡ Quick Slash Commands Cheat Sheet

| Command | Who Uses It | What It Does | Example |
| :--- | :---: | :--- | :--- |
| **`/mplus post-signup`** | 👑 Officers | Posts the interactive Friday RSVP event card with 1-click buttons. | `/mplus post-signup` |
| **`/mplus form`** | 👑 Officers | Solves and builds balanced 5-man groups (Lust/BRez/IO/Carries). | `/mplus form` or `/mplus form strategy:balanced` |
| **`/mplus roll-key`** | 🎲 Anyone | Rolls a random keystone, checks who holds it, and respects banned dungeons. | `/mplus roll-key source:pool level:12` |
| **`/mplus sync-keys`** | 🔑 Anyone | Queries Raider.IO to update attending members' active bag keys. | `/mplus sync-keys` |
| **`/mplus roster`** | 👥 Anyone | Displays the current sign-ups grouped by class and role count. | `/mplus roster` |
| **`/mplus signup`** | 🙋‍♂️ Members | Manual typed sign-up (alternative to clicking the buttons). | `/mplus signup character:MadKing role:Tank min_key:10 max_key:16` |
| **`/mplus clear`** | 👑 Officers | Clears tonight's parties when done (keeps player sign-ups). | `/mplus clear` |
| **`/mplus web`** | 🌐 Anyone | Posts the direct link to the live interactive web dashboard. | `/mplus web` |

---

## 🎛️ Interactive Discord Buttons (No Typing Needed!)

Whenever `/mplus post-signup` is posted in your Discord channel, members can run everything with **1 click**:

### Row 1: Role RSVP
- `[Tank 🛡️]`: Sign up as a Tank. Pops open a quick window to verify character name & comfortable key range.
- `[Healer 💚]`: Sign up as a Healer.
- `[DPS ⚔️]`: Sign up as a DPS.
- `[Can’t Make It 💤]`: Marks yourself absent if plans change.

### Row 2: Vibe & Group Actions
- `[Need Carry 🎒]`: Flags your sign-up so the optimizer automatically pairs you with a high-IO guildie.
- `[Stronk Back 🏋️]`: Flags yourself willing to carry keys and anchor groups.
- `[Shitter Alt 💩]`: Opt-in to the **Shitter Alt Squad** (bundles under-geared alts together for zero-stress keys).
- `[Form Groups 🏰]`: Instantly runs the solver and posts balanced parties.
- `[Web View 🌐]`: Opens the live web app in your browser.

### Row 3: Keystone & Sync Tools
- `[Roll Key 🎲]`: Rolls a random allowed keystone and shows who in the raid holds it.
- `[Sync Keys 🔑]`: Pulls live bag keys and recent runs from Raider.IO for attendees.
- `[Refresh 🔄]`: Updates the embed with the latest sign-up numbers.

---

## 📅 The 3-Step Friday Night Workflow

### Step 1: Post Sign-ups Early in the Week
An officer types in `#mythic-plus`:
```
/mplus post-signup
```
Members click `[Tank 🛡️]`, `[Healer 💚]`, or `[DPS ⚔️]` to register. The bot automatically checks Raider.IO to grab their real **Midnight Season 2 IO score**, item level, and current keystone!

### Step 2: At 8:00 PM EST, Form Groups
When everyone is in voice, click **`[Form Groups 🏰]`** or type:
```
/mplus form
```
The solver automatically builds 5-man parties ensuring:
- Exactly **1 Tank, 1 Healer, 3 DPS** per party.
- **Bloodlust & Battle Res** guaranteed in every group.
- **Balanced Average IO** across teams.
- "Need Carry" players paired with "Stronk Back" veterans.
- "Shitter" alts placed together in their own fun squad.

### Step 3: Roll or Assign Keystones
- Click **`[Roll Key 🎲]`** to roll a random dungeon for the night.
- Or head over to the [Live Web Dashboard](https://knkmplus.netlify.app) to drag/drop players, exclude hated dungeons, or reroll keys per party.

---

## 🎲 Keystone Roulette & Dungeon Exclusions (Web Dashboard)

On [https://knkmplus.netlify.app](https://knkmplus.netlify.app):

### 1. Active Dungeon Pool (Exclude Hated Keys)
- Every Midnight Season 2 dungeon has an interactive chip at the top.
- **Click any chip to toggle it**:
  - 🟩 **Green (Active)**: Eligible to be picked.
  - 🟥 **Red / Strikethrough (Excluded)**: Completely banned from party assignments and random rolls!
- Use **"Include All"** or **"Reset"** to restore.

### 2. Keystone Roulette & Quick Assign
- **Source**:
  - `🎲 Random from Allowed Pool`: Picks an unbanned dungeon.
  - `🔑 Random from Held Keys`: Picks randomly from keys attending players *actually hold in their bags*.
  - `🎯 Specific Dungeon (Manual)`: Select a dungeon directly.
- **Key Level**: Choose target level (e.g. `+12`).
- **Assign To**: Choose **All Formed Groups** or a specific party (**Party 1**, **Party 2**, etc.).
- Click **"🎲 Roll Keystone!"** — updates the parties and shows who holds the key!

### 3. Party Card Quick Controls
- Each party card has its own **`🎲 Roll`** button to reroll a key just for that team.
- An **inline dropdown** lets you manually change a party's dungeon anytime.

### 4. 🔑 Sync Keys Button
- In the Roster toolbar, click **`🔑 Sync Keys`** to batch-refresh all attending members directly from Raider.IO.

---

## 💡 Pro Tips for Officers

1. **Locking Players**: On the website, click the 🔒 lock icon on any player to lock them into their party. When you hit "Reroll Unlocked", only unlocked spots will change!
2. **Drag & Drop**: In the web app, you can freely drag players between parties or swap roles on the fly.
3. **Full Guild Sync**: Click **`⚡ Live Guild Sync`** on the website to import the entire 690+ member Kith and Kin guild roster from Blizzard/Raider.IO.
4. **Everything Stays in Sync**: Anything changed on the website updates Discord, and anything clicked in Discord updates the website in real time.

