/**
 * Guild ranks from Blizzard's official API, so officer access can follow in-game rank.
 * Blizzard only gives rank NUMBERS (0 = Guild Master, 1 = next rank down, ... same order as
 * Guild Control in game). Which numbers count as officers is a Control Center setting.
 *
 * Endpoint: GET /data/wow/guild/{realmSlug}/{guildSlug}/roster?namespace=profile-us
 * (Profile API, app token from the BNET_CLIENT_ID/SECRET client-credentials flow).
 */
const GUILD_REALM = process.env.GUILD_REALM_SLUG || 'perenolde';
const GUILD_SLUG = process.env.GUILD_NAME_SLUG || 'kith-and-kin';
const DEFAULT_OFFICER_RANKS = [0, 1, 2];
const CACHE_MS = 60 * 60 * 1000; // re-check ranks at most hourly

let cache = null; // { at, ranks: Map }

function fold(value) {
  return String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}
function slug(realm) {
  return fold(realm).replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
const keyOf = (name, realmSlug) => `${fold(name)}|${slug(realmSlug)}`;

async function appToken() {
  const basic = Buffer.from(`${process.env.BNET_CLIENT_ID}:${process.env.BNET_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://oauth.battle.net/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
    signal: AbortSignal.timeout(4000)
  });
  if (!res.ok) throw new Error(`Battle.net token ${res.status}`);
  return (await res.json()).access_token;
}

/** Map of "name|realm-slug" -> rank number for everyone in the guild. Cached for an hour. */
async function guildRanks({ force = false } = {}) {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.ranks;
  const token = await appToken();
  const url = `https://us.api.blizzard.com/data/wow/guild/${GUILD_REALM}/${GUILD_SLUG}/roster?namespace=profile-us&locale=en_US`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`Guild roster ${res.status}`);
  const data = await res.json();
  const ranks = new Map();
  for (const m of data.members || []) {
    const c = m.character || {};
    if (c.name && Number.isInteger(m.rank)) ranks.set(keyOf(c.name, c.realm?.slug || c.realm?.name), m.rank);
  }
  cache = { at: Date.now(), ranks };
  return ranks;
}

/** The guild characters on this list of the player's characters, best (lowest) rank first. */
async function guildCharactersOf(characters) {
  const ranks = await guildRanks();
  return (characters || [])
    .map(c => ({ name: c.name, realmSlug: c.realmSlug || slug(c.realm), rank: ranks.get(keyOf(c.name, c.realmSlug || c.realm)) }))
    .filter((c, i, all) => Number.isInteger(c.rank) && all.findIndex(o => keyOf(o.name, o.realmSlug) === keyOf(c.name, c.realmSlug)) === i)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 10);
}

function officerRanksFrom(state) {
  const list = state?.accessSettings?.officerRanks;
  return Array.isArray(list) && list.length ? list.filter(n => Number.isInteger(n) && n >= 0 && n <= 9) : DEFAULT_OFFICER_RANKS;
}

module.exports = { guildRanks, guildCharactersOf, officerRanksFrom, DEFAULT_OFFICER_RANKS, GUILD_REALM, GUILD_SLUG };
