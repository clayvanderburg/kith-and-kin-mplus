/**
 * Discord Embeds for Kith and Kin Mythic+ Night
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { WOW_CLASSES } = require('./solver');

function createRosterEmbed(players, webUrl) {
  const attending = players.filter(p => p.attending);
  const tanks = attending.filter(p => (p.roles || []).includes('Tank')).length;
  const healers = attending.filter(p => (p.roles || []).includes('Healer')).length;
  const dps = attending.filter(p => (p.roles || []).includes('DPS')).length;
  const maxGroups = Math.min(tanks, healers, Math.floor(dps / 3));

  const embed = new EmbedBuilder()
    .setTitle('🏰 Kith & Kin — Mythic+ Night Sign-ups')
    .setColor(0xF5D061)
    .setDescription(
      `**Event Status**: ${attending.length} Attending • Can form **${maxGroups}** full ${maxGroups === 1 ? 'group' : 'groups'} (1 Tank, 1 Healer, 3 DPS)\n\n` +
      `🛡️ **Tanks**: ${tanks}  |  💚 **Healers**: ${healers}  |  ⚔️ **DPS**: ${dps}`
    )
    .setTimestamp();

  if (attending.length === 0) {
    embed.addFields({
      name: 'No Sign-ups Yet',
      value: 'Click a button below or type `/mplus signup` to sign up your character!'
    });
  } else {
    // Group attendees by primary role
    const tankList = attending.filter(p => p.roles[0] === 'Tank' || (p.roles.includes('Tank') && !p.roles.includes('Healer')));
    const healerList = attending.filter(p => p.roles[0] === 'Healer' || (p.roles.includes('Healer') && !tankList.includes(p)));
    const dpsList = attending.filter(p => !tankList.includes(p) && !healerList.includes(p));

    const formatPlayer = (p) => {
      let tags = [];
      if (p.carryPreference === 'need_carry') tags.push('🎒 Need');
      if (p.carryPreference === 'willing_carry') tags.push('🏋️ Stronk');
      if (p.isShitter) tags.push('💩');
      const tagStr = tags.length ? ` [${tags.join(' ')}]` : '';
      const keyStr = p.ownedKey ? ` • 🔑 ${p.ownedKey}` : ` • Keys +${p.keyMin}-${p.keyMax}`;
      return `**${p.name}** (${p.className}) • ${p.io ? p.io.toLocaleString() + ' IO' : p.ilvl + ' ilvl'}${keyStr}${tagStr}`;
    };

    if (tankList.length > 0) {
      embed.addFields({
        name: `🛡️ Tanks (${tankList.length})`,
        value: tankList.map(formatPlayer).join('\n') || 'None'
      });
    }

    if (healerList.length > 0) {
      embed.addFields({
        name: `💚 Healers (${healerList.length})`,
        value: healerList.map(formatPlayer).join('\n') || 'None'
      });
    }

    if (dpsList.length > 0) {
      embed.addFields({
        name: `⚔️ DPS (${dpsList.length})`,
        value: dpsList.map(formatPlayer).join('\n') || 'None'
      });
    }
  }

  if (webUrl) {
    embed.addFields({
      name: '🌐 Web Dashboard',
      value: `[View Live Generator & Custom Comps](${webUrl})`
    });
  }

  return embed;
}

function createGroupEmbeds(groups, benched, webUrl) {
  const embeds = [];

  groups.forEach((grp, idx) => {
    let title = `PARTY ${idx + 1}: ${grp.name.toUpperCase()}`;
    if (grp.isShitterGroup) title += ' 💩';

    let color = 0xF5D061;
    if (grp.isShitterGroup) color = 0xB45309;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(color);

    let metaDesc = `🔑 **${grp.assignedDungeon}**\n🎯 Key Comfort: \`${grp.keyRangeStr}\`\n⭐ Avg IO: **${grp.avgIo.toLocaleString()}** | 🛡️ Avg iLvl: **${grp.avgIlvl}**\n`;

    let utilLine = [];
    if (grp.hasLust) {
      utilLine.push(`⚡ Lust: ${grp.lustProvider}`);
    } else {
      utilLine.push(`⚠️ Missing Lust`);
    }
    if (grp.hasBrez) {
      utilLine.push(`🔄 BRez: ${grp.brezProvider}`);
    } else {
      utilLine.push(`⚠️ Missing BRez`);
    }
    if (grp.hasCarryMatch) {
      utilLine.push(`🎒 Carry Assisted`);
    }

    metaDesc += utilLine.join('  •  ') + '\n\n';

    const formatMemberLine = (icon, m) => {
      let flags = [];
      if (m.carryPreference === 'need_carry') flags.push('🎒 Need');
      if (m.carryPreference === 'willing_carry') flags.push('🏋️ Stronk');
      if (m.isShitter) flags.push('💩');
      const flagStr = flags.length ? ` \`${flags.join(' ')}\`` : '';

      return `${icon} **${m.name}** (${m.className}) — **${(m.io || 0).toLocaleString()} IO** (${m.ilvl || 320} ilvl)${flagStr}\n   └ Key Range: +${m.keyMin} to +${m.keyMax}${m.ownedKey ? ` | 🔑 ${m.ownedKey}` : ''}`;
    };

    let membersText = [
      formatMemberLine('🛡️', grp.tank),
      formatMemberLine('💚', grp.healer),
      ...grp.dps.map(d => formatMemberLine('⚔️', d))
    ].join('\n\n');

    embed.setDescription(metaDesc + membersText);
    embeds.push(embed);
  });

  if (benched && benched.length > 0) {
    const benchEmbed = new EmbedBuilder()
      .setTitle(`🍺 Tavern Reserves / Bench (${benched.length})`)
      .setColor(0x64748B)
      .setDescription(
        benched.map(p => `• **${p.name}** (${p.className} - ${(p.roles || []).join('/')}) — ${(p.io || 0).toLocaleString()} IO (+${p.keyMin}-+${p.keyMax})`).join('\n')
      );
    embeds.push(benchEmbed);
  }

  return embeds;
}

function createSignupButtons() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_attend_tank')
      .setLabel('Attend: Tank 🛡️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('btn_attend_healer')
      .setLabel('Attend: Healer 💚')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('btn_attend_dps')
      .setLabel('Attend: DPS ⚔️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('btn_absent')
      .setLabel('Can’t Make It ❌')
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_vibe_carry')
      .setLabel('Need Carry 🎒')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_vibe_stronk')
      .setLabel('Back is Stronk 🏋️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_vibe_shitter')
      .setLabel('I’m a Shitter 💩')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_refresh_roster')
      .setLabel('🔄 Refresh')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}

module.exports = {
  createRosterEmbed,
  createGroupEmbeds,
  createSignupButtons
};
