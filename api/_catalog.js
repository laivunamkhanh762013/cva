// BẢNG GIÁ SẢN PHẨM CHUẨN TRÊN MÁY CHỦ (SERVER CANONICAL CATALOG)
// Ngăn chặn tuyệt đối hành vi giả mạo giá tiền (Price Tampering) và Prototype Pollution

function deepFreeze(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      deepFreeze(obj[key]);
    }
  }
  return obj;
}

const RAW_CATALOG = {
  "forget-lix": {
    "name": "Forget Lix 3.5 (iOS)",
    "soldOut": false,
    "plans": {
      "Forget Lix 3.5 (Giảm từ 350k)": 150000
    }
  },
  "aimlock-forget": {
    "name": "AimLock Forget (Adr · iOS)",
    "soldOut": false,
    "plans": {
      "AimLock Forget 1.0": 50000,
      "AimLock Forget 2.0": 200000,
      "AimLock Forget 3.0": 500000
    }
  },
  "forget-hex": {
    "name": "Forget Hex (V1 - V5)",
    "soldOut": false,
    "plans": {
      "Forget Hex V1": 49000,
      "Forget Hex V2": 99000,
      "Forget Hex V3": 199000,
      "Forget Hex V4": 399000,
      "Forget Hex V5": 799000
    }
  },
  "trollmodz": {
    "name": "TrollModz (Adr · iOS · PC)",
    "soldOut": false,
    "plans": {
      "Key 1 Giờ (Test)": 10000,
      "Key 1 Ngày": 25000,
      "Key 7 Ngày (1 Tuần)": 100000,
      "Key 15 Ngày": 150000,
      "Key 30 Ngày (1 Tháng)": 250000
    }
  },
  "sx2-dinhvi": {
    "name": "Sx2 Team External No root v1.0",
    "soldOut": false,
    "plans": {
      "Gói 1 Ngày": 30000,
      "Gói 7 Ngày (1 Tuần)": 80000,
      "Gói 30 Ngày (1 Tháng)": 200000,
      "Gói Vĩnh Viễn": 400000
    }
  },
  "proxy-ios-novax": {
    "name": "NovaX (iOS)",
    "soldOut": false,
    "plans": {
      "Key 1 Ngày": 20000,
      "Key 7 Ngày": 50000,
      "Key 30 Ngày": 100000,
      "Key Vĩnh Viễn": 200000
    }
  },
  "novax-android": {
    "name": "NovaX (Android)",
    "soldOut": true,
    "plans": {
      "Key 1 Ngày": 20000,
      "Key 7 Ngày": 50000,
      "Key 30 Ngày": 100000,
      "Key Vĩnh Viễn": 200000
    }
  },
  "proxy-ios-delta": {
    "name": "Proxy Aim iOS - Delta",
    "soldOut": false,
    "plans": {
      "Key 1 Ngày": 20000,
      "Key 1 Tuần (7 Ngày)": 50000,
      "Key 1 Tháng (30 Ngày)": 100000
    }
  },
  "migul-lite": {
    "name": "Menu Migul Lite (iOS)",
    "soldOut": false,
    "plans": {
      "Key 1 Ngày": 50000,
      "Key 7 Ngày (1 Tuần)": 150000,
      "Key 30 Ngày (1 Tháng)": 350000
    }
  },
  "migul-pro": {
    "name": "Menu Migul Pro (iOS)",
    "soldOut": false,
    "plans": {
      "Key 1 Giờ (Test)": 10000,
      "Key 1 Ngày": 70000,
      "Key 7 Ngày (1 Tuần)": 215000,
      "Key 30 Ngày (1 Tháng)": 450000
    }
  },
  "pubg-recoil-master": {
    "name": "No Recoil PUBG Mobile Smart 90FPS",
    "soldOut": false,
    "plans": {
      "1 Ngày": 50000,
      "7 Ngày": 150000,
      "30 Ngày": 350000,
      "Bản chuẩn": 50000
    }
  },
  "pubg-esp-radar": {
    "name": "ESP Radar Vị Trí Kẻ Địch PUBG",
    "soldOut": false,
    "plans": {
      "1 Ngày": 100000,
      "7 Ngày": 280000,
      "30 Ngày": 650000,
      "Bản chuẩn": 100000
    }
  },
  "pool-guideline-pro": {
    "name": "Auto Guideline 8 Ball Pool 6 Line",
    "soldOut": false,
    "plans": {
      "Gói 7 Ngày": 50000,
      "Gói 1 Tháng": 120000,
      "Gói Vĩnh Viễn": 250000,
      "Bản chuẩn": 50000
    }
  },
  "pool-cue-coins": {
    "name": "Gói Xu & Mở Khóa Gậy Huyền Thoại",
    "soldOut": false,
    "plans": {
      "Gói 500 Triệu Xu": 100000,
      "Gói 1 Tỷ Xu VIP": 180000,
      "Bản chuẩn": 100000
    }
  },
  "cfg-fps-boost": {
    "name": "Config Tối Ưu Máy Yếu 120FPS Extreme",
    "soldOut": false,
    "plans": {
      "Tải Miễn Phí": 0,
      "Bản chuẩn": 0
    }
  },
  "cfg-acc-ff-master": {
    "name": "Tài Khoản Free Fire Rank Thách Đấu Full Skin",
    "soldOut": false,
    "plans": {
      "Nhận Full Thông Tin Đăng Nhập": 500000,
      "Bản chuẩn": 500000
    }
  },
  "dl-filza-manager": {
    "name": "Filza Escaped IPA Không Cần Jailbreak",
    "soldOut": false,
    "plans": {
      "Tải Xuống Trực Tiếp IPA": 0,
      "Bản chuẩn": 0
    }
  },
  "ff-aimlock": {
    "name": "Aimlock Free Fire (V1 - V5)",
    "soldOut": false,
    "plans": {
      "Aimlock V1": 20000,
      "Aimlock V2": 50000,
      "Aimlock V3": 100000,
      "Aimlock V4": 200000,
      "Aimlock V5": 300000
    }
  },
  "ff-dpi": {
    "name": "DPI Cảm Ứng Free Fire (60% - 100%)",
    "soldOut": false,
    "plans": {
      "DPI 60%": 20000,
      "DPI 70%": 50000,
      "DPI 80%": 100000,
      "DPI 90%": 150000,
      "DPI 100%": 200000
    }
  },
  "ff-aimhead-filza": {
    "name": "Aimlock Head Filza",
    "soldOut": false,
    "plans": {
      "Bản chuẩn": 100000
    }
  },
  "ff-aimbody-filza": {
    "name": "Aimbody Filza",
    "soldOut": false,
    "plans": {
      "Bản chuẩn": 100000
    }
  },
  "ff-aimneck-3105": {
    "name": "Aimneck 3105",
    "soldOut": false,
    "plans": {
      "Bản chuẩn": 100000
    }
  },
  "ff-aimlock-3105": {
    "name": "Aimlock 3105",
    "soldOut": false,
    "plans": {
      "Bản chuẩn": 100000
    }
  },
  "ff-dinhvi": {
    "name": "Định Vị Người",
    "soldOut": false,
    "plans": {
      "Bản chuẩn": 100000
    }
  },
  "ff-menu-filza-3105": {
    "name": "Menu Filza-3105",
    "soldOut": false,
    "plans": {
      "Bản chuẩn": 100000
    }
  },
  "wallet-topup": {
    "name": "Nạp Tiền Vào Số Dư Tài Khoản",
    "soldOut": false,
    "plans": {
      "Nạp 10.000đ": 10000,
      "Nạp 20.000đ": 20000,
      "Nạp 50.000đ": 50000,
      "Nạp 100.000đ": 100000,
      "Nạp 200.000đ": 200000,
      "Nạp 500.000đ": 500000,
      "Nạp 1.000.000đ": 1000000,
      "Tùy chọn": 20000
    }
  }
};

