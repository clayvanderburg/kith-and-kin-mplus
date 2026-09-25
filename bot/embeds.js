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

    const ioLabel = (score) => `${(Number(score || 0) / 1000).toFixed(1)}k`;

    formedGroups.forEach((g, idx) => {
      const utilBadges = [];
      if (g.hasLust) utilBadges.push('⚡ Lust');
      if (g.hasBrez) utilBadges.push('🔄 BRez');
      const headerBits = [];
      if (g.leaderName) headerBits.push(`👑 Leader: **${g.leaderName}**`);
      if (g.keystone || g.dungeon) headerBits.push(`🔑 \`${g.keystone || g.dungeon}\``);
      if (utilBadges.length) headerBits.push(utilBadges.join(' '));

      const lines = [];
      if (g.tank) lines.push(`🛡️ **${g.tank.name}** (${g.tank.className} • ${ioLabel(g.tank.io)})`);
      if (g.healer) lines.push(`💚 **${g.healer.name}** (${g.healer.className} • ${ioLabel(g.healer.io)})`);
      (g.dps || []).forEach(d => {
        lines.push(`⚔️ **${d.name}** (${d.className} • ${ioLabel(d.io)})`);
      });

      const body = [headerBits.join(' • '), lines.join('\n')].filter(Boolean).join('\n') || 'Empty Party';
      embed.addFields({
        name: `🏰 Group ${idx + 1}: ${g.name || 'Keystone Crew'} (Avg IO: ${g.avgIo || 0})`.slice(0, 256),
        value: body.slice(0, 1024),
        inline: false
      });
    });

    if (Array.isArray(benchedPlayers) && benchedPlayers.length > 0) {
      embed.addFields({
        name: `🍺 Bench / Reserves (${benchedPlayers.length})`.slice(0, 256),
        value: benchedPlayers.map(p => `• **${p.name}** (${p.className} - ${(p.roles || []).join('/')})${p.isReserve ? ' 🍺' : ''}`).join('\n').slice(0, 1024),
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
      .setLabel('Sign Up on Web 🌐')
      .setStyle(ButtonStyle.Link)
      .setURL(`${webUrl.replace(/\/$/, '')}/signup.html`)
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
 * Filtered guild matches. Discord select menus only hold 25 options,
 * so this list is the search result, never the whole roster.
 */
function createCharacterMatchComponents(matches = [], typedName = '') {
  const options = [];
  const seen = new Set();
  for (const entry of matches) {
    if (!entry?.name || seen.has(entry.name.toLowerCase())) continue;
    seen.add(entry.name.toLowerCase());
    options.push({
      label: `${entry.name} (${entry.className || 'Player'})`.slice(0, 100),
      value: entry.name.slice(0, 100),
      description: `${entry.realm || 'Kith & Kin'}`.slice(0, 100)
    });
    if (options.length >= 24) break;
  }

  const typed = String(typedName || '').trim().slice(0, 70);
  const customValue = (typed ? `__custom__:${typed}` : '__custom__').slice(0, 100);
  const alreadyListed = typed && options.some(opt => opt.value.toLowerCase() === typed.toLowerCase());
  if (!alreadyListed) {
    options.push({
      label: (typed ? `➕ "${typed}" (not in guild)` : '➕ Name not in guild').slice(0, 100),
      value: customValue,
      description: 'Use this exact name even if they are not on the roster'
    });
  }

  const placeholder = typed
    ? `Matches for "${typed}"`.slice(0, 150)
    : 'Pick a character';

  return [
    {
      type: 1,
      components: [
        {
          type: 3,
          custom_id: 'select_character',
          placeholder,
          min_values: 1,
          max_values: 1,
          options: options.slice(0, 25)
        }
      ]
    },
    {
      type: 1,
      components: [
        { type: 2, style: 1, custom_id: 'btn_search_again', label: 'Search Again ✏️' },
        { type: 2, style: 4, custom_id: 'btn_dismiss_form', label: 'Close ✖️' }
      ]
    }
  ];
}

/**
 * Role, key-goal, and vibe picker shown after a character is chosen.
 */
function createSignupFormComponents({ player = null } = {}) {
  // 1. Roles Multi-Select Dropdown
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
      { type: 2, style: 1, custom_id: 'btn_search_again', label: 'Search Name Again ✏️' },
      { type: 2, style: 4, custom_id: 'btn_dismiss_form', label: 'Close ✖️' }
    ]
  };

  return [rowRoles, rowRange, rowVibes, rowActions];
}

function createLeaderboardEmbed(standings, webUrl = 'https://knkmplus.netlify.app') {
  const top = Array.isArray(standings) ? standings.slice(0, 10) : [];
  const p1 = top[0];
  const p2 = top[1];
  const p3 = top[2];

  const embed = new EmbedBuilder()
    .setTitle('🏆 KITH & KIN — PARTICIPATION LEADERBOARD')
    .setColor(0xF5D061)
    .setDescription('*Honoring guild attendance, role versatility, leadership, and carry shepherds over raw parses.*');

  if (p1 || p2 || p3) {
    let podiumText = '';
    if (p1) {
      podiumText += `🥇 **#1 ${p1.name}** (${p1.className}) — **${p1.totalPoints} pts** • *${p1.title}*\n` +
                    `   └ 📅 ${p1.nightsAttended} Nights | 🗝️ ${p1.runsCount} Keys (${p1.timedCount} Timed) | 🎭 ${p1.roles.join('/')}${p1.isLeader ? ' | 👑 Leader' : ''}${p1.isStonk ? ' | 🏋️ Stonk' : ''}${p1.carryShepherdCount ? ` | 🎒 ${p1.carryShepherdCount} Carries` : ''}\n\n`;
    }
    if (p2) {
      podiumText += `🥈 **#2 ${p2.name}** (${p2.className}) — **${p2.totalPoints} pts** • *${p2.title}*\n` +
                    `   └ 📅 ${p2.nightsAttended} Nights | 🗝️ ${p2.runsCount} Keys (${p2.timedCount} Timed) | 🎭 ${p2.roles.join('/')}${p2.isLeader ? ' | 👑 Leader' : ''}${p2.isStonk ? ' | 🏋️ Stonk' : ''}${p2.carryShepherdCount ? ` | 🎒 ${p2.carryShepherdCount} Carries` : ''}\n\n`;
    }
    if (p3) {
      podiumText += `🥉 **#3 ${p3.name}** (${p3.className}) — **${p3.totalPoints} pts** • *${p3.title}*\n` +
                    `   └ 📅 ${p3.nightsAttended} Nights | 🗝️ ${p3.runsCount} Keys (${p3.timedCount} Timed) | 🎭 ${p3.roles.join('/')}${p3.isLeader ? ' | 👑 Leader' : ''}${p3.isStonk ? ' | 🏋️ Stonk' : ''}${p3.carryShepherdCount ? ` | 🎒 ${p3.carryShepherdCount} Carries` : ''}\n`;
    }
    embed.addFields({ name: '👑 THE PODIUM OF CHAMPIONS', value: podiumText.trim() });
  }

  if (top.length > 3) {
    let tableText = '```\nRK  NAME            PTS   NIGHTS  KEYS  ROLES         VIBES\n-------------------------------------------------------------\n';
    for (let i = 3; i < top.length; i++) {
      const item = top[i];
      const rk = `#${item.rank}`.padEnd(4, ' ');
      const name = (item.name || '').slice(0, 14).padEnd(15, ' ');
      const pts = `${item.totalPoints}`.padStart(4, ' ') + ' ';
      const nights = `${item.nightsAttended}n`.padStart(5, ' ') + '  ';
      const keys = `${item.runsCount}k`.padStart(4, ' ') + '  ';
      const roles = (item.roles || []).join('/').slice(0, 12).padEnd(13, ' ');
      let vibes = '';
      if (item.isLeader) vibes += '👑';
      if (item.isStonk) vibes += '🏋️';
      if (item.carryShepherdCount > 0) vibes += `🎒${item.carryShepherdCount}`;
      if (item.isNeedCarry) vibes += '🌱';
      tableText += `${rk}${name}${pts}${nights}${keys}${roles}${vibes}\n`;
    }
    tableText += '```';
    embed.addFields({ name: '⚔️ STANDINGS (4 - 10)', value: tableText });
  }

  embed.addFields({
    name: '📜 SCORING CODE OF THE REALM',
    value: '• **Attendance:** +15 pts / night\n' +
           '• **Keys Completed:** +10 pts (+5 timed, +2 per level > +10)\n' +
           '• **Role Flexibility:** +5 pts (Dual Flex) / +10 pts (Triple Flex)\n' +
           '• **Born Leader (👑):** +8 pts / night willing to lead\n' +
           '• **Stonk Back (🏋️):** +8 pts / night willing to carry\n' +
           '• **Carry Shepherd (🎒):** +15 pts per key run with guildies in need'
  });

  embed.setFooter({ text: 'Kith & Kin • Midnight Season 2 | Live Web App Synced' });
  return embed;
}

function createLeaderboardButtons(webUrl = 'https://knkmplus.netlify.app') {
  return [
    {
      type: 1,
      components: [
        { type: 2, style: ButtonStyle.Link || 5, url: `${webUrl}/leaderboard.html`, label: '🌐 View Web Leaderboard' },
        { type: 2, style: ButtonStyle.Secondary || 2, custom_id: 'btn_leaderboard_rules', label: 'ℹ️ Scoring Rules' },
        { type: 2, style: ButtonStyle.Primary || 1, custom_id: 'btn_leaderboard_refresh', label: '🔄 Refresh' }
      ]
    }
  ];
}

module.exports = {
  createRosterEmbed,
  createGroupEmbeds,
  createSignupButtons,
  createSignupFormComponents,
  createCharacterMatchComponents,
  createLeaderboardEmbed,
  createLeaderboardButtons
};
