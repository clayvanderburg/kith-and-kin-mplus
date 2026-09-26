/**
 * Kith and Kin Mythic+ Night - Serverless Discord Interactions Endpoint
 * Hosted 100% on Netlify. No local computer or persistent server needed.
 * Discord sends HTTP POST requests here whenever members use slash commands or click buttons.
 */

const crypto = require('crypto');
const path = require('path');

// Safe dynamic imports of solver and embeds across local and Netlify Lambda environments
function loadModule(name) {
  const possiblePaths = [
    path.join(__dirname, '..', '..', '..', '..', 'bot', name),
    path.join(__dirname, '..', '..', 'bot', name),
    path.join(__dirname, '..', 'bot', name),
    path.join(__dirname, 'bot', name),
    path.join(process.cwd(), 'bot', name),
    path.join(__dirname, name)
  ];
  for (const p of possiblePaths) {
    try {
      return require(p);
    } catch (e) {}
  }
  return null;
}

const solver = loadModule('solver');
const embeds = loadModule('embeds');
const rosterSearch = loadModule('roster-search');
const rollUi = loadModule('roll-ui');
const liveState = require('../live-state');

function foldName(value) {
  return String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

// A character belongs to whoever claimed it first (Discord or Battle.net). Others cannot edit it.
function claimError(player, discordUserId) {
  if (!player) return null;
  if (player.discordId && player.discordId !== discordUserId) {
    return `**${player.name}** is already claimed by another Discord member. Ask an officer if that is wrong.`;
  }
  if (!player.discordId && player.bnetId) {
    return `**${player.name}** was signed up through Battle.net. Edit it on the website: ${WEB_URL}/signup.html`;
  }
  return null;
}

function findPlayerByName(state, name) {
  const folded = foldName(name);
  return (state.players || []).find(p => foldName(p.name) === folded) || null;
}

// The character this Discord member most recently claimed.
function findOwnPlayer(state, discordUserId) {
  return activeCharacter(state, discordUserId);
}

function ephemeral(content) {
  return jsonResponse({ type: 4, data: { content, flags: 64 } });
}

// ---- Characters a Discord member owns -------------------------------------------------
// A member can claim several characters (main + alts). The "active" one is the one they're
// playing tonight (most recently picked). Switching characters mid-night keeps their group spot.

function sameChar(a, b) {
  return foldName(a?.name) === foldName(b?.name) && foldName(a?.realm) === foldName(b?.realm);
}

function myCharacters(state, userId) {
  if (!userId) return [];
  return (state.players || []).filter(p => p.discordId === userId);
}

function activeCharacter(state, userId) {
  const time = p => Date.parse(p.activeAt || p.touchedAt || '') || 0;
  return myCharacters(state, userId).sort((a, b) => time(b) - time(a))[0] || null;
}

function findCharacter(state, name, realm) {
  const players = state.players || [];
  const exact = players.find(p => foldName(p.name) === foldName(name) && (!realm || foldName(p.realm) === foldName(realm)));
  if (exact) return exact;
  if (!realm) return null;
  // Realm spelled differently ("MoonGuard" vs "Moon Guard")
  const loose = r => foldName(r).replace(/[^a-z0-9]/g, '');
  return players.find(p => foldName(p.name) === foldName(name) && loose(p.realm) === loose(realm)) || null;
}

function groupSlotOf(state, player) {
  const groups = state.formedGroups || [];
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (!g) continue;
    if (g.tank && foldName(g.tank.name) === foldName(player.name)) return { index: i, role: 'Tank' };
    if (g.healer && foldName(g.healer.name) === foldName(player.name)) return { index: i, role: 'Healer' };
    if ((g.dps || []).some(d => d && foldName(d.name) === foldName(player.name))) return { index: i, role: 'DPS' };
  }
  return null;
}

// Put `to` into every group slot `from` was holding.
function swapInGroups(state, from, to) {
  const snap = { id: to.id, name: to.name, className: to.className, realm: to.realm, roles: to.roles, io: to.io, ilvl: to.ilvl };
  const is = m => m && foldName(m.name) === foldName(from.name);
  let changed = false;
  for (const g of state.formedGroups || []) {
    if (!g) continue;
    if (is(g.tank)) { g.tank = { ...g.tank, ...snap, assignedRole: 'Tank' }; changed = true; }
    if (is(g.healer)) { g.healer = { ...g.healer, ...snap, assignedRole: 'Healer' }; changed = true; }
    g.dps = (g.dps || []).map(d => {
      if (!is(d)) return d;
      changed = true;
      return { ...d, ...snap, assignedRole: 'DPS' };
    });
  }
  return changed;
}

function removeFromGroups(state, player) {
  const is = m => m && foldName(m.name) === foldName(player.name);
  let changed = false;
  for (const g of state.formedGroups || []) {
    if (!g) continue;
    if (is(g.tank)) { g.tank = null; changed = true; }
    if (is(g.healer)) { g.healer = null; changed = true; }
    if ((g.dps || []).some(is)) { g.dps = g.dps.map(d => (is(d) ? null : d)); changed = true; }
  }
  return changed;
}

