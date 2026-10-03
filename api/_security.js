const crypto = require('crypto');

// KHÔNG có secret / mật khẩu mặc định: thiếu biến môi trường => fail closed.
const MIN_JWT_SECRET_LENGTH = 16;
const MAX_BODY_BYTES = 100 * 1024;

class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
    this.isConfigError = true;
  }
}

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (typeof s !== 'string' || s.length < MIN_JWT_SECRET_LENGTH) return null;
  return s;
}

function isJwtConfigured() {
  return getJwtSecret() !== null;
}

function requireJwtSecret() {
  const s = getJwtSecret();
  if (!s) throw new ConfigError('JWT_SECRET is not configured (min ' + MIN_JWT_SECRET_LENGTH + ' chars).');
  return s;
}

function getAdminTargetSha256() {
  const envSha = process.env.ADMIN_PASS_SHA256 ? process.env.ADMIN_PASS_SHA256.trim() : '';
  if (/^[a-f0-9]{64}$/i.test(envSha)) return envSha.toLowerCase();
  if (process.env.ADMIN_PASSWORD) {
    return crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD).digest('hex');
  }
  return null;
}

function isAdminConfigured() {
  return getAdminTargetSha256() !== null && isJwtConfigured();
}

// In-memory rate limiter chống dò mật khẩu (5 lần sai / 15 phút)
// Lưu ý: bộ nhớ theo từng instance serverless, chỉ là lớp bảo vệ "best effort".
const failedAttempts = new Map();
const apiRateLimits = new Map(); // Anti-DDoS API

function cleanExpiredLimits() {
  const now = Date.now();
  if (failedAttempts.size > 1000) {
    for (const [k, v] of failedAttempts.entries()) {
      if (now - v.firstAttempt > 15 * 60 * 1000) failedAttempts.delete(k);
    }
  }
  if (apiRateLimits.size > 2000) {
    for (const [k, v] of apiRateLimits.entries()) {
      if (now > v.resetAt) apiRateLimits.delete(k);
    }
  }
}

