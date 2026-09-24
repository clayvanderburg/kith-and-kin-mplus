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

const TMP_FILE = path.join('/tmp', 'kk_mplus_state.json');
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || '66f468e2962fddf5f6c25d675f66df3970d481be92cc350c30358a12dfe527bb';
const WEB_URL = process.env.WEB_URL || 'https://knkmplus.netlify.app';

// Fast in-memory cache for warm lambdas
let memoryState = null;

async function loadState() {
  if (memoryState && Array.isArray(memoryState.players) && memoryState.players.length > 0) {
    return memoryState;
  }

  const fs = require('fs');
  if (fs.existsSync(TMP_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(TMP_FILE, 'utf8'));
      if (parsed && Array.isArray(parsed.players) && parsed.players.length > 0) {
        memoryState = parsed;
        return parsed;
      }
    } catch (e) {}
  }

  // Fast fetch from /api/state with strict 1.2s timeout
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${WEB_URL}/api/state`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.players) && data.players.length > 0) {
        memoryState = data;
        return data;
      }
    }
  } catch (e) {}

  return memoryState || { players: [], formedGroups: [], benchedPlayers: [] };
}

async function saveState(data) {
  memoryState = data;
  data.lastUpdated = new Date().toISOString();

  const fs = require('fs');
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}

  // Sync to /api/state in background with 1.2s timeout
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    await fetch(`${WEB_URL}/api/state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-secret': 'kith_and_kin_mythic_key_2026'
      },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    clearTimeout(timeout);
  } catch (e) {}
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

    // Show modal if registering for a role
    if (customId.startsWith('btn_role_')) {
      const role = customId.replace('btn_role_', '');
      return jsonResponse({
        type: 9, // MODAL
        data: {
          custom_id: `modal_signup_${role}`,
          title: `Sign Up as ${role}`,
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'char_name',
                  label: 'WoW Character Name (Perenolde)',
                  style: 1,
                  placeholder: 'e.g. MadKing',
                  required: true,
                  value: defaultName
                }
              ]
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'key_range',
                  label: 'Comfortable Key Range (Min - Max)',
                  style: 1,
                  placeholder: 'e.g. 8-14',
                  required: false,
                  value: '8-14'
                }
              ]
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'owned_key',
                  label: 'Active Keystone (Dungeon & Level)',
                  style: 1,
                  placeholder: 'e.g. Murder Row +12 (or leave blank to auto-fetch)',
                  required: false
                }
              ]
            }
          ]
        }
      });
    }

    // Toggle Preferences / Absent
    let player = (state.players || []).find(p =>
      p.name.toLowerCase() === defaultName.toLowerCase() ||
      p.discordId === discordUser.id
    );

    if (customId === 'btn_absent') {
      if (player) {
        player.attending = false;
        await saveState(state);
      }
      return jsonResponse({
        type: 4,
        data: { content: '💤 Marked as absent.', flags: 64 }
      });
    }

    if (customId === 'btn_need_carry') {
      if (player) {
        player.carryPreference = player.carryPreference === 'need_carry' ? 'none' : 'need_carry';
        await saveState(state);
        return jsonResponse({
          type: 4,
          data: { content: `🎒 Carry preference set: **${player.carryPreference === 'need_carry' ? 'I need a carry' : 'None'}**`, flags: 64 }
        });
      }
    }

    if (customId === 'btn_stronk_carry') {
      if (player) {
        player.carryPreference = player.carryPreference === 'willing_carry' ? 'none' : 'willing_carry';
        await saveState(state);
        return jsonResponse({
          type: 4,
          data: { content: `🏋️ Carry preference set: **${player.carryPreference === 'willing_carry' ? 'My back is stronk (willing to carry)' : 'None'}**`, flags: 64 }
        });
      }
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
    if (customId.startsWith('modal_signup_')) {
      const role = customId.replace('modal_signup_', '');
      const components = interaction.data.components;
      const getVal = (cid) => components.flatMap(c => c.components).find(x => x.custom_id === cid)?.value;

      const charName = getVal('char_name');
      const keyRangeStr = getVal('key_range') || '8-14';
      const manualKey = getVal('owned_key');

      let [minK, maxK] = keyRangeStr.split('-').map(s => parseInt(s.trim()));
      if (isNaN(minK)) minK = 6;
      if (isNaN(maxK)) maxK = 12;

      const rIo = await lookupRaiderIo(charName);
      const discordUser = interaction.member?.user || interaction.user;

      let player = (state.players || []).find(p => p.name.toLowerCase() === charName.toLowerCase());
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
