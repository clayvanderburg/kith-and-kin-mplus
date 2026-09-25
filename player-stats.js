/**
 * Kith & Kin - Player Season Stats, History & Raider.IO Dossier
 */

(function () {
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

  const FACES = ['', '😠', '🙁', '😐', '🙂', '😄'];

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getIoColor(score) {
    if (!score || score < 500) return '#9d9d9d';
    if (score < 1000) return '#1eff00';
    if (score < 1500) return '#0070dd';
    if (score < 2000) return '#a335ee';
    if (score < 2500) return '#ff8000';
    if (score < 3000) return '#e6cc80';
    return '#00f0ff';
  }

  function formatDuration(ms) {
    if (!ms) return '—';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Calculate stats across state
  function computePlayerStats(player, state) {
    const pName = (player.name || '').trim().toLowerCase();
    
    // Attendance
    let nightsCount = player.attending ? 1 : 0;
    if (state && state.events && typeof state.events === 'object') {
      Object.values(state.events).forEach(evt => {
        if (!evt || !Array.isArray(evt.players)) return;
        const matched = evt.players.find(p => (p.name || '').trim().toLowerCase() === pName);
        if (matched && matched.attending) {
          nightsCount++;
        }
      });
    }

    // Run Log
    const runLog = Array.isArray(player.runLog) ? player.runLog : [];
    const totalRuns = runLog.length;
    const timedRuns = runLog.filter(r => r.success).length;
    const depletedRuns = totalRuns - timedRuns;
    const timedRate = totalRuns > 0 ? Math.round((timedRuns / totalRuns) * 100) : null;

    // Teammate Synergy (Count how many unique guild members they've grouped with)
    const teammateCounts = {};
    const groupsToScan = [];
    if (state && Array.isArray(state.formedGroups)) {
      groupsToScan.push(...state.formedGroups);
    }
    if (state && state.events) {
      Object.values(state.events).forEach(evt => {
        if (evt && Array.isArray(evt.formedGroups)) {
          groupsToScan.push(...evt.formedGroups);
        }
      });
    }

    groupsToScan.forEach(grp => {
      if (!grp) return;
      const members = [grp.tank, grp.healer, ...(grp.dps || [])].filter(Boolean);
      const isPresent = members.some(m => (m.name || '').trim().toLowerCase() === pName);
      if (isPresent) {
        members.forEach(m => {
          const mName = (m.name || '').trim();
          if (mName && mName.toLowerCase() !== pName) {
            teammateCounts[mName] = (teammateCounts[mName] || 0) + 1;
          }
        });
      }
    });

    const uniqueTeammates = Object.keys(teammateCounts).length;
    const topBuddies = Object.entries(teammateCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));

    return {
      nightsCount,
      totalRuns,
      timedRuns,
      depletedRuns,
      timedRate,
      uniqueTeammates,
      topBuddies,
      runLog
    };
  }

  // Live Raider.IO fetch
  async function fetchRaiderIoDetails(player) {
    const region = player.region || 'us';
    const realm = (player.realm || 'Perenolde').toLowerCase().replace(/\s+/g, '-');
    const name = encodeURIComponent(player.name);
    const url = `https://raider.io/api/v1/characters/profile?region=${region}&realm=${realm}&name=${name}&fields=gear,mythic_plus_scores_by_season:current,mythic_plus_recent_runs,mythic_plus_best_runs`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Raider.IO profile not found (${res.status})`);
    }
    return res.json();
  }

  // Open modal
  async function openPlayerStats(playerOrName, state) {
    let player = typeof playerOrName === 'string'
      ? (state.players || []).find(p => (p.name || '').toLowerCase() === playerOrName.toLowerCase())
      : playerOrName;

    if (!player) {
      player = { name: playerOrName, realm: 'Perenolde', region: 'us', roles: [] };
    }

    const modal = document.getElementById('playerStatsModal');
    if (!modal) return;

    // Header info
    const nameEl = document.getElementById('statsModalPlayerName');
    const subEl = document.getElementById('statsModalSub');
    const avatarWrap = document.getElementById('statsModalAvatarWrap');
    const classColor = CLASS_COLORS[player.className] || '#f8fafc';

    if (nameEl) {
      nameEl.textContent = player.name;
      nameEl.style.color = classColor;
    }

    if (subEl) {
      const rolesStr = (player.roles || []).join(' / ') || 'Member';
      subEl.textContent = `${player.className || 'Hero'} • ${rolesStr} • ${player.realm || 'Perenolde'}`;
    }

    if (avatarWrap) {
      if (player.avatar) {
        avatarWrap.innerHTML = `<img src="${escapeHtml(player.avatar)}" alt="" class="stats-avatar-img">`;
      } else {
        avatarWrap.innerHTML = `<div class="stats-avatar-ph">${player.roles?.includes('Tank') ? '🛡️' : (player.roles?.includes('Healer') ? '💚' : '⚔️')}</div>`;
      }
    }

    // Compute stats
    const stats = computePlayerStats(player, state);

    // Populate vital stats
    const attendEl = document.getElementById('statsModalAttendance');
    if (attendEl) {
      attendEl.textContent = stats.nightsCount > 0 ? `${stats.nightsCount} Night${stats.nightsCount > 1 ? 's' : ''}` : 'Tonight Only';
    }

    const keysEl = document.getElementById('statsModalKeysLogged');
    if (keysEl) {
      keysEl.textContent = `${stats.totalRuns} Run${stats.totalRuns === 1 ? '' : 's'}`;
    }

    const rateEl = document.getElementById('statsModalSuccessRate');
    if (rateEl) {
      if (stats.timedRate !== null) {
        rateEl.textContent = `${stats.timedRate}%`;
        rateEl.style.color = stats.timedRate >= 80 ? '#4ade80' : (stats.timedRate >= 50 ? '#fde047' : '#ef4444');
      } else {
        rateEl.textContent = '—';
        rateEl.style.color = '#94a3b8';
      }
    }

    const synergyEl = document.getElementById('statsModalSynergy');
    if (synergyEl) {
      synergyEl.textContent = `${stats.uniqueTeammates} Member${stats.uniqueTeammates === 1 ? '' : 's'}`;
    }

    // Buddies list
    const buddiesList = document.getElementById('statsModalBuddiesList');
    if (buddiesList) {
      if (stats.topBuddies.length > 0) {
        buddiesList.innerHTML = stats.topBuddies.map(b => {
          const buddyPlayer = (state.players || []).find(p => (p.name || '').toLowerCase() === b.name.toLowerCase());
          const bColor = buddyPlayer ? (CLASS_COLORS[buddyPlayer.className] || '#fff') : '#fff';
          return `<span class="buddy-pill" title="${b.count} runs together">
            <span style="color:${bColor}; font-weight:700;">${escapeHtml(b.name)}</span>
            <span class="buddy-count">×${b.count}</span>
          </span>`;
        }).join('');
      } else {
        buddiesList.innerHTML = `<span class="stats-no-data">No group history recorded yet tonight.</span>`;
      }
    }

    // External Links
    const extLinks = document.getElementById('statsModalExternalLinks');
    if (extLinks) {
      const region = player.region || 'us';
      const realmSlug = (player.realm || 'Perenolde').toLowerCase().replace(/\s+/g, '-');
      const charName = encodeURIComponent(player.name);
      const rioProfileUrl = `https://raider.io/characters/${region}/${realmSlug}/${charName}`;
      const wclProfileUrl = `https://www.warcraftlogs.com/character/${region}/${realmSlug}/${charName}`;

      extLinks.innerHTML = `
        <a href="${rioProfileUrl}" target="_blank" rel="noopener" class="stats-ext-btn rio">
          <span class="ext-btn-icon">⚡</span> Raider.IO Profile ↗
        </a>
        <a href="${wclProfileUrl}" target="_blank" rel="noopener" class="stats-ext-btn wcl">
          <span class="ext-btn-icon">📊</span> Warcraft Logs ↗
        </a>
      `;
    }

    // Reset tabs
    setActiveTab('season');

    // Populate Guild Night runs tab
    const nightRunsList = document.getElementById('statsNightRunsList');
    if (nightRunsList) {
      if (stats.runLog.length > 0) {
        nightRunsList.innerHTML = stats.runLog.map(entry => {
          const dateStr = entry.at ? new Date(entry.at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
          const face = entry.satisfaction ? (FACES[entry.satisfaction] || '') : '';
          const timedBadge = entry.success
            ? `<span class="run-badge-timed">✓ Timed</span>`
            : `<span class="run-badge-depleted">✗ Depleted</span>`;
          
          const links = [];
          if (entry.rioUrl) links.push(`<a href="${escapeHtml(entry.rioUrl)}" target="_blank" rel="noopener">Raider.IO ↗</a>`);
          if (entry.wclUrl) links.push(`<a href="${escapeHtml(entry.wclUrl)}" target="_blank" rel="noopener">WCL ↗</a>`);

          return `
            <div class="run-card-row">
              <div class="run-main-left">
                <span class="run-level-tag">${escapeHtml(entry.key || 'Dungeon')}</span>
                <span class="run-group-tag">${entry.groupName ? escapeHtml(entry.groupName) : 'Guild Run'}</span>
                ${face ? `<span class="run-face" title="Player rating">${face}</span>` : ''}
              </div>
              <div class="run-meta-right">
                ${timedBadge}
                ${dateStr ? `<span class="run-date">${dateStr}</span>` : ''}
                ${links.length ? `<span class="run-links">${links.join(' · ')}</span>` : ''}
              </div>
            </div>
          `;
        }).join('');
      } else {
        nightRunsList.innerHTML = `<div class="stats-no-data">No keys logged in tonight's session yet.</div>`;
      }
    }

    // Season Raider.IO runs placeholder
    const seasonRunsList = document.getElementById('statsSeasonRunsList');
    if (seasonRunsList) {
      seasonRunsList.innerHTML = `<div class="stats-loading"><span class="stats-spinner">⏳</span> Fetching live Season 2 keys from Raider.IO...</div>`;
    }

    // Show modal
    modal.classList.add('is-open');

    // Fetch Raider.IO async
    try {
      const rioData = await fetchRaiderIoDetails(player);
      
      // Update avatar if missing
      if (rioData.thumbnail_url && avatarWrap && !avatarWrap.querySelector('img')) {
        avatarWrap.innerHTML = `<img src="${escapeHtml(rioData.thumbnail_url)}" alt="" class="stats-avatar-img">`;
      }

      // Update IO badge in sub
      const currentScores = rioData.mythic_plus_scores_by_season?.[0]?.scores;
      if (currentScores && currentScores.all > 0 && subEl) {
        const ioCol = getIoColor(currentScores.all);
        subEl.innerHTML = `${player.className || 'Hero'} • <span style="color:${ioCol}; font-weight:700;">${Math.round(currentScores.all)} IO</span> • ${player.realm || 'Perenolde'}`;
      }

      // Render season best & recent runs
      const recentRuns = rioData.mythic_plus_recent_runs || [];
      const bestRuns = rioData.mythic_plus_best_runs || [];
      
      // Combine and deduplicate runs by URL
      const runMap = new Map();
      bestRuns.forEach(r => runMap.set(r.url, { ...r, isBest: true }));
      recentRuns.forEach(r => {
        if (!runMap.has(r.url)) runMap.set(r.url, { ...r, isBest: false });
      });
      const combinedRuns = Array.from(runMap.values());

      if (combinedRuns.length > 0 && seasonRunsList) {
        seasonRunsList.innerHTML = combinedRuns.map(run => {
          const stars = run.num_keystone_upgrades > 0
            ? `<span class="run-stars" title="+${run.num_keystone_upgrades} Upgrades">${'★'.repeat(run.num_keystone_upgrades)}</span>`
            : `<span class="run-overtime">⏱️ Depleted</span>`;
          const timeFormatted = formatDuration(run.clear_time_ms);
          const dateStr = run.completed_at ? new Date(run.completed_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
          const isBestBadge = run.isBest ? `<span class="run-best-badge" title="Season Best Run for this dungeon">Top</span>` : '';

          return `
            <div class="run-card-row">
              <div class="run-main-left">
                <span class="run-level-tag">+${run.mythic_level}</span>
                ${stars}
                <span class="run-dungeon-name">${escapeHtml(run.dungeon)}</span>
                ${isBestBadge}
              </div>
              <div class="run-meta-right">
                <span class="run-time">${timeFormatted}</span>
                <span class="run-score">+${Math.round(run.score || 0)} pts</span>
                <span class="run-date">${dateStr}</span>
                <a href="${escapeHtml(run.url)}" target="_blank" rel="noopener" class="stats-run-link" title="Open full breakdown on Raider.IO">
                  Raider.IO ↗
                </a>
              </div>
            </div>
          `;
        }).join('');
      } else if (seasonRunsList) {
        seasonRunsList.innerHTML = `<div class="stats-no-data">No Season Mythic+ runs found on Raider.IO for this character.</div>`;
      }
    } catch (err) {
      console.warn('Could not load Raider.IO details:', err.message);
      if (seasonRunsList) {
        seasonRunsList.innerHTML = `
          <div class="stats-no-data">
            Could not fetch live Raider.IO runs (${escapeHtml(err.message)}).
            <br><small>Make sure the character name and realm are spelled correctly.</small>
          </div>
        `;
      }
    }
  }

  function setActiveTab(tabName) {
    document.querySelectorAll('.stats-tab-btn').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.tab === tabName);
    });
    const seasonContent = document.getElementById('statsTabContentSeason');
    const nightContent = document.getElementById('statsTabContentNight');
    if (seasonContent) seasonContent.style.display = tabName === 'season' ? 'block' : 'none';
    if (nightContent) nightContent.style.display = tabName === 'night' ? 'block' : 'none';
  }

  function closePlayerStats() {
    const modal = document.getElementById('playerStatsModal');
    if (modal) modal.classList.remove('is-open');
  }

  // Init listeners
  function initPlayerStats() {
    const modal = document.getElementById('playerStatsModal');
    if (!modal) return;

    const closeBtn1 = document.getElementById('closeStatsModalBtn');
    const closeBtn2 = document.getElementById('closeStatsModalBtn2');

    if (closeBtn1) closeBtn1.addEventListener('click', closePlayerStats);
    if (closeBtn2) closeBtn2.addEventListener('click', closePlayerStats);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closePlayerStats();
    });

    document.querySelectorAll('.stats-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setActiveTab(btn.dataset.tab);
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) {
        closePlayerStats();
      }
    });
  }

  // Export to window
  window.openPlayerStats = openPlayerStats;
  window.closePlayerStats = closePlayerStats;
  window.initPlayerStats = initPlayerStats;

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlayerStats);
  } else {
    initPlayerStats();
  }
})();
