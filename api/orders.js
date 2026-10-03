const crypto = require('crypto');
const { getGist, updateGist } = require('./db');
const { verifyAdminToken, verifyUserToken, generateSecureOrderId, parseBody, checkApiDdos, validateOrderId, getClientIp } = require('./_security');
const { getProductInfo, getCanonicalPrice } = require('./_catalog');
const { Mutex } = require('./_mutex');

const orderMutex = new Mutex();

const BANK_CONFIG = Object.freeze({
  bankId: process.env.VIETQR_BANK_ID || 'MB',
  accountNo: process.env.VIETQR_ACCOUNT_NO || '0941414448',
  accountName: process.env.VIETQR_ACCOUNT_NAME || 'BUI VAN CAO'
});

const ORDER_CONFIG = Object.freeze({
  maxOrdersLimit: 300,
  createRateLimitCount: 5,
  createRateLimitWindowMs: 60000,
  maxIpLimitCache: 1000,
  memoCollisionMaxRetries: 50
});

// In-process rate limiter with memory bound & cleanup
const createLimits = new Map();
function isCreationRateLimited(ip) {
  const now = Date.now();
  if (createLimits.size > ORDER_CONFIG.maxIpLimitCache) {
    for (const [k, v] of createLimits.entries()) {
      if (now > v.resetAt) createLimits.delete(k);
    }
    if (createLimits.size > ORDER_CONFIG.maxIpLimitCache) {
      createLimits.clear();
    }
  }
  const entry = createLimits.get(ip) || { count: 0, resetAt: now + ORDER_CONFIG.createRateLimitWindowMs };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + ORDER_CONFIG.createRateLimitWindowMs;
  }
  entry.count++;
  createLimits.set(ip, entry);
  return entry.count > ORDER_CONFIG.createRateLimitCount;
}

