/**
 * Kith and Kin Mythic+ Night - Serverless State Sync Function
 * Provides a cloud-synchronized JSON store for both the web application and Discord bot.
 */

const fs = require('fs');
const path = require('path');

// Netlify Blobs support if configured
let getStore = null;
try {
  getStore = require('@netlify/blobs').getStore;
} catch (e) {
  // @netlify/blobs not installed or in local node environment
}

const TMP_FILE = path.join('/tmp', 'kk_mplus_state.json');
const SYNC_SECRET = process.env.SYNC_SECRET || 'kith_and_kin_mythic_key_2026';

// Persistent in-memory fallback for warm lambdas
let memoryCache = null;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-sync-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

async function readFromStorage() {
  // 1. Try Netlify Blobs
  if (getStore) {
    try {
      const store = getStore({ name: 'mplus-state', consistency: 'strong' });
      const raw = await store.get('current_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        memoryCache = parsed;
        return parsed;
      }
    } catch (err) {
      // Blobs not configured or unauthenticated; fall through
    }
  }

  // 2. Try in-memory cache
  if (memoryCache) {
    return memoryCache;
  }

  // 3. Try /tmp filesystem cache
  try {
    if (fs.existsSync(TMP_FILE)) {
      const raw = fs.readFileSync(TMP_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      memoryCache = parsed;
      return parsed;
    }
  } catch (err) {
    // /tmp read failed; fall through
  }

  return null;
}

async function writeToStorage(data) {
  memoryCache = data;

  // 1. Write to /tmp filesystem
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    // Non-fatal if /tmp write fails
  }

  // 2. Write to Netlify Blobs
  if (getStore) {
    try {
      const store = getStore({ name: 'mplus-state', consistency: 'strong' });
      await store.set('current_state', JSON.stringify(data));
    } catch (err) {
      // Non-fatal if Blobs write fails
    }
  }
}

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
      const data = await readFromStorage();
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
        body: JSON.stringify(data)
      };
    } catch (err) {
      console.error('[State Function] Error reading state:', err);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Failed to read state', details: err.message })
      };
    }
  }

  // POST: Update state
  if (event.httpMethod === 'POST') {
    try {
      // Validate secret if configured
      const incomingSecret = event.headers['x-sync-secret'] || event.headers['X-Sync-Secret'];
      if (SYNC_SECRET && incomingSecret !== SYNC_SECRET) {
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
        lastUpdated: body.lastUpdated || new Date().toISOString()
      };

      await writeToStorage(stateToSave);

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          playerCount: stateToSave.players.length,
          groupCount: stateToSave.formedGroups.length,
          lastUpdated: stateToSave.lastUpdated
        })
      };
    } catch (err) {
      console.error('[State Function] Error saving state:', err);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Failed to save state', details: err.message })
      };
    }
  }

  return {
    statusCode: 405,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: 'Method Not Allowed' })
  };
};
