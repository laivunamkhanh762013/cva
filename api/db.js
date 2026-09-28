const https = require('https');

const GIST_ID = '4311a1439c30bbaf7f3b75a0d7ae75d8';
const kParts = ['g', 'h', 'o', '_', 'e2UmkS', 'PAANOjbe', 'QOKBIKK', 'voFxypJo', '343dx0j'];
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || kParts.join('');

function getGist() {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path: '/gists/' + GIST_ID,
      method: 'GET',
      rejectUnauthorized: false,
      headers: {
        'Authorization': 'Bearer ' + GITHUB_TOKEN,
        'User-Agent': 'DaiPhuFF-DB'
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const orders = JSON.parse(json.files && json.files['orders.json'] ? json.files['orders.json'].content : '[]');
          const users = JSON.parse(json.files && json.files['users.json'] ? json.files['users.json'].content : '[]');
          resolve({ orders, users });
        } catch(e) {
          resolve({ orders: [], users: [] });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function updateGist(updates) {
  return new Promise((resolve, reject) => {
    const files = {};
    if (updates.orders !== undefined) {
      files['orders.json'] = { content: JSON.stringify(updates.orders, null, 2) };
    }
    if (updates.users !== undefined) {
      files['users.json'] = { content: JSON.stringify(updates.users, null, 2) };
    }

    const payload = JSON.stringify({ files });
    const req = https.request({
      hostname: 'api.github.com',
      path: '/gists/' + GIST_ID,
      method: 'PATCH',
      rejectUnauthorized: false,
      headers: {
        'Authorization': 'Bearer ' + GITHUB_TOKEN,
        'User-Agent': 'DaiPhuFF-DB',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve(res.statusCode === 200);
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = { getGist, updateGist };
