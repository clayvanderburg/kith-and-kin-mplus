/**
 * Shared secrets and access checks for the Netlify functions.
 * There are no fallback secrets: if an env var is missing, access is refused.
 *   SYNC_SECRET    - shared key for trusted writers (bot, scripts)
 *   OFFICER_KEY    - passphrase officers type into the Control Center
 *   SESSION_SECRET - signs Battle.net login cookies (falls back to SYNC_SECRET)
 */
const crypto = require('crypto');

function safeEqual(a, b) {
  if (!a || !b) return false;
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function header(event, name) {
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(event?.headers || {})) {
    if (key.toLowerCase() === wanted) return value || '';
  }
  return '';
}

// ---- Officer tokens (Battle.net login + guild rank) ----
// "kko.<payload>.<signature>", signed with SESSION_SECRET, valid 12 hours. Sent in the same
// x-sync-secret header the passphrase uses, so every officer endpoint accepts either.
const OFFICER_TOKEN_HOURS = 12;

function signToken(payload) {
  return crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

function createOfficerToken(info) {
  const payload = Buffer.from(JSON.stringify({ ...info, exp: Date.now() + OFFICER_TOKEN_HOURS * 3600e3 })).toString('base64url');
  return `kko.${payload}.${signToken(payload)}`;
}

function readOfficerToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || parts[0] !== 'kko' || !sessionSecret()) return null;
  if (!safeEqual(parts[2], signToken(parts[1]))) return null;
  try {
    const data = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return data && data.exp > Date.now() ? data : null;
  } catch (err) {
    return null;
  }
}

/** True when the request carries SYNC_SECRET, OFFICER_KEY or a valid officer login token. */
function isOfficerRequest(event) {
  const incoming = header(event, 'x-sync-secret');
  return safeEqual(incoming, process.env.SYNC_SECRET) || safeEqual(incoming, process.env.OFFICER_KEY) || !!readOfficerToken(incoming);
}

/** Who made a change, for "Last change: … by …" (the officer's character when logged in with Battle.net). */
function officerLabel(event, fallback = 'Officer (website)') {
  const info = readOfficerToken(header(event, 'x-sync-secret'));
  return info?.name ? `${info.name} (website)` : fallback;
}

function sessionSecret() {
  return process.env.SESSION_SECRET || process.env.SYNC_SECRET || '';
}

const PRIVATE_PLAYER_FIELDS = ['discordId', 'bnetId', 'battleTag', 'rioRuns', 'accountChars'];
const PRIVATE_RUN_FIELDS = ['note', 'satisfaction'];

function publicRun(run) {
  if (!run || typeof run !== 'object') return run;
  const copy = { ...run };
  if (copy.note) copy.hasNote = true;
  PRIVATE_RUN_FIELDS.forEach(field => delete copy[field]);
  return copy;
}

function publicPlayerRecord(player) {
  if (!player || typeof player !== 'object') return player;
  const copy = { ...player };
  PRIVATE_PLAYER_FIELDS.forEach(field => delete copy[field]);
  if (Array.isArray(copy.runLog)) copy.runLog = copy.runLog.map(publicRun);
  return copy;
}

/** What anyone on the internet may see: roster and groups, no IDs, no private notes. */
function publicState(state) {
  if (!state || typeof state !== 'object') return state;
  const events = {};
  for (const [id, evt] of Object.entries(state.events || {})) {
    if (!evt) continue;
    events[id] = {
      ...evt,
      players: (evt.players || []).map(publicPlayerRecord)
    };
  }
  const { rollDrafts, discordCard, ...rest } = state;
  return {
    ...rest,
    players: (state.players || []).map(publicPlayerRecord),
    events
  };
}

module.exports = { safeEqual, header, isOfficerRequest, sessionSecret, publicState, publicRun, createOfficerToken, readOfficerToken, officerLabel };
