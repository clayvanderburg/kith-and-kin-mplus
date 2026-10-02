/**
 * One shared roster for the website and the Discord interaction endpoint.
 * Reads are strongly consistent (read-your-writes). Writes merge by player so a stale page
 * cannot wipe a newer signup.
 */

const path = require('path');
const crypto = require('crypto');
// Netlify Blobs. The v2 entry files (*-v2.mjs) import it themselves and hand it over through a
// global, because the bundler can't ship a package that's only reached via require().
let normalizeSettings;
try { ({ normalizeSettings } = require('../../../bot/schedule')); } catch (err) { ({ normalizeSettings } = require(require('path').join(process.cwd(), 'bot', 'schedule'))); }

function blobsLib() {
  return globalThis.__kkNetlifyBlobs || require('@netlify/blobs');
}
const getStore = (...args) => blobsLib().getStore(...args);
const connectLambda = (...args) => blobsLib().connectLambda(...args);

const STORE_NAME = 'mplus-state';
const STATE_KEY = 'current_state';
// Written by the scheduled jobs. Kept separate so they never race officer/Discord edits.
const SCORES_KEY = 'scores';          // { [charKey]: { io, ilvl, ioColor, spec, className, at } }
const NIGHTS_KEY = 'nights';          // { [YYYY-MM-DD]: [charKey, ...] }  who showed up each Friday

async function useStore(event, run) {
  if (event?.blobs) {
    try {
      connectLambda(event);
    } catch (err) {
      console.error('[live-state] connectLambda failed:', err.message);
    }
  }
  // Strong reads need Netlify's uncached edge URL, which Lambda-compat functions don't always get.
  // Fall back to eventual consistency instead of failing the whole request.
  try {
    return await run(getStore(STORE_NAME, { consistency: 'strong' }));
  } catch (err) {
    if (!/consisten|uncachedEdgeURL/i.test(err?.message || '')) throw err;
    console.warn('[live-state] strong consistency unavailable, using eventual:', err.message);
    return run(getStore(STORE_NAME, { consistency: 'eventual' }));
  }
}