function checkApiDdos(req, limit = 60, windowMs = 60000) {
  cleanExpiredLimits();
  const ip = getClientIp(req);
  const now = Date.now();

  if (!apiRateLimits.has(ip)) {
    apiRateLimits.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  const entry = apiRateLimits.get(ip);
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + windowMs;
    return { allowed: true };
  }

  entry.count++;
  if (entry.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  return { allowed: true };
}

function getClientIp(req) {
  const h = (req && req.headers) || {};
  // Trên Vercel, x-real-ip / x-vercel-forwarded-for do edge đặt, client không giả mạo được.
  const forwarded = h['x-real-ip'] || h['x-vercel-forwarded-for'] || h['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim().substring(0, 64);
  }
  return (req && req.socket && req.socket.remoteAddress) || '127.0.0.1';
}

function checkRateLimit(req, scope = 'admin') {
  cleanExpiredLimits();
  const key = scope + ':' + getClientIp(req);
  const now = Date.now();
  const entry = failedAttempts.get(key);
  if (!entry) return { allowed: true, remaining: 5 };

  // Nếu quá 15 phút thì reset
  if (now - entry.firstAttempt > 15 * 60 * 1000) {
    failedAttempts.delete(key);
    return { allowed: true, remaining: 5 };
  }

  if (entry.count >= 5) {
    const retryAfter = Math.ceil((entry.firstAttempt + 15 * 60 * 1000 - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, retryAfter) };
  }

  return { allowed: true, remaining: 5 - entry.count };
}

function recordFailedLogin(req, scope = 'admin') {
  const key = scope + ':' + getClientIp(req);
  const now = Date.now();
  const entry = failedAttempts.get(key);
  if (!entry || (now - entry.firstAttempt > 15 * 60 * 1000)) {
    failedAttempts.set(key, { count: 1, firstAttempt: now });
  } else {
    entry.count += 1;
  }
}

function resetFailedLogin(req, scope = 'admin') {
  failedAttempts.delete(scope + ':' + getClientIp(req));
}

function verifyAdminPassword(candidatePassword) {
  if (!candidatePassword || typeof candidatePassword !== 'string' || candidatePassword.length > 200) return false;

  const targetSha256 = getAdminTargetSha256();
  if (!targetSha256) return false; // Chưa cấu hình => không ai đăng nhập được

  const candidateHash = crypto.createHash('sha256').update(candidatePassword).digest('hex');
  const bTarget = Buffer.from(targetSha256);
  const bCandidate = Buffer.from(candidateHash);

  if (bTarget.length !== bCandidate.length) return false;
  return crypto.timingSafeEqual(bTarget, bCandidate);
}

function signPayload(payload) {
  const secret = requireJwtSecret();
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(p).digest('base64url');
  return p + '.' + sig;
}

function verifySignedToken(token) {
  const secret = getJwtSecret();
  if (!secret) return null; // fail closed
  if (!token || typeof token !== 'string' || token.length > 2048) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [p, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(p).digest('base64url');
  const bSig = Buffer.from(sig);
  const bExpected = Buffer.from(expectedSig);

  if (bSig.length !== bExpected.length) return null;
  if (!crypto.timingSafeEqual(bSig, bExpected)) return null;

  try {
    const data = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (!data || typeof data !== 'object') return null;
    if (typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function signAdminToken(durationMs = 86400000) {
  return signPayload({
    role: 'admin',
    iat: Date.now(),
    exp: Date.now() + durationMs
  });
}

function parseCookies(req) {
  const list = Object.create(null);
  const rc = req.headers && req.headers.cookie;
  if (!rc) return list;
  String(rc).split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts.shift().trim();
    if (!name) return;
    try {
      list[name] = decodeURIComponent(parts.join('='));
    } catch (e) {
      // cookie hỏng -> bỏ qua
    }
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
  const data = verifySignedToken(extractAdminToken(req));
  if (!data || data.role !== 'admin') return false;
  return data;
}

async function parseBody(req) {
  const asObject = v => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
  if (req.body && typeof req.body === 'object') return asObject(req.body);
  if (typeof req.body === 'string') {
    if (req.body.length > MAX_BODY_BYTES) return {};
    try { return asObject(JSON.parse(req.body)); } catch (e) { return {}; }
  }
  if (typeof req.on !== 'function') return {};
  return new Promise(resolve => {
    const chunks = [];
    let size = 0;
    let done = false;
    const finish = v => { if (!done) { done = true; resolve(v); } };
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) { finish({}); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { finish(asObject(JSON.parse(Buffer.concat(chunks).toString('utf8')))); } catch (e) { finish({}); }
    });
    req.on('error', () => finish({}));
  });
}

function signUserToken(username, durationMs = 30 * 86400000) {
  return signPayload({
    user: username,
    iat: Date.now(),
    exp: Date.now() + durationMs
  });
}

function verifyUserToken(req) {
  const authHeader = req.headers && (req.headers['x-user-token'] || req.headers['authorization']);
  let token = null;
  if (authHeader) {
    token = String(authHeader).replace(/^Bearer\s+/i, '').trim();
  }
  if (!token) {
    const cookies = parseCookies(req);
    token = cookies['user_token'];
  }
  const data = verifySignedToken(token);
  if (!data || typeof data.user !== 'string' || !data.user) return null;
  return data;
}

function generateSecureOrderId() {
  const num = crypto.randomInt(100000, 1000000);
  return 'NX' + num;
}

function validateOrderId(id) {
  if (!id || typeof id !== 'string') return false;
  return /^(DP|NX|DPVN|NEXUS)[A-Z0-9]{4,15}$/i.test(id.trim());
}

module.exports = {
  ConfigError,
  isJwtConfigured,
  isAdminConfigured,
  verifyAdminPassword,
  signAdminToken,
  verifyAdminToken,
  signUserToken,
  verifyUserToken,
  generateSecureOrderId,
  checkRateLimit,
  checkApiDdos,
  recordFailedLogin,
  resetFailedLogin,
  parseCookies,
  parseBody,
  validateOrderId,
  getClientIp
};
