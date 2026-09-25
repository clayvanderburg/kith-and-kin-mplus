const crypto = require('crypto');

const MAX_COOKIE = 3200;

function signingSecret() {
  return process.env.SYNC_SECRET || 'kith_and_kin_mythic_key_2026';
}

function sign(value) {
  return crypto.createHmac('sha256', signingSecret()).update(value).digest('base64url');
}

function readCookies(event) {
  const raw = event.headers?.cookie || event.headers?.Cookie || '';
  const cookies = {};
  String(raw).split(';').forEach(part => {
    const index = part.indexOf('=');
    if (index === -1) return;
    cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  });
  return cookies;
}

function sessionCookie(token, maxAgeSeconds) {
  return `kk_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

function stateCookie(state) {
  return `bnet_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`;
}

function packSession(data) {
  let characters = [...(data.characters || [])].sort((a, b) => (b.level || 0) - (a.level || 0));
  let payload = '';
  do {
    payload = Buffer.from(JSON.stringify({
      bnetId: data.bnetId,
      battleTag: data.battleTag,
      characters,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000
    })).toString('base64url');
    if (payload.length + sign(payload).length + 1 <= MAX_COOKIE || characters.length <= 8) break;
    characters = characters.slice(0, Math.max(8, characters.length - 4));
  } while (characters.length >= 8);
  return `${payload}.${sign(payload)}`;
}

function createSession(event, data) {
  return {
    cookie: sessionCookie(packSession(data), 30 * 24 * 60 * 60)
  };
}

function readSession(event) {
  const raw = readCookies(event).kk_session || '';
  const dot = raw.lastIndexOf('.');
  if (dot === -1) return null;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!payload || sig !== sign(payload)) return null;
  try {
    const record = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!record || record.exp < Date.now()) return null;
    return record;
  } catch (err) {
    return null;
  }
}

function bnetConfigured() {
  return Boolean(process.env.BNET_CLIENT_ID && process.env.BNET_CLIENT_SECRET);
}

function redirectUri() {
  return process.env.BNET_REDIRECT_URI || 'https://knkmplus.netlify.app/api/bnet-callback';
}

module.exports = {
  readCookies,
  stateCookie,
  createSession,
  readSession,
  bnetConfigured,
  redirectUri
};