function timeOf(value) {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function playerKey(player) {
  return String(player?.name || '').trim().toLowerCase();
}

function mergePlayer(prev, next) {
  if (!prev) return next;
  if (!next) return prev;
  const prevTime = timeOf(prev.touchedAt);
  const nextTime = timeOf(next.touchedAt);
  // The copy edited most recently wins. On a tie the stored copy wins, so a stale
  // copy that nobody edited can never overwrite a real change.
  const newer = nextTime > prevTime ? { ...prev, ...next } : { ...next, ...prev };
  if (prev.discordId && !newer.discordId) newer.discordId = prev.discordId;
  const prevLog = Array.isArray(prev.runLog) ? prev.runLog : [];
  const nextLog = Array.isArray(next.runLog) ? next.runLog : [];
  if (prevLog.length > 0 || nextLog.length > 0) {
    const runMap = new Map();
    [...prevLog, ...nextLog].forEach(r => {
      if (r) {
        const id = r.id || `${r.at || ''}-${r.key || ''}`;
        runMap.set(id, { ...(runMap.get(id) || {}), ...r });
      }
    });
    newer.runLog = Array.from(runMap.values())
      .sort((a, b) => timeOf(b.at) - timeOf(a.at))
      .slice(0, 100);
  }
  return newer;
}

function hasGroups(list) {
  return Array.isArray(list) && list.length > 0;
}

function rosterScore(players, groups, stamp) {
  let score = timeOf(stamp);
  for (const player of players || []) score = Math.max(score, timeOf(player?.touchedAt));
  if (hasGroups(groups) && score === 0) score = 1;
  return score;
}

function markGroupedPlayersAttending(players, groups) {
  const names = new Set();
  for (const group of groups || []) {
    for (const member of [group?.tank, group?.healer, ...(group?.dps || [])]) {
      if (member?.name) names.add(playerKey(member));
    }
  }
  return (players || []).map(player => {
    // An officer (or the player) explicitly marked them absent: respect it even if still grouped.
    if (!names.has(playerKey(player)) || player.absent === true) return player;
    return { ...player, attending: true, absent: false };
  });
}

// There is one weekly night now. Old "event lineup" copies of the roster (state.events) are
// ignored and dropped on the next save; the top-level roster is the only one.
function reconcileState(state) {
  if (!state || typeof state !== 'object') return state;
  state.players = markGroupedPlayersAttending(state.players || [], state.formedGroups || []);
  delete state.events;
  delete state.currentEventId;
  delete state.deletedEvents;
  return state;
}

function mergeStates(latest, incoming) {
  const base = reconcileState(latest && typeof latest === 'object' ? latest : {});
  const next = incoming && typeof incoming === 'object' ? incoming : {};
  const map = new Map();

  for (const player of base.players || []) {
    if (player?.name) map.set(playerKey(player), player);
  }
  for (const player of next.players || []) {
    if (!player?.name) continue;
    const key = playerKey(player);
    map.set(key, mergePlayer(map.get(key), player));
  }

  const ownerIds = new Set((next.players || []).map(player => player.bnetId).filter(Boolean));
  for (const name of next.removedNames || []) {
    const previous = map.get(playerKey({ name }));
    if (previous && ownerIds.has(previous.bnetId)) map.delete(playerKey({ name }));
  }

  const nextGroupsTime = timeOf(next.groupsTouchedAt);
  const baseGroupsTime = timeOf(base.groupsTouchedAt);
  // Groups are replaced only by a newer group edit. Equal stamps mean "unchanged copy".
  const useNextGroups = Boolean(next.groupsTouchedAt) && nextGroupsTime > baseGroupsTime;
  const formedGroups = useNextGroups
    ? (next.formedGroups || [])
    : (hasGroups(base.formedGroups) ? base.formedGroups : (hasGroups(next.formedGroups) ? next.formedGroups : (base.formedGroups || [])));
  const benchedPlayers = useNextGroups
    ? (next.benchedPlayers || [])
    : (Array.isArray(base.benchedPlayers) && base.benchedPlayers.length ? base.benchedPlayers : (next.benchedPlayers || base.benchedPlayers || []));
  const eventSettings = next.eventSettings ? normalizeSettings(next.eventSettings) : (base.eventSettings || null);

  const merged = {
    ...base,
    ...next,
    players: markGroupedPlayersAttending([...map.values()], formedGroups),
    formedGroups,
    benchedPlayers,
    excludedDungeons: Array.isArray(next.excludedDungeons) ? next.excludedDungeons : (base.excludedDungeons || []),
    eventSettings,
    accessSettings: next.accessSettings || base.accessSettings || null,
    groupsTouchedAt: useNextGroups ? next.groupsTouchedAt : (base.groupsTouchedAt || null),
    discordCard: next.discordCard || base.discordCard || null,
    deleted: mergeTombstones(base.deleted, next.deleted),
    lastChange: next.lastChange || base.lastChange || null,
    lastUpdated: new Date().toISOString()
  };
  delete merged.events;
  delete merged.currentEventId;
  delete merged.deletedEvents;
  merged.players = applyTombstones(merged.players, merged.deleted);
  // A deleted character is gone everywhere: parties, bench and every event's lineup.
  const deletedNames = new Set(Object.keys(merged.deleted || {}).filter(k => !merged.players.some(p => playerKey(p) === k)));
  if (deletedNames.size) {
    stripFromGroups(merged, deletedNames);
    // ...and from the "who was in this key" lists on everyone's run history.
    merged.players = merged.players.map(p => {
      if (!Array.isArray(p.runLog) || !p.runLog.some(r => (r?.members || []).some(n => deletedNames.has(String(n).trim().toLowerCase())))) return p;
      return { ...p, runLog: p.runLog.map(r => (Array.isArray(r?.members) ? { ...r, members: r.members.filter(n => !deletedNames.has(String(n).trim().toLowerCase())) } : r)) };
    });
  }

  // One rule for every path (Control Center, Discord, website): someone marked out for tonight
  // is never left sitting in a party or on the bench.
  const outNames = new Set(merged.players.filter(p => p.absent === true).map(playerKey));
  if (outNames.size) stripFromGroups(merged, outNames);

  return reconcileState(merged);
}

// Deleted players: { [lowercase name]: ISO time }. A player edited after the delete comes back.
function mergeTombstones(a, b) {
  const out = { ...(a || {}) };
  for (const [key, when] of Object.entries(b || {})) {
    if (timeOf(when) > timeOf(out[key])) out[key] = when;
  }
  // Forget tombstones older than 60 days.
  const cutoff = Date.now() - 60 * 24 * 3600e3;
  for (const [key, when] of Object.entries(out)) if (timeOf(when) < cutoff) delete out[key];
  return out;
}

/** Take these names (lowercase) out of every party and the bench. Returns true if anything changed. */
function stripFromGroups(holder, names) {
  if (!holder || !names || !names.size) return false;
  let changed = false;
  const gone = m => m && names.has(playerKey(m));
  for (const g of holder.formedGroups || []) {
    if (!g) continue;
    if (gone(g.tank)) { g.tank = null; changed = true; }
    if (gone(g.healer)) { g.healer = null; changed = true; }
    const dps = (g.dps || []).filter(m => m && !gone(m));
    if (dps.length !== (g.dps || []).length) { g.dps = dps; changed = true; }
  }
  const bench = (holder.benchedPlayers || []).filter(m => !gone(m));
  if (bench.length !== (holder.benchedPlayers || []).length) { holder.benchedPlayers = bench; changed = true; }
  return changed;
}

function applyTombstones(players, deleted) {
  if (!deleted || !Object.keys(deleted).length) return players || [];
  return (players || []).filter(p => {
    const when = deleted[playerKey(p)];
    return !when || timeOf(p.touchedAt) > timeOf(when);
  });
}

function mergeEventMaps(baseEvents, nextEvents) {
  const events = { ...(baseEvents || {}) };
  if (!nextEvents || !Object.keys(nextEvents).length) return events;
  for (const [id, incoming] of Object.entries(nextEvents)) {
    if (!incoming) continue;
    const existing = events[id];
    if (!existing) {
      events[id] = incoming;
      continue;
    }
    if (rosterScore(incoming.players, incoming.formedGroups, incoming.groupsTouchedAt || incoming.rosterUpdatedAt)
      < rosterScore(existing.players, existing.formedGroups, existing.groupsTouchedAt || existing.rosterUpdatedAt)) {
      continue;
    }
    const keptGroups = hasGroups(existing.formedGroups) && !hasGroups(incoming.formedGroups) && !incoming.groupsTouchedAt;
    events[id] = { ...existing, ...incoming };
    if (keptGroups) {
      events[id].formedGroups = existing.formedGroups;
      events[id].benchedPlayers = existing.benchedPlayers;
      events[id].groupsTouchedAt = existing.groupsTouchedAt;
    }
  }
  return events;
}

function foldName(value) {
  return String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

function realmSlug(realm) {
  return String(realm || 'Perenolde').trim().toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function charKey(name, realm) {
  return `${foldName(name)}|${realmSlug(realm)}`;
}

function hashId(value) {
  const salt = process.env.SESSION_SECRET || process.env.SYNC_SECRET || 'kk';
  return 'p_' + crypto.createHmac('sha256', salt).update(String(value)).digest('hex').slice(0, 12);
}

/**
 * Tie characters to one person. Links come from:
 *  - the same Battle.net account (bnetId, and every character on that account from the login),
 *  - the same Discord account (discordId).
 * Every player gets `personId` (a hash, safe to show publicly) and `charKey`.
 */
function assignPeople(state) {
  const players = state.players || [];
  const parent = new Map();
  const find = (x) => {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)));
      x = parent.get(x);
    }
    return x;
  };
  const add = (x) => { if (!parent.has(x)) parent.set(x, x); return x; };
  const union = (a, b) => { const ra = find(add(a)); const rb = find(add(b)); if (ra !== rb) parent.set(rb, ra); };

  for (const player of players) {
    if (!player?.name) continue;
    const ck = 'c:' + charKey(player.name, player.realm);
    add(ck);
    if (player.bnetId) union('b:' + player.bnetId, ck);
    if (player.discordId) union('d:' + player.discordId, ck);
    if (player.bnetId && Array.isArray(player.accountChars)) {
      for (const alt of player.accountChars) {
        if (alt?.name) union('b:' + player.bnetId, 'c:' + charKey(alt.name, alt.realm));
      }
    }
  }
  for (const player of players) {
    if (!player?.name) continue;
    player.charKey = charKey(player.name, player.realm);
    const root = find('c:' + player.charKey);
    player.personId = hashId(root);
  }
  return state;
}

