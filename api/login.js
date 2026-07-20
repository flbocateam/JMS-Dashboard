// POST /api/login  { password: "..." }
// Checks the password against process.env.ACCESS_PASSWORD (never in code)
// and, on success, issues a signed session cookie. The data endpoints
// (sales-data.js, transfer-data.js) refuse to return anything without
// a valid cookie -- so unlike the old client-side gate, the actual
// proprietary data is never sent to the browser pre-auth.

const { createToken, setSessionCookie } = require('./_auth');

// Basic rate limiting: this is a single serverless instance's in-memory
// state, so it resets on cold start and isn't shared across regions --
// it's a speed bump against casual brute force, not a guarantee. For
// real protection, also set a strong, long ACCESS_PASSWORD.
const attempts = new Map(); // ip -> { count, resetAt }
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 5 * 60 * 1000;

function tooManyAttempts(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_ATTEMPTS;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (tooManyAttempts(ip)) {
    res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const password = (body && body.password) || '';

  const expected = process.env.ACCESS_PASSWORD;
  if (!expected) {
    res.status(500).json({ error: 'Server is not configured (ACCESS_PASSWORD missing).' });
    return;
  }

  if (password !== expected) {
    res.status(401).json({ error: 'Invalid access code' });
    return;
  }

  const token = createToken();
  setSessionCookie(res, token);
  res.status(200).json({ ok: true });
};
