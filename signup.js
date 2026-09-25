(() => {
  const loginCard = document.getElementById('loginCard');
  const signupCard = document.getElementById('signupCard');
  const groupCard = document.getElementById('groupCard');
  const charGrid = document.getElementById('charGrid');
  const saveStatus = document.getElementById('saveStatus');
  let selected = null;
  let characters = [];
  let currentSignup = null;
  let satisfaction = 3;

  const FACES = ['', '😠', '🙁', '😐', '🙂', '😄'];
  const CLASS_COLORS = {
    'Death Knight': '#C41E3A', 'Demon Hunter': '#A330C9', Druid: '#FF7C0A', Evoker: '#33937F',
    Hunter: '#AAD372', Mage: '#3FC7EB', Monk: '#00FF98', Paladin: '#F48CBA', Priest: '#E2E8F0',
    Rogue: '#FFF468', Shaman: '#0070DD', Warlock: '#8788EE', Warrior: '#C69B6D'
  };

  function getIoColor(score) {
    if (!score || score <= 0) return '#94a3b8';
    if (score >= 2800) return '#e28bf0';
    if (score >= 2500) return '#ff8000';
    if (score >= 2000) return '#a335ee';
    if (score >= 1500) return '#0070dd';
    if (score >= 1000) return '#1eff00';
    return '#f8fafc';
  }

  function syncOwnedKeyFromDropdowns() {
    const dungeonSelect = document.getElementById('ownedDungeonSelect');
    const levelSelect = document.getElementById('ownedKeyLevelSelect');
    const owned = document.getElementById('ownedKeyInput');
    if (!owned || !dungeonSelect || !levelSelect) return;
    const dungeon = dungeonSelect.value.trim();
    const level = levelSelect.value.trim();
    if (dungeon && level) {
      owned.value = `${dungeon} +${level}`;
    } else if (level) {
      owned.value = `+${level}`;
    } else if (dungeon) {
      owned.value = dungeon;
    } else {
      owned.value = '';
    }
  }

  function setDropdownsFromOwnedKey(str) {
    const dungeonSelect = document.getElementById('ownedDungeonSelect');
    const levelSelect = document.getElementById('ownedKeyLevelSelect');
    const owned = document.getElementById('ownedKeyInput');
    if (!dungeonSelect || !levelSelect) return;
    if (owned) owned.value = str || '';
    if (!str) {
      dungeonSelect.value = '';
      levelSelect.value = '';
      return;
    }
    const trimmed = String(str).trim();
    const plusMatch = trimmed.match(/\+(\d+)/);
    const level = plusMatch ? plusMatch[1] : '';
    const dungeonPart = trimmed.replace(/\+.*$/, '').trim();
    dungeonSelect.value = dungeonPart;
    levelSelect.value = level;
  }

  function syncRunKeyFromDropdowns() {
    const dungeonSelect = document.getElementById('runDungeonSelect');
    const levelSelect = document.getElementById('runKeyLevelSelect');
    const runKey = document.getElementById('runKeyInput');
    if (!runKey || !dungeonSelect || !levelSelect) return;
    const dungeon = dungeonSelect.value.trim();
    const level = levelSelect.value.trim();
    if (dungeon && level) {
      runKey.value = `${dungeon} +${level}`;
    } else if (level) {
      runKey.value = `+${level}`;
    } else if (dungeon) {
      runKey.value = dungeon;
    } else {
      runKey.value = '';
    }
  }

  function setDropdownsFromRunKey(str) {
    const dungeonSelect = document.getElementById('runDungeonSelect');
    const levelSelect = document.getElementById('runKeyLevelSelect');
    const runKey = document.getElementById('runKeyInput');
    if (!dungeonSelect || !levelSelect) return;
    if (runKey) runKey.value = str || '';
    if (!str) {
      dungeonSelect.value = '';
      levelSelect.value = '';
      return;
    }
    const trimmed = String(str).trim();
    const plusMatch = trimmed.match(/\+(\d+)/);
    const level = plusMatch ? plusMatch[1] : '';
    const dungeonPart = trimmed.replace(/\+.*$/, '').trim();
    dungeonSelect.value = dungeonPart;
    levelSelect.value = level;
  }

  function checkedValues(container) {
    return [...container.querySelectorAll('input:checked')].map(input => input.value);
  }

  function setChecks(container, values) {
    container.querySelectorAll('input').forEach(input => {
      input.checked = values.includes(input.value);
    });
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function renderCharacters() {
    charGrid.innerHTML = '';
    if (!characters.length) {
      charGrid.textContent = 'No level 10+ characters came back from Battle.net.';
      return;
    }
    characters.forEach(character => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'char-pick' + (selected && selected.name === character.name && selected.realm === character.realm ? ' is-selected' : '');
      const name = document.createElement('strong');
      name.textContent = character.name;
      const meta = document.createElement('small');
      meta.textContent = `${character.className} · ${character.realm} · ${character.level}`;
      button.append(name, meta);
      button.addEventListener('click', () => {
        selected = character;
        renderCharacters();
      });
      charGrid.appendChild(button);
    });
  }

  function fillForm(signup) {
    if (!signup) return;
    selected = characters.find(character => character.name === signup.name && character.realm === signup.realm) || selected;
    setChecks(document.getElementById('roleRow'), signup.roles || ['DPS']);
    setChecks(document.getElementById('bracketRow'), signup.keyBrackets || ['10-12']);
    document.getElementById('optLeader').checked = !!signup.isLeader;
    document.getElementById('optReserve').checked = !!signup.isReserve;
    document.getElementById('optCarry').checked = signup.carryPreference === 'need_carry';
    document.getElementById('optStronk').checked = signup.carryPreference === 'willing_carry';
    document.getElementById('optShitter').checked = !!signup.isShitter;
    document.getElementById('optOut').checked = signup.attending === false;
    renderCharacters();
  }

  function prefText(member) {
    const bits = [];
    if (member.isLeader) bits.push('👑 Lead');
    if (member.carryPreference === 'need_carry') bits.push('🎒 Carry');
    if (member.carryPreference === 'willing_carry') bits.push('🏋️ Can carry');
    if (member.isReserve) bits.push('🍺 Bench');
    if (member.isShitter) bits.push('💩 Alt');
    if (member.keyBrackets?.length) bits.push(member.keyBrackets.join(' · '));
    return bits.join(' · ');
  }

  function recordText(record) {
    if (!record?.runs) return 'No keys logged yet';
    const face = record.avgSatisfaction ? ` · ${FACES[record.avgSatisfaction] || ''}` : '';
    return `${record.runs} keys · ${record.rate}% timed${face}`;
  }

  function renderHistory(log) {
    const list = document.getElementById('historyList');
    if (!list) return;
    if (!log?.length) {
      list.innerHTML = '<p class="player-lead">No keys logged yet. Add one after the run.</p>';
      return;
    }
    list.innerHTML = log.map(entry => {
      const when = new Date(entry.at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      const links = [
        entry.rioUrl ? `<a href="${escapeHtml(entry.rioUrl)}" target="_blank" rel="noopener">Raider.IO</a>` : '',
        entry.wclUrl ? `<a href="${escapeHtml(entry.wclUrl)}" target="_blank" rel="noopener">Warcraft Logs</a>` : ''
      ].filter(Boolean).join(' · ');
      return `<article class="history-item" data-run="${escapeHtml(entry.id)}">
        <strong>${FACES[entry.satisfaction] || ''} ${escapeHtml(entry.key)}</strong>
        <small> ${entry.success ? 'Timed' : 'Depleted'} · ${escapeHtml(when)}${entry.groupName ? ` · ${escapeHtml(entry.groupName)}` : ''}${entry.linkSource === 'raider-io' ? ' · matched from Raider.IO' : ''}</small>
        ${links ? `<div>${links}</div>` : ''}
        ${entry.note ? `<div>${escapeHtml(entry.note)}</div>` : ''}
        <div class="desk-grid">
          <input class="form-input run-rio" value="${escapeHtml(entry.rioUrl || '')}" placeholder="https://raider.io/...">
          <input class="form-input run-wcl" value="${escapeHtml(entry.wclUrl || '')}" placeholder="https://www.warcraftlogs.com/...">
        </div>
        <button type="button" class="btn btn-sm save-links">Save links</button>
      </article>`;
    }).join('');
    list.querySelectorAll('.save-links').forEach(button => {
      button.addEventListener('click', async () => {
        const item = button.closest('[data-run]');
        document.getElementById('nightStatus').textContent = 'Saving links...';
        try {
          await postMe({
            action: 'edit-run',
            id: item.dataset.run,
            rioUrl: item.querySelector('.run-rio').value,
            wclUrl: item.querySelector('.run-wcl').value
          });
          document.getElementById('nightStatus').textContent = 'Links saved.';
        } catch (err) {
          document.getElementById('nightStatus').textContent = err.message;
        }
      });
    });
  }

  function showSignedUp(signup) {
    currentSignup = signup;
    const summary = document.getElementById('signupSummary');
    const form = document.getElementById('signupForm');
    const card = document.getElementById('signupCard');
    const night = document.getElementById('nightCard');
    if (!signup) {
      summary.hidden = true;
      form.hidden = false;
      card.classList.remove('is-collapsed');
      night.hidden = true;
      return;
    }
    summary.hidden = false;
    card.classList.add('is-collapsed');
    night.hidden = false;
    document.getElementById('summaryName').textContent = signup.name;
    const goals = (signup.keyBrackets || []).join(', ') || `+${signup.keyMin}–${signup.keyMax}`;
    document.getElementById('summaryDetail').textContent = `${signup.className} · ${(signup.roles || []).join('/')} · ${goals} · ${signup.io || 0} IO`;
    document.querySelectorAll('#statusRow .status-btn').forEach(button => {
      button.classList.toggle('is-on', button.dataset.status === (signup.nightStatus || 'waiting'));
    });
    setDropdownsFromOwnedKey(signup.ownedKey || '');
    setDropdownsFromRunKey(signup.ownedKey || '');
    const lastRun = document.getElementById('lastRunNote');
    if (lastRun) lastRun.textContent = 'Leave this blank until you select the keystone in your bags.';
    renderHistory(signup.runLog);
  }

  function renderGroups(groups) {
    const list = document.getElementById('groupList');
    groupCard.hidden = false;
    const ordered = [...(groups || [])].sort((a, b) => Number(b.mine) - Number(a.mine));

    // Handle dedicated Party Key Roll section above active dungeon parties
    const myGroup = ordered.find(g => g.mine);
    const rouletteCard = document.getElementById('playerRouletteCard');
    const chipsList = document.getElementById('playerGroupKeysList');
    const subtitle = document.getElementById('playerRouletteSubtitle');
    const rollBtn = document.getElementById('playerRollKeyBtn');

    if (myGroup && rouletteCard && chipsList) {
      rouletteCard.hidden = false;
      if (subtitle) {
        subtitle.textContent = `Roll a keystone for Party ${myGroup.index + 1}: ${myGroup.name}`;
      }
      myGroup.excludedPlayers = myGroup.excludedPlayers || [];
      const excluded = new Set(myGroup.excludedPlayers.map(n => n.toLowerCase()));

      chipsList.innerHTML = myGroup.members.map(member => {
        const isOut = excluded.has(member.name.toLowerCase());
        const hasKey = Boolean(member.ownedKey);
        return `<button type="button" class="player-exclude-chip ${isOut ? 'is-out' : ''} ${hasKey ? '' : 'no-key'}" data-player="${escapeHtml(member.name)}">
          ${escapeHtml(member.name)}${hasKey ? ` · ${escapeHtml(member.ownedKey)}` : ' · (no key entered)'}
        </button>`;
      }).join('');

      chipsList.querySelectorAll('.player-exclude-chip').forEach(btn => {
        btn.addEventListener('click', async () => {
          const pName = btn.getAttribute('data-player');
          const isCurrentlyOut = myGroup.excludedPlayers.some(n => n.toLowerCase() === pName.toLowerCase());
          myGroup.excludedPlayers = isCurrentlyOut
            ? myGroup.excludedPlayers.filter(n => n.toLowerCase() !== pName.toLowerCase())
            : [...myGroup.excludedPlayers, pName];
          renderGroups(groups);
          try {
            await postMe({ action: 'exclude-player', excludedPlayers: myGroup.excludedPlayers });
          } catch (e) {
            console.error(e);
          }
        });
      });

      if (rollBtn) {
        rollBtn.onclick = async () => {
          rollBtn.disabled = true;
          const status = document.getElementById('playerRollStatus');
          if (status) status.textContent = 'Rolling a key...';
          try {
            const res = await fetch('/api/me', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
              body: JSON.stringify({ action: 'roll', excludedPlayers: myGroup.excludedPlayers || [] })
            });
            const data = await res.json();
            rollBtn.disabled = false;
            if (!res.ok) {
              if (status) status.textContent = data.error || 'Could not roll a key.';
              return;
            }
            if (status) status.textContent = '';
            const banner = document.getElementById('playerRouletteResultBanner');
            const resultText = document.getElementById('playerRouletteResultText');
            const holdersText = document.getElementById('playerRouletteHoldersText');
            if (banner && resultText) {
              banner.style.display = 'flex';
              resultText.textContent = data.hasTypedKey
                ? `${data.who}'s key: ${data.key}`
                : `${data.who}'s key (check bags - unlogged keystone)`;
              if (holdersText) {
                holdersText.textContent = `${myGroup.name} will run this key.`;
              }
            }
            const flash = document.getElementById('rollFlash');
            if (flash) {
              document.getElementById('rollFlashKey').textContent = data.key;
              document.getElementById('rollFlashWho').textContent = data.who
                ? (data.hasTypedKey ? `${data.who} typed that key.` : `${data.who} was chosen! Ask them what key is in their bags.`)
                : 'That key is now on your party card.';
              flash.classList.add('is-on');
            }
            renderGroups(data.groups);
          } catch (err) {
            rollBtn.disabled = false;
            if (status) status.textContent = err.message || 'Roll failed.';
          }
        };
      }
    } else if (rouletteCard) {
      rouletteCard.hidden = true;
    }

    if (!ordered.length) {
      list.innerHTML = '<p class="player-lead">Parties have not been formed yet. Your signup is saved, and you can still set Waiting or In key.</p>';
      return;
    }

    function renderMemberVibeBadges(p) {
      if (!p) return '';
      let h = '';
      if (p.isLeader) h += `<span class="leader-pill" style="font-size:0.65rem; padding:0.05rem 0.35rem;" title="Born Leader: willing to lead group">👑 Leader</span>`;
      if (p.isReserve) h += `<span class="reserve-pill" style="font-size:0.65rem; padding:0.05rem 0.35rem;" title="Voluntary Bench / Reserve">🍺 Reserve</span>`;
      if (p.carryPreference === 'need_carry') {
        h += `<span class="carry-pill need" style="font-size:0.65rem; padding:0.05rem 0.35rem;" title="I need a carry">🎒 Carry Me</span>`;
      } else if (p.carryPreference === 'willing_carry') {
        h += `<span class="carry-pill stronk" style="font-size:0.65rem; padding:0.05rem 0.35rem;" title="My back is stronk (willing to carry)">🏋️ Stronk Back</span>`;
      }
      if (p.isShitter) h += `<span class="shitter-pill" style="font-size:0.65rem; padding:0.05rem 0.35rem;" title="I'm a shitter">💩 Shitter</span>`;
      return h;
    }

    function renderMemberSlot(member) {
      if (!member) return '';
      const color = CLASS_COLORS[member.className] || '#f5d061';
      const roleIcon = member.slotRole === 'Tank' ? '🛡️' : (member.slotRole === 'Healer' ? '💚' : '⚔️');
      const roleCss = member.slotRole === 'Tank' ? 'role-tank' : (member.slotRole === 'Healer' ? 'role-healer' : 'role-dps');
      const ioColor = getIoColor(member.io);
      const status = member.nightStatus === 'in-key' ? 'in-key' : 'waiting';

      return `
        <div class="party-member-row is-collapsed ${roleCss}">
          <span class="slot-role-tag" title="${escapeHtml(member.slotRole || 'DPS')}">${roleIcon}</span>
          <div class="slot-player-details">
            <div class="slot-top-row slot-toggle-trigger" title="Click to expand or collapse details">
              <div class="slot-top-left">
                <span class="slot-player-name" style="color: ${color};">${escapeHtml(member.name)}</span>
                <span class="class-tag" style="color: ${color}; border: 1px solid ${color}44;">${escapeHtml(member.className || 'Player')}</span>
                ${member.ownedKey ? `<span class="slot-key-mini" title="Key in bags: ${escapeHtml(member.ownedKey)}">🔑 ${escapeHtml(member.ownedKey)}</span>` : ''}
              </div>
              <div class="slot-top-right">
                <span class="status-pill ${status}" style="font-size:0.7rem; margin:0;">${status === 'in-key' ? 'In key' : 'Waiting'}</span>
                <span class="slot-stat-badge io" style="color: ${ioColor}; border: 1px solid ${ioColor}77;">${(member.io || 0).toLocaleString()} IO</span>
                <span class="slot-expand-chevron">▸</span>
              </div>
            </div>
            <div class="slot-details-collapsible">
              <div class="slot-bottom-row">
                <div class="slot-meta-left">
                  <span class="slot-stat-badge ilvl">${member.ilvl || '—'} iLvl</span>
                  ${renderMemberVibeBadges(member)}
                </div>
                <span class="slot-key-range">${member.keyBrackets?.length ? member.keyBrackets.join(' · ') : `+${member.keyMin}–+${member.keyMax}`}</span>
              </div>
              <div class="member-record" style="margin-top:0.35rem; display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
                <span style="color:var(--text-muted); font-size:0.78rem;">${escapeHtml(recordText(member.record))}</span>
                <button type="button" class="btn-action-icon stats-player-btn view-member-stats-btn" data-name="${escapeHtml(member.name)}" style="padding:0.18rem 0.6rem; font-size:0.72rem;" title="View Season Stats &amp; Dossier">📊 Stats &amp; History</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    list.innerHTML = ordered.map(group => {
      const memberRows = group.members.map(renderMemberSlot).join('');
      const inKeyCount = (group.members || []).filter(m => m.nightStatus === 'in-key').length;
      const totalMembers = (group.members || []).length;

      let partyStatusHtml = '';
      if (totalMembers > 0 && inKeyCount === totalMembers) {
        partyStatusHtml = '<span class="party-status-indicator in-key" title="All members are currently In key">🗝️ In key</span>';
      } else if (inKeyCount > 0) {
        partyStatusHtml = `<span class="party-status-indicator in-key" title="${inKeyCount} of ${totalMembers} members are in key">🗝️ In key (${inKeyCount}/${totalMembers})</span>`;
      } else {
        partyStatusHtml = '<span class="party-status-indicator waiting" title="Party is waiting to run">⏳ Waiting</span>';
      }

      const rolledKey = (group.keystone || group.dungeon || '').trim();
      const hasRolledKey = rolledKey && rolledKey !== 'No key rolled yet';
      const hasLeftOut = (group.excludedPlayers || []).length > 0;

      return `
        <article class="party-card ${group.mine ? 'mine is-mine-group' : ''}">
          <div class="party-header">
            <div class="party-badge-title">
              <span class="party-num">Party ${group.index + 1}${group.mine ? ' · ⭐ Your Party' : ''} ·</span>
              <span class="party-name">${escapeHtml(group.name)}</span>
            </div>
            <div class="party-card-controls">
              ${group.isLocked ? '<span style="font-size:0.75rem; color:#fde047;">🔒 Locked</span>' : ''}
            </div>
          </div>

          <div class="party-sub-meta">
            <div class="party-sub-status">
              ${partyStatusHtml}
            </div>
            <div class="party-sub-key-area">
              ${hasRolledKey ? `<span class="party-dungeon-tag" title="Key rolled for this party">🔑 ${escapeHtml(rolledKey)}</span>` : ''}
              ${hasLeftOut ? `<span class="party-left-out" title="Excluded from roll">Left out: ${escapeHtml(group.excludedPlayers.join(', '))}</span>` : ''}
            </div>
          </div>

          <div class="party-utility-bar">
            ${group.hasLeader && group.leaderName ? `<span class="party-util-badge ready" title="Designated Group Leader">👑 Leader: ${escapeHtml(group.leaderName)}</span>` : ''}
            <span class="party-util-badge ${group.hasLust ? 'ready' : 'missing'}" title="${group.hasLust ? 'Bloodlust/Heroism ready: ' + escapeHtml(group.lustProvider) : 'No Bloodlust class in this group!'}">
              ⚡ ${group.hasLust ? 'Lust: ' + escapeHtml(group.lustProvider) : 'Lust: Missing'}
            </span>
            <span class="party-util-badge ${group.hasBrez ? 'ready' : 'missing'}" title="${group.hasBrez ? 'Battle Rez ready: ' + escapeHtml(group.brezProvider) : 'No Battle Rez class in this group!'}">
              🔄 ${group.hasBrez ? 'BRez: ' + escapeHtml(group.brezProvider) : 'BRez: Missing'}
            </span>
            ${group.isShitterGroup ? `<span class="party-util-badge shitter-group" title="Shitter Alt Squad">💩 Shitter Squad</span>` : ''}
            ${group.hasCarryMatch ? `<span class="party-util-badge carry-assist" title="Carry Match">🎒 Carry Assisted</span>` : ''}
          </div>

          <div class="party-metrics-bar">
            <span class="party-avg-io">⭐ Avg IO: <strong>${(group.avgIo || 0).toLocaleString()}</strong></span>
            <span class="party-avg-ilvl">🛡️ Avg iLvl: <strong>${group.avgIlvl || '—'}</strong></span>
          </div>

          <div class="party-members">
            ${memberRows}
          </div>
          <div class="party-footer" style="display:flex; justify-content:flex-end; align-items:center; gap:0.5rem; margin-top:0.6rem;">
            <button type="button" class="btn btn-sm auto-match-party-btn" data-group-index="${group.index}" title="Check Raider.IO for completed key for this party">
              ⚡ Auto-Match Key
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Attach click toggle on each member row in the party
    list.querySelectorAll('.slot-toggle-trigger').forEach(trigger => {
      trigger.addEventListener('click', () => {
        const row = trigger.closest('.party-member-row');
        if (row) {
          row.classList.toggle('is-collapsed');
        }
      });
    });

    list.querySelectorAll('.view-member-stats-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const name = btn.getAttribute('data-name');
        if (window.openPlayerStats) {
          window.openPlayerStats(name, { formedGroups: groups, players: [] });
        }
      });
    });

    list.querySelectorAll('.auto-match-party-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.getAttribute('data-group-index'), 10);
        const group = groups[idx];
        if (!group || !window.autoMatchParty) return;

        const origHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '🔍 Checking...';

        await window.autoMatchParty(group, { formedGroups: groups, players: currentSignup ? [currentSignup] : [] }, {
          onFound: async (match, count) => {
            btn.disabled = false;
            btn.innerHTML = origHtml;
            // If current user is in this group, save to their account via postMe
            const myRun = (group.members || []).some(m => currentSignup && m.name.toLowerCase() === currentSignup.name.toLowerCase());
            if (myRun) {
              try {
                await postMe({
                  action: 'log-run',
                  key: `${match.run.dungeon} +${match.run.mythic_level}`,
                  success: match.run.num_keystone_upgrades > 0,
                  rioUrl: match.run.url
                });
              } catch (e) {
                console.warn('[signup] Could not auto-sync to backend:', e);
              }
            }
            alert(`🎉 Matched and logged ${match.run.dungeon} +${match.run.mythic_level} (${match.run.num_keystone_upgrades > 0 ? 'Timed' : 'Depleted'})!`);
          },
          onNotFound: () => {
            btn.disabled = false;
            btn.innerHTML = origHtml;
            alert(`No recently completed runs found on Raider.IO for Party ${group.index + 1} yet.\n\n(Raider.IO usually updates within 5-10 minutes of key completion).`);
          },
          onError: (err) => {
            btn.disabled = false;
            btn.innerHTML = origHtml;
            alert(`Error matching run: ${err.message}`);
          }
        });
      });
    });
  }

  async function saveSignup() {
    if (!selected) {
      saveStatus.textContent = 'Pick a character first.';
      return;
    }
    const carry = document.getElementById('optCarry').checked
      ? 'need_carry'
      : (document.getElementById('optStronk').checked ? 'willing_carry' : 'none');
    saveStatus.textContent = 'Saving...';
    const res = await fetch('/api/me', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
      body: JSON.stringify({
        name: selected.name,
        realm: selected.realm,
        eventId: document.getElementById('eventSelect').value,
        roles: checkedValues(document.getElementById('roleRow')),
        keyBrackets: checkedValues(document.getElementById('bracketRow')),
        isLeader: document.getElementById('optLeader').checked,
        isReserve: document.getElementById('optReserve').checked,
        isShitter: document.getElementById('optShitter').checked,
        carryPreference: carry,
        attending: !document.getElementById('optOut').checked
      })
    });
    const data = await res.json();
    if (!res.ok) {
      saveStatus.textContent = data.error || data.errorMessage || data.message || 'Save failed.';
      return;
    }
    saveStatus.textContent = data.signup?.attending === false
      ? 'Marked you as out.'
      : `Saved ${data.signup.name}.`;
    showSignedUp(data.signup);
    renderGroups(data.groups);
  }

  async function postMe(body) {
    const res = await fetch('/api/me', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Save failed.');
    showSignedUp(data.signup);
    renderGroups(data.groups);
    return data;
  }

  function rememberSessionFromHash() {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    const token = hash.get('s');
    if (!token) return;
    sessionStorage.setItem('kk_session', token);
    history.replaceState(null, '', location.pathname + location.search);
  }

  function sessionHeaders() {
    const token = sessionStorage.getItem('kk_session') || '';
    return token ? { 'x-kk-session': token } : {};
  }

  async function boot() {
    rememberSessionFromHash();
    const loginBtn = document.getElementById('bnetLoginBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        loginBtn.textContent = 'Opening Battle.net...';
      });
    }
    const res = await fetch('/api/me', { credentials: 'include', headers: sessionHeaders() });
    const data = await res.json();
    if (!data.authenticated) {
      loginCard.hidden = false;
      if (sessionStorage.getItem('kk_session')) {
        document.getElementById('loginNote').textContent = 'Battle.net sent you back, but the signup page could not keep that login. Click the button again.';
      } else if (data.bnetConfigured === false) {
        document.getElementById('loginNote').textContent = 'Battle.net login still needs a one-time app setup by an officer before this button can finish signing people in.';
      }
      return;
    }
    loginCard.hidden = true;
    signupCard.hidden = false;
    characters = data.characters || [];
    document.getElementById('hello').textContent = data.battleTag;
    document.getElementById('tagLine').textContent = 'Choose the night and the character you are bringing. This only changes your signup.';
    const eventSelect = document.getElementById('eventSelect');
    const events = data.events?.length ? data.events : [{ id: 'event-default', name: 'Friday M+ Night', current: true }];
    const preferred = data.signup?.eventId || events.find(item => item.current)?.id || events[0].id;
    eventSelect.innerHTML = events.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join('');
    eventSelect.value = preferred;
    if (data.signup) {
      selected = characters.find(character => character.name === data.signup.name) || {
        name: data.signup.name,
        realm: data.signup.realm,
        className: data.signup.className,
        level: ''
      };
      if (!characters.some(character => character.name === selected.name && character.realm === selected.realm)) {
        characters = [selected, ...characters];
      }
    } else if (characters[0]) {
      selected = characters[0];
    }
    fillForm(data.signup);
    renderCharacters();
    showSignedUp(data.signup);
    renderGroups(data.groups);
    document.getElementById('rollFlashClose').addEventListener('click', () => {
      document.getElementById('rollFlash').classList.remove('is-on');
    });
    document.getElementById('saveBtn').addEventListener('click', saveSignup);
    document.getElementById('editSignupBtn').addEventListener('click', () => {
      document.getElementById('signupCard').classList.remove('is-collapsed');
      document.getElementById('signupForm').hidden = false;
    });
    document.getElementById('myStatsBtn')?.addEventListener('click', () => {
      if (currentSignup && window.openPlayerStats) {
        window.openPlayerStats(currentSignup, { players: [currentSignup] });
      }
    });
    document.querySelectorAll('#statusRow .status-btn').forEach(button => {
      button.addEventListener('click', async () => {
        document.getElementById('nightStatus').textContent = 'Saving status...';
        try {
          await postMe({ action: 'status', nightStatus: button.dataset.status });
          document.getElementById('nightStatus').textContent = button.dataset.status === 'in-key' ? 'Marked in key.' : 'Marked waiting.';
        } catch (err) {
          document.getElementById('nightStatus').textContent = err.message;
        }
      });
    });
    document.querySelectorAll('#faceRow .face-btn').forEach(button => {
      button.addEventListener('click', () => {
        satisfaction = Number(button.dataset.face);
        document.querySelectorAll('#faceRow .face-btn').forEach(face => face.classList.toggle('is-on', face === button));
      });
    });
    document.getElementById('ownedDungeonSelect')?.addEventListener('change', syncOwnedKeyFromDropdowns);
    document.getElementById('ownedKeyLevelSelect')?.addEventListener('change', syncOwnedKeyFromDropdowns);
    document.getElementById('runDungeonSelect')?.addEventListener('change', syncRunKeyFromDropdowns);
    document.getElementById('runKeyLevelSelect')?.addEventListener('change', syncRunKeyFromDropdowns);

    document.getElementById('keystoneSigil')?.addEventListener('click', () => {
      const sigil = document.getElementById('keystoneSigil');
      if (sigil) {
        sigil.classList.add('is-pulsing');
        setTimeout(() => sigil.classList.remove('is-pulsing'), 600);
      }
    });

    document.getElementById('saveKeyBtn').addEventListener('click', async () => {
      syncOwnedKeyFromDropdowns();
      document.getElementById('nightStatus').textContent = 'Saving your key...';
      try {
        await postMe({ action: 'set-key', ownedKey: document.getElementById('ownedKeyInput').value });
        document.getElementById('nightStatus').textContent = 'Key saved.';
      } catch (err) {
        document.getElementById('nightStatus').textContent = err.message;
      }
    });
    document.getElementById('logRunBtn').addEventListener('click', async () => {
      syncRunKeyFromDropdowns();
      const runKeyVal = document.getElementById('runKeyInput').value.trim();
      const line = document.getElementById('nightStatus');
      if (!runKeyVal) {
        line.textContent = 'Please select the dungeon and level for the key you ran.';
        return;
      }
      line.textContent = 'Saving the key...';
      try {
        await postMe({
          action: 'log-run',
          key: runKeyVal,
          success: document.getElementById('runResult').value === 'yes',
          note: document.getElementById('runNote').value,
          satisfaction
        });
        document.getElementById('runNote').value = '';
        line.textContent = 'Added to your record.';
      } catch (err) {
        line.textContent = err.message;
      }
    });
  }

  boot().catch(() => {
    document.getElementById('loginNote').textContent = 'Could not reach the signup service.';
  });
})();
