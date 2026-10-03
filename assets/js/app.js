/**
 * ==========================================================================
 * NEXUS GAMING STORE - CLIENT CONTROLLER & BUSINESS LOGIC
 * Built with IIFE, DocumentFragment, Zero AI Slop, WCAG Focus Trap, XSS Protection
 * ==========================================================================
 */

(function (window, document) {
  'use strict';

  // Application State
  const state = {
    products: [],
    coupons: [],
    feedbacks: [],
    members: [],
    userOrders: [],
    topupHistory: [],
    currentUser: null,
    userBalance: 100000, // Demo starting balance 100k
    currentCategory: 'all',
    searchQuery: '',
    sortOption: 'newest',
    selectedProduct: null,
    selectedPackage: null,
    currentQuantity: 1,
    appliedCoupon: null,
    currentAdminTab: 'overview'
  };

  // DOM Cache
  const DOM = {};

  function initDOMCache() {
    DOM.toastContainer = document.getElementById('toastContainer');
    DOM.productsGrid = document.getElementById('productsGrid');
    DOM.productModalBackdrop = document.getElementById('productModalBackdrop');
    DOM.productModalBody = document.getElementById('productModalBody');
    DOM.topupModalBackdrop = document.getElementById('topupModalBackdrop');
    DOM.historyModalBackdrop = document.getElementById('historyModalBackdrop');
    DOM.authModalBackdrop = document.getElementById('authModalBackdrop');
    DOM.feedbackModalBackdrop = document.getElementById('feedbackModalBackdrop');
    DOM.userBalanceVal = document.getElementById('userBalanceVal');
    DOM.productSearchInput = document.getElementById('productSearchInput');
    DOM.productSortSelect = document.getElementById('productSortSelect');
    DOM.categoryPillsList = document.getElementById('categoryPillsList');
    DOM.feedbackGrid = document.getElementById('feedbackGrid');
    DOM.adminMainPanel = document.getElementById('adminMainPanel');
  }

  // Utility Functions
  function debounce(fn, delay = 200) {
    let timer = null;
    return function (...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
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

  function formatCurrency(amount) {
    const num = Number(amount);
    if (!Number.isFinite(num)) return '0 ₫';
    try {
      return num.toLocaleString('vi-VN') + ' ₫';
    } catch (e) {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ' ₫';
    }
  }

  function showToast(message, type = 'info') {
    const container = DOM.toastContainer || document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    
    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-triangle-exclamation';

    toast.innerHTML = `
      <i class="fas ${iconClass}" style="font-size: 16px;"></i>
      <span style="font-size: 13.5px; font-weight: 600;">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  // Modal Focus Trap & Modal Management
  const modalHandlers = new WeakMap();
  let lastActiveElement = null;

  function openModal(modalEl) {
    if (!modalEl) return;
    lastActiveElement = document.activeElement;
    modalEl.classList.add('is-open');
    modalEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    const focusables = modalEl.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusables.length > 0) {
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      first.focus();

      if (modalHandlers.has(modalEl)) {
        modalEl.removeEventListener('keydown', modalHandlers.get(modalEl));
      }

      const keyHandler = (e) => {
        if (e.key === 'Tab') {
          if (e.shiftKey && (document.activeElement === first || !modalEl.contains(document.activeElement))) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && (document.activeElement === last || !modalEl.contains(document.activeElement))) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      modalHandlers.set(modalEl, keyHandler);
      modalEl.addEventListener('keydown', keyHandler);
    }
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('is-open');
    modalEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    if (modalHandlers.has(modalEl)) {
      modalEl.removeEventListener('keydown', modalHandlers.get(modalEl));
      modalHandlers.delete(modalEl);
    }
    if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
      lastActiveElement.focus();
      lastActiveElement = null;
    }
  }

  // SVG Cyber Banner Generator (Fallback & Visuals)
  function getBannerSvg(title, category) {
    let color1 = '#00f2fe';
    let color2 = '#4facfe';
    let iconName = '🎮';

    if (category === 'freefire') { color1 = '#f59e0b'; color2 = '#ef4444'; iconName = '🔥'; }
    if (category === 'pubg') { color1 = '#10b981'; color2 = '#047857'; iconName = '🎯'; }
    if (category === 'pool') { color1 = '#8b5cf6'; color2 = '#6366f1'; iconName = '🎱'; }
    if (category === 'config') { color1 = '#ec4899'; color2 = '#be185d'; iconName = '⚡'; }

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="100%" height="100%">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0b0f1f"/>
            <stop offset="100%" stop-color="#111827"/>
          </linearGradient>
          <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${color1}"/>
            <stop offset="100%" stop-color="${color2}"/>
          </linearGradient>
        </defs>
        <rect width="480" height="270" fill="url(#bg)"/>
        <circle cx="240" cy="135" r="90" fill="${color1}" opacity="0.12"/>
        <rect x="20" y="20" width="440" height="230" rx="16" fill="none" stroke="url(#accent)" stroke-width="1.5" stroke-dasharray="10 6" opacity="0.6"/>
        <text x="240" y="115" text-anchor="middle" font-size="44" fill="#ffffff">${iconName}</text>
        <text x="240" y="170" text-anchor="middle" font-family="system-ui, sans-serif" font-size="19" font-weight="bold" fill="url(#accent)">${escapeHtml(title.slice(0, 24))}</text>
        <text x="240" y="196" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#94a3b8" letter-spacing="2">NEXUS STORE DIGITAL 24/7</text>
      </svg>
    `;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // Render Product Cards
  function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    // Filter Logic
    let filtered = state.products.filter(p => {
      const matchCat = state.currentCategory === 'all' || p.category === state.currentCategory;
      const q = state.searchQuery.toLowerCase().trim();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });

    // Sort Logic
    if (state.sortOption === 'price_asc') filtered.sort((a, b) => a.price - b.price);
    else if (state.sortOption === 'price_desc') filtered.sort((a, b) => b.price - a.price);
    else if (state.sortOption === 'popular') filtered.sort((a, b) => b.sold - a.sold);

    grid.replaceChildren();

    if (filtered.length === 0) {
      const emptyBox = document.createElement('div');
      emptyBox.className = 'empty-products-box';
      emptyBox.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 48px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-glass);';
      emptyBox.innerHTML = `
        <i class="fas fa-box-open" style="font-size: 42px; color: var(--neon-cyan); margin-bottom: 14px;"></i>
        <h3 style="font-size: 18px; margin-bottom: 6px;">Không tìm thấy sản phẩm phù hợp</h3>
        <p style="color: var(--text-muted); font-size: 13.5px;">Thử tìm kiếm với từ khóa khác hoặc chuyển danh mục.</p>
      `;
      grid.appendChild(emptyBox);
      return;
    }

    const fragment = document.createDocumentFragment();

    filtered.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-glass-card';
      card.dataset.id = p.id;

      const bannerSrc = getBannerSvg(p.name, p.category);
      const isFree = p.price === 0;
      const priceText = isFree ? 'MIỄN PHÍ' : formatCurrency(p.price);

      const featuresHtml = (p.features || []).slice(0, 3).map(f => `
        <li><i class="fas fa-check"></i> <span>${escapeHtml(f)}</span></li>
      `).join('');

      const platformsHtml = (p.platforms || ['PC']).map(pl => `
        <span class="platform-chip">${escapeHtml(pl)}</span>
      `).join('');

      card.innerHTML = `
        <div class="card-banner-box">
          <img src="${bannerSrc}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async">
          <div class="card-top-badges">
            <span class="card-badge-status"><i class="fas fa-check-circle"></i> CÒN HÀNG</span>
            ${p.badge ? `<span class="card-badge-highlight">${escapeHtml(p.badge)}</span>` : ''}
          </div>
        </div>
        <div class="card-content-body">
          <div class="card-platforms-row">
            <div class="platform-tags">${platformsHtml}</div>
            <span class="sold-stat"><i class="fas fa-fire"></i> Đã bán ${Number(p.sold).toLocaleString()}</span>
          </div>
          <h3 class="card-product-title" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</h3>
          <p class="card-product-desc">${escapeHtml(p.description)}</p>
          <ul class="card-feature-list">${featuresHtml}</ul>
          <div class="card-pricing-row">
            <div class="price-box">
              <span class="price-label">Giá từ</span>
              <span class="price-value">${priceText}</span>
            </div>
            <div class="card-action-btns">
              <button class="btn-card-detail btn-open-detail" data-id="${escapeHtml(p.id)}" type="button">Chi tiết</button>
              <button class="btn-card-buy btn-open-buy" data-id="${escapeHtml(p.id)}" type="button">
                <i class="fas fa-cart-shopping"></i> Mua
              </button>
            </div>
          </div>
        </div>
      `;
      fragment.appendChild(card);
    });

    grid.appendChild(fragment);
  }

  // Render Product Detail Modal
  function openProductDetailModal(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    state.selectedProduct = product;
    state.selectedPackage = product.packages ? product.packages[0] : null;
    state.currentQuantity = 1;
    state.appliedCoupon = null;

    const modalBody = document.getElementById('productModalBody');
    if (!modalBody) return;

    const bannerSrc = getBannerSvg(product.name, product.category);
    const packagesHtml = (product.packages || []).map((pkg, idx) => `
      <button class="quick-amt-btn pkg-select-btn ${idx === 0 ? 'active' : ''}" data-pkg-id="${escapeHtml(pkg.id)}" type="button">
        ${escapeHtml(pkg.name)} · ${formatCurrency(pkg.price)}
      </button>
    `).join('');

    modalBody.innerHTML = `
      <div class="modal-product-summary-row">
        <div class="modal-thumb-box">
          <img src="${bannerSrc}" alt="${escapeHtml(product.name)}">
        </div>
        <div class="modal-summary-info">
          <h2>${escapeHtml(product.name)}</h2>
          <div class="modal-meta-row">
            <span>Danh mục: <strong style="color: var(--neon-cyan);">${escapeHtml(product.categoryName)}</strong></span>
            <span>Kho: <strong style="color: var(--neon-green);">Còn hàng</strong></span>
          </div>
          <div class="modal-price-display" id="modalPriceHeader">
            ${formatCurrency(state.selectedPackage ? state.selectedPackage.price : product.price)}
          </div>
        </div>
      </div>

      <div class="form-group-field">
        <label>Chọn gói sản phẩm / thời hạn:</label>
        <div class="quick-amounts-grid">
          ${packagesHtml}
        </div>
      </div>

      <div class="modal-qty-coupon-row">
        <div style="flex: 0 0 140px;">
          <label style="font-size: 13px; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px; display: block;">Số lượng:</label>
          <div class="qty-stepper">
            <button type="button" id="btnQtyMinus" aria-label="Giảm số lượng">-</button>
            <input type="number" id="inputQuantity" value="1" min="1" max="50" aria-label="Số lượng sản phẩm" readonly>
            <button type="button" id="btnQtyPlus" aria-label="Tăng số lượng">+</button>
          </div>
        </div>
        <div style="flex: 1;">
          <label style="font-size: 13px; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px; display: block;">Mã giảm giá (Coupon):</label>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="couponInput" placeholder="Ví dụ: NEXUS10" style="padding: 8px 12px; text-transform: uppercase;">
            <button type="button" class="btn-cta-secondary" id="btnApplyCoupon" style="padding: 8px 14px; font-size: 12.5px;">Áp dụng</button>
          </div>
        </div>
      </div>

      <div class="calc-summary-card">
        <div class="calc-row">
          <span>Đơn giá:</span>
          <span id="summaryUnitPrice">0 ₫</span>
        </div>
        <div class="calc-row discount-row" id="summaryDiscountRow" style="display: none;">
          <span>Giảm giá:</span>
          <span id="summaryDiscountValue">0 ₫</span>
        </div>
        <div class="calc-row total-row">
          <span>Tổng thanh toán:</span>
          <span id="summaryTotalPrice" style="color: var(--neon-cyan);">0 ₫</span>
        </div>
      </div>

      <button class="btn-cta-primary" id="btnConfirmPurchase" style="width: 100%; justify-content: center; font-size: 15px;" type="button">
        <i class="fas fa-shield-check"></i> XÁC NHẬN THANH TOÁN NGAY
      </button>
    `;

    updateModalCalculation();
    openModal(document.getElementById('productModalBackdrop'));
  }

  // Update Calculation in Modal
  function updateModalCalculation() {
    if (!state.selectedProduct) return;
    const unitPrice = state.selectedPackage ? state.selectedPackage.price : state.selectedProduct.price;
    const subtotal = unitPrice * state.currentQuantity;
    let discount = 0;

    if (state.appliedCoupon) {
      if (state.appliedCoupon.type === 'percent') {
        discount = (subtotal * state.appliedCoupon.discount) / 100;
      } else {
        discount = state.appliedCoupon.discount;
      }
      if (discount > subtotal) discount = subtotal;
    }

    const finalTotal = subtotal - discount;

    const unitPriceEl = document.getElementById('summaryUnitPrice');
    const discountRowEl = document.getElementById('summaryDiscountRow');
    const discountValEl = document.getElementById('summaryDiscountValue');
    const totalPriceEl = document.getElementById('summaryTotalPrice');
    const modalPriceHeader = document.getElementById('modalPriceHeader');

    if (unitPriceEl) unitPriceEl.textContent = formatCurrency(unitPrice);
    if (modalPriceHeader) modalPriceHeader.textContent = formatCurrency(unitPrice);
    if (discountRowEl && discountValEl) {
      if (discount > 0) {
        discountRowEl.style.display = 'flex';
        discountValEl.textContent = `- ${formatCurrency(discount)}`;
      } else {
        discountRowEl.style.display = 'none';
      }
    }
    if (totalPriceEl) totalPriceEl.textContent = formatCurrency(finalTotal);
  }

  // Handle Checkout Purchase
  function handlePurchase() {
    if (!state.selectedProduct) return;
    const unitPrice = state.selectedPackage ? state.selectedPackage.price : state.selectedProduct.price;
    const subtotal = unitPrice * state.currentQuantity;
    let discount = 0;
    if (state.appliedCoupon) {
      discount = state.appliedCoupon.type === 'percent'
        ? (subtotal * state.appliedCoupon.discount) / 100
        : state.appliedCoupon.discount;
    }
    const finalTotal = Math.max(0, subtotal - discount);

    if (state.userBalance < finalTotal) {
      showToast(`Số dư không đủ (${formatCurrency(state.userBalance)}). Vui lòng nạp thêm tiền!`, 'error');
      closeModal(document.getElementById('productModalBackdrop'));
      openTopupModal();
      return;
    }

    // Deduct Balance
    state.userBalance -= finalTotal;
    updateBalanceDisplay();

    // Generate Game Key
    const orderId = 'ORD-' + Date.now().toString(36).toUpperCase().slice(-6);
    const generatedKey = `NEXUS-${state.selectedProduct.category.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const newOrder = {
      orderId: orderId,
      productName: state.selectedProduct.name,
      packageName: state.selectedPackage ? state.selectedPackage.name : 'Bản chuẩn',
      quantity: state.currentQuantity,
      total: finalTotal,
      time: new Date().toLocaleString('vi-VN'),
      key: generatedKey,
      status: 'Thành công'
    };

    state.userOrders.unshift(newOrder);

    closeModal(document.getElementById('productModalBackdrop'));
    showToast(`Thanh toán thành công ${state.selectedProduct.name}!`, 'success');

    // Open History with newly granted key
    renderHistoryModal();
    openModal(document.getElementById('historyModalBackdrop'));
  }

  // Topup Wallet Modal Management
  function openTopupModal() {
    openModal(document.getElementById('topupModalBackdrop'));
    generateQrPayment();
  }

  function generateQrPayment() {
    const customAmt = document.getElementById('customTopupAmount');
    const amount = customAmt ? Number(customAmt.value) || 20000 : 20000;
    const memo = `NEXUS NAP ${Math.floor(1000 + Math.random() * 9000)}`;

    const bankAcc = NEXUS_DATA.CONFIG.BANK_ACC;
    const qrUrl = `https://img.vietqr.io/image/MB-${bankAcc}-${NEXUS_DATA.CONFIG.QR_TEMPLATE}.png?amount=${amount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(NEXUS_DATA.CONFIG.BANK_HOLDER)}`;

    const qrImg = document.getElementById('qrDisplayImg');
    const qrTotal = document.getElementById('qrTotalDisplay');
    const qrMemo = document.getElementById('qrMemoDisplay');
    const qrArea = document.getElementById('qrResultArea');

    if (qrImg) qrImg.src = qrUrl;
    if (qrTotal) qrTotal.textContent = formatCurrency(amount);
    if (qrMemo) qrMemo.textContent = memo;
    if (qrArea) qrArea.style.display = 'block';
  }

  function simulateTopupSuccess() {
    const customAmt = document.getElementById('customTopupAmount');
    const amount = customAmt ? Number(customAmt.value) || 20000 : 20000;

    state.userBalance += amount;
    updateBalanceDisplay();

    const record = {
      time: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'),
      method: 'VietQR / Ngân Hàng',
      amount: amount,
      status: 'Thành công'
    };
    state.topupHistory.unshift(record);
    renderTopupHistory();

    showToast(`Nạp thành công +${formatCurrency(amount)} vào tài khoản!`, 'success');
    closeModal(document.getElementById('topupModalBackdrop'));
  }

  function renderTopupHistory() {
    const tbody = document.getElementById('topupHistoryBody');
    if (!tbody) return;

    if (state.topupHistory.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 14px; color: var(--text-muted);">Chưa có giao dịch nạp tiền</td></tr>`;
      return;
    }

    tbody.innerHTML = state.topupHistory.slice(0, 5).map(h => `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td style="padding: 8px 10px;">${escapeHtml(h.time)}</td>
        <td style="padding: 8px 10px;">${escapeHtml(h.method)}</td>
        <td style="padding: 8px 10px; color: var(--neon-green); font-weight: 700;">+${formatCurrency(h.amount)}</td>
        <td style="padding: 8px 10px;"><span style="color: var(--neon-green); font-weight: 700;">${escapeHtml(h.status)}</span></td>
      </tr>
    `).join('');
  }

  // Render Order History Modal
  function renderHistoryModal() {
    const list = document.getElementById('orderHistoryList');
    if (!list) return;

    if (state.userOrders.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 36px;">
          <i class="fas fa-receipt" style="font-size: 38px; color: var(--neon-cyan); margin-bottom: 12px;"></i>
          <p style="color: var(--text-muted); font-size: 14px;">Bạn chưa thực hiện đơn mua hàng nào.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = state.userOrders.map(ord => `
      <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-glass); border-radius: var(--radius-md); padding: 16px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <strong style="color: #fff; font-size: 15px;">${escapeHtml(ord.productName)} (${escapeHtml(ord.packageName)})</strong>
          <span style="color: var(--neon-cyan); font-weight: 800;">${formatCurrency(ord.total)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">
          <span>Mã đơn: #${escapeHtml(ord.orderId)} · SL: ${escapeHtml(ord.quantity)}</span>
          <span>${escapeHtml(ord.time)}</span>
        </div>
        <div style="background: rgba(16, 185, 129, 0.12); border: 1px dashed var(--neon-green); border-radius: var(--radius-sm); padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-family: monospace; font-size: 13px; color: var(--neon-green); font-weight: 700;">${escapeHtml(ord.key)}</span>
          <button class="copy-badge-btn" data-copy="${escapeHtml(ord.key)}" type="button"><i class="fas fa-copy"></i> Sao chép</button>
        </div>
      </div>
    `).join('');
  }

  // Render Feedbacks Section
  function renderFeedbacks() {
    const grid = document.getElementById('feedbackGrid');
    if (!grid) return;

    grid.innerHTML = state.feedbacks.map(fb => `
      <div class="feedback-glass-card">
        <div class="feedback-user-row">
          <div class="user-avatar-badge">${escapeHtml(fb.avatar)}</div>
          <div class="feedback-user-info">
            <strong>${escapeHtml(fb.author)}</strong>
            <span>${escapeHtml(fb.date)}</span>
          </div>
        </div>
        <div class="feedback-stars-row">
          ${'★'.repeat(fb.rating)}${'☆'.repeat(5 - fb.rating)}
        </div>
        <p class="feedback-content-text">${escapeHtml(fb.content)}</p>
        <div class="feedback-product-tag">
          <i class="fas fa-gamepad"></i> <span>${escapeHtml(fb.product)}</span>
        </div>
      </div>
    `).join('');
  }

  // Render Admin Dashboard
  function renderAdminDashboard() {
    const main = document.getElementById('adminMainPanel');
    if (!main) return;

    if (state.currentAdminTab === 'overview') {
      const orderRevenue = state.userOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const totalRevenue = orderRevenue > 0 ? orderRevenue : 2580000;
      const totalOrdersCount = state.userOrders.length > 0 ? state.userOrders.length : 18;
      const totalMembersCount = Array.isArray(state.members) ? state.members.length : 4;

      main.innerHTML = `
        <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 24px;"><i class="fas fa-chart-line"></i> BẢNG ĐIỀU KHIỂN TỔNG QUAN</h2>
        <div class="admin-stats-grid">
          <div class="admin-stat-card">
            <span>Tổng người dùng</span>
            <h3>${Number(totalMembersCount).toLocaleString()}</h3>
          </div>
          <div class="admin-stat-card">
            <span>Tổng doanh thu</span>
            <h3>${formatCurrency(totalRevenue)}</h3>
          </div>
          <div class="admin-stat-card">
            <span>Tổng đơn hàng</span>
            <h3>${Number(totalOrdersCount).toLocaleString()}</h3>
          </div>
          <div class="admin-stat-card">
            <span>Số dư hệ thống</span>
            <h3>${formatCurrency(state.userBalance)}</h3>
          </div>
          <div class="admin-stat-card">
            <span>Server Status</span>
            <h3 style="color: var(--neon-green); font-size: 18px;"><i class="fas fa-circle-check"></i> HOẠT ĐỘNG 100%</h3>
          </div>
        </div>

        <div class="admin-table-box">
          <h3 style="font-size: 16px; margin-bottom: 14px;">Đơn hàng kỹ thuật số mới nhất</h3>
          <table class="admin-data-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Sản phẩm</th>
                <th>Tổng tiền</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${state.userOrders.slice(0, 5).map(o => `
                <tr>
                  <td>#${escapeHtml(o.orderId)}</td>
                  <td>${escapeHtml(o.productName)}</td>
                  <td style="color: var(--neon-cyan); font-weight: 700;">${formatCurrency(o.total)}</td>
                  <td>${escapeHtml(o.time)}</td>
                  <td><span style="color: var(--neon-green);">${escapeHtml(o.status)}</span></td>
                </tr>
              `).join('')}
              <tr>
                <td>#ORD-DEMO01</td>
                <td>Aimlock Free Fire V2 PRO</td>
                <td style="color: var(--neon-cyan); font-weight: 700;">50.000 ₫</td>
                <td>Hôm nay, 19:40</td>
                <td><span style="color: var(--neon-green);">Thành công</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    } else if (state.currentAdminTab === 'members') {
      main.innerHTML = `
        <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 24px;"><i class="fas fa-users-gear"></i> QUẢN LÝ THÀNH VIÊN & PHÂN QUYỀN</h2>
        <div class="admin-table-box">
          <table class="admin-data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Số dư</th>
                <th>Phân quyền</th>
                <th>Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              ${state.members.map(m => `
                <tr>
                  <td>#${escapeHtml(m.id)}</td>
                  <td><strong>${escapeHtml(m.username)}</strong></td>
                  <td>${escapeHtml(m.email)}</td>
                  <td style="color: var(--neon-green); font-weight: 700;">${formatCurrency(m.balance)}</td>
                  <td>
                    <span style="padding: 3px 8px; border-radius: var(--radius-sm); font-size: 11px; font-weight: 700; background: ${m.role === 'Owner' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(0, 242, 254, 0.15)'}; color: ${m.role === 'Owner' ? 'var(--neon-pink)' : 'var(--neon-cyan)'};">
                      ${escapeHtml(m.role)}
                    </span>
                  </td>
                  <td>${escapeHtml(m.createdAt)}</td>
                  <td>
                    <button class="btn-card-detail" style="padding: 4px 8px; font-size: 11px;" type="button">Phân quyền</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      main.innerHTML = `
        <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 14px;"><i class="fas fa-sliders"></i> QUẢN TRỊ VIÊN: ${escapeHtml(state.currentAdminTab.toUpperCase())}</h2>
        <div class="admin-table-box">
          <p style="color: var(--text-secondary); font-size: 14px;">Mô-đun quản trị <strong>${escapeHtml(state.currentAdminTab)}</strong> đang hoạt động ổn định ở chế độ demo.</p>
        </div>
      `;
    }
  }

  // Update Balance UI
  function updateBalanceDisplay() {
    const val = document.getElementById('userBalanceVal');
    if (val) val.textContent = formatCurrency(state.userBalance);
  }

  // Event Listeners Setup
  function setupEventListeners() {
    // Mobile Menu Toggle
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const navMenu = document.getElementById('navMenu');
    if (mobileBtn && navMenu) {
      mobileBtn.addEventListener('click', () => {
        navMenu.classList.toggle('is-open');
      });
    }

    // Category Pill Filtering
    const pillsList = document.getElementById('categoryPillsList');
    if (pillsList) {
      pillsList.addEventListener('click', (e) => {
        const btn = e.target.closest('.cat-pill-btn');
        if (!btn) return;
        pillsList.querySelectorAll('.cat-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentCategory = btn.dataset.category || 'all';
        renderProducts();
      });
    }

    // Search Input with Debounce (anti-lag)
    const searchInput = DOM.productSearchInput || document.getElementById('productSearchInput');
    if (searchInput) {
      const onSearchDebounced = debounce((val) => {
        state.searchQuery = val;
        renderProducts();
      }, 200);

      searchInput.addEventListener('input', (e) => {
        onSearchDebounced(e.target.value);
      });
    }

    // Sort Select
    const sortSelect = document.getElementById('productSortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        state.sortOption = e.target.value;
        renderProducts();
      });
    }

    // Delegated Product Card Actions
    const productsGrid = document.getElementById('productsGrid');
    if (productsGrid) {
      productsGrid.addEventListener('click', (e) => {
        const detailBtn = e.target.closest('.btn-open-detail');
        const buyBtn = e.target.closest('.btn-open-buy');
        const card = e.target.closest('.product-glass-card');

        if (detailBtn || buyBtn) {
          const pid = (detailBtn || buyBtn).dataset.id;
          openProductDetailModal(pid);
        } else if (card) {
          openProductDetailModal(card.dataset.id);
        }
      });
    }

    // Product Modal Delegated Events
    const productModalBody = document.getElementById('productModalBody');
    if (productModalBody) {
      productModalBody.addEventListener('click', (e) => {
        // Select package
        const pkgBtn = e.target.closest('.pkg-select-btn');
        if (pkgBtn) {
          productModalBody.querySelectorAll('.pkg-select-btn').forEach(b => b.classList.remove('active'));
          pkgBtn.classList.add('active');
          const pkgId = pkgBtn.dataset.pkgId;
          state.selectedPackage = state.selectedProduct.packages.find(p => p.id === pkgId);
          updateModalCalculation();
          return;
        }

        // Qty Minus
        if (e.target.closest('#btnQtyMinus')) {
          if (state.currentQuantity > 1) {
            state.currentQuantity--;
            document.getElementById('inputQuantity').value = state.currentQuantity;
            updateModalCalculation();
          }
          return;
        }

        // Qty Plus
        if (e.target.closest('#btnQtyPlus')) {
          if (state.currentQuantity < 50) {
            state.currentQuantity++;
            document.getElementById('inputQuantity').value = state.currentQuantity;
            updateModalCalculation();
          }
          return;
        }

        // Apply Coupon
        if (e.target.closest('#btnApplyCoupon')) {
          const input = document.getElementById('couponInput');
          const code = input ? input.value.trim().toUpperCase() : '';
          const coupon = state.coupons.find(c => c.code === code && c.status === 'active');
          if (coupon) {
            state.appliedCoupon = coupon;
            showToast(`Áp dụng mã ${coupon.code} thành công (-${coupon.discount}${coupon.type === 'percent' ? '%' : 'đ'})!`, 'success');
          } else {
            state.appliedCoupon = null;
            showToast('Mã giảm giá không hợp lệ hoặc đã hết hạn!', 'error');
          }
          updateModalCalculation();
          return;
        }

        // Confirm Purchase
        if (e.target.closest('#btnConfirmPurchase')) {
          handlePurchase();
        }
      });
    }

    // Modal Closing Handlers
    document.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('.modal-close-btn');
      if (closeBtn) {
        const modal = closeBtn.closest('.nexus-modal-backdrop');
        if (modal) closeModal(modal);
        return;
      }
      if (e.target.classList && e.target.classList.contains('nexus-modal-backdrop')) {
        closeModal(e.target);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.nexus-modal-backdrop.is-open').forEach(m => closeModal(m));
      }
    });

    // Topup Triggers
    const triggerTopup = () => openTopupModal();
    const navTopup = document.getElementById('navTopupBtn');
    const heroTopup = document.getElementById('heroTopupBtn');
    const footerTopup = document.getElementById('footerTopupLink');
    if (navTopup) navTopup.addEventListener('click', triggerTopup);
    if (heroTopup) heroTopup.addEventListener('click', triggerTopup);
    if (footerTopup) footerTopup.addEventListener('click', triggerTopup);

    // Topup Tabs
    const tabPayQr = document.getElementById('tabPayQr');
    const tabPayCard = document.getElementById('tabPayCard');
    const boxPayQr = document.getElementById('boxPayQr');
    const boxPayCard = document.getElementById('boxPayCard');

    if (tabPayQr && tabPayCard) {
      tabPayQr.addEventListener('click', () => {
        tabPayQr.classList.add('active');
        tabPayCard.classList.remove('active');
        boxPayQr.style.display = 'block';
        boxPayCard.style.display = 'none';
      });
      tabPayCard.addEventListener('click', () => {
        tabPayCard.classList.add('active');
        tabPayQr.classList.remove('active');
        boxPayCard.style.display = 'block';
        boxPayQr.style.display = 'none';
      });
    }

    // Quick Amounts Click
    document.querySelectorAll('.quick-amt-btn[data-amt]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.quick-amt-btn[data-amt]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const custom = document.getElementById('customTopupAmount');
        if (custom) custom.value = btn.dataset.amt;
        generateQrPayment();
      });
    });

    const btnGenQr = document.getElementById('btnGenQr');
    if (btnGenQr) btnGenQr.addEventListener('click', generateQrPayment);

    const btnSimulate = document.getElementById('btnSimulateSuccess');
    if (btnSimulate) btnSimulate.addEventListener('click', simulateTopupSuccess);

    const btnCard = document.getElementById('btnSubmitCard');
    if (btnCard) {
      btnCard.addEventListener('click', () => {
        const pin = document.getElementById('cardPinInput').value;
        const serial = document.getElementById('cardSerialInput').value;
        if (!pin || !serial) {
          showToast('Vui lòng nhập đầy đủ mã PIN và Số Serial!', 'error');
          return;
        }
        showToast('Thẻ đã được gửi tới hệ thống gạch cước tự động!', 'info');
        setTimeout(() => simulateTopupSuccess(), 1000);
      });
    }

    // History Triggers
    const triggerHistory = () => {
      renderHistoryModal();
      openModal(document.getElementById('historyModalBackdrop'));
    };
    const navHistory = document.getElementById('navHistoryBtn');
    const footerHistory = document.getElementById('footerHistoryLink');
    if (navHistory) navHistory.addEventListener('click', triggerHistory);
    if (footerHistory) footerHistory.addEventListener('click', triggerHistory);

    // Auth Modal Triggers
    const headerAuth = document.getElementById('headerAuthBtn');
    if (headerAuth) {
      headerAuth.addEventListener('click', () => {
        openModal(document.getElementById('authModalBackdrop'));
      });
    }

    const tabAuthLogin = document.getElementById('tabAuthLogin');
    const tabAuthRegister = document.getElementById('tabAuthRegister');
    const tabAuthPassword = document.getElementById('tabAuthPassword');
    const formLogin = document.getElementById('formLogin');
    const formRegister = document.getElementById('formRegister');
    const formPassword = document.getElementById('formPassword');

    if (tabAuthLogin && tabAuthRegister && tabAuthPassword) {
      tabAuthLogin.addEventListener('click', () => {
        tabAuthLogin.classList.add('active');
        tabAuthRegister.classList.remove('active');
        tabAuthPassword.classList.remove('active');
        formLogin.style.display = 'block';
        formRegister.style.display = 'none';
        formPassword.style.display = 'none';
      });
      tabAuthRegister.addEventListener('click', () => {
        tabAuthRegister.classList.add('active');
        tabAuthLogin.classList.remove('active');
        tabAuthPassword.classList.remove('active');
        formRegister.style.display = 'block';
        formLogin.style.display = 'none';
        formPassword.style.display = 'none';
      });
      tabAuthPassword.addEventListener('click', () => {
        tabAuthPassword.classList.add('active');
        tabAuthLogin.classList.remove('active');
        tabAuthRegister.classList.remove('active');
        formPassword.style.display = 'block';
        formLogin.style.display = 'none';
        formRegister.style.display = 'none';
      });
    }

    if (formLogin) {
      formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('loginUsername').value;
        state.currentUser = user;
        document.getElementById('headerAuthText').textContent = user;
        closeModal(document.getElementById('authModalBackdrop'));
        showToast(`Đăng nhập thành công! Chào mừng ${user}`, 'success');
      });
    }

    if (formRegister) {
      formRegister.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('regUsername').value;
        state.currentUser = user;
        document.getElementById('headerAuthText').textContent = user;
        closeModal(document.getElementById('authModalBackdrop'));
        showToast(`Đăng ký tài khoản ${user} thành công!`, 'success');
      });
    }

    if (formPassword) {
      formPassword.addEventListener('submit', (e) => {
        e.preventDefault();
        closeModal(document.getElementById('authModalBackdrop'));
        showToast('Đổi mật khẩu thành công!', 'success');
      });
    }

    // Feedback Trigger & Submit
    const openFeedback = document.getElementById('openFeedbackModalBtn');
    if (openFeedback) {
      openFeedback.addEventListener('click', () => {
        openModal(document.getElementById('feedbackModalBackdrop'));
      });
    }

    const formFeedback = document.getElementById('formFeedback');
    if (formFeedback) {
      formFeedback.addEventListener('submit', (e) => {
        e.preventDefault();
        const author = document.getElementById('fbAuthor').value;
        const product = document.getElementById('fbProductSelect').value;
        const rating = Number(document.getElementById('fbStarsSelect').value) || 5;
        const content = document.getElementById('fbContent').value;

        const newFb = {
          id: Date.now(),
          author: author,
          avatar: author.slice(0, 2).toUpperCase(),
          game: product,
          rating: rating,
          date: 'Vừa xong',
          content: content,
          product: product
        };

        state.feedbacks.unshift(newFb);
        renderFeedbacks();
        closeModal(document.getElementById('feedbackModalBackdrop'));
        showToast('Cảm ơn bạn đã gửi đánh giá cho Nexus Store!', 'success');
      });
    }

    // Global Copy Delegate
    document.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('[data-copy]');
      if (copyBtn) {
        const text = copyBtn.dataset.copy;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(() => {
            showToast(`Đã sao chép: ${text}`, 'success');
          }).catch(() => {
            showToast('Không thể sao chép tự động', 'error');
          });
        }
      }
    });

    // Admin Dashboard View Toggle
    const navAdminBtn = document.getElementById('navAdminBtn');
    const adminExitBtn = document.getElementById('adminExitBtn');
    const storefrontView = document.getElementById('storefrontView');
    const adminDashboardView = document.getElementById('adminDashboardView');

    if (navAdminBtn && storefrontView && adminDashboardView) {
      navAdminBtn.addEventListener('click', (e) => {
        e.preventDefault();
        storefrontView.style.display = 'none';
        adminDashboardView.classList.add('is-active');
        renderAdminDashboard();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    if (adminExitBtn && storefrontView && adminDashboardView) {
      adminExitBtn.addEventListener('click', () => {
        adminDashboardView.classList.remove('is-active');
        storefrontView.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Admin Sidebar Tabs
    const adminSidebar = document.querySelector('.admin-sidebar');
    if (adminSidebar) {
      adminSidebar.addEventListener('click', (e) => {
        const item = e.target.closest('.admin-menu-item[data-admin-tab]');
        if (item) {
          adminSidebar.querySelectorAll('.admin-menu-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          state.currentAdminTab = item.dataset.adminTab;
          renderAdminDashboard();
        }
      });
    }
  }

  // Application Entry Point
  function initApp() {
    initDOMCache();

    if (window.NEXUS_DATA && typeof window.NEXUS_DATA === 'object') {
      state.products = Array.isArray(window.NEXUS_DATA.PRODUCTS) ? [...window.NEXUS_DATA.PRODUCTS] : [];
      state.coupons = Array.isArray(window.NEXUS_DATA.COUPONS) ? [...window.NEXUS_DATA.COUPONS] : [];
      state.feedbacks = Array.isArray(window.NEXUS_DATA.FEEDBACKS) ? [...window.NEXUS_DATA.FEEDBACKS] : [];
      state.members = Array.isArray(window.NEXUS_DATA.MEMBERS) ? [...window.NEXUS_DATA.MEMBERS] : [];
    }

    updateBalanceDisplay();
    renderProducts();
    renderFeedbacks();
    renderTopupHistory();
    setupEventListeners();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})(window, document);
