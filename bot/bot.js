/**
 * Kith and Kin Mythic+ Night Discord Bot
 * Interactive Discord client synchronized with the live web application.
 */

require('dotenv').config();
const { Client, GatewayIntentBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { registerCommands } = require('./commands');
const { createRosterEmbed, createGroupEmbeds, createSignupButtons } = require('./embeds');
const { solveGroups, WOW_CLASSES } = require('./solver');
const { fetchRemoteState, pushRemoteState, lookupRaiderIo } = require('./sync');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const WEB_URL = process.env.WEB_URL || 'https://kith-and-kin-mplus.netlify.app';

if (!TOKEN || !CLIENT_ID) {
  console.warn('⚠️ WARNING: DISCORD_TOKEN or CLIENT_ID is not configured in .env. Bot cannot start until configured.');
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

// Map of Discord User ID -> WoW Character Name
const userCharacterMap = new Map();

client.once('ready', async () => {
  console.log(`🤖 Kith & Kin Bot logged in as ${client.user.tag}!`);
  client.user.setActivity('Mythic+ Keys | /mplus', { type: 0 });

  try {
    if (TOKEN && CLIENT_ID) {
      await registerCommands(TOKEN, CLIENT_ID, GUILD_ID);
    }
  } catch (err) {
    console.error('[Bot] Failed to register slash commands:', err);
  }
});

// Interaction handling
client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction);
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
    }
  } catch (err) {
    console.error('[Bot] Interaction error:', err);
    const replyContent = '⚠️ An error occurred while executing this command.';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: replyContent, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: replyContent, ephemeral: true }).catch(() => {});
    }
  }
});

async function handleSlashCommand(interaction) {
  if (interaction.commandName !== 'mplus') return;
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'web') {
    return interaction.reply({
      content: `🌐 **Kith & Kin Mythic+ Night Web App:**\n${WEB_URL}`,
      ephemeral: false
    });
  }

  if (subcommand === 'roster') {
    await interaction.deferReply();
    const state = await fetchRemoteState();
    const embed = createRosterEmbed(state.players || [], WEB_URL);
    return interaction.editReply({ embeds: [embed] });
  }

  if (subcommand === 'post-signup') {
    const state = await fetchRemoteState();
    const embed = createRosterEmbed(state.players || [], WEB_URL);
    const buttons = createSignupButtons();
    return interaction.reply({
      content: '⚡ **Mythic+ Night Sign-ups are OPEN!** Click below to register your role and preferences:',
      embeds: [embed],
      components: buttons
    });
  }

  if (subcommand === 'signup') {
    await interaction.deferReply({ ephemeral: true });
    const charName = interaction.options.getString('character');
    const rolesStr = interaction.options.getString('role');
    const minKey = interaction.options.getInteger('min_key');
    const maxKey = interaction.options.getInteger('max_key');
    const keystone = interaction.options.getString('keystone');
    const carryPref = interaction.options.getString('carry_pref') || 'none';
    const isShitter = interaction.options.getBoolean('shitter') || false;

    const roles = rolesStr.split(',');

    // Remember user's character mapping
    userCharacterMap.set(interaction.user.id, charName);

    const state = await fetchRemoteState();
    let player = (state.players || []).find(p => p.name.toLowerCase() === charName.toLowerCase());

    // Auto lookup Raider.IO if missing stats
    let rIoData = null;
    try {
      rIoData = await lookupRaiderIo(charName);
    } catch (e) {}

    const className = rIoData?.className || player?.className || 'Warrior';
    const ilvl = rIoData?.ilvl || player?.ilvl || 320;
    const io = rIoData?.io !== undefined ? rIoData.io : (player?.io || 0);
    const activeKey = keystone || rIoData?.ownedKey || player?.ownedKey || '';
    const keyMin = minKey || rIoData?.keyMin || player?.keyMin || 4;
    const keyMax = maxKey || rIoData?.keyMax || player?.keyMax || 12;

    if (player) {
      player.roles = roles;
      player.attending = true;
      player.carryPreference = carryPref;
      player.isShitter = isShitter;
      player.keyMin = keyMin;
      player.keyMax = keyMax;
      if (activeKey) player.ownedKey = activeKey;
      if (rIoData) {
        player.ilvl = ilvl;
        player.io = io;
        player.className = className;
      }
    } else {
      player = {
        id: 'kk-' + charName.toLowerCase().replace(/[^a-z0-9]/g, ''),
        name: charName,
        className,
        roles,
        keyMin,
        keyMax,
        ownedKey: activeKey,
        realm: rIoData?.realm || 'Perenolde',
        region: 'us',
        ilvl,
        io,
        rank: 2,
        attending: true,
        carryPreference: carryPref,
        isShitter
      };
      state.players.push(player);
    }

    await pushRemoteState(state);

    return interaction.editReply({
      content: `✅ **Signed up ${player.name} (${player.className})**!\n• Roles: \`${roles.join('/')}\`\n• Keys: \`+${player.keyMin} to +${player.keyMax}\`${player.ownedKey ? `\n• Keystone: \`🔑 ${player.ownedKey}\`` : ''}\n• Stats: \`${player.ilvl} iLvl | ${player.io.toLocaleString()} IO\`\n\nSynced to the live website!`
    });
  }

  if (subcommand === 'form') {
    await interaction.deferReply();
    const strategy = interaction.options.getString('strategy') || 'balanced';
    const avoidDupes = interaction.options.getBoolean('avoid_dupes') !== false;

    const state = await fetchRemoteState();
    const attendees = (state.players || []).filter(p => p.attending);

    if (attendees.length < 5) {
      return interaction.editReply({
        content: `⚠️ Not enough attending members to form a 5-man group! Currently **${attendees.length}** attending. Need at least 5 with 1 Tank & 1 Healer.`
      });
    }

    const result = solveGroups({
      players: state.players,
      strategy,
      avoidClassDupes: avoidDupes,
      ensureLust: true,
      ensureBrez: true,
      balanceIo: true,
      lockedGroups: []
    });

    if (result.message && result.groups.length === 0) {
      return interaction.editReply({
        content: `⚠️ ${result.message}`
      });
    }

    state.formedGroups = result.groups;
    state.benchedPlayers = result.benched;
    await pushRemoteState(state);

    const embeds = createGroupEmbeds(result.groups, result.benched, WEB_URL);

    return interaction.editReply({
      content: `🎉 **Successfully forged ${result.groups.length} balanced Mythic+ groups for tonight!**\nSynced to [web dashboard](${WEB_URL}).`,
      embeds: embeds
    });
  }

  if (subcommand === 'clear') {
    await interaction.deferReply({ ephemeral: true });
    const state = await fetchRemoteState();
    state.formedGroups = [];
    state.benchedPlayers = [];
    await pushRemoteState(state);

    return interaction.editReply({
      content: '🧹 Cleared all active groups for tonight. Synced to web dashboard.'
    });
  }
}