const CLASS_ROLES = {
  'Death Knight': ['Tank', 'DPS'], 'Demon Hunter': ['Tank', 'DPS'], Druid: ['Tank', 'Healer', 'DPS'],
  Evoker: ['Healer', 'DPS'], Hunter: ['DPS'], Mage: ['DPS'], Monk: ['Tank', 'Healer', 'DPS'],
  Paladin: ['Tank', 'Healer', 'DPS'], Priest: ['Healer', 'DPS'], Rogue: ['DPS'], Shaman: ['Healer', 'DPS'],
  Warlock: ['DPS'], Warrior: ['Tank', 'DPS']
};

/** Nobody has ever picked roles for this entry (not via Discord, website or the Control Center). */
function rolesUntouched(player) {
  return !player.rolesChosenAt && !player.discordId && !player.bnetId && !player.activeAt;
}

function applyScores(state, scores) {
  if (!scores || typeof scores !== 'object') return state;
  for (const player of state.players || []) {
    const hit = scores[charKey(player.name, player.realm)];
    if (!hit) continue;
    if (hit.io || !player.io) player.io = hit.io || 0;
    if (hit.ilvl) player.ilvl = hit.ilvl;
    if (hit.ioColor) player.ioColor = hit.ioColor;
    if (hit.spec) player.spec = hit.spec;
    if (hit.roleScores) player.roleScores = hit.roleScores;
    if (hit.role) player.activeRole = hit.role;
    player.scoreAt = hit.at || null;
    // Default roles = the roles they've actually run keys in this season (until someone picks roles).
    if (rolesUntouched(player)) {
      const tip = suggestSignup(hit);
      const allowed = CLASS_ROLES[player.className] || ['Tank', 'Healer', 'DPS'];
      const roles = (tip?.roles || []).filter(r => allowed.includes(r));
      if (roles.length) player.roles = roles;
    }
  }
  return state;
}

