(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ══ NEXUS INTRO: 6 SCENES SEAMLESS CONTROLLER ══
  const docEl = document.documentElement;
  const introEl = document.getElementById('gamingIntro');
  let introEnded = false;
  const timers = [];
  const schedule = (ms, fn) => timers.push(setTimeout(fn, ms));

  function cleanIntro() {
    timers.forEach(clearTimeout);
    if (!introEl) return;
    introEl.classList.add('nx-fading-out');
    docEl.classList.remove('intro-active');
    docEl.classList.add('intro-revealed');
    document.body.style.overflow = '';

    const heroLogo = document.querySelector('.hero-logo-wrap');
    if (heroLogo) {
      heroLogo.classList.add('arrived');
      setTimeout(() => heroLogo.classList.remove('arrived'), 800);
    }

    setTimeout(() => {
      if (introEl.parentNode) introEl.remove();
    }, 850);
  }

  function skipIntro() {
    if (introEnded) return;
    introEnded = true;
    try { sessionStorage.setItem('nexus_intro_done', '1'); } catch (e) {}
    cleanIntro();
  }
  window.skipIntro = skipIntro;

  if (introEl) {
    if (reduced) {
      skipIntro();
    } else {
      document.body.style.overflow = 'hidden';
      window.scrollTo(0, 0);

      const skipBtn = document.getElementById('nxIntroSkip');
      if (skipBtn) skipBtn.addEventListener('click', skipIntro);
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Enter') skipIntro();
      }, { once: true });

      let visited = false;
      try { visited = sessionStorage.getItem('nexus_intro_done') === '1'; } catch(e) {}

      if (visited) {
        // Fast-path for returning user in same session (1.8s)
        introEl.classList.add('sc-2');
        schedule(500, () => introEl.classList.add('sc-4'));
        schedule(1400, () => {
          introEl.classList.add('sc-morph');
          cleanIntro();
        });
      } else {
        try { sessionStorage.setItem('nexus_intro_done', '1'); } catch(e) {}

        // SCENE 1: Dark screen with gentle ambient glow (0s - 0.5s)
        // (default state of overlay)

        // SCENE 2: Nexus bolt icon + scale & glow, then brand name (0.5s - 1.4s)
        schedule(500, () => {
          introEl.classList.add('sc-2');
        });

        // SCENE 3: System Status Console lines sequence (1.4s - 2.8s)
        schedule(1400, () => {
          introEl.classList.remove('sc-2');
          introEl.classList.add('sc-3');
          const lines = document.querySelectorAll('.nx-console-line');
          lines.forEach((line, idx) => {
            schedule(idx * 260, () => line.classList.add('shown'));
          });
        });

        // SCENE 4: SYSTEM ONLINE & AUTO DELIVERY 24/7 (2.8s - 3.7s)
        schedule(2800, () => {
          introEl.classList.remove('sc-3');
          introEl.classList.add('sc-4');
        });

        // SCENE 5 & 6: Morph and reveal Hero seamlessly (3.7s)
        schedule(3700, () => {
          introEl.classList.add('sc-morph');
          
          // Smooth flying transition of intro logo into Hero Logo position
          const fromLogo = document.getElementById('nxIntroLogo');
          const toLogo = document.querySelector('.hero-logo-wrap');
          if (fromLogo && toLogo && fromLogo.animate) {
            const a = fromLogo.getBoundingClientRect();
            const b = toLogo.getBoundingClientRect();
            const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
            const dy = (b.top + b.height / 2) - (a.top + a.height / 2);
            const scale = b.width / (a.width || 90);

            fromLogo.animate([
              { transform: 'translate(0, 0) scale(1)' },
              { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(' + scale + ')' }
            ], {
              duration: 650,
              easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
              fill: 'forwards'
            });
          }

          cleanIntro();
        });
      }
    }
  } else {
    docEl.classList.remove('intro-active');
    docEl.classList.add('intro-revealed');
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
