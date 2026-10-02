
// ===== FREE FILE ADMIN BOOTSTRAP (robust dynamic/admin-tab handler) =====
// Đặt ở đầu file để nút FREE vẫn hoạt động kể cả khi các tab admin được render động.
(function initFreeFileAdminBootstrap(){
  function toggleFreeFileForm(){
    const box=document.getElementById('addFreeFileFormContainer');
    if(!box) return false;
    const opening=box.style.display!=='block';
    if(opening){
      if(typeof window.resetFreeFileForm==='function') window.resetFreeFileForm();
      box.style.display='block';
      if(typeof window.syncFreeFileSourceUI==='function') window.syncFreeFileSourceUI();
    }else{
      box.style.display='none';
    }
    return false;
  }
  window.ZeusOpenFreeFile=toggleFreeFileForm;
  window.ZeusCancelFreeFile=function(){
    const box=document.getElementById('addFreeFileFormContainer');
    if(box) box.style.display='none';
    if(typeof window.resetFreeFileForm==='function') window.resetFreeFileForm();
    return false;
  };
  document.addEventListener('click',function(e){
    const open=e.target.closest && e.target.closest('#btnOpenAddFreeFile');
    if(open){ e.preventDefault(); e.stopImmediatePropagation(); toggleFreeFileForm(); return; }
    const cancel=e.target.closest && e.target.closest('#btnCancelAddFreeFile');
    if(cancel){ e.preventDefault(); e.stopImmediatePropagation(); window.ZeusCancelFreeFile(); }
  },true);
  document.addEventListener('change',function(e){
    if(e.target && e.target.matches && e.target.matches('input[name="freeFileSource"]')){
      if(typeof window.syncFreeFileSourceUI==='function') window.syncFreeFileSourceUI();
    }
  },true);
})();


// random-product-open-delegation
document.addEventListener('click', function(e){
    const trigger=e.target.closest('#randomProductCard, .random-product-open');
    if(trigger){
        e.preventDefault();
        e.stopPropagation();
        openRandomModal();
    }
});

// ============================================================
// VPHI SHOP - FULL-STACK CLIENT SCRIPT
// Tích hợp RESTful API với FastAPI Backend & SQLite
// ============================================================

/* Zeus Anti-debug disabled for lag-free performance */

// ========== ANTI-BUG & DATABASE PROTECTION SYSTEM ==========
(function initAntiBugProtection() {
    'use strict';

    const bugProtection = {
        requestCache: new Map(),
        requestTimestamps: [],
        maxRequestsPerMinute: 60,
        blockList: new Set(),
        xssPatterns: [
            /<script[^>]*>.*?<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe/gi,
            /<object/gi,
            /<embed/gi
        ]
    };

    // 1. Global Error Handler - Catch all unhandled errors
    window.addEventListener('error', function(e) {
        if (e.message && e.message.includes('Uncaught')) {
            // Log but don't expose sensitive info
            console.error = function() {};
        }
    });

    // 2. Unhandled Promise Rejection Handler
    window.addEventListener('unhandledrejection', function(event) {
        event.preventDefault();
        // Silently handle to prevent exposure
    });

    // 3. Request Rate Limiting & DDoS Protection
    function checkRateLimit(endpoint) {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;

        // Clean old timestamps
        bugProtection.requestTimestamps = bugProtection.requestTimestamps.filter(t => t > oneMinuteAgo);

        // Check if too many requests
        if (bugProtection.requestTimestamps.length >= bugProtection.maxRequestsPerMinute) {
            throw new Error('Too many requests. Please try again later.');
        }

        bugProtection.requestTimestamps.push(now);
        return true;
    }

    // 4. SQL Injection Protection
    // IMPORTANT: SQL injection protection is enforced ONLY on the server using
    // parameterized queries. Never blacklist SQL words in user content: valid
    // product names, keys and descriptions can legitimately contain them.
    function detectSQLInjection(input) {
        return false;
    }

    // 5. XSS Protection & Input Sanitization
    function sanitizeInput(input, type = 'text') {
        if (typeof input !== 'string') return '';
        
        let sanitized = input.trim();

        // Check for XSS patterns
        for (let pattern of bugProtection.xssPatterns) {
            if (pattern.test(sanitized)) {
                return ''; // Return empty if XSS detected
            }
        }

        // Type-specific sanitization
        switch(type) {
            case 'email':
                sanitized = sanitized.replace(/[^a-zA-Z0-9@.\-_]/g, '');
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) return '';
                break;
            
            case 'username':
                sanitized = sanitized.replace(/[^a-zA-Z0-9_\-]/g, '');
                if (sanitized.length < 3 || sanitized.length > 50) return '';
                break;
            
            case 'number':
                sanitized = sanitized.replace(/[^0-9\-]/g, '');
                if (isNaN(parseInt(sanitized))) return '';
                break;
            
            case 'html':
                // Escape HTML entities
                sanitized = sanitized
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#x27;')
                    .substring(0, 1000); // Limit length
                break;
            
            default:
                // Generic text sanitization
                sanitized = sanitized.replace(/[<>\"']/g, '').substring(0, 500);
        }

        return sanitized;
    }

    // 6. Request Validation Wrapper
    function validateRequest(method, endpoint, data) {
        // Check rate limiting
        checkRateLimit(endpoint);

        // Validate endpoint
        if (typeof endpoint !== 'string' || !endpoint.startsWith('/')) {
            throw new Error('Invalid endpoint');
        }

        // Validate method
        if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].includes(method.toUpperCase())) {
            throw new Error('Invalid HTTP method');
        }

        // Validate data if present
        if (data && typeof data === 'object') {
            for (let key in data) {
                if (data.hasOwnProperty(key)) {
                    const value = data[key];
                    
                    // Do NOT run a client-side SQL blacklist over API payloads.
                    // The backend uses parameterized SQL queries; the old blacklist
                    // incorrectly rejected legitimate product/key data (e.g. words
                    // like "select", punctuation, hyphens, semicolons, etc.).
                    // Keep request data unchanged so keys, coupon codes and product
                    // names are not silently corrupted before reaching the backend.
                    void key;
                    void value;
                }
            }
        }

        return true;
    }

    // 7. Response Validation
    function validateResponse(response) {
        if (!response || typeof response !== 'object') {
            throw new Error('Invalid server response');
        }

        // Check for suspicious response patterns
        const jsonStr = JSON.stringify(response);
        if (jsonStr.length > 10000000) { // 10MB limit
            throw new Error('Response too large');
        }

        return response;
    }

    // 8. Secure Storage - Encrypt sensitive data
    const SecureStorage = {
        set: function(key, value) {
            try {
                // Simple obfuscation (for production use proper encryption library)
                const encoded = btoa(JSON.stringify(value));
                const hash = key.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
                localStorage.setItem(`secure_${key}_${Math.abs(hash)}`, encoded);
            } catch (e) {
                // Fail silently
            }
        },
        get: function(key) {
            try {
                const hash = key.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
                const encoded = localStorage.getItem(`secure_${key}_${Math.abs(hash)}`);
                return encoded ? JSON.parse(atob(encoded)) : null;
            } catch (e) {
                return null;
            }
        },
        remove: function(key) {
            try {
                const hash = key.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
                localStorage.removeItem(`secure_${key}_${Math.abs(hash)}`);
            } catch (e) {
                // Fail silently
            }
        }
    };

    // 9. Session lifetime is enforced server-side (30 minutes).

    // 10. CSRF Token Management
    const csrfToken = Math.random().toString(36).substr(2) + Date.now().toString(36);
    window.__CSRF_TOKEN__ = csrfToken;

    function getCSRFToken() {
        return window.__CSRF_TOKEN__;
    }

    // 11. Data Validation Utilities
    const DataValidator = {
        isValidEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        isValidUsername: (username) => /^[a-zA-Z0-9_\-]{3,50}$/.test(username),
        isValidPassword: (password) => password.length >= 6 && password.length <= 100,
        isValidAmount: (amount) => !isNaN(amount) && amount > 0 && amount <= 50000000,
        isValidURL: (url) => {
            try {
                const value = String(url || '').trim();
                if (/^\/(uploads|files)\//i.test(value)) return true;
                if (/^https?:\/\//i.test(value)) { new URL(value); return true; }
                return false;
            } catch (e) { return false; }
        },
        isValidJSON: (json) => {
            try {
                JSON.parse(json);
                return true;
            } catch (e) {
                return false;
            }
        }
    };

    // 12. Inject Validation into Global Scope
    window.validateRequest = validateRequest;
    window.validateResponse = validateResponse;
    window.sanitizeInput = sanitizeInput;
    window.DataValidator = DataValidator;
    window.SecureStorage = SecureStorage;
    window.getCSRFToken = getCSRFToken;

    // 13. Disable Dangerous Browser APIs
    if (navigator.sendBeacon) {
        // Override to prevent data exfiltration
        const originalSendBeacon = navigator.sendBeacon;
        navigator.sendBeacon = function(url, data) {
            if (url.includes('tracking') || url.includes('analytics')) {
                return false;
            }
            return originalSendBeacon.apply(navigator, arguments);
        };
    }

    // 14. Protect Against LocalStorage Theft (MODIFIED - gentler approach)
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
        // Only apply lightweight protection, don't break storage
        // Sensitive items are already handled by SecureStorage
        return originalSetItem.call(this, key, value);
    };

    // 15. Monitor for Unusual DOM Manipulation
    const originalAppendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function(node) {
        if (node.tagName === 'SCRIPT' && node.src && node.src.includes('eval')) {
            return null; // Block malicious scripts
        }
        return originalAppendChild.call(this, node);
    };

    // 16. Protect Against Frame Injection (DISABLED - can cause issues with legitimate framing)
    // Uncomment if needed:
    // if (window.self !== window.top) {
    //     window.top.location = window.self.location;
    // }

})();

// ========== ZEUS ANTI-SCRAPE & DATA PROTECTION CLIENT-SIDE v5.0 ==========
(function initZeusAntiScrape() {
    'use strict';

    // --- 1. Chặn copy/cut toàn bộ nội dung page (chỉ cho phép copy trong ô input/textarea) ---
    document.addEventListener('copy', function(e) {
        const active = document.activeElement;
        const allowed = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.closest('[contenteditable]'));
        // Cho phép copy từ nút copy chính thức (có data-allow-copy)
        const selection = window.getSelection();
        const fromCopyBtn = selection && selection.anchorNode && selection.anchorNode.parentElement && selection.anchorNode.parentElement.closest('[data-allow-copy]');
        if (!allowed && !fromCopyBtn) {
            const sel = window.getSelection();
            if (sel && sel.toString().length > 200) {
                // Chuỗi dài > 200 ký tự -> chặn (bulk copy)
                e.clipboardData && e.clipboardData.setData('text/plain', '');
                e.preventDefault();
            }
        }
    }, true);

    // --- 2. Chặn Ctrl+A (select all) trên trang chủ khi không ở trong input ---
    document.addEventListener('keydown', function(e) {
        const active = document.activeElement;
        const inInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
        if (!inInput && (e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
            e.preventDefault();
        }
    }, true);

    // --- 3. Product API client-side rate limiter (hỗ trợ server-side) ---
    const _apiCallTimes = {};
    const _origFetch = window.fetch;
    window.fetch = function(input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        if (url.includes('/api/products')) {
            const now = Date.now();
            _apiCallTimes['/api/products'] = (_apiCallTimes['/api/products'] || []).filter(t => now - t < 60000);
            _apiCallTimes['/api/products'].push(now);
            if (_apiCallTimes['/api/products'].length > 60) {
                // Client tự chặn nếu gọi quá 60 lần/phút (bình thường không bao giờ xảy ra với người dùng thật)
                return Promise.reject(new Error('⛔ Zeus Shield: Quá nhiều yêu cầu. Vui lòng thử lại sau.'));
            }
        }
        return _origFetch.apply(this, arguments);
    };

    // --- 4. Vô hiệu hoá drag-to-copy trên product cards ---
    document.addEventListener('dragstart', function(e) {
        const card = e.target.closest && e.target.closest('.product-card');
        if (card) e.preventDefault();
    }, true);

    // --- 5. Obfuscate product description text để chặn copy-paste hàng loạt bằng extension ---
    // Áp dụng CSS user-select: none trên product description (không ảnh hưởng UX)
    const style = document.createElement('style');
    style.textContent = `
        .product-description { user-select: none; -webkit-user-select: none; }
        .product-name        { user-select: none; -webkit-user-select: none; }
        .product-grid        { -webkit-touch-callout: none; }
    `;
    document.head.appendChild(style);

    // --- 6. Detect automation fingerprint (Playwright / Selenium / Puppeteer) ---
    const botSignals = [
        () => navigator.webdriver === true,
        () => !!window.callPhantom,
        () => !!window._phantom,
        () => !!window.__nightmare,
        () => !!window.domAutomation,
        () => typeof window.Buffer !== 'undefined' && !window.crypto,
    ];
    const isBot = botSignals.some(fn => { try { return fn(); } catch(e) { return false; } });
    if (isBot) {
        // Ẩn toàn bộ nội dung, không crash page
        document.addEventListener('DOMContentLoaded', function() {
            document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#0a0a0a;color:#ef4444;font-size:18px;">⛔ Zeus Shield: Truy cập tự động bị từ chối.</div>';
        });
    }

})();

// --- 1. CẤU HÌNH API CLIENT & MÃ HÓA STORAGE BẢO MẬT ---
const ZeusEncryptedStorage = {
    _key: 'ZEUS_SECURE_CIPHER_2026_XITERS',
    _xor: function(str) {
        let out = '';
        for (let i = 0; i < str.length; i++) {
            out += String.fromCharCode(str.charCodeAt(i) ^ this._key.charCodeAt(i % this._key.length));
        }
        return out;
    },
    setItem: function(key, val) {
        try {
            const raw = typeof val === 'string' ? val : JSON.stringify(val);
            const enc = btoa(encodeURIComponent(this._xor(raw)));
            localStorage.setItem('__zeus_enc_' + key, enc);
            localStorage.removeItem(key);
        } catch (e) {
            localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
        }
    },
    getItem: function(key) {
        try {
            const enc = localStorage.getItem('__zeus_enc_' + key);
            if (enc) {
                const dec = this._xor(decodeURIComponent(atob(enc)));
                try { return JSON.parse(dec); } catch(e) { return dec; }
            }
            const plain = localStorage.getItem(key) || localStorage.getItem(key.toLowerCase());
            if (plain) {
                this.setItem(key, plain);
                try { return JSON.parse(plain); } catch(e) { return plain; }
            }
            return null;
        } catch (e) {
            return localStorage.getItem(key);
        }
    },
    removeItem: function(key) {
        localStorage.removeItem('__zeus_enc_' + key);
        localStorage.removeItem(key);
        localStorage.removeItem(key.toLowerCase());
    }
};

const API_BASE = '';
let authToken = ZeusEncryptedStorage.getItem('Xiters_auth_token') || null;

let currentSettings = {
    shop_name: "",
    shop_slogan: "",
    bank_name: "",
    bank_code: "",
    bank_account: "",
    bank_owner: "",
    syntax_prefix: "",
    hotline: "",
    zalo_link: "",
    telegram_link: "",
    facebook_link: "",
    notification_banner: ""
};

async function fetchShopSettings() {
    try {
        const res = await api('/api/settings');
        if (res.success && res.settings) {
            currentSettings = { ...currentSettings, ...res.settings };
            applyShopSettings();
        }
    } catch (e) {
        console.warn('Using default shop settings:', e);
    }
}

function applyShopSettings() {
    if (currentSettings.shop_name) {
        document.title = `${currentSettings.shop_name} | Hệ Thống Bán Key Game & Nạp Auto Bank 24/7`;
        document.querySelectorAll('.logo-text').forEach(el => {
            el.innerHTML = `${currentSettings.shop_name.replace('Shop', '')}<span class="logo-highlight">Shop</span>`;
        });
    }
    const hotlineEl = document.getElementById('footerHotlineText');
    if (hotlineEl) hotlineEl.textContent = currentSettings.hotline;
    
    const zaloEl = document.getElementById('footerZaloLink');
    if (zaloEl) zaloEl.href = currentSettings.zalo_link;
    
    const teleEl = document.getElementById('footerTelegramLink');
    if (teleEl) teleEl.href = currentSettings.telegram_link;
    
    const fbEl = document.getElementById('footerFacebookLink');
    if (fbEl) fbEl.href = currentSettings.facebook_link;

    const bannerEl = document.getElementById('announcementText');
    if (bannerEl) bannerEl.textContent = currentSettings.notification_banner;

    // Contact Widget
    const cwZalo = document.querySelector('.contact-widget-item.zalo');
    if (cwZalo) cwZalo.href = currentSettings.zalo_link;
    const cwTele = document.querySelector('.contact-widget-item.telegram');
    if (cwTele) cwTele.href = currentSettings.telegram_link;
    const cwFb = document.querySelector('.contact-widget-item.facebook');
    if (cwFb) cwFb.href = currentSettings.facebook_link;

    // Update Topup QR if modal is open
    if (typeof updateTopupQR === 'function') {
        updateTopupQR();
    }
}

async function api(endpoint, method = 'GET', data = null, requiresAuth = false, extraHeaders = {}) {
    try {
        // Validate request parameters
        validateRequest(method, endpoint, data);

        const headers = { 
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCSRFToken()
        };
        
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        Object.assign(headers, extraHeaders || {});
        
        const config = { method, headers };
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            config.body = JSON.stringify(data);
        }
        
        const res = await fetch(`${API_BASE}${endpoint}`, config);
        const rawText = await res.text();
        let json = {};
        try { json = rawText ? JSON.parse(rawText) : {}; }
        catch (_) {
            const fallback = rawText?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            json = { detail: fallback || `HTTP ${res.status}: Máy chủ trả về dữ liệu không hợp lệ` };
        }
        
        // Validate response
        validateResponse(json);
        
        // Handle unauthorized/token expired
        if (res.status === 401 || (json.detail && json.detail.includes('401'))) {
            authToken = null;
            ZeusEncryptedStorage.removeItem('Xiters_auth_token');
            currentUser = null;
            updateNavbar();
            throw new Error('Session expired. Please login again.');
        }
        
        // Handle Zeus Anti-DDoS & Rate Limit (Status 429 hoặc Error code Rate Limit)
        if (res.status === 429 || (json.error_code && json.error_code.includes('RATE_LIMIT'))) {
            const retrySeconds = json.retry_after || 60;
            const message = json.detail || 'IP của bạn gửi yêu cầu quá nhanh liên tục!';
            if (typeof showZeusRateLimitPopup === 'function') {
                showZeusRateLimitPopup(message, retrySeconds);
            }
            throw new Error(message);
        }
        
        if (!res.ok) {
            const errorMsg = json.detail || json.message || `HTTP ${res.status}: Request failed`;
            throw new Error(String(errorMsg).substring(0, 200)); // Limit error message
        }
        
        return json;
    } catch (err) {
        // Sanitized error logging
        const sanitizedError = String(err.message || err).substring(0, 200);
        throw new Error(sanitizedError);
    }
}

// --- 2. TRẠNG THÁI TOÀN CỤC ---
let currentUser = null;
let currentProduct = null;
let currentQuantity = 1;
let currentFilter = 'all';
let currentSort = 'newest';
let searchQuery = '';
let productsList = [];
// ── Phân trang sản phẩm (chống đào data hàng loạt) ──
let currentPage = 1;

// ─────────────────────────────────────────────────────────────
// GROUPED PRODUCT / VARIANTS SYSTEM
// Variants được lưu trong description với prefix __VARIANTS__:
// Format: __VARIANTS__:JSON\n---\nMô tả thực
// JSON: [{label:"1 Giờ",price:5000,keys_product_id:null},{...}]
// Nếu keys_product_id null thì dùng keys của product cha
// ─────────────────────────────────────────────────────────────
function parseVariants(description) {
    if (!description || !description.startsWith('__VARIANTS__:')) return null;
    try {
        const raw = description.replace('__VARIANTS__:', '');
        const sepIdx = raw.indexOf('\n---\n');
        const jsonStr = sepIdx !== -1 ? raw.substring(0, sepIdx) : raw;
        const variants = JSON.parse(jsonStr);
        if (Array.isArray(variants) && variants.length > 0) return variants;
    } catch(e) {}
    return null;
}
function getRealDescription(description) {
    if (!description || !description.startsWith('__VARIANTS__:')) return description;
    const raw = description.replace('__VARIANTS__:', '');
    const sepIdx = raw.indexOf('\n---\n');
    return sepIdx !== -1 ? raw.substring(sepIdx + 5) : '';
}
function buildVariantsDescription(variants, realDesc) {
    return '__VARIANTS__:' + JSON.stringify(variants) + '\n---\n' + (realDesc || '');
}

// ─────────────────────────────────────────────────────────────
// AUTO-GROUP ENGINE
// Tự động nhận diện và gộp sản phẩm có tên gốc giống nhau +
// suffix thời gian (1h, 1d, 1w, 1m, 1 giờ, 1 ngày…)
// ─────────────────────────────────────────────────────────────

// Các pattern thời gian + thứ tự sắp xếp
// Safari-safe: bỏ dấu tiếng Việt trước khi match
function stripDiacritics(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Pattern thời gian - Safari-safe (không dùng \b với Unicode, không dùng \p{})
const TIME_PATTERNS = [
    // số + đơn vị viết tắt/tiếng Anh - match trên tên gốc
    { re: /(\d+)\s*h(?:ours?)?(?=[^a-zA-Z]|$)/i,   mul: 1,      label: v => v + ' Giờ' },
    { re: /(\d+)\s*d(?:ays?)?(?=[^a-zA-Z]|$)/i,    mul: 24,     label: v => v + ' Ngày' },
    { re: /(\d+)\s*w(?:eeks?)?(?=[^a-zA-Z]|$)/i,   mul: 24*7,   label: v => v + ' Tuần' },
    { re: /(\d+)\s*m(?:onths?)?(?=[^a-zA-Z]|$)/i,  mul: 24*30,  label: v => v + ' Tháng' },
    { re: /(\d+)\s*y(?:ears?)?(?=[^a-zA-Z]|$)/i,   mul: 24*365, label: v => v + ' Năm' },
    // Vĩnh Viễn / VV / Lifetime - match trên tên gốc
    { re: /(?:^|\s)VV(?=\s|$)/,                          mul: 24*365*99, label: () => 'Vĩnh Viễn', fixed: 1 },
    { re: /(?:^|\s)lifetime(?=\s|$)/i,                   mul: 24*365*99, label: () => 'Vĩnh Viễn', fixed: 1 },
    { re: /(?:^|\s)V[iĩ]nh\s*Vi[eễ]n(?=\s|$)/i,        mul: 24*365*99, label: () => 'Vĩnh Viễn', fixed: 1 },
    // Vĩnh Viễn tiếng Việt bỏ dấu - match trên stripped
    { rs: /(?:^|\s)vinh\s*vien(?=\s|$)/i,                mul: 24*365*99, label: () => 'Vĩnh Viễn', fixed: 1 },
    { rs: /(?:^|\s)vv(?=\s|$)/,                          mul: 24*365*99, label: () => 'Vĩnh Viễn', fixed: 1 },
    // số + tiếng Việt - match trên stripped (đã bỏ dấu)
    { rs: /(\d+)\s*gio(?:\s|$)/i,    mul: 1,      label: v => v + ' Giờ' },
    { rs: /(\d+)\s*ngay(?:\s|$)/i,   mul: 24,     label: v => v + ' Ngày' },
    { rs: /(\d+)\s*tuan(?:\s|$)/i,   mul: 24*7,   label: v => v + ' Tuần' },
    { rs: /(\d+)\s*thang(?:\s|$)/i,  mul: 24*30,  label: v => v + ' Tháng' },
    { rs: /(\d+)\s*nam(?:\s|$)/i,    mul: 24*365, label: v => v + ' Năm' },
    // không có số - match trên stripped
    { rs: /(?:^|\s)gio(?:\s|$)/i,     mul: 1,      label: () => '1 Giờ',   fixed: 1 },
    { rs: /(?:^|\s)ngay(?:\s|$)/i,    mul: 24,     label: () => '1 Ngày',  fixed: 1 },
    { rs: /(?:^|\s)tuan(?:\s|$)/i,    mul: 24*7,   label: () => '1 Tuần',  fixed: 1 },
    { rs: /(?:^|\s)thang(?:\s|$)/i,   mul: 24*30,  label: () => '1 Tháng', fixed: 1 },
    { rs: /(?:^|\s)nam(?:\s|$)/i,     mul: 24*365, label: () => '1 Năm',   fixed: 1 },
];

function detectTimeSuffix(name) {
    const normalized = name.trim();
    const stripped = stripDiacritics(normalized);
    for (const pat of TIME_PATTERNS) {
        const useStripped = !!pat.rs;
        const re = pat.re || pat.rs;
        const target = useStripped ? stripped : normalized;
        const m = target.match(re);
        if (!m) continue;
        const num = pat.fixed ? pat.fixed : parseInt(m[1]);
        if (!num || isNaN(num)) continue;
        const label = pat.label(num);
        const sortKey = num * pat.mul;
        const baseName = normalized
            .replace(m[0].trim(), '')
            .replace(/[-_|,.:;\s]+$/, '')
            .replace(/^[-_|,.:;\s]+/, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        if (baseName.length < 2) continue;
        return { baseName, timeLabel: label, sortKey };
    }
    return null;
}

/**
 * Chuẩn hoá tên để so sánh: lowercase, bỏ dấu, bỏ ký tự đặc biệt
 */
function normalizeBaseName(name) {
    return name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // bỏ dấu
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Nhóm danh sách sản phẩm:
 * - Sản phẩm đã có __VARIANTS__ giữ nguyên
 * - Sản phẩm phát hiện được suffix thời gian → gộp theo baseName
 * - Còn lại giữ nguyên
 */
function autoGroupProducts(products) {
    const result = [];
    const grouped = new Map(); // normalizedBase → { rep, variants[] }

    for (const p of products) {
        // Nếu đã có variants thủ công → giữ nguyên, không auto-group
        if (parseVariants(p.description)) {
            result.push(p);
            continue;
        }
        const detected = detectTimeSuffix(p.name);
        if (!detected) {
            // Không có suffix thời gian → sản phẩm thường
            result.push(p);
            continue;
        }
        const key = normalizeBaseName(detected.baseName);
        if (!grouped.has(key)) {
            grouped.set(key, { baseName: detected.baseName, variants: [], rep: p });
        }
        grouped.get(key).variants.push({
            label: detected.timeLabel,
            price: p.price,
            sortKey: detected.sortKey,
            _origProduct: p
        });
    }

    // Xây dựng grouped cards
    for (const [, group] of grouped) {
        if (group.variants.length === 1) {
            // Chỉ có 1 variant → không gộp, hiện bình thường
            result.push(group.variants[0]._origProduct);
            continue;
        }
        // Sắp xếp variants theo thời gian tăng dần
        group.variants.sort((a, b) => a.sortKey - b.sortKey);
        const cleanVariants = group.variants.map(v => ({ label: v.label, price: v.price }));
        // Dùng sản phẩm đầu tiên (ngắn nhất) làm đại diện
        const rep = group.rep;
        const syntheticProduct = Object.assign({}, rep, {
            name: group.baseName,
            description: buildVariantsDescription(cleanVariants, getRealDescription(rep.description)),
            _autoGrouped: true,
            _groupedIds: group.variants.map(v => v._origProduct.id)
        });
        result.push(syntheticProduct);
    }

    return result;
}
const PRODUCTS_PER_PAGE = 24;
let productsTotalPages = 1;
let productsTotal = 0;
let topupAmount = 20000;
let topupMethod = 'vietqr';

// --- 3. TOAST NOTIFICATION SYSTEM (CỐ ĐỊNH Ở GIỮA) ---
const Toast = {
    show: function (msg, type = 'success', duration = 3500) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.innerHTML = msg;
        container.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'scale(0.9) translateY(-15px)';
            setTimeout(() => el.remove(), 300);
        }, duration);
    }
};
window.Toast = Toast;

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showToast(title, msg, type = 'success') {
    const text = msg ? `<strong>${title}:</strong> ${msg}` : title;
    Toast.show(text, type === 'error' ? 'error' : (type === 'warning' ? 'error' : 'success'));
}

// --- ZEUS ANTI-DDOS RATE LIMIT CYBER POPUP CONTROLLER ---
let zeusRateLimitTimer = null;
function showZeusRateLimitPopup(message, seconds = 60) {
    const overlay = document.getElementById('zeusRateLimitOverlay');
    if (!overlay) return;
    
    const msgEl = document.getElementById('zeusRateLimitMsg');
    if (msgEl) {
        msgEl.innerHTML = `<i class="fas fa-hourglass-half" style="color:#f59e0b;"></i> ${escapeHtml(message)}`;
    }
    
    const countEl = document.getElementById('zeusCountdownNumber');
    let timeLeft = parseInt(seconds) || 60;
    if (countEl) countEl.textContent = timeLeft;
    
    overlay.style.display = 'flex';
    document.body.classList.add('modal-open');
    
    if (zeusRateLimitTimer) clearInterval(zeusRateLimitTimer);
    
    zeusRateLimitTimer = setInterval(() => {
        timeLeft--;
        if (countEl) countEl.textContent = Math.max(0, timeLeft);
        if (timeLeft <= 0) {
            clearInterval(zeusRateLimitTimer);
            overlay.style.display = 'none';
            document.body.classList.remove('modal-open');
            Toast.show('🛡️ [ZEUS SHIELD] Hạn chế truy cập đã được dỡ bỏ. Bạn có thể tiếp tục thao tác!', 'success', 5000);
        }
    }, 1000);
}
window.showZeusRateLimitPopup = showZeusRateLimitPopup;

// --- 4. COPY HELPER ---
function copyText(text, successMsg = '✅ Đã sao chép vào bộ nhớ tạm!') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            Toast.show(successMsg, 'success');
        }).catch(() => fallbackCopy(text, successMsg));
    } else {
        fallbackCopy(text, successMsg);
    }
}

function fallbackCopy(text, successMsg) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        Toast.show(successMsg, 'success');
    } catch (e) {
        Toast.show('❌ Không thể tự động sao chép, vui lòng copy thủ công', 'error');
    }
    document.body.removeChild(textarea);
}

// --- 5. CANVAS BANNER GENERATOR (Dùng khi sản phẩm không có link ảnh ngoài) ---
function generateBannerImage(gameName, category = 'ff') {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const grad = ctx.createRadialGradient(200, 120, 20, 200, 120, 280);
    if (category === 'ff') {
        grad.addColorStop(0, '#e01030');
        grad.addColorStop(0.5, '#aa0020');
        grad.addColorStop(1, '#150303');
    } else if (category === 'pubg') {
        grad.addColorStop(0, '#e03010');
        grad.addColorStop(0.5, '#881505');
        grad.addColorStop(1, '#150303');
    } else if (category === 'ball') {
        grad.addColorStop(0, '#1050e0');
        grad.addColorStop(0.5, '#051860');
        grad.addColorStop(1, '#030815');
    } else {
        grad.addColorStop(0, '#9010e0');
        grad.addColorStop(0.5, '#400570');
        grad.addColorStop(1, '#0e0218');
    }
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 240);
    
    // Glowing text
    ctx.shadowColor = 'rgba(224, 16, 48, 0.8)';
    ctx.shadowBlur = 25;
    ctx.font = '900 64px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Zeus', 200, 90);
    
    // Sub badge
    ctx.shadowBlur = 15;
    ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#a020f0';
    ctx.fillText(gameName.toUpperCase(), 200, 165);
    
    // Tech Border Lines
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, 376, 216);
    
    return canvas.toDataURL('image/png');
}

// --- 6. SPLASH SCREEN CONTROLLER ---
const splashScreen = document.getElementById('splashScreen');
const splashProgress = document.getElementById('splashProgress');
let splashDone = false;

function dismissSplash() {
    if (splashScreen && !splashDone) {
        splashDone = true;
        if (splashProgress) splashProgress.style.width = '100%';
        splashScreen.classList.add('hide');
        setTimeout(() => {
            splashScreen.style.display = 'none';
        }, 400);
    }
}

function startSplash() {
    setTimeout(dismissSplash, 950);
}
startSplash();

// Cho phép người dùng click bất cứ đâu để vào thẳng trang ngay
splashScreen?.addEventListener('click', dismissSplash);

// --- 7. DOM ELEMENTS ---
const productGrid = document.getElementById('productGrid');
const productCount = document.getElementById('productCount');
const searchInput = document.getElementById('searchInput');
const navActions = document.getElementById('navActions');
const userBalanceEl = document.getElementById('userBalance');
const adminNavBtn = document.getElementById('adminNavBtn');
const mobileNavAccount = document.getElementById('mobileNavAccount');

// Modals
const purchaseModal = document.getElementById('purchaseModal');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const changePassModal = document.getElementById('changePassModal');
const topupModal = document.getElementById('topupModal');
const historyModal = document.getElementById('historyModal');
const accountModal = document.getElementById('accountModal');
const historyAccountModal = document.getElementById('historyAccountModal');
const adminModal = document.getElementById('adminModal');

// Purchase Modal elements
const modalProductName = document.getElementById('modalProductName');
const modalProductImg = document.getElementById('modalProductImg');
const modalProductPrice = document.getElementById('modalProductPrice');
const modalProductPlatforms = document.getElementById('modalProductPlatforms');
const modalProductDesc = document.getElementById('modalProductDesc');
const modalActionArea = document.getElementById('modalActionArea');
const qtyInput = document.getElementById('qtyInput');
const qtyMinus = document.getElementById('qtyMinus');
const qtyPlus = document.getElementById('qtyPlus');
const totalPriceDisplay = document.getElementById('totalPriceDisplay');

// Account / History elements
const accountList = document.getElementById('accountList');
const accountSummary = document.getElementById('accountSummary');
const copyAllBtn = document.getElementById('copyAllAccounts');
const historyList = document.getElementById('historyList');
const historyAccountList = document.getElementById('historyAccountList');
const historyAccountSummary = document.getElementById('historyAccountSummary');
const copyAllHistoryBtn = document.getElementById('copyAllHistoryAccounts');

