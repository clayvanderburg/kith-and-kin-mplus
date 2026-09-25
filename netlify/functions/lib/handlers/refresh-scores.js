// Scheduled (netlify.toml): keeps Raider.IO score + item level fresh for the whole guild, a slice every 15 minutes.
const { refreshScores } = require('../jobs');

exports.handler = async (event) => {
  const result = await refreshScores(event, { budgetMs: 22000, max: 170 });
  console.log('[refresh-scores]', JSON.stringify(result));
  return { statusCode: 200, body: JSON.stringify(result) };
};
