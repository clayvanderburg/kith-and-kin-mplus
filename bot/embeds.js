/**
 * Discord Embeds for Kith and Kin Mythic+ Night
 * Modeled after Raid-Helper with tailored World of Warcraft Mythic+ enhancements.
 */

let EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle;
try {
  const djs = require('discord.js');
  EmbedBuilder = djs.EmbedBuilder;
  ActionRowBuilder = djs.ActionRowBuilder;
  ButtonBuilder = djs.ButtonBuilder;
  ButtonStyle = djs.ButtonStyle;
} catch (e) {
  // Pure JSON fallback for serverless environments where discord.js is omitted
  ButtonStyle = { Primary: 1, Secondary: 2, Success: 3, Danger: 4, Link: 5 };
  EmbedBuilder = class {
    constructor() { this.data = { fields: [] }; }
    setTitle(t) { this.data.title = t; return this; }
    setDescription(d) { this.data.description = d; return this; }
    setColor(c) { this.data.color = c; return this; }
    addFields(...fields) {
      if (Array.isArray(fields[0])) this.data.fields.push(...fields[0]);
      else this.data.fields.push(...fields);
      return this;
    }
    setFooter(f) { this.data.footer = f; return this; }
    setTimestamp() { this.data.timestamp = new Date().toISOString(); return this; }
    toJSON() { return this.data; }
  };
  ButtonBuilder = class {
    constructor() { this.data = { type: 2 }; }
    setCustomId(id) { this.data.custom_id = id; return this; }
    setLabel(l) { this.data.label = l; return this; }
    setStyle(s) { this.data.style = s; return this; }
    setURL(u) { this.data.url = u; return this; }
    toJSON() { return this.data; }
  };
  ActionRowBuilder = class {
    constructor() { this.data = { type: 1, components: [] }; }
    addComponents(...comps) {
      this.data.components.push(...comps.map(c => c.toJSON ? c.toJSON() : c));
      return this;
    }
    toJSON() { return this.data; }
  };
}

const CLASS_ICONS = {
  'Death Knight': '⚔️',
  'Demon Hunter': '🦇',
  'Druid': '🌿',
  'Evoker': '🐲',
  'Hunter': '🏹',
  'Mage': '✨',
  'Monk': '🥋',
  'Paladin': '🛡️',
  'Priest': '☀️',
  'Rogue': '🗡️',
  'Shaman': '⚡',
  'Warlock': '🔥',
  'Warrior': '🪓'
};

const ROLE_ICONS = {
  'Tank': '🛡️',
  'Healer': '💚',
  'DPS': '⚔️'
};

/**
 * Calculates Unix timestamp for the upcoming Friday 8:00 PM EST
 */
function getNextFridayTimestamp() {
  const now = new Date();
  const target = new Date(now.getTime());
  let daysUntilFriday = (5 - now.getDay() + 7) % 7;
  if (daysUntilFriday === 0 && now.getHours() >= 20) {
    daysUntilFriday = 7;
  }
  target.setDate(now.getDate() + daysUntilFriday);
  target.setHours(20, 0, 0, 0);
  return Math.floor(target.getTime() / 1000);
}

