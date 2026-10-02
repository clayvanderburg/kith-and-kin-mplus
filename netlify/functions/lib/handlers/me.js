const path = require('path');
const { readSession, bnetConfigured } = require('../player-session');
const { publicRun } = require('../auth');
const { readLiveState, writeMergedState, readBlob, SCORES_KEY, charKey, suggestSignup } = require('../live-state');

function loadKeystone() {
  try {
    return require('../../../../bot/keystone');
  } catch (err) {
    return require(path.join(process.cwd(), 'bot', 'keystone'));
  }
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function fold(value) {
  return String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

function bracketsToRange(brackets) {
  let keyMin = 30;
  let keyMax = 2;
  if (brackets.includes('6-8')) { keyMin = Math.min(keyMin, 6); keyMax = Math.max(keyMax, 8); }
  if (brackets.includes('10-12')) { keyMin = Math.min(keyMin, 9); keyMax = Math.max(keyMax, 12); }
  if (brackets.includes('12+')) { keyMin = Math.min(keyMin, 12); keyMax = Math.max(keyMax, 18); }
  if (keyMin > keyMax) { keyMin = 10; keyMax = 12; }
  return { keyMin, keyMax };
}

function publicPlayer(player) {
  if (!player) return null;
  return {
    name: player.name,
    realm: player.realm || '',
    className: player.className || '',
    roles: player.roles || [],
    keyBrackets: player.keyBrackets || [],
    keyMin: player.keyMin,
    keyMax: player.keyMax,
    // Typed by the player or heard by an officer's addon this week (old keys are cleared at the reset).
    ownedKey: (player.keyManual || player.keySource === 'addon' || player.keySource === 'typed') ? (player.ownedKey || '') : '',
    keySource: player.keySource || '',

    io: player.io || 0,
    ilvl: player.ilvl || 0,
    attending: player.attending !== false,
    isLeader: !!player.isLeader,
    isReserve: !!player.isReserve,
    isShitter: !!player.isShitter,
    carryPreference: player.carryPreference || 'none',
    eventId: player.eventId || '',
    nightStatus: player.nightStatus === 'in-key' ? 'in-key' : 'waiting',
    record: recordOf(player),
    runLog: (Array.isArray(player.runLog) ? player.runLog : []).slice(0, 40)
  };
}

function sameCharacter(a, b) {
  if (a?.bnetId && b?.bnetId) return a.bnetId === b.bnetId;
  const loose = r => fold(r).replace(/[^a-z0-9]/g, '');
  return fold(a?.name) === fold(b?.name) && loose(a?.realm) === loose(b?.realm);
}

function recordOf(player) {
  const log = Array.isArray(player?.runLog) ? player.runLog : [];
  const runs = log.length;
  const successes = log.filter(entry => entry.success).length;
  const rated = log.filter(entry => Number(entry.satisfaction) >= 1);
  const avgSatisfaction = rated.length
    ? Math.round(rated.reduce((sum, entry) => sum + Number(entry.satisfaction), 0) / rated.length)
    : null;
  return {
    runs,
    successes,
    rate: runs ? Math.round((successes / runs) * 100) : null,
    avgSatisfaction
  };
}

function rosterPlayer(state, member) {
  return (state.players || []).find(player => fold(player.name) === fold(member?.name)) || member || {};
}

function groupMembers(group) {
  return [group.tank, group.healer, ...(group.dps || [])].filter(Boolean);
}

function publicGroups(state, myName) {
  const mine = fold(myName);
  return (state.formedGroups || []).map((group, index) => {
    const members = groupMembers(group);
    const mineHere = members.some(member => fold(member.name) === mine);
    return {
      index,
      name: group.name || `Party ${index + 1}`,
      leaderName: group.leaderName || '',
      hasLeader: !!group.hasLeader,
      dungeon: group.dungeon || group.assignedDungeon || '',
      keystone: group.keystone || group.dungeon || group.assignedDungeon || '',
      targetKeyStr: group.targetKeyStr || '',
      isLocked: !!group.isLocked,
      hasLust: !!group.hasLust,
      lustProvider: group.lustProvider || '',
      hasBrez: !!group.hasBrez,
      brezProvider: group.brezProvider || '',
      isShitterGroup: !!group.isShitterGroup,
      shitterCount: group.shitterCount || 0,
      hasCarryMatch: !!group.hasCarryMatch,
      willingCarryNames: group.willingCarryNames || [],
      needCarryNames: group.needCarryNames || [],
      avgIo: group.avgIo || 0,
      avgIlvl: group.avgIlvl || 0,
      excludedPlayers: group.excludedPlayers || [],
      mine: mineHere,
      members: members.map(member => {
        const live = rosterPlayer(state, member);
        const slotRole = (group.tank && fold(member.name) === fold(group.tank.name))
          ? 'Tank'
          : ((group.healer && fold(member.name) === fold(group.healer.name)) ? 'Healer' : 'DPS');
        return {
          name: live.name || member.name,
          className: live.className || member.className || '',
          slotRole,
          roles: live.roles || member.roles || [],
          io: live.io || 0,
          ilvl: live.ilvl || 0,
          ownedKey: (live.keyManual || live.keySource === 'addon' || live.keySource === 'typed') ? (live.ownedKey || '') : '',
          keyMin: live.keyMin || 10,
          keyMax: live.keyMax || 12,
          keyBrackets: live.keyBrackets || [],
          isLeader: !!live.isLeader,
          isReserve: !!live.isReserve,
          isShitter: !!live.isShitter,
          carryPreference: live.carryPreference || 'none',
          nightStatus: live.nightStatus === 'in-key' ? 'in-key' : 'waiting',
          record: ((stats) => ({ runs: stats.runs, successes: stats.successes, rate: stats.rate }))(recordOf(live)),
          // Other people's private notes/ratings never leave the server.
          runLog: Array.isArray(live.runLog) ? live.runLog.slice(0, 40).map(publicRun) : []
        };
      }),
      heldKeys: mineHere ? members.map(member => {
        const live = rosterPlayer(state, member);
        return (live.keyManual || live.keySource === 'addon' || live.keySource === 'typed') && live.ownedKey ? { name: live.name, ownedKey: live.ownedKey } : null;
      }).filter(Boolean) : []
    };
  });
}

async function lookupRaider(character) {
  const region = character.region || 'us';
  const realm = encodeURIComponent(String(character.realmSlug || character.realm || '').toLowerCase().replace(/\s+/g, '-').replace(/'/g, ''));
  const name = encodeURIComponent(character.name);
  const url = `https://raider.io/api/v1/characters/profile?region=${region}&realm=${realm}&name=${name}&fields=gear,mythic_plus_scores_by_season:current,mythic_plus_recent_runs`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const season = Array.isArray(data.mythic_plus_scores_by_season)
      ? data.mythic_plus_scores_by_season[0]
      : data.mythic_plus_scores_by_season;
    const recent = data.mythic_plus_recent_runs?.[0];
    const carried = loadKeystone().keystoneAfterRun(recent);
    return {
      io: Math.round(season?.scores?.all || 0),
      ilvl: Math.round(data.gear?.item_level_equipped || 0),
      ownedKey: '',
      recentRuns: (data.mythic_plus_recent_runs || []).slice(0, 12).map(run => ({
        dungeon: run.dungeon || '',
        level: run.mythic_level || 0,
        success: run.par_time_ms ? run.clear_time_ms <= run.par_time_ms : (run.num_keystone_upgrades || 0) > 0,
        rioUrl: run.url || '',
        at: run.completed_at || ''
      }))
    };
  } catch (err) {
    return null;
  }
}

// The weekly night, described for the player page ("Friday 7:30 PM Central").
function listEvents(state) {
  let label = 'Friday M+ Night';
  try {
    let schedule;
    try { schedule = require('../../../../bot/schedule'); } catch (e) { schedule = require(path.join(process.cwd(), 'bot', 'schedule')); }
    const s = schedule.normalizeSettings(state?.eventSettings);
    label = `${s.title} · ${schedule.describe(s)}`;
  } catch (err) { /* keep the plain label */ }
  return [{ id: 'event-default', name: label, current: true }];
}


function upsertPlayer(list, record, previousName) {
  const players = [...(list || [])];
  const index = players.findIndex(player =>
    (record.bnetId && player.bnetId === record.bnetId) || fold(player.name) === fold(record.name)
  );
  if (index === -1) players.push(record);
  else players[index] = { ...players[index], ...record };
  if (previousName && fold(previousName) !== fold(record.name)) {
    return players.filter(player => fold(player.name) !== fold(previousName) || player.bnetId === record.bnetId);
  }
  return players;
}

function findOwnedCharacter(session, body) {
  const list = session.characters || [];
  const exact = list.find(character =>
    fold(character.name) === fold(body.name) && fold(character.realm) === fold(body.realm)
  );
  if (exact) return exact;
  const byName = list.filter(character => fold(character.name) === fold(body.name));
  return byName.length === 1 ? byName[0] : null;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: JSON_HEADERS, body: '' };
  }

  const session = await readSession(event);
  if (!session) {
    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({ authenticated: false, bnetConfigured: bnetConfigured() })
    };
  }

  let state = { players: [], formedGroups: [] };
  try {
    state = await readLiveState(event) || state;
  } catch (err) {
    console.error('[me] roster read failed:', err.message);
  }
  let mine = (state.players || []).find(player => player.bnetId && player.bnetId === session.bnetId);
  if (!mine) {
    // Signed up through Discord first? Battle.net proves they own the character, so pick that entry up.
    const loose = r => fold(r).replace(/[^a-z0-9]/g, '');
    const owned = (session.characters || []);
    const time = p => Date.parse(p.activeAt || p.touchedAt || '') || 0;
    mine = (state.players || [])
      .filter(player => !player.bnetId && owned.some(c => fold(c.name) === fold(player.name) && loose(c.realm) === loose(player.realm)))
      .sort((a, b) => (b.attending ? 1 : 0) - (a.attending ? 1 : 0) || time(b) - time(a))[0];
  }

  if (event.httpMethod === 'GET' && mine) {
    // Quietly link this Battle.net account to the entry (and remember all its characters) so alts'
    // runs count for the same person without the player having to press Save.
    const chars = (session.characters || []).map(c => ({ name: c.name, realm: c.realm })).slice(0, 80);
    const needsLink = !mine.bnetId || (chars.length && (mine.accountChars || []).length !== chars.length);
    if (needsLink && (!mine.bnetId || mine.bnetId === session.bnetId)) {
      try {
        // Only the link fields, stamped 1ms after the stored copy: enough to win the merge, never
        // newer than a real edit made at the same moment, and it doesn't move the sign-up time.
        const stamp = new Date((Date.parse(mine.touchedAt || '') || 0) + 1).toISOString();
        const linked = { name: mine.name, realm: mine.realm, bnetId: session.bnetId, battleTag: session.battleTag, accountChars: chars, touchedAt: stamp };
        const saved = await writeMergedState(event, { players: [linked] }, 'Signup page (Battle.net link)');
        if (saved) mine = (saved.players || []).find(p => sameCharacter(p, linked)) || mine;
      } catch (err) {
        console.error('[me] account link failed:', err.message);
      }
    }
  }

  if (event.httpMethod === 'GET') {
    // Pre-fill roles and key goals from Raider.IO for characters that haven't signed up yet.
    const suggestions = {};
    if (!mine) {
      const scores = (await readBlob(event, SCORES_KEY)) || {};
      for (const c of session.characters || []) {
        const hit = scores[charKey(c.name, c.realm)];
        const tip = suggestSignup(hit);
        if (tip) suggestions[`${c.name}|${c.realm}`] = { ...tip, io: Number(hit?.io || 0) };
      }
    }
    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        authenticated: true,
        bnetConfigured: true,
        battleTag: session.battleTag,
        characters: session.characters || [],
        signup: publicPlayer(mine),
        suggestions,
        events: listEvents(state),
        groups: publicGroups(state, mine?.name)
      })
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (parseErr) {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Invalid JSON payload.' }) };
  }

  try {
    if (body.action === 'roll') {
      return rollOwnGroup(event, state, mine, body);
    }
    if (body.action === 'exclude-player') {
      return saveGroupExclusions(event, state, mine, body);
    }
    if (body.action === 'status') {
      return saveNightStatus(event, state, mine, body);
    }
    if (body.action === 'set-key') {
      return saveOwnedKey(event, state, mine, body);
    }
    if (body.action === 'log-run') {
      return saveRunLog(event, state, mine, body);
    }
    if (body.action === 'edit-run') {
      return editRunLog(event, state, mine, body);
    }
    // A Discord-only entry is reused only when they pick that same character; otherwise it stays as their alt.
    const base = mine && !mine.bnetId && fold(mine.name) !== fold(body.name) ? null : mine;
    return await saveSignup(event, state, session, body, base);
  } catch (err) {
    console.error('[me] save failed:', err);
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: err.message || 'Save failed.' })
    };
  }
};

