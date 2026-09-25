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
    'Priest':       { color: '#E2E8F0', roles: ['Healer', 'DPS'], brez: false, lust: false },
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
    state.players = [];
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
        state.players = [];
        state.formedGroups = [];
        state.benchedPlayers = [];
        current.players = [];
        current.formedGroups = [];
        current.benchedPlayers = [];
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
  let SYNC_SECRET = '';
  let pushDebounceTimer = null;
  let isFetchingRemote = false;
  let localEditedAt = 0;

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

  async function fetchRemoteState(silent = false) {
    if (isFetchingRemote) return;
    isFetchingRemote = true;
    updateSyncStatus('syncing', 'Syncing...');

    try {
      const res = await fetch(`${API_URL}?_t=${Date.now()}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data && !data.empty) {
        const remoteTime = Date.parse(data.lastUpdated) || 0;
        if (localEditedAt && localEditedAt > remoteTime) {
          updateSyncStatus('synced', 'Discord Synced');
          return;
        }
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

        if (Array.isArray(data.formedGroups)) {
          state.formedGroups = data.formedGroups;
        }
        if (Array.isArray(data.benchedPlayers)) {
          state.benchedPlayers = data.benchedPlayers;
        }
        if (Array.isArray(data.excludedDungeons)) {
          state.excludedDungeons = data.excludedDungeons;
        }

        if (state.currentEventId && state.events?.[state.currentEventId]) {
          state.events[state.currentEventId].players = state.players;
          state.events[state.currentEventId].formedGroups = state.formedGroups;
          state.events[state.currentEventId].benchedPlayers = state.benchedPlayers;
        }

        savePlayersLocal();
        saveGroupsLocal();
        saveEventsLocal();
        renderRoster();
        renderGroups();
        updateSyncStatus('synced', 'Discord Synced');
        if (!silent) {
          showToast('✨ Synced roster with Discord bot & cloud!');
        }
      } else {
        updateSyncStatus('synced', 'Discord Ready');
      }
    } catch (err) {
      console.warn('[Cloud Sync] Fetch error, continuing with local state:', err);
      updateSyncStatus('offline', 'Local Storage');
    } finally {
      isFetchingRemote = false;
    }
  }

  function pushRemoteState() {
    if (!SYNC_SECRET) return;
    localEditedAt = Date.now();
    clearTimeout(pushDebounceTimer);
    updateSyncStatus('syncing', 'Saving...');
    pushDebounceTimer = setTimeout(async () => {
      try {
        if (state.events && state.currentEventId && state.events[state.currentEventId]) {
          state.events[state.currentEventId].players = state.players;
          state.events[state.currentEventId].formedGroups = state.formedGroups;
          state.events[state.currentEventId].benchedPlayers = state.benchedPlayers || [];
        }

        const payload = {
          players: state.players,
          formedGroups: state.formedGroups,
          benchedPlayers: state.benchedPlayers || [],
          excludedDungeons: state.excludedDungeons || [],
          events: state.events || {},
          currentEventId: state.currentEventId || null,
          groupsTouchedAt: state.groupsTouchedAt || null,
          lastUpdated: new Date().toISOString()
        };
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-sync-secret': SYNC_SECRET
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          updateSyncStatus('synced', 'Discord Synced');
        } else {
          updateSyncStatus('offline', 'Local Storage');
        }
      } catch (err) {
        console.warn('[Cloud Sync] Push error:', err);
        updateSyncStatus('offline', 'Local Storage');
      }
    }, 1000);
  }

  function savePlayersLocal() {
    try {
      localStorage.setItem('kk_mplus_players', JSON.stringify(state.players));
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
      ownedKey = `${run.dungeon} +${run.mythic_level}`;
      keyMin = Math.max(2, run.mythic_level - 3);
      keyMax = run.mythic_level + 2;
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
      row.className = `player-row ${player.attending ? '' : 'inactive'}`;
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
          <div class="player-header-row">
            <div class="player-identity">
              <span class="player-name" style="color: ${classInfo.color};">${escapeHtml(player.name)}</span>
              <span class="class-tag" style="color: ${classInfo.color}; border: 1px solid ${classInfo.color}55;">${escapeHtml(player.className)}</span>
              ${isAltRealm ? `<span class="realm-pill">${escapeHtml(player.realm)}</span>` : ''}
            </div>
            <div class="player-actions">
              <button class="btn-action-icon edit-player-btn" data-id="${player.id}" title="Edit Member">✏️</button>
              <button class="btn-action-icon delete delete-player-btn" data-id="${player.id}" title="Remove Member">🗑️</button>
            </div>
          </div>
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
            ${player.ownedKey ? `<span class="key-owned-pill" title="Active Keystone: ${escapeHtml(player.ownedKey)}">🔑 ${escapeHtml(player.ownedKey)}</span>` : ''}
            <span class="key-range-pill" title="Comfortable key level range">🎯 ${player.keyBrackets && player.keyBrackets.length > 0 ? player.keyBrackets.map(b => b === '6-8' ? '6-8 (Hero)' : (b === '10-12' ? '10-12 (Vault)' : '12+ (Push)')).join(' • ') : `+${player.keyMin} – +${player.keyMax}`}</span>
          </div>
        </div>
      `;
      container.appendChild(row);
    });

    attachRosterRowEvents();
  }

  function attachRosterRowEvents() {
    // Attendance checkboxes
    document.querySelectorAll('.attend-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
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
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openPlayerModal(id);
      });
    });

    // Delete button
    document.querySelectorAll('.delete-player-btn').forEach(btn => {
      btn.addEventListener('click', () => {
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
    const groupsNeeded = totalPossibleGroups - lockedGroups.length;

    if (groupsNeeded <= 0 && lockedGroups.length === 0) {
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
  function updateRouletteTargetGroups() {
    const targetGroupSelect = document.getElementById('rouletteTargetGroupSelect');
    const promptEl = document.getElementById('rouletteNoGroupPrompt');
    const heldKeysWrap = document.getElementById('groupHeldKeysWrap');
    const filterWrap = document.getElementById('groupFilterWrap');
    const actionRow = document.getElementById('rouletteActionRow');
    if (!targetGroupSelect) return;

    if (!state.formedGroups || state.formedGroups.length === 0) {
      targetGroupSelect.innerHTML = `<option value="">-- No Formed Parties Yet --</option>`;
      targetGroupSelect.disabled = true;
      if (promptEl) promptEl.style.display = 'block';
      if (heldKeysWrap) heldKeysWrap.style.display = 'none';
      if (filterWrap) filterWrap.style.display = 'none';
      if (actionRow) actionRow.style.display = 'none';
      return;
    }

    targetGroupSelect.disabled = false;
    let selectedVal = targetGroupSelect.value;
    let opts = `<option value="">-- Choose a Formed Party --</option>`;
    state.formedGroups.forEach((g, idx) => {
      opts += `<option value="${idx}">Party ${idx + 1}: ${escapeHtml(g.name)}</option>`;
    });
    targetGroupSelect.innerHTML = opts;

    if (selectedVal !== '' && selectedVal !== null && state.formedGroups[parseInt(selectedVal, 10)]) {
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
    const filterWrap = document.getElementById('groupFilterWrap');
    const actionRow = document.getElementById('rouletteActionRow');
    const keysList = document.getElementById('groupKeysList');
    const chipsContainer = document.getElementById('groupDungeonChips');
    const rollBtn = document.getElementById('rollKeystoneBtn');
    const levelInput = document.getElementById('rouletteLevelInput');

    if (isNaN(grpIdx) || !state.formedGroups || !state.formedGroups[grpIdx]) {
      if (promptEl) promptEl.style.display = 'block';
      if (heldKeysWrap) heldKeysWrap.style.display = 'none';
      if (filterWrap) filterWrap.style.display = 'none';
      if (actionRow) actionRow.style.display = 'none';
      return;
    }

    const grp = state.formedGroups[grpIdx];
    grp.excludedDungeons = grp.excludedDungeons || [];

    if (promptEl) promptEl.style.display = 'none';
    if (heldKeysWrap) heldKeysWrap.style.display = 'block';
    if (filterWrap) filterWrap.style.display = 'block';
    if (actionRow) actionRow.style.display = 'flex';

    // 1. Render Group Held Keys
    const partyMembers = [grp.tank, grp.healer, ...(grp.dps || [])].filter(Boolean);
    const heldKeys = partyMembers.filter(p => p.ownedKey && p.ownedKey.trim() !== '');

    if (keysList) {
      if (heldKeys.length > 0) {
        keysList.innerHTML = heldKeys.map(p => {
          const dung = p.ownedKey.split('+')[0].trim();
          const isExcluded = grp.excludedDungeons.includes(dung);
          return `<div class="party-held-key-badge ${isExcluded ? 'key-excluded' : ''}" title="${escapeHtml(p.name)}'s key">
            <strong class="holder-name">${escapeHtml(p.name)}:</strong>
            <span class="holder-key">🔑 ${escapeHtml(p.ownedKey)}</span>
            ${isExcluded ? '<span class="pill-excluded-tag">(Excluded)</span>' : ''}
          </div>`;
        }).join('');
      } else {
        keysList.innerHTML = `<span class="no-keys-hint">No party members currently have an active keystone recorded in bags.</span>`;
      }
    }

    // Default source selection
    const sourceSelect = document.getElementById('rouletteSourceSelect');
    if (sourceSelect) {
      if (heldKeys.length > 0 && sourceSelect.value === 'pool') {
        sourceSelect.value = 'held';
      } else if (heldKeys.length === 0 && sourceSelect.value === 'held') {
        sourceSelect.value = 'pool';
      }
    }

    // 2. Render Party Exclusion Chips
    if (chipsContainer) {
      chipsContainer.innerHTML = DUNGEONS_MIDNIGHT_S2.map(dung => {
        const isExcluded = grp.excludedDungeons.includes(dung);
        return `<button type="button" class="dungeon-chip ${isExcluded ? 'excluded' : 'active'}" data-dungeon="${escapeHtml(dung)}" data-group="${grpIdx}">
          <span class="chip-status">${isExcluded ? '✕' : '✓'}</span>
          <span class="chip-name">${escapeHtml(dung)}</span>
        </button>`;
      }).join('');

      chipsContainer.querySelectorAll('.dungeon-chip').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const chip = e.currentTarget;
          const dungName = chip.getAttribute('data-dungeon');
          if (grp.excludedDungeons.includes(dungName)) {
            grp.excludedDungeons = grp.excludedDungeons.filter(d => d !== dungName);
          } else {
            grp.excludedDungeons.push(dungName);
          }
          saveGroupsLocal();
          renderSelectedPartyRoulette(grpIdx);
          playSound('click');
        });
      });
    }

    // 3. Update Level Input and Roll Button text
    if (levelInput) {
      let targetLvl = 12;
      if (grp.targetKeyStr) {
        const match = grp.targetKeyStr.match(/\+(\d+)/);
        if (match) targetLvl = parseInt(match[1], 10);
      }
      levelInput.value = targetLvl;
    }

    if (rollBtn) {
      rollBtn.innerHTML = `🎲 Roll Keystone for Party ${grpIdx + 1}!`;
    }
  }

  function handleRollKeystone() {
    const targetGroupSelect = document.getElementById('rouletteTargetGroupSelect');
    const selectedVal = targetGroupSelect?.value;
    if (selectedVal === '' || selectedVal === null || selectedVal === undefined) {
      showToast('⚠️ Please select a formed party first!');
      return;
    }

    const grpIdx = parseInt(selectedVal, 10);
    const grp = state.formedGroups?.[grpIdx];
    if (!grp) {
      showToast('⚠️ Selected party does not exist!');
      return;
    }

    const source = document.getElementById('rouletteSourceSelect')?.value || 'held';
    const levelInput = parseInt(document.getElementById('rouletteLevelInput')?.value, 10) || 12;
    const manualDungeon = document.getElementById('rouletteManualDungeonSelect')?.value || 'Murder Row';

    let chosenDungeon = '';
    let chosenLevel = levelInput;
    let holders = [];

    const partyMembers = [grp.tank, grp.healer, ...(grp.dps || [])].filter(Boolean);
    const partyHeldKeys = partyMembers.filter(p => p.ownedKey && p.ownedKey.trim() !== '');

    grp.excludedDungeons = grp.excludedDungeons || [];

    if (source === 'manual') {
      chosenDungeon = manualDungeon;
      holders = partyHeldKeys.filter(p => p.ownedKey.toLowerCase().includes(chosenDungeon.toLowerCase()));
    } else if (source === 'held') {
      const allowedHeld = partyHeldKeys.filter(p => {
        const dung = p.ownedKey.split('+')[0].trim();
        return !grp.excludedDungeons.includes(dung);
      });

      if (allowedHeld.length === 0) {
        showToast('⚠️ No party members hold non-excluded keys! Rolling from Midnight pool instead.');
        const allowedPool = DUNGEONS_MIDNIGHT_S2.filter(d => !grp.excludedDungeons.includes(d));
        const poolToUse = allowedPool.length > 0 ? allowedPool : DUNGEONS_MIDNIGHT_S2;
        chosenDungeon = poolToUse[Math.floor(Math.random() * poolToUse.length)];
      } else {
        const picked = allowedHeld[Math.floor(Math.random() * allowedHeld.length)];
        chosenDungeon = picked.ownedKey.split('+')[0].trim();
        const match = picked.ownedKey.match(/\+(\d+)/);
        if (match) chosenLevel = parseInt(match[1], 10);
        holders = [picked];
      }
    } else {
      // Midnight S2 pool
      const allowedPool = DUNGEONS_MIDNIGHT_S2.filter(d => !grp.excludedDungeons.includes(d));
      const poolToUse = allowedPool.length > 0 ? allowedPool : DUNGEONS_MIDNIGHT_S2;
      chosenDungeon = poolToUse[Math.floor(Math.random() * poolToUse.length)];
      holders = partyHeldKeys.filter(p => p.ownedKey.toLowerCase().includes(chosenDungeon.toLowerCase()));
    }

    const fullKeyStr = `${chosenDungeon} +${chosenLevel}`;
    grp.dungeon = fullKeyStr;
    grp.assignedDungeon = fullKeyStr;
    grp.targetKeyStr = `+${chosenLevel} (Assigned)`;

    saveGroups();
    renderGroups();
    renderSelectedPartyRoulette(grpIdx);

    // Display Result Banner
    const banner = document.getElementById('rouletteResultBanner');
    const resultText = document.getElementById('rouletteResultText');
    const holdersText = document.getElementById('rouletteHoldersText');
    if (banner && resultText) {
      banner.style.display = 'flex';
      resultText.textContent = `Party ${grpIdx + 1} Assigned: ${fullKeyStr}`;
      if (holders.length > 0) {
        holdersText.textContent = `Held in bags by: ${holders.map(h => `${h.name} (${h.ownedKey})`).join(', ')}`;
      } else {
        holdersText.textContent = `Push key from pool (No member holds this exact key)`;
      }
    }

    playSound('keystone');
    showToast(`🎲 Assigned ${fullKeyStr} to Party ${grpIdx + 1}!`);
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
            p.ownedKey = `${recent.dungeon} +${recent.mythic_level}`;
            p.keyMin = Math.max(2, recent.mythic_level - 3);
            p.keyMax = recent.mythic_level + 2;
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
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🛡️⚔️💚</div>
          <h4>No groups formed yet</h4>
          <p>Make sure at least 5 guild members (including at least 1 Tank &amp; 1 Healer) are marked attending, then click <strong>Activate Keystone</strong>!</p>
        </div>
      `;
      return;
    }

    actions.style.display = 'flex';

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

    // Render Each 5-man Party Card
    state.formedGroups.forEach((grp, index) => {
      const card = document.createElement('div');
      card.className = `party-card ${grp.isLocked ? 'is-locked' : ''}`;
      card.style.animationDelay = `${index * 0.08}s`;

      const tankClass = WOW_CLASSES[grp.tank.className] || { color: '#fff' };
      const healerClass = WOW_CLASSES[grp.healer.className] || { color: '#fff' };

      card.innerHTML = `
        <div class="party-header">
          <div class="party-badge-title">
            <span class="party-num">Party ${index + 1}</span>
            <span class="party-name">${escapeHtml(grp.name)}</span>
          </div>
          <div class="party-card-controls">
            <button class="btn-icon lock-party-btn" data-id="${grp.id}" title="${grp.isLocked ? 'Unlock Group' : 'Lock Group (Prevent Rerolls)'}">
              ${grp.isLocked ? '🔒 Locked' : '🔓 Lock'}
            </button>
          </div>
        </div>

        <div class="party-sub-meta">
          <span class="party-key-target">🎯 ${grp.targetKeyStr}</span>
          <div class="party-dungeon-row">
            <span class="party-dungeon-tag" title="Assigned Dungeon">🏰 ${escapeHtml(grp.dungeon || 'Mythic Key')}</span>
            <button class="btn-mini-roll party-card-reroll-btn" data-group-index="${index}" title="Roll a random key for Party ${index + 1} from allowed pool">🎲 Roll</button>
            <select class="party-dungeon-select" data-group-index="${index}" title="Manually change dungeon">
              ${DUNGEONS_MIDNIGHT_S2.map(d => `<option value="${d}" ${(grp.dungeon && grp.dungeon.includes(d)) ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
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
          ${grp.isShitterGroup ? `<span class="party-util-badge shitter-group" title="Dedicated Shitter Alt Squad! (${grp.shitterCount} Shitters)">💩 Shitter Alt Squad</span>` : ''}
          ${grp.hasCarryMatch ? `<span class="party-util-badge carry-assist" title="Carry Match: ${escapeHtml(grp.willingCarryNames.join(', '))} carrying ${escapeHtml(grp.needCarryNames.join(', '))}">🎒 Carry Assisted</span>` : ''}
        </div>

        <div class="party-metrics-bar">
          <span class="party-avg-io">⭐ Avg IO: <strong>${(grp.avgIo || 0).toLocaleString()}</strong></span>
          <span class="party-avg-ilvl">🛡️ Avg iLvl: <strong>${grp.avgIlvl || 620}</strong></span>
        </div>

        <div class="party-members">
          <!-- Tank -->
          <div class="party-member-row role-tank">
            <span class="slot-role-tag" title="Tank">🛡️</span>
            <div class="slot-player-details">
              <div class="slot-top-row">
                <span class="slot-player-name" style="color: ${tankClass.color};">${escapeHtml(grp.tank.name)}</span>
                <span class="slot-stat-badge io" style="color: ${getIoColor(grp.tank.io)}; border: 1px solid ${getIoColor(grp.tank.io)}77;">${(grp.tank.io || 0).toLocaleString()} IO</span>
              </div>
              <div class="slot-bottom-row">
                <div class="slot-meta-left">
                  <span class="class-tag" style="color: ${tankClass.color}; border: 1px solid ${tankClass.color}44;">${escapeHtml(grp.tank.className)}</span>
                  <span class="slot-stat-badge ilvl">${grp.tank.ilvl || 320} iLvl</span>
                  ${renderMemberVibeBadges(grp.tank)}
                </div>
                <span class="slot-key-range">+${grp.tank.keyMin} – +${grp.tank.keyMax}</span>
              </div>
            </div>
          </div>

          <!-- Healer -->
          <div class="party-member-row role-healer">
            <span class="slot-role-tag" title="Healer">💚</span>
            <div class="slot-player-details">
              <div class="slot-top-row">
                <span class="slot-player-name" style="color: ${healerClass.color};">${escapeHtml(grp.healer.name)}</span>
                <span class="slot-stat-badge io" style="color: ${getIoColor(grp.healer.io)}; border: 1px solid ${getIoColor(grp.healer.io)}77;">${(grp.healer.io || 0).toLocaleString()} IO</span>
              </div>
              <div class="slot-bottom-row">
                <div class="slot-meta-left">
                  <span class="class-tag" style="color: ${healerClass.color}; border: 1px solid ${healerClass.color}44;">${escapeHtml(grp.healer.className)}</span>
                  <span class="slot-stat-badge ilvl">${grp.healer.ilvl || 320} iLvl</span>
                  ${renderMemberVibeBadges(grp.healer)}
                </div>
                <span class="slot-key-range">+${grp.healer.keyMin} – +${grp.healer.keyMax}</span>
              </div>
            </div>
          </div>

          <!-- DPS Slots -->
          ${grp.dps.map(dps => {
            const dpsClass = WOW_CLASSES[dps.className] || { color: '#fff' };
            return `
              <div class="party-member-row role-dps">
                <span class="slot-role-tag" title="DPS">⚔️</span>
                <div class="slot-player-details">
                  <div class="slot-top-row">
                    <span class="slot-player-name" style="color: ${dpsClass.color};">${escapeHtml(dps.name)}</span>
                    <span class="slot-stat-badge io" style="color: ${getIoColor(dps.io)}; border: 1px solid ${getIoColor(dps.io)}77;">${(dps.io || 0).toLocaleString()} IO</span>
                  </div>
                  <div class="slot-bottom-row">
                    <div class="slot-meta-left">
                      <span class="class-tag" style="color: ${dpsClass.color}; border: 1px solid ${dpsClass.color}44;">${escapeHtml(dps.className)}</span>
                      <span class="slot-stat-badge ilvl">${dps.ilvl || 320} iLvl</span>
                      ${renderMemberVibeBadges(dps)}
                    </div>
                    <span class="slot-key-range">+${dps.keyMin} – +${dps.keyMax}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="party-footer">
          <button class="btn btn-sm btn-ghost copy-party-btn" data-id="${grp.id}" title="Copy party lineup for Discord">
            📋 Copy Lineup
          </button>
        </div>
      `;

      grid.appendChild(card);
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

    // Individual Party Dungeon Reroll buttons
    document.querySelectorAll('.party-card-reroll-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-group-index'), 10);
        const grp = state.formedGroups[idx];
        if (!grp) return;

        const allowedPool = DUNGEONS_MIDNIGHT_S2.filter(d => !(state.excludedDungeons || []).includes(d));
        const poolToUse = allowedPool.length > 0 ? allowedPool : DUNGEONS_MIDNIGHT_S2;
        const picked = poolToUse[Math.floor(Math.random() * poolToUse.length)];

        const lvlMatch = grp.dungeon ? grp.dungeon.match(/\+(\d+)/) : null;
        const lvl = lvlMatch ? lvlMatch[1] : 12;

        grp.dungeon = `${picked} +${lvl}`;
        playSound('keystone');
        saveGroups();
        renderGroups();
        showToast(`🎲 Rerolled Party ${idx + 1} dungeon to ${grp.dungeon}!`);
      });
    });

    // Individual Party Dungeon Manual Dropdowns
    document.querySelectorAll('.party-dungeon-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt(sel.getAttribute('data-group-index'), 10);
        const grp = state.formedGroups[idx];
        if (!grp) return;

        const picked = e.target.value;
        const lvlMatch = grp.dungeon ? grp.dungeon.match(/\+(\d+)/) : null;
        const lvl = lvlMatch ? lvlMatch[1] : 12;

        grp.dungeon = `${picked} +${lvl}`;
        playSound('click');
        saveGroups();
        renderGroups();
        showToast(`🎯 Changed Party ${idx + 1} dungeon to ${grp.dungeon}!`);
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
      text += `🏰 **Dungeon:** ${grp.dungeon}\n`;
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

  async function handleSyncAllRaiderIo() {
    const attendees = state.players.filter(p => p.attending);
    if (attendees.length === 0) {
      showToast('No attending members to sync!');
      return;
    }

    const btn = document.getElementById('syncRaiderIoBtn');
    const origText = btn.innerHTML;
    btn.disabled = true;

    let successCount = 0;
    let notFoundCount = 0;

    for (let i = 0; i < attendees.length; i++) {
      const p = attendees[i];
      btn.textContent = `⏳ Syncing (${i + 1}/${attendees.length})...`;
      try {
        const data = await fetchCharacterRaiderIo(p.name, p.realm || 'Perenolde', p.region || 'us');
        p.ilvl = data.ilvl || p.ilvl;
        p.io = data.io || p.io;
        p.avatar = data.avatar || p.avatar;
        if (data.realm) p.realm = data.realm;
        if (data.ownedKey) p.ownedKey = data.ownedKey;
        if (data.keyMin && data.keyMax) {
          p.keyMin = data.keyMin;
          p.keyMax = data.keyMax;
        }
        if (data.className && WOW_CLASSES[data.className]) {
          p.className = data.className;
        }
        successCount++;
      } catch (e) {
        notFoundCount++;
      }
      await new Promise(r => setTimeout(r, 120));
    }

    savePlayers();
    renderRoster();
    btn.innerHTML = origText;
    btn.disabled = false;
    playSound('fanfare');
    showToast(`Raider.IO sync complete! (${successCount} updated${notFoundCount ? ', ' + notFoundCount + ' not found' : ''})`);
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
    if (brackets.includes('10-12')) { keyMin = Math.min(keyMin, 10); keyMax = Math.max(keyMax, 12); }
    if (brackets.includes('12+')) { keyMin = Math.min(keyMin, 13); keyMax = Math.max(keyMax, 18); }

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
    const input = document.getElementById('officerKeyInput');
    const message = document.getElementById('officerGateMessage');
    const unlock = document.getElementById('officerUnlockBtn');
    if (!gate || !unlock) return;

    const saved = sessionStorage.getItem('kk_officer_key') || '';
    if (saved && await verifyOfficerKey(saved)) {
      SYNC_SECRET = saved;
      gate.hidden = true;
      return;
    }

    gate.hidden = false;
    unlock.addEventListener('click', async () => {
      const key = input.value.trim();
      message.textContent = 'Checking...';
      if (await verifyOfficerKey(key)) {
        sessionStorage.setItem('kk_officer_key', key);
        SYNC_SECRET = key;
        gate.hidden = true;
        message.textContent = '';
        fetchRemoteState(false);
      } else {
        message.textContent = 'That officer passphrase is not right.';
      }
    });
  }

  function init() {
    loadState();
    renderRoster();
    renderGroups();
    updateSoundBtn();

    // Sound toggle
    document.getElementById('soundToggleBtn').addEventListener('click', toggleSound);

    // Keystone sigil click easter egg
    document.getElementById('keystoneSigil').addEventListener('click', () => {
      playSound('keystone');
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

    const resetGroupExclusionsBtn = document.getElementById('resetGroupExclusionsBtn');
    if (resetGroupExclusionsBtn) {
      resetGroupExclusionsBtn.addEventListener('click', () => {
        const sel = document.getElementById('rouletteTargetGroupSelect');
        const idx = parseInt(sel?.value, 10);
        if (!isNaN(idx) && state.formedGroups?.[idx]) {
          state.formedGroups[idx].excludedDungeons = [];
          saveGroupsLocal();
          renderSelectedPartyRoulette(idx);
          playSound('click');
          showToast('Cleared party dungeon exclusions!');
        }
      });
    }

    const rouletteSourceSelect = document.getElementById('rouletteSourceSelect');
    const rouletteManualDungeonWrap = document.getElementById('rouletteManualDungeonWrap');
    if (rouletteSourceSelect && rouletteManualDungeonWrap) {
      rouletteSourceSelect.addEventListener('change', (e) => {
        rouletteManualDungeonWrap.style.display = e.target.value === 'manual' ? 'block' : 'none';
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
      manualSyncBtn.addEventListener('click', () => {
        playSound('click');
        fetchRemoteState(false);
      });
    }

    // Initial background sync with Discord bot / cloud state
    setupOfficerGate();
    fetchRemoteState(true);

    // Immediate sync on tab switch or window focus
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        fetchRemoteState(true);
      }
    });

    window.addEventListener('focus', () => {
      fetchRemoteState(true);
    });

    // High-frequency polling (every 8s) while tab is active for real-time responsiveness
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchRemoteState(true);
      }
    }, 8000);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