function createRosterEmbed(players, webUrl = 'https://knkmplus.netlify.app', hostName = 'MadKing', formedGroups = [], benchedPlayers = []) {
  const attending = (players || []).filter(p => p.attending === true);
  const absent = (players || []).filter(p => p.absent === true && !p.attending);
  const tanks = attending.filter(p => (p.roles || []).includes('Tank')).length;
  const healers = attending.filter(p => (p.roles || []).includes('Healer')).length;
  const dps = attending.filter(p => (p.roles || []).includes('DPS')).length;
  const maxGroups = Math.min(tanks, healers, Math.floor(dps / 3));

  const leaders = attending.filter(p => p.isLeader);
  const reserves = attending.filter(p => p.isReserve);
  const needsCarry = attending.filter(p => p.carryPreference === 'need_carry');
  const stronk = attending.filter(p => p.carryPreference === 'willing_carry');
  const shitters = attending.filter(p => p.isShitter);

  const nextFriday = getNextFridayTimestamp();

  // If groups are formed, display the assembled group lineup directly in the main event card!
  if (Array.isArray(formedGroups) && formedGroups.length > 0) {
    const embed = new EmbedBuilder()
      .setTitle('🏰 Friday Mythic+ Keystone Night — Groups Assembled!')
      .setColor(0x10B981) // Emerald victory green
      .setDescription(
        `👑 **Host:** ${hostName}  •  👥 **Attending:** **${attending.length}**  •  🏰 **Active Groups:** **${formedGroups.length}**\n` +
        `📅 **Event:** Every Friday  •  ⏰ **Time:** 8:00 PM EST\n\n` +
        `⚔️ **Parties have been forged for tonight!** Review your team, assign keys, and head into voice:\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      );

    formedGroups.forEach((g, idx) => {
      const leaderBadge = g.leaderName ? ` • 👑 Leader: **${g.leaderName}**` : '';
      const keyBadge = g.keystone ? ` • 🔑 \`${g.keystone}\`` : '';
      const utilBadges = [];
      if (g.hasLust) utilBadges.push('⚡ Lust');
      if (g.hasBrez) utilBadges.push('🔄 BRez');
      const utilStr = utilBadges.length ? ` • ${utilBadges.join(' ')}` : '';

      const lines = [];
      if (g.tank) lines.push(`🛡️ **${g.tank.name}** (${g.tank.className} • ${(g.tank.io / 1000).toFixed(1)}k)`);
      if (g.healer) lines.push(`💚 **${g.healer.name}** (${g.healer.className} • ${(g.healer.io / 1000).toFixed(1)}k)`);
      (g.dps || []).forEach(d => {
        lines.push(`⚔️ **${d.name}** (${d.className} • ${(d.io / 1000).toFixed(1)}k)`);
      });

      embed.addFields({
        name: `🏰 Group ${idx + 1}: ${g.name || 'Keystone Crew'} (Avg IO: ${g.avgIo || 3000})${leaderBadge}${keyBadge}${utilStr}`,
        value: lines.join('\n') || 'Empty Party',
        inline: false
      });
    });

    if (Array.isArray(benchedPlayers) && benchedPlayers.length > 0) {
      embed.addFields({
        name: `🍺 Bench / Reserves (${benchedPlayers.length})`,
        value: benchedPlayers.map(p => `• **${p.name}** (${p.className} - ${(p.roles || []).join('/')})${p.isReserve ? ' 🍺' : ''}`).join('\n'),
        inline: false
      });
    }

    embed.setFooter({
      text: `Kith & Kin • Synced with Live Web App • Click [Refresh 🔄] to update`
    });
    embed.setTimestamp();
    return embed;
  }

  const embed = new EmbedBuilder()
    .setTitle('🏰 Friday Mythic+ Keystone Night')
    .setColor(0xDC2626) // Vivid red border matching Raid-Helper event styling
    .setDescription(
      `Conquer **Midnight Season 2** keystones! Match IO ranges, balance Bloodlust & Battle Res, pair carries, and assemble full parties.\n\n` +
      `👑 **Host:** ${hostName}  •  👥 **Attending:** **${attending.length}**${absent.length ? ` (+${absent.length} absent)` : ''}\n` +
      `📅 **Event:** Every Friday  •  ⏰ **Time:** 8:00 PM EST\n` +
      `⏳ **Kickoff:** <t:${nextFriday}:F> (<t:${nextFriday}:R>)\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🛡️ **Tanks:** ${tanks}  •  💚 **Healers:** ${healers}  •  ⚔️ **DPS:** ${dps}  •  🏰 **Groups:** **${maxGroups} Full**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    );

  if (attending.length === 0) {
    embed.addFields({
      name: '⚡ Sign-ups are OPEN!',
      value: 'Click **`[Sign Up / Edit RSVP 📝]`** below to register your character and select your roles!'
    });
  } else {
    // Group attendees by WoW Class
    const classGroups = {};
    attending.forEach(p => {
      const cls = p.className || 'Adventurer';
      if (!classGroups[cls]) classGroups[cls] = [];
      classGroups[cls].push(p);
    });

    // Sort classes by count descending, then alphabetically
    const sortedClasses = Object.keys(classGroups).sort((a, b) => {
      if (classGroups[b].length !== classGroups[a].length) {
        return classGroups[b].length - classGroups[a].length;
      }
      return a.localeCompare(b);
    });

    // Add 3-column inline grid fields (Raid-Helper style)
    sortedClasses.forEach(cls => {
      const pList = classGroups[cls];
      const icon = CLASS_ICONS[cls] || '⚔️';
      const lines = pList.map((p, idx) => {
        const primaryRole = (p.roles && p.roles[0]) || 'DPS';
        const roleIcon = ROLE_ICONS[primaryRole] || '⚔️';
        const ioStr = p.io ? `${(p.io / 1000).toFixed(1)}k` : `${p.ilvl || 320}ilvl`;
        const keyStr = p.ownedKey ? `+${p.ownedKey.split('+')[1] || p.keyMax || 10}` : `+${p.keyMax || 10}`;
        let flag = '';
        if (p.isLeader) flag += ' 👑';
        if (p.isReserve) flag += ' 🍺';
        if (p.carryPreference === 'need_carry') flag += ' 🎒';
        if (p.carryPreference === 'willing_carry') flag += ' 🏋️';
        if (p.isShitter) flag += ' 💩';

        return `${roleIcon} \`${idx + 1}\` **${p.name}** (${ioStr} • ${keyStr})${flag}`;
      });

      embed.addFields({
        name: `${icon} ${cls} (${pList.length})`,
        value: lines.join('\n') || 'None',
        inline: true
      });
    });

    // Special Vibe / Alt Squad Roster breakdown
    let vibeBreakdown = [];
    if (leaders.length > 0) {
      vibeBreakdown.push(`👑 **Born Leaders (${leaders.length}):** ${leaders.map(p => `**${p.name}**`).join(', ')}`);
    }
    if (reserves.length > 0) {
      vibeBreakdown.push(`🍺 **Bench / Reserves (${reserves.length}):** ${reserves.map(p => `**${p.name}**`).join(', ')}`);
    }
    if (needsCarry.length > 0) {
      vibeBreakdown.push(`🎒 **Needs Carry (${needsCarry.length}):** ${needsCarry.map(p => `**${p.name}**`).join(', ')}`);
    }
    if (stronk.length > 0) {
      vibeBreakdown.push(`🏋️ **Back is Stronk (${stronk.length}):** ${stronk.map(p => `**${p.name}**`).join(', ')}`);
    }
    if (shitters.length > 0) {
      vibeBreakdown.push(`💩 **Shitter Alt Squad (${shitters.length}):** ${shitters.map(p => `**${p.name}**`).join(', ')}`);
    }
    if (absent.length > 0) {
      vibeBreakdown.push(`💤 **Absent (${absent.length}):** ${absent.slice(0, 10).map(p => p.name).join(', ')}${absent.length > 10 ? ` +${absent.length - 10} more` : ''}`);
    }

    if (vibeBreakdown.length > 0) {
      embed.addFields({
        name: '🎭 Squad Preferences & Vibe',
        value: vibeBreakdown.join('\n'),
        inline: false
      });
    }
  }

  embed.setFooter({
    text: `Kith & Kin • Midnight Season 2 • Click [Sign Up / Edit RSVP] below`
  });
  embed.setTimestamp();

  return embed;
}

