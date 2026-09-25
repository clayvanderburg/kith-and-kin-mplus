const crypto = require('crypto');
const { bnetConfigured, redirectUri, stateCookie } = require('./lib/player-session');

exports.handler = async () => {
  if (!bnetConfigured()) {
    return {
      statusCode: 501,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: `<!doctype html><meta charset="utf-8"><title>Battle.net not connected</title>
        <body style="font-family:sans-serif;background:#090c10;color:#e6edf3;padding:2rem">
        <h1>Battle.net login is not switched on yet</h1>
        <p>An officer needs to create a Battle.net app and add <code>BNET_CLIENT_ID</code> and <code>BNET_CLIENT_SECRET</code> on Netlify.</p>
        <p>Redirect URL to register: <code>${redirectUri()}</code></p>
        <p><a style="color:#f5d061" href="/signup.html">Back to signup</a></p>
        </body>`
    };
  }

  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: process.env.BNET_CLIENT_ID,
    scope: 'wow.profile',
    state,
    redirect_uri: redirectUri(),
    response_type: 'code'
  });

  return {
    statusCode: 302,
    headers: {
      Location: `https://oauth.battle.net/authorize?${params.toString()}`,
      'Set-Cookie': stateCookie(state)
    },
    body: ''
  };
};
