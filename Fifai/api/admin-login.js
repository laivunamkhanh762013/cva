const {
  verifyAdminPassword,
  signAdminToken,
  verifyAdminToken,
  checkRateLimit,
  recordFailedLogin,
  resetFailedLogin,
  parseBody
} = require('./_security');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
    let action = body.action || '';
    if ((req.url && req.url.includes('action=logout')) || body.logout) action = 'logout';

    // ── ĐĂNG XUẤT ──
    if (action === 'logout') {
      res.setHeader('Set-Cookie', 'admin_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
      return res.status(200).json({ success: true, message: 'Đã đăng xuất an toàn.' });
    }

    // ── RATE LIMITING ──
    const rateCheck = checkRateLimit(req);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `Bạn đã nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau ${rateCheck.retryAfterSeconds} giây!`
      });
    }

    const { password } = body;
    if (!password) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập mật khẩu quản trị!' });
    }

    const isMatch = verifyAdminPassword(password);
    if (!isMatch) {
      recordFailedLogin(req);
      const updatedRate = checkRateLimit(req);
      return res.status(401).json({
        success: false,
        error: `Mật khẩu quản trị không chính xác! (Còn ${updatedRate.remaining} lần thử)`
      });
    }

    // Đăng nhập thành công -> Reset rate limit & Cấp Token
    resetFailedLogin(req);
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

  return res.status(405).json({ error: 'Method Not Allowed' });
};
