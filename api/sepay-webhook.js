const crypto = require('crypto');
const { getGist, updateGist } = require('./db');
const { parseBody } = require('./_security');
const { storeMutex } = require('./_mutex');
const { applyBankTransaction } = require('./_payments');

const SEPAY_CONFIG = Object.freeze({
  minTransferAmount: 10000
});

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  // ── XÁC THỰC WEBHOOK SEPAY (API KEY, SO SÁNH TIMING-SAFE, KHÔNG CÓ KEY MẶC ĐỊNH) ──
  const activeKey = process.env.SEPAY_API_KEY;
  if (!activeKey) {
    console.error('CRITICAL: SEPAY_API_KEY environment variable is not configured.');
    return res.status(500).json({ success: false, error: 'Cấu hình bảo mật máy chủ chưa hoàn tất.' });
  }

  const authHeader = String((req.headers && req.headers['authorization']) || '').trim();
  const isAuthValid = constantTimeEqual(authHeader, 'Apikey ' + activeKey) ||
                      constantTimeEqual(authHeader, 'Bearer ' + activeKey);

  if (!isAuthValid) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const body = await parseBody(req);

    const transferType = String(body.transferType || '').toLowerCase().trim();
    const rawAmount = body.transferAmount !== undefined ? body.transferAmount : body.amount_in;
    const amount = Number(rawAmount);
    const rawContent = typeof body.content === 'string' ? body.content
      : (typeof body.transaction_content === 'string' ? body.transaction_content : '');
    const sepayId = (body.id !== undefined && body.id !== null) ? String(body.id).trim().substring(0, 50) : '';
    const refCode = String(body.referenceCode || body.reference_number || '').trim().substring(0, 50);

    // Chỉ nhận giao dịch tiền vào (in)
    if (transferType !== 'in') {
      return res.status(200).json({ success: true, message: 'Bỏ qua: Không phải giao dịch tiền vào (in)' });
    }
    if (!Number.isFinite(amount) || amount < SEPAY_CONFIG.minTransferAmount) {
      return res.status(200).json({ success: true, message: 'Bỏ qua: Số tiền không hợp lệ hoặc dưới ' + SEPAY_CONFIG.minTransferAmount + 'đ' });
    }
    if (!sepayId && !refCode) {
      return res.status(400).json({ success: false, error: 'Thiếu mã giao dịch (id / referenceCode)' });
    }

    // ── XỬ LÝ TRONG KHÓA DÙNG CHUNG (CHỐNG RACE / LOST UPDATE / DUYỆT TRÙNG) ──
    const result = await storeMutex.run(async () => {
      const data = await getGist();
      const r = applyBankTransaction(data, { sepayId, refCode, amount, content: rawContent });

      if (r.status === 'approved') {
        await updateGist({ orders: data.orders, users: data.users, processed: data.processed });
        return { success: true, action: 'order_approved', orderId: r.order.id };
      }
      if (r.status === 'duplicate') {
        return { success: true, message: 'Giao dịch đã được xử lý trước đó (Idempotent)' };
      }
      if (r.status === 'underpaid') {
        console.warn('SePay: underpayment for order', r.order && r.order.id, 'amount', amount);
        return { success: true, message: 'Bỏ qua: Số tiền chuyển thấp hơn giá trị đơn hàng.' };
      }
      return { success: true, message: 'Bỏ qua: Giao dịch ngân hàng không khớp đơn hàng nào trên shop (bill ngoài).' };
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('SePay Webhook Error in order processing:', err && err.message);
    // 500 => SePay sẽ gửi lại; việc xử lý là idempotent nên an toàn.
    return res.status(500).json({ success: false, error: 'Lỗi xử lý webhook.' });
  }
};
