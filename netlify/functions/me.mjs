// Netlify v2 entry point (strong-consistency blobs). Logic lives in lib/handlers/me.js.
import mod from './lib/handlers/me.js';
import v2 from './lib/v2.js';

export default v2.toV2(mod.handler);
