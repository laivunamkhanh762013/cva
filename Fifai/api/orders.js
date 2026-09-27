const { getGist, updateGist } = require('./db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { orders } = await getGist();
      return res.status(200).json({ success: true, orders });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
      }
      if (!body || !body.id) {
        return res.status(400).json({ success: false, error: 'Thiếu mã đơn hàng' });
      }

      const { orders, users } = await getGist();
      const existingIdx = orders.findIndex(o => o.id === body.id);

      const orderItem = {
        id: body.id,
        product: body.product || 'AimLock FF',
        plan: body.plan || '1 tháng',
        price: body.price || 0,
        user: body.user || 'Khách',
        phone: body.phone || '',
        time: body.time || new Date().toLocaleString('vi-VN'),
        status: body.status || 'pending',
        txId: body.txId || ''
      };

      if (existingIdx >= 0) {
        orders[existingIdx] = Object.assign({}, orders[existingIdx], orderItem);
      } else {
        orders.unshift(orderItem);
      }

      // Limit to 300 recent orders
      const trimmed = orders.slice(0, 300);
      await updateGist({ orders: trimmed });

      return res.status(200).json({ success: true, order: orderItem });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
