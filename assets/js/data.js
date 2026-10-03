/**
 * DATA STORE - NEXUS GAMING STORE (DEMO DATABASE)
 * Strictly strictly zero gambling/lucky draw. Pure digital gaming storefront.
 */

const NEXUS_CONFIG = {
  STORE_NAME: "NEXUS STORE",
  SLOGAN: "UY TÍN • CHẤT LƯỢNG • AN TOÀN • NHANH GỌN",
  HOTLINE: "0987.654.321",
  DISCORD: "https://discord.gg/nexusgaming",
  TELEGRAM: "https://t.me/nexusgamingshop",
  BANK_NAME: "MB BANK (Quân Đội)",
  BANK_ACC: "0327519223",
  BANK_HOLDER: "NGUYEN THANH DAT",
  QR_TEMPLATE: "compact2"
};

const INITIAL_PRODUCTS = [
  {
    "id": "ff-aimlock",
    "name": "Aimlock Free Fire (V1 - V5)",
    "category": "freefire",
    "categoryName": "Free Fire",
    "platforms": [
      "iOS",
      "Android",
      "PC"
    ],
    "price": 20000,
    "badge": "BÁN CHẠY",
    "stock": 99,
    "status": "in_stock",
    "rating": 5,
    "sold": 1420,
    "description": "Aimlock Free Fire 5 cấp độ từ V1 đến V5. Phiên bản càng cao, độ bám tâm và tỉ lệ headshot càng mạnh.",
    "features": [
      "5 phiên bản V1 → V5 tùy nhu cầu",
      "Kéo tâm mượt, hạn chế rung",
      "Hỗ trợ Android / iOS / Giả lập",
      "Giao key tự động sau thanh toán"
    ],
    "packages": [
      {
        "id": "v1",
        "name": "Aimlock V1",
        "price": 20000
      },
      {
        "id": "v2",
        "name": "Aimlock V2",
        "price": 50000
      },
      {
        "id": "v3",
        "name": "Aimlock V3",
        "price": 100000
      },
      {
        "id": "v4",
        "name": "Aimlock V4",
        "price": 200000
      },
      {
        "id": "v5",
        "name": "Aimlock V5",
        "price": 300000
      }
    ],
    "keys": []
  },
  {
    "id": "ff-dpi",
    "name": "DPI Cảm Ứng Free Fire (60% - 100%)",
    "category": "freefire",
    "categoryName": "Free Fire",
    "platforms": [
      "iOS",
      "Android"
    ],
    "price": 20000,
    "badge": "HOT",
    "stock": 99,
    "status": "in_stock",
    "rating": 5,
    "sold": 860,
    "description": "Tinh chỉnh DPI cảm ứng giúp lia tâm nhanh và chính xác hơn. Chọn mức 60% đến 100%.",
    "features": [
      "5 mức DPI 60% → 100%",
      "Lia tâm nhạy, nhấc tâm dễ",
      "Không ảnh hưởng hiệu năng máy",
      "Hướng dẫn cài chi tiết"
    ],
    "packages": [
      {
        "id": "dpi60",
        "name": "DPI 60%",
        "price": 20000
      },
      {
        "id": "dpi70",
        "name": "DPI 70%",
        "price": 50000
      },
      {
        "id": "dpi80",
        "name": "DPI 80%",
        "price": 100000
      },
      {
        "id": "dpi90",
        "name": "DPI 90%",
        "price": 150000
      },
      {
        "id": "dpi100",
        "name": "DPI 100%",
        "price": 200000
      }
    ],
    "keys": []
  },
  {
    "id": "ff-aimhead-filza",
    "name": "Aimlock Head Filza",
    "category": "freefire",
    "categoryName": "Free Fire",
    "platforms": [
      "iOS"
    ],
    "price": 100000,
    "badge": "",
    "stock": 99,
    "status": "in_stock",
    "rating": 5,
    "sold": 540,
    "description": "Aimlock ưu tiên vùng đầu, cài đặt qua Filza trên iOS.",
    "features": [
      "Cài qua Filza (iOS)",
      "Hỗ trợ cài đặt từ A-Z",
      "Bảo hành trong thời gian sử dụng",
      "Giao file/key tự động sau thanh toán"
    ],
    "packages": [
      {
        "id": "std",
        "name": "Bản chuẩn",
        "price": 100000
      }
    ],
    "keys": []
  },
  {
    "id": "ff-aimbody-filza",
    "name": "Aimbody Filza",
    "category": "freefire",
    "categoryName": "Free Fire",
    "platforms": [
      "iOS"
    ],
    "price": 100000,
    "badge": "",
    "stock": 99,
    "status": "in_stock",
    "rating": 5,
    "sold": 410,
    "description": "Aim ưu tiên vùng thân, ổn định khi sấy, cài qua Filza.",
    "features": [
      "Cài qua Filza (iOS)",
      "Hỗ trợ cài đặt từ A-Z",
      "Bảo hành trong thời gian sử dụng",
      "Giao file/key tự động sau thanh toán"
    ],
    "packages": [
      {
        "id": "std",
        "name": "Bản chuẩn",
        "price": 100000
      }
    ],
    "keys": []
  },
  {
    "id": "ff-aimneck-3105",
    "name": "Aimneck 3105",
    "category": "freefire",
    "categoryName": "Free Fire",
    "platforms": [
      "iOS",
      "Android"
    ],
    "price": 100000,
    "badge": "",
    "stock": 99,
    "status": "in_stock",
    "rating": 5,
    "sold": 380,
    "description": "Aim vùng cổ bản 3105, dễ kéo lên đầu khi sấy.",
    "features": [
      "Cài qua Filza (iOS)",
      "Hỗ trợ cài đặt từ A-Z",
      "Bảo hành trong thời gian sử dụng",
      "Giao file/key tự động sau thanh toán"
    ],
    "packages": [
      {
        "id": "std",
        "name": "Bản chuẩn",
        "price": 100000
      }
    ],
    "keys": []
  },
  {
    "id": "ff-aimlock-3105",
    "name": "Aimlock 3105",
    "category": "freefire",
    "categoryName": "Free Fire",
    "platforms": [
      "iOS",
      "Android"
    ],
    "price": 100000,
    "badge": "",
    "stock": 99,
    "status": "in_stock",
    "rating": 5,
    "sold": 450,
    "description": "Aimlock bản 3105 ổn định, bám tâm tốt.",
    "features": [
      "Cài qua Filza (iOS)",
      "Hỗ trợ cài đặt từ A-Z",
      "Bảo hành trong thời gian sử dụng",
      "Giao file/key tự động sau thanh toán"
    ],
    "packages": [
      {
        "id": "std",
        "name": "Bản chuẩn",
        "price": 100000
      }
    ],
    "keys": []
  },
  {
    "id": "ff-dinhvi",
    "name": "Định Vị Người",
    "category": "freefire",
    "categoryName": "Free Fire",
    "platforms": [
      "iOS",
      "Android"
    ],
    "price": 100000,
    "badge": "MỚI",
    "stock": 99,
    "status": "in_stock",
    "rating": 5,
    "sold": 290,
    "description": "Hiển thị vị trí đối thủ giúp chủ động chiến thuật.",
    "features": [
      "Cài qua Filza (iOS)",
      "Hỗ trợ cài đặt từ A-Z",
      "Bảo hành trong thời gian sử dụng",
      "Giao file/key tự động sau thanh toán"
    ],
    "packages": [
      {
        "id": "std",
        "name": "Bản chuẩn",
        "price": 100000
      }
    ],
    "keys": []
  },
  {
    "id": "ff-menu-filza-3105",
    "name": "Menu Filza-3105",
    "category": "freefire",
    "categoryName": "Free Fire",
    "platforms": [
      "iOS"
    ],
    "price": 100000,
    "badge": "MỚI",
    "stock": 99,
    "status": "in_stock",
    "rating": 5,
    "sold": 320,
    "description": "Menu tổng hợp bản 3105, cài qua Filza.",
    "features": [
      "Cài qua Filza (iOS)",
      "Hỗ trợ cài đặt từ A-Z",
      "Bảo hành trong thời gian sử dụng",
      "Giao file/key tự động sau thanh toán"
    ],
    "packages": [
      {
        "id": "std",
        "name": "Bản chuẩn",
        "price": 100000
      }
    ],
    "keys": []
  }
];

