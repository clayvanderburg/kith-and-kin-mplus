// Scheduled: Friday M+ night key logging + attendance, every 15 minutes Fri/Sat UTC (no-op outside the night window).
import mod from './lib/handlers/sync-night.js';
import v2 from './lib/v2.js';

export default v2.toV2(mod.handler);
export const config = { schedule: '*/15 * * * 5,6' };
