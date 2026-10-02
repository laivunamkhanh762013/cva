function generateBannerImage(gameName, category = 'ff') {
    // High-performance SVG Data URL (Scalable, lightweight, Zero CPU overhead, No Memory Leaks)
    const title = 'LIX VIP';
    const rawSub = String(gameName || '').toUpperCase().slice(0, 24);
    const escapeXml = (str) => String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const safeTitle = escapeXml(title);
    const safeSub = escapeXml(rawSub);

    let c1 = '#e01030', c2 = '#150303';
    if (category === 'dpi') { c1 = '#0284c7'; c2 = '#082f49'; }
    else if (category === 'filza') { c1 = '#9333ea'; c2 = '#1e1b4b'; }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">
        <defs>
            <radialGradient id="g" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stop-color="${c1}" />
                <stop offset="100%" stop-color="${c2}" />
            </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)" />
        <rect x="12" y="12" width="376" height="216" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2" rx="8" />
        <text x="200" y="95" fill="#ffffff" font-size="48" font-family="system-ui, sans-serif" font-weight="900" text-anchor="middle" letter-spacing="2">${safeTitle}</text>
        <text x="200" y="160" fill="#fde047" font-size="20" font-family="system-ui, sans-serif" font-weight="bold" text-anchor="middle">${safeSub}</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

