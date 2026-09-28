const crypto = require('crypto');

// Băm SHA-256 của mật khẩu mặc định 'DaiPhuFF@Secure2026!#'
const DEFAULT_PASS_SHA256 = 'ddee4e42c55e623ee26687d7d9b8cdb2c935418ff79d17ce05dc2b4b907f405d';
const JWT_SECRET = process.env.JWT_SECRET || 'DP_SECURE_HMAC_KEY_98471204812398471203984';

// In-memory rate limiter chống dò mật khẩu (5 lần sai / 15 phút)
const failedAttempts = new Map();

function getClientIp(req) {
  const forwarded = req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip']);
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return (req.socket && req.socket.remoteAddress) || '127.0.0.1';
}

function checkRateLimit(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = failedAttempts.get(ip);
  if (!entry) return { allowed: true, remaining: 5 };

  // Nếu quá 15 phút thì reset
  if (now - entry.firstAttempt > 15 * 60 * 1000) {
    failedAttempts.delete(ip);
    return { allowed: true, remaining: 5 };
  }

  if (entry.count >= 5) {
    const retryAfter = Math.ceil((entry.firstAttempt + 15 * 60 * 1000 - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, retryAfter) };
  }

  return { allowed: true, remaining: 5 - entry.count };
}

function recordFailedLogin(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = failedAttempts.get(ip);
  if (!entry || (now - entry.firstAttempt > 15 * 60 * 1000)) {
    failedAttempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    entry.count += 1;
  }
}

function resetFailedLogin(req) {
  const ip = getClientIp(req);
  failedAttempts.delete(ip);
}

function verifyAdminPassword(candidatePassword) {
  if (!candidatePassword || typeof candidatePassword !== 'string') return false;
  
  let targetSha256 = DEFAULT_PASS_SHA256;
  if (process.env.ADMIN_PASS_SHA256) {
    targetSha256 = process.env.ADMIN_PASS_SHA256.trim();
  } else if (process.env.ADMIN_PASSWORD) {
    targetSha256 = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD).digest('hex');
  }

  const candidateHash = crypto.createHash('sha256').update(candidatePassword).digest('hex');
  const bTarget = Buffer.from(targetSha256);
  const bCandidate = Buffer.from(candidateHash);

  if (bTarget.length !== bCandidate.length) return false;
  return crypto.timingSafeEqual(bTarget, bCandidate);
}

function signAdminToken(durationMs = 86400000) {
  const payload = {
    role: 'admin',
    iat: Date.now(),
    exp: Date.now() + durationMs
  };
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(p).digest('base64url');
  return p + '.' + sig;
}

function parseCookies(req) {
  const list = {};
  const rc = req.headers && req.headers.cookie;
  if (!rc) return list;
  rc.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts.shift().trim();
    if (name) list[name] = decodeURIComponent(parts.join('='));
  });
  return list;
}

function extractAdminToken(req) {
  const authHeader = req.headers && (req.headers['authorization'] || req.headers['x-admin-token']);
  if (authHeader) {
    const clean = String(authHeader).replace(/^Bearer\s+/i, '').trim();
    if (clean) return clean;
  }
  const cookies = parseCookies(req);
  if (cookies['admin_token']) return cookies['admin_token'];
  return null;
}

function verifyAdminToken(req) {
  const token = extractAdminToken(req);
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [p, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(p).digest('base64url');
  const bSig = Buffer.from(sig);
  const bExpected = Buffer.from(expectedSig);

  if (bSig.length !== bExpected.length) return false;
  if (!crypto.timingSafeEqual(bSig, bExpected)) return false;

  try {
    const data = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (!data.exp || data.exp < Date.now() || data.role !== 'admin') {
      return false;
    }
    return data;
  } catch(e) {
    return false;
  }
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch(e) { return {}; }
  }
  return new Promise(resolve => {
    let d = '';
    req.on('data', chunk => d += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(d)); } catch(e) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function validateOrderId(id) {
  if (!id || typeof id !== 'string') return false;
  return /^DP[A-Z0-9]{4,15}$/i.test(id.trim());
}

module.exports = {
  verifyAdminPassword,
  signAdminToken,
  verifyAdminToken,
  checkRateLimit,
  recordFailedLogin,
  resetFailedLogin,
  parseCookies,
  parseBody,
  validateOrderId
};
