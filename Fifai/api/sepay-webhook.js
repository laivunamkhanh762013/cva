const { getGist, updateGist } = require('./db');
const { parseBody } = require('./_security');

const SEPAY_API_KEY = process.env.SEPAY_API_KEY || 'YG0WPAOZFIXMRWGGRUDHJGPSBZ9TWJPUYIOLK3O8N1CEKQ6NLI0VJRALXUCJYHMV';

function stripVietnamese(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function cleanToken(str) {
  if (!str || typeof str !== 'string') return '';
  return stripVietnamese(str.trim()).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ── XÁC THỰC BẢO MẬT WEBHOOK SEPAY ──
  const authHeader = req.headers && req.headers['authorization'];
  const expectedAuth = 'Apikey ' + SEPAY_API_KEY;
  const expectedBearer = 'Bearer ' + SEPAY_API_KEY;

  if (authHeader !== expectedAuth && authHeader !== expectedBearer && authHeader !== SEPAY_API_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid SePay Webhook Signature' });
  }

  try {
    const body = await parseBody(req);
    const transferType = String(body.transferType || '').toLowerCase();
    const amount = parseFloat(body.transferAmount || body.amount_in || 0);
    const rawContent = String(body.content || body.transaction_content || '');
    const refCode = String(body.referenceCode || body.reference_number || body.id || '').trim();

    // Chỉ nhận giao dịch tiền vào (tiền nạp), tối thiểu 10.000đ
    if (transferType !== 'in' && transferType !== '') {
      return res.status(200).json({ success: true, message: 'Bỏ qua: Không phải giao dịch tiền vào' });
    }
    if (amount < 10000) {
      return res.status(200).json({ success: true, message: 'Bỏ qua: Số tiền dưới 10.000đ' });
    }
    if (!refCode) {
      return res.status(400).json({ success: false, error: 'Thiếu mã đối soát ngân hàng (referenceCode)' });
    }

    const { orders, users } = await getGist();
    const existingOrders = orders || [];

    // ── KIỂM TRA IDEMPOTENCY (CHỐNG DUPLICATE GIAO DỊCH) ──
    const alreadyProcessed = existingOrders.some(o => o.txId && o.txId.toUpperCase() === refCode.toUpperCase());
    if (alreadyProcessed) {
      return res.status(200).json({ success: true, message: 'Giao dịch đã được xử lý trước đó (Idempotent)' });
    }

    const cleanContent = cleanToken(rawContent);

    // 1. Tìm đơn chờ khớp mã đơn duy nhất (DP...) hoặc tài khoản
    let matchedOrder = existingOrders.find(o => {
      if (o.status === 'approved') return false;
      const expectedPrice = Number(o.price) || 0;
      if (expectedPrice > 0 && amount < expectedPrice) return false; // Không duyệt nếu chuyển thiếu tiền!

      const oId = cleanToken(o.id || '');
      const uName = cleanToken(o.user || '');
      // Ưu tiên khớp chính xác mã đơn DP...
      const matchId = oId && oId.length >= 4 && cleanContent.includes(oId);
      const matchUser = uName && uName.length >= 3 && cleanContent.includes(uName);
      return matchId || matchUser;
    });

    if (matchedOrder) {
      // Khớp đơn đã tạo trên shop -> Duyệt thành công
      matchedOrder.status = 'approved';
      matchedOrder.txId = refCode;
      matchedOrder.price = Math.max(matchedOrder.price || 0, amount);
      await updateGist({ orders: existingOrders });
      return res.status(200).json({ success: true, action: 'order_approved', orderId: matchedOrder.id });
    }

    // Nếu không khớp đơn hàng nào trên shop -> Đây là bill ngoài (tiền cá nhân/chuyển khoản ngoài), bỏ qua!
    return res.status(200).json({
      success: true,
      message: 'Bỏ qua: Giao dịch ngân hàng không khớp đơn hàng nào trên shop (bill ngoài).'
    });
  } catch (err) {
    console.error('SePay Webhook Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