function slugifyRealm(realm) {
  return String(realm || '').toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function cleanUrl(value) {
  const text = String(value || '').trim().slice(0, 300);
  if (!text) return '';
  if (!/^https:\/\/(www\.)?(raider\.io|warcraftlogs\.com)\//i.test(text)) return '';
  return text;
}

function matchRioRun(player, key) {
  const runs = Array.isArray(player?.rioRuns) ? player.rioRuns : [];
  const folded = fold(key);
  const level = (String(key).match(/\+(\d+)/) || [])[1];
  return runs.find(run => {
    const dungeon = fold(run.dungeon);
    const levelOk = !level || String(run.level) === level;
    return dungeon && folded.includes(dungeon) && levelOk && run.rioUrl;
  }) || null;
}

function playerResponse(saved, savedMe) {
  return {
    ok: true,
    signup: publicPlayer(savedMe),
    groups: publicGroups(saved, savedMe?.name)
  };
}

async function saveOwnedKey(event, state, mine, body) {
  if (!mine) {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Save your signup before setting your key.' }) };
  }
  mine.ownedKey = String(body.ownedKey || '').trim().slice(0, 80);
  mine.keyManual = true;
  mine.keySource = 'typed';
  mine.keyAt = new Date().toISOString();
  mine.touchedAt = new Date().toISOString();
  const saved = await writeMergedState(event, { players: [mine] }, 'Signup page');
  const savedMe = (saved.players || []).find(player => sameCharacter(player, mine)) || mine;
  return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify(playerResponse(saved, savedMe)) };
}

async function saveNightStatus(event, state, mine, body) {
  if (!mine) {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Save your signup before setting a status.' }) };
  }
  mine.nightStatus = body.nightStatus === 'in-key' ? 'in-key' : 'waiting';
  mine.touchedAt = new Date().toISOString();
  const saved = await writeMergedState(event, { players: [mine] }, 'Signup page');
  const savedMe = (saved.players || []).find(player => sameCharacter(player, mine)) || mine;
  return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify(playerResponse(saved, savedMe)) };
}

