/**
 * Log in / Log out button in the top bar on every page.
 *  - Control Center: officer login (Battle.net + guild rank, or passphrase) via the login box in app.js.
 *  - Other pages: Battle.net login for players.
 * Log out forgets everything on this browser (Battle.net session + officer pass).
 */
(function () {
  const get = k => { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const isControlCenter = !!document.getElementById('officerGate');

  async function logout() {
    try { await fetch('/api/logout', { method: 'POST', credentials: 'include' }); } catch (e) { /* still clear locally */ }
    ['kk_session', 'kk_officer_key', 'kk_officer_name'].forEach(k => { try { sessionStorage.removeItem(k); } catch (e) {} });
    window.SYNC_SECRET = '';
    location.reload();
  }

  async function playerName() {
    try {
      const token = get('kk_session');
      const res = await fetch('/api/me', { credentials: 'include', headers: token ? { 'x-kk-session': token } : {} });
      const data = await res.json();
      return data.authenticated ? (data.battleTag || 'Battle.net') : '';
    } catch (e) { return ''; }
  }

  async function render() {
    const nav = document.querySelector('.site-nav');
    if (!nav) return;
    // Guild merch link on every page
    if (!nav.querySelector('a[href="merch.html"]')) {
      const merch = document.createElement('a');
      merch.href = 'merch.html';
      merch.textContent = 'Merch 🛡️';
      if (/merch\.html$/.test(location.pathname)) merch.className = 'is-current';
      nav.appendChild(merch);
    }
    let btn = document.getElementById('navAccountBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'navAccountBtn';
      btn.className = 'nav-account-btn';
      nav.appendChild(btn);
      btn.addEventListener('click', () => {
        if (btn.dataset.state === 'in') return logout();
        if (isControlCenter && window.kkOfficerLogin) return window.kkOfficerLogin();
        location.href = '/api/bnet-login';
      });
    }
    let name = '';
    if (isControlCenter) {
      name = get('kk_officer_key') ? (get('kk_officer_name') || 'Officer') : '';
    } else {
      name = await playerName();
    }
    btn.dataset.state = name ? 'in' : 'out';
    btn.innerHTML = name
      ? `<span class="nav-account-name">${name.replace(/[&<>"']/g, '')}</span><span class="nav-account-action">Log out</span>`
      : `<span class="nav-account-action">${isControlCenter ? '🔒 Officer log in' : 'Log in'}</span>`;
    btn.title = name ? `Logged in as ${name}. Click to log out on this browser.` : (isControlCenter ? 'Officer login (Battle.net or passphrase)' : 'Log in with Battle.net');
  }

  window.kkAccountRefresh = render;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
