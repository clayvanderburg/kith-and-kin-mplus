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

/** True when the request carries SYNC_SECRET or OFFICER_KEY. */
function isOfficerRequest(event) {
  const incoming = header(event, 'x-sync-secret');
  return safeEqual(incoming, process.env.SYNC_SECRET) || safeEqual(incoming, process.env.OFFICER_KEY);
}

function sessionSecret() {
  return process.env.SESSION_SECRET || process.env.SYNC_SECRET || '';
}

const PRIVATE_PLAYER_FIELDS = ['discordId', 'bnetId', 'battleTag', 'rioRuns'];
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

module.exports = { safeEqual, header, isOfficerRequest, sessionSecret, publicState };
