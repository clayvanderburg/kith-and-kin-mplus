/**
 * Kith & Kin - Smart Raider.IO & Warcraft Logs Run Matcher
 * Automatically detects recently completed keys for active guild parties and logs them.
 */

(function () {
  function formatDuration(ms) {
    if (!ms) return '—';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function slugifyRealm(realm) {
    return String(realm || 'perenolde').toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
  }

  // Fetch recent runs for a single character from Raider.IO
  async function fetchRecentRuns(name, realm = 'Perenolde', region = 'us') {
    try {
      const cleanRealm = slugifyRealm(realm);
      const cleanName = encodeURIComponent(name.trim());
      const url = `https://raider.io/api/v1/characters/profile?region=${region}&realm=${cleanRealm}&name=${cleanName}&fields=mythic_plus_recent_runs`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.mythic_plus_recent_runs) ? data.mythic_plus_recent_runs : [];
    } catch (err) {
      console.warn(`[run-matcher] Could not fetch recent runs for ${name}:`, err.message);
      return [];
    }
  }

  // Query Raider.IO run details to get the full 5-player roster if keystone_run_id is known
  async function fetchRunRoster(season, runId) {
    try {
      const s = season || 'season-mn-2';
      const url = `https://raider.io/api/v1/mythic-plus/run-details?season=${s}&id=${runId}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data.roster) ? data.roster.map(r => r.character?.name).filter(Boolean) : null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Scan party members for matching completed runs.
   * Returns a match candidate with confidence score and matched roster.
   */
  async function findRecentRunsForParty(group, state) {
    const members = [group.tank, group.healer, ...(group.dps || [])].filter(Boolean);
    if (members.length === 0) return null;

    const memberNames = members.map(m => m.name.toLowerCase());
    const rolledDungeon = (group.keystone || group.dungeon || '').toLowerCase();

    // Check recent runs for the first 3 members
    const checkTargets = members.slice(0, 3);
    const runCandidates = new Map();

    for (const member of checkTargets) {
      const runs = await fetchRecentRuns(member.name, member.realm || 'Perenolde', member.region || 'us');
      runs.forEach(run => {
        // Runs within the last 6 hours
        const ageHours = (Date.now() - Date.parse(run.completed_at || '')) / (1000 * 60 * 60);
        if (ageHours > 8) return;

        const id = run.keystone_run_id || run.url;
        if (!runCandidates.has(id)) {
          runCandidates.set(id, {
            run,
            matches: new Set([member.name.toLowerCase()]),
            ageHours
          });
        } else {
          runCandidates.get(id).matches.add(member.name.toLowerCase());
        }
      });
    }

    if (runCandidates.size === 0) return null;

    // Rank candidates: highest number of matching members, then matching dungeon
    let best = null;
    let highestScore = -1;

    for (const candidate of runCandidates.values()) {
      let score = candidate.matches.size * 10;
      const dName = (candidate.run.dungeon || '').toLowerCase();

      // Bonus if dungeon matches party's rolled keystone
      if (rolledDungeon && (rolledDungeon.includes(dName) || dName.includes(rolledDungeon))) {
        score += 15;
      }

      // Bonus if key level matches
      if (rolledDungeon) {
        const levelMatch = rolledDungeon.match(/\+(\d+)/);
        if (levelMatch && parseInt(levelMatch[1], 10) === candidate.run.mythic_level) {
          score += 10;
        }
      }

      // Recency bonus
      if (candidate.ageHours < 2) score += 5;

      if (score > highestScore) {
        highestScore = score;
        best = candidate;
      }
    }

    if (!best || highestScore < 10) return null;

    // If we have a keystone_run_id, fetch full roster to check all 5 players
    let fullRoster = Array.from(best.matches);
    if (best.run.keystone_run_id) {
      const detailsRoster = await fetchRunRoster(best.run.season, best.run.keystone_run_id);
      if (detailsRoster) {
        fullRoster = detailsRoster;
      }
    }

    return {
      run: best.run,
      matchedCount: fullRoster.filter(name => memberNames.includes(name.toLowerCase())).length,
      fullRoster,
      partyMembers: members
    };
  }

  /**
   * Record matched run to player run logs
   */
  function applyRunToParty(group, matchResult, state) {
    const { run, partyMembers } = matchResult;
    const nowIso = run.completed_at || new Date().toISOString();
    const runKey = `${run.dungeon} +${run.mythic_level}`;
    const timed = run.num_keystone_upgrades > 0;
    const upgrades = run.num_keystone_upgrades || 0;

    let updatedCount = 0;

    partyMembers.forEach(member => {
      // Find full player in state
      const player = (state.players || []).find(p => (p.name || '').toLowerCase() === member.name.toLowerCase());
      if (!player) return;

      const region = player.region || 'us';
      const realmSlug = slugifyRealm(player.realm || 'Perenolde');
      const charName = encodeURIComponent(player.name);

      const entry = {
        id: `run-${run.keystone_run_id || Date.now()}-${Math.floor(Math.random() * 1000)}`,
        at: nowIso,
        key: runKey,
        success: timed,
        upgrades,
        clearTimeMs: run.clear_time_ms,
        clearTimeStr: formatDuration(run.clear_time_ms),
        groupName: group.name || 'Party Run',
        rioUrl: run.url,
        wclUrl: `https://www.warcraftlogs.com/character/${region}/${realmSlug}/${charName}`,
        linkSource: 'raider-io-auto',
        members: partyMembers.map(m => m.name),
        satisfaction: timed ? 5 : 3
      };

      const existingLog = Array.isArray(player.runLog) ? player.runLog : [];
      // Prevent duplicate logging of the same keystone run
      const isDupe = existingLog.some(r => r.rioUrl && r.rioUrl === run.url);
      if (!isDupe) {
        player.runLog = [entry, ...existingLog].slice(0, 100);
        player.touchedAt = new Date().toISOString();
        // Reset night status to waiting after finishing run
        player.nightStatus = 'waiting';
        updatedCount++;
      }
    });

    return updatedCount;
  }

  /**
   * UI Dialog: Confirmation modal for matched run
   */
  function showMatchModal(group, matchResult, onConfirm) {
    const modal = document.getElementById('runMatchModal');
    if (!modal) {
      if (confirm(`Found completed run for ${group.name}:\n\n${matchResult.run.dungeon} +${matchResult.run.mythic_level} (${matchResult.run.num_keystone_upgrades > 0 ? 'Timed' : 'Depleted'} - ${formatDuration(matchResult.run.clear_time_ms)})\n\nLog this run for all 5 party members?`)) {
        onConfirm();
      }
      return;
    }

    const { run, matchedCount, partyMembers } = matchResult;
    const timed = run.num_keystone_upgrades > 0;
    const timeFormatted = formatDuration(run.clear_time_ms);
    const dateStr = run.completed_at ? new Date(run.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently';

    const titleEl = document.getElementById('runMatchTitle');
    const bodyEl = document.getElementById('runMatchBody');

    if (titleEl) {
      titleEl.innerHTML = `⚡ Raider.IO Run Found · ${escapeHtml(group.name)}`;
    }

    if (bodyEl) {
      bodyEl.innerHTML = `
        <div class="match-preview-card">
          <div class="match-preview-header">
            <span class="match-preview-key">${escapeHtml(run.dungeon)} +${run.mythic_level}</span>
            <span class="run-badge-${timed ? 'timed' : 'depleted'}">${timed ? `✓ Timed (${'★'.repeat(run.num_keystone_upgrades)})` : '✗ Depleted'}</span>
          </div>
          <div class="match-preview-details">
            <div>⏱️ Clear Time: <strong>${timeFormatted}</strong> · Completed at: <strong>${dateStr}</strong></div>
            <div>👥 Party Roster Match: <strong>${matchedCount} / ${partyMembers.length} members verified</strong></div>
          </div>
          <div class="match-preview-links">
            <a href="${escapeHtml(run.url)}" target="_blank" rel="noopener" class="stats-run-link">View Full Breakdown on Raider.IO ↗</a>
          </div>
          <p style="margin-top:0.75rem; font-size:0.82rem; color:var(--text-gold);">
            Click <strong>Log for All Party Members</strong> to automatically record this run, save the Raider.IO and Warcraft Logs links, and set the party back to Waiting.
          </p>
        </div>
      `;
    }

    modal.classList.add('is-open');

    const confirmBtn = document.getElementById('confirmRunMatchBtn');
    const cancelBtn = document.getElementById('cancelRunMatchBtn');
    const closeBtn = document.getElementById('closeRunMatchBtn');

    function cleanup() {
      modal.classList.remove('is-open');
      if (confirmBtn) confirmBtn.onclick = null;
      if (cancelBtn) cancelBtn.onclick = null;
      if (closeBtn) closeBtn.onclick = null;
    }

    if (confirmBtn) {
      confirmBtn.onclick = () => {
        cleanup();
        onConfirm();
      };
    }
    if (cancelBtn) cancelBtn.onclick = cleanup;
    if (closeBtn) closeBtn.onclick = cleanup;
  }

  /**
   * Main function to trigger auto-matching for a specific party
   */
  async function autoMatchParty(group, state, callbacks = {}) {
    const { onStart, onFound, onNotFound, onError } = callbacks;
    if (onStart) onStart();

    try {
      const match = await findRecentRunsForParty(group, state);
      if (!match) {
        if (onNotFound) onNotFound();
        return false;
      }

      showMatchModal(group, match, () => {
        const count = applyRunToParty(group, match, state);
        if (onFound) onFound(match, count);
      });
      return true;
    } catch (err) {
      console.error('[run-matcher] Error matching party:', err);
      if (onError) onError(err);
      return false;
    }
  }

  /**
   * Bulk auto-match for all formed groups
   */
  async function autoMatchAllParties(state, callbacks = {}) {
    const groups = state.formedGroups || [];
    if (groups.length === 0) {
      alert('No active dungeon parties to check.');
      return;
    }

    const { onProgress, onComplete } = callbacks;
    let foundCount = 0;
    const matchesFound = [];

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (onProgress) onProgress(i + 1, groups.length, group.name);
      const match = await findRecentRunsForParty(group, state);
      if (match) {
        matchesFound.push({ group, match });
        applyRunToParty(group, match, state);
        foundCount++;
      }
    }

    if (onComplete) onComplete(foundCount, matchesFound);
  }

  // Export
  window.autoMatchParty = autoMatchParty;
  window.autoMatchAllParties = autoMatchAllParties;
  window.findRecentRunsForParty = findRecentRunsForParty;
  window.applyRunToParty = applyRunToParty;
})();
