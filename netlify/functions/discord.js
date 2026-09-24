/**
 * Kith and Kin Mythic+ Night - Serverless Discord Interactions Endpoint
 * Hosted 100% on Netlify. No local computer or persistent server needed.
 * Discord sends HTTP POST requests here whenever members use slash commands or click buttons.
 */

const crypto = require('crypto');
const path = require('path');

// Safe dynamic imports of solver and embeds across local and Netlify Lambda environments
function loadModule(name) {
  const possiblePaths = [
    path.join(__dirname, '..', '..', 'bot', name),
    path.join(__dirname, '..', 'bot', name),
    path.join(__dirname, 'bot', name),
    path.join(process.cwd(), 'bot', name),
    path.join(__dirname, name)
  ];
  for (const p of possiblePaths) {
    try {
      return require(p);
    } catch (e) {}
  }
  return null;
}

const solver = loadModule('solver');
const embeds = loadModule('embeds');

let getStore = null;
try {
  getStore = require('@netlify/blobs').getStore;
} catch (e) {}

const TMP_FILE = path.join('/tmp', 'kk_mplus_state.json');
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || '66f468e2962fddf5f6c25d675f66df3970d481be92cc350c30358a12dfe527bb';
const WEB_URL = process.env.WEB_URL || 'https://knkmplus.netlify.app';

