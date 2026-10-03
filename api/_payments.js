// Logic đối soát giao dịch ngân hàng dùng chung cho sepay-webhook.js và check-payment.js
// (file bắt đầu bằng "_" nên Vercel không deploy thành endpoint).

const https = require('https');

const MAX_PROCESSED_RECORDS = 5000;
const MAX_CONTENT_LENGTH = 500;
const GUEST_USER = 'Khách vãng lai';

// Gọi SePay User API (TLS được xác thực; key chỉ lấy từ env)
function fetchSePay(path) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.SEPAY_API_KEY;
    if (!apiKey) {
      const e = new Error('SEPAY_API_KEY is not configured.');
      e.isConfigError = true;
      return reject(e);
    }
    const req = https.request({
      hostname: process.env.SEPAY_API_HOST || 'userapi.sepay.vn',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'QuocvietAura/1.0'
      }
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(Buffer.concat(chunks).toString('utf8')) });
        } catch (e) {
          reject(new Error('Invalid response from SePay (HTTP ' + res.statusCode + ')'));
        }
      });
    });
    req.setTimeout(10000, () => req.destroy(new Error('SePay request timeout')));
    req.on('error', reject);
    req.end();
  });
}

function stripVietnamese(str) {
  if (!str) return '';
  return String(str)
    .replace(/[đĐ]/g, m => (m === 'đ' ? 'd' : 'D'))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Nội dung CK -> CHỮ HOA không dấu, ký tự lạ thành khoảng trắng
function normalizeContent(str) {
  if (!str || typeof str !== 'string') return '';
  return stripVietnamese(str.substring(0, MAX_CONTENT_LENGTH)).toUpperCase().replace(/[^A-Z0-9]+/g, ' ');
}

function cleanCode(str) {
  if (!str || typeof str !== 'string') return '';
  return stripVietnamese(str).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Mã phải xuất hiện và KHÔNG bị nối tiếp bởi chữ số
// (tránh memo NX12345 khớp nhầm vào nội dung chứa NX123456).
function contentHasCode(normalizedContent, code) {
  const c = cleanCode(code);
  if (!c || c.length < 5) return false;
  const compact = normalizedContent.replace(/ /g, '');
  return new RegExp(c + '(?![0-9])').test(normalizedContent) || new RegExp(c + '(?![0-9])').test(compact);
}

function isTopupOrder(o) {
  if (!o) return false;
  if (o.type === 'topup') return true;
  const p = String(o.product || '').toLowerCase();
  const pl = String(o.plan || '').toLowerCase();
  return p.includes('nạp') || pl.includes('nạp');
}

function txKeys(tx) {
  const keys = [];
  if (tx.sepayId) keys.push('SEPAY:' + String(tx.sepayId).trim().toUpperCase());
  if (tx.refCode) keys.push('REF:' + String(tx.refCode).trim().toUpperCase());
  return keys;
}

function isProcessed(data, tx) {
  const keys = new Set(txKeys(tx));
  const processed = Array.isArray(data.processed) ? data.processed : [];
  for (const p of processed) {
    if (!p) continue;
    if (p.id && keys.has('SEPAY:' + String(p.id).toUpperCase())) return true;
    if (p.ref && keys.has('REF:' + String(p.ref).toUpperCase())) return true;
  }
  // Tương thích dữ liệu cũ: txId lưu trên đơn hàng
  const raw = new Set([tx.sepayId, tx.refCode].filter(Boolean).map(v => String(v).trim().toUpperCase()));
  const orders = Array.isArray(data.orders) ? data.orders : [];
  return orders.some(o => o && o.txId && raw.has(String(o.txId).trim().toUpperCase()));
}

function creditTopupIfNeeded(data, order, amount) {
  if (!isTopupOrder(order) || order.credited) return false;
  if (!order.user || order.user === GUEST_USER) return false;
  const users = Array.isArray(data.users) ? data.users : [];
  const u = users.find(x => x && typeof x.username === 'string' && x.username.toLowerCase() === String(order.user).toLowerCase());
  if (!u) return false;
  const credit = Math.floor(Number(amount));
  if (!Number.isFinite(credit) || credit <= 0) return false;
  u.balance = (Number(u.balance) || 0) + credit;
  order.credited = true;
  order.creditedAmount = credit;
  return true;
}

/**
 * Áp một giao dịch tiền vào lên dữ liệu (mutate `data`). Gọi BÊN TRONG storeMutex,
 * với dữ liệu vừa đọc mới nhất từ Gist.
 * tx = { sepayId, refCode, amount, content, onlyOrderId? }
 * Trả về { status: 'duplicate' | 'unmatched' | 'underpaid' | 'approved', order? }
 */
function applyBankTransaction(data, tx) {
  if (!Array.isArray(data.orders)) data.orders = [];
  if (!Array.isArray(data.users)) data.users = [];
  if (!Array.isArray(data.processed)) data.processed = [];

  if (!tx.sepayId && !tx.refCode) return { status: 'unmatched' };
  if (isProcessed(data, tx)) return { status: 'duplicate' };

  const amount = Number(tx.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { status: 'unmatched' };

  const content = normalizeContent(tx.content);
  const candidates = data.orders.filter(o => {
    if (!o || o.status !== 'pending') return false;
    if (tx.onlyOrderId && o.id !== tx.onlyOrderId) return false;
    return contentHasCode(content, o.memo) || contentHasCode(content, o.id);
  });
  if (candidates.length === 0) return { status: 'unmatched' };

  const order = candidates.find(o => {
    const price = Number(o.price);
    return Number.isFinite(price) && price > 0 && amount >= price;
  });
  if (!order) return { status: 'underpaid', order: candidates[0] };

  order.status = 'approved';
  order.txId = String(tx.refCode || tx.sepayId);
  if (tx.sepayId) order.sepayId = String(tx.sepayId);
  order.paidAmount = amount;
  order.paidAt = Date.now();
  creditTopupIfNeeded(data, order, amount);

  data.processed.push({
    id: tx.sepayId ? String(tx.sepayId) : '',
    ref: tx.refCode ? String(tx.refCode) : '',
    orderId: order.id,
    amount,
    at: Date.now()
  });
  if (data.processed.length > MAX_PROCESSED_RECORDS) {
    data.processed = data.processed.slice(-MAX_PROCESSED_RECORDS);
  }

  return { status: 'approved', order };
}

module.exports = {
  GUEST_USER,
  fetchSePay,
  stripVietnamese,
  normalizeContent,
  cleanCode,
  contentHasCode,
  isTopupOrder,
  isProcessed,
  creditTopupIfNeeded,
  applyBankTransaction
};
