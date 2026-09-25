/**
 * Slash Commands Definitions & Registration for Kith and Kin Bot
 */

const { SlashCommandBuilder, REST, Routes } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('mplus')
    .setDescription('Kith and Kin Mythic+ Night Manager')
    .addSubcommand(sub =>
      sub
        .setName('signup')
        .setDescription('Sign up or update your character for tonight’s Mythic+ Night')
        .addStringOption(opt =>
          opt
            .setName('character')
            .setDescription('Your World of Warcraft character name (type to search guild roster)')
            .setAutocomplete(true)
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('role')
            .setDescription('Your primary role')
            .setRequired(true)
            .addChoices(
              { name: '🛡️ Tank', value: 'Tank' },
              { name: '💚 Healer', value: 'Healer' },
              { name: '⚔️ DPS', value: 'DPS' },
              { name: '🛡️/⚔️ Flex Tank/DPS', value: 'Tank,DPS' },
              { name: '💚/⚔️ Flex Healer/DPS', value: 'Healer,DPS' },
              { name: '🛡️/💚/⚔️ Triple Flex', value: 'Tank,Healer,DPS' }
            )
        )
        .addIntegerOption(opt =>
          opt
            .setName('min_key')
            .setDescription('Minimum comfortable key level (e.g. 10)')
            .setMinValue(2)
            .setMaxValue(30)
        )
        .addIntegerOption(opt =>
          opt
            .setName('max_key')
            .setDescription('Maximum comfortable key level (e.g. 16)')
            .setMinValue(2)
            .setMaxValue(30)
        )
        .addStringOption(opt =>
          opt
            .setName('keystone')
            .setDescription('Your in-game keystone (e.g. Murder Row +16)')
        )
        .addStringOption(opt =>
          opt
            .setName('carry_pref')
            .setDescription('Carry preference')
            .addChoices(
              { name: '⚖️ Standard', value: 'none' },
              { name: '🎒 I need a carry', value: 'need_carry' },
              { name: '🏋️ My back is stronk (willing to carry)', value: 'willing_carry' }
            )
        )
        .addBooleanOption(opt =>
          opt
            .setName('shitter')
            .setDescription('Put me in the shitter alt squad (💩)')
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('roster')
        .setDescription('Show currently signed-up guildies and role counts')
    )
    .addSubcommand(sub =>
      sub
        .setName('form')
        .setDescription('Captains and High Council: build the 5-man groups')
        .addStringOption(opt =>
          opt
            .setName('strategy')
            .setDescription('Group balancing strategy')
            .addChoices(
              { name: '🎯 Balanced Key Levels', value: 'balanced' },
              { name: '🤝 Guild Mixer', value: 'guildMixer' },
              { name: '🎲 Pure Chaos', value: 'pureChaos' }
            )
        )
        .addBooleanOption(opt =>
          opt
            .setName('avoid_dupes')
            .setDescription('Avoid duplicate classes in the same party (default: true)')
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('clear')
        .setDescription('Captains and High Council: clear the formed parties')
    )
    .addSubcommand(sub =>
      sub
        .setName('post-signup')
        .setDescription('Post an interactive one-click RSVP button embed in this channel')
    )
    .addSubcommand(sub =>
      sub
        .setName('roll-key')
        .setDescription('Pick a group, leave keys out, and roll one of the keys they are holding')
    )
    .addSubcommand(sub =>
      sub
        .setName('sync-keys')
        .setDescription('🔑 Refresh attending members’ active keystones from Raider.IO')
    )
    .addSubcommand(sub =>
      sub
        .setName('web')
        .setDescription('Get the direct link to the live web group generator')
    )
    .addSubcommand(sub =>
      sub
        .setName('leaderboard')
        .setDescription('🏆 View the Kith and Kin Mythic+ Participation Leaderboard & Top Champions')
        .addStringOption(opt =>
          opt
            .setName('view')
            .setDescription('Choose leaderboard view')
            .addChoices(
              { name: '🎭 Demo Showcase (Full Fake Stats)', value: 'demo' },
              { name: '⚡ Live Guild Data', value: 'live' }
            )
        )
    )
];

async function registerCommands(token, clientId, guildId) {
  const rest = new REST({ version: '10' }).setToken(token);

  console.log('[Commands] Registering slash commands...');
  const commandsData = commands.map(cmd => ({
    ...cmd.toJSON(),
    integration_types: [0],
    contexts: [0]
  }));

  if (guildId) {
    try {
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commandsData }
      );
      console.log(`[Commands] Registered ${commandsData.length} slash commands to guild ${guildId}`);
    } catch (err) {
      console.warn(`[Commands] Warning registering to guild ${guildId}:`, err.message);
    }
  }

  // Global command registration
  try {
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commandsData }
    );
    console.log(`[Commands] Successfully registered ${commandsData.length} global slash commands!`);
  } catch (err) {
    console.warn('[Commands] Warning registering global commands:', err.message);
  }
}

module.exports = {
  commands,
  registerCommands
};
