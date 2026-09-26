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

const EVENT_TIME_ZONE = process.env.EVENT_TIME_ZONE || 'America/New_York';
const EVENT_HOUR = Number(process.env.EVENT_HOUR || 20); // 8 PM in EVENT_TIME_ZONE
const EVENT_LENGTH_HOURS = 4; // keep showing tonight's kickoff until the night is over
const HOST_NAME = process.env.HOST_NAME || 'MadKing';

// Wall-clock parts of `date` in the event time zone.
function zonedParts(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short'
  }).formatToParts(date).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return {
    year: +parts.year, month: +parts.month, day: +parts.day,
    hour: +parts.hour, minute: +parts.minute, second: +parts.second,
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday)
  };
}

// UTC milliseconds for a wall-clock time in the event time zone (handles daylight saving).
function zonedToUtc(year, month, day, hour) {
  const guess = Date.UTC(year, month - 1, day, hour);
  const p = zonedParts(new Date(guess));
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return guess - (asUtc - guess);
}

/**
 * Unix timestamp for the next Friday kickoff (8:00 PM Eastern by default).
 * Netlify runs in UTC, so the time zone must be explicit.
 */
function getNextFridayTimestamp(now = new Date()) {
  const today = zonedParts(now);
  let days = (5 - today.weekday + 7) % 7;
  let target = zonedToUtc(today.year, today.month, today.day + days, EVENT_HOUR);
  if (now.getTime() > target + EVENT_LENGTH_HOURS * 3600 * 1000) {
    target = zonedToUtc(today.year, today.month, today.day + days + 7, EVENT_HOUR);
  }
  return Math.floor(target / 1000);
}