// Topup elements
const qrImage = document.getElementById('qrImage');
const qrLabel = document.getElementById('qrLabel');
const topupAmountDisplay = document.getElementById('topupAmountDisplay');
const topupSyntaxDisplay = document.getElementById('topupSyntaxDisplay');
const topupCustomAmount = document.getElementById('topupCustomAmount');
const copySyntaxBtn = document.getElementById('copySyntaxBtn');

// Forms
const loginForm = document.getElementById('loginForm');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const registerForm = document.getElementById('registerForm');
const regUsername = document.getElementById('regUsername');
const regEmail = document.getElementById('regEmail');
const regPassword = document.getElementById('regPassword');
const regConfirm = document.getElementById('regConfirm');
const registerCaptchaImage = document.getElementById('registerCaptchaImage');
const registerCaptchaId = document.getElementById('registerCaptchaId');
const registerCaptchaInput = document.getElementById('registerCaptchaInput');
const changePassForm = document.getElementById('changePassForm');

// --- 8. THEME & CODE BACKGROUND ---
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

const savedTheme = localStorage.getItem('Xiters_theme') || 'dark';
if (savedTheme === 'light') {
    body.classList.add('light-mode');
    body.classList.remove('dark-mode');
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
} else {
    body.classList.add('dark-mode');
    body.classList.remove('light-mode');
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
}

if (themeToggle) {
    themeToggle.addEventListener('click', function () {
        if (body.classList.contains('dark-mode')) {
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
            this.innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem('Xiters_theme', 'light');
        } else {
            body.classList.remove('light-mode');
            body.classList.add('dark-mode');
            this.innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem('Xiters_theme', 'dark');
        }
    });
}

function generateCodeBackground() {
    const codeBg = document.getElementById('codeBackground');
    if (!codeBg) return;
    const lines = [];
    const snippets = [
        'POST /api/orders/purchase HTTP/1.1',
        'Authorization: Bearer <token>',
        '{"product_id": 1, "quantity": 1}',
        '200 OK: {"success": true, "key": "<generated-key>"}',
        'SELECT * FROM users WHERE balance >= ?;',
        'FastAPI: Uvicorn running on http://127.0.0.1:8000',
        'function autoDispatch() { return true; }',
        'const response = await fetch("/api/auth/me");',
        'SQLite3 Transaction: Commit Order <id>...',
        'Status: 200 OK | Latency: 1.2ms',
        'OpenAPI Spec 3.0.0 generated successfully',
        'const balance = await getBalance();'
    ];
    for (let i = 0; i < 50; i++) {
        const rand = snippets[Math.floor(Math.random() * snippets.length)];
        const indent = ' '.repeat(Math.floor(Math.random() * 4));
        lines.push(indent + rand);
    }
    codeBg.textContent = lines.join('\n');
}
// The mobile code background is painted by CSS, so no resize-time DOM work is needed.
// Keep the legacy generator inert to avoid repeated text generation on rotation/resize.
if (!window.matchMedia('(max-width: 900px)').matches) {
    generateCodeBackground();
}

// --- 9. XÁC THỰC & ĐỒNG BỘ NGƯỜI DÙNG (AUTH SYNC) ---
async function checkAuth() {
    if (!authToken) {
        currentUser = null;
        updateNavbar();
        return;
    }
    try {
        const data = await api('/api/auth/me', 'GET', null, true);
        if (data.success && data.user) {
            currentUser = data.user;
            updateNavbar();
                    } else {
            logout(false);
        }
    } catch (e) {
        console.warn('Session expired or invalid token');
        logout(false);
    }
}

function updateUserBalance(balance){
    const value = Number(balance || 0);
    currentUser = currentUser || {};
    currentUser.balance = value;
    const el = document.getElementById('userBalance');
    if (el) el.innerHTML = `<i class="fas fa-wallet"></i> ${value.toLocaleString()}₫`;
}

function syncMobileNavAccount() {
    const host = document.getElementById('mobileNavAccount');
    if (!host) return;
    const isMobileViewport = window.matchMedia('(max-width: 900px)').matches;
    host.style.setProperty('display', isMobileViewport ? 'flex' : 'none', 'important');
    host.style.setProperty('visibility', isMobileViewport ? 'visible' : 'hidden', 'important');

    const isLoggedIn = !!(currentUser && currentUser.username);
    const canAccessAdmin = isLoggedIn && (currentUser.role === 'admin' || currentUser.role === 'seller');

    // Desktop: do not render any duplicate auth buttons here.
    // Mobile: show exactly one Login action when logged out; the register link lives inside the login popup.
    host.innerHTML = isLoggedIn ? `
        <div class="mobile-nav-user-card">
            <div class="mobile-nav-user-main">
                <span class="mobile-nav-user-avatar"><i class="fas ${currentUser.role === 'admin' ? 'fa-crown' : (currentUser.role === 'seller' ? 'fa-user-shield' : 'fa-user-circle')}"></i></span>
                <span class="mobile-nav-user-meta">
                    <strong>${escapeHtml(currentUser.username)}</strong>
                    <small>${Number(currentUser.balance || 0).toLocaleString()}₫</small>
                </span>
            </div>
            <button type="button" class="mobile-nav-action mobile-nav-change-password" id="mobileChangePasswordBtn">
                <i class="fas fa-key"></i><span>Đổi mật khẩu</span>
            </button>
            <button type="button" class="mobile-nav-action mobile-nav-logout" id="mobileLogoutBtn">
                <i class="fas fa-right-from-bracket"></i><span>Đăng xuất</span>
            </button>
        </div>
        ${canAccessAdmin ? `<button type="button" class="mobile-nav-action mobile-nav-admin" id="mobileAdminBtn"><i class="fas fa-crown"></i><span>Admin Panel</span></button>` : ''}
    ` : `
        <button type="button" class="mobile-nav-action mobile-nav-login" id="mobileLoginBtn">
            <i class="fas fa-user"></i><span>Đăng nhập</span>
        </button>
    `;

    document.getElementById('mobileLoginBtn')?.addEventListener('click', () => {
        closeMobileMenu();
        openLoginModal();
    });
    document.getElementById('mobileRegisterBtn')?.addEventListener('click', () => {
        closeMobileMenu();
        openRegisterModal();
    });
    document.getElementById('mobileChangePasswordBtn')?.addEventListener('click', () => {
        closeMobileMenu();
        if (changePassModal) openModal(changePassModal);
    });
    document.getElementById('mobileLogoutBtn')?.addEventListener('click', () => {
        closeMobileMenu();
        logout(true);
    });
    document.getElementById('mobileAdminBtn')?.addEventListener('click', () => {
        closeMobileMenu();
        openAdminModal();
    });
}

function closeMobileMenu() {
    const links = document.querySelector('.nav-links');
    const toggle = document.getElementById('menu-toggle');
    if (links) links.classList.remove('show-mobile');
    if (toggle) {
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
    }
    document.body.classList.remove('mobile-menu-open');
}

function openMobileMenu() {
    const links = document.querySelector('.nav-links');
    const toggle = document.getElementById('menu-toggle');
    if (!links) return;
    const willOpen = !links.classList.contains('show-mobile');
    if (willOpen) {
        links.classList.add('show-mobile');
        if (toggle) {
            toggle.classList.add('is-open');
            toggle.setAttribute('aria-expanded', 'true');
        }
        document.body.classList.add('mobile-menu-open');
    } else {
        closeMobileMenu();
    }
}

function updateNavbar() {
    if (!navActions) return;
    if (currentUser && currentUser.username) {
        const isAdmin = currentUser.role === 'admin';
        const isSeller = currentUser.role === 'seller';
        const canAccessAdmin = isAdmin || isSeller;
        
        if (adminNavBtn) {
            adminNavBtn.classList.toggle('auth-admin-visible', canAccessAdmin);
            adminNavBtn.setAttribute('aria-hidden', canAccessAdmin ? 'false' : 'true');
        }
        
        let roleBadge = '';
        if (isAdmin) roleBadge = '<span class="admin-badge" style="background:linear-gradient(135deg, #ef4444, #f59e0b);color:#fff;font-weight:800;letter-spacing:0.5px;box-shadow:0 0 12px rgba(239,68,68,0.4);"><i class="fas fa-crown"></i> OWNER</span>';
        else if (isSeller) roleBadge = '<span class="admin-badge" style="background:linear-gradient(135deg, #a855f7, #6366f1);color:#fff;font-weight:800;letter-spacing:0.5px;"><i class="fas fa-user-shield"></i> SELLER</span>';

        navActions.innerHTML = `
            <span class="user-info">
                <i class="fas ${isAdmin ? 'fa-crown' : (isSeller ? 'fa-user-shield' : 'fa-user-circle')}"></i> 
                <strong>${currentUser.username}</strong>
                ${roleBadge}
            </span>
            <span class="user-balance" id="userBalance" style="display:inline-flex;">
                <i class="fas fa-wallet"></i> ${(currentUser.balance || 0).toLocaleString()}₫
            </span>
            <button id="themeToggle" class="theme-toggle"><i class="fas ${body.classList.contains('light-mode') ? 'fa-sun' : 'fa-moon'}"></i></button>
            <button class="btn-logout" id="logoutBtn" title="Đăng xuất"><i class="fas fa-sign-out-alt"></i></button>
        `;
        document.getElementById('logoutBtn')?.addEventListener('click', () => logout(true));
        document.getElementById('themeToggle')?.addEventListener('click', () => themeToggle?.click());
    } else {
        if (adminNavBtn) {
            adminNavBtn.classList.remove('auth-admin-visible');
            adminNavBtn.setAttribute('aria-hidden', 'true');
        }
        navActions.innerHTML = `
            <button id="themeToggle" class="theme-toggle"><i class="fas ${body.classList.contains('light-mode') ? 'fa-sun' : 'fa-moon'}"></i></button>
            <button class="btn-login" id="loginNavBtn"><i class="fas fa-user"></i> ĐĂNG NHẬP</button>
        `;
        document.getElementById('loginNavBtn')?.addEventListener('click', openLoginModal);
        document.getElementById('themeToggle')?.addEventListener('click', () => themeToggle?.click());
    }
    syncMobileNavAccount();
}

async function loginUser(username, password) {
    // Input validation
    username = sanitizeInput(username, 'username');
    
    if (!username || !password) {
        Toast.show('❌ Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu', 'error');
        return;
    }
    
    if (!DataValidator.isValidUsername(username)) {
        Toast.show('❌ Tên đăng nhập chỉ chứa chữ, số, dấu gạch ngang và dấu gạch dưới (3-50 ký tự)', 'error');
        return;
    }
    
    if (!DataValidator.isValidPassword(password)) {
        Toast.show('❌ Mật khẩu phải từ 6-100 ký tự', 'error');
        return;
    }
    
    try {
        const data = await api('/api/auth/login', 'POST', { 
            username: username, 
            password: password 
        });
        
        authToken = data.token;
        ZeusEncryptedStorage.setItem('Xiters_auth_token', authToken);
        currentUser = data.user;
        updateNavbar();
        closeModal(loginModal);
        Toast.show(`✅ ${data.message}`, 'success');
        
        if (currentProduct) {
            setTimeout(() => openPurchaseModal(currentProduct), 300);
        }
    } catch (err) {
        Toast.show(`❌ ${err.message}`, 'error');
    }
}

async function registerUser(username, email, password, captchaId, captcha) {
    // Input validation & sanitization
    username = sanitizeInput(username, 'username');
    email = sanitizeInput(email, 'email');
    
    if (!username || !email || !password) {
        Toast.show('❌ Vui lòng nhập đầy đủ thông tin', 'error');
        return;
    }
    
    if (!DataValidator.isValidUsername(username)) {
        Toast.show('❌ Tên đăng nhập chỉ chứa chữ, số, dấu gạch ngang và dấu gạch dưới (3-50 ký tự)', 'error');
        return;
    }
    
    if (!DataValidator.isValidEmail(email)) {
        Toast.show('❌ Email không hợp lệ', 'error');
        return;
    }
    
    if (!DataValidator.isValidPassword(password)) {
        Toast.show('❌ Mật khẩu phải từ 6-100 ký tự', 'error');
        return;
    }
    
    try {
        const data = await api('/api/auth/register', 'POST', { 
            username: username, 
            email: email, 
            password: password,
            captcha_id: captchaId,
            captcha: captcha
        });
        
        authToken = data.token;
        ZeusEncryptedStorage.setItem('Xiters_auth_token', authToken);
        currentUser = data.user;
        updateNavbar();
        closeModal(registerModal);
        Toast.show(`✅ ${data.message}`, 'success');
    } catch (err) {
        Toast.show(`❌ ${err.message}`, 'error');
    }
}

// --- LOCAL 1-1 SUPPORT CHAT (CRISP-LIKE UX, NO THIRD PARTY) ---
let supportPollTimer = null;
let supportUnreadCount = 0;
let supportLastMessageId = 0;
let adminSupportSelectedUserId = null;
let adminSupportPollTimer = null;

function setSupportUnread(count){
    supportUnreadCount=Math.max(0,Number(count)||0);
    const a=document.getElementById('chatUnreadBadge');
    const b=document.getElementById('supportFloatingBadge');
    [a,b].forEach(el=>{if(!el)return; el.textContent=supportUnreadCount>99?'99+':String(supportUnreadCount); el.style.display=supportUnreadCount?'inline-flex':'none';});
}
function formatSupportDateTime(value){
    if(!value) return '';
    const raw=String(value).trim();
    const d=new Date(raw.replace(' ','T'));
    if(Number.isNaN(d.getTime())) return escapeHtml(raw);
    return d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
}
function formatSupportDate(value){
    if(!value) return '';
    const d=new Date(String(value).trim().replace(' ','T'));
    if(Number.isNaN(d.getTime())) return escapeHtml(String(value));
    const days=['Chủ nhật','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy'];
    const months=['Tháng một','Tháng hai','Tháng ba','Tháng tư','Tháng năm','Tháng sáu','Tháng bảy','Tháng tám','Tháng chín','Tháng mười','Tháng mười một','Tháng mười hai'];
    const dayName = days[d.getDay()];
    const dayNum = d.getDate();
    const monthName = months[d.getMonth()];
    return `${dayName}, ${dayNum} ${monthName}`;
}
function supportInitial(name){
    const t=String(name||'?').trim();
    return escapeHtml((t.match(/[A-Za-zÀ-ỹ0-9]/)||['?'])[0].toUpperCase());
}
let _lastRenderedSupportMap = {};
function renderSupportMessages(messages, targetId='supportMessages'){
    const box=document.getElementById(targetId); if(!box)return;
    if(!messages || !messages.length){
      if(_lastRenderedSupportMap[targetId] !== 'EMPTY'){
        _lastRenderedSupportMap[targetId] = 'EMPTY';
        box.innerHTML='<div class="support-empty"><div class="support-empty-icon"><i class="fas fa-comments"></i></div><strong>Chưa có tin nhắn</strong><span>Hãy gửi lời chào, chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7.</span></div>';
      }
      return;
    }
    const sorted=[...messages].sort((a,b)=>Number(a.id||0)-Number(b.id||0));
    const fingerprint = sorted.map(m => `${m.id}_${m.is_read}_${m.message}_${m.username||''}_${m.sender_role}`).join('|');
    if(_lastRenderedSupportMap[targetId] === fingerprint) {
      // Content has not changed at all, avoid re-rendering to prevent scroll/focus jitter!
      return;
    }
    _lastRenderedSupportMap[targetId] = fingerprint;

    const isNearBottom = (box.scrollHeight - box.scrollTop - box.clientHeight) < 70;
    let lastDate='';
    let lastRole='';
    
    // Check if the viewer is Admin
    const isViewerAdmin = currentUser && currentUser.role === 'admin';
    const lastSentIndex = sorted.map((m,i)=>({m,i})).filter(x => (isViewerAdmin ? x.m.sender_role === 'admin' : x.m.sender_role === 'user')).pop()?.i ?? -1;
    
    box.innerHTML=sorted.map((m,i)=>{
      // "mình nhắn thì bên phải, người khác nhắn bên trái"
      const isMine = isViewerAdmin ? (m.sender_role === 'admin') : (m.sender_role === 'user');
      const isRight = isMine;
      
      let senderName = '';
      if(m.sender_role === 'admin'){
        senderName = 'ADMIN';
      } else {
        senderName = m.username || (currentUser?.username || 'Khách');
      }

      const dateLabel=formatSupportDate(m.created_at||'');
      const time=formatSupportDateTime(m.created_at||'');
      const newDay=dateLabel!==lastDate;
      const sameRole=lastRole===m.sender_role && !newDay;
      lastDate=dateLabel; lastRole=m.sender_role;
      const isLastSent=i===lastSentIndex;
      const isSeen=isLastSent && (sorted.slice(i+1).some(x=>x.sender_role!==m.sender_role) || m.is_read===1);
      
      const avatarSrc = m.sender_role === 'admin' ? '/logo.png' : '';
      const avatarHtml = m.sender_role === 'admin'
        ? `<img class="support-msg-avatar-img" src="${avatarSrc}" alt="ADMIN" onerror="this.src='/logo.png'">`
        : `<div class="support-avatar-circle">${supportInitial(senderName)}</div>`;

      return `
      ${newDay ? `<div class="support-date-divider"><span>${dateLabel}</span></div>` : ''}
      <div class="support-msg-item ${isRight ? 'msg-outgoing' : 'msg-incoming'} ${sameRole ? 'msg-grouped' : ''}">
        ${!isRight ? `
          <div class="support-msg-left-avatar ${sameRole ? 'avatar-hidden' : ''}">
            ${avatarHtml}
          </div>
        ` : ''}
        <div class="support-msg-body">
          ${(!isRight && !sameRole) ? `<div class="support-msg-sender-name">${escapeHtml(senderName)}</div>` : ''}
          <div class="support-msg-bubble" title="${time}">
            <div class="support-msg-text">${escapeHtml(m.message)}</div>
          </div>
          ${(isRight && isLastSent) ? `
            <div class="support-msg-seen-status">
              <i class="fas fa-check-double"></i> ${isSeen ? 'Đã xem' : 'Đã gửi'}
            </div>
          ` : ''}
        </div>
      </div>`;
    }).join('');
    
    // Only auto-scroll to bottom if user was already near the bottom
    if (isNearBottom) {
      box.scrollTop=box.scrollHeight;
    }
}
let _lastAdminConvsFingerprint = '';
async function loadSupportMessages(markRead=true){
    if(!currentUser) return;
    const adminBar = document.getElementById('supportAdminBar');
    const headerTitle = document.getElementById('supportChatHeaderTitle');
    const headerSub = document.getElementById('supportChatHeaderSub');
    const userSelect = document.getElementById('supportAdminUserSelect');
    const input = document.getElementById('supportInput');

    if(currentUser.role === 'admin'){
        if(adminBar) adminBar.style.display = 'flex';
        if(headerTitle) headerTitle.textContent = '👑 Admin Trả Lời Khách';
        if(headerSub) headerSub.textContent = 'Chọn khách hàng bên dưới để xem & trả lời';
        if(input) input.placeholder = 'Nhập tin nhắn trả lời khách...';
        
        try{
            const res = await api('/api/admin/support/conversations','GET',null,true);
            const items = res.conversations || [];
            const convsFingerprint = items.map(c => `${c.user_id}_${c.unread}_${c.username}`).join('|');
            if(userSelect && _lastAdminConvsFingerprint !== convsFingerprint){
                _lastAdminConvsFingerprint = convsFingerprint;
                if(!items.length){
                    userSelect.innerHTML = '<option value="">-- Chưa có khách hàng nào chat --</option>';
                    renderSupportMessages([], 'supportMessages');
                    return;
                }
                userSelect.innerHTML = items.map(c => `
                    <option value="${c.user_id}" ${Number(c.user_id) === Number(adminSupportSelectedUserId) ? 'selected' : ''}>
                        👤 ${escapeHtml(c.username || 'Khách')} ${Number(c.unread) ? `(${c.unread} tin mới)` : ''}
                    </option>`).join('');
                
                if(!adminSupportSelectedUserId && items.length > 0){
                    adminSupportSelectedUserId = Number(items[0].user_id);
                    userSelect.value = String(adminSupportSelectedUserId);
                }
            }
            if(adminSupportSelectedUserId){
                const msgRes = await api('/api/admin/support/messages?user_id=' + adminSupportSelectedUserId, 'GET', null, true);
                renderSupportMessages(msgRes.messages || [], 'supportMessages');
            }
        }catch(e){
            const box=document.getElementById('supportMessages'); if(box) box.innerHTML=`<div class="support-empty">${escapeHtml(e.message||'Không tải được chat')}</div>`;
        }
    } else {
        if(adminBar) adminBar.style.display = 'none';
        if(headerTitle) headerTitle.textContent = 'Hỗ Trợ Khách Hàng';
        if(headerSub) headerSub.textContent = 'Hỗ trợ trực tiếp 1-1 với Admin 24/7';
        if(input) input.placeholder = 'Nhập tin nhắn hỗ trợ...';
        try{
            const res=await api('/api/support/messages','GET',null,true);
            const msgs=res.messages||[];
            renderSupportMessages(msgs,'supportMessages');
            supportLastMessageId=msgs.length?Number(msgs[msgs.length-1].id):0;
            if(markRead) setSupportUnread(0);
        }catch(e){
            const box=document.getElementById('supportMessages'); if(box) box.innerHTML=`<div class="support-empty">${escapeHtml(e.message||'Không tải được chat')}</div>`;
        }
    }
}
async function pollSupportMessages(){
    if(!currentUser) return;
    const modal=document.getElementById('supportChatModal');
    const open=modal && modal.classList.contains('active');

    if(currentUser.role === 'admin'){
        if(open && adminSupportSelectedUserId){
            try{
                const msgRes = await api('/api/admin/support/messages?user_id=' + adminSupportSelectedUserId, 'GET', null, true);
                renderSupportMessages(msgRes.messages || [], 'supportMessages');
            }catch(e){}
        }
    } else {
        try{
            const res=await api('/api/support/messages','GET',null,true);
            const msgs=res.messages||[];
            if(msgs.length){
                const latest=Number(msgs[msgs.length-1].id||0);
                const hadNew = supportLastMessageId > 0 && latest > supportLastMessageId;
                const adminNew = msgs.filter(m=>m.sender_role==='admin' && (supportLastMessageId === 0 ? !m.is_read : Number(m.id)>supportLastMessageId)).length;
                supportLastMessageId=latest;
                renderSupportMessages(msgs,'supportMessages');
                if(adminNew && !open){
                    setSupportUnread(adminNew);
                    if(hadNew) showSupportMiniNotice(msgs[msgs.length-1]);
                } else if(open) {
                    setSupportUnread(0);
                }
            }
        }catch(e){}
    }
}
function showSupportMiniNotice(msg){
    let n=document.getElementById('supportMiniNotice');
    if(!n){
      n=document.createElement('button'); n.id='supportMiniNotice'; n.type='button'; n.className='support-mini-notice';
      n.innerHTML='<span class="support-mini-avatar"><i class="fas fa-headset"></i></span><span><b>Admin đã trả lời</b><small></small></span><i class="fas fa-chevron-right"></i>';
      document.body.appendChild(n); n.addEventListener('click',()=>{n.classList.remove('show');openLocalSupportChat();});
    }
    n.querySelector('small').textContent=(msg&&msg.message)||'Bạn có tin nhắn mới';
    n.classList.add('show');
    clearTimeout(n._timer); n._timer=setTimeout(()=>n.classList.remove('show'),7000);
}
function startSupportPolling(){
    clearInterval(supportPollTimer);
    supportPollTimer=setInterval(pollSupportMessages,2000);
}
function stopSupportPolling(){clearInterval(supportPollTimer);supportPollTimer=null;}
async function toggleLocalSupportChat(e){
    if(e){ e.preventDefault(); e.stopPropagation(); }
    const modal=document.getElementById('supportChatModal');
    if(!modal) return;
    if(modal.classList.contains('active')){
        closeLocalSupportChat();
    } else {
        await openLocalSupportChat();
    }
}
async function openLocalSupportChat(){
    if(!currentUser){Toast.show('🔐 Vui lòng đăng nhập để chat với Admin.','info');openLoginModal();return;}
    const modal=document.getElementById('supportChatModal'); if(!modal)return;
    modal.classList.remove('closing');
    modal.classList.add('active', 'support-chat-open');
    _lastRenderedSupportMap['supportMessages'] = null; // force fresh render on open
    setSupportUnread(0); await loadSupportMessages(true);
    const box = document.getElementById('supportMessages');
    if(box) box.scrollTop = box.scrollHeight;
    document.getElementById('supportInput')?.focus();
}
function closeLocalSupportChat(){
    const modal=document.getElementById('supportChatModal');
    if(!modal || modal.classList.contains('closing')) return;
    modal.classList.add('closing');
    setTimeout(() => {
        modal.classList.remove('active', 'support-chat-open', 'closing');
    }, 220);
}
async function sendSupportMessage(e){
    if(e){ e.preventDefault(); e.stopPropagation(); }
    if(!currentUser){Toast.show('🔐 Vui lòng đăng nhập.','info');openLoginModal();return;}
    const input=document.getElementById('supportInput'); const msg=(input?.value||'').trim(); if(!msg)return;
    input.disabled=true;
    try{
        if(currentUser.role === 'admin'){
            const targetUserId = adminSupportSelectedUserId || Number(document.getElementById('supportAdminUserSelect')?.value);
            if(!targetUserId){
                Toast.show('⚠️ Vui lòng chọn khách hàng để trả lời.', 'info');
                return;
            }
            await api('/api/admin/support/messages','POST',{user_id:targetUserId, message:msg},true);
            input.value='';
            _lastRenderedSupportMap['supportMessages'] = null;
            const msgRes = await api('/api/admin/support/messages?user_id=' + targetUserId, 'GET', null, true);
            renderSupportMessages(msgRes.messages || [], 'supportMessages');
            const box = document.getElementById('supportMessages');
            if(box) box.scrollTop = box.scrollHeight;
            await loadAdminSupportConversations(false);
        } else {
            await api('/api/support/messages','POST',{message:msg},true);
            input.value='';
            _lastRenderedSupportMap['supportMessages'] = null;
            await loadSupportMessages(true);
            const box = document.getElementById('supportMessages');
            if(box) box.scrollTop = box.scrollHeight;
        }
    }
    catch(err){Toast.show('❌ '+err.message,'error');}
    finally{input.disabled=false;input.focus();}
}
async function loadAdminSupportConversations(autoSelect=false){
    if(!currentUser || currentUser.role !== 'admin') return;
    const box=document.getElementById('supportConversations'); if(!box)return;
    try{
      const res=await api('/api/admin/support/conversations','GET',null,true);
      const items=res.conversations||[];
      const totalUnread=items.reduce((acc,c)=>acc+(Number(c.unread)||0),0);
      const badge=document.getElementById('adminSupportUnreadBadge');
      if(badge){
          badge.textContent=totalUnread>99?'99+':String(totalUnread);
          badge.style.display=totalUnread?'inline-block':'none';
      }
      if(!items.length){
          box.innerHTML='<div class="support-empty"><i class="fas fa-inbox" style="font-size:24px;margin-bottom:8px;display:block;"></i>Chưa có cuộc hội thoại nào.</div>';
          return;
      }
      box.innerHTML=items.map(x=>`
        <div class="support-conversation ${Number(x.user_id)===Number(adminSupportSelectedUserId)?'active':''}" data-user-id="${x.user_id}">
            <span class="unread" style="display:${Number(x.unread||0)?'inline-block':'none'}">${Number(x.unread||0)}</span>
            <strong>${escapeHtml(x.username||'Khách')}</strong>
            <p>${escapeHtml(x.last_message||'')}</p>
            <small>${escapeHtml(x.last_message_at||'')}</small>
        </div>`).join('');
      box.querySelectorAll('.support-conversation').forEach(el=>el.addEventListener('click',()=>openAdminSupportConversation(Number(el.dataset.userId))));
      
      // Auto open first conversation if none selected yet
      if((autoSelect || !adminSupportSelectedUserId) && items.length > 0){
          openAdminSupportConversation(Number(items[0].user_id));
      }
    }catch(e){box.innerHTML=`<div class="support-empty">${escapeHtml(e.message||'Không tải được hội thoại')}</div>`;}
}
async function openAdminSupportConversation(userId){
    adminSupportSelectedUserId=userId;
    const head=document.getElementById('supportAdminChatHead'), input=document.getElementById('supportAdminInput'), send=document.querySelector('#supportAdminSendForm button');
    if(input) input.disabled=false;
    if(send) send.disabled=false;
    
    // Highlight selected item in list
    document.querySelectorAll('.support-conversation').forEach(el=>{
        el.classList.toggle('active', Number(el.dataset.userId) === Number(userId));
    });

    try{
      const res=await api('/api/admin/support/messages?user_id='+encodeURIComponent(userId),'GET',null,true);
      const convRes=await api('/api/admin/support/conversations','GET',null,true);
      const conv=convRes.conversations||[];
      const u=conv.find(x=>Number(x.user_id)===Number(userId));
      if(head) head.innerHTML=`<i class="fas fa-user-circle" style="color:var(--primary);margin-right:6px;"></i> 💬 Đang chat với: <strong>${escapeHtml(u?.username||('User #'+userId))}</strong>`;
      renderSupportMessages(res.messages||[],'supportAdminMessages');
      
      // Update badge
      const totalUnread=conv.reduce((acc,c)=>acc+(Number(c.unread)||0),0);
      const badge=document.getElementById('adminSupportUnreadBadge');
      if(badge){
          badge.textContent=totalUnread>99?'99+':String(totalUnread);
          badge.style.display=totalUnread?'inline-block':'none';
      }
    }catch(e){Toast.show('❌ '+e.message,'error');}
}
async function sendAdminSupportMessage(e){
    e.preventDefault(); if(!adminSupportSelectedUserId) return;
    const input=document.getElementById('supportAdminInput'); const msg=(input?.value||'').trim(); if(!msg) return;
    input.disabled=true;
    try{
        await api('/api/admin/support/messages','POST',{user_id:adminSupportSelectedUserId,message:msg},true);
        input.value='';
        const res=await api('/api/admin/support/messages?user_id='+adminSupportSelectedUserId,'GET',null,true);
        renderSupportMessages(res.messages||[],'supportAdminMessages');
        await loadAdminSupportConversations(false);
    }
    catch(e){Toast.show('❌ '+e.message,'error');}
    finally{input.disabled=false;input.focus();}
}
async function pollAdminSupport(){
    if(!currentUser || currentUser.role !== 'admin') return;
    const isTabActive = document.getElementById('tab-support')?.classList.contains('active');
    
    // Always poll conversation list & badge for admin
    try {
        const res=await api('/api/admin/support/conversations','GET',null,true);
        const items=res.conversations||[];
        const totalUnread=items.reduce((acc,c)=>acc+(Number(c.unread)||0),0);
        const badge=document.getElementById('adminSupportUnreadBadge');
        if(badge){
            badge.textContent=totalUnread>99?'99+':String(totalUnread);
            badge.style.display=totalUnread?'inline-block':'none';
        }
        
        if(isTabActive){
            const box=document.getElementById('supportConversations');
            if(box){
                if(!items.length){
                    box.innerHTML='<div class="support-empty"><i class="fas fa-inbox" style="font-size:24px;margin-bottom:8px;display:block;"></i>Chưa có cuộc hội thoại nào.</div>';
                } else {
                    box.innerHTML=items.map(x=>`
                        <div class="support-conversation ${Number(x.user_id)===Number(adminSupportSelectedUserId)?'active':''}" data-user-id="${x.user_id}">
                            <span class="unread" style="display:${Number(x.unread||0)?'inline-block':'none'}">${Number(x.unread||0)}</span>
                            <strong>${escapeHtml(x.username||'Khách')}</strong>
                            <p>${escapeHtml(x.last_message||'')}</p>
                            <small>${escapeHtml(x.last_message_at||'')}</small>
                        </div>`).join('');
                    box.querySelectorAll('.support-conversation').forEach(el=>el.addEventListener('click',()=>openAdminSupportConversation(Number(el.dataset.userId))));
                }
            }
            if(adminSupportSelectedUserId){
                const msgRes=await api('/api/admin/support/messages?user_id='+adminSupportSelectedUserId,'GET',null,true);
                renderSupportMessages(msgRes.messages||[],'supportAdminMessages');
            } else if(items.length > 0) {
                openAdminSupportConversation(Number(items[0].user_id));
            }
        }
    } catch(e){}
}
function startAdminSupportPolling(){clearInterval(adminSupportPollTimer);adminSupportPollTimer=setInterval(pollAdminSupport,2500);}
startSupportPolling();
startAdminSupportPolling();

