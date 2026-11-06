/* SEVAR — shared layout: header, off-canvas menu, footer, inquiry modal, toast, back-to-top, button hover */
(function () {
  const C = SEVAR.company;
  const page = document.body.dataset.page || '';

  /* ---------------- icons ---------------- */
  const I = {
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.7a2 2 0 0 1 1.7 2z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.3H7.4V14h2.8v8h3.3z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    arrowUpRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    chevronL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    chevronR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M6 11l6 6 6-6M4 21h16"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 11v6"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 8l10 5 10-5-10-5z"/><path d="M2 13l10 5 10-5"/><path d="M2 18l10 5 10-5"/></svg>',
    bed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18V8M3 14h18v4M21 14v-3a2 2 0 0 0-2-2h-8v5"/><path d="M3 11h4a2 2 0 0 1 2 2v1"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.4-9.3-9A5.3 5.3 0 0 1 12 6.6a5.3 5.3 0 0 1 9.3 5.4C19 16.6 12 21 12 21z"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 20 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.5 5.3-6.4"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    body: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2.5"/><path d="M7 10.5c3-1.5 7-1.5 10 0M9 11v10M15 11v10M9 16h6"/></svg>',
    drop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.7s-6.5 7-6.5 11.6a6.5 6.5 0 0 0 13 0C18.5 9.7 12 2.7 12 2.7z"/><path d="M9 15a3 3 0 0 0 3 3"/></svg>',
    hospital: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M12 7v6M9 10h6"/><path d="M9 21v-4h6v4"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
    pill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7z"/><path d="m8.5 8.5 7 7"/></svg>',
    store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1-5h16l1 5"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v9h14v-9"/><path d="M10 21v-6h4v6"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
    maximize: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
    first: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/></svg>',
    last: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m13 17 5-5-5-5M6 17l5-5-5-5"/></svg>'
  };
  SEVAR.icon = (n) => I[n] || '';
  SEVAR.catIcon = (cat) => ({ diapers: I.shield, pads: I.layers, sheets: I.bed, lady: I.heart })[cat] || I.shield;
  SEVAR.btn = (cls, label, icon, attrs) => `<a class="btn ${cls}" ${attrs || ''}><span class="ico">${I[icon || 'arrow']}</span><span>${label}</span></a>`;

  const products = SEVAR.products || [];
  const LOGO = 'assets/img/brand/sevar-logo.png';

  /* ---------------- header ---------------- */
  function headerHtml() {
    const links = SEVAR.nav.map(n => `<a href="${n.href}" class="${[n.cls, n.key === page ? 'is-active' : ''].filter(Boolean).join(' ')}">${n.label}</a>`).join('');
    return `
<header class="site-header" id="siteHeader">
  <div class="header-inner">
    <div class="header-left">
      <button class="burger" type="button" aria-label="Меню" aria-expanded="false" aria-controls="mainNav"><i><span></span><span></span><span></span></i><span class="lbl">Меню</span></button>
      <nav class="main-nav" id="mainNav" aria-label="Основна навигация">${links}<a class="nav-phone" href="${C.phoneHref}">${I.phone}${C.phoneDisplay}</a></nav>
    </div>
    <a class="brand" href="index.html" aria-label="SEVAR — начало"><img src="${LOGO}" alt="SEVAR" width="120" height="48"></a>
    <div class="header-actions">
      <a class="header-phone" href="${C.phoneHref}" aria-label="Обадете се: ${C.phoneDisplay}" title="${C.phoneDisplay}">${I.phone}<span>${C.phoneDisplay}</span></a>
      <a class="header-cart" href="cart.html" aria-label="Количка"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.2a1.5 1.5 0 0 0 1.5 1.2h8.7a1.5 1.5 0 0 0 1.5-1.1L21 8H6"/></svg><b data-cart-count hidden></b></a>
      <button class="btn btn-yellow btn-sm" type="button" data-inquiry><span class="ico">${I.arrow}</span><span>Запитване</span></button>
    </div>
  </div>
</header>`;
  }

  /* ---------------- footer ---------------- */
  function footerHtml() {
    const prodLinks = products.map(p => `<li><a href="product.html?p=${p.slug}">${p.name}</a></li>`).join('');
    const hours = C.hours.map(h => `<div><span>${h.d}</span><strong>${h.h}</strong></div>`).join('');
    return `
<footer class="site-footer">
  <div class="footer-shell">
    <span class="footer-leaf" aria-hidden="true"></span>
    <div class="footer-inner">
      <div class="footer-top">
        <div class="footer-news">
          <h3>Поискайте оферта за доставки на едро</h3>
          <form class="quick-form" id="quickForm" novalidate>
            <input type="text" name="contact" placeholder="Вашият телефон или имейл…" aria-label="Телефон или имейл" required>
            <button class="round-btn" type="submit" aria-label="Изпрати">${I.arrow}</button>
          </form>
        </div>
        <div class="footer-cols">
          <div class="footer-col"><h4>Продукти</h4><ul>
            <li><a href="products.html?cat=diapers">Пелени и гащи</a></li><li><a href="products.html?cat=pads">Подложки и парчета</a></li>
            <li><a href="products.html?cat=sheets">Чаршафи</a></li><li><a href="products.html?cat=lady">Дамски превръзки</a></li></ul></div>
          <div class="footer-col"><h4>Компания</h4><ul>
            <li><a href="about.html">За нас</a></li><li><a href="catalogue.html">Каталог 2024</a></li>
            <li><a href="index.html#faq">Въпроси</a></li><li><a href="contact.html">Контакти</a></li>
            <li><a href="b2b.html">B2B поръчки</a></li></ul></div>
          <div class="footer-col"><h4>Работно време</h4><div class="footer-hours">${hours}</div></div>
        </div>
      </div>
      <div class="footer-contacts">
        <div class="footer-contact"><span>Обадете се</span><a class="is-phone" href="${C.phoneHref}">${C.phoneDisplay}</a></div>
        <div class="footer-contact"><span>Пишете ни</span><a href="mailto:${C.email}">${C.email}</a></div>
        <div class="footer-contact"><span>Посетете ни</span><b>${C.address.street}, ${C.address.city}</b></div>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="social"><a href="${C.social.facebook}" target="_blank" rel="noopener">Facebook</a><a href="mailto:${C.email}">Имейл</a></div>
      <a class="footer-logo" href="index.html" aria-label="SEVAR — начало"><img src="${LOGO}" alt="SEVAR" width="115" height="46"></a>
      <span class="footer-copy">© <span id="year"></span> ${C.legal} · SEVAR · <a href="terms.html">Общи условия</a> · <a href="shipping.html">Доставка и плащане</a> · <a href="privacy.html">Поверителност</a></span>
    </div>
  </div>
</footer>`;
  }

  /* ---------------- inquiry modal ---------------- */
  function modalHtml() {
    /* several products can be ticked; they are sent together in the "product" field */
    const chips = products.map(p => p.name).concat(['Цялата гама / обща оферта'])
      .map(n => `<label class="check-chip"><input type="checkbox" name="products" value="${n}"><span>${n}</span></label>`).join('');
    return `
<div class="modal-backdrop" id="inquiryModal" role="dialog" aria-modal="true" aria-labelledby="inquiryTitle">
  <div class="modal">
    <div class="modal-head">
      <div><h3 id="inquiryTitle">Изпратете запитване</h3><p>Отговаряме в рамките на един работен ден с цени на едро, наличности и срок за доставка.</p></div>
      <button class="modal-close" type="button" aria-label="Затвори" data-modal-close>${I.close}</button>
    </div>
    <div class="modal-body">
      <form id="inquiryForm" class="form-grid" novalidate>
        <div class="field"><label for="iqName">Име и фамилия <small>*</small></label><input class="input" id="iqName" name="name" required autocomplete="name"></div>
        <div class="field"><label for="iqCompany">Фирма / организация</label><input class="input" id="iqCompany" name="company" autocomplete="organization"></div>
        <div class="field"><label for="iqPhone">Телефон <small>*</small></label><input class="input" id="iqPhone" name="phone" type="tel" required autocomplete="tel"></div>
        <div class="field"><label for="iqEmail">Имейл</label><input class="input" id="iqEmail" name="email" type="email" autocomplete="email"></div>
        <div class="field span-2"><label>Продукти <small>(можете да изберете няколко)</small></label><div class="check-grid" id="iqProducts">${chips}</div></div>
        <div class="field span-2"><label for="iqMsg">Съобщение <small>(количества, размери, град за доставка)</small></label><textarea class="textarea" id="iqMsg" name="message"></textarea></div>
        <label class="checkbox span-2"><input type="checkbox" name="consent" required> Съгласен съм данните ми да бъдат използвани за отговор на запитването.</label>
        <div class="span-2 btn-group"><button class="btn btn-yellow btn-lg" type="submit"><span class="ico">${I.send}</span><span>Изпрати</span></button><span class="form-note">или се обадете на <a href="${C.phoneHref}"><strong>${C.phoneDisplay}</strong></a></span></div>
      </form>
    </div>
  </div>
</div>`;
  }

  /* ---------------- mount ---------------- */
  const hEl = document.getElementById('site-header'); if (hEl) hEl.outerHTML = headerHtml();
  const fEl = document.getElementById('site-footer'); if (fEl) fEl.outerHTML = footerHtml();
  document.body.insertAdjacentHTML('beforeend', modalHtml() +
    '<div class="toast-wrap" id="toastWrap" aria-live="polite"></div>' +
    `<button class="back-top" id="backTop" type="button" aria-label="Нагоре">${I.up}</button>`);
  const yr = document.getElementById('year'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------------- header behaviour ---------------- */
  const header = document.getElementById('siteHeader');
  const backTop = document.getElementById('backTop');
  function onScroll() {
    const y = window.scrollY || document.documentElement.scrollTop;
    backTop.classList.toggle('is-visible', y > 700);
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  backTop.addEventListener('click', () => SEVAR.scrollTo ? SEVAR.scrollTo(0) : window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* phone navigation: the navbar drops down under the header bar */
  const burger = header.querySelector('.burger');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    header.classList.toggle('nav-open', open);
  }
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  header.querySelectorAll('.main-nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('click', (e) => { if (!header.contains(e.target)) setMenu(false); });
  SEVAR.closeMenu = () => setMenu(false);

  /* ---------------- button hover bg (Eldcare "button-bg") ---------------- */
  SEVAR.initButtons = function (scope) {
    (scope || document).querySelectorAll('.btn').forEach(b => {
      if (b.querySelector('.button-bg')) return;
      const bg = document.createElement('span'); bg.className = 'button-bg'; b.prepend(bg);
      const move = (e) => { const r = b.getBoundingClientRect(); bg.style.left = (e.clientX - r.left) + 'px'; bg.style.top = (e.clientY - r.top) + 'px'; };
      b.addEventListener('mouseenter', move); b.addEventListener('mouseleave', move);
    });
  };
  SEVAR.initButtons(document);

  /* ---------------- toast ---------------- */
  SEVAR.toast = function (msg, type) {
    const wrap = document.getElementById('toastWrap');
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' is-' + type : '');
    t.innerHTML = (type === 'success' ? I.check : I.info) + '<span>' + msg + '</span>';
    wrap.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 450); }, 4200);
  };

  /* ---------------- inquiry modal ---------------- */
  const modal = document.getElementById('inquiryModal');
  const form = document.getElementById('inquiryForm');
  let lastFocus = null;
  SEVAR.openInquiry = function (product, prefill) {
    lastFocus = document.activeElement;
    if (product) { /* a product name (or several joined with "; ") opened from a product page or button */
      const wanted = String(product).split('; ');
      form.querySelectorAll('[name=products]').forEach(b => { b.checked = wanted.includes(b.value); });
    }
    if (prefill) { form.querySelector(prefill.includes('@') ? '[name=email]' : '[name=phone]').value = prefill; }
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    if (SEVAR.lenis) SEVAR.lenis.stop();
    setTimeout(() => form.querySelector('[name=name]').focus(), 350);
  };
  function closeModal() {
    if (!modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    if (SEVAR.lenis) SEVAR.lenis.start();
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener('click', (e) => {
    const trig = e.target.closest('[data-inquiry]');
    if (trig) { e.preventDefault(); setMenu(false); SEVAR.openInquiry(trig.dataset.inquiry || ''); return; }
    if (e.target.closest('[data-modal-close]') || e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); setMenu(false); } });

  const quick = document.getElementById('quickForm');
  if (quick) quick.addEventListener('submit', (e) => { e.preventDefault(); const v = quick.contact.value.trim(); if (!v) { quick.contact.focus(); return; } SEVAR.openInquiry('', v); quick.reset(); });

  /* ---------------- form submission (modal + contact page) ---------------- */
  SEVAR.submitForm = async function (formEl, subjectPrefix) {
    if (!formEl.checkValidity()) { formEl.reportValidity(); return false; }
    const fd = new FormData(formEl);
    const data = Object.fromEntries(fd.entries());
    const picked = fd.getAll('products');
    if (picked.length) data.product = picked.join('; ');
    delete data.products;
    data.page = location.pathname.split('/').pop() || 'index.html';
    data.ts = new Date().toISOString();
    try { const all = JSON.parse(localStorage.getItem('sevar_inquiries') || '[]'); all.push(data); localStorage.setItem('sevar_inquiries', JSON.stringify(all.slice(-50))); } catch (_) { /* storage unavailable */ }
    const btn = formEl.querySelector('[type=submit]'); btn.disabled = true;
    if (C.formEndpoint) {
      try {
        const r = await fetch(C.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) });
        if (r.ok) { btn.disabled = false; formEl.reset(); SEVAR.toast('Благодарим! Запитването е изпратено — ще се свържем с вас до един работен ден.', 'success'); closeModal(); return true; }
      } catch (_) { /* fall back to mailto */ }
    }
    const subject = encodeURIComponent((subjectPrefix || 'Запитване от сайта') + (data.product ? ': ' + data.product : ''));
    const lines = ['Име: ' + (data.name || ''), 'Фирма: ' + (data.company || ''), 'Телефон: ' + (data.phone || ''), 'Имейл: ' + (data.email || ''), 'Продукт: ' + (data.product || ''), '', data.message || ''];
    window.location.href = `mailto:${C.email}?subject=${subject}&body=${encodeURIComponent(lines.join('\n'))}`;
    btn.disabled = false; formEl.reset();
    SEVAR.toast('Отваряме вашата имейл програма с попълнено запитване. Ако не се отвори, пишете ни на ' + C.email, 'success');
    closeModal();
    return true;
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); SEVAR.submitForm(form, 'Запитване от сайта'); });

  /* ---------------- page transition (fade) ---------------- */
  const veil = document.createElement('div');
  veil.id = 'pageVeil';
  veil.style.cssText = 'position:fixed;inset:0;z-index:200;background:#f7f5f0;pointer-events:none;opacity:0;transition:opacity .28s';
  document.body.appendChild(veil);
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank' || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || /^https?:/.test(href) || href.endsWith('.pdf')) return;
    e.preventDefault();
    veil.style.opacity = '1';
    setTimeout(() => { window.location.href = href; }, 260);
  });
  window.addEventListener('pageshow', () => { veil.style.opacity = '0'; });

  /* ---------------- AI chat widget ---------------- */
  const chatJs = document.createElement('script');
  chatJs.src = 'js/core/chat.js?v=1';
  chatJs.defer = true;
  document.body.appendChild(chatJs);
})();
