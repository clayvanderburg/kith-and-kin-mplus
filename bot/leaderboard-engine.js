/**
 * Kith & Kin - Mythic+ Participation Leaderboard Engine
 * Calculates rankings based on attendance, keystones, role flexibility, leadership,
 * stronk back status, and carry shepherd mentorship.
 *
 * Compatible with both Browser (window.LeaderboardEngine) and Node.js (CommonJS).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LeaderboardEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const SCORING_RULES = {
    ATTENDANCE_PER_NIGHT: 15,
    KEY_BASE_POINTS: 10,
    KEY_TIMED_BONUS: 5,
    KEY_HIGH_LEVEL_BONUS_PER_LEVEL: 2, // Per level above +10
    ROLE_FLEX_DUAL_PER_NIGHT: 5,       // Signed up with 2 roles (Tank/DPS, etc.)
    ROLE_FLEX_TRIPLE_PER_NIGHT: 10,    // Signed up with all 3 roles (Tank/Healer/DPS)
    BORN_LEADER_PER_NIGHT: 8,          // Willing to lead group
    STONK_BACK_PER_NIGHT: 8,           // "My back is stronk" (willing to carry)
    CARRY_SHEPHERD_PER_RUN: 15         // Ran with a guildie who needed a carry
  };

  const CLASS_COLORS = {
    'Death Knight': '#C41E3A',
    'Demon Hunter': '#A330C9',
    'Druid': '#FF7C0A',
    'Evoker': '#33937F',
    'Hunter': '#AAD372',
    'Mage': '#3FC7EB',
    'Monk': '#00FF98',
    'Paladin': '#F48CBA',
    'Priest': '#FFFFFF',
    'Rogue': '#FFF468',
    'Shaman': '#0070DD',
    'Warlock': '#8788EE',
    'Warrior': '#C69B6D'
  };

  const CLASS_ICONS = {
    'Death Knight': '⚔️',
    'Demon Hunter': '🦇',
    'Druid': '🌿',
    'Evoker': '🐲',
    'Hunter': '🏹',
    'Mage': '✨',
    'Monk': '🥋',
    'Paladin': '🛡️',
    'Priest': '☀️',
    'Rogue': '🗡️',
    'Shaman': '⚡',
    'Warlock': '🔥',
    'Warrior': '⚔️'
  };

  const TITLES = [
    { threshold: 450, title: 'Grand Vanguard', badge: '👑', desc: 'Supreme pillars of guild mythic progression & spirit' },
    { threshold: 350, title: 'Keystone Paragon', badge: '⚔️', desc: 'Consistent anchors of keys and dungeon rosters' },
    { threshold: 250, title: 'Iron Pillar', badge: '🛡️', desc: 'Reliable veterans who keep guild groups running smooth' },
    { threshold: 150, title: 'Vault Champion', badge: '🏹', desc: 'Active key runners conquering the weekly vault' },
    { threshold: 70,  title: 'Dungeon Veteran', badge: '📜', desc: 'Committed adventurers pushing keystones' },
    { threshold: 0,   title: 'Guild Initiate', badge: '🌱', desc: 'Rising crawler on the path to glory' }
  ];

  function getTitleForPoints(points) {
    for (const t of TITLES) {
      if (points >= t.threshold) return t;
    }
    return TITLES[TITLES.length - 1];
  }

  // Pre-configured rich Demo Roster with authentic Kith & Kin characters and realistic fake stats
  const DEMO_PLAYERS = [
    {
      id: 'demo-madking',
      name: 'MadKing',
      className: 'Warrior',
      realm: 'Perenolde',
      region: 'us',
      ilvl: 324,
      io: 3260,
      roles: ['Tank', 'DPS'],
      nightsAttended: 4,
      attending: true,
      isLeader: true,
      carryPreference: 'willing_carry',
      carryRunsCount: 5,
      runLog: [
        { id: 'mk-1', key: "Kings' Rest +16", success: true, level: 16, note: 'Crushed it, zero deaths', satisfaction: 5 },
        { id: 'mk-2', key: "Murder Row +15", success: true, level: 15, note: 'Clean route', satisfaction: 5 },
        { id: 'mk-3', key: "Voidscar Arena +14", success: true, level: 14, isCarryRun: true, note: 'Carried guild alt, timed +2!', satisfaction: 5 },
        { id: 'mk-4', key: "Den of Nalorakk +14", success: true, level: 14, satisfaction: 4 },
        { id: 'mk-5', key: "The Blinding Vale +13", success: true, level: 13, isCarryRun: true, note: 'Shepherded low-geared lock', satisfaction: 5 },
        { id: 'mk-6', key: "Temple of Sethraliss +15", success: true, level: 15, satisfaction: 4 },
        { id: 'mk-7', key: "Altar of Fangs +12", success: true, level: 12, isCarryRun: true, satisfaction: 4 },
        { id: 'mk-8', key: "Ruby Life Pools +14", success: false, level: 14, note: 'Rough second boss wipe but finished', satisfaction: 3 },
        { id: 'mk-9', key: "Kings' Rest +15", success: true, level: 15, satisfaction: 5 },
        { id: 'mk-10', key: "Voidscar Arena +11", success: true, level: 11, isCarryRun: true, satisfaction: 5 },
        { id: 'mk-11', key: "Murder Row +14", success: true, level: 14, satisfaction: 4 },
        { id: 'mk-12', key: "Den of Nalorakk +10", success: true, level: 10, isCarryRun: true, satisfaction: 5 }
      ]
    },
    {
      id: 'demo-stirlingskat',
      name: 'Stirlingskat',
      className: 'Druid',
      realm: 'Moon Guard',
      region: 'us',
      ilvl: 322,
      io: 3180,
      roles: ['Tank', 'Healer', 'DPS'],
      nightsAttended: 4,
      attending: true,
      isLeader: true,
      carryPreference: 'willing_carry',
      carryRunsCount: 6,
      runLog: [
        { id: 'sk-1', key: "Kings' Rest +15", success: true, level: 15, isCarryRun: true },
        { id: 'sk-2', key: "Voidscar Arena +14", success: true, level: 14, isCarryRun: true },
        { id: 'sk-3', key: "The Blinding Vale +14", success: true, level: 14 },
        { id: 'sk-4', key: "Den of Nalorakk +13", success: true, level: 13, isCarryRun: true },
        { id: 'sk-5', key: "Murder Row +15", success: true, level: 15 },
        { id: 'sk-6', key: "Altar of Fangs +13", success: true, level: 13, isCarryRun: true },
        { id: 'sk-7', key: "Ruby Life Pools +14", success: true, level: 14 },
        { id: 'sk-8', key: "Temple of Sethraliss +12", success: true, level: 12, isCarryRun: true },
        { id: 'sk-9', key: "Kings' Rest +14", success: false, level: 14 },
        { id: 'sk-10', key: "Voidscar Arena +13", success: true, level: 13 },
        { id: 'sk-11', key: "The Blinding Vale +11", success: true, level: 11, isCarryRun: true },
        { id: 'sk-12', key: "Den of Nalorakk +15", success: true, level: 15 },
        { id: 'sk-13', key: "Murder Row +14", success: true, level: 14 }
      ]
    },
    {
      id: 'demo-adrenaline',
      name: 'Adrenaline',
      className: 'Warrior',
      realm: 'Perenolde',
      region: 'us',
      ilvl: 323,
      io: 3240,
      roles: ['Tank', 'DPS'],
      nightsAttended: 4,
      attending: true,
      isLeader: false,
      carryPreference: 'willing_carry',
      carryRunsCount: 4,
      runLog: [
        { id: 'ad-1', key: "Murder Row +17", success: true, level: 17 },
        { id: 'ad-2', key: "Kings' Rest +16", success: true, level: 16 },
        { id: 'ad-3', key: "Voidscar Arena +16", success: true, level: 16 },
        { id: 'ad-4', key: "Den of Nalorakk +15", success: true, level: 15, isCarryRun: true },
        { id: 'ad-5', key: "The Blinding Vale +15", success: true, level: 15 },
        { id: 'ad-6', key: "Altar of Fangs +14", success: true, level: 14, isCarryRun: true },
        { id: 'ad-7', key: "Ruby Life Pools +15", success: true, level: 15 },
        { id: 'ad-8', key: "Temple of Sethraliss +16", success: true, level: 16 },
        { id: 'ad-9', key: "Murder Row +16", success: true, level: 16 },
        { id: 'ad-10', key: "Kings' Rest +15", success: false, level: 15 },
        { id: 'ad-11', key: "Voidscar Arena +13", success: true, level: 13, isCarryRun: true },
        { id: 'ad-12', key: "Den of Nalorakk +16", success: true, level: 16 },
        { id: 'ad-13', key: "The Blinding Vale +14", success: true, level: 14 },
        { id: 'ad-14', key: "Altar of Fangs +12", success: true, level: 12, isCarryRun: true },
        { id: 'ad-15', key: "Murder Row +15", success: true, level: 15 }
      ]
    },
    {
      id: 'demo-bungulator',
      name: 'Bungulator',
      className: 'Shaman',
      realm: 'Korgath',
      region: 'us',
      ilvl: 324,
      io: 3290,
      roles: ['DPS', 'Healer'],
      nightsAttended: 4,
      attending: true,
      isLeader: true,
      carryPreference: 'none',
      carryRunsCount: 3,
      runLog: [
        { id: 'bu-1', key: "Murder Row +16", success: true, level: 16 },
        { id: 'bu-2', key: "Kings' Rest +16", success: true, level: 16 },
        { id: 'bu-3', key: "Voidscar Arena +15", success: true, level: 15 },
        { id: 'bu-4', key: "The Blinding Vale +14", success: true, level: 14, isCarryRun: true },
        { id: 'bu-5', key: "Den of Nalorakk +15", success: true, level: 15 },
        { id: 'bu-6', key: "Altar of Fangs +15", success: true, level: 15 },
        { id: 'bu-7', key: "Ruby Life Pools +14", success: true, level: 14 },
        { id: 'bu-8', key: "Temple of Sethraliss +15", success: true, level: 15 },
        { id: 'bu-9', key: "Murder Row +15", success: true, level: 15 },
        { id: 'bu-10', key: "Kings' Rest +14", success: true, level: 14, isCarryRun: true },
        { id: 'bu-11', key: "Voidscar Arena +14", success: false, level: 14 },
        { id: 'bu-12', key: "The Blinding Vale +15", success: true, level: 15 },
        { id: 'bu-13', key: "Den of Nalorakk +12", success: true, level: 12, isCarryRun: true },
        { id: 'bu-14', key: "Altar of Fangs +14", success: true, level: 14 }
      ]
    },
    {
      id: 'demo-glaiven',
      name: 'Glaiven',
      className: 'Demon Hunter',
      realm: 'Perenolde',
      region: 'us',
      ilvl: 323,
      io: 3140,
      roles: ['DPS', 'Tank'],
      nightsAttended: 3,
      attending: true,
      isLeader: true,
      carryPreference: 'willing_carry',
      carryRunsCount: 4,
      runLog: [
        { id: 'gl-1', key: "Kings' Rest +14", success: true, level: 14 },
        { id: 'gl-2', key: "Voidscar Arena +13", success: true, level: 13, isCarryRun: true },
        { id: 'gl-3', key: "Murder Row +14", success: true, level: 14 },
        { id: 'gl-4', key: "The Blinding Vale +13", success: true, level: 13, isCarryRun: true },
        { id: 'gl-5', key: "Den of Nalorakk +14", success: true, level: 14 },
        { id: 'gl-6', key: "Altar of Fangs +13", success: true, level: 13 },
        { id: 'gl-7', key: "Ruby Life Pools +13", success: true, level: 13 },
        { id: 'gl-8', key: "Temple of Sethraliss +14", success: true, level: 14 },
        { id: 'gl-9', key: "Kings' Rest +12", success: true, level: 12, isCarryRun: true },
        { id: 'gl-10', key: "Voidscar Arena +14", success: true, level: 14 },
        { id: 'gl-11', key: "Murder Row +12", success: true, level: 12, isCarryRun: true },
        { id: 'gl-12', key: "Den of Nalorakk +13", success: false, level: 13 }
      ]
    },
    {
      id: 'demo-shocktherapy',
      name: 'Shockthêràpy',
      className: 'Shaman',
      realm: 'Perenolde',
      region: 'us',
      ilvl: 321,
      io: 3230,
      roles: ['Healer', 'DPS'],
      nightsAttended: 4,
      attending: true,
      isLeader: false,
      carryPreference: 'none',
      carryRunsCount: 2,
      runLog: [
        { id: 'st-1', key: "Altar of Fangs +15", success: true, level: 15 },
        { id: 'st-2', key: "Kings' Rest +14", success: true, level: 14 },
        { id: 'st-3', key: "Voidscar Arena +14", success: true, level: 14 },
        { id: 'st-4', key: "Murder Row +15", success: true, level: 15 },
        { id: 'st-5', key: "Den of Nalorakk +14", success: true, level: 14 },
        { id: 'st-6', key: "The Blinding Vale +13", success: true, level: 13, isCarryRun: true },
        { id: 'st-7', key: "Ruby Life Pools +14", success: true, level: 14 },
        { id: 'st-8', key: "Temple of Sethraliss +14", success: true, level: 14 },
        { id: 'st-9', key: "Altar of Fangs +13", success: true, level: 13 },
        { id: 'st-10', key: "Kings' Rest +13", success: true, level: 13 },
        { id: 'st-11', key: "Voidscar Arena +11", success: true, level: 11, isCarryRun: true },
        { id: 'st-12', key: "Murder Row +14", success: true, level: 14 }
      ]
    },
    {
      id: 'demo-meanssa',
      name: 'Meanssa',
      className: 'Death Knight',
      realm: 'Frostmane',
      region: 'us',
      ilvl: 321,
      io: 3120,
      roles: ['Tank', 'DPS'],
      nightsAttended: 3,
      attending: true,
      isLeader: false,
      carryPreference: 'willing_carry',
      carryRunsCount: 3,
      runLog: [
        { id: 'me-1', key: "Voidscar Arena +14", success: true, level: 14 },
        { id: 'me-2', key: "Murder Row +14", success: true, level: 14 },
        { id: 'me-3', key: "Kings' Rest +13", success: true, level: 13, isCarryRun: true },
        { id: 'me-4', key: "Den of Nalorakk +13", success: true, level: 13 },
        { id: 'me-5', key: "The Blinding Vale +12", success: true, level: 12, isCarryRun: true },
        { id: 'me-6', key: "Altar of Fangs +13", success: true, level: 13 },
        { id: 'me-7', key: "Ruby Life Pools +13", success: true, level: 13 },
        { id: 'me-8', key: "Temple of Sethraliss +12", success: true, level: 12 },
        { id: 'me-9', key: "Voidscar Arena +11", success: true, level: 11, isCarryRun: true },
        { id: 'me-10', key: "Murder Row +13", success: false, level: 13 }
      ]
    },
    {
      id: 'demo-avaryn',
      name: 'Avaryn',
      className: 'Druid',
      realm: 'Perenolde',
      region: 'us',
      ilvl: 319,
      io: 2930,
      roles: ['Healer', 'DPS', 'Tank'],
      nightsAttended: 3,
      attending: true,
      isLeader: false,
      carryPreference: 'none',
      carryRunsCount: 3,
      runLog: [
        { id: 'av-1', key: "Kings' Rest +13", success: true, level: 13 },
        { id: 'av-2', key: "Voidscar Arena +12", success: true, level: 12, isCarryRun: true },
        { id: 'av-3', key: "Murder Row +13", success: true, level: 13 },
        { id: 'av-4', key: "Den of Nalorakk +12", success: true, level: 12 },
        { id: 'av-5', key: "The Blinding Vale +11", success: true, level: 11, isCarryRun: true },
        { id: 'av-6', key: "Altar of Fangs +12", success: true, level: 12 },
        { id: 'av-7', key: "Ruby Life Pools +12", success: true, level: 12 },
        { id: 'av-8', key: "Temple of Sethraliss +11", success: true, level: 11, isCarryRun: true },
        { id: 'av-9', key: "Kings' Rest +11", success: true, level: 11 }
      ]
    },
    {
      id: 'demo-ravenlight',
      name: 'Ravenlight',
      className: 'Paladin',
      realm: 'Perenolde',
      region: 'us',
      ilvl: 319,
      io: 2850,
      roles: ['DPS', 'Tank', 'Healer'],
      nightsAttended: 3,
      attending: true,
      isLeader: true,
      carryPreference: 'willing_carry',
      carryRunsCount: 2,
      runLog: [
        { id: 'ra-1', key: "Altar of Fangs +13", success: true, level: 13 },
        { id: 'ra-2', key: "Kings' Rest +12", success: true, level: 12 },
        { id: 'ra-3', key: "Voidscar Arena +12", success: true, level: 12, isCarryRun: true },
        { id: 'ra-4', key: "Murder Row +12", success: true, level: 12 },
        { id: 'ra-5', key: "Den of Nalorakk +11", success: true, level: 11 },
        { id: 'ra-6', key: "The Blinding Vale +11", success: true, level: 11, isCarryRun: true },
        { id: 'ra-7', key: "Ruby Life Pools +12", success: true, level: 12 },
        { id: 'ra-8', key: "Temple of Sethraliss +11", success: false, level: 11 }
      ]
    },
    {
      id: 'demo-sploosh',
      name: 'Splõõsh',
      className: 'Shaman',
      realm: 'Korgath',
      region: 'us',
      ilvl: 322,
      io: 3100,
      roles: ['DPS', 'Healer'],
      nightsAttended: 3,
      attending: true,
      isLeader: false,
      carryPreference: 'none',
      carryRunsCount: 1,
      runLog: [
        { id: 'sp-1', key: "Altar of Fangs +13", success: true, level: 13 },
        { id: 'sp-2', key: "Murder Row +13", success: true, level: 13 },
        { id: 'sp-3', key: "Voidscar Arena +12", success: true, level: 12 },
        { id: 'sp-4', key: "Kings' Rest +12", success: true, level: 12 },
        { id: 'sp-5', key: "Den of Nalorakk +12", success: true, level: 12 },
        { id: 'sp-6', key: "The Blinding Vale +11", success: true, level: 11, isCarryRun: true },
        { id: 'sp-7', key: "Ruby Life Pools +11", success: true, level: 11 },
        { id: 'sp-8', key: "Temple of Sethraliss +12", success: true, level: 12 }
      ]
    },
    {
      id: 'demo-noxxicc',
      name: 'Noxxicc',
      className: 'Death Knight',
      realm: 'Korgath',
      region: 'us',
      ilvl: 317,
      io: 2940,
      roles: ['Tank', 'DPS'],
      nightsAttended: 2,
      attending: true,
      isLeader: false,
      carryPreference: 'none',
      carryRunsCount: 1,
      runLog: [
        { id: 'no-1', key: "Murder Row +11", success: true, level: 11 },
        { id: 'no-2', key: "Voidscar Arena +10", success: true, level: 10 },
        { id: 'no-3', key: "Kings' Rest +10", success: true, level: 10 },
        { id: 'no-4', key: "Den of Nalorakk +11", success: true, level: 11 },
        { id: 'no-5', key: "The Blinding Vale +9", success: true, level: 9, isCarryRun: true },
        { id: 'no-6', key: "Altar of Fangs +10", success: true, level: 10 },
        { id: 'no-7', key: "Ruby Life Pools +10", success: false, level: 10 }
      ]
    },
    {
      id: 'demo-tiblock',
      name: 'Tiblock',
      className: 'Warlock',
      realm: 'Korgath',
      region: 'us',
      ilvl: 323,
      io: 2880,
      roles: ['DPS'],
      nightsAttended: 3,
      attending: true,
      isLeader: false,
      carryPreference: 'none',
      carryRunsCount: 0,
      runLog: [
        { id: 'ti-1', key: "Altar of Fangs +13", success: true, level: 13 },
        { id: 'ti-2', key: "Murder Row +12", success: true, level: 12 },
        { id: 'ti-3', key: "Voidscar Arena +12", success: true, level: 12 },
        { id: 'ti-4', key: "Kings' Rest +11", success: true, level: 11 },
        { id: 'ti-5', key: "Den of Nalorakk +11", success: true, level: 11 },
        { id: 'ti-6', key: "The Blinding Vale +11", success: true, level: 11 },
        { id: 'ti-7', key: "Ruby Life Pools +10", success: true, level: 10 }
      ]
    },
    {
      id: 'demo-khaiduus',
      name: 'Khaiduus',
      className: 'Shaman',
      realm: 'Cairne',
      region: 'us',
      ilvl: 318,
      io: 2850,
      roles: ['DPS', 'Healer'],
      nightsAttended: 2,
      attending: true,
      isLeader: false,
      carryPreference: 'none',
      carryRunsCount: 1,
      runLog: [
        { id: 'kh-1', key: "Voidscar Arena +11", success: true, level: 11 },
        { id: 'kh-2', key: "Murder Row +11", success: true, level: 11 },
        { id: 'kh-3', key: "Kings' Rest +10", success: true, level: 10 },
        { id: 'kh-4', key: "Den of Nalorakk +10", success: true, level: 10 },
        { id: 'kh-5', key: "The Blinding Vale +9", success: true, level: 9, isCarryRun: true },
        { id: 'kh-6', key: "Altar of Fangs +10", success: true, level: 10 }
      ]
    },
    {
      id: 'demo-tyberia',
      name: 'Tyberia',
      className: 'Paladin',
      realm: 'Korgath',
      region: 'us',
      ilvl: 311,
      io: 2450,
      roles: ['DPS', 'Tank', 'Healer'],
      nightsAttended: 2,
      attending: true,
      isLeader: false,
      carryPreference: 'none',
      carryRunsCount: 1,
      runLog: [
        { id: 'ty-1', key: "Altar of Fangs +11", success: true, level: 11 },
        { id: 'ty-2', key: "Voidscar Arena +10", success: true, level: 10 },
        { id: 'ty-3', key: "Murder Row +10", success: true, level: 10 },
        { id: 'ty-4', key: "Kings' Rest +9", success: true, level: 9, isCarryRun: true },
        { id: 'ty-5', key: "Den of Nalorakk +10", success: true, level: 10 }
      ]
    },
    {
      id: 'demo-myssa',
      name: 'Myssa',
      className: 'Demon Hunter',
      realm: 'Frostmane',
      region: 'us',
      ilvl: 297,
      io: 2780,
      roles: ['Tank', 'DPS'],
      nightsAttended: 2,
      attending: true,
      isLeader: false,
      carryPreference: 'none',
      carryRunsCount: 0,
      runLog: [
        { id: 'my-1', key: "Temple of Sethraliss +11", success: true, level: 11 },
        { id: 'my-2', key: "Voidscar Arena +10", success: true, level: 10 },
        { id: 'my-3', key: "Murder Row +9", success: true, level: 9 },
        { id: 'my-4', key: "Kings' Rest +9", success: true, level: 9 }
      ]
    },
    {
      id: 'demo-holyscheisse',
      name: 'Holyscheisse',
      className: 'Druid',
      realm: 'Korgath',
      region: 'us',
      ilvl: 291,
      io: 1850,
      roles: ['DPS', 'Healer', 'Tank'],
      nightsAttended: 2,
      attending: true,
      isLeader: false,
      carryPreference: 'need_carry', // Learner / gearing up alt
      carryRunsCount: 0,
      runLog: [
        { id: 'hs-1', key: "The Blinding Vale +6", success: true, level: 6 },
        { id: 'hs-2', key: "Den of Nalorakk +5", success: true, level: 5 },
        { id: 'hs-3', key: "Voidscar Arena +6", success: true, level: 6 },
        { id: 'hs-4', key: "Kings' Rest +7", success: false, level: 7 }
      ]
    },
    {
      id: 'demo-engorged',
      name: 'Engorged',
      className: 'Warlock',
      realm: 'Perenolde',
      region: 'us',
      ilvl: 245,
      io: 1200,
      roles: ['DPS'],
      nightsAttended: 1,
      attending: true,
      isLeader: false,
      carryPreference: 'need_carry', // New member gearing up!
      carryRunsCount: 0,
      runLog: [
        { id: 'en-1', key: "Den of Nalorakk +4", success: true, level: 4 },
        { id: 'en-2', key: "The Blinding Vale +4", success: true, level: 4 },
        { id: 'en-3', key: "Voidscar Arena +4", success: false, level: 4 }
      ]
    },
    {
      id: 'demo-bearackobama',
      name: 'Bearackobamà',
      className: 'Druid',
      realm: 'Perenolde',
      region: 'us',
      ilvl: 260,
      io: 1450,
      roles: ['DPS', 'Tank', 'Healer'],
      nightsAttended: 1,
      attending: true,
      isLeader: false,
      carryPreference: 'none',
      carryRunsCount: 0,
      runLog: [
        { id: 'bo-1', key: "Voidscar Arena +5", success: true, level: 5 },
        { id: 'bo-2', key: "Den of Nalorakk +4", success: true, level: 4 }
      ]
    }
  ];

  /**
   * Calculates participation points and breakdown for a single player
   */
  function calculatePlayerPoints(player, state) {
    const pName = (player.name || '').trim().toLowerCase();

    // 1. Attendance Calculation
    let nightsAttended = player.attending ? 1 : 0;
    if (state && state.events && typeof state.events === 'object') {
      let pastCount = 0;
      Object.values(state.events).forEach(evt => {
        if (!evt || !Array.isArray(evt.players)) return;
        const match = evt.players.find(p => (p.name || '').trim().toLowerCase() === pName);
        if (match && match.attending) {
          pastCount++;
        }
      });
      if (pastCount > 0) nightsAttended = Math.max(nightsAttended, pastCount);
    }
    if (typeof player.nightsAttended === 'number' && player.nightsAttended > nightsAttended) {
      nightsAttended = player.nightsAttended;
    }
    nightsAttended = Math.max(1, nightsAttended);
    const attendancePoints = nightsAttended * SCORING_RULES.ATTENDANCE_PER_NIGHT;

    // 2. Keys Run & Timed Bonus Calculation
    const runLog = Array.isArray(player.runLog) ? player.runLog : [];
    let keysPoints = 0;
    let timedCount = 0;
    let carryShepherdCount = typeof player.carryRunsCount === 'number' ? player.carryRunsCount : 0;

    runLog.forEach(run => {
      let pts = SCORING_RULES.KEY_BASE_POINTS;
      const lvlMatch = String(run.key || '').match(/\+(\d+)/);
      const lvl = lvlMatch ? parseInt(lvlMatch[1], 10) : (run.level || 10);
      if (lvl > 10) {
        pts += (lvl - 10) * SCORING_RULES.KEY_HIGH_LEVEL_BONUS_PER_LEVEL;
      }
      if (run.success) {
        pts += SCORING_RULES.KEY_TIMED_BONUS;
        timedCount++;
      }
      if (run.isCarryRun || run.hadCarryPlayer) {
        // Only count if not pre-assigned on player
        if (!player.carryRunsCount) {
          carryShepherdCount++;
        }
      }
      keysPoints += pts;
    });

    // 3. Role Flexibility Calculation
    const roles = Array.isArray(player.roles) ? player.roles : (player.role ? [player.role] : ['DPS']);
    let flexBonusPerNight = 0;
    let flexType = 'Single';
    if (roles.length >= 3) {
      flexBonusPerNight = SCORING_RULES.ROLE_FLEX_TRIPLE_PER_NIGHT;
      flexType = 'Triple Flex';
    } else if (roles.length === 2) {
      flexBonusPerNight = SCORING_RULES.ROLE_FLEX_DUAL_PER_NIGHT;
      flexType = 'Dual Flex';
    }
    const roleFlexPoints = nightsAttended * flexBonusPerNight;

    // 4. Born Leader Bonus
    const isLeader = !!player.isLeader;
    const leaderPoints = isLeader ? (nightsAttended * SCORING_RULES.BORN_LEADER_PER_NIGHT) : 0;

    // 5. Stonk Back Bonus
    const isStonk = player.carryPreference === 'willing_carry';
    const stonkPoints = isStonk ? (nightsAttended * SCORING_RULES.STONK_BACK_PER_NIGHT) : 0;

    // 6. Carry Shepherd Bonus
    const carryShepherdPoints = carryShepherdCount * SCORING_RULES.CARRY_SHEPHERD_PER_RUN;

    const totalPoints = attendancePoints + keysPoints + roleFlexPoints + leaderPoints + stonkPoints + carryShepherdPoints;
    const titleObj = getTitleForPoints(totalPoints);

    // Specialty Badges
    const badges = [];
    if (carryShepherdCount >= 3) badges.push({ name: 'Guild Shepherd', icon: '🎒', desc: `Guided ${carryShepherdCount} keys with members in need of carry` });
    if (isLeader) badges.push({ name: 'Born Commander', icon: '👑', desc: 'Stepped up to lead and organize party keystones' });
    if (isStonk) badges.push({ name: 'Titan Spine', icon: '🏋️', desc: 'Back is stronk — volunteered to carry heavy keystones' });
    if (roles.length >= 3) badges.push({ name: 'Swiss Army Chad', icon: '🎭', desc: 'Master of all three sacred roles (Tank, Healer, DPS)' });
    if (runLog.length >= 5 && (timedCount / runLog.length) >= 0.8) badges.push({ name: 'Clockwork Key', icon: '⏱️', desc: `${Math.round((timedCount / runLog.length) * 100)}% timed completion rate` });

    return {
      player,
      id: player.id || player.name,
      name: player.name,
      className: player.className || 'Warrior',
      realm: player.realm || 'Perenolde',
      region: player.region || 'us',
      ilvl: player.ilvl || 0,
      io: player.io || 0,
      totalPoints,
      title: titleObj.title,
      titleBadge: titleObj.badge,
      titleDesc: titleObj.desc,
      nightsAttended,
      attendancePoints,
      runsCount: runLog.length,
      timedCount,
      depletedCount: runLog.length - timedCount,
      timedRate: runLog.length > 0 ? Math.round((timedCount / runLog.length) * 100) : null,
      keysPoints,
      roles,
      flexType,
      roleFlexPoints,
      isLeader,
      leaderPoints,
      isStonk,
      stonkPoints,
      isNeedCarry: player.carryPreference === 'need_carry',
      carryShepherdCount,
      carryShepherdPoints,
      badges,
      runLog
    };
  }

  /**
   * Computes full leaderboard standings from an array of players and state
   */
  function computeLeaderboardStandings(players, state, forceLive = false) {
    let list;
    if (forceLive && Array.isArray(players) && players.length > 0) {
      list = players;
    } else if (Array.isArray(players) && players === DEMO_PLAYERS) {
      list = DEMO_PLAYERS;
    } else if (forceLive) {
      list = Array.isArray(players) ? players : [];
    } else {
      // Default to DEMO_PLAYERS for showcases and previews unless forceLive is explicitly true or live season has >= 10 logged runs
      const totalRuns = Array.isArray(players) ? players.reduce((sum, p) => sum + (Array.isArray(p.runLog) ? p.runLog.length : 0), 0) : 0;
      if (totalRuns < 10) {
        list = DEMO_PLAYERS;
      } else {
        list = players;
      }
    }

    const computed = list.map(p => calculatePlayerPoints(p, state));

    // Sort by Total Points descending, tie-breaker: keys run, then attendance
    computed.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.runsCount !== a.runsCount) return b.runsCount - a.runsCount;
      if (b.carryShepherdCount !== a.carryShepherdCount) return b.carryShepherdCount - a.carryShepherdCount;
      return b.nightsAttended - a.nightsAttended;
    });

    // Assign 1-indexed ranks
    computed.forEach((item, index) => {
      item.rank = index + 1;
    });

    return computed;
  }

  /**
   * Generates a Discord Markdown formatted leaderboard post
   */
  function generateDiscordMarkdown(standings, webUrl = 'https://knkmplus.netlify.app') {
    const top = standings.slice(0, 10);
    const p1 = standings[0];
    const p2 = standings[1];
    const p3 = standings[2];

    const medals = ['🥇', '🥈', '🥉'];
    let text = `🏆 **KITH & KIN MYTHIC+ PARTICIPATION LEADERBOARD** 🏆\n`;
    text += `*Honoring attendance, role versatility, leadership, and carry shepherds.*\n\n`;

    text += `👑 **THE PODIUM OF CHAMPIONS** 👑\n`;
    if (p1) {
      text += `🥇 **#1 ${p1.name}** (${p1.className}) — **${p1.totalPoints} pts** • *${p1.title}*\n`;
      text += `   └ 📅 ${p1.nightsAttended} Nights | 🗝️ ${p1.runsCount} Keys (${p1.timedCount} Timed) | 🎭 ${p1.roles.join('/')}${p1.isLeader ? ' | 👑 Leader' : ''}${p1.isStonk ? ' | 🏋️ Stonk' : ''}${p1.carryShepherdCount ? ` | 🎒 ${p1.carryShepherdCount} Carries` : ''}\n`;
    }
    if (p2) {
      text += `🥈 **#2 ${p2.name}** (${p2.className}) — **${p2.totalPoints} pts** • *${p2.title}*\n`;
      text += `   └ 📅 ${p2.nightsAttended} Nights | 🗝️ ${p2.runsCount} Keys (${p2.timedCount} Timed) | 🎭 ${p2.roles.join('/')}${p2.isLeader ? ' | 👑 Leader' : ''}${p2.isStonk ? ' | 🏋️ Stonk' : ''}${p2.carryShepherdCount ? ` | 🎒 ${p2.carryShepherdCount} Carries` : ''}\n`;
    }
    if (p3) {
      text += `🥉 **#3 ${p3.name}** (${p3.className}) — **${p3.totalPoints} pts** • *${p3.title}*\n`;
      text += `   └ 📅 ${p3.nightsAttended} Nights | 🗝️ ${p3.runsCount} Keys (${p3.timedCount} Timed) | 🎭 ${p3.roles.join('/')}${p3.isLeader ? ' | 👑 Leader' : ''}${p3.isStonk ? ' | 🏋️ Stonk' : ''}${p3.carryShepherdCount ? ` | 🎒 ${p3.carryShepherdCount} Carries` : ''}\n`;
    }

    if (top.length > 3) {
      text += `\n⚔️ **STANDINGS (4 - 10)**\n\`\`\`\n`;
      text += `RK  NAME            PTS   NIGHTS  KEYS  ROLES         VIBES\n`;
      text += `-------------------------------------------------------------\n`;
      for (let i = 3; i < top.length; i++) {
        const item = top[i];
        const rk = `#${item.rank}`.padEnd(4, ' ');
        const name = (item.name || '').slice(0, 14).padEnd(15, ' ');
        const pts = `${item.totalPoints}`.padStart(4, ' ') + ' ';
        const nights = `${item.nightsAttended}n`.padStart(5, ' ') + '  ';
        const keys = `${item.runsCount}k`.padStart(4, ' ') + '  ';
        const roles = item.roles.join('/').slice(0, 12).padEnd(13, ' ');
        let vibes = '';
        if (item.isLeader) vibes += '👑';
        if (item.isStonk) vibes += '🏋️';
        if (item.carryShepherdCount > 0) vibes += `🎒${item.carryShepherdCount}`;
        if (item.isNeedCarry) vibes += '🌱';
        text += `${rk}${name}${pts}${nights}${keys}${roles}${vibes}\n`;
      }
      text += `\`\`\`\n`;
    }

    text += `📜 **SCORING CODE OF THE REALM**\n`;
    text += `• **Attendance:** +15 pts / night\n`;
    text += `• **Keys Completed:** +10 pts (+5 if timed, +2 per level > +10)\n`;
    text += `• **Role Flexibility:** +5 pts (Dual Flex) / +10 pts (Triple Flex)\n`;
    text += `• **Born Leader (👑):** +8 pts / night willing to lead\n`;
    text += `• **Stonk Back (🏋️):** +8 pts / night willing to carry\n`;
    text += `• **Carry Shepherd (🎒):** +15 pts per key run with guildies in need\n\n`;
    text += `🌐 **Interactive Web Leaderboard:** <${webUrl}/leaderboard.html>\n`;
    text += `— *Kith & Kin • Midnight Season 2*`;

    return text;
  }

  return {
    SCORING_RULES,
    CLASS_COLORS,
    CLASS_ICONS,
    TITLES,
    DEMO_PLAYERS,
    calculatePlayerPoints,
    computeLeaderboardStandings,
    generateDiscordMarkdown,
    getTitleForPoints
  };
}));