async function loadRandomAdminSettings(){
    const box=document.getElementById('randomWeightsTable'); if(!box) return;
    try{
      const res=await api('/api/admin/random/settings','GET',null,true);
      const rate=document.getElementById('randomWinRate'); if(rate) rate.value=Number(res.win_rate ?? 0);
      const items=res.items||[];
      box.innerHTML=items.map(x=>`<div class="random-weight-row">
        <div><strong>File ${x.amount}</strong><small>${x.available ? ('Kho '+x.stock_count) : 'Hết file'}</small></div>
        <label>Tỷ lệ file theo mệnh giá (%)<input type="number" min="0" step="0.1" value="${Number(x.weight||0)}" data-random-prize="${x.amount}"></label>
      </div>`).join('');
      const note=document.createElement('div'); note.className='random-weight-total'; note.textContent='Tỷ lệ file theo mệnh giá dùng để chọn ngẫu nhiên phần thưởng khi TRÚNG.'; box.appendChild(note);
    }catch(e){box.innerHTML='<div class="support-empty">Không tải được cấu hình random.</div>'; }
}
async function saveRandomAdminSettings(){
    const rateEl=document.getElementById('randomWinRate');
    const win_rate=Math.max(0,Math.min(100,Number(rateEl?.value ?? 0)));
    if(!Number.isFinite(win_rate)){ Toast.show('❌ Tỷ lệ trúng không hợp lệ','error'); return; }
    const prize_weights={};
    document.querySelectorAll('[data-random-prize]').forEach(i=>{
        const v=Number(i.value);
        prize_weights[i.dataset.randomPrize]=Number.isFinite(v)?Math.max(0,v):0;
    });
    const btn=document.getElementById('saveRandomWeightsBtn');
    if(btn) btn.disabled=true;
    try{
        await api('/api/admin/random/settings','POST',{win_rate,prize_weights},true);
        Toast.show('✅ Đã lưu cấu hình bốc thăm','success');
        await loadRandomAdminSettings();
    }catch(e){
        Toast.show('❌ '+(e.message||'Không thể lưu cấu hình'),'error');
    }finally{ if(btn) btn.disabled=false; }
}
function getRandomHistoryLocal(){
    try{return JSON.parse(localStorage.getItem('Xiters_random_history')||'[]');}catch(e){return [];}
}
function saveRandomHistoryLocal(item){
    const h=getRandomHistoryLocal(); h.unshift(item); localStorage.setItem('Xiters_random_history',JSON.stringify(h.slice(0,15)));
}
async function renderRandomHistory(){
    const box=document.getElementById('randomHistory'); if(!box) return;
    const countEl=document.getElementById('randomDrawCount');
    
    if(currentUser){
        try{
            const res=await api('/api/random/history','GET',null,true);
            if(res && res.success && Array.isArray(res.history)){
                const items=res.history;
                if(countEl) countEl.textContent=res.total ?? items.length;
                if(!items.length){
                    box.innerHTML='<div class="random-history-empty"><i class="fas fa-dice"></i> Chưa có lượt bốc thăm nào. Hãy thử vận may ngay!</div>';
                    return;
                }
                box.innerHTML=items.map(x=>`
                    <div class="random-history-item ${x.won?'won':'lost'}">
                        <div class="random-history-info">
                            <span class="random-history-tag ${x.won?'won':'lost'}">${x.won?'🎉 TRÚNG THƯỞNG':'🍀 KHÔNG TRÚNG'}</span>
                            <span class="random-history-text">${escapeHtml(x.description||'Lượt bốc thăm')}</span>
                        </div>
                        <div class="random-history-meta">
                            <span class="random-history-cost">-20.000₫</span>
                            <small class="random-history-time">${escapeHtml(x.created_at||'')}</small>
                        </div>
                    </div>
                `).join('');
                return;
            }
        }catch(e){}
    }
    
    // Fallback to local
    const h=getRandomHistoryLocal();
    if(countEl) countEl.textContent=h.length;
    if(!h.length){box.innerHTML='<div class="random-history-empty"><i class="fas fa-dice"></i> Chưa có lượt bốc thăm nào.</div>';return;}
    box.innerHTML=h.map(x=>`
        <div class="random-history-item ${x.won?'won':'lost'}">
            <div class="random-history-info">
                <span class="random-history-tag ${x.won?'won':'lost'}">${x.won?'🎉 TRÚNG':'🍀 TRƯỢT'}</span>
                <span class="random-history-text">${x.won?'Trúng phần thưởng: '+(x.amount ? x.amount.toLocaleString()+'₫' : 'Key Game'):'Chúc bạn may mắn lần sau!'}</span>
            </div>
            <div class="random-history-meta">
                <span class="random-history-cost">-20.000₫</span>
                <small class="random-history-time">${escapeHtml(x.time||'')}</small>
            </div>
        </div>
    `).join('');
}
function setRandomDrawCount(){
    renderRandomHistory();
}
let selectedDrawCard = null;
let randomBusy = false;

function renderDrawCards(state='ready', selected=selectedDrawCard){
    const box=document.getElementById('randomDrawCards');
    if(!box) return;
    const labels=['01','02','03','04','05','06'];
    const disabled=state!=='ready' || randomBusy ? 'disabled' : '';

    box.innerHTML=labels.map((label,i)=>`
        <button type="button" class="draw-card ${selected===i?(state==='processing'?'processing':'selected'):''}"
                data-draw-card="${i}" ${disabled} aria-label="Bốc ô ${i+1}">
            <span class="draw-card-shine"></span>
            <span class="draw-card-index">${label}</span>
            <span class="draw-card-icon">${selected===i && state==='processing' ? '<i class="fas fa-spinner fa-spin"></i>' : '<i class="fas fa-gift"></i>'}</span>
            <strong>${selected===i && state==='processing' ? 'ĐANG MỞ...' : (selected===i ? 'ĐÃ CHỌN' : 'BỐC Ô NÀY')}</strong>
            <small>${selected===i && state==='processing' ? 'Đang kiểm tra...' : '20.000₫ / lượt'}</small>
        </button>`).join('');

    box.querySelectorAll('[data-draw-card]').forEach(btn=>{
        btn.addEventListener('click',()=>{
            if(state!=='ready'||randomBusy) return;
            const cardIdx=Number(btn.dataset.drawCard);
            selectedDrawCard=cardIdx;
            renderDrawCards('ready', selectedDrawCard);
            showDrawConfirmation(cardIdx);
        });
    });
}

function showDrawConfirmation(cardIndex){
    document.getElementById('randomConfirmModal')?.remove();

    const overlay=document.createElement('div');
    overlay.id='randomConfirmModal';
    overlay.className='random-confirm-modal-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.innerHTML=`
      <div class="random-confirm-modal-box">
        <button type="button" class="random-confirm-modal-close" id="randomConfirmClose" aria-label="Đóng">×</button>
        <div class="random-confirm-icon"><i class="fas fa-gift"></i></div>
        <div class="random-confirm-badge">BỐC THĂM MAY MẮN</div>
        <h3>XÁC NHẬN BỐC Ô #0${cardIndex+1}</h3>
        <p>Bạn đã chọn <b>Ô #0${cardIndex+1}</b>.</p>
        <p class="random-confirm-cost">
          Xác nhận để trừ <strong>20.000₫</strong> và nhận kết quả:
          <b>1 = TRÚNG · 2 = KHÔNG TRÚNG</b>
        </p>
        <div class="random-confirm-actions">
          <button type="button" class="random-confirm-ok" id="randomConfirmYes">
            <i class="fas fa-check"></i> XÁC NHẬN BỐC
          </button>
          <button type="button" class="random-confirm-cancel" id="randomConfirmNo">
            <i class="fas fa-rotate-left"></i> CHỌN LẠI
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    requestAnimationFrame(()=>overlay.classList.add('active'));

    const close=()=>{
        overlay.classList.remove('active');
        setTimeout(()=>overlay.remove(),160);
        selectedDrawCard=null;
        renderDrawCards('ready',null);
    };

    document.getElementById('randomConfirmYes')?.addEventListener('click',()=>{
        overlay.remove();
        executeConfirmedDraw(cardIndex);
    });
    document.getElementById('randomConfirmNo')?.addEventListener('click',close);
    document.getElementById('randomConfirmClose')?.addEventListener('click',close);
    overlay.addEventListener('click',(e)=>{if(e.target===overlay) close();});
}

async function openRandomModal(){
    openModal(document.getElementById('randomModal'));
    selectedDrawCard=null;
    randomBusy=false;
    const cap=document.getElementById('randomStageCaption');
    if(cap) cap.textContent='🎲 Hãy chọn 1 trong 6 ô để bốc thăm';
    renderDrawCards('ready',null);
    await renderRandomHistory();
}

async function showRandomDiceEffect(prize){
    return new Promise(resolve=>{
        const old=document.getElementById('randomDiceEffect'); if(old) old.remove();
        const overlay=document.createElement('div');
        overlay.id='randomDiceEffect';
        overlay.className='random-dice-effect-overlay active';
        overlay.innerHTML=`
          <div class="random-dice-effect-box" role="dialog" aria-modal="true">
            <div class="random-dice-title">🎲 ĐANG LẮC XÚC XẮC</div>
            <div class="random-dice-stage"><div class="random-dice-cube">
              <div class="random-dice-face front">⚡</div><div class="random-dice-face back">⚡</div>
              <div class="random-dice-face right">⚡</div><div class="random-dice-face left">⚡</div>
              <div class="random-dice-face top">⚡</div><div class="random-dice-face bottom">⚡</div>
            </div></div>
            <div class="random-dice-result">🎉 TRÚNG ${Number(prize.amount||prize.price||0).toLocaleString('vi-VN')}₫</div>
            <div class="random-dice-sub">Đang mở link file phần thưởng...</div>
          </div>`;
        document.body.appendChild(overlay);
        setTimeout(()=>{ overlay.classList.remove('active'); setTimeout(()=>{overlay.remove();resolve();},180); },2000);
    });
}

async function executeConfirmedDraw(cardIndex){
    if(randomBusy) return;
    if(!currentUser){
        Toast.show('🔐 Vui lòng đăng nhập để bốc thăm.','info');
        openLoginModal();
        return;
    }
    if(Number(currentUser.balance||0)<20000){
        Toast.show('❌ Số dư không đủ 20.000₫. Vui lòng nạp thêm tiền.','error');
        return;
    }

    randomBusy=true;
    selectedDrawCard=cardIndex;
    renderDrawCards('processing',cardIndex);

    const cap=document.getElementById('randomStageCaption');
    if(cap) cap.textContent=`🎴 Đang mở Ô #0${cardIndex+1}...`;

    try{
        const res=await api('/api/random/draw','POST',{card_index:cardIndex},true);

        if(typeof res.new_balance!=='undefined'){
            currentUser.balance=Number(res.new_balance);
            updateUserBalance(currentUser.balance);
        }

        if(res.won && res.prize){
            const prize=res.prize;
            const amount=Number(prize.amount||prize.price||0);
            if(cap) cap.textContent=`🎉 TRÚNG! File ${amount.toLocaleString('vi-VN')}₫`;
            Toast.show(`🎉 CHÚC MỪNG! Bạn đã trúng file ${amount.toLocaleString('vi-VN')}₫!`,'success');

            saveRandomHistoryLocal({
                won:true,
                amount:amount,
                card:cardIndex+1,
                time:new Date().toLocaleTimeString('vi-VN')
            });

            if(prize.download_url){
                await showRandomDiceEffect(prize);
                showAccountModal([{
                    type:'file',
                    name:prize.name||'File phần thưởng',
                    download_url:prize.download_url,
                    url:prize.download_url
                }], prize.name||'Phần thưởng Bốc thăm', 1, amount);
            }
        }else{
            if(cap) cap.textContent='🍀 KẾT QUẢ: KHÔNG TRÚNG — Chúc may mắn lần sau!';
            Toast.show('🍀 Kết quả: KHÔNG TRÚNG. Chúc bạn may mắn lần sau!','info');
            saveRandomHistoryLocal({
                won:false,
                card:cardIndex+1,
                time:new Date().toLocaleTimeString('vi-VN')
            });
        }

        await renderRandomHistory();
        randomBusy=false;
        selectedDrawCard=null;
        setTimeout(()=>{
            if(document.getElementById('randomModal')?.classList.contains('active')){
                if(cap) cap.textContent='🎲 Hãy chọn 1 trong 6 ô để bốc thăm';
                renderDrawCards('ready',null);
            }
        },2200);

    }catch(e){
        Toast.show('❌ '+(e.message||'Không thể bốc thăm'),'error');
        selectedDrawCard=null;
        randomBusy=false;
        renderDrawCards('ready',null);
        if(cap) cap.textContent='🎲 Hãy chọn 1 trong 6 ô để bốc thăm';
    }
}

async function logout(notify = true) {
    if (authToken) {
        try { await api('/api/auth/logout', 'POST', null, true); } catch (e) {}
    }
    authToken = null;
    ZeusEncryptedStorage.removeItem('Xiters_auth_token');
    currentUser = null;
    updateNavbar();
    if (notify) Toast.show('🔓 Đã đăng xuất thành công.', 'info');
}

// --- 10. TẢI DANH MỤC & SẢN PHẨM TỪ API ---
async function fetchCategories() {
    try {
        const data = await api('/api/categories');
        if (data.success && data.categories) {
            data.categories.forEach(cat => {
                const el = document.getElementById(`count-${cat.id}`);
                if (el) el.textContent = cat.count;
            });
        }
    } catch (err) {
        console.error('Lỗi khi tải categories:', err);
    }
}

async function fetchProducts() {
    try {
        let allProducts = [
    {"id":1,"name":"Aimlock V1","price":20000,"category":"ff","platforms":["iOS","Android","PC"],"description":"Gói Aimlock cơ bản V1, hỗ trợ ghìm tâm mượt mà, độ nhạy chuẩn.","badge":"HOT"},
    {"id":2,"name":"Aimlock V2","price":50000,"category":"ff","platforms":["iOS","Android","PC"],"description":"Aimlock nâng cấp V2 tăng tốc độ bám mục tiêu, ổn định tâm súng.","badge":"POPULAR"},
    {"id":3,"name":"Aimlock v3","price":100000,"category":"ff","platforms":["iOS","Android","PC"],"description":"Aimlock v3 phiên bản cải tiến vượt trội, khóa mục tiêu cực nhạy, không rung lắc.","badge":"VIP"},
    {"id":4,"name":"Aimlock v4","price":200000,"category":"ff","platforms":["iOS","Android","PC"],"description":"Aimlock v4 thuật toán định vị tâm súng thế hệ mới, tự động bám đầu.","badge":"PRO"},
    {"id":5,"name":"Aimlock v5","price":300000,"category":"ff","platforms":["iOS","Android","PC"],"description":"Bản Aimlock v5 tối tân nhất, chuẩn thi đấu, hỗ trợ tâm súng hoàn hảo.","badge":"MAX"},
    {"id":6,"name":"Dpi 60%","price":20000,"category":"ff","platforms":["iOS","Android"],"description":"Tăng độ nhạy màn hình thêm 60%, giúp vuốt tâm nhẹ hơn, mượt không giật.","badge":"TIẾT KIỆM"},
    {"id":7,"name":"Dpi 70%","price":50000,"category":"ff","platforms":["iOS","Android"],"description":"Tối ưu hóa phản hồi cảm ứng 70%, vuốt cực đầm và bám tay.","badge":"CHUẨN"},
    {"id":8,"name":"Dpi 80%","price":100000,"category":"ff","platforms":["iOS","Android"],"description":"Tăng 80% độ nhạy vuốt tâm cao cấp, cân bằng giữa tốc độ và chuẩn xác.","badge":"VIP"},
    {"id":9,"name":"Dpi 90%","price":150000,"category":"ff","platforms":["iOS","Android"],"description":"Độ nhạy 90% siêu tốc, vuốt nhẹ là bay tâm lên đầu đối thủ.","badge":"PRO"},
    {"id":10,"name":"Dpi 100%","price":200000,"category":"ff","platforms":["iOS","Android"],"description":"Max tối đa 100% độ nhạy cảm ứng, tốc độ lia màn hình đỉnh cao.","badge":"MAX"},
    {"id":11,"name":"Aimlock Head Filza","price":100000,"category":"ff","platforms":["iOS","Filza"],"description":"File mod Aimlock Head cài đặt chuẩn qua Filza cho iOS, ghim chặt vùng đầu.","badge":"FILZA VIP"},
    {"id":12,"name":"Aimbody Filza","price":100000,"category":"ff","platforms":["iOS","Filza"],"description":"File Aimbody cài qua Filza, tâm tự động hút chặt vào thân người, an toàn.","badge":"FILZA BODY"},
    {"id":13,"name":"Aimneck 3105","price":100000,"category":"ff","platforms":["iOS","Android","PC"],"description":"Bản cấu hình Aimneck mã hiệu 3105 độc quyền, ghim vùng cổ đẩy tâm lên đầu.","badge":"3105 VIP"},
    {"id":14,"name":"Aimlock 3105","price":100000,"category":"ff","platforms":["iOS","Android","PC"],"description":"Aimlock 3105 phiên bản hoàn thiện nhất, ghìm tâm chắc chắn mọi loại vũ khí.","badge":"3105"},
    {"id":15,"name":"Định Vị Người","price":100000,"category":"ff","platforms":["iOS","Android","PC"],"description":"Định vị vị trí đối thủ trên bản đồ và radar, phát hiện khoảng cách, hướng.","badge":"ESP RADAR"},
    {"id":16,"name":"Menu Filza-3105","price":100000,"category":"ff","platforms":["iOS","Filza"],"description":"Menu tổng hợp đầy đủ tính năng Filza và 3105, bật tắt tùy chọn nhanh chóng.","badge":"ALL IN ONE"}
];
        
        // Filter by category
        let filtered = allProducts;
        if (currentFilter && currentFilter !== 'all') {
            filtered = allProducts.filter(p => p.category === currentFilter);
        }
        // Filter by search
        if (searchQuery && searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
        }
        // Sort
        if (currentSort === 'price_asc') {
            filtered.sort((a, b) => a.price - b.price);
        } else if (currentSort === 'price_desc') {
            filtered.sort((a, b) => b.price - a.price);
        }

        productsTotalPages = 1;
        productsTotal = filtered.length;
        productsList = autoGroupProducts(filtered);
        renderProducts();
        _renderPagination();
    } catch (err) {
        console.error('Lỗi tải sản phẩm:', err);
    }
}

function _renderPagination() {
    // Xóa pagination cũ nếu có
    const oldPager = document.getElementById('zeus-product-pager');
    if (oldPager) oldPager.remove();
    if (productsTotalPages <= 1) return;

    const pager = document.createElement('div');
    pager.id = 'zeus-product-pager';
    pager.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:8px;margin:18px 0 8px;flex-wrap:wrap;';

    const btn = (label, page, disabled, active) => {
        const b = document.createElement('button');
        b.innerHTML = label;
        b.disabled = disabled;
        b.style.cssText = `padding:6px 14px;border-radius:8px;border:1px solid var(--primary,#a855f7);
            background:${active ? 'var(--primary,#a855f7)' : 'transparent'};
            color:${active ? '#fff' : 'var(--primary,#a855f7)'};
            cursor:${disabled ? 'not-allowed' : 'pointer'};opacity:${disabled ? '0.45' : '1'};
            font-size:13px;font-weight:600;transition:all .2s;`;
        if (!disabled) b.onclick = () => fetchProducts(page);
        return b;
    };

    pager.appendChild(btn('« Trước', currentPage - 1, currentPage <= 1, false));

    const start = Math.max(1, currentPage - 2);
    const end   = Math.min(productsTotalPages, currentPage + 2);
    if (start > 1) { pager.appendChild(btn('1', 1, false, false)); if (start > 2) { const dots = document.createElement('span'); dots.textContent = '…'; dots.style.color='#888'; pager.appendChild(dots); } }
    for (let p = start; p <= end; p++) pager.appendChild(btn(p, p, false, p === currentPage));
    if (end < productsTotalPages) { if (end < productsTotalPages - 1) { const dots = document.createElement('span'); dots.textContent = '…'; dots.style.color='#888'; pager.appendChild(dots); } pager.appendChild(btn(productsTotalPages, productsTotalPages, false, false)); }

    pager.appendChild(btn('Tiếp »', currentPage + 1, currentPage >= productsTotalPages, false));

    // Chèn sau productGrid
    if (productGrid && productGrid.parentNode) {
        productGrid.parentNode.insertBefore(pager, productGrid.nextSibling);
    }
}

function renderProducts() {
    if (!productGrid) return;
    if (productCount) productCount.textContent = productsList.length;

    const randomCard = currentFilter === 'download' ? '' : `
        <div class="random-product-card" id="randomProductCard" role="button" tabindex="0" aria-label="Bốc thăm trúng thưởng">
            <div class="random-product-image">
                <div class="random-card-glow"></div>
                <div class="random-card-gift"><i class="fas fa-gift"></i></div>
                <span class="random-card-badge">LUCKY</span>
            </div>
            <div class="product-info random-product-info">
                <h3 class="product-name" title="Bốc thăm trúng thưởng">BỐC THĂM TRÚNG THƯỞNG</h3>
                <div class="random-card-meta"><span>🎟️ Giá mỗi lượt</span><strong>20.000 ₫</strong></div>
                <button class="btn-order random-product-open" type="button"><i class="fas fa-dice"></i> Mở bốc thăm · 20.000 ₫</button>
            </div>
        </div>`;

    if (!productsList.length) {
        productGrid.innerHTML = randomCard + `<div class="no-products"><i class="fas fa-box-open" style="font-size:36px;margin-bottom:10px;"></i><br>Không tìm thấy sản phẩm phù hợp</div>`;
    } else {
        productGrid.innerHTML = randomCard + productsList.map((p, idx) => {
            const imgSrc = (p.image && p.image.trim()) ? p.image : generateBannerImage(p.name, p.category);
            const platforms = Array.isArray(p.platforms) ? p.platforms : ['iOS', 'PC'];
            const variants = parseVariants(p.description);
            const realDesc = getRealDescription(p.description);

            if (variants) {
                // ── GROUPED PRODUCT CARD ──
                const minPrice = Math.min(...variants.map(v => v.price));
                const maxPrice = Math.max(...variants.map(v => v.price));
                const priceRange = minPrice === maxPrice
                    ? Number(minPrice).toLocaleString() + ' ₫'
                    : Number(minPrice).toLocaleString() + ' – ' + Number(maxPrice).toLocaleString() + ' ₫';
                return `
                <div class="product-card product-card--grouped" data-id="${p.id}" style="--card-index: ${idx + 1};">
                    <div class="product-img">
                        <img src="${imgSrc}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async" onerror="this.src='${generateBannerImage(p.name, p.category)}'">
                        <span class="badge badge--grouped"><i class="fas fa-layer-group"></i> ${variants.length} GÓI</span>
                    </div>
                    <div class="product-info">
                        <div class="product-meta-row">
                            <div class="product-platforms">${platforms.map(pl => `<span>${escapeHtml(pl)}</span>`).join('')}</div>
                            <span class="product-stat stat-sold"><i class="fas fa-fire"></i> Đã bán ${Number(p.sold_count ?? p.sales_count ?? p.total_sold ?? 0).toLocaleString()}</span>
                        </div>
                        <h3 class="product-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</h3>
                        <p class="product-description">${escapeHtml(realDesc || 'Chọn gói phù hợp với nhu cầu của bạn.')}</p>
                        <div class="grouped-variant-pills">
                            ${variants.map(v => `<span class="variant-pill"><i class="fas fa-clock"></i> ${escapeHtml(v.label)}</span>`).join('')}
                        </div>
                        <div class="product-buy-row">
                            <div class="price grouped-price"><small>Từ</small> ${priceRange}</div>
                            <button class="btn-order btn-order--grouped" data-id="${p.id}" type="button"><i class="fas fa-layer-group"></i> Chọn gói</button>
                        </div>
                    </div>
                </div>`;
            }

            // ── NORMAL PRODUCT CARD ──
            return `
                <div class="product-card" data-id="${p.id}" style="--card-index: ${idx + 1};">
                    <div class="product-img">
                        <img src="${imgSrc}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async" onerror="this.src='${generateBannerImage(p.name, p.category)}'">
                        <span class="badge"><span class="dot"></span> ACTIVE</span>
                    </div>
                    <div class="product-info">
                        <div class="product-meta-row">
                            <div class="product-platforms">${platforms.map(pl => `<span>${escapeHtml(pl)}</span>`).join('')}</div>
                            <span class="product-stat stat-sold"><i class="fas fa-fire"></i> Đã bán ${Number(p.sold_count ?? p.sales_count ?? p.total_sold ?? 0).toLocaleString()}</span>
                            ${(p.category === "download" || p.product_type === "file" || p.product_type === "free_file") ? "" : "<span class=\"product-stat stat-stock\"><i class=\"fas fa-box\"></i> Còn " + Number(p.stock_count || 0).toLocaleString() + " sản phẩm</span>"}
                        </div>
                        <h3 class="product-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</h3>
                        <p class="product-description" title="${escapeHtml(getRealDescription(p.description) || '')}">${escapeHtml(getRealDescription(p.description) || 'Sản phẩm chính hãng, thông tin chi tiết được hiển thị khi mở sản phẩm.')}</p>
                        <div class="product-buy-row">
                            <div class="price">${p.category === 'download' ? '<span style="color:#22c55e;">MIỄN PHÍ</span>' : Number(p.price||0).toLocaleString() + ' <small>VNĐ</small>'}</div>
                            <button class="btn-order" data-id="${p.id}" type="button">${p.category === 'download' ? '<i class="fas fa-download"></i> Tải ngay' : '<i class="fas fa-cart-shopping"></i> Mua ngay'}</button>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    const randomCardEl=document.getElementById('randomProductCard');
    if(randomCardEl){
        const open=()=>openRandomModal();
        randomCardEl.addEventListener('click',open);
        randomCardEl.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
    }
    // Event delegation - gắn 1 lần trên productGrid, không bị mất khi re-render
    if (productGrid && !productGrid._cardListenerAttached) {
        productGrid._cardListenerAttached = true;
        productGrid.addEventListener('click', async function(e) {
            const btn = e.target.closest('.btn-order');
            const card = e.target.closest('.product-card');
            if (!card) return;
            const id = parseInt(btn ? btn.dataset.id : card.dataset.id);
            if (!id) return;
            const product = productsList.find(p => p.id === id);
            if (!product) return;

            // Nếu là grouped product → mở modal chọn gói
            const variants = parseVariants(product.description);
            if (variants) {
                e.stopPropagation();
                openGroupModal(product, variants);
                return;
            }

            if (product.category === 'download') {
                e.stopPropagation();
                // Lấy lại product mới nhất từ API để có download_url
                try {
                    const fresh = await api(`/api/products/${product.id}`, 'GET', null, false);
                    const url = (fresh?.product?.download_url || fresh?.download_url || product.download_url || '').trim();
                    if (url) {
                        const fullUrl = url.startsWith('http') ? url : (window.location.origin + url);
                        showAccountModal(
                            [{ type: 'file', download_url: fullUrl, url: fullUrl }],
                            product.name, 1, 0
                        );
                    } else Toast.show('❌ File chưa có link tải', 'error');
                } catch(err) {
                    const url = (product.download_url || '').trim();
                    if (url) {
                        const fullUrl = url.startsWith('http') ? url : (window.location.origin + url);
                        showAccountModal(
                            [{ type: 'file', download_url: fullUrl, url: fullUrl }],
                            product.name, 1, 0
                        );
                    } else Toast.show('❌ File chưa có link tải', 'error');
                }
            } else if (product.product_type === 'file') {
                e.stopPropagation();
                openPurchaseModal(product);
            } else {
                openPurchaseModal(product);
            }
        });
    }
    // Random product price is fixed at 20.000 ₫ per displayed draw button.
}

async function loadRandomProductWinRate(){
    const el=document.getElementById('randomProductWinRate');
    if(!el)return;
    try{const data=await api('/api/random/products','GET',null,false);el.textContent=`${Number(data.win_rate??0)}%`;}catch(e){el.textContent='0%';}
}

// --- 11. QUANTITY & TOTAL PRICE IN MODAL ---
function updateTotalPrice() {
    if (!currentProduct) return;
    let qty = parseInt(qtyInput.value) || 1;
    
    // Validate and clamp quantity
    if (isNaN(qty) || qty < 1) qty = 1;
    if (qty > 50) qty = 50;
    
    qtyInput.value = qty;
    currentQuantity = qty;
    
    // Validate product price
    const price = currentProduct.price || 0;
    if (isNaN(price) || price < 0) {
        if (totalPriceDisplay) totalPriceDisplay.textContent = 'Giá không hợp lệ';
        return;
    }
    
    const total = price * qty;
    if (totalPriceDisplay) {
        totalPriceDisplay.textContent = total <= 0 ? 'Tổng: MIỄN PHÍ' : `Tổng: ${total.toLocaleString()}₫`;
        totalPriceDisplay.classList.remove('bump');
        void totalPriceDisplay.offsetWidth; // trigger reflow
        totalPriceDisplay.classList.add('bump');
    }
}

qtyMinus?.addEventListener('click', () => {
    let val = parseInt(qtyInput.value) || 1;
    if (val > 1) qtyInput.value = val - 1;
    updateTotalPrice();
});
qtyPlus?.addEventListener('click', () => {
    let val = parseInt(qtyInput.value) || 1;
    if (val < 50) qtyInput.value = val + 1;
    updateTotalPrice();
});
qtyInput?.addEventListener('change', updateTotalPrice);
qtyInput?.addEventListener('input', () => {
    resetAppliedCoupon();
    updateTotalPrice();
});

// --- 12. PURCHASE MODAL FLOW WITH COUPON VOUCHER SUPPORT ---
let appliedCouponData = null;

function resetAppliedCoupon() {
    appliedCouponData = null;
    const msgEl = document.getElementById('couponAppliedMsg');
    if (msgEl) {
        msgEl.style.display = 'none';
        msgEl.innerHTML = '';
    }
}

async function handleApplyCoupon() {
    const couponInput = document.getElementById('purchaseCouponInput');
    const msgEl = document.getElementById('couponAppliedMsg');
    if (!couponInput || !currentProduct) return;
    
    const code = couponInput.value.trim().toUpperCase();
    if (!code) {
        Toast.show('⚠️ Vui lòng nhập mã giảm giá trước khi bấm Áp dụng', 'warning');
        return;
    }
    
    const qty = parseInt(qtyInput.value) || 1;
    try {
        const res = await api('/api/coupons/validate', 'POST', {
            code: code,
            product_id: currentProduct.id,
            quantity: qty
        });
        
        if (res.success && res.valid) {
            appliedCouponData = res;
            if (msgEl) {
                msgEl.style.display = 'block';
                msgEl.style.color = '#00ff88';
                msgEl.innerHTML = `<i class="fas fa-check-circle"></i> Đã áp dụng mã <strong>${res.code}</strong>: Giảm <strong>${res.discount_amount.toLocaleString()}₫</strong> (Chỉ còn: <strong>${res.final_price.toLocaleString()}₫</strong>)`;
            }
            if (totalPriceDisplay) {
                totalPriceDisplay.innerHTML = `Tổng: <span style="text-decoration:line-through;color:#94a3b8;font-size:12px;">${res.raw_total.toLocaleString()}₫</span> <span style="color:#00ff88;font-weight:800;">${res.final_price.toLocaleString()}₫</span>`;
            }
            Toast.show(`🎉 ${res.message}`, 'success');
        }
    } catch (err) {
        appliedCouponData = null;
        if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.style.color = '#ef4444';
            msgEl.innerHTML = `<i class="fas fa-times-circle"></i> ${err.message}`;
        }
        updateTotalPrice();
        Toast.show(`❌ ${err.message}`, 'error');
    }
}

// ─────────────────────────────────────────────────────────────
// GROUPED PRODUCT MODAL - chọn gói (variant)
// ─────────────────────────────────────────────────────────────
function openGroupModal(product, variants) {
    // Tạo modal chọn gói nếu chưa có
    let overlay = document.getElementById('groupVariantModal');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'groupVariantModal';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
        <div class="modal-content card-3d" style="max-width:480px;">
            <button class="modal-close" id="groupModalClose"><i class="fas fa-times"></i></button>
            <div id="groupModalHeader" style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
                <img id="groupModalImg" src="" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:12px;border:2px solid var(--primary);">
                <div>
                    <h2 id="groupModalName" style="font-size:18px;font-weight:800;color:#fff;margin:0 0 4px;"></h2>
                    <p id="groupModalDesc" style="font-size:12px;color:var(--text-secondary);margin:0;"></p>
                </div>
            </div>
            <div style="margin-bottom:12px;">
                <p style="font-size:12px;color:#d8b4fe;font-weight:700;margin-bottom:10px;"><i class="fas fa-layer-group"></i> CHỌN GÓI PHÙ HỢP:</p>
                <div id="groupVariantList" style="display:flex;flex-direction:column;gap:10px;"></div>
            </div>
            <button class="btn-secondary" id="groupModalCancel" style="width:100%;margin-top:6px;">Đóng</button>
        </div>`;
        document.body.appendChild(overlay);
        document.getElementById('groupModalClose').addEventListener('click', () => closeModal(overlay));
        document.getElementById('groupModalCancel').addEventListener('click', () => closeModal(overlay));
        overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay); });
    }

    // Fill data
    const imgSrc = (product.image && product.image.trim()) ? product.image : generateBannerImage(product.name, product.category);
    document.getElementById('groupModalImg').src = imgSrc;
    document.getElementById('groupModalName').textContent = product.name;
    const realDesc = getRealDescription(product.description);
    document.getElementById('groupModalDesc').textContent = realDesc || 'Chọn gói phù hợp với nhu cầu';

    const list = document.getElementById('groupVariantList');
    list.innerHTML = variants.map((v, i) => {
        const iconMap = {
            '1 giờ': 'fa-hourglass-half', '1 ngày': 'fa-sun', '1 tuần': 'fa-calendar-week',
            '1 tháng': 'fa-calendar-days', '3 tháng': 'fa-calendar-check', '1 năm': 'fa-crown'
        };
        const iconKey = Object.keys(iconMap).find(k => v.label.toLowerCase().includes(k)) || null;
        const icon = iconKey ? iconMap[iconKey] : 'fa-key';
        return `
        <button class="group-variant-btn" data-variant-idx="${i}" type="button" style="
            display:flex;align-items:center;justify-content:space-between;
            background:linear-gradient(135deg,rgba(168,85,247,0.12),rgba(139,92,246,0.08));
            border:1px solid rgba(168,85,247,0.35);border-radius:12px;
            padding:13px 16px;cursor:pointer;transition:all .2s;width:100%;
            color:#fff;font-size:14px;font-weight:700;">
            <span style="display:flex;align-items:center;gap:10px;">
                <span style="width:36px;height:36px;background:rgba(168,85,247,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;">
                    <i class="fas ${icon}" style="color:var(--primary);font-size:16px;"></i>
                </span>
                <span>${escapeHtml(v.label)}</span>
            </span>
            <span style="color:#a78bfa;font-size:15px;font-weight:900;">${Number(v.price).toLocaleString()} ₫</span>
        </button>`;
    }).join('');

    // Click on variant → open purchase modal with that variant price
    list.querySelectorAll('.group-variant-btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => { btn.style.borderColor='rgba(168,85,247,0.8)'; btn.style.background='linear-gradient(135deg,rgba(168,85,247,0.22),rgba(139,92,246,0.16))'; });
        btn.addEventListener('mouseleave', () => { btn.style.borderColor='rgba(168,85,247,0.35)'; btn.style.background='linear-gradient(135deg,rgba(168,85,247,0.12),rgba(139,92,246,0.08))'; });
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.variantIdx);
            const v = variants[idx];
            // Nếu auto-grouped → tìm sản phẩm gốc theo index để mua đúng stock/keys
            let targetProduct;
            if (product._autoGrouped && product._groupedIds) {
                // Lấy ID của variant tương ứng và tìm trong productsList gốc (trước khi gộp)
                const origId = product._groupedIds[idx];
                // Fetch lại từ server bằng id thật
                targetProduct = Object.assign({}, product, {
                    id: origId,
                    name: product.name + ' — ' + v.label,
                    price: v.price,
                    _isVariant: true,
                    _variantLabel: v.label
                });
            } else {
                targetProduct = Object.assign({}, product, {
                    name: product.name + ' — ' + v.label,
                    price: v.price,
                    _isVariant: true,
                    _variantLabel: v.label
                });
            }
            closeModal(overlay);
            setTimeout(() => openPurchaseModal(targetProduct), 180);
        });
    });

    openModal(overlay);
}

