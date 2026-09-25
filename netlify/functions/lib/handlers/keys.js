/**
 * POST /api/keys — keystones read in-game by the KithKinKeys addon, uploaded by tools/key-uploader.js.
 * No web API can see the keystone in someone's bags; guild addons (BigWigs/Details!/Astral Keys) can,
 * so one officer's game client collects the whole guild's keys and this endpoint stores them.
 */
const { isOfficerRequest } = require('../auth');
const live = require('../live-state');

const HEADERS = { 'Content-Type': 'application/json' };

// US weekly reset: Tuesday 15:00 UTC. Keys from before it are gone in-game.
function lastWeeklyReset(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 15));
  const back = (d.getUTCDay() - 2 + 7) % 7;
  d.setUTCDate(d.getUTCDate() - back);
  if (d > now) d.setUTCDate(d.getUTCDate() - 7);
  return d.getTime();
}

const loose = (realm) => live.realmSlug(realm).replace(/-/g, '');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'POST only' }) };
  if (!isOfficerRequest(event)) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'Unauthorized' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (err) { body = {}; }
  const keys = Array.isArray(body.keys) ? body.keys.slice(0, 2000) : [];
  const reset = lastWeeklyReset();

  const state = await live.readLiveState(event, { overlays: false });
  if (!state) return { statusCode: 503, headers: HEADERS, body: JSON.stringify({ error: 'Roster unavailable' }) };
  const players = state.players || [];
  const byName = new Map();
  for (const p of players) {
    const n = live.foldName(p.name);
    if (!byName.has(n)) byName.set(n, []);
    byName.get(n).push(p);
  }

  const changed = new Map();
  let matched = 0;
  let unknown = 0;
  let stale = 0;
  for (const k of keys) {
    const level = parseInt(k.level, 10);
    const dungeon = String(k.dungeon || '').trim().slice(0, 60);
    const seenAt = Number(k.at) > 1e12 ? Number(k.at) : Number(k.at) * 1000; // addon sends seconds
    if (!k.name || !level || !dungeon) continue;
    if (!Number.isFinite(seenAt) || seenAt < reset) { stale++; continue; }
    const candidates = byName.get(live.foldName(k.name)) || [];
    const p = candidates.find(c => loose(c.realm) === loose(k.realm)) || (candidates.length === 1 ? candidates[0] : null);
    if (!p) { unknown++; continue; }
    matched++;
    const current = Date.parse(p.keyAt || '') || 0;
    if (seenAt <= current) continue;
    p.ownedKey = `${dungeon} +${level}`;
    p.keyManual = true;
    p.keySource = 'addon';
    p.keyAt = new Date(seenAt).toISOString();
    p.touchedAt = new Date().toISOString();
    changed.set(p.charKey, p);
  }

  // Clear addon keys from before this week's reset so nobody rolls a key that no longer exists.
  for (const p of players) {
    if (p.keySource === 'addon' && (Date.parse(p.keyAt || '') || 0) < reset && p.ownedKey) {
      p.ownedKey = '';
      p.keyManual = false;
      p.touchedAt = new Date().toISOString();
      changed.set(p.charKey, p);
    }
  }

  if (changed.size) {
    await live.writeMergedState(event, {
      players: [...changed.values()].map(({ personId, charKey, ...rest }) => rest)
    }, 'Keys addon');
  }
  return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, received: keys.length, matched, updated: changed.size, unknown, stale }) };
};

exports.lastWeeklyReset = lastWeeklyReset;
