const {
  verifyAdminPassword,
  signAdminToken,
  verifyAdminToken,
  isAdminConfigured,
  checkRateLimit,
  recordFailedLogin,
  resetFailedLogin,
  parseBody
} = require('./_security');

// Endpoint quản trị: chỉ dùng cùng origin => KHÔNG trả header CORS
// (trước đây '*' + Allow-Credentials: true là cấu hình sai).
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    // ── KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP ──
    if (req.method === 'GET') {
      const verified = verifyAdminToken(req);
      if (verified) {
        return res.status(200).json({ authenticated: true, role: 'admin' });
      }
      return res.status(200).json({ authenticated: false });
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      let action = typeof body.action === 'string' ? body.action : '';
      if ((req.url && req.url.includes('action=logout')) || body.logout) action = 'logout';

      // ── ĐĂNG XUẤT ──
      if (action === 'logout') {
        res.setHeader('Set-Cookie', 'admin_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
        return res.status(200).json({ success: true, message: 'Đã đăng xuất an toàn.' });
      }

      if (!isAdminConfigured()) {
        console.error('CRITICAL: ADMIN_PASSWORD / ADMIN_PASS_SHA256 or JWT_SECRET is not configured.');
        return res.status(500).json({ success: false, error: 'Máy chủ chưa cấu hình tài khoản quản trị.' });
      }

      // ── RATE LIMITING ──
      const rateCheck = checkRateLimit(req, 'admin');
      if (!rateCheck.allowed) {
        return res.status(429).json({
          success: false,
          error: `Bạn đã nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau ${rateCheck.retryAfterSeconds} giây!`
        });
      }

      const password = typeof body.password === 'string' ? body.password : '';
      if (!password) {
        return res.status(400).json({ success: false, error: 'Vui lòng nhập mật khẩu quản trị!' });
      }

      const isMatch = verifyAdminPassword(password);
      if (!isMatch) {
        recordFailedLogin(req, 'admin');
        const updatedRate = checkRateLimit(req, 'admin');
        return res.status(401).json({
          success: false,
          error: `Mật khẩu quản trị không chính xác! (Còn ${updatedRate.remaining} lần thử)`
        });
      }

      // Đăng nhập thành công -> Reset rate limit & Cấp Token
      resetFailedLogin(req, 'admin');
      const token = signAdminToken(86400000); // 24 giờ

      const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
      const cookieHeader = `admin_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${isProd ? '; Secure' : ''}`;
      res.setHeader('Set-Cookie', cookieHeader);

      return res.status(200).json({
        success: true,
        token: token,
        message: 'Xác thực máy chủ thành công!'
      });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Admin login error:', err && err.message);
    return res.status(500).json({ success: false, error: 'Lỗi máy chủ.' });
  }
};
