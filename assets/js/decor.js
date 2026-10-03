(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ══ INTRO 5 scene → kết thúc đúng bằng Hero ══
  const docEl = document.documentElement;
  const intro = document.getElementById('gamingIntro');
  const timers = [];
  let entered = false;
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));

  function showPage() {
    docEl.classList.add('intro-landed');
    docEl.classList.remove('intro-playing');
    document.body.style.overflow = '';
  }
  function fly(el, target) {
    const a = el.getBoundingClientRect(), b = target.getBoundingClientRect();
    if (!a.width || !b.width) return null;
    const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
    const dy = (b.top + b.height / 2) - (a.top + a.height / 2);
    return el.animate([{ transform: getComputedStyle(el).transform === 'none' ? 'none' : getComputedStyle(el).transform },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + (b.width / a.width) + ')' }],
      { duration: 750, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards' });
  }
  function enterStore(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (entered) return;
    entered = true;
    timers.forEach(clearTimeout);
    try { sessionStorage.setItem('qvaIntroSeen', '1'); } catch (_) {}
    if (!intro) { showPage(); docEl.classList.remove('intro-hold'); return; }
    // đảm bảo logo + WELCOME đang hiện (trường hợp bấm Bỏ qua sớm)
    intro.classList.add('s2', 's4');
    intro.classList.remove('s1', 's3');
    const logo = document.getElementById('qiLogo'), welcome = document.getElementById('qiWelcome');
    const heroLogo = document.querySelector('.hero-logo-wrap'), heroTitle = document.querySelector('.hero-title:not(.qi-welcome)');
    intro.classList.add('qi-leaving');
    showPage();
    const anims = [];
    if (!reduced && logo.animate && heroLogo && heroTitle) {
      requestAnimationFrame(() => {
        [fly(logo, heroLogo), fly(welcome, heroTitle)].forEach(a => a && anims.push(a.finished));
        Promise.all(anims).then(land, land);
      });
    } else { land(); }
    function land() {
      docEl.classList.remove('intro-hold');
      if (heroLogo) {
        heroLogo.classList.add('qi-arrive');
        heroLogo.addEventListener('animationend', () => heroLogo.classList.remove('qi-arrive'), { once: true });
      }
      intro.style.opacity = '0';
      setTimeout(() => intro.remove(), 250);
    }
  }
  window.skipIntro = enterStore;

  if (!intro) { showPage(); docEl.classList.remove('intro-hold'); }
  else if (reduced) { enterStore(); }
  else {
    document.body.style.overflow = 'hidden';
    scrollTo(0, 0);
    document.getElementById('qiEnter').addEventListener('click', enterStore);
    document.getElementById('qiSkip').addEventListener('click', enterStore);
    addEventListener('keydown', ev => { if (ev.key === 'Escape' || ev.key === 'Enter') enterStore(); });
    let seen = false;
    try { seen = sessionStorage.getItem('qvaIntroSeen') === '1'; } catch (_) {}
    const go = c => () => intro.classList.add(c);
    if (seen) {
      // đã xem trong phiên này: bản ngắn (logo → WELCOME → vào luôn)
      at(30, go('s2')); at(350, go('s4')); at(1300, enterStore);
    } else {
      at(30, go('s1'));        // SYSTEM + scan
      at(800, go('s2'));       // logo + brand
      at(1500, go('s3'));      // status lines
      at(2900, go('s4'));      // pulse + WELCOME TO
      at(3500, go('s5'));      // ENTER STORE
      at(5300, enterStore);    // tự vào
    }
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
      if (!document.hidden && !docEl.classList.contains('intro-playing')) {
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
