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
const liveState = require('./lib/live-state');

function foldName(value) {
  return String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

// A character belongs to whoever claimed it first (Discord or Battle.net). Others cannot edit it.
function claimError(player, discordUserId) {
  if (!player) return null;
  if (player.discordId && player.discordId !== discordUserId) {
    return `**${player.name}** is already claimed by another Discord member. Ask an officer if that is wrong.`;
  }
  if (!player.discordId && player.bnetId) {
    return `**${player.name}** was signed up through Battle.net. Edit it on the website: ${WEB_URL}/signup.html`;
  }
  return null;
}

function findPlayerByName(state, name) {
  const folded = foldName(name);
  return (state.players || []).find(p => foldName(p.name) === folded) || null;
}

// The character this Discord member most recently claimed.
function findOwnPlayer(state, discordUserId) {
  if (!discordUserId) return null;
  return (state.players || [])
    .filter(p => p.discordId === discordUserId)
    .sort((a, b) => (Date.parse(b.touchedAt || '') || 0) - (Date.parse(a.touchedAt || '') || 0))[0] || null;
}

function bindSignupCharacter(state, discordUser, rawName) {
  if (!rosterSearch) return null;
  const typed = String(rawName || '').replace(/^__custom__:?/, '').trim();
  const rosterHit = rosterSearch.findRosterEntry(typed);
  const existing = findPlayerByName(state, rosterHit?.name || typed);
  const error = claimError(existing, discordUser?.id);
  if (error) return { error };
  return rosterSearch.attachCharacter(state, discordUser?.id, rawName);
}

function ephemeral(content) {
  return jsonResponse({ type: 4, data: { content, flags: 64 } });
}

function signupPreferencesMessage(player) {
  return {
    content: `### 📝 Friday Mythic+ Night Sign-Up\nCharacter: **${player.name}** (${player.className}${player.realm ? ` — ${player.realm}` : ''})\nPick one or more roles, key goals (**6-8 Hero Crests**, **9-12 Myth Crests & Vault**, **12+ Score Push**), and vibes, then **Save My RSVP**.`,
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

// Throws when storage is unreachable so we never save a blank roster over the real one.
async function loadState() {
  const live = await liveState.readLiveState(activeLambdaEvent);
  if (live && Array.isArray(live.players)) return live;
  return { players: [], formedGroups: [], benchedPlayers: [], lastUpdated: new Date().toISOString() };
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
async function lookupRaiderIo(name, realm = 'Perenolde', region = 'us', timeoutMs = 1200) {
  try {
    const cleanName = encodeURIComponent(name.trim());
    const cleanRealm = encodeURIComponent(realm.trim().toLowerCase().replace(/\s+/g, '-').replace(/'/g, ''));
    const url = `https://raider.io/api/v1/characters/profile?region=${region}&realm=${cleanRealm}&name=${cleanName}&fields=gear,mythic_plus_scores_by_season:current,mythic_plus_recent_runs,mythic_plus_best_runs`;
    // Discord gives us 3 seconds to answer; never wait long on Raider.IO.
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const data = await res.json();
    const seasonData = Array.isArray(data.mythic_plus_scores_by_season)
      ? data.mythic_plus_scores_by_season[0]
      : data.mythic_plus_scores_by_season;

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

// Raider.IO cannot see the keystone in someone's bags, so this only refreshes IO and item level.
async function refreshAttendeeScores(state) {
  const attendees = (state.players || []).filter(p => p.attending);
  const batch = attendees.slice(0, 10);
  let updated = 0;
  await Promise.all(batch.map(async p => {
    const data = await lookupRaiderIo(p.name, p.realm || 'Perenolde', p.region || 'us', 1200);
    if (!data) return;
    if (data.ilvl) p.ilvl = data.ilvl;
    if (data.io) p.io = data.io;
    if (data.ilvl || data.io) {
      updated++;
      touchPlayer(p);
    }
  }));
  return { attendees: attendees.length, tried: batch.length, updated };
}

function refreshScoresMessage(result) {
  const more = result.attendees > result.tried ? ` (first ${result.tried} of ${result.attendees}; refresh the rest on the website)` : '';
  return `📈 **Refreshed Raider.IO score and item level for ${result.updated} member(s)**${more}.\nKeystones can't be read from Raider.IO — type yours on the [signup page](${WEB_URL}/signup.html).`;
}

function leaderboardMessage(state, viewMode = 'auto') {
  const engine = loadModule('leaderboard-engine');
  const players = state.players || [];
  const totalRuns = players.reduce((sum, p) => sum + (Array.isArray(p.runLog) ? p.runLog.length : 0), 0);
  const demo = viewMode === 'demo' || (viewMode !== 'live' && totalRuns < 10);
  const standings = engine
    ? (demo ? engine.computeLeaderboardStandings(engine.DEMO_PLAYERS) : engine.computeLeaderboardStandings(players, state, true))
    : [];
  const embed = embeds ? embeds.createLeaderboardEmbed(standings, WEB_URL, { demo }).toJSON() : { title: 'Leaderboard' };
  const components = embeds ? embeds.createLeaderboardButtons(WEB_URL, viewMode).map(r => r.toJSON ? r.toJSON() : r) : [];
  return { embed, components };
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

  let state;
  try {
    state = await loadState();
  } catch (err) {
    console.error('[Discord] Could not read shared state:', err.message);
    return jsonResponse({ type: 4, data: { content: '⚠️ The roster storage did not answer. Try again in a moment.', flags: 64 } });
  }

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
        const embed = embeds ? embeds.createRosterEmbed(state.players || [], WEB_URL, undefined, state.formedGroups || [], state.benchedPlayers || []).toJSON() : { title: 'Roster' };
        return jsonResponse({
          type: 4,
          data: { embeds: [embed] }
        });
      }

      if (subcommand === 'post-signup') {
        const embed = embeds ? embeds.createRosterEmbed(state.players || [], WEB_URL, undefined, state.formedGroups || [], state.benchedPlayers || []).toJSON() : { title: 'Roster' };
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
        const { embed, components } = leaderboardMessage(state, viewMode);
        return jsonResponse({
          type: 4,
          data: {
            embeds: [embed],
            components
          }
        });
      }

      if (subcommand === 'sync-keys') {
        if (!(state.players || []).some(p => p.attending)) {
          return ephemeral('⚠️ Nobody is signed up yet. Use `/mplus signup` or the sign-up card first.');
        }
        const result = await refreshAttendeeScores(state);
        if (result.updated) await saveState(state);
        return jsonResponse({ type: 4, data: { content: refreshScoresMessage(result), flags: 64 } });
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

        const formOpts = options?.[0]?.options || [];
        const avoidDupes = formOpts.find(o => o.name === 'avoid_dupes')?.value;
        const result = solver
          ? solver.solveGroups({ players: attending, avoidClassDupes: avoidDupes !== false, excludedDungeons: state.excludedDungeons || [] })
          : { groups: [], benched: [] };
        if (!result.groups.length) {
          return ephemeral(`⚠️ ${result.message || 'Could not form any groups.'}`);
        }
        state.formedGroups = result.groups;
        state.benchedPlayers = result.benched;
        state.groupsTouchedAt = new Date().toISOString();
        await saveState(state);

        // One embed keeps us under Discord's 10-embed / 6000-character message limits.
        const embed = embeds
          ? embeds.createRosterEmbed(state.players || [], WEB_URL, undefined, result.groups, result.benched).toJSON()
          : { title: 'Groups formed' };
        return jsonResponse({
          type: 4,
          data: {
            content: `🏰 **Formed ${result.groups.length} Mythic+ group(s).**${result.benched.length ? ` ${result.benched.length} on the bench.` : ''}`,
            embeds: [embed]
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

        const signupUserId = (interaction.member?.user || interaction.user)?.id;
        let player = findPlayerByName(state, charName);
        const signupClaim = claimError(player, signupUserId);
        if (signupClaim) return ephemeral(`⚠️ ${signupClaim}`);
        const rosterEntry = rosterSearch ? rosterSearch.findRosterEntry(charName) : null;
        const rIo = await lookupRaiderIo(charName, player?.realm || rosterEntry?.realm || 'Perenolde');

        const newPlayer = {
          id: player?.id || `discord-${Date.now()}`,
          name: rIo?.name || charName,
          className: rIo?.className || player?.className || 'Warrior',
          realm: rIo?.realm || player?.realm || rosterEntry?.realm || 'Perenolde',
          ilvl: rIo?.ilvl || player?.ilvl || 0,
          io: rIo?.io || player?.io || 0,
          discordId: signupUserId,
          touchedAt: new Date().toISOString(),
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
    let player = findOwnPlayer(state, discordUser?.id);

    // Leaderboard interactive buttons
    if (customId === 'btn_leaderboard_refresh' || customId.startsWith('btn_leaderboard_refresh:')) {
      const { embed, components } = leaderboardMessage(state, customId.split(':')[1] || 'auto');
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
                   '• **Stronk Back (🏋️):** +8 pts per night volunteered "My back is stronk"\n' +
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
      if (targetPlayer?.error) return ephemeral(`⚠️ ${targetPlayer.error}`);
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
        if (selectedBrackets.includes('10-12')) { minKey = Math.min(minKey, 9); maxKey = Math.max(maxKey, 12); }
        if (selectedBrackets.includes('12+')) { minKey = Math.min(minKey, 12); maxKey = Math.max(maxKey, 18); }
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

      const result = solver ? solver.solveGroups({ players: attending, excludedDungeons: state.excludedDungeons || [] }) : { groups: [], benched: [] };
      if (!result.groups.length) {
        return ephemeral(`⚠️ ${result.message || 'Could not form any groups.'}`);
      }
      state.formedGroups = result.groups;
      state.benchedPlayers = result.benched;
      state.groupsTouchedAt = new Date().toISOString();
      await saveState(state);

      const embed = embeds
        ? embeds.createRosterEmbed(state.players || [], WEB_URL, undefined, result.groups, result.benched).toJSON()
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
        touchPlayer(player);
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

    // Older cards still show this button.
    if (customId === 'btn_sync_keys') {
      if (!(state.players || []).some(p => p.attending)) return ephemeral('⚠️ Nobody is signed up yet.');
      const result = await refreshAttendeeScores(state);
      if (result.updated) await saveState(state);
      return ephemeral(refreshScoresMessage(result));
    }

    if (customId === 'btn_refresh_roster') {
      const live = await liveState.readLiveState(activeLambdaEvent);
      const view = liveState.reconcileState(live || { players: [], formedGroups: [], benchedPlayers: [] });
      liveState.updateDiscordCard(view).catch(err => {
        console.error('[Discord] Card refresh failed:', err.message);
      });
      const embed = embeds ? embeds.createRosterEmbed(view.players || [], WEB_URL, undefined, view.formedGroups || [], view.benchedPlayers || []).toJSON() : { title: 'Roster' };
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
      data: { content: '⚠️ Click **Sign Up / Edit RSVP 📝** first to pick your character.', flags: 64 }
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
        if (targetPlayer?.error) return ephemeral(`⚠️ ${targetPlayer.error}`);
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

    return ephemeral('⚠️ That form has expired. Click **Sign Up / Edit RSVP 📝** again.');
  }

  return ephemeral('⚠️ Unknown action. Try the buttons on the latest sign-up card.');
};

function jsonResponse(obj) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  };
}
