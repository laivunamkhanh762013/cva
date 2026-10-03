(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ══ CINEMATIC BRAND REVEAL INTRO CONTROLLER ══
  const docEl = document.documentElement;
  const introEl = document.getElementById('gamingIntro');
  let introDone = false;
  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));

  function completeIntro() {
    timers.forEach(clearTimeout);
    docEl.classList.remove(
      'nx-intro-active', 'nx-p1', 'nx-p2', 'nx-p3',
      'nx-hero-step0', 'nx-hero-step1', 'nx-hero-step2',
      'nx-hero-step3', 'nx-hero-step4', 'nx-hero-step5', 'nx-hero-step6'
    );
    docEl.classList.add('nx-intro-complete');
    document.body.style.overflow = '';

    const headerBrandLogo = document.getElementById('brandLogo');
    if (headerBrandLogo) headerBrandLogo.style.opacity = '1';

    if (introEl) {
      introEl.classList.add('nx-intro-fading');
      setTimeout(() => {
        if (introEl.parentNode) introEl.remove();
      }, 550);
    }
  }

  function skipIntro() {
    if (introDone) return;
    introDone = true;
    try { sessionStorage.setItem('nx_brand_seen', '1'); } catch (e) {}
    completeIntro();
  }
  window.skipIntro = skipIntro;

  if (introEl) {
    if (reduced) {
      skipIntro();
    } else {
      document.body.style.overflow = 'hidden';
      window.scrollTo(0, 0);

      const skipBtn = document.getElementById('nxSkipBtn');
      if (skipBtn) skipBtn.addEventListener('click', skipIntro);
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Enter') skipIntro();
      }, { once: true });

      let seen = false;
      try { seen = sessionStorage.getItem('nx_brand_seen') === '1'; } catch(e) {}

      if (seen) {
        // Returning user in same session: fast 1.2s smooth unlock
        docEl.classList.add('nx-p1', 'nx-p2');
        at(300, () => morphToHeader());
      } else {
        try { sessionStorage.setItem('nx_brand_seen', '1'); } catch(e) {}

        // PHASE 1 (0 -> 1s): Shared Hero background with gentle neon glow at center
        at(80, () => docEl.classList.add('nx-p1'));

        // PHASE 2 (1.0 -> 2.2s): Brand Cluster revealed at center
        at(900, () => docEl.classList.add('nx-p2'));

        // PHASE 3 (2.4s): Brand Cluster morphs continuously directly into HEADER position
        at(2200, () => morphToHeader());
      }

      function morphToHeader() {
        if (introDone) return;
        const morphCluster = document.getElementById('nxMorphCluster');
        const headerBrandLogo = document.getElementById('brandLogo');

        // Reveal Header elements, but keep header brandLogo hidden until morph cluster arrives
        docEl.classList.add('nx-p3');
        if (headerBrandLogo) headerBrandLogo.style.opacity = '0';

        if (morphCluster && headerBrandLogo && morphCluster.animate) {
          // Mirror innerHTML to guarantee 100% exact text, tags, font-weight and image equality
          morphCluster.innerHTML = headerBrandLogo.innerHTML;

          const isMobile = window.innerWidth <= 768;
          const initialScale = isMobile ? 1.4 : 2.0;

          // Compute exact centers for continuous interpolation
          const fromRect = morphCluster.getBoundingClientRect();
          const toRect = headerBrandLogo.getBoundingClientRect();

          const fromCenterX = fromRect.left + fromRect.width / 2;
          const fromCenterY = fromRect.top + fromRect.height / 2;
          const toCenterX = toRect.left + toRect.width / 2;
          const toCenterY = toRect.top + toRect.height / 2;

          const dx = toCenterX - fromCenterX;
          const dy = toCenterY - fromCenterY;

          // Smooth continuous morph: translate + scale from center straight into header
          const anim = morphCluster.animate([
            { transform: 'scale(' + initialScale + ')', opacity: 1 },
            { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(1)', opacity: 1 }
          ], {
            duration: 750,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'forwards'
          });

          anim.onfinish = () => {
            // Seamless handover to header logo
            headerBrandLogo.style.opacity = '1';
            headerBrandLogo.classList.add('nx-arrived');
            setTimeout(() => headerBrandLogo.classList.remove('nx-arrived'), 750);
            morphCluster.style.opacity = '0';
            startHeroCascade();
          };
        } else {
          if (headerBrandLogo) headerBrandLogo.style.opacity = '1';
          startHeroCascade();
        }
      }

      // PHASE 4 (3.2s -> 5.5s): Hero continues sequentially from the same animation
      function startHeroCascade() {
        if (introDone) return;

        // Dismiss intro overlay softly as hero reveals
        if (introEl) introEl.classList.add('nx-intro-fading');

        // Step 0: Hero Logo Ring
        docEl.classList.add('nx-hero-step0');

        // Step 1: "Hệ thống trực tuyến 24/7 • Cấp Key tự động"
        at(100, () => docEl.classList.add('nx-hero-step1'));

        // Step 2: "WELCOME TO QUOCVIET AURA"
        at(300, () => docEl.classList.add('nx-hero-step2'));

        // Step 3: Slogan "UY TÍN • CHẤT LƯỢNG • AN TOÀN • NHANH GỌN"
        at(600, () => docEl.classList.add('nx-hero-step3'));

        // Step 4: Description & Payment badges
        at(900, () => docEl.classList.add('nx-hero-step4'));

        // Step 5: 4 Feature Badges
        at(1200, () => docEl.classList.add('nx-hero-step5'));

        // Step 6: 2 CTA Buttons
        at(1500, () => {
          docEl.classList.add('nx-hero-step6');
          at(350, completeIntro);
        });
      }
    }
  } else {
    completeIntro();
  }

  // Particles (lightweight, paused when tab hidden)
  const cv = document.getElementById('nxParticles');
  if (cv && !reduced) {
    const ctx = cv.getContext('2d');
    let w, h, pts = [];
    const colors = ['0,242,254', '168,85,247', '236,72,153'];
    function resize() {
      w = cv.width = innerWidth; h = cv.height = innerHeight;
      const n = Math.min(70, Math.floor(w * h / 22000));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
        r: Math.random() * 1.8 + .4, c: colors[Math.floor(Math.random() * 3)]
      }));
    }
    function draw() {
      if (!document.hidden && !docEl.classList.contains('intro-active')) {
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283);
          ctx.fillStyle = `rgba(${p.c},.8)`; ctx.fill();
          for (let j = i + 1; j < pts.length; j++) {
            const q = pts[j], dx = p.x - q.x, dy = p.y - q.y, d = dx * dx + dy * dy;
            if (d < 12000) {
              ctx.strokeStyle = `rgba(${p.c},${.12 * (1 - d / 12000)})`;
              ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
            }
          }
        }
      }
      requestAnimationFrame(draw);
    }
    resize(); addEventListener('resize', resize); draw();
  }

  // Scroll progress + back to top
  const bar = document.getElementById('nxScrollProgress');
  const topBtn = document.getElementById('nxBackTop');
  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + '%';
    if (topBtn) topBtn.classList.toggle('show', scrollY > 600);
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (topBtn) topBtn.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

  // Counters
  function runCounter(el) {
    const target = Number(el.dataset.count) || 0, suffix = el.dataset.suffix || '+';
    const start = performance.now(), dur = 1600;
    (function step(t) {
      const k = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.floor(target * e).toLocaleString('vi-VN') + suffix;
      if (k < 1) requestAnimationFrame(step);
    })(start);
  }

  // Reveal on scroll
  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        en.target.querySelectorAll('[data-count]').forEach(runCounter);
        io.unobserve(en.target);
      });
    }, { threshold: 0.15 });
    items.forEach(el => io.observe(el));
  } else {
    items.forEach(el => { el.classList.add('in'); el.querySelectorAll('[data-count]').forEach(runCounter); });
  }
})();
