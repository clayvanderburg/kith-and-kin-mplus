# Kith & Kin Mythic+ Discord Bot Setup Guide

This guide walks you through setting up, deploying, and running the **Kith & Kin Mythic+ Night Discord Bot**, fully synchronized in real-time with the live web application.

---

## 1. Create Your Discord Application & Bot

1. Go to the **[Discord Developer Portal](https://discord.com/developers/applications)** and log in.
2. Click **New Application** in the top right.
   - Name it: `Kith and Kin Mythic+` (or any name you prefer).
   - Agree to the Terms of Service and click **Create**.
3. In the left sidebar, navigate to **General Information**:
   - Copy the **Application ID** (this is your `CLIENT_ID`).
4. In the left sidebar, navigate to **Bot**:
   - Under the username, click **Reset Token** (or **View Token**) and copy the generated token (this is your `DISCORD_TOKEN`).
   - Under **Privileged Gateway Intents**, enable:
     - ✅ **Server Members Intent**
     - ✅ **Message Content Intent**
   - Click **Save Changes**.

---

## 2. Invite the Bot to Your Guild Server

1. In the left sidebar, navigate to **OAuth2** ➔ **URL Generator**.
2. Under **Scopes**, check:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Under **Bot Permissions**, check:
   - ✅ `Send Messages`
   - ✅ `Embed Links`
   - ✅ `Attach Files`
   - ✅ `Read Message History`
   - ✅ `Use External Emojis`
   - ✅ `View Channels`
4. Copy the generated URL at the bottom and paste it into your browser.
5. Select your Discord server (e.g. **Kith and Kin**) and click **Authorize**.

---

## 3. Configure Local Environment (`bot/.env`)

In the `bot` folder, copy `.env.example` to `.env`:

```bash
cd bot
copy .env.example .env
```

Open `bot/.env` and fill in your values:

```ini
# Bot Token & Application ID from Discord Developer Portal
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here

# (Optional) If provided, slash commands register instantly in this server without waiting for global cache
GUILD_ID=your_discord_server_id

# The live Netlify API URL for two-way synchronization
API_URL=https://kith-and-kin-mplus.netlify.app/api/state

# Shared secret key matching netlify/functions/state.js
SYNC_SECRET=kith_and_kin_mythic_key_2026
```

---

## 4. Install Dependencies & Start the Bot

From inside the `bot/` folder:

```bash
cd bot
npm install
npm start
```

You should see:
```
🤖 Kith & Kin Bot logged in as Kith and Kin Mythic+#XXXX!
[Commands] Successfully reloaded slash commands!
```

*(Optional: Use `pm2 start bot.js --name "kith-and-kin-bot"` or run as a Windows background task / cloud worker to keep it running 24/7).*

---

## 5. Discord Commands & Interactive Buttons

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
*(Automatically looks up your character on Raider.IO to fetch current item level, Mythic+ score, and active Midnight Season 2 keystone).*

### `/mplus roster`
Displays the full live sign-up roster, attending counts by role, and carries/shitters.

### `/mplus form`
Runs the advanced group optimizer with Midnight Season 2 keys, Bloodlust & Battle Res balancing, carry pairing, and shitter squad isolation, outputting complete 5-man party cards.

### `/mplus clear`
Resets formed groups while keeping roster signups intact.

### `/mplus web`
Posts a direct clickable link to the live web dashboard.

---

## 6. How Two-Way Sync Works

- **Discord ➔ Web**: When any guild member registers or clicks RSVP buttons in Discord, the bot updates `/api/state`. The web dashboard automatically reflects the change within seconds (or on manual refresh).
- **Web ➔ Discord**: When you generate groups, toggle attendance, or add members on the web app, it pushes changes to `/api/state`. Running `/mplus roster` or `/mplus form` in Discord instantly uses the latest web state.