const INITIAL_COUPONS = [
  {
    code: "NEXUS10",
    type: "percent",
    discount: 10,
    minOrder: 50000,
    usageLeft: 100,
    expiry: "2026-12-31",
    status: "active"
  },
  {
    code: "VIPGAMER",
    type: "fixed",
    discount: 30000,
    minOrder: 150000,
    usageLeft: 50,
    expiry: "2026-12-31",
    status: "active"
  },
  {
    code: "FREEFIRE20",
    type: "percent",
    discount: 20,
    minOrder: 100000,
    usageLeft: 30,
    expiry: "2026-11-30",
    status: "active"
  }
];

const INITIAL_FEEDBACKS = [
  {
    id: 1,
    author: "Nguyễn Tuấn Dũng (FF Pro)",
    avatar: "TD",
    game: "Free Fire iOS",
    rating: 5,
    date: "10 phút trước",
    image: "assets/uploads/products/fb-real-1.jpg",
    content: "Shop uy tín số 1! Mua file cài qua Filza vào game sấy tâm đỏ chót, không rung lắc mà an toàn tài khoản tuyệt đối.",
    product: "Aimlock Free Fire V2 PRO"
  },
  {
    id: 2,
    author: "Trần Minh Quân",
    avatar: "MQ",
    game: "Free Fire Android",
    rating: 5,
    date: "30 phút trước",
    image: "assets/uploads/products/fb-real-2.jpg",
    content: "Chuyển khoản MBBank quét mã VietQR tự động cộng số dư trong 3 giây. Key gửi tự động dùng cực mượt!",
    product: "AimLock Forget 2.0"
  },
  {
    id: 3,
    author: "Lê Hoàng Long",
    avatar: "HL",
    game: "Free Fire OB44",
    rating: 5,
    date: "1 giờ trước",
    image: "assets/uploads/products/fb-real-3.jpg",
    content: "DPI 100% cảm ứng lia tâm shotgun nhấc nhẹ ngón tay là gõ đầu, leo Thách Đấu bao mượt không lo tụt rank.",
    product: "Gói Tinh Chỉnh DPI 100%"
  },
  {
    id: 4,
    author: "Bùi Quốc Khánh",
    avatar: "QK",
    game: "Free Fire PC",
    rating: 5,
    date: "2 giờ trước",
    image: "assets/uploads/products/fb-real-4.jpg",
    content: "Admin hỗ trợ nhiệt tình đêm hôm vẫn trả lời ngay. Đã ủng hộ shop 3 lần rồi lần nào cũng ưng ý 100%.",
    product: "TrollModz (Adr · iOS · PC)"
  },
  {
    id: 5,
    author: "Phạm Hải Đăng",
    avatar: "HD",
    game: "Free Fire iOS",
    rating: 5,
    date: "3 giờ trước",
    image: "assets/uploads/products/fb-real-5.jpg",
    content: "Key cấp tức thì, giao diện web xịn sò mượt mà. Test vào trận kéo tâm MP40 đỏ lòe cả bảng đấu.",
    product: "Aimlock Head Filza"
  },
  {
    id: 6,
    author: "Vũ Đình Trọng",
    avatar: "DT",
    game: "Free Fire Mobile",
    rating: 5,
    date: "Hôm nay, 11:20",
    image: "assets/uploads/products/fb-real-6.jpg",
    content: "Cảm ơn shop đã tư vấn gói chuẩn cho máy yếu. Cài config FPS 120Hz mượt ru không nóng máy.",
    product: "Config Tối Ưu Máy Yếu 120FPS"
  },
  {
    id: 7,
    author: "Đỗ Anh Tuấn",
    avatar: "AT",
    game: "Free Fire",
    rating: 5,
    date: "Hôm nay, 09:45",
    image: "assets/uploads/products/fb-real-7.jpg",
    content: "Bắn trận nào ăn MVP trận đó, bạn bè rủ nhau mua cùng luôn. Đáng đồng tiền bát gạo!",
    product: "Forget Hex V5"
  },
  {
    id: 8,
    author: "Ngô Văn Hùng",
    avatar: "VH",
    game: "Free Fire Rank",
    rating: 5,
    date: "Hôm qua, 22:15",
    image: "assets/uploads/products/fb-real-8.jpg",
    content: "Quá đỉnh luôn shop ơi, bắn giải phong trào team win liền 5 trận liên tiếp. Sẽ giới thiệu cho anh em clan!",
    product: "Menu Filza-3105"
  },
  {
    id: 9,
    author: "Phan Thanh Sơn",
    avatar: "TS",
    game: "Free Fire iOS",
    rating: 5,
    date: "Hôm qua, 18:30",
    image: "assets/uploads/products/fb-real-9.jpg",
    content: "Hệ thống nạp tự động nhanh như chớp. Vừa chuyển tiền MBBank xong quay lại web là đã có tiền.",
    product: "Aimlock 3105"
  },
  {
    id: 10,
    author: "Đinh Công Minh",
    avatar: "CM",
    game: "Free Fire",
    rating: 5,
    date: "Hôm qua, 15:00",
    image: "assets/uploads/products/fb-real-10.jpg",
    content: "Feedback chuẩn cho shop 10 điểm uy tín. Không bao giờ lo bị lừa đảo hay mất acc.",
    product: "Aimneck 3105"
  },
  {
    id: 11,
    author: "Dương Minh Trí",
    avatar: "MT",
    game: "Free Fire Android",
    rating: 5,
    date: "02/10/2026",
    image: "assets/uploads/products/fb-real-11.jpg",
    content: "Gói VIP cài đặt siêu dễ, chỉ mất 1 phút là xong. Bắn sấy tầm xa tâm dính chặt vào đối phương.",
    product: "Aimlock Free Fire V1"
  },
  {
    id: 12,
    author: "Lâm Gia Huy",
    avatar: "GH",
    game: "Free Fire iOS",
    rating: 5,
    date: "01/10/2026",
    image: "assets/uploads/products/fb-real-12.jpg",
    content: "Test thử gói 1 ngày ưng quá nâng cấp luôn gói vĩnh viễn, shop bảo hành trách nhiệm tuyệt vời.",
    product: "Menu Migul Pro"
  },
  {
    id: 13,
    author: "Trần Bảo Nam",
    avatar: "BN",
    game: "Free Fire OB44",
    rating: 5,
    date: "30/09/2026",
    image: "assets/uploads/products/fb-real-13.jpg",
    content: "Cực kỳ ưng ý! Chăm sóc khách hàng siêu có tâm, hướng dẫn từ A-Z đến khi vào game bắn được mới thôi.",
    product: "Aimbody Filza"
  },
  {
    id: 14,
    author: "Nguyễn Khắc Việt",
    avatar: "KV",
    game: "Free Fire Tournament",
    rating: 5,
    date: "29/09/2026",
    image: "assets/uploads/products/fb-real-14.jpg",
    content: "Bắn giải trường ẵm luôn giải nhất, cảm ứng mượt không delay, cảm ơn shop rất nhiều!",
    product: "Aimlock V5 Siêu Cấp"
  },
  {
    id: 15,
    author: "Tạ Quang Hiếu",
    avatar: "QH",
    game: "Free Fire iOS",
    rating: 5,
    date: "28/09/2026",
    image: "assets/uploads/products/fb-real-15.jpg",
    content: "Shop làm ăn uy tín, nạp thẻ cào hay quét QR đều xử lý tự động trong tích tắc.",
    product: "Auto Guideline Free Fire"
  }
];

const INITIAL_MEMBERS = [
  { id: 1001, username: "admin_viet", email: "tranquocviet@nexus.vn", balance: 5000000, role: "Owner", createdAt: "2026-01-01" },
  { id: 1002, username: "manager_nam", email: "namhoang@gmail.com", balance: 1250000, role: "Admin", createdAt: "2026-03-12" },
  { id: 1003, username: "seller_tuankiet", email: "kietpro@gmail.com", balance: 450000, role: "Seller", createdAt: "2026-05-20" },
  { id: 1004, username: "khachhang_01", email: "player01@gmail.com", balance: 200000, role: "Member", createdAt: "2026-09-10" }
];

window.NEXUS_DATA = {
  CONFIG: NEXUS_CONFIG,
  PRODUCTS: INITIAL_PRODUCTS,
  COUPONS: INITIAL_COUPONS,
  FEEDBACKS: INITIAL_FEEDBACKS,
  MEMBERS: INITIAL_MEMBERS
};
