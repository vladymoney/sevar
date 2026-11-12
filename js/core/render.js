/* SEVAR — shared renderers (Eldcare "service card" style product card) */
(function () {
  SEVAR.productCard = function (p, i) {
    return `
<article class="product-card" data-cat="${p.cat}">
  <a class="pc-media" href="products/${p.slug}" aria-label="${p.name}">
    <img src="${p.thumb}" alt="${p.name} SEVAR" loading="${i < 4 ? 'eager' : 'lazy'}" width="500" height="500">
    <span class="pc-badge icon-circle">${SEVAR.catIcon(p.cat)}</span>
  </a>
  <div class="pc-body">
    <span class="pc-cat">${p.catLabel}</span>
    <h3><a href="products/${p.slug}">${p.name}</a></h3>
    <p>${p.short}</p>
    ${(() => { const pr = (p.sizes || []).filter(SEVAR.orderable).map(SEVAR.bagPrice); return pr.length ? `<span class="pc-price">от <b>${SEVAR.eur(Math.min(...pr))}</b> / чувал</span>` : ''; })()}
    <div class="pc-foot">
      <span class="pill">${p.stat.value} ${p.stat.label}</span>
      <a class="btn-link" href="products/${p.slug}">Виж <span class="ico">${SEVAR.icon('arrow')}</span></a>
    </div>
  </div>
</article>`;
  };

  SEVAR.renderProducts = function (el, list) {
    el.innerHTML = (list || SEVAR.products).map(SEVAR.productCard).join('');
  };

  /* inner page banner */
  SEVAR.banner = function (opts) {
    const crumbs = [`<a href="./">Начало</a>`].concat((opts.crumbs || []).map(c => `<i></i>${c.href ? `<a href="${c.href}">${c.label}</a>` : `<span>${c.label}</span>`}`)).join('');
    return `
<section class="page-banner ${opts.cls || ''}">
  <img src="${opts.img || 'assets/img/photos/hero-seniors.jpg'}" alt="" width="2000" height="1333" style="object-position:${opts.pos || '50% 25%'}" data-scroll-image>
  <div class="pb-content">
    ${opts.eyebrow ? `<span class="eyebrow on-dark" data-reveal="fade" data-now>${opts.eyebrow}</span>` : ''}
    <h1 data-split="now">${opts.title}</h1>
    ${opts.lead ? `<p class="lead" data-reveal="up" data-now data-delay=".45">${opts.lead}</p>` : ''}
  </div>
  <nav class="breadcrumbs" aria-label="Навигация">${crumbs}</nav>
</section>`;
  };
})();