async function handleButtonInteraction(interaction) {
  const customId = interaction.customId;

  if (customId === 'btn_refresh_roster') {
    await interaction.deferUpdate();
    const state = await fetchRemoteState();
    const embed = createRosterEmbed(state.players || [], WEB_URL);
    return interaction.editReply({ embeds: [embed] });
  }

  // Quick RSVP buttons
  const knownName = userCharacterMap.get(interaction.user.id) || interaction.member?.displayName || interaction.user.username;

  if (customId.startsWith('btn_attend_')) {
    const roleType = customId.replace('btn_attend_', ''); // tank, healer, dps
    const roleName = roleType === 'tank' ? 'Tank' : (roleType === 'healer' ? 'Healer' : 'DPS');

    // Prompt with a modal to confirm character name & key range
    const modal = new ModalBuilder()
      .setCustomId(`modal_rsvp_${roleName}`)
      .setTitle(`RSVP as ${roleName}`);

    const nameInput = new TextInputBuilder()
      .setCustomId('char_name')
      .setLabel('WoW Character Name')
      .setStyle(TextInputStyle.Short)
      .setValue(knownName.replace(/[^a-zA-Z]/g, ''))
      .setRequired(true);

    const keyRangeInput = new TextInputBuilder()
      .setCustomId('key_range')
      .setLabel('Comfortable Key Range (e.g. 10-15)')
      .setStyle(TextInputStyle.Short)
      .setValue('10-15')
      .setRequired(false);

    const keystoneInput = new TextInputBuilder()
      .setCustomId('keystone')
      .setLabel('Your Keystone (e.g. Murder Row +14)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Leave blank if none')
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(keyRangeInput),
      new ActionRowBuilder().addComponents(keystoneInput)
    );

    return interaction.showModal(modal);
  }

  if (customId === 'btn_absent') {
    await interaction.deferReply({ ephemeral: true });
    const state = await fetchRemoteState();
    const charName = userCharacterMap.get(interaction.user.id) || interaction.member?.displayName;

    const player = (state.players || []).find(p => p.name.toLowerCase() === (charName || '').toLowerCase());
    if (player) {
      player.attending = false;
      await pushRemoteState(state);
      return interaction.editReply(`Marked **${player.name}** as absent for tonight.`);
    }

    return interaction.editReply(`Could not find a signed-up character for you. Type \`/mplus signup\` to register first.`);
  }

  if (customId.startsWith('btn_vibe_')) {
    await interaction.deferReply({ ephemeral: true });
    const vibe = customId.replace('btn_vibe_', '');
    const charName = userCharacterMap.get(interaction.user.id) || interaction.member?.displayName;
    const state = await fetchRemoteState();
    const player = (state.players || []).find(p => p.name.toLowerCase() === (charName || '').toLowerCase());

    if (!player) {
      return interaction.editReply('Please sign up with a role first using the buttons or `/mplus signup`!');
    }

    if (vibe === 'carry') {
      player.carryPreference = 'need_carry';
      await pushRemoteState(state);
      return interaction.editReply(`Set **${player.name}** to: 🎒 **Needs Carry** (solver will match you with a carry!)`);
    } else if (vibe === 'stronk') {
      player.carryPreference = 'willing_carry';
      await pushRemoteState(state);
      return interaction.editReply(`Set **${player.name}** to: 🏋️ **Back is Stronk** (willing to carry!)`);
    } else if (vibe === 'shitter') {
      player.isShitter = !player.isShitter;
      await pushRemoteState(state);
      return interaction.editReply(`Set **${player.name}** Shitter status to: **${player.isShitter ? '💩 Yes (Shitter Alt Squad)' : 'No'}**`);
    }
  }
}

