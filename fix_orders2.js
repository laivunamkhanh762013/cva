const fs = require('fs');
const file = 'api/orders.js';
let content = fs.readFileSync(file, 'utf8');

// 1. PII Masking
content = content.replace(/return res\.status\(200\)\.json\(\{\s*success:\ true,\s*order:\ \{\s*id:\ found\.id,[\s\S]*?\}\s*\}\);/, // Trả về thông tin an toàn (che giấu PII)
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
      }););

// 2. CREATE Anti-Spam
content = content.replace(/if\s*\(\s*body\._action\s*===\s*'create'\s*\|\|\s*body\.action\s*===\s*'create'\s*\)\s*\{/, if (body._action === 'create' || body.action === 'create') {
        const ip = req.headers['x-forwarded-for'] || '127.0.0.1';
        const now = Date.now();
        const entry = createLimits.get(ip) || { count: 0, resetAt: now + 60000 };
        if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60000; }
        entry.count++;
        createLimits.set(ip, entry);
        if (entry.count > 5) {
          return res.status(429).json({ success: false, error: 'Bạn tạo đơn quá nhanh. Vui lòng chờ 1 phút.' });
        });

// 3. ADD createLimits Map
content = content.replace(const { getCanonicalPrice } = require('./_catalog');, const { getCanonicalPrice } = require('./_catalog');\nconst createLimits = new Map(););

fs.writeFileSync(file, content, 'utf8');
