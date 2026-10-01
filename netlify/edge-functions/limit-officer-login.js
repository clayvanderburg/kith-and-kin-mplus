// Netlify rate limit for the officer passphrase check (stops password guessing).
// Does nothing else: every allowed request passes straight through to the function.
// Over the limit, Netlify answers 429 before the function runs.
export default async (request, context) => context.next();

export const config = {
  path: '/api/officer-auth',
  method: ['POST'],
  rateLimit: {
    windowLimit: 10, // 10 tries per minute per IP is plenty for a human typing
    windowSize: 60,
    aggregateBy: ['ip', 'domain']
  }
};