async function editRunLog(event, state, mine, body) {
  if (!mine) {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Save your signup before editing a key.' }) };
  }
  const log = Array.isArray(mine.runLog) ? mine.runLog : [];
  const entry = log.find(item => item.id === body.id);
  if (!entry) {
    return { statusCode: 404, headers: JSON_HEADERS, body: JSON.stringify({ error: 'That logged key was not found.' }) };
  }
  if (body.key) entry.key = String(body.key).trim().slice(0, 80);
  if (typeof body.success === 'boolean') entry.success = body.success;
  if (body.note !== undefined) entry.note = String(body.note || '').trim().slice(0, 280);
  if (body.satisfaction) entry.satisfaction = Math.max(1, Math.min(5, parseInt(body.satisfaction, 10) || entry.satisfaction || 3));
  if (body.rioUrl !== undefined) entry.rioUrl = cleanUrl(body.rioUrl);
  if (body.wclUrl !== undefined) entry.wclUrl = cleanUrl(body.wclUrl);
  entry.linkSource = 'manual';
  mine.touchedAt = new Date().toISOString();
  const saved = await writeMergedState(event, { players: [mine] }, 'Signup page');
  const savedMe = (saved.players || []).find(player => sameCharacter(player, mine)) || mine;
  return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify(playerResponse(saved, savedMe)) };
}

