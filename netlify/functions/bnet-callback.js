const { readCookies, createSession, redirectUri } = require('./player-session');

function html(status, message) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: `<!doctype html><meta charset="utf-8"><title>Battle.net</title>
      <body style="font-family:sans-serif;background:#090c10;color:#e6edf3;padding:2rem">
      <p>${message}</p><p><a style="color:#f5d061" href="/signup.html">Back to signup</a></p></body>`
  };
}

async function fetchCharacters(token, region) {
  const host = region === 'eu' ? 'eu.api.blizzard.com' : 'us.api.blizzard.com';
  const namespace = region === 'eu' ? 'profile-eu' : 'profile-us';
  const res = await fetch(`https://${host}/profile/user/wow?namespace=${namespace}&locale=en_US`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return [];
  const data = await res.json();
  const characters = [];
  for (const account of data.wow_accounts || []) {
    for (const character of account.characters || []) {
      if ((character.level || 0) < 10) continue;
      characters.push({
        name: character.name,
        realm: character.realm?.name || '',
        realmSlug: character.realm?.slug || '',
        className: character.playable_class?.name || 'Adventurer',
        level: character.level || 0,
        region
      });
    }
  }
  return characters;
}

exports.handler = async (event) => {
  try {
  const params = event.queryStringParameters || {};
  if (params.error) return html(400, 'Battle.net login was cancelled.');

  const cookies = readCookies(event);
  if (!params.state || params.state !== cookies.bnet_state) {
    return html(400, 'Login session expired. Start again from the signup page.');
  }
  if (!params.code) return html(400, 'Battle.net did not return a login code.');

  const basic = Buffer.from(`${process.env.BNET_CLIENT_ID}:${process.env.BNET_CLIENT_SECRET}`).toString('base64');
  const tokenRes = await fetch('https://oauth.battle.net/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: redirectUri()
    })
  });
  if (!tokenRes.ok) return html(502, 'Battle.net rejected the login. Check the app redirect URL and secret.');

  const token = await tokenRes.json();
  const infoRes = await fetch('https://oauth.battle.net/userinfo', {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });
  if (!infoRes.ok) return html(502, 'Could not read the Battle.net account.');
  const info = await infoRes.json();

  const lists = await Promise.all([
    fetchCharacters(token.access_token, 'us'),
    fetchCharacters(token.access_token, 'eu')
  ]);
  const seen = new Set();
  const characters = [];
  for (const character of lists.flat()) {
    const key = `${character.region}|${character.realmSlug}|${character.name}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    characters.push(character);
  }
  characters.sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));

  const session = await createSession(event, {
    bnetId: String(info.id || info.sub || ''),
    battleTag: info.battletag || 'Battle.net',
    characters: characters.slice(0, 80)
  });

  return {
    statusCode: 302,
    headers: {
      Location: `/signup.html#s=${encodeURIComponent(session.token)}`,
      'Cache-Control': 'no-store'
    },
    multiValueHeaders: {
      'Set-Cookie': [session.cookie]
    },
    body: ''
  };
  } catch (err) {
    console.error('[bnet-callback]', err);
    return html(500, 'Login could not be finished. Start again from the signup page.');
  }
};
