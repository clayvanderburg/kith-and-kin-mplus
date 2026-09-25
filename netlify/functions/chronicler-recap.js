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
function generateRuleBasedRecap(summary, tone = 'xalatath') {
  const groupsList = summary.groups.map(g =>
    `• **${g.name}**: ${g.tank} (Tank), ${g.healer} (Healer), ${g.dps.join(', ')} — Key: *${g.rolledKey}*`
  ).join('\n');

  if (!tone || tone === 'xalatath') {
    let keyOfNightText = summary.highestKey
      ? `🏆 **THE PETS' FLEETING TRIUMPH**: **${summary.highestKey.key}** (Timed... *how tedious*)\n> Slain by *${summary.highestKey.groupName || summary.highestKey.reportedBy}*. Did you think this little victory would make me swoon, darlings? ...Still, as I curl my bare toes in mild irritation atop my void-throne, I must admit the violence was quite delicious to watch.`
      : `🏆 **THE KEY OF THE NIGHT**: You survived. Do not mistake survival for salvation, my darlings. Lay your humble crests at my bare feet.`;

    let scuffText = summary.worstScuff
      ? `🪦 **DELICIOUS AGONY**: **${summary.worstScuff.key}**\n> Ah... hearing the timer shatter and watching you grovel in the dirt beneath my feet. *Now that* was truly exquisite.`
      : `🪦 **THE SCUFF TROPHY**: Unclaimed? *Pouts and taps a bare toe impatiently against the dark.* You mean not one of you broke under the pressure? How dreadfully boring... I was so hoping to watch you bleed.`;

    return `### 👁️ Xal'atath's Field Observations — Kith & Kin Mythic+ Night

*The shadows lengthen across the tavern rafters as a soft, velvet voice purrs from the dark...*

"Did you truly think you could venture into the deep dark without my gaze upon you, my sweet little playthings? Watching you from the shadows, curling my bare toes in mild disgust as you desperately clung to life... Tonight, **${summary.attendeesCount} fragile mortals** scuttled through the portals across **${summary.groupsCount} squads**, desperately avoiding their inevitable end..."

---

#### 📊 By the Numbers
• **Mortal Squads Deployed**: ${summary.groupsCount}
• **Keys Attempted**: ${summary.totalRunsLogged} (${summary.timedCount} Timed, ${summary.depletedCount} Ruined)
• **Defiance Rate**: ${summary.totalRunsLogged > 0 ? Math.round((summary.timedCount / summary.totalRunsLogged) * 100) : 100}% (*Tch. You stubborn little creatures.*)

---

${keyOfNightText}

${scuffText}

---

#### 🛡️ The Playthings
${groupsList}

---

*Enjoy your drink and your laughter, Kith & Kin... you may grovel at my feet for now, but the Void always collects its due in the end.* 👁️🖤`;
  }

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
  const isXalatath = (!tone || tone === 'xalatath');

  const toneGuides = {
    xalatath: `Persona: You are Xal'atath, the Harbinger of the Void.
- Voice & Presence: Seductive, intensely dominant, velvety, purring, and mockingly affectionate, yet openly irritated that these stubborn little mortals keep surviving and timing their keys.
- Mannerisms: Address the guild members as "my sweet little playthings", "my persistent pets", "little mortals", or "darling shadows".
- Attitude towards Success & Timed Keys: You are mildly annoyed and displeased that they didn't wipe or succumb to the madness. Sigh with seductive disdain. You find their stubborn resilience tiresome, but you are begrudgingly amused by their violent little appetites and carnage. ("Did you really think a few timed keys impress me, darlings? ...Yet the blood you spilled was almost exquisite.")
- Attitude towards Scuffs / Depletes: Pure, purring, mocking ecstasy. You relish when their timers turn red, their mechanics falter, and they panic in the dirt. If NO keys depleted tonight, pout with seductive disappointment that no souls broke under the pressure.
- Key Elements: Dark Void imagery, whispering shadows in the tavern rafters, the Black Empire looming, seductive control.
- Bare Feet / Toes Signature (MANDATORY): In true Xal'atath fashion, you MUST casually or seductively mention your bare feet or toes at least once during your chronicle (e.g. curling your bare toes in mild disgust at their survival, resting your bare feet on the skulls of conquered dungeon bosses, dipping your toes into the swirling void as you watch them squirm, or demanding that these little mortals grovel at your feet). Make it feel seamless, arrogant, and alluring.`,
    bard: 'Tone: Epic, grand, celebratory, and charismatic Bard of Cairne.',
    dwarf: 'Tone: Grumpy, hilarious, sarcastic Dwarven M+ veteran. Roasts wipes and low DPS, begrudgingly praises timed keys.',
    gothic: 'Tone: Dark gothic, vampiric, and dramatic. Fitting Kith & Kin\'s obsidian & blood-red aesthetic.',
    sportscaster: 'Tone: Fast-paced, hyper-caffeinated Goblin esports caster with ridiculous sound effects and breathless excitement.'
  };

  let prompt = '';
  if (isXalatath) {
    prompt = `You are Xal'atath, Harbinger of the Void, observing the World of Warcraft guild "Kith & Kin" (Perenolde/Cairne realm) from the whispering shadows.

${toneGuides.xalatath}

TELEMETRY FROM TONIGHT:
- Attendees: ${summary.attendeesCount} mortals
- Formed Squads: ${JSON.stringify(summary.groups)}
- Highest Timed Key: ${summary.highestKey ? JSON.stringify(summary.highestKey) : 'None reported yet'}
- Worst Depleted/Scuffed Key: ${summary.worstScuff ? JSON.stringify(summary.worstScuff) : 'None! They didn\'t wipe once'}
- Total Runs Logged: ${summary.totalRunsLogged} (${summary.timedCount} Timed, ${summary.depletedCount} Depleted)

REQUIRED FORMAT IN CLEAN MARKDOWN (under 380 words):
1. 👁️ Seductive, mocking headline for tonight's chronicle (e.g. 👁️ **A FLEETING TRIUMPH IN THE DARK... HOW TIRESOME.**)
2. A sultry opening paragraph mocking their tavern gathering, their little celebrations, and how desperately they cling to life.
3. 📊 BY THE NUMBERS (frame their stats with seductive Void condescension)
4. 🏆 THE PETS' BIGGEST KEY (begrudging, purring praise for the highest timed key—mocking their pride, but acknowledging their violence)
5. 🪦 THE SCUFF TROPHY (gloating over any ruined runs, or pouting seductively if they miraculously had zero depletes)
6. 🛡️ TAVERN PLAYTHINGS (mocking shoutouts to the Tanks and Healers fighting so hard to keep their pets breathing)
7. A dominant, sultry parting whisper reminding Kith & Kin that the Void will claim them in the end.
8. 🦶 MANDATORY: Casually or seductively weave in a mention of your bare feet or toes (curling toes in irritation, resting bare feet on conquered skulls, or having mortals grovel at your feet).

Keep it punchy, dominant, seductive, and delicious. Format with markdown emojis so it looks stunning in Discord!
IMPORTANT: Output ONLY the final markdown text. Do not include any meta commentary, thinking notes, self-critique, or word count checklists.`;
  } else {
    prompt = `You are the witty, proud, and charismatic dwarven/vampiric bard of the World of Warcraft guild "Kith & Kin" (Perenolde/Cairne realm). 
Write an entertaining, colorful, narrative End-of-M+ Night recap based on tonight's structured data.

Tone style: ${toneGuides[tone] || tone || 'heroic bard with sharp comedic flair'}.

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

Keep it punchy, engaging, and under 400 words. Format with markdown emojis so it looks amazing in Discord!
IMPORTANT: Output ONLY the final markdown text. Do not include any meta commentary, thinking notes, self-critique, or word count checklists.`;
  }

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
            maxOutputTokens: 1600
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        lastError = new Error(`Gemini ${model.name} (${response.status}): ${errText}`);
        continue;
      }

      const json = await response.json();
      let text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        text = text.replace(/(\n|^)\*?\*?(?:Word count check|Tone check|Self-check|Checklist)[\s\S]*$/i, '').trim();
        return { text, modelName: model.name };
      }
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
          generationConfig: { temperature: 0.8, maxOutputTokens: 1600 }
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
    const tone = body.tone || 'xalatath';
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
