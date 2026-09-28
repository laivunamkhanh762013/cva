const { getGist, updateGist } = require('./db');
const { signUserToken } = require('./_security');

function maskPhone(phone) {
  if (!phone || phone.length < 6) return '***';
  return phone.substring(0, 3) + '****' + phone.substring(phone.length - 3);
}

function sanitizeText(str, maxLen) {
  if (!str) return '';
  return String(str).replace(/[<>'"]/g, '').trim().substring(0, maxLen || 50);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { users } = await getGist();
      // Mask sensitive phone numbers & never expose passwords
      const safeUsers = users.map(u => ({
        username: sanitizeText(u.username, 30),
        phone: maskPhone(u.phone),
        createdAt: u.createdAt || ''
      }));
      return res.status(200).json({ success: true, users: safeUsers });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
      }

      const action = body.action || 'login';
      const username = sanitizeText(body.username, 30);
      const password = (body.password || '').trim().substring(0, 100);
      const phone = sanitizeText(body.phone, 15);

      if (!username || username.length < 3) {
        return res.status(400).json({ success: false, error: 'Tên đăng nhập phải có ít nhất 3 ký tự!' });
      }

      if (!password || password.length < 3) {
        return res.status(400).json({ success: false, error: 'Mật khẩu phải có ít nhất 3 ký tự!' });
      }

      const { users } = await getGist();
      const existing = users.find(u => u.username.toLowerCase() === username.toLowerCase());

      if (action === 'register') {
        if (existing) {
          return res.status(400).json({ success: false, error: 'Tên tài khoản này đã có người sử dụng!' });
        }

        const newUser = {
          username: username,
          password: password,
          phone: phone,
          createdAt: new Date().toLocaleString('vi-VN')
        };
        users.unshift(newUser);
        const trimmedUsers = users.slice(0, 500);
        await updateGist({ users: trimmedUsers });

        const token = signUserToken(newUser.username);
        return res.status(200).json({
          success: true,
          message: 'Đăng ký tài khoản thành công!',
          token: token,
          user: { username: newUser.username, phone: newUser.phone }
        });
      } else {
        // Login
        if (!existing) {
          return res.status(400).json({ success: false, error: 'Tài khoản chưa tồn tại! Vui lòng bấm Đăng Ký.' });
        }

        if (existing.password && existing.password !== password) {
          return res.status(401).json({ success: false, error: 'Mật khẩu không chính xác!' });
        }

        const token = signUserToken(existing.username);
        return res.status(200).json({
          success: true,
          message: 'Đăng nhập thành công!',
          token: token,
          user: { username: existing.username, phone: existing.phone }
        });
      }
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