function openPurchaseModal(product) {
    currentProduct = product;
    currentQuantity = 1;
    if (qtyInput) qtyInput.value = 1;
    if (modalProductName) modalProductName.textContent = product.name;
    if (modalProductImg) {
        modalProductImg.src = (product.image && product.image.trim()) ? product.image : generateBannerImage(product.name, product.category);
        modalProductImg.onerror = function() { this.src = generateBannerImage(product.name, product.category); };
    }
    if (modalProductPrice) modalProductPrice.textContent = product.price.toLocaleString() + '₫';
    if (modalProductPlatforms) {
        const pl = Array.isArray(product.platforms) ? product.platforms : ['iOS', 'PC'];
        modalProductPlatforms.textContent = pl.join(' • ');
    }
    if (modalProductDesc) {
        modalProductDesc.textContent = getRealDescription(product.description) || ((product.product_type === 'file') ? 'File tải xuống sau khi thanh toán.' : 'Key kích hoạt bản quyền chính hãng, bảo hành trọn đời.');
    }
    // File luôn theo link hiện tại của Admin; Key/ACC bị giới hạn đúng kho.
    if (qtyInput) {
        const maxStock = product.product_type === 'file' ? 50 : Math.max(1, Number(product.stock_count || 0));
        qtyInput.max = String(Math.min(50, maxStock));
        qtyInput.value = 1;
    }
    const stockHint = document.getElementById('purchaseStockHint');
    const stockStatus = document.getElementById('purchaseStockStatus');
    if (product.product_type === 'file' || product.category === 'download') {
        if (stockHint) stockHint.style.display = 'none';
        if (stockStatus) stockStatus.closest('p')?.style && (stockStatus.closest('p').style.display = 'none');
    } else {
        if (stockHint) {
            stockHint.style.display = '';
            if (Number(product.stock_count || 0) > 0) stockHint.innerHTML = `<i class="fas fa-box"></i> Kho hiện còn <strong>${Number(product.stock_count).toLocaleString()}</strong> key/acc.`;
            else stockHint.innerHTML = '<i class="fas fa-circle-exclamation"></i> <strong>Hết hàng</strong> — vui lòng liên hệ Admin để cập nhật thêm.';
        }
        if (stockStatus) {
            stockStatus.closest('p').style.display = '';
            if (Number(product.stock_count || 0) > 0) stockStatus.innerHTML = `<i class="fas fa-check-circle"></i> CÒN ${Number(product.stock_count).toLocaleString()} KHO`;
            else stockStatus.innerHTML = '<i class="fas fa-circle-xmark"></i> HẾT HÀNG';
        }
    }
    
    // Reset coupon box
    const couponInput = document.getElementById('purchaseCouponInput');
    if (couponInput) couponInput.value = '';
    resetAppliedCoupon();
    updateTotalPrice();

    // Wire up apply coupon button
    const btnApply = document.getElementById('btnApplyCoupon');
    if (btnApply) {
        btnApply.onclick = handleApplyCoupon;
    }

    if (currentUser) {
        modalActionArea.innerHTML = `
            <div class="modal-action">
                <p style="color:var(--primary);margin-bottom:10px;font-size:13px;">
                    <i class="fas fa-user-check"></i> Đang đăng nhập: <strong>${currentUser.username}</strong> | Số dư: <strong>${(currentUser.balance || 0).toLocaleString()}₫</strong>
                </p>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <button class="btn-primary" id="confirmPurchaseBtn">
                        <i class="fas fa-check"></i> Xác nhận mua ngay
                    </button>
                    <button class="btn-secondary" id="cancelPurchaseBtn">Hủy</button>
                </div>
            </div>
        `;
        document.getElementById('confirmPurchaseBtn')?.addEventListener('click', confirmPurchase);
        document.getElementById('cancelPurchaseBtn')?.addEventListener('click', () => closeModal(purchaseModal));
    } else {
        modalActionArea.innerHTML = `
            <div class="modal-action">
                <p style="color:var(--primary);margin-bottom:10px;font-size:13px;">
                    <i class="fas fa-exclamation-circle"></i> Vui lòng đăng nhập tài khoản để mua hàng
                </p>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <button class="btn-primary" id="loginRequiredBtn">
                        <i class="fas fa-sign-in-alt"></i> Đăng nhập ngay
                    </button>
                    <button class="btn-secondary" id="cancelPurchaseGuest">Hủy</button>
                </div>
            </div>
        `;
        document.getElementById('loginRequiredBtn')?.addEventListener('click', () => {
            closeModal(purchaseModal);
            openLoginModal();
        });
        document.getElementById('cancelPurchaseGuest')?.addEventListener('click', () => closeModal(purchaseModal));
    }

    openModal(purchaseModal);
}

async function confirmPurchase() {
    if (!currentUser || !currentProduct) {
        Toast.show('❌ Session expired. Please login again.', 'error');
        return;
    }
    
    const qty = parseInt(qtyInput.value) || 1;
    
    // Validate quantity
    const maxQty = currentProduct.product_type === 'file' ? 50 : Number(currentProduct.stock_count || 0);
    if (qty < 1 || qty > Math.min(50, Math.max(0, maxQty)) || isNaN(qty)) {
        if (currentProduct.product_type !== 'file' && maxQty <= 0) {
            Toast.show('⚠️ Sản phẩm đã hết hàng. Vui lòng liên hệ Admin để cập nhật thêm.', 'error');
        } else {
            Toast.show(`❌ Kho hiện chỉ còn ${maxQty} sản phẩm.`, 'error');
        }
        return;
    }
    
    const rawTotal = currentProduct.price * qty;
    const discount = appliedCouponData ? (appliedCouponData.discount_amount || 0) : 0;
    const expectedTotal = Math.max(0, rawTotal - discount);
    
    // Validate price
    if (isNaN(currentProduct.price) || currentProduct.price <= 0) {
        Toast.show('❌ Giá sản phẩm không hợp lệ', 'error');
        return;
    }

    if ((currentUser.balance || 0) < expectedTotal) {
        Toast.show(`❌ Số dư không đủ! Cần ${expectedTotal.toLocaleString()}₫, bạn có ${(currentUser.balance || 0).toLocaleString()}₫`, 'error');
        openTopupModal();
        return;
    }

    try {
        const payload = {
            product_id: currentProduct.id,
            quantity: qty
        };
        if (appliedCouponData && appliedCouponData.code) {
            payload.coupon_code = appliedCouponData.code;
        }

        const res = await api('/api/orders/purchase', 'POST', payload, true);

        if (res.success && res.order) {
            currentUser.balance = res.new_balance;
            updateNavbar();
            closeModal(purchaseModal);
            showAccountModal(res.order.accounts, res.order.product_name, res.order.quantity, res.order.total_price);
            Toast.show(`🎉 ${res.message}`, 'success');
        }
    } catch (err) {
        Toast.show(`❌ ${err.message}`, 'error');
    }
}

// --- 13. ACCOUNT & KEY MODAL DELIVERY SYSTEM ---
function showAccountModal(accounts, productName, quantity, total, isHistory = false) {
    const modal = isHistory ? historyAccountModal : accountModal;
    const list = isHistory ? historyAccountList : accountList;
    const summary = isHistory ? historyAccountSummary : accountSummary;
    const copyAll = isHistory ? copyAllHistoryBtn : copyAllBtn;
    const titleEl = isHistory ? document.getElementById('historyAccountModalTitle') : document.getElementById('accountModalTitle');

    // Determine if items are Keys or Accounts
    const isFile = accounts.some(a => a.type === 'file' || a.download_url || a.url);
    const isAcc = !isFile && (accounts.some(a => a.type === 'account' || (a.username && a.password && !a.key && !a.license_key)) || 
                  productName.toLowerCase().includes('acc') || 
                  productName.toLowerCase().includes('clone') || 
                  productName.toLowerCase().includes('tài khoản'));

    if (titleEl) {
        if (isFile) {
            titleEl.innerHTML = `<i class="fas fa-download" style="color:var(--primary);filter:drop-shadow(0 0 15px var(--primary-glow));"></i> FILE ĐÃ MUA`;
        } else if (isAcc) {
            titleEl.innerHTML = `<i class="fas fa-user-shield" style="color:var(--primary);filter:drop-shadow(0 0 15px var(--primary-glow));"></i> THÔNG TIN TÀI KHOẢN & MẬT KHẨU`;
        } else {
            titleEl.innerHTML = `<i class="fas fa-key" style="color:var(--primary);filter:drop-shadow(0 0 15px var(--primary-glow));"></i> KEY KÍCH HOẠT BẢN QUYỀN`;
        }
    }

    if (summary) {
        summary.innerHTML = `🎮 <strong>${productName}</strong> (x${quantity}) | Tổng thanh toán: <span style="color:#00ff88;font-weight:bold;">${total.toLocaleString()}₫</span>`;
    }

    if (list) {
        if (isFile) {
            list.innerHTML = accounts.map((acc, idx) => {
                const url = acc.download_url || acc.url || '';
                return `<div class="account-item key-box" data-index="${idx}">
                    <div class="key-main-col"><span class="key-label-tag"><i class="fas fa-download"></i> Link tải #${idx + 1}:</span><code class="key-code-val" style="word-break:break-all;">${escapeHtml(url)}</code></div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;"><a class="btn-copy-main" href="${escapeHtml(url)}" target="_blank" rel="noopener"><i class="fas fa-download"></i> Tải file</a><button class="btn-copy-main btn-copy-file-link" data-url="${escapeHtml(url)}"><i class="fas fa-copy"></i> Sao chép link</button></div>
                </div>`;
            }).join('');
            list.querySelectorAll('.btn-copy-file-link').forEach(btn => btn.addEventListener('click', () => copyText(btn.dataset.url, '✅ Đã sao chép link tải!')));
        } else if (!isAcc) {
            // === KEY DISPLAY ONLY ===
            list.innerHTML = accounts.map((acc, idx) => {
                const keyCode = acc.key || acc.license_key || acc.username || 'KEY-ACTIVE';
                return `
                    <div class="account-item key-box" data-index="${idx}">
                        <div class="key-main-col">
                            <span class="key-label-tag"><i class="fas fa-key"></i> Key kích hoạt #${idx + 1}:</span>
                            <code class="key-code-val">${keyCode}</code>
                        </div>
                        <button class="btn-copy-main btn-copy-key-single" data-key="${keyCode}" title="Sao chép mã Key">
                            <i class="fas fa-copy"></i> Sao chép Key
                        </button>
                    </div>
                `;
            }).join('');

            list.querySelectorAll('.btn-copy-key-single').forEach(btn => {
                btn.addEventListener('click', function () {
                    const k = this.dataset.key;
                    copyText(k, `✅ Đã sao chép mã Key kích hoạt!`);
                });
            });
        } else {
            // === ACCOUNT (USERNAME | PASSWORD) DISPLAY ===
            list.innerHTML = accounts.map((acc, idx) => `
                <div class="account-item acc-box" data-index="${idx}">
                    <div class="acc-header-row">
                        <span class="acc-label-tag"><i class="fas fa-user-shield"></i> Tài khoản #${idx + 1}:</span>
                        <button class="btn-copy-main btn-copy-acc-combo" data-user="${acc.username}" data-pass="${acc.password}" title="Sao chép cả TK và MK">
                            <i class="fas fa-copy"></i> Sao chép TK | MK
                        </button>
                    </div>
                    <div class="acc-fields-grid">
                        <div class="acc-chip">
                            <div class="acc-chip-info">
                                <span>Tài khoản:</span>
                                <strong>${acc.username}</strong>
                            </div>
                            <button class="btn-mini-copy" data-val="${acc.username}" title="Sao chép tài khoản"><i class="fas fa-copy"></i></button>
                        </div>
                        <div class="acc-chip">
                            <div class="acc-chip-info">
                                <span>Mật khẩu:</span>
                                <strong>${acc.password}</strong>
                            </div>
                            <button class="btn-mini-copy" data-val="${acc.password}" title="Sao chép mật khẩu"><i class="fas fa-copy"></i></button>
                        </div>
                    </div>
                </div>
            `).join('');

            list.querySelectorAll('.btn-copy-acc-combo').forEach(btn => {
                btn.addEventListener('click', function () {
                    const u = this.dataset.user;
                    const p = this.dataset.pass;
                    copyText(`Tài khoản: ${u} | Mật khẩu: ${p}`, `✅ Đã sao chép Tài khoản & Mật khẩu!`);
                });
            });

            list.querySelectorAll('.btn-mini-copy').forEach(btn => {
                btn.addEventListener('click', function () {
                    const val = this.dataset.val;
                    copyText(val, `✅ Đã sao chép: ${val}`);
                });
            });
        }
    }

    if (copyAll) {
        copyAll.onclick = function () {
            if (isFile) {
                const urls = accounts.map(a => a.download_url || a.url || '').filter(Boolean).join('\n');
                copyText(urls, '✅ Đã sao chép link tải!');
            } else if (!isAcc) {
                const allKeys = accounts.map((a, i) => accounts.length > 1 ? `[Key #${i + 1}] ${a.key || a.license_key || a.username}` : (a.key || a.license_key || a.username)).join('\n');
                copyText(allKeys, '✅ Đã sao chép tất cả mã Key!');
            } else {
                let fullText = `📋 THÔNG TIN TÀI KHOẢN ĐÃ MUA (${productName}):\n\n`;
                accounts.forEach((acc, idx) => {
                    fullText += `[#${idx + 1}] TK: ${acc.username} | MK: ${acc.password}\n`;
                });
                copyText(fullText, '✅ Đã sao chép tất cả Tài khoản & Mật khẩu!');
            }
        };
    }

    openModal(modal);
}

// --- 14. ORDER HISTORY MODAL ---
async function openHistoryModal() {
    if (!currentUser) {
        openLoginModal();
        Toast.show('⚠️ Vui lòng đăng nhập để xem lịch sử mua hàng', 'info');
        return;
    }

    openModal(historyModal);
    if (historyList) historyList.innerHTML = `<p class="history-empty"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu từ API...</p>`;

    try {
        const data = await api('/api/orders/history', 'GET', null, true);
        if (data.success && data.orders && data.orders.length) {
            historyList.innerHTML = data.orders.map((o, idx) => `
                <div class="history-item">
                    <div>
                        <div class="h-product"><strong>${o.product_name}</strong> (x${o.quantity})</div>
                        <div class="h-price">${o.total_price.toLocaleString()}₫</div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">
                            <i class="fas fa-barcode"></i> Mã: ${o.order_code} • <i class="fas fa-clock"></i> ${o.created_at}
                        </div>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
                        <span class="badge-status" style="font-size:10px;padding:2px 8px;">COMPLETED</span>
                        <button class="btn-view-accounts" data-idx="${idx}">
                            <i class="fas fa-key"></i> Xem TK/Key
                        </button>
                    </div>
                </div>
            `).join('');

            historyList.querySelectorAll('.btn-view-accounts').forEach(btn => {
                btn.addEventListener('click', function () {
                    const idx = parseInt(this.dataset.idx);
                    const order = data.orders[idx];
                    if (order && order.accounts) {
                        showAccountModal(order.accounts, order.product_name, order.quantity, order.total_price, true);
                    }
                });
            });
        } else {
            historyList.innerHTML = `<p class="history-empty"><i class="fas fa-box-open" style="font-size:32px;margin-bottom:8px;"></i><br>Bạn chưa có đơn hàng nào</p>`;
        }
    } catch (err) {
        historyList.innerHTML = `<p class="history-empty" style="color:var(--primary);">❌ Lỗi tải lịch sử: ${err.message}</p>`;
    }
}

// ============================================================
// TOPUP BANK - VIẾT LẠI HOÀN TOÀN
// ============================================================

// Biến trạng thái topup
window.__topup = {
    payCode: '',
    pollTimer: null,
    amount: 0,
    sessionId: 0,
    successShown: false
};

// Cập nhật số dư + báo thành công bằng Toast (đơn giản, không phụ thuộc modal/z-index)
function topupSuccess(addedAmt, newBal) {
    // Guard: tránh báo trùng nếu 2 nguồn (poll + đồng bộ nền) cùng phát hiện gần nhau
    if (window.__topup.successShown) return;
    window.__topup.successShown = true;
    setTimeout(function () { window.__topup.successShown = false; }, 5000);

    // 1. Dừng poll & reset toàn bộ state
    if (window.__topup.pollTimer) {
        clearInterval(window.__topup.pollTimer);
        window.__topup.pollTimer = null;
    }
    window.__topup.payCode = '';
    window.__topup.amount = 0;
    window.__topup.sessionId = (window.__topup.sessionId || 0) + 1;

    // 2. Reset UI QR về step 1 (để lần sau mở lại bình thường)
    var step1 = document.getElementById('qrStep1');
    var step2 = document.getElementById('qrStep2');
    if (step2) step2.style.display = 'none';
    if (step1) step1.style.display = 'block';
    var sd = document.getElementById('topupSyntaxDisplay');
    if (sd) sd.textContent = '';
    var qi = document.getElementById('qrImage');
    if (qi) { qi.onload = null; qi.onerror = null; qi.src = ''; }

    // 3. Đóng QR modal nếu đang mở
    var tm = document.getElementById('topupModal');
    if (tm) closeModal(tm);

    // 4. Cập nhật số dư
    if (typeof updateUserBalance === 'function') updateUserBalance(newBal);
    checkAuth().catch(function(){});

    // 5. Báo thành công bằng Toast
    var addedText = '+' + Number(addedAmt).toLocaleString('vi-VN') + '₫';
    var balText = Number(newBal).toLocaleString('vi-VN') + '₫';
    Toast.show('✅ Nạp tiền thành công! ' + addedText + ' đã được cộng vào tài khoản. Số dư hiện tại: ' + balText, 'success', 6000);
}


// Poll trạng thái thanh toán
function topupStartPoll(payCode, amount) {
    if (window.__topup.pollTimer) clearInterval(window.__topup.pollTimer);
    window.__topup.payCode = payCode;
    window.__topup.amount = amount;
    var checked = 0;

    // Dùng session ID để tránh timer cũ vẫn chạy sau khi bị clear
    var sessionId = ++window.__topup.sessionId;
    window.__topup.pollTimer = setInterval(async function() {
        // Nếu session này đã bị hủy → dừng ngay
        if (sessionId !== window.__topup.sessionId) {
            clearInterval(window.__topup.pollTimer);
            return;
        }
        checked++;
        if (checked > 900) {
            window.__topup.sessionId++;
            clearInterval(window.__topup.pollTimer);
            window.__topup.pollTimer = null;
            Toast.show('⏳ Mã hết hạn. Vui lòng tạo mã mới.', 'info', 5000);
            return;
        }
        var code = window.__topup.payCode;
        if (!code) return;
        var token = authToken || (typeof ZeusEncryptedStorage !== 'undefined' ? ZeusEncryptedStorage.getItem('Xiters_auth_token') : null) || localStorage.getItem('Xiters_auth_token') || localStorage.getItem('__zeus_enc_Xiters_auth_token') || '';
        if (!token) return;
        try {
            var res = await fetch('/api/wallet/topup-status?code=' + encodeURIComponent(code), {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!res.ok) return;
            var d = await res.json();
            if (d.status === 'credited' || d.status === 'already_processed') {
                // Đánh dấu session kết thúc TRƯỚC khi làm gì khác
                window.__topup.sessionId++;
                clearInterval(window.__topup.pollTimer);
                window.__topup.pollTimer = null;
                console.log('[TOPUP] credited! calling topupSuccess', d);
                topupSuccess(d.added_amount || window.__topup.amount, d.new_balance || 0);
            }
        } catch(e) {}
    }, 2000);
}

// --- 15. TOPUP MODAL (VIETQR & ZALO DYNAMIC QR) ---
async function updateTopupQR() {
    try {
        var data = await api('/api/wallet/topup-request', 'POST', {
            amount: topupAmount,
            method: topupMethod
        }, !!currentUser);

        if (data.success && data.data) {
            var d = data.data;
            // Lưu pay code
            window.__topup.payCode = (d.syntax || d.pay_code || '').trim();

            var qi = document.getElementById('qrImage');
            if (qi) {
                qi.src = d.qr_url;
                qi.onerror = function() {
                    if (d.vietqr_io_url && qi.src !== d.vietqr_io_url) qi.src = d.vietqr_io_url;
                };
            }
            var sd = document.getElementById('topupSyntaxDisplay');
            if (sd) sd.textContent = d.syntax;
            var bankName = document.getElementById('topupBankNameDisplay');
            var bankPhone = document.getElementById('topupPhone');
            var bankOwner = document.getElementById('topupBankOwnerDisplay');
            if (bankName) bankName.textContent = d.bank_name || 'MBBank';
            if (bankPhone) bankPhone.textContent = d.bank_account || '';
            if (bankOwner) bankOwner.textContent = d.bank_owner || d.admin_name || '';
            if (qrLabel) qrLabel.textContent = topupMethod === 'vietqr'
                ? 'Quét mã VietQR bằng App Ngân Hàng để nạp tự động'
                : 'Quét mã QR để mở Zalo Admin nạp tiền';
            return window.__topup.payCode;
        }
    } catch (err) {
        var qi2 = document.getElementById('qrImage');
        if (qi2) qi2.src = '';
    }
    return '';
}

function openTopupModal() {
    if (!currentUser) {
        Toast.show('⚠️ Vui lòng đăng nhập để nạp tiền!', 'error');
        openModal(loginModal);
        return;
    }

    // Reset hoàn toàn state cũ để lần sau mở lại không bị stuck
    if (window.__topup) {
        if (window.__topup.pollTimer) { clearInterval(window.__topup.pollTimer); window.__topup.pollTimer = null; }
        window.__topup.payCode = '';
        window.__topup.amount = 0;
        window.__topup.successShown = false;
    }

    // Reset UI về step 1
    var step1 = document.getElementById('qrStep1');
    var step2 = document.getElementById('qrStep2');
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
    var qi = document.getElementById('qrImage');
    if (qi) qi.src = '';
    var sd = document.getElementById('topupSyntaxDisplay');
    if (sd) sd.textContent = '';

    topupAmount = 20000;
    document.querySelectorAll('.amount-chip').forEach(function(c) {
        c.classList.toggle('active', c.dataset.amount === '20000');
    });
    if (topupCustomAmount) topupCustomAmount.value = '';
    openModal(topupModal);
}

// Nút Tạo QR: step1 → step2
document.getElementById('btnGenerateQR')?.addEventListener('click', async function() {
    var step1 = document.getElementById('qrStep1');
    var step2 = document.getElementById('qrStep2');
    if (!step1 || !step2) return;

    var custom = parseInt(topupCustomAmount?.value || '', 10);
    if (custom) topupAmount = custom;
    if (!Number.isFinite(topupAmount) || topupAmount < 10000) {
        Toast.show('❌ Số tiền nạp không hợp lệ!', 'error');
        return;
    }

    step1.style.display = 'none';
    step2.style.display = 'block';

    var payCode = await updateTopupQR();
    if (!payCode) {
        Toast.show('❌ Không tạo được mã QR, vui lòng thử lại!', 'error');
        step1.style.display = 'block';
        step2.style.display = 'none';
        return;
    }

    // Bắt đầu poll
    topupStartPoll(payCode, topupAmount);
});

// Nút Quay lại
document.getElementById('btnQRBack')?.addEventListener('click', function() {
    if (window.__topup.pollTimer) {
        clearInterval(window.__topup.pollTimer);
        window.__topup.pollTimer = null;
    }
    window.__topup.payCode = '';
    var step1 = document.getElementById('qrStep1');
    var step2 = document.getElementById('qrStep2');
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
});

// Nút test popup thành công (debug)
document.getElementById('btnTestSuccessPopup')?.addEventListener('click', function() {
    topupSuccess(50000, (currentUser ? Number(currentUser.balance || 0) : 0) + 50000);
});

// Nút Kiểm tra GD
document.getElementById('btnCheckTransaction')?.addEventListener('click', async function() {
    if (this.disabled) return;
    this.disabled = true;
    var btn = this;
    setTimeout(function() { btn.disabled = false; }, 4000);

    Toast.show('🔄 Đang kiểm tra giao dịch...', 'info', 2000);
    var token = authToken || (typeof ZeusEncryptedStorage !== 'undefined' ? ZeusEncryptedStorage.getItem('Xiters_auth_token') : null) || '';
    var code = window.__topup.payCode;
    if (!code) {
        Toast.show('❌ Không có mã giao dịch, vui lòng tạo QR lại.', 'error');
        return;
    }
    try {
        var res = await fetch('/api/wallet/topup-status?code=' + encodeURIComponent(code), {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        var d = await res.json();
        if (d.status === 'credited' || d.status === 'already_processed') {
            topupSuccess(d.added_amount || topupAmount, d.new_balance || 0);
        } else {
            Toast.show('⏳ Chưa thấy giao dịch. Nếu vừa chuyển, chờ vài giây rồi thử lại.', 'info', 3500);
        }
    } catch(e) {
        Toast.show('❌ Lỗi kết nối, thử lại sau!', 'error', 3000);
    }
});

document.querySelectorAll('.amount-chip').forEach(chip => {
    chip.addEventListener('click', function () {
        document.querySelectorAll('.amount-chip').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        topupAmount = parseInt(this.dataset.amount, 10) || 20000;
        if (topupCustomAmount) topupCustomAmount.value = '';
    });
});

topupCustomAmount?.addEventListener('input', function () {
    const raw = this.value.trim();
    if (!raw) {
        document.querySelectorAll('.amount-chip').forEach(c => c.classList.remove('active'));
        return;
    }
    const val = parseInt(raw, 10);
    if (Number.isFinite(val) && DataValidator.isValidAmount(val)) {
        topupAmount = val;
        document.querySelectorAll('.amount-chip').forEach(c => c.classList.remove('active'));
    }
});

let selectedTelco = 'VIETTEL';

// === NEW TOPUP TAB HANDLER ===
document.querySelectorAll('.topup-tab').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.topup-tab').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        topupMethod = this.dataset.method;

        const bankBody = document.getElementById('topupBankBody');
        const cardBody = document.getElementById('topupCardBody');

        if (topupMethod === 'card') {
            if (bankBody) bankBody.style.display = 'none';
            if (cardBody) { cardBody.style.display = 'block'; loadUserCardHistory(); }
        } else {
            if (bankBody) bankBody.style.display = 'block';
            if (cardBody) cardBody.style.display = 'none';
        }
    });
});

// Legacy method-btn (fallback)
document.querySelectorAll('.method-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        topupMethod = this.dataset.method;
        const bankBody = document.getElementById('topupBankBody');
        const cardBody = document.getElementById('topupCardBody');
        if (topupMethod === 'card') {
            if (bankBody) bankBody.style.display = 'none';
            if (cardBody) { cardBody.style.display = 'block'; loadUserCardHistory(); }
        } else {
            if (bankBody) bankBody.style.display = 'block';
            if (cardBody) cardBody.style.display = 'none';
        }
    });
});


// Telco chips selector
document.querySelectorAll('.telco-chip').forEach(chip => {
    chip.addEventListener('click', function () {
        document.querySelectorAll('.telco-chip').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        selectedTelco = this.dataset.telco || 'VIETTEL';
    });
});

// Card submit form
document.getElementById('cardChargingForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!currentUser) {
        Toast.show('⚠️ Vui lòng đăng nhập trước khi nạp thẻ cào!', 'error');
        openModal(loginModal);
        return;
    }
    
    const code = sanitizeInput(document.getElementById('cardCodeInput')?.value, 'text');
    const serial = sanitizeInput(document.getElementById('cardSerialInput')?.value, 'text');
    const declaredValue = parseInt(document.getElementById('cardDeclaredValue')?.value) || 0;
    // Get telco from new select (or legacy chips)
    const telcoSelect = document.getElementById('cardTelcoSelect');
    const telco = (telcoSelect?.value || selectedTelco || '').toUpperCase();

    // Validation
    if (!code || code.length < 5 || code.length > 50) {
        Toast.show('❌ Mã PIN phải từ 5-50 ký tự', 'error');
        return;
    }
    if (!serial || serial.length < 5 || serial.length > 50) {
        Toast.show('❌ Số Serial phải từ 5-50 ký tự', 'error');
        return;
    }
    if (!telco) {
        Toast.show('❌ Vui lòng chọn nhà mạng', 'error');
        return;
    }
    if (!declaredValue || !DataValidator.isValidAmount(declaredValue)) {
        Toast.show('❌ Vui lòng chọn mệnh giá hợp lệ', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('btnSubmitCard');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi thẻ cào...';
    }
    
    try {
        const res = await api('/api/card/charging', 'POST', {
            telco: telco,
            code: code,
            serial: serial,
            declared_value: declaredValue
        }, true);
        
        Toast.show(`🎉 ${res.message}`, 'success', 4000);
        document.getElementById('cardCodeInput').value = '';
        document.getElementById('cardSerialInput').value = '';
        loadUserCardHistory();
    } catch (err) {
        Toast.show(`❌ Lỗi gửi thẻ: ${err.message}`, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-bolt"></i> NẠP THẺ CÀO NGAY';
        }
    }
});

// Load user scratch card history
async function loadUserCardHistory() {
    const tbody = document.getElementById('userCardHistoryBody');
    if (!tbody || !currentUser) return;
    try {
        const res = await api('/api/card/history', 'GET', null, true);
        if (res.success && res.cards && res.cards.length > 0) {
            tbody.innerHTML = res.cards.map(c => {
                let badge = '<span class="card-status-badge card-status-99">● Chờ duyệt</span>';
                if (c.status === 1) badge = '<span class="card-status-badge card-status-1">● Thành công</span>';
                else if (c.status === 2) badge = '<span class="card-status-badge card-status-2">● Sai mệnh giá</span>';
                else if (c.status === 3 || c.status === 100) badge = '<span class="card-status-badge card-status-3">● Thẻ lỗi</span>';
                
                return `
                    <tr>
                        <td>${c.created_at ? (c.created_at.split(' ')[1] || c.created_at) : ''}</td>
                        <td><strong>${c.telco}</strong></td>
                        <td>${(c.declared_value || 0).toLocaleString()}₫</td>
                        <td style="color:#00ff88;font-weight:700;">+${(c.amount_received || 0).toLocaleString()}₫</td>
                        <td>${badge}</td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Chưa có giao dịch nạp thẻ</td></tr>`;
        }
    } catch (e) {
        console.warn('Lỗi tải lịch sử thẻ:', e);
    }
}

copySyntaxBtn?.addEventListener('click', () => {
    const syntax = topupSyntaxDisplay ? topupSyntaxDisplay.textContent : `NAPTIEN ${currentUser?.username || 'USER'} ${topupAmount}`;
    copyText(syntax, `✅ Đã sao chép cú pháp: ${syntax}`);
});

document.getElementById('openZaloTopupBtn')?.addEventListener('click', () => {
    window.open(currentSettings.zalo_link || '#', '_blank');
});

// --- 16. ADMIN PANEL CONTROLLER ---
async function openAdminModal() {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'seller')) {
        Toast.show('⛔ Bạn không có quyền truy cập bảng quản trị', 'error');
        return;
    }
    
    const isOwner = currentUser.role === 'admin';
    const isSeller = currentUser.role === 'seller';

    // Show/hide owner-only tabs
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        const tab = btn.dataset.tab;
        if (['tab-bank', 'tab-card', 'tab-random', 'tab-settings'].includes(tab)) {
            btn.style.display = isOwner ? 'flex' : 'none';
        } else {
            btn.style.display = 'flex';
        }
    });

    // Show/hide Add Seller button
    const btnAddSeller = document.getElementById('btnOpenCreateSellerModal');
    if (btnAddSeller) {
        btnAddSeller.style.display = isOwner ? 'inline-flex' : 'none';
    }

    openModal(adminModal);
    loadAdminStats();
    loadAdminUsers();
    loadAdminProducts(adminProductsCurrentPage);
    loadAdminCoupons();
    loadAdminOrders();
    if (isOwner) {
        loadAdminBankLogs();
        loadAdminCardLogs();
        loadAdminSettings();
    }
    fetchFeedbacks();
}

async function loadAdminStats() {
    try {
        const data = await api('/api/admin/stats', 'GET', null, true);
        if (data.success && data.stats) {
            const s = data.stats;
            document.getElementById('statTotalUsers').textContent = s.total_users;
            document.getElementById('statTotalRevenue').textContent = `${(s.total_revenue || 0).toLocaleString()}₫`;
            document.getElementById('statTotalOrders').textContent = s.total_orders;
            document.getElementById('statTotalBalanceHeld').textContent = `${(s.total_balance_held || 0).toLocaleString()}₫`;
        }
    } catch (e) {
        console.error('Lỗi load admin stats:', e);
    }
}