/**
 * Sensible defaults so people don't have to fill in roles/keys: roles they have real M+ score on
 * (Raider.IO per-role score) and a key range that fits their overall score. Returns null when
 * there's nothing to go on. Only used until the player picks roles/keys themselves.
 */
function suggestSignup(hit) {
  if (!hit || typeof hit !== 'object') return null;
  const scores = hit.roleScores || {};
  const top = Math.max(scores.tank || 0, scores.healer || 0, scores.dps || 0);
  let roles = [];
  if (top > 0) {
    // A role counts if they've done a key in it this season (any Raider.IO score for that role).
    roles = [['Tank', scores.tank], ['Healer', scores.healer], ['DPS', scores.dps]]
      .filter(([, score]) => (score || 0) > 0)
      .map(([role]) => role);
  }
  if (!roles.length) {
    const active = String(hit.role || hit.activeRole || '').toUpperCase();
    if (active === 'TANK') roles = ['Tank'];
    else if (active === 'HEALING' || active === 'HEALER') roles = ['Healer'];
    else if (active === 'DPS') roles = ['DPS'];
  }
  const io = Number(hit.io || 0);
  let keyBrackets = null;
  if (io > 0) keyBrackets = io < 1500 ? ['6-8'] : (io < 2500 ? ['10-12'] : ['10-12', '12+']);
  if (!roles.length && !keyBrackets) return null;
  return { roles: roles.length ? roles : null, keyBrackets };
}

function bracketRange(brackets) {
  let keyMin = 30;
  let keyMax = 2;
  if (brackets.includes('6-8')) { keyMin = Math.min(keyMin, 6); keyMax = Math.max(keyMax, 8); }
  if (brackets.includes('10-12')) { keyMin = Math.min(keyMin, 9); keyMax = Math.max(keyMax, 12); }
  if (brackets.includes('12+')) { keyMin = Math.min(keyMin, 12); keyMax = Math.max(keyMax, 18); }
  if (keyMin > keyMax) return { keyMin: 9, keyMax: 12 };
  return { keyMin, keyMax };
}

