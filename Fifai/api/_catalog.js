// BẢNG GIÁ SẢN PHẨM CHUẨN TRÊN MÁY CHỦ (SERVER CANONICAL CATALOG)
// Ngăn chặn tuyệt đối hành vi giả mạo giá tiền (Price Tampering) từ phía trình duyệt
const CATALOG = {
  'aimlock-forget': {
    name: 'AimLock Forget (Adr · iOS)',
    plans: {
      'AimLock Forget 1.0': 50000,
      'AimLock Forget 2.0': 200000,
      'AimLock Forget 3.0': 500000
    }
  },
  'panel-ios': {
    name: 'Panel IPA Head (iOS)',
    plans: {
      'Key 7 Ngày (1 Tuần)': 100000,
      'Key 30 Ngày (1 Tháng)': 250000,
      'Key Vĩnh Viễn (Full Mùa)': 500000
    }
  },
  'aimlock-delta': {
    name: 'AimLock Delta V5 (Adr · iOS)',
    plans: {
      'Key 1 Ngày (24h)': 20000,
      'Key 7 Ngày (1 Tuần)': 50000,
      'Key 1 Tháng (30 Ngày)': 100000
    }
  },
  'migul-lite': {
    name: 'Menu Migul Lite (iOS)',
    plans: {
      'Key 1 Ngày': 50000,
      'Key 7 Ngày': 150000,
      'Key 1 Tháng': 300000
    }
  },
  'migul-pro': {
    name: 'Menu Migul Pro (iOS)',
    plans: {
      'Key 1 Giờ (Test)': 10000,
      'Key 1 Ngày': 70000,
      'Key 7 Ngày (1 Tuần)': 215000,
      'Key 30 Ngày (1 Tháng)': 450000
    }
  },
  'trollmodz': {
    name: 'TrollModz (Adr · iOS · PC)',
    plans: {
      'Key 1 Ngày': 25000,
      'Key 7 Ngày': 100000,
      'Key 30 Ngày': 200000
    }
  }
};

function getCanonicalPrice(productKey, planName) {
  if (!productKey || !planName) return null;
  // Tìm theo product ID
  let prod = CATALOG[productKey];
  if (!prod) {
    // Tìm theo tên sản phẩm
    const pKey = Object.keys(CATALOG).find(k => CATALOG[k].name.toLowerCase() === String(productKey).toLowerCase());
    if (pKey) prod = CATALOG[pKey];
  }
  if (!prod || !prod.plans) return null;

  // Tìm theo tên plan
  const cleanPlan = String(planName).trim().toLowerCase();
  for (const [pName, price] of Object.entries(prod.plans)) {
    if (pName.toLowerCase() === cleanPlan || cleanPlan.includes(pName.toLowerCase())) {
      return price;
    }
  }
  return null;
}

module.exports = {
  CATALOG,
  getCanonicalPrice
};