async function loadAdminUsers() {
    const tbody = document.getElementById('adminUsersTableBody');
    if (!tbody) return;
    try {
        const data = await api('/api/admin/users', 'GET', null, true);
        if (data.success && data.users) {
            tbody.innerHTML = data.users.map(u => {
                let roleBadge = '';
                if (u.role === 'admin') {
                    roleBadge = `<span class="badge" style="background:rgba(239,68,68,0.2);color:#ef4444;border:1px solid rgba(239,68,68,0.5);font-weight:800;"><i class="fas fa-crown"></i> OWNER</span>`;
                } else if (u.role === 'seller') {
                    roleBadge = `<span class="badge" style="background:rgba(168,85,247,0.25);color:#c084fc;border:1px solid rgba(168,85,247,0.5);font-weight:800;"><i class="fas fa-user-shield"></i> SELLER</span>`;
                } else {
                    roleBadge = `<span class="badge" style="background:rgba(59,130,246,0.15);color:#93c5fd;border:1px solid rgba(59,130,246,0.3);font-weight:700;"><i class="fas fa-user"></i> USER</span>`;
                }

                return `
                <tr>
                    <td>#${u.id}</td>
                    <td><strong style="color:#ffffff;">${escapeHtml(u.username)}</strong></td>
                    <td>${escapeHtml(u.email || '-')}</td>
                    <td style="color:#00ff88;font-weight:bold;">${(u.balance || 0).toLocaleString()}₫</td>
                    <td>${roleBadge}</td>
                    <td style="font-size:11px;color:var(--text-muted);">${u.created_at ? u.created_at.slice(0, 10) : '-'}</td>
                    <td>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            <button class="btn-admin-action adjust-balance-btn" data-id="${u.id}" data-user="${escapeHtml(u.username)}" data-bal="${u.balance || 0}" style="color:#00ff88;border-color:rgba(0,255,136,0.3);" title="Nạp hoặc trừ tiền">
                                <i class="fas fa-coins"></i> Nạp/Trừ
                            </button>
                            <button class="btn-admin-action change-role-btn" data-id="${u.id}" data-user="${escapeHtml(u.username)}" data-role="${u.role}" style="color:#c084fc;border-color:rgba(168,85,247,0.4);" title="Phân quyền (Owner/Seller/User)">
                                <i class="fas fa-user-gear"></i> Quyền
                            </button>
                            ${!['admin','owner'].includes(String(u.role || '').toLowerCase()) ? `<button class="btn-admin-action reset-user-password-btn" data-id="${u.id}" data-user="${escapeHtml(u.username)}" style="color:#fbbf24;border-color:rgba(251,191,36,0.4);" title="Đặt lại mật khẩu user">
                                <i class="fas fa-key"></i> Đổi MK
                            </button>` : ''}
                        </div>
                    </td>
                </tr>
            `}).join('');

            // Adjust balance click handler
            tbody.querySelectorAll('.adjust-balance-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    const uid = this.dataset.id;
                    const uname = this.dataset.user;
                    const bal = Number(this.dataset.bal) || 0;
                    
                    const modal = document.getElementById('adjustBalanceModal');
                    const idInput = document.getElementById('adjUserId');
                    const nameEl = document.getElementById('adjUsername');
                    const balEl = document.getElementById('adjCurrentBalance');
                    const amtInput = document.getElementById('adjAmount');
                    
                    if (modal && idInput && nameEl && balEl && amtInput) {
                        idInput.value = uid;
                        nameEl.textContent = uname;
                        balEl.textContent = bal.toLocaleString() + '₫';
                        amtInput.value = '';
                        openModal(modal);
                    }
                });
            });

            // Change role click handler
            tbody.querySelectorAll('.change-role-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    const uid = this.dataset.id;
                    const uname = this.dataset.user;
                    const role = this.dataset.role;
                    
                    const modal = document.getElementById('changeRoleModal');
                    const idInput = document.getElementById('changeRoleUserId');
                    const nameEl = document.getElementById('changeRoleUsername');
                    const selRole = document.getElementById('selectUserRole');
                    
                    if (modal && idInput && nameEl && selRole) {
                        idInput.value = uid;
                        nameEl.textContent = uname;
                        selRole.value = role;
                        openModal(modal);
                    }
                });
            });
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="color:var(--primary);">Lỗi tải danh sách người dùng: ${e.message}</td></tr>`;
    }
}

// === COUPON / MÃ GIẢM GIÁ MANAGEMENT ===
async function loadAdminCoupons() {
    const tbody = document.getElementById('adminCouponsTableBody');
    if (!tbody) return;
    try {
        const data = await api('/api/admin/coupons', 'GET', null, true);
        if (data.success && data.coupons) {
            if (data.coupons.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:20px;">Chưa có mã giảm giá nào được tạo. Hãy tạo mã mới ở form trên!</td></tr>`;
                return;
            }

            tbody.innerHTML = data.coupons.map(c => {
                const discountText = c.discount_type === 'percent' 
                    ? `<strong style="color:#00ff88;">${c.discount_value}%</strong> (Tối đa: ${c.max_discount_amount > 0 ? c.max_discount_amount.toLocaleString() + '₫' : 'Vô hạn'})`
                    : `<strong style="color:#00ff88;">${c.discount_value.toLocaleString()}₫</strong>`;
                
                const minOrderText = c.min_order_value > 0 ? `${c.min_order_value.toLocaleString()}₫` : '0₫';
                const limitText = c.usage_limit > 0 ? `${c.used_count} / ${c.usage_limit}` : `${c.used_count} / ∞`;
                let expiresText = 'Vĩnh viễn';
                if (c.expires_at) {
                    const msLeft = new Date(c.expires_at).getTime() - Date.now();
                    const daysLeft = Math.ceil(msLeft / 86400000);
                    expiresText = daysLeft > 0 ? `Còn ${daysLeft} ngày` : 'Đã hết hạn';
                }
                
                const statusBadge = c.is_active === 1
                    ? `<span class="badge active" style="background:rgba(0,255,136,0.15);color:#00ff88;border:1px solid rgba(0,255,136,0.3);font-size:11px;">Hoạt động</span>`
                    : `<span class="badge" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);font-size:11px;">Tạm khóa</span>`;

                return `
                <tr>
                    <td><strong style="color:#d8b4fe;font-family:monospace;font-size:13px;background:rgba(168,85,247,0.15);padding:3px 8px;border-radius:6px;border:1px dashed rgba(168,85,247,0.4);">${escapeHtml(c.code)}</strong></td>
                    <td>${c.discount_type === 'percent' ? '<span style="color:#38bdf8;">Phần trăm (%)</span>' : '<span style="color:#f59e0b;">Cố định (₫)</span>'}</td>
                    <td>${discountText}</td>
                    <td>${minOrderText}</td>
                    <td>${limitText}</td>
                    <td style="font-size:11px;color:var(--text-muted);">${expiresText}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div style="display:flex;gap:6px;">
                            <button class="btn-admin-action toggle-coupon-btn" data-id="${c.id}" data-active="${c.is_active}" style="color:${c.is_active ? '#ffb400' : '#00ff88'};border-color:rgba(255,255,255,0.15);" title="${c.is_active ? 'Khóa mã' : 'Kích hoạt'}">
                                <i class="fas fa-${c.is_active ? 'lock' : 'unlock'}"></i> ${c.is_active ? 'Khóa' : 'Mở'}
                            </button>
                            <button class="btn-admin-action delete-coupon-btn" data-id="${c.id}" data-code="${escapeHtml(c.code)}" style="color:#ff4466;border-color:rgba(255,50,50,0.3);" title="Xóa mã">
                                <i class="fas fa-trash"></i> Xóa
                            </button>
                        </div>
                    </td>
                </tr>
            `}).join('');

            // Toggle coupon active status
            tbody.querySelectorAll('.toggle-coupon-btn').forEach(btn => {
                btn.addEventListener('click', async function () {
                    const cid = this.dataset.id;
                    const currActive = parseInt(this.dataset.active);
                    const newActive = currActive === 1 ? 0 : 1;
                    
                    try {
                        const allCoupons = data.coupons.find(x => String(x.id) === String(cid));
                        if (!allCoupons) return;
                        
                        await api(`/api/admin/coupons/${cid}`, 'PUT', {
                            code: allCoupons.code,
                            discount_type: allCoupons.discount_type,
                            discount_value: allCoupons.discount_value,
                            min_order_value: allCoupons.min_order_value || 0,
                            max_discount_amount: allCoupons.max_discount_amount || 0,
                            usage_limit: allCoupons.usage_limit || 0,
                            expires_days: allCoupons.expires_at ? Math.max(0, Math.ceil((new Date(allCoupons.expires_at).getTime() - Date.now()) / 86400000)) : 0,
                            is_active: newActive
                        }, true);
                        
                        Toast.show(newActive === 1 ? '✅ Đã kích hoạt mã giảm giá' : '🔒 Đã tạm khóa mã giảm giá', 'success');
                        loadAdminCoupons();
                    } catch (err) {
                        Toast.show(`❌ ${err.message}`, 'error');
                    }
                });
            });

            // Delete coupon
            tbody.querySelectorAll('.delete-coupon-btn').forEach(btn => {
                btn.addEventListener('click', async function () {
                    const cid = this.dataset.id;
                    const code = this.dataset.code;
                    if (confirm(`Bạn có chắc muốn xóa mã giảm giá "${code}"?`)) {
                        try {
                            await api(`/api/admin/coupons/${cid}`, 'DELETE', null, true);
                            Toast.show(`✅ Đã xóa mã giảm giá "${code}" thành công!`, 'success');
                            loadAdminCoupons();
                        } catch (err) {
                            Toast.show(`❌ ${err.message}`, 'error');
                        }
                    }
                });
            });
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" style="color:var(--primary);">Lỗi tải mã giảm giá: ${e.message}</td></tr>`;
    }
}

let adminProductsCurrentPage = 1;
let adminProductsSearchTerm = '';

async function loadAdminProducts(page = 1, search = adminProductsSearchTerm) {
    const tbody = document.getElementById('adminProductsTableBody');
    if (!tbody) return;
    adminProductsCurrentPage = page;
    adminProductsSearchTerm = search;

    const searchInput = document.getElementById('adminProductSearch');
    if (searchInput && searchInput.value !== search) searchInput.value = search;

    try {
        // Fetch 1 lần limit lớn - server search, frontend sort+paginate
        const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
        const data = await api(`/api/products?sort=newest&limit=200&page=1${searchParam}`);
        if (!data.success || !data.products) return;

        const allProducts = [...data.products].sort((a, b) => a.id - b.id);

        const filtered = search ? allProducts.filter(p =>
            p.name.toLowerCase().includes(search.trim().toLowerCase())
        ) : allProducts;

        const PAGE_SIZE = 24;
        const total = filtered.length;
        const totalPages = Math.ceil(total / PAGE_SIZE);
        const start = (page - 1) * PAGE_SIZE;
        const products = filtered.slice(start, start + PAGE_SIZE);


        if (products.length > 0) {
            // Reset scroll về đầu
            const wrap = document.getElementById('adminProductsTableWrap');
            if (wrap) wrap.scrollTop = 0;
            tbody.innerHTML = products.map(p => {
                const imgThumb = p.image ? p.image : generateBannerImage(p.name, p.category);
                const stockBadge = p.category === 'download'
                    ? `<span class="badge active" style="font-size:11px;"><i class="fas fa-download"></i> FILE MIỄN PHÍ</span>`
                    : (p.product_type === 'file'
                    ? `<span class="badge active" style="font-size:11px;"><i class="fas fa-download"></i> FILE BÁN · Link cố định</span>`
                    : ((p.stock_count && p.stock_count > 0)
                        ? `<span class="badge active" style="font-size:11px;cursor:pointer;" title="Bấm để xem danh sách key"><i class="fas fa-key"></i> Còn ${p.stock_count} keys</span>`
                        : `<span class="badge" style="background:rgba(255,180,0,0.15);color:#ffb400;border:1px solid rgba(255,180,0,0.3);font-size:11px;"><i class="fas fa-circle-exclamation"></i> Hết hàng</span>`));
                return `
                <tr>
                    <td>#${p.id}</td>
                    <td>
                        <div style="display:flex;align-items:center;gap:10px;">
                            <img src="${imgThumb}" alt="${p.name}" style="width:42px;height:28px;object-fit:cover;border-radius:6px;border:1px solid rgba(168,85,247,0.3);background:rgba(0,0,0,0.3);" onerror="this.src='${generateBannerImage(p.name, p.category)}'">
                            <div>
                                <strong style="color:#ffffff;display:block;">${p.name}</strong>
                                <span style="font-size:11px;color:#d8b4fe;">${(p.platforms || []).join(', ')}</span>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge-cat">${p.category.toUpperCase()}</span></td>
                    <td style="color:#00ff88;font-weight:bold;">${p.price.toLocaleString()}₫</td>
                    <td>${stockBadge}</td>
                    <td>${(p.platforms || []).join(', ')}</td>
                    <td>
                        <div style="display:flex;gap:6px;">
                            <button class="btn-admin-action edit-prod-btn" data-id="${p.id}" style="color:#c084fc;border-color:rgba(168,85,247,0.4);" title="Chỉnh sửa sản phẩm & đổi ảnh">
                                <i class="fas fa-edit"></i> Sửa
                            </button>
                            <button class="btn-admin-action view-keys-btn" data-id="${p.id}" style="color:#00ff88;border-color:rgba(0,255,136,0.3);" title="Xem kho Key">
                                <i class="fas fa-key"></i> Key
                            </button>
                            <button class="btn-admin-action delete-prod-btn" data-id="${p.id}" style="color:#ff4466;border-color:rgba(255,50,50,0.3);" title="Xóa sản phẩm">
                                <i class="fas fa-trash"></i> Xóa
                            </button>
                        </div>
                    </td>
                </tr>
            `}).join('');

            // Edit Product Button Listener
            tbody.querySelectorAll('.edit-prod-btn').forEach(btn => {
                btn.addEventListener('click', async function () {
                    const pid = this.dataset.id;
                    await openEditProductModal(pid);
                });
            });

            // View Keys Button Listener
            tbody.querySelectorAll('.view-keys-btn').forEach(btn => {
                btn.addEventListener('click', async function () {
                    const pid = this.dataset.id;
                    try {
                        const res = await api(`/api/admin/products/${pid}/keys`, 'GET', null, true);
                        if (res.success) {
                            if (!res.keys || res.keys.length === 0) {
                                alert(`📦 Sản phẩm "${res.product_name}":\nKho key rỗng. Hệ thống đang tạo key ngẫu nhiên khi khách mua.`);
                            } else {
                                alert(`🔑 KHO KEY SẢN PHẨM "${res.product_name}" (${res.stock_count} keys):\n\n` + res.keys.join('\n'));
                            }
                        }
                    } catch (err) {
                        Toast.show(`❌ ${err.message}`, 'error');
                    }
                });
            });

            // Delete Product Button Listener
            tbody.querySelectorAll('.delete-prod-btn').forEach(btn => {
                btn.addEventListener('click', async function () {
                    const pid = this.dataset.id;
                    if (confirm(`Bạn có chắc chắn muốn xóa sản phẩm #${pid}?`)) {
                        try {
                            await api(`/api/admin/products/${pid}`, 'DELETE', null, true);
                            Toast.show('✅ Đã xóa sản phẩm thành công', 'success');
                            loadAdminProducts(adminProductsCurrentPage);
                            fetchProducts();
                            fetchCategories();
                        } catch (err) {
                            Toast.show(`❌ ${err.message}`, 'error');
                        }
                    }
                });
            });

            // ── Pagination UI ──
            // ── Pagination cố định ──
            const paginationEl = document.getElementById('adminProductsPagination');
            if (paginationEl) {
                if (totalPages <= 1) {
                    paginationEl.innerHTML = `<span style="font-size:11px;color:#94a3b8;">${total} sản phẩm</span>`;
                } else {
                    let html = '';
                    html += `<button onclick="loadAdminProducts(${page-1})" ${page<=1?'disabled':''} style="padding:5px 11px;border-radius:8px;border:1px solid rgba(168,85,247,0.4);background:rgba(168,85,247,0.1);color:#d8b4fe;cursor:pointer;font-size:12px;${page<=1?'opacity:0.4;':''}"><i class="fas fa-chevron-left"></i></button>`;
                    for (let i = 1; i <= totalPages; i++) {
                        const active = i === page;
                        html += `<button onclick="loadAdminProducts(${i})" style="padding:5px 11px;border-radius:8px;border:1px solid rgba(168,85,247,${active?'0.9':'0.3'});background:${active?'rgba(168,85,247,0.35)':'rgba(168,85,247,0.08)'};color:${active?'#fff':'#d8b4fe'};cursor:pointer;font-size:13px;font-weight:${active?'800':'500'};">${i}</button>`;
                    }
                    html += `<button onclick="loadAdminProducts(${page+1})" ${page>=totalPages?'disabled':''} style="padding:5px 11px;border-radius:8px;border:1px solid rgba(168,85,247,0.4);background:rgba(168,85,247,0.1);color:#d8b4fe;cursor:pointer;font-size:12px;${page>=totalPages?'opacity:0.4;':''}"><i class="fas fa-chevron-right"></i></button>`;
                    html += `<span style="font-size:11px;color:#94a3b8;margin-left:4px;">Trang ${page}/${totalPages} · ${total} sp</span>`;
                    paginationEl.innerHTML = html;
                }
            }
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="color:var(--primary);">Lỗi: ${e.message}</td></tr>`;
    }
}

// Admin product search
document.getElementById('adminProductSearch')?.addEventListener('input', function() {
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => loadAdminProducts(1, this.value.trim()), 350);
});

async function loadAdminOrders() {
    const tbody = document.getElementById('adminOrdersTableBody');
    if (!tbody) return;
    try {
        const data = await api('/api/admin/orders', 'GET', null, true);
        if (data.success && data.orders) {
            tbody.innerHTML = data.orders.map(o => `
                <tr>
                    <td><span style="font-family:monospace;font-size:11px;">${o.order_code}</span></td>
                    <td><strong>${o.username}</strong></td>
                    <td>${o.product_name}</td>
                    <td>x${o.quantity}</td>
                    <td style="color:var(--primary);font-weight:bold;">${o.total_price.toLocaleString()}₫</td>
                    <td style="font-size:11px;color:var(--text-muted);">${o.created_at}</td>
                    <td>
                        <button class="btn-admin-action view-order-btn" data-id="${o.id}">
                            <i class="fas fa-eye"></i> Xem Key
                        </button>
                    </td>
                </tr>
            `).join('');

            tbody.querySelectorAll('.view-order-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    const oid = parseInt(this.dataset.id);
                    const order = data.orders.find(x => x.id === oid);
                    if (order) {
                        showAccountModal(order.accounts, order.product_name, order.quantity, order.total_price, true);
                    }
                });
            });
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="color:var(--primary);">Lỗi: ${e.message}</td></tr>`;
    }
}

// Admin Tabs Switcher
document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.admin-tab-pane').forEach(p => p.classList.remove('active'));
        this.classList.add('active');
        const target = document.getElementById(this.dataset.tab);
        if (target) target.classList.add('active');

        if (this.dataset.tab === 'tab-settings') loadAdminSettings();
        else if (this.dataset.tab === 'tab-overview') loadAdminStats();
        else if (this.dataset.tab === 'tab-users') loadAdminUsers();
        else if (this.dataset.tab === 'tab-products') loadAdminProducts(1);
        else if (this.dataset.tab === 'tab-coupons') loadAdminCoupons();
        else if (this.dataset.tab === 'tab-bank') loadAdminBankLogs();
        else if (this.dataset.tab === 'tab-orders') loadAdminOrders();
        else if (this.dataset.tab === 'tab-support') loadAdminSupportConversations(true);
        else if (this.dataset.tab === 'tab-random') loadRandomAdminSettings();
    });
});

document.getElementById('refreshAdminStatsBtn')?.addEventListener('click', () => {
    loadAdminStats();
    Toast.show('🔄 Đã cập nhật số liệu thống kê mới nhất', 'info');
});

document.getElementById('btnRefreshCouponsList')?.addEventListener('click', () => {
    loadAdminCoupons();
    Toast.show('🔄 Đã làm mới danh sách mã giảm giá', 'info');
});

document.getElementById('btnRefreshUsersList')?.addEventListener('click', () => {
    loadAdminUsers();
    Toast.show('🔄 Đã làm mới danh sách người dùng', 'info');
});

// 1. FORM TẠO MÃ GIẢM GIÁ (COUPON)
document.getElementById('adminAddCouponForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const code = document.getElementById('couponCode').value.trim().toUpperCase();
    const discountType = document.getElementById('couponDiscountType').value;
    const discountVal = parseInt(document.getElementById('couponDiscountValue').value) || 0;
    const minOrderVal = parseInt(document.getElementById('couponMinOrderValue').value) || 0;
    const maxDiscountAmt = parseInt(document.getElementById('couponMaxDiscountAmount').value) || 0;
    const usageLimit = parseInt(document.getElementById('couponUsageLimit').value) || 0;
    const expiresDays = Math.max(0, parseInt(document.getElementById('couponExpiresDays').value) || 0);
    const isActive = parseInt(document.getElementById('couponIsActive').value) || 1;

    if (!code) {
        Toast.show('❌ Mã giảm giá không được để trống', 'error');
        return;
    }
    if (discountVal <= 0) {
        Toast.show('❌ Mức giảm giá phải lớn hơn 0', 'error');
        return;
    }

    try {
        const res = await api('/api/admin/coupons', 'POST', {
            code: code,
            discount_type: discountType,
            discount_value: discountVal,
            min_order_value: minOrderVal,
            max_discount_amount: maxDiscountAmt,
            usage_limit: usageLimit,
            expires_days: expiresDays,
            is_active: isActive
        }, true);

        Toast.show(`🎉 ${res.message}`, 'success');
        this.reset();
        loadAdminCoupons();
    } catch (err) {
        Toast.show(`❌ ${err.message}`, 'error');
    }
});

// 2. MODAL & FORM THÊM SELLER MỚI (OWNER ONLY)
const createSellerModal = document.getElementById('createSellerModal');
document.getElementById('btnOpenCreateSellerModal')?.addEventListener('click', () => {
    if (currentUser && currentUser.role !== 'admin') {
        Toast.show('❌ Chỉ Owner / Admin mới có quyền thêm Seller!', 'error');
        return;
    }
    if (createSellerModal) openModal(createSellerModal);
});
document.getElementById('createSellerModalClose')?.addEventListener('click', () => closeModal(createSellerModal));
document.getElementById('btnCancelCreateSeller')?.addEventListener('click', () => closeModal(createSellerModal));

document.getElementById('createSellerForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const u = document.getElementById('newSellerUsername').value.trim();
    const em = document.getElementById('newSellerEmail').value.trim();
    const p = document.getElementById('newSellerPassword').value;

    try {
        const res = await api('/api/admin/users/create-seller', 'POST', {
            username: u,
            email: em,
            password: p
        }, true);

        Toast.show(`🎉 ${res.message}`, 'success');
        this.reset();
        closeModal(createSellerModal);
        loadAdminUsers();
        loadAdminStats();
    } catch (err) {
        Toast.show(`❌ ${err.message}`, 'error');
    }
});

// 3. MODAL & FORM PHÂN QUYỀN THÀNH VIÊN (ROLE SWITCHER)
const changeRoleModal = document.getElementById('changeRoleModal');
document.getElementById('changeRoleModalClose')?.addEventListener('click', () => closeModal(changeRoleModal));
document.getElementById('btnCancelChangeRole')?.addEventListener('click', () => closeModal(changeRoleModal));

document.getElementById('changeRoleForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const uid = document.getElementById('changeRoleUserId').value;
    const role = document.getElementById('selectUserRole').value;

    try {
        const res = await api(`/api/admin/users/${uid}/role`, 'POST', { role: role }, true);
        Toast.show(`👑 ${res.message}`, 'success');
        closeModal(changeRoleModal);
        loadAdminUsers();
    } catch (err) {
        Toast.show(`❌ ${err.message}`, 'error');
    }
});

// 3.5. ADMIN ĐẶT LẠI MẬT KHẨU USER
const adminResetPasswordModal = document.getElementById('adminResetPasswordModal');
document.getElementById('adminResetPasswordModalClose')?.addEventListener('click', () => closeModal(adminResetPasswordModal));
document.getElementById('btnCancelAdminResetPassword')?.addEventListener('click', () => closeModal(adminResetPasswordModal));

document.getElementById('adminUsersTableBody')?.addEventListener('click', function (e) {
    const btn = e.target.closest('.reset-user-password-btn');
    if (!btn) return;
    document.getElementById('adminResetPasswordUserId').value = btn.dataset.id || '';
    document.getElementById('adminResetPasswordUsername').textContent = btn.dataset.user || '';
    document.getElementById('adminResetPasswordForm')?.reset();
    document.getElementById('adminResetPasswordUserId').value = btn.dataset.id || '';
    document.getElementById('adminResetPasswordUsername').textContent = btn.dataset.user || '';
    openModal(adminResetPasswordModal);
});

document.getElementById('adminResetPasswordForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const uid = document.getElementById('adminResetPasswordUserId').value;
    const p1 = document.getElementById('adminResetPasswordInput').value;
    const p2 = document.getElementById('adminResetPasswordConfirm').value;
    if (p1 !== p2) { Toast.show('❌ Mật khẩu xác nhận không khớp!', 'error'); return; }
    if (p1.length < 4) { Toast.show('❌ Mật khẩu mới phải có ít nhất 4 ký tự!', 'error'); return; }
    try {
        const res = await api(`/api/admin/users/${uid}/reset-password`, 'POST', { new_password: p1 }, true);
        Toast.show(`✅ ${res.message}`, 'success');
        closeModal(adminResetPasswordModal);
        this.reset();
    } catch (err) { Toast.show(`❌ ${err.message}`, 'error'); }
});

// 4. MODAL & FORM ĐIỀU CHỈNH SỐ DƯ (NẠP / TRỪ TIỀN)
const adjustBalanceModal = document.getElementById('adjustBalanceModal');
document.getElementById('adjustBalanceModalClose')?.addEventListener('click', () => closeModal(adjustBalanceModal));
document.getElementById('btnCancelAdjustBalance')?.addEventListener('click', () => closeModal(adjustBalanceModal));

document.getElementById('adjustBalanceForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const uid = document.getElementById('adjUserId').value;
    const amt = parseInt(document.getElementById('adjAmount').value) || 0;
    const reason = document.getElementById('adjReason').value.trim() || 'Admin điều chỉnh số dư';

    if (amt === 0) {
        Toast.show('❌ Số tiền thay đổi phải khác 0', 'error');
        return;
    }

    try {
        const res = await api(`/api/admin/users/${uid}/adjust-balance`, 'POST', {
            amount: amt,
            reason: reason
        }, true);
        Toast.show(`✅ ${res.message}`, 'success');
        closeModal(adjustBalanceModal);
        loadAdminUsers();
        loadAdminStats();
        checkAuth();
    } catch (err) {
        Toast.show(`❌ ${err.message}`, 'error');
    }
});

// === PRODUCT IMAGE UPLOAD & ADD/EDIT SYSTEM ===

// 1. Image Upload for New Product
const newProdImageFile = document.getElementById('newProdImageFile');
const newProdImage = document.getElementById('newProdImage');
const newProdImgPreview = document.getElementById('newProdImgPreview');
const newProdImgPreviewWrap = document.getElementById('newProdImgPreviewWrap');