async function saveRunLog(event, state, mine, body) {
  if (!mine) {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Save your signup before logging a key.' }) };
  }
  const key = String(body.key || '').trim().slice(0, 80);
  if (!key) {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Enter the key you ran.' }) };
  }
  const satisfaction = Math.max(1, Math.min(5, parseInt(body.satisfaction, 10) || 3));
  const myGroup = (state.formedGroups || []).find(group =>
    groupMembers(group).some(member => fold(member.name) === fold(mine.name))
  );
  const match = matchRioRun(mine, key);
  // Same Raider.IO run already logged (double click, or the automatic night sync got it first)?
  const runUrl = cleanUrl(body.rioUrl) || match?.rioUrl || '';
  if (runUrl && (mine.runLog || []).some(entry => entry.rioUrl === runUrl)) {
    return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ ...playerResponse(state, mine), duplicate: true }) };
  }
  const slug = slugifyRealm(mine.realmSlug || mine.realm);
  const region = mine.region || 'us';
  const entry = {
    id: `run-${Date.now()}`,
    at: new Date().toISOString(),
    eventId: mine.eventId || state.currentEventId || '',
    groupName: myGroup?.name || '',
    key,
    success: body.success === true,
    note: String(body.note || '').trim().slice(0, 280),
    satisfaction,
    rioUrl: cleanUrl(body.rioUrl) || match?.rioUrl || `https://raider.io/characters/${region}/${slug}/${encodeURIComponent(mine.name)}`,
    wclUrl: cleanUrl(body.wclUrl) || `https://www.warcraftlogs.com/character/${region}/${slug}/${encodeURIComponent(mine.name)}`,
    linkSource: match?.rioUrl && !body.rioUrl ? 'raider-io' : 'manual',
    members: myGroup ? groupMembers(myGroup).map(member => member.name).filter(Boolean) : []
  };
  mine.runLog = [entry, ...(Array.isArray(mine.runLog) ? mine.runLog : [])].slice(0, 100);
  mine.touchedAt = entry.at;
  const saved = await writeMergedState(event, { players: [mine] }, 'Signup page');
  const savedMe = (saved.players || []).find(player => sameCharacter(player, mine)) || mine;
  return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify(playerResponse(saved, savedMe)) };
}