function createGroupEmbeds(groups, benched, webUrl = 'https://knkmplus.netlify.app') {
  const embeds = [];

  groups.forEach((grp, idx) => {
    let title = `PARTY ${idx + 1}: ${grp.name.toUpperCase()}`;
    if (grp.isShitterGroup) title += ' 💩 (SHITTER SQUAD)';

    let color = grp.isShitterGroup ? 0xB45309 : 0xF5D061;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(color);

    let metaDesc = `🔑 **Assigned:** **${grp.assignedDungeon}**\n` +
                   `🎯 **Target Key:** \`${grp.keyRangeStr}\`\n` +
                   `⭐ **Avg IO:** **${grp.avgIo.toLocaleString()}**  •  🛡️ **Avg iLvl:** **${grp.avgIlvl}**\n`;

    let utilLine = [];
    if (grp.hasLeader && grp.leaderName) {
      utilLine.push(`👑 Leader: **${grp.leaderName}**`);
    }
    if (grp.hasLust) {
      utilLine.push(`⚡ Lust: **${grp.lustProvider}**`);
    } else {
      utilLine.push(`⚠️ No Lust`);
    }
    if (grp.hasBrez) {
      utilLine.push(`🔄 BRez: **${grp.brezProvider}**`);
    } else {
      utilLine.push(`⚠️ No BRez`);
    }
    if (grp.hasCarryMatch) {
      utilLine.push(`🎒 Carry Matched`);
    }

    metaDesc += utilLine.join('  •  ') + '\n\n';

    const formatMemberLine = (icon, m) => {
      let flags = [];
      if (m.isLeader) flags.push('👑 Leader');
      if (m.isReserve) flags.push('🍺 Reserve');
      if (m.carryPreference === 'need_carry') flags.push('🎒 Need Carry');
      if (m.carryPreference === 'willing_carry') flags.push('🏋️ Stronk Back');
      if (m.isShitter) flags.push('💩 Shitter');
      const flagStr = flags.length ? ` \`[${flags.join(' ')}]\`` : '';

      return `${icon} **${m.name}** (${m.className}) — **${(m.io || 0).toLocaleString()} IO** (${m.ilvl || 320} ilvl)${flagStr}\n` +
             `   └ Range: +${m.keyMin} to +${m.keyMax}${m.ownedKey ? ` | 🔑 ${m.ownedKey}` : ''}`;
    };

    let membersText = [
      formatMemberLine('🛡️', grp.tank),
      formatMemberLine('💚', grp.healer),
      ...grp.dps.map(d => formatMemberLine('⚔️', d))
    ].join('\n\n');

    embed.setDescription(metaDesc + membersText);
    embeds.push(embed);
  });

  if (benched && benched.length > 0) {
    const benchEmbed = new EmbedBuilder()
      .setTitle(`🍺 Tavern Reserves / Bench (${benched.length})`)
      .setColor(0x64748B)
      .setDescription(
        benched.map(p => `• **${p.name}** (${p.className} - ${(p.roles || []).join('/')}) — ${(p.io || 0).toLocaleString()} IO (+${p.keyMin}-+${p.keyMax})${p.isReserve ? ' *(Voluntary Reserve 🍺)*' : ''}`).join('\n')
      );
    embeds.push(benchEmbed);
  }

  return embeds;
}

