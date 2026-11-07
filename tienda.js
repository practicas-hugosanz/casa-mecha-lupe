/* Casa Mecha & Casa Lupe · tienda online (pedido para recoger)
   - Sin servidor: el pedido se envía como mensaje de WhatsApp al local.
   - Para cambiar precios o productos, edita CATS y PRODUCTS.
   - Para cambiar el número que recibe los pedidos, edita WHATSAPP. */
(() => {
  const WHATSAPP = '34603088158';
  // Franja de recogida por día (0 = domingo). Último pase 30 min antes del cierre.
  const PICKUP = { 0: [19, 24], 3: [19, 24], 4: [19, 24], 5: [19, 24], 6: [19, 24] };
  const SLOT = 15, LEAD = 30; // minutos entre pases · antelación mínima

  const SABORES = ['Queso', 'Vainilla', 'Nata', 'Mantecado', 'Pistacho', 'Chocolate Dubái', 'Dulce de leche', 'Chocolate', 'Black Cookies', 'Fresa', 'Kinder Bueno'];

  const ICONS = {
    totopos: '<path d="M8 38 20 10l12 28z"/><path d="M24 38l8-20 10 20z"/><circle cx="18" cy="28" r="1.4"/><circle cx="34" cy="31" r="1.4"/>',
    granizados: '<path d="M12 16h24l-3 26H15z"/><path d="M10 16h28"/><path d="M26 16l6-10h4"/>',
  };

  const CATS = [
    { id: 'tacos', name: 'Tacos', brand: 'mecha', img: 'img/tacos-casa-mecha.webp', alt: 'Tacos de Casa Mecha' },
    { id: 'brioche', name: 'Brioche', brand: 'mecha', img: 'img/brioches-casa-mecha.webp', alt: 'Brioches de Casa Mecha' },
    { id: 'totopos', name: 'Totopos', sub: 'nachos', brand: 'mecha', icon: 'totopos' },
    { id: 'helados', name: 'Helados', brand: 'lupe', img: 'img/fachada-casa-lupe-tarrina-helado.webp', alt: 'Tarrina de helado de Casa Lupe' },
    { id: 'granizados', name: 'Granizados', brand: 'lupe', icon: 'granizados' },
    { id: 'reposteria', name: 'Repostería', brand: 'lupe', img: 'img/berlina-helado-pistacho.webp', alt: 'Berlina con helado de pistacho' },
  ];

  const PRODUCTS = [
    { id: 'taco-pollo', cat: 'tacos', name: 'Taco Pollo Mecha', price: 3.5 },
    { id: 'taco-atun', cat: 'tacos', name: 'Taco Atún Mecha', price: 3.5 },
    { id: 'brioche-wagyu', cat: 'brioche', name: 'Brioche de wagyu japonés', price: 3.8 },
    { id: 'brioche-jamon', cat: 'brioche', name: 'Brioche de jamón ibérico', price: 3.8 },
    { id: 'totopos-guacamole', cat: 'totopos', name: 'Totopos con pico de gallo y guacamole', desc: 'Para compartir.', price: 3.8 },
    { id: 'totopos-pulled', cat: 'totopos', name: 'Totopos con pulled de cerdo y cheddar', desc: 'Para compartir.', price: 3.8 },
    {
      id: 'tarrina', cat: 'helados', name: 'Tarrina de helado', desc: 'Con 1 topping a elegir (dínoslo en las notas o al recoger).', wide: true,
      opts: [
        { type: 'seg', key: 'size', label: 'Tamaño', choices: [{ v: 'Pequeña', p: 1.9 }, { v: 'Mediana', p: 3.5 }, { v: 'Grande', p: 4.9 }], def: 1 },
        { type: 'select', key: 'flavor', label: 'Sabor', choices: SABORES },
        { type: 'check', key: 'extra', label: 'Topping extra', p: 0.8 },
      ],
    },
    {
      id: 'granizado', cat: 'granizados', name: 'Granizado', wide: true,
      opts: [{ type: 'seg', key: 'flavor', label: 'Sabor', choices: [{ v: 'Limón', p: 2 }, { v: 'Horchata', p: 2.2 }, { v: 'Café', p: 2.2 }, { v: 'Leche preparada', p: 2.2 }] }],
    },
    {
      id: 'berlina', cat: 'reposteria', name: 'Berlina con helado', desc: 'Con 1 topping a elegir.', price: 4.4,
      opts: [{ type: 'select', key: 'flavor', label: 'Helado', choices: SABORES }],
    },
    { id: 'farton', cat: 'reposteria', name: 'Fartón', price: 0.8 },
    { id: 'bunuelos', cat: 'reposteria', name: 'Buñuelos con pistacho', desc: '3 unidades.', price: 2 },
    { id: 'bizcocho', cat: 'reposteria', name: 'Bizcocho de manzana y canela', price: 1.5 },
  ];

  /* ---------- helpers ---------- */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const eur = n => n.toFixed(2).replace('.', ',') + ' €';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const byId = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
  const isDrawer = () => matchMedia('(max-width:1020px)').matches;

  /* ---------- nav + toldo ---------- */
  const nav = $('#nav'), burger = $('#burger'), links = $('#navLinks');
  burger.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && links.classList.contains('open')) { links.classList.remove('open'); burger.setAttribute('aria-expanded', false); burger.focus(); } });
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const buildAwning = el => {
    const W = el.clientWidth || innerWidth, H = el.clientHeight || 64;
    const w = W < 600 ? 40 : 56, r = w / 2, n = Math.ceil(W / w) + 1;
    let d = '';
    for (let i = 0; i < n; i++) d += `<path d="M${i * w} 0h${w}v${H - r}a${r} ${r} 0 0 1 -${w} 0z" fill="${i % 2 ? '#FFFDF7' : '#F2EDE1'}"/>`;
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${d}</svg>`;
  };
  const awnings = $$('[data-awning]'); awnings.forEach(buildAwning);
  addEventListener('resize', () => awnings.forEach(buildAwning));

  /* ---------- render menu ---------- */
  const optHTML = (p, o) => {
    const name = `${p.id}-${o.key}`;
    if (o.type === 'seg') {
      return `<fieldset class="opt seg"><legend>${o.label}</legend><div class="seg-row">${o.choices.map((c, i) =>
        `<label><input type="radio" name="${name}" value="${i}"${i === (o.def || 0) ? ' checked' : ''}><span>${c.v}<small>${eur(c.p)}</small></span></label>`).join('')}</div></fieldset>`;
    }
    if (o.type === 'select') {
      return `<label class="opt sel"><span>${o.label}</span><select name="${name}">${o.choices.map(c => `<option>${c}</option>`).join('')}</select></label>`;
    }
    return `<label class="opt chk"><input type="checkbox" name="${name}"><span>${o.label} <small>+${eur(o.p)}</small></span></label>`;
  };

  const productHTML = p => `
    <article class="item${p.wide ? ' wide' : ''}" data-id="${p.id}">
      <div class="item-top">
        <h3 class="item-name">${p.name}</h3>
        ${p.desc ? `<p class="item-desc">${p.desc}</p>` : ''}
      </div>
      ${p.opts ? `<div class="item-opts">${p.opts.map(o => optHTML(p, o)).join('')}</div>` : ''}
      <div class="item-foot">
        <span class="item-price" data-price>${eur(p.price || 0)}</span>
        <button class="add" type="button" aria-label="Añadir ${esc(p.name)} al pedido">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>
          <span>Añadir</span>
        </button>
      </div>
    </article>`;

  const menu = $('#menu'), catsNav = $('#cats');
  menu.insertAdjacentHTML('beforeend', CATS.map(c => `
    <section class="cat-block b-${c.brand}" id="${c.id}" aria-labelledby="h-${c.id}">
      <header class="cb-head">
        ${c.img
          ? `<img class="cb-thumb" src="${c.img}" alt="${c.alt}" width="160" height="160" loading="lazy" decoding="async">`
          : `<span class="cb-thumb cb-ico"><svg viewBox="0 0 48 48" aria-hidden="true">${ICONS[c.icon]}</svg></span>`}
        <div>
          <p class="cb-brand">Casa ${c.brand === 'mecha' ? 'Mecha' : 'Lupe'}</p>
          <h2 class="cb-name" id="h-${c.id}">${c.name}${c.sub ? ` <small>${c.sub}</small>` : ''}</h2>
        </div>
      </header>
      <div class="items">${PRODUCTS.filter(p => p.cat === c.id).map(productHTML).join('')}</div>
    </section>`).join(''));

  catsNav.innerHTML = `<div class="cats-row">${CATS.map(c => `<a href="#${c.id}" class="chip c-${c.brand}">${c.name}</a>`).join('')}</div>`;

  /* ---------- option pricing ---------- */
  const readItem = el => {
    const p = byId[el.dataset.id];
    let price = p.price || 0;
    const parts = [];
    (p.opts || []).forEach(o => {
      const name = `${p.id}-${o.key}`;
      if (o.type === 'seg') {
        const c = o.choices[+$(`input[name="${name}"]:checked`, el).value];
        price = c.p; parts.push(c.v);
      } else if (o.type === 'select') {
        parts.push($(`select[name="${name}"]`, el).value);
      } else if ($(`input[name="${name}"]`, el).checked) {
        price += o.p; parts.push(o.label.toLowerCase());
      }
    });
    return { p, price, detail: parts.join(' · ') };
  };
  $$('.item').forEach(el => {
    const upd = () => { $('[data-price]', el).textContent = eur(readItem(el).price); };
    el.addEventListener('change', upd); upd();
  });

  /* ---------- cart state ---------- */
  const KEY = 'cml-pedido-v1';
  let cart = store.get(KEY, []).filter(l => byId[l.id] && l.qty > 0);
  const save = () => store.set(KEY, cart);
  const total = () => cart.reduce((s, l) => s + l.unit * l.qty, 0);
  const count = () => cart.reduce((s, l) => s + l.qty, 0);

  const add = (id, detail, unit) => {
    const key = id + '|' + detail;
    const line = cart.find(l => l.key === key);
    if (line) line.qty++; else cart.push({ key, id, detail, unit, qty: 1 });
    save(); renderCart();
  };

  /* ---------- toast ---------- */
  const toast = $('#toast'); let tt;
  const say = msg => {
    toast.textContent = msg; toast.classList.add('on');
    clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('on'), 1800);
  };

  menu.addEventListener('click', e => {
    const btn = e.target.closest('.add'); if (!btn) return;
    const el = btn.closest('.item');
    const { p, price, detail } = readItem(el);
    add(p.id, detail, price);
    btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
    $('span', btn).textContent = 'Añadido';
    setTimeout(() => { $('span', btn).textContent = 'Añadir'; }, 1200);
    say(`${p.name}${detail ? ' (' + detail + ')' : ''} añadido`);
  });

  /* ---------- cart render ---------- */
  const lines = $('#cartLines'), empty = $('#cartEmpty'), totalRow = $('#cartTotalRow');
  const form = $('#checkout'), sent = $('#sent'), bar = $('#cartBar');
  let sentMode = false;

  function renderCart() {
    const n = count(), t = total();
    $$('[data-count]').forEach(e => { e.textContent = n; });
    $('#cartTotal').textContent = eur(t);
    $('#cartBarTotal').textContent = eur(t);
    bar.hidden = n === 0;
    document.body.classList.toggle('has-bar', n > 0);
    empty.hidden = n > 0 || sentMode;
    totalRow.hidden = n === 0 || sentMode;
    form.hidden = n === 0 || sentMode;
    sent.hidden = !sentMode;
    lines.hidden = sentMode;
    lines.innerHTML = cart.map(l => {
      const p = byId[l.id];
      return `<li class="line b-${CATS.find(c => c.id === p.cat).brand}" data-key="${esc(l.key)}">
        <div class="ln-txt"><b>${p.name}</b>${l.detail ? `<small>${esc(l.detail)}</small>` : ''}</div>
        <div class="ln-qty">
          <button type="button" data-d="-1" aria-label="Quitar uno de ${esc(p.name)}">−</button>
          <span aria-label="Cantidad">${l.qty}</span>
          <button type="button" data-d="1" aria-label="Añadir otro ${esc(p.name)}">+</button>
        </div>
        <span class="ln-price">${eur(l.unit * l.qty)}</span>
      </li>`;
    }).join('');
  }
  lines.addEventListener('click', e => {
    const b = e.target.closest('button[data-d]'); if (!b) return;
    const key = b.closest('.line').dataset.key;
    const l = cart.find(x => x.key === key);
    l.qty += +b.dataset.d;
    if (l.qty <= 0) cart = cart.filter(x => x !== l);
    save(); renderCart();
  });

  /* ---------- drawer (móvil/tablet) ---------- */
  const cartEl = $('#cart'), scrim = $('#scrim');
  const openCart = () => {
    if (!isDrawer()) { cartEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); cartEl.classList.remove('flash'); void cartEl.offsetWidth; cartEl.classList.add('flash'); return; }
    cartEl.classList.add('open'); scrim.hidden = false; document.body.classList.add('lock');
    requestAnimationFrame(() => scrim.classList.add('on'));
    cartEl.focus({ preventScroll: true });
  };
  const closeCart = () => {
    cartEl.classList.remove('open'); scrim.classList.remove('on'); document.body.classList.remove('lock');
    setTimeout(() => { if (!cartEl.classList.contains('open')) scrim.hidden = true; }, 300);
  };
  bar.addEventListener('click', openCart);
  $('#navCart').addEventListener('click', openCart);
  $('#cartClose').addEventListener('click', closeCart);
  scrim.addEventListener('click', closeCart);
  addEventListener('resize', () => { if (!isDrawer() && cartEl.classList.contains('open')) closeCart(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && cartEl.classList.contains('open')) closeCart(); });

  /* ---------- recogida: días y horas ---------- */
  const daySel = $('#coDay'), timeSel = $('#coTime');
  const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const slotsFor = (date, now) => {
    const [o, c] = PICKUP[date.getDay()];
    const min = now ? now.getHours() * 60 + now.getMinutes() + LEAD : 0;
    const out = [];
    for (let m = o * 60; m <= c * 60 - 30; m += SLOT) if (m >= min) out.push(m);
    return out;
  };
  let days = [];
  const buildDays = () => {
    const now = new Date();
    days = [];
    for (let i = 0; i < 14 && days.length < 5; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      if (!(d.getDay() in PICKUP)) continue;
      const slots = slotsFor(d, i === 0 ? now : null);
      if (!slots.length) continue;
      const long = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
      const wd = d.toLocaleDateString('es-ES', { weekday: 'long' });
      const label = i === 0 ? `Hoy (${wd} ${d.getDate()})` : i === 1 ? `Mañana (${wd} ${d.getDate()})` : `${wd[0].toUpperCase() + wd.slice(1)} ${d.getDate()}`;
      days.push({ label, long, slots });
    }
    const prev = daySel.value;
    daySel.innerHTML = days.map((d, i) => `<option value="${i}">${d.label}</option>`).join('');
    if (prev && days[prev]) daySel.value = prev;
    buildTimes();
  };
  const buildTimes = () => {
    const d = days[+daySel.value || 0];
    const prev = timeSel.value;
    timeSel.innerHTML = d ? d.slots.map(m => `<option>${hhmm(m)}</option>`).join('') : '';
    if ([...timeSel.options].some(o => o.value === prev)) timeSel.value = prev;
  };
  daySel.addEventListener('change', buildTimes);
  buildDays();

  /* ---------- datos guardados del cliente ---------- */
  const who = store.get('cml-cliente-v1', {});
  if (who.name) $('#coName').value = who.name;
  if (who.phone) $('#coPhone').value = who.phone;

  /* ---------- enviar ---------- */
  const err = $('#coError');
  form.addEventListener('submit', e => {
    e.preventDefault();
    buildDays();
    const name = $('#coName').value.trim(), phone = $('#coPhone').value.trim(), notes = $('#coNotes').value.trim();
    const bad = [];
    if (!name) bad.push($('#coName'));
    if (phone.replace(/\D/g, '').length < 9) bad.push($('#coPhone'));
    if (!days.length) { err.textContent = 'Ahora mismo no hay horas de recogida disponibles.'; return; }
    $$('.fld input', form).forEach(i => i.removeAttribute('aria-invalid'));
    if (bad.length) {
      bad.forEach(i => i.setAttribute('aria-invalid', 'true'));
      err.textContent = !name ? 'Dinos tu nombre para el pedido.' : 'Revisa el teléfono (9 cifras).';
      bad[0].focus();
      return;
    }
    err.textContent = '';
    store.set('cml-cliente-v1', { name, phone });

    const day = days[+daySel.value || 0];
    const msg = [
      '¡Hola! Quiero hacer un pedido para recoger 🛍️',
      '',
      ...cart.map(l => `• ${l.qty}× ${byId[l.id].name}${l.detail ? ' (' + l.detail + ')' : ''} — ${eur(l.unit * l.qty)}`),
      '',
      `*Total: ${eur(total())}*`,
      `Recogida: ${day.long}, a las ${timeSel.value}`,
      `Nombre: ${name}`,
      `Teléfono: ${phone}`,
      notes ? `Notas: ${notes}` : '',
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n').trim();

    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
    $('#sentAgain').href = url;
    window.open(url, '_blank', 'noopener');
    sentMode = true; renderCart();
  });

  $('#sentNew').addEventListener('click', () => {
    cart = []; save(); sentMode = false; $('#coNotes').value = ''; renderCart();
  });

  /* ---------- chips activos ---------- */
  const chips = $$('.chip', catsNav);
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    chips.forEach(c => c.classList.toggle('on', c.getAttribute('href') === '#' + en.target.id));
    const on = chips.find(c => c.classList.contains('on'));
    if (on) on.parentElement.scrollTo({ left: on.offsetLeft - 16, behavior: 'smooth' });
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('.cat-block').forEach(s => io.observe(s));

  renderCart();
  if (location.hash.length > 1) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
})();
