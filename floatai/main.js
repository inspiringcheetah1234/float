// Float AI site behaviour: WhatsApp links, nav state, scroll reveals, hero particle field.
(() => {
  const WHATSAPP = '923014652554';
  const WA_TEXT = "Hi Float, I'd like to book a call about a system for my business.";
  const waUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(WA_TEXT)}`;

  document.querySelectorAll('[data-wa]').forEach((a) => {
    a.href = waUrl;
    a.target = '_blank';
    a.rel = 'noopener';
  });

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Nav gets a solid edge once the page scrolls.
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('nav--scrolled', window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll reveals.
  const reveals = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('visible'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el) => io.observe(el));
  }

  // Hero particle field: slow floating points, linked when close.
  const canvas = document.getElementById('field');
  if (!canvas || reduce) return;
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1, pts = [], raf = 0, running = true;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(90, (w * h) / 16000));
    pts = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.18, vy: -Math.random() * 0.22 - 0.04,
      r: Math.random() * 1.4 + 0.4,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
      if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
    }
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j];
        const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < 11000) {
          ctx.strokeStyle = `rgba(62,232,214,${0.10 * (1 - d2 / 11000)})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    for (const p of pts) {
      ctx.fillStyle = 'rgba(62,232,214,0.55)';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    if (running) raf = requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener('resize', () => { cancelAnimationFrame(raf); resize(); if (running) draw(); });

  // Pause when the hero is off-screen.
  new IntersectionObserver(([e]) => {
    const was = running; running = e.isIntersecting;
    if (running && !was) draw();
  }).observe(canvas);
})();
