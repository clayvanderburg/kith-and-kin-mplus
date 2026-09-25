const LEADER_ROLE_IDS = new Set([
  '204419810275229697', // High Council
  '204420371900792832'  // Captains
]);

function roleIds(member) {
  if (!member) return [];
  if (Array.isArray(member.roles)) return member.roles.map(String);
  if (member.roles?.cache) return [...member.roles.cache.keys()].map(String);
  return [];
}

function isLeader(member) {
  return roleIds(member).some(id => LEADER_ROLE_IDS.has(id));
}

function userIdOf(interaction) {
  return interaction.member?.user?.id || interaction.user?.id || interaction.member?.user?.id || null;
}

function fold(value) {
  return String(value || '').trim().toLowerCase();
}

function groupMembers(group) {
  return [group?.tank, group?.healer, ...(group?.dps || [])].filter(Boolean);
}

function findSelf(state, interaction) {
  const id = userIdOf(interaction);
  if (!id) return null;
  return (state.players || []).find(player => player.discordId === id) || null;
}

function visibleGroups(state, interaction) {
  const groups = state.formedGroups || [];
  const indexed = groups.map((group, index) => ({ group, index }));
  if (isLeader(interaction.member)) return indexed;
  const self = findSelf(state, interaction);
  if (!self) return [];
  return indexed.filter(({ group }) => groupMembers(group).some(member => fold(member.name) === fold(self.name)));
}

function keyChoices(group) {
  return groupMembers(group).flatMap((member, index) => {
    if (!member.ownedKey) return [];
    return [{
      value: String(index),
      label: `${member.ownedKey} — ${member.name}`.slice(0, 100),
      ownedKey: member.ownedKey,
      name: member.name
    }];
  }).slice(0, 24);
}

function memberLines(group) {
  return groupMembers(group).map(member => {
    const role = member === group.tank ? '🛡️' : member === group.healer ? '💚' : '⚔️';
    return `${role} **${member.name}** — ${member.ownedKey || 'no key in bags'}`;
  });
}

function rollPanel(state, interaction, groupIndex = null) {
  const visible = visibleGroups(state, interaction);
  const web = 'https://knkmplus.netlify.app/signup.html';
  if (!visible.length) {
    const leader = isLeader(interaction.member);
    return {
      content: leader
        ? `No groups are formed yet. Captains and High Council can run \`/mplus form\`.\nYour own party also shows on the [signup page](${web}) after you sign in.`
        : `You are not in a formed group yet.\nCaptains and High Council form groups with \`/mplus form\`. After that, your party and keys are on the [signup page](${web}).`,
      components: [],
      flags: 64
    };
  }

  const groupRow = {
    type: 1,
    components: [{
      type: 3,
      custom_id: 'roll_pick_group',
      placeholder: 'Select a group',
      min_values: 1,
      max_values: 1,
      options: visible.map(({ group, index }) => ({
        label: `Group ${index + 1}: ${group.name || 'Party'}`.slice(0, 100),
        value: String(index),
        description: groupMembers(group).map(member => member.name).join(', ').slice(0, 100),
        default: groupIndex === index
      }))
    }]
  };

  if (groupIndex === null || !state.formedGroups?.[groupIndex]) {
    return {
      content: `Pick a group. You'll see who is in it and the keys they are holding, then you can leave some out and roll.\nYou can also do this on the [signup page](${web}).`,
      components: [groupRow],
      flags: 64
    };
  }

  const group = state.formedGroups[groupIndex];
  const keys = keyChoices(group);
  const draft = state.rollDrafts?.[userIdOf(interaction)] || {};
  const excluded = new Set((draft.groupIndex === groupIndex ? draft.excluded : []) || []);
  const rows = [groupRow];

  if (keys.length) {
    rows.push({
      type: 1,
      components: [{
        type: 3,
        custom_id: `roll_exclude:${groupIndex}`,
        placeholder: 'Keys to leave out of the roll',
        min_values: 1,
        max_values: Math.min(25, keys.length + 1),
        options: [
          { label: 'Leave every key in', value: 'keep', description: 'Roll from every key this group is holding', default: excluded.size === 0 },
          ...keys.map(key => ({
            label: key.label,
            value: key.value,
            description: 'Leave this key out',
            default: excluded.has(key.value)
          }))
        ]
      }]
    });
  }

  rows.push({
    type: 1,
    components: [{
      type: 2,
      style: 1,
      custom_id: `roll_go:${groupIndex}`,
      label: 'Roll a key 🎲'
    }]
  });

  const pool = keys.filter(key => !excluded.has(key.value));
  const poolText = pool.length
    ? pool.map(key => `• ${key.ownedKey} (${key.name})`).join('\n')
    : 'No held keys left in the roll.';

  return {
    content: `**Group ${groupIndex + 1}: ${group.name || 'Party'}**\n${memberLines(group).join('\n')}\n\n**Rolling from:**\n${poolText}\n\nChoose any keys to leave out, then hit Roll. Or open this party on the [signup page](${web}).`,
    components: rows,
    flags: 64
  };
}

function applyExclusions(state, interaction, groupIndex, values) {
  const userId = userIdOf(interaction);
  if (!userId) return;
  const excluded = (values || []).filter(value => value !== 'keep');
  state.rollDrafts = state.rollDrafts || {};
  state.rollDrafts[userId] = { groupIndex, excluded };
}

function rollGroupKey(state, interaction, groupIndex) {
  const group = state.formedGroups?.[groupIndex];
  if (!group) return { error: 'That group is no longer formed.' };
  const visible = visibleGroups(state, interaction);
  if (!visible.some(item => item.index === groupIndex)) {
    return { error: 'You can only roll a key for your own group.' };
  }
  const keys = keyChoices(group);
  const draft = state.rollDrafts?.[userIdOf(interaction)];
  const excluded = new Set(draft && draft.groupIndex === groupIndex ? draft.excluded : []);
  const pool = keys.filter(key => !excluded.has(key.value));
  if (!pool.length) return { error: 'Leave at least one key in the roll.' };
  const picked = pool[Math.floor(Math.random() * pool.length)];
  group.dungeon = picked.ownedKey;
  group.assignedDungeon = picked.ownedKey;
  group.keystone = picked.ownedKey;
  state.groupsTouchedAt = new Date().toISOString();
  return { key: picked.ownedKey, holder: picked.name, group };
}

module.exports = {
  isLeader,
  rollPanel,
  applyExclusions,
  rollGroupKey
};