// 29-player Kith and Kin guild roster - all start with attending: false
const INITIAL_ROSTER = [
  { id: 'kk-adrenaline', name: 'Adrenaline', className: 'Warrior', roles: ['Tank', 'DPS'], keyMin: 14, keyMax: 18, ownedKey: 'Murder Row +16', realm: 'Perenolde', region: 'us', ilvl: 322, io: 3236, rank: 0, attending: false, carryPreference: 'none', isShitter: false, isLeader: false, isReserve: false },
  { id: 'kk-bungulator', name: 'Bungulator', className: 'Shaman', roles: ['DPS', 'Healer'], keyMin: 14, keyMax: 18, ownedKey: 'Murder Row +16', realm: 'Korgath', region: 'us', ilvl: 324, io: 3290, rank: 2, attending: false, carryPreference: 'none', isShitter: false, isLeader: false, isReserve: false },
  { id: 'kk-glaiven', name: 'Glaiven', className: 'Demon Hunter', roles: ['DPS', 'Tank'], keyMin: 10, keyMax: 14, ownedKey: "Kings' Rest +12", realm: 'Perenolde', region: 'us', ilvl: 323, io: 3138, rank: 1, attending: false, carryPreference: 'none', isShitter: false, isLeader: false, isReserve: false },
  { id: 'kk-shocktherapy', name: 'Shockthêràpy', className: 'Shaman', roles: ['Healer', 'DPS'], keyMin: 12, keyMax: 16, ownedKey: 'Altar of Fangs +14', realm: 'Perenolde', region: 'us', ilvl: 321, io: 3230, rank: 1, attending: false, carryPreference: 'none', isShitter: false, isLeader: false, isReserve: false },
  { id: 'kk-meanssa', name: 'Meanssa', className: 'Death Knight', roles: ['Tank', 'DPS'], keyMin: 12, keyMax: 16, ownedKey: 'Voidscar Arena +14', realm: 'Frostmane', region: 'us', ilvl: 321, io: 3118, rank: 1, attending: false, carryPreference: 'none', isShitter: false, isLeader: false, isReserve: false },
  { id: 'kk-stirlingskat', name: 'Stirlingskat', className: 'Druid', roles: ['Healer', 'Tank', 'DPS'], keyMin: 12, keyMax: 16, ownedKey: 'Ruby Life Pools +14', realm: 'Moon Guard', region: 'us', ilvl: 317, io: 3118, rank: 1, attending: false, carryPreference: 'none', isShitter: false, isLeader: false, isReserve: false },
  { id: 'kk-sploosh', name: 'Splõõsh', className: 'Shaman', roles: ['DPS', 'Healer'], keyMin: 11, keyMax: 15, ownedKey: 'Altar of Fangs +13', realm: 'Korgath', region: 'us', ilvl: 322, io: 3104, rank: 2, attending: false, carryPreference: 'none', isShitter: false, isLeader: false, isReserve: false },
  { id: 'kk-noxxicc', name: 'Noxxicc', className: 'Death Knight', roles: ['Tank', 'DPS'], keyMin: 8, keyMax: 12, ownedKey: 'Murder Row +10', realm: 'Korgath', region: 'us', ilvl: 317, io: 2939, rank: 2, attending: false, carryPreference: 'none', isShitter: false, isLeader: false, isReserve: false },
  { id: 'kk-avaryn', name: 'Avaryn', className: 'Druid', roles: ['Healer', 'DPS', 'Tank'], keyMin: 10, keyMax: 14, ownedKey: "Kings' Rest +12", realm: 'Perenolde', region: 'us', ilvl: 319, io: 2931, rank: 2, attending: false, carryPreference: 'none', isShitter: false, isLeader: false, isReserve: false },
  { id: 'kk-tiblock', name: 'Tiblock', className: 'Warlock', roles: ['DPS'], keyMin: 11, keyMax: 15, ownedKey: 'Altar of Fangs +13', realm: 'Korgath', region: 'us', ilvl: 323, io: 2883, rank: 2, attending: false, carryPreference: 'none', isShitter: false, isLeader: false, isReserve: false },
  { id: 'kk-khaiduus', name: 'Khaiduus', className: 'Shaman', roles: ['DPS', 'Healer'], keyMin: 9, keyMax: 13, ownedKey: 'Voidscar Arena +11', realm: 'Cairne', region: 'us', ilvl: 318, io: 2845, rank: 1, attending: false, carryPreference: 'none', isShitter: false, isLeader: false, isReserve: false },
  { id: 'kk-ravenlight', name: 'Ravenlight', className: 'Paladin', roles: ['DPS', 'Tank', 'Healer'], keyMin: 11, keyMax: 15, ownedKey: 'Altar of Fangs +14', realm: 'Perenolde', region: 'us', ilvl: 319, io: 1457, rank: 1, attending: false, carryPreference: 'none', isShitter: false, isLeader: false, isReserve: false },
  { id: 'kk-tyberia', name: 'Tyberia', className: 'Paladin', roles: ['DPS', 'Tank', 'Healer'], keyMin: 9, keyMax: 13, ownedKey: 'Altar of Fangs +12', realm: 'Korgath', region: 'us', ilvl: 311, io: 1359, rank: 2, attending: false, carryPreference: 'none', isShitter: false, isLeader: false, isReserve: false },
  { id: 'kk-engorged', name: 'Engorged', className: 'Warlock', roles: ['DPS'], keyMin: 2, keyMax: 6, ownedKey: 'Den of Nalorakk +4', realm: 'Perenolde', region: 'us', ilvl: 118, io: 0, rank: 1, attending: false, carryPreference: 'none', isShitter: false, isLeader: false, isReserve: false },
  { id: 'kk-holyscheisse', name: 'Holyscheisse', className: 'Druid', roles: ['DPS', 'Healer', 'Tank'], keyMin: 2, keyMax: 7, ownedKey: 'The Blinding Vale +5', realm: 'Korgath', region: 'us', ilvl: 291, io: 0, rank: 1, attending: false, carryPreference: 'none', isShitter: false, isLeader: false, isReserve: false },
  { id: 'kk-myssa', name: 'Myssa', className: 'Demon Hunter', roles: ['Tank', 'DPS'], keyMin: 9, keyMax: 13, ownedKey: 'Temple of Sethraliss +11', realm: 'Frostmane', region: 'us', ilvl: 297, io: 2788, rank: 1, attending: false, carryPreference: 'none', isShitter: false },
  { id: 'kk-bearackobama', name: 'Bearackobamà', className: 'Druid', roles: ['DPS', 'Tank', 'Healer'], keyMin: 2, keyMax: 6, ownedKey: 'Voidscar Arena +4', realm: 'Perenolde', region: 'us', ilvl: 260, io: 0, rank: 1, attending: false, carryPreference: 'none', isShitter: false },
  { id: 'kk-charliestar', name: 'Charliestar', className: 'Warlock', roles: ['DPS'], keyMin: 2, keyMax: 6, ownedKey: '', realm: 'Perenolde', region: 'us', ilvl: 143, io: 0, rank: 1, attending: false, carryPreference: 'none', isShitter: false },
  { id: 'kk-gredic', name: 'Gredic', className: 'Paladin', roles: ['Tank', 'Healer', 'DPS'], keyMin: 2, keyMax: 6, ownedKey: '', realm: 'Perenolde', region: 'us', ilvl: 295, io: 0, rank: 1, attending: false, carryPreference: 'none', isShitter: false },
  { id: 'kk-khaidylock', name: 'Khaidylock', className: 'Warlock', roles: ['DPS'], keyMin: 2, keyMax: 6, ownedKey: '', realm: 'Cairne', region: 'us', ilvl: 263, io: 0, rank: 1, attending: false, carryPreference: 'none', isShitter: false },
  { id: 'kk-knightlight', name: 'Kníghtlight', className: 'Paladin', roles: ['DPS', 'Tank', 'Healer'], keyMin: 2, keyMax: 6, ownedKey: '', realm: 'Perenolde', region: 'us', ilvl: 276, io: 0, rank: 1, attending: false, carryPreference: 'none', isShitter: false },
  { id: 'kk-veralith', name: 'Veralith', className: 'Demon Hunter', roles: ['Tank', 'DPS'], keyMin: 2, keyMax: 6, ownedKey: '', realm: 'Korgath', region: 'us', ilvl: 269, io: 0, rank: 2, attending: false, carryPreference: 'none', isShitter: false },
  { id: 'kk-azerite', name: 'Azerite', className: 'Hunter', roles: ['DPS'], keyMin: 2, keyMax: 6, ownedKey: '', realm: 'Korgath', region: 'us', ilvl: 274, io: 0, rank: 2, attending: false, carryPreference: 'none', isShitter: false },
  { id: 'kk-haiyu', name: 'Haiyu', className: 'Shaman', roles: ['Healer', 'DPS'], keyMin: 2, keyMax: 6, ownedKey: '', realm: 'Korgath', region: 'us', ilvl: 135, io: 0, rank: 2, attending: false, carryPreference: 'none', isShitter: false },
  { id: 'kk-valkyrin', name: 'Valkyrin', className: 'Paladin', roles: ['Healer', 'Tank', 'DPS'], keyMin: 2, keyMax: 6, ownedKey: '', realm: 'Korgath', region: 'us', ilvl: 248, io: 0, rank: 2, attending: false, carryPreference: 'none', isShitter: false },
  { id: 'kk-sylana', name: 'Sylana', className: 'Warrior', roles: ['DPS', 'Tank'], keyMin: 2, keyMax: 6, ownedKey: '', realm: 'Perenolde', region: 'us', ilvl: 271, io: 0, rank: 2, attending: false, carryPreference: 'none', isShitter: false },
  { id: 'kk-azernasty', name: 'Azernasty', className: 'Death Knight', roles: ['DPS', 'Tank'], keyMin: 2, keyMax: 6, ownedKey: '', realm: 'Korgath', region: 'us', ilvl: 293, io: 0, rank: 2, attending: false, carryPreference: 'none', isShitter: false },
  { id: 'kk-ayahuasca', name: 'Ayahuascå', className: 'Shaman', roles: ['DPS', 'Healer'], keyMin: 2, keyMax: 6, ownedKey: '', realm: 'Korgath', region: 'us', ilvl: 311, io: 0, rank: 1, attending: false, carryPreference: 'none', isShitter: false },
  { id: 'kk-meowssa', name: 'Meowssa', className: 'Druid', roles: ['Tank', 'DPS', 'Healer'], keyMin: 2, keyMax: 6, ownedKey: '', realm: 'Frostmane', region: 'us', ilvl: 293, io: 0, rank: 1, attending: false, carryPreference: 'none', isShitter: false }
];

