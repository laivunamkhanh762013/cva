const { getGist, updateGist } = require('./db');
const { verifyAdminToken, verifyUserToken, generateSecureOrderId, parseCookies, parseBody, checkApiDdos, validateOrderId } = require('./_security');
const { getCanonicalPrice } = require('./_catalog');
const createLimits = new Map();

function sanitizeText(str, maxLen) {
  if (!str) return '';
  return String(str).replace(/[<>'"]/g, '').trim().substring(0, maxLen || 50);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token, x-user-token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Anti-DDoS API Rate Limit (60 req / 1 min)
  const ddosCheck = checkApiDdos(req, 60, 60000);
  if (!ddosCheck.allowed) {
    return res.status(429).json({ success: false, error: 'Too Many Requests (DDoS Protection). Vui lòng thử lại sau ' + ddosCheck.retryAfter + 's.' });
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let body = {};
  if (req.method === 'POST' || req.method === 'DELETE') {
    body = await parseBody(req);
  }

  let query = req.query || {};
  if (req.url && req.url.includes('?')) {
    try {
      const u = new URL(req.url, 'http://localhost');
      query = Object.assign({}, Object.fromEntries(u.searchParams), query);
    } catch(e) {}
  }

  const isAdmin = verifyAdminToken(req);
  const userPayload = verifyUserToken(req);

  try {
    // ── LẤY DANH SÁCH / KIỂM TRA ĐƠN HÀNG (GET) ──
    if (req.method === 'GET') {
      const { orders } = await getGist();
      const all = orders || [];

      // 1. Nếu là Admin: Xem toàn bộ đơn hàng
      if (isAdmin) {
        return res.status(200).json({ success: true, orders: all });
      }

      // 2. Poll trạng thái đơn của khách qua ID (?id=DP... hoặc ?code=DP...)
      const queryId = String(query.id || query.code || query.memo || '').trim().toUpperCase();
      const userParam = String(query.user || '').trim();

      // Nếu khách yêu cầu lấy lịch sử đơn của chính mình
      if (userParam || (queryId && !queryId.startsWith('DP'))) {
        const targetUsername = userParam || queryId;
        // Bắt buộc xác thực tài khoản qua User Token nếu muốn xem danh sách đơn theo user
        if (!userPayload || userPayload.user.toLowerCase() !== targetUsername.toLowerCase()) {
          return res.status(401).json({
            success: false,
            error: 'Bạn cần đăng nhập tài khoản ' + targetUsername + ' để xem lịch sử đơn hàng của mình.'
          });
        }
        const userOrders = all.filter(o => o.user && o.user.toLowerCase() === targetUsername.toLowerCase() && o.status === 'approved');
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

      if (!queryId) {
        return res.status(400).json({
          success: false,
          error: 'Vui lòng cung cấp mã đơn hàng (id) để kiểm tra trạng thái.'
        });
      }

      const found = all.find(o => o.id && o.id.toUpperCase() === queryId);
      if (!found) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng: ' + queryId });
      }

      // Trả về thông tin an toàn của đơn hàng
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

    // ── XÓA ĐƠN HÀNG (DELETE) ──
    if (req.method === 'DELETE') {
      if (!isAdmin) {
        return res.status(403).json({ success: false, error: 'Quyền hạn bị từ chối: Cần đăng nhập Admin để xóa đơn hàng!' });
      }
      const targetId = String(query.id || body.id || '').replace(/[^a-zA-Z0-9_-]/g, '').trim().toUpperCase();
      if (!targetId) {
        return res.status(400).json({ success: false, error: 'Thiếu mã đơn cần xóa' });
      }
      const { orders } = await getGist();
      const filtered = (orders || []).filter(o => o.id !== targetId);
      await updateGist({ orders: filtered });
      return res.status(200).json({ success: true, message: 'Đã xóa vĩnh viễn đơn ' + targetId, remaining: filtered.length });
    }

    // ── XỬ LÝ POST (LƯU ĐƠN / DUYỆT ĐƠN / XÓA ĐƠN / RESET) ──
    if (req.method === 'POST') {
      // 1. RESET TOÀN BỘ ĐƠN HÀNG (Chỉ Admin + Cần cụm từ xác thực)
      if (body._reset === true) {
        if (!isAdmin) {
          return res.status(403).json({ success: false, error: 'Quyền hạn bị từ chối: Cần đăng nhập Admin để xóa toàn bộ đơn hàng!' });
        }
        if (body.confirmPhrase !== 'RESET_CONFIRM_ALL_DATA') {
          return res.status(400).json({
            success: false,
            error: 'Xác nhận xóa không hợp lệ. Vui lòng gửi kèm confirmPhrase: "RESET_CONFIRM_ALL_DATA"'
          });
        }
        await updateGist({ orders: [] });
        return res.status(200).json({ success: true, message: 'Đã xóa sạch toàn bộ đơn hàng.' });
      }

      // 2. XÓA 1 ĐƠN HÀNG QUA POST (Chỉ Admin)
      if ((body._delete === true || body._action === 'delete') && (body.id || query.id)) {
        if (!isAdmin) {
          return res.status(403).json({ success: false, error: 'Quyền hạn bị từ chối: Cần đăng nhập Admin để xóa đơn hàng!' });
        }
        const cleanId = String(body.id || query.id).replace(/[^a-zA-Z0-9_-]/g, '').trim().toUpperCase();
        const { orders } = await getGist();
        const filtered = (orders || []).filter(o => o.id !== cleanId);
        await updateGist({ orders: filtered });
        return res.status(200).json({ success: true, message: 'Đã xóa vĩnh viễn đơn ' + cleanId, remaining: filtered.length });
      }

      // 3. TẠO ĐƠN HÀNG MỚI TỪ SERVER (Chỉ sinh đơn pending, lấy giá từ Catalog)
            if (body._action === 'create' || body.action === 'create') {
        const ip = req.headers['x-forwarded-for'] || '127.0.0.1';
        const now = Date.now();
        const entry = createLimits.get(ip) || { count: 0, resetAt: now + 60000 };
        if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60000; }
        entry.count++;
        createLimits.set(ip, entry);
        if (entry.count > 5) {
          return res.status(429).json({ success: false, error: 'Bạn tạo đơn quá nhanh. Vui lòng chờ 1 phút.' });
        }
        const prodKey = sanitizeText(body.productId || body.product, 60);
        const planName = sanitizeText(body.planName || body.plan, 40);
        const canonicalPrice = getCanonicalPrice(prodKey, planName);
        if (!canonicalPrice || canonicalPrice <= 0) {
          return res.status(400).json({ success: false, error: 'Sản phẩm hoặc gói bạn chọn không hợp lệ trong hệ thống!' });
        }

        const newId = generateSecureOrderId();
        const username = userPayload ? userPayload.user : (sanitizeText(body.user, 40) || 'Khách vãng lai');
        const phone = sanitizeText(body.phone, 15);

        const newOrder = {
          id: newId,
          product: prodKey,
          plan: planName,
          price: canonicalPrice,
          user: username,
          phone: phone,
          time: new Date().toLocaleString('vi-VN'),
          status: 'pending',
          txId: ''
        };

        const { orders } = await getGist();
        const existingOrders = orders || [];
        existingOrders.unshift(newOrder);
        const trimmed = existingOrders.slice(0, 300);
        await updateGist({ orders: trimmed });

        // Tạo link VietQR chuẩn xác với nội dung chuyển khoản là MÃ ĐƠN HÀNG
        const qrUrl = 'https://img.vietqr.io/image/MB-0941414448-compact2.png?amount=' + canonicalPrice + '&addInfo=' + encodeURIComponent(newId) + '&accountName=BUI%20VAN%20CAO';

        return res.status(200).json({
          success: true,
          order: newOrder,
          qrUrl: qrUrl
        });
      }

      // 4. CẬP NHẬT HOẶC DUYỆT ĐƠN HÀNG (CHỈ ADMIN HOẶC SEPAY MỚI ĐƯỢC DUYỆT)
      if (!body.id) {
        return res.status(400).json({ success: false, error: 'Thiếu mã đơn hàng' });
      }

      const cleanId = String(body.id).replace(/[^a-zA-Z0-9_-]/g, '').trim().toUpperCase().substring(0, 20);
      if (!validateOrderId(cleanId)) {
        return res.status(400).json({ success: false, error: 'Mã đơn không đúng định dạng (phải bắt đầu bằng DP...)' });
      }

      const { orders } = await getGist();
      const existingOrders = orders || [];
      const existingIdx = existingOrders.findIndex(o => o.id === cleanId);

      // Strix Security Guard: Chỉ Admin mới có quyền cập nhật đơn hàng ở endpoint này
      let status = 'pending';
      if (isAdmin && body.status) {
        const validStatuses = ['pending', 'approved', 'rejected'];
        const rawStatus = String(body.status).toLowerCase();
        if (validStatuses.includes(rawStatus)) status = rawStatus;
      } else if (existingIdx >= 0) {
        status = existingOrders[existingIdx].status || 'pending';
      } else {
        // Client thường không được tự tạo đơn không qua action 'create'
        status = 'pending';
      }

      // Nếu client không phải Admin mà cố tình gửi status='approved' -> Chặn tuyệt đối 100%
      if ((body.status === 'approved' || body.status === 'rejected') && !isAdmin) {
        return res.status(403).json({ success: false, error: 'Quyền hạn bị từ chối: Chỉ quản trị viên hoặc SePay mới được duyệt đơn!' });
      }

      // Strix Security Guard: Ngăn chặn 1 giao dịch ngân hàng duyệt cho 2 đơn khác nhau (Idempotency)
      const cleanTxId = sanitizeText(body.txId, 40);
      if (status === 'approved' && cleanTxId) {
        const dupTx = existingOrders.find(o => o.id !== cleanId && o.status === 'approved' && o.txId && o.txId.toUpperCase() === cleanTxId.toUpperCase());
        if (dupTx) {
          return res.status(409).json({ success: false, error: 'Mã giao dịch ngân hàng ' + cleanTxId + ' đã được dùng cho đơn ' + dupTx.id });
        }
      }

      // Tra cứu bảng giá chuẩn từ Server (Chống Price Tampering)
      const productName = sanitizeText(body.product, 60) || 'AimLock FF';
      const planName = sanitizeText(body.plan, 40) || '1 tháng';
      const canonicalPrice = getCanonicalPrice(productName, planName);
      let finalPrice = typeof body.price === 'number' ? Math.max(0, body.price) : (parseFloat(body.price) || 0);
      if (canonicalPrice && canonicalPrice > 0) {
        finalPrice = canonicalPrice;
      }

      const orderItem = {
        id: cleanId,
        product: productName,
        plan: planName,
        price: finalPrice,
        user: sanitizeText(body.user, 40) || 'Khách vãng lai',
        phone: sanitizeText(body.phone, 15) || '',
        time: body.time ? sanitizeText(body.time, 35) : new Date().toLocaleString('vi-VN'),
        status: status,
        txId: cleanTxId || (existingIdx >= 0 ? existingOrders[existingIdx].txId : '')
      };

      if (existingIdx >= 0) {
        existingOrders[existingIdx] = Object.assign({}, existingOrders[existingIdx], orderItem);
      } else {
        existingOrders.unshift(orderItem);
      }

      // Giới hạn 300 đơn gần nhất
      const trimmed = existingOrders.slice(0, 300);
      await updateGist({ orders: trimmed });

      return res.status(200).json({ success: true, order: orderItem });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};




