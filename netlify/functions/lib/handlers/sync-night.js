// Scheduled (netlify.toml): during Friday M+ night, logs everyone's finished keys from Raider.IO and records who showed up.
// Fires every 15 minutes on Fridays/Saturdays (UTC) and does nothing outside the night window.
const { syncNight, weeklyReset } = require('../jobs');

exports.handler = async (event) => {
  const result = await syncNight(event, { budgetMs: 22000 });
  console.log('[sync-night]', JSON.stringify(result));
  if (result.skipped) {
    // Outside the night: the first run after it ends clears last week's sign-ups (once).
    try {
      result.weeklyReset = await weeklyReset(event);
      console.log('[weekly-reset]', JSON.stringify(result.weeklyReset));
    } catch (err) {
      console.error('[weekly-reset] failed:', err.message);
    }
  }
  return { statusCode: 200, body: JSON.stringify(result) };
};