newProdImageFile?.addEventListener('change', async function () {
    if (!this.files || !this.files[0]) return;
    const file = this.files[0];
    const formData = new FormData();
    formData.append('file', file);

    Toast.show(`⏳ Đang tải ảnh "${file.name}" lên máy chủ...`, 'info', 2000);
    try {
        const token = authToken || (typeof ZeusEncryptedStorage !== 'undefined' ? ZeusEncryptedStorage.getItem('Xiters_auth_token') : null) || '';
        const res = await fetch('/api/admin/products/upload-image', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const raw = await res.text();
        let data = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch (_) { data = { detail: raw || `HTTP ${res.status}` }; }
        if (data.success && data.image_url) {
            newProdImage.value = data.image_url;
            if (newProdImgPreview) newProdImgPreview.src = data.image_url;
            if (newProdImgPreviewWrap) newProdImgPreviewWrap.style.display = 'flex';
            Toast.show('✅ Đã tải ảnh lên thành công!', 'success');
        } else {
            Toast.show(`❌ ${data.detail || 'Lỗi tải ảnh'}`, 'error');
        }
    } catch (err) {
        Toast.show(`❌ Lỗi tải ảnh: ${err.message}`, 'error');
    }
    this.value = '';
});

newProdImage?.addEventListener('input', function () {
    const url = this.value.trim();
    if (url && newProdImgPreview) {
        newProdImgPreview.src = url;
        if (newProdImgPreviewWrap) newProdImgPreviewWrap.style.display = 'flex';
    } else if (newProdImgPreviewWrap) {
        newProdImgPreviewWrap.style.display = 'none';
    }
});

// === PRODUCT FILE UPLOAD (for download_url field) ===
async function uploadProdFile(file, urlInputId, statusId) {
    const statusEl = document.getElementById(statusId);
    if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = `⏳ Đang upload "${file.name}"...`; }
    const formData = new FormData();
    formData.append('file', file);
    const token = authToken || (typeof ZeusEncryptedStorage !== 'undefined' ? ZeusEncryptedStorage.getItem('Xiters_auth_token') : null) || '';
    try {
        const res = await fetch('/api/admin/products/upload-file', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const raw = await res.text();
        let data = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch (_) { data = { detail: raw || `HTTP ${res.status}` }; }
        if (data.success && data.download_url) {
            const urlInput = document.getElementById(urlInputId);
            if (urlInput) urlInput.value = data.download_url;
            if (statusEl) statusEl.textContent = `✅ Đã upload: ${file.name}`;
            Toast.show(`✅ Upload file thành công!`, 'success');
        } else {
            if (statusEl) statusEl.textContent = `❌ ${data.detail || data.message || 'Upload thất bại'}`;
            Toast.show(`❌ ${data.detail || data.message || 'Upload file thất bại'}`, 'error');
        }
    } catch (err) {
        if (statusEl) statusEl.textContent = `❌ Lỗi: ${err.message}`;
        Toast.show(`❌ Lỗi upload file: ${err.message}`, 'error');
    }
}

document.getElementById('newProdFileUpload')?.addEventListener('change', async function () {
    if (!this.files || !this.files[0]) return;
    await uploadProdFile(this.files[0], 'newProdDownloadUrl', 'newProdFileUploadStatus');
    this.value = '';
});

document.getElementById('editProdFileUpload')?.addEventListener('change', async function () {
    if (!this.files || !this.files[0]) return;
    await uploadProdFile(this.files[0], 'editProdDownloadUrl', 'editProdFileUploadStatus');
    this.value = '';
});

// Product type UI: Key/ACC dùng kho; File chỉ cần link tải và không trừ kho.
function syncProductTypeUI(prefix) {
    const type = document.getElementById(`${prefix}ProdType`)?.value || 'key';
    const downloadWrap = document.getElementById(`${prefix}ProdDownloadWrap`);
    const keysWrap = document.getElementById(`${prefix}ProdKeysWrap`);
    if (downloadWrap) downloadWrap.style.display = type === 'file' ? 'block' : 'none';
    if (keysWrap) keysWrap.style.display = type === 'file' ? 'none' : 'block';
}
document.getElementById('newProdType')?.addEventListener('change', () => syncProductTypeUI('new'));
document.getElementById('editProdType')?.addEventListener('change', () => syncProductTypeUI('edit'));

// TẢI XUỐNG MIỄN PHÍ là khu riêng: miễn phí + link tải trực tiếp.
// FILE trong mục Sản phẩm vẫn là loại file bán, bắt buộc có giá.
function syncProductCategoryUI(prefix) {
    const categoryEl = document.getElementById(`${prefix}ProdCategory`);
    const priceEl = document.getElementById(`${prefix}ProdPrice`);
    const typeEl = document.getElementById(`${prefix}ProdType`);
    const downloadWrap = document.getElementById(`${prefix}ProdDownloadWrap`);
    const keysWrap = document.getElementById(`${prefix}ProdKeysWrap`);
    const isFree = categoryEl?.value === 'download';
    if (isFree) {
        if (priceEl) { priceEl.value = 0; priceEl.readOnly = true; priceEl.title = 'Mục TẢI XUỐNG MIỄN PHÍ luôn có giá 0₫'; }
        if (typeEl) { typeEl.value = 'file'; typeEl.disabled = true; }
        if (downloadWrap) downloadWrap.style.display = 'block';
        if (keysWrap) keysWrap.style.display = 'none';
    } else {
        if (priceEl) { priceEl.readOnly = false; priceEl.title = ''; }
        if (typeEl) typeEl.disabled = false;
        syncProductTypeUI(prefix);
    }
}
document.getElementById('newProdCategory')?.addEventListener('change', () => syncProductCategoryUI('new'));
document.getElementById('editProdCategory')?.addEventListener('change', () => syncProductCategoryUI('edit'));
syncProductTypeUI('new');
syncProductTypeUI('edit');
syncProductCategoryUI('new');
syncProductCategoryUI('edit');

// ── VARIANT BUILDER (admin) ──
function addVariantRow(container, label = '', price = '') {
    const row = document.createElement('div');
    row.className = 'variant-builder-row';
    row.innerHTML = `
        <input class="vr-label" type="text" placeholder="Tên gói (VD: 1 Giờ, 1 Ngày...)" value="${escapeHtml(label)}" maxlength="40">
        <input class="vr-price" type="number" placeholder="Giá (₫)" value="${price}" min="0">
        <button type="button" class="btn-remove-variant" title="Xóa gói"><i class="fas fa-trash"></i></button>`;
    row.querySelector('.btn-remove-variant').addEventListener('click', () => row.remove());
    container.appendChild(row);
}
function getVariantRowsData(container) {
    const rows = container.querySelectorAll('.variant-builder-row');
    const variants = [];
    rows.forEach(row => {
        const label = row.querySelector('.vr-label').value.trim();
        const price = parseInt(row.querySelector('.vr-price').value) || 0;
        if (label) variants.push({ label, price });
    });
    return variants;
}

// Toggle variant builder visibility
document.getElementById('newProdIsGrouped')?.addEventListener('change', function() {
    const wrap = document.getElementById('newProdVariantsWrap');
    if (!wrap) return;
    wrap.style.display = this.checked ? 'block' : 'none';
    if (this.checked && document.getElementById('newVariantRows').children.length === 0) {
        // Add default preset rows
        const c = document.getElementById('newVariantRows');
        [['1 Giờ', ''], ['1 Ngày', ''], ['1 Tuần', ''], ['1 Tháng', '']].forEach(([l, p]) => addVariantRow(c, l, p));
    }
});
document.getElementById('btnAddVariantRow')?.addEventListener('click', () => {
    addVariantRow(document.getElementById('newVariantRows'));
});

// 2. Open / Cancel Add Product
document.getElementById('btnOpenAddProduct')?.addEventListener('click', () => {
    const box = document.getElementById('addProductFormContainer');
    if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('btnCancelAddProduct')?.addEventListener('click', () => {
    const box = document.getElementById('addProductFormContainer');
    if (box) box.style.display = 'none';
});

// 3. Add Product Form Submit
document.getElementById('addProductForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const name = sanitizeInput(document.getElementById('newProdName').value, 'text');
    const price = parseInt(document.getElementById('newProdPrice').value);
    const category = sanitizeInput(document.getElementById('newProdCategory').value, 'text');
    const platformsStr = document.getElementById('newProdPlatforms').value;
    const platforms = platformsStr.split(',').map(s => sanitizeInput(s.trim(), 'text')).filter(Boolean);
    let product_type = document.getElementById('newProdType')?.value || 'key';
    const image = document.getElementById('newProdImage')?.value.trim() || '';
    const download_url = document.getElementById('newProdDownloadUrl')?.value.trim() || '';
    const description = sanitizeInput(document.getElementById('newProdDesc').value, 'text');
    const keys_input = document.getElementById('newProdKeysInput')?.value || '';

    // Validation
    if (!name || name.length < 2 || name.length > 200) {
        Toast.show('❌ Tên sản phẩm phải từ 2-200 ký tự', 'error');
        return;
    }
    
    if (category !== 'download' && !DataValidator.isValidAmount(price)) {
        Toast.show('❌ Giá phải từ 1₫ - 50,000,000₫', 'error');
        return;
    }
    if (category !== 'download' && product_type === 'file' && price <= 0) {
        Toast.show('❌ File tải xuống trong Sản phẩm phải có giá bán lớn hơn 0', 'error');
        return;
    }
    
    if (!category) {
        Toast.show('❌ Vui lòng chọn danh mục', 'error');
        return;
    }
    
    if (platforms.length === 0) {
        Toast.show('❌ Vui lòng nhập ít nhất một nền tảng', 'error');
        return;
    }

    // Validate image URL if provided
    if (image && !DataValidator.isValidURL(image)) {
        Toast.show('❌ URL ảnh không hợp lệ', 'error');
        return;
    }
    if (category === 'download' && !download_url) {
        Toast.show('❌ File miễn phí phải có link tải', 'error');
        return;
    }
    if (product_type === 'file' && category !== 'download' && !download_url) {
        Toast.show('❌ Sản phẩm file phải có link tải', 'error');
        return;
    }
    if (download_url && !DataValidator.isValidURL(download_url)) {
        Toast.show('❌ Link tải không hợp lệ', 'error');
        return;
    }

    // Encode variants vào description nếu được bật
    const isGrouped = document.getElementById('newProdIsGrouped')?.checked;
    let finalDescription = description;
    if (isGrouped) {
        const variants = getVariantRowsData(document.getElementById('newVariantRows'));
        if (variants.length < 2) {
            Toast.show('❌ Sản phẩm có gói cần ít nhất 2 gói', 'error');
            return;
        }
        finalDescription = buildVariantsDescription(variants, description);
    }

    try {
        const res = await api('/api/admin/products', 'POST', {
            name, price, category, platforms, image, description: finalDescription, product_type, download_url, keys_input: product_type === 'key' ? keys_input : ''
        }, true);
        Toast.show(`✅ ${res.message}`, 'success');
        this.reset();
        if (newProdImgPreviewWrap) newProdImgPreviewWrap.style.display = 'none';
        document.getElementById('addProductFormContainer').style.display = 'none';
        // Reset grouped UI
        const groupedChk = document.getElementById('newProdIsGrouped');
        if (groupedChk) { groupedChk.checked = false; }
        const vWrap = document.getElementById('newProdVariantsWrap');
        if (vWrap) vWrap.style.display = 'none';
        const vRows = document.getElementById('newVariantRows');
        if (vRows) vRows.innerHTML = '';
        loadAdminProducts(adminProductsCurrentPage);
        fetchProducts();
        fetchCategories();
    } catch (err) {
        Toast.show(`❌ ${err.message}`, 'error');
    }
});

// 4. Edit Product Modal & Image Upload System
const editProductModal = document.getElementById('editProductModal');
const editProdImageFile = document.getElementById('editProdImageFile');
const editProdImage = document.getElementById('editProdImage');
const editProdImgPreview = document.getElementById('editProdImgPreview');

editProdImageFile?.addEventListener('change', async function () {
    if (!this.files || !this.files[0]) return;
    const file = this.files[0];
    const formData = new FormData();
    formData.append('file', file);

    Toast.show(`⏳ Đang tải ảnh mới "${file.name}" lên...`, 'info', 2000);
    try {
        const token = authToken || (typeof ZeusEncryptedStorage !== 'undefined' ? ZeusEncryptedStorage.getItem('Xiters_auth_token') : null) || '';
        const res = await fetch('/api/admin/products/upload-image', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const raw = await res.text();
        let data = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch (_) { data = { detail: raw || `HTTP ${res.status}` }; }
        if (data.success && data.image_url) {
            editProdImage.value = data.image_url;
            if (editProdImgPreview) editProdImgPreview.src = data.image_url;
            Toast.show('✅ Đã đổi ảnh mới thành công!', 'success');
        } else {
            Toast.show(`❌ ${data.detail || 'Lỗi tải ảnh'}`, 'error');
        }
    } catch (err) {
        Toast.show(`❌ Lỗi tải ảnh: ${err.message}`, 'error');
    }
    this.value = '';
});

editProdImage?.addEventListener('input', function () {
    const url = this.value.trim();
    if (url && editProdImgPreview) {
        editProdImgPreview.src = url;
    }
});

async function openEditProductModal(productId) {
    try {
        const res = await api(`/api/products/${productId}`);
        const keysRes = await api(`/api/admin/products/${productId}/keys`, 'GET', null, true);
        if (res.success && res.product) {
            const p = res.product;
            document.getElementById('editProdId').value = p.id;
            document.getElementById('editProdName').value = p.name || '';
            document.getElementById('editProdPrice').value = p.price || 0;
            document.getElementById('editProdCategory').value = p.category || 'ff';
            document.getElementById('editProdPlatforms').value = (p.platforms || []).join(', ');
            if (document.getElementById('editProdType')) document.getElementById('editProdType').value = p.product_type || 'key';
            if (document.getElementById('editProdDownloadUrl')) document.getElementById('editProdDownloadUrl').value = p.download_url || '';
            syncProductCategoryUI('edit');
            syncProductTypeUI('edit');
            // Populate description (real part only) + variant builder
            const existingVariants = parseVariants(p.description);
            const realDesc = getRealDescription(p.description);
            document.getElementById('editProdDesc').value = realDesc || '';
            const editGroupedChk = document.getElementById('editProdIsGrouped');
            const editVWrap = document.getElementById('editProdVariantsWrap');
            const editVRows = document.getElementById('editVariantRows');
            if (editGroupedChk && editVWrap && editVRows) {
                editVRows.innerHTML = '';
                if (existingVariants && existingVariants.length > 0) {
                    editGroupedChk.checked = true;
                    editVWrap.style.display = 'block';
                    existingVariants.forEach(v => addVariantRow(editVRows, v.label, v.price));
                } else {
                    editGroupedChk.checked = false;
                    editVWrap.style.display = 'none';
                }
            }

            const currentImg = p.image || '';
            editProdImage.value = currentImg;
            if (editProdImgPreview) {
                editProdImgPreview.src = currentImg ? currentImg : generateBannerImage(p.name, p.category);
            }

            const existingKeys = (keysRes.success && keysRes.keys) ? keysRes.keys.join('\n') : '';
            document.getElementById('editProdKeysInput').value = existingKeys;

            openModal(editProductModal);
        }
    } catch (err) {
        Toast.show(`❌ Lỗi tải dữ liệu sản phẩm: ${err.message}`, 'error');
    }
}

document.getElementById('editProductModalClose')?.addEventListener('click', () => closeModal(editProductModal));
document.getElementById('btnCancelEditProduct')?.addEventListener('click', () => closeModal(editProductModal));

// Edit variant builder events
document.getElementById('editProdIsGrouped')?.addEventListener('change', function() {
    const wrap = document.getElementById('editProdVariantsWrap');
    if (!wrap) return;
    wrap.style.display = this.checked ? 'block' : 'none';
    if (this.checked && document.getElementById('editVariantRows').children.length === 0) {
        const c = document.getElementById('editVariantRows');
        [['1 Giờ', ''], ['1 Ngày', ''], ['1 Tuần', ''], ['1 Tháng', '']].forEach(([l, p]) => addVariantRow(c, l, p));
    }
});
document.getElementById('btnEditAddVariantRow')?.addEventListener('click', () => {
    addVariantRow(document.getElementById('editVariantRows'));
});

document.getElementById('editProductForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const pid = document.getElementById('editProdId').value;
    const name = sanitizeInput(document.getElementById('editProdName').value, 'text');
    const price = parseInt(document.getElementById('editProdPrice').value);
    const category = sanitizeInput(document.getElementById('editProdCategory').value, 'text');
    const platformsStr = document.getElementById('editProdPlatforms').value;
    const platforms = platformsStr.split(',').map(s => sanitizeInput(s.trim(), 'text')).filter(Boolean);
    let product_type = document.getElementById('editProdType')?.value || 'key';
    const image = document.getElementById('editProdImage').value.trim();
    const download_url = document.getElementById('editProdDownloadUrl')?.value.trim() || '';
    const description = sanitizeInput(document.getElementById('editProdDesc').value, 'text');
    const keys_input = document.getElementById('editProdKeysInput').value;

    // Validation
    if (!pid || isNaN(parseInt(pid)) || parseInt(pid) <= 0) {
        Toast.show('❌ ID sản phẩm không hợp lệ', 'error');
        return;
    }
    
    if (!name || name.length < 2 || name.length > 200) {
        Toast.show('❌ Tên sản phẩm phải từ 2-200 ký tự', 'error');
        return;
    }
    
    if (category !== 'download' && !DataValidator.isValidAmount(price)) {
        Toast.show('❌ Giá phải từ 1₫ - 50,000,000₫', 'error');
        return;
    }
    if (category !== 'download' && product_type === 'file' && price <= 0) {
        Toast.show('❌ File tải xuống trong Sản phẩm phải có giá bán lớn hơn 0', 'error');
        return;
    }
    
    if (!category) {
        Toast.show('❌ Vui lòng chọn danh mục', 'error');
        return;
    }
    
    if (platforms.length === 0) {
        Toast.show('❌ Vui lòng nhập ít nhất một nền tảng', 'error');
        return;
    }

    // Validate image URL if provided
    if (image && !DataValidator.isValidURL(image)) {
        Toast.show('❌ URL ảnh không hợp lệ', 'error');
        return;
    }
    if (category === 'download' && !download_url) { Toast.show('❌ File miễn phí phải có link tải', 'error'); return; }
    if (product_type === 'file' && category !== 'download' && !download_url) { Toast.show('❌ Sản phẩm file phải có link tải', 'error'); return; }
    if (download_url && !DataValidator.isValidURL(download_url)) { Toast.show('❌ Link tải không hợp lệ', 'error'); return; }

    // Encode variants vào description nếu được bật
    const editIsGrouped = document.getElementById('editProdIsGrouped')?.checked;
    let finalEditDesc = description;
    if (editIsGrouped) {
        const variants = getVariantRowsData(document.getElementById('editVariantRows'));
        if (variants.length < 2) {
            Toast.show('❌ Sản phẩm có gói cần ít nhất 2 gói', 'error');
            return;
        }
        finalEditDesc = buildVariantsDescription(variants, description);
    }

    try {
        if (category === 'download') { product_type = 'free_file'; }
        const res = await api(`/api/admin/products/${pid}`, 'PUT', {
            name, price: category === 'download' ? 0 : price, category, platforms, image, description: finalEditDesc, product_type, download_url, keys_input: product_type === 'key' ? keys_input : ''
        }, true);
        Toast.show(`✅ ${res.message}`, 'success');
        closeModal(editProductModal);
        loadAdminProducts(adminProductsCurrentPage);
        fetchProducts();
        fetchCategories();
    } catch (err) {
        Toast.show(`❌ ${err.message}`, 'error');
    }
});

async function loadAdminBankLogs() {
    const tbody = document.getElementById('adminBankLogsTableBody');
    if (!tbody) return;
    try {
        const data = await api('/api/admin/bank/logs', 'GET', null, true);
        if (data.success && data.logs) {
            if (data.logs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">Chưa có giao dịch nạp bank tự động nào.</td></tr>`;
                return;
            }
            tbody.innerHTML = data.logs.map(log => `
                <tr>
                    <td><span style="font-family:monospace;font-size:11px;">#${log.id}</span></td>
                    <td><strong>${log.username}</strong></td>
                    <td style="color:#00ff88;font-weight:bold;">+${(log.amount || 0).toLocaleString()}₫</td>
                    <td style="font-size:12px;color:var(--text-secondary);max-width:280px;white-space:normal;">${log.description}</td>
                    <td><span class="badge active"><span class="dot"></span> THÀNH CÔNG</span></td>
                    <td style="font-size:11px;color:var(--text-muted);">${log.created_at}</td>
                </tr>
            `).join('');
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="color:var(--primary);">Lỗi tải logs: ${e.message}</td></tr>`;
    }
}

// Auto Bank Simulator Submit Handler
document.getElementById('simulateBankForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = document.getElementById('simUsername').value.trim();
    const amount = parseInt(document.getElementById('simAmount').value);
    const gateway = document.getElementById('simGateway').value;

    if (!username || isNaN(amount) || amount < 10000) {
        Toast.show('❌ Vui lòng nhập username và số tiền hợp lệ (>= 10,000₫)', 'error');
        return;
    }

    try {
        const res = await api('/api/admin/bank/simulate-transfer', 'POST', {
            username, amount, gateway
        }, true);

        Toast.show(`✅ [Auto Bank Webhook Thành Công] Đã cộng +${amount.toLocaleString()}₫ cho tài khoản "${username}"!`, 'success', 3500);
        loadAdminBankLogs();
        loadAdminUsers();
        loadAdminStats();
        if (currentUser && currentUser.username.toLowerCase() === username.toLowerCase()) {
            checkAuth(); // Live update balance for self
        }
    } catch (err) {
        Toast.show(`❌ [Lỗi Webhook] ${err.message}`, 'error', 3500);
    }
});

// Copy Webhook URL Button
document.getElementById('btnCopyWebhookUrl')?.addEventListener('click', () => {
    const input = document.getElementById('adminWebhookUrlInput');
    if (input) {
        navigator.clipboard.writeText(input.value).then(() => {
            Toast.show('📋 Đã sao chép Webhook URL vào bộ nhớ đệm!', 'success');
        });
    }
});

// Refresh Bank Logs Button
document.getElementById('btnRefreshBankLogs')?.addEventListener('click', () => {
    loadAdminBankLogs();
    Toast.show('🔄 Đã làm mới nhật ký giao dịch Auto Bank', 'info');
});

// Load Admin Card Logs
async function loadAdminCardLogs() {
    const tbody = document.getElementById('adminCardLogsTableBody');
    if (!tbody) return;
    try {
        const res = await api('/api/admin/card/logs', 'GET', null, true);
        if (res.success && res.logs && res.logs.length > 0) {
            tbody.innerHTML = res.logs.map(c => {
                let badge = '<span class="card-status-badge card-status-99">● Chờ duyệt</span>';
                if (c.status === 1) badge = '<span class="card-status-badge card-status-1">● Thành công (Đúng MG)</span>';
                else if (c.status === 2) badge = '<span class="card-status-badge card-status-2">● Đúng (Sai MG)</span>';
                else if (c.status === 3 || c.status === 100) badge = `<span class="card-status-badge card-status-3">● Lỗi: ${c.message || 'Thẻ sai'}</span>`;

                return `
                    <tr>
                        <td><code>${c.request_id}</code></td>
                        <td><strong>${c.username}</strong></td>
                        <td><span style="color:#c084fc;font-weight:700;">${c.telco}</span></td>
                        <td><small style="color:var(--text-muted);">Seri: ${c.serial}<br>PIN: ${c.code}</small></td>
                        <td>${(c.declared_value || 0).toLocaleString()}₫</td>
                        <td style="color:#00ff88;font-weight:800;">+${(c.amount_received || 0).toLocaleString()}₫</td>
                        <td>${badge}</td>
                        <td><small>${c.created_at ? (c.created_at.split(' ')[1] || c.created_at) : ''}</small></td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);">Chưa có nhật ký nạp thẻ cào</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#ff5555;">Lỗi tải log thẻ: ${e.message}</td></tr>`;
    }
}

// Copy Card Callback Button
document.getElementById('btnCopyCardCallback')?.addEventListener('click', () => {
    const input = document.getElementById('adminCardCallbackUrl');
    if (input) {
        navigator.clipboard.writeText(input.value).then(() => {
            Toast.show('📋 Đã sao chép Card Callback URL vào bộ nhớ đệm!', 'success');
        });
    }
});

// Refresh Card Logs Button
document.getElementById('btnRefreshCardLogs')?.addEventListener('click', () => {
    loadAdminCardLogs();
    Toast.show('🔄 Đã làm mới nhật ký thẻ cào', 'info');
});

// Card Simulator Form Submit
document.getElementById('simulateCardForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = document.getElementById('simCardUsername')?.value.trim();
    const telco = document.getElementById('simCardTelco')?.value;
    const declaredValue = parseInt(document.getElementById('simCardDeclaredValue')?.value) || 50000;
    const code = document.getElementById('simCardCode')?.value.trim();
    const status = parseInt(document.getElementById('simCardStatus')?.value) || 1;

    try {
        const res = await api('/api/admin/card/simulate-callback', 'POST', {
            username: username,
            telco: telco,
            declared_value: declaredValue,
            real_value: declaredValue,
            code: code,
            serial: `SERI${Date.now()}`,
            status: status
        }, true);

        Toast.show(`✅ [Test Thẻ Cào] ${res.message}`, 'success', 3500);
        loadAdminCardLogs();
        loadAdminUsers();
        loadAdminStats();
        if (currentUser && currentUser.username.toLowerCase() === username.toLowerCase()) {
            checkAuth();
        }
    } catch (err) {
        Toast.show(`❌ [Lỗi Giả Lập Thẻ] ${err.message}`, 'error', 3500);
    }
});

// Admin System Settings Controller
async function loadAdminSettings() {
    try {
        const res = await api('/api/admin/settings', 'GET', null, true);
        if (res.success && res.settings) {
            const s = res.settings;
            if (document.getElementById('cfgShopName')) document.getElementById('cfgShopName').value = s.shop_name || '';
            if (document.getElementById('cfgShopSlogan')) document.getElementById('cfgShopSlogan').value = s.shop_slogan || '';
            if (document.getElementById('cfgBankName')) document.getElementById('cfgBankName').value = s.bank_name || '';
            if (document.getElementById('cfgBankCode')) document.getElementById('cfgBankCode').value = s.bank_code || 'MB';
            if (document.getElementById('cfgBankAccount')) document.getElementById('cfgBankAccount').value = s.bank_account || '';
            if (document.getElementById('cfgBankOwner')) document.getElementById('cfgBankOwner').value = s.bank_owner || '';
            if (document.getElementById('cfgSepayApiKey')) document.getElementById('cfgSepayApiKey').value = s.sepay_api_key || '';
            if (document.getElementById('cfgSepayWebhookToken')) document.getElementById('cfgSepayWebhookToken').value = s.sepay_webhook_token || '';
            if (document.getElementById('cfgSepayHmacSecret')) document.getElementById('cfgSepayHmacSecret').value = s.sepay_hmac_secret || '';
            if (document.getElementById('cfgSyntaxPrefix')) document.getElementById('cfgSyntaxPrefix').value = s.syntax_prefix || 'NAPTIEN';
            if (document.getElementById('cfgHotline')) document.getElementById('cfgHotline').value = s.hotline || '';
            if (document.getElementById('cfgZaloLink')) document.getElementById('cfgZaloLink').value = s.zalo_link || '';
            if (document.getElementById('cfgTelegramLink')) document.getElementById('cfgTelegramLink').value = s.telegram_link || '';
            if (document.getElementById('cfgFacebookLink')) document.getElementById('cfgFacebookLink').value = s.facebook_link || '';
            if (document.getElementById('cfgNotificationBanner')) document.getElementById('cfgNotificationBanner').value = s.notification_banner || '';
            if (document.getElementById('cfgGachTheFastPartnerId')) document.getElementById('cfgGachTheFastPartnerId').value = s.gachthefast_partner_id || '';
            if (document.getElementById('cfgGachTheFastPartnerKey')) document.getElementById('cfgGachTheFastPartnerKey').value = s.gachthefast_partner_key || '';
            if (document.getElementById('cfgGachTheFastApiUrl')) document.getElementById('cfgGachTheFastApiUrl').value = s.gachthefast_api_url || '';
            if (document.getElementById('cfgCardFeePercent')) document.getElementById('cfgCardFeePercent').value = s.card_fee_percent || '15';
            if (document.getElementById('cfgCardAutoStatus')) document.getElementById('cfgCardAutoStatus').value = s.card_auto_status || 'enabled';
            if (document.getElementById('cfgAntiDdosStatus')) document.getElementById('cfgAntiDdosStatus').value = s.anti_ddos_status || 'enabled';
            if (document.getElementById('cfgAntiDebugStatus')) document.getElementById('cfgAntiDebugStatus').value = s.anti_debug_status || 'enabled';
        }
    } catch (e) {
        console.error('Lỗi load admin settings:', e);
    }
}

document.getElementById('adminSettingsForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const payload = {
        shop_name: document.getElementById('cfgShopName').value.trim(),
        shop_slogan: document.getElementById('cfgShopSlogan').value.trim(),
        bank_name: document.getElementById('cfgBankName').value.trim(),
        bank_code: document.getElementById('cfgBankCode').value.trim().toUpperCase(),
        bank_account: document.getElementById('cfgBankAccount').value.trim(),
        bank_owner: document.getElementById('cfgBankOwner').value.trim().toUpperCase(),
        sepay_api_key: document.getElementById('cfgSepayApiKey')?.value.trim() || '',
        sepay_webhook_token: document.getElementById('cfgSepayWebhookToken')?.value.trim() || '',
        sepay_hmac_secret: document.getElementById('cfgSepayHmacSecret')?.value.trim() || '',
        syntax_prefix: document.getElementById('cfgSyntaxPrefix').value.trim().toUpperCase(),
        hotline: document.getElementById('cfgHotline').value.trim(),
        zalo_link: document.getElementById('cfgZaloLink').value.trim(),
        telegram_link: document.getElementById('cfgTelegramLink').value.trim(),
        facebook_link: document.getElementById('cfgFacebookLink').value.trim(),
        notification_banner: document.getElementById('cfgNotificationBanner').value.trim(),
        gachthefast_partner_id: document.getElementById('cfgGachTheFastPartnerId')?.value.trim() || '',
        gachthefast_partner_key: document.getElementById('cfgGachTheFastPartnerKey')?.value.trim() || '',
        gachthefast_api_url: document.getElementById('cfgGachTheFastApiUrl')?.value.trim() || '',
        card_fee_percent: document.getElementById('cfgCardFeePercent')?.value || '15',
        card_auto_status: document.getElementById('cfgCardAutoStatus')?.value || 'enabled',
        anti_ddos_status: document.getElementById('cfgAntiDdosStatus')?.value || 'enabled',
        anti_debug_status: document.getElementById('cfgAntiDebugStatus')?.value || 'enabled'
    };

    try {
        const res = await api('/api/admin/settings', 'POST', payload, true);
        Toast.show(`✅ Đã lưu cấu hình vào Database và cập nhật toàn bộ Shop!`, 'success', 3500);
        currentSettings = { ...currentSettings, ...res.settings };
        applyShopSettings();
        await loadAdminSettings();
    } catch (err) {
        Toast.show(`❌ Lỗi cập nhật cấu hình: ${err.message}`, 'error');
    }
});

// Footer Navigation buttons
document.getElementById('footerTopupLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    openTopupModal();
});
document.getElementById('footerHistoryLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    openHistoryModal();
});

// --- 17. MODAL HELPERS & EVENT LISTENERS ---
function openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    const content = modal.querySelector('.modal-content');
    if (content) content.scrollTop = 0;
}

function closeModal(modal) {
    if (modal) modal.classList.remove('active');
    currentProduct = null;
    const activeModals = document.querySelectorAll('.modal-overlay.active:not(#supportChatModal)');
    if (!activeModals.length) {
        document.body.classList.remove('modal-open');
    }
}

function openLoginModal() {
    if (loginUsername) loginUsername.value = '';
    if (loginPassword) loginPassword.value = '';
    openModal(loginModal);
}
async function openRegisterModal() { openModal(registerModal); await loadRegisterCaptcha(); }

async function loadRegisterCaptcha() {
    if (!registerCaptchaImage || !registerCaptchaId) return;
    try {
        registerCaptchaImage.style.opacity = '0.45';
        const data = await api('/api/auth/captcha');
        if (data.success) {
            registerCaptchaId.value = data.captcha_id;
            registerCaptchaImage.src = data.image;
            if (registerCaptchaInput) registerCaptchaInput.value = '';
        }
    } catch (e) { Toast.show('❌ Không tải được CAPTCHA', 'error'); }
    finally { registerCaptchaImage.style.opacity = '1'; }
}

// Close Modals
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    if (overlay.id === 'topupSuccessModal') return; // popup này chỉ đóng bằng nút Đóng
    overlay.addEventListener('click', function (e) {
        if (e.target === this) {
            // Nếu đóng topupModal (click outside), chỉ dừng poll — KHÔNG xoá payCode.
            // Giữ payCode lại để nếu tiền về trễ (sau khi đã đóng modal), hệ thống
            // đồng bộ số dư vẫn nhận diện đúng đây là giao dịch của lần nạp này
            // và hiện popup thành công, thay vì bị bỏ qua.
            if (this.id === 'topupModal' && window.__topup) {
                if (window.__topup.pollTimer) { clearInterval(window.__topup.pollTimer); window.__topup.pollTimer = null; }
            }
            closeModal(this);
        }
    });
});

document.getElementById('modalClose')?.addEventListener('click', () => closeModal(purchaseModal));
document.getElementById('loginModalClose')?.addEventListener('click', () => closeModal(loginModal));
document.getElementById('registerModalClose')?.addEventListener('click', () => closeModal(registerModal));
document.getElementById('changePassClose')?.addEventListener('click', () => closeModal(changePassModal));
document.getElementById('topupModalClose')?.addEventListener('click', () => {
    // Dừng poll khi đóng modal nạp tiền để nút nạp tiền hoạt động bình thường
    if (window.__topup) {
        if (window.__topup.pollTimer) { clearInterval(window.__topup.pollTimer); window.__topup.pollTimer = null; }
        window.__topup.payCode = '';
    }
    closeModal(topupModal);
});
document.getElementById('historyModalClose')?.addEventListener('click', () => closeModal(historyModal));
document.getElementById('accountModalClose')?.addEventListener('click', () => closeModal(accountModal));
document.getElementById('closeAccountModal')?.addEventListener('click', () => closeModal(accountModal));
document.getElementById('historyAccountClose')?.addEventListener('click', () => closeModal(historyAccountModal));
document.getElementById('closeHistoryAccount')?.addEventListener('click', () => closeModal(historyAccountModal));
document.getElementById('adminModalClose')?.addEventListener('click', () => closeModal(adminModal));
document.getElementById('userFeedbackClose')?.addEventListener('click', () => closeModal(document.getElementById('userFeedbackModal')));

// Nav buttons
document.getElementById('topupNavBtn')?.addEventListener('click', (e) => { e.preventDefault(); openTopupModal(); });
document.getElementById('historyNavBtn')?.addEventListener('click', (e) => { e.preventDefault(); openHistoryModal(); });
document.getElementById('adminNavBtn')?.addEventListener('click', (e) => { e.preventDefault(); openAdminModal(); });

// Auth modal switchers
document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal(loginModal);
    openRegisterModal();
});
document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal(registerModal);
    openLoginModal();
});

// Forms Submit
loginForm?.addEventListener('submit', function (e) {
    e.preventDefault();
    const u = loginUsername.value.trim();
    const p = loginPassword.value.trim();
    if (u && p) loginUser(u, p);
});

registerForm?.addEventListener('submit', function (e) {
    e.preventDefault();
    const u = regUsername.value.trim();
    const em = regEmail.value.trim();
    const p = regPassword.value.trim();
    const c = regConfirm.value.trim();
    if (p !== c) {
        Toast.show('❌ Mật khẩu xác nhận không khớp!', 'error');
        return;
    }
    const captchaId = registerCaptchaId?.value?.trim();
    const captcha = registerCaptchaInput?.value?.trim().toUpperCase();
    if (!captchaId || captcha.length !== 5) {
        Toast.show('❌ Vui lòng nhập CAPTCHA gồm 5 ký tự', 'error');
        return;
    }
    registerUser(u, em, p, captchaId, captcha);
});

document.getElementById('refreshRegisterCaptcha')?.addEventListener('click', loadRegisterCaptcha);
document.getElementById('supportFloatingBtn')?.addEventListener('click', toggleLocalSupportChat);
document.getElementById('supportChatClose')?.addEventListener('click', closeLocalSupportChat);



document.getElementById('supportInput')?.addEventListener('keydown', function(e){
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendSupportMessage(e);
    }
});

document.getElementById('supportAdminInput')?.addEventListener('keydown', function(e){
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendAdminSupportMessage(e);
    }
});

document.getElementById('supportAdminUserSelect')?.addEventListener('change', async function() {
    const uid = Number(this.value);
    if (uid) {
        adminSupportSelectedUserId = uid;
        try {
            const msgRes = await api('/api/admin/support/messages?user_id=' + uid, 'GET', null, true);
            renderSupportMessages(msgRes.messages || [], 'supportMessages');
            document.getElementById('supportInput')?.focus();
        } catch(e) {}
    }
});

document.getElementById('supportSendForm')?.addEventListener('submit', sendSupportMessage);
document.getElementById('supportAdminSendForm')?.addEventListener('submit', sendAdminSupportMessage);
document.getElementById('refreshSupportAdminBtn')?.addEventListener('click', () => loadAdminSupportConversations(true));
document.getElementById('randomModalClose')?.addEventListener('click', () => closeModal(document.getElementById('randomModal')));

document.getElementById('saveRandomWeightsBtn')?.addEventListener('click',saveRandomAdminSettings);

changePassForm?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const oldP = document.getElementById('oldPassInput').value;
    const newP = document.getElementById('newPassInput').value;
    const confirmP = document.getElementById('confirmNewPassInput').value;
    if (newP !== confirmP) {
        Toast.show('❌ Mật khẩu mới không khớp!', 'error');
        return;
    }
    try {
        const res = await api('/api/auth/change-password', 'POST', {
            old_password: oldP,
            new_password: newP
        }, true);
        Toast.show(`✅ ${res.message}`, 'success');
        closeModal(changePassModal);
        changePassForm.reset();
    } catch (err) {
        Toast.show(`❌ ${err.message}`, 'error');
    }
});

// --- 18. CATEGORY & FILTER CONTROLLERS ---

// Sidebar Category filter (.cat-item)
document.querySelectorAll('.cat-item').forEach(item => {
    item.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelectorAll('.cat-item').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.cat || 'all';
        fetchProducts();
    });
});

// Footer Category links (.footer-cat-link)
document.querySelectorAll('.footer-cat-link').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        const cat = this.dataset.cat || 'all';
        document.querySelectorAll('.cat-item').forEach(c => {
            if (c.dataset.cat === cat) c.classList.add('active');
            else c.classList.remove('active');
        });
        currentFilter = cat;
        currentPage = 1;
        fetchProducts();
        document.getElementById('categorySection')?.scrollIntoView({ behavior: 'smooth' });
    });
});

// Search input debounce
let searchTimer = null;
searchInput?.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        searchQuery = this.value;
        currentPage = 1;
        fetchProducts();
    }, 250);
});

// Sidebar Sort items (.sort-item)
document.querySelectorAll('.sort-item').forEach(item => {
    item.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelectorAll('.sort-item').forEach(s => s.classList.remove('active'));
        this.classList.add('active');
        currentSort = this.dataset.sort || 'newest';
        currentPage = 1;
        fetchProducts();
    });
});

// Mobile menu toggle
document.getElementById('menu-toggle')?.addEventListener('click', function () {
    openMobileMenu();
});

document.querySelectorAll('.nav-links .nav-link').forEach(link => {
    link.addEventListener('click', () => closeMobileMenu());
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeMobileMenu();
});

window.addEventListener('resize', function() {
    if (window.innerWidth > 900) closeMobileMenu();
}, { passive: true });

// --- 19. MUSIC VISUALIZER & PLAYLIST CONTROLLER ---
(function () {
    const audio = document.getElementById('musicAudio');
    const canvas = document.getElementById('musicVisualizer');
    const playBtn = document.getElementById('musicToggleBig');
    const prevBtn = document.getElementById('musicPrevBtn');
    const nextBtn = document.getElementById('musicNextBtn');
    const listToggleBtn = document.getElementById('musicListToggleBtn');
    const playlistPanel = document.getElementById('musicPlaylistPanel');
    const playlistCloseBtn = document.getElementById('playlistCloseBtn');
    const playlistItems = document.getElementById('playlistItems');
    const playlistCount = document.getElementById('playlistCount');
    const currentTrackTitle = document.getElementById('currentTrackTitle');
    const status = document.getElementById('visualizerStatus');
    const volumeSlider = document.getElementById('musicVolumeSlider');
    const customUrlInput = document.getElementById('customMusicUrlInput');
    const btnPlayCustom = document.getElementById('btnPlayCustomMusic');

    if (!audio || !canvas || !playBtn) return;

    // Mobile performance mode: keep audio playback direct and skip Web Audio analysis.
    // This preserves music playback while avoiding a continuous analyser + RAF workload.
    const mobilePerfMode = window.matchMedia('(max-width: 900px)').matches;

    // Danh sách bài hát Gaming & Phonk
    let trackList = [
        { id: 1, title: 'Track Main (Bông Hoa Chẳng Tồn Tại)', genre: 'MAIN TRACK', src: '/music/track1.mp3' },
        { id: 2, title: 'Track 2 (Thương Cho Phận Hồng Nhan)', genre: 'TRACK #2', src: '/music/track2.mp3' },
        { id: 3, title: 'Track 3 (Mở Lối Cho Em 2)', genre: 'TRACK #3', src: '/music/track3.mp3' },
        { id: 4, title: 'Track 4 (Bông Hoa Nở Muộn)', genre: 'TRACK #4', src: '/music/track4.mp3' },
        { id: 5, title: 'Track 5 (Hẹn Hò Nhưng Không Yêu)', genre: 'TRACK #5', src: '/music/track5.mp3' },
        { id: 6, title: 'Track 6 (Lonely Lonely)', genre: 'TRACK #6', src: '/music/track6.mp3' },
    ];

    let currentTrackIdx = 0; // Luôn mặc định bắt đầu từ Track 1 (Track Main)

    const ctx = canvas.getContext('2d');
    let W, H;
    let audioContext = null;
    let analyser = null;
    let dataArray = null;
    let animationId = null;
    let isPlaying = false;

    async function loadMusicTracks() {
        try {
            const res = await api('/api/music/list');
            if (res.success && res.tracks && res.tracks.length > 0) {
                trackList = res.tracks;
                if (currentTrackIdx >= trackList.length) currentTrackIdx = 0;
                updateTrackDisplay();
                if (audio && !isPlaying) {
                    audio.src = trackList[currentTrackIdx].src;
                    audio.load();
                }
            }
        } catch (e) {
            console.warn('Lỗi tải danh sách nhạc folder:', e);
        }
    }

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const containerWidth = rect.width - 40;
        const dpr = window.devicePixelRatio || 1;
        W = containerWidth * dpr;
        H = 110 * dpr;
        canvas.width = W;
        canvas.height = H;
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = '110px';
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function initAudioContext() {
        if (audioContext) return;
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaElementSource(audio);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
        } catch (e) { console.warn('Web Audio init:', e); }
    }

    function renderPlaylistUI() {
        if (playlistCount) playlistCount.textContent = trackList.length;
        if (!playlistItems) return;

        playlistItems.innerHTML = trackList.map((t, idx) => `
            <div class="playlist-track ${idx === currentTrackIdx ? 'active' : ''}" data-idx="${idx}">
                <div class="track-main">
                    <span class="track-icon"><i class="fas ${idx === currentTrackIdx && isPlaying ? 'fa-volume-high' : 'fa-play'}"></i></span>
                    <span class="track-title" title="${t.title}">#${idx + 1}. ${t.title}</span>
                </div>
                <span class="track-genre">${t.genre || 'LOCAL'} ${t.size_mb ? `(${t.size_mb}MB)` : ''}</span>
            </div>
        `).join('');

        playlistItems.querySelectorAll('.playlist-track').forEach(item => {
            item.addEventListener('click', function () {
                const idx = parseInt(this.dataset.idx);
                switchTrack(idx, true);
            });
        });
    }

    function updateTrackDisplay() {
        const current = trackList[currentTrackIdx];
        if (current && currentTrackTitle) {
            currentTrackTitle.textContent = `#${currentTrackIdx + 1}: ${current.title}`;
        }
        renderPlaylistUI();
    }

    function switchTrack(idx, autoPlay = true) {
        if (idx < 0) idx = trackList.length - 1;
        if (idx >= trackList.length) idx = 0;
        currentTrackIdx = idx;
        localStorage.setItem('xiters_music_idx', currentTrackIdx);

        const track = trackList[currentTrackIdx];
        if (track) {
            audio.src = track.src;
            audio.load();
            updateTrackDisplay();
            syncFloatingMusicUI();
            Toast.show(`🎵 Đang phát: <strong>${track.title}</strong>`, 'info', 2500);

            if (autoPlay || isPlaying) {
                playAudio();
            }
        }
    }

    function playAudio() {
        if (!mobilePerfMode) {
            if (!audioContext) initAudioContext();
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume();
            }
        }
        audio.play().then(() => {
            isPlaying = true;
            playBtn.innerHTML = '<i class="fas fa-pause"></i> DỪNG NHẠC';
            if (status) {
                status.textContent = `🎶 Sóng nhạc đang phát: ${trackList[currentTrackIdx]?.title}`;
                status.classList.add('active');
            }
            if (animationId) cancelAnimationFrame(animationId);
            if (!mobilePerfMode) {
                drawWave();
            }
            renderPlaylistUI();
            syncFloatingMusicUI();
        }).catch(err => {
            console.warn('Playback error:', err);
            status.textContent = '⚠️ Trình duyệt chặn autoplay, vui lòng bấm BẬT NHẠC';
        });
    }

    function pauseAudio() {
        audio.pause();
        if (audioContext) audioContext.suspend();
        isPlaying = false;
        playBtn.innerHTML = '<i class="fas fa-play"></i> BẬT NHẠC';
        if (status) {
            status.textContent = '🎵 Nhấn play để bật sóng âm thanh';
            status.classList.remove('active');
        }
        if (animationId) cancelAnimationFrame(animationId);
        ctx.clearRect(0, 0, W, H);
        renderPlaylistUI();
        syncFloatingMusicUI();
    }

    function drawWave() {
        if (!analyser || !dataArray) return;
        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, W, H);

        const bufferLength = dataArray.length;
        const barWidth = (W / bufferLength) * 2.2;
        let x = 0;

        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 20;

        for (let i = 0; i < bufferLength; i++) {
            const value = dataArray[i];
            const percent = value / 255;
            const barHeight = percent * (H * 0.82) + 4;
            const y = H - barHeight;
            const gradient = ctx.createLinearGradient(0, y, 0, H);
            gradient.addColorStop(0, '#c084fc');
            gradient.addColorStop(0.5, '#a855f7');
            gradient.addColorStop(1, 'rgba(168,85,247,0.05)');
            ctx.fillStyle = gradient;
            ctx.shadowBlur = 15;
            ctx.fillRect(x, y, barWidth - 1, barHeight);
            if (percent > 0.4) {
                ctx.shadowBlur = 25;
                ctx.fillStyle = 'rgba(255,255,255,0.12)';
                ctx.fillRect(x, y, barWidth - 1, 2);
            }
            x += barWidth;
        }

        ctx.shadowBlur = 0;
        animationId = requestAnimationFrame(drawWave);
    }

    // Controls Event Listeners
    playBtn.addEventListener('click', function () {
        if (isPlaying) {
            pauseAudio();
        } else {
            playAudio();
        }
    });

    prevBtn?.addEventListener('click', () => {
        switchTrack(currentTrackIdx - 1, true);
    });

    nextBtn?.addEventListener('click', () => {
        switchTrack(currentTrackIdx + 1, true);
    });

    listToggleBtn?.addEventListener('click', () => {
        if (!playlistPanel) return;
        const isShown = playlistPanel.style.display !== 'none';
        playlistPanel.style.display = isShown ? 'none' : 'block';
        listToggleBtn.classList.toggle('active', !isShown);
    });

    playlistCloseBtn?.addEventListener('click', () => {
        if (playlistPanel) playlistPanel.style.display = 'none';
        listToggleBtn?.classList.remove('active');
    });

    // Volume slider
    if (volumeSlider) {
        audio.volume = parseFloat(volumeSlider.value) || 0.8;
        volumeSlider.addEventListener('input', function () {
            audio.volume = parseFloat(this.value);
            const icon = document.getElementById('volumeIcon');
            if (icon) {
                if (audio.volume === 0) icon.className = 'fas fa-volume-xmark';
                else if (audio.volume < 0.5) icon.className = 'fas fa-volume-low';
                else icon.className = 'fas fa-volume-high';
            }
        });
    }

    // === MUTE BUTTON (volume-based, works with AudioContext) ===
    const muteBtn = document.getElementById('muteBtn');
    let _prevVolume = 0.8;
    if (muteBtn) {
        muteBtn.addEventListener('click', function () {
            const icon = document.getElementById('volumeIcon');
            const slider = document.getElementById('musicVolumeSlider');
            if (audio.volume > 0) {
                // Mute: save volume, set to 0
                _prevVolume = audio.volume;
                audio.volume = 0;
                audio.muted = true;
                if (slider) slider.value = 0;
                if (icon) icon.className = 'fas fa-volume-xmark';
            } else {
                // Unmute: restore
                const restore = _prevVolume > 0 ? _prevVolume : 0.8;
                audio.volume = restore;
                audio.muted = false;
                if (slider) slider.value = restore;
                if (icon) icon.className = restore < 0.5 ? 'fas fa-volume-low' : 'fas fa-volume-high';
            }
        });
    }

    // Custom track URL player
    btnPlayCustom?.addEventListener('click', () => {
        const url = customUrlInput?.value.trim();
        if (!url) {
            Toast.show('❌ Vui lòng nhập link bài hát audio hợp lệ', 'error');
            return;
        }
        trackList.push({
            id: trackList.length + 1,
            title: `Custom: ${url.split('/').pop() || 'My Music'}`,
            genre: 'CUSTOM',
            src: url
        });
        customUrlInput.value = '';
        renderPlaylistUI();
        switchTrack(trackList.length - 1, true);
    });

    // Upload custom track handler
    const musicFileInput = document.getElementById('musicFileInput');
    const btnUploadMusic = document.getElementById('btnUploadMusic');
    const btnRefreshMusicList = document.getElementById('btnRefreshMusicList');

    btnUploadMusic?.addEventListener('click', () => {
        musicFileInput?.click();
    });

    musicFileInput?.addEventListener('change', async function () {
        if (!this.files || !this.files[0]) return;
        const file = this.files[0];
        const formData = new FormData();
        formData.append('file', file);

        Toast.show(`⏳ Đang tải lên bài hát "${file.name}" vào thư mục /music...`, 'info', 2500);

        try {
            const res = await fetch('/api/music/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                Toast.show(`✅ ${data.message}`, 'success', 3500);
                await loadMusicTracks();
                const newIdx = trackList.findIndex(t => t.filename === data.filename);
                if (newIdx !== -1) {
                    switchTrack(newIdx, true);
                }
            } else {
                Toast.show(`❌ ${data.detail || 'Lỗi tải file'}`, 'error');
            }
        } catch (err) {
            Toast.show(`❌ Lỗi tải lên: ${err.message}`, 'error');
        }
        this.value = '';
    });

    btnRefreshMusicList?.addEventListener('click', async () => {
        await loadMusicTracks();
        Toast.show('🔄 Đã làm mới danh sách bài hát từ folder /music', 'info');
    });

    function syncFloatingMusicUI() {
        const floatBtn = document.getElementById('musicFloatingBtn');
        const floatPopup = document.getElementById('musicFloatPopup');
        const floatTitle = document.getElementById('floatTrackTitle');
        const floatStatus = document.getElementById('floatTrackStatus');
        const floatPlayIcon = document.getElementById('floatPlayIcon');
        const track = trackList[currentTrackIdx];

        if (floatTitle) floatTitle.textContent = track ? track.title : 'Chưa chọn bài';
        if (floatStatus) floatStatus.textContent = isPlaying ? '🎵 Đang phát nhạc' : 'Đang tạm dừng';
        if (floatPlayIcon) floatPlayIcon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
        if (floatBtn) floatBtn.classList.toggle('playing', isPlaying);
        if (floatPopup) floatPopup.classList.toggle('is-playing', isPlaying);
    }

    // === FLOATING MUSIC WIDGET (MINIMIZED BY DEFAULT, CLICK TO EXPAND, CLICK OUTSIDE TO MINIMIZE) ===
    const floatWidget = document.getElementById('musicFloatingWidget');
    const floatPopup = document.getElementById('musicFloatPopup');
    const floatClose = document.getElementById('musicFloatPopupClose');
    const floatPlay = document.getElementById('floatPlayBtn');
    const floatPrev = document.getElementById('floatPrevBtn');
    const floatNext = document.getElementById('floatNextBtn');
    const floatList = document.getElementById('floatListBtn');
    const floatVol = document.getElementById('floatVolumeSlider');
    const floatMute = document.getElementById('floatMuteBtn');

    function expandFloatMusic() {
        if (!floatPopup || !floatPopup.classList.contains('minimized')) return;
        floatPopup.classList.remove('minimized');
        if (floatClose) {
            floatClose.innerHTML = '<i class="fas fa-minus"></i>';
            floatClose.title = 'Thu nhỏ';
        }
    }

    function minimizeFloatMusic() {
        if (!floatPopup || floatPopup.classList.contains('minimized')) return;
        floatPopup.classList.add('minimized');
        if (floatClose) {
            floatClose.innerHTML = '<i class="fas fa-chevron-up"></i>';
            floatClose.title = 'Mở rộng';
        }
    }

    // Click on the minimized bar expands it
    floatPopup?.addEventListener('click', (e) => {
        if (floatPopup.classList.contains('minimized')) {
            e.stopPropagation();
            expandFloatMusic();
        }
    });

    // Close/Toggle button inside widget
    floatClose?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!floatPopup) return;
        if (floatPopup.classList.contains('minimized')) {
            expandFloatMusic();
        } else {
            minimizeFloatMusic();
        }
    });

    // Click outside auto-minimizes when expanded
    document.addEventListener('click', (e) => {
        if (!floatPopup || floatPopup.classList.contains('minimized')) return;
        if (!e.target.closest('#musicFloatingWidget') && !e.target.closest('#playlistPanel') && !e.target.closest('#listToggleBtn')) {
            minimizeFloatMusic();
        }
    });

    floatPlay?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isPlaying) pauseAudio();
        else playAudio();
    });

    floatPrev?.addEventListener('click', (e) => {
        e.stopPropagation();
        switchTrack(currentTrackIdx - 1, true);
    });

    floatNext?.addEventListener('click', (e) => {
        e.stopPropagation();
        switchTrack(currentTrackIdx + 1, true);
    });

    floatList?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!playlistPanel) return;
        const isShown = playlistPanel.style.display !== 'none';
        playlistPanel.style.display = isShown ? 'none' : 'block';
        listToggleBtn?.classList.toggle('active', !isShown);
        if (!isShown) {
            playlistPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });

    floatVol?.addEventListener('input', function () {
        audio.volume = parseFloat(this.value);
        if (volumeSlider) volumeSlider.value = this.value;
        const floatVolIcon = document.getElementById('floatVolIcon');
        if (floatVolIcon) {
            if (audio.volume === 0) floatVolIcon.className = 'fas fa-volume-xmark';
            else if (audio.volume < 0.5) floatVolIcon.className = 'fas fa-volume-low';
            else floatVolIcon.className = 'fas fa-volume-high';
        }
    });

    floatMute?.addEventListener('click', (e) => {
        e.stopPropagation();
        muteBtn?.click();
        const floatVolIcon = document.getElementById('floatVolIcon');
        if (floatVolIcon) {
            floatVolIcon.className = audio.volume === 0 ? 'fas fa-volume-xmark' : 'fas fa-volume-high';
        }
        if (floatVol) floatVol.value = audio.volume;
    });

    // Auto next track on finish
    audio.addEventListener('ended', () => {
        switchTrack((currentTrackIdx + 1) % trackList.length, true);
    });

    // Auto-play helper
    function tryAutoPlay() {
        if (!isPlaying) {
            playAudio();
        }
    }

    // Initial load & Auto-play
    loadMusicTracks().then(() => {
        updateTrackDisplay();
        syncFloatingMusicUI();
        tryAutoPlay();
    });

    // Global one-time interaction listener to guarantee autoplay when user touches/clicks anywhere
    const handleFirstUserInteraction = () => {
        if (!isPlaying) {
            tryAutoPlay();
        }
        window.removeEventListener('click', handleFirstUserInteraction);
        window.removeEventListener('touchstart', handleFirstUserInteraction);
        window.removeEventListener('keydown', handleFirstUserInteraction);
    };
    window.addEventListener('click', handleFirstUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleFirstUserInteraction, { passive: true });
    window.addEventListener('keydown', handleFirstUserInteraction, { passive: true });
})();

