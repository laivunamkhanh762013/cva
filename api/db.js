
function parseViTime(str) {
  if (!str) return 0;
  const m = String(str).match(/(\d{1,2}):(\d{1,2}):(\d{1,2})[^\d]+(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(m[6], m[5]-1, m[4], m[1], m[2], m[3]).getTime();
  return 0;
}

const https = require('https');

const GIST_ID = process.env.GIST_ID || '4311a1439c30bbaf7f3b75a0d7ae75d8';
const REQUEST_TIMEOUT_MS = 10000;
const PENDING_TTL_MS = 3600000;
const FILES = Object.freeze({
  orders: 'orders.json',
  users: 'users.json',
  processed: 'processed_tx.json', // Sổ giao dịch ngân hàng đã xử lý (chống replay / duyệt trùng)
  settings: 'settings.json'
});

function getToken() {
  const t = process.env.GITHUB_TOKEN;
  if (!t) {
    const err = new Error('GITHUB_TOKEN is not configured.');
    err.isConfigError = true;
    throw err;
  }
  return t;
}

function httpsRequest(options, payload) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error('GitHub request timeout')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function readFileContent(file) {
  if (!file) return null;
  if (!file.truncated) return file.content;
  // File > 1MB bị GitHub cắt bớt trong API -> tải bản đầy đủ qua raw_url
  const u = new URL(file.raw_url);
  const r = await httpsRequest({
    hostname: u.hostname,
    path: u.pathname + u.search,
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + getToken(), 'User-Agent': 'QuocvietAura-DB' }
  });
  if (r.status !== 200) throw new Error('Gist raw fetch failed: HTTP ' + r.status);
  return r.body;
}

function parseArray(content, name) {
  if (content === null || content === undefined || content === '') return [];
  const v = JSON.parse(content);
  if (!Array.isArray(v)) throw new Error('Gist file ' + name + ' is not an array');
  return v;
}

function parseObject(content, name) {
  if (content === null || content === undefined || content === '') return {};
  try {
    const v = JSON.parse(content);
    return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
  } catch(e) {
    return {};
  }
}

// QUAN TRỌNG: Mọi lỗi đọc đều throw (không trả về mảng rỗng), để tránh
// việc ghi đè làm MẤT toàn bộ đơn hàng / tài khoản khi GitHub lỗi tạm thời.
async function getGist() {
  const r = await httpsRequest({
    hostname: 'api.github.com',
    path: '/gists/' + GIST_ID,
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + getToken(),
      'User-Agent': 'QuocvietAura-DB',
      'Accept': 'application/vnd.github+json'
    }
  });
  if (r.status !== 200) throw new Error('Gist read failed: HTTP ' + r.status);

  const json = JSON.parse(r.body);
  const files = (json && json.files) || {};
  let orders = parseArray(await readFileContent(files[FILES.orders]), FILES.orders);
  const users = parseArray(await readFileContent(files[FILES.users]), FILES.users);
  const processed = parseArray(await readFileContent(files[FILES.processed]), FILES.processed);
  const settings = parseObject(await readFileContent(files[FILES.settings]), FILES.settings);

  // Ẩn đơn pending quá 1 giờ (chỉ lọc trong bộ nhớ; sẽ được lưu ở lần ghi kế tiếp
  // bên trong mutex — không ghi nền ngoài khóa để tránh lost update).
  const now = Date.now();
  orders = orders.filter(o => {
    if (o && o.status === 'pending') {
      const ts = o.createdAt || parseViTime(o.time);
      if (ts > 0 && now - ts > PENDING_TTL_MS) return false;
    }
    return true;
  });

  return { orders, users, processed, settings };
}

async function updateGist(updates) {
  const files = {};
  if (updates.orders !== undefined) {
    files[FILES.orders] = { content: JSON.stringify(updates.orders, null, 2) };
  }
  if (updates.users !== undefined) {
    files[FILES.users] = { content: JSON.stringify(updates.users, null, 2) };
  }
  if (updates.processed !== undefined) {
    files[FILES.processed] = { content: JSON.stringify(updates.processed) };
  }
  if (updates.settings !== undefined) {
    files[FILES.settings] = { content: JSON.stringify(updates.settings, null, 2) };
  }
  if (Object.keys(files).length === 0) return true;

  const payload = JSON.stringify({ files });
  const r = await httpsRequest({
    hostname: 'api.github.com',
    path: '/gists/' + GIST_ID,
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer ' + getToken(),
      'User-Agent': 'QuocvietAura-DB',
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, payload);
  if (r.status !== 200) throw new Error('Gist write failed: HTTP ' + r.status);
  return true;
}

module.exports = { getGist, updateGist };

