/**
 * Kith and Kin Mythic+ Night Discord Bot
 * Interactive Discord client synchronized with the live web application.
 */

require('dotenv').config();
const { Client, GatewayIntentBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { registerCommands } = require('./commands');
const { createRosterEmbed, createGroupEmbeds, createSignupButtons, createSignupFormComponents, createCharacterMatchComponents, createLeaderboardEmbed, createLeaderboardButtons } = require('./embeds');
const leaderboardEngine = require('./leaderboard-engine');
const { searchGuildRoster, attachCharacter } = require('./roster-search');
const { solveGroups, rollKeystone, DUNGEONS_MIDNIGHT_S2, WOW_CLASSES } = require('./solver');
const { fetchRemoteState, pushRemoteState, lookupRaiderIo } = require('./sync');
const { isLeader, rollPanel } = require('./roll-ui');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const WEB_URL = process.env.WEB_URL || 'https://knkmplus.netlify.app';

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
    } else if (interaction.isAutocomplete()) {
      await handleAutocomplete(interaction);
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelectMenuInteraction(interaction);
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

function showCharacterSearch(interaction, prefill = '') {
  const modal = new ModalBuilder()
    .setCustomId('modal_char_search')
    .setTitle('Find Your Character');
  const input = new TextInputBuilder()
    .setCustomId('char_query')
    .setLabel('Type a guild name, or any alt')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(32)
    .setPlaceholder('MadKing, Shock, or a guest name');
  const value = String(prefill || '').trim().slice(0, 32);
  if (value) input.setValue(value);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return interaction.showModal(modal);
}

function signupPreferencesPayload(player) {
  return {
    content: `### 📝 Friday Mythic+ Night Sign-Up\nCharacter: **${player.name}** (${player.className}${player.realm ? ` — ${player.realm}` : ''})\nPick one or more roles, key goals (**6-8 Hero Crest**, **10-12 Vault**, **Higher than 12 IO**), and vibes, then **Save My RSVP**.`,
    components: createSignupFormComponents({ player }),
    ephemeral: true
  };
}

async function handleAutocomplete(interaction) {
  try {
    const focusedOption = interaction.options.getFocused(true);
    if (focusedOption.name === 'character') {
      const result = searchGuildRoster(focusedOption.value || '', 24);
      const choices = result.matches.map(entry => ({
        name: `${entry.name} (${entry.className || 'Player'} - ${entry.realm || 'Guild'})`.slice(0, 100),
        value: entry.name.slice(0, 100)
      }));
      if (result.typedName && !result.exact) {
        choices.unshift({
          name: `➕ "${result.typedName}" (not in guild)`.slice(0, 100),
          value: result.typedName.slice(0, 100)
        });
      }
      await interaction.respond(choices.slice(0, 25));
    }
  } catch (err) {
    console.error('[Bot Autocomplete] Error responding to autocomplete:', err);
  }
}

async function handleSlashCommand(interaction) {
  if (interaction.commandName !== 'mplus') return;
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'web') {
    return interaction.reply({
      content: `🌐 **Kith & Kin Mythic+ Night Web App:**\n${WEB_URL}`,
      ephemeral: false
    });
  }

  if (subcommand === 'leaderboard') {
    await interaction.deferReply();
    const viewMode = interaction.options.getString('view') || 'demo';
    const state = await fetchRemoteState();
    const standings = (viewMode === 'live')
      ? leaderboardEngine.computeLeaderboardStandings(state.players, state, true)
      : leaderboardEngine.computeLeaderboardStandings(leaderboardEngine.DEMO_PLAYERS);
    const embed = createLeaderboardEmbed(standings, WEB_URL);
    const buttons = createLeaderboardButtons(WEB_URL);
    return interaction.editReply({ embeds: [embed], components: buttons });
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
    if (!isLeader(interaction.member)) {
      return interaction.reply({ content: 'Only Captains and High Council can form groups.', ephemeral: true });
    }
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
    if (!isLeader(interaction.member)) {
      return interaction.reply({ content: 'Only Captains and High Council can clear groups.', ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });
    const state = await fetchRemoteState();
    state.formedGroups = [];
    state.benchedPlayers = [];
    await pushRemoteState(state);

    return interaction.editReply({
      content: '🧹 Cleared all active groups for tonight. Synced to web dashboard.'
    });
  }

  if (subcommand === 'roll-key') {
    const state = await fetchRemoteState();
    const panel = rollPanel(state, interaction);
    return interaction.reply({
      content: panel.content,
      components: (panel.components || []).map(row => ActionRowBuilder.from(row)),
      ephemeral: true
    });
  }

  if (subcommand === 'sync-keys') {
    await interaction.deferReply();
    const state = await fetchRemoteState();
    const attendees = (state.players || []).filter(p => p.attending);
    if (attendees.length === 0) {
      return interaction.editReply({ content: '⚠️ No attending members to sync keystones for!' });
    }

    let updated = 0;
    for (const p of attendees) {
      try {
        const rIo = await lookupRaiderIo(p.name, p.realm || 'Perenolde');
        if (rIo?.io) updated++;
        if (rIo?.ilvl) p.ilvl = rIo.ilvl;
        if (rIo?.io) p.io = rIo.io;
      } catch (e) {}
    }

    await pushRemoteState(state);
    return interaction.editReply({
      content: `🔑 **Refreshed keystones from Raider.IO!** (${updated} members updated)\nView updated roster at [web dashboard](${WEB_URL}).`
    });
  }
}

async function handleButtonInteraction(interaction) {
  const customId = interaction.customId;

  if (customId === 'btn_refresh_roster') {
    await interaction.deferUpdate();
    const state = await fetchRemoteState();
    const embed = createRosterEmbed(state.players || [], WEB_URL, 'MadKing', state.formedGroups || [], state.benchedPlayers || []);
    return interaction.editReply({
      embeds: [embed],
      components: createSignupButtons(WEB_URL)
    });
  }

  // 1. Type-to-filter the full guild roster. Selects cannot hold 600+ names.
  if (customId === 'btn_open_signup' || customId === 'btn_search_again' || customId === 'btn_custom_modal') {
    const state = await fetchRemoteState();
    const player = (state.players || []).find(p => p.discordId === interaction.user.id);
    return showCharacterSearch(interaction, player?.name || '');
  }

  if (customId === 'btn_dismiss_form') {
    return interaction.update({
      content: '❌ Sign-up form closed.',
      components: []
    });
  }

  if (customId === 'btn_leaderboard_refresh') {
    await interaction.deferUpdate();
    const standings = leaderboardEngine.computeLeaderboardStandings(leaderboardEngine.DEMO_PLAYERS);
    const embed = createLeaderboardEmbed(standings, WEB_URL);
    const buttons = createLeaderboardButtons(WEB_URL);
    return interaction.editReply({ embeds: [embed], components: buttons });
  }

  if (customId === 'btn_leaderboard_rules') {
    return interaction.reply({
      content: '### 📜 Kith & Kin Participation Scoring Code\n' +
               '• **Attendance:** +15 pts per Mythic+ night attended\n' +
               '• **Keys Completed:** +10 pts (+5 bonus if timed, +2 pts per level above +10)\n' +
               '• **Role Versatility:** +5 pts for Dual Flex (Tank/DPS, etc.), +10 pts for Triple Flex (Tank/Healer/DPS)\n' +
               '• **Born Leader (👑):** +8 pts per night volunteered to lead\n' +
               '• **Stonk Back (🏋️):** +8 pts per night volunteered "My back is stronk"\n' +
               '• **Carry Shepherd (🎒):** +15 pts per key run with guildies who need a carry\n\n' +
               `View the live interactive leaderboard: <${WEB_URL}/leaderboard.html>`,
      ephemeral: true
    });
  }

  if (customId === 'btn_confirm_rsvp') {
    const state = await fetchRemoteState();
    const defaultName = userCharacterMap.get(interaction.user.id) || interaction.member?.displayName || interaction.user.username;
    let player = (state.players || []).find(p =>
      p.discordId === interaction.user.id ||
      p.name.toLowerCase() === defaultName.toLowerCase()
    );

    if (!player) {
      return interaction.update({
        content: '⚠️ Please select a character from the first dropdown before confirming!',
        components: createSignupFormComponents({ players: state.players || [], defaultName, player: null })
      });
    }

    player.attending = true;
    player.absent = false;
    player.discordId = interaction.user.id;
    await pushRemoteState(state);

    let badges = [];
    if (player.isLeader) badges.push('👑 Born Leader');
    if (player.isReserve) badges.push('🍺 Voluntary Reserve');
    if (player.carryPreference === 'need_carry') badges.push('🎒 Needs Carry');
    if (player.carryPreference === 'willing_carry') badges.push('🏋️ Stronk Back');
    if (player.isShitter) badges.push('💩 Shitter');

    return interaction.update({
      content: `🎉 **RSVP Confirmed for ${player.name}!**\n• Role(s): **${(player.roles || []).join('/')}**\n• Keys: **+${player.keyMin} to +${player.keyMax}**${badges.length ? '\n• Preferences: ' + badges.join(', ') : ''}\n\nSynced to the [web dashboard](${WEB_URL})! Click **Refresh 🔄** on the main event card to view the updated roster lineup.`,
      components: []
    });
  }

  // Quick RSVP legacy role buttons fallback
  const knownName = userCharacterMap.get(interaction.user.id) || interaction.member?.displayName || interaction.user.username;

  if (customId.startsWith('btn_role_') || customId.startsWith('btn_attend_')) {
    let roleName = customId.startsWith('btn_role_') 
      ? customId.replace('btn_role_', '')
      : (customId.replace('btn_attend_', '') === 'tank' ? 'Tank' : (customId.replace('btn_attend_', '') === 'healer' ? 'Healer' : 'DPS'));

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

  if (customId === 'btn_form_groups') {
    await interaction.deferUpdate();
    const state = await fetchRemoteState();
    const attending = (state.players || []).filter(p => p.attending);

    if (attending.length < 5) {
      return interaction.followUp({
        content: `⚠️ Need at least 5 attending players to form groups. Currently have ${attending.length}. Click [Sign Up / Edit RSVP 📝] to register!`,
        ephemeral: true
      });
    }

    const { solveGroups } = require('./solver');
    const result = solveGroups({ players: state.players });
    state.formedGroups = result.groups;
    state.benchedPlayers = result.benched;
    await pushRemoteState(state);

    const embed = createRosterEmbed(state.players || [], WEB_URL, 'MadKing', result.groups, result.benched);
    return interaction.editReply({
      content: `🏰 **Formed ${result.groups.length} Mythic+ group(s).** Parties are on this card. Roll each party's key on the website.`,
      embeds: [embed],
      components: createSignupButtons(WEB_URL)
    });
  }

  if (customId === 'btn_absent') {
    await interaction.deferReply({ ephemeral: true });
    const state = await fetchRemoteState();
    const charName = userCharacterMap.get(interaction.user.id) || interaction.member?.displayName;

    const player = (state.players || []).find(p => p.name.toLowerCase() === (charName || '').toLowerCase());
    if (player) {
      player.attending = false;
      await pushRemoteState(state);
      return interaction.editReply(`Marked **${player.name}** as absent for Friday night.`);
    }

    return interaction.editReply(`Could not find a signed-up character for you. Click [Sign Up / Edit RSVP 📝] to register first!`);
  }

  if (customId.startsWith('btn_vibe_') || customId === 'btn_need_carry' || customId === 'btn_stronk_carry' || customId === 'btn_shitter') {
    await interaction.deferReply({ ephemeral: true });
    let vibe = '';
    if (customId === 'btn_need_carry' || customId === 'btn_vibe_carry') vibe = 'carry';
    else if (customId === 'btn_stronk_carry' || customId === 'btn_vibe_stronk') vibe = 'stronk';
    else if (customId === 'btn_shitter' || customId === 'btn_vibe_shitter') vibe = 'shitter';

    const charName = userCharacterMap.get(interaction.user.id) || interaction.member?.displayName;
    const state = await fetchRemoteState();
    const player = (state.players || []).find(p => p.name.toLowerCase() === (charName || '').toLowerCase());

    if (!player) {
      return interaction.editReply('Please sign up with a role first using the buttons or `/mplus signup`!');
    }

    if (vibe === 'carry') {
      player.carryPreference = player.carryPreference === 'need_carry' ? 'none' : 'need_carry';
      await pushRemoteState(state);
      return interaction.editReply(`Set **${player.name}** carry preference to: **${player.carryPreference === 'need_carry' ? '🎒 Needs Carry' : 'None'}**`);
    } else if (vibe === 'stronk') {
      player.carryPreference = player.carryPreference === 'willing_carry' ? 'none' : 'willing_carry';
      await pushRemoteState(state);
      return interaction.editReply(`Set **${player.name}** carry preference to: **${player.carryPreference === 'willing_carry' ? '🏋️ Back is Stronk (willing to carry)' : 'None'}**`);
    } else if (vibe === 'shitter') {
      player.isShitter = !player.isShitter;
      await pushRemoteState(state);
      return interaction.editReply(`Set **${player.name}** Shitter status to: **${player.isShitter ? '💩 Yes (Shitter Alt Squad)' : 'No'}**`);
    }
  }

  if (customId === 'btn_roll_key') {
    await interaction.deferReply();
    const state = await fetchRemoteState();
    const attendees = (state.players || []).filter(p => p.attending);
    const heldKeys = attendees.filter(p => p.ownedKey && p.ownedKey.trim() !== '');
    const excluded = state.excludedDungeons || [];
    const roll = rollKeystone({
      dungeonPool: DUNGEONS_MIDNIGHT_S2,
      excludedDungeons: excluded,
      heldKeys,
      onlyHeld: false,
      targetLevel: null
    });

    let holderText = (roll.holders && roll.holders.length > 0)
      ? `\n👜 **Held by:** ${roll.holders.join(', ')}`
      : `\n*(No attending member currently holds this exact key — push or reroll!)*`;

    return interaction.editReply({
      content: `🎲 **Rolled Keystone:** \`${roll.keyString}\`${holderText}\nSynced with [web dashboard](${WEB_URL}).`
    });
  }

  if (customId === 'btn_sync_keys') {
    await interaction.deferReply({ ephemeral: true });
    const state = await fetchRemoteState();
    const attendees = (state.players || []).filter(p => p.attending);
    if (attendees.length === 0) {
      return interaction.editReply({ content: '⚠️ No attending members to sync keys for!' });
    }

    let count = 0;
    for (const p of attendees) {
      try {
        const rIo = await lookupRaiderIo(p.name, p.realm || 'Perenolde');
        if (rIo?.io) count++;
      } catch (e) {}
    }
    await pushRemoteState(state);
    return interaction.editReply({
      content: `🔑 **Refreshed active keystones from Raider.IO!** (${count} keys updated)\nView updated roster at [web dashboard](${WEB_URL}).`
    });
  }
}

async function handleSelectMenuInteraction(interaction) {
  const customId = interaction.customId;
  const state = await fetchRemoteState();
  const defaultName = userCharacterMap.get(interaction.user.id) || interaction.member?.displayName || interaction.user.username;
  let player = (state.players || []).find(p => 
    p.discordId === interaction.user.id || 
    p.name.toLowerCase() === defaultName.toLowerCase()
  );

  if (customId === 'select_character') {
    const selected = interaction.values[0] || '';
    if (selected === '__custom__') {
      return showCharacterSearch(interaction, '');
    }
    const chosenName = selected.startsWith('__custom__:') ? selected.slice('__custom__:'.length) : selected;
    const targetPlayer = attachCharacter(state, interaction.user.id, chosenName);
    if (!targetPlayer) {
      return interaction.reply({ content: '⚠️ Type a character name to search the guild roster.', ephemeral: true });
    }
    userCharacterMap.set(interaction.user.id, targetPlayer.name);
    await pushRemoteState(state);
    const payload = signupPreferencesPayload(targetPlayer);
    return interaction.update({ content: payload.content, components: payload.components });
  }

  if (customId === 'select_roles') {
    const selectedRoles = interaction.values || ['DPS'];
    if (player) {
      player.roles = selectedRoles;
      player.attending = true;
      await pushRemoteState(state);
    }
    const components = createSignupFormComponents({
      players: state.players || [],
      defaultName,
      player
    });
    return interaction.update({
      content: `### 📝 Friday Mythic+ Night Sign-Up\n✅ Role(s) set to: **${selectedRoles.join('/')}**\nSelect your comfortable key range and preferences:`,
      components
    });
  }

  if (customId === 'select_key_range') {
    const selectedBrackets = interaction.values?.length ? interaction.values : ['10-12'];
    if (player) {
      player.keyBrackets = selectedBrackets;
      let minKey = 30;
      let maxKey = 2;
      if (selectedBrackets.includes('6-8')) { minKey = Math.min(minKey, 6); maxKey = Math.max(maxKey, 8); }
      if (selectedBrackets.includes('10-12')) { minKey = Math.min(minKey, 10); maxKey = Math.max(maxKey, 12); }
      if (selectedBrackets.includes('12+')) { minKey = Math.min(minKey, 13); maxKey = Math.max(maxKey, 18); }
      player.keyMin = minKey;
      player.keyMax = maxKey;
      await pushRemoteState(state);
    }
    const components = createSignupFormComponents({ player });
    return interaction.update({
      content: `### 📝 Friday Mythic+ Night Sign-Up\n✅ Key goals set to: **${selectedBrackets.join(', ')}** (+${player?.keyMin || 10} to +${player?.keyMax || 12})`,
      components
    });
  }

  if (customId === 'select_vibes') {
    const vibes = interaction.values || [];
    if (player) {
      player.isLeader = vibes.includes('vibe_leader');
      player.isReserve = vibes.includes('vibe_reserve');
      player.carryPreference = vibes.includes('vibe_need_carry') ? 'need_carry' : (vibes.includes('vibe_willing_carry') ? 'willing_carry' : 'none');
      player.isShitter = vibes.includes('vibe_shitter');
      player.attending = true;
      await pushRemoteState(state);
    }
    const components = createSignupFormComponents({
      players: state.players || [],
      defaultName,
      player
    });
    let vibeTags = [];
    if (player?.isLeader) vibeTags.push('👑 Born Leader');
    if (player?.isReserve) vibeTags.push('🍺 Reserve');
    if (player?.carryPreference === 'need_carry') vibeTags.push('🎒 Needs Carry');
    if (player?.carryPreference === 'willing_carry') vibeTags.push('🏋️ Stronk Back');
    if (player?.isShitter) vibeTags.push('💩 Shitter');

    return interaction.update({
      content: `### 📝 Friday Mythic+ Night Sign-Up\n✅ Preferences updated: **${vibeTags.length ? vibeTags.join(', ') : 'Standard'}**\nClick **Save My RSVP ✅** to finish!`,
      components
    });
  }
}

async function handleModalSubmit(interaction) {
  if (interaction.customId === 'modal_char_search') {
    const query = interaction.fields.getTextInputValue('char_query').trim();
    const result = searchGuildRoster(query, 24);
    const state = await fetchRemoteState();

    if (result.autoPick || result.matchCount === 0) {
      const chosen = result.autoPick?.name || result.typedName;
      const targetPlayer = attachCharacter(state, interaction.user.id, chosen);
      if (!targetPlayer) {
        return interaction.reply({ content: '⚠️ Type a character name to search the guild roster.', ephemeral: true });
      }
      userCharacterMap.set(interaction.user.id, targetPlayer.name);
      await pushRemoteState(state);
      const payload = signupPreferencesPayload(targetPlayer);
      return interaction.reply({ content: payload.content, components: payload.components, ephemeral: true });
    }

    return interaction.reply({
      content: `### 📝 Find Your Character\n${result.matchCount} guild matches for **${result.typedName}**. Pick one, or use the name even if they are not in the guild.`,
      components: createCharacterMatchComponents(result.matches, result.typedName),
      ephemeral: true
    });
  }

  if (interaction.customId === 'modal_signup_custom' || interaction.customId === 'modal_custom_signup') {
    await interaction.deferReply({ ephemeral: true });
    const charName = interaction.fields.getTextInputValue('char_name').trim();
    const rolesStr = interaction.fields.getTextInputValue('char_roles').trim();
    const keyRangeStr = interaction.fields.getTextInputValue('key_range')?.trim() || '12-15';

    const roles = rolesStr.split(/[,/ ]+/).filter(Boolean);
    let keyMin = 10, keyMax = 15;
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

    const className = rIoData?.className || player?.className || 'Warrior';
    const ilvl = rIoData?.ilvl || player?.ilvl || 320;
    const io = rIoData?.io !== undefined ? rIoData.io : (player?.io || 0);

    if (player) {
      player.roles = roles.length ? roles : ['DPS'];
      player.attending = true;
      player.keyMin = keyMin;
      player.keyMax = keyMax;
      player.discordId = interaction.user.id;
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
        roles: roles.length ? roles : ['DPS'],
        keyMin,
        keyMax,
        ownedKey: rIoData?.ownedKey || '',
        realm: rIoData?.realm || 'Perenolde',
        region: 'us',
        ilvl,
        io,
        rank: 2,
        attending: true,
        carryPreference: 'none',
        isShitter: false,
        isLeader: false,
        isReserve: false,
        discordId: interaction.user.id
      };
      state.players.push(player);
    }

    await pushRemoteState(state);

    return interaction.editReply({
      content: `✅ Registered **${player.name}** (${player.className}) as **${player.roles.join('/')}**!\n• Key Range: \`+${player.keyMin} – +${player.keyMax}\`\n• Stats: \`${player.ilvl} iLvl | ${player.io.toLocaleString()} IO\`\n\nSynced to live website!`
    });
  }

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
