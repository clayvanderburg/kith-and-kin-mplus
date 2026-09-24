/**
 * Kith and Kin Mythic+ Solver Module
 * High-performance constraint solver for building balanced 5-man dungeon groups.
 */

const WOW_CLASSES = {
  'Death Knight': { color: 0xC41E3A, hex: '#C41E3A', roles: ['Tank', 'DPS'], brez: true, lust: false },
  'Demon Hunter': { color: 0xA330C9, hex: '#A330C9', roles: ['Tank', 'DPS'], brez: false, lust: false },
  'Druid':        { color: 0xFF7C0A, hex: '#FF7C0A', roles: ['Tank', 'Healer', 'DPS'], brez: true, lust: false },
  'Evoker':       { color: 0x33937F, hex: '#33937F', roles: ['Healer', 'DPS'], brez: false, lust: true },
  'Hunter':       { color: 0xAAD372, hex: '#AAD372', roles: ['DPS'], brez: false, lust: true },
  'Mage':         { color: 0x3FC7EB, hex: '#3FC7EB', roles: ['DPS'], brez: false, lust: true },
  'Monk':         { color: 0x00FF98, hex: '#00FF98', roles: ['Tank', 'Healer', 'DPS'], brez: false, lust: false },
  'Paladin':      { color: 0xF48CBA, hex: '#F48CBA', roles: ['Tank', 'Healer', 'DPS'], brez: true, lust: false },
  'Priest':       { color: 0xE2E8F0, hex: '#E2E8F0', roles: ['Healer', 'DPS'], brez: false, lust: false },
  'Rogue':        { color: 0xFFF468, hex: '#FFF468', roles: ['DPS'], brez: false, lust: false },
  'Shaman':       { color: 0x0070DD, hex: '#0070DD', roles: ['Healer', 'DPS'], brez: false, lust: true },
  'Warlock':      { color: 0x8788EE, hex: '#8788EE', roles: ['DPS'], brez: true, lust: false },
  'Warrior':      { color: 0xC69B6D, hex: '#C69B6D', roles: ['Tank', 'DPS'], brez: false, lust: false }
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

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function solveGroups(options = {}) {
  const opts = Array.isArray(options) ? { players: options } : options;
  const {
    players = [],
    strategy = 'balanced',
    dungeonPool = DUNGEONS_MIDNIGHT_S2,
    excludedDungeons = [],
    avoidClassDupes = true,
    ensureLust = true,
    ensureBrez = true,
    balanceIo = true,
    lockedGroups = []
  } = opts;
  const attendees = players.filter(p => p.attending !== false);

  // Exclude players already locked into existing preserved groups
  const lockedPlayerIds = new Set();
  lockedGroups.forEach(g => {
    g.tank && lockedPlayerIds.add(g.tank.id);
    g.healer && lockedPlayerIds.add(g.healer.id);
    (g.dps || []).forEach(d => lockedPlayerIds.add(d.id));
  });

  const availablePool = attendees.filter(p => !lockedPlayerIds.has(p.id));
  const totalPossibleGroups = Math.floor(attendees.length / 5);
  const groupsNeeded = totalPossibleGroups - lockedGroups.length;

  if (groupsNeeded <= 0 && lockedGroups.length === 0) {
    return {
      groups: [],
      benched: availablePool,
      message: 'Need at least 5 attending members to form a dungeon group!'
    };
  }

  let bestResult = null;
  let bestScore = -Infinity;
  const NUM_SOLVER_ATTEMPTS = 500;

  for (let attempt = 0; attempt < NUM_SOLVER_ATTEMPTS; attempt++) {
    const shuffled = shuffleArray([...availablePool]);
    const tanks = [];
    const healers = [];
    const dps = [];

    // Voluntary reserves give priority to members wanting to run full time
    const candidateTanks = shuffled.filter(p => (p.roles || []).includes('Tank'))
      .sort((a, b) => (a.isReserve ? 1 : 0) - (b.isReserve ? 1 : 0));
    const candidateHealers = shuffled.filter(p => (p.roles || []).includes('Healer'))
      .sort((a, b) => (a.isReserve ? 1 : 0) - (b.isReserve ? 1 : 0));
    const candidateDps = shuffled.filter(p => (p.roles || []).includes('DPS'))
      .sort((a, b) => (a.isReserve ? 1 : 0) - (b.isReserve ? 1 : 0));

    const assignedIds = new Set();

    for (const p of candidateTanks) {
      if (tanks.length < groupsNeeded && !assignedIds.has(p.id)) {
        tanks.push({ ...p, assignedRole: 'Tank' });
        assignedIds.add(p.id);
      }
    }

    for (const p of candidateHealers) {
      if (healers.length < groupsNeeded && !assignedIds.has(p.id)) {
        healers.push({ ...p, assignedRole: 'Healer' });
        assignedIds.add(p.id);
      }
    }

    const neededDpsCount = groupsNeeded * 3;
    for (const p of candidateDps) {
      if (dps.length < neededDpsCount && !assignedIds.has(p.id)) {
        dps.push({ ...p, assignedRole: 'DPS' });
        assignedIds.add(p.id);
      }
    }

    if (tanks.length < groupsNeeded || healers.length < groupsNeeded || dps.length < neededDpsCount) {
      continue;
    }

    const candidateGroups = [];
    for (let i = 0; i < groupsNeeded; i++) {
      candidateGroups.push({
        id: 'grp-' + (lockedGroups.length + i + 1) + '-' + Math.random().toString(36).substring(2, 6),
        tank: tanks[i],
        healer: healers[i],
        dps: [dps[i * 3], dps[i * 3 + 1], dps[i * 3 + 2]],
        isLocked: false
      });
    }

    let score = 1000;

    candidateGroups.forEach(grp => {
      const members = [grp.tank, grp.healer, ...grp.dps];

      // Key overlap scoring
      const minKeys = members.map(m => m.keyMin);
      const maxKeys = members.map(m => m.keyMax);
      const lowestMax = Math.min(...maxKeys);
      const highestMin = Math.max(...minKeys);

      if (highestMin <= lowestMax) {
        score += 350; // Full overlap!
        score += (lowestMax - highestMin) * 25;
      } else {
        score -= (highestMin - lowestMax) * 60; // Penalty for disjoint key comfort
      }

      // Utility checks: Bloodlust & Battle Rez
      const hasLust = members.some(m => WOW_CLASSES[m.className]?.lust);
      const hasBrez = members.some(m => WOW_CLASSES[m.className]?.brez);

      if (ensureLust) {
        score += hasLust ? 220 : -350;
      }
      if (ensureBrez) {
        score += hasBrez ? 180 : -280;
      }

      // Class duplicate penalty
      if (avoidClassDupes) {
        const classNames = members.map(m => m.className);
        const uniqueClasses = new Set(classNames);
        const dupes = classNames.length - uniqueClasses.size;
        score -= dupes * 120;
      }

      // Carry preference matching
      const needCarry = members.filter(m => m.carryPreference === 'need_carry');
      const willingCarry = members.filter(m => m.carryPreference === 'willing_carry');
      if (needCarry.length > 0) {
        if (willingCarry.length > 0) {
          score += 400; // Perfect carry pairing
        } else {
          score -= 300; // Unassisted carry
        }
      }

      // Shitter squad clustering
      const shitterCount = members.filter(m => m.isShitter).length;
      if (shitterCount >= 2) {
        score += 300 + (shitterCount * 50); // Squad clustered!
      } else if (shitterCount === 1) {
        score -= 80;
      }
    });

    // Balance average IO across groups
    if (balanceIo && candidateGroups.length > 1) {
      const groupAvgIos = candidateGroups.map(grp => {
        const members = [grp.tank, grp.healer, ...grp.dps];
        return members.reduce((sum, m) => sum + (m.io || 0), 0) / members.length;
      });
      const maxAvgIo = Math.max(...groupAvgIos);
      const minAvgIo = Math.min(...groupAvgIos);
      const ioSpread = maxAvgIo - minAvgIo;
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

  if (!bestResult) {
    const tankCount = availablePool.filter(p => (p.roles || []).includes('Tank')).length;
    const healerCount = availablePool.filter(p => (p.roles || []).includes('Healer')).length;
    const dpsCount = availablePool.filter(p => (p.roles || []).includes('DPS')).length;

    let msg = 'Could not form balanced groups. ';
    if (tankCount < groupsNeeded) msg += `Need ${groupsNeeded - tankCount} more Tank(s). `;
    if (healerCount < groupsNeeded) msg += `Need ${groupsNeeded - healerCount} more Healer(s). `;
    if (dpsCount < groupsNeeded * 3) msg += `Need ${(groupsNeeded * 3) - dpsCount} more DPS. `;

    return {
      groups: lockedGroups,
      benched: availablePool,
      message: msg
    };
  }

  const activePool = (dungeonPool || DUNGEONS_MIDNIGHT_S2).filter(d => !excludedDungeons.includes(d));
  const poolToUse = activePool.length > 0 ? activePool : DUNGEONS_MIDNIGHT_S2;
  const shuffledDungeons = shuffleArray([...poolToUse]);

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

    const ownedKeys = members.filter(m => m.ownedKey && m.ownedKey.trim() !== '');
    let assignedDungeon = '';
    if (ownedKeys.length > 0) {
      assignedDungeon = ownedKeys[0].ownedKey;
    } else if (shuffledDungeons.length > 0) {
      const picked = shuffledDungeons[idx % shuffledDungeons.length];
      assignedDungeon = `${picked} +${targetKey}`;
    } else {
      assignedDungeon = `Mythic +${targetKey}`;
    }

    const lustMember = members.find(m => WOW_CLASSES[m.className]?.lust);
    const brezMember = members.find(m => WOW_CLASSES[m.className]?.brez);

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
        'Certified Scuffed 5-Man',
        'Scrapheap Heroes'
      ];
      groupName = shitterNames[idx % shitterNames.length];
    }

    const leaderMember = members.find(m => m.isLeader);

    finalGroups.push({
      ...grp,
      name: groupName,
      targetKey,
      keyRangeStr,
      assignedDungeon,
      hasLust: !!lustMember,
      lustProvider: lustMember ? `${lustMember.name} (${lustMember.className})` : null,
      hasBrez: !!brezMember,
      brezProvider: brezMember ? `${brezMember.name} (${brezMember.className})` : null,
      hasLeader: !!leaderMember,
      leaderName: leaderMember ? leaderMember.name : null,
      avgIo,
      avgIlvl,
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

/**
 * Roulette helper to pick a keystone randomly with exclusions and held keys
 */
function rollKeystone({
  dungeonPool = DUNGEONS_MIDNIGHT_S2,
  excludedDungeons = [],
  heldKeys = [],
  onlyHeld = false,
  targetLevel = null,
  minLevel = 8,
  maxLevel = 16
}) {
  let pool = (dungeonPool || DUNGEONS_MIDNIGHT_S2).filter(d => !excludedDungeons.includes(d));
  if (pool.length === 0) pool = DUNGEONS_MIDNIGHT_S2;

  let chosenDungeon = '';
  let chosenLevel = targetLevel || Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;
  let matchedHolders = [];

  if (onlyHeld && heldKeys.length > 0) {
    const validHeld = heldKeys.filter(k => {
      const dungName = k.ownedKey ? k.ownedKey.split('+')[0].trim() : '';
      return !excludedDungeons.includes(dungName);
    });
    if (validHeld.length > 0) {
      const picked = validHeld[Math.floor(Math.random() * validHeld.length)];
      chosenDungeon = picked.ownedKey.split('+')[0].trim();
      const lvlMatch = picked.ownedKey.match(/\+(\d+)/);
      if (lvlMatch) chosenLevel = parseInt(lvlMatch[1], 10);
      matchedHolders = [picked.name];
    }
  }

  if (!chosenDungeon) {
    chosenDungeon = pool[Math.floor(Math.random() * pool.length)];
    matchedHolders = heldKeys
      .filter(k => k.ownedKey && k.ownedKey.toLowerCase().includes(chosenDungeon.toLowerCase()))
      .map(k => `${k.name} (${k.ownedKey})`);
  }

  return {
    dungeon: chosenDungeon,
    level: chosenLevel,
    keyString: `${chosenDungeon} +${chosenLevel}`,
    holders: matchedHolders
  };
}

module.exports = {
  WOW_CLASSES,
  DUNGEONS_MIDNIGHT_S2,
  PARTY_NAMES,
  solveGroups,
  rollKeystone
};