function createSignupButtons(webUrl = 'https://knkmplus.netlify.app') {
  // Row 1: Primary Actions
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_open_signup')
      .setLabel('Sign Up / Edit RSVP 📝')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('btn_absent')
      .setLabel('Can’t Make It 💤')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_form_groups')
      .setLabel('Form Groups 🏰')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setLabel('Web View 🌐')
      .setStyle(ButtonStyle.Link)
      .setURL(webUrl)
  );

  // Row 2: Keystone Tools & Refresh
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_roll_key')
      .setLabel('Roll Key 🎲')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_sync_keys')
      .setLabel('Sync Keys 🔑')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_refresh_roster')
      .setLabel('Refresh 🔄')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}

/**
 * Generates interactive drop-down menus for the Discord Sign-Up popup
 */
function createSignupFormComponents({ players = [], defaultName = '', player = null }) {
  // 1. Character Dropdown
  const uniquePlayers = [];
  const seenNames = new Set();

  (players || []).forEach(p => {
    if (!p.name || seenNames.has(p.name.toLowerCase())) return;
    seenNames.add(p.name.toLowerCase());
    uniquePlayers.push(p);
  });

  // If roster list has fewer than 24, fill with synced guild members
  try {
    const guildRoster = require('./guild-roster.json');
    if (Array.isArray(guildRoster)) {
      for (const g of guildRoster) {
        if (uniquePlayers.length >= 24) break;
        if (!g.name || seenNames.has(g.name.toLowerCase())) continue;
        seenNames.add(g.name.toLowerCase());
        uniquePlayers.push({
          name: g.name,
          className: g.className || 'Player',
          roles: [g.role || 'DPS'],
          io: 0,
          ilvl: 320,
          ownedKey: ''
        });
      }
    }
  } catch (e) {}

  uniquePlayers.sort((a, b) => a.name.localeCompare(b.name));

  let defaultSelectedName = player ? player.name.toLowerCase() : null;
  if (!defaultSelectedName && defaultName) {
    const matched = uniquePlayers.find(p => p.name.toLowerCase() === defaultName.toLowerCase());
    if (matched) defaultSelectedName = matched.name.toLowerCase();
  }

  const charOptions = uniquePlayers.slice(0, 24).map(p => {
    const rolesStr = (p.roles || ['DPS']).join('/');
    const keyStr = p.ownedKey ? `+${p.ownedKey.split('+')[1] || 10}` : '+10';
    const isSelected = defaultSelectedName === p.name.toLowerCase();
    return {
      label: `${p.name} (${p.className || 'WoW'})`,
      value: p.name,
      description: `${rolesStr} • ${p.io ? (p.io / 1000).toFixed(1) + 'k IO' : (p.ilvl || 320) + 'ilvl'} • ${keyStr}`,
      default: isSelected
    };
  });

  charOptions.push({
    label: '➕ Type Custom / Unlisted Alt Name',
    value: '__custom__',
    description: 'Brings up a box to enter a character name not on the list'
  });

  const rowChar = {
    type: 1,
    components: [
      {
        type: 3, // STRING_SELECT
        custom_id: 'select_character',
        placeholder: player ? `Selected: ${player.name} (${player.className})` : 'Choose your WoW Character from Guild...',
        min_values: 1,
        max_values: 1,
        options: charOptions
      }
    ]
  };

  // 2. Roles Multi-Select Dropdown
  const activeRoles = player?.roles || ['DPS'];
  const rowRoles = {
    type: 1,
    components: [
      {
        type: 3,
        custom_id: 'select_roles',
        placeholder: `Select Roles (Multi-Select: Tank, Healer, DPS)... Currently: ${activeRoles.join('/')}`,
        min_values: 1,
        max_values: 3,
        options: [
          { label: 'Tank', value: 'Tank', emoji: { name: '🛡️' }, description: 'Ready to tank 5-man parties', default: activeRoles.includes('Tank') },
          { label: 'Healer', value: 'Healer', emoji: { name: '💚' }, description: 'Ready to heal 5-man parties', default: activeRoles.includes('Healer') },
          { label: 'DPS', value: 'DPS', emoji: { name: '⚔️' }, description: 'Damage dealer', default: activeRoles.includes('DPS') }
        ]
      }
    ]
  };

  // 3. Key Goals & Brackets Multi-Select Dropdown
  const activeBrackets = player?.keyBrackets || (player?.keyMax ? (player.keyMax > 12 ? ['12+'] : (player.keyMax >= 10 ? ['10-12'] : ['6-8'])) : ['10-12']);
  const rowRange = {
    type: 1,
    components: [
      {
        type: 3,
        custom_id: 'select_key_range',
        placeholder: 'Select Key Goals (Multi-select: 6-8, 10-12, Higher than 12)...',
        min_values: 1,
        max_values: 3,
        options: [
          { label: '6-8 (Hero Crest Farm)', value: '6-8', emoji: { name: '🌱' }, description: 'Hero crest farming and upgrades', default: activeBrackets.includes('6-8') },
          { label: '10-12 (Vault Fill)', value: '10-12', emoji: { name: '🗝️' }, description: 'Mythic weekly vault slots and gilded crests', default: activeBrackets.includes('10-12') },
          { label: 'Higher than 12 (IO Farming)', value: '12+', emoji: { name: '🔥' }, description: 'Keystone score pushing and high keys', default: activeBrackets.includes('12+') }
        ]
      }
    ]
  };

  // 4. Squad Vibes & Preferences (Multi-Select)
  const isLeader = player?.isLeader || false;
  const isReserve = player?.isReserve || false;
  const isNeedCarry = player?.carryPreference === 'need_carry';
  const isWillingCarry = player?.carryPreference === 'willing_carry';
  const isShitter = player?.isShitter || false;

  const rowVibes = {
    type: 1,
    components: [
      {
        type: 3,
        custom_id: 'select_vibes',
        placeholder: 'Select Vibes & Preferences (Leader, Reserve, Carry, Shitter)...',
        min_values: 0,
        max_values: 5,
        options: [
          { label: 'Born Leader (willing to lead group)', value: 'vibe_leader', emoji: { name: '👑' }, description: 'Willing to lead and guide a 5-man party', default: isLeader },
          { label: 'Bench / Reserve (willing to rotate out)', value: 'vibe_reserve', emoji: { name: '🍺' }, description: 'Happy to sit reserve or rotate out for others', default: isReserve },
          { label: 'Need Carry (pair me with high-IO carries)', value: 'vibe_need_carry', emoji: { name: '🎒' }, description: 'Needs assistance pushing keystone levels', default: isNeedCarry },
          { label: 'Back is Stronk (willing to carry)', value: 'vibe_willing_carry', emoji: { name: '🏋️' }, description: 'Ready to anchor and carry lower keys', default: isWillingCarry },
          { label: 'Shitter Alt Squad (chill alt run)', value: 'vibe_shitter', emoji: { name: '💩' }, description: 'Under-geared alt run, pure fun', default: isShitter }
        ]
      }
    ]
  };

  // 5. Submit / Action Buttons
  const rowActions = {
    type: 1,
    components: [
      { type: 2, style: 3, custom_id: 'btn_confirm_rsvp', label: 'Save My RSVP ✅' },
      { type: 2, style: 1, custom_id: 'btn_custom_modal', label: 'Type Character Name ✏️' },
      { type: 2, style: 4, custom_id: 'btn_dismiss_form', label: 'Close ✖️' }
    ]
  };

  return [rowChar, rowRoles, rowRange, rowVibes, rowActions];
}

module.exports = {
  createRosterEmbed,
  createGroupEmbeds,
  createSignupButtons,
  createSignupFormComponents
};
