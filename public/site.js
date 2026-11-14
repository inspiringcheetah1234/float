(function () {
  'use strict';

  const R = window.RESTAURANT;
  const MENU = window.MENU;
  const CART_KEY = 'tmf-cart-v1';
  const orderingLive = /^\d{10,15}$/.test(R.whatsapp) && !/^920+$/.test(R.whatsapp);
  const MODE_LABELS = { delivery: 'Delivery order', pickup: 'Pickup order', dinein: 'Table booking' };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const rs = (n) => 'Rs ' + n.toLocaleString('en-PK');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Menu lookup ----------
  // Every orderable thing gets a key: item id, plus option index for sized items.
  const products = {};
  MENU.forEach((cat) => cat.items.forEach((item) => {
    // "Special" versions share a name with the regular dish, so keep the tag in the cart.
    const name = item.tag === 'Special' ? item.name + ' Special' : item.name;
    if (item.options) {
      item.options.forEach((opt, i) => {
        products[item.id + ':' + i] = { name, size: opt.label, price: opt.price };
      });
    } else {
      products[item.id] = { name, size: '', price: item.price };
    }
  }));

  // ---------- Cart state ----------
  let cart = load();

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
      // Drop anything no longer on the menu.
      return Object.fromEntries(Object.entries(saved).filter(([k, q]) => products[k] && q > 0));
    } catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* storage unavailable */ }
  }
  function lines() {
    return Object.entries(cart).map(([key, qty]) => ({ key, qty, ...products[key], total: products[key].price * qty }));
  }
  const count = () => Object.values(cart).reduce((a, b) => a + b, 0);
  const subtotal = () => lines().reduce((a, l) => a + l.total, 0);

  function setQty(key, qty) {
    if (qty <= 0) delete cart[key]; else cart[key] = Math.min(qty, 99);
    save();
    renderCart();
  }

  // ---------- Static text from config ----------
  $$('[data-hours]').forEach((el) => { el.textContent = R.hours; });
  $$('[data-address]').forEach((el) => { el.textContent = R.address; });
  $$('[data-link]').forEach((el) => { el.href = window.SITE_LINKS[el.dataset.link]; });

  // ---------- Menu rendering ----------
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  $('#menu-tabs').innerHTML = MENU.map((cat) =>
    `<a href="#cat-${slug(cat.category)}">${esc(cat.category)}</a>`).join('');

  $('#menu-body').innerHTML = MENU.map((cat) => `
    <section class="menu__cat" id="cat-${slug(cat.category)}">
      <h3>${esc(cat.category)}</h3>
      ${cat.note ? `<p class="menu__note">${esc(cat.note)}</p>` : ''}
      <ul>
        ${cat.items.map((item) => `
          <li class="dish">
            <div class="dish__text">
              <h4>${esc(item.name)}${item.tag ? ` <span class="tag">${esc(item.tag)}</span>` : ''}</h4>
              ${item.desc ? `<p>${esc(item.desc)}</p>` : ''}
            </div>
            <div class="dish__buy">
              ${item.options
                ? item.options.map((o, i) => buyButton(item.id + ':' + i, o.label, o.price)).join('')
                : buyButton(item.id, '', item.price)}
            </div>
          </li>`).join('')}
      </ul>
    </section>`).join('');

  function buyButton(key, label, price) {
    return `<button class="add" type="button" data-add="${key}" aria-label="Add ${esc(products[key].name)}${label ? ' ' + esc(label) : ''} to order">
      ${label ? `<span class="add__label">${esc(label)}</span>` : ''}
      <span class="add__price">${rs(price)}</span>
      <span class="add__plus" aria-hidden="true">+</span>
      <span class="add__qty" data-qty="${key}" hidden></span>
    </button>`;
  }

  $('#menu-body').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    const key = btn.dataset.add;
    setQty(key, (cart[key] || 0) + 1);
    const p = products[key];
    toast(`Added ${p.name}${p.size ? ' (' + p.size + ')' : ''}`);
  });

  // ---------- Cart rendering ----------
  function renderCart() {
    const ls = lines();
    const n = count();

    $('#cart-count').textContent = n;
    $('#cart-count').hidden = n === 0;
    $('#cart-bar').hidden = n === 0 || !$('#drawer').hidden;
    $('#cart-bar-count').textContent = n + (n === 1 ? ' item' : ' items');
    $('#cart-bar-total').textContent = rs(subtotal());

    $$('[data-qty]').forEach((el) => {
      const q = cart[el.dataset.qty] || 0;
      el.textContent = q;
      el.hidden = q === 0;
      el.closest('.add').classList.toggle('add--in', q > 0);
    });

    $('#cart-lines').innerHTML = ls.map((l) => `
      <li class="line">
        <div class="line__name">${esc(l.name)}${l.size ? `<span>${esc(l.size)}</span>` : ''}</div>
        <div class="stepper">
          <button type="button" data-dec="${l.key}" aria-label="Remove one ${esc(l.name)}">−</button>
          <span aria-live="polite">${l.qty}</span>
          <button type="button" data-inc="${l.key}" aria-label="Add one ${esc(l.name)}">+</button>
        </div>
        <div class="line__total">${rs(l.total)}</div>
      </li>`).join('');
    $('#cart-empty').hidden = ls.length > 0;
    $('#cart-subtotal').textContent = rs(subtotal());
    $('#to-checkout').disabled = ls.length === 0;

    if (!$('#step-checkout').hidden) renderSummary();
  }

  $('#cart-lines').addEventListener('click', (e) => {
    const inc = e.target.closest('[data-inc]');
    const dec = e.target.closest('[data-dec]');
    if (inc) setQty(inc.dataset.inc, cart[inc.dataset.inc] + 1);
    if (dec) setQty(dec.dataset.dec, cart[dec.dataset.dec] - 1);
  });

  // ---------- Drawer ----------
  const drawer = $('#drawer');
  let lastFocus = null;

  function openDrawer(step) {
    lastFocus = document.activeElement;
    drawer.hidden = false;
    document.body.classList.add('locked');
    $('#toast').hidden = true;
    showStep(step);
    renderCart();
  }
  function closeDrawer() {
    drawer.hidden = true;
    document.body.classList.remove('locked');
    if ($('#step-sent').hidden === false) showStep('cart');
    renderCart();
    if (lastFocus) lastFocus.focus();
  }
  function showStep(step) {
    $('#step-cart').hidden = step !== 'cart';
    $('#step-checkout').hidden = step !== 'checkout';
    $('#step-sent').hidden = step !== 'sent';
    $('#drawer-back').hidden = step !== 'checkout';
    $('#drawer-title').textContent = step === 'checkout' ? 'Checkout' : step === 'sent' ? 'Sent to WhatsApp' : 'Your Order';
    if (step === 'checkout') { applyMode(); renderSummary(); }
    const focusable = $(step === 'cart' ? '#step-cart' : step === 'checkout' ? '#f-name' : '#wa-retry');
    setTimeout(() => (focusable.focus ? focusable.focus({ preventScroll: true }) : null), 50);
  }

  $('#cart-open').addEventListener('click', () => openDrawer('cart'));
  $('#cart-bar').addEventListener('click', () => openDrawer('cart'));
  $('#to-checkout').addEventListener('click', () => {
    if (form.mode.value === 'dinein' && count() > 0) form.mode.value = 'delivery';
    showStep('checkout');
  });
  $('#drawer-back').addEventListener('click', () => showStep('cart'));
  $$('[data-close]').forEach((el) => el.addEventListener('click', closeDrawer));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) closeDrawer(); });

  // Any "Book a table" button jumps straight to checkout in booking mode.
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-checkout]');
    if (!b) return;
    form.mode.value = b.dataset.checkout;
    if (drawer.hidden) openDrawer('checkout'); else showStep('checkout');
  });

  // ---------- Checkout form ----------
  const form = $('#step-checkout');
  $('#step-cart').tabIndex = -1;

  // Guests 1–20, then a "more" option.
  $('#f-guests').innerHTML = Array.from({ length: 20 }, (_, i) =>
    `<option value="${i + 1}"${i === 3 ? ' selected' : ''}>${i + 1} ${i ? 'guests' : 'guest'}</option>`).join('') +
    '<option value="20+">More than 20</option>';

  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const fmtTime = (min) => {
    const h = Math.floor(min / 60), m = min % 60;
    return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'am' : 'pm'}`;
  };

  const today = new Date();
  const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 30);
  form.date.min = isoDate(today);
  form.date.max = isoDate(maxDate);
  form.date.value = isoDate(today);

  // Time slots for the chosen day; today skips slots less than 45 minutes away.
  function renderTimes() {
    const prev = form.time.value;
    const start = toMin(R.openTime), end = toMin(R.closeTime);
    const now = new Date();
    const earliest = form.date.value === isoDate(now) ? now.getHours() * 60 + now.getMinutes() + 45 : 0;
    const opts = [];
    for (let t = start; t <= end; t += R.slotMinutes) if (t >= earliest) opts.push(t);
    form.time.innerHTML = opts.length
      ? opts.map((t) => `<option value="${t}">${fmtTime(t)}</option>`).join('')
      : '<option value="">No times left today</option>';
    if (opts.map(String).includes(prev)) form.time.value = prev;
    else if (form.mode.value === 'dinein') {
      // Default bookings to 8pm when available.
      const eight = opts.find((t) => t >= 20 * 60);
      if (eight !== undefined) form.time.value = String(eight);
    }
  }
  form.date.addEventListener('change', renderTimes);

  function applyMode() {
    const mode = form.mode.value;
    const scheduled = mode !== 'delivery' || form.when.value === 'later';
    $$('[data-for="delivery"]').forEach((el) => { el.hidden = mode !== 'delivery'; });
    $$('[data-for="dinein"]').forEach((el) => { el.hidden = mode !== 'dinein'; });
    $$('[data-for="schedule"]').forEach((el) => { el.hidden = !scheduled; });
    $('#submit-label').textContent = mode === 'dinein' ? 'Book on WhatsApp' : 'Order on WhatsApp';
    $('#mode-hint').textContent = {
      delivery: R.deliveryNote,
      pickup: 'Collect from ' + R.address + '. We’ll have it ready at your chosen time.',
      dinein: count() > 0
        ? 'The dishes in your order will be sent as a pre-order for your table.'
        : 'Want food ready when you arrive? Add dishes from the menu as a pre-order.',
    }[mode];
    renderTimes();
    clearErrors();
    renderSummary();
  }
  form.addEventListener('change', (e) => { if (e.target.name === 'mode' || e.target.name === 'when') applyMode(); });

  function renderSummary() {
    const ls = lines();
    const mode = form.mode.value;
    if (!ls.length) {
      $('#summary').innerHTML = mode === 'dinein' ? '' : '<p class="muted">Your order is empty. Add dishes from the menu first.</p>';
      return;
    }
    $('#summary').innerHTML = `
      <h3>${mode === 'dinein' ? 'Pre-order' : 'Order'}</h3>
      <ul>${ls.map((l) => `<li><span>${l.qty} × ${esc(l.name)}${l.size ? ' (' + esc(l.size) + ')' : ''}</span><span>${rs(l.total)}</span></li>`).join('')}</ul>
      <div class="total-row"><span>Subtotal</span><strong>${rs(subtotal())}</strong></div>`;
  }

  function clearErrors() { $$('[data-error]', form).forEach((el) => { el.textContent = ''; }); }
  form.addEventListener('input', (e) => {
    const el = $(`[data-error="${e.target.name}"]`, form);
    if (el) el.textContent = '';
  });

  function validate(d) {
    const errors = {};
    if (d.name.length < 2) errors.name = 'Please enter your name.';
    if (!/^\+?[\d\s-]{10,15}$/.test(d.phone)) errors.phone = 'Please enter a valid phone number, e.g. 0300 1234567.';
    if (d.mode === 'delivery') {
      if (d.address.length < 5) errors.address = 'Please enter your delivery address.';
      if (d.area.length < 2) errors.area = 'Please enter your area.';
    }
    if (d.scheduled) {
      if (!d.date || d.date < form.date.min || d.date > form.date.max) errors.date = 'Please choose a date within the next 30 days.';
      if (!d.time) errors.time = 'Please choose a time.';
    }
    if (d.mode !== 'dinein' && !count()) errors.cart = 'Add at least one dish from the menu.';
    return errors;
  }

  function buildMessage(d) {
    const out = [`*The Mountain Flame — ${MODE_LABELS[d.mode]}*`, '', `*Name:* ${d.name}`, `*Phone:* ${d.phone}`];
    if (d.mode === 'delivery') out.push(`*Address:* ${d.address}, ${d.area}`);
    if (d.mode === 'dinein') out.push(`*Guests:* ${d.guests}`);
    if (d.scheduled) {
      const label = new Date(d.date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      out.push(`*${d.mode === 'dinein' ? 'Date' : d.mode === 'pickup' ? 'Pickup' : 'Deliver on'}:* ${label}, ${fmtTime(Number(d.time))}`);
    } else {
      out.push('*Deliver:* As soon as possible');
    }
    const ls = lines();
    if (ls.length) {
      out.push('', `*${d.mode === 'dinein' ? 'Pre-order' : 'Order'}*`);
      ls.forEach((l) => out.push(`${l.qty} × ${l.name}${l.size ? ' (' + l.size + ')' : ''} — ${rs(l.total)}`));
      out.push(`*Subtotal:* ${rs(subtotal())}`);
      if (d.mode === 'delivery') out.push('_Delivery charges to be confirmed_');
    }
    if (d.notes) out.push('', `*Notes:* ${d.notes}`);
    return out.join('\n');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();
    const fd = new FormData(form);
    const get = (k) => String(fd.get(k) || '').trim();
    const d = {
      mode: get('mode'), name: get('name'), phone: get('phone'), address: get('address'), area: get('area'),
      date: get('date'), time: get('time'), guests: get('guests'), notes: get('notes'),
    };
    d.scheduled = d.mode !== 'delivery' || get('when') === 'later';

    const errors = validate(d);
    if (Object.keys(errors).length) {
      Object.entries(errors).forEach(([k, msg]) => { const el = $(`[data-error="${k}"]`, form); if (el) el.textContent = msg; });
      const first = Object.keys(errors)[0];
      const field = form.elements[first];
      if (field && field.focus) field.focus(); else $(`[data-error="${first}"]`, form).scrollIntoView({ block: 'center' });
      return;
    }

    // Until a real number is set in config.js, don't send orders to a number nobody reads.
    if (!orderingLive) {
      $('[data-error="cart"]', form).textContent =
        'Online ordering opens soon. For now, message us on Instagram @tmflame_ to order or book.';
      return;
    }

    const url = `https://wa.me/${R.whatsapp}?text=${encodeURIComponent(buildMessage(d))}`;
    $('#wa-retry').href = url;
    // Opened inside the submit handler so browsers treat it as a user action.
    const win = window.open(url, '_blank', 'noopener');
    if (!win) window.location.href = url;
    showStep('sent');
  });

  $('#start-over').addEventListener('click', () => {
    cart = {};
    save();
    form.notes.value = '';
    renderCart();
    closeDrawer();
    document.getElementById('menu').scrollIntoView();
  });

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 1800);
  }

  renderCart();
})();