// Fast in-memory cache for warm lambdas
let memoryState = null;

async function loadState() {
  if (memoryState && Array.isArray(memoryState.players) && memoryState.players.length > 0) {
    return memoryState;
  }

  // 1. Read from Netlify Blobs if available (direct & fast)
  if (getStore) {
    try {
      const store = getStore({ name: 'mplus-state' });
      const raw = await store.get('current_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.players)) {
          memoryState = parsed;
          return parsed;
        }
      }
    } catch (e) {}
  }

  // 2. Read from /tmp filesystem
  const fs = require('fs');
  if (fs.existsSync(TMP_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(TMP_FILE, 'utf8'));
      if (parsed && Array.isArray(parsed.players)) {
        memoryState = parsed;
        return parsed;
      }
    } catch (e) {}
  }

  // 3. Fallback clean state with empty attending roster
  memoryState = {
    players: JSON.parse(JSON.stringify(INITIAL_ROSTER)),
    formedGroups: [],
    benchedPlayers: [],
    lastUpdated: new Date().toISOString()
  };
  return memoryState;
}

async function saveState(data) {
  memoryState = data;
  data.lastUpdated = new Date().toISOString();

  // If events exist, keep current event in sync
  if (data.currentEventId && data.events && data.events[data.currentEventId]) {
    data.events[data.currentEventId].players = data.players || [];
    data.events[data.currentEventId].formedGroups = data.formedGroups || [];
    data.events[data.currentEventId].benchedPlayers = data.benchedPlayers || [];
    data.events[data.currentEventId].lastUpdated = data.lastUpdated;
  }

  // 1. Write to /tmp immediately (<2ms)
  try {
    const fs = require('fs');
    fs.writeFileSync(TMP_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}

  // 2. Write to Netlify Blobs directly (<30ms)
  if (getStore) {
    try {
      const store = getStore({ name: 'mplus-state' });
      await store.set('current_state', JSON.stringify(data));
    } catch (e) {}
  }
}

/**
 * Verify Ed25519 signature from Discord using Node's built-in crypto
 */
function verifyDiscordSignature(rawBody, signature, timestamp, clientPublicKey) {
  if (!clientPublicKey) {
    console.warn('[Discord Endpoint] DISCORD_PUBLIC_KEY is not configured in Netlify environment variables.');
    return false;
  }
  if (!signature || !timestamp) {
    return false;
  }
  try {
    const cleanKey = clientPublicKey.trim().replace(/['"]/g, '');
    const pubKey = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from('302a300506032b6570032100', 'hex'),
        Buffer.from(cleanKey, 'hex')
      ]),
      format: 'der',
      type: 'spki'
    });
    return crypto.verify(
      null,
      Buffer.concat([Buffer.from(timestamp, 'utf-8'), Buffer.from(rawBody, 'utf-8')]),
      pubKey,
      Buffer.from(signature, 'hex')
    );
  } catch (e) {
    console.error('[Discord Endpoint] Verification exception:', e.message);
    return false;
  }
}

/**
 * Raider.IO lookup helper
 */
