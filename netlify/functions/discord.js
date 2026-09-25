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
const rosterSearch = loadModule('roster-search');
const rollUi = loadModule('roll-ui');
const liveState = require('./live-state');

function bindSignupCharacter(state, discordUser, rawName) {
  if (!rosterSearch) return null;
  return rosterSearch.attachCharacter(state, discordUser?.id, rawName);
}

function signupPreferencesMessage(player) {
  return {
    content: `### 📝 Friday Mythic+ Night Sign-Up\nCharacter: **${player.name}** (${player.className}${player.realm ? ` — ${player.realm}` : ''})\nPick one or more roles, key goals (**6-8 Hero Crest**, **10-12 Vault**, **Higher than 12 IO**), and vibes, then **Save My RSVP**.`,
    components: embeds ? embeds.createSignupFormComponents({ player }) : []
  };
}

function signupMatchMessage(result) {
  const count = result?.matchCount || 0;
  const label = result?.typedName ? `**${result.typedName}**` : 'that name';
  return {
    content: count
      ? `### 📝 Find Your Character\n${count} guild match${count === 1 ? '' : 'es'} for ${label}. Pick one, or use the name even if they are not in the guild.`
      : `### 📝 Find Your Character\nNo guild match for ${label}. Pick **not in guild** to sign that name up anyway, or search again.`,
    components: embeds ? embeds.createCharacterMatchComponents(result?.matches || [], result?.typedName || '') : [],
    flags: 64
  };
}

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

// The lambda event for this invocation. Strong blob reads must not use a warm cache.
let activeLambdaEvent = null;

function touchPlayer(player) {
  if (!player) return player;
  player.touchedAt = new Date().toISOString();
  return player;
}

function rememberDiscordCard(interaction, state) {
  const message = interaction.message;
  const flags = message?.flags || 0;
  const isEphemeral = (flags & 64) === 64;
  const channelId = interaction.channel_id || interaction.channel?.id;
  if (!message?.id || !channelId || isEphemeral) return;
  state.discordCard = {
    channelId,
    messageId: message.id,
    applicationId: interaction.application_id || null
  };
}

async function loadState() {
  try {
    const live = await liveState.readLiveState(activeLambdaEvent);
    if (live && Array.isArray(live.players)) return live;
  } catch (err) {
    console.error('[Discord] Could not read shared state:', err.message);
  }

  return {
    players: JSON.parse(JSON.stringify(INITIAL_ROSTER)),
    formedGroups: [],
    benchedPlayers: [],
    lastUpdated: new Date().toISOString()
  };
}

async function saveState(data) {
  const saved = await liveState.writeMergedState(activeLambdaEvent, data);
  liveState.updateDiscordCard(saved).catch(err => {
    console.error('[Discord] Card refresh failed:', err.message);
  });
  return saved;
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
    const carried = loadModule('keystone')?.keystoneAfterRun(recent);

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
    return null;
  }
}

