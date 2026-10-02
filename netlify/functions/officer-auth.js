// Officer login for the Control Center.
//  - { key }      the officer passphrase (backup; also used by the key-kit uploader)
//  - { session }  a Battle.net login token: allowed when one of their characters holds an officer
//                 rank in the guild (ranks set in the Control Center; default 0-2).
// Battle.net logins get a 12-hour officer token that goes in the x-sync-secret header for saves,
// exactly where the passphrase goes.
const { safeEqual, createOfficerToken } = require('./lib/auth');
const { readSession } = require('./lib/player-session');
const { guildCharactersOf, officerRanksFrom } = require('./lib/guild-ranks');
const { readLiveState } = require('./lib/live-state');

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const reply = (statusCode, body) => ({ statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (err) { body = {}; }

  // Passphrase (backup)
  if (body.key !== undefined) {
    const ok = safeEqual(String(body.key || '').trim(), process.env.OFFICER_KEY);
    return reply(ok ? 200 : 401, { ok, how: 'passphrase', name: ok ? 'Officer' : null });
  }

  // Battle.net
  const session = readSession({ headers: { ...(event.headers || {}), 'x-kk-session': body.session || '' } });
  if (!session) return reply(401, { ok: false, error: 'Battle.net login expired. Log in again.' });
  let state = null;
  try { state = await readLiveState(event, { overlays: false }); } catch (err) { state = null; }
  const allowed = officerRanksFrom(state);
  let chars = [];
  try {
    // Re-checked against the live guild roster (hourly cache), so a promotion or demotion counts.
    chars = await guildCharactersOf(session.guildChars?.length ? session.guildChars : session.characters);
  } catch (err) {
    console.warn('[officer-auth] guild roster lookup failed:', err.message);
    return reply(503, { ok: false, error: 'Couldn’t check guild ranks with Blizzard right now. Try again in a minute, or use the passphrase.' });
  }
  const best = chars[0];
  if (!best) {
    return reply(403, { ok: false, battleTag: session.battleTag, error: `None of ${session.battleTag}'s characters are in Kith and Kin.` });
  }
  if (!allowed.includes(best.rank)) {
    return reply(403, { ok: false, battleTag: session.battleTag, error: `${best.name} is guild rank ${best.rank}; officer ranks are ${allowed.join(', ')}.` });
  }
  const token = createOfficerToken({ bnetId: session.bnetId, battleTag: session.battleTag, name: best.name, rank: best.rank });
  return reply(200, { ok: true, how: 'battlenet', token, name: best.name, rank: best.rank });
};
