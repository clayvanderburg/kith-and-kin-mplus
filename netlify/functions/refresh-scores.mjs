// Scheduled: Raider.IO score + item level for the whole guild, a slice every 15 minutes (UTC cron).
import mod from './lib/handlers/refresh-scores.js';
import v2 from './lib/v2.js';

export default v2.toV2(mod.handler);
export const config = { schedule: '*/15 * * * *' };
