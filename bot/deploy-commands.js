/**
 * One-time slash command registration script for Discord.
 * Run with: npm run deploy-commands
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();
const { registerCommands } = require('./commands');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error('❌ Error: DISCORD_TOKEN and CLIENT_ID must be set in bot/.env');
  process.exit(1);
}

(async () => {
  try {
    console.log('🚀 Deploying slash commands to Discord...');
    await registerCommands(TOKEN, CLIENT_ID, GUILD_ID);
    console.log('✅ Successfully deployed all /mplus slash commands to Discord!');
    // Double-check what Discord now has: the signup character box must have type-ahead turned on.
    const url = GUILD_ID
      ? `https://discord.com/api/v10/applications/${CLIENT_ID}/guilds/${GUILD_ID}/commands`
      : `https://discord.com/api/v10/applications/${CLIENT_ID}/commands`;
    const res = await fetch(url, { headers: { Authorization: `Bot ${TOKEN}` } });
    const mplus = (await res.json()).find(c => c.name === 'mplus');
    const signup = mplus?.options?.find(o => o.name === 'signup');
    const character = signup?.options?.find(o => o.name === 'character');
    console.log(`   /mplus command id: ${mplus?.id || 'NOT FOUND'}`);
    console.log(`   /mplus signup character type-ahead: ${character?.autocomplete ? 'ON ✅' : 'OFF ❌'}`);
  } catch (error) {
    console.error('❌ Failed to deploy slash commands:', error);
    process.exitCode = 1;
  }
})();
