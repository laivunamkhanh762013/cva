const https = require('https');
const { getGist, updateGist } = require('./db');
const { verifyAdminToken } = require('./_security');
const { storeMutex } = require('./_mutex');
const { creditTopupIfNeeded } = require('./_payments');

// Danh sách từ cấm / từ thông dụng trong ngân hàng không được dùng làm từ khóa đối soát
const STOP_WORDS = new Set([
  'MB', 'BANK', 'MBBANK', 'NAPAS', 'QR', 'VIETQR', 'CK', 'CHUYEN', 'TIEN',
  'KHOAN', 'GD', 'VND', 'DONG', 'NGAN', 'HANG', 'THE', 'CAO', 'MUA', 'HANG',
  'ADMIN', 'QUOCVIETAURA', 'THANHTOAN', 'NGAY', 'THANG', 'NAM'
]);

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
  const noTones = stripVietnamese(str.trim());
  return noTones.toUpperCase().replace(/[^A-Z0-9_.-]/g, '');
}

function fetchSePay(path) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.SEPAY_API_KEY;
    if (!apiKey) {
      return reject(new Error('SEPAY_API_KEY is not configured.'));
    }
    const options = {
      hostname: 'userapi.sepay.vn',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'curl/7.88.1'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch(e) {
          reject(new Error('Invalid response from SePay: ' + data.substring(0, 150)));
        }
      });
    });
    req.on('error', err => reject(err));
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!verifyAdminToken(req)) {
    return res.status(401).json({ paid: false, error: 'Unauthorized: Chỉ admin mới được dùng tính năng này.' });
  }

  let query = req.query || {};
  if (!query.memo && !query.user && !query.orderId && req.url && req.url.includes('?')) {
    try {
      const u = new URL(req.url, 'http://localhost');
      query = Object.fromEntries(u.searchParams);
    } catch(e) {}
  }

  const { memo, orderId, price, user } = query;

  // Strix Security Guard: Clean & validate tokens
  const cleanMemo = cleanToken(memo);
  const cleanOrderId = cleanToken(orderId);
  const cleanUser = cleanToken(user);

  // Phải có ít nhất 1 mã hợp lệ (độ dài >= 3 và không nằm trong STOP_WORDS)
  const validKeys = [];
  [cleanMemo, cleanOrderId].forEach(k => {
    if (k && k.length >= 3 && !STOP_WORDS.has(k) && !validKeys.includes(k)) {
      validKeys.push(k);
    }
  });

  if (validKeys.length === 0) {
    return res.status(400).json({
      paid: false,
      error: 'Mã đối soát không hợp lệ. Vui lòng sử dụng mã đơn hàng hoặc tên tài khoản (tối thiểu 3 ký tự).'
    });
  }

  try {
    // Tải danh sách đơn hàng đã duyệt để loại trừ các giao dịch đã dùng
    let usedTxIds = new Set();
    let existingOrders = [];
    try {
      const gist = await getGist();
      existingOrders = gist.orders || [];
      existingOrders.forEach(o => {
        if (o.status === 'approved' && o.txId) {
          usedTxIds.add(String(o.txId).trim().toUpperCase());
        }
      });
    } catch(e) {
      console.warn('Load gist in check-payment error:', e.message);
    }

    const result = await fetchSePay('/userapi/transactions/list?limit=50');
    if (result.status !== 200) {
      return res.status(502).json({ error: 'SePay error status ' + result.status });
    }

    const transactions = result.data.transactions || [];
    const parsedPrice = parseFloat(price);
    const minAmount = (!isNaN(parsedPrice) && parsedPrice > 0) ? parsedPrice : 0;

    // Strix AI Matching Engine: Khớp giao dịch nạp tiền (CHỈ KHỚP GIAO DỊCH CHƯA TỪNG DÙNG)
    const matched = transactions.find(t => {
      const ref = String(t.reference_number || t.id || '').trim().toUpperCase();
      if (usedTxIds.has(ref) || usedTxIds.has(String(t.id).trim().toUpperCase())) {
        return false; // Giao dịch này đã duyệt đơn hàng khác rồi, không dùng lại!
      }

      // Chuẩn hóa nội dung chuyển khoản từ MBBank (bỏ dấu tiếng Việt, viết hoa)
      const rawContent = (t.transaction_content || '');
      const content = cleanToken(rawContent);
      const amountIn = parseFloat(t.amount_in || 0);

      // Số tiền thực nhận phải >= 100% giá gói (nếu có giá), tối thiểu >= 10.000đ để tránh spam 1đ
      const hasValidAmount = (minAmount > 0) ? (amountIn === minAmount) : (amountIn >= 10000);
      if (!hasValidAmount) return false;

      // Khớp một trong các mã hợp lệ (Username hoặc Mã DP...)
      const matchesKey = validKeys.some(key => {
        return content.includes(key);
      });

      return matchesKey;
    });

    if (matched) {
      const txRef = matched.reference_number || String(matched.id);

      // Tự động cập nhật trạng thái đơn thành 'approved' trong Database (chạy trong Mutex an toàn)
      try {
        await storeMutex.run(async () => {
          const freshData = await getGist();
          const list = Array.isArray(freshData.orders) ? freshData.orders : [];
          let updated = false;
          let needCreditUser = false;
          list.forEach(o => {
            const isMatch = (cleanOrderId && cleanToken(o.id) === cleanOrderId) ||
                            (cleanMemo && (cleanToken(o.id) === cleanMemo || cleanToken(o.memo) === cleanMemo || cleanToken(o.user) === cleanMemo)) ||
                            (cleanUser && cleanToken(o.user) === cleanUser);
            if (isMatch && o.status !== 'approved') {
              o.status = 'approved';
              o.txId = txRef;
              o.paidAmount = matched.amount_in;
              o.paidAt = Date.now();
              if (creditTopupIfNeeded(freshData, o, matched.amount_in)) {
                needCreditUser = true;
              }
              updated = true;
            }
          });
          if (updated) {
            const updates = { orders: list };
            if (needCreditUser) updates.users = freshData.users;
            await updateGist(updates);
          }
        });
      } catch(dbErr) {
        console.warn('Auto-update DB in check-payment error:', dbErr.message);
      }

      return res.status(200).json({
        paid: true,
        message: 'Đã xác nhận nhận đủ tiền từ MBBank!',
        matchedKey: validKeys.find(k => cleanToken(matched.transaction_content || '').includes(k)),
        transaction: {
          id: matched.id,
          amount: matched.amount_in,
          date: matched.transaction_date,
          content: matched.transaction_content,
          reference: matched.reference_number
        }
      });
    }

    return res.status(200).json({
      paid: false,
      message: 'Chưa thấy giao dịch tiền vào khớp mã [' + validKeys.join(', ') + '] trên MBBank.'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
