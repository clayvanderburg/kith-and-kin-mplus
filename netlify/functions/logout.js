// Log out: clears the Battle.net login cookie (it's HttpOnly, so only the server can remove it).
// The pages also forget their stored session and officer pass.
exports.handler = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  multiValueHeaders: {
    'Set-Cookie': ['kk_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0']
  },
  body: JSON.stringify({ ok: true })
});
