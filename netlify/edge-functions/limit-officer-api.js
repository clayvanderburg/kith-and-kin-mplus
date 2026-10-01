// Netlify rate limit for the other endpoints that accept the officer passphrase in a header.
// Generous: the Control Center polls every 4s (15/min) plus saves. Passes everything through.
export default async (request, context) => context.next();

export const config = {
  path: ['/api/state', '/api/keys', '/api/refresh-now', '/api/chronicler-recap'],
  rateLimit: {
    windowLimit: 150,
    windowSize: 60,
    aggregateBy: ['ip', 'domain']
  }
};