exports.handler = async (event, context) => {
  activeLambdaEvent = event;
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

    const query = focusedOption?.value || '';
    let choices = [];

    try {
      const result = rosterSearch ? rosterSearch.searchGuildRoster(query, 24) : { matches: [], exact: null, typedName: query };
      choices = (result.matches || []).map(entry => ({
        name: `${entry.name} (${entry.className || 'Player'} - ${entry.realm || 'Guild'})`.slice(0, 100),
        value: entry.name.slice(0, 100)
      }));
      if (result.typedName && !result.exact) {
        choices.unshift({
          name: `➕ "${result.typedName}" (not in guild)`.slice(0, 100),
          value: result.typedName.slice(0, 100)
        });
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
        const embed = embeds ? embeds.createRosterEmbed(state.players || [], WEB_URL, 'MadKing', state.formedGroups || [], state.benchedPlayers || []).toJSON() : { title: 'Roster' };
        return jsonResponse({
          type: 4,
          data: { embeds: [embed] }
        });
      }

      if (subcommand === 'post-signup') {
        const embed = embeds ? embeds.createRosterEmbed(state.players || [], WEB_URL, 'MadKing', state.formedGroups || [], state.benchedPlayers || []).toJSON() : { title: 'Roster' };
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
        if (!rollUi?.isLeader(interaction.member)) {
          return jsonResponse({
            type: 4,
            data: { content: 'Only Captains and High Council can clear groups.', flags: 64 }
          });
        }
        state.formedGroups = [];
        state.benchedPlayers = [];
        state.groupsTouchedAt = new Date().toISOString();
        await saveState(state);
        return jsonResponse({
          type: 4,
          data: {
            content: '🧹 Formed groups cleared! Roster sign-ups are preserved.'
          }
        });
      }

      if (subcommand === 'roll-key') {
        const panel = rollUi ? rollUi.rollPanel(state, interaction) : { content: 'Key rolling is unavailable right now.', components: [], flags: 64 };
        return jsonResponse({ type: 4, data: panel });
      }

      if (subcommand === 'leaderboard') {
        const subOpts = options?.[0]?.options || [];
        const viewMode = subOpts.find(o => o.name === 'view')?.value || 'auto';
        const engine = loadModule('leaderboard-engine');
        const forceLive = viewMode === 'live';
        const standings = engine
          ? engine.computeLeaderboardStandings(state.players, state, forceLive)
          : [];
        const embed = embeds ? embeds.createLeaderboardEmbed(standings, WEB_URL).toJSON() : { title: 'Leaderboard' };
        const components = embeds ? embeds.createLeaderboardButtons(WEB_URL).map(r => r.toJSON ? r.toJSON() : r) : [];
        return jsonResponse({
          type: 4,
          data: {
            embeds: [embed],
            components
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
            if (data?.io) updatedCount++;
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
        if (!rollUi?.isLeader(interaction.member)) {
          return jsonResponse({
            type: 4,
            data: { content: 'Only Captains and High Council can form groups. Use `/mplus form` if you have one of those roles.', flags: 64 }
          });
        }
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
    rememberDiscordCard(interaction, state);

    if (customId === 'roll_pick_group' || customId.startsWith('roll_exclude:') || customId.startsWith('roll_go:')) {
      if (!rollUi) {
        return jsonResponse({ type: 4, data: { content: 'Key rolling is unavailable right now.', flags: 64 } });
      }
      if (customId === 'roll_pick_group') {
        const groupIndex = parseInt(interaction.data.values?.[0], 10);
        const panel = rollUi.rollPanel(state, interaction, groupIndex);
        return jsonResponse({ type: 7, data: panel });
      }
      if (customId.startsWith('roll_exclude:')) {
        const groupIndex = parseInt(customId.split(':')[1], 10);
        rollUi.applyExclusions(state, interaction, groupIndex, interaction.data.values || []);
        await saveState(state);
        const panel = rollUi.rollPanel(state, interaction, groupIndex);
        return jsonResponse({ type: 7, data: panel });
      }
      const groupIndex = parseInt(customId.split(':')[1], 10);
      const result = rollUi.rollGroupKey(state, interaction, groupIndex);
      if (result.error) {
        return jsonResponse({ type: 4, data: { content: result.error, flags: 64 } });
      }
      await saveState(state);
      return jsonResponse({
        type: 7,
        data: {
          content: `🎲 **Group ${groupIndex + 1} rolled ${result.key}**, held by **${result.holder}**.`,
          components: []
        }
      });
    }
    let player = (state.players || []).find(p =>
      (p.discordId && p.discordId === discordUser.id) ||
      (defaultName && p.name.toLowerCase() === defaultName.toLowerCase())
    );

    // Leaderboard interactive buttons
    if (customId === 'btn_leaderboard_refresh') {
      const engine = loadModule('leaderboard-engine');
      const standings = engine ? engine.computeLeaderboardStandings(state.players, state) : [];
      const embed = embeds ? embeds.createLeaderboardEmbed(standings, WEB_URL).toJSON() : { title: 'Leaderboard' };
      const components = embeds ? embeds.createLeaderboardButtons(WEB_URL).map(r => r.toJSON ? r.toJSON() : r) : [];
      return jsonResponse({
        type: 7,
        data: {
          embeds: [embed],
          components
        }
      });
    }

    if (customId === 'btn_leaderboard_rules') {
      return jsonResponse({
        type: 4,
        data: {
          content: '### 📜 Kith & Kin Participation Scoring Code\n' +
                   '• **Attendance:** +15 pts per Mythic+ night attended\n' +
                   '• **Keys Completed:** +10 pts (+5 bonus if timed, +2 pts per level above +10)\n' +
                   '• **Role Versatility:** +5 pts for Dual Flex (Tank/DPS, etc.), +10 pts for Triple Flex (Tank/Healer/DPS)\n' +
                   '• **Born Leader (👑):** +8 pts per night volunteered to lead\n' +
                   '• **Stonk Back (🏋️):** +8 pts per night volunteered "My back is stronk"\n' +
                   '• **Carry Shepherd (🎒):** +15 pts per key run with guildies who need a carry\n\n' +
                   `View the live interactive leaderboard: <${WEB_URL}/leaderboard.html>`,
          flags: 64
        }
      });
    }

    // Absent Button
    if (customId === 'btn_absent') {
      if (player) {
        player.attending = false;
        player.absent = true;
        touchPlayer(player);
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

    // 1. Open character search. Discord selects cap at 25, so typing filters the full roster.
    if (customId === 'btn_open_signup' || customId === 'btn_search_again' || customId === 'btn_custom_modal') {
      const prefill = player?.name || '';
      return jsonResponse({
        type: 9,
        data: rosterSearch ? rosterSearch.characterSearchModal(prefill) : {
          custom_id: 'modal_char_search',
          title: 'Find Your Character',
          components: [{
            type: 1,
            components: [{
              type: 4,
              custom_id: 'char_query',
              label: 'Type a guild name, or any alt',
              style: 1,
              required: true
            }]
          }]
        }
      });
    }

    // 2. Pick a filtered match, or a name that is not in the guild.
    if (customId === 'select_character') {
      const selected = interaction.data.values?.[0] || '';
      if (selected === '__custom__') {
        return jsonResponse({
          type: 9,
          data: rosterSearch ? rosterSearch.characterSearchModal('') : {
            custom_id: 'modal_char_search',
            title: 'Find Your Character',
            components: []
          }
        });
      }

      const chosenName = selected.startsWith('__custom__:') ? selected.slice('__custom__:'.length) : selected;
      const targetPlayer = bindSignupCharacter(state, discordUser, chosenName);
      if (!targetPlayer) {
        return jsonResponse({
          type: 4,
          data: { content: '⚠️ Type a character name to search the guild roster.', flags: 64 }
        });
      }
      touchPlayer(targetPlayer);
      await saveState(state);
      return jsonResponse({
        type: 7,
        data: signupPreferencesMessage(targetPlayer)
      });
    }

    // 3. Select Role(s) Multi-Select
    if (customId === 'select_roles') {
      const selectedRoles = interaction.data.values || ['DPS'];
      let targetPlayer = player || (state.players || []).find(p => p.discordId === discordUser.id);
      if (targetPlayer) {
        targetPlayer.roles = selectedRoles;
        targetPlayer.attending = true;
        targetPlayer.absent = false;
        touchPlayer(targetPlayer);
        await saveState(state);
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
        let minKey = 30;
        let maxKey = 2;
        if (selectedBrackets.includes('6-8')) { minKey = Math.min(minKey, 6); maxKey = Math.max(maxKey, 8); }
        if (selectedBrackets.includes('10-12')) { minKey = Math.min(minKey, 10); maxKey = Math.max(maxKey, 12); }
        if (selectedBrackets.includes('12+')) { minKey = Math.min(minKey, 13); maxKey = Math.max(maxKey, 18); }
        targetPlayer.keyMin = minKey;
        targetPlayer.keyMax = maxKey;
        targetPlayer.attending = true;
        targetPlayer.absent = false;
        touchPlayer(targetPlayer);
        await saveState(state);
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
        targetPlayer.attending = true;
        targetPlayer.absent = false;
        touchPlayer(targetPlayer);
        await saveState(state);
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
            content: '⚠️ Search for a character name before confirming!',
            components: embeds ? embeds.createSignupFormComponents({ players: state.players || [], defaultName, player: null }) : []
          }
        });
      }
      rsvpPlayer.attending = true;
      rsvpPlayer.absent = false;
      rsvpPlayer.discordId = discordUser.id;
      touchPlayer(rsvpPlayer);
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

    if (customId === 'btn_dismiss_form') {
      return jsonResponse({
        type: 7,
        data: { content: '👋 Closed sign-up form.', components: [] }
      });
    }

    if (customId === 'btn_form_groups') {
      if (!rollUi?.isLeader(interaction.member)) {
        return jsonResponse({
          type: 4,
          data: { content: 'Only Captains and High Council can form groups. Use `/mplus form`.', flags: 64 }
        });
      }
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
      state.groupsTouchedAt = new Date().toISOString();
      await saveState(state);

      const embed = embeds
        ? embeds.createRosterEmbed(state.players || [], WEB_URL, 'MadKing', result.groups, result.benched).toJSON()
        : { title: 'Groups formed' };
      const buttons = embeds ? embeds.createSignupButtons(WEB_URL).map(row => row.toJSON()) : [];
      return jsonResponse({
        type: 7,
        data: {
          content: `🏰 **Formed ${result.groups.length} Mythic+ group(s).** Parties are on this card. Roll each party's key on the website.`,
          embeds: [embed],
          components: buttons
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
      const panel = rollUi ? rollUi.rollPanel(state, interaction) : { content: 'Key rolling is unavailable right now.', components: [], flags: 64 };
      return jsonResponse({ type: 4, data: panel });
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
            if (data?.io) count++;
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
      const live = await liveState.readLiveState(activeLambdaEvent);
      const view = liveState.reconcileState(live || { players: [], formedGroups: [], benchedPlayers: [] });
      liveState.updateDiscordCard(view).catch(err => {
        console.error('[Discord] Card refresh failed:', err.message);
      });
      const embed = embeds ? embeds.createRosterEmbed(view.players || [], WEB_URL, 'MadKing', view.formedGroups || [], view.benchedPlayers || []).toJSON() : { title: 'Roster' };
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

    if (customId === 'modal_char_search') {
      const query = (getVal('char_query') || '').trim();
      const result = rosterSearch
        ? rosterSearch.searchGuildRoster(query, 24)
        : { typedName: query, matches: [], exact: null, autoPick: null, matchCount: 0 };

      if (result.autoPick || result.matchCount === 0) {
        const chosen = result.autoPick?.name || result.typedName;
        const targetPlayer = bindSignupCharacter(state, discordUser, chosen);
        if (!targetPlayer) {
          return jsonResponse({
            type: 4,
            data: { content: '⚠️ Type a character name to search the guild roster.', flags: 64 }
          });
        }
        await saveState(state);
        return jsonResponse({
          type: 4,
          data: { ...signupPreferencesMessage(targetPlayer), flags: 64 }
        });
      }

      return jsonResponse({
        type: 4,
        data: signupMatchMessage(result)
      });
    }

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
