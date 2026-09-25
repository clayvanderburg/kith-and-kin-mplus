/**
 * Kith and Kin Mythic+ Night - The Guild Chronicler (End-of-Night AI Recap)
 * Generates entertaining, flavorful narrative recaps of M+ night.
 */

const { readLiveState } = require('./live-state');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-sync-secret, x-gemini-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

function formatDuration(ms) {
  if (!ms) return '—';
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Build structured summary of tonight's night from live state
function summarizeNight(state) {
  const groups = state.formedGroups || [];
  const players = state.players || [];
  const attendees = players.filter(p => p.attending);

  // Collect all runs logged tonight
  const allRuns = [];
  const seenRunIds = new Set();

  players.forEach(p => {
    (p.runLog || []).forEach(r => {
      const id = r.id || `${r.at}-${r.key}`;
      if (!seenRunIds.has(id)) {
        seenRunIds.add(id);
        allRuns.push({
          ...r,
          reportedBy: p.name
        });
      }
    });
  });

  // Calculate highest key and worst scuff
  let highestKey = null;
  let worstScuff = null;
  let timedCount = 0;
  let depletedCount = 0;

  allRuns.forEach(r => {
    const levelMatch = (r.key || '').match(/\+(\d+)/);
    const level = levelMatch ? parseInt(levelMatch[1], 10) : 0;
    const runInfo = { ...r, level };

    if (r.success) {
      timedCount++;
      if (!highestKey || level > highestKey.level) {
        highestKey = runInfo;
      }
    } else {
      depletedCount++;
      if (!worstScuff || level >= worstScuff.level) {
        worstScuff = runInfo;
      }
    }
  });

  return {
    attendeesCount: attendees.length,
    groupsCount: groups.length,
    groups: groups.map((g, i) => ({
      name: g.name || `Party ${i + 1}`,
      tank: g.tank?.name || 'Unknown',
      healer: g.healer?.name || 'Unknown',
      dps: (g.dps || []).map(d => d?.name).filter(Boolean),
      rolledKey: g.keystone || g.dungeon || 'Unknown Key',
      isShitterGroup: !!g.isShitterGroup,
      hasCarryMatch: !!g.hasCarryMatch
    })),
    totalRunsLogged: allRuns.length,
    timedCount,
    depletedCount,
    highestKey,
    worstScuff,
    allRuns
  };
}

// Built-in rule-based Chronicler for offline/fallback mode
function generateRuleBasedRecap(summary, tone = 'bard') {
  const groupsList = summary.groups.map(g =>
    `• **${g.name}**: ${g.tank} (Tank), ${g.healer} (Healer), ${g.dps.join(', ')} — Key: *${g.rolledKey}*`
  ).join('\n');

  let keyOfNightText = summary.highestKey
    ? `🏆 **KEY OF THE NIGHT**: **${summary.highestKey.key}** (Timed!)\n> Championed by ${summary.highestKey.groupName || summary.highestKey.reportedBy}! Flawless execution and gloriously timed crests.`
    : `🏆 **KEY OF THE NIGHT**: The brave souls who ventured forth without fear. Every crest earned in battle counts!`;

  let scuffText = summary.worstScuff
    ? `🪦 **THE SCUFF TROPHY**: **${summary.worstScuff.key}**\n> A valiant, blood-soaked disaster. The timer ran red, the repair bill ran high, but glory was seized in the struggle.`
    : `🪦 **THE SCUFF TROPHY**: Unawarded! Miraculously, no party reported a catastrophic wipefest tonight.`;

  return `### ⚔️ Kith & Kin Mythic+ Night — Chronicler's Field Report

The war horns have quieted, the keystone portals are sealed, and the tavern floor is slick with sweat and brew. Tonight, **${summary.attendeesCount} brave champions** took up arms across **${summary.groupsCount} dungeon squads**.

---

#### 📊 By the Numbers
• **Parties Formed**: ${summary.groupsCount}
• **Total Keys Logged**: ${summary.totalRunsLogged} (${summary.timedCount} Timed, ${summary.depletedCount} Depleted)
• **Success Rate**: ${summary.totalRunsLogged > 0 ? Math.round((summary.timedCount / summary.totalRunsLogged) * 100) : 100}%

---

${keyOfNightText}

${scuffText}

---

#### 🛡️ The Battle Lineups
${groupsList}

---

*For the Guild! Until the next keystone calls!* ⚔️`;
}

// Call Google Gemini API (with candidate fallback cascade and dynamic discovery)
async function callGemini(apiKey, summary, tone) {
  const prompt = `You are the witty, proud, and charismatic dwarven/vampiric bard of the World of Warcraft guild "Kith & Kin" (Perenolde/Cairne realm). 
Write an entertaining, colorful, narrative End-of-M+ Night recap based on tonight's structured data.

Tone style: ${tone || 'heroic bard with sharp comedic flair'}.

DATA FROM TONIGHT:
- Attendees: ${summary.attendeesCount}
- Formed Groups: ${JSON.stringify(summary.groups)}
- Highest Timed Key: ${summary.highestKey ? JSON.stringify(summary.highestKey) : 'None reported yet'}
- Worst Depleted/Scuffed Key: ${summary.worstScuff ? JSON.stringify(summary.worstScuff) : 'None reported'}
- Total Runs Logged: ${summary.totalRunsLogged} (${summary.timedCount} Timed, ${summary.depletedCount} Depleted)

REQUIRED FORMAT IN CLEAN MARKDOWN:
1. ⚔️ An epic, fun headline for tonight's session
2. A short paragraph setting the tavern scene (smell of mana buns, bruised armor, laughter, celebratory drinks)
3. 📊 By The Numbers (quick stats bullet list: attendance, groups, win rate)
4. 🏆 KEY OF THE NIGHT (celebrate the highest timed key and the heroes who crushed it)
5. 🪦 THE SCUFF TROPHY (a hilarious, good-natured roast of the biggest depletion, graveyard run, or near-miss)
6. 🛡️ TAVERN MVPs (give specific shoutouts to the healers who prevented cardiac arrest and the tanks who pulled half the dungeon)
7. A rousing closing rallying cry for Kith & Kin

Keep it punchy, engaging, and under 400 words. Format with markdown emojis so it looks amazing in Discord!`;

  // Candidate models to try in order
  const candidateModels = [
    { ver: 'v1beta', name: 'gemini-3.8-flash' },
    { ver: 'v1beta', name: 'gemini-2.0-flash' },
    { ver: 'v1beta', name: 'gemini-1.5-flash-latest' },
    { ver: 'v1', name: 'gemini-1.5-flash' },
    { ver: 'v1beta', name: 'gemini-2.5-flash' },
    { ver: 'v1beta', name: 'gemini-1.5-pro' }
  ];

  let lastError = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/${model.ver}/models/${model.name}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1000
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        lastError = new Error(`Gemini ${model.name} (${response.status}): ${errText}`);
        continue;
      }

      const json = await response.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return { text, modelName: model.name };
    } catch (err) {
      lastError = err;
    }
  }

  // Dynamic discovery fallback: query available models on the key
  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const listText = await listRes.text();
    if (!listRes.ok) {
      throw new Error(`ListModels failed (${listRes.status}): ${listText}`);
    }

    const listData = JSON.parse(listText);
    const available = (listData.models || []).find(m =>
      m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent') && m.name.includes('3.8-flash')
    ) || (listData.models || []).find(m =>
      m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent') && m.name.includes('flash') && !m.name.includes('2.5')
    ) || (listData.models || []).find(m =>
      m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
    );

    if (available) {
      const modelPath = available.name.replace(/^models\//, '');
      const dynUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelPath}:generateContent?key=${apiKey}`;
      const dynRes = await fetch(dynUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 1000 }
        })
      });
      if (dynRes.ok) {
        const dynJson = await dynRes.json();
        const dynText = dynJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (dynText) return { text: dynText, modelName: modelPath };
      } else {
        const dynErrText = await dynRes.text();
        throw new Error(`Model ${modelPath} failed (${dynRes.status}): ${dynErrText}`);
      }
    } else {
      const names = (listData.models || []).map(m => m.name).slice(0, 10).join(', ');
      throw new Error(`No models with generateContent found. Available: ${names || 'None'}`);
    }
  } catch (discoveryErr) {
    throw new Error(`Gemini candidate error: ${lastError ? lastError.message : ''} | Discovery error: ${discoveryErr.message}`);
  }
}

// Call OpenAI fallback if configured
async function callOpenAI(apiKey, summary, tone) {
  const prompt = `You are the witty, proud, and charismatic bard of the World of Warcraft guild "Kith & Kin". Write an entertaining End-of-M+ Night recap in markdown with emojis based on:
Attendees: ${summary.attendeesCount}, Groups: ${JSON.stringify(summary.groups)}, Highest Key: ${JSON.stringify(summary.highestKey)}, Worst Scuff: ${JSON.stringify(summary.worstScuff)}.
Include: Headline, By The Numbers, Key of the Night, Scuff Trophy, and Tavern MVPs.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 1000
    })
  });

  if (!res.ok) throw new Error(`OpenAI API error (${res.status})`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  try {
    let state = { players: [], formedGroups: [] };
    try {
      state = (await readLiveState(event)) || state;
    } catch (err) {
      console.warn('[chronicler] Could not read live state:', err.message);
    }

    const body = JSON.parse(event.body || '{}');
    const tone = body.tone || 'bard';
    const summary = summarizeNight(state);

    const incomingGeminiKey = event.headers['x-gemini-key'] || body.geminiKey;
    const geminiKey = incomingGeminiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    let recapMarkdown = '';
    let generatorUsed = 'rule-based';
    let geminiError = null;

    if (geminiKey) {
      try {
        const geminiResult = await callGemini(geminiKey, summary, tone);
        recapMarkdown = geminiResult.text;
        generatorUsed = geminiResult.modelName || 'gemini';
      } catch (err) {
        geminiError = err.message;
        console.warn('[chronicler] Gemini call failed, falling back:', err.message);
      }
    }

    if (!recapMarkdown && openaiKey) {
      try {
        recapMarkdown = await callOpenAI(openaiKey, summary, tone);
        generatorUsed = 'openai-mini';
      } catch (err) {
        console.warn('[chronicler] OpenAI call failed, falling back:', err.message);
      }
    }

    if (!recapMarkdown) {
      recapMarkdown = generateRuleBasedRecap(summary, tone);
      generatorUsed = 'rule-based';
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        generator: generatorUsed,
        hasGeminiKey: !!geminiKey,
        geminiError,
        summary,
        recap: recapMarkdown
      })
    };
  } catch (err) {
    console.error('[chronicler] Error generating recap:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message || 'Failed to generate recap' })
    };
  }
};
