const crypto = require('crypto');
const { promisify } = require('util');
const { getGist, updateGist } = require('./db');
const { signUserToken, verifyUserToken, checkApiDdos, verifyAdminToken } = require('./_security');
const { Mutex } = require('./_mutex');

const scryptAsync = promisify(crypto.scrypt);
const userMutex = new Mutex();

// Dynamic dummy credentials to prevent timing side-channel
const DUMMY_SALT = crypto.randomBytes(16).toString('hex');
const DUMMY_KEY = crypto.randomBytes(32).toString('hex');

const AUTH_CONFIG = Object.freeze({
  keyLength: 32,
  saltLength: 16,
  minUsernameLength: 3,
  maxUsernameLength: 30,
  minPasswordLength: 6,
  maxPasswordLength: 100,
  maxUsersLimit: 500
});

function maskPhone(phone) {
  if (!phone || typeof phone !== 'string' || phone.length < 6) return '***';
  return phone.substring(0, 3) + '****' + phone.substring(phone.length - 3);
}

function constantTimeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

async function hashPassword(plain) {
  if (typeof plain !== 'string') throw new Error('Password must be a string');
  const salt = crypto.randomBytes(AUTH_CONFIG.saltLength).toString('hex');
  const derivedKey = await scryptAsync(plain, salt, AUTH_CONFIG.keyLength);
  return salt + ':' + derivedKey.toString('hex');
}