async function lookupRaiderIo(name, realm = 'Perenolde', region = 'us') {
  try {
    const cleanName = encodeURIComponent(name.trim());
    const cleanRealm = encodeURIComponent(realm.trim().toLowerCase().replace(/\s+/g, '-').replace(/'/g, ''));
    const url = `https://raider.io/api/v1/characters/profile?region=${region}&realm=${cleanRealm}&name=${cleanName}&fields=gear,mythic_plus_scores_by_season:current,mythic_plus_recent_runs,mythic_plus_best_runs`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const seasonData = Array.isArray(data.mythic_plus_scores_by_season)
      ? data.mythic_plus_scores_by_season[0]
      : data.mythic_plus_scores_by_season;

    const recent = data.mythic_plus_recent_runs?.[0] || data.mythic_plus_best_runs?.[0];
    let ownedKey = '';
    let keyMin = 4;
    let keyMax = 12;

    if (recent) {
      ownedKey = `${recent.dungeon} +${recent.mythic_level}`;
      keyMin = Math.max(2, recent.mythic_level - 3);
      keyMax = recent.mythic_level + 2;
    }

    return {
      name: data.name,
      className: data.class,
      realm: data.realm,
      ilvl: Math.round(data.gear?.item_level_equipped || 0),
      io: Math.round(seasonData?.scores?.all || 0),
      avatar: data.thumbnail_url || null,
      ownedKey,
      keyMin,
      keyMax
    };
  } catch (err) {
    return null;
  }
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Normalize headers (case-insensitive)
  const headers = {};
  for (const [k, v] of Object.entries(event.headers || {})) {
    headers[k.toLowerCase()] = v;
  }
  const signature = headers['x-signature-ed25519'];
  const timestamp = headers['x-signature-timestamp'];

  // Handle potential base64 encoding from Netlify / API Gateway
  let rawBody = event.body || '';
  if (event.isBase64Encoded) {
    rawBody = Buffer.from(rawBody, 'base64').toString('utf-8');
  }

  // 1. Verify Request Signature from Discord
  const isValid = verifyDiscordSignature(rawBody, signature, timestamp, DISCORD_PUBLIC_KEY);
  if (!isValid) {
    return { statusCode: 401, body: 'Invalid request signature' };
  }

  let interaction;
  try {
    interaction = JSON.parse(rawBody);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON payload' };
  }

  // 2. Discord PING Check (Type 1)
  if (interaction.type === 1) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 1 }) // PONG
    };
  }

  // 2b. Autocomplete Interaction (Type 4)
  if (interaction.type === 4) {
    let focusedOption = null;
    if (interaction.data?.options) {
      for (const opt of interaction.data.options) {
        if (opt.focused) {
          focusedOption = opt;
          break;
        }
        if (opt.options) {
          for (const subOpt of opt.options) {
            if (subOpt.focused) {
              focusedOption = subOpt;
              break;
            }
          }
        }
        if (focusedOption) break;
      }
    }

    const query = (focusedOption?.value || '').trim().toLowerCase();
    let choices = [];

    try {
      const rosterData = require('../../bot/guild-roster.json');
      if (Array.isArray(rosterData)) {
        if (!query) {
          choices = rosterData.slice(0, 25).map(c => ({
            name: `${c.name} (${c.className || 'Player'} - ${c.realm || 'Cenarius'})`,
            value: c.name
          }));
        } else {
          const exactMatches = [];
          const prefixMatches = [];
          const includesMatches = [];

          for (const c of rosterData) {
            const lowerName = c.name.toLowerCase();
            if (lowerName === query) {
              exactMatches.push(c);
            } else if (lowerName.startsWith(query)) {
              prefixMatches.push(c);
            } else if (lowerName.includes(query)) {
              includesMatches.push(c);
            }
          }

          const combined = [...exactMatches, ...prefixMatches, ...includesMatches];
          choices = combined.slice(0, 24).map(c => ({
            name: `${c.name} (${c.className || 'Player'} - ${c.realm || 'Cenarius'})`,
            value: c.name
          }));

          // If typed query doesn't exactly match someone, offer custom/alt choice
          if (!exactMatches.length && focusedOption?.value) {
            choices.unshift({
              name: `➕ "${focusedOption.value}" (Custom / Not in Guild)`,
              value: focusedOption.value
            });
          }
        }
      }
    } catch (err) {
      console.error('[Discord Autocomplete] Error loading roster:', err);
    }

    return jsonResponse({
      type: 8, // APPLICATION_COMMAND_AUTOCOMPLETE_RESULT
      data: {
        choices: choices.slice(0, 25)
      }
    });
  }

  const state = await loadState();

  // 3. Slash Commands (Type 2)
  if (interaction.type === 2) {
    const { name, options } = interaction.data;

    if (name === 'mplus') {
      const subcommand = options?.[0]?.name;

      if (subcommand === 'web') {
        return jsonResponse({
          type: 4,
          data: {
            content: `🌐 **Kith & Kin Mythic+ Night Web App:**\n${WEB_URL}`
          }
        });
      }

      if (subcommand === 'roster') {
        const embed = embeds ? embeds.createRosterEmbed(state.players || [], WEB_URL).toJSON() : { title: 'Roster' };
        return jsonResponse({
          type: 4,
          data: { embeds: [embed] }
        });
      }

      if (subcommand === 'post-signup') {
        const embed = embeds ? embeds.createRosterEmbed(state.players || [], WEB_URL).toJSON() : { title: 'Roster' };
        const buttons = embeds ? embeds.createSignupButtons().map(r => r.toJSON()) : [];
        return jsonResponse({
          type: 4,
          data: {
            content: '⚡ **Mythic+ Night Sign-ups are OPEN!** Click below to register your role and preferences:',
            embeds: [embed],
            components: buttons
          }
        });
      }

      if (subcommand === 'clear') {
        state.formedGroups = [];
        state.benchedPlayers = [];
        await saveState(state);
        return jsonResponse({
          type: 4,
          data: {
            content: '🧹 Formed groups cleared! Roster sign-ups are preserved.'
          }
        });
      }

      if (subcommand === 'roll-key') {
        const subOpts = options[0]?.options || [];
        const getOpt = (n) => subOpts.find(o => o.name === n)?.value;
        const source = getOpt('source') || 'pool';
        const level = getOpt('level');
        const exclude = getOpt('exclude');

        const excluded = [...(state.excludedDungeons || [])];
        if (exclude && !excluded.some(e => e.toLowerCase() === exclude.toLowerCase())) {
          excluded.push(exclude);
        }

        const attendees = (state.players || []).filter(p => p.attending);
        const heldKeys = attendees.filter(p => p.ownedKey && p.ownedKey.trim() !== '');

        if (source === 'held' && heldKeys.length === 0) {
          return jsonResponse({
            type: 4,
            data: {
              content: '⚠️ No attending members have an active keystone recorded yet! Use `/mplus roll-key source:pool` or click **🔑 Sync Keys** on the dashboard.',
              flags: 64
            }
          });
        }

        const rollResult = solver ? solver.rollKeystone({
          dungeonPool: solver.DUNGEONS_MIDNIGHT_S2,
          excludedDungeons: excluded,
          heldKeys,
          onlyHeld: source === 'held',
          targetLevel: level ? parseInt(level, 10) : null
        }) : {
          dungeon: 'Murder Row',
          level: level || 12,
          keyString: `Murder Row +${level || 12}`,
          holders: []
        };

        let holderText = '';
        if (rollResult.holders && rollResult.holders.length > 0) {
          holderText = `\n👜 **Held in bags by:** ${rollResult.holders.join(', ')}`;
        } else {
          holderText = `\n*(No attending member currently holds this exact key — push or reroll!)*`;
        }

        const excludedText = excluded.length > 0 ? `\n🚫 **Excluded:** ${excluded.join(', ')}` : '';

        return jsonResponse({
          type: 4,
          data: {
            content: `🎲 **Rolled Keystone:** \`${rollResult.keyString}\`${holderText}${excludedText}\nLive status synced to [web dashboard](${WEB_URL}).`
          }
        });
      }

      if (subcommand === 'sync-keys') {
        const attendees = (state.players || []).filter(p => p.attending);
        if (attendees.length === 0) {
          return jsonResponse({
            type: 4,
            data: {
              content: '⚠️ No attending members to sync keystones for. Use `/mplus signup` or RSVP buttons first!',
              flags: 64
            }
          });
        }

        let updatedCount = 0;
        const syncBatch = attendees.slice(0, 8);
        const syncPromises = syncBatch.map(async p => {
          try {
            const data = await lookupRaiderIo(p.name, p.realm || 'Perenolde');
            if (data?.ownedKey) {
              p.ownedKey = data.ownedKey;
              const lvlMatch = data.ownedKey.match(/\+(\d+)/);
              if (lvlMatch) {
                const lvl = parseInt(lvlMatch[1], 10);
                p.keyMin = Math.max(2, lvl - 3);
                p.keyMax = lvl + 2;
              }
              updatedCount++;
            }
            if (data?.ilvl) p.ilvl = data.ilvl;
            if (data?.io) p.io = data.io;
          } catch (e) {}
        });

        await Promise.race([
          Promise.all(syncPromises),
          new Promise(r => setTimeout(r, 2200))
        ]);

        await saveState(state);

        return jsonResponse({
          type: 4,
          data: {
            content: `🔑 **Refreshed Keystones from Raider.IO!**\nUpdated ${updatedCount} member active keys.\nCheck the full lineup on the [web dashboard](${WEB_URL}).`
          }
        });
      }

      if (subcommand === 'form') {
        const attending = (state.players || []).filter(p => p.attending);
        if (attending.length < 5) {
          return jsonResponse({
            type: 4,
            data: {
              content: `⚠️ Need at least 5 attending players to form groups. Currently have ${attending.length}. Use \`/mplus signup\` or click the buttons to register!`,
              flags: 64
            }
          });
        }

        const result = solver ? solver.solveGroups(attending) : { groups: [], benched: [] };
        state.formedGroups = result.groups;
        state.benchedPlayers = result.benched;
        await saveState(state);

        const groupEmbeds = embeds ? embeds.createGroupEmbeds(result.groups, result.benched).map(e => e.toJSON()) : [];
        return jsonResponse({
          type: 4,
          data: {
            content: `🏰 **Formed ${result.groups.length} Mythic+ Group(s)!**`,
            embeds: groupEmbeds
          }
        });
      }

      if (subcommand === 'signup') {
        const subOpts = options[0].options || [];
        const getOpt = (n) => subOpts.find(o => o.name === n)?.value;

        const charName = getOpt('character');
        const roles = (getOpt('role') || 'DPS').split(',');
        const minKey = getOpt('min_key') || 6;
        const maxKey = getOpt('max_key') || 12;
        const keystone = getOpt('keystone') || '';
        const carryPref = getOpt('carry_pref') || 'none';
        const isShitter = getOpt('shitter') || false;

        let player = (state.players || []).find(p => p.name.toLowerCase() === charName.toLowerCase());
        const rIo = await lookupRaiderIo(charName);

        const newPlayer = {
          id: player?.id || `discord-${Date.now()}`,
          name: rIo?.name || charName,
          className: rIo?.className || player?.className || 'Warrior',
          realm: rIo?.realm || 'Perenolde',
          ilvl: rIo?.ilvl || player?.ilvl || 320,
          io: rIo?.io || player?.io || 0,
          roles,
          keyMin: minKey,
          keyMax: maxKey,
          ownedKey: keystone || rIo?.ownedKey || player?.ownedKey || '',
          attending: true,
          carryPreference: carryPref,
          isShitter: !!isShitter
        };

        if (player) {
          Object.assign(player, newPlayer);
        } else {
          state.players = state.players || [];
          state.players.push(newPlayer);
        }

        await saveState(state);

        return jsonResponse({
          type: 4,
          data: {
            content: `✅ Signed up **${newPlayer.name}** (${newPlayer.className}) as **${roles.join('/')}**! (ilvl: ${newPlayer.ilvl}, IO: ${newPlayer.io})\nSynced to [web dashboard](${WEB_URL}).`,
            flags: 64
          }
        });
      }
    }
  }

  // 4. Button Component Clicks (Type 3)
  if (interaction.type === 3) {
    const customId = interaction.data.custom_id;
    const discordUser = interaction.member?.user || interaction.user;
    const defaultName = discordUser?.global_name || discordUser?.username || 'Player';
    let player = (state.players || []).find(p =>
      (p.discordId && p.discordId === discordUser.id) ||
      (defaultName && p.name.toLowerCase() === defaultName.toLowerCase())
    );

    // Absent Button
    if (customId === 'btn_absent') {
      if (player) {
        player.attending = false;
        player.absent = true;
        await saveState(state);
        return jsonResponse({
          type: 4,
          data: {
            content: `💤 Marked **${player.name}** as absent for Friday night. We'll catch you next time!`,
            flags: 64
          }
        });
      }
      return jsonResponse({
        type: 4,
        data: {
          content: `Could not find an active sign-up for you. Click **[Sign Up / Edit RSVP 📝]** if you need to register!`,
          flags: 64
        }
      });
    }

    // 1. Open Interactive Sign-Up Form (Dropdowns)
    if (customId === 'btn_open_signup') {
      const components = embeds ? embeds.createSignupFormComponents({
        players: state.players || [],
        defaultName,
        player
      }) : [];

      return jsonResponse({
        type: 4,
        data: {
          content: `### 📝 Friday Mythic+ Night Sign-Up\nSelect your character from the guild roster, choose your role(s), key range, and preferences below:\n*(Only you can see this form)*`,
          components,
          flags: 64
        }
      });
    }

    // 2. Select Character Dropdown
    if (customId === 'select_character') {
      const selected = interaction.data.values?.[0];
      if (selected === '__custom__') {
        return jsonResponse({
          type: 9, // Modal for custom character name
          data: {
            custom_id: 'modal_signup_custom',
            title: 'Sign Up Custom / Alt Character',
            components: [
              {
                type: 1,
                components: [
                  { type: 4, custom_id: 'char_name', label: 'WoW Character Name (Perenolde)', style: 1, required: true }
                ]
              },
              {
                type: 1,
                components: [
                  { type: 4, custom_id: 'char_roles', label: 'Roles: Tank, Healer, DPS (comma separated)', style: 1, value: 'DPS', required: true }
                ]
              },
              {
                type: 1,
                components: [
                  { type: 4, custom_id: 'key_range', label: 'Comfortable Key Range (e.g. 10-15)', style: 1, value: '12-15', required: false }
                ]
              }
            ]
          }
        });
      }

      let targetPlayer = (state.players || []).find(p => p.name.toLowerCase() === (selected || '').toLowerCase());
      if (targetPlayer) {
        targetPlayer.discordId = discordUser.id;
        saveState(state).catch(() => {});
      } else if (selected && selected !== '__custom__') {
        targetPlayer = {
          id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: selected,
          className: 'Warrior',
          realm: 'Cenarius',
          roles: ['DPS'],
          keyMin: 10,
          keyMax: 12,
          keyBrackets: ['10-12'],
          attending: false,
          discordId: discordUser.id
        };
        state.players = state.players || [];
        state.players.push(targetPlayer);
        saveState(state).catch(() => {});
      }

      const components = embeds ? embeds.createSignupFormComponents({
        players: state.players || [],
        defaultName: selected,
        player: targetPlayer
      }) : [];

      return jsonResponse({
        type: 7, // UPDATE_MESSAGE
        data: {
          content: `### 📝 Friday Mythic+ Night Sign-Up\n✅ Character selected: **${selected}**\nNow select your role(s), key range, and preferences:`,
          components
        }
      });
    }

    // 3. Select Role(s) Multi-Select
    if (customId === 'select_roles') {
      const selectedRoles = interaction.data.values || ['DPS'];
      let targetPlayer = player || (state.players || []).find(p => p.discordId === discordUser.id);
      if (targetPlayer) {
        targetPlayer.roles = selectedRoles;
        saveState(state).catch(() => {});
      }
      const components = embeds ? embeds.createSignupFormComponents({
        players: state.players || [],
        defaultName,
        player: targetPlayer
      }) : [];
      return jsonResponse({
        type: 7,
        data: {
          content: `### 📝 Friday Mythic+ Night Sign-Up\n✅ Role(s) set to: **${selectedRoles.join('/')}**\nSelect your comfortable key range and preferences:`,
          components
        }
      });
    }

    // 4. Select Key Goals & Brackets Multi-Select
    if (customId === 'select_key_range') {
      const selectedBrackets = interaction.data.values || ['10-12'];
      let targetPlayer = player || (state.players || []).find(p => p.discordId === discordUser.id);
      if (targetPlayer) {
        targetPlayer.keyBrackets = selectedBrackets;
        let minKey = 10, maxKey = 12;
        if (selectedBrackets.includes('6-8')) { minKey = 6; maxKey = Math.max(maxKey, 8); }
        if (selectedBrackets.includes('10-12')) { minKey = Math.min(minKey, 10); maxKey = Math.max(maxKey, 12); }
        if (selectedBrackets.includes('12+')) { maxKey = Math.max(maxKey, 18); }
        targetPlayer.keyMin = minKey;
        targetPlayer.keyMax = maxKey;
        saveState(state).catch(() => {});
      }
      const components = embeds ? embeds.createSignupFormComponents({
        players: state.players || [],
        defaultName,
        player: targetPlayer
      }) : [];
      return jsonResponse({
        type: 7,
        data: {
          content: `### 📝 Friday Mythic+ Night Sign-Up\n✅ Key goals set to: **${selectedBrackets.join(', ')}** (+${targetPlayer?.keyMin || 10} to +${targetPlayer?.keyMax || 15})`,
          components
        }
      });
    }

    // 5. Select Squad Vibes & Preferences (Multi-Select)
    if (customId === 'select_vibes') {
      const vibes = interaction.data.values || [];
      let targetPlayer = player || (state.players || []).find(p => p.discordId === discordUser.id);
      if (targetPlayer) {
        targetPlayer.isLeader = vibes.includes('vibe_leader');
        targetPlayer.isReserve = vibes.includes('vibe_reserve');
        targetPlayer.carryPreference = vibes.includes('vibe_need_carry') ? 'need_carry' : (vibes.includes('vibe_willing_carry') ? 'willing_carry' : 'none');
        targetPlayer.isShitter = vibes.includes('vibe_shitter');
        saveState(state).catch(() => {});
      }
      const components = embeds ? embeds.createSignupFormComponents({
        players: state.players || [],
        defaultName,
        player: targetPlayer
      }) : [];
      let vibeTags = [];
      if (targetPlayer?.isLeader) vibeTags.push('👑 Born Leader');
      if (targetPlayer?.isReserve) vibeTags.push('🍺 Reserve');
      if (targetPlayer?.carryPreference === 'need_carry') vibeTags.push('🎒 Needs Carry');
      if (targetPlayer?.carryPreference === 'willing_carry') vibeTags.push('🏋️ Stronk Back');
      if (targetPlayer?.isShitter) vibeTags.push('💩 Shitter');

      return jsonResponse({
        type: 7,
        data: {
          content: `### 📝 Friday Mythic+ Night Sign-Up\n✅ Preferences updated: **${vibeTags.length ? vibeTags.join(', ') : 'Standard'}**\nClick **Save My RSVP ✅** to finish!`,
          components
        }
      });
    }

    // 6. Confirm & Save RSVP Button
    if (customId === 'btn_confirm_rsvp') {
      let rsvpPlayer = player || (state.players || []).find(p => p.discordId === discordUser.id);
      if (!rsvpPlayer) {
        return jsonResponse({
          type: 7,
          data: {
            content: '⚠️ Please select a character from the first dropdown before confirming!',
            components: embeds ? embeds.createSignupFormComponents({ players: state.players || [], defaultName, player: null }) : []
          }
        });
      }
      rsvpPlayer.attending = true;
      rsvpPlayer.absent = false;
      rsvpPlayer.discordId = discordUser.id;
      await saveState(state);

      let badges = [];
      if (rsvpPlayer.isLeader) badges.push('👑 Born Leader');
      if (rsvpPlayer.isReserve) badges.push('🍺 Voluntary Reserve');
      if (rsvpPlayer.carryPreference === 'need_carry') badges.push('🎒 Needs Carry');
      if (rsvpPlayer.carryPreference === 'willing_carry') badges.push('🏋️ Stronk Back');
      if (rsvpPlayer.isShitter) badges.push('💩 Shitter');

      return jsonResponse({
        type: 7,
        data: {
          content: `🎉 **RSVP Confirmed for ${rsvpPlayer.name}!**\n• Role(s): **${(rsvpPlayer.roles || []).join('/')}**\n• Keys: **+${rsvpPlayer.keyMin} to +${rsvpPlayer.keyMax}**${badges.length ? '\n• Preferences: ' + badges.join(', ') : ''}\n\nSynced to the [web dashboard](${WEB_URL})! Click **Refresh 🔄** on the main event card to view the updated roster lineup.`,
          components: []
        }
      });
    }

    // 7. Custom Alt Modal Button
    if (customId === 'btn_custom_modal') {
      return jsonResponse({
        type: 9,
        data: {
          custom_id: 'modal_signup_custom',
          title: 'Sign Up Custom / Alt Character',
          components: [
            {
              type: 1,
              components: [
                { type: 4, custom_id: 'char_name', label: 'WoW Character Name', style: 1, required: true }
              ]
            },
            {
              type: 1,
              components: [
                { type: 4, custom_id: 'char_roles', label: 'Roles: Tank, Healer, DPS (comma separated)', style: 1, value: 'DPS', required: true }
              ]
            },
            {
              type: 1,
              components: [
                { type: 4, custom_id: 'key_range', label: 'Comfortable Key Range (e.g. 10-15)', style: 1, value: '12-15', required: false }
              ]
            }
          ]
        }
      });
    }

    if (customId === 'btn_dismiss_form') {
      return jsonResponse({
        type: 7,
        data: { content: '👋 Closed sign-up form.', components: [] }
      });
    }

    if (customId === 'btn_form_groups') {
      const attending = (state.players || []).filter(p => p.attending);
      if (attending.length < 5) {
        return jsonResponse({
          type: 4,
          data: {
            content: `⚠️ Need at least 5 attending players to form groups. Currently have ${attending.length}. Click a role button to sign up!`,
            flags: 64
          }
        });
      }

      const result = solver ? solver.solveGroups(attending) : { groups: [], benched: [] };
      state.formedGroups = result.groups;
      state.benchedPlayers = result.benched;
      await saveState(state);

      const groupEmbeds = embeds ? embeds.createGroupEmbeds(result.groups, result.benched, WEB_URL).map(e => e.toJSON()) : [];
      return jsonResponse({
        type: 4,
        data: {
          content: `🏰 **Formed ${result.groups.length} Mythic+ Group(s) for Friday Night!**`,
          embeds: groupEmbeds
        }
      });
    }

    if (customId === 'btn_shitter') {
      if (player) {
        player.isShitter = !player.isShitter;
        await saveState(state);
        return jsonResponse({
          type: 4,
          data: { content: `💩 Shitter alt squad status: **${player.isShitter ? 'Yes! (Joined Shitter Squad)' : 'Standard'}**`, flags: 64 }
        });
      }
    }

    if (customId === 'btn_roll_key') {
      const attendees = (state.players || []).filter(p => p.attending);
      const heldKeys = attendees.filter(p => p.ownedKey && p.ownedKey.trim() !== '');
      const excluded = state.excludedDungeons || [];
      const roll = solver ? solver.rollKeystone({
        dungeonPool: solver.DUNGEONS_MIDNIGHT_S2,
        excludedDungeons: excluded,
        heldKeys,
        onlyHeld: false,
        targetLevel: null
      }) : { keyString: 'Murder Row +12', holders: [] };

      let holderText = (roll.holders && roll.holders.length > 0)
        ? `\n👜 **Held by:** ${roll.holders.join(', ')}`
        : `\n*(No attending member currently holds this exact key — push or reroll!)*`;

      return jsonResponse({
        type: 4,
        data: {
          content: `🎲 **Rolled Keystone:** \`${roll.keyString}\`${holderText}\nSynced with [web dashboard](${WEB_URL}).`
        }
      });
    }

    if (customId === 'btn_sync_keys') {
      const attendees = (state.players || []).filter(p => p.attending);
      if (attendees.length === 0) {
        return jsonResponse({
          type: 4,
          data: { content: '⚠️ No attending members to sync keys for!', flags: 64 }
        });
      }

      let count = 0;
      const syncBatch = attendees.slice(0, 8);
      await Promise.race([
        Promise.all(syncBatch.map(async p => {
          try {
            const data = await lookupRaiderIo(p.name, p.realm || 'Perenolde');
            if (data?.ownedKey) {
              p.ownedKey = data.ownedKey;
              count++;
            }
          } catch (e) {}
        })),
        new Promise(r => setTimeout(r, 2200))
      ]);
      await saveState(state);
      return jsonResponse({
        type: 4,
        data: {
          content: `🔑 **Refreshed active keystones from Raider.IO!** (${count} keys updated)\nView updated roster on the [web dashboard](${WEB_URL}).`
        }
      });
    }

    if (customId === 'btn_refresh_roster') {
      const embed = embeds ? embeds.createRosterEmbed(state.players || [], WEB_URL).toJSON() : { title: 'Roster' };
      const buttons = embeds ? embeds.createSignupButtons(WEB_URL).map(r => r.toJSON()) : [];
      return jsonResponse({
        type: 7, // UPDATE_MESSAGE
        data: {
          embeds: [embed],
          components: buttons
        }
      });
    }

    return jsonResponse({
      type: 4,
      data: { content: '⚠️ Please click a role button (Tank, Healer, or DPS) first to sign up your character!', flags: 64 }
    });
  }

  // 5. Modal Submissions (Type 5)
  if (interaction.type === 5) {
    const customId = interaction.data.custom_id;
    const components = interaction.data.components || [];
    const getVal = (cid) => components.flatMap(c => c.components || []).find(x => x.custom_id === cid)?.value;
    const discordUser = interaction.member?.user || interaction.user;

    // Handle Custom / Alt Character Modal Submit
    if (customId === 'modal_signup_custom' || customId === 'modal_custom_signup') {
      const charName = getVal('char_name');
      const rolesStr = getVal('char_roles') || 'DPS';
      const keyRangeStr = getVal('key_range') || '10-12';
      const roles = rolesStr.split(/[,/ ]+/).filter(Boolean);

      let [minK, maxK] = [10, 12];
      const match = keyRangeStr.match(/(\d+)\s*[-–to ]+\s*(\d+)/i);
      if (match) {
        minK = parseInt(match[1], 10);
        maxK = parseInt(match[2], 10);
      }

      let rIo = null;
      try {
        rIo = await lookupRaiderIo(charName);
      } catch (e) {}

      let player = (state.players || []).find(p => p.name.toLowerCase() === (charName || '').toLowerCase());
      const playerRecord = {
        id: player?.id || `discord-${Date.now()}`,
        discordId: discordUser.id,
        name: rIo?.name || charName,
        className: rIo?.className || player?.className || 'Warrior',
        realm: rIo?.realm || player?.realm || 'Perenolde',
        ilvl: rIo?.ilvl || player?.ilvl || 320,
        io: rIo?.io || player?.io || 0,
        roles: roles.length ? roles : ['DPS'],
        keyMin: minK,
        keyMax: maxK,
        keyBrackets: maxK > 12 ? ['12+'] : (maxK >= 10 ? ['10-12'] : ['6-8']),
        ownedKey: rIo?.ownedKey || player?.ownedKey || '',
        attending: true,
        carryPreference: player?.carryPreference || 'none',
        isShitter: !!player?.isShitter,
        isLeader: !!player?.isLeader,
        isReserve: !!player?.isReserve
      };

      if (player) {
        Object.assign(player, playerRecord);
      } else {
        state.players = state.players || [];
        state.players.push(playerRecord);
      }

      await saveState(state);

      return jsonResponse({
        type: 4,
        data: {
          content: `🎉 Registered custom character **${playerRecord.name}** (${playerRecord.className}) as **${playerRecord.roles.join('/')}**!\n- **Item Level:** ${playerRecord.ilvl} | **IO:** ${playerRecord.io.toLocaleString()}\n- **Key Range:** +${playerRecord.keyMin} to +${playerRecord.keyMax}${playerRecord.ownedKey ? ` | 🔑 ${playerRecord.ownedKey}` : ''}\nSynced with the [live web app](${WEB_URL})!`,
          flags: 64
        }
      });
    }

    if (customId.startsWith('modal_signup_')) {
      const role = customId.replace('modal_signup_', '');
      const charName = getVal('char_name');
      const keyRangeStr = getVal('key_range') || '8-14';
      const manualKey = getVal('owned_key');

      let [minK, maxK] = keyRangeStr.split('-').map(s => parseInt(s.trim()));
      if (isNaN(minK)) minK = 6;
      if (isNaN(maxK)) maxK = 12;

      const rIo = await lookupRaiderIo(charName);

      let player = (state.players || []).find(p => p.name.toLowerCase() === (charName || '').toLowerCase());
      const playerRecord = {
        id: player?.id || `discord-${Date.now()}`,
        discordId: discordUser.id,
        name: rIo?.name || charName,
        className: rIo?.className || player?.className || 'Warrior',
        realm: rIo?.realm || 'Perenolde',
        ilvl: rIo?.ilvl || player?.ilvl || 320,
        io: rIo?.io || player?.io || 0,
        roles: [role],
        keyMin: minK,
        keyMax: maxK,
        ownedKey: manualKey || rIo?.ownedKey || player?.ownedKey || 'Murder Row +10',
        attending: true,
        carryPreference: player?.carryPreference || 'none',
        isShitter: !!player?.isShitter
      };

      if (player) {
        Object.assign(player, playerRecord);
      } else {
        state.players = state.players || [];
        state.players.push(playerRecord);
      }

      await saveState(state);

      return jsonResponse({
        type: 4,
        data: {
          content: `🎉 Registered **${playerRecord.name}** (${playerRecord.className}) as **${role}**!\n- **Item Level:** ${playerRecord.ilvl} | **IO:** ${playerRecord.io}\n- **Keystone:** ${playerRecord.ownedKey}\nSynced with the [live web app](${WEB_URL})!`,
          flags: 64
        }
      });
    }
  }

  return { statusCode: 200, body: JSON.stringify({ type: 1 }) };
};

function jsonResponse(obj) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  };
}