// Make `target` the character this member is playing tonight.
function activateCharacter(state, userId, target) {
  const now = new Date().toISOString();
  const previous = activeCharacter(state, userId);
  let note = '';
  if (previous && !sameChar(previous, target) && previous.attending) {
    previous.attending = false;
    previous.touchedAt = now;
    const slot = groupSlotOf(state, previous);
    if (slot && swapInGroups(state, previous, target)) {
      state.groupsTouchedAt = now;
      note = `\n🔁 Took **${previous.name}**'s spot in **Group ${slot.index + 1}** (${slot.role}).`;
    }
  }
  target.discordId = userId;
  target.attending = true;
  target.absent = false;
  target.declinedAt = null;
  target.activeAt = now;
  target.touchedAt = now;
  if (!myCharacters(state, userId).some(p => p.isMain)) target.isMain = true;
  return note;
}

/**
 * Claim a character for this member. `info` comes from the guild roster or a Raider.IO lookup,
 * so every character is real — no "Adventurer" placeholders.
 */
function claimCharacter(state, userId, info) {
  let target = findCharacter(state, info.name, info.realm);
  const err = claimError(target, userId);
  if (err) return { error: err };
  if (!target) {
    const role = ['Tank', 'Healer', 'DPS'].includes(info.role) ? info.role : 'DPS';
    target = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: info.name,
      realm: info.realm || 'Perenolde',
      region: 'us',
      className: info.className || 'Adventurer',
      roles: [role],
      keyMin: 9,
      keyMax: 12,
      keyBrackets: ['10-12'],
      carryPreference: 'none',
      isShitter: false,
      isLeader: false,
      isReserve: false,
      io: info.io || 0,
      ilvl: info.ilvl || 0,
      guildMember: !!info.guildMember
    };
    state.players = state.players || [];
    state.players.push(target);
  } else {
    if (info.className && (!target.className || target.className === 'Adventurer')) target.className = info.className;
    if (info.realm && !target.realm) target.realm = info.realm;
    if (info.io && !target.io) target.io = info.io;
  }
  const note = activateCharacter(state, userId, target);
  return { player: target, note };
}

