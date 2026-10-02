// Netlify v2 entry for /api/state (see netlify.toml). v2 functions get strongly consistent Blobs
// reads, so a save is never merged against a stale copy. Logic lives in lib/handlers/state.js.
// Rollback: remove the /api/state redirect in netlify.toml and the classic state.js takes over again.
import * as blobs from '@netlify/blobs';
import mod from './lib/handlers/state.js';
import v2 from './lib/v2.js';

globalThis.__kkNetlifyBlobs = blobs;
export default v2.toV2(mod.handler);
