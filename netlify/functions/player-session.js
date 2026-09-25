const crypto = require('crypto');
const { getStore, connectLambda } = require('@netlify/blobs');

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

function sessionCookie(id, maxAgeSeconds) {
  const token = `${id}.${sign(id)}`;
  return `kk_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

function stateCookie(state) {
  return `bnet_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`;
}

function openSessions(event) {
  if (event?.blobs) {
    try {
      connectLambda(event);
    } catch (err) {
      console.error('[session] connectLambda failed:', err.message);
    }
  }
  return getStore('mplus-sessions', { consistency: 'strong' });
}

async function createSession(event, data) {
  const id = crypto.randomBytes(24).toString('base64url');
  const record = {
    ...data,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000
  };
  await openSessions(event).setJSON(id, record);
  return { id, cookie: sessionCookie(id, 30 * 24 * 60 * 60) };
}

async function readSession(event) {
  const raw = readCookies(event).kk_session || '';
  const dot = raw.lastIndexOf('.');
  if (dot === -1) return null;
  const id = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!id || sig !== sign(id)) return null;
  const record = await openSessions(event).get(id, { type: 'json' });
  if (!record || record.exp < Date.now()) return null;
  return record;
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
