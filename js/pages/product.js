/* SEVAR — product detail page (clean URL /products/<slug>, legacy ?p=slug) in the Eldcare "service detail" layout.
   The server already sends the title, meta tags, structured data and a crawlable copy of the content; this script
   replaces that copy with the interactive version (gallery, order table, cart). */
(function () {
  const view = document.getElementById('productView');
  if (!view) return;
  const C = SEVAR.company, I = SEVAR.icon;
  const params = new URLSearchParams(location.search);
  const fromPath = (location.pathname.match(/\/products\/([^/?#]+)\/?$/) || [])[1];
  let slug = decodeURIComponent(fromPath || params.get('p') || '');
  if (SEVAR.legacySlugs[slug]) slug = SEVAR.legacySlugs[slug];
  const p = SEVAR.productBySlug(slug);

  if (!p) {
    document.title = 'Страницата не е намерена | SEVAR';
    view.innerHTML = SEVAR.banner({ title: 'Страницата не е намерена', crumbs: [{ label: 'Магазин', href: 'products' }], lead: 'Страницата, която търсите, не съществува или е преместена. Ето всички продукти, които предлагаме.' }) +
      `<section class="section"><div class="container"><div class="products-grid" id="fallbackGrid" data-reveal-stagger=".06"></div></div></section>`;
    SEVAR.renderProducts(document.getElementById('fallbackGrid'));
    SEVAR.initButtons && SEVAR.initButtons(view);
    return;
  }

  document.title = `${p.name} SEVAR — размери и цени на едро`;   /* same format as server/seo.js */

  const others = SEVAR.products.filter(x => x.slug !== p.slug);
  const related = others.sort((a, b) => (a.cat === p.cat ? -1 : 0) - (b.cat === p.cat ? -1 : 0)).slice(0, 4);
  const O = SEVAR.ORDER;
  const sizesRows = p.sizes.map(s => {
    const sku = SEVAR.sku(p, s);
    if (!SEVAR.orderable(s)) return `<tr><td>${s.label}<small class="sub-code">${s.pack} в опаковка</small></td><td colspan="2"><div class="buy-cell"><span class="on-request">Цена по запитване</span><button class="btn btn-outline btn-sm" type="button" data-inquiry="${p.name}"><span class="ico">${I('send')}</span><span>Запитване</span></button></div></td></tr>`;
    return `<tr data-sku="${sku}" data-label="${s.label}"><td>${s.label}<small class="sub-code">${s.code ? 'GTIN ' + s.code : ''}</small></td>
      <td class="bagcell"><b>${SEVAR.eur(SEVAR.bagPrice(s))}</b><small>чувал · ${s.bag} оп. × ${s.pack}<br>${SEVAR.eur(s.price)} / опаковка</small></td>
      <td><div class="buy-cell"><div class="qty is-sm"><button type="button" data-d="-1" aria-label="По-малко">−</button><input type="number" inputmode="numeric" min="${O.min}" max="${O.max}" value="${O.min}" aria-label="Брой ${O.units}"><button type="button" data-d="1" aria-label="Повече">+</button></div>
      <span class="sub-unit" style="color:var(--muted);font-size:.85rem;font-weight:600">${O.units}</span>
      <button class="btn btn-yellow btn-sm" type="button" data-add><span class="ico">${I('arrow')}</span><span>В количката</span></button></div>
      <div class="in-cart" hidden></div></td></tr>`;
  }).join('');
  const steps = p.steps && p.steps.length ? `
<div class="pd-desc" data-reveal="up">
  <span class="eyebrow" style="justify-self:start">Как се използва</span>
  <h2>${p.steps.length} стъпки до сигурна защита</h2>
  <div class="steps-row">${p.steps.map((s, i) => `<div class="step-pic"><img src="${s.img}" alt="" loading="lazy"><b>Стъпка ${i + 1}</b><p>${s.t}</p></div>`).join('')}</div>
</div>` : '';
  const perks = p.perks && p.perks.length ? `<div class="perks-row">${p.perks.map(k => `<span class="perk"><img src="${k.img}" alt="">${k.t}</span>`).join('')}</div>` : '';

  view.innerHTML = SEVAR.banner({ title: p.name, eyebrow: p.catLabel + ' · SEVAR', crumbs: [{ label: 'Магазин', href: 'products' }, { label: p.name }], pos: '50% 25%' }) + `
<section class="section">
  <div class="container pd-layout">
    <aside class="pd-side" data-reveal="left" data-now data-delay=".2">
      <div class="side-card">
        <h3>Други продукти</h3>
        <div class="side-list">${SEVAR.products.map(x => `<a href="products/${x.slug}" class="${x.slug === p.slug ? 'is-active' : ''}">${I('arrow')}${x.name}</a>`).join('')}</div>
      </div>
      <div class="side-yellow">
        <span class="icon-circle">${I('phone')}</span>
        <h3>Нужна ви е оферта за едро?</h3>
        <p>Кажете ни размери, количества и град за доставка. Отговаряме до един работен ден.</p>
        <a class="hc-phone" href="${C.phoneHref}">${C.phoneDisplay}</a>
        <button class="btn btn-white" type="button" data-inquiry="${p.name}"><span class="ico">${I('send')}</span><span>Изпрати запитване</span></button>
      </div>
    </aside>
    <div class="pd-main">
      <div class="pd-stage" data-reveal="up" data-now data-delay=".15">
        <div>
          <div class="pd-image" id="pdMain">
            <span class="badge-fr"><span class="flag-fr"><i></i><i></i><i></i></span>Произведено във Франция</span>
            <img id="pdMainImg" src="${p.gallery[0]}" alt="${p.name} SEVAR" width="800" height="800" fetchpriority="high">
          </div>
          ${p.gallery.length > 1 ? `<div class="pd-thumbs" id="pdThumbs">${p.gallery.map((g, i) => `<button type="button" class="${i === 0 ? 'is-active' : ''}" data-src="${g}" aria-label="Снимка ${i + 1}"><img src="${g}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
        </div>
        <div class="pd-info">
          <div class="pd-badges">${p.badges.map(b => `<span class="pill pill-yellow">${b}</span>`).join('')}</div>
          <h2 class="pd-title">${p.name}</h2>
          <div class="pd-stat"><b data-count="${p.stat.value}">0</b><span>${p.stat.label}</span></div>
          <ul class="pd-features">${p.features.map(f => `<li><i>${I('check')}</i>${f}</li>`).join('')}</ul>
          <p>${p.short}</p>
          ${perks}
          <div class="btn-group" style="margin-top:6px">
            <a class="btn btn-yellow" href="#pdOrder"><span class="ico">${I('arrow')}</span><span>Поръчай на едро</span></a>
            <a class="btn btn-outline" href="b2b"><span class="ico">${I('layers')}</span><span>B2B заявка за големи обеми</span></a>
          </div>
        </div>
      </div>
      <div class="pd-desc" data-reveal="up">
        <span class="eyebrow" style="justify-self:start">Описание</span>
        <h2>${p.name}</h2>
        ${p.desc.map(d => `<p>${d}</p>`).join('')}
      </div>
      <div class="pd-desc" id="pdOrder" data-reveal="up">
        <span class="eyebrow" style="justify-self:start">${p.sizesTitle}</span>
        <h2>Поръчка на едро</h2>
        <table class="sizes-table"><thead><tr><th>${p.sizesTitle}</th><th>Цена с ДДС</th><th style="text-align:right">Количество (чувала)</th></tr></thead><tbody>${sizesRows}</tbody></table>
        <div class="order-note">${I('info')}<span>Продаваме само на едро — минималната поръчка е <b>${O.min} ${O.unit}</b> за всеки артикул. Цените са в евро, с включен ДДС. Поръчвате от ${SEVAR.SHOP.b2bFrom} чувала нагоре или за фирма? Пуснете <a href="b2b">B2B заявка</a> — мениджър ще се свърже с вас с индивидуални условия.</span></div>
        <div class="btn-group" style="margin-top:18px"><a class="btn btn-yellow" href="cart"><span class="ico">${I('arrow')}</span><span>Към количката <b data-cart-count style="font-weight:700"></b></span></a></div>
      </div>
      ${steps}
    </div>
  </div>
</section>
<section class="section" style="padding-top:0">
  <div class="container">
    <div class="section-head is-left">
      <span class="eyebrow" data-reveal="fade">Още от гамата</span>
      <h2 data-split>Други продукти <span class="mark">SEVAR</span></h2>
    </div>
    <div class="products-grid" id="relatedGrid" data-reveal-stagger=".07">${related.map(SEVAR.productCard).join('')}</div>
  </div>
</section>`;

  const mainImg = document.getElementById('pdMainImg');
  const thumbs = document.getElementById('pdThumbs');
  if (thumbs) thumbs.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.classList.contains('is-active')) return;
    thumbs.querySelectorAll('button').forEach(x => x.classList.toggle('is-active', x === b));
    if (typeof gsap !== 'undefined') {
      gsap.to(mainImg, { opacity: 0, scale: .92, duration: .22, onComplete: () => { mainImg.src = b.dataset.src; gsap.fromTo(mainImg, { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: .5, ease: 'power3.out' }); } });
    } else mainImg.src = b.dataset.src;
  });
  /* order table: stepper + add to cart */
  const orderTable = view.querySelector('.sizes-table');
  const clampQty = (v) => Math.min(O.max, Math.max(O.min, Math.round(Number(v)) || O.min));
  const showInCart = () => orderTable.querySelectorAll('tr[data-sku]').forEach(tr => {
    const n = SEVAR.cart.qty(tr.dataset.sku), tag = tr.querySelector('.in-cart');
    tag.hidden = !n; tag.textContent = n ? `В количката: ${n} ${SEVAR.cart.bagWord(n)}` : '';
    tr.dataset.n = n;
  });
  orderTable.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-sku]'); if (!tr) return;
    const input = tr.querySelector('input');
    const step = e.target.closest('[data-d]');
    if (step) { input.value = clampQty(Number(input.value) + Number(step.dataset.d)); return; }
    if (e.target.closest('[data-add]')) {
      const q = clampQty(input.value); input.value = q;
      SEVAR.cart.add(tr.dataset.sku, q);
      SEVAR.cart.notifyAdded(q, `${p.name}, ${tr.dataset.label}`);
    }
  });
  orderTable.addEventListener('change', (e) => { if (e.target.matches('input')) e.target.value = clampQty(e.target.value); });
  document.addEventListener('sevar:cart', showInCart); showInCart(); SEVAR.cart.refresh();
  SEVAR.initButtons && SEVAR.initButtons(view);
})();