(function (window, document, productsData) {
    'use strict';

    /**
     * Application Configuration & Backend API Gateway Specification
     * In enterprise deployment, client delegates state mutation to secure REST/GraphQL endpoints.
     */
    const CONFIG = {
        MAX_QUANTITY: 10,
        MIN_QUANTITY: 1,
        SEARCH_DEBOUNCE_MS: 200,
        TOAST_MAX_COUNT: 3,
        TOAST_DURATION_MS: 3000,
        TOAST_FADE_MS: 250,
        API_ENDPOINTS: {
            CHECKOUT: '/api/v1/orders/checkout',
            BALANCE: '/api/v1/user/balance',
            CONFIG_PAYMENT: '/api/v1/config/payment-info'
        },
        DEFAULT_PAYMENT: {
            BANK_ACCOUNT: "0388888888",
            BANK_NAME: "MB BANK (Quân Đội)",
            BANK_MEMO: "NAP LIXSHOP"
        },
        STORAGE_KEYS: {
            ORDERS: 'lix_orders',
            BALANCE: 'lix_balance',
            USERNAME: 'lix_username',
            THEME: 'lix_theme'
        }
    };

    const state = {
        filter: 'all',
        sort: 'default',
        searchQuery: '',
        selectedProduct: null,
        quantity: 1,
        userBalance: 500000,
        userOrders: [],
        currentTheme: 'dark',
        paymentInfo: { ...CONFIG.DEFAULT_PAYMENT }
    };

    const DOM = {};

    function initDOMCache() {
        Object.assign(DOM, {
            productGrid: document.getElementById('productGrid'),
            productCount: document.getElementById('productCount'),
            searchInput: document.getElementById('searchInput'),
            categoriesList: document.getElementById('categoriesList'),
            sortList: document.getElementById('sortList'),
            userBalance: document.getElementById('userBalance'),
            themeToggle: document.getElementById('themeToggle'),
            toastContainer: document.getElementById('toastContainer'),
            
            productModal: document.getElementById('productModal'),
            topupModal: document.getElementById('topupModal'),
            historyModal: document.getElementById('historyModal'),
            loginModal: document.getElementById('loginModal'),

            modalProductName: document.getElementById('modalProductName'),
            modalProductPrice: document.getElementById('modalProductPrice'),
            modalProductPlatforms: document.getElementById('modalProductPlatforms'),
            modalProductDesc: document.getElementById('modalProductDesc'),
            modalImgBox: document.getElementById('modalImgBox'),
            qtyInput: document.getElementById('qtyInput'),
            qtyMinus: document.getElementById('qtyMinus'),
            qtyPlus: document.getElementById('qtyPlus'),
            totalPriceDisplay: document.getElementById('totalPriceDisplay'),
            btnBuyNow: document.getElementById('btnBuyNow'),
            btnDepositPrompt: document.getElementById('btnDepositPrompt'),

            historyList: document.getElementById('historyList'),

            counts: {
                all: document.getElementById('count-all'),
                aimlock: document.getElementById('count-aimlock'),
                dpi: document.getElementById('count-dpi'),
                filza: document.getElementById('count-filza')
            },

            loginForm: document.getElementById('loginForm'),
            loginUsername: document.getElementById('loginUsername'),
            loginNavBtn: document.getElementById('loginNavBtn'),

            topupNavBtn: document.getElementById('topupNavBtn'),
            heroTopupBtn: document.getElementById('heroTopupBtn'),
            footerTopupBtn: document.getElementById('footerTopupBtn'),
            historyNavBtn: document.getElementById('historyNavBtn'),
            footerHistoryBtn: document.getElementById('footerHistoryBtn'),
            copyBankAccBtn: document.getElementById('copyBankAccBtn'),
            copyBankMemoBtn: document.getElementById('copyBankMemoBtn')
        });
    }

    function formatCurrency(amount) {
        const num = Number(amount);
        if (isNaN(num)) return '0 ₫';
        return num.toLocaleString('vi-VN') + ' ₫';
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    function generateSecureOrderId() {
        if (window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID().slice(0, 8).toUpperCase();
        }
        return (Date.now().toString(36) + Math.random().toString(36).substring(2, 6)).toUpperCase().slice(-8);
    }

    function showToast(message, type = 'success') {
        if (!DOM.toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icon = document.createElement('i');
        icon.className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation'}`;
        const text = document.createElement('span');
        text.textContent = message;
        toast.appendChild(icon);
        toast.appendChild(text);
        const activeToasts = DOM.toastContainer.querySelectorAll('.toast');
        if (activeToasts.length >= CONFIG.TOAST_MAX_COUNT) {
            activeToasts[0].remove();
        }
        DOM.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(8px)';
            setTimeout(() => toast.remove(), CONFIG.TOAST_FADE_MS);
        }, CONFIG.TOAST_DURATION_MS);
    }

    let lastActiveElement = null;
    const modalKeyHandlers = new WeakMap();

    function openModal(modal) {
        if (!modal) return;
        lastActiveElement = document.activeElement;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusableElements.length > 0) {
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            firstElement.focus();

            if (modalKeyHandlers.has(modal)) {
                modal.removeEventListener('keydown', modalKeyHandlers.get(modal));
            }

            const handler = function(e) {
                if (e.key === 'Tab') {
                    if (e.shiftKey) {
                        if (document.activeElement === firstElement || !modal.contains(document.activeElement)) {
                            e.preventDefault();
                            lastElement.focus();
                        }
                    } else {
                        if (document.activeElement === lastElement || !modal.contains(document.activeElement)) {
                            e.preventDefault();
                            firstElement.focus();
                        }
                    }
                }
            };
            modalKeyHandlers.set(modal, handler);
            modal.addEventListener('keydown', handler);
        }
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (modalKeyHandlers.has(modal)) {
            modal.removeEventListener('keydown', modalKeyHandlers.get(modal));
            modalKeyHandlers.delete(modal);
        }
        if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
            lastActiveElement.focus();
            lastActiveElement = null;
        }
    }

    function persistAppState() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.ORDERS, JSON.stringify(state.userOrders));
            localStorage.setItem(CONFIG.STORAGE_KEYS.BALANCE, state.userBalance.toString());
        } catch (err) {
            console.error('[LixShop] Failed to persist state:', err);
        }
    }

    function loadAppState() {
        try {
            const savedOrders = localStorage.getItem(CONFIG.STORAGE_KEYS.ORDERS);
            if (savedOrders) state.userOrders = JSON.parse(savedOrders);

            const savedBalance = localStorage.getItem(CONFIG.STORAGE_KEYS.BALANCE);
            if (savedBalance !== null && !isNaN(Number(savedBalance))) {
                state.userBalance = Number(savedBalance);
            }

            const savedUser = localStorage.getItem(CONFIG.STORAGE_KEYS.USERNAME);
            if (savedUser) updateLoginUI(savedUser);

            const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) || 'dark';
            setTheme(savedTheme);
        } catch (err) {
            console.warn('[LixShop] LocalStorage not accessible:', err);
        }
        updateBalanceUI();
    }


    function updateLoginUI(username) {
        if (!DOM.loginNavBtn) return;
        DOM.loginNavBtn.replaceChildren();
        const icon = document.createElement('i');
        icon.className = 'fas fa-user-check';
        DOM.loginNavBtn.appendChild(icon);
        DOM.loginNavBtn.appendChild(document.createTextNode(' ' + username));
    }

    function updateBalanceUI() {
        if (!DOM.userBalance) return;
        DOM.userBalance.replaceChildren();
        const icon = document.createElement('i');
        icon.className = 'fas fa-wallet';
        DOM.userBalance.appendChild(icon);
        DOM.userBalance.appendChild(document.createTextNode(' ' + formatCurrency(state.userBalance)));
        DOM.userBalance.style.display = 'inline-flex';
    }

    function setTheme(theme) {
        state.currentTheme = theme;
        document.body.setAttribute('data-theme', theme);
        if (DOM.themeToggle) {
            DOM.themeToggle.replaceChildren();
            const icon = document.createElement('i');
            icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
            DOM.themeToggle.appendChild(icon);
        }
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, theme);
        } catch (e) { console.warn('[LixShop] Theme persistence warning:', e); }
    }

    function getFilteredProducts() {
        if (!Array.isArray(productsData)) return [];
        return productsData.filter(p => {
            const matchesFilter = state.filter === 'all' || p.category === state.filter;
            const matchesSearch = !state.searchQuery ||
                (p.name || '').toLowerCase().includes(state.searchQuery) ||
                (p.description || '').toLowerCase().includes(state.searchQuery);
            return matchesFilter && matchesSearch;
        }).sort((a, b) => {
            if (state.sort === 'price_asc') return a.price - b.price;
            if (state.sort === 'price_desc') return b.price - a.price;
            return Number(a.id || 0) - Number(b.id || 0);
        });
    }

    const bannerCache = new Map();
    function getCachedBannerImage(name, category) {
        const key = `${name}_${category}`;
        if (bannerCache.has(key)) return bannerCache.get(key);
        const dataUrl = generateBannerImage(name, category);
        bannerCache.set(key, dataUrl);
        return dataUrl;
    }

    // Render Cards following EXACT shoplixvip original layout with DocumentFragment performance
    function renderProducts() {
        if (!DOM.productGrid) return;
        const products = getFilteredProducts();

        if (DOM.productCount) {
            DOM.productCount.textContent = products.length;
        }

        DOM.productGrid.replaceChildren();
        const fragment = document.createDocumentFragment();

        // Lucky Draw Card (Original shoplixvip feature)
        if (state.filter !== 'download') {
            const luckyCard = document.createElement('div');
            luckyCard.className = 'random-product-card';
            luckyCard.id = 'randomProductCard';
            luckyCard.setAttribute('role', 'button');
            luckyCard.setAttribute('tabindex', '0');
            luckyCard.setAttribute('aria-label', 'Bốc thăm trúng thưởng');
            luckyCard.innerHTML = `
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
            `;
            fragment.appendChild(luckyCard);
        }

        if (products.length === 0) {
            const emptyBox = document.createElement('div');
            emptyBox.className = 'no-products';
            emptyBox.innerHTML = `
                <i class="fas fa-box-open empty-icon"></i>
                <p>Không tìm thấy sản phẩm phù hợp.</p>
            `;
            fragment.appendChild(emptyBox);
            DOM.productGrid.appendChild(fragment);
            return;
        }

        products.forEach((p, idx) => {
            const imgSrc = getCachedBannerImage(p.name, p.category);
            const platforms = Array.isArray(p.platforms) ? p.platforms : ['iOS', 'Android', 'PC'];
            const safeName = escapeHtml(p.name);
            const safeDesc = escapeHtml(p.description);
            const features = Array.isArray(p.features) ? p.features : [];
            const featuresHtml = features.length > 0
                ? `<ul class="product-features">${features.map(f => `<li><i class="fas fa-check"></i> <span>${escapeHtml(f)}</span></li>`).join('')}</ul>`
                : '';
            const priceFormatted = Number(p.price || 0).toLocaleString('vi-VN') + ' <small>VNĐ</small>';

            const card = document.createElement('div');
            card.className = 'product-card';
            card.dataset.id = String(p.id);
            card.style.setProperty('--card-index', String(idx + 1));
            card.innerHTML = `
                <div class="product-img">
                    <img src="${imgSrc}" alt="${safeName}" loading="lazy" decoding="async">
                    <span class="badge"><span class="dot"></span> ${escapeHtml(p.badge || 'VIP')}</span>
                </div>
                <div class="product-info">
                    <div class="product-meta-row">
                        <div class="product-platforms">
                            ${platforms.map(pl => `<span>${escapeHtml(pl)}</span>`).join('')}
                        </div>
                        <span class="product-stat stat-sold"><i class="fas fa-fire"></i> Đã bán ${Number(120 + p.id * 18).toLocaleString()}</span>
                    </div>
                    <h3 class="product-name" title="${safeName}">${safeName}</h3>
                    <p class="product-description" title="${safeDesc}">${safeDesc}</p>
                    ${featuresHtml}
                    <div class="product-buy-row">
                        <div class="price">${priceFormatted}</div>
                        <button class="btn-order" data-id="${escapeHtml(p.id)}" type="button"><i class="fas fa-cart-shopping"></i> Mua ngay</button>
                    </div>
                </div>
            `;
            fragment.appendChild(card);
        });

        DOM.productGrid.appendChild(fragment);
    }

    function updateCategoryCounts() {
        if (!Array.isArray(productsData)) return;

        const counts = productsData.reduce((acc, p) => {
            acc.all = (acc.all || 0) + 1;
            acc[p.category] = (acc[p.category] || 0) + 1;
            return acc;
        }, { all: 0, aimlock: 0, dpi: 0, filza: 0 });

        if (DOM.counts.all) DOM.counts.all.textContent = counts.all;
        if (DOM.counts.aimlock) DOM.counts.aimlock.textContent = counts.aimlock;
        if (DOM.counts.dpi) DOM.counts.dpi.textContent = counts.dpi;
        if (DOM.counts.filza) DOM.counts.filza.textContent = counts.filza;
    }

    function isValidQuantity(qty) {
        const num = parseInt(qty, 10);
        return !isNaN(num) && num >= CONFIG.MIN_QUANTITY && num <= CONFIG.MAX_QUANTITY;
    }

    function openProductModal(productId) {
        const targetId = Number(productId);
        const product = productsData.find(p => Number(p.id) === targetId);
        if (!product) return;

        state.selectedProduct = product;
        state.quantity = 1;
        if (DOM.qtyInput) DOM.qtyInput.value = "1";

        DOM.modalProductName.textContent = product.name;
        DOM.modalProductPrice.textContent = formatCurrency(product.price);
        DOM.modalProductPlatforms.textContent = (product.platforms || []).join(' • ');
        DOM.modalProductDesc.textContent = product.description;

        if (DOM.modalImgBox) {
            const banner = generateBannerImage(product.name, product.category);
            DOM.modalImgBox.innerHTML = `<img src="${banner}" alt="${escapeHtml(product.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
        }

        updateModalPrice();
        openModal(DOM.productModal);
    }

    function updateModalPrice() {
        if (!state.selectedProduct) return;
        if (!isValidQuantity(state.quantity)) {
            showToast('Số lượng mua không hợp lệ!', 'error');
            return;
        }
        const qty = parseInt(state.quantity, 10);
        const total = state.selectedProduct.price * qty;
        if (DOM.totalPriceDisplay) {
            DOM.totalPriceDisplay.textContent = `Tổng: ${formatCurrency(total)}`;
        }
    }

    function handleBuyNow() {
        if (!state.selectedProduct) return;
        if (!isValidQuantity(state.quantity)) {
            showToast('Số lượng mua không hợp lệ!', 'error');
            return;
        }

        const qty = parseInt(state.quantity, 10);
        const total = state.selectedProduct.price * qty;

        if (state.userBalance < total) {
            showToast(`Số dư không đủ (${formatCurrency(state.userBalance)}). Vui lòng nạp thêm tiền!`, 'error');
            return;
        }

        // Prevent double submit
        if (DOM.btnBuyNow) {
            DOM.btnBuyNow.disabled = true;
            DOM.btnBuyNow.classList.add('loading');
        }

        try {
            state.userBalance -= total;
            updateBalanceUI();

            const orderId = generateSecureOrderId();
            const newOrder = {
                id: orderId,
                productName: state.selectedProduct.name,
                quantity: qty,
                total: total,
                key: `LIX-${state.selectedProduct.name.replace(/\s+/g, '').toUpperCase()}-${orderId}`,
                date: new Date().toLocaleString('vi-VN')
            };

            state.userOrders.unshift(newOrder);
            persistAppState();

            closeModal(DOM.productModal);
            showToast(`Mua thành công ${state.selectedProduct.name}! Đã thanh toán ${formatCurrency(total)}.`, 'success');
        } finally {
            if (DOM.btnBuyNow) {
                DOM.btnBuyNow.disabled = false;
                DOM.btnBuyNow.classList.remove('loading');
            }
        }
    }

    function renderHistory() {
        if (!DOM.historyList) return;
        DOM.historyList.replaceChildren();

        if (state.userOrders.length === 0) {
            const emptyHistory = document.createElement('div');
            emptyHistory.className = 'history-empty-box';
            
            const emptyIcon = document.createElement('i');
            emptyIcon.className = 'fas fa-receipt history-empty-icon';
            const emptyText = document.createElement('p');
            emptyText.textContent = 'Chưa có giao dịch mua hàng nào được ghi nhận.';
            
            emptyHistory.appendChild(emptyIcon);
            emptyHistory.appendChild(emptyText);
            DOM.historyList.appendChild(emptyHistory);
            return;
        }

        const fragment = document.createDocumentFragment();

        state.userOrders.forEach(order => {
            const box = document.createElement('div');
            box.className = 'history-item-card';

            const headerRow = document.createElement('div');
            headerRow.className = 'history-item-header';

            const nameEl = document.createElement('strong');
            nameEl.textContent = `${order.productName} (x${order.quantity})`;

            const priceEl = document.createElement('span');
            priceEl.className = 'history-item-price';
            priceEl.textContent = formatCurrency(order.total);

            headerRow.appendChild(nameEl);
            headerRow.appendChild(priceEl);

            const metaRow = document.createElement('div');
            metaRow.className = 'history-item-meta';

            const codeSpan = document.createElement('span');
            codeSpan.textContent = `Mã đơn: #${order.id}`;

            const dateSpan = document.createElement('span');
            dateSpan.textContent = order.date;

            metaRow.appendChild(codeSpan);
            metaRow.appendChild(dateSpan);

            const keyRow = document.createElement('div');
            keyRow.className = 'history-item-key-row';

            const keyLabel = document.createElement('span');
            keyLabel.appendChild(document.createTextNode('Key: '));
            const codeTag = document.createElement('code');
            codeTag.textContent = order.key;
            keyLabel.appendChild(codeTag);

            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'copy-key-btn';
            copyBtn.dataset.key = order.key;
            copyBtn.innerHTML = '<i class="fas fa-copy"></i> Sao chép';

            keyRow.appendChild(keyLabel);
            keyRow.appendChild(copyBtn);

            box.appendChild(headerRow);
            box.appendChild(metaRow);
            box.appendChild(keyRow);
            fragment.appendChild(box);
        });

        DOM.historyList.appendChild(fragment);
    }

    function copyToClipboard(text, message) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                showToast(message || `Đã sao chép: ${text}`, 'success');
            }).catch(() => {
                fallbackCopy(text, message);
            });
        } else {
            fallbackCopy(text, message);
        }
    }

    function fallbackCopy(text, message) {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) {
                showToast(message || `Đã sao chép: ${text}`, 'success');
            } else {
                showToast('Không thể sao chép tự động, vui lòng sao chép thủ công.', 'error');
            }
        } catch (err) {
            showToast('Không thể sao chép tự động, vui lòng sao chép thủ công.', 'error');
        }
    }

    function setupEventListeners() {
        if (DOM.productGrid) {
            DOM.productGrid.addEventListener('click', (e) => {
                const luckyCard = e.target.closest('#randomProductCard');
                if (luckyCard) {
                    showToast('Hệ thống bốc thăm may mắn: Đang mở sự kiện!', 'success');
                    return;
                }
                const buyBtn = e.target.closest('[data-id]');
                if (buyBtn) {
                    const productId = Number(buyBtn.dataset.id || buyBtn.getAttribute('data-id'));
                    if (productId) openProductModal(productId);
                }
            });

            DOM.productGrid.addEventListener('keydown', (e) => {
                const luckyCard = e.target.closest('#randomProductCard');
                if (luckyCard && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    showToast('Hệ thống bốc thăm may mắn: Đang mở sự kiện!', 'success');
                }
            });
        }

        if (DOM.searchInput) {
            DOM.searchInput.addEventListener('input', debounce((e) => {
                state.searchQuery = e.target.value.trim().toLowerCase();
                renderProducts();
            }, CONFIG.SEARCH_DEBOUNCE_MS));
        }

        if (DOM.categoriesList) {
            DOM.categoriesList.addEventListener('click', (e) => {
                const link = e.target.closest('.cat-item');
                if (!link) return;
                e.preventDefault();
                DOM.categoriesList.querySelectorAll('.cat-item').forEach(i => i.classList.remove('active'));
                link.classList.add('active');
                state.filter = link.getAttribute('data-cat') || 'all';
                renderProducts();
            });
        }

        if (DOM.sortList) {
            DOM.sortList.addEventListener('click', (e) => {
                const link = e.target.closest('.sort-item');
                if (!link) return;
                e.preventDefault();
                DOM.sortList.querySelectorAll('.sort-item').forEach(i => i.classList.remove('active'));
                link.classList.add('active');
                state.sort = link.getAttribute('data-sort') || 'default';
                renderProducts();
            });
        }

        if (DOM.qtyMinus) {
            DOM.qtyMinus.addEventListener('click', () => {
                if (state.quantity > CONFIG.MIN_QUANTITY) {
                    state.quantity--;
                    DOM.qtyInput.value = state.quantity;
                    updateModalPrice();
                }
            });
        }

        if (DOM.qtyPlus) {
            DOM.qtyPlus.addEventListener('click', () => {
                if (state.quantity < CONFIG.MAX_QUANTITY) {
                    state.quantity++;
                    DOM.qtyInput.value = state.quantity;
                    updateModalPrice();
                }
            });
        }

        if (DOM.btnBuyNow) {
            DOM.btnBuyNow.addEventListener('click', handleBuyNow);
        }

        if (DOM.btnDepositPrompt) {
            DOM.btnDepositPrompt.addEventListener('click', () => {
                closeModal(DOM.productModal);
                openModal(DOM.topupModal);
            });
        }

        document.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('.modal-close');
            if (closeBtn) {
                const parentModal = closeBtn.closest('.modal-overlay');
                if (parentModal) closeModal(parentModal);
                return;
            }
            if (e.target.classList && e.target.classList.contains('modal-overlay')) {
                closeModal(e.target);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m));
            }
        });

        const triggerTopup = (e) => {
            if (e) e.preventDefault();
            openModal(DOM.topupModal);
        };
        if (DOM.topupNavBtn) DOM.topupNavBtn.addEventListener('click', triggerTopup);
        if (DOM.heroTopupBtn) DOM.heroTopupBtn.addEventListener('click', triggerTopup);
        if (DOM.footerTopupBtn) DOM.footerTopupBtn.addEventListener('click', triggerTopup);

        const triggerHistory = (e) => {
            if (e) e.preventDefault();
            renderHistory();
            openModal(DOM.historyModal);
        };
        if (DOM.historyNavBtn) DOM.historyNavBtn.addEventListener('click', triggerHistory);
        if (DOM.footerHistoryBtn) DOM.footerHistoryBtn.addEventListener('click', triggerHistory);

        if (DOM.historyList) {
            DOM.historyList.addEventListener('click', (e) => {
                const btn = e.target.closest('.copy-key-btn');
                if (btn) {
                    const key = btn.dataset.key;
                    copyToClipboard(key, `Đã sao chép key: ${key}`);
                }
            });
        }

        document.querySelectorAll('.footer-cat-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetCat = link.getAttribute('data-target-cat');
                if (DOM.categoriesList) {
                    const matching = DOM.categoriesList.querySelector(`[data-cat="${targetCat}"]`);
                    if (matching) matching.click();
                }
                const catSection = document.getElementById('categorySection');
                if (catSection) catSection.scrollIntoView({ behavior: 'smooth' });
            });
        });

        if (DOM.copyBankAccBtn) {
            DOM.copyBankAccBtn.addEventListener('click', () => copyToClipboard(state.paymentInfo.BANK_ACCOUNT, 'Đã sao chép STK'));
        }
        if (DOM.copyBankMemoBtn) {
            DOM.copyBankMemoBtn.addEventListener('click', () => copyToClipboard(state.paymentInfo.BANK_MEMO, 'Đã sao chép cú pháp nạp'));
        }

        if (DOM.themeToggle) {
            DOM.themeToggle.addEventListener('click', () => {
                const nextTheme = state.currentTheme === 'dark' ? 'light' : 'dark';
                setTheme(nextTheme);
            });
        }

        if (DOM.loginNavBtn) {
            DOM.loginNavBtn.addEventListener('click', () => openModal(DOM.loginModal));
        }

        if (DOM.loginForm) {
            DOM.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = (DOM.loginUsername ? DOM.loginUsername.value : '').trim();
                if (username) {
                    try {
                        localStorage.setItem(CONFIG.STORAGE_KEYS.USERNAME, username);
                    } catch (err) {
                        console.warn('[LixShop] User storage warning:', err);
                    }
                    updateLoginUI(username);
                    closeModal(DOM.loginModal);
                    showToast(`Đăng nhập thành công! Chào mừng ${username}`);
                }
            });
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        initDOMCache();
        loadAppState();
        updateCategoryCounts();
        renderProducts();
        setupEventListeners();
    });

})(window, document, typeof PRODUCTS_DATA !== 'undefined' ? PRODUCTS_DATA : []);
