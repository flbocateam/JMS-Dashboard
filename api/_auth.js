// Shared session-token helpers for the serverless API routes.
// Uses a stateless signed token (HMAC-SHA256) instead of a server-side
// session store, since Vercel functions are stateless between invocations.
// The signing secret and access password live ONLY in Vercel environment
// variables (see README.md) -- never in code, never in git.

const crypto = require('crypto');

const SESSION_HOURS = 12; // how long a login lasts before re-auth is required

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is not set. See README.md.');
  }
  return secret;
}

function sign(payload) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

// Build a signed, expiring token: "<expiryEpochMs>.<hmacSignature>"
function createToken() {
  const expiry = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = String(expiry);
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

// Verify a token's signature and expiry. Returns true/false.
function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const expected = sign(payload);
  // Constant-time comparison to avoid timing attacks.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;

  const expiry = Number(payload);
  if (!Number.isFinite(expiry)) return false;
  if (Date.now() > expiry) return false;

  return true;
}

// Parse the raw Cookie header into { name: value } pairs.
function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  cookieHeader.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}

function isAuthed(req) {
  const cookies = parseCookies(req.headers.cookie);
  return verifyToken(cookies.jms_session);
}

function setSessionCookie(res, token) {
  const maxAge = SESSION_HOURS * 60 * 60;
  // Secure + HttpOnly + SameSite=Strict: not readable by JS, not sent
  // cross-site, only sent over HTTPS (Vercel serves HTTPS by default).
  res.setHeader(
    'Set-Cookie',
    `jms_session=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    'jms_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict'
  );
}

module.exports = { createToken, verifyToken, isAuthed, setSessionCookie, clearSessionCookie };
