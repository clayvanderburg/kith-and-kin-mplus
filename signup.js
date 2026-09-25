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
    const keyInput = document.getElementById('runKeyInput');
    if (keyInput && !keyInput.value) keyInput.value = signup.ownedKey || '';
    const owned = document.getElementById('ownedKeyInput');
    if (owned) owned.value = signup.ownedKey || '';
    const lastRun = document.getElementById('lastRunNote');
    if (lastRun) lastRun.textContent = 'Leave this blank until you type the keystone in your bags.';
    renderHistory(signup.runLog);
  }

  function renderGroups(groups) {
    const list = document.getElementById('groupList');
    groupCard.hidden = false;
    const ordered = [...(groups || [])].sort((a, b) => Number(b.mine) - Number(a.mine));
    if (!ordered.length) {
      list.innerHTML = '<p class="player-lead">Parties have not been formed yet. Your signup is saved, and you can still set Waiting or In key.</p>';
      return;
    }
    list.innerHTML = ordered.map(group => {
      const rows = group.members.map(member => {
        const color = CLASS_COLORS[member.className] || '#f5d061';
        const status = member.nightStatus === 'in-key' ? 'in-key' : 'waiting';
        return `<div class="member-row">
          <div class="class-pip" style="--pip:${color}"></div>
          <div>
            <div class="member-name">${escapeHtml(member.name)}</div>
            <div class="member-meta">${escapeHtml(member.className || 'Player')} · ${escapeHtml((member.roles || []).join('/'))}</div>
            <div class="member-meta">${escapeHtml(prefText(member))}</div>
            <div class="member-key">${member.ownedKey ? `Key: ${escapeHtml(member.ownedKey)}` : 'No key entered'}</div>
            <div class="member-record"><span class="status-pill ${status}">${status === 'in-key' ? 'In key' : 'Waiting'}</span>${escapeHtml(recordText(member.record))}</div>
          </div>
          <div class="member-score"><b>${member.io || 0}</b><span>IO</span><div>${member.ilvl || '—'} ilvl</div></div>
        </div>`;
      }).join('');
      const roll = group.mine
        ? `<button type="button" class="btn btn-sm btn-accent" data-roll="${group.index}">Roll a key for this party</button>`
        : '';
      return `<article class="party-card ${group.mine ? 'mine' : ''}">
        <div class="party-head">
          <strong>${group.mine ? 'Your party · ' : ''}${escapeHtml(group.name)}</strong>
          <span>${group.dungeon ? escapeHtml(group.dungeon) : 'No key rolled yet'}</span>
        </div>
        ${group.leaderName ? `<div class="member-meta">Leader: ${escapeHtml(group.leaderName)}</div>` : ''}
        ${rows}
        ${roll}
      </article>`;
    }).join('');
    list.querySelectorAll('[data-roll]').forEach(button => {
      button.addEventListener('click', () => rollKey(button));
    });
  }

  async function rollKey(button) {
    button.disabled = true;
    saveStatus.textContent = 'Rolling a key for your party...';
    const res = await fetch('/api/me', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
      body: JSON.stringify({ action: 'roll' })
    });
    const data = await res.json();
    button.disabled = false;
    if (!res.ok) {
      saveStatus.textContent = data.error || 'Could not roll a key.';
      return;
    }
    const flash = document.getElementById('rollFlash');
    document.getElementById('rollFlashKey').textContent = data.key;
    document.getElementById('rollFlashWho').textContent = data.who
      ? `${data.who} typed that key. It is on your party card now.`
      : 'That key is now on your party card.';
    flash.classList.add('is-on');
    renderGroups(data.groups);
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
    document.getElementById('saveKeyBtn').addEventListener('click', async () => {
      document.getElementById('nightStatus').textContent = 'Saving your key...';
      try {
        await postMe({ action: 'set-key', ownedKey: document.getElementById('ownedKeyInput').value });
        document.getElementById('nightStatus').textContent = 'Key saved.';
      } catch (err) {
        document.getElementById('nightStatus').textContent = err.message;
      }
    });
    document.getElementById('logRunBtn').addEventListener('click', async () => {
      const line = document.getElementById('nightStatus');
      line.textContent = 'Saving the key...';
      try {
        await postMe({
          action: 'log-run',
          key: document.getElementById('runKeyInput').value,
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
