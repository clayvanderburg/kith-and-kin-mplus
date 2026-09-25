/**
 * One shared roster for the website and the Discord interaction endpoint.
 * Reads are strongly consistent. Writes merge by player so a stale page
 * cannot wipe a newer signup.
 */

const path = require('path');
const { getStore, connectLambda } = require('@netlify/blobs');

const STORE_NAME = 'mplus-state';
const STATE_KEY = 'current_state';

async function useStore(event, run) {
  if (event?.blobs) {
    try {
      connectLambda(event);
    } catch (err) {
      console.error('[live-state] connectLambda failed:', err.message);
    }
  }
  return run(getStore(STORE_NAME, { consistency: 'eventual' }));
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
  const newer = nextTime >= prevTime ? { ...prev, ...next } : { ...next, ...prev };
  if (prev.discordId && !newer.discordId) newer.discordId = prev.discordId;
  if (next.discordId && nextTime >= prevTime) newer.discordId = next.discordId;
  if (prev.attending === true && next.attending !== true && nextTime <= prevTime) {
    newer.attending = true;
    newer.absent = false;
  }
  if (next.attending === true && nextTime >= prevTime) {
    newer.attending = true;
    newer.absent = false;
  }
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
    if (!names.has(playerKey(player))) return player;
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
    state.players = markGroupedPlayersAttending(event.players || state.players || [], event.formedGroups || []);
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
  const useNextGroups = Boolean(next.groupsTouchedAt) && nextGroupsTime >= baseGroupsTime;
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
    lastUpdated: new Date().toISOString()
  };

  return reconcileState(merged);
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

async function readLiveState(event) {
  const data = await useStore(event, (store) => store.get(STATE_KEY, { type: 'json' }));
  return data && typeof data === 'object' ? reconcileState(data) : null;
}

async function writeMergedState(event, incoming) {
  const latest = await readLiveState(event);
  if (!latest && incoming && !incoming.players && !incoming.formedGroups && !incoming.events) {
    return null;
  }
  const merged = mergeStates(latest, incoming);
  const rosterChange = Boolean(
    incoming && (incoming.players || incoming.formedGroups || incoming.events || incoming.groupsTouchedAt)
  );
  if (!rosterChange && latest?.lastUpdated) merged.lastUpdated = latest.lastUpdated;
  await useStore(event, (store) => store.setJSON(STATE_KEY, merged));
  return merged;
}

function loadEmbeds() {
  const candidates = [
    path.join(__dirname, '..', '..', 'bot', 'embeds.js'),
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
  mergeStates,
  reconcileState,
  readLiveState,
  writeMergedState,
  updateDiscordCard
};
