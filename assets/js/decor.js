(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ══ INTRO: logo bay vào logo hero rồi trang chủ hiện dần ══
  const docEl = document.documentElement;
  let introTimer = null, introDone = false;
  function revealPage() {
    docEl.classList.add('intro-landed');
    docEl.classList.remove('intro-playing');
    document.body.style.overflow = '';
  }
  function skipIntro(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (introDone) return;
    introDone = true;
    clearTimeout(introTimer);
    const intro = document.getElementById('gamingIntro');
    if (!intro) { revealPage(); return; }
    const from = document.getElementById('dpIntroLogoBox');
    const target = document.querySelector('.hero-logo-wrap');
    intro.classList.add('qi-leaving');
    const finish = () => {
      if (target) {
        target.classList.add('qi-arrive');
        target.addEventListener('animationend', () => target.classList.remove('qi-arrive'), { once: true });
      }
      intro.remove();
    };
    if (!from || !target || reduced || !from.animate) {
      revealPage(); intro.style.opacity = '0'; setTimeout(finish, 400); return;
    }
    const a = from.getBoundingClientRect(), b = target.getBoundingClientRect();
    const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
    const dy = (b.top + b.height / 2) - (a.top + a.height / 2);
    const s = b.width / a.width;
    // nền tan dần để lộ trang chủ trong khi logo đang bay
    intro.style.backgroundColor = 'transparent';
    intro.style.background = 'transparent';
    revealPage();
    const anim = from.animate([
      { transform: 'translate(0,0) scale(1)' },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')' }
    ], { duration: 700, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards' });
    anim.onfinish = finish;
  }
  window.skipIntro = skipIntro;
  if (document.getElementById('gamingIntro')) {
    if (reduced) { skipIntro(); }
    else {
      document.body.style.overflow = 'hidden';
      scrollTo(0, 0);
      introTimer = setTimeout(skipIntro, 1700);
      addEventListener('keydown', ev => { if (ev.key === 'Escape' || ev.key === 'Enter') skipIntro(); }, { once: true });
    }
  } else { revealPage(); }

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
