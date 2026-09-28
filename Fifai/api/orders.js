const { getGist, updateGist } = require('./db');
const { verifyAdminToken, parseBody, validateOrderId } = require('./_security');
const { getCanonicalPrice } = require('./_catalog');

function sanitizeText(str, maxLen) {
  if (!str) return '';
  return String(str).replace(/[<>'"]/g, '').trim().substring(0, maxLen || 50);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

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

  try {
    // ── LẤY DANH SÁCH ĐƠN HÀNG (GET) ──
    if (req.method === 'GET') {
      const { orders } = await getGist();
      const all = orders || [];

      // 1. Nếu là Admin: Cho phép xem toàn bộ danh sách đơn hàng
      if (isAdmin) {
        return res.status(200).json({ success: true, orders: all });
      }

      // 2. Nếu là Khách / Chưa đăng nhập Admin:
      // BẢO VỆ BẢN QUYỀN & DỮ LIỆU KHÁCH HÀNG: Tuyệt đối KHÔNG trả toàn bộ danh sách khách hàng!
      const queryCode = String(query.id || query.code || query.memo || '').trim().toUpperCase();
      if (!queryCode) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Bạn cần đăng nhập Admin để xem danh sách toàn bộ khách hàng. Vui lòng cung cấp mã đơn để tra cứu.'
        });
      }

      const found = all.find(o => (o.id && o.id.toUpperCase() === queryCode) || (o.user && o.user.toUpperCase() === queryCode));
      if (!found) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng với mã: ' + queryCode });
      }

      // Trả về thông tin an toàn của đúng 1 đơn hàng khách tra cứu
      return res.status(200).json({
        success: true,
        order: {
          id: found.id,
          product: found.product,
          plan: found.plan,
          price: found.price,
          user: found.user,
          time: found.time,
          status: found.status,
          txId: found.txId
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

      // 3. TẠO HOẶC CẬP NHẬT ĐƠN HÀNG
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

      // Strix Security Guard: Chỉ Admin hoặc giao dịch có mã xác nhận ngân hàng mới duyệt đơn
      let status = 'pending';
      if (isAdmin && body.status) {
        const validStatuses = ['pending', 'approved', 'rejected'];
        const rawStatus = String(body.status).toLowerCase();
        if (validStatuses.includes(rawStatus)) status = rawStatus;
      } else if (body.status === 'approved' && body.txId) {
        status = 'approved';
      } else if (existingIdx >= 0) {
        status = existingOrders[existingIdx].status || 'pending';
      }

      // Nếu client không phải Admin mà cố tình gửi status='approved' không kèm txId -> Từ chối ngay
      if ((body.status === 'approved' || body.status === 'rejected') && !isAdmin && !body.txId) {
        return res.status(403).json({ success: false, error: 'Không thể tự ý duyệt đơn mà không có xác thực máy chủ!' });
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
