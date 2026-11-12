/* SEVAR — cart page: review lines and change bag quantities (the checkout form follows below, see checkout.js) */
(function () {
  const root = document.getElementById('cartRoot');
  if (!root) return;
  const I = SEVAR.icon, O = SEVAR.ORDER, S = SEVAR.SHOP, cart = SEVAR.cart;
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clampQty = (v) => Math.min(O.max, Math.max(O.min, Math.round(Number(v)) || O.min));

  function render() {
    const lines = cart.resolved();
    if (!lines.length) {
      root.innerHTML = `<div class="cart-card cart-empty"><span class="icon-circle" style="margin:0 auto 14px">${I('layers')}</span><h2>Количката е празна</h2>
        <p>Изберете артикули от магазина. Минималната поръчка е ${O.min} ${O.unit} за артикул.</p>
        <div class="btn-group"><a class="btn btn-yellow" href="products"><span class="ico">${I('arrow')}</span><span>Към магазина</span></a></div></div>`;
      SEVAR.initButtons(root); return;
    }
    const sub = cart.total(), bags = cart.count();
    const left = Math.max(0, S.freeShippingFrom - sub);
    root.innerHTML = `<div class="cart-card">
      <h2>Вашата поръчка</h2>
      ${lines.map(l => `<div class="cart-line" data-sku="${esc(l.sku)}">
        <img src="${l.thumb}" alt="" loading="lazy">
        <div><b>${esc(l.product)}</b><span class="sz">${esc(l.size)}</span><span class="meta">${SEVAR.eur(l.bagPrice)} / чувал · ${l.bag} оп. × ${esc(l.pack)}</span></div>
        <div class="qty is-sm"><button type="button" data-d="-1" aria-label="По-малко">−</button><input type="number" inputmode="numeric" min="${O.min}" max="${O.max}" value="${l.qty}" aria-label="Брой ${O.units}"><button type="button" data-d="1" aria-label="Повече">+</button></div>
        <div class="lt">${SEVAR.eur(l.total)}</div>
        <button class="rm" type="button" data-rm aria-label="Премахни">${I('close')}</button></div>`).join('')}
      <div class="cart-total"><span>${lines.length} ${lines.length === 1 ? 'артикул' : 'артикула'} · ${bags} ${cart.bagWord(bags)}</span><b>${SEVAR.eur(sub)} <small>с ДДС</small></b></div>
      <div class="ship-line">${left > 0 ? `Още <b>${SEVAR.eur(left)}</b> до безплатна доставка <small>(над ${SEVAR.eur(S.freeShippingFrom)})</small>` : '<b>Имате безплатна доставка</b>'}<div class="ship-bar"><i style="width:${Math.min(100, Math.round(sub / S.freeShippingFrom * 100))}%"></i></div></div>
      <div class="btn-group" style="margin-top:18px"><a class="btn btn-outline" href="products"><span class="ico">${I('arrow')}</span><span>Продължи пазаруването</span></a><button class="btn btn-outline" type="button" data-clear><span class="ico">${I('close')}</span><span>Изчисти</span></button></div>
      ${sub >= S.b2bPromptFrom ? `<div class="b2b-prompt">${I('layers')}<div><b>Поръчката ви надхвърля ${SEVAR.eur(S.b2bPromptFrom)}</b><p>За такива обеми предлагаме индивидуални отстъпки. Пуснете B2B заявка — мениджър ще се свърже с вас лично. Артикулите от количката ще бъдат пренесени в заявката.</p></div><a class="btn btn-yellow" href="b2b?from=cart"><span class="ico">${I('arrow')}</span><span>Запитване за B2B отстъпка</span></a></div>` : ''}
      <div class="order-note">${I('info')}<span>Магазинът е за покупки на едро — минимум ${O.min} ${O.unit} за артикул. Цените са в евро, с включен ДДС. Попълнете данните за доставка и плащане по-долу.</span></div>
    </div>`;
    SEVAR.initButtons(root);
  }

  root.addEventListener('click', (e) => {
    const line = e.target.closest('.cart-line');
    if (line) {
      const input = line.querySelector('input'), step = e.target.closest('[data-d]');
      if (step) { cart.set(line.dataset.sku, clampQty(Number(input.value) + Number(step.dataset.d))); return; }
      if (e.target.closest('[data-rm]')) { cart.set(line.dataset.sku, 0); return; }
    }
    if (e.target.closest('[data-clear]') && window.confirm('Да изчистя ли количката?')) cart.clear();
  });
  root.addEventListener('change', (e) => {
    const line = e.target.closest('.cart-line');
    if (line && e.target.matches('input')) cart.set(line.dataset.sku, clampQty(e.target.value));
  });
  document.addEventListener('sevar:cart', render);
  render();
})();
