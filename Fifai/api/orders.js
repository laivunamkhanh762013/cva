const { getGist, updateGist } = require('./db');

function sanitizeText(str, maxLen) {
  if (!str) return '';
  return String(str).replace(/[<>'"]/g, '').trim().substring(0, maxLen || 50);
}

function checkIsAdmin(req, body) {
  let queryKey = req.query && req.query.adminKey;
  if (!queryKey && req.url && req.url.includes('?')) {
    try {
      const u = new URL(req.url, 'http://localhost');
      queryKey = u.searchParams.get('adminKey');
    } catch(e) {}
  }
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
  if (!body && (req.method === 'POST' || req.method === 'DELETE')) {
    try {
      body = await new Promise(resolve => {
        let d = '';
        req.on('data', chunk => d += chunk);
        req.on('end', () => {
          try { resolve(JSON.parse(d)); } catch(e) { resolve({}); }
        });
        req.on('error', () => resolve({}));
      });
    } catch(e) {
      body = {};
    }
  } else if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) { body = {}; }
  }
  body = body || {};

  const isAdmin = checkIsAdmin(req, body);

  let query = req.query || {};
  if (req.url && req.url.includes('?')) {
    try {
      const u = new URL(req.url, 'http://localhost');
      query = Object.assign({}, Object.fromEntries(u.searchParams), query);
    } catch(e) {}
  }

  try {
    if (req.method === 'GET') {
      const { orders } = await getGist();
      return res.status(200).json({ success: true, orders: orders || [] });
    }

    if (req.method === 'DELETE') {
      if (!isAdmin) {
        return res.status(403).json({ success: false, error: 'Strix Guard: Bạn không có quyền xóa đơn hàng!' });
      }
      const targetId = String(query.id || body.id || '').replace(/[^a-zA-Z0-9_-]/g, '').trim().toUpperCase();
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
      if ((body._delete === true || body._action === 'delete') && (body.id || query.id)) {
        if (!isAdmin) {
          return res.status(403).json({ success: false, error: 'Strix Guard: Cần quyền Admin để xóa đơn hàng!' });
        }
        const cleanId = String(body.id || query.id).replace(/[^a-zA-Z0-9_-]/g, '').trim().toUpperCase();
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

      const cleanTxId = sanitizeText(body.txId, 40);
      if (status === 'approved' && cleanTxId) {
        const dupTx = orders.find(o => o.id !== cleanId && o.status === 'approved' && o.txId && o.txId.toUpperCase() === cleanTxId.toUpperCase());
        if (dupTx) {
          return res.status(409).json({ success: false, error: 'Mã giao dịch ngân hàng ' + cleanTxId + ' đã được dùng cho đơn ' + dupTx.id });
        }
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
        txId: cleanTxId || (existingIdx >= 0 ? orders[existingIdx].txId : '')
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
