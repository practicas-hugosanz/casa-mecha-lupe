/* Casa Mecha & Casa Lupe · interacciones */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => innerWidth <= 760;
  
  document.body.classList.add("loaded");

  /* ---------- nav ---------- */
  const nav = $('#nav'), burger = $('#burger'), links = $('#navLinks');
  const onScrollNav = () => nav.classList.toggle('scrolled', scrollY > 40 || links.classList.contains('open'));
  burger.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
    onScrollNav();
  });
  $$('a', links).forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open'); burger.setAttribute('aria-expanded', false); onScrollNav();
  }));

  /* ---------- awnings ---------- */
  const buildAwning = el => {
    const W = el.clientWidth || innerWidth, H = el.clientHeight || 64;
    const w = W < 600 ? 40 : 56, r = w / 2, n = Math.ceil(W / w) + 1;
    let paths = '';
    for (let i = 0; i < n; i++) {
      const x = i * w;
      paths += `<path d="M${x} 0h${w}v${H - r}a${r} ${r} 0 0 1 -${w} 0z" fill="${i % 2 ? '#FFFDF7' : '#F2EDE1'}"/>`;
    }
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>`;
  };
  const awnings = $$('[data-awning]');
  awnings.forEach(buildAwning);

  /* ---------- hero split ---------- */
  const hero = $('.hero');
  let split = 50, target = 50;
  if (!reduce) {
    hero.addEventListener('pointermove', e => {
      if (isMobile() || e.pointerType === 'touch') return;
      const r = hero.getBoundingClientRect();
      target = 50 + (0.5 - (e.clientX - r.left) / r.width) * 26;
    });
    hero.addEventListener('pointerleave', () => target = 50);
  }
  const heroStamps = $$('.hero-inner');

  /* ---------- marquees (duplicate for seamless loop) ---------- */
  $$('[data-marquee]').forEach(t => { t.innerHTML += t.innerHTML + t.innerHTML; });

  /* ---------- tiles ---------- */
  const tileColors = ['#C8303A', '#8DB0D3', '#F2C46B', '#F2EDE1', '#C8303A', '#8DB0D3'];
  const tilesEl = $('#tiles');
  const buildTiles = () => {
    const cols = parseInt(getComputedStyle(tilesEl).getPropertyValue('--cols')) || 24;
    const total = cols * 3;
    if (tilesEl.children.length === total) return;
    tilesEl.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const t = document.createElement('span');
      t.className = 'tile';
      t.dataset.c = Math.floor(Math.random() * tileColors.length);
      t.style.backgroundColor = tileColors[t.dataset.c];
      tilesEl.appendChild(t);
    }
  };
  buildTiles();
  tilesEl.addEventListener('pointerover', e => {
    const t = e.target.closest('.tile'); if (!t) return;
    t.dataset.c = (+t.dataset.c + 1 + Math.floor(Math.random() * 3)) % tileColors.length;
    t.style.backgroundColor = tileColors[t.dataset.c];
  });


  /* ---------- carta: mobile switch ---------- */
  const grid = $('.carta-grid'), sw = $('.carta-switch');
  $$('button', sw).forEach(b => b.addEventListener('click', () => {
    const side = b.dataset.side;
    grid.dataset.active = side;
    sw.classList.toggle('lupe', side === 'lupe');
    $$('button', sw).forEach(x => x.setAttribute('aria-selected', x === b));
    $$('.reveal', grid).forEach(r => r.classList.add('in'));
  }));

  /* ---------- carta: photo peek ---------- */
  const peek = $('#peek'), peekImg = $('img', peek);
  let px = 0, py = 0, tx = 0, ty = 0, peekOn = false;
  $$('[data-peek]').forEach(el => {
    el.addEventListener('pointerenter', e => {
      if (e.pointerType === 'touch') return;
      peekImg.src = el.dataset.peek; peekOn = true; peek.classList.add('on');
      tx = px = e.clientX; ty = py = e.clientY;
    });
    el.addEventListener('pointerleave', () => { peekOn = false; peek.classList.remove('on'); });
  });
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });

  /* ---------- horizontal gallery ---------- */
  const cocina = $('#galeria'), track = $('#track'), bar = $('#progressBar');
  const updateGallery = () => {
    if (isMobile()) { track.style.transform = ''; return; }
    const r = cocina.getBoundingClientRect();
    const total = cocina.offsetHeight - innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / total));
    const dist = track.scrollWidth - innerWidth;
    track.style.transform = `translate3d(${-p * Math.max(0, dist)}px,0,0)`;
    bar.style.transform = `scaleX(${p})`;
  };

  /* ---------- tilt cards ---------- */
  $$('[data-tilt]').forEach(card => {
    const base = card.classList.contains('g-mecha') ? -1.5 : 1.5;
    card.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch' || reduce) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `perspective(1000px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) rotate(${base}deg)`;
    });
    card.addEventListener('pointerleave', () => card.style.transform = '');
  });

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- main loop ---------- */
  const tick = () => {
    // hero split
    split += (target - split) * .08;
    hero.style.setProperty('--split', split.toFixed(2) + '%');
    // hero parallax
    if (scrollY < innerHeight && !reduce) {
      const k = scrollY / innerHeight;
      heroStamps.forEach((s, i) => s.style.transform = `translateY(${k * (i ? 90 : 60)}px) rotate(${(i ? 1 : -1) * k * 6}deg)`);
    }
    // peek
    px += (tx - px) * .18; py += (ty - py) * .18;
    if (peekOn) peek.style.transform = `translate(${px + 24}px,${py - 140}px) rotate(${(tx - px) * .15 - 4}deg) scale(1)`;
    else peek.style.transform = `translate(${px + 24}px,${py - 140}px) scale(.6) rotate(-6deg)`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const onScroll = () => { onScrollNav(); updateGallery(); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { awnings.forEach(buildAwning); buildTiles(); updateGallery(); });
  onScroll();
})();