async function verifyPassword(plain, stored) {
  if (typeof plain !== 'string' || typeof stored !== 'string') return false;
  const colonIdx = stored.indexOf(':');
  if (colonIdx === -1) {
    // Backward compatibility for legacy plain-text
    return constantTimeEqual(plain, stored);
  }
  const salt = stored.substring(0, colonIdx);
  const key = stored.substring(colonIdx + 1);
  if (!salt || !key) return false;
  const derivedKey = await scryptAsync(plain, salt, AUTH_CONFIG.keyLength);
  return constantTimeEqual(key, derivedKey.toString('hex'));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token, x-user-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Anti-DDoS Rate Limit (30 req / 1 min for auth)
  const ddosCheck = checkApiDdos(req, 30, 60000);
  if (!ddosCheck.allowed) {
    return res.status(429).json({ success: false, error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau ' + ddosCheck.retryAfter + 's.' });
  }

  try {
    // ════════ GET: THÔNG TIN TÀI KHOẢN HOẶC ADMIN XEM DANH SÁCH ════════
    if (req.method === 'GET') {
      const userPayload = verifyUserToken(req);
      const query = req.query || {};

      // 1. Người dùng lấy thông tin cá nhân và số dư thực tế
      if (query.action === 'me' || query.view === 'profile' || (!verifyAdminToken(req) && userPayload)) {
        if (!userPayload) {
          return res.status(401).json({ success: false, error: 'Chưa đăng nhập hoặc phiên đã hết hạn.' });
        }
        const { users } = await getGist();
        const userList = Array.isArray(users) ? users : [];
        const found = userList.find(u => u && u.username && u.username.toLowerCase() === userPayload.user.toLowerCase());
        if (!found) {
          return res.status(404).json({ success: false, error: 'Không tìm thấy thông tin tài khoản.' });
        }
        return res.status(200).json({
          success: true,
          user: {
            username: found.username,
            phone: maskPhone(found.phone),
            email: found.email || '',
            balance: Number(found.balance) || 0,
            createdAt: found.createdAt || ''
          }
        });
      }

      // 2. Admin: Xem danh sách toàn bộ thành viên
      if (verifyAdminToken(req)) {
        const { users } = await getGist();
        const userList = Array.isArray(users) ? users : [];
        const safeUsers = userList.map(u => ({
          username: String(u.username || '').substring(0, 30),
          phone: maskPhone(u.phone),
          balance: Number(u.balance) || 0,
          createdAt: u.createdAt || ''
        }));
        return res.status(200).json({ success: true, users: safeUsers });
      }

      return res.status(401).json({ success: false, error: 'Quyền hạn bị từ chối: Cần đăng nhập để xem thông tin.' });
    }

    // ════════ POST: ĐĂNG KÝ / ĐĂNG NHẬP ════════
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch(e) {
          return res.status(400).json({ success: false, error: 'Dữ liệu JSON không hợp lệ.' });
        }
      }
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({ success: false, error: 'Dữ liệu yêu cầu không hợp lệ.' });
      }

      const action = String(body.action || 'login').toLowerCase().trim();
      if (action !== 'login' && action !== 'register') {
        return res.status(400).json({ success: false, error: 'Hành động không hợp lệ (Chỉ hỗ trợ login hoặc register).' });
      }

      // Input Validation: Strict Whitelist Regex
      const username = String(body.username || '').trim();
      const password = typeof body.password === 'string' ? body.password : '';
      const rawPhone = String(body.phone || '').trim().substring(0, 20);

      if (!/^[a-zA-Z0-9_.@-]{3,30}$/.test(username)) {
        return res.status(400).json({ success: false, error: 'Tên đăng nhập không hợp lệ (từ 3-30 ký tự, chỉ gồm chữ, số hoặc . _ @ -).' });
      }

      if (password.length < AUTH_CONFIG.minPasswordLength || password.length > AUTH_CONFIG.maxPasswordLength) {
        return res.status(400).json({ success: false, error: 'Mật khẩu phải từ 6 đến 100 ký tự!' });
      }

      // ──────────────── XỬ LÝ ĐĂNG KÝ (REGISTER) ────────────────
      if (action === 'register') {
        const email = String(body.email || '').trim().substring(0, 50);
        let cleanPhoneDigits = rawPhone.replace(/\s+/g, '');
        if (!cleanPhoneDigits && email) {
          cleanPhoneDigits = '09' + Math.floor(10000000 + Math.random() * 90000000);
        }
        if (!cleanPhoneDigits || cleanPhoneDigits.length < 9) {
          cleanPhoneDigits = '0988888888';
        }

        const hashedPassword = await hashPassword(password);

        const registerResult = await userMutex.run(async () => {
          const { users } = await getGist();
          const userList = Array.isArray(users) ? users : [];
          const existing = userList.find(u => u && u.username && u.username.toLowerCase() === username.toLowerCase());
          if (existing) {
            return { error: 'Tên tài khoản này đã có người sử dụng!', code: 400 };
          }

          const newUser = {
            username: username,
            password: hashedPassword,
            phone: cleanPhoneDigits,
            email: email,
            createdAt: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
          };

          userList.unshift(newUser);
          await updateGist({ users: userList.slice(0, AUTH_CONFIG.maxUsersLimit) });
          return { success: true, user: newUser };
        });

        if (registerResult.error) {
          return res.status(registerResult.code || 400).json({ success: false, error: registerResult.error });
        }

        const token = signUserToken(registerResult.user.username);
        return res.status(200).json({
          success: true,
          message: 'Đăng ký tài khoản thành công!',
          token: token,
          user: { username: registerResult.user.username, phone: maskPhone(registerResult.user.phone), balance: 0 }
        });
      }

      // ──────────────── XỬ LÝ ĐĂNG NHẬP (LOGIN) ────────────────
      if (action === 'login') {
        const { users } = await getGist();
        const userList = Array.isArray(users) ? users : [];
        const user = userList.find(u => u && u.username && u.username.toLowerCase() === username.toLowerCase());

        // Dummy hash execution to prevent timing enumeration
        if (!user) {
          await verifyPassword(password, `${DUMMY_SALT}:${DUMMY_KEY}`);
          return res.status(401).json({ success: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác!' });
        }

        const isMatch = await verifyPassword(password, user.password || '');
        if (!isMatch) {
          return res.status(401).json({ success: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác!' });
        }

        // Tự động nâng cấp hash scrypt cho mật khẩu legacy (chưa có :)
        if (user.password && !user.password.includes(':')) {
          userMutex.run(async () => {
            const freshGist = await getGist();
            const freshUsers = Array.isArray(freshGist.users) ? freshGist.users : [];
            const idx = freshUsers.findIndex(u => u && u.username && u.username.toLowerCase() === username.toLowerCase());
            if (idx >= 0 && !freshUsers[idx].password.includes(':')) {
              freshUsers[idx].password = await hashPassword(password);
              await updateGist({ users: freshUsers });
            }
          }).catch(err => console.warn('Hash upgrade warning:', err.message));
        }

        const token = signUserToken(user.username);
        return res.status(200).json({
          success: true,
          message: 'Đăng nhập thành công!',
          token: token,
          user: { username: user.username, phone: maskPhone(user.phone), balance: Number(user.balance) || 0 }
        });
      }
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Auth API Internal Error:', err);
    return res.status(500).json({ success: false, error: 'Lỗi máy chủ xác thực.' });
  }
};