// Discord limits: title 256, description 4096, 25 fields, name 256, value 1024, 6000 characters in total.
function clip(text, max) {
  const value = String(text ?? '');
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function fitEmbed(embed, budget = 6000) {
  const data = embed.data || embed;
  if (data.title) data.title = clip(data.title, 256);
  if (data.description) data.description = clip(data.description, 4096);
  let fields = (data.fields || []).map(f => ({ ...f, name: clip(f.name || '\u200b', 256), value: clip(f.value || '\u200b', 1024) }));
  if (fields.length > 25) fields = fields.slice(0, 25);
  const size = () => (data.title || '').length + (data.description || '').length + (data.footer?.text || '').length +
    fields.reduce((sum, f) => sum + f.name.length + f.value.length, 0);
  let dropped = 0;
  while (fields.length > 1 && size() > budget - 60) {
    fields.pop();
    dropped++;
  }
  if (dropped) fields.push({ name: '…', value: `${dropped} more section(s) — see the web app.`, inline: false });
  data.fields = fields;
  return embed;
}

// Add a field already clipped to Discord's limits (discord.js throws on oversize fields).
function addField(embed, name, value, inline = false) {
  embed.addFields({ name: clip(name || '\u200b', 256), value: clip(value || '\u200b', 1024), inline });
  return embed;
}

const ROLE_ICON = { Tank: '🛡️', Healer: '💚', DPS: '⚔️' };
const DECLINE_WINDOW_MS = 6 * 24 * 3600 * 1000;

function ioShort(p) {
  return p.io ? `${(Number(p.io) / 1000).toFixed(1)}k` : '';
}

function vibeIcons(p) {
  let s = '';
  if (p.isLeader) s += '👑';
  if (p.carryPreference === 'need_carry') s += '🎒';
  if (p.carryPreference === 'willing_carry') s += '🏋️';
  if (p.isShitter) s += '💩';
  if (p.isReserve) s += '🍺';
  return s;
}

// "Name 3.2k 🛡️⚔️ 👑" — other roles they can flex into, then vibe icons.
function playerLine(p, { showRoles = true, primary = null } = {}) {
  const roles = (p.roles || []).filter(r => r !== primary);
  const bits = [`**${p.name}**`];
  const io = ioShort(p);
  if (io) bits.push(io);
  if (showRoles && roles.length) bits.push(roles.map(r => ROLE_ICON[r] || '').join(''));
  const vibes = vibeIcons(p);
  if (vibes) bits.push(vibes);
  return bits.join(' ');
}

function inGroupNames(formedGroups) {
  const names = new Set();
  for (const g of formedGroups || []) {
    for (const m of [g?.tank, g?.healer, ...(g?.dps || [])]) if (m?.name) names.add(String(m.name).toLowerCase());
  }
  return names;
}

function declinedThisWeek(players) {
  const cutoff = Date.now() - DECLINE_WINDOW_MS;
  return (players || []).filter(p => !p.attending && (Date.parse(p.declinedAt || '') || 0) > cutoff);
}

/**
 * The sign-up card. Always open for sign-ups: people join through the night and switch characters,
 * so formed groups and the waiting list are shown together.
 */
function createRosterEmbed(players, webUrl = 'https://knkmplus.netlify.app', hostName = HOST_NAME, formedGroups = [], benchedPlayers = []) {
  const all = players || [];
  const attending = all.filter(p => p.attending === true);
  const byName = new Map(all.map(p => [String(p.name || '').toLowerCase(), p]));
  const count = role => attending.filter(p => (p.roles || []).includes(role)).length;
  const tanks = count('Tank');
  const healers = count('Healer');
  const dps = count('DPS');
  const possible = Math.min(tanks, healers, Math.floor(attending.length / 5));
  const kickoff = getNextFridayTimestamp();
  const groups = Array.isArray(formedGroups) ? formedGroups.filter(Boolean) : [];
  const grouped = inGroupNames(groups);
  const waiting = attending.filter(p => !grouped.has(String(p.name || '').toLowerCase()));

  const lines = [
    `⏰ <t:${kickoff}:F> · <t:${kickoff}:R> · Host: **${hostName}**`,
    `**${attending.length} signed up** · 🛡️ ${tanks} · 💚 ${healers} · ⚔️ ${dps} · room for **${possible}** group${possible === 1 ? '' : 's'}`
  ];
  if (groups.length) lines.push(`🏰 **${groups.length} group${groups.length === 1 ? '' : 's'} formed** · ${waiting.length} waiting · sign-ups stay open all night`);

  const embed = new EmbedBuilder()
    .setTitle('⚔️ Kith & Kin — Friday Mythic+ Night')
    .setColor(groups.length ? 0x10B981 : 0xDC2626)
    .setDescription(lines.join('\n'));

  if (groups.length) {
    groups.forEach((g, idx) => {
      const live = m => (m?.name && byName.get(String(m.name).toLowerCase())) || m;
      const out = m => (m && byName.get(String(m.name).toLowerCase())?.attending === false ? ' 💤' : '');
      // Only a key someone actually holds/rolled. The solver's dungeon pick is just a suggestion.
      const key = g.keystone || g.dungeon;
      const util = `${g.hasLust ? '⚡' : ''}${g.hasBrez ? '🔄' : ''}`;
      const body = [
        `🔑 ${key ? `\`${key}\`` : '*no key yet*'} ${util}`.trim(),
        g.tank ? `🛡️ ${playerLine(live(g.tank), { showRoles: false })}${out(g.tank)}` : '🛡️ *open*',
        g.healer ? `💚 ${playerLine(live(g.healer), { showRoles: false })}${out(g.healer)}` : '💚 *open*',
        ...(g.dps || []).map(d => (d ? `⚔️ ${playerLine(live(d), { showRoles: false })}${out(d)}` : '⚔️ *open*'))
      ];
      addField(embed, `Group ${idx + 1} · ${g.name || 'Party'}`, body.join('\n'), true);
    });
    if (waiting.length) {
      addField(embed, `⏳ Waiting for a group (${waiting.length})`,
        waiting.map(p => `${(p.roles || []).map(r => ROLE_ICON[r]).join('')} ${playerLine(p, { showRoles: false })}`).join('\n'));
    }
  } else if (attending.length) {
    // One column per role. Each player appears once, under their first role, with flex roles shown as icons.
    for (const role of ['Tank', 'Healer', 'DPS']) {
      const list = attending.filter(p => ((p.roles || [])[0] || 'DPS') === role);
      addField(embed, `${ROLE_ICON[role]} ${role === 'DPS' ? 'DPS' : role + 's'} (${list.length})`,
        list.length ? list.map(p => playerLine(p, { primary: role })).join('\n') : '—', true);
    }
  } else {
    addField(embed, 'Sign-ups are open', 'Click **Sign Up / Edit 📝** below to pick your character, roles and key goals.');
  }

  const vibe = [];
  const namesWith = f => attending.filter(f).map(p => p.name).join(', ');
  if (attending.some(p => p.carryPreference === 'need_carry')) vibe.push(`🎒 Needs a carry: ${namesWith(p => p.carryPreference === 'need_carry')}`);
  if (attending.some(p => p.isShitter)) vibe.push(`💩 Alt squad: ${namesWith(p => p.isShitter)}`);
  if (vibe.length) addField(embed, 'Notes', vibe.join('\n'));

  const declined = declinedThisWeek(all);
  if (declined.length) {
    addField(embed, `💤 Can't make it (${declined.length})`, declined.map(p => p.name).join(', '));
  }

  embed.setFooter({ text: '👑 leader · 🏋️ will carry · 🎒 needs carry · 🍺 happy to sit out · 💤 left for the night' });
  embed.setTimestamp();
  return fitEmbed(embed);
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

      return `${icon} **${m.name}** (${m.className}) — **${(m.io || 0).toLocaleString()} IO**${m.ilvl ? ` (${m.ilvl} ilvl)` : ''}${flagStr}\n` +
             `   └ Range: +${m.keyMin} to +${m.keyMax}${m.ownedKey ? ` | 🔑 ${m.ownedKey}` : ''}`;
    };

    let membersText = [
      formatMemberLine('🛡️', grp.tank),
      formatMemberLine('💚', grp.healer),
      ...grp.dps.map(d => formatMemberLine('⚔️', d))
    ].join('\n\n');

    embed.setDescription(clip(metaDesc + membersText, 4096));
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
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_open_signup').setLabel('Sign Up / Edit 📝').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('btn_absent').setLabel('Can’t Make It 💤').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setLabel('Website 🌐').setStyle(ButtonStyle.Link).setURL(`${webUrl.replace(/\/$/, '')}/signup.html`)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_roll_key').setLabel('Roll Key 🎲').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('btn_form_groups').setLabel('Form Groups 🏰').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('btn_refresh_roster').setLabel('Refresh 🔄').setStyle(ButtonStyle.Secondary)
  );
  return [row1, row2];
}

