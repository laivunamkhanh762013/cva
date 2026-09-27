const https = require('https');
const { getGist, updateGist } = require('./db');

// Danh sách từ cấm / từ thông dụng trong ngân hàng không được dùng làm từ khóa đối soát
const STOP_WORDS = new Set([
  'MB', 'BANK', 'MBBANK', 'NAPAS', 'QR', 'VIETQR', 'CK', 'CHUYEN', 'TIEN',
  'KHOAN', 'GD', 'VND', 'DONG', 'NGAN', 'HANG', 'THE', 'CAO', 'MUA', 'HANG',
  'ADMIN', 'DAIPHU', 'THANHTOAN', 'NGAY', 'THANG', 'NAM'
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
    const apiKey = process.env.SEPAY_API_KEY || 'YG0WPAOZFIXMRWGGRUDHJGPSBZ9TWJPUYIOLK3O8N1CEKQ6NLI0VJRALXUCJYHMV';
    const options = {
      hostname: 'userapi.sepay.vn',
      path: path,
      method: 'GET',
      rejectUnauthorized: false,
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { memo, orderId, price, user } = req.query;

  // Strix Security Guard: Clean & validate tokens
  const cleanMemo = cleanToken(memo);
  const cleanOrderId = cleanToken(orderId);
  const cleanUser = cleanToken(user);

  // Phải có ít nhất 1 mã hợp lệ (độ dài >= 3 và không nằm trong STOP_WORDS)
  const validKeys = [];
  [cleanMemo, cleanOrderId, cleanUser].forEach(k => {
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
    const result = await fetchSePay('/userapi/transactions/list?limit=50');
    if (result.status !== 200) {
      return res.status(502).json({ error: 'SePay error status ' + result.status });
    }

    const transactions = result.data.transactions || [];
    const parsedPrice = parseFloat(price);
    const minAmount = (!isNaN(parsedPrice) && parsedPrice > 0) ? parsedPrice : 0;

    // Strix AI Matching Engine: Khớp giao dịch nạp tiền
    const matched = transactions.find(t => {
      // Chuẩn hóa nội dung chuyển khoản từ MBBank (bỏ dấu tiếng Việt, viết hoa)
      const rawContent = (t.transaction_content || '');
      const content = cleanToken(rawContent);
      const amountIn = parseFloat(t.amount_in || 0);

      // Số tiền thực nhận phải >= 90% giá gói (nếu có giá), tối thiểu >= 10.000đ để tránh spam 1đ
      const hasValidAmount = (minAmount > 0) ? (amountIn >= (minAmount * 0.9)) : (amountIn >= 10000);
      if (!hasValidAmount) return false;

      // Khớp một trong các mã hợp lệ (Username hoặc Mã DP...)
      const matchesKey = validKeys.some(key => {
        return content.includes(key);
      });

      return matchesKey;
    });

    if (matched) {
      const txRef = matched.reference_number || String(matched.id);

      // Tự động cập nhật trạng thái đơn thành 'approved' trong Database
      try {
        const { orders } = await getGist();
        if (orders && orders.length) {
          let updated = false;
          orders.forEach(o => {
            const isMatch = (cleanOrderId && o.id === cleanOrderId) ||
                            (cleanMemo && (o.id === cleanMemo || cleanToken(o.user) === cleanMemo)) ||
                            (cleanUser && cleanToken(o.user) === cleanUser);
            if (isMatch && o.status !== 'approved') {
              o.status = 'approved';
              o.txId = txRef;
              updated = true;
            }
          });
          if (updated) {
            await updateGist({ orders });
          }
        }
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
