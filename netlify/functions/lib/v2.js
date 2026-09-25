/**
 * Runs a classic (Lambda-style) handler as a Netlify v2 function.
 * v2 functions get Netlify Blobs with strong (read-your-writes) consistency,
 * which Lambda-compat functions don't — that was causing stale reads and lost updates.
 */
function toV2(handler) {
  return async (req, context) => {
    const url = new URL(req.url);
    const headers = {};
    req.headers.forEach((value, key) => { headers[key.toLowerCase()] = value; });
    const method = req.method.toUpperCase();
    const body = method === 'GET' || method === 'HEAD' ? '' : await req.text();
    const event = {
      httpMethod: method,
      path: url.pathname,
      headers,
      queryStringParameters: Object.fromEntries(url.searchParams.entries()),
      body,
      isBase64Encoded: false,
      v2: true
    };
    const result = (await handler(event, context)) || { statusCode: 204, body: '' };
    const out = new Headers();
    for (const [key, value] of Object.entries(result.headers || {})) {
      if (value !== undefined && value !== null) out.set(key, String(value));
    }
    for (const [key, values] of Object.entries(result.multiValueHeaders || {})) {
      for (const value of values || []) out.append(key, String(value));
    }
    const status = result.statusCode || 200;
    const payload = status === 204 || status === 304 ? null : (result.body ?? '');
    return new Response(payload, { status, headers: out });
  };
}

module.exports = { toV2 };