async function saveSignup(event, state, session, body, existing) {
  const character = findOwnedCharacter(session, body);
  if (!character) {
    return {
      statusCode: 400,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Pick a character from your Battle.net account.' })
    };
  }

  const taken = (state.players || []).find(player =>
    fold(player.name) === fold(character.name) && player.bnetId && player.bnetId !== session.bnetId
  );
  if (taken) {
    return {
      statusCode: 409,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: `${character.name} is already signed up on another Battle.net account.` })
    };
  }

  const brackets = (Array.isArray(body.keyBrackets) ? body.keyBrackets : []).filter(item =>
    ['6-8', '10-12', '12+'].includes(item)
  );
  if (!brackets.length) brackets.push('10-12');
  const roles = (Array.isArray(body.roles) ? body.roles : []).filter(role =>
    ['Tank', 'Healer', 'DPS'].includes(role)
  );
  if (!roles.length) roles.push('DPS');
  const range = bracketsToRange(brackets);
  const rio = await lookupRaider(character);
  const now = new Date().toISOString();
  const previousName = existing?.name;

  const record = {
    ...(existing || {}),
    id: existing?.id || `bnet-${session.bnetId}`,
    bnetId: session.bnetId,
    battleTag: session.battleTag,
    name: character.name,
    realm: character.realm,
    realmSlug: character.realmSlug || existing?.realmSlug || '',
    region: character.region || 'us',
    className: character.className,
    roles,
    keyBrackets: brackets,
    keyMin: range.keyMin,
    keyMax: range.keyMax,
    rolesChosenAt: now,
    keysChosenAt: now,
    isLeader: !!body.isLeader,
    isReserve: !!body.isReserve,
    isShitter: !!body.isShitter,
    carryPreference: body.carryPreference === 'need_carry' || body.carryPreference === 'willing_carry' ? body.carryPreference : 'none',
    attending: body.attending !== false,
    attendingAt: body.attending !== false ? (existing?.attending ? (existing.attendingAt || now) : now) : null,
    absent: body.attending === false,
    touchedAt: now,
    io: rio?.io || existing?.io || 0,
    ilvl: rio?.ilvl || existing?.ilvl || 0,
    ownedKey: existing?.keyManual ? (existing.ownedKey || '') : '',
    rioRuns: rio?.recentRuns || existing?.rioRuns || [],
    // Every character on this Battle.net account, so alts' runs count for the same person.
    accountChars: (session.characters || []).map(c => ({ name: c.name, realm: c.realm })).slice(0, 80),
    eventId: ''
  };

  // One weekly night: the sign-up is simply on the roster.
  const isCurrent = true;
  const incoming = { players: [record] };
  if (record.attending === false && existing?.attending) {
    // Opted out on the website: free their party spot everywhere.
    const { stripFromGroups } = require('../live-state');
    if (stripFromGroups(state, new Set([String(record.name).trim().toLowerCase()]))) {
      incoming.formedGroups = state.formedGroups;
      incoming.benchedPlayers = state.benchedPlayers || [];
      incoming.groupsTouchedAt = now;
    }
  }
  if (previousName && fold(previousName) !== fold(record.name)) {
    renameInGroups(state, previousName, record.name);
    if (isCurrent) incoming.removedNames = [previousName];
    incoming.formedGroups = state.formedGroups;
    incoming.benchedPlayers = state.benchedPlayers || [];
    incoming.groupsTouchedAt = now;
  }

  const saved = await writeMergedState(event, incoming, 'Signup page');
  const savedMe = (saved.players || []).find(player => player.bnetId === session.bnetId);

  return {
    statusCode: 200,
    headers: JSON_HEADERS,
    body: JSON.stringify({
      ok: true,
      signup: publicPlayer(savedMe),
      groups: publicGroups(saved, savedMe?.name)
    })
  };
}

