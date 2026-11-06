/* SEVAR — shopping cart (localStorage). Quantities are always whole bags (чувал), minimum 1 per item. */
(function () {
  const KEY = 'sevar_cart', O = SEVAR.ORDER;
  const clamp = (n) => Math.min(O.max, Math.max(0, Math.round(Number(n) || 0)));
  const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (_) { return {}; } };
  let lines = read();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch (_) { /* storage unavailable */ } };

  const bagWord = (n) => n === 1 ? O.unit : O.units;
  const cart = SEVAR.cart = {
    bagWord,
    lines: () => ({ ...lines }),
    qty: (sku) => lines[sku] || 0,
    count: () => Object.values(lines).reduce((s, n) => s + n, 0),
    positions: () => Object.keys(lines).length,
    set(sku, qty) {
      qty = clamp(qty);
      if (qty < O.min) delete lines[sku]; else lines[sku] = qty;
      save(); cart.refresh();
    },
    add(sku, qty) { cart.set(sku, cart.qty(sku) + Math.max(O.min, clamp(qty))); },
    clear() { lines = {}; save(); cart.refresh(); },
    /* resolved lines for display: [{ sku, product, size, qty, slug, thumb }] — unknown SKUs are dropped */
    resolved() {
      const out = [];
      SEVAR.products.forEach(p => p.sizes.forEach(s => {
        const sku = SEVAR.sku(p, s);
        if (lines[sku]) out.push({ sku, slug: p.slug, product: p.name, size: s.label, thumb: p.thumb, qty: lines[sku], pack: s.pack, bag: s.bag, price: s.price, bagPrice: SEVAR.bagPrice(s), total: Math.round(lines[sku] * SEVAR.bagPrice(s) * 100) / 100 });
      }));
      return out;
    },
    /* gross (с ДДС) value of the whole cart */
    total: () => Math.round(cart.resolved().reduce((s, l) => s + l.total, 0) * 100) / 100,
    refresh() {
      const n = cart.count();
      document.querySelectorAll('[data-cart-count]').forEach(b => { b.textContent = n; b.hidden = !n; });
      document.dispatchEvent(new CustomEvent('sevar:cart'));
    }
  };

  /* keep several tabs in sync */
  window.addEventListener('storage', (e) => { if (e.key === KEY) { lines = read(); cart.refresh(); } });

  /* drop lines that no longer exist in the catalogue */
  const valid = new Set(); SEVAR.products.forEach(p => p.sizes.forEach(s => { if (SEVAR.orderable(s)) valid.add(SEVAR.sku(p, s)); }));
  Object.keys(lines).forEach(k => { if (!valid.has(k)) delete lines[k]; });
  save();

  /* customer details are remembered on this device to make the next order faster */
  const CK = 'sevar_customer';
  cart.customer = () => { try { return JSON.parse(localStorage.getItem(CK) || '{}') || {}; } catch (_) { return {}; } };
  cart.rememberCustomer = (c) => {
    c = { name: c.name, phone: c.phone, email: c.email, company: c.company, eik: c.eik, city: c.city }; try { localStorage.setItem(CK, JSON.stringify(c)); } catch (_) { /* ignore */ } };

  /* POST json to the site's server; resolves with the response body or throws Error(code) */
  cart.post = async function (url, payload) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'server_error');
    return d;
  };
  cart.errorText = (code) => ({
    name_and_phone_required: 'Моля, въведете име и телефон.', bad_email: 'Моля, въведете валиден имейл — на него ще получите потвърждение.',
    items_required: 'Изберете поне един артикул.', consent_required: 'Моля, потвърдете, че сте съгласни с условията.',
    delivery_required: 'Изберете начин на доставка.', payment_required: 'Изберете начин на плащане.',
    office_required: 'Въведете град и офис на куриера.', address_required: 'Въведете град и адрес за доставка.',
    invoice_required: 'За фактура са нужни фирма и ЕИК.', company_name_phone_required: 'Въведете фирма, лице за контакт и телефон.',
    items_or_message_required: 'Добавете артикули или опишете какво ви трябва.',
    too_many: 'Твърде много опити. Опитайте по-късно или се обадете по телефона.'
  })[code] || 'Не успяхме да изпратим заявката. Опитайте отново или се обадете по телефона.';

  /* "added to cart" feedback used by product page and B2B table */
  cart.notifyAdded = (qty, name) => SEVAR.toast && SEVAR.toast(`Добавено в количката: ${qty} ${bagWord(qty)} — ${name}`, 'success');
  cart.refresh();
})();
