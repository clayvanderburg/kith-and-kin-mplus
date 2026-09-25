/**
 * Raider.IO helpers shared by the scheduled jobs and Discord.
 * Raider.IO reports scores and finished runs. It cannot see the keystone in someone's bags.
 */
const SEASON = process.env.RIO_SEASON || 'season-mn-2';

function realmSlug(realm) {
  return String(realm || 'Perenolde').trim().toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function fold(value) {
  return String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/** Stable key for one character: "name|realm-slug". */
function charKey(name, realm) {
  return `${fold(name)}|${realmSlug(realm)}`;
}

function isTimed(run) {
  if (run.par_time_ms && run.clear_time_ms) return Number(run.clear_time_ms) <= Number(run.par_time_ms);
  return Number(run.num_keystone_upgrades || 0) > 0;
}

async function fetchProfile(name, realm, region = 'us', timeoutMs = 3000) {
  const url = `https://raider.io/api/v1/characters/profile?region=${region}&realm=${encodeURIComponent(realmSlug(realm))}` +
    `&name=${encodeURIComponent(String(name).trim())}&fields=gear,mythic_plus_scores_by_season:current,mythic_plus_recent_runs`;
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    return { ok: false, status: 0 };
  }
  if (!res.ok) return { ok: false, status: res.status };
  const data = await res.json();
  const season = Array.isArray(data.mythic_plus_scores_by_season) ? data.mythic_plus_scores_by_season[0] : data.mythic_plus_scores_by_season;
  return {
    ok: true,
    status: 200,
    name: data.name,
    realm: data.realm,
    className: data.class,
    spec: data.active_spec_name || '',
    role: data.active_spec_role || '',
    io: Math.round(season?.scores?.all || 0),
    ioColor: season?.segments?.all?.color || null,
    ilvl: Math.round(data.gear?.item_level_equipped || 0),
    avatar: data.thumbnail_url || null,
    recentRuns: (data.mythic_plus_recent_runs || []).map(run => ({
      runId: run.keystone_run_id || null,
      dungeon: run.dungeon || '',
      mapId: run.map_challenge_mode_id || null,
      level: Number(run.mythic_level || 0),
      success: isTimed(run),
      upgrades: Number(run.num_keystone_upgrades || 0),
      clearMs: Number(run.clear_time_ms || 0),
      parMs: Number(run.par_time_ms || 0),
      role: run.role || '',
      at: run.completed_at || '',
      url: run.url || ''
    }))
  };
}

/** Run `task` over `items` with limited concurrency, stopping new work after `deadline` (ms timestamp). */
async function pool(items, concurrency, deadline, task) {
  let index = 0;
  let done = 0;
  async function worker() {
    while (index < items.length && Date.now() < deadline) {
      const item = items[index++];
      await task(item);
      done++;
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return done;
}

module.exports = { SEASON, realmSlug, fold, charKey, isTimed, fetchProfile, pool };