let signupCommandId = null;
// Clickable "/mplus signup" mention. Clicking it opens the command with live name search.
async function signupCommandMention(interaction) {
  if (!signupCommandId && process.env.DISCORD_TOKEN && interaction.application_id) {
    const base = `https://discord.com/api/v10/applications/${interaction.application_id}`;
    for (const url of [interaction.guild_id && `${base}/guilds/${interaction.guild_id}/commands`, `${base}/commands`].filter(Boolean)) {
      try {
        const res = await fetch(url, { headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` }, signal: AbortSignal.timeout(800) });
        if (!res.ok) continue;
        const cmd = (await res.json()).find(c => c.name === 'mplus');
        if (cmd) { signupCommandId = cmd.id; break; }
      } catch (err) { /* fall back to plain text */ }
    }
  }
  return signupCommandId ? `</mplus signup:${signupCommandId}>` : '`/mplus signup`';
}

async function addCharacterMessage(interaction, intro = '') {
  const mention = await signupCommandMention(interaction);
  return {
    content: `${intro}### ➕ Pick your character\nClick ${mention}, then start typing your name — your character shows up in the list as you type. Pick it and hit Enter.\n` +
      `• **Not in the guild?** Type \`Name-Realm\` (e.g. \`Noxxicc-Korgath\`) and pick the 🔎 option — we look it up on Raider.IO.\n` +
      `• On a phone and the list won't show? Use **Search by name** below.`,
    components: [{
      type: 1,
      components: [
        { type: 2, style: 2, custom_id: 'btn_search_modal', label: 'Search by name 🔍' },
        { type: 2, style: 4, custom_id: 'btn_dismiss_form', label: 'Close ✖️' }
      ]
    }],
    flags: 64
  };
}

function signupPanel(state, userId, player, note = '') {
  const slot = groupSlotOf(state, player);
  const status = player.attending
    ? `✅ **Signed up for tonight**${slot ? ` · in **Group ${slot.index + 1}** as ${slot.role}` : ' · waiting for a group'}`
    : '💤 **Not signed up for tonight** — change anything below to sign up';
  const keys = `+${player.keyMin || 9} to +${player.keyMax || 12}`;
  return {
    content: `### 📝 ${player.name}${player.isMain ? ' ⭐' : ''} · ${player.className || 'Player'} · ${player.realm || ''}\n` +
      `${status}\nRoles: **${(player.roles || []).join(' / ') || 'DPS'}** · Keys: **${keys}**${note}\n` +
      `-# Changes save instantly. Use the character menu to switch toons or add an alt.`,
    components: embeds ? embeds.createSignupFormComponents({ player, characters: myCharacters(state, userId) }) : [],
    flags: 64
  };
}

async function lookupCharacter(name, realm) {
  const rio = await lookupRaiderIo(name, realm, 'us', 1500);
  if (!rio?.name) return null;
  return { name: rio.name, realm: rio.realm || realm, className: rio.className, io: rio.io, ilvl: rio.ilvl };
}

// Turn what the member picked/typed into a real character, or explain what to do.
async function resolveCharacterChoice(raw) {
  const value = String(raw || '').trim();
  if (!value || value === '__hint__') {
    return { error: 'Start typing your name and **pick it from the list**. For characters outside the guild, type `Name-Realm`.' };
  }
  let name = value;
  let realm = '';
  let lookup = false;
  if (value.startsWith('__lookup__:')) {
    [name, realm] = value.slice('__lookup__:'.length).split(/-(.+)/);
    lookup = true;
  } else if (value.includes('|')) {
    [name, realm] = value.split('|');
  } else if (value.includes('-')) {
    [name, realm] = value.split(/-(.+)/);
  }
  name = (name || '').trim();
  realm = (realm || '').trim();

  if (!lookup && rosterSearch) {
    const matches = rosterSearch.searchGuildRoster(name, 50).matches
      .filter(e => foldName(e.name) === foldName(name) && (!realm || foldName(e.realm) === foldName(realm)));
    if (matches.length === 1 || (matches.length && realm)) {
      const e = matches[0];
      return { info: { name: e.name, realm: e.realm, className: e.className, role: e.role, guildMember: true } };
    }
    if (matches.length > 1) {
      return { error: `More than one **${name}** in the guild (${matches.map(m => m.realm).join(', ')}). Pick the right one from the list.` };
    }
  }
  if (!realm) {
    return { error: `**${name}** isn't on the guild roster. If they're outside the guild, type \`${name}-Realm\` and pick the 🔎 option.` };
  }
  const found = await lookupCharacter(name, realm);
  if (!found) return { error: `Couldn't find **${name}** on **${realm}** on Raider.IO. Check the spelling and realm.` };
  return { info: found };
}


/**
 * Form groups. By default existing groups are kept and only people still waiting are grouped,
 * because people keep arriving and swapping characters through the night.
 * `reshuffle: true` rebuilds every group from scratch.
 */
function formGroups(state, { reshuffle = false, avoidClassDupes = true } = {}) {
  const attending = (state.players || []).filter(p => p.attending);
  const existing = reshuffle ? [] : (state.formedGroups || []).filter(Boolean);
  const grouped = new Set();
  for (const g of existing) {
    for (const m of [g.tank, g.healer, ...(g.dps || [])]) if (m?.name) grouped.add(foldName(m.name));
  }
  const waiting = attending.filter(p => !grouped.has(foldName(p.name)));
  if (waiting.length < 5) {
    return {
      error: existing.length
        ? `Only ${waiting.length} waiting — need 5 (1 tank, 1 healer, 3 DPS) for another group. To rebuild every group, use \`/mplus form reshuffle:True\`.`
        : `Need at least 5 signed up to form a group (have ${attending.length}).`
    };
  }
  const result = solver
    ? solver.solveGroups({ players: waiting, avoidClassDupes, excludedDungeons: state.excludedDungeons || [] })
    : { groups: [], benched: waiting };
  if (!result.groups.length) return { error: result.message || 'Could not form a group from the people waiting.' };
  state.formedGroups = [...existing, ...result.groups];
  state.benchedPlayers = result.benched || [];
  state.groupsTouchedAt = new Date().toISOString();
  return { added: result.groups.length, total: state.formedGroups.length, waiting: (result.benched || []).length };
}

function cardMessage(state, content) {
  return {
    content,
    embeds: embeds ? [embeds.createRosterEmbed(state.players || [], WEB_URL, undefined, state.formedGroups || [], state.benchedPlayers || []).toJSON()] : [],
    components: embeds ? embeds.createSignupButtons(WEB_URL).map(r => r.toJSON()) : []
  };
}

let getStore = null;
try {
  getStore = require('@netlify/blobs').getStore;
} catch (e) {}

const TMP_FILE = path.join('/tmp', 'kk_mplus_state.json');
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || '66f468e2962fddf5f6c25d675f66df3970d481be92cc350c30358a12dfe527bb';
const WEB_URL = process.env.WEB_URL || 'https://knkmplus.netlify.app';


// The lambda event for this invocation. Strong blob reads must not use a warm cache.
let activeLambdaEvent = null;

function touchPlayer(player) {
  if (!player) return player;
  player.touchedAt = new Date().toISOString();
  return player;
}

function rememberDiscordCard(interaction, state) {
  const message = interaction.message;
  const flags = message?.flags || 0;
  const isEphemeral = (flags & 64) === 64;
  const channelId = interaction.channel_id || interaction.channel?.id;
  if (!message?.id || !channelId || isEphemeral) return;
  state.discordCard = {
    channelId,
    messageId: message.id,
    applicationId: interaction.application_id || null
  };
}

// Throws when storage is unreachable so we never save a blank roster over the real one.
async function loadState() {
  const live = await liveState.readLiveState(activeLambdaEvent);
  if (live && Array.isArray(live.players)) return live;
  return { players: [], formedGroups: [], benchedPlayers: [], lastUpdated: new Date().toISOString() };
}

async function saveState(data) {
  const saved = await liveState.writeMergedState(activeLambdaEvent, data, 'Discord');
  liveState.updateDiscordCard(saved).catch(err => {
    console.error('[Discord] Card refresh failed:', err.message);
  });
  return saved;
}

/**
 * Verify Ed25519 signature from Discord using Node's built-in crypto
 */
function verifyDiscordSignature(rawBody, signature, timestamp, clientPublicKey) {
  if (!clientPublicKey) {
    console.warn('[Discord Endpoint] DISCORD_PUBLIC_KEY is not configured in Netlify environment variables.');
    return false;
  }
  if (!signature || !timestamp) {
    return false;
  }
  try {
    const cleanKey = clientPublicKey.trim().replace(/['"]/g, '');
    const pubKey = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from('302a300506032b6570032100', 'hex'),
        Buffer.from(cleanKey, 'hex')
      ]),
      format: 'der',
      type: 'spki'
    });
    return crypto.verify(
      null,
      Buffer.concat([Buffer.from(timestamp, 'utf-8'), Buffer.from(rawBody, 'utf-8')]),
      pubKey,
      Buffer.from(signature, 'hex')
    );
  } catch (e) {
    console.error('[Discord Endpoint] Verification exception:', e.message);
    return false;
  }
}

/**
 * Raider.IO lookup helper
 */
async function lookupRaiderIo(name, realm = 'Perenolde', region = 'us', timeoutMs = 1200) {
  try {
    const cleanName = encodeURIComponent(name.trim());
    const cleanRealm = encodeURIComponent(realm.trim().toLowerCase().replace(/\s+/g, '-').replace(/'/g, ''));
    const url = `https://raider.io/api/v1/characters/profile?region=${region}&realm=${cleanRealm}&name=${cleanName}&fields=gear,mythic_plus_scores_by_season:current,mythic_plus_recent_runs,mythic_plus_best_runs`;
    // Discord gives us 3 seconds to answer; never wait long on Raider.IO.
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const data = await res.json();
    const seasonData = Array.isArray(data.mythic_plus_scores_by_season)
      ? data.mythic_plus_scores_by_season[0]
      : data.mythic_plus_scores_by_season;

    return {
      name: data.name,
      className: data.class,
      realm: data.realm,
      ilvl: Math.round(data.gear?.item_level_equipped || 0),
      io: Math.round(seasonData?.scores?.all || 0),
      avatar: data.thumbnail_url || null,
      ownedKey: '',
      keyMin: 10,
      keyMax: 12
    };
  } catch (err) {
    return null;
  }
}

// Raider.IO cannot see the keystone in someone's bags, so this only refreshes IO and item level.
async function refreshAttendeeScores(state) {
  const attendees = (state.players || []).filter(p => p.attending);
  const batch = attendees.slice(0, 10);
  let updated = 0;
  await Promise.all(batch.map(async p => {
    const data = await lookupRaiderIo(p.name, p.realm || 'Perenolde', p.region || 'us', 1200);
    if (!data) return;
    if (data.ilvl) p.ilvl = data.ilvl;
    if (data.io) p.io = data.io;
    if (data.ilvl || data.io) {
      updated++;
      touchPlayer(p);
    }
  }));
  return { attendees: attendees.length, tried: batch.length, updated };
}

function refreshScoresMessage(result) {
  const more = result.attendees > result.tried ? ` (first ${result.tried} of ${result.attendees}; refresh the rest on the website)` : '';
  return `📈 **Refreshed Raider.IO score and item level for ${result.updated} member(s)**${more}.\nKeystones can't be read from Raider.IO — type yours on the [signup page](${WEB_URL}/signup.html).`;
}

function leaderboardMessage(state, viewMode = 'auto') {
  const engine = loadModule('leaderboard-engine');
  const players = state.players || [];
  const totalRuns = players.reduce((sum, p) => sum + (Array.isArray(p.runLog) ? p.runLog.length : 0), 0);
  const demo = viewMode === 'demo' || (viewMode !== 'live' && totalRuns < 10);
  const standings = engine
    ? (demo ? engine.computeLeaderboardStandings(engine.DEMO_PLAYERS) : engine.computeLeaderboardStandings(players, state, true))
    : [];
  const embed = embeds ? embeds.createLeaderboardEmbed(standings, WEB_URL, { demo }).toJSON() : { title: 'Leaderboard' };
  const components = embeds ? embeds.createLeaderboardButtons(WEB_URL, viewMode).map(r => r.toJSON ? r.toJSON() : r) : [];
  return { embed, components };
}

exports.handler = async (event, context) => {
  activeLambdaEvent = event;
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Normalize headers (case-insensitive)
  const headers = {};
  for (const [k, v] of Object.entries(event.headers || {})) {
    headers[k.toLowerCase()] = v;
  }
  const signature = headers['x-signature-ed25519'];
  const timestamp = headers['x-signature-timestamp'];

  // Handle potential base64 encoding from Netlify / API Gateway
  let rawBody = event.body || '';
  if (event.isBase64Encoded) {
    rawBody = Buffer.from(rawBody, 'base64').toString('utf-8');
  }

  // 1. Verify Request Signature from Discord
  const isValid = verifyDiscordSignature(rawBody, signature, timestamp, DISCORD_PUBLIC_KEY);
  if (!isValid) {
    return { statusCode: 401, body: 'Invalid request signature' };
  }

  let interaction;
  try {
    interaction = JSON.parse(rawBody);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON payload' };
  }

  // 2. Discord PING Check (Type 1)
  if (interaction.type === 1) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 1 }) // PONG
    };
  }

  // 2b. Autocomplete Interaction (Type 4)
  if (interaction.type === 4) {
    let focusedOption = null;
    if (interaction.data?.options) {
      for (const opt of interaction.data.options) {
        if (opt.focused) {
          focusedOption = opt;
          break;
        }
        if (opt.options) {
          for (const subOpt of opt.options) {
            if (subOpt.focused) {
              focusedOption = subOpt;
              break;
            }
          }
        }
        if (focusedOption) break;
      }
    }

    const query = focusedOption?.value || '';
    let choices = [];

    try {
      const typed = String(query || '').trim();
      const [namePart, realmPart] = typed.split(/-(.+)/);
      const result = rosterSearch ? rosterSearch.searchGuildRoster(namePart || '', 23) : { matches: [], exact: null };
      choices = (result.matches || [])
        .filter(e => !realmPart || foldName(e.realm).startsWith(foldName(realmPart)))
        .map(entry => ({
          name: `${entry.name} — ${entry.className || 'Player'} (${entry.realm || 'Guild'})`.slice(0, 100),
          value: `${entry.name}|${entry.realm || ''}`.slice(0, 100)
        }));
      if (namePart && realmPart) {
        choices.unshift({ name: `🔎 ${namePart} on ${realmPart} — look up on Raider.IO`.slice(0, 100), value: `__lookup__:${namePart}-${realmPart}`.slice(0, 100) });
      } else if (typed && !choices.length) {
        choices.push({ name: 'Not in the guild? Type Name-Realm (e.g. Noxxicc-Korgath)', value: '__hint__' });
      }
    } catch (err) {
      console.error('[Discord Autocomplete] Error loading roster:', err);
    }

    return jsonResponse({
      type: 8, // APPLICATION_COMMAND_AUTOCOMPLETE_RESULT
      data: {
        choices: choices.slice(0, 25)
      }
    });
  }

  let state;
  try {
    state = await loadState();
  } catch (err) {
    console.error('[Discord] Could not read shared state:', err.message);
    return jsonResponse({ type: 4, data: { content: '⚠️ The roster storage did not answer. Try again in a moment.', flags: 64 } });
  }

  // 3. Slash Commands (Type 2)
  if (interaction.type === 2) {
    const { name, options } = interaction.data;

    if (name === 'mplus') {
      const subcommand = options?.[0]?.name;

      if (subcommand === 'web') {
        return jsonResponse({
          type: 4,
          data: {
            content: `🌐 **Kith & Kin Mythic+ Night Web App:**\n${WEB_URL}`
          }
        });
      }

      if (subcommand === 'roster') {
        const embed = embeds ? embeds.createRosterEmbed(state.players || [], WEB_URL, undefined, state.formedGroups || [], state.benchedPlayers || []).toJSON() : { title: 'Roster' };
        return jsonResponse({
          type: 4,
          data: { embeds: [embed] }
        });
      }

      if (subcommand === 'post-signup') {
        const embed = embeds ? embeds.createRosterEmbed(state.players || [], WEB_URL, undefined, state.formedGroups || [], state.benchedPlayers || []).toJSON() : { title: 'Roster' };
        const buttons = embeds ? embeds.createSignupButtons().map(r => r.toJSON()) : [];
        return jsonResponse({
          type: 4,
          data: {
            content: '⚡ **Mythic+ Night Sign-ups are OPEN!** Click below to register your role and preferences:',
            embeds: [embed],
            components: buttons
          }
        });
      }

      if (subcommand === 'clear') {
        if (!rollUi?.isLeader(interaction.member)) {
          return jsonResponse({
            type: 4,
            data: { content: 'Only Captains and High Council can clear groups.', flags: 64 }
          });
        }
        state.formedGroups = [];
        state.benchedPlayers = [];
        state.groupsTouchedAt = new Date().toISOString();
        await saveState(state);
        return jsonResponse({
          type: 4,
          data: {
            content: '🧹 Formed groups cleared! Roster sign-ups are preserved.'
          }
        });
      }

      if (subcommand === 'roll-key') {
        const panel = rollUi ? rollUi.rollPanel(state, interaction) : { content: 'Key rolling is unavailable right now.', components: [], flags: 64 };
        return jsonResponse({ type: 4, data: panel });
      }

      if (subcommand === 'leaderboard') {
        const subOpts = options?.[0]?.options || [];
        const viewMode = subOpts.find(o => o.name === 'view')?.value || 'auto';
        const { embed, components } = leaderboardMessage(state, viewMode);
        return jsonResponse({
          type: 4,
          data: {
            embeds: [embed],
            components
          }
        });
      }

      if (subcommand === 'sync-keys') {
        if (!(state.players || []).some(p => p.attending)) {
          return ephemeral('⚠️ Nobody is signed up yet. Use `/mplus signup` or the sign-up card first.');
        }
        const result = await refreshAttendeeScores(state);
        if (result.updated) await saveState(state);
        return jsonResponse({ type: 4, data: { content: refreshScoresMessage(result), flags: 64 } });
      }

      if (subcommand === 'form') {
        if (!rollUi?.isLeader(interaction.member)) {
          return ephemeral('Only Captains and High Council can form groups.');
        }
        const formOpts = options?.[0]?.options || [];
        const reshuffle = formOpts.find(o => o.name === 'reshuffle')?.value === true;
        const avoidDupes = formOpts.find(o => o.name === 'avoid_dupes')?.value;
        const r = formGroups(state, { reshuffle, avoidClassDupes: avoidDupes !== false });
        if (r.error) return ephemeral(`⚠️ ${r.error}`);
        await saveState(state);
        return jsonResponse({
          type: 4,
          data: cardMessage(state, reshuffle
            ? `🏰 **Rebuilt all groups** (${r.total}).`
            : `🏰 **Formed ${r.added} new group${r.added === 1 ? '' : 's'}** (${r.total} total). ${r.waiting} still waiting.`)
        });
      }

      if (subcommand === 'signup') {
        const subOpts = options[0].options || [];
        const getOpt = (n) => subOpts.find(o => o.name === n)?.value;
        const userId = (interaction.member?.user || interaction.user)?.id;
        const picked = await resolveCharacterChoice(getOpt('character'));
        if (picked.error) return ephemeral(`⚠️ ${picked.error}`);
        const claimed = claimCharacter(state, userId, picked.info);
        if (claimed.error) return ephemeral(`⚠️ ${claimed.error}`);
        const player = claimed.player;
        // Optional quick-set options still work for people who like typing everything.
        if (getOpt('role')) player.roles = String(getOpt('role')).split(',');
        if (getOpt('min_key')) player.keyMin = getOpt('min_key');
        if (getOpt('max_key')) player.keyMax = getOpt('max_key');
        if (getOpt('carry_pref')) player.carryPreference = getOpt('carry_pref');
        if (getOpt('shitter') !== undefined) player.isShitter = !!getOpt('shitter');
        await saveState(state);
        return jsonResponse({ type: 4, data: signupPanel(state, userId, player, `\n🎉 Signed up **${player.name}**.${claimed.note}`) });
      }
    }
  }

  // 4. Button Component Clicks (Type 3)
  if (interaction.type === 3) {
    const customId = interaction.data.custom_id;
    const discordUser = interaction.member?.user || interaction.user;
    const defaultName = discordUser?.global_name || discordUser?.username || 'Player';
    rememberDiscordCard(interaction, state);

    if (customId === 'roll_pick_group' || customId.startsWith('roll_exclude:') || customId.startsWith('roll_go:')) {
      if (!rollUi) {
        return jsonResponse({ type: 4, data: { content: 'Key rolling is unavailable right now.', flags: 64 } });
      }
      if (customId === 'roll_pick_group') {
        const groupIndex = parseInt(interaction.data.values?.[0], 10);
        const panel = rollUi.rollPanel(state, interaction, groupIndex);
        return jsonResponse({ type: 7, data: panel });
      }
      if (customId.startsWith('roll_exclude:')) {
        const groupIndex = parseInt(customId.split(':')[1], 10);
        rollUi.applyExclusions(state, interaction, groupIndex, interaction.data.values || []);
        await saveState(state);
        const panel = rollUi.rollPanel(state, interaction, groupIndex);
        return jsonResponse({ type: 7, data: panel });
      }
      const groupIndex = parseInt(customId.split(':')[1], 10);
      const result = rollUi.rollGroupKey(state, interaction, groupIndex);
      if (result.error) {
        return jsonResponse({ type: 4, data: { content: result.error, flags: 64 } });
      }
      await saveState(state);
      return jsonResponse({
        type: 7,
        data: {
          content: `🎲 **Group ${groupIndex + 1} rolled ${result.key}**, held by **${result.holder}**.`,
          components: []
        }
      });
    }
    let player = activeCharacter(state, discordUser?.id);

    // Leaderboard interactive buttons
    if (customId === 'btn_leaderboard_refresh' || customId.startsWith('btn_leaderboard_refresh:')) {
      const { embed, components } = leaderboardMessage(state, customId.split(':')[1] || 'auto');
      return jsonResponse({
        type: 7,
        data: {
          embeds: [embed],
          components
        }
      });
    }

    if (customId === 'btn_leaderboard_rules') {
      return jsonResponse({
        type: 4,
        data: {
          content: '### 📜 Kith & Kin Participation Scoring Code\n' +
                   '• **Attendance:** +15 pts per Mythic+ night attended\n' +
                   '• **Keys Completed:** +10 pts (+5 bonus if timed, +2 pts per level above +10)\n' +
                   '• **Role Versatility:** +5 pts for Dual Flex (Tank/DPS, etc.), +10 pts for Triple Flex (Tank/Healer/DPS)\n' +
                   '• **Born Leader (👑):** +8 pts per night volunteered to lead\n' +
                   '• **Stronk Back (🏋️):** +8 pts per night volunteered "My back is stronk"\n' +
                   '• **Carry Shepherd (🎒):** +15 pts per key run with guildies who need a carry\n\n' +
                   `View the live interactive leaderboard: <${WEB_URL}/leaderboard.html>`,
          flags: 64
        }
      });
    }

    const userId = discordUser?.id;

    // "Can't make it" — only people who click this show on the card's Can't-make-it list.
    if (customId === 'btn_absent') {
      if (!player) return ephemeral('You aren’t signed up with a character yet, so there’s nothing to cancel. 👍');
      player.attending = false;
      player.absent = true;
      player.declinedAt = new Date().toISOString();
      touchPlayer(player);
      await saveState(state);
      const slot = groupSlotOf(state, player);
      return ephemeral(`💤 **${player.name}** is marked as can’t make it tonight.${slot ? ` You’re still listed in Group ${slot.index + 1} — let an officer know so they can fill your spot.` : ''} Click **Sign Up / Edit** any time to come back.`);
    }

    // Sign Up / Edit: straight to your entry if you have one, otherwise pick a character.
    if (customId === 'btn_open_signup') {
      if (player) return jsonResponse({ type: 4, data: signupPanel(state, userId, player) });
      return jsonResponse({ type: 4, data: await addCharacterMessage(interaction) });
    }

    // Fallback search (mobile): a text box, then a list of guild matches. Never creates unknown characters.
    if (customId === 'btn_search_modal' || customId === 'btn_search_again' || customId === 'btn_custom_modal') {
      return jsonResponse({ type: 9, data: rosterSearch.characterSearchModal('') });
    }

    if (customId === 'select_character') {
      const picked = await resolveCharacterChoice(interaction.data.values?.[0]);
      if (picked.error) return ephemeral(`⚠️ ${picked.error}`);
      const claimed = claimCharacter(state, userId, picked.info);
      if (claimed.error) return ephemeral(`⚠️ ${claimed.error}`);
      await saveState(state);
      return jsonResponse({ type: 7, data: signupPanel(state, userId, claimed.player, claimed.note) });
    }

    // Switch which of your characters you're on tonight, or add another.
    if (customId === 'select_my_char') {
      const value = interaction.data.values?.[0] || '';
      if (value === '__add__') return jsonResponse({ type: 7, data: await addCharacterMessage(interaction) });
      const [name, realm] = value.split('|');
      const target = findCharacter(state, name, realm);
      if (!target || target.discordId !== userId) return ephemeral('⚠️ That character isn’t one of yours anymore. Click **Sign Up / Edit** again.');
      const note = activateCharacter(state, userId, target);
      await saveState(state);
      return jsonResponse({ type: 7, data: signupPanel(state, userId, target, `\n🔄 Switched to **${target.name}** for tonight.${note}`) });
    }

    if (customId === 'select_roles' || customId === 'select_key_range' || customId === 'select_vibes') {
      if (!player) return jsonResponse({ type: 7, data: await addCharacterMessage(interaction) });
      const values = interaction.data.values || [];
      if (customId === 'select_roles') {
        player.roles = values.length ? values : ['DPS'];
      } else if (customId === 'select_key_range') {
        const brackets = values.length ? values : ['10-12'];
        let minKey = 30;
        let maxKey = 2;
        if (brackets.includes('6-8')) { minKey = Math.min(minKey, 6); maxKey = Math.max(maxKey, 8); }
        if (brackets.includes('10-12')) { minKey = Math.min(minKey, 9); maxKey = Math.max(maxKey, 12); }
        if (brackets.includes('12+')) { minKey = Math.min(minKey, 12); maxKey = Math.max(maxKey, 18); }
        player.keyBrackets = brackets;
        player.keyMin = minKey;
        player.keyMax = maxKey;
      } else {
        player.isLeader = values.includes('vibe_leader');
        player.isReserve = values.includes('vibe_reserve');
        player.isShitter = values.includes('vibe_shitter');
        player.carryPreference = values.includes('vibe_need_carry') ? 'need_carry' : (values.includes('vibe_willing_carry') ? 'willing_carry' : 'none');
      }
      player.attending = true;
      player.absent = false;
      player.declinedAt = null;
      touchPlayer(player);
      await saveState(state);
      return jsonResponse({ type: 7, data: signupPanel(state, userId, player, '\n✔️ Saved.') });
    }

    if (customId === 'btn_set_main') {
      if (!player) return ephemeral('Pick a character first.');
      for (const c of myCharacters(state, userId)) {
        if (c.isMain && !sameChar(c, player)) { c.isMain = false; touchPlayer(c); }
      }
      player.isMain = true;
      touchPlayer(player);
      await saveState(state);
      return jsonResponse({ type: 7, data: signupPanel(state, userId, player, `\n⭐ **${player.name}** is now your main. Your alts’ keys and nights count toward it on the leaderboard.`) });
    }

    if (customId === 'btn_remove_char') {
      if (!player) return ephemeral('Nothing to remove.');
      const now = new Date().toISOString();
      const inGuild = rosterSearch && rosterSearch.findRosterEntry(player.name);
      if (removeFromGroups(state, player)) state.groupsTouchedAt = now;
      if (inGuild || player.bnetId) {
        // Guild characters stay on the roster; they're just no longer yours.
        player.discordId = null;
        player.attending = false;
        player.isMain = false;
        player.activeAt = null;
        player.touchedAt = now;
      } else {
        state.players = (state.players || []).filter(p => !sameChar(p, player));
        state.deleted = { ...(state.deleted || {}), [foldName(player.name)]: now };
      }
      await saveState(state);
      const next = activeCharacter(state, userId);
      if (next) return jsonResponse({ type: 7, data: signupPanel(state, userId, next, `\n🗑️ Removed **${player.name}**.`) });
      return jsonResponse({ type: 7, data: { content: `🗑️ Removed **${player.name}**. Click **Sign Up / Edit** to add a character again.`, components: [] } });
    }

    if (customId === 'btn_confirm_rsvp') {
      if (!player) return jsonResponse({ type: 7, data: await addCharacterMessage(interaction) });
      if (!player.attending) {
        player.attending = true;
        player.declinedAt = null;
        touchPlayer(player);
        await saveState(state);
      }
      const slot = groupSlotOf(state, player);
      return jsonResponse({
        type: 7,
        data: {
          content: `✅ **${player.name}** is signed up — ${(player.roles || []).join(' / ')}, keys +${player.keyMin}–${player.keyMax}.${slot ? ` You’re in **Group ${slot.index + 1}**.` : ' Waiting for a group.'}\nClick **Sign Up / Edit** any time to change it or switch characters.`,
          components: []
        }
      });
    }

    if (customId === 'btn_dismiss_form') {
      return jsonResponse({
        type: 7,
        data: { content: '👋 Closed sign-up form.', components: [] }
      });
    }

    if (customId === 'btn_form_groups') {
      if (!rollUi?.isLeader(interaction.member)) {
        return ephemeral('Only Captains and High Council can form groups.');
      }
      const r = formGroups(state);
      if (r.error) return ephemeral(`⚠️ ${r.error}`);
      await saveState(state);
      return jsonResponse({
        type: 7,
        data: cardMessage(state, `🏰 **Formed ${r.added} new group${r.added === 1 ? '' : 's'}** (${r.total} total). Sign-ups stay open — press Form Groups again as more people arrive.`)
      });
    }

    if (customId === 'btn_shitter') {
      if (player) {
        player.isShitter = !player.isShitter;
        touchPlayer(player);
        await saveState(state);
        return jsonResponse({
          type: 4,
          data: { content: `💩 Shitter alt squad status: **${player.isShitter ? 'Yes! (Joined Shitter Squad)' : 'Standard'}**`, flags: 64 }
        });
      }
    }

    if (customId === 'btn_roll_key') {
      const panel = rollUi ? rollUi.rollPanel(state, interaction) : { content: 'Key rolling is unavailable right now.', components: [], flags: 64 };
      return jsonResponse({ type: 4, data: panel });
    }

    // Older cards still show this button.
    if (customId === 'btn_sync_keys') {
      if (!(state.players || []).some(p => p.attending)) return ephemeral('⚠️ Nobody is signed up yet.');
      const result = await refreshAttendeeScores(state);
      if (result.updated) await saveState(state);
      return ephemeral(refreshScoresMessage(result));
    }

    if (customId === 'btn_refresh_roster') {
      const live = await liveState.readLiveState(activeLambdaEvent);
      const view = liveState.reconcileState(live || { players: [], formedGroups: [], benchedPlayers: [] });
      liveState.updateDiscordCard(view).catch(err => {
        console.error('[Discord] Card refresh failed:', err.message);
      });
      const embed = embeds ? embeds.createRosterEmbed(view.players || [], WEB_URL, undefined, view.formedGroups || [], view.benchedPlayers || []).toJSON() : { title: 'Roster' };
      const buttons = embeds ? embeds.createSignupButtons(WEB_URL).map(r => r.toJSON()) : [];
      return jsonResponse({
        type: 7, // UPDATE_MESSAGE
        data: {
          embeds: [embed],
          components: buttons
        }
      });
    }

    return jsonResponse({
      type: 4,
      data: { content: '⚠️ Click **Sign Up / Edit 📝** first to pick your character.', flags: 64 }
    });
  }

  // 5. Modal Submissions (Type 5)
  if (interaction.type === 5) {
    const customId = interaction.data.custom_id;
    const components = interaction.data.components || [];
    const getVal = (cid) => components.flatMap(c => c.components || []).find(x => x.custom_id === cid)?.value;
    const discordUser = interaction.member?.user || interaction.user;

    if (customId === 'modal_char_search') {
      const query = (getVal('char_query') || '').trim();
      const userId = discordUser?.id;
      if (query.includes('-')) {
        // Name-Realm: look it up (works for characters outside the guild too)
        const picked = await resolveCharacterChoice(query);
        if (picked.error) return ephemeral(`⚠️ ${picked.error}`);
        const claimed = claimCharacter(state, userId, picked.info);
        if (claimed.error) return ephemeral(`⚠️ ${claimed.error}`);
        await saveState(state);
        return jsonResponse({ type: 4, data: signupPanel(state, userId, claimed.player, claimed.note) });
      }
      const result = rosterSearch ? rosterSearch.searchGuildRoster(query, 25) : { matches: [], matchCount: 0 };
      if (result.matchCount === 1) {
        const e = result.matches[0];
        const claimed = claimCharacter(state, userId, { name: e.name, realm: e.realm, className: e.className, role: e.role, guildMember: true });
        if (claimed.error) return ephemeral(`⚠️ ${claimed.error}`);
        await saveState(state);
        return jsonResponse({ type: 4, data: signupPanel(state, userId, claimed.player, claimed.note) });
      }
      if (!result.matchCount) {
        return ephemeral(`No guild member matches **${query || '(blank)'}**. For a character outside the guild, search again with \`Name-Realm\` (e.g. \`Noxxicc-Korgath\`).`);
      }
      return jsonResponse({
        type: 4,
        data: {
          content: `### 🔍 ${result.matchCount} guild match${result.matchCount === 1 ? '' : 'es'} for **${query}**${result.matchCount > 25 ? ' (showing 25 — type more of the name to narrow it)' : ''}`,
          components: embeds ? embeds.createCharacterMatchComponents(result.matches) : [],
          flags: 64
        }
      });
    }

    return ephemeral('⚠️ That form has expired. Click **Sign Up / Edit 📝** again.');
  }

  return ephemeral('⚠️ Unknown action. Try the buttons on the latest sign-up card.');
};

function jsonResponse(obj) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  };
}