deepFreeze(RAW_CATALOG);

// Pre-computed Maps for Absolute O(1) Lookups
const ID_MAP = new Map();
const NAME_MAP = new Map();
const PRODUCT_TO_ID_MAP = new Map();
const PRECOMPUTED_PLANS = new Map();

for (const [id, item] of Object.entries(RAW_CATALOG)) {
  const normId = id.normalize('NFC').toLowerCase().trim();
  ID_MAP.set(normId, item);
  PRODUCT_TO_ID_MAP.set(item, normId);

  if (item.name) {
    const normName = item.name.normalize('NFC').toLowerCase().trim();
    NAME_MAP.set(normName, item);
  }

  // Pre-compute normalized plans
  const planMap = new Map();
  if (item.plans) {
    for (const [pName, price] of Object.entries(item.plans)) {
      if (typeof price === 'number' && Number.isFinite(price) && price >= 0) {
        planMap.set(pName.normalize('NFC').toLowerCase().trim(), price);
      }
    }
  }
  PRECOMPUTED_PLANS.set(normId, planMap);
}

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_INPUT_LENGTH = 150;

function getProductInfo(productKey) {
  if (typeof productKey !== 'string') return null;
  if (productKey.length > MAX_INPUT_LENGTH) return null;

  const normalizedKey = productKey.normalize('NFC').trim().toLowerCase();
  if (DANGEROUS_KEYS.has(normalizedKey)) return null;

  return ID_MAP.get(normalizedKey) || NAME_MAP.get(normalizedKey) || null;
}

function getCanonicalPrice(productKey, planName) {
  if (typeof productKey !== 'string' || typeof planName !== 'string') return null;
  if (productKey.length > MAX_INPUT_LENGTH || planName.length > MAX_INPUT_LENGTH) return null;

  const normalizedKey = productKey.normalize('NFC').trim().toLowerCase();
  if (DANGEROUS_KEYS.has(normalizedKey)) return null;

  // Tra cứu thuần O(1) theo ID hoặc Name
  const product = ID_MAP.get(normalizedKey) || NAME_MAP.get(normalizedKey);
  if (!product || product.soldOut) return null;

  // Lấy ID từ Reverse Map thuần O(1)
  const productId = PRODUCT_TO_ID_MAP.get(product);
  if (!productId) return null;

  const planMap = PRECOMPUTED_PLANS.get(productId);
  if (!planMap) return null;

  const normalizedPlan = planName.normalize('NFC').trim().toLowerCase();
  const price = planMap.get(normalizedPlan);

  if (typeof price === 'number' && Number.isFinite(price) && price >= 0) {
    return price;
  }

  return null;
}

module.exports = {
  CATALOG: RAW_CATALOG,
  getProductInfo,
  getCanonicalPrice
};
