// Scheduled (netlify.toml): during Friday M+ night, logs everyone's finished keys from Raider.IO and records who showed up.
// Fires every 15 minutes on Fridays/Saturdays (UTC) and does nothing outside the night window.
const { syncNight } = require('../jobs');

exports.handler = async (event) => {
  const result = await syncNight(event, { budgetMs: 22000 });
  console.log('[sync-night]', JSON.stringify(result));
  return { statusCode: 200, body: JSON.stringify(result) };
};
