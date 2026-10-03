const https = require('https');
const { verifyAdminToken } = require('./_security');

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
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ── KIỂM TRA QUYỀN ADMIN BẰNG TOKEN SERVER (KHÔNG TRUYỀN KEY QUA URL) ──
  const isAdmin = verifyAdminToken(req);
  if (!isAdmin) {
    return res.status(401).json({
      status: 401,
      error: 'Unauthorized: Bạn cần đăng nhập Admin để xem lịch sử giao dịch MBBank.'
    });
  }

  try {
    let query = req.query || {};
    if (req.url && req.url.includes('?')) {
      try {
        const u = new URL(req.url, 'http://localhost');
        query = Object.assign({}, Object.fromEntries(u.searchParams), query);
      } catch(e) {}
    }

    const limit = Math.min(parseInt(query.limit, 10) || 50, 100);
    const result = await fetchSePay('/userapi/transactions/list?limit=' + limit);
    return res.status(result.status).json(result.data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
