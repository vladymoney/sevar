/* SEVAR — checkout: contacts, delivery, payment, invoice, summary, send the order */
(function () {
  const root = document.getElementById('checkoutRoot');
  if (!root) return;
  const I = SEVAR.icon, O = SEVAR.ORDER, S = SEVAR.SHOP, cart = SEVAR.cart, C = SEVAR.company;
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eur = SEVAR.eur;
  let delivery = S.delivery[0].id, payment = SEVAR.shopPaymentsFor(delivery)[0].id;
  let done = null;

  let built = false;

  function doneView() {
    const cartRoot = document.getElementById('cartRoot'); if (cartRoot) cartRoot.hidden = true; /* the order is sent: hide the (now empty) cart */
    const t = done.totals;
    root.innerHTML = `<div class="cart-card order-done"><span class="icon-circle">${I('check')}</span>
      <h2>Благодарим ви за поръчката!</h2><div class="num">${esc(done.number)}</div>
      <p>Получихме ${done.lines} ${done.lines === 1 ? 'артикул' : 'артикула'} — общо ${done.bags} ${cart.bagWord(done.bags)}, <b>${eur(t.total)}</b> с ДДС. Ще се свържем с вас за потвърждение${done.email ? ` и ще изпратим резюме на <b>${esc(done.email)}</b>` : ''}.</p>
      ${done.bank ? `<div class="bank-box"><b>Данни за плащане</b><span>Получател: ${esc(done.bank.holder)}</span><span>IBAN: ${esc(done.bank.iban)}</span><span>Основание: поръчка ${esc(done.number)}</span><span>Сума: ${eur(t.total)}</span><small>Изпращаме стоката след постъпване на сумата.</small></div>` : ''}
      <div class="btn-group" style="justify-content:center;margin-top:18px"><a class="btn btn-yellow" href="products.html"><span class="ico">${I('arrow')}</span><span>Към магазина</span></a></div></div>`;
    SEVAR.initButtons(root); window.scrollTo({ top: 0 });
  }

  const opt = (name, id, checked, title, price, note) => `<label class="opt ${checked ? 'is-on' : ''}"><input type="radio" name="${name}" value="${id}" ${checked ? 'checked' : ''}>
    <span class="opt-main"><b>${title}</b>${note ? `<small>${note}</small>` : ''}</span><span class="opt-price">${price}</span></label>`;

  function build() {
    const c = cart.customer();
    root.innerHTML = `<div class="cart-layout">
      <form class="cart-card checkout-form" id="orderForm" novalidate>
        <h2><span class="step-n">1</span> Данни за контакт</h2>
        <div class="form-grid">
          <div class="field"><label for="kName">Име и фамилия <small>*</small></label><input class="input" id="kName" name="name" value="${esc(c.name || '')}" required autocomplete="name"></div>
          <div class="field"><label for="kPhone">Телефон <small>*</small></label><input class="input" id="kPhone" name="phone" type="tel" value="${esc(c.phone || '')}" required autocomplete="tel"></div>
          <div class="field span-2"><label for="kEmail">Имейл <small>* (за потвърждение)</small></label><input class="input" id="kEmail" name="email" type="email" value="${esc(c.email || '')}" required autocomplete="email"></div>
        </div>

        <h2><span class="step-n">2</span> Доставка</h2>
        <div class="opts" id="dOpts"></div>
        <div class="form-grid" id="dFields">
          <div class="field" data-k="office address"><label for="dCity">Град <small>*</small></label><input class="input" id="dCity" name="d_city" value="${esc(c.city || '')}" autocomplete="address-level2"></div>
          <div class="field" data-k="office"><label for="dOffice">Офис на куриера <small>*</small></label><input class="input" id="dOffice" name="d_office" placeholder="напр. Еконт офис Петрич, ул. …"></div>
          <div class="field span-2" data-k="address"><label for="dAddr">Адрес за доставка <small>*</small></label><input class="input" id="dAddr" name="d_address" placeholder="улица, номер, вход, етаж, апартамент" autocomplete="street-address"></div>
          <div class="field span-2 pickup-info" data-k="pickup"><div class="order-note" style="margin:0">${I('info')}<span>Склад: ${esc(C.address.street)}, ${esc(C.address.city)}. Работно време: ${C.hours.slice(0, 2).map(h => `${esc(h.d)} ${esc(h.h)}`).join('; ')}. Ще ви се обадим, когато поръчката е готова.</span></div></div>
        </div>

        <h2><span class="step-n">3</span> Плащане</h2>
        <div class="opts" id="pOpts"></div>

        <h2><span class="step-n">4</span> Фактура и бележка</h2>
        <label class="checkbox"><input type="checkbox" name="inv_want" id="invWant"> Искам фактура на фирма</label>
        <div class="form-grid" id="invBox" hidden>
          <div class="field"><label for="iCompany">Фирма <small>*</small></label><input class="input" id="iCompany" name="inv_company" autocomplete="organization"></div>
          <div class="field"><label for="iEik">ЕИК <small>*</small></label><input class="input" id="iEik" name="inv_eik"></div>
          <div class="field"><label for="iVat">ДДС номер</label><input class="input" id="iVat" name="inv_vat" placeholder="BG…"></div>
          <div class="field"><label for="iAddr">Адрес по регистрация</label><input class="input" id="iAddr" name="inv_address"></div>
        </div>
        <div class="field" style="margin-top:14px"><label for="kNote">Бележка към поръчката</label><textarea class="textarea" id="kNote" name="note" rows="3"></textarea></div>
        <label class="checkbox" style="margin-top:14px"><input type="checkbox" name="consent" required> Прочетох и приемам <a href="terms.html" target="_blank" rel="noopener">Общите условия</a>, <a href="shipping.html" target="_blank" rel="noopener">условията за доставка и връщане</a> и <a href="privacy.html" target="_blank" rel="noopener">политиката за поверителност</a>.</label>
      </form>
      <aside class="cart-summary" id="summary"></aside></div>`;
    built = true;
    drawOptions(); drawSummary();
    SEVAR.initButtons(root);
  }

  function drawOptions() {
    const sub = cart.total();
    const t = (id) => SEVAR.shopTotals(sub, id, payment);
    root.querySelector('#dOpts').innerHTML = S.delivery.map(d => {
      const p = t(d.id).shipping;
      return opt('delivery', d.id, d.id === delivery, esc(d.label), d.kind === 'pickup' ? 'безплатно' : p ? eur(p) : '<span class="free">безплатна</span>', `срок: ${esc(d.eta)}`);
    }).join('');
    const allowed = SEVAR.shopPaymentsFor(delivery);
    if (!allowed.some(p => p.id === payment)) payment = allowed[0].id;
    root.querySelector('#pOpts').innerHTML = allowed.map(p => opt('payment', p.id, p.id === payment, esc(p.label), p.fee ? '+ ' + eur(p.fee) : 'без такса', esc(p.note))).join('');
    const kind = SEVAR.shopDelivery(delivery).kind;
    root.querySelectorAll('#dFields [data-k]').forEach(f => { f.hidden = !f.dataset.k.split(' ').includes(kind); });
  }

  function drawSummary() {
    const lines = cart.resolved(), sub = cart.total(), t = SEVAR.shopTotals(sub, delivery, payment);
    root.querySelector('#summary').innerHTML = `
      <h2>Обобщение</h2>
      <div class="mini-lines">${lines.map(l => `<div class="mini"><span>${esc(l.product)}<small>${esc(l.size)} · ${l.qty} ${cart.bagWord(l.qty)}</small></span><b>${eur(l.total)}</b></div>`).join('')}</div>
      <div class="sum-row"><span>Стоки</span><b>${eur(t.subtotal)}</b></div>
      <div class="sum-row"><span>Доставка</span><b>${t.shipping ? eur(t.shipping) : 'безплатна'}</b></div>
      ${t.fee ? `<div class="sum-row"><span>Такса наложен платеж</span><b>${eur(t.fee)}</b></div>` : ''}
      <div class="sum-row total"><span>Общо с ДДС</span><b>${eur(t.total)}</b></div>
      ${!t.free && SEVAR.shopDelivery(delivery).kind !== 'pickup' ? `<p class="ship-hint">Още <b>${eur(S.freeShippingFrom - sub)}</b> до безплатна доставка</p>` : ''}
      <button class="btn btn-white btn-lg" type="submit" form="orderForm" id="placeBtn"><span class="ico">${I('send')}</span><span>Потвърждавам поръчката</span></button>
`;
    SEVAR.initButtons(root.querySelector('#summary'));
  }

  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'delivery') { delivery = t.value; drawOptions(); drawSummary(); }
    else if (t.name === 'payment') { payment = t.value; drawOptions(); drawSummary(); }
    else if (t.id === 'invWant') root.querySelector('#invBox').hidden = !t.checked;
  });

  root.addEventListener('submit', async (e) => {
    const form = e.target.closest('#orderForm'); if (!form) return;
    e.preventDefault();
    const v = Object.fromEntries(new FormData(form).entries());
    const kind = SEVAR.shopDelivery(delivery).kind;
    const need = [['name', 'Име'], ['phone', 'Телефон'], ['email', 'Имейл']];
    if (kind !== 'pickup') need.push(['d_city', 'Град']);
    if (kind === 'office') need.push(['d_office', 'Офис на куриера']);
    if (kind === 'address') need.push(['d_address', 'Адрес']);
    if (v.inv_want) need.push(['inv_company', 'Фирма за фактура'], ['inv_eik', 'ЕИК']);
    const miss = need.find(([k]) => !String(v[k] || '').trim());
    if (miss) { const el = form.querySelector(`[name="${miss[0]}"]`); SEVAR.toast(`Моля, попълнете: ${miss[1]}.`, 'error'); if (el) { el.focus(); } return; }
    if (!v.consent) { SEVAR.toast(cart.errorText('consent_required'), 'error'); return; }
    const btn = root.querySelector('#placeBtn'); btn.disabled = true;
    try {
      const res = await cart.post('/api/orders', {
        items: cart.resolved().map(l => ({ sku: l.sku, qty: l.qty })),
        customer: { name: v.name, phone: v.phone, email: v.email },
        delivery: { id: delivery, city: v.d_city, office: v.d_office, address: v.d_address },
        payment: { id: payment },
        invoice: { want: !!v.inv_want, company: v.inv_company, eik: v.inv_eik, vat: v.inv_vat, address: v.inv_address },
        note: v.note, consent: true
      });
      cart.rememberCustomer({ name: v.name, phone: v.phone, email: v.email, city: v.d_city });
      done = res; cart.clear(); doneView();
    } catch (err) { btn.disabled = false; SEVAR.toast(cart.errorText(err.message), 'error'); }
  });

  /* follow the cart above: empty cart hides the form, otherwise refresh prices without losing what was typed */
  document.addEventListener('sevar:cart', () => {
    if (done) return;
    if (!cart.count()) { root.innerHTML = ''; built = false; }
    else if (!built) build();
    else { drawOptions(); drawSummary(); }
  });
  if (cart.count()) build();
})();
