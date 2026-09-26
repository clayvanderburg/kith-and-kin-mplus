// Diagnostic (temporary): does a v2 function get strong-consistency Blobs? Answers JSON; no secrets.
import { getStore } from '@netlify/blobs';

export default async () => {
  const out = {};
  for (const consistency of ['strong', 'eventual']) {
    const t = Date.now();
    try {
      const data = await getStore('mplus-state', { consistency }).get('current_state', { type: 'json' });
      out[consistency] = { ok: true, ms: Date.now() - t, lastUpdated: data?.lastUpdated || null };
    } catch (err) {
      out[consistency] = { ok: false, ms: Date.now() - t, error: String(err.message).slice(0, 200) };
    }
  }
  return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } });
};
