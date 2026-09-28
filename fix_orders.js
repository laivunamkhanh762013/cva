const fs = require('fs');
const file = 'api/orders.js';
let content = fs.readFileSync(file, 'utf8');

// 1. GET PII Masking
const searchPII =       // Tr? v? thng tin an ton c?a don hng
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
      });;
const replacePII =       // Trả về thông tin an toàn (che giấu PII)
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
      });;
content = content.replace(searchPII, replacePII);

// 2. CREATE Anti-Spam
const searchCreate =       // 3. T?O DON HANG M?I T? SERVER (Ch? sinh don pending, l?y gi t? Catalog)
      if (body._action === 'create' || body.action === 'create') {;
const replaceCreate =       // 3. TẠO ĐƠN HÀNG (Có Rate Limit 5/phút)
      if (body._action === 'create' || body.action === 'create') {
        const ip = req.headers['x-forwarded-for'] || '127.0.0.1';
        const now = Date.now();
        const entry = createLimits.get(ip) || { count: 0, resetAt: now + 60000 };
        if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60000; }
        entry.count++;
        createLimits.set(ip, entry);
        if (entry.count > 5) {
          return res.status(429).json({ success: false, error: 'Bạn tạo đơn quá nhanh. Vui lòng chờ 1 phút.' });
        };
content = content.replace(searchCreate, replaceCreate);

// 3. ADD createLimits Map
content = content.replace(const { getCanonicalPrice } = require('./_catalog');, const { getCanonicalPrice } = require('./_catalog');\nconst createLimits = new Map(););

// Remove double time if any
content = content.replace(/time: found.time,\s*time: found.time,/g, 'time: found.time,');

fs.writeFileSync(file, content, 'utf8');
