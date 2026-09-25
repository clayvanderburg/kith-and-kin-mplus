/**
 * Kith and Kin Mythic+ Night - Serverless State Sync Function
 * Provides a cloud-synchronized JSON store for both the web application and Discord bot.
 */

const { readLiveState, writeMergedState, updateDiscordCard } = require('../live-state');
const { isOfficerRequest, publicState } = require('../auth');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-sync-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  // GET: Fetch current state
  if (event.httpMethod === 'GET') {
    try {
      const data = await readLiveState(event);
      if (!data) {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            empty: true,
            players: [],
            formedGroups: [],
            benchedPlayers: [],
            lastUpdated: new Date().toISOString()
          })
        };
      }

      // Cheap polling: nothing changed since the caller's copy.
      const since = event.queryStringParameters?.since;
      if (since && data.version && since === data.version) {
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ unchanged: true, version: data.version }) };
      }
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(isOfficerRequest(event) ? data : publicState(data))
      };
    } catch (err) {
      console.error('[State Function] Error reading state:', err);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Failed to read state' })
      };
    }
  }

  // POST: Update state
  if (event.httpMethod === 'POST') {
    try {
      // Validate secret if configured
      if (!isOfficerRequest(event)) {
        return {
          statusCode: 401,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Unauthorized: Invalid sync secret' })
        };
      }

      const body = JSON.parse(event.body || '{}');
      if (Array.isArray(body.ops)) {
        return await applyOps(event, body.ops);
      }
      if (!body.players && !body.formedGroups) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Invalid state payload: must provide players or formedGroups' })
        };
      }

      const stateToSave = {
        players: body.players || [],
        formedGroups: body.formedGroups || [],
        benchedPlayers: body.benchedPlayers || [],
        excludedDungeons: body.excludedDungeons || [],
        events: body.events || {},
        currentEventId: body.currentEventId || null,
        groupsTouchedAt: body.groupsTouchedAt || null,
        lastUpdated: body.lastUpdated || new Date().toISOString()
      };

      const saved = await writeMergedState(event, stateToSave);
      updateDiscordCard(saved).catch(err => {
        console.error('[State] Discord card refresh failed:', err.message);
      });

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          playerCount: saved.players.length,
          groupCount: saved.formedGroups.length,
          lastUpdated: saved.lastUpdated
        })
      };
    } catch (err) {
      console.error('[State Function] Error saving state:', err);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Failed to save state' })
      };
    }
  }

  return {
    statusCode: 405,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: 'Method Not Allowed' })
  };
};

/**
 * Change-only saves from the Control Center.
 *   { op: 'upsert', player }                       one player an officer changed (server stamps the time)
 *   { op: 'delete', name }                         remove a player (sticks until someone edits them again)
 *   { op: 'groups', formedGroups, benchedPlayers, base }
 *        base = the groups version the officer was looking at. If someone else changed the groups
 *        since then, nothing is saved and we answer 409 with the latest groups.
 *   { op: 'meta', excludedDungeons?, currentEventId?, events? }   (events without player copies)
 */
async function applyOps(event, ops) {
  const now = new Date().toISOString();
  const latest = (await readLiveState(event)) || { players: [], formedGroups: [] };
  const incoming = {};

  const groupsOp = ops.find(o => o && o.op === 'groups');
  if (groupsOp) {
    const current = latest.groupsTouchedAt || null;
    const base = groupsOp.base || null;
    if (current !== base) {
      return {
        statusCode: 409,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'groups-changed',
          message: 'Groups were changed by someone else. Loaded the latest groups; redo your change if you still want it.',
          lastChange: latest.lastChange || null,
          groupsTouchedAt: current
        })
      };
    }
    incoming.formedGroups = Array.isArray(groupsOp.formedGroups) ? groupsOp.formedGroups : [];
    incoming.benchedPlayers = Array.isArray(groupsOp.benchedPlayers) ? groupsOp.benchedPlayers : [];
    incoming.groupsTouchedAt = now;
  }

  const upserts = ops.filter(o => o && o.op === 'upsert' && o.player && o.player.name);
  if (upserts.length) {
    incoming.players = upserts.map(o => {
      const { personId, charKey, scoreAt, ioColor, version, ...player } = o.player;
      return { ...player, touchedAt: now };
    });
  }

  const deletes = ops.filter(o => o && o.op === 'delete' && o.name);
  if (deletes.length) {
    incoming.deleted = {};
    for (const d of deletes) incoming.deleted[String(d.name).trim().toLowerCase()] = now;
  }

  const meta = ops.find(o => o && o.op === 'meta');
  if (meta) {
    if (Array.isArray(meta.excludedDungeons)) incoming.excludedDungeons = meta.excludedDungeons;
    if (meta.currentEventId) incoming.currentEventId = meta.currentEventId;
    if (meta.events && typeof meta.events === 'object') {
      // Event names/dates only. Player lists are kept server-side so a stale copy can't resurrect anyone.
      incoming.events = {};
      for (const [id, evt] of Object.entries(meta.events)) {
        if (!evt) continue;
        const { players, formedGroups, benchedPlayers, ...info } = evt;
        incoming.events[id] = { ...(latest.events?.[id] || {}), ...info };
      }
    }
  }

  if (!Object.keys(incoming).length) {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true, version: latest.version || null, groupsTouchedAt: latest.groupsTouchedAt || null }) };
  }

  const saved = await writeMergedState(event, incoming, 'Officer (website)');
  updateDiscordCard(saved).catch(err => console.error('[State] Discord card refresh failed:', err.message));
  // Re-read so the version includes overlays, exactly as the next GET will report it.
  const fresh = await readLiveState(event);
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      ok: true,
      version: fresh?.version || null,
      groupsTouchedAt: fresh?.groupsTouchedAt || null,
      lastChange: fresh?.lastChange || null
    })
  };
}
