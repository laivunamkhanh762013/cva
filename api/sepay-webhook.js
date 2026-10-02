const crypto = require('crypto');
const { getGist, updateGist } = require('./db');
const { parseBody } = require('./_security');
const { Mutex } = require('./_mutex');

const webhookMutex = new Mutex();

const SEPAY_CONFIG = Object.freeze({
  apiKey: process.env.SEPAY_API_KEY,
  minTransferAmount: 10000,
  minTokenMatchLength: 4,
  maxContentLength: 500
});

function stripVietnamese(str) {
  if (!str) return '';
  return str
    .replace(/[đĐ]/g, m => m === 'đ' ? 'd' : 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function cleanToken(str) {
  if (!str || typeof str !== 'string') return '';
  return stripVietnamese(str.trim().substring(0, SEPAY_CONFIG.maxContentLength)).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ── XÁC THỰC BẢO MẬT WEBHOOK SEPAY (SHA-256 TIMING-SAFE, KHÔNG HARDCODE) ──
  const activeKey = SEPAY_CONFIG.apiKey;
  if (!activeKey) {
    console.error('CRITICAL: SEPAY_API_KEY environment variable is not configured.');
    return res.status(500).json({ success: false, error: 'Cấu hình bảo mật máy chủ chưa hoàn tất.' });
  }

  const authHeader = (req.headers && req.headers['authorization']) || '';
  const expectedAuth = 'Apikey ' + activeKey;
  const expectedBearer = 'Bearer ' + activeKey;

  const isAuthValid = constantTimeEqual(authHeader, expectedAuth) ||
                      constantTimeEqual(authHeader, expectedBearer) ||
                      constantTimeEqual(authHeader, activeKey);

  if (!isAuthValid) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid SePay Webhook Signature' });
  }

  try {
    const body = await parseBody(req);
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ success: false, error: 'Dữ liệu webhook không hợp lệ.' });
    }

    const transferType = String(body.transferType || '').toLowerCase().trim();
    const rawAmount = body.transferAmount !== undefined ? body.transferAmount : (body.amount_in !== undefined ? body.amount_in : 0);
    const amount = Number(rawAmount);
    const rawContent = typeof body.content === 'string' ? body.content : (typeof body.transaction_content === 'string' ? body.transaction_content : '');
    const refCode = String(body.referenceCode || body.reference_number || '').trim().substring(0, 50);

    // Chỉ nhận giao dịch tiền vào (in)
    if (transferType !== 'in') {
      return res.status(200).json({ success: true, message: 'Bỏ qua: Không phải giao dịch tiền vào (in)' });
    }
    if (!Number.isFinite(amount) || amount < SEPAY_CONFIG.minTransferAmount) {
      return res.status(200).json({ success: true, message: 'Bỏ qua: Số tiền nạp không hợp lệ hoặc dưới ' + SEPAY_CONFIG.minTransferAmount + 'đ' });
    }
    if (!refCode) {
      return res.status(400).json({ success: false, error: 'Thiếu mã đối soát ngân hàng (referenceCode)' });
    }

    const normalizedContent = cleanToken(rawContent);

    // ── XỬ LÝ ĐỒNG BỘ TRONG MUTEX (CHỐNG RACE CONDITION / LOST UPDATE) ──
    const result = await webhookMutex.run(async () => {
      const gistData = await getGist();
      const existingOrders = Array.isArray(gistData.orders) ? gistData.orders : [];

      // Kiểm tra Idempotency chống duyệt trùng giao dịch O(1) qua Set
      const processedTxSet = new Set(
        existingOrders.filter(o => o.txId).map(o => String(o.txId).toUpperCase())
      );
      if (processedTxSet.has(refCode.toUpperCase())) {
        return { success: true, message: 'Giao dịch đã được xử lý trước đó (Idempotent)' };
      }

      // Tìm đơn chờ khớp mã đơn duy nhất hoặc mã memo
      const matchedOrder = existingOrders.find(o => {
        if (o.status === 'approved') return false;
        const expectedPrice = Number(o.price) || 0;
        if (expectedPrice > 0 && amount < expectedPrice) return false;

        const oId = cleanToken(o.id || '');
        const oMemo = cleanToken(o.memo || '');
        const matchId = oId && oId.length >= SEPAY_CONFIG.minTokenMatchLength && normalizedContent.includes(oId);
        const matchMemo = oMemo && oMemo.length >= SEPAY_CONFIG.minTokenMatchLength && normalizedContent.includes(oMemo);
        return matchId || matchMemo;
      });

      if (matchedOrder) {
        matchedOrder.status = 'approved';
        matchedOrder.txId = refCode;
        matchedOrder.paidAmount = amount; // Lưu số tiền thực nhận riêng biệt, không mutate giá gốc của gói

        // Lưu giữ orders an toàn mà không làm mất các trường khác trong Gist
        await updateGist({ ...gistData, orders: existingOrders });
        return { success: true, action: 'order_approved', orderId: matchedOrder.id };
      }

      return {
        success: true,
        message: 'Bỏ qua: Giao dịch ngân hàng không khớp đơn hàng nào trên shop (bill ngoài).'
      };
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('SePay Webhook Error in order processing:', err.message);
    return res.status(500).json({ success: false, error: 'Lỗi xử lý webhook.' });
  }
};