/**
 * Guild matches for a typed name (fallback search). Values are "Name|Realm" so the exact
 * character is claimed. Nothing is created for names that aren't found.
 */
function createCharacterMatchComponents(matches = []) {
  const options = [];
  const seen = new Set();
  for (const entry of matches) {
    const value = `${entry.name}|${entry.realm || ''}`.slice(0, 100);
    if (!entry?.name || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    options.push({
      label: `${entry.name} — ${entry.className || 'Player'}`.slice(0, 100),
      value,
      description: `${entry.realm || 'Kith & Kin'}`.slice(0, 100)
    });
    if (options.length >= 25) break;
  }
  const rows = [];
  if (options.length) {
    rows.push({ type: 1, components: [{ type: 3, custom_id: 'select_character', placeholder: 'Pick your character', min_values: 1, max_values: 1, options }] });
  }
  rows.push({
    type: 1,
    components: [
      { type: 2, style: 2, custom_id: 'btn_search_modal', label: 'Search again ✏️' },
      { type: 2, style: 4, custom_id: 'btn_dismiss_form', label: 'Close ✖️' }
    ]
  });
  return rows;
}

/**
 * The personal sign-up panel: roles, key goals, vibes, which of your characters you're on tonight,
 * and actions. Every change saves immediately.
 */
function createSignupFormComponents({ player = null, characters = [] } = {}) {
  const activeRoles = player?.roles || ['DPS'];
  const activeBrackets = player?.keyBrackets || (player?.keyMax ? (player.keyMax > 12 ? ['12+'] : (player.keyMax >= 9 ? ['10-12'] : ['6-8'])) : ['10-12']);
  const rowRoles = {
    type: 1,
    components: [{
      type: 3,
      custom_id: 'select_roles',
      placeholder: 'Roles you can play tonight',
      min_values: 1,
      max_values: 3,
      options: [
        { label: 'Tank', value: 'Tank', emoji: { name: '🛡️' }, default: activeRoles.includes('Tank') },
        { label: 'Healer', value: 'Healer', emoji: { name: '💚' }, default: activeRoles.includes('Healer') },
        { label: 'DPS', value: 'DPS', emoji: { name: '⚔️' }, default: activeRoles.includes('DPS') }
      ]
    }]
  };
  const rowRange = {
    type: 1,
    components: [{
      type: 3,
      custom_id: 'select_key_range',
      placeholder: 'Key goals (pick any)',
      min_values: 1,
      max_values: 3,
      options: [
        { label: '6-8 · Hero crests', value: '6-8', emoji: { name: '🌱' }, default: activeBrackets.includes('6-8') },
        { label: '9-12 · Myth crests & max Vault', value: '10-12', emoji: { name: '🗝️' }, default: activeBrackets.includes('10-12') },
        { label: '12+ · Score push', value: '12+', emoji: { name: '🔥' }, default: activeBrackets.includes('12+') }
      ]
    }]
  };
  const rowVibes = {
    type: 1,
    components: [{
      type: 3,
      custom_id: 'select_vibes',
      placeholder: 'Extras (optional)',
      min_values: 0,
      max_values: 5,
      options: [
        { label: 'Happy to lead a group', value: 'vibe_leader', emoji: { name: '👑' }, default: !!player?.isLeader },
        { label: 'Will carry lower keys', value: 'vibe_willing_carry', emoji: { name: '🏋️' }, default: player?.carryPreference === 'willing_carry' },
        { label: 'Could use a carry', value: 'vibe_need_carry', emoji: { name: '🎒' }, default: player?.carryPreference === 'need_carry' },
        { label: 'Alt / chill squad', value: 'vibe_shitter', emoji: { name: '💩' }, default: !!player?.isShitter },
        { label: 'Happy to sit out if needed', value: 'vibe_reserve', emoji: { name: '🍺' }, default: !!player?.isReserve }
      ]
    }]
  };
  const rows = [rowRoles, rowRange, rowVibes];

  const charOptions = (characters || []).slice(0, 24).map(c => ({
    label: `${c.name} — ${c.className || 'Player'}`.slice(0, 100),
    value: `${c.name}|${c.realm || ''}`.slice(0, 100),
    description: `${c.realm || ''}${c.isMain ? ' · ⭐ main' : ''}${c.attending ? ' · signed up' : ''}`.slice(0, 100) || undefined,
    default: player ? c.name === player.name && (c.realm || '') === (player.realm || '') : false
  }));
  charOptions.push({ label: 'Add another character', value: '__add__', emoji: { name: '➕' } });
  rows.push({
    type: 1,
    components: [{ type: 3, custom_id: 'select_my_char', placeholder: 'Switch character', min_values: 1, max_values: 1, options: charOptions }]
  });

  rows.push({
    type: 1,
    components: [
      { type: 2, style: 3, custom_id: 'btn_confirm_rsvp', label: 'Done ✅' },
      { type: 2, style: 2, custom_id: 'btn_set_main', label: player?.isMain ? '⭐ Main' : 'Make main ⭐', disabled: !!player?.isMain },
      { type: 2, style: 2, custom_id: 'btn_absent', label: 'Can’t make it 💤' },
      { type: 2, style: 4, custom_id: 'btn_remove_char', label: 'Remove character' }
    ]
  });
  return rows;
}

function createLeaderboardEmbed(standings, webUrl = 'https://knkmplus.netlify.app', { demo = false } = {}) {
  const top = Array.isArray(standings) ? standings.slice(0, 10) : [];
  const p1 = top[0];
  const p2 = top[1];
  const p3 = top[2];

  const embed = new EmbedBuilder()
    .setTitle(demo ? '🎭 DEMO — KITH & KIN PARTICIPATION LEADERBOARD' : '🏆 KITH & KIN — PARTICIPATION LEADERBOARD')
    .setColor(demo ? 0x64748B : 0xF5D061)
    .setDescription(demo
      ? '**⚠️ Sample data — not real standings.** Live standings appear once the season has 10+ logged keys.'
      : '*Honoring guild attendance, role versatility, leadership, and carry shepherds over raw parses.*');

  if (p1 || p2 || p3) {
    let podiumText = '';
    if (p1) {
      podiumText += `🥇 **#1 ${p1.name}** (${p1.className}) — **${p1.totalPoints} pts** • *${p1.title}*\n` +
                    `   └ 📅 ${p1.nightsAttended} Nights | 🗝️ ${p1.runsCount} Keys (${p1.timedCount} Timed) | 🎭 ${p1.roles.join('/')}${p1.isLeader ? ' | 👑 Leader' : ''}${p1.isStonk ? ' | 🏋️ Stronk' : ''}${p1.carryShepherdCount ? ` | 🎒 ${p1.carryShepherdCount} Carries` : ''}\n\n`;
    }
    if (p2) {
      podiumText += `🥈 **#2 ${p2.name}** (${p2.className}) — **${p2.totalPoints} pts** • *${p2.title}*\n` +
                    `   └ 📅 ${p2.nightsAttended} Nights | 🗝️ ${p2.runsCount} Keys (${p2.timedCount} Timed) | 🎭 ${p2.roles.join('/')}${p2.isLeader ? ' | 👑 Leader' : ''}${p2.isStonk ? ' | 🏋️ Stronk' : ''}${p2.carryShepherdCount ? ` | 🎒 ${p2.carryShepherdCount} Carries` : ''}\n\n`;
    }
    if (p3) {
      podiumText += `🥉 **#3 ${p3.name}** (${p3.className}) — **${p3.totalPoints} pts** • *${p3.title}*\n` +
                    `   └ 📅 ${p3.nightsAttended} Nights | 🗝️ ${p3.runsCount} Keys (${p3.timedCount} Timed) | 🎭 ${p3.roles.join('/')}${p3.isLeader ? ' | 👑 Leader' : ''}${p3.isStonk ? ' | 🏋️ Stronk' : ''}${p3.carryShepherdCount ? ` | 🎒 ${p3.carryShepherdCount} Carries` : ''}\n`;
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
           '• **Stronk Back (🏋️):** +8 pts / night willing to carry\n' +
           '• **Carry Shepherd (🎒):** +15 pts per key run with guildies in need'
  });

  embed.setFooter({ text: demo ? 'Kith & Kin • DEMO DATA' : 'Kith & Kin • Midnight Season 2 | Live Web App Synced' });
  return fitEmbed(embed);
}

function createLeaderboardButtons(webUrl = 'https://knkmplus.netlify.app', view = 'auto') {
  const linkStyle = (ButtonStyle && ButtonStyle.Link) ? ButtonStyle.Link : 5;
  const secondaryStyle = (ButtonStyle && ButtonStyle.Secondary) ? ButtonStyle.Secondary : 2;
  const primaryStyle = (ButtonStyle && ButtonStyle.Primary) ? ButtonStyle.Primary : 1;

  const btnWeb = new ButtonBuilder()
    .setStyle(linkStyle)
    .setURL(`${webUrl.replace(/\/$/, '')}/leaderboard.html`)
    .setLabel('🌐 View Web Leaderboard');

  const btnRules = new ButtonBuilder()
    .setCustomId('btn_leaderboard_rules')
    .setStyle(secondaryStyle)
    .setLabel('ℹ️ Scoring Rules');

  const btnRefresh = new ButtonBuilder()
    .setCustomId(`btn_leaderboard_refresh:${view}`)
    .setStyle(primaryStyle)
    .setLabel('🔄 Refresh');

  const row = new ActionRowBuilder().addComponents(btnWeb, btnRules, btnRefresh);
  return [row];
}

module.exports = {
  fitEmbed,
  getNextFridayTimestamp,
  createRosterEmbed,
  createGroupEmbeds,
  createSignupButtons,
  createSignupFormComponents,
  createCharacterMatchComponents,
  createLeaderboardEmbed,
  createLeaderboardButtons
};
