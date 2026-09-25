/**
 * Kith and Kin — The Hall of Champions | Participation Leaderboard Orchestrator
 */

(function () {
  'use strict';

  // Audio FX synthesizers via Web Audio API
  let audioCtx = null;
  let audioEnabled = true;

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

  function playTone(freq, duration, type = 'sine', gainVal = 0.12) {
    if (!audioEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function playSuccessSound() {
    if (!audioEnabled) return;
    playTone(523.25, 0.12, 'sine', 0.1); // C5
    setTimeout(() => playTone(659.25, 0.12, 'sine', 0.1), 80); // E5
    setTimeout(() => playTone(783.99, 0.25, 'triangle', 0.12), 160); // G5
  }

  function playCrestPulse() {
    if (!audioEnabled) return;
    playTone(130.81, 0.45, 'triangle', 0.15); // C3
  }

  // Application State
  const state = {
    isDemoMode: true, // Default to rich demo showcase so fake stats are visible immediately
    liveState: null,
    standings: [],
    activeFilter: 'all',
    searchQuery: '',
    sortBy: 'points-desc',
    selectedPlayer: null
  };

  // DOM Elements
  const DOM = {
    keystoneSigil: document.getElementById('keystoneSigil'),
    dataSourceBadge: document.getElementById('dataSourceBadge'),
    dataSourceText: document.getElementById('dataSourceText'),
    soundToggleBtn: document.getElementById('soundToggleBtn'),
    toggleSourceBtn: document.getElementById('toggleSourceBtn'),
    sourceIcon: document.getElementById('sourceIcon'),
    sourceLabel: document.getElementById('sourceLabel'),
    rosterCountLabel: document.getElementById('rosterCountLabel'),
    openDiscordModalBtn: document.getElementById('openDiscordModalBtn'),
    copyDiscordBtn: document.getElementById('copyDiscordBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    rulesToggleHeader: document.getElementById('rulesToggleHeader'),
    rulesChevron: document.getElementById('rulesChevron'),
    rulesGrid: document.getElementById('rulesGrid'),
    podiumGrid: document.getElementById('podiumGrid'),
    searchInput: document.getElementById('searchInput'),
    filterPills: document.getElementById('filterPills'),
    sortSelect: document.getElementById('sortSelect'),
    standingsBody: document.getElementById('standingsBody'),
    discordModal: document.getElementById('discordModal'),
    closeDiscordModalBtn: document.getElementById('closeDiscordModalBtn'),
    discordModalDoneBtn: document.getElementById('discordModalDoneBtn'),
    discordModalCopyBtn: document.getElementById('discordModalCopyBtn'),
    discordPodiumVal: document.getElementById('discordPodiumVal'),
    discordCodeblockVal: document.getElementById('discordCodeblockVal'),
    discordTimestamp: document.getElementById('discordTimestamp'),
    discordMockRulesBtn: document.getElementById('discordMockRulesBtn'),
    discordMockRefreshBtn: document.getElementById('discordMockRefreshBtn'),
    auditModal: document.getElementById('auditModal'),
    auditTitle: document.getElementById('auditTitle'),
    auditSubtitle: document.getElementById('auditSubtitle'),
    auditBody: document.getElementById('auditBody'),
    closeAuditModalBtn: document.getElementById('closeAuditModalBtn'),
    auditDoneBtn: document.getElementById('auditDoneBtn'),
    toastNotice: document.getElementById('toastNotice'),
    toastMessage: document.getElementById('toastMessage')
  };

  function showToast(message) {
    if (!DOM.toastNotice) return;
    DOM.toastMessage.textContent = message;
    DOM.toastNotice.hidden = false;
    clearTimeout(DOM.toastNotice._timeout);
    DOM.toastNotice._timeout = setTimeout(() => {
      DOM.toastNotice.hidden = true;
    }, 2800);
  }

  // Fetch live state from backend
  async function fetchLiveState() {
    try {
      const res = await fetch('/api/live-state');
      if (res.ok) {
        state.liveState = await res.json();
      } else {
        const fallback = await fetch('/api/state');
        if (fallback.ok) state.liveState = await fallback.json();
      }
    } catch (err) {
      console.warn('[Leaderboard] Live state fetch failed, staying on demo fallback:', err);
    }
  }

  // Calculate and refresh standings
  function updateStandings() {
    const engine = window.LeaderboardEngine;
    if (!engine) return;

    if (state.isDemoMode) {
      state.standings = engine.computeLeaderboardStandings(engine.DEMO_PLAYERS);
      if (DOM.dataSourceText) DOM.dataSourceText.textContent = 'Demo Showcase';
      if (DOM.sourceLabel) DOM.sourceLabel.textContent = 'Showing: Demo Showcase (Fake Stats)';
      if (DOM.sourceIcon) DOM.sourceIcon.textContent = '🎭';
      if (DOM.toggleSourceBtn) DOM.toggleSourceBtn.classList.add('is-demo');
    } else {
      const players = (state.liveState && state.liveState.players) ? state.liveState.players : [];
      state.standings = engine.computeLeaderboardStandings(players, state.liveState);
      if (DOM.dataSourceText) DOM.dataSourceText.textContent = 'Live Guild Data';
      if (DOM.sourceLabel) DOM.sourceLabel.textContent = 'Showing: Live Guild Data';
      if (DOM.sourceIcon) DOM.sourceIcon.textContent = '⚡';
      if (DOM.toggleSourceBtn) DOM.toggleSourceBtn.classList.remove('is-demo');
    }

    if (DOM.rosterCountLabel) {
      DOM.rosterCountLabel.textContent = `${state.standings.length} Members Ranked`;
    }

    renderPodium();
    renderStandings();
    updateDiscordPreview();
  }

  // Render Top 3 Podium
  function renderPodium() {
    if (!DOM.podiumGrid) return;
    DOM.podiumGrid.innerHTML = '';

    const engine = window.LeaderboardEngine;
    const top3 = state.standings.slice(0, 3);
    if (!top3.length) {
      DOM.podiumGrid.innerHTML = '<p style="color:var(--text-muted); text-align:center;">No champions ranked yet.</p>';
      return;
    }

    // Olympic arrangement: #2 (left), #1 (center), #3 (right)
    const p1 = top3[0];
    const p2 = top3[1];
    const p3 = top3[2];

    const podiumOrder = [
      { player: p2, rank: 2, medal: '🥈', slotClass: 'podium-2', borderHex: '#e2e8f0' },
      { player: p1, rank: 1, medal: '🥇', slotClass: 'podium-1', borderHex: '#f5d061' },
      { player: p3, rank: 3, medal: '🥉', slotClass: 'podium-3', borderHex: '#fbbf24' }
    ];

    podiumOrder.forEach(item => {
      const p = item.player;
      if (!p) return;

      const card = document.createElement('div');
      card.className = `podium-card ${item.slotClass}`;

      const classColor = engine.CLASS_COLORS[p.className] || '#fff';
      const classIcon = engine.CLASS_ICONS[p.className] || '⚔️';

      card.innerHTML = `
        <div class="podium-medal">${item.medal}</div>
        <strong class="podium-name" style="color: ${classColor};">${escapeHtml(p.name)}</strong>
        <div class="podium-class">${classIcon} ${p.className} • ${escapeHtml(p.realm)}</div>
        <span class="podium-title-tag">${p.titleBadge} ${p.title}</span>
        <div class="podium-points">${p.totalPoints}</div>
        <div class="podium-pts-label">Participation Points</div>
        <div class="podium-chips">
          <span class="podium-chip">📅 ${p.nightsAttended} Nights</span>
          <span class="podium-chip">🗝️ ${p.runsCount} Keys</span>
          <span class="podium-chip">🎭 ${(p.roles || []).join('/')}</span>
          ${p.isLeader ? '<span class="podium-chip">👑 Leader</span>' : ''}
          ${p.isStonk ? '<span class="podium-chip">🏋️ Stonk</span>' : ''}
          ${p.carryShepherdCount > 0 ? `<span class="podium-chip">🎒 ${p.carryShepherdCount} Carries</span>` : ''}
        </div>
      `;

      card.addEventListener('click', () => openAuditModal(p));
      DOM.podiumGrid.appendChild(card);
    });
  }

  // Filter & Sort Standings
  function getFilteredStandings() {
    let list = [...state.standings];

    // Filter by search query
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.trim().toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.realm.toLowerCase().includes(q) ||
        p.className.toLowerCase().includes(q)
      );
    }

    // Filter by chip category
    switch (state.activeFilter) {
      case 'tank':
        list = list.filter(p => (p.roles || []).includes('Tank'));
        break;
      case 'healer':
        list = list.filter(p => (p.roles || []).includes('Healer'));
        break;
      case 'dps':
        list = list.filter(p => (p.roles || []).includes('DPS'));
        break;
      case 'flex':
        list = list.filter(p => (p.roles || []).length >= 2);
        break;
      case 'leader':
        list = list.filter(p => p.isLeader);
        break;
      case 'stonk':
        list = list.filter(p => p.isStonk);
        break;
      case 'shepherd':
        list = list.filter(p => p.carryShepherdCount > 0);
        break;
      default:
        break;
    }

    // Sort
    switch (state.sortBy) {
      case 'points-desc':
        list.sort((a, b) => b.totalPoints - a.totalPoints);
        break;
      case 'keys-desc':
        list.sort((a, b) => b.runsCount - a.runsCount);
        break;
      case 'carries-desc':
        list.sort((a, b) => b.carryShepherdCount - a.carryShepherdCount);
        break;
      case 'nights-desc':
        list.sort((a, b) => b.nightsAttended - a.nightsAttended);
        break;
      case 'name-asc':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    return list;
  }

  // Render Full Standings Table
  function renderStandings() {
    if (!DOM.standingsBody) return;
    DOM.standingsBody.innerHTML = '';

    const engine = window.LeaderboardEngine;
    const list = getFilteredStandings();

    if (!list.length) {
      DOM.standingsBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding: 2.5rem; color:var(--text-muted);">
            No champions match the current filters.
          </td>
        </tr>
      `;
      return;
    }

    list.forEach(p => {
      const tr = document.createElement('tr');
      tr.className = 'lb-row';

      const classColor = engine.CLASS_COLORS[p.className] || '#fff';
      const classIcon = engine.CLASS_ICONS[p.className] || '⚔️';

      let rankClass = '';
      let rankDisplay = `#${p.rank}`;
      if (p.rank === 1) { rankClass = 'rank-1'; rankDisplay = '🥇 #1'; }
      else if (p.rank === 2) { rankClass = 'rank-2'; rankDisplay = '🥈 #2'; }
      else if (p.rank === 3) { rankClass = 'rank-3'; rankDisplay = '🥉 #3'; }

      // Roles tags
      const roleTagsHtml = (p.roles || []).map(r => {
        let bg = 'var(--role-dps-bg)';
        let color = 'var(--role-dps)';
        if (r === 'Tank') { bg = 'var(--role-tank-bg)'; color = 'var(--role-tank)'; }
        if (r === 'Healer') { bg = 'var(--role-healer-bg)'; color = 'var(--role-healer)'; }
        return `<span class="lb-role-tag" style="background:${bg}; color:${color};">${r}</span>`;
      }).join(' ');

      // Badges
      const badgesHtml = (p.badges || []).map(b =>
        `<span class="lb-badge-icon" title="${b.name}: ${b.desc}">${b.icon}</span>`
      ).join(' ') || '<span style="color:rgba(255,255,255,0.2);">—</span>';

      // Breakdown chips
      const breakdownHtml = `
        <div class="lb-breakdown-bar">
          <span class="breakdown-chip" title="Attendance points (+15 / night)">📅 +${p.attendancePoints}</span>
          <span class="breakdown-chip" title="Keystones conquered points (+10 base, +5 timed, +2 / lvl > 10)">🗝️ +${p.keysPoints}</span>
          ${p.roleFlexPoints > 0 ? `<span class="breakdown-chip" title="Role versatility points">🎭 +${p.roleFlexPoints}</span>` : ''}
          ${p.leaderPoints > 0 ? `<span class="breakdown-chip" title="Born Leader bonus points">👑 +${p.leaderPoints}</span>` : ''}
          ${p.stonkPoints > 0 ? `<span class="breakdown-chip" title="Stronk Back bonus points">🏋️ +${p.stonkPoints}</span>` : ''}
          ${p.carryShepherdPoints > 0 ? `<span class="breakdown-chip" style="color:#86efac; border-color:rgba(134,239,172,0.3);" title="Carry Shepherd bonus points (+15 / carry run)">🎒 +${p.carryShepherdPoints}</span>` : ''}
        </div>
      `;

      tr.innerHTML = `
        <td class="lb-rank ${rankClass}">${rankDisplay}</td>
        <td>
          <div class="lb-player-cell">
            <div class="lb-avatar" style="border-color: ${classColor}; color: ${classColor};">${classIcon}</div>
            <div class="lb-player-info">
              <strong style="color: ${classColor};" title="Click to view full points audit">${escapeHtml(p.name)}</strong>
              <small>${escapeHtml(p.realm)} • <span style="color:var(--text-gold);">${p.title}</span></small>
            </div>
          </div>
        </td>
        <td>
          <div class="lb-roles">${roleTagsHtml}</div>
        </td>
        <td>
          <div class="lb-badges">${badgesHtml}</div>
        </td>
        <td>${breakdownHtml}</td>
        <td style="text-align: right;">
          <span class="lb-points-val">${p.totalPoints}</span>
        </td>
        <td style="text-align: center;">
          <button type="button" class="btn btn-sm btn-ghost audit-btn" style="padding: 0.25rem 0.55rem; font-size: 0.75rem;">Audit</button>
        </td>
      `;

      tr.querySelector('.lb-player-info strong').addEventListener('click', () => openAuditModal(p));
      tr.querySelector('.audit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openAuditModal(p);
      });

      DOM.standingsBody.appendChild(tr);
    });
  }

  // Update Discord Modal Preview content
  function updateDiscordPreview() {
    const engine = window.LeaderboardEngine;
    if (!engine || !state.standings.length) return;

    const top3 = state.standings.slice(0, 3);
    const p1 = top3[0];
    const p2 = top3[1];
    const p3 = top3[2];

    let podiumText = '';
    if (p1) {
      podiumText += `🥇 <strong>#1 ${escapeHtml(p1.name)}</strong> (${p1.className}) — <strong>${p1.totalPoints} pts</strong> • <em>${p1.title}</em><br>` +
                    `&nbsp;&nbsp;&nbsp;└ 📅 ${p1.nightsAttended} Nights | 🗝️ ${p1.runsCount} Keys (${p1.timedCount} Timed) | 🎭 ${(p1.roles || []).join('/')}${p1.isLeader ? ' | 👑 Leader' : ''}${p1.isStonk ? ' | 🏋️ Stonk' : ''}${p1.carryShepherdCount ? ` | 🎒 ${p1.carryShepherdCount} Carries` : ''}<br><br>`;
    }
    if (p2) {
      podiumText += `🥈 <strong>#2 ${escapeHtml(p2.name)}</strong> (${p2.className}) — <strong>${p2.totalPoints} pts</strong> • <em>${p2.title}</em><br>` +
                    `&nbsp;&nbsp;&nbsp;└ 📅 ${p2.nightsAttended} Nights | 🗝️ ${p2.runsCount} Keys (${p2.timedCount} Timed) | 🎭 ${(p2.roles || []).join('/')}${p2.isLeader ? ' | 👑 Leader' : ''}${p2.isStonk ? ' | 🏋️ Stonk' : ''}${p2.carryShepherdCount ? ` | 🎒 ${p2.carryShepherdCount} Carries` : ''}<br><br>`;
    }
    if (p3) {
      podiumText += `🥉 <strong>#3 ${escapeHtml(p3.name)}</strong> (${p3.className}) — <strong>${p3.totalPoints} pts</strong> • <em>${p3.title}</em><br>` +
                    `&nbsp;&nbsp;&nbsp;└ 📅 ${p3.nightsAttended} Nights | 🗝️ ${p3.runsCount} Keys (${p3.timedCount} Timed) | 🎭 ${(p3.roles || []).join('/')}${p3.isLeader ? ' | 👑 Leader' : ''}${p3.isStonk ? ' | 🏋️ Stonk' : ''}${p3.carryShepherdCount ? ` | 🎒 ${p3.carryShepherdCount} Carries` : ''}`;
    }
    if (DOM.discordPodiumVal) DOM.discordPodiumVal.innerHTML = podiumText;

    // Codeblock 4-10
    const rest = state.standings.slice(3, 10);
    let codeText = 'RK  NAME            PTS   NIGHTS  KEYS  ROLES         VIBES\n-------------------------------------------------------------\n';
    rest.forEach(item => {
      const rk = `#${item.rank}`.padEnd(4, ' ');
      const name = (item.name || '').slice(0, 14).padEnd(15, ' ');
      const pts = `${item.totalPoints}`.padStart(4, ' ') + ' ';
      const nights = `${item.nightsAttended}n`.padStart(5, ' ') + '  ';
      const keys = `${item.runsCount}k`.padStart(4, ' ') + '  ';
      const roles = (item.roles || []).join('/').slice(0, 12).padEnd(13, ' ');
      let vibes = '';
      if (item.isLeader) vibes += '👑';
      if (item.isStonk) vibes += '🏋️';
      if (item.carryShepherdCount > 0) vibes += `🎒${item.carryShepherdCount}`;
      if (item.isNeedCarry) vibes += '🌱';
      codeText += `${rk}${name}${pts}${nights}${keys}${roles}${vibes}\n`;
    });
    if (DOM.discordCodeblockVal) DOM.discordCodeblockVal.textContent = codeText;
  }

  // Open Audit Modal for a specific member
  function openAuditModal(player) {
    if (!player || !DOM.auditModal) return;
    state.selectedPlayer = player;
    playTone(440, 0.08, 'sine', 0.08);

    const engine = window.LeaderboardEngine;
    const classColor = engine.CLASS_COLORS[player.className] || '#fff';
    const classIcon = engine.CLASS_ICONS[player.className] || '⚔️';

    DOM.auditTitle.innerHTML = `<span style="color:${classColor};">${classIcon} ${escapeHtml(player.name)}</span> — Points Audit`;
    DOM.auditSubtitle.textContent = `${player.realm} • ${player.titleBadge} ${player.title} (${player.totalPoints} Total Participation Points)`;

    const runLog = Array.isArray(player.runLog) ? player.runLog : [];
    let runsListHtml = '';
    if (runLog.length > 0) {
      runsListHtml = `
        <h4 style="font-family:var(--font-fantasy); color:var(--text-gold); margin: 1.25rem 0 0.5rem; font-size:1rem;">Recorded Dungeon Keystones (${runLog.length})</h4>
        <div style="max-height: 180px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 0.5rem;">
          ${runLog.map((r, i) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding: 0.35rem 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); font-size:0.8rem;">
              <div>
                <strong>${escapeHtml(r.key)}</strong>
                ${r.isCarryRun ? '<span class="status-pill" style="color:#86efac; border-color:rgba(134,239,172,0.4); margin-left:0.35rem;">🎒 Carried Guildie</span>' : ''}
                ${r.note ? `<small style="display:block; color:var(--text-muted);">${escapeHtml(r.note)}</small>` : ''}
              </div>
              <div>
                <span class="status-pill ${r.success ? 'in-key' : 'waiting'}">${r.success ? 'Timed ✅' : 'Depleted ❌'}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    DOM.auditBody.innerHTML = `
      <div style="background: rgba(0,0,0,0.35); border: 1px solid rgba(245,208,97,0.25); border-radius: 10px; padding: 1rem; margin-bottom: 1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.75rem;">
          <span style="font-size: 0.9rem; color: var(--text-muted);">Season Participation Score:</span>
          <span style="font-family:var(--font-fantasy); font-size:1.8rem; font-weight:800; color:var(--text-gold);">${player.totalPoints} pts</span>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; font-size: 0.85rem;">
          <div style="padding: 0.5rem; background: rgba(255,255,255,0.04); border-radius:6px;">
            <strong>📅 Attendance:</strong> ${player.nightsAttended} nights × 15 = <span style="color:var(--text-gold);">+${player.attendancePoints} pts</span>
          </div>
          <div style="padding: 0.5rem; background: rgba(255,255,255,0.04); border-radius:6px;">
            <strong>🗝️ Keystones:</strong> ${player.runsCount} runs (${player.timedCount} timed) = <span style="color:var(--text-gold);">+${player.keysPoints} pts</span>
          </div>
          <div style="padding: 0.5rem; background: rgba(255,255,255,0.04); border-radius:6px;">
            <strong>🎭 Role Flex:</strong> ${player.flexType} (${(player.roles || []).join('/')}) = <span style="color:var(--text-gold);">+${player.roleFlexPoints} pts</span>
          </div>
          <div style="padding: 0.5rem; background: rgba(255,255,255,0.04); border-radius:6px;">
            <strong>👑 Born Leader:</strong> ${player.isLeader ? `${player.nightsAttended}n × 8 = <span style="color:var(--text-gold);">+${player.leaderPoints} pts</span>` : '<span style="color:var(--text-muted);">None (0 pts)</span>'}
          </div>
          <div style="padding: 0.5rem; background: rgba(255,255,255,0.04); border-radius:6px;">
            <strong>🏋️ Stronk Back:</strong> ${player.isStonk ? `${player.nightsAttended}n × 8 = <span style="color:var(--text-gold);">+${player.stonkPoints} pts</span>` : '<span style="color:var(--text-muted);">None (0 pts)</span>'}
          </div>
          <div style="padding: 0.5rem; background: rgba(255,255,255,0.04); border-radius:6px;">
            <strong>🎒 Carry Shepherd:</strong> ${player.carryShepherdCount} runs × 15 = <span style="color:#86efac; font-weight:700;">+${player.carryShepherdPoints} pts</span>
          </div>
        </div>
      </div>
      ${runsListHtml}
    `;

    DOM.auditModal.classList.add('is-open');
    DOM.auditModal.hidden = false;
  }

  function closeAuditModal() {
    if (!DOM.auditModal) return;
    DOM.auditModal.classList.remove('is-open');
    DOM.auditModal.hidden = true;
  }

  function openDiscordModal() {
    if (!DOM.discordModal) return;
    updateDiscordPreview();
    DOM.discordModal.classList.add('is-open');
    DOM.discordModal.hidden = false;
    playTone(523.25, 0.1, 'sine', 0.1);
  }

  function closeDiscordModal() {
    if (!DOM.discordModal) return;
    DOM.discordModal.classList.remove('is-open');
    DOM.discordModal.hidden = true;
  }

  function copyDiscordMarkdown() {
    const engine = window.LeaderboardEngine;
    if (!engine) return;
    const md = engine.generateDiscordMarkdown(state.standings);
    navigator.clipboard.writeText(md).then(() => {
      showToast('📋 Discord leaderboard copied to clipboard!');
      playSuccessSound();
    }).catch(err => {
      console.error('Copy failed:', err);
      showToast('⚠️ Could not copy to clipboard.');
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Bind Event Listeners
  function bindEvents() {
    if (DOM.keystoneSigil) {
      DOM.keystoneSigil.addEventListener('click', () => {
        playCrestPulse();
      });
    }

    if (DOM.soundToggleBtn) {
      DOM.soundToggleBtn.addEventListener('click', () => {
        audioEnabled = !audioEnabled;
        DOM.soundToggleBtn.querySelector('.btn-text').textContent = audioEnabled ? 'Audio: ON' : 'Audio: OFF';
        if (audioEnabled) playTone(440, 0.1);
      });
    }

    // Toggle Source (Demo vs Live)
    if (DOM.toggleSourceBtn) {
      DOM.toggleSourceBtn.addEventListener('click', () => {
        state.isDemoMode = !state.isDemoMode;
        playTone(330, 0.1);
        updateStandings();
        showToast(state.isDemoMode ? '🎭 Switched to Demo Showcase (Fake Stats)' : '⚡ Switched to Live Guild Data');
      });
    }

    // Rules Collapse / Expand
    if (DOM.rulesToggleHeader && DOM.rulesGrid) {
      DOM.rulesToggleHeader.addEventListener('click', () => {
        const isCollapsed = DOM.rulesGrid.style.display === 'none';
        DOM.rulesGrid.style.display = isCollapsed ? 'grid' : 'none';
        DOM.rulesChevron.textContent = isCollapsed ? '▼' : '▶';
        playTone(392, 0.08);
      });
    }

    // Search Input
    if (DOM.searchInput) {
      DOM.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderStandings();
      });
    }

    // Filter Pills
    if (DOM.filterPills) {
      DOM.filterPills.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-pill');
        if (!btn) return;
        DOM.filterPills.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        state.activeFilter = btn.dataset.filter || 'all';
        playTone(493.88, 0.06);
        renderStandings();
      });
    }

    // Sort Dropdown
    if (DOM.sortSelect) {
      DOM.sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        playTone(440, 0.06);
        renderStandings();
      });
    }

    // Buttons
    if (DOM.openDiscordModalBtn) DOM.openDiscordModalBtn.addEventListener('click', openDiscordModal);
    if (DOM.closeDiscordModalBtn) DOM.closeDiscordModalBtn.addEventListener('click', closeDiscordModal);
    if (DOM.discordModalDoneBtn) DOM.discordModalDoneBtn.addEventListener('click', closeDiscordModal);
    if (DOM.discordModalCopyBtn) DOM.discordModalCopyBtn.addEventListener('click', copyDiscordMarkdown);
    if (DOM.copyDiscordBtn) DOM.copyDiscordBtn.addEventListener('click', copyDiscordMarkdown);

    if (DOM.discordMockRulesBtn) {
      DOM.discordMockRulesBtn.addEventListener('click', () => {
        alert(
          '📜 Kith & Kin Scoring Code:\n\n' +
          '• Attendance: +15 pts / night\n' +
          '• Keys Completed: +10 pts (+5 timed, +2 / level > +10)\n' +
          '• Role Versatility: +5 pts (Dual Flex) / +10 pts (Triple Flex)\n' +
          '• Born Leader (👑): +8 pts / night willing to lead\n' +
          '• Stonk Back (🏋️): +8 pts / night willing to carry\n' +
          '• Carry Shepherd (🎒): +15 pts per key run with members in need'
        );
      });
    }

    if (DOM.discordMockRefreshBtn) {
      DOM.discordMockRefreshBtn.addEventListener('click', () => {
        updateStandings();
        playSuccessSound();
        showToast('🔄 Leaderboard refreshed live!');
      });
    }

    if (DOM.refreshBtn) {
      DOM.refreshBtn.addEventListener('click', async () => {
        await fetchLiveState();
        updateStandings();
        playSuccessSound();
        showToast('Standings refreshed!');
      });
    }

    if (DOM.closeAuditModalBtn) DOM.closeAuditModalBtn.addEventListener('click', closeAuditModal);
    if (DOM.auditDoneBtn) DOM.auditDoneBtn.addEventListener('click', closeAuditModal);

    // Escape key modal closer
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDiscordModal();
        closeAuditModal();
      }
    });
  }

  // Initialize
  async function init() {
    bindEvents();
    await fetchLiveState();
    updateStandings();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