// Whitelist-based text sanitizer (Alphanumeric, unicode letters, spaces, safe punctuation)
function sanitizeText(str, maxLen = 50) {
  if (!str) return '';
  return String(str)
    .replace(/[^\p{L}\p{N}\s_.@+-]/gu, '')
    .trim()
    .substring(0, maxLen);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token, x-user-token');

  // Anti-DDoS Rate Limit (120 req / 1 min)
  const ddosCheck = checkApiDdos(req, 120, 60000);
  if (!ddosCheck.allowed) {
    return res.status(429).json({ success: false, error: 'Too Many Requests. Vui lòng thử lại sau ' + ddosCheck.retryAfter + 's.' });
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let body = {};
  if (req.method === 'POST' || req.method === 'DELETE') {
    try {
      body = await parseBody(req);
    } catch (e) {
      return res.status(400).json({ success: false, error: 'Dữ liệu JSON không hợp lệ.' });
    }
  }

  const query = req.query || {};
  const isAdmin = verifyAdminToken(req);
  const userPayload = verifyUserToken(req);

  try {
    // ════════ LẤY DANH SÁCH / TRA CỨU ĐƠN HÀNG (GET) ════════
    if (req.method === 'GET') {
      const { orders } = await getGist();
      const all = Array.isArray(orders) ? orders : [];

      // 1. Quản trị viên: Xem danh sách đơn hàng
      if (isAdmin) {
        return res.status(200).json({ success: true, orders: all });
      }

      // 2. Tra cứu lịch sử đơn hàng của người dùng đã đăng nhập (?view=my_orders)
      if (query.view === 'my_orders' || query.user) {
        if (!userPayload) {
          return res.status(401).json({ success: false, error: 'Bạn cần đăng nhập để xem lịch sử đơn hàng.' });
        }
        const requestedUser = String(query.user || userPayload.user).trim();
        if (userPayload.user.toLowerCase() !== requestedUser.toLowerCase()) {
          return res.status(403).json({ success: false, error: 'Quyền hạn bị từ chối: Không thể xem đơn hàng của người khác.' });
        }
        const userOrders = all.filter(o => o.user && o.user.toLowerCase() === requestedUser.toLowerCase() && o.status === 'approved');
        return res.status(200).json({
          success: true,
          orders: userOrders.map(o => ({
            id: o.id,
            product: o.product,
            plan: o.plan,
            price: o.price,
            user: o.user,
            time: o.time,
            status: o.status,
            txId: o.txId
          }))
        });
      }

      // 3. Tra cứu 1 đơn hàng cụ thể theo ID hoặc Memo chuyển khoản
      const lookupCode = String(query.id || query.code || query.memo || '').trim().toUpperCase();
      if (!lookupCode) {
        return res.status(400).json({ success: false, error: 'Vui lòng cung cấp mã đơn hàng để kiểm tra trạng thái.' });
      }

      const found = all.find(o => (o.id && o.id.toUpperCase() === lookupCode) || (o.memo && o.memo.toUpperCase() === lookupCode));
      if (!found) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy thông tin đơn hàng.' });
      }

      const isOwner = userPayload && userPayload.user.toLowerCase() === (found.user || '').toLowerCase();
      const canViewFull = isAdmin || isOwner;
      return res.status(200).json({
        success: true,
        order: {
          id: found.id,
          product: found.product,
          plan: found.plan,
          price: found.price,
          user: canViewFull ? found.user : (found.user ? found.user.substring(0, 3) + '***' : '***'),
          time: found.time,
          status: found.status,
          txId: canViewFull ? found.txId : undefined
        }
      });
    }

    // ════════ XÓA ĐƠN HÀNG (DELETE) (CHỈ ADMIN) ════════
    if (req.method === 'DELETE') {
      if (!isAdmin) {
        return res.status(403).json({ success: false, error: 'Quyền hạn bị từ chối: Chỉ Quản trị viên mới được xóa đơn hàng!' });
      }
      const rawTargetId = String(query.id || body.id || '').trim().toUpperCase();
      if (!validateOrderId(rawTargetId)) {
        return res.status(400).json({ success: false, error: 'Mã đơn xóa không hợp lệ.' });
      }

      let orderExisted = false;
      const deleteResult = await orderMutex.run(async () => {
        const { orders } = await getGist();
        const list = Array.isArray(orders) ? orders : [];
        const initialLen = list.length;
        const filtered = list.filter(o => o.id !== rawTargetId);
        orderExisted = filtered.length < initialLen;
        if (orderExisted) {
          await updateGist({ orders: filtered });
        }
        return { remaining: filtered.length };
      });

      if (!orderExisted) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng cần xóa.' });
      }

      return res.status(200).json({ success: true, message: 'Đã xóa đơn hàng thành công.', remaining: deleteResult.remaining });
    }

    // ════════ XỬ LÝ POST ════════
    if (req.method === 'POST') {
      // 1. Reset toàn bộ dữ liệu đơn hàng (Chỉ Admin)
      if (Boolean(body._reset) === true) {
        if (!isAdmin) {
          return res.status(403).json({ success: false, error: 'Quyền hạn bị từ chối!' });
        }
        if (body.confirmPhrase !== 'RESET_CONFIRM_ALL_DATA') {
          return res.status(400).json({ success: false, error: 'Sai cụm từ xác nhận xóa.' });
        }
        await orderMutex.run(async () => {
          await updateGist({ orders: [] });
        });
        return res.status(200).json({ success: true, message: 'Đã làm trống toàn bộ dữ liệu đơn hàng.' });
      }

      // 2. Tạo đơn hàng mới (Chỉ sinh pending, kiểm tra catalog)
      if (body._action === 'create' || body.action === 'create') {
        const ip = getClientIp ? getClientIp(req) : (req.headers['x-forwarded-for'] || '127.0.0.1');
        if (isCreationRateLimited(ip)) {
          return res.status(429).json({ success: false, error: 'Bạn tạo đơn quá nhanh. Vui lòng chờ 1 phút.' });
        }

        const prodKey = sanitizeText(body.productId || body.product, 60);
        const planName = sanitizeText(body.planName || body.plan, 40);
        const isTopup = prodKey === 'wallet-topup' || prodKey === 'topup';
        let canonicalPrice = 0;
        let realProductName = '';
        let finalPlanName = planName;

        if (isTopup) {
          const reqAmount = Number(body.amount) || Number(body.price) || 0;
          if (!Number.isFinite(reqAmount) || reqAmount < 10000 || reqAmount > 50000000) {
            return res.status(400).json({ success: false, error: 'Số tiền nạp tối thiểu là 10.000đ và tối đa là 50.000.000đ!' });
          }
          canonicalPrice = Math.floor(reqAmount);
          realProductName = 'Nạp Số Dư Tài Khoản';
          finalPlanName = `Nạp ${canonicalPrice.toLocaleString('vi-VN')}đ`;
        } else {
          const prodObj = getProductInfo(prodKey);
          if (prodObj && prodObj.soldOut) {
            return res.status(400).json({ success: false, error: 'Sản phẩm này hiện đang CHÁY HÀNG! Vui lòng liên hệ Admin.' });
          }

          canonicalPrice = getCanonicalPrice(prodKey, planName);
          if (!canonicalPrice || canonicalPrice <= 0) {
            return res.status(400).json({ success: false, error: 'Gói sản phẩm bạn chọn không hợp lệ trong hệ thống!' });
          }

          realProductName = (prodObj && prodObj.name) || prodKey;
        }

        const newId = generateSecureOrderId();
        const username = userPayload ? userPayload.user : (sanitizeText(body.user, 40) || 'Khách vãng lai');
        const phone = sanitizeText(body.phone, 15);

        let creationError = null;
        const orderCreationResult = await orderMutex.run(async () => {
          const { orders } = await getGist();
          const list = Array.isArray(orders) ? orders : [];

          let memoCode = '';
          const pendingMemos = new Set(list.filter(o => o.status === 'pending').map(o => o.memo));
          for (let i = 0; i < ORDER_CONFIG.memoCollisionMaxRetries; i++) {
            const candidate = 'NX' + crypto.randomInt(10000, 100000);
            if (!pendingMemos.has(candidate)) {
              memoCode = candidate;
              break;
            }
          }

          if (!memoCode) {
            creationError = 'Hệ thống đang bận xử lý nhiều đơn hàng. Vui lòng thử lại sau giây lát.';
            return null;
          }

          const orderItem = {
            id: newId,
            memo: memoCode,
            product: realProductName,
            plan: finalPlanName,
            price: canonicalPrice,
            user: username,
            phone: phone,
            time: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
            createdAt: Date.now(),
            status: 'pending',
            txId: ''
          };

          list.unshift(orderItem);
          await updateGist({ orders: list.slice(0, ORDER_CONFIG.maxOrdersLimit) });
          return orderItem;
        });

        if (creationError || !orderCreationResult) {
          return res.status(503).json({ success: false, error: creationError || 'Không thể khởi tạo đơn hàng lúc này.' });
        }

        const qrUrl = 'https://img.vietqr.io/image/' + encodeURIComponent(BANK_CONFIG.bankId) + '-' + encodeURIComponent(BANK_CONFIG.accountNo) + '-compact2.png?amount=' + canonicalPrice + '&addInfo=' + encodeURIComponent(orderCreationResult.memo) + '&accountName=' + encodeURIComponent(BANK_CONFIG.accountName);

        return res.status(200).json({
          success: true,
          order: orderCreationResult,
          qrUrl: qrUrl
        });
      }

      // 3. Cập nhật / Duyệt đơn hàng (BẮT BUỘC ADMIN)
      if (!isAdmin) {
        return res.status(403).json({ success: false, error: 'Quyền hạn bị từ chối: Chỉ quản trị viên mới được cập nhật đơn hàng!' });
      }

      const rawId = String(body.id || '').trim().toUpperCase();
      if (!validateOrderId(rawId)) {
        return res.status(400).json({ success: false, error: 'Mã đơn không hợp lệ.' });
      }

      const validStatuses = ['pending', 'approved', 'rejected'];
      const rawStatus = String(body.status || 'pending').toLowerCase();
      const statusToSet = validStatuses.includes(rawStatus) ? rawStatus : 'pending';
      const cleanTxId = sanitizeText(body.txId, 40);

      const updateResult = await orderMutex.run(async () => {
        const { orders } = await getGist();
        const list = Array.isArray(orders) ? orders : [];
        const existingIdx = list.findIndex(o => o.id === rawId);

        if (existingIdx === -1) {
          return { error: 'Không tìm thấy đơn hàng cần cập nhật.', status: 404 };
        }

        if (statusToSet === 'approved' && cleanTxId) {
          const dupTx = list.find(o => o.id !== rawId && o.status === 'approved' && o.txId && o.txId.toUpperCase() === cleanTxId.toUpperCase());
          if (dupTx) {
            return { error: 'Mã giao dịch ngân hàng đã được gán cho đơn hàng khác.', status: 409 };
          }
        }

        list[existingIdx].status = statusToSet;
        if (cleanTxId) list[existingIdx].txId = cleanTxId;

        await updateGist({ orders: list.slice(0, ORDER_CONFIG.maxOrdersLimit) });
        return { success: true, order: list[existingIdx] };
      });

      if (updateResult.error) {
        return res.status(updateResult.status || 400).json({ success: false, error: updateResult.error });
      }

      return res.status(200).json({ success: true, order: updateResult.order });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Orders API Internal Error:', err);
    return res.status(500).json({ success: false, error: 'Lỗi hệ thống máy chủ. Vui lòng thử lại sau.' });
  }
};
