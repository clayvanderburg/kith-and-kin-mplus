/**
 * Raider.IO reports the key you finished, not the keystone now in your bags.
 * Timing it raises the level by the upgrades earned. Missing the timer drops it by 1.
 * The next dungeon is random, so we only estimate the level.
 */
function keystoneAfterRun(run) {
  const finished = Number(run?.mythic_level || run?.level || 0);
  if (!finished) return null;
  const upgrades = Number(run.num_keystone_upgrades || 0);
  const timed = run.par_time_ms
    ? Number(run.clear_time_ms) <= Number(run.par_time_ms)
    : upgrades > 0;
  const level = timed ? finished + Math.max(upgrades, 1) : Math.max(2, finished - 1);
  const dungeon = run.dungeon || '';
  return {
    level,
    ownedKey: `+${level}`,
    lastRun: dungeon ? `${dungeon} +${finished}` : `+${finished}`,
    timed
  };
}

module.exports = { keystoneAfterRun };
