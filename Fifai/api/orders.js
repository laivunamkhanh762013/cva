const { getGist, updateGist } = require('./db');

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
      const { orders } = await getGist();
      return res.status(200).json({ success: true, orders: orders || [] });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
      }

      if (!body || !body.id) {
        return res.status(400).json({ success: false, error: 'Thiếu mã đơn hàng' });
      }

      // Strix Security Guard: Sanitize ID strictly
      const cleanId = String(body.id).replace(/[^a-zA-Z0-9_-]/g, '').trim().toUpperCase().substring(0, 20);
      if (cleanId.length < 5) {
        return res.status(400).json({ success: false, error: 'Mã đơn không hợp lệ' });
      }

      const { orders, users } = await getGist();
      const existingIdx = orders.findIndex(o => o.id === cleanId);

      const validStatuses = ['pending', 'approved', 'rejected'];
      const rawStatus = (body.status || 'pending').toLowerCase();
      const status = validStatuses.includes(rawStatus) ? rawStatus : 'pending';

      const orderItem = {
        id: cleanId,
        product: sanitizeText(body.product, 60) || 'AimLock FF',
        plan: sanitizeText(body.plan, 40) || '1 tháng',
        price: typeof body.price === 'number' ? Math.max(0, body.price) : (parseFloat(body.price) || 0),
        user: sanitizeText(body.user, 40) || 'Khách vãng lai',
        phone: sanitizeText(body.phone, 15) || '',
        time: body.time ? sanitizeText(body.time, 35) : new Date().toLocaleString('vi-VN'),
        status: status,
        txId: sanitizeText(body.txId, 40) || ''
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
