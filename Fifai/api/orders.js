const { getGist, updateGist } = require('./db');

function sanitizeText(str, maxLen) {
  if (!str) return '';
  return String(str).replace(/[<>'"]/g, '').trim().substring(0, maxLen || 50);
}

function checkIsAdmin(req, body) {
  const queryKey = req.query && req.query.adminKey;
  const headerKey = req.headers && (req.headers['x-admin-key'] || req.headers['authorization']);
  const bodyKey = body && body.adminKey;
  const provided = queryKey || headerKey || bodyKey || '';
  const clean = String(provided).replace(/^Bearer\s+/i, '').trim();
  return clean === 'daiphu2026' || clean === 'daiphu@admin2025';
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) {}
  }
  body = body || {};

  const isAdmin = checkIsAdmin(req, body);

  try {
    if (req.method === 'GET') {
      const { orders } = await getGist();
      return res.status(200).json({ success: true, orders: orders || [] });
    }

    if (req.method === 'DELETE') {
      if (!isAdmin) {
        return res.status(403).json({ success: false, error: 'Strix Guard: Bạn không có quyền xóa đơn hàng!' });
      }
      const targetId = String(req.query.id || body.id || '').replace(/[^a-zA-Z0-9_-]/g, '').trim().toUpperCase();
      if (!targetId) {
        return res.status(400).json({ success: false, error: 'Thiếu mã đơn cần xóa' });
      }
      const { orders } = await getGist();
      const filtered = (orders || []).filter(o => o.id !== targetId);
      await updateGist({ orders: filtered });
      return res.status(200).json({ success: true, message: 'Đã xóa vĩnh viễn đơn ' + targetId, remaining: filtered.length });
    }

    if (req.method === 'POST') {
      // ── RESET ALL ORDERS (Chỉ Admin) ──
      if (body._reset === true) {
        if (!isAdmin) {
          return res.status(403).json({ success: false, error: 'Strix Guard: Cần quyền Admin để xóa toàn bộ đơn hàng!' });
        }
        await updateGist({ orders: [] });
        return res.status(200).json({ success: true, message: 'All orders cleared.' });
      }

      // ── XÓA 1 ĐƠN HÀNG QUA POST (Chỉ Admin) ──
      if ((body._delete === true || body._action === 'delete') && body.id) {
        if (!isAdmin) {
          return res.status(403).json({ success: false, error: 'Strix Guard: Cần quyền Admin để xóa đơn hàng!' });
        }
        const cleanId = String(body.id).replace(/[^a-zA-Z0-9_-]/g, '').trim().toUpperCase();
        const { orders } = await getGist();
        const filtered = (orders || []).filter(o => o.id !== cleanId);
        await updateGist({ orders: filtered });
        return res.status(200).json({ success: true, message: 'Đã xóa vĩnh viễn đơn ' + cleanId, remaining: filtered.length });
      }

      if (!body.id) {
        return res.status(400).json({ success: false, error: 'Thiếu mã đơn hàng' });
      }

      // Strix Security Guard: Sanitize ID strictly
      const cleanId = String(body.id).replace(/[^a-zA-Z0-9_-]/g, '').trim().toUpperCase().substring(0, 20);
      if (cleanId.length < 5) {
        return res.status(400).json({ success: false, error: 'Mã đơn không hợp lệ' });
      }

      const { orders } = await getGist();
      const existingIdx = orders.findIndex(o => o.id === cleanId);

      // Strix Security Guard: Chỉ Admin hoặc giao dịch có mã xác nhận ngân hàng mới duyệt đơn
      let status = 'pending';
      if (isAdmin && body.status) {
        const validStatuses = ['pending', 'approved', 'rejected'];
        const rawStatus = String(body.status).toLowerCase();
        if (validStatuses.includes(rawStatus)) status = rawStatus;
      } else if (body.status === 'approved' && body.txId) {
        status = 'approved';
      } else if (existingIdx >= 0) {
        status = orders[existingIdx].status || 'pending';
      }

      const orderItem = {
        id: cleanId,
        product: sanitizeText(body.product, 60) || 'AimLock FF',
        plan: sanitizeText(body.plan, 40) || '1 tháng',
        price: typeof body.price === 'number' ? Math.max(0, body.price) : (parseFloat(body.price) || 0),
        user: sanitizeText(body.user, 40) || 'Khách vãng lai',
        phone: sanitizeText(body.phone, 15) || '',
        time: body.time ? sanitizeText(body.time, 35) : new Date().toLocaleString('vi-VN'),
        status: status,
        txId: sanitizeText(body.txId, 40) || (existingIdx >= 0 ? orders[existingIdx].txId : '')
      };

      if (existingIdx >= 0) {
        orders[existingIdx] = Object.assign({}, orders[existingIdx], orderItem);
      } else {
        orders.unshift(orderItem);
      }

      // Giới hạn 300 đơn gần nhất
      const trimmed = orders.slice(0, 300);
      await updateGist({ orders: trimmed });

      return res.status(200).json({ success: true, order: orderItem });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
