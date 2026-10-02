/**
 * @typedef {Object} Product
 * @property {number} id - Unique identifier for the product
 * @property {string} name - Display name of the product
 * @property {number} price - Price in VND
 * @property {'aimlock' | 'dpi' | 'filza'} category - Category slug
 * @property {string[]} platforms - Supported OS/Platforms
 * @property {string} badge - Highlight badge text
 * @property {string} icon - FontAwesome icon class name
 * @property {string} color - Primary branding hex color
 * @property {string} description - Detailed description
 * @property {string[]} features - Feature highlights list
 */

/** @type {Product[]} */
const PRODUCTS_DATA = [
    {
        id: 1,
        name: "Aimlock V1",
        price: 20000,
        category: "aimlock",
        platforms: ["iOS", "Android", "PC"],
        badge: "HOT",
        icon: "fa-crosshairs",
        color: "#a855f7",
        description: "Gói Aimlock cơ bản phiên bản V1, hỗ trợ ghìm tâm mượt mà, độ nhạy chuẩn, phù hợp cho người mới bắt đầu trải nghiệm.",
        features: ["Kéo tâm chuẩn 80%", "Hỗ trợ full dòng máy", "Cài đặt nhanh gọn", "An toàn tài khoản"]
    },
    {
        id: 2,
        name: "Aimlock V2",
        price: 50000,
        category: "aimlock",
        platforms: ["iOS", "Android", "PC"],
        badge: "PHỔ BIẾN",
        icon: "fa-bullseye",
        color: "#3b82f6",
        description: "Aimlock nâng cấp V2 tăng tốc độ bám mục tiêu, ổn định tâm súng khi sấy tầm xa và cận chiến.",
        features: ["Khóa tâm êm ái", "Tương thích iOS/Android", "Bảo hành 1 đổi 1", "Tối ưu FPS"]
    },
    {
        id: 3,
        name: "Aimlock V3",
        price: 100000,
        category: "aimlock",
        platforms: ["iOS", "Android", "PC"],
        badge: "VIP",
        icon: "fa-crosshairs",
        color: "#ec4899",
        description: "Aimlock V3 phiên bản cải tiến vượt trội, khóa mục tiêu cực nhạy, không rung lắc, hỗ trợ leo rank mượt mà.",
        features: ["Auto headshot cao", "Anti-detect an toàn", "Bảo hành cập nhật", "Hỗ trợ setup qua Ultraview"]
    },
    {
        id: 4,
        name: "Aimlock V4",
        price: 200000,
        category: "aimlock",
        platforms: ["iOS", "Android", "PC"],
        badge: "PRO",
        icon: "fa-meteor",
        color: "#f59e0b",
        description: "Aimlock V4 thuật toán định vị tâm súng thế hệ mới, tự động bám đầu khi lia súng cực nhanh.",
        features: ["Bám sát mục tiêu 95%", "Hỗ trợ tất cả súng", "Chống ban tuyệt đối", "Update trọn đời gói"]
    },
    {
        id: 5,
        name: "Aimlock V5",
        price: 300000,
        category: "aimlock",
        platforms: ["iOS", "Android", "PC"],
        badge: "SIÊU CẤP",
        icon: "fa-crown",
        color: "#ef4444",
        description: "Bản Aimlock V5 tối tân nhất của hệ thống, chuẩn thi đấu, hỗ trợ tâm súng hoàn hảo mọi góc bắn.",
        features: ["Độ chuẩn xác 99%", "Bypass bảo vệ tối đa", "Hỗ trợ 1-1 riêng", "Tặng kèm file Dpi VIP"]
    },
    {
        id: 6,
        name: "Dpi 60%",
        price: 20000,
        category: "dpi",
        platforms: ["iOS", "Android"],
        badge: "TIẾT KIỆM",
        icon: "fa-sliders",
        color: "#06b6d4",
        description: "Tăng độ nhạy màn hình thêm 60%, giúp vuốt tâm nhẹ hơn, vuốt mượt không lo giật khựng.",
        features: ["Tăng độ nhạy 60%", "Không tốn pin", "Không nóng máy", "Cài trực tiếp dễ dàng"]
    },
    {
        id: 7,
        name: "Dpi 70%",
        price: 50000,
        category: "dpi",
        platforms: ["iOS", "Android"],
        badge: "TIÊU CHUẨN",
        icon: "fa-sliders",
        color: "#10b981",
        description: "Tối ưu hóa phản hồi cảm ứng 70%, cảm giác vuốt cực đầm và bám tay khi quay 360 độ.",
        features: ["Tăng độ nhạy 70%", "Mượt mà từng khung hình", "Tương thích mọi màn hình", "Hỗ trợ mọi game"]
    },
    {
        id: 8,
        name: "Dpi 80%",
        price: 100000,
        category: "dpi",
        platforms: ["iOS", "Android"],
        badge: "CAO CẤP",
        icon: "fa-gauge-high",
        color: "#8b5cf6",
        description: "Tăng 80% độ nhạy vuốt tâm cao cấp, cân bằng giữa tốc độ lia và độ chuẩn xác vào đầu.",
        features: ["Độ nhạy 80% tối ưu", "Hỗ trợ kéo tâm cực bay", "Chống trễ cảm ứng", "Bảo hành vĩnh viễn"]
    },
    {
        id: 9,
        name: "Dpi 90%",
        price: 150000,
        category: "dpi",
        platforms: ["iOS", "Android"],
        badge: "CHUYÊN NGHIỆP",
        icon: "fa-gauge-simple-high",
        color: "#f97316",
        description: "Độ nhạy 90% siêu tốc, vuốt nhẹ là bay tâm lên đầu đối thủ, cực kỳ thích hợp cho shotgun và súng tỉa.",
        features: ["Tăng 90% độ nhạy", "Cảm ứng siêu nhạy", "Không ảnh hưởng máy", "Tự động config"]
    },
    {
        id: 10,
        name: "Dpi 100%",
        price: 200000,
        category: "dpi",
        platforms: ["iOS", "Android"],
        badge: "MAX SPEED",
        icon: "fa-bolt-lightning",
        color: "#e11d48",
        description: "Max tối đa 100% độ nhạy cảm ứng, tốc độ lia màn hình đỉnh cao của các tuyển thủ chuyên nghiệp.",
        features: ["Max 100% tốc độ", "Lia tâm không giới hạn", "Tối ưu cảm ứng 120Hz", "Hỗ trợ cài đặt trọn gói"]
    },
    {
        id: 11,
        name: "Aimlock Head Filza",
        price: 100000,
        category: "filza",
        platforms: ["iOS", "Filza"],
        badge: "FILZA VIP",
        icon: "fa-head-side-virus",
        color: "#6366f1",
        description: "File mod Aimlock Head cài đặt chuẩn qua Filza cho iOS, ghim chặt vùng đầu đối thủ khi ngắm bắn.",
        features: ["Khóa vùng đầu 100%", "Cài qua Filza tiện lợi", "Không cần Jailbreak sâu", "Hỗ trợ iOS 15 - iOS 18"]
    },
    {
        id: 12,
        name: "Aimbody Filza",
        price: 100000,
        category: "filza",
        platforms: ["iOS", "Filza"],
        badge: "FILZA BODY",
        icon: "fa-person",
        color: "#14b8a6",
        description: "File Aimbody cài qua Filza, tâm tự động hút chặt vào thân người, sát thương chuẩn và cực kỳ an toàn.",
        features: ["Tâm hút thân ổn định", "Tỷ lệ trúng đạn 100%", "Cài qua Filza an toàn", "Bảo hành chống phát hiện"]
    },
    {
        id: 13,
        name: "Aimneck 3105",
        price: 100000,
        category: "filza",
        platforms: ["iOS", "Android", "PC"],
        badge: "VIP 3105",
        icon: "fa-crosshairs",
        color: "#d946ef",
        description: "Bản cấu hình Aimneck mã hiệu 3105 độc quyền, ghim vùng cổ đẩy tâm lên đầu siêu tự nhiên không bị nghi ngờ.",
        features: ["Tâm ghim vùng cổ - đầu", "Bắn cực kỳ kín đáo", "Bản quyền mã 3105", "Update file khi game cập nhật"]
    },
    {
        id: 14,
        name: "Aimlock 3105",
        price: 100000,
        category: "filza",
        platforms: ["iOS", "Android", "PC"],
        badge: "CHÍNH HÃNG 3105",
        icon: "fa-bullseye",
        color: "#eab308",
        description: "Aimlock 3105 phiên bản hoàn thiện nhất, ghìm tâm chắc chắn mọi loại vũ khí, tối ưu cho cả máy yếu.",
        features: ["Khóa tâm 3105 ổn định", "Mượt mà không drop FPS", "Tương thích đa thiết bị", "Hỗ trợ trọn đời"]
    },
    {
        id: 15,
        name: "Định Vị Người",
        price: 100000,
        category: "filza",
        platforms: ["iOS", "Android", "PC"],
        badge: "RADAR ESP",
        icon: "fa-location-crosshairs",
        color: "#0ea5e9",
        description: "Định vị vị trí đối thủ trên bản đồ và radar, phát hiện khoảng cách, hướng di chuyển chính xác 100%.",
        features: ["Hiển thị vị trí địch", "Báo khoảng cách mét", "An toàn không lộ", "Cài đặt nhanh chóng"]
    },
    {
        id: 16,
        name: "Menu Filza-3105",
        price: 100000,
        category: "filza",
        platforms: ["iOS", "Filza"],
        badge: "ALL IN ONE",
        icon: "fa-bars-staggered",
        color: "#f43f5e",
        description: "Menu tổng hợp đầy đủ tính năng Filza và 3105, bật tắt tùy chọn nhanh chóng ngay trong trận đấu.",
        features: ["Full tính năng gộp", "Menu giao diện trực quan", "Bật tắt linh hoạt", "Hỗ trợ Filza độc quyền"]
    }
];

// Universal Module Support
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PRODUCTS_DATA };
}