/** Fill roles/keys from Raider.IO for a player who never chose them. Returns true if anything changed. */
function applySuggestion(player) {
  const tip = suggestSignup({ ...player, role: player.activeRole });
  if (!tip) return false;
  let changed = false;
  if (tip.roles && !player.rolesChosenAt) { player.roles = tip.roles; changed = true; }
  if (tip.keyBrackets && !player.keysChosenAt) {
    player.keyBrackets = tip.keyBrackets;
    Object.assign(player, bracketRange(tip.keyBrackets));
    changed = true;
  }
  return changed;
}

async function readBlob(event, key) {
  try {
    return await useStore(event, (store) => store.get(key, { type: 'json' }));
  } catch (err) {
    console.warn(`[live-state] could not read ${key}:`, err.message);
    return null;
  }
}

async function writeBlob(event, key, value) {
  return useStore(event, (store) => store.setJSON(key, value));
}

async function readLiveState(event, { overlays = true } = {}) {
  // Read the roster and both overlays at the same time (one round trip instead of two).
  const [data, scores, nights] = await Promise.all([
    useStore(event, (store) => store.get(STATE_KEY, { type: 'json' })),
    overlays ? readBlob(event, SCORES_KEY) : null,
    overlays ? readBlob(event, NIGHTS_KEY) : null
  ]);
  if (!data || typeof data !== 'object') return null;
  const state = reconcileState(data);
  if (overlays) {
    applyScores(state, scores);
    state.nights = nights && typeof nights === 'object' ? nights : {};
    let latestScore = '';
    for (const v of Object.values(scores || {})) if (v && v.at > latestScore) latestScore = v.at;
    // Changes whenever the roster, groups, scores or attendance change. Pages poll with ?since=<version>.
    const shows = Object.values(state.nights).reduce((n, list) => n + (Array.isArray(list) ? list.length : 0), 0);
    state.version = `${state.lastUpdated || ''}|${latestScore}|${Object.keys(state.nights).length}.${shows}`;
  }
  return assignPeople(state);
}

async function writeMergedState(event, incoming, source = null) {
  const latest = await readLiveState(event);
  if (!latest && incoming && !incoming.players && !incoming.formedGroups) {
    return null;
  }
  if (source && incoming && typeof incoming === 'object') {
    incoming = { ...incoming, lastChange: { by: source, at: new Date().toISOString() } };
  }
  const merged = mergeStates(latest, incoming);
  const rosterChange = Boolean(
    incoming && (incoming.players || incoming.formedGroups || incoming.events || incoming.groupsTouchedAt ||
      incoming.deleted || incoming.eventSettings || incoming.accessSettings || incoming.excludedDungeons)
  );
  if (!rosterChange && latest?.lastUpdated) merged.lastUpdated = latest.lastUpdated;
  // Overlays and computed ids live elsewhere; don't copy them into the main document.
  const toSave = { ...merged, players: (merged.players || []).map(({ personId, charKey: ck, ...rest }) => rest) };
  delete toSave.nights;
  delete toSave.version;
  await useStore(event, (store) => store.setJSON(STATE_KEY, toSave));
  merged.nights = latest?.nights || {};
  return assignPeople(merged);
}

function loadEmbeds() {
  const candidates = [
    path.join(__dirname, '..', '..', '..', 'bot', 'embeds.js'),
    path.join(process.cwd(), 'bot', 'embeds.js')
  ];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (err) {
      // try the next path
    }
  }
  return null;
}

