/**
 * Officer button: refresh attendees' scores and pull tonight's (or the latest Friday's) keys right now.
 * The scheduled jobs do the same thing automatically; this is for "I want it this minute".
 */
const { isOfficerRequest } = require('./lib/auth');
const { refreshScores, syncNight } = require('./lib/jobs');

const HEADERS = { 'Content-Type': 'application/json' };

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'POST only' }) };
  if (!isOfficerRequest(event)) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'Officer passphrase required.' }) };
  try {
    const scores = await refreshScores(event, { budgetMs: 3500, max: 60, onlyAttending: true });
    const night = await syncNight(event, { force: true, budgetMs: 4000 });
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, scores, night }) };
  } catch (err) {
    console.error('[refresh-now]', err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'Refresh failed.' }) };
  }
};
