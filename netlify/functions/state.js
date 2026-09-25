/**
 * Kith and Kin Mythic+ Night - Serverless State Sync Function
 * Provides a cloud-synchronized JSON store for both the web application and Discord bot.
 */

const { readLiveState, writeMergedState, updateDiscordCard } = require('./live-state');
const { isOfficerRequest, publicState } = require('./lib/auth');

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
