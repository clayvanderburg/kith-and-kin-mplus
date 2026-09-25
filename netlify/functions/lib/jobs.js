/**
 * Background jobs that fill in data so players don't have to:
 *  - refreshScores: Raider.IO score + item level for the whole guild, a slice at a time.
 *  - syncNight: on Friday night, pulls attendees' (and their alts') finished keys from Raider.IO,
 *    logs them on each character, and records who actually showed up.
 */
const live = require('./live-state');
const rio = require('./rio');

let guildRoster = [];
try { guildRoster = require('../../../bot/guild-roster.json'); } catch (err) { guildRoster = []; }

const EVENT_TIME_ZONE = process.env.EVENT_TIME_ZONE || 'America/New_York';
const EVENT_HOUR = Number(process.env.EVENT_HOUR || 20);

function zonedParts(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short'
  }).formatToParts(date).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return {
    year: +parts.year, month: +parts.month, day: +parts.day, hour: +parts.hour, minute: +parts.minute, second: +parts.second,
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday)
  };
}

function zonedToUtc(year, month, day, hour) {
  const guess = Date.UTC(year, month - 1, day, hour);
  const p = zonedParts(new Date(guess));
  return guess - (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - guess);
}

/**
 * The Friday night that `now` belongs to: from 2 hours before kickoff until 9 hours after.
 * Returns { start, end, kickoff, dateKey } or null when it's not M+ night.
 * With `latest: true`, returns the most recent Friday night even if it's over (for manual pulls).
 */
function nightWindow(now = new Date(), { latest = false } = {}) {
  const today = zonedParts(now);
  const daysSinceFriday = (today.weekday - 5 + 7) % 7;
  for (const back of [daysSinceFriday, daysSinceFriday + 7]) {
    const kickoff = zonedToUtc(today.year, today.month, today.day - back, EVENT_HOUR);
    const start = kickoff - 2 * 3600e3;
    const end = kickoff + 9 * 3600e3;
    const t = now.getTime();
    if ((t >= start && t <= end) || (latest && t > end)) {
      const k = zonedParts(new Date(kickoff));
      const dateKey = `${k.year}-${String(k.month).padStart(2, '0')}-${String(k.day).padStart(2, '0')}`;
      return { start, end, kickoff, dateKey };
    }
  }
  return null;
}

function allCharacters(state) {
  const map = new Map();
  for (const entry of guildRoster) {
    if (entry?.name) map.set(live.charKey(entry.name, entry.realm), { name: entry.name, realm: entry.realm || 'Perenolde', region: 'us' });
  }
  for (const player of state?.players || []) {
    if (player?.name) map.set(live.charKey(player.name, player.realm), { name: player.name, realm: player.realm || 'Perenolde', region: player.region || 'us' });
  }
  return map;
}

function scoreFrom(profile) {
  return {
    io: profile.io,
    ilvl: profile.ilvl,
    ioColor: profile.ioColor,
    spec: profile.spec,
    className: profile.className,
    at: new Date().toISOString()
  };
}

/**
 * Refresh a slice of the guild. Attending players first, then whoever was refreshed longest ago.
 * `budgetMs` keeps us inside the function time limit.
 */
async function refreshScores(event, { budgetMs = 20000, max = 160, onlyAttending = false } = {}) {
  const deadline = Date.now() + budgetMs;
  const state = await live.readLiveState(event, { overlays: false }) || { players: [] };
  const scores = (await live.readBlob(event, live.SCORES_KEY)) || {};
  const chars = allCharacters(state);
  const attending = new Set((state.players || []).filter(p => p.attending).map(p => live.charKey(p.name, p.realm)));
  let keys = [...chars.keys()];
  if (onlyAttending) keys = keys.filter(k => attending.has(k));
  keys.sort((a, b) => {
    const pa = attending.has(a) ? 0 : 1;
    const pb = attending.has(b) ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return (Date.parse(scores[a]?.at || '') || 0) - (Date.parse(scores[b]?.at || '') || 0);
  });
  keys = keys.slice(0, max);

  let updated = 0;
  let missing = 0;
  await rio.pool(keys, 8, deadline, async (key) => {
    const c = chars.get(key);
    const profile = await rio.fetchProfile(c.name, c.realm, c.region, 3000);
    if (profile.ok) {
      scores[key] = scoreFrom(profile);
      updated++;
    } else if (profile.status === 400 || profile.status === 404) {
      // Not on Raider.IO (inactive/renamed). Remember we tried so it goes to the back of the line.
      scores[key] = { ...(scores[key] || {}), io: scores[key]?.io || 0, at: new Date().toISOString(), missing: true };
      missing++;
    }
  });
  await live.writeBlob(event, live.SCORES_KEY, scores);
  return { checked: updated + missing, updated, missing, total: chars.size };
}

