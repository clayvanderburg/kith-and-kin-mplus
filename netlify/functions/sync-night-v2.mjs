// Netlify v2 scheduled job (strongly consistent Blobs reads, so it never saves over newer changes).
// Logic lives in lib/handlers/sync-night.js. The classic sync-night.js is still deployed but no longer scheduled.
// Rollback: delete this file and put the schedule back under [functions."sync-night"] in netlify.toml.
import * as blobs from '@netlify/blobs';
import mod from './lib/handlers/sync-night.js';

globalThis.__kkNetlifyBlobs = blobs;

export default async () => {
  const result = await mod.handler({ httpMethod: 'POST', headers: {}, body: '' }, {});
  return new Response(result?.body || '{}', { status: result?.statusCode || 200, headers: { 'Content-Type': 'application/json' } });
};

export const config = { schedule: '*/15 * * * *' }; // every day: the night's weekday is set in the Control Center