function renameInGroups(state, fromName, toName) {
  const from = fold(fromName);
  const rename = (member) => {
    if (member && fold(member.name) === from) member.name = toName;
  };
  for (const group of state.formedGroups || []) {
    rename(group.tank);
    rename(group.healer);
    (group.dps || []).forEach(rename);
    if (fold(group.leaderName) === from) group.leaderName = toName;
  }
}

async function saveGroupExclusions(event, state, mine, body) {
  if (!mine?.attending) {
    return { statusCode: 403, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Sign up before updating group exclusions.' }) };
  }
  const group = (state.formedGroups || []).find(g =>
    groupMembers(g).some(m => fold(m.name) === fold(mine.name))
  );
  if (!group) {
    return { statusCode: 404, headers: JSON_HEADERS, body: JSON.stringify({ error: 'You are not in a formed party.' }) };
  }
  if (Array.isArray(body?.excludedPlayers)) {
    group.excludedPlayers = body.excludedPlayers;
    const now = new Date().toISOString();
    state.groupsTouchedAt = now;
    const saved = await writeMergedState(event, {
      formedGroups: state.formedGroups,
      benchedPlayers: state.benchedPlayers || [],
      groupsTouchedAt: now
    }, 'Signup page');
    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({ ok: true, groups: publicGroups(saved, mine.name) })
    };
  }
  return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Missing excludedPlayers array.' }) };
}

async function rollOwnGroup(event, state, mine, body = {}) {
  if (!mine?.attending) {
    return {
      statusCode: 403,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Sign up before rolling a key for your party.' })
    };
  }
  const index = (state.formedGroups || []).findIndex(group =>
    groupMembers(group).some(member => fold(member.name) === fold(mine.name))
  );
  if (index === -1) {
    return {
      statusCode: 403,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'You are not in a formed party yet.' })
    };
  }

  const group = state.formedGroups[index];
  if (group.isLocked) {
    return {
      statusCode: 403,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'That party is locked. An officer can unlock it in Control Center.' })
    };
  }
  if (Array.isArray(body?.excludedPlayers)) {
    group.excludedPlayers = body.excludedPlayers;
  }
  const excluded = new Set((group.excludedPlayers || []).map(name => fold(name)));
  const members = groupMembers(group);
  const pool = members.filter(member => !excluded.has(fold(member.name)));
  if (!pool.length) {
    return {
      statusCode: 400,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'All members of this party are excluded from the roll.' })
    };
  }

  // Same rule as Discord: roll among keys people typed in. Only if nobody typed one, pick a member to check their bags.
  const typed = pool.filter(member => {
    const entry = rosterPlayer(state, member);
    return entry.keyManual && String(entry.ownedKey || '').trim();
  });
  const rollFrom = typed.length ? typed : pool;
  const picked = rollFrom[Math.floor(Math.random() * rollFrom.length)];
  const live = rosterPlayer(state, picked);
  const who = live.name || picked.name;
  const rawKey = live.keyManual && String(live.ownedKey || '').trim();
  const key = rawKey || `${who}'s key (check bags)`;
  group.dungeon = key;
  group.assignedDungeon = key;
  group.keystone = key;
  const now = new Date().toISOString();
  state.groupsTouchedAt = now;

  const saved = await writeMergedState(event, {
    formedGroups: state.formedGroups,
    benchedPlayers: state.benchedPlayers || [],
    groupsTouchedAt: now
  }, 'Signup page');
  return {
    statusCode: 200,
    headers: JSON_HEADERS,
    body: JSON.stringify({
      ok: true,
      key,
      who,
      hasTypedKey: Boolean(rawKey),
      groups: publicGroups(saved, mine.name)
    })
  };
};
