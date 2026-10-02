/* PIKAMC - Safari / iPhone modal scrolling compatibility
 * Loaded after the main script/style. Only affects Safari/iOS.
 */
(function () {
  'use strict';

  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari\//.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|OPiOS|Android/.test(ua);
  if (!isIOS && !isSafari) return;

  document.documentElement.classList.add('pk-safari');
  if (isIOS) document.documentElement.classList.add('pk-ios');

  const style = document.createElement('style');
  style.id = 'pikamc-safari-scroll-fix';
  style.textContent = `
/* Safari/iPhone ONLY: one vertical scroll owner per modal */
html.pk-safari, html.pk-ios { height: 100%; }

html.pk-safari body.modal-open,
html.pk-ios body.modal-open {
  overflow: hidden !important;
  overscroll-behavior: none !important;
}

html.pk-safari .modal-overlay,
html.pk-ios .modal-overlay {
  position: fixed !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  height: 100dvh !important;
  display: none !important;
  align-items: flex-start !important;
  justify-content: center !important;
  padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom)) !important;
  box-sizing: border-box !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch !important;
  overscroll-behavior-y: contain !important;
  touch-action: pan-y !important;
}

html.pk-safari .modal-overlay.active,
html.pk-ios .modal-overlay.active {
  display: flex !important;
}

html.pk-safari .modal-overlay > .modal-content,
html.pk-ios .modal-overlay > .modal-content {
  flex: 0 0 auto !important;
  width: min(560px, 100%) !important;
  max-width: 560px !important;
  max-height: none !important;
  height: auto !important;
  min-height: 0 !important;
  margin: 0 auto !important;
  overflow: visible !important;
  -webkit-overflow-scrolling: auto !important;
  touch-action: auto !important;
}

/* Random page is also allowed to grow naturally. */
html.pk-safari .random-product-page,
html.pk-ios .random-product-page {
  max-height: none !important;
  height: auto !important;
  overflow: visible !important;
}

/* Do not create a second scroll area inside the main product modal. */
html.pk-safari #purchaseModal .modal-content,
html.pk-ios #purchaseModal .modal-content,
html.pk-safari #randomModal .modal-content,
html.pk-ios #randomModal .modal-content {
  overflow: visible !important;
  max-height: none !important;
}

/* Keep nested history lists usable, but don't steal the whole page gesture. */
html.pk-safari .random-history,
html.pk-ios .random-history {
  -webkit-overflow-scrolling: touch !important;
  overscroll-behavior: contain !important;
}

@media (max-width: 768px) {
  html.pk-safari .modal-overlay,
  html.pk-ios .modal-overlay {
    padding-left: 8px !important;
    padding-right: 8px !important;
  }

  html.pk-safari .modal-overlay > .modal-content,
  html.pk-ios .modal-overlay > .modal-content {
    width: 100% !important;
    border-radius: 20px !important;
  }
}
`;
  document.head.appendChild(style);

  // Safari can keep an old scroll position when a fixed flex overlay is reused.
  // Reset the overlay itself, while leaving the page's normal scroll position alone.
  function patchOpenModal() {
    if (typeof window.openModal !== 'function' || window.__pkSafariOpenPatched) return;
    const original = window.openModal;
    window.openModal = function (modal) {
      original.apply(this, arguments);
      if (!modal) return;
      requestAnimationFrame(function () {
        try { modal.scrollTop = 0; } catch (_) {}
        const content = modal.querySelector('.modal-content');
        if (content) {
          try { content.scrollTop = 0; } catch (_) {}
        }
      });
    };
    window.__pkSafariOpenPatched = true;
  }

  // openModal is declared later in the main script, so wait for it.
  patchOpenModal();
  const timer = setInterval(function () {
    patchOpenModal();
    if (window.__pkSafariOpenPatched) clearInterval(timer);
  }, 50);
  setTimeout(function () { clearInterval(timer); }, 10000);
})();
