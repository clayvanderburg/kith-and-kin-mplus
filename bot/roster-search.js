/**
 * Full-guild character search. Discord select menus cap at 25 options,
 * so signup starts with a typed query and this ranks the synced roster.
 */

const roster = require('./guild-roster.json');

function foldName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

function searchGuildRoster(query, limit = 24) {
  const typedName = String(query || '').trim().slice(0, 32);
  const q = foldName(typedName);
  const exact = [];
  const prefix = [];
  const includes = [];

  if (Array.isArray(roster)) {
    for (const entry of roster) {
      if (!entry?.name) continue;
      const folded = foldName(entry.name);
      if (!q) {
        prefix.push(entry);
        continue;
      }
      if (folded === q) exact.push(entry);
      else if (folded.startsWith(q)) prefix.push(entry);
      else if (folded.includes(q)) includes.push(entry);
    }
  }

  const matches = [...exact, ...prefix, ...includes].slice(0, limit);
  const uniqueExact = exact.length === 1 ? exact[0] : null;
  const onlyMatch = exact.length + prefix.length + includes.length === 1 ? matches[0] : null;

  return {
    typedName,
    matches,
    exact: uniqueExact,
    autoPick: uniqueExact || onlyMatch || null,
    matchCount: q ? exact.length + prefix.length + includes.length : matches.length
  };
}

function findRosterEntry(name) {
  const q = foldName(name);
  if (!q || !Array.isArray(roster)) return null;
  return roster.find(entry => foldName(entry.name) === q) || null;
}

function attachCharacter(state, discordUserId, rawName) {
  const typed = String(rawName || '').replace(/^__custom__:?/, '').trim().slice(0, 32);
  if (!typed) return null;
  const rosterHit = findRosterEntry(typed);
  const canonical = rosterHit?.name || typed;
  const folded = foldName(canonical);
  state.players = state.players || [];
  let target = state.players.find(player => foldName(player.name) === folded);
  if (!target) {
    const role = ['Tank', 'Healer', 'DPS'].includes(rosterHit?.role) ? rosterHit.role : 'DPS';
    target = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: canonical,
      className: rosterHit?.className || 'Adventurer',
      realm: rosterHit?.realm || 'Perenolde',
      region: 'us',
      roles: [role],
      keyMin: 10,
      keyMax: 12,
      keyBrackets: ['10-12'],
      attending: true,
      absent: false,
      discordId: discordUserId || null,
      touchedAt: new Date().toISOString(),
      io: 0,
      ilvl: 0,
      carryPreference: 'none',
      isShitter: false,
      isLeader: false,
      isReserve: false
    };
    state.players.push(target);
  } else {
    if (discordUserId) target.discordId = discordUserId;
    target.attending = true;
    target.absent = false;
    target.touchedAt = new Date().toISOString();
    if (rosterHit?.className && (!target.className || target.className === 'Warrior' || target.className === 'Adventurer')) {
      target.className = rosterHit.className;
    }
    if (rosterHit?.realm && !target.realm) target.realm = rosterHit.realm;
  }
  return target;
}

function characterSearchModal(prefill = '') {
  const input = {
    type: 4,
    custom_id: 'char_query',
    label: 'Type a guild name, or any alt',
    style: 1,
    min_length: 1,
    max_length: 32,
    placeholder: 'MadKing, Shock, or a guest name',
    required: true
  };
  const value = String(prefill || '').trim().slice(0, 32);
  if (value) input.value = value;
  return {
    custom_id: 'modal_char_search',
    title: 'Find Your Character',
    components: [{ type: 1, components: [input] }]
  };
}

module.exports = {
  foldName,
  searchGuildRoster,
  findRosterEntry,
  attachCharacter,
  characterSearchModal
};
