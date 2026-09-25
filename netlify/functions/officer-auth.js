const { safeEqual } = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  let key = '';
  try {
    key = JSON.parse(event.body || '{}').key || '';
  } catch (err) {
    key = '';
  }
  const ok = safeEqual(String(key).trim(), process.env.OFFICER_KEY);
  return {
    statusCode: ok ? 200 : 401,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok })
  };
};
