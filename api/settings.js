const { getGist, updateGist } = require('./db');
const { verifyAdminToken, parseBody, checkApiDdos } = require('./_security');
const { storeMutex } = require('./_mutex');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const ddos = checkApiDdos(req, 120, 60000);
  if (!ddos.allowed) {
    return res.status(429).json({ success: false, error: 'Too Many Requests' });
  }

  try {
    // ════════ GET: LẤY CẤU HÌNH HỆ THỐNG / CHẾ ĐỘ BẢO TRÌ ════════
    if (req.method === 'GET') {
      try {
        const { settings } = await getGist();
        const cfg = settings || {};
        return res.status(200).json({
          success: true,
          maintenance: Boolean(cfg.maintenance),
          maintenanceMsg: cfg.maintenanceMsg || 'Hệ thống QuocvietAura đang tiến hành nâng cấp & bảo trì định kỳ. Quý khách vui lòng quay lại sau ít phút hoặc liên hệ Admin Zalo.',
          notice: cfg.notice || '',
          updatedAt: cfg.updatedAt || null
        });
      } catch (err) {
        // Nếu lỗi Gist, fallback safe để không chặn người dùng
        return res.status(200).json({
          success: true,
          maintenance: false,
          maintenanceMsg: ''
        });
      }
    }

    // ════════ POST: BẬT / TẮT CHẾ ĐỘ BẢO TRÌ (CHỈ ADMIN) ════════
    if (req.method === 'POST') {
      const isAdmin = verifyAdminToken(req);
      if (!isAdmin) {
        return res.status(403).json({ success: false, error: 'Quyền hạn bị từ chối: Chỉ Quản trị viên mới được thay đổi cài đặt hệ thống!' });
      }

      const body = await parseBody(req);
      const isMaintenance = Boolean(body.maintenance);
      const maintenanceMsg = typeof body.maintenanceMsg === 'string' && body.maintenanceMsg.trim()
        ? body.maintenanceMsg.trim().substring(0, 500)
        : 'Hệ thống QuocvietAura đang tiến hành nâng cấp & bảo trì định kỳ. Quý khách vui lòng quay lại sau ít phút hoặc liên hệ Admin Zalo.';

      const updatedSettings = await storeMutex.run(async () => {
        let current = {};
        try {
          const data = await getGist();
          current = data.settings || {};
        } catch (e) {
          current = {};
        }

        const newSettings = Object.assign({}, current, {
          maintenance: isMaintenance,
          maintenanceMsg: maintenanceMsg,
          updatedAt: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
          updatedBy: isAdmin.user || 'admin'
        });

        await updateGist({ settings: newSettings });
        return newSettings;
      });

      return res.status(200).json({
        success: true,
        message: isMaintenance ? '🔴 Đã BẬT chế độ bảo trì toàn hệ thống.' : '🟢 Đã TẮT bảo trì, hệ thống hoạt động bình thường.',
        settings: updatedSettings
      });
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Settings API Error:', err);
    return res.status(500).json({ success: false, error: 'Lỗi hệ thống máy chủ.' });
  }
};
