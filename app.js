/**
 * Kith and Kin — Mythic+ Night Group Generator
 * Interactive Client Application
 */

(function () {
  'use strict';

  // --- Constants & WoW Data ---
  const WOW_CLASSES = {
    'Death Knight': { color: '#C41E3A', roles: ['Tank', 'DPS'], brez: true, lust: false },
    'Demon Hunter': { color: '#A330C9', roles: ['Tank', 'DPS'], brez: false, lust: false },
    'Druid':        { color: '#FF7C0A', roles: ['Tank', 'Healer', 'DPS'], brez: true, lust: false },
    'Evoker':       { color: '#33937F', roles: ['Healer', 'DPS'], brez: false, lust: true },
    'Hunter':       { color: '#AAD372', roles: ['DPS'], brez: false, lust: true },
    'Mage':         { color: '#3FC7EB', roles: ['DPS'], brez: false, lust: true },
    'Monk':         { color: '#00FF98', roles: ['Tank', 'Healer', 'DPS'], brez: false, lust: false },
    'Paladin':      { color: '#F48CBA', roles: ['Tank', 'Healer', 'DPS'], brez: true, lust: false },
    'Priest':       { color: '#FFFFFF', roles: ['Healer', 'DPS'], brez: false, lust: false },
    'Rogue':        { color: '#FFF468', roles: ['DPS'], brez: false, lust: false },
    'Shaman':       { color: '#0070DD', roles: ['Healer', 'DPS'], brez: false, lust: true },
    'Warlock':      { color: '#8788EE', roles: ['DPS'], brez: true, lust: false },
    'Warrior':      { color: '#C69B6D', roles: ['Tank', 'DPS'], brez: false, lust: false }
  };

  const DUNGEONS_MIDNIGHT_S2 = [
    'Voidscar Arena',
    'Murder Row',
    'The Blinding Vale',
    'Den of Nalorakk',
    "Kings' Rest",
    'Altar of Fangs',
    'Temple of Sethraliss',
    'Ruby Life Pools'
  ];

  const PARTY_NAMES = [
    'Keystone Crushers',
    'The Floor Inspectors',
    'Wipe on 1% Survivors',
    'Bloodlust on Pull',
    'Mana Sponge Brigade',
    'Brann’s Wild Caravan',
    'Kinfolk Vanguard',
    'The Route Improvisers',
    'Crit Happens',
    'Cooldown Hoarders',
    'Affix Evaders',
    'One-Shot Wonders',
    'Timer Breakers',
    'The Repair Bill Crew',
    'Out of Line of Sight'
  ];

  // Default sample guild roster for Kith and Kin (Midnight Season 2)
  // Real live Raider.IO data across connected realms (Perenolde, Frostmane, Korgath, Cairne, Moon Guard)
  const SAMPLE_ROSTER = [
    // --- Initial Guild Roster (Starts Empty with 0 Attending) ---
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

    // --- Other Kith and Kin Guild Members (Available to toggle on or search) ---
    { id: 'kk-myssa', name: 'Myssa', className: 'Demon Hunter', roles: ['Tank', 'DPS'], keyMin: 9, keyMax: 13, ownedKey: 'Temple of Sethraliss +11', realm: 'Frostmane', region: 'us', ilvl: 297, io: 2788, rank: 1, attending: false, carryPreference: 'none', isShitter: false },
    { id: 'kk-bearackobama', name: 'Bearackobamà', className: 'Druid', roles: ['DPS', 'Tank', 'Healer'], keyMin: 2, keyMax: 6, ownedKey: 'Voidscar Arena +4', realm: 'Perenolde', region: 'us', ilvl: 260, io: 0, rank: 1, attending: false, carryPreference: 'none', isShitter: true },
    { id: 'kk-charliestar', name: 'Charliestar', className: 'Warlock', roles: ['DPS'], keyMin: 2, keyMax: 6, ownedKey: '', realm: 'Perenolde', region: 'us', ilvl: 143, io: 0, rank: 1, attending: false, carryPreference: 'none', isShitter: true },
    { id: 'kk-gredic', name: 'Gredic', className: 'Paladin', roles: ['Tank', 'Healer', 'DPS'], keyMin: 2, keyMax: 6, ownedKey: '', realm: 'Perenolde', region: 'us', ilvl: 295, io: 0, rank: 1, attending: false, carryPreference: 'none', isShitter: false },
    { id: 'kk-khaidylock', name: 'Khaidylock', className: 'Warlock', roles: ['DPS'], keyMin: 2, keyMax: 6, ownedKey: '', realm: 'Cairne', region: 'us', ilvl: 263, io: 0, rank: 1, attending: false, carryPreference: 'need_carry', isShitter: false },
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

  // --- App State ---
  let state = {
    players: [],
    formedGroups: [],
    benchedPlayers: [],
    excludedDungeons: [],
    dungeonPoolMode: 'midnight_s2',
    soundEnabled: true,
    sortField: 'io',
    searchQuery: '',
    roleFilter: 'all',
    attendFilter: 'all',
    events: {},
    currentEventId: 'event-default'
  };

  // --- Sound Synthesizer (Web Audio API) ---
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSound(type) {
    if (!state.soundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    try {
      const now = audioCtx.currentTime;

      if (type === 'keystone') {
        // Epic Mythic Keystone socket sound: deep resonant chime + rising shimmer
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';

        osc1.frequency.setValueAtTime(146.83, now); // D3
        osc1.frequency.exponentialRampToValueAtTime(587.33, now + 0.35); // D5
        osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.6); // A5

        osc2.frequency.setValueAtTime(220.00, now);
        osc2.frequency.exponentialRampToValueAtTime(440.00, now + 0.4);

        gainNode.gain.setValueAtTime(0.01, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.95);
        osc2.stop(now + 0.95);
      } else if (type === 'fanfare') {
        // Triumphant group complete fanfare
        const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
        notes.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const start = now + idx * 0.08;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.15, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(start);
          osc.stop(start + 0.36);
        });
      } else if (type === 'click') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'lock') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.setValueAtTime(520, now + 0.04);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
      }
    } catch (e) {
      // Audio autoplay policy or device failure gracefully swallowed
    }
  }

  // --- LocalStorage Persistence ---
  function loadState() {
    try {
      // 1. Events
      const savedEvents = localStorage.getItem('kk_mplus_events');
      if (savedEvents) {
        try {
          state.events = JSON.parse(savedEvents) || {};
        } catch (e) {}
      }
      const savedEvId = localStorage.getItem('kk_mplus_current_event_id');
      if (savedEvId && state.events[savedEvId]) {
        state.currentEventId = savedEvId;
      }

      // 2. Players
      const savedPlayers = localStorage.getItem('kk_mplus_players');
      if (savedPlayers) {
        const parsed = JSON.parse(savedPlayers);
        const hasOldDummies = Array.isArray(parsed) && parsed.some(p => p.id === 'kk-1' && p.name === 'MadKing');
        const hasOldTww = Array.isArray(parsed) && parsed.some(p => p.ownedKey && (p.ownedKey.includes('Grim Batol') || p.ownedKey.includes('Ara-Kara') || p.ownedKey.includes('Stonevault') || p.ownedKey.includes('Dawnbreaker')));
        const isNotMn2 = !localStorage.getItem('kk_mplus_version_mn2');
        if (hasOldDummies || hasOldTww || isNotMn2) {
          state.players = JSON.parse(JSON.stringify(SAMPLE_ROSTER));
          localStorage.setItem('kk_mplus_version_mn2', 'true');
          savePlayersLocal();
        } else {
          state.players = parsed.map(p => ({
            ...p,
            carryPreference: p.carryPreference || 'none',
            isShitter: !!p.isShitter,
            isLeader: !!p.isLeader,
            isReserve: !!p.isReserve,
            keyBrackets: p.keyBrackets || (p.keyMax > 12 ? ['12+'] : (p.keyMax >= 10 ? ['10-12'] : ['6-8']))
          }));
        }
      } else {
        state.players = JSON.parse(JSON.stringify(SAMPLE_ROSTER));
        localStorage.setItem('kk_mplus_version_mn2', 'true');
        savePlayersLocal();
      }

      const soundPref = localStorage.getItem('kk_mplus_sound');
      if (soundPref !== null) {
        state.soundEnabled = soundPref === 'true';
      }

      const savedGroups = localStorage.getItem('kk_mplus_groups');
      if (savedGroups) {
        state.formedGroups = JSON.parse(savedGroups);
      }

      const savedBenched = localStorage.getItem('kk_mplus_benched');
      if (savedBenched) {
        state.benchedPlayers = JSON.parse(savedBenched);
      }

      const savedExclusions = localStorage.getItem('kk_mplus_excluded_dungeons');
      if (savedExclusions) {
        try {
          state.excludedDungeons = JSON.parse(savedExclusions);
        } catch (e) {}
      }

      initEvents();
    } catch (e) {
      console.warn('Failed to load local state, using defaults', e);
      state.players = JSON.parse(JSON.stringify(SAMPLE_ROSTER));
    }
  }

  function initEvents() {
    if (!state.events || Object.keys(state.events).length === 0) {
      const defaultId = 'event-default';
      state.events = {
        [defaultId]: {
          id: defaultId,
          name: 'Friday M+ Night (Current)',
          date: new Date().toISOString(),
          players: state.players || [],
          formedGroups: state.formedGroups || [],
          benchedPlayers: state.benchedPlayers || []
        }
      };
      state.currentEventId = defaultId;
    }
    renderEventDropdown();
  }

  function renderEventDropdown() {
    const select = document.getElementById('eventSelect');
    if (!select) return;
    const entries = Object.values(state.events || {});
    if (entries.length === 0) {
      select.innerHTML = '<option value="">(No events)</option>';
      return;
    }
    select.innerHTML = entries.map(ev => 
      `<option value="${ev.id}" ${ev.id === state.currentEventId ? 'selected' : ''}>${escapeHtml(ev.name)}</option>`
    ).join('');
  }

  function handleSwitchEvent(newId) {
    if (!state.events || !state.events[newId] || newId === state.currentEventId) return;

    // Save current event state first
    if (state.events[state.currentEventId]) {
      state.events[state.currentEventId].players = JSON.parse(JSON.stringify(state.players));
      state.events[state.currentEventId].formedGroups = JSON.parse(JSON.stringify(state.formedGroups));
      state.events[state.currentEventId].benchedPlayers = JSON.parse(JSON.stringify(state.benchedPlayers));
      state.events[state.currentEventId].lastUpdated = new Date().toISOString();
    }

    state.currentEventId = newId;
    const target = state.events[newId];
    state.players = target.players || [];
    state.formedGroups = target.formedGroups || [];
    state.benchedPlayers = target.benchedPlayers || [];
    // Switching nights isn't a roster edit: only the event choice and its groups are saved.
    syncedPlayers = new Map(state.players.map(p => [nameKey(p.name), stablePlayerJson(p)]));

    savePlayersLocal();
    saveGroupsLocal();
    saveEventsLocal();
    renderEventDropdown();
    renderRoster();
    renderGroups();
    pushRemoteState();
    showToast(`Switched to: ${target.name}`);
    playSound('click');
  }

  function handleCreateEvent() {
    const defaultName = `Friday M+ Night — ${new Date(Date.now() + 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    const name = prompt('Enter a name for the new Mythic+ Event Lineup:', defaultName);
    if (!name || !name.trim()) return;

    const newId = 'event-' + Date.now();
    // Save current first
    if (state.events[state.currentEventId]) {
      state.events[state.currentEventId].players = JSON.parse(JSON.stringify(state.players));
      state.events[state.currentEventId].formedGroups = JSON.parse(JSON.stringify(state.formedGroups));
      state.events[state.currentEventId].benchedPlayers = JSON.parse(JSON.stringify(state.benchedPlayers));
    }

    state.events[newId] = {
      id: newId,
      name: name.trim(),
      date: new Date().toISOString(),
      players: [],
      formedGroups: [],
      benchedPlayers: []
    };
    state.currentEventId = newId;
    // A new night keeps the guild roster (shared with Discord); it starts with nobody attending and no groups.
    state.players.forEach(p => {
      if (p.attending) { p.attending = false; p.absent = false; }
    });
    state.formedGroups = [];
    state.benchedPlayers = [];

    savePlayersLocal();
    saveGroupsLocal();
    saveEventsLocal();
    renderEventDropdown();
    renderRoster();
    renderGroups();
    pushRemoteState();
    showToast(`Created new event: ${name.trim()}!`);
    playSound('fanfare');
  }

  function handleDeleteEvent() {
    const current = state.events?.[state.currentEventId];
    if (!current) return;
    const count = Object.keys(state.events).length;
    if (count <= 1) {
      if (confirm(`Clear all attendees and groups for "${current.name}"?`)) {
        // Un-mark attendance instead of deleting the guild roster (Discord and signups share it).
        state.players.forEach(p => {
          if (p.attending) { p.attending = false; p.absent = false; }
        });
        state.formedGroups = [];
        state.benchedPlayers = [];
        savePlayersLocal();
        saveGroupsLocal();
        saveEventsLocal();
        renderRoster();
        renderGroups();
        pushRemoteState();
        showToast(`Cleared event "${current.name}"!`);
        playSound('click');
      }
      return;
    }

    if (!confirm(`Are you sure you want to delete event "${current.name}"? This cannot be undone.`)) {
      return;
    }

    delete state.events[state.currentEventId];
    const remainingIds = Object.keys(state.events);
    state.currentEventId = remainingIds[0];
    const nextEv = state.events[state.currentEventId];
    state.players = nextEv.players || [];
    state.formedGroups = nextEv.formedGroups || [];
    state.benchedPlayers = nextEv.benchedPlayers || [];
    syncedPlayers = new Map(state.players.map(p => [nameKey(p.name), stablePlayerJson(p)]));

    savePlayersLocal();
    saveGroupsLocal();
    saveEventsLocal();
    renderEventDropdown();
    renderRoster();
    renderGroups();
    pushRemoteState();
    showToast(`Deleted event. Switched to: ${nextEv.name}`);
    playSound('click');
  }

  function saveEventsLocal() {
    try {
      localStorage.setItem('kk_mplus_events', JSON.stringify(state.events || {}));
      localStorage.setItem('kk_mplus_current_event_id', state.currentEventId);
    } catch (e) {}
  }

  function saveExclusions() {
    try {
      localStorage.setItem('kk_mplus_excluded_dungeons', JSON.stringify(state.excludedDungeons || []));
    } catch (e) {}
    pushRemoteState();
  }

  // --- Discord & Cloud State Synchronization ---
  const API_URL = (window.location.hostname.includes('netlify.app') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? '/api/state'
    : 'https://knkmplus.netlify.app/api/state';
  let pushDebounceTimer = null;
  let isFetchingRemote = false;
  let isPushing = false;
  // True only while a real officer edit has not reached the server yet.
  let hasPendingEdits = false;
  let unlockPromptOpen = false;

  function officerKey() {
    try {
      return sessionStorage.getItem('kk_officer_key') || window.SYNC_SECRET || '';
    } catch (e) {
      return window.SYNC_SECRET || '';
    }
  }

  function rememberOfficerKey(key) {
    window.SYNC_SECRET = key;
    try { sessionStorage.setItem('kk_officer_key', key); } catch (e) {}
  }

  function forgetOfficerKey() {
    window.SYNC_SECRET = '';
    try { sessionStorage.removeItem('kk_officer_key'); } catch (e) {}
  }

  // Viewing is open. Saving to the shared roster needs the officer passphrase once per browser session.
  async function ensureOfficerKey() {
    if (officerKey()) return true;
    if (unlockPromptOpen) return false;
    unlockPromptOpen = true;
    try {
      const key = (window.prompt('Officer passphrase to save changes to the shared roster (asked once per session):') || '').trim();
      if (!key) return false;
      if (await verifyOfficerKey(key)) {
        rememberOfficerKey(key);
        showToast('🔓 Officer editing unlocked for this session.');
        return true;
      }
      showToast('❌ Wrong officer passphrase. Changes are only saved in this browser.');
      return false;
    } finally {
      unlockPromptOpen = false;
    }
  }

  function updateSyncStatus(status, label) {
    const badge = document.getElementById('discordSyncStatus');
    const text = document.getElementById('syncStatusText');
    if (!badge || !text) return;

    badge.className = 'discord-sync-badge';
    if (status === 'syncing') {
      badge.classList.add('syncing');
      text.textContent = label || 'Syncing...';
    } else if (status === 'synced') {
      badge.classList.add('synced');
      text.textContent = label || 'Discord Synced';
    } else if (status === 'offline') {
      badge.classList.add('offline');
      text.textContent = label || 'Local Storage';
    } else if (status === 'error') {
      badge.classList.add('error');
      text.textContent = label || 'Sync Error';
    }
  }

  // ---- Change-only sync ------------------------------------------------------------
  // The page remembers what the server last had ("synced" copies). A save sends only the
  // players that differ, real deletes, and group changes tagged with the groups version we
  // were looking at. Two officers editing different players can't overwrite each other, and a
  // group change made from a stale screen is refused instead of wiping someone else's groups.
  let serverVersion = null;
  let groupsBase = null;
  let syncedPlayers = new Map();
  let syncedGroupsJson = null;
  let syncedMetaJson = null;
  let lastChangeInfo = null;
  let viewOnlyDeclined = false;
  const VOLATILE_FIELDS = new Set(['personId', 'charKey', 'scoreAt', 'ioColor', 'spec', 'touchedAt']);

  function nameKey(name) {
    return String(name || '').trim().toLowerCase();
  }

  function stablePlayerJson(player) {
    const out = {};
    Object.keys(player || {}).sort().forEach(k => { if (!VOLATILE_FIELDS.has(k)) out[k] = player[k]; });
    return JSON.stringify(out);
  }

  function groupsJson() {
    return JSON.stringify(state.formedGroups || []) + '|' + JSON.stringify(state.benchedPlayers || []);
  }

  function metaJson() {
    const events = Object.values(state.events || {}).filter(Boolean).map(e => ({ id: e.id, name: e.name, date: e.date }));
    return JSON.stringify({ x: state.excludedDungeons || [], c: state.currentEventId || null, e: events });
  }

  function rememberSynced() {
    syncedPlayers = new Map((state.players || []).map(p => [nameKey(p.name), stablePlayerJson(p)]));
    syncedGroupsJson = groupsJson();
    syncedMetaJson = metaJson();
  }

  function buildOps() {
    const ops = [];
    const current = new Set();
    for (const p of state.players || []) {
      if (!p || !p.name) continue;
      const key = nameKey(p.name);
      current.add(key);
      if (syncedPlayers.get(key) !== stablePlayerJson(p)) ops.push({ op: 'upsert', player: p });
    }
    for (const key of syncedPlayers.keys()) {
      if (!current.has(key)) ops.push({ op: 'delete', name: key });
    }
    if (syncedGroupsJson !== null && groupsJson() !== syncedGroupsJson) {
      ops.push({ op: 'groups', formedGroups: state.formedGroups || [], benchedPlayers: state.benchedPlayers || [], base: groupsBase });
    }
    if (syncedMetaJson !== null && metaJson() !== syncedMetaJson) {
      const events = {};
      Object.values(state.events || {}).filter(Boolean).forEach(e => { events[e.id] = { id: e.id, name: e.name, date: e.date }; });
      ops.push({ op: 'meta', excludedDungeons: state.excludedDungeons || [], currentEventId: state.currentEventId || null, events });
    }
    return ops;
  }

  function timeAgo(iso) {
    const secs = Math.max(0, Math.round((Date.now() - (Date.parse(iso || '') || Date.now())) / 1000));
    if (secs < 60) return `${secs}s ago`;
    if (secs < 3600) return `${Math.round(secs / 60)}m ago`;
    return `${Math.round(secs / 3600)}h ago`;
  }

  function renderLastChange() {
    const badge = document.getElementById('discordSyncStatus');
    if (!badge) return;
    let el = document.getElementById('lastChangeText');
    if (!el) {
      el = document.createElement('small');
      el.id = 'lastChangeText';
      el.className = 'last-change-text';
      badge.insertAdjacentElement('afterend', el);
    }
    el.textContent = lastChangeInfo?.at ? `Last change: ${timeAgo(lastChangeInfo.at)} by ${lastChangeInfo.by || 'someone'}` : '';
  }

  function applyServerState(data) {
    if (data.events && typeof data.events === 'object' && Object.keys(data.events).length > 0) {
      state.events = data.events;
      if (data.currentEventId && state.events[data.currentEventId]) {
        state.currentEventId = data.currentEventId;
      }
      renderEventDropdown();
    }
    if (Array.isArray(data.players)) {
      state.players = data.players.map(p => ({
        ...p,
        carryPreference: p.carryPreference || 'none',
        isShitter: !!p.isShitter,
        isLeader: !!p.isLeader,
        isReserve: !!p.isReserve,
        keyBrackets: p.keyBrackets || (p.keyMax > 12 ? ['12+'] : (p.keyMax >= 10 ? ['10-12'] : ['6-8']))
      }));
    }
    state.formedGroups = Array.isArray(data.formedGroups) ? data.formedGroups : [];
    state.benchedPlayers = Array.isArray(data.benchedPlayers) ? data.benchedPlayers : [];
    if (Array.isArray(data.excludedDungeons)) state.excludedDungeons = data.excludedDungeons;
    state.groupsTouchedAt = data.groupsTouchedAt || null;
    state.nights = data.nights || {};

    serverVersion = data.version || null;
    groupsBase = data.groupsTouchedAt || null;
    lastChangeInfo = data.lastChange || lastChangeInfo;
    rememberSynced();

    savePlayersLocal();
    saveGroupsLocal();
    saveEventsLocal();
    renderRoster();
    renderGroups();
    renderLastChange();
  }

  async function fetchRemoteState(silent = false, { force = false } = {}) {
    if (isFetchingRemote || isPushing || pushDebounceTimer) return;
    if (hasPendingEdits && !viewOnlyDeclined) {
      // Unsaved officer edits: save them first, then pull.
      pushRemoteState();
      return;
    }
    isFetchingRemote = true;
    if (!silent) updateSyncStatus('syncing', 'Syncing...');

    try {
      const headers = { 'Accept': 'application/json' };
      const key = officerKey();
      if (key) headers['x-sync-secret'] = key;
      const since = !force && serverVersion ? `&since=${encodeURIComponent(serverVersion)}` : '';
      const res = await fetch(`${API_URL}?_t=${Date.now()}${since}`, { method: 'GET', headers, cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // An edit started while this request was in flight. Keep it; the next poll pulls again.
      if ((hasPendingEdits && !viewOnlyDeclined) || pushDebounceTimer) return;

      if (data && data.unchanged) {
        updateSyncStatus('synced', officerKey() ? 'Discord Synced' : 'Synced (view only)');
        renderLastChange();
      } else if (data && !data.empty) {
        hasPendingEdits = false;
        viewOnlyDeclined = false;
        applyServerState(data);
        updateSyncStatus('synced', officerKey() ? 'Discord Synced' : 'Synced (view only)');
        if (!silent) showToast('✨ Synced roster with Discord bot & cloud!');
      } else {
        updateSyncStatus('synced', 'Discord Ready');
        if (syncedGroupsJson === null) rememberSynced();
      }
    } catch (err) {
      console.warn('[Cloud Sync] Fetch error, continuing with local state:', err);
      updateSyncStatus('offline', 'Offline — retrying');
    } finally {
      isFetchingRemote = false;
    }
  }

  function pushRemoteState() {
    hasPendingEdits = true;
    clearTimeout(pushDebounceTimer);
    updateSyncStatus('syncing', 'Saving...');
    pushDebounceTimer = setTimeout(async () => {
      pushDebounceTimer = null;
      if (!(await ensureOfficerKey())) {
        // View-only: keep the change on this screen until the next sync replaces it.
        viewOnlyDeclined = true;
        updateSyncStatus('offline', 'Not saved (view only) — click Sync to unlock');
        return;
      }
      viewOnlyDeclined = false;
      if (syncedGroupsJson === null) {
        // Never pulled yet: get the server copy first so we only send real changes.
        hasPendingEdits = false;
        await fetchRemoteState(true, { force: true });
        return;
      }
      let ops = buildOps();
      if (!ops.length) {
        hasPendingEdits = false;
        updateSyncStatus('synced', 'Discord Synced');
        return;
      }
      isPushing = true;
      try {
        let res = await sendOps(ops);
        if (res.status === 409) {
          const info = await res.json().catch(() => ({}));
          showToast(`⚠️ ${info.message || 'Groups were changed by someone else. Loaded the latest groups.'}`);
          // Save everything else, drop the stale group change, then load the latest.
          ops = ops.filter(o => o.op !== 'groups');
          if (ops.length) res = await sendOps(ops);
          hasPendingEdits = false;
          isPushing = false;
          await fetchRemoteState(true, { force: true });
          return;
        }
        if (res.ok) {
          const info = await res.json().catch(() => ({}));
          // Everything we sent is now the server copy.
          for (const o of ops) {
            if (o.op === 'upsert') syncedPlayers.set(nameKey(o.player.name), stablePlayerJson(o.player));
            if (o.op === 'delete') syncedPlayers.delete(o.name);
            if (o.op === 'groups') syncedGroupsJson = JSON.stringify(o.formedGroups) + '|' + JSON.stringify(o.benchedPlayers);
            if (o.op === 'meta') syncedMetaJson = metaJson();
          }
          if (info.groupsTouchedAt !== undefined) groupsBase = info.groupsTouchedAt;
          if (info.lastChange) lastChangeInfo = info.lastChange;
          serverVersion = null; // pull the merged result on the next poll
          hasPendingEdits = buildOps().length > 0; // edits made while saving go out next
          updateSyncStatus('synced', 'Discord Synced');
          renderLastChange();
          if (hasPendingEdits) pushRemoteState();
        } else if (res.status === 401) {
          forgetOfficerKey();
          updateSyncStatus('error', 'Passphrase rejected — click Sync');
        } else {
          updateSyncStatus('error', `Save failed (HTTP ${res.status}) — will retry`);
        }
      } catch (err) {
        console.warn('[Cloud Sync] Push error:', err);
        updateSyncStatus('offline', 'Offline — will retry');
      } finally {
        isPushing = false;
      }
    }, 700);
  }

  function sendOps(ops) {
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-sync-secret': officerKey() },
      body: JSON.stringify({ ops })
    });
  }

  function touchLocalStamp() {
    try {
      localStorage.setItem('kk_local_updated', new Date().toISOString());
    } catch (e) {}
  }

  function savePlayersLocal() {
    try {
      localStorage.setItem('kk_mplus_players', JSON.stringify(state.players));
      touchLocalStamp();
    } catch (e) {
      console.error('Could not save players to localStorage', e);
    }
  }

  function savePlayers() {
    savePlayersLocal();
    pushRemoteState();
  }

  function saveGroupsLocal() {
    try {
      localStorage.setItem('kk_mplus_groups', JSON.stringify(state.formedGroups));
      localStorage.setItem('kk_mplus_benched', JSON.stringify(state.benchedPlayers || []));
      touchLocalStamp();
    } catch (e) {
      console.error('Could not save groups to localStorage', e);
    }
  }

  function saveGroups() {
    state.groupsTouchedAt = new Date().toISOString();
    saveGroupsLocal();
    pushRemoteState();
  }

  // --- UI Notifications (Toast) ---
  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // --- Roster Metrics & Computations ---
  function updateRosterMetrics() {
    const attending = state.players.filter(p => p.attending);
    let tanks = 0, healers = 0, dps = 0;

    attending.forEach(p => {
      if (p.roles.includes('Tank')) tanks++;
      if (p.roles.includes('Healer')) healers++;
      if (p.roles.includes('DPS')) dps++;
    });

    const maxByCount = Math.floor(attending.length / 5);
    const maxPossibleGroups = Math.min(maxByCount, tanks, healers);

    document.getElementById('rosterCountBadge').textContent = `${attending.length} of ${state.players.length} Attending`;
    document.getElementById('tankCount').textContent = tanks;
    document.getElementById('healerCount').textContent = healers;
    document.getElementById('dpsCount').textContent = dps;
    document.getElementById('maxGroupsCount').textContent = maxPossibleGroups;
  }

  // --- Raider.IO API & Score Styling ---
  function getIoColor(score) {
    if (!score || score <= 0) return '#94a3b8';
    if (score >= 2800) return '#e28bf0'; // Mythic Pink / Title
    if (score >= 2500) return '#ff8000'; // Legendary Orange
    if (score >= 2000) return '#a335ee'; // Epic Purple
    if (score >= 1500) return '#0070dd'; // Rare Blue
    if (score >= 1000) return '#1eff00'; // Uncommon Green
    return '#f8fafc';
  }

  async function fetchCharacterRaiderIo(name, realm = 'Perenolde', region = 'us') {
    if (!name || !name.trim()) throw new Error('Character name is required');
    const cleanName = encodeURIComponent(name.trim());
    const cleanRealm = encodeURIComponent(realm.trim().toLowerCase().replace(/\s+/g, '-').replace(/'/g, ''));
    const url = `https://raider.io/api/v1/characters/profile?region=${region}&realm=${cleanRealm}&name=${cleanName}&fields=gear,mythic_plus_scores_by_season:current,mythic_plus_recent_runs,mythic_plus_best_runs`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Character "${name}" not found on ${realm} (${region.toUpperCase()})`);
    }
    const data = await res.json();
    const seasonData = Array.isArray(data.mythic_plus_scores_by_season) 
      ? data.mythic_plus_scores_by_season[0] 
      : data.mythic_plus_scores_by_season;

    const recentRun = data.mythic_plus_recent_runs?.[0];
    const bestRun = data.mythic_plus_best_runs?.[0];
    const run = recentRun || bestRun;

    let ownedKey = '';
    let keyMin = 2;
    let keyMax = 8;
    if (run) {
      keyMin = 10;
      keyMax = 12;
    }

    return {
      name: data.name,
      className: data.class,
      realm: data.realm || realm,
      ilvl: Math.round(data.gear?.item_level_equipped || 0),
      io: Math.round(seasonData?.scores?.all || 0),
      avatar: data.thumbnail_url || null,
      profileUrl: data.profile_url || null,
      ownedKey: ownedKey,
      keyMin: keyMin,
      keyMax: keyMax,
      recentRun: run || null
    };
  }

  // --- Roster Rendering ---
  function renderRoster() {
    const container = document.getElementById('rosterList');
    if (!container) return;

    container.innerHTML = '';
    updateRosterMetrics();

    // Filter players based on search query, role filter, and attendance filter
    const filtered = state.players.filter(player => {
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        const matchesName = player.name.toLowerCase().includes(q);
        const matchesClass = (player.className || '').toLowerCase().includes(q);
        const matchesRealm = (player.realm || '').toLowerCase().includes(q);
        const matchesShitter = (q.includes('shit') || q.includes('poop') || q.includes('alt')) && player.isShitter;
        const matchesCarry = (q.includes('carry') || q.includes('stronk') || q.includes('back')) && (player.carryPreference === 'need_carry' || player.carryPreference === 'willing_carry');
        if (!matchesName && !matchesClass && !matchesRealm && !matchesShitter && !matchesCarry) return false;
      }

      if (state.roleFilter && state.roleFilter !== 'all') {
        if (!player.roles.includes(state.roleFilter)) return false;
      }

      if (state.attendFilter === 'attending' && !player.attending) return false;
      if (state.attendFilter === 'absent' && player.attending) return false;
      if (state.attendFilter === 'leader' && !player.isLeader) return false;
      if (state.attendFilter === 'reserve' && !player.isReserve) return false;
      if (state.attendFilter === 'shitter' && !player.isShitter) return false;
      if (state.attendFilter === 'need_carry' && player.carryPreference !== 'need_carry') return false;
      if (state.attendFilter === 'willing_carry' && player.carryPreference !== 'willing_carry') return false;

      return true;
    });

    // Update roster count badge to show filtered vs total
    const badge = document.getElementById('rosterCountBadge');
    if (badge) {
      const attendingCount = state.players.filter(p => p.attending).length;
      if (filtered.length !== state.players.length) {
        badge.textContent = `${filtered.length} / ${state.players.length} (${attendingCount} Attending)`;
      } else {
        badge.textContent = `${attendingCount} Attending`;
      }
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 2.5rem 1rem;">
          <div class="empty-icon">🔍</div>
          <h4>No guild members match your filter</h4>
          <p>Try clearing your search query or role/status filters to see more members.</p>
        </div>
      `;
      return;
    }

    // Sort filtered players
    const sorted = [...filtered].sort((a, b) => {
      if (state.sortField === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (state.sortField === 'io') {
        return (b.io || 0) - (a.io || 0);
      }
      if (state.sortField === 'ilvl') {
        return (b.ilvl || 0) - (a.ilvl || 0);
      }
      if (state.sortField === 'role') {
        const roleScore = p => (p.roles.includes('Tank') ? 3 : 0) + (p.roles.includes('Healer') ? 2 : 0) + (p.roles.includes('DPS') ? 1 : 0);
        return roleScore(b) - roleScore(a);
      }
      if (state.sortField === 'key') {
        return (b.keyMax || 0) - (a.keyMax || 0);
      }
      if (state.sortField === 'class') {
        return a.className.localeCompare(b.className);
      }
      return 0;
    });

    sorted.forEach(player => {
      const classInfo = WOW_CLASSES[player.className] || { color: '#ffffff' };
      const row = document.createElement('div');
      row.className = `player-row is-collapsed ${player.attending ? '' : 'inactive'}`;
      row.style.borderLeftColor = classInfo.color;

      const hasTank = player.roles.includes('Tank');
      const hasHealer = player.roles.includes('Healer');
      const hasDps = player.roles.includes('DPS');
      const ioColor = getIoColor(player.io);
      const isAltRealm = player.realm && player.realm.toLowerCase() !== 'perenolde';

      row.innerHTML = `
        <div class="player-left-col">
          <label class="player-attend-check" title="Toggle Attendance for Tonight">
            <input type="checkbox" data-id="${player.id}" class="attend-checkbox" ${player.attending ? 'checked' : ''}>
          </label>
          ${player.avatar ? `<img class="player-avatar" src="${player.avatar}" alt="" loading="lazy">` : `<div class="player-avatar-placeholder" title="Character">${hasTank ? '🛡️' : (hasHealer ? '💚' : '⚔️')}</div>`}
        </div>
        <div class="player-main-col">
          <div class="player-header-row player-toggle-trigger" data-id="${player.id}" title="Click to expand or collapse details">
            <div class="player-identity">
              <span class="player-name" style="color: ${classInfo.color};">${escapeHtml(player.name)}</span>
              <span class="class-tag" style="color: ${classInfo.color}; border: 1px solid ${classInfo.color}55;">${escapeHtml(player.className)}</span>
              <span class="player-roles-summary">${hasTank ? '🛡️' : ''}${hasHealer ? '💚' : ''}${hasDps ? '⚔️' : ''}</span>
              <span class="io-badge-compact" style="color: ${ioColor}; border-color: ${ioColor}77;">${(player.io || 0).toLocaleString()} IO</span>
              ${player.keyManual && player.ownedKey ? `<span class="key-owned-pill-mini" title="Keystone: ${escapeHtml(player.ownedKey)}">🔑 ${escapeHtml(player.ownedKey)}</span>` : ''}
            </div>
            <div class="player-header-right">
              <span class="player-expand-chevron">▸</span>
            </div>
          </div>
          <div class="player-details-collapsible">
            <div class="player-badges-row">
              <span class="ilvl-pill" title="Item Level">${player.ilvl || 320} iLvl</span>
              <span class="io-badge" style="color: ${ioColor}; border-color: ${ioColor}77;" title="Mythic+ Score">${(player.io || 0).toLocaleString()} IO</span>
              <div class="role-badge-group">
                <span class="role-icon-mini ${hasTank ? 'active-tank' : 'inactive'}" data-id="${player.id}" data-role="Tank" title="Tank ${hasTank ? '(Active - Click to toggle)' : '(Inactive - Click to toggle)'}">🛡️</span>
                <span class="role-icon-mini ${hasHealer ? 'active-healer' : 'inactive'}" data-id="${player.id}" data-role="Healer" title="Healer ${hasHealer ? '(Active - Click to toggle)' : '(Inactive - Click to toggle)'}">💚</span>
                <span class="role-icon-mini ${hasDps ? 'active-dps' : 'inactive'}" data-id="${player.id}" data-role="DPS" title="DPS ${hasDps ? '(Active - Click to toggle)' : '(Inactive - Click to toggle)'}">⚔️</span>
              </div>
              ${classInfo.lust ? `<span class="util-icon-tag lust" title="${player.className} brings Bloodlust / Heroism">⚡ Lust</span>` : ''}
              ${classInfo.brez ? `<span class="util-icon-tag brez" title="${player.className} brings Battle Resurrection">🔄 BRez</span>` : ''}
              ${player.isLeader ? `<span class="leader-pill" title="Born Leader: willing to lead group">👑 Leader</span>` : ''}
              ${player.isReserve ? `<span class="reserve-pill" title="Voluntary Bench / Reserve: willing to rotate out">🍺 Reserve</span>` : ''}
              ${player.carryPreference === 'need_carry' ? `<span class="carry-pill need" title="I need a carry!">🎒 Needs Carry</span>` : ''}
              ${player.carryPreference === 'willing_carry' ? `<span class="carry-pill stronk" title="My back is stronk (willing to carry)">🏋️ Back is Stronk</span>` : ''}
              ${player.isShitter ? `<span class="shitter-pill" title="I'm a shitter (put me in the shitter alt group)">💩 Shitter</span>` : ''}
            </div>
            <div class="player-key-row">
              ${player.keyManual && player.ownedKey ? `<span class="key-owned-pill" title="Keystone they typed in: ${escapeHtml(player.ownedKey)}">🔑 ${escapeHtml(player.ownedKey)}</span>` : ''}
              <span class="key-range-pill" title="Comfortable key level range">🎯 ${player.keyBrackets && player.keyBrackets.length > 0 ? player.keyBrackets.map(b => b === '6-8' ? '6-8 (Hero)' : (b === '10-12' ? '9-12 (Myth/Vault)' : '12+ (Push)')).join(' • ') : `+${player.keyMin} – +${player.keyMax}`}</span>
              ${isAltRealm ? `<span class="realm-pill">${escapeHtml(player.realm)}</span>` : ''}
            </div>
            <div class="player-actions-row">
              <button class="btn-action-icon stats-player-btn" data-id="${player.id}" title="View Player Season Stats & Dossier">📊 Stats</button>
              <button class="btn-action-icon edit-player-btn" data-id="${player.id}" title="Edit Member">✏️ Edit</button>
              <button class="btn-action-icon delete delete-player-btn" data-id="${player.id}" title="Remove Member">🗑️ Remove</button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(row);
    });

    attachRosterRowEvents();
  }

  function attachRosterRowEvents() {
    // Row collapse/expand toggle
    document.querySelectorAll('.player-toggle-trigger').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        const row = trigger.closest('.player-row');
        if (row) {
          row.classList.toggle('is-collapsed');
        }
      });
    });

    // Attendance checkboxes
    document.querySelectorAll('.attend-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        e.stopPropagation();
        const id = e.target.getAttribute('data-id');
        const player = state.players.find(p => p.id === id);
        if (player) {
          player.attending = e.target.checked;
          player.absent = !e.target.checked;
          player.touchedAt = new Date().toISOString();
          savePlayers();
          renderRoster();
          playSound('click');
        }
      });
    });

    // Quick role toggle clicks
    document.querySelectorAll('.role-icon-mini').forEach(icon => {
      icon.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = icon.getAttribute('data-id');
        const role = icon.getAttribute('data-role');
        const player = state.players.find(p => p.id === id);
        if (player) {
          if (player.roles.includes(role)) {
            // Cannot remove role if it's the only one
            if (player.roles.length > 1) {
              player.roles = player.roles.filter(r => r !== role);
            } else {
              showToast('Player must have at least one role!');
              return;
            }
          } else {
            player.roles.push(role);
          }
          savePlayers();
          renderRoster();
          playSound('click');
        }
      });
    });

    // Edit button
    document.querySelectorAll('.edit-player-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        openPlayerModal(id);
      });
    });

    // Delete button
    document.querySelectorAll('.delete-player-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const player = state.players.find(p => p.id === id);
        if (player && confirm(`Remove ${player.name} from the guild list?`)) {
          state.players = state.players.filter(p => p.id !== id);
          savePlayers();
          renderRoster();
          showToast(`Removed ${player.name}`);
        }
      });
    });

    // View Season Stats button
    document.querySelectorAll('.stats-player-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const player = state.players.find(p => p.id === id);
        if (player && window.openPlayerStats) {
          window.openPlayerStats(player, state);
        }
      });
    });

    // Avatar click to open stats
    document.querySelectorAll('.player-avatar, .player-avatar-placeholder').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = el.closest('.player-row');
        const id = row?.querySelector('.attend-checkbox')?.getAttribute('data-id');
        const player = state.players.find(p => p.id === id);
        if (player && window.openPlayerStats) {
          window.openPlayerStats(player, state);
        }
      });
    });
  }

  // --- Group Formation Solver ---
  /**
   * Intelligently builds 5-man groups (1 Tank, 1 Healer, 3 DPS)
   * Handles multi-role flex players and balances key levels or class variety.
   */
  function solveGroups({ strategy, dungeonPoolMode, avoidClassDupes, ensureLust = true, ensureBrez = true, balanceIo = true, lockedGroups = [] }) {
    const attendees = state.players.filter(p => p.attending);

    // Identify players already locked into existing preserved groups
    const lockedPlayerIds = new Set();
    lockedGroups.forEach(g => {
      g.tank && lockedPlayerIds.add(g.tank.id);
      g.healer && lockedPlayerIds.add(g.healer.id);
      g.dps.forEach(d => lockedPlayerIds.add(d.id));
    });

    // Available players to assign
    const availablePool = attendees.filter(p => !lockedPlayerIds.has(p.id));

    // Calculate how many more groups we need/can form
    const totalPossibleGroups = Math.floor(attendees.length / 5);
    // Start from the most groups the headcount allows, then step down if tanks/healers run short.
    const tankCapable = availablePool.filter(p => (p.roles || []).includes('Tank')).length;
    const healerCapable = availablePool.filter(p => (p.roles || []).includes('Healer')).length;
    let groupsNeeded = Math.min(totalPossibleGroups - lockedGroups.length, tankCapable, healerCapable);
    const groupsWanted = totalPossibleGroups - lockedGroups.length;

    if (groupsWanted <= 0 && lockedGroups.length === 0) {
      return {
        groups: [],
        benched: availablePool,
        message: 'Need at least 5 attending members to form a dungeon group!'
      };
    }

    // Randomized constraint solver / optimizer
    let bestResult = null;
    let bestScore = -Infinity;
    const NUM_SOLVER_ATTEMPTS = 400;

    while (groupsNeeded > 0) {

    for (let attempt = 0; attempt < NUM_SOLVER_ATTEMPTS; attempt++) {
      // Shuffle available pool for stochastic variation
      const shuffled = shuffleArray([...availablePool]);

      // Assign roles: We need groupsNeeded Tanks, groupsNeeded Healers, and groupsNeeded * 3 DPS
      const tanks = [];
      const healers = [];
      const dps = [];

      // Prioritize members wanting to run full time over voluntary reserves
      const candidateTanks = shuffled.filter(p => p.roles.includes('Tank'))
        .sort((a, b) => (a.isReserve ? 1 : 0) - (b.isReserve ? 1 : 0));
      const candidateHealers = shuffled.filter(p => p.roles.includes('Healer'))
        .sort((a, b) => (a.isReserve ? 1 : 0) - (b.isReserve ? 1 : 0));
      const candidateDps = shuffled.filter(p => p.roles.includes('DPS'))
        .sort((a, b) => (a.isReserve ? 1 : 0) - (b.isReserve ? 1 : 0));

      // Greedy assignment with backtracking flavor
      const assignedIds = new Set();

      // Pick Tanks
      for (const p of candidateTanks) {
        if (tanks.length < groupsNeeded && !assignedIds.has(p.id)) {
          tanks.push({ ...p, assignedRole: 'Tank' });
          assignedIds.add(p.id);
        }
      }

      // Pick Healers
      for (const p of candidateHealers) {
        if (healers.length < groupsNeeded && !assignedIds.has(p.id)) {
          healers.push({ ...p, assignedRole: 'Healer' });
          assignedIds.add(p.id);
        }
      }

      // Pick DPS
      const neededDpsCount = groupsNeeded * 3;
      for (const p of candidateDps) {
        if (dps.length < neededDpsCount && !assignedIds.has(p.id)) {
          dps.push({ ...p, assignedRole: 'DPS' });
          assignedIds.add(p.id);
        }
      }

      // If we couldn't even fill the roles, check if flex players could be swapped
      if (tanks.length < groupsNeeded || healers.length < groupsNeeded || dps.length < neededDpsCount) {
        continue;
      }

      // We have enough roles for groupsNeeded!
      // Form candidate groups
      const candidateGroups = [];
      for (let i = 0; i < groupsNeeded; i++) {
        candidateGroups.push({
          tank: tanks[i],
          healer: healers[i],
          dps: [dps[i * 3], dps[i * 3 + 1], dps[i * 3 + 2]],
          isLocked: false
        });
      }

      // Score this configuration based on strategy and utilities
      let score = 0;

      candidateGroups.forEach(grp => {
        const members = [grp.tank, grp.healer, ...grp.dps];

        // Key level affinity
        const minKeys = members.map(m => m.keyMin);
        const maxKeys = members.map(m => m.keyMax);
        const groupMinOverlap = Math.max(...minKeys);
        const groupMaxOverlap = Math.min(...maxKeys);

        if (strategy === 'balanced') {
          // Bonus if everyone's comfort brackets overlap
          if (groupMinOverlap <= groupMaxOverlap) {
            score += 50 + (groupMaxOverlap - groupMinOverlap) * 5;
          } else {
            // Penalty for key gap
            score -= (groupMinOverlap - groupMaxOverlap) * 20;
          }
        } else if (strategy === 'guildMixer') {
          // Reward diversity in classes and mix of ranges
          const classSet = new Set(members.map(m => m.className));
          score += classSet.size * 10;
        }

        // Avoid class duplicate penalty if enabled
        if (avoidClassDupes) {
          const classes = members.map(m => m.className);
          const uniqueClasses = new Set(classes);
          const duplicates = classes.length - uniqueClasses.size;
          score -= duplicates * 15;
        }

        // Bloodlust / Heroism coverage
        if (ensureLust) {
          const lustCount = members.filter(m => WOW_CLASSES[m.className]?.lust).length;
          if (lustCount >= 1) {
            score += 50;
            if (lustCount > 2) {
              score -= (lustCount - 1) * 25; // Discourage hoarding lust in one group
            }
          } else {
            score -= 75; // Heavy penalty for missing Lust
          }
        }

        // Battle Resurrection coverage
        if (ensureBrez) {
          const brezCount = members.filter(m => WOW_CLASSES[m.className]?.brez).length;
          if (brezCount >= 1) {
            score += 50;
            if (brezCount > 2) {
              score -= (brezCount - 1) * 25; // Discourage hoarding brez in one group
            }
          } else {
            score -= 75; // Heavy penalty for missing BRez
          }
        }

        // 💩 Shitter Alt Group clustering:
        // Try to gather players who checked "I'm a shitter" together!
        const shitterCount = members.filter(m => m.isShitter).length;
        if (shitterCount >= 2) {
          // Substantial reward for clustering shitters together into alt groups
          score += shitterCount * 50;
        } else if (shitterCount === 1) {
          // Penalty for isolating a single shitter if there are multiple shitters available
          const totalShitters = availablePool.filter(p => p.isShitter).length;
          if (totalShitters > 1) {
            score -= 35;
          }
        }

        // 🎒 Carry & 🏋️ Stronk Back matching:
        // Attempt to match "I need a carry" with people willing to carry ("My back is stronk")
        const needCarryMembers = members.filter(m => m.carryPreference === 'need_carry');
        const willingCarryMembers = members.filter(m => m.carryPreference === 'willing_carry');

        if (needCarryMembers.length > 0) {
          if (willingCarryMembers.length >= 1) {
            // Success! Someone needing a carry has at least one strong back to carry them
            score += 70;
            if (willingCarryMembers.length >= needCarryMembers.length) {
              score += 25;
            }
          } else {
            // Penalty: Group has people needing a carry, but nobody willing to carry
            score -= 60;
          }
        }
      });

      // Equalize Average Group M+ Score (IO) across all teams
      if (balanceIo && candidateGroups.length > 1) {
        const groupAvgIos = candidateGroups.map(grp => {
          const members = [grp.tank, grp.healer, ...grp.dps];
          const total = members.reduce((sum, m) => sum + (m.io || 0), 0);
          return total / members.length;
        });
        const maxAvg = Math.max(...groupAvgIos);
        const minAvg = Math.min(...groupAvgIos);
        const ioSpread = maxAvg - minAvg;
        score -= (ioSpread * 0.28);
      }

      if (score > bestScore || bestResult === null) {
        bestScore = score;
        const benched = availablePool.filter(p => !assignedIds.has(p.id));
        bestResult = {
          newGroups: candidateGroups,
          benched: benched
        };
      }
    }

      if (bestResult) break;

      groupsNeeded--;

    }

    // If solver found no groups because we don't have enough tanks or healers
    if (!bestResult) {
      // Determine what is missing
      const tankCount = availablePool.filter(p => p.roles.includes('Tank')).length;
      const healerCount = availablePool.filter(p => p.roles.includes('Healer')).length;
      const dpsCount = availablePool.filter(p => p.roles.includes('DPS')).length;

      let msg = 'Could not assemble a standard 1 Tank, 1 Healer, 3 DPS composition.';
      if (tankCount < 1) msg += ' Missing an active Tank!';
      else if (healerCount < 1) msg += ' Missing an active Healer!';
      else if (dpsCount < 3) msg += ' Need at least 3 active DPS!';

      return {
        groups: lockedGroups,
        benched: availablePool,
        message: msg
      };
    }

    // Assign party names and dungeons to new groups respecting exclusions
    const activePool = DUNGEONS_MIDNIGHT_S2.filter(d => !(state.excludedDungeons || []).includes(d));
    const dungeonList = dungeonPoolMode === 'none' 
      ? [] 
      : (activePool.length > 0 ? activePool : DUNGEONS_MIDNIGHT_S2);
    const shuffledNames = shuffleArray([...PARTY_NAMES]);
    const shuffledDungeons = shuffleArray([...dungeonList]);

    const finalGroups = [...lockedGroups];
    bestResult.newGroups.forEach((grp, idx) => {
      const members = [grp.tank, grp.healer, ...grp.dps];
      const minKeys = members.map(m => m.keyMin);
      const maxKeys = members.map(m => m.keyMax);

      const lowestMax = Math.min(...maxKeys);
      const highestMin = Math.max(...minKeys);

      let targetKey;
      let keyRangeStr;
      if (highestMin <= lowestMax) {
        targetKey = Math.round((highestMin + lowestMax) / 2);
        keyRangeStr = `+${highestMin} to +${lowestMax} (Target: +${targetKey})`;
      } else {
        targetKey = Math.round((Math.min(...minKeys) + Math.max(...maxKeys)) / 2);
        keyRangeStr = `+${Math.min(...minKeys)} to +${Math.max(...maxKeys)} (Compromise: +${targetKey})`;
      }

      // Check if any member owns a key matching or close to target and not excluded
      const validOwnedKeys = members.filter(m => {
        if (!m.ownedKey || m.ownedKey.trim() === '') return false;
        const dung = m.ownedKey.split('+')[0].trim();
        return !(state.excludedDungeons || []).includes(dung);
      });

      let assignedDungeon = '';
      if (validOwnedKeys.length > 0) {
        assignedDungeon = validOwnedKeys[0].ownedKey; // Fun perk: prioritize someone's actual key!
      } else if (shuffledDungeons.length > 0) {
        const pickedDungeon = shuffledDungeons[idx % shuffledDungeons.length];
        assignedDungeon = `${pickedDungeon} +${targetKey}`;
      } else {
        assignedDungeon = `Mythic +${targetKey}`;
      }

      const lustMember = members.find(m => WOW_CLASSES[m.className]?.lust);
      const brezMember = members.find(m => WOW_CLASSES[m.className]?.brez);
      const leaderMember = members.find(m => m.isLeader);

      const totalIo = members.reduce((sum, m) => sum + (m.io || 0), 0);
      const totalIlvl = members.reduce((sum, m) => sum + (m.ilvl || 0), 0);
      const avgIo = Math.round(totalIo / members.length);
      const avgIlvl = Math.round((totalIlvl / members.length) * 10) / 10;

      const shitterCount = members.filter(m => m.isShitter).length;
      const isShitterGroup = shitterCount >= 2;

      const needCarryMembers = members.filter(m => m.carryPreference === 'need_carry');
      const willingCarryMembers = members.filter(m => m.carryPreference === 'willing_carry');
      const hasCarryMatch = needCarryMembers.length > 0 && willingCarryMembers.length > 0;

      let groupName = shuffledNames[idx % shuffledNames.length];
      if (isShitterGroup) {
        const shitterNames = [
          'The Shitter Squad',
          'Shitter Alt Syndicate',
          'Floor Inspectors Deluxe',
          'Grey Parse All-Stars',
          'Dungeon Floor Warmers'
        ];
        groupName = shitterNames[idx % shitterNames.length];
      }

      finalGroups.push({
        id: 'group-' + Date.now() + '-' + idx,
        number: finalGroups.length + 1,
        name: groupName,
        targetKeyStr: keyRangeStr,
        dungeon: assignedDungeon,
        avgIo,
        avgIlvl,
        tank: grp.tank,
        healer: grp.healer,
        dps: grp.dps,
        isLocked: false,
        hasLust: !!lustMember,
        lustProvider: lustMember ? `${lustMember.name} (${lustMember.className})` : null,
        hasBrez: !!brezMember,
        brezProvider: brezMember ? `${brezMember.name} (${brezMember.className})` : null,
        hasLeader: !!leaderMember,
        leaderName: leaderMember ? leaderMember.name : null,
        isShitterGroup,
        shitterCount,
        hasCarryMatch,
        needCarryNames: needCarryMembers.map(m => m.name),
        willingCarryNames: willingCarryMembers.map(m => m.name)
      });
    });

    return {
      groups: finalGroups,
      benched: bestResult.benched,
      message: null
    };
  }

  // --- Dungeon Pool & Roulette Actions ---
  function renderDungeonChips() {
    const grid = document.getElementById('dungeonChipsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    DUNGEONS_MIDNIGHT_S2.forEach(dungeon => {
      const isExcluded = (state.excludedDungeons || []).includes(dungeon);
      const chip = document.createElement('div');
      chip.className = `dungeon-chip ${isExcluded ? 'excluded' : 'active'}`;
      chip.title = isExcluded ? `Click to INCLUDE ${dungeon}` : `Click to EXCLUDE ${dungeon}`;
      chip.innerHTML = `
        <span class="chip-name">${escapeHtml(dungeon)}</span>
        <span class="chip-status">${isExcluded ? '❌ Excluded' : '✅ Active'}</span>
      `;
      chip.addEventListener('click', () => {
        toggleDungeonExclusion(dungeon);
      });
      grid.appendChild(chip);
    });
  }

  function toggleDungeonExclusion(dungeon) {
    state.excludedDungeons = state.excludedDungeons || [];
    if (state.excludedDungeons.includes(dungeon)) {
      state.excludedDungeons = state.excludedDungeons.filter(d => d !== dungeon);
    } else {
      state.excludedDungeons.push(dungeon);
    }
    saveExclusions();
    renderDungeonChips();
    playSound('click');
  }

  // --- Keystone Roulette & Party Key Actions ---
  function typedKeyFor(member) {
    if (!member?.name) return '';
    const live = state.players.find(player => player.name.toLowerCase() === member.name.toLowerCase()) || member;
    return live.keyManual && live.ownedKey ? String(live.ownedKey).trim() : '';
  }

  function updateRouletteTargetGroups() {
    const targetGroupSelect = document.getElementById('rouletteTargetGroupSelect');
    const promptEl = document.getElementById('rouletteNoGroupPrompt');
    const heldKeysWrap = document.getElementById('groupHeldKeysWrap');
    const actionRow = document.getElementById('rouletteActionRow');
    if (!targetGroupSelect) return;

    if (!state.formedGroups || state.formedGroups.length === 0) {
      targetGroupSelect.innerHTML = `<option value="">-- No formed parties yet --</option>`;
      targetGroupSelect.disabled = true;
      if (promptEl) promptEl.style.display = 'block';
      if (heldKeysWrap) heldKeysWrap.style.display = 'none';
      if (actionRow) actionRow.style.display = 'none';
      return;
    }

    targetGroupSelect.disabled = false;
    const selectedVal = targetGroupSelect.value;
    let opts = `<option value="">-- Choose a party --</option>`;
    state.formedGroups.forEach((group, idx) => {
      opts += `<option value="${idx}">Party ${idx + 1}: ${escapeHtml(group.name)}</option>`;
    });
    targetGroupSelect.innerHTML = opts;

    if (selectedVal !== '' && state.formedGroups[parseInt(selectedVal, 10)]) {
      targetGroupSelect.value = selectedVal;
      renderSelectedPartyRoulette(parseInt(selectedVal, 10));
    } else {
      targetGroupSelect.value = '0';
      renderSelectedPartyRoulette(0);
    }
  }

  function renderSelectedPartyRoulette(grpIdx) {
    const promptEl = document.getElementById('rouletteNoGroupPrompt');
    const heldKeysWrap = document.getElementById('groupHeldKeysWrap');
    const actionRow = document.getElementById('rouletteActionRow');
    const keysList = document.getElementById('groupKeysList');
    const rollBtn = document.getElementById('rollKeystoneBtn');

    if (isNaN(grpIdx) || !state.formedGroups || !state.formedGroups[grpIdx]) {
      if (promptEl) promptEl.style.display = 'block';
      if (heldKeysWrap) heldKeysWrap.style.display = 'none';
      if (actionRow) actionRow.style.display = 'none';
      return;
    }

    const grp = state.formedGroups[grpIdx];
    grp.excludedPlayers = grp.excludedPlayers || [];
    if (promptEl) promptEl.style.display = 'none';
    if (heldKeysWrap) heldKeysWrap.style.display = 'block';
    if (actionRow) actionRow.style.display = 'flex';

    const partyMembers = [grp.tank, grp.healer, ...(grp.dps || [])].filter(Boolean);
    if (keysList) {
      keysList.innerHTML = partyMembers.map(member => {
        const key = typedKeyFor(member);
        const excluded = grp.excludedPlayers.some(name => name.toLowerCase() === member.name.toLowerCase());
        return `<button type="button" class="player-exclude-chip ${excluded ? 'is-out' : ''} ${key ? '' : 'no-key'}" data-player="${escapeHtml(member.name)}">
          ${escapeHtml(member.name)}${key ? ` · ${escapeHtml(key)}` : ' · (no key entered)'}
        </button>`;
      }).join('');
      keysList.querySelectorAll('.player-exclude-chip').forEach(button => {
        button.addEventListener('click', () => {
          const playerName = button.getAttribute('data-player');
          const already = grp.excludedPlayers.some(name => name.toLowerCase() === playerName.toLowerCase());
          grp.excludedPlayers = already
            ? grp.excludedPlayers.filter(name => name.toLowerCase() !== playerName.toLowerCase())
            : [...grp.excludedPlayers, playerName];
          saveGroups();
          renderGroups();
          playSound('click');
        });
      });
    }

    if (rollBtn) rollBtn.textContent = `🎲 Roll a key for Party ${grpIdx + 1}`;
  }

  function rollPartyKey(grpIdx) {
    const grp = state.formedGroups?.[grpIdx];
    if (!grp) return null;
    if (grp.isLocked) {
      showToast('Unlock that party before rolling a key.');
      return null;
    }

    const excluded = new Set((grp.excludedPlayers || []).map(name => name.toLowerCase()));
    const partyMembers = [grp.tank, grp.healer, ...(grp.dps || [])].filter(Boolean);
    const pool = partyMembers.filter(member => !excluded.has(member.name.toLowerCase()));
    if (!pool.length) {
      showToast('All players in this party are currently excluded.');
      return null;
    }

    const picked = pool[Math.floor(Math.random() * pool.length)];
    const typedKey = typedKeyFor(picked);
    const fullKeyStr = typedKey || `${picked.name}'s key (check bags)`;
    grp.dungeon = fullKeyStr;
    grp.assignedDungeon = fullKeyStr;
    grp.keystone = fullKeyStr;
    saveGroups();
    renderGroups();

    const banner = document.getElementById('rouletteResultBanner');
    const resultText = document.getElementById('rouletteResultText');
    const holdersText = document.getElementById('rouletteHoldersText');
    if (banner && resultText) {
      banner.style.display = 'flex';
      resultText.textContent = typedKey
        ? `${picked.name}'s key: ${fullKeyStr}`
        : `${picked.name}'s key (unlogged keystone - ask ${picked.name} to check bags!)`;
      if (holdersText) holdersText.textContent = `Party ${grpIdx + 1} will run this key.`;
    }
    playSound('keystone');
    showToast(typedKey ? `Rolled ${picked.name}: ${fullKeyStr}` : `Selected ${picked.name} for the key!`);
    return { picked, fullKeyStr };
  }

  function handleRollKeystone() {
    const selectedVal = document.getElementById('rouletteTargetGroupSelect')?.value;
    if (selectedVal === '' || selectedVal === null || selectedVal === undefined) {
      showToast('Pick a party first.');
      return;
    }
    rollPartyKey(parseInt(selectedVal, 10));
  }

  async function handleSyncKeystones() {
    const attendees = state.players.filter(p => p.attending);
    if (attendees.length === 0) {
      showToast('⚠️ No attending members to sync keystones for!');
      return;
    }

    const btn = document.getElementById('syncKeystonesBtn');
    const origText = btn ? btn.innerHTML : '🔑 Sync Keys';
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Syncing Keys...';
    }

    showToast(`🔑 Refreshing active keystones from Raider.IO for ${attendees.length} members...`);

    let updated = 0;
    for (let i = 0; i < attendees.length; i++) {
      const p = attendees[i];
      if (btn) btn.textContent = `⏳ Syncing Keys (${i + 1}/${attendees.length})...`;
      try {
        const cleanName = encodeURIComponent(p.name.trim());
        const cleanRealm = encodeURIComponent((p.realm || 'Perenolde').trim().toLowerCase().replace(/\s+/g, '-').replace(/'/g, ''));
        const region = p.region || 'us';
        const url = `https://raider.io/api/v1/characters/profile?region=${region}&realm=${cleanRealm}&name=${cleanName}&fields=gear,mythic_plus_recent_runs,mythic_plus_best_runs`;

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const recent = data.mythic_plus_recent_runs?.[0] || data.mythic_plus_best_runs?.[0];
          if (recent) {
            // Keystones stay blank until someone types them.
            updated++;
          }
          if (data.gear?.item_level_equipped) {
            p.ilvl = Math.round(data.gear.item_level_equipped);
          }
        }
      } catch (err) {}
      await new Promise(r => setTimeout(r, 60));
    }

    savePlayers();
    renderRoster();
    if (btn) {
      btn.innerHTML = origText;
      btn.disabled = false;
    }
    playSound('fanfare');
    showToast(`✨ Keystone sync complete! (${updated} keystones refreshed)`);
  }

  // --- Group Generation Action ---
  function handleGenerateGroups(rerollUnlockedOnly = false) {
    const strategy = document.getElementById('matchingModeSelect').value;
    const dungeonPoolMode = document.getElementById('dungeonPoolSelect').value;
    const avoidClassDupes = document.getElementById('avoidClassDupes').checked;
    const ensureLust = document.getElementById('ensureLustCheck').checked;
    const ensureBrez = document.getElementById('ensureBrezCheck').checked;
    const balanceIo = document.getElementById('balanceIoCheck').checked;

    const locked = rerollUnlockedOnly ? state.formedGroups.filter(g => g.isLocked) : [];

    const result = solveGroups({
      strategy,
      dungeonPoolMode,
      avoidClassDupes,
      ensureLust,
      ensureBrez,
      balanceIo,
      lockedGroups: locked
    });

    if (result.message && result.groups.length === 0) {
      alert(result.message);
      return;
    }

    state.formedGroups = result.groups;
    state.benchedPlayers = result.benched;
    saveGroups();

    // Sound and keystone pulse
    playSound('keystone');
    setTimeout(() => playSound('fanfare'), 600);

    const sigil = document.getElementById('keystoneSigil');
    if (sigil) {
      sigil.style.transform = 'scale(1.25) rotate(15deg)';
      setTimeout(() => { sigil.style.transform = ''; }, 500);
    }

    renderGroups();
    showToast(`Formed ${result.groups.length} dungeon ${result.groups.length === 1 ? 'group' : 'groups'}!`);
  }

  // --- Render Groups UI ---
  function renderGroups() {
    const grid = document.getElementById('groupsGrid');
    const actions = document.getElementById('groupsActions');
    const benchContainer = document.getElementById('benchContainer');
    const benchList = document.getElementById('benchList');
    const benchAdvice = document.getElementById('benchAdvice');
    const benchCountBadge = document.getElementById('benchCountBadge');

    if (!grid) return;
    grid.innerHTML = '';

    if (state.formedGroups.length === 0) {
      actions.style.display = 'none';
      benchContainer.style.display = 'none';
      renderOfficerNotes();
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🛡️⚔️💚</div>
          <h4>No groups formed yet</h4>
          <p>Make sure at least 5 guild members (including at least 1 Tank &amp; 1 Healer) are marked attending, then click <strong>Form Groups</strong>.</p>
        </div>
      `;
      return;
    }

    actions.style.display = 'flex';

    function isPlaced(name) {
      const key = String(name || '').toLowerCase();
      const inGroup = state.formedGroups.some(group => [group.tank, group.healer, ...(group.dps || [])].some(member => member && member.name.toLowerCase() === key));
      const onBench = (state.benchedPlayers || []).some(member => member.name.toLowerCase() === key);
      return inGroup || onBench;
    }

    function moveMenu(name) {
      const options = ['<option value="">Move...</option>', '<option value="bench">Send to bench</option>'];
      state.formedGroups.forEach((group, gi) => {
        options.push(`<option value="g${gi}:tank">Party ${gi + 1} tank</option>`);
        options.push(`<option value="g${gi}:healer">Party ${gi + 1} healer</option>`);
        (group.dps || []).forEach((member, di) => options.push(`<option value="g${gi}:dps:${di}">Party ${gi + 1} DPS ${di + 1}</option>`));
      });
      state.players.filter(player => player.attending && !isPlaced(player.name)).forEach(player => {
        options.push(`<option value="swapin:${encodeURIComponent(player.name)}">Replace with ${escapeHtml(player.name)}</option>`);
      });
      return `<select class="form-select move-player" data-player="${escapeHtml(name)}" title="Move ${escapeHtml(name)}" style="margin-top:0.35rem; max-width: 220px;">${options.join('')}</select>`;
    }

    function renderMemberVibeBadges(p) {
      if (!p) return '';
      let h = '';
      if (p.isLeader) {
        h += `<span class="leader-pill" style="font-size:0.65rem; padding:0.05rem 0.35rem;" title="Born Leader: willing to lead group">👑 Leader</span>`;
      }
      if (p.isReserve) {
        h += `<span class="reserve-pill" style="font-size:0.65rem; padding:0.05rem 0.35rem;" title="Voluntary Bench / Reserve">🍺 Reserve</span>`;
      }
      if (p.carryPreference === 'need_carry') {
        h += `<span class="carry-pill need" style="font-size:0.65rem; padding:0.05rem 0.35rem;" title="I need a carry">🎒 Carry Me</span>`;
      } else if (p.carryPreference === 'willing_carry') {
        h += `<span class="carry-pill stronk" style="font-size:0.65rem; padding:0.05rem 0.35rem;" title="My back is stronk (willing to carry)">🏋️ Stronk Back</span>`;
      }
      if (p.isShitter) {
        h += `<span class="shitter-pill" style="font-size:0.65rem; padding:0.05rem 0.35rem;" title="I'm a shitter (shitter alt group enjoyer)">💩 Shitter</span>`;
      }
      return h;
    }

    function renderMemberSlot(roleSlot, member) {
      if (!member) return '';
      const memberClass = WOW_CLASSES[member.className] || { color: '#fff' };
      const roleIcon = roleSlot === 'Tank' ? '🛡️' : (roleSlot === 'Healer' ? '💚' : '⚔️');
      const roleCss = roleSlot === 'Tank' ? 'role-tank' : (roleSlot === 'Healer' ? 'role-healer' : 'role-dps');
      const ioColor = getIoColor(member.io);
      const key = typedKeyFor(member);

      return `
        <div class="party-member-row is-collapsed ${roleCss}">
          <span class="slot-role-tag" title="${roleSlot}">${roleIcon}</span>
          <div class="slot-player-details">
            <div class="slot-top-row slot-toggle-trigger" title="Click to expand or collapse details">
              <div class="slot-top-left">
                <span class="slot-player-name" style="color: ${memberClass.color};">${escapeHtml(member.name)}</span>
                <span class="class-tag" style="color: ${memberClass.color}; border: 1px solid ${memberClass.color}44;">${escapeHtml(member.className)}</span>
                ${key ? `<span class="slot-key-mini" title="Key: ${escapeHtml(key)}">🔑 ${escapeHtml(key)}</span>` : ''}
              </div>
              <div class="slot-top-right">
                <span class="slot-stat-badge io" style="color: ${ioColor}; border: 1px solid ${ioColor}77;">${(member.io || 0).toLocaleString()} IO</span>
                <span class="slot-expand-chevron">▸</span>
              </div>
            </div>
            <div class="slot-details-collapsible">
              <div class="slot-bottom-row">
                <div class="slot-meta-left">
                  <span class="slot-stat-badge ilvl">${member.ilvl || 320} iLvl</span>
                  ${renderMemberVibeBadges(member)}
                </div>
                <span class="slot-key-range">+${member.keyMin} – +${member.keyMax}</span>
              </div>
              <div class="slot-actions-sub" style="display:flex; justify-content:space-between; align-items:center; margin-top:0.35rem; gap:0.5rem;">
                <button type="button" class="btn-action-icon stats-player-btn view-member-stats-btn" data-name="${escapeHtml(member.name)}" style="padding:0.18rem 0.6rem; font-size:0.72rem;" title="View Season Stats & Dossier">📊 Stats &amp; History</button>
                ${moveMenu(member.name)}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Render Each 5-man Party Card
    state.formedGroups.forEach((grp, index) => {
      if (!grp.tank || !grp.healer) return;
      const card = document.createElement('div');
      card.className = `party-card ${grp.isLocked ? 'is-locked' : ''}`;
      card.style.animationDelay = `${index * 0.08}s`;

      const members = [grp.tank, grp.healer, ...(grp.dps || [])].filter(Boolean);
      const inKeyCount = members.filter(m => {
        const live = state.players.find(p => p.name === m.name);
        const st = live?.nightStatus || m.nightStatus;
        return st === 'in-key';
      }).length;
      const totalMembers = members.length;

      let partyStatusHtml = '';
      if (totalMembers > 0 && inKeyCount === totalMembers) {
        partyStatusHtml = '<span class="party-status-indicator in-key" title="All members are currently In key">🗝️ In key</span>';
      } else if (inKeyCount > 0) {
        partyStatusHtml = `<span class="party-status-indicator in-key" title="${inKeyCount} of ${totalMembers} members are in key">🗝️ In key (${inKeyCount}/${totalMembers})</span>`;
      } else {
        partyStatusHtml = '<span class="party-status-indicator waiting" title="Party is waiting to run">⏳ Waiting</span>';
      }

      const rolledKey = (grp.keystone || grp.dungeon || '').trim();
      const hasRolledKey = rolledKey && rolledKey !== 'No key rolled yet';
      const hasLeftOut = (grp.excludedPlayers || []).length > 0;

      card.innerHTML = `
        <div class="party-header">
          <div class="party-badge-title">
            <span class="party-num">Party ${index + 1} ·</span>
            <span class="party-name">${escapeHtml(grp.name)}</span>
          </div>
          <div class="party-card-controls">
            <button class="btn-icon lock-party-btn" data-id="${grp.id}" title="${grp.isLocked ? 'Unlock Group' : 'Lock Group (Prevent Rerolls)'}">
              ${grp.isLocked ? '🔒 Locked' : '🔓 Lock'}
            </button>
          </div>
        </div>

        <div class="party-sub-meta">
          <div class="party-sub-status">
            ${partyStatusHtml}
          </div>
          <div class="party-sub-key-area">
            ${hasRolledKey ? `<span class="party-dungeon-tag" title="Key rolled for this party">🔑 ${escapeHtml(rolledKey)}</span>` : ''}
            ${hasLeftOut ? `<span class="party-left-out" title="Excluded from roll">Left out: ${escapeHtml(grp.excludedPlayers.join(', '))}</span>` : ''}
          </div>
        </div>

        <div class="party-utility-bar">
          ${grp.hasLeader && grp.leaderName ? `<span class="party-util-badge ready" title="Designated Group Leader">👑 Leader: ${escapeHtml(grp.leaderName)}</span>` : ''}
          <span class="party-util-badge ${grp.hasLust ? 'ready' : 'missing'}" title="${grp.hasLust ? 'Bloodlust/Heroism ready: ' + escapeHtml(grp.lustProvider) : 'No Bloodlust class in this group! Bring drums!'}">
            ⚡ ${grp.hasLust ? 'Lust: ' + escapeHtml(grp.lustProvider) : 'Lust: Missing'}
          </span>
          <span class="party-util-badge ${grp.hasBrez ? 'ready' : 'missing'}" title="${grp.hasBrez ? 'Battle Rez ready: ' + escapeHtml(grp.brezProvider) : 'No Battle Rez class in this group!'}">
            🔄 ${grp.hasBrez ? 'BRez: ' + escapeHtml(grp.brezProvider) : 'BRez: Missing'}
          </span>
          ${grp.isShitterGroup ? `<span class="party-util-badge shitter-group" title="Dedicated Shitter Alt Squad! (${grp.shitterCount} Shitters)">💩 Shitter Squad</span>` : ''}
          ${grp.hasCarryMatch ? `<span class="party-util-badge carry-assist" title="Carry Match: ${escapeHtml(grp.willingCarryNames.join(', '))} carrying ${escapeHtml(grp.needCarryNames.join(', '))}">🎒 Carry Assisted</span>` : ''}
        </div>

        <div class="party-metrics-bar">
          <span class="party-avg-io">⭐ Avg IO: <strong>${(grp.avgIo || 0).toLocaleString()}</strong></span>
          <span class="party-avg-ilvl">🛡️ Avg iLvl: <strong>${grp.avgIlvl || 620}</strong></span>
        </div>

        <div class="party-members">
          ${renderMemberSlot('Tank', grp.tank)}
          ${renderMemberSlot('Healer', grp.healer)}
          ${(grp.dps || []).map(dps => renderMemberSlot('DPS', dps)).join('')}
        </div>

        <div class="party-footer" style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap;">
          <button class="btn btn-sm btn-ghost copy-party-btn" data-id="${grp.id}" title="Copy party lineup for Discord">
            📋 Copy Lineup
          </button>
          <button class="btn btn-sm auto-match-party-btn" data-id="${grp.id}" title="Check Raider.IO for completed key for this party">
            ⚡ Auto-Match Key
          </button>
        </div>
      `;

      grid.appendChild(card);
    });

    // Attach Party Card Member Toggle Events
    document.querySelectorAll('.slot-toggle-trigger').forEach(trigger => {
      trigger.addEventListener('click', () => {
        const row = trigger.closest('.party-member-row');
        if (row) {
          row.classList.toggle('is-collapsed');
        }
      });
    });

    document.querySelectorAll('.move-player').forEach(select => {
      select.addEventListener('click', (e) => e.stopPropagation());
    });

    document.querySelectorAll('.view-member-stats-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const name = btn.getAttribute('data-name');
        if (window.openPlayerStats) {
          window.openPlayerStats(name, state);
        }
      });
    });

    // Attach Party Card Button Events
    document.querySelectorAll('.lock-party-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const grp = state.formedGroups.find(g => g.id === id);
        if (grp) {
          grp.isLocked = !grp.isLocked;
          playSound('lock');
          saveGroups();
          renderGroups();
        }
      });
    });

    document.querySelectorAll('.copy-party-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const grp = state.formedGroups.find(g => g.id === id);
        if (grp) {
          copySinglePartyToDiscord(grp);
        }
      });
    });

    document.querySelectorAll('.party-card-reroll-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-group-index'), 10);
        rollPartyKey(idx);
      });
    });

    // Auto-Match Run for this party
    document.querySelectorAll('.auto-match-party-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const grp = state.formedGroups.find(g => g.id === id);
        if (!grp || !window.autoMatchParty) return;

        const origHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '🔍 Checking...';

        await window.autoMatchParty(grp, state, {
          onFound: (match, count) => {
            btn.disabled = false;
            btn.innerHTML = origHtml;
            playSound('fanfare');
            savePlayers();
            saveGroups();
            renderGroups();
            renderRoster();
            showToast(`🎉 Logged ${match.run.dungeon} +${match.run.mythic_level} for ${grp.name}! (${count} members updated)`);
          },
          onNotFound: () => {
            btn.disabled = false;
            btn.innerHTML = origHtml;
            alert(`No recently completed runs found on Raider.IO for ${grp.name} yet.\n\n(Raider.IO usually updates within 5-10 minutes of key completion).`);
          },
          onError: (err) => {
            btn.disabled = false;
            btn.innerHTML = origHtml;
            alert(`Error matching run: ${err.message}`);
          }
        });
      });
    });

    // Update Keystone Roulette Target Group Dropdown Options
    updateRouletteTargetGroups();

    // Render Bench / Tavern Reserves
    if (state.benchedPlayers && state.benchedPlayers.length > 0) {
      benchContainer.style.display = 'block';
      benchCountBadge.textContent = `${state.benchedPlayers.length} Guildies`;
      benchList.innerHTML = '';

      let benchedTanks = 0, benchedHealers = 0, benchedDps = 0;
      state.benchedPlayers.forEach(p => {
        if (p.roles.includes('Tank')) benchedTanks++;
        if (p.roles.includes('Healer')) benchedHealers++;
        if (p.roles.includes('DPS')) benchedDps++;

        const pClass = WOW_CLASSES[p.className] || { color: '#fff' };
        const pill = document.createElement('div');
        pill.className = 'bench-pill';
        pill.innerHTML = `
          <strong style="color: ${pClass.color};">${escapeHtml(p.name)}</strong>
          <span style="color: var(--text-muted); font-size: 0.75rem;">(${p.roles.join('/')})</span>
          <span class="slot-stat-badge ilvl">${p.ilvl || 620} iLvl</span>
          <span class="slot-stat-badge io" style="color: ${getIoColor(p.io)};">${(p.io || 0).toLocaleString()} IO</span>
          <span class="key-range-pill">+${p.keyMin}-+${p.keyMax}</span>
          ${moveMenu(p.name)}
        `;
        benchList.appendChild(pill);
      });

      // Helpful advice on what's missing for the next group
      const neededForNextGroup = 5 - state.benchedPlayers.length;
      let adviceText = `Need ${neededForNextGroup > 0 ? neededForNextGroup + ' more member(s)' : 'role redistribution'} to form another party.`;
      if (benchedTanks === 0) adviceText += ' (Missing 1 Tank)';
      if (benchedHealers === 0) adviceText += ' (Missing 1 Healer)';
      benchAdvice.textContent = adviceText;
    } else {
      benchContainer.style.display = 'none';
    }

    document.querySelectorAll('.move-player').forEach(sel => {
      sel.addEventListener('change', () => {
        if (!sel.value) return;
        moveFormedPlayer(sel.getAttribute('data-player'), sel.value);
      });
    });
    renderOfficerNotes();
  }

  function renderOfficerNotes() {
    const box = document.getElementById('officerNotes');
    if (!box) return;
    const entries = [];
    (state.players || []).forEach(player => {
      (player.runLog || []).forEach(entry => {
        entries.push({ player, entry });
      });
    });
    entries.sort((a, b) => Date.parse(b.entry.at || 0) - Date.parse(a.entry.at || 0));
    if (!entries.length) {
      box.style.display = 'none';
      return;
    }
    box.style.display = 'block';
    const faces = ['', '😠', '🙁', '😐', '🙂', '😄'];
    box.innerHTML = `<h3 style="font-family: Cinzel, serif; color: var(--text-gold);">Private run notes</h3>
      <p style="color: var(--text-muted);">Notes and group ratings are visible here and to the player who wrote them. Other players do not see them.</p>
      ${entries.slice(0, 40).map(({ player, entry }) => `<article style="padding:0.45rem 0; border-top:1px solid rgba(255,255,255,0.08);">
        <strong>${escapeHtml(player.name)}</strong> ${faces[entry.satisfaction] || ''} ${escapeHtml(entry.key || '')}
        <span style="color: var(--text-muted);"> · ${entry.success ? 'Timed' : 'Depleted'}${entry.groupName ? ` · ${escapeHtml(entry.groupName)}` : ''}</span>
        ${entry.note ? `<div>${escapeHtml(entry.note)}</div>` : ''}
        ${entry.rioUrl ? `<a href="${escapeHtml(entry.rioUrl)}" target="_blank" rel="noopener">Raider.IO</a>` : ''}
        ${entry.wclUrl ? ` · <a href="${escapeHtml(entry.wclUrl)}" target="_blank" rel="noopener">Warcraft Logs</a>` : ''}
      </article>`).join('')}`;
  }

  function moveFormedPlayer(name, dest) {
    const person = findRosterPerson(name);
    if (!person || !dest) return;
    const origin = findRosterSlot(name);
    if (dest.startsWith('swapin:')) {
      const incomingName = decodeURIComponent(dest.slice('swapin:'.length));
      const incoming = state.players.find(player => player.name === incomingName);
      if (!incoming || !origin || origin.kind !== 'slot') return;
      clearRosterPerson(name);
      putRosterPerson(origin, incoming);
      state.benchedPlayers = state.benchedPlayers || [];
      state.benchedPlayers.push(person);
    } else if (dest === 'bench') {
      if (origin?.kind === 'slot' && (origin.slot === 'tank' || origin.slot === 'healer') && !(state.benchedPlayers || []).length) {
        showToast('Move a bench player into that slot first so the party still has a tank and healer.');
        renderGroups();
        return;
      }
      clearRosterPerson(name);
      state.benchedPlayers = state.benchedPlayers || [];
      state.benchedPlayers.push(person);
      if (origin?.kind === 'slot' && (origin.slot === 'tank' || origin.slot === 'healer')) {
        const replacement = state.benchedPlayers.find(player => player.name !== person.name);
        if (replacement) {
          state.benchedPlayers = state.benchedPlayers.filter(player => player.name !== replacement.name);
          putRosterPerson(origin, replacement);
        }
      }
    } else {
      const match = dest.match(/^g(\d+):(tank|healer|dps)(?::(\d+))?$/);
      if (!match || !origin) return;
      const gi = Number(match[1]);
      const slot = match[2];
      const di = match[3] === undefined ? null : Number(match[3]);
      const group = state.formedGroups[gi];
      const occupant = slot === 'tank' ? group.tank : slot === 'healer' ? group.healer : group.dps[di];
      if (occupant && occupant.name.toLowerCase() === name.toLowerCase()) return;
      clearRosterPerson(name);
      if (occupant) clearRosterPerson(occupant.name);
      putRosterPerson({ kind: 'slot', gi, slot, di }, person);
      if (occupant) {
        if (origin.kind === 'slot') putRosterPerson(origin, occupant);
        else {
          state.benchedPlayers = state.benchedPlayers || [];
          state.benchedPlayers.push(occupant);
        }
      }
    }
    state.groupsTouchedAt = new Date().toISOString();
    saveGroups();
    renderGroups();
    showToast(`Moved ${person.name}.`);
  }

  function findRosterPerson(name) {
    const key = String(name || '').toLowerCase();
    for (const group of state.formedGroups) {
      const found = [group.tank, group.healer, ...(group.dps || [])].find(member => member && member.name.toLowerCase() === key);
      if (found) return found;
    }
    return (state.benchedPlayers || []).find(member => member.name.toLowerCase() === key)
      || state.players.find(member => member.name.toLowerCase() === key);
  }

  function findRosterSlot(name) {
    const key = String(name || '').toLowerCase();
    for (let gi = 0; gi < state.formedGroups.length; gi++) {
      const group = state.formedGroups[gi];
      if (group.tank?.name?.toLowerCase() === key) return { kind: 'slot', gi, slot: 'tank', di: null };
      if (group.healer?.name?.toLowerCase() === key) return { kind: 'slot', gi, slot: 'healer', di: null };
      const di = (group.dps || []).findIndex(member => member?.name?.toLowerCase() === key);
      if (di >= 0) return { kind: 'slot', gi, slot: 'dps', di };
    }
    if ((state.benchedPlayers || []).some(member => member.name.toLowerCase() === key)) return { kind: 'bench' };
    return null;
  }

  function clearRosterPerson(name) {
    const key = String(name || '').toLowerCase();
    state.formedGroups.forEach(group => {
      if (group.tank?.name?.toLowerCase() === key) group.tank = null;
      if (group.healer?.name?.toLowerCase() === key) group.healer = null;
      group.dps = (group.dps || []).filter(member => member?.name?.toLowerCase() !== key);
    });
    state.benchedPlayers = (state.benchedPlayers || []).filter(member => member.name.toLowerCase() !== key);
  }

  function putRosterPerson(slot, person) {
    const group = state.formedGroups[slot.gi];
    if (!group || !person) return;
    if (slot.slot === 'dps') {
      if (slot.di === null || slot.di === undefined || !group.dps[slot.di]) group.dps.push(person);
      else group.dps[slot.di] = person;
    } else {
      group[slot.slot] = person;
    }
  }

  // --- Discord Markdown Formatter ---
  function generateDiscordPost(singleGroup = null) {
    const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    let text = `⚔️ **KITH & KIN — MYTHIC+ NIGHT** (${timestamp}) ⚔️\n`;

    const groups = singleGroup ? [singleGroup] : state.formedGroups;

    function formatDiscordMember(m, roleIcon, roleName) {
      const vibeTags = [];
      if (m.isShitter) vibeTags.push('💩 Shitter');
      if (m.carryPreference === 'need_carry') vibeTags.push('🎒 Needs Carry');
      if (m.carryPreference === 'willing_carry') vibeTags.push('🏋️ Back is Stronk');
      const vibeStr = vibeTags.length > 0 ? ` [${vibeTags.join(', ')}]` : '';
      return `• ${roleIcon} ${roleName}: **${m.name}** (${m.className} • ${m.ilvl || 620} iLvl • ${(m.io || 0).toLocaleString()} IO)${vibeStr}\n`;
    }

    groups.forEach((grp, idx) => {
      const shitterTag = grp.isShitterGroup ? ' [💩 Shitter Alt Squad]' : '';
      text += `\n🛡️ **Group ${idx + 1}: ${grp.name}**${shitterTag}\n`;
      text += `🎯 **Keys:** ${grp.targetKeyStr}\n`;
      text += `🔑 **Key:** ${grp.keystone || grp.dungeon || 'No key rolled yet'}\n`;
      text += `📊 **Team Stats:** Avg IO: **${(grp.avgIo || 0).toLocaleString()}** | Avg iLvl: **${grp.avgIlvl || 620}**\n`;
      const lustStr = grp.hasLust ? `⚡ ${grp.lustProvider}` : `⚠️ Lust: None (Bring drums!)`;
      const brezStr = grp.hasBrez ? `🔄 ${grp.brezProvider}` : `⚠️ BRez: None (Engi brez)`;
      text += `✨ **Utility:** ${lustStr} | ${brezStr}\n`;
      if (grp.hasCarryMatch) {
        text += `🎒 **Carry Match:** ${grp.willingCarryNames.join(', ')} carrying ${grp.needCarryNames.join(', ')}\n`;
      }
      text += formatDiscordMember(grp.tank, '🛡️', 'Tank');
      text += formatDiscordMember(grp.healer, '💚', 'Healer');
      grp.dps.forEach(d => {
        text += formatDiscordMember(d, '⚔️', 'DPS');
      });
    });

    if (!singleGroup && state.benchedPlayers && state.benchedPlayers.length > 0) {
      text += `\n☕ **Tavern Reserves / Next Round Rotation:**\n`;
      state.benchedPlayers.forEach(p => {
        text += `• ${p.name} (${p.className} - ${p.roles.join('/')} • +${p.keyMin}-+${p.keyMax})\n`;
      });
    }

    text += `\nGood luck on the vault! For Kith and Kin! 🍻`;
    return text;
  }

  function copyAllToDiscord() {
    if (state.formedGroups.length === 0) {
      showToast('No groups to copy yet!');
      return;
    }
    const text = generateDiscordPost();
    navigator.clipboard.writeText(text).then(() => {
      playSound('click');
      showToast('Copied all groups for Discord!');
    }).catch(() => {
      prompt('Copy your Discord announcement below:', text);
    });
  }

  function copySinglePartyToDiscord(grp) {
    const text = generateDiscordPost(grp);
    navigator.clipboard.writeText(text).then(() => {
      playSound('click');
      showToast(`Copied ${grp.name} for Discord!`);
    }).catch(() => {
      prompt('Copy your Discord announcement below:', text);
    });
  }

  // --- Guild name typeahead (full synced roster, guests still allowed) ---
  let guildRosterIndex = [];

  function foldCharacterName(value) {
    return String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
  }

  async function loadGuildNameList() {
    try {
      const res = await fetch('bot/guild-roster.json', { cache: 'force-cache' });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;
      guildRosterIndex = data.filter(entry => entry && entry.name);
      const list = document.getElementById('guildNameList');
      if (!list) return;
      list.innerHTML = guildRosterIndex.map(entry =>
        `<option value="${escapeHtml(entry.name)}">${escapeHtml(entry.className || 'Player')} — ${escapeHtml(entry.realm || '')}</option>`
      ).join('');
    } catch (err) {
      console.warn('[Roster] Could not load guild name list', err);
    }
  }

  function applyRosterMatchToForm() {
    if (document.getElementById('playerId')?.value) return;
    const typed = document.getElementById('playerNameInput')?.value || '';
    const hit = guildRosterIndex.find(entry => foldCharacterName(entry.name) === foldCharacterName(typed));
    if (!hit) return;
    const classSelect = document.getElementById('playerClassSelect');
    if (classSelect && hit.className && [...classSelect.options].some(option => option.value === hit.className)) {
      classSelect.value = hit.className;
    }
    if (hit.realm) {
      const realmInput = document.getElementById('playerRealmInput');
      if (realmInput) realmInput.value = hit.realm;
    }
    const role = hit.role || 'DPS';
    const tank = document.getElementById('roleTank');
    const healer = document.getElementById('roleHealer');
    const dps = document.getElementById('roleDps');
    if (tank) tank.checked = role === 'Tank';
    if (healer) healer.checked = role === 'Healer';
    if (dps) dps.checked = role === 'DPS';
  }

  // --- Player Modal (Add / Edit) ---
  function openPlayerModal(playerId = null) {
    const modal = document.getElementById('playerModal');
    const title = document.getElementById('playerModalTitle');
    const form = document.getElementById('playerForm');

    form.reset();

    if (playerId) {
      const p = state.players.find(x => x.id === playerId);
      if (!p) return;
      title.textContent = 'Edit Guild Member';
      document.getElementById('playerId').value = p.id;
      document.getElementById('playerNameInput').value = p.name;
      document.getElementById('playerRealmInput').value = p.realm || 'Perenolde';
      document.getElementById('playerRegionSelect').value = p.region || 'us';
      document.getElementById('playerIlvlInput').value = p.ilvl || 625;
      document.getElementById('playerIoInput').value = p.io || 2200;
      document.getElementById('playerClassSelect').value = p.className;
      document.getElementById('roleTank').checked = p.roles.includes('Tank');
      document.getElementById('roleHealer').checked = p.roles.includes('Healer');
      document.getElementById('roleDps').checked = p.roles.includes('DPS');

      const brackets = p.keyBrackets || (p.keyMax > 12 ? ['12+'] : (p.keyMax >= 10 ? ['10-12'] : ['6-8']));
      const heroEl = document.getElementById('bracketHeroCrest');
      const vaultEl = document.getElementById('bracketVaultFill');
      const pushEl = document.getElementById('bracketIoPush');
      if (heroEl) heroEl.checked = brackets.includes('6-8');
      if (vaultEl) vaultEl.checked = brackets.includes('10-12');
      if (pushEl) pushEl.checked = brackets.includes('12+');

      document.getElementById('keyMinInput').value = p.keyMin;
      document.getElementById('keyMaxInput').value = p.keyMax;
      document.getElementById('keystoneInput').value = p.ownedKey || '';

      const carryPref = p.carryPreference || 'none';
      if (carryPref === 'need_carry') {
        document.getElementById('carryPrefNeed').checked = true;
      } else if (carryPref === 'willing_carry') {
        document.getElementById('carryPrefStronk').checked = true;
      } else {
        document.getElementById('carryPrefNone').checked = true;
      }
      document.getElementById('isShitterCheck').checked = !!p.isShitter;
      document.getElementById('playerIsLeader').checked = !!p.isLeader;
      document.getElementById('playerIsReserve').checked = !!p.isReserve;
    } else {
      title.textContent = 'Add Guild Member';
      document.getElementById('playerId').value = '';
      document.getElementById('playerRealmInput').value = 'Perenolde';
      document.getElementById('playerRegionSelect').value = 'us';
      document.getElementById('playerIlvlInput').value = 625;
      document.getElementById('playerIoInput').value = 2200;
      document.getElementById('roleDps').checked = true;

      const heroEl = document.getElementById('bracketHeroCrest');
      const vaultEl = document.getElementById('bracketVaultFill');
      const pushEl = document.getElementById('bracketIoPush');
      if (heroEl) heroEl.checked = false;
      if (vaultEl) vaultEl.checked = true;
      if (pushEl) pushEl.checked = false;

      document.getElementById('keyMinInput').value = 10;
      document.getElementById('keyMaxInput').value = 12;
      document.getElementById('carryPrefNone').checked = true;
      document.getElementById('isShitterCheck').checked = false;
      document.getElementById('playerIsLeader').checked = false;
      document.getElementById('playerIsReserve').checked = false;
    }

    modal.classList.add('is-open');
  }

  function closePlayerModal() {
    document.getElementById('playerModal').classList.remove('is-open');
  }

  async function handleModalLookupRaiderIo() {
    const name = document.getElementById('playerNameInput').value.trim();
    const realm = document.getElementById('playerRealmInput').value.trim() || 'Perenolde';
    const region = document.getElementById('playerRegionSelect').value;
    const btn = document.getElementById('lookupRaiderIoBtn');

    if (!name) {
      alert('Please enter a character name first!');
      return;
    }

    const origText = btn.innerHTML;
    btn.innerHTML = '<span>⏳ Looking up...</span>';
    btn.disabled = true;

    try {
      const data = await fetchCharacterRaiderIo(name, realm, region);
      document.getElementById('playerClassSelect').value = data.className;
      document.getElementById('playerIlvlInput').value = data.ilvl;
      document.getElementById('playerIoInput').value = data.io;
      if (data.ownedKey) {
        document.getElementById('keystoneInput').value = data.ownedKey;
      }
      if (data.keyMin && data.keyMax) {
        document.getElementById('keyMinInput').value = data.keyMin;
        document.getElementById('keyMaxInput').value = data.keyMax;
      }
      showToast(`Found ${data.name}! ${data.ilvl} iLvl, ${data.io.toLocaleString()} IO${data.ownedKey ? ', Key: ' + data.ownedKey : ''}`);
      playSound('fanfare');
    } catch (err) {
      alert(err.message || 'Character not found on Raider.IO');
    } finally {
      btn.innerHTML = origText;
      btn.disabled = false;
    }
  }

  // Scores for the whole guild refresh automatically every 15 minutes on the server.
  // This button refreshes tonight's attendees right now and pulls tonight's finished keys.
  async function handleSyncAllRaiderIo() {
    const btn = document.getElementById('syncRaiderIoBtn');
    const origText = btn.innerHTML;
    if (!(await ensureOfficerKey())) return;
    btn.disabled = true;
    btn.textContent = '⏳ Refreshing...';
    try {
      const res = await fetch('/api/refresh-now', { method: 'POST', headers: { 'x-sync-secret': officerKey() } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const n = data.night || {};
      showToast(`📈 ${data.scores?.updated || 0} scores refreshed` + (n.logged !== undefined ? ` • ${n.logged} new keys logged from Raider.IO (${n.night})` : ''));
      playSound('fanfare');
      await fetchRemoteState(true);
    } catch (e) {
      showToast(`Refresh failed: ${e.message}`);
    } finally {
      btn.innerHTML = origText;
      btn.disabled = false;
    }
  }


  function handleSavePlayer(e) {
    e.preventDefault();
    const id = document.getElementById('playerId').value;
    const name = document.getElementById('playerNameInput').value.trim();
    const realm = document.getElementById('playerRealmInput').value.trim() || 'Perenolde';
    const region = document.getElementById('playerRegionSelect').value;
    const ilvl = parseInt(document.getElementById('playerIlvlInput').value, 10) || 620;
    const io = parseInt(document.getElementById('playerIoInput').value, 10) || 2000;
    const className = document.getElementById('playerClassSelect').value;
    const roles = [];
    if (document.getElementById('roleTank').checked) roles.push('Tank');
    if (document.getElementById('roleHealer').checked) roles.push('Healer');
    if (document.getElementById('roleDps').checked) roles.push('DPS');

    if (roles.length === 0) {
      alert('Please check at least one role (Tank, Healer, or DPS).');
      return;
    }

    const brackets = [];
    if (document.getElementById('bracketHeroCrest')?.checked) brackets.push('6-8');
    if (document.getElementById('bracketVaultFill')?.checked) brackets.push('10-12');
    if (document.getElementById('bracketIoPush')?.checked) brackets.push('12+');
    if (brackets.length === 0) brackets.push('10-12');

    let keyMin = 30;
    let keyMax = 2;
    if (brackets.includes('6-8')) { keyMin = Math.min(keyMin, 6); keyMax = Math.max(keyMax, 8); }
    if (brackets.includes('10-12')) { keyMin = Math.min(keyMin, 9); keyMax = Math.max(keyMax, 12); }
    if (brackets.includes('12+')) { keyMin = Math.min(keyMin, 12); keyMax = Math.max(keyMax, 18); }

    const ownedKey = document.getElementById('keystoneInput').value.trim();

    const carryPrefRadio = document.querySelector('input[name="carryPref"]:checked');
    const carryPreference = carryPrefRadio ? carryPrefRadio.value : 'none';
    const isShitter = document.getElementById('isShitterCheck').checked;
    const isLeader = document.getElementById('playerIsLeader')?.checked || false;
    const isReserve = document.getElementById('playerIsReserve')?.checked || false;
    const touchedAt = new Date().toISOString();

    if (id) {
      // Edit existing
      const p = state.players.find(x => x.id === id);
      if (p) {
        p.name = name;
        p.realm = realm;
        p.region = region;
        p.ilvl = ilvl;
        p.io = io;
        p.className = className;
        p.roles = roles;
        p.keyMin = keyMin;
        p.keyMax = keyMax;
        p.keyBrackets = brackets;
        p.ownedKey = ownedKey;
        p.keyManual = Boolean(ownedKey);
        p.carryPreference = carryPreference;
        p.isShitter = isShitter;
        p.isLeader = isLeader;
        p.isReserve = isReserve;
        p.touchedAt = touchedAt;
      }
      showToast(`Updated ${name}`);
    } else {
      // Add new
      const newPlayer = {
        id: 'kk-' + Date.now(),
        name,
        realm,
        region,
        ilvl,
        io,
        className,
        roles,
        keyMin,
        keyMax,
        keyBrackets: brackets,
        ownedKey,
        keyManual: Boolean(ownedKey),
        carryPreference,
        isShitter,
        isLeader,
        isReserve,
        attending: true,
        touchedAt
      };
      state.players.push(newPlayer);
      showToast(`Added ${name} to roster!`);
    }

    savePlayers();
    renderRoster();
    closePlayerModal();
    playSound('click');
  }

  // --- Import / Export Modal ---
  function openImportExportModal() {
    const modal = document.getElementById('importExportModal');
    const textarea = document.getElementById('importExportText');

    // Pre-populate with current export format
    const lines = state.players.map(p => {
      const rolesStr = p.roles.join('/');
      return `${p.name}, ${p.className}, ${rolesStr}, ${p.keyMin}-${p.keyMax}${p.ownedKey ? ', ' + p.ownedKey : ''}`;
    });
    textarea.value = lines.join('\n');

    modal.classList.add('is-open');
  }

  function closeImportExportModal() {
    document.getElementById('importExportModal').classList.remove('is-open');
  }

  function handleImport() {
    const text = document.getElementById('importExportText').value.trim();
    if (!text) {
      alert('Please enter or paste roster data.');
      return;
    }

    const lines = text.split('\n');
    const parsedPlayers = [];

    lines.forEach((line, idx) => {
      const parts = line.split(',').map(s => s.trim());
      if (parts.length >= 3 && parts[0]) {
        const name = parts[0];
        let className = 'Warrior';
        // Class check
        for (const c of Object.keys(WOW_CLASSES)) {
          if (c.toLowerCase() === parts[1].toLowerCase()) {
            className = c;
            break;
          }
        }

        // Roles check
        const roles = [];
        const rolePart = parts[2].toLowerCase();
        if (rolePart.includes('tank')) roles.push('Tank');
        if (rolePart.includes('heal')) roles.push('Healer');
        if (rolePart.includes('dps') || rolePart.includes('damage')) roles.push('DPS');
        if (roles.length === 0) roles.push('DPS');

        // Keys check
        let keyMin = 4, keyMax = 10;
        if (parts[3]) {
          const keyParts = parts[3].replace(/\+/g, '').split('-').map(n => parseInt(n.trim(), 10));
          if (!isNaN(keyParts[0])) keyMin = keyParts[0];
          if (!isNaN(keyParts[1])) keyMax = keyParts[1];
          else keyMax = keyMin;
        }

        const ownedKey = parts[4] || '';

        parsedPlayers.push({
          id: 'imported-' + idx + '-' + Date.now(),
          name,
          className,
          roles,
          keyMin: Math.min(keyMin, keyMax),
          keyMax: Math.max(keyMin, keyMax),
          ownedKey,
          attending: true
        });
      }
    });

    if (parsedPlayers.length === 0) {
      alert('Could not parse any players. Please check the format: PlayerName, Class, Role, MinKey-MaxKey');
      return;
    }

    state.players = parsedPlayers;
    savePlayers();
    renderRoster();
    closeImportExportModal();
    showToast(`Successfully imported ${parsedPlayers.length} members!`);
    playSound('fanfare');
  }

  // --- Clear Groups Action ---
  function handleClearGroups() {
    if ((!state.formedGroups || state.formedGroups.length === 0) && (!state.benchedPlayers || state.benchedPlayers.length === 0)) {
      showToast('No active groups to clear!');
      return;
    }
    if (confirm('Clear all formed groups and reset to empty state?')) {
      state.formedGroups = [];
      state.benchedPlayers = [];
      saveGroups();
      renderGroups();
      playSound('click');
      showToast('Cleared all formed groups!');
    }
  }

  // --- Live Raider.IO Guild Roster Import ---
  async function handleImportGuild() {
    const btn = document.getElementById('importGuildBtn');
    if (!btn) return;
    const origHtml = btn.innerHTML;
    btn.innerHTML = '<span>⏳ Syncing Guild...</span>';
    btn.disabled = true;

    try {
      const url = 'https://raider.io/api/v1/guilds/profile?region=us&realm=perenolde&name=Kith%20and%20Kin&fields=members';
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load guild roster (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (!data.members || !Array.isArray(data.members)) {
        throw new Error('No members found in guild data');
      }

      // Sync entire guild: include all active guild members across all ranks
      const validMembers = data.members.filter(m => m.character && m.character.name);

      const existingMap = new Map();
      state.players.forEach(p => {
        existingMap.set(p.name.toLowerCase(), p);
        if (p.realm) {
          existingMap.set(`${p.name.toLowerCase()}@${p.realm.toLowerCase()}`, p);
        }
      });
      const sampleMap = new Map();
      SAMPLE_ROSTER.forEach(s => {
        sampleMap.set(s.name.toLowerCase(), s);
      });

      const updatedPlayers = validMembers.map(m => {
        const c = m.character;
        const lowerName = c.name.toLowerCase();
        const realmKey = lowerName + '@' + (c.realm || 'perenolde').toLowerCase();
        const existing = existingMap.get(realmKey) || existingMap.get(lowerName) || sampleMap.get(lowerName);

        const className = c.class;
        const activeRole = c.active_spec_role === 'TANK' ? 'Tank' : (c.active_spec_role === 'HEALING' ? 'Healer' : 'DPS');
        const classRoles = WOW_CLASSES[className]?.roles || [activeRole];
        const roles = [activeRole, ...classRoles.filter(r => r !== activeRole)];

        // Preselect attendance for GM, Officer, and Raider ranks (rank <= 2) or maintain existing
        const isRaiderRank = m.rank <= 2;

        if (existing) {
          return {
            ...existing,
            className: className || existing.className,
            roles: existing.roles?.length ? existing.roles : roles,
            realm: c.realm || existing.realm || 'Perenolde',
            region: c.region || existing.region || 'us',
            rank: m.rank,
            avatar: c.thumbnail_url || existing.avatar || null,
            carryPreference: existing.carryPreference || 'none',
            isShitter: !!existing.isShitter
          };
        } else {
          return {
            id: 'kk-' + c.name.toLowerCase().replace(/[^a-z0-9]/g, '') + (c.realm ? '-' + c.realm.toLowerCase().replace(/[^a-z0-9]/g, '') : ''),
            name: c.name,
            className: className,
            roles: roles,
            keyMin: 4,
            keyMax: 10,
            ownedKey: '',
            realm: c.realm || 'Perenolde',
            region: c.region || 'us',
            ilvl: 320,
            io: 0,
            rank: m.rank,
            attending: isRaiderRank,
            avatar: c.thumbnail_url || null,
            carryPreference: 'none',
            isShitter: false
          };
        }
      });

      state.players = updatedPlayers;
      savePlayers();
      renderRoster();
      playSound('fanfare');
      showToast(`Synced entire guild! ${validMembers.length} members loaded.`);
    } catch (err) {
      console.error('Guild sync error:', err);
      alert('Could not sync guild from Raider.IO: ' + err.message);
    } finally {
      btn.innerHTML = origHtml;
      btn.disabled = false;
    }
  }

  // --- Sound Toggle ---
  function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    localStorage.setItem('kk_mplus_sound', state.soundEnabled);
    updateSoundBtn();
    if (state.soundEnabled) playSound('click');
  }

  function updateSoundBtn() {
    const btn = document.getElementById('soundToggleBtn');
    if (!btn) return;
    if (state.soundEnabled) {
      btn.querySelector('.icon').textContent = '🔊';
      btn.querySelector('.btn-text').textContent = 'Audio: ON';
      btn.style.borderColor = 'var(--border-gold)';
    } else {
      btn.querySelector('.icon').textContent = '🔇';
      btn.querySelector('.btn-text').textContent = 'Audio: OFF';
      btn.style.borderColor = 'rgba(255,255,255,0.1)';
    }
  }

  // --- Utility Functions ---
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- Init & Event Listeners ---
  async function verifyOfficerKey(key) {
    if (!key) return false;
    try {
      const res = await fetch('/api/officer-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });
      return res.ok;
    } catch (err) {
      return false;
    }
  }

  async function setupOfficerGate() {
    const gate = document.getElementById('officerGate');
    if (gate) {
      gate.hidden = true;
      gate.style.display = 'none';
    }
  }

  function init() {
    loadState();
    renderRoster();
    renderGroups();
    updateSoundBtn();

    // Sound toggle
    document.getElementById('soundToggleBtn').addEventListener('click', toggleSound);

    // Keystone sigil / guild emblem click easter egg
    document.getElementById('keystoneSigil')?.addEventListener('click', () => {
      playSound('keystone');
      const sigil = document.getElementById('keystoneSigil');
      if (sigil) {
        sigil.classList.add('is-pulsing');
        setTimeout(() => sigil.classList.remove('is-pulsing'), 600);
      }
    });

    loadGuildNameList();
    const playerNameInput = document.getElementById('playerNameInput');
    if (playerNameInput) {
      playerNameInput.addEventListener('input', applyRosterMatchToForm);
      playerNameInput.addEventListener('change', applyRosterMatchToForm);
    }

    // Add Player Modal triggers
    document.getElementById('openAddModalBtn').addEventListener('click', () => openPlayerModal());
    document.getElementById('closePlayerModalBtn').addEventListener('click', closePlayerModal);
    document.getElementById('cancelPlayerModalBtn').addEventListener('click', closePlayerModal);
    document.getElementById('playerForm').addEventListener('submit', handleSavePlayer);
    document.getElementById('lookupRaiderIoBtn').addEventListener('click', handleModalLookupRaiderIo);

    // Sync All Raider.IO trigger
    document.getElementById('syncRaiderIoBtn').addEventListener('click', handleSyncAllRaiderIo);

    // Live Guild Sync trigger
    const importGuildBtn = document.getElementById('importGuildBtn');
    if (importGuildBtn) {
      importGuildBtn.addEventListener('click', handleImportGuild);
    }

    // Search and Filter controls
    const searchInput = document.getElementById('rosterSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim();
        if (clearSearchBtn) {
          clearSearchBtn.style.display = state.searchQuery ? 'inline-flex' : 'none';
        }
        renderRoster();
      });
    }
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        state.searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderRoster();
      });
    }

    const roleFilter = document.getElementById('roleFilterSelect');
    if (roleFilter) {
      roleFilter.addEventListener('change', (e) => {
        state.roleFilter = e.target.value;
        renderRoster();
      });
    }

    const attendFilter = document.getElementById('attendFilterSelect');
    if (attendFilter) {
      attendFilter.addEventListener('change', (e) => {
        state.attendFilter = e.target.value;
        renderRoster();
      });
    }

    // Import / Export triggers
    document.getElementById('openImportBtn').addEventListener('click', openImportExportModal);
    document.getElementById('closeImportModalBtn').addEventListener('click', closeImportExportModal);
    document.getElementById('importBtn').addEventListener('click', handleImport);
    document.getElementById('exportBtn').addEventListener('click', () => {
      const textarea = document.getElementById('importExportText');
      textarea.select();
      navigator.clipboard.writeText(textarea.value).then(() => showToast('Export text copied!'));
    });

    // Reset Defaults
    document.getElementById('resetSampleBtn').addEventListener('click', () => {
      if (confirm('Reset to default Kith and Kin sample roster? (Your current list will be replaced)')) {
        state.players = JSON.parse(JSON.stringify(SAMPLE_ROSTER));
        savePlayers();
        renderRoster();
        showToast('Restored default guild lineup!');
        playSound('click');
      }
    });

    // Attendance bulk actions
    document.getElementById('selectAllBtn').addEventListener('click', () => {
      state.players.forEach(p => { p.attending = true; p.absent = false; p.touchedAt = new Date().toISOString(); });
      savePlayers();
      renderRoster();
      playSound('click');
    });
    document.getElementById('deselectAllBtn').addEventListener('click', () => {
      state.players.forEach(p => { p.attending = false; p.absent = true; p.touchedAt = new Date().toISOString(); });
      savePlayers();
      renderRoster();
      playSound('click');
    });

    // Sorting
    document.getElementById('rosterSort').addEventListener('change', (e) => {
      state.sortField = e.target.value;
      renderRoster();
    });

    // Group Generation
    document.getElementById('generateGroupsBtn').addEventListener('click', () => handleGenerateGroups(false));
    document.getElementById('rerollUnlockedBtn').addEventListener('click', () => handleGenerateGroups(true));

    // Clear Groups
    const clearGroupsBtn = document.getElementById('clearGroupsBtn');
    if (clearGroupsBtn) {
      clearGroupsBtn.addEventListener('click', handleClearGroups);
    }

    // Auto-Match All Parties Finished Runs
    const autoMatchAllBtn = document.getElementById('autoMatchAllRunsBtn');
    if (autoMatchAllBtn) {
      autoMatchAllBtn.addEventListener('click', async () => {
        if (!window.autoMatchAllParties) return;
        const origHtml = autoMatchAllBtn.innerHTML;
        autoMatchAllBtn.disabled = true;
        autoMatchAllBtn.innerHTML = '🔍 Scanning Parties...';

        await window.autoMatchAllParties(state, {
          onProgress: (current, total, name) => {
            autoMatchAllBtn.innerHTML = `🔍 Checking (${current}/${total})...`;
          },
          onComplete: (foundCount, matches) => {
            autoMatchAllBtn.disabled = false;
            autoMatchAllBtn.innerHTML = origHtml;
            if (foundCount > 0) {
              playSound('fanfare');
              savePlayers();
              saveGroups();
              renderGroups();
              renderRoster();
              showToast(`🎉 Auto-matched and logged runs for ${foundCount} parties!`);
            } else {
              alert('No newly completed runs found on Raider.IO for any active parties yet.');
            }
          }
        });
      });
    }

    // Event Selector & Management
    const eventSelect = document.getElementById('eventSelect');
    if (eventSelect) {
      eventSelect.addEventListener('change', (e) => handleSwitchEvent(e.target.value));
    }
    const newEventBtn = document.getElementById('newEventBtn');
    if (newEventBtn) {
      newEventBtn.addEventListener('click', handleCreateEvent);
    }
    const deleteEventBtn = document.getElementById('deleteEventBtn');
    if (deleteEventBtn) {
      deleteEventBtn.addEventListener('click', handleDeleteEvent);
    }

    // Key Sync Button
    const syncKeystonesBtn = document.getElementById('syncKeystonesBtn');
    if (syncKeystonesBtn) {
      syncKeystonesBtn.addEventListener('click', handleSyncKeystones);
    }

    // Party Keystone Roulette Controls
    const rouletteTargetGroupSelect = document.getElementById('rouletteTargetGroupSelect');
    if (rouletteTargetGroupSelect) {
      rouletteTargetGroupSelect.addEventListener('change', (e) => {
        const idx = parseInt(e.target.value, 10);
        renderSelectedPartyRoulette(idx);
      });
    }

    const strategyToggle = document.getElementById('strategyToggle');
    const strategyCard = document.getElementById('strategyCard');
    const strategyChevron = document.getElementById('strategyChevron');
    if (strategyToggle && strategyCard) {
      strategyToggle.addEventListener('click', () => {
        const collapsed = strategyCard.classList.toggle('is-collapsed');
        strategyToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        if (strategyChevron) strategyChevron.textContent = collapsed ? 'Show' : 'Hide';
        playSound('click');
      });
    }

    const rouletteToggle = document.getElementById('rouletteToggle');
    const rouletteCard = document.getElementById('keystoneRouletteCard');
    const rouletteChevron = document.getElementById('rouletteChevron');
    if (rouletteToggle && rouletteCard) {
      rouletteToggle.addEventListener('click', () => {
        const collapsed = rouletteCard.classList.toggle('is-collapsed');
        rouletteToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        if (rouletteChevron) rouletteChevron.textContent = collapsed ? 'Show' : 'Hide';
      });
    }

    const rollKeystoneBtn = document.getElementById('rollKeystoneBtn');
    if (rollKeystoneBtn) {
      rollKeystoneBtn.addEventListener('click', handleRollKeystone);
    }

    // Discord post copy
    document.getElementById('copyDiscordBtn').addEventListener('click', copyAllToDiscord);

    // Discord / Cloud Manual Sync button
    const manualSyncBtn = document.getElementById('manualSyncBtn');
    if (manualSyncBtn) {
      manualSyncBtn.addEventListener('click', async () => {
        playSound('click');
        if (hasPendingEdits) {
          if (await ensureOfficerKey()) pushRemoteState();
          return;
        }
        fetchRemoteState(false);
      });
    }

    // Initial background sync with Discord bot / cloud state
    setupOfficerGate();
    fetchRemoteState(true);
    // Officers who unlock from a player dossier get the full roster (with private notes) right away.
    window.addEventListener('kk-officer-unlocked', () => fetchRemoteState(true));

    // Immediate sync on tab switch or window focus
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        fetchRemoteState(true);
      }
    });

    window.addEventListener('focus', () => {
      fetchRemoteState(true);
    });

    // Poll every 4s while the tab is visible. Cheap: the server answers "unchanged" unless something changed.
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchRemoteState(true);
      }
      renderLastChange();
    }, 4000);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
