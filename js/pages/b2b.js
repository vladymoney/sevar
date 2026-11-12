/* SEVAR — B2B request: no prices and no payment; a manager picks it up and agrees the offer outside the site */
(function () {
  const root = document.getElementById('b2bRoot');
  if (!root) return;
  const I = SEVAR.icon, O = SEVAR.ORDER, S = SEVAR.SHOP, cart = SEVAR.cart;
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DRAFT = 'sevar_b2b_draft';
  const load = (k) => { try { const v = JSON.parse(localStorage.getItem(k) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (_) { return {}; } };
  const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* storage unavailable */ } };
  /* the same orderable sizes as the shop, but shown without prices */
  const valid = new Set(); SEVAR.products.forEach(p => p.sizes.forEach(s => { if (SEVAR.orderable(s)) valid.add(SEVAR.sku(p, s)); }));
  const clean = (m) => Object.fromEntries(Object.entries(m).filter(([k, v]) => valid.has(k) && v >= O.min));
  let qty = clean(load(DRAFT));
  /* coming from the cart ("B2B discount" prompt): take over its quantities */
  if (new URLSearchParams(location.search).get('from') === 'cart') {
    Object.entries(cart.lines()).forEach(([k, n]) => { if (valid.has(k) && n >= O.min) qty[k] = Math.max(qty[k] || 0, n); });
  }
  let catFilter = 'all', query = '';
  const total = () => Object.values(qty).reduce((s, n) => s + n, 0);
  const orderableOf = (p) => p.sizes.filter(SEVAR.orderable);
  const c = cart.customer();

  root.innerHTML = `
    <div class="b2b-steps">
      <div class="b2b-step"><span class="step-n">1</span><b>Пускате заявка</b><p>Изберете артикулите и количествата — или просто опишете какво ви трябва.</p></div>
      <div class="b2b-step"><span class="step-n">2</span><b>Мениджър се свързва с вас</b><p>До един работен ден ви търси лично — за цени, наличности и доставка.</p></div>
      <div class="b2b-step"><span class="step-n">3</span><b>Индивидуална оферта</b><p>Договаряме условията и изготвяме оферта или договор — извън сайта.</p></div>
    </div>
    <div class="order-note b2b-hint">${I('info')}<span>B2B заявката е за по-големи клиенти — търговци, аптеки, болници и домове за възрастни (ориентировъчно от <b>${S.b2bFrom} ${O.units}</b>). За по-малки количества поръчайте директно от <a href="products">магазина</a>.</span></div>

    <form id="b2bForm" novalidate>
      <section class="b2b-block">
        <h2>Какво ви трябва?</h2>
        <p>Отбележете артикулите и броя чували. Не е задължително — можете да опишете нуждите си и в полето за съобщение.</p>
        <div class="b2b-tools">
          <input class="input" id="b2bSearch" type="search" placeholder="Търси продукт или размер…" aria-label="Търсене">
          <div class="chips" id="b2bCats">${SEVAR.categories.map(k => `<button type="button" class="chip ${k.key === 'all' ? 'is-on' : ''}" data-cat="${k.key}">${k.label}</button>`).join('')}</div>
          <span class="spacer"></span>
          <button class="chip" type="button" id="b2bClear">Изчисти</button>
        </div>
        <div class="bq-grid" id="b2bGrid"></div>
        <p class="b2b-empty-hint" id="b2bNone" hidden>Няма продукти по това търсене.</p>
        <div class="field" style="margin-top:20px"><label for="bMsg">Съобщение / допълнителни нужди</label><textarea class="textarea" id="bMsg" name="message" rows="4" placeholder="Други артикули (напр. дамски превръзки Амая), обеми, желана периодичност на доставките…"></textarea></div>
        <div class="field" style="margin-top:14px"><label for="bFreq">Периодичност (по желание)</label><input class="input" id="bFreq" name="frequency" placeholder="напр. месечно, на тримесечие, еднократно"></div>
      </section>

      <section class="b2b-block" id="b2bData">
        <h2>Данни за фирмата</h2>
        <p>Мениджърът ще се свърже с вас на тези данни.</p>
        <div class="form-grid">
          <div class="field"><label for="bCompany">Фирма / организация <small>*</small></label><input class="input" id="bCompany" name="company" value="${esc(c.company || '')}" required autocomplete="organization"></div>
          <div class="field"><label for="bEik">ЕИК</label><input class="input" id="bEik" name="eik" value="${esc(c.eik || '')}"></div>
          <div class="field"><label for="bName">Лице за контакт <small>*</small></label><input class="input" id="bName" name="name" value="${esc(c.name || '')}" required autocomplete="name"></div>
          <div class="field"><label for="bPhone">Телефон <small>*</small></label><input class="input" id="bPhone" name="phone" type="tel" value="${esc(c.phone || '')}" required autocomplete="tel"></div>
          <div class="field"><label for="bEmail">Имейл</label><input class="input" id="bEmail" name="email" type="email" value="${esc(c.email || '')}" autocomplete="email"></div>
          <div class="field"><label for="bCity">Град</label><input class="input" id="bCity" name="city" value="${esc(c.city || '')}" autocomplete="address-level2"></div>
          <label class="checkbox span-2"><input type="checkbox" name="consent" required> Съгласен съм данните ми да бъдат използвани за връзка по тази заявка. <a href="privacy" target="_blank" rel="noopener">Политика за поверителност</a></label>
          <div class="span-2"><button class="btn btn-yellow btn-lg" type="submit" id="b2bSend"><span class="ico">${I('send')}</span><span>Изпрати B2B заявката</span></button></div>
        </div>
      </section>
    </form>

    <div class="b2b-bar" id="b2bBar" hidden>
      <div class="tot"><b id="tBags">0</b> <span id="tUnit"></span><span id="tPos"></span></div>
      <div class="btn-group"><a class="btn btn-white" href="#b2bData"><span class="ico">${I('arrow')}</span><span>Към данните</span></a></div>
    </div>`;

  const grid = root.querySelector('#b2bGrid');
  grid.innerHTML = SEVAR.products.filter(p => orderableOf(p).length).map(p => `
    <article class="b2b-prod" data-slug="${p.slug}" data-cat="${p.cat}" data-s="${esc((p.name + ' ' + orderableOf(p).map(s => s.label).join(' ')).toLowerCase())}">
      <header><img src="${p.thumb}" alt="" loading="lazy"><h3>${esc(p.name)}<small>${esc(p.catLabel)} · ${orderableOf(p).length} артикула</small></h3>
        <button class="fill" type="button" data-fill>+${O.min} ${O.unit} от всеки размер</button></header>
      ${orderableOf(p).map(s => { const sku = SEVAR.sku(p, s); return `<div class="b2b-row" data-sku="${esc(sku)}" data-s="${esc(s.label.toLowerCase())}">
        <span><span class="sz">${esc(s.label)}</span> <span class="pk">· чувал: ${s.bag} оп. × ${esc(s.pack)}</span></span>
        <input class="q" type="number" inputmode="numeric" min="${O.min}" max="${O.max}" placeholder="0" aria-label="${esc(p.name)} ${esc(s.label)} — ${O.units}">
        <span class="unit">${O.units}</span></div>`; }).join('')}
    </article>`).join('');

  function paint() {
    grid.querySelectorAll('.b2b-row').forEach(row => {
      const n = qty[row.dataset.sku] || 0, inp = row.querySelector('input');
      row.classList.toggle('is-set', n > 0);
      if (document.activeElement !== inp) inp.value = n || '';
    });
    grid.querySelectorAll('.b2b-prod').forEach(a => a.classList.toggle('has-qty', !!a.querySelector('.is-set')));
    const bags = total(), pos = Object.keys(qty).length;
    root.querySelector('#tBags').textContent = bags;
    root.querySelector('#tUnit').textContent = cart.bagWord(bags);
    root.querySelector('#tPos').textContent = `${pos} ${pos === 1 ? 'артикул' : 'артикула'}`;
    root.querySelector('#b2bBar').hidden = !bags;
    store(DRAFT, qty);
  }

  function filter() {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    grid.querySelectorAll('.b2b-prod').forEach(a => {
      const catOk = catFilter === 'all' || a.dataset.cat === catFilter;
      a.hidden = !(catOk && words.every(w => a.dataset.s.includes(w))); if (!a.hidden) shown++;
      const name = a.querySelector('h3').firstChild.textContent.toLowerCase();
      a.querySelectorAll('.b2b-row').forEach(r => { r.hidden = words.length > 0 && !words.every(w => r.dataset.s.includes(w) || name.includes(w)); });
    });
    root.querySelector('#b2bNone').hidden = shown > 0;
  }

  const setQty = (sku, n) => { n = Math.min(O.max, Math.round(Number(n)) || 0); if (n >= O.min) qty[sku] = n; else delete qty[sku]; };
  grid.addEventListener('input', (e) => { const row = e.target.closest('.b2b-row'); if (row) { setQty(row.dataset.sku, e.target.value); paint(); } });
  grid.addEventListener('change', (e) => { if (e.target.closest('.b2b-row')) paint(); });
  grid.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.target.matches('input.q')) return;
    e.preventDefault();
    const all = [...grid.querySelectorAll('.b2b-row:not([hidden]) input.q')].filter(i => !i.closest('.b2b-prod').hidden);
    const next = all[all.indexOf(e.target) + (e.shiftKey ? -1 : 1)];
    if (next) { next.focus(); next.select(); }
  });
  grid.addEventListener('click', (e) => {
    const f = e.target.closest('[data-fill]'); if (!f) return;
    f.closest('.b2b-prod').querySelectorAll('.b2b-row').forEach(r => { if (!qty[r.dataset.sku]) qty[r.dataset.sku] = O.min; });
    paint();
  });
  root.querySelector('#b2bSearch').addEventListener('input', (e) => { query = e.target.value.trim(); filter(); });
  root.querySelector('#b2bCats').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    catFilter = b.dataset.cat;
    root.querySelectorAll('#b2bCats .chip').forEach(k => k.classList.toggle('is-on', k === b)); filter();
  });
  root.querySelector('#b2bClear').addEventListener('click', () => { if (!total() || window.confirm('Да изчистя ли всички количества?')) { qty = {}; paint(); } });

  root.querySelector('#b2bForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const d = Object.fromEntries(new FormData(form).entries());
    if (!d.company.trim() || !d.name.trim() || !d.phone.trim()) { SEVAR.toast(cart.errorText('company_name_phone_required'), 'error'); return; }
    if (!total() && !d.message.trim()) { SEVAR.toast(cart.errorText('items_or_message_required'), 'error'); return; }
    if (!d.consent) { SEVAR.toast(cart.errorText('consent_required'), 'error'); return; }
    const btn = root.querySelector('#b2bSend'); btn.disabled = true;
    try {
      const res = await cart.post('api/b2b', {
        company: d.company, eik: d.eik, name: d.name, phone: d.phone, email: d.email, city: d.city,
        items: Object.entries(qty).map(([sku, n]) => ({ sku, qty: n })), message: d.message, frequency: d.frequency, consent: true
      });
      cart.rememberCustomer({ name: d.name, phone: d.phone, email: d.email, company: d.company, eik: d.eik, city: d.city });
      qty = {}; store(DRAFT, {});
      root.innerHTML = `<div class="cart-card order-done"><span class="icon-circle">${I('check')}</span>
        <h2>B2B заявката е изпратена!</h2><div class="num">${esc(res.number)}</div>
        <p>Получихме заявката${res.lines ? ` — ${res.lines} ${res.lines === 1 ? 'артикул' : 'артикула'}, общо ${res.bags} ${cart.bagWord(res.bags)}` : ''}. Мениджър ще се свърже с вас до един работен ден за цени, наличности и условия на доставка.</p>
        <div class="btn-group" style="justify-content:center;margin-top:18px"><a class="btn btn-yellow" href="./"><span class="ico">${I('arrow')}</span><span>Към началото</span></a></div></div>`;
      SEVAR.initButtons(root); window.scrollTo({ top: 0 });
    } catch (err) { btn.disabled = false; SEVAR.toast(cart.errorText(err.message), 'error'); }
  });

  SEVAR.initButtons(root);
  paint(); filter();
})();
