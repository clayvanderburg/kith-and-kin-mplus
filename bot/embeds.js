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

function createRosterEmbed(players, webUrl = 'https://knkmplus.netlify.app', hostName = 'MadKing') {
  const attending = players.filter(p => p.attending);
  const absent = players.filter(p => !p.attending);
  const tanks = attending.filter(p => (p.roles || []).includes('Tank')).length;
  const healers = attending.filter(p => (p.roles || []).includes('Healer')).length;
  const dps = attending.filter(p => (p.roles || []).includes('DPS')).length;
  const maxGroups = Math.min(tanks, healers, Math.floor(dps / 3));

  const needsCarry = attending.filter(p => p.carryPreference === 'need_carry');
  const stronk = attending.filter(p => p.carryPreference === 'willing_carry');
  const shitters = attending.filter(p => p.isShitter);

  const nextFriday = getNextFridayTimestamp();

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
      value: 'Click a role button below (`Tank`, `Healer`, or `DPS`) to sign up your character!'
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
        if (p.carryPreference === 'need_carry') flag = ' 🎒';
        if (p.carryPreference === 'willing_carry') flag = ' 🏋️';
        if (p.isShitter) flag = ' 💩';

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
    text: `Kith & Kin • Midnight Season 2 • Click buttons below to RSVP`
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
        benched.map(p => `• **${p.name}** (${p.className} - ${(p.roles || []).join('/')}) — ${(p.io || 0).toLocaleString()} IO (+${p.keyMin}-+${p.keyMax})`).join('\n')
      );
    embeds.push(benchEmbed);
  }

  return embeds;
}

function createSignupButtons(webUrl = 'https://knkmplus.netlify.app') {
  // Row 1: Quick Role Sign-up Buttons (Primary)
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_role_Tank')
      .setLabel('Tank 🛡️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('btn_role_Healer')
      .setLabel('Healer 💚')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('btn_role_DPS')
      .setLabel('DPS ⚔️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('btn_absent')
      .setLabel('Can’t Make It 💤')
      .setStyle(ButtonStyle.Secondary)
  );

  // Row 2: Vibe & Preference Toggles + Form Groups + Web Link
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_need_carry')
      .setLabel('Need Carry 🎒')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_stronk_carry')
      .setLabel('Stronk Back 🏋️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_shitter')
      .setLabel('Shitter Alt 💩')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_form_groups')
      .setLabel('Form Groups 🏰')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setLabel('Web View 🌐')
      .setStyle(ButtonStyle.Link)
      .setURL(webUrl)
  );

  // Row 3: Keystone Actions & Live Refresh
  const row3 = new ActionRowBuilder().addComponents(
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

  return [row1, row2, row3];
}

module.exports = {
  createRosterEmbed,
  createGroupEmbeds,
  createSignupButtons
};