// --- 20. CONTACT WIDGET TOGGLE ---
const contactToggle = document.getElementById('contactToggle');
const contactWidget = document.getElementById('contactWidget');
if (contactToggle && contactWidget) {
    let isOpen = false;
    contactToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        isOpen = !isOpen;
        contactWidget.classList.toggle('cw-open', isOpen);
    });
    document.addEventListener('click', function(e) {
        if (isOpen && !contactWidget.contains(e.target)) {
            isOpen = false;
            contactWidget.classList.remove('cw-open');
        }
    });
}

// Admin Tab Switching (Sidebar Navigation)
document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.admin-tab-pane').forEach(p => p.classList.remove('active'));
        this.classList.add('active');
        const targetTab = this.dataset.tab;
        const targetPane = document.getElementById(targetTab);
        if (targetPane) targetPane.classList.add('active');
    });
});

// --- 21. CHILL C# ESP/AIMTRACK CODE BACKGROUND CANVAS (CHỈ HIỆN 1 LẦN BÊN TRÁI, KHÔNG CUỘN, FULL DÒNG) ---
(function initStaticCodeCanvas() {
    const canvas = document.getElementById('codeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Đoạn code C# ESP / ImGui chính xác từ hình ảnh mới nhất của bạn (Full 66 dòng)
    const rawCsLines = [
        [{ t: "0 references", c: "ref" }],
        [{ t: "protected ", c: "kw" }, { t: "override ", c: "kw" }, { t: "unsafe ", c: "kw" }, { t: "void ", c: "kw" }, { t: "Render", c: "fn" }, { t: "()", c: "sym" }],
        [{ t: "{", c: "sym" }],
        [{ t: "    ", c: "plain" }, { t: "EnsureTabIconsLoaded", c: "fn" }, { t: "();", c: "sym" }],
        [{ t: "    ", c: "plain" }, { t: "if ", c: "kw" }, { t: "(", c: "sym" }, { t: "Core", c: "type" }, { t: ".", c: "sym" }, { t: "Handle", c: "prop" }, { t: " != ", c: "op" }, { t: "IntPtr", c: "type" }, { t: ".", c: "sym" }, { t: "Zero", c: "prop" }, { t: ")", c: "sym" }],
        [{ t: "        ", c: "plain" }, { t: "CreateHandle", c: "fn" }, { t: "();", c: "sym" }],
        [{ t: "    ", c: "plain" }, { t: "HandleUIAnimation", c: "fn" }, { t: "();", c: "sym" }],
        [{ t: "", c: "plain" }],
        [{ t: "    ", c: "plain" }, { t: "if ", c: "kw" }, { t: "(_loginDone)", c: "var" }],
        [{ t: "    {", c: "sym" }],
        [{ t: "        ", c: "plain" }, { t: "_loginDone", c: "var" }, { t: " = ", c: "op" }, { t: "false", c: "kw" }, { t: ";", c: "sym" }],
        [{ t: "        ", c: "plain" }, { t: "if ", c: "kw" }, { t: "(_loginOk)", c: "var" }],
        [{ t: "        {", c: "sym" }],
        [{ t: "            ", c: "plain" }, { t: "_loginError", c: "var" }, { t: " = ", c: "op" }, { t: '""', c: "str" }, { t: ";", c: "sym" }],
        [{ t: "            ", c: "plain" }, { t: "_flowPhase", c: "var" }, { t: " = ", c: "op" }, { t: "FlowPhase", c: "type" }, { t: ".", c: "sym" }, { t: "PostLoginLoad", c: "prop" }, { t: ";", c: "sym" }],
        [{ t: "            ", c: "plain" }, { t: "ResetLoaderVisualState", c: "fn" }, { t: "();", c: "sym" }],
        [{ t: "            ", c: "plain" }, { t: "_emulatorInitTask", c: "var" }, { t: " = ", c: "op" }, { t: "BootstrapRuntime", c: "type" }, { t: ".", c: "sym" }, { t: "InitEmulatorAsync", c: "fn" }, { t: "();", c: "sym" }],
        [{ t: "        }", c: "sym" }],
        [{ t: "        ", c: "plain" }, { t: "else", c: "kw" }],
        [{ t: "            ", c: "plain" }, { t: "_loginError", c: "var" }, { t: " = ", c: "op" }, { t: "_loginResultMsg", c: "var" }, { t: ";", c: "sym" }],
        [{ t: "    }", c: "sym" }],
        [{ t: "", c: "plain" }],
        [{ t: "    ", c: "plain" }, { t: "if ", c: "kw" }, { t: "(_uiVisible || _uiAlpha > ", c: "var" }, { t: "0.001f", c: "num" }, { t: ")", c: "sym" }],
        [{ t: "        ", c: "plain" }, { t: "RenderUI", c: "fn" }, { t: "();", c: "sym" }],
        [{ t: "", c: "plain" }],
        [{ t: "    ", c: "plain" }, { t: "if ", c: "kw" }, { t: "(_flowPhase == ", c: "var" }, { t: "FlowPhase", c: "type" }, { t: ".", c: "sym" }, { t: "Main", c: "prop" }, { t: ")", c: "sym" }],
        [{ t: "        ", c: "plain" }, { t: "CustomNotification", c: "type" }, { t: ".", c: "sym" }, { t: "RenderNotifications", c: "fn" }, { t: "();", c: "sym" }],
        [{ t: "", c: "plain" }],
        [{ t: "    ", c: "plain" }, { t: "if ", c: "kw" }, { t: "(!", c: "op" }, { t: "Core", c: "type" }, { t: ".", c: "sym" }, { t: "HaveMatrix", c: "prop" }, { t: ") ", c: "sym" }, { t: "return", c: "kw" }, { t: ";", c: "sym" }],
        [{ t: "", c: "plain" }],
        [{ t: "    ", c: "plain" }, { t: "var ", c: "kw" }, { t: "espClipDl", c: "var" }, { t: " = ", c: "op" }, { t: "ImGui", c: "type" }, { t: ".", c: "sym" }, { t: "GetBackgroundDrawList", c: "fn" }, { t: "();", c: "sym" }],
        [{ t: "    ", c: "plain" }, { t: "espClipDl", c: "var" }, { t: ".", c: "sym" }, { t: "PushClipRect", c: "fn" }, { t: "(_emulatorClipMin, _emulatorClipMax, ", c: "var" }, { t: "true", c: "kw" }, { t: ");", c: "sym" }],
        [{ t: "    ", c: "plain" }, { t: "try", c: "kw" }],
        [{ t: "    {", c: "sym" }],
        [{ t: "        ", c: "plain" }, { t: "if ", c: "kw" }, { t: "(", c: "sym" }, { t: "Config", c: "type" }, { t: ".", c: "sym" }, { t: "FOVEnabled", c: "prop" }, { t: ")", c: "sym" }],
        [{ t: "        {", c: "sym" }],
        [{ t: "            ", c: "plain" }, { t: "DrawFOVCircle", c: "fn" }, { t: "(", c: "sym" }, { t: "Config", c: "type" }, { t: ".", c: "sym" }, { t: "AimFov", c: "prop" }, { t: ");", c: "sym" }],
        [{ t: "        }", c: "sym" }],
        [{ t: "", c: "plain" }],
        [{ t: "        ", c: "plain" }, { t: "// Aim Track Line: draw from screen center to nearest enemy inside FOV", c: "comment" }],
        [{ t: "        ", c: "plain" }, { t: "if ", c: "kw" }, { t: "(", c: "sym" }, { t: "Config", c: "type" }, { t: ".", c: "sym" }, { t: "AimTrackLine", c: "prop" }, { t: ")", c: "sym" }],
        [{ t: "        {", c: "sym" }],
        [{ t: "            ", c: "plain" }, { t: "Vector2 ", c: "type" }, { t: "screenCenter", c: "var" }, { t: " = ", c: "op" }, { t: "new ", c: "kw" }, { t: "Vector2", c: "type" }, { t: "(", c: "sym" }, { t: "Core", c: "type" }, { t: ".", c: "sym" }, { t: "Width", c: "prop" }, { t: " / ", c: "op" }, { t: "2f", c: "num" }, { t: ", ", c: "sym" }, { t: "Core", c: "type" }, { t: ".", c: "sym" }, { t: "Height", c: "prop" }, { t: " / ", c: "op" }, { t: "2f", c: "num" }, { t: ");", c: "sym" }],
        [{ t: "            ", c: "plain" }, { t: "Entity ", c: "type" }, { t: "nearestEnemy", c: "var" }, { t: " = ", c: "op" }, { t: "null", c: "kw" }, { t: ";", c: "sym" }],
        [{ t: "            ", c: "plain" }, { t: "Vector2 ", c: "type" }, { t: "nearestEnemyScreenPos", c: "var" }, { t: " = ", c: "op" }, { t: "Vector2", c: "type" }, { t: ".", c: "sym" }, { t: "Zero", c: "prop" }, { t: ";", c: "sym" }],
        [{ t: "            ", c: "plain" }, { t: "float ", c: "kw" }, { t: "nearestDistance", c: "var" }, { t: " = ", c: "op" }, { t: "float", c: "kw" }, { t: ".", c: "sym" }, { t: "MaxValue", c: "prop" }, { t: ";", c: "sym" }],
        [{ t: "", c: "plain" }],
        [{ t: "            ", c: "plain" }, { t: "foreach ", c: "kw" }, { t: "(", c: "sym" }, { t: "var ", c: "kw" }, { t: "entity", c: "var" }, { t: " in ", c: "kw" }, { t: "Core", c: "type" }, { t: ".", c: "sym" }, { t: "Entities", c: "prop" }, { t: ".", c: "sym" }, { t: "Values", c: "prop" }, { t: ")", c: "sym" }],
        [{ t: "            {", c: "sym" }],
        [{ t: "                ", c: "plain" }, { t: "if ", c: "kw" }, { t: "(", c: "sym" }, { t: "entity", c: "var" }, { t: ".", c: "sym" }, { t: "IsDead", c: "prop" }, { t: " || !", c: "op" }, { t: "entity", c: "var" }, { t: ".", c: "sym" }, { t: "IsKnown", c: "prop" }, { t: ") ", c: "sym" }, { t: "continue", c: "kw" }, { t: ";", c: "sym" }],
        [{ t: "", c: "plain" }],
        [{ t: "                ", c: "plain" }, { t: "var ", c: "kw" }, { t: "headPos", c: "var" }, { t: " = ", c: "op" }, { t: "W2S", c: "type" }, { t: ".", c: "sym" }, { t: "WorldToScreen", c: "fn" }, { t: "(", c: "sym" }, { t: "Core", c: "type" }, { t: ".", c: "sym" }, { t: "CameraMatrix", c: "prop" }, { t: ", ", c: "sym" }, { t: "entity", c: "var" }, { t: ".", c: "sym" }, { t: "Head", c: "prop" }, { t: ", ", c: "sym" }, { t: "Core", c: "type" }, { t: ".", c: "sym" }, { t: "Width", c: "prop" }, { t: ", ", c: "sym" }, { t: "Core", c: "type" }, { t: ".", c: "sym" }, { t: "Height", c: "prop" }, { t: ");", c: "sym" }],
        [{ t: "                ", c: "plain" }, { t: "if ", c: "kw" }, { t: "(headPos.X < ", c: "var" }, { t: "1", c: "num" }, { t: " || headPos.Y < ", c: "var" }, { t: "1", c: "num" }, { t: ") ", c: "sym" }, { t: "continue", c: "kw" }, { t: ";", c: "sym" }],
        [{ t: "", c: "plain" }],
        [{ t: "                ", c: "plain" }, { t: "float ", c: "kw" }, { t: "distToCrosshair", c: "var" }, { t: " = ", c: "op" }, { t: "Vector2", c: "type" }, { t: ".", c: "sym" }, { t: "Distance", c: "fn" }, { t: "(screenCenter, headPos);", c: "var" }],
        [{ t: "                ", c: "plain" }, { t: "if ", c: "kw" }, { t: "(distToCrosshair < nearestDistance &&", c: "var" }],
        [{ t: "                    ", c: "plain" }, { t: "(!", c: "op" }, { t: "Config", c: "type" }, { t: ".", c: "sym" }, { t: "FOVEnabled", c: "prop" }, { t: " || distToCrosshair <= ", c: "var" }, { t: "Config", c: "type" }, { t: ".", c: "sym" }, { t: "AimFov", c: "prop" }, { t: "))", c: "sym" }],
        [{ t: "                {", c: "sym" }],
        [{ t: "                    ", c: "plain" }, { t: "nearestDistance", c: "var" }, { t: " = ", c: "op" }, { t: "distToCrosshair;", c: "var" }],
        [{ t: "                    ", c: "plain" }, { t: "nearestEnemy", c: "var" }, { t: " = ", c: "op" }, { t: "entity;", c: "var" }],
        [{ t: "                    ", c: "plain" }, { t: "nearestEnemyScreenPos", c: "var" }, { t: " = ", c: "op" }, { t: "headPos;", c: "var" }],
        [{ t: "                }", c: "sym" }],
        [{ t: "            }", c: "sym" }],
        [{ t: "        }", c: "sym" }],
        [{ t: "    }", c: "sym" }],
        [{ t: "}", c: "sym" }]
    ];

    const tokenColors = {
        ref: "rgba(113, 113, 122, 0.7)",       // Gray 0 references
        kw: "rgba(56, 189, 248, 0.9)",          // Sky Blue / Azure keywords
        type: "rgba(167, 139, 250, 0.92)",      // Lavender types (Core, FlowPhase, ImGui, Vector2, Entity)
        fn: "rgba(251, 191, 36, 0.92)",         // Amber/Gold functions (Render, DrawFOVCircle, WorldToScreen)
        prop: "rgba(147, 197, 253, 0.88)",      // Soft Cyan properties
        var: "rgba(226, 232, 240, 0.85)",       // Light text variables
        str: "rgba(249, 115, 22, 0.88)",        // Orange strings
        comment: "rgba(52, 211, 153, 0.85)",    // Emerald green comments
        num: "rgba(192, 132, 252, 0.9)",        // Violet numbers
        op: "rgba(244, 114, 182, 0.85)",        // Pink operators
        sym: "rgba(212, 212, 216, 0.8)",        // Punctuation
        plain: "rgba(243, 244, 246, 0.8)"
    };

    function renderStaticCode() {
        ctx.clearRect(0, 0, width, height);

        // Don't render on narrow mobile screens
        if (width < 768) return;

        const fontSize = 11.2;
        const lineHeight = 18.5;
        ctx.font = `500 ${fontSize}px 'Consolas', 'Courier New', monospace`;

        const startX = 20;
        const startY = 95;

        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(168, 85, 247, 0.35)';

        for (let i = 0; i < rawCsLines.length; i++) {
            const lineY = startY + i * lineHeight;
            let curX = startX;
            const tokens = rawCsLines[i];

            for (let j = 0; j < tokens.length; j++) {
                const tok = tokens[j];
                ctx.fillStyle = tokenColors[tok.c] || tokenColors.plain;
                ctx.fillText(tok.t, curX, lineY);
                curX += ctx.measureText(tok.t).width;
            }
        }
        ctx.shadowBlur = 0;
    }

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        renderStaticCode();
    });

    renderStaticCode();
})();

// --- 22. REALISTIC GRAVITY PHYSICS FEATHER & PARTICLE ENGINE ---
(function initGravityFeatherPhysics() {
    const canvas = document.getElementById('featherCanvas');
    if (!canvas) return;
    if (window.matchMedia('(max-width: 900px)').matches) {
        canvas.style.display = 'none';
        return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const FEATHER_COUNT = 90;
    const feathers = [];

    let mouse = { x: -1000, y: -1000, radius: 160, active: false };
    let gravityPulse = null;

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;
    });

    window.addEventListener('mouseleave', () => {
        mouse.active = false;
        mouse.x = -1000;
        mouse.y = -1000;
    });

    window.addEventListener('click', (e) => {
        gravityPulse = {
            x: e.clientX,
            y: e.clientY,
            radius: 0,
            maxRadius: 280,
            strength: 4.5,
            age: 0
        };
    });

    const featherColors = [
        'rgba(216, 180, 254, ',
        'rgba(192, 132, 252, ',
        'rgba(168, 85, 247, ',
        'rgba(243, 232, 255, ',
        'rgba(147, 51, 234, '
    ];

    class GravityFeather {
        constructor(initial = false) {
            this.reset(initial);
        }

        reset(initial = false) {
            this.x = Math.random() * width;
            this.y = initial ? Math.random() * height : -50 - Math.random() * 80;
            this.mass = 0.8 + Math.random() * 0.8;
            this.size = 14 + Math.random() * 20;

            // Gravity physics properties
            this.gravity = 0.012 * this.mass; // Constant downward gravitational acceleration
            this.vx = (Math.random() - 0.5) * 0.2;
            this.vy = 0.05 + Math.random() * 0.12;
            this.terminalVelocity = 0.22 + Math.random() * 0.28; // Ultra slow terminal velocity
            this.drag = 0.982; // Air resistance

            this.wobble = Math.random() * Math.PI * 2;
            this.wobbleSpeed = 0.003 + Math.random() * 0.006;
            this.wobbleAmp = 0.6 + Math.random() * 1.2;

            this.angle = (Math.random() - 0.5) * 0.8;
            this.angleSpeed = (Math.random() - 0.5) * 0.004;

            this.flip = Math.random() * Math.PI * 2;
            this.flipSpeed = 0.004 + Math.random() * 0.008;

            this.alpha = 0.25 + Math.random() * 0.55;
            this.color = featherColors[Math.floor(Math.random() * featherColors.length)];
        }

        update() {
            // Apply Gravity (g)
            this.vy += this.gravity;

            // Apply Aerodynamic Lift & Horizontal Wind Wobble
            this.wobble += this.wobbleSpeed;
            this.flip += this.flipSpeed;
            this.angle += this.angleSpeed;

            const liftForce = Math.sin(this.wobble) * this.wobbleAmp * 0.04;
            this.vx += liftForce;

            // Apply Air Resistance / Drag
            this.vx *= this.drag;
            this.vy *= this.drag;

            // Clamp Terminal Velocity (so it falls ultra slow & gracefully)
            if (this.vy > this.terminalVelocity) {
                this.vy = this.terminalVelocity;
            }

            // --- Mouse Gravity / Fluid Disturbance Field ---
            if (mouse.active) {
                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < mouse.radius && dist > 1) {
                    const force = (1 - dist / mouse.radius) * 0.35;
                    const angle = Math.atan2(dy, dx);
                    // Gentle repulsion + slight swirl
                    this.vx += Math.cos(angle + 0.3) * force;
                    this.vy += Math.sin(angle) * force * 0.6;
                    this.angle += force * 0.05;
                }
            }

            // --- Gravity Click Ripple Pulse ---
            if (gravityPulse) {
                const dx = this.x - gravityPulse.x;
                const dy = this.y - gravityPulse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const ringDist = Math.abs(dist - gravityPulse.radius);
                if (ringDist < 40 && dist > 1) {
                    const rippleForce = (1 - ringDist / 40) * (gravityPulse.strength * 0.15);
                    const angle = Math.atan2(dy, dx);
                    this.vx += Math.cos(angle) * rippleForce;
                    this.vy += Math.sin(angle) * rippleForce;
                    this.angle += (Math.random() - 0.5) * 0.1;
                }
            }

            // Move position
            this.x += this.vx;
            this.y += this.vy;

            // Screen wrap / recycle
            if (this.y > height + 60 || this.x < -80 || this.x > width + 80) {
                this.reset(false);
            }
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle + Math.sin(this.wobble) * 0.25);

            // 3D flipping scale
            const scaleX = Math.cos(this.flip);
            ctx.scale(scaleX, 1);

            const len = this.size;
            const widthScale = len * 0.28;

            ctx.shadowBlur = 12;
            ctx.shadowColor = this.color + '0.6)';

            // Feather Quill
            ctx.beginPath();
            ctx.moveTo(0, -len * 0.52);
            ctx.quadraticCurveTo(widthScale * 0.15, 0, 0, len * 0.52);
            ctx.strokeStyle = this.color + (this.alpha * 0.95) + ')';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Feather Vanes
            ctx.beginPath();
            ctx.moveTo(0, -len * 0.5);
            ctx.bezierCurveTo(
                -widthScale * 1.12, -len * 0.26,
                -widthScale * 0.92, len * 0.22,
                0, len * 0.5
            );
            ctx.bezierCurveTo(
                widthScale * 0.92, len * 0.22,
                widthScale * 1.12, -len * 0.26,
                0, -len * 0.5
            );

            ctx.fillStyle = this.color + (this.alpha * 0.35) + ')';
            ctx.fill();

            // Tơ lông vũ tinh xảo
            ctx.beginPath();
            for (let i = -len * 0.35; i < len * 0.35; i += len * 0.14) {
                ctx.moveTo(0, i);
                ctx.lineTo(-widthScale * 0.68, i - len * 0.08);
                ctx.moveTo(0, i);
                ctx.lineTo(widthScale * 0.68, i - len * 0.08);
            }
            ctx.strokeStyle = this.color + (this.alpha * 0.3) + ')';
            ctx.lineWidth = 0.7;
            ctx.stroke();

            ctx.restore();
        }
    }

    for (let i = 0; i < FEATHER_COUNT; i++) {
        feathers.push(new GravityFeather(true));
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        if (gravityPulse) {
            gravityPulse.radius += 6;
            gravityPulse.age += 1;
            gravityPulse.strength *= 0.95;
            if (gravityPulse.radius > gravityPulse.maxRadius || gravityPulse.strength < 0.1) {
                gravityPulse = null;
            }
        }

        for (let i = 0; i < feathers.length; i++) {
            feathers[i].update();
            feathers[i].draw();
        }
        requestAnimationFrame(animate);
    }

    animate();
})();