async function handleModalSubmit(interaction) {
  if (!interaction.customId.startsWith('modal_rsvp_')) return;
  await interaction.deferReply({ ephemeral: true });

  const role = interaction.customId.replace('modal_rsvp_', '');
  const charName = interaction.fields.getTextInputValue('char_name').trim();
  const keyRangeStr = interaction.fields.getTextInputValue('key_range').trim();
  const keystone = interaction.fields.getTextInputValue('keystone').trim();

  let keyMin = 6;
  let keyMax = 12;
  const match = keyRangeStr.match(/(\d+)\s*[-–to ]+\s*(\d+)/i);
  if (match) {
    keyMin = parseInt(match[1], 10);
    keyMax = parseInt(match[2], 10);
  }

  userCharacterMap.set(interaction.user.id, charName);

  const state = await fetchRemoteState();
  let player = (state.players || []).find(p => p.name.toLowerCase() === charName.toLowerCase());

  let rIoData = null;
  try {
    rIoData = await lookupRaiderIo(charName);
  } catch (e) {}

  const className = rIoData?.className || player?.className || (role === 'Tank' ? 'Warrior' : (role === 'Healer' ? 'Priest' : 'Mage'));
  const ilvl = rIoData?.ilvl || player?.ilvl || 320;
  const io = rIoData?.io !== undefined ? rIoData.io : (player?.io || 0);
  const activeKey = keystone || rIoData?.ownedKey || player?.ownedKey || '';

  if (player) {
    if (!player.roles.includes(role)) {
      player.roles = [role, ...player.roles];
    }
    player.attending = true;
    player.keyMin = keyMin;
    player.keyMax = keyMax;
    if (activeKey) player.ownedKey = activeKey;
  } else {
    player = {
      id: 'kk-' + charName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      name: charName,
      className,
      roles: [role],
      keyMin,
      keyMax,
      ownedKey: activeKey,
      realm: rIoData?.realm || 'Perenolde',
      region: 'us',
      ilvl,
      io,
      rank: 2,
      attending: true,
      carryPreference: 'none',
      isShitter: false
    };
    state.players.push(player);
  }

  await pushRemoteState(state);

  return interaction.editReply({
    content: `✅ Registered **${player.name}** as **${role}** for tonight!\nKey Range: \`+${player.keyMin} – +${player.keyMax}\`${player.ownedKey ? ` | 🔑 \`${player.ownedKey}\`` : ''}\nSynced to live website!`
  });
}

if (TOKEN) {
  client.login(TOKEN).catch(err => {
    console.error('Failed to login to Discord:', err.message);
  });
}

module.exports = { client };
