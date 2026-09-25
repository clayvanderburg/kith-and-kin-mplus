/**
 * State Synchronization Client for Discord Bot
 * Syncs roster, attendance, and formed parties with the live web application.
 */

const fs = require('fs');
const path = require('path');

const LOCAL_CACHE_FILE = path.join(__dirname, 'state-cache.json');
const API_URL = process.env.API_URL || 'https://knkmplus.netlify.app/api/state';
const SYNC_SECRET = process.env.SYNC_SECRET || '';

// In-memory fallback
let inMemoryState = {
  players: [],
  formedGroups: [],
  benchedPlayers: [],
  lastUpdated: new Date().toISOString()
};

function readLocalCache() {
  try {
    if (fs.existsSync(LOCAL_CACHE_FILE)) {
      const data = fs.readFileSync(LOCAL_CACHE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('[Sync] Could not read local cache file:', err.message);
  }
  return inMemoryState;
}

function writeLocalCache(data) {
  inMemoryState = data;
  try {
    fs.writeFileSync(LOCAL_CACHE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Sync] Could not write local cache file:', err.message);
  }
}

async function fetchRemoteState() {
  if (!API_URL || API_URL.includes('localhost') && !process.env.USE_LOCAL_API) {
    return readLocalCache();
  }

  try {
    const res = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      writeLocalCache(data);
      return data;
    } else {
      console.warn(`[Sync] API returned HTTP ${res.status}, using local cache`);
    }
  } catch (err) {
    console.warn('[Sync] Network error fetching remote state, using local cache:', err.message);
  }

  return readLocalCache();
}

async function pushRemoteState(newState) {
  newState.lastUpdated = new Date().toISOString();
  writeLocalCache(newState);

  if (!API_URL) return true;

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-secret': SYNC_SECRET
      },
      body: JSON.stringify(newState)
    });

    if (!res.ok) {
      console.warn(`[Sync] API save returned HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Sync] Network error pushing remote state:', err.message);
    return false;
  }
}

async function lookupRaiderIo(name, realm = 'Perenolde', region = 'us') {
  const cleanName = encodeURIComponent(name.trim());
  const cleanRealm = encodeURIComponent(realm.trim().toLowerCase().replace(/\s+/g, '-').replace(/'/g, ''));
  const url = `https://raider.io/api/v1/characters/profile?region=${region}&realm=${cleanRealm}&name=${cleanName}&fields=gear,mythic_plus_scores_by_season:current,mythic_plus_recent_runs,mythic_plus_best_runs`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const seasonData = Array.isArray(data.mythic_plus_scores_by_season)
      ? data.mythic_plus_scores_by_season[0]
      : data.mythic_plus_scores_by_season;

    const recent = data.mythic_plus_recent_runs?.[0] || data.mythic_plus_best_runs?.[0];
    const carried = require('./keystone').keystoneAfterRun(recent);

    return {
      name: data.name,
      className: data.class,
      realm: data.realm,
      ilvl: Math.round(data.gear?.item_level_equipped || 0),
      io: Math.round(seasonData?.scores?.all || 0),
      avatar: data.thumbnail_url || null,
      ownedKey: '',
      keyMin: 10,
      keyMax: 12
    };
  } catch (err) {
    console.warn('[Sync] Raider.IO lookup error:', err.message);
    return null;
  }
}

module.exports = {
  fetchRemoteState,
  pushRemoteState,
  lookupRaiderIo
};