// --- 23. CUSTOMER FEEDBACK & REVIEWS HANDLER (ẢNH FEEDBACK & ĐÁNH GIÁ) ---
async function fetchFeedbacks() {
    try {
        const res = await fetch('/api/feedbacks');
        const data = await res.json();
        if (data.success) {
            renderFeedbacks(data.feedbacks || []);
            renderAdminFeedbacksTable(data.feedbacks || []);
        }
    } catch (err) {
        console.warn('fetchFeedbacks error:', err);
    }
}

function renderFeedbacks(feedbacks) {
    const grid = document.getElementById('feedbackGrid');
    if (!grid) return;
    if (!feedbacks || feedbacks.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 35px 20px; background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border);">
                <i class="fas fa-images" style="font-size: 32px; margin-bottom: 10px; color: var(--primary);"></i>
                <p style="font-size: 14px;">Chưa có ảnh feedback nào. Hãy nhấn <strong>"GỬI ẢNH FEEDBACK CỦA BẠN"</strong> để là người đầu tiên chia sẻ!</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = feedbacks.map(fb => {
        const stars = '⭐'.repeat(Math.max(1, Math.min(5, fb.rating || 5)));
        const date = fb.created_at ? fb.created_at.split(' ')[0] : '';
        const safeUrl = fb.image_url.replace(/'/g, "\\'");
        return `
            <div class="feedback-img-card" onclick="openFeedbackLightbox('${safeUrl}')" title="Nhấn để xem ảnh phóng to">
                <div class="feedback-img-wrap">
                    <span class="feedback-img-badge"><i class="fas fa-shield-halved"></i> UY TÍN 100%</span>
                    <img src="${fb.image_url}" alt="Feedback bill" loading="lazy">
                </div>
                <div class="feedback-img-info">
                    <span class="feedback-img-title" style="color:#ffd700;font-size:14px;letter-spacing:2px;">${stars}</span>
                    <span class="feedback-img-date"><i class="fas fa-user" style="margin-right:4px;"></i>${escapeHtml(fb.username || 'Khách')}</span>
                    <span class="feedback-img-date"><i class="fas fa-clock" style="margin-right:4px;"></i>${escapeHtml(date)}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ===== FEEDBACK LIGHTBOX POPUP =====
function openFeedbackLightbox(imgUrl) {
    let lb = document.getElementById('feedbackLightbox');
    if (!lb) {
        lb = document.createElement('div');
        lb.id = 'feedbackLightbox';
        lb.style.cssText = `
            position:fixed;inset:0;z-index:999999;
            background:rgba(0,0,0,0.92);
            display:flex;align-items:center;justify-content:center;
            cursor:zoom-out;
            animation:lbFadeIn 0.2s ease;
        `;
        lb.innerHTML = `
            <style>@keyframes lbFadeIn{from{opacity:0}to{opacity:1}}
            @keyframes lbZoomIn{from{transform:scale(0.85)}to{transform:scale(1)}}</style>
            <button onclick="document.getElementById('feedbackLightbox').remove()" style="
                position:absolute;top:20px;right:24px;
                background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);
                color:#fff;font-size:22px;width:44px;height:44px;border-radius:50%;
                cursor:pointer;display:flex;align-items:center;justify-content:center;
                transition:0.2s;z-index:2;
            ">✕</button>
            <img id="lbImg" src="${imgUrl}" style="
                max-width:92vw;max-height:90vh;
                border-radius:12px;
                box-shadow:0 0 60px rgba(168,85,247,0.4),0 30px 80px rgba(0,0,0,0.8);
                animation:lbZoomIn 0.25s cubic-bezier(0.2,0.9,0.3,1.2) both;
                object-fit:contain;
            " onclick="event.stopPropagation()">
        `;
        lb.onclick = () => lb.remove();
        document.body.appendChild(lb);
    } else {
        document.getElementById('lbImg').src = imgUrl;
        lb.style.display = 'flex';
    }
}
window.openFeedbackLightbox = openFeedbackLightbox;

function renderAdminFeedbacksTable(feedbacks) {
    const tbody = document.getElementById('adminFeedbacksTableBody');
    if (!tbody) return;
    if (!feedbacks || feedbacks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">Chưa có ảnh feedback nào. Hãy tải lên ảnh đầu tiên!</td></tr>`;
        return;
    }

    tbody.innerHTML = feedbacks.map(fb => {
        const stars = '⭐'.repeat(Math.max(1, Math.min(5, fb.rating || 5)));
        return `
            <tr>
                <td>#${fb.id}</td>
                <td>
                    <a href="${fb.image_url}" target="_blank" title="Xem ảnh gốc">
                        <img src="${fb.image_url}" alt="thumb" style="width:70px;height:50px;object-fit:cover;border-radius:6px;border:1px solid var(--border);">
                    </a>
                </td>
                <td style="color:#ffd700;font-size:13px;letter-spacing:1px;">${stars}</td>
                <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><a href="${fb.image_url}" target="_blank" style="color:var(--primary);">${escapeHtml(fb.image_url)}</a></td>
                <td>${escapeHtml(fb.created_at || '')}</td>
                <td>
                    <button class="btn-danger" style="padding:5px 12px;font-size:11.5px;border-radius:8px;" onclick="handleDeleteFeedback(${fb.id})">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function handleDeleteFeedback(id) {
    if (!confirm(`Bạn có chắc chắn muốn xóa ảnh Feedback #${id} không?`)) return;
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
        const res = await fetch(`/api/admin/feedbacks/${id}`, {
            method: 'DELETE',
            headers
        });
        const data = await res.json();
        if (data.success) {
            Toast.show(`✅ ${data.message || 'Đã xóa ảnh feedback!'}`, 'success');
            fetchFeedbacks();
        } else {
            Toast.show(`❌ ${data.detail || 'Không thể xóa feedback!'}`, 'error');
        }
    } catch (e) {
        Toast.show('❌ Lỗi kết nối máy chủ!', 'error');
    }
}

function openUserFeedbackModal() {
    if (!authToken) {
        Toast.show('⚠️ Bạn cần đăng nhập để gửi feedback!', 'error');
        return;
    }
    const modal = document.getElementById('userFeedbackModal');
    if (modal) openModal(modal);
}

function initUserFeedbackForm() {
    const form = document.getElementById('userFeedbackForm');
    const imageFileInput = document.getElementById('userFbImageFile');
    const imageUrlInput = document.getElementById('userFbImageUrl');
    const previewWrap = document.getElementById('userFbPreviewWrap');
    const previewImg = document.getElementById('userFbPreviewImg');

    imageFileInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            Toast.show('⏳ Đang tải ảnh lên hệ thống...', 'info');
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success && data.url) {
                if (imageUrlInput) imageUrlInput.value = data.url;
                if (previewWrap && previewImg) {
                    previewImg.src = data.url;
                    previewWrap.style.display = 'block';
                }
                Toast.show('✅ Đã tải ảnh lên thành công!', 'success');
            } else {
                Toast.show(`❌ ${data.detail || 'Lỗi tải ảnh!'}`, 'error');
            }
        } catch (err) {
            Toast.show('❌ Không thể upload ảnh!', 'error');
        }
    });

    imageUrlInput?.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val && previewWrap && previewImg) {
            previewImg.src = val;
            previewWrap.style.display = 'block';
        }
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const image_url = document.getElementById('userFbImageUrl')?.value.trim();
        const rating = parseInt(document.getElementById('userFbRating')?.value || '5');

        if (!image_url) {
            Toast.show('⚠️ Vui lòng chọn hoặc dán link ảnh feedback!', 'error');
            return;
        }

        if (!authToken) {
            Toast.show('⚠️ Bạn cần đăng nhập để gửi feedback!', 'error');
            return;
        }

        try {
            const btn = document.getElementById('btnSubmitUserFb');
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ĐANG GỬI...'; }

            const res = await fetch('/api/feedbacks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ image_url, rating })
            });

            const data = await res.json();
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> ĐĂNG ẢNH FEEDBACK LÊN SHOP'; }

            if (data.success) {
                Toast.show(`🎉 ${data.message || 'Đã gửi ảnh feedback thành công!'}`, 'success');
                form.reset();
                if (previewWrap) previewWrap.style.display = 'none';
                closeModal(document.getElementById('userFeedbackModal'));
                fetchFeedbacks();
            } else if (res.status === 429) {
                Toast.show(`⏳ ${data.detail || 'Vui lòng chờ 30 phút trước khi gửi lại!'}`, 'error');
            } else {
                Toast.show(`❌ ${data.detail || 'Không thể lưu feedback!'}`, 'error');
            }
        } catch (err) {
            Toast.show('❌ Lỗi kết nối khi gửi feedback!', 'error');
        }
    });
}

function initFeedbackAdminForm() {
    const form = document.getElementById('adminAddFeedbackForm');
    const imageFileInput = document.getElementById('fbImageFile');
    const imageUrlInput = document.getElementById('fbImageUrl');

    imageFileInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            Toast.show('⏳ Đang tải ảnh lên hệ thống...', 'info');
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success && data.url) {
                if (imageUrlInput) imageUrlInput.value = data.url;
                Toast.show('✅ Đã tải ảnh lên thành công!', 'success');
            } else {
                Toast.show(`❌ ${data.detail || 'Lỗi tải ảnh!'}`, 'error');
            }
        } catch (err) {
            Toast.show('❌ Không thể upload ảnh!', 'error');
        }
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const image_url = document.getElementById('fbImageUrl')?.value.trim();
        const rating = parseInt(document.getElementById('fbRating')?.value || '5');

        if (!image_url) {
            Toast.show('⚠️ Vui lòng chọn hoặc dán link ảnh feedback!', 'error');
            return;
        }

        try {
            const btn = document.getElementById('btnSubmitFeedback');
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ĐANG TẢI LÊN...'; }

            const headers = { 'Content-Type': 'application/json' };
            if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

            const res = await fetch('/api/admin/feedbacks', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    image_url,
                    rating
                })
            });

            const data = await res.json();
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus-circle"></i> ĐĂNG ẢNH FEEDBACK LÊN TRANG CHỦ'; }

            if (data.success) {
                Toast.show('✅ Đã tải lên ảnh Feedback lên shop!', 'success');
                form.reset();
                fetchFeedbacks();
            } else {
                Toast.show(`❌ ${data.detail || 'Không thể lưu ảnh feedback!'}`, 'error');
            }
        } catch (err) {
            Toast.show('❌ Lỗi kết nối khi gửi feedback!', 'error');
        }
    });
}

function updateDynamicHostUrls() {
    try {
        const origin = window.location.origin;
        const webhookInput = document.getElementById('adminWebhookUrlInput');
        if (webhookInput) webhookInput.value = `${origin}/api/bank/sepay-webhook`;
        const cardCallbackInput = document.getElementById('adminCardCallbackUrl');
        if (cardCallbackInput) cardCallbackInput.value = `${origin}/api/card/gachthefast-callback`;
    } catch(e) {}
}

// --- 24. INIT APP ---
async function initApp() {
    updateDynamicHostUrls();
    try { await fetchShopSettings(); } catch (e) { console.warn('fetchShopSettings:', e); }
    try { await checkAuth(); } catch (e) { console.warn('checkAuth:', e); }
    try { await fetchCategories(); } catch (e) { console.warn('fetchCategories:', e); }
    try { await fetchProducts(); } catch (e) { console.warn('fetchProducts:', e); }
    try { await fetchFeedbacks(); } catch (e) { console.warn('fetchFeedbacks:', e); }
    initUserFeedbackForm();
    initFeedbackAdminForm();
    dismissSplash();
    console.log('🔥 Zeus Shop Full-stack REST API Web đã sẵn sàng!');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// --- 25. HERO SECTION HOOKS ---
// Nút Nạp Tiền Ngay trong hero
document.getElementById('heroTopupBtn')?.addEventListener('click', () => {
    openTopupModal();
});

// Cập nhật tên shop & mô tả từ settings API sau khi load
async function updateHeroFromSettings() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.settings) {
            const s = data.settings;
            const nameEl = document.getElementById('heroShopName');
            const descEl = document.getElementById('heroShopDesc');
            const logoEl = document.getElementById('heroLogoIcon');
            if (nameEl && s.shop_name) nameEl.textContent = s.shop_name;
            if (descEl && s.shop_description) descEl.textContent = s.shop_description;
            if (logoEl && s.logo_url) { logoEl.src = s.logo_url; logoEl.onerror = () => { logoEl.src = '/logo.png'; }; }
        }
    } catch (e) { /* dùng default */ }
}
updateHeroFromSettings();

// Đồng bộ số dư tự động sau webhook, không cần F5. Chỉ chạy khi đã đăng nhập.
if (!window.__zeusBalanceSyncTimer) {
    window.__zeusBalanceSyncTimer = setInterval(async () => {
        if (!currentUser || !authToken) return;
        try {
            const res = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${authToken}` }, cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();
            if (data.success && data.user) {
                const oldBalance = Number(currentUser.balance || 0);
                const newBalance = Number(data.user.balance || 0);
                currentUser = data.user;
                updateNavbar();
                if (newBalance > oldBalance) {
                    const delta = newBalance - oldBalance;
                    // Chỉ coi là "nạp tiền thành công" nếu ĐANG có 1 payCode được tạo
                    // trong phiên này (tức user đã bấm "Tạo QR"). Đây là bằng chứng thực
                    // sự có 1 giao dịch nạp tiền đang chờ — tránh 2 lỗi đối lập:
                    //  1) Không dùng topupActive làm điều kiện độc lập: nếu chỉ vì modal
                    //     QR đang mở (kể cả lúc chưa tạo QR) mà có số dư tăng do lý do
                    //     khác không liên quan, KHÔNG được tự đóng modal user vừa mở.
                    //  2) Không xoá payCode khi user chỉ đóng modal (xem handler click
                    //     outside) — nên dù đã đóng modal, tiền về trễ vẫn được nhận
                    //     diện đúng và hiện popup.
                    const hadPayCode = window.__topup && window.__topup.payCode;
                    if (window.__topup && window.__topup.pollTimer) { clearInterval(window.__topup.pollTimer); window.__topup.pollTimer = null; }
                    if (hadPayCode) {
                        topupSuccess(delta, newBalance);
                    }
                }
            }
        } catch (_) {}
    }, 8000);
}

/* ===== HUY HOÀNG MERGE: SUPPORT UX + RANDOM SAFETY ===== */
(function(){
  const boot=()=>{
    // Make the existing support chat feel like a real customer-support widget.
    const modal=document.getElementById('supportChatModal');
    const close=document.getElementById('supportChatClose');
    if(modal){
      modal.addEventListener('click',e=>{if(e.target===modal && typeof close?.click==='function') close.click()});
    }
    // Keyboard shortcuts: ESC closes support/random confirmation.
    document.addEventListener('keydown',e=>{
      if(e.key!=='Escape') return;
      document.getElementById('randomConfirmModal')?.querySelector('.random-confirm-modal-close')?.click();
      if(modal?.classList.contains('active')) close?.click();
    });
    // Prevent accidental double-submit on support chat.
    const form=document.getElementById('supportSendForm');
    if(form) form.addEventListener('submit',()=>{const b=form.querySelector('button[type=submit]');if(b){b.disabled=true;setTimeout(()=>b.disabled=false,700)}});
    // Ensure confirmation is never visible before a card is selected.
    const observer=new MutationObserver(()=>{
      const c=document.getElementById('randomConfirmModal');
      if(c && typeof window.selectedDrawCard!=='undefined' && window.selectedDrawCard===null) c.remove();
    });
    observer.observe(document.body,{childList:true});
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

// Interactive Material Ripple Click Effect
document.addEventListener('click', function(e) {
    const target = e.target.closest('.btn-primary, .btn-buy, .btn-secondary, .badge-btn, .support-floating-btn, .random-product-open');
    if (!target) return;
    try {
        const circle = document.createElement('span');
        const diameter = Math.max(target.clientWidth, target.clientHeight);
        const radius = diameter / 2;
        const rect = target.getBoundingClientRect();
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${e.clientX - rect.left - radius}px`;
        circle.style.top = `${e.clientY - rect.top - radius}px`;
        circle.classList.add('zeus-ripple');
        const existing = target.querySelector('.zeus-ripple');
        if (existing) existing.remove();
        target.appendChild(circle);
        setTimeout(() => circle.remove(), 600);
    } catch(err) {}
});

window.addEventListener('resize', () => syncMobileNavAccount());

// === Popup nạp tiền thành công ===
document.addEventListener('click', function(e) {
    if (e.target.closest('#topupSuccessClose')) {
        var sm = document.getElementById('topupSuccessModal');
        closeModal(sm);
        // Reset flag để lần nạp tiền tiếp theo có thể hiện lại popup
        if (window.__topup) window.__topup.successShown = false;
    }
});


// ===== ADMIN: FILE TẢI XUỐNG MIỄN PHÍ (tách riêng khỏi Kho Sản phẩm) =====
const FREE_FILE_CATEGORY = 'download';

function freeFileEsc(v) { return escapeHtml(String(v ?? '')); }

window.resetFreeFileForm = function resetFreeFileForm() {
    const form = document.getElementById('addFreeFileForm');
    if (form) form.reset();
    const editId = document.getElementById('freeFileEditId');
    if (editId) editId.value = '';
    const platforms = document.getElementById('freeFilePlatforms');
    if (platforms) platforms.value = 'Windows';
    document.querySelector('input[name="freeFileSource"][value="link"]')?.click();
    const title = document.getElementById('freeFileFormTitle');
    if (title) title.innerHTML = '<i class="fas fa-gift" style="color:#22c55e;"></i> Thêm file miễn phí';
    const submit = document.getElementById('freeFileSubmitBtn');
    if (submit) submit.innerHTML = '<i class="fas fa-check"></i> Thêm file miễn phí';
    const status = document.getElementById('freeFileUploadStatus');
    if (status) status.textContent = '';
    const selectedName = document.getElementById('freeFileSelectedName');
    if (selectedName) selectedName.textContent = 'Chưa chọn file';
    const imageFile = document.getElementById('freeFileImageFile');
    if (imageFile) imageFile.value = '';
    const imageStatus = document.getElementById('freeFileImageUploadStatus');
    if (imageStatus) imageStatus.textContent = '';
    const imagePreviewWrap = document.getElementById('freeFileImagePreviewWrap');
    if (imagePreviewWrap) imagePreviewWrap.style.display = 'none';
    const imagePreview = document.getElementById('freeFileImagePreview');
    if (imagePreview) imagePreview.removeAttribute('src');
    const wrap = document.getElementById('freeFileUploadProgressWrap');
    if (wrap) wrap.style.display = 'none';
    const bar = document.getElementById('freeFileUploadProgressBar');
    if (bar) bar.style.width = '0%';
    const value = document.getElementById('freeFileUploadProgressValue');
    if (value) value.textContent = '0%';
}

async function loadAdminFreeFiles() {
    const body = document.getElementById('adminFreeFilesTableBody');
    if (!body) return;
    body.innerHTML = '<tr><td colspan="4" style="text-align:center;">Đang tải...</td></tr>';
    try {
        const data = await api('/api/products?category=download&sort=newest');
        const products = Array.isArray(data?.products) ? data.products : [];
        const files = products.filter(p => String(p.category || '').toLowerCase() === FREE_FILE_CATEGORY && String(p.product_type || '').toLowerCase() === 'free_file');
        if (!files.length) {
            body.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#a78bfa;">Chưa có file miễn phí. Bấm “Thêm file FREE” để tạo.</td></tr>';
            return;
        }
        body.innerHTML = files.map(p => `<tr>
            <td><b>${freeFileEsc(p.name)}</b><br><small style="color:#94a3b8">${freeFileEsc(p.description || '')}</small></td>
            <td>${freeFileEsc(Array.isArray(p.platforms) ? p.platforms.join(', ') : (p.platforms || '—'))}</td>
            <td><span style="color:#22c55e;"><i class="fas fa-gift"></i> FREE</span><br><small style="color:#94a3b8;word-break:break-all;">${freeFileEsc(p.download_url || '')}</small></td>
            <td style="white-space:nowrap;">
                <button class="btn-primary" style="font-size:11px;padding:5px 9px;margin-right:5px;" onclick="editFreeFile(${Number(p.id)})"><i class="fas fa-pen"></i> Sửa</button>
                <button class="btn-danger" style="font-size:11px;padding:5px 9px;" onclick="deleteFreeFile(${Number(p.id)})"><i class="fas fa-trash"></i> Xóa</button>
            </td>
        </tr>`).join('');
    } catch (err) {
        body.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#f87171;">Không thể tải danh sách file FREE: ${freeFileEsc(err.message || 'Lỗi không xác định')}</td></tr>`;
    }
}

function getFreeFileSource() {
    return document.querySelector('input[name="freeFileSource"]:checked')?.value || 'link';
}

window.syncFreeFileSourceUI = function syncFreeFileSourceUI() {
    const source = getFreeFileSource();
    const linkWrap = document.getElementById('freeFileLinkWrap');
    const uploadWrap = document.getElementById('freeFileUploadWrap');
    const url = document.getElementById('freeFileUrl');
    const upload = document.getElementById('freeFileUpload');
    const editId = document.getElementById('freeFileEditId')?.value;
    if (linkWrap) linkWrap.style.display = source === 'link' ? 'block' : 'none';
    if (uploadWrap) uploadWrap.style.display = source === 'upload' ? 'block' : 'none';
    if (url) url.required = source === 'link';
    if (upload) upload.required = source === 'upload';
    const label = document.getElementById('freeFileUploadLabel');
    if (label) label.textContent = editId ? 'Chọn file mới để thay file cũ' : 'Chọn file từ máy';
}

document.querySelectorAll('input[name="freeFileSource"]').forEach(el => el.addEventListener('change', syncFreeFileSourceUI));
syncFreeFileSourceUI();

function getAuthTokenForFreeFile() {
    return authToken || (typeof ZeusEncryptedStorage !== 'undefined' ? ZeusEncryptedStorage.getItem('Xiters_auth_token') : null) || '';
}

function uploadFreeFileWithProgress(file) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', file);
        const wrap = document.getElementById('freeFileUploadProgressWrap');
        const bar = document.getElementById('freeFileUploadProgressBar');
        const value = document.getElementById('freeFileUploadProgressValue');
        const text = document.getElementById('freeFileUploadProgressText');
        const status = document.getElementById('freeFileUploadStatus');
        if (wrap) wrap.style.display = 'block';
        if (text) text.textContent = `Đang upload “${file.name}”...`;
        if (status) status.textContent = `⏳ ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
        xhr.upload.addEventListener('progress', (event) => {
            if (!event.lengthComputable) return;
            const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
            if (bar) bar.style.width = `${percent}%`;
            if (value) value.textContent = `${percent}%`;
            if (text) text.textContent = percent >= 100 ? 'Đang xử lý file trên máy chủ...' : `Đang upload “${file.name}”...`;
        });
        xhr.addEventListener('load', () => {
            let data = {};
            try { data = xhr.responseText ? JSON.parse(xhr.responseText) : {}; } catch (_) { data = { detail: xhr.responseText || `HTTP ${xhr.status}` }; }
            if (xhr.status >= 200 && xhr.status < 300 && data.success && data.download_url) {
                if (bar) bar.style.width = '100%';
                if (value) value.textContent = '100%';
                if (status) status.textContent = `✅ Đã upload: ${file.name}`;
                resolve(data);
            } else {
                reject(new Error(data.detail || data.message || `Upload thất bại (HTTP ${xhr.status})`));
            }
        });
        xhr.addEventListener('error', () => reject(new Error('Mất kết nối khi upload file.')));
        xhr.addEventListener('abort', () => reject(new Error('Đã hủy upload file.')));
        xhr.open('POST', `${API_BASE}/api/admin/free-files/upload`, true);
        xhr.setRequestHeader('Authorization', `Bearer ${getAuthTokenForFreeFile()}`);
        xhr.send(formData);
    });
}

async function uploadFreeFileImage(file) {
    if (!file) return null;
    if (file.size > 10 * 1024 * 1024) throw new Error('Ảnh vượt quá giới hạn 10MB.');
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowed.includes((file.type || '').toLowerCase())) throw new Error('Chỉ hỗ trợ PNG, JPG, JPEG, WEBP hoặc GIF.');
    const status = document.getElementById('freeFileImageUploadStatus');
    const previewWrap = document.getElementById('freeFileImagePreviewWrap');
    const preview = document.getElementById('freeFileImagePreview');
    if (status) status.textContent = `⏳ Đang tải ảnh “${file.name}” lên máy chủ...`;
    const formData = new FormData();
    formData.append('file', file);
    const token = getAuthTokenForFreeFile();
    const res = await fetch(`${API_BASE}/api/admin/free-files/upload-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
    const raw = await res.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch (_) { data = { detail: raw || `HTTP ${res.status}` }; }
    if (!res.ok || !data.success || !data.image_url) throw new Error(data.detail || data.message || `Upload ảnh thất bại (HTTP ${res.status})`);
    const imageInput = document.getElementById('freeFileImage');
    if (imageInput) imageInput.value = data.image_url;
    if (preview) preview.src = data.image_url;
    if (previewWrap) previewWrap.style.display = 'block';
    if (status) status.textContent = `✅ Đã tải ảnh: ${file.name}`;
    return data.image_url;
}

document.getElementById('freeFileUpload')?.addEventListener('change', function () {
    const file = this.files?.[0];
    const selectedName = document.getElementById('freeFileSelectedName');
    if (selectedName) selectedName.textContent = file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)}MB` : 'Chưa chọn file';
});

document.getElementById('freeFileImageFile')?.addEventListener('change', async function () {
    const file = this.files?.[0];
    if (!file) return;
    try {
        await uploadFreeFileImage(file);
    } catch (err) {
        const status = document.getElementById('freeFileImageUploadStatus');
        if (status) status.textContent = `❌ ${err.message || 'Upload ảnh thất bại'}`;
        Toast.show(`❌ ${err.message || 'Upload ảnh thất bại'}`, 'error');
    } finally {
        this.value = '';
    }
});

document.getElementById('freeFileImage')?.addEventListener('input', function () {
    const url = this.value.trim();
    const wrap = document.getElementById('freeFileImagePreviewWrap');
    const preview = document.getElementById('freeFileImagePreview');
    if (!url || !preview || !wrap) {
        if (wrap) wrap.style.display = 'none';
        return;
    }
    preview.onload = () => { wrap.style.display = 'block'; };
    preview.onerror = () => { wrap.style.display = 'none'; };
    preview.src = url;
});

document.getElementById('addFreeFileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = sanitizeInput(document.getElementById('freeFileName').value, 'text');
    const source = getFreeFileSource();
    const editId = Number(document.getElementById('freeFileEditId')?.value || 0);
    const image = document.getElementById('freeFileImage').value.trim();
    const description = sanitizeInput(document.getElementById('freeFileDescription').value, 'text');
    const platforms = document.getElementById('freeFilePlatforms').value.split(',').map(x => x.trim()).filter(Boolean);
    const urlInput = document.getElementById('freeFileUrl');
    const uploadInput = document.getElementById('freeFileUpload');
    const statusEl = document.getElementById('freeFileUploadStatus');

    if (!name) return Toast.show('❌ Vui lòng nhập tên file.', 'error');
    if (!platforms.length) return Toast.show('❌ Vui lòng nhập ít nhất một nền tảng.', 'error');
    if (image && !DataValidator.isValidURL(image) && !/^\/(uploads|files)\//i.test(image)) return Toast.show('❌ URL ảnh không hợp lệ.', 'error');

    let download_url = '';
    try {
        if (source === 'link') {
            download_url = urlInput.value.trim();
            if (!download_url) return Toast.show('❌ Vui lòng nhập link tải file.', 'error');
            if (!DataValidator.isValidURL(download_url) && !/^\/(uploads|files)\//i.test(download_url)) return Toast.show('❌ Link tải không hợp lệ.', 'error');
        } else {
            const file = uploadInput?.files?.[0];
            if (!file) return Toast.show(editId ? '❌ Vui lòng chọn file mới để thay file cũ.' : '❌ Vui lòng chọn file để upload.', 'error');
            if (file.size > 200 * 1024 * 1024) return Toast.show('❌ File vượt quá giới hạn 200MB.', 'error');
            Toast.show(`⏳ ${editId ? 'Đang thay' : 'Đang upload'} file FREE “${file.name}”...`, 'info', 2500);
            const uploadData = await uploadFreeFileWithProgress(file);
            download_url = uploadData.download_url;
        }

        const payload = { name, platforms, image, description, download_url };
        let data;
        if (editId > 0) {
            data = await api(`/api/admin/free-files/${editId}`, 'PUT', payload, true);
        } else {
            data = await api('/api/admin/free-files', 'POST', payload, true);
        }

        Toast.show(`✅ ${data.message || (editId ? 'Đã cập nhật file FREE.' : 'Đã thêm file miễn phí.')}`, 'success');
        const box = document.getElementById('addFreeFileFormContainer');
        if (box) box.style.display = 'none';
        resetFreeFileForm();
        await loadAdminFreeFiles();
        if (typeof loadProducts === 'function') loadProducts();
        if (typeof fetchProducts === 'function') fetchProducts();
    } catch (err) {
        if (statusEl && source === 'upload') statusEl.textContent = `❌ ${err.message || 'Upload thất bại'}`;
        Toast.show(`❌ ${err.message || 'Có lỗi xảy ra.'}`, 'error');
    }
});

window.editFreeFile = async function(id) {
    try {
        const res = await api(`/api/products/${id}`);
        if (!res.success || !res.product) throw new Error('Không tìm thấy file FREE.');
        const p = res.product;
        if (String(p.category || '').toLowerCase() !== FREE_FILE_CATEGORY || String(p.product_type || '').toLowerCase() !== 'free_file') {
            throw new Error('Sản phẩm này không thuộc khu File FREE.');
        }
        const box = document.getElementById('addFreeFileFormContainer');
        if (box) box.style.display = 'block';
        document.getElementById('freeFileEditId').value = p.id;
        document.getElementById('freeFileName').value = p.name || '';
        document.getElementById('freeFilePlatforms').value = Array.isArray(p.platforms) ? p.platforms.join(', ') : (p.platforms || 'Windows');
        document.getElementById('freeFileUrl').value = p.download_url || '';
        document.getElementById('freeFileImage').value = p.image || '';
        document.getElementById('freeFileDescription').value = p.description || '';
        document.querySelector('input[name="freeFileSource"][value="link"]')?.click();
        const title = document.getElementById('freeFileFormTitle');
        if (title) title.innerHTML = '<i class="fas fa-pen" style="color:#22c55e;"></i> Chỉnh sửa file FREE';
        const submit = document.getElementById('freeFileSubmitBtn');
        if (submit) submit.innerHTML = '<i class="fas fa-save"></i> Lưu cập nhật file FREE';
        syncFreeFileSourceUI();
        box?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
        Toast.show(`❌ ${err.message || 'Không thể mở file FREE.'}`, 'error');
    }
};

window.deleteFreeFile = async function(id) {
    if (!confirm('Xóa file miễn phí này?')) return;
    try {
        const data = await api(`/api/admin/free-files/${id}`, 'DELETE', null, true);
        Toast.show(`✅ ${data.message || 'Đã xóa file miễn phí.'}`, 'success');
        await loadAdminFreeFiles();
        if (typeof loadProducts === 'function') loadProducts();
        if (typeof fetchProducts === 'function') fetchProducts();
    } catch (err) {
        Toast.show(`❌ ${err.message || 'Không thể xóa file.'}`, 'error');
    }
};

// Tự tải khi mở tab File FREE.
document.querySelector('[data-tab="tab-free-downloads"]')?.addEventListener('click', () => setTimeout(loadAdminFreeFiles, 50));