function cardPayload(state) {
  const embeds = loadEmbeds();
  if (!embeds) return null;

  const webUrl = process.env.WEB_URL || 'https://knkmplus.netlify.app';
  const embed = embeds.createRosterEmbed(
    state.players || [],
    webUrl,
    undefined,
    state.formedGroups || [],
    state.benchedPlayers || [],
    state.eventSettings
  ).toJSON();
  const components = embeds.createSignupButtons(webUrl).map(row => row.toJSON());
  const attending = (state.players || []).filter(player => player.attending === true).length;
  const groupCount = (state.formedGroups || []).length;

  return {
    content: groupCount
      ? `🏰 **${groupCount} ${groupCount === 1 ? 'party' : 'parties'} formed** · ${attending} heroes answered the call. Don’t stand in bad.`
      : `⚔️ **Sign-ups are open.** ${attending} ${attending === 1 ? 'hero has' : 'heroes have'} answered the call. Everyone else is AFK in Silvermoon.`,
    embeds: [embed],
    components,
    allowed_mentions: { parse: [] }
  };
}

async function updateDiscordCard(state) {
  const token = process.env.DISCORD_TOKEN;
  const card = state?.discordCard;
  if (!token || !card?.channelId || !card?.messageId) {
    return { updated: false };
  }
  const payload = cardPayload(state);
  if (!payload) return { updated: false };

  const res = await fetch(`https://discord.com/api/v10/channels/${card.channelId}/messages/${card.messageId}`, {
    signal: AbortSignal.timeout(2500),
    method: 'PATCH',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[live-state] Discord card update failed', res.status, body.slice(0, 300));
    return { updated: false, status: res.status };
  }
  return { updated: true };
}

/**
 * Post a brand-new sign-up card in the same channel as the current one (used by the weekly reset
 * when AUTO_POST_CARD=on). Returns the new { channelId, messageId } or null.
 */
async function postNewDiscordCard(state) {
  const token = process.env.DISCORD_TOKEN;
  const channelId = state?.discordCard?.channelId;
  const payload = cardPayload(state);
  if (!token || !channelId || !payload) return null;
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    signal: AbortSignal.timeout(4000),
    method: 'POST',
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    console.error('[live-state] posting new Discord card failed', res.status, (await res.text()).slice(0, 300));
    return null;
  }
  const message = await res.json();
  return { channelId, messageId: message.id, applicationId: state.discordCard.applicationId || null };
}

/**
 * Update the Discord card and WAIT for it (capped). Netlify/Lambda freezes the function as soon as
 * the handler returns, so a fire-and-forget fetch usually never reaches Discord.
 */
async function refreshDiscordCard(state, maxMs = 2500, tag = 'live-state') {
  let timer;
  try {
    return await Promise.race([
      updateDiscordCard(state),
      new Promise(resolve => { timer = setTimeout(() => resolve({ updated: false, timedOut: true }), maxMs); })
    ]);
  } catch (err) {
    console.error(`[${tag}] Discord card refresh failed:`, err.message);
    return { updated: false, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Update the Discord card without making the person wait. On Netlify v2 functions,
 * context.waitUntil lets the update finish after the reply is sent (docs: Functions API,
 * "context.waitUntil"). Without it, fall back to a short capped wait.
 * `stateOrLoader` is a saved state, or an async function that reads one.
 */
function refreshCardSoon(context, stateOrLoader, tag = 'live-state', fallbackMs = 2500) {
  const run = async () => {
    const state = typeof stateOrLoader === 'function' ? await stateOrLoader() : stateOrLoader;
    if (state) return refreshDiscordCard(state, 8000, tag);
    return null;
  };
  if (context && typeof context.waitUntil === 'function') {
    context.waitUntil(run().catch(err => console.error(`[${tag}] card refresh failed:`, err.message)));
    return Promise.resolve({ deferred: true });
  }
  if (typeof stateOrLoader === 'function') return Promise.resolve({ skipped: true });
  return refreshDiscordCard(stateOrLoader, fallbackMs, tag);
}

module.exports = {
  refreshCardSoon,
  stripFromGroups,
  refreshDiscordCard,
  postNewDiscordCard,
  suggestSignup,
  applySuggestion,
  bracketRange,
  STORE_NAME,
  SCORES_KEY,
  NIGHTS_KEY,
  charKey,
  realmSlug,
  foldName,
  assignPeople,
  applyScores,
  readBlob,
  writeBlob,
  mergeStates,
  reconcileState,
  readLiveState,
  writeMergedState,
  updateDiscordCard
};