function keyText(run) {
  return `${run.dungeon} +${run.level}`;
}

/**
 * Pull tonight's finished keys for everyone who is attending or grouped, plus their alts.
 */
async function syncNight(event, { now = new Date(), force = false, budgetMs = 20000 } = {}) {
  const window = nightWindow(now, { latest: force });
  if (!window) return { skipped: 'not M+ night' };
  const deadline = Date.now() + budgetMs;

  const state = await live.readLiveState(event);
  if (!state) return { skipped: 'no roster' };
  const players = state.players || [];
  const byChar = new Map(players.map(p => [p.charKey, p]));

  const grouped = new Set();
  for (const group of state.formedGroups || []) {
    for (const m of [group?.tank, group?.healer, ...(group?.dps || [])]) {
      if (m?.name) {
        const hit = players.find(p => live.foldName(p.name) === live.foldName(m.name));
        if (hit) grouped.add(hit.charKey);
      }
    }
  }
  const tonight = new Set([...players.filter(p => p.attending).map(p => p.charKey), ...grouped]);
  // Add every character belonging to the same people (alts).
  const people = new Set([...tonight].map(k => byChar.get(k)?.personId).filter(Boolean));
  for (const p of players) if (people.has(p.personId)) tonight.add(p.charKey);

  const scores = (await live.readBlob(event, live.SCORES_KEY)) || {};
  const runs = new Map(); // runId -> { run, chars: Set }
  const targets = [...tonight].slice(0, 150);
  await rio.pool(targets, 8, deadline, async (key) => {
    const p = byChar.get(key);
    if (!p) return;
    const profile = await rio.fetchProfile(p.name, p.realm, p.region || 'us', 3000);
    if (!profile.ok) return;
    scores[key] = scoreFrom(profile);
    for (const run of profile.recentRuns) {
      const at = Date.parse(run.at || '');
      if (!run.runId || !Number.isFinite(at) || at < window.start || at > window.end) continue;
      const entry = runs.get(run.runId) || { run, chars: new Set() };
      entry.chars.add(key);
      runs.set(run.runId, entry);
    }
  });
  await live.writeBlob(event, live.SCORES_KEY, scores);

  // Log each run on every tracked character that was in it.
  const changed = new Map();
  let added = 0;
  for (const [runId, { run, chars }] of runs) {
    const members = [...chars].map(k => byChar.get(k)?.name).filter(Boolean);
    const carried = [...chars].some(k => byChar.get(k)?.carryPreference === 'need_carry');
    for (const key of chars) {
      const p = byChar.get(key);
      if (!p) continue;
      const log = Array.isArray(p.runLog) ? p.runLog : [];
      const id = `rio-${runId}`;
      if (log.some(e => e.id === id || e.rioRunId === runId)) continue;
      // A key the player already logged by hand tonight: link it instead of counting it twice.
      const manual = log.find(e => !e.rioRunId && Date.parse(e.at || '') >= window.start &&
        live.foldName(e.key).includes(live.foldName(run.dungeon)) && String(e.key).includes(`+${run.level}`));
      if (manual) {
        manual.rioRunId = runId;
        manual.success = run.success;
        manual.rioUrl = run.url || manual.rioUrl;
        manual.linkSource = 'raider-io';
      } else {
        log.unshift({
          id,
          rioRunId: runId,
          at: run.at,
          eventId: state.currentEventId || '',
          night: window.dateKey,
          key: keyText(run),
          level: run.level,
          success: run.success,
          upgrades: run.upgrades,
          rioUrl: run.url,
          members,
          hadCarryPlayer: carried && p.carryPreference !== 'need_carry',
          source: 'raider-io'
        });
        added++;
      }
      p.runLog = log.slice(0, 100);
      changed.set(key, p);
    }
  }

  // Who actually showed up: grouped tonight or finished a key tonight.
  const nights = (await live.readBlob(event, live.NIGHTS_KEY)) || {};
  const showed = new Set(nights[window.dateKey] || []);
  grouped.forEach(k => showed.add(k));
  for (const { chars } of runs.values()) chars.forEach(k => showed.add(k));
  nights[window.dateKey] = [...showed];
  await live.writeBlob(event, live.NIGHTS_KEY, nights);

  if (changed.size) {
    // runLog entries merge by id, so this never erases a newer edit.
    await live.writeMergedState(event, {
      players: [...changed.values()].map(({ personId: _p, charKey: _c, ...rest }) => rest)
    });
  }
  return { night: window.dateKey, checked: targets.length, runsFound: runs.size, logged: added, showedUp: showed.size };
}

module.exports = { nightWindow, refreshScores, syncNight };
