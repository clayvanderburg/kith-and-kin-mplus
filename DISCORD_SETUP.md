# Kith & Kin Mythic+ Discord Bot Setup Guide

You do **NOT** have to host or run the bot on your computer!

Discord supports **Serverless HTTP Interactions**, meaning Netlify can run the entire bot 24/7 for free with **zero servers, zero background processes, and zero computers running**.

---

## 🚀 Option 1: 100% Serverless on Netlify (Recommended — No Computer Needed!)

With this setup, when a guild member runs `/mplus ...` or clicks an RSVP button in Discord, Discord directly calls your Netlify serverless function (`/api/discord`). It processes the command, updates the shared state, and sends the response back to Discord instantly.

### Step 1: Create Your Discord Application
1. Go to the **[Discord Developer Portal](https://discord.com/developers/applications)** and sign in.
2. Click **New Application** (e.g. `Kith & Kin Mythic+`).
3. Under **General Information**, you will find:
   - **Application ID** (this is your `CLIENT_ID`)
   - **Public Key** (this is your `DISCORD_PUBLIC_KEY`)
4. Under **Bot** (left menu):
   - Click **Reset Token** and copy your **Bot Token** (`DISCORD_TOKEN`).

### Step 2: Set Environment Variables in Netlify
1. Go to your **[Netlify Dashboard](https://app.netlify.com)** ➔ select your `kith-and-kin-mplus` site.
2. Navigate to **Site configuration** ➔ **Environment variables**.
3. Add:
   - `DISCORD_PUBLIC_KEY`: Paste your Public Key from Discord Developer Portal.
   - `SYNC_SECRET`: a long random string (never commit it). Also set `OFFICER_KEY` (the passphrase officers type) and `SESSION_SECRET` (signs Battle.net logins).

### Step 3: Set Interactions Endpoint URL in Discord
1. Back in the **Discord Developer Portal** ➔ **General Information**.
2. Find the field labeled **"Interactions Endpoint URL"**.
3. Enter your live Netlify endpoint:
   ```
   https://knkmplus.netlify.app/api/discord
   ```
4. Click **Save Changes**. Discord will send an automated validation ping to Netlify. Because your function handles `type: 1` verification, Discord will immediately verify and save with a green checkmark!

### Step 4: Register the Slash Commands (One-Time Only)
To register the `/mplus` commands in your Discord server:
1. In the `bot` directory on your computer, create `bot/.env` with your `DISCORD_TOKEN`, `CLIENT_ID`, and `GUILD_ID`.
2. Run:
   ```bash
   cd bot
   npm install
   npm run deploy-commands
   ```
3. That's it! You never need to run anything on your computer again. Netlify handles everything automatically.

### Step 5: Invite the Bot to Your Guild
1. In the **Discord Developer Portal** ➔ **OAuth2** ➔ **URL Generator**.
2. Under **Scopes**, select:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Under **Bot Permissions**, select:
   - ✅ `Send Messages`
   - ✅ `Embed Links`
   - ✅ `Attach Files`
   - ✅ `Read Message History`
4. Copy the generated invite link, open it in your browser, and authorize it for your Kith and Kin Discord server.

---

## 💻 Option 2: Self-Hosted on Your Computer or Home Server (BB8)

If you ever prefer running a traditional persistent bot process on your computer, home server (e.g. `BB8`), or a VPS:

1. Configure `bot/.env`:
   ```ini
   DISCORD_TOKEN=your_bot_token
   CLIENT_ID=your_client_id
   GUILD_ID=your_guild_id
   API_URL=https://knkmplus.netlify.app/api/state
   SYNC_SECRET=<same long random string as Netlify>
   ```
2. Start the bot:
   ```bash
   cd bot
   npm install
   npm start
   ```
3. The bot connects over WebSocket Gateway and continuously listens for commands and button clicks while syncing with Netlify.

---

## Discord Commands & Features

### `/mplus post-signup`
Posts an interactive recruitment embed in the channel with one-click buttons:
- `[🛡️ Tank]` - Register as Tank (prompts modal for character name & key range)
- `[💚 Healer]` - Register as Healer
- `[⚔️ DPS]` - Register as DPS
- `[🎒 Need Carry]` - Toggle "I need a carry"
- `[🏋️ Stronk Back]` - Toggle "My back is stronk (willing to carry)"
- `[💩 Shitter]` - Toggle "Put me in the shitter alt squad"
- `[❌ Can't Make It]` - Mark absent

### `/mplus signup`
Quick command sign-up directly with parameters:
- `/mplus signup character:MadKing role:Tank min_key:10 max_key:16 carry_pref:willing_carry shitter:False`
*(Automatically looks up Raider.IO to fetch current item level, Mythic+ score, and active Midnight Season 2 keystone).*

### `/mplus roster`
Displays the full live sign-up roster, attending counts by role, and carries/shitters.

### `/mplus form`
Runs the advanced group optimizer with Midnight Season 2 keys, Bloodlust & Battle Res balancing, carry pairing, and shitter squad isolation, outputting complete 5-man party cards.

### `/mplus clear`
Resets formed groups while keeping roster signups intact.

### `/mplus web`
Posts a direct clickable link to the live web dashboard.
