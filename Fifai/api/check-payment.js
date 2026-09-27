const https = require('https');

function fetchSePay(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'my.sepay.vn',
      path: path,
      method: 'GET',
      rejectUnauthorized: false,
      headers: {
        'Authorization': 'Bearer YG0WPAOZFIXMRWGGRUDHJGPSBZ9TWJPUYIOLK3O8N1CEKQ6NLI0VJRALXUCJYHMV',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { memo, price } = req.query;

  if (!memo) {
    return res.status(400).json({ error: 'Missing memo query parameter' });
  }

  try {
    const result = await fetchSePay('/userapi/transactions/list?limit=50');
    if (result.status !== 200) {
      return res.status(502).json({ error: 'SePay error status ' + result.status });
    }

    const transactions = result.data.transactions || [];
    const normalizedMemo = memo.trim().toUpperCase();
    const minAmount = price ? parseFloat(price) : 0;

    // Check if any transaction content contains the order code (e.g. DP708251)
    const matched = transactions.find(t => {
      const content = (t.transaction_content || '').toUpperCase();
      const amountIn = parseFloat(t.amount_in || 0);
      return content.includes(normalizedMemo) && (minAmount === 0 || amountIn >= (minAmount * 0.9));
    });

    if (matched) {
      return res.status(200).json({
        paid: true,
        message: 'Đã xác nhận nhận đủ tiền từ MBBank!',
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
      message: 'Chưa thấy giao dịch tiền vào khớp mã ' + normalizedMemo + ' trên MBBank.'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
