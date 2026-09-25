/**
 * One shared roster for the website and the Discord interaction endpoint.
 * Reads are strongly consistent. Writes merge by player so a stale page
 * cannot wipe a newer signup.
 */

const path = require('path');
const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'mplus-state';
const STATE_KEY = 'current_state';

async function useStore(run) {
  return run(getStore(STORE_NAME));
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
  return newer;
}

function mergeStates(latest, incoming) {
  const base = latest && typeof latest === 'object' ? latest : {};
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
  const formedGroups = useNextGroups ? (next.formedGroups || []) : (base.formedGroups || next.formedGroups || []);
  const benchedPlayers = useNextGroups ? (next.benchedPlayers || []) : (base.benchedPlayers || next.benchedPlayers || []);
  const events = next.events && Object.keys(next.events).length ? next.events : (base.events || {});
  const currentEventId = next.currentEventId || base.currentEventId || null;

  const merged = {
    ...base,
    ...next,
    players: [...map.values()],
    formedGroups,
    benchedPlayers,
    excludedDungeons: Array.isArray(next.excludedDungeons) ? next.excludedDungeons : (base.excludedDungeons || []),
    events,
    currentEventId,
    groupsTouchedAt: useNextGroups ? next.groupsTouchedAt : (base.groupsTouchedAt || null),
    discordCard: next.discordCard || base.discordCard || null,
    lastUpdated: new Date().toISOString()
  };

  if (merged.currentEventId && merged.events && merged.events[merged.currentEventId]) {
    merged.events[merged.currentEventId].players = merged.players;
    merged.events[merged.currentEventId].formedGroups = merged.formedGroups;
    merged.events[merged.currentEventId].benchedPlayers = merged.benchedPlayers;
    merged.events[merged.currentEventId].lastUpdated = merged.lastUpdated;
  }

  return merged;
}

async function readLiveState() {
  const data = await useStore((store) => store.get(STATE_KEY, { type: 'json' }));
  return data && typeof data === 'object' ? data : null;
}

async function writeMergedState(event, incoming) {
  const latest = await readLiveState();
  const merged = mergeStates(latest, incoming);
  await useStore((store) => store.setJSON(STATE_KEY, merged));
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
    'MadKing',
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
  readLiveState,
  writeMergedState,
  updateDiscordCard
};
