/**
 * One shared roster for the website and the Discord interaction endpoint.
 * Reads are strongly consistent (read-your-writes). Writes merge by player so a stale page
 * cannot wipe a newer signup.
 */

const path = require('path');
const crypto = require('crypto');
const { getStore, connectLambda } = require('@netlify/blobs');

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

function reconcileState(state) {
  if (!state || typeof state !== 'object') return state;
  const event = state.currentEventId && state.events ? state.events[state.currentEventId] : null;
  if (!event) return state;

  const topScore = rosterScore(state.players, state.formedGroups, state.groupsTouchedAt);
  const eventScore = rosterScore(event.players, event.formedGroups, event.groupsTouchedAt || event.rosterUpdatedAt);
  const useEvent = eventScore > topScore || (eventScore === topScore && hasGroups(event.formedGroups) && !hasGroups(state.formedGroups));

  if (useEvent) {
    state.players = markGroupedPlayersAttending(applyTombstones(event.players || state.players || [], state.deleted), event.formedGroups || []);
    state.formedGroups = event.formedGroups || [];
    state.benchedPlayers = event.benchedPlayers || [];
    if (event.groupsTouchedAt) state.groupsTouchedAt = event.groupsTouchedAt;
  } else {
    state.players = markGroupedPlayersAttending(state.players || [], state.formedGroups || []);
    event.players = state.players;
    event.formedGroups = state.formedGroups || [];
    event.benchedPlayers = state.benchedPlayers || [];
    if (state.groupsTouchedAt) event.groupsTouchedAt = state.groupsTouchedAt;
  }
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
  const events = mergeEventMaps(base.events, next.events);
  const currentEventId = next.currentEventId || base.currentEventId || null;

  const merged = {
    ...base,
    ...next,
    players: markGroupedPlayersAttending([...map.values()], formedGroups),
    formedGroups,
    benchedPlayers,
    excludedDungeons: Array.isArray(next.excludedDungeons) ? next.excludedDungeons : (base.excludedDungeons || []),
    events,
    currentEventId,
    groupsTouchedAt: useNextGroups ? next.groupsTouchedAt : (base.groupsTouchedAt || null),
    discordCard: next.discordCard || base.discordCard || null,
    deleted: mergeTombstones(base.deleted, next.deleted),
    lastChange: next.lastChange || base.lastChange || null,
    lastUpdated: new Date().toISOString()
  };
  merged.players = applyTombstones(merged.players, merged.deleted);

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

function applyScores(state, scores) {
  if (!scores || typeof scores !== 'object') return state;
  for (const player of state.players || []) {
    const hit = scores[charKey(player.name, player.realm)];
    if (!hit) continue;
    if (hit.io || !player.io) player.io = hit.io || 0;
    if (hit.ilvl) player.ilvl = hit.ilvl;
    if (hit.ioColor) player.ioColor = hit.ioColor;
    if (hit.spec) player.spec = hit.spec;
    player.scoreAt = hit.at || null;
  }
  return state;
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
  const data = await useStore(event, (store) => store.get(STATE_KEY, { type: 'json' }));
  if (!data || typeof data !== 'object') return null;
  const state = reconcileState(data);
  if (overlays) {
    const [scores, nights] = await Promise.all([readBlob(event, SCORES_KEY), readBlob(event, NIGHTS_KEY)]);
    applyScores(state, scores);
    state.nights = nights && typeof nights === 'object' ? nights : {};
    let latestScore = '';
    for (const v of Object.values(scores || {})) if (v && v.at > latestScore) latestScore = v.at;
    // Changes whenever the roster, groups, scores or attendance change. Pages poll with ?since=<version>.
    state.version = `${state.lastUpdated || ''}|${latestScore}|${Object.keys(state.nights).length}`;
  }
  return assignPeople(state);
}

async function writeMergedState(event, incoming, source = null) {
  const latest = await readLiveState(event);
  if (!latest && incoming && !incoming.players && !incoming.formedGroups && !incoming.events) {
    return null;
  }
  if (source && incoming && typeof incoming === 'object') {
    incoming = { ...incoming, lastChange: { by: source, at: new Date().toISOString() } };
  }
  const merged = mergeStates(latest, incoming);
  const rosterChange = Boolean(
    incoming && (incoming.players || incoming.formedGroups || incoming.events || incoming.groupsTouchedAt ||
      incoming.deleted || incoming.excludedDungeons || incoming.currentEventId)
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

async function updateDiscordCard(state) {
  const token = process.env.DISCORD_TOKEN;
  const card = state?.discordCard;
  if (!token || !card?.channelId || !card?.messageId) {
    return { updated: false };
  }

  const embeds = loadEmbeds();
  if (!embeds) return { updated: false };

  const webUrl = process.env.WEB_URL || 'https://knkmplus.netlify.app';
  const embed = embeds.createRosterEmbed(
    state.players || [],
    webUrl,
    undefined,
    state.formedGroups || [],
    state.benchedPlayers || []
  ).toJSON();
  const components = embeds.createSignupButtons(webUrl).map(row => row.toJSON());
  const attending = (state.players || []).filter(player => player.attending === true).length;
  const groupCount = (state.formedGroups || []).length;

  const res = await fetch(`https://discord.com/api/v10/channels/${card.channelId}/messages/${card.messageId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: groupCount
        ? `🏰 **${groupCount} Mythic+ group(s) formed.** ${attending} attending. The website and this card stay in sync.`
        : `⚡ **Mythic+ Night sign-ups are open.** ${attending} attending. This card updates when the website or Discord changes.`,
      embeds: [embed],
      components
    })
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[live-state] Discord card update failed', res.status, body.slice(0, 300));
    return { updated: false, status: res.status };
  }
  return { updated: true };
}

module.exports = {
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
