(() => {
  const loginCard = document.getElementById('loginCard');
  const signupCard = document.getElementById('signupCard');
  const groupCard = document.getElementById('groupCard');
  const charGrid = document.getElementById('charGrid');
  const saveStatus = document.getElementById('saveStatus');
  let selected = null;
  let characters = [];

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

  function renderGroups(groups) {
    const list = document.getElementById('groupList');
    groupCard.hidden = false;
    if (!groups || !groups.length) {
      list.innerHTML = '<p class="player-lead">Parties have not been formed yet. Your signup is still saved.</p>';
      return;
    }
    list.innerHTML = groups.map(group => {
      const people = group.members.map(member => `${escapeHtml(member.name)} (${escapeHtml(member.className)})`).join(', ');
      const roll = group.mine
        ? `<button type="button" class="btn btn-sm btn-accent" data-roll="${group.index}">Roll a key for this party</button>`
        : '';
      const key = group.dungeon ? `<div>Key: <strong>${escapeHtml(group.dungeon)}</strong></div>` : '';
      const held = group.heldKeys?.length
        ? `<div>Keys in bags: ${group.heldKeys.map(item => `${escapeHtml(item.name)} ${escapeHtml(item.ownedKey)}`).join(', ')}</div>`
        : '';
      return `<article class="party-card ${group.mine ? 'mine' : ''}">
        <strong>${group.mine ? 'Your party · ' : ''}${escapeHtml(group.name)}</strong>
        ${group.leaderName ? `<div>Leader: ${escapeHtml(group.leaderName)}</div>` : ''}
        <div>${people}</div>
        ${key}
        ${held}
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
    saveStatus.textContent = `Your party rolled ${data.key}.`;
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
      saveStatus.textContent = data.error || 'Save failed.';
      return;
    }
    saveStatus.textContent = data.signup?.attending === false
      ? 'Marked you as out.'
      : `Saved ${data.signup.name}. Raider.IO score and key were pulled when available.`;
    renderGroups(data.groups);
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
    document.getElementById('tagLine').textContent = 'Choose the character you are bringing. This only changes your signup.';
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
    renderGroups(data.groups);
    document.getElementById('saveBtn').addEventListener('click', saveSignup);
  }

  boot().catch(() => {
    document.getElementById('loginNote').textContent = 'Could not reach the signup service.';
  });
})();
