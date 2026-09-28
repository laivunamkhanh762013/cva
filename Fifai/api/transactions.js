const https = require('https');

function fetchSePay(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'userapi.sepay.vn',
      path: path,
      method: 'GET',
      rejectUnauthorized: false,
      headers: {
        'Authorization': 'Bearer YG0WPAOZFIXMRWGGRUDHJGPSBZ9TWJPUYIOLK3O8N1CEKQ6NLI0VJRALXUCJYHMV',
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let query = req.query || {};
  if (!query.adminKey && req.url && req.url.includes('?')) {
    try {
      const u = new URL(req.url, 'http://localhost');
      query = Object.assign({}, Object.fromEntries(u.searchParams), query);
    } catch(e) {}
  }

  // Strix Security Guard: Protect bank statement API with Admin auth
  const adminKey = query.adminKey || req.headers['x-admin-key'];
  if (adminKey !== 'daiphu2026') {
    return res.status(401).json({
      status: 401,
      error: 'Unauthorized: Bạn cần quyền Admin (Mật khẩu Admin) để truy cập lịch sử ngân hàng MBBank.'
    });
  }

  try {
    const limit = Math.min(parseInt(query.limit, 10) || 50, 100);
    const result = await fetchSePay('/userapi/transactions/list?limit=' + limit);
    return res.status(result.status).json(result.data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
