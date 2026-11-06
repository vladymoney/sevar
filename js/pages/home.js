/* SEVAR — home page: why-carousel, product category tabs, product grid, FAQ */
(function () {
  const I = SEVAR.icon;

  /* ---- WHY cards (Swiper carousel like the theme's icon-box slider) ---- */
  const why = [
    { icon: 'layers', t: 'Френско качество', p: 'Целият асортимент на марка СЕВАР е произведен във Франция, с гарантирано високо качество и внимание към детайла.' },
    { icon: 'body', t: 'Анатомична форма', p: 'Пелените СЕВАР пасват идеално на тялото, осигурявайки максимален комфорт и свобода на движение. Дискретен дизайн за всяка ситуация.' },
    { icon: 'shield', t: 'Удобство и сигурност', p: 'Меката материя с усещане за текстил и многократната фиксация гарантират удобство. По-големите ленти предпазват от разхлабване.' },
    { icon: 'drop', t: 'Грижа за кожата', p: 'Дишащо покритие по цялата повърхност, без латекс — предотвратява зачервяване, дерматит и запарване при чувствителна кожа.' },
    { icon: 'truck', t: 'Наличности и доставки', p: 'Постоянни наличности и навременни доставки в цялата страна, както и в Румъния, Гърция, Северна Македония, Сърбия и Черна гора.' }
  ];
  const wrap = document.getElementById('whyWrapper');
  if (wrap) {
    wrap.innerHTML = why.map(w => `<div class="swiper-slide"><article class="icon-card"><div class="icon-yellow">${I(w.icon)}</div><h3>${w.t}</h3><div class="divider"></div><p>${w.p}</p></article></div>`).join('');
    if (typeof Swiper !== 'undefined') {
      new Swiper('#whySwiper', {
        slidesPerView: 'auto', spaceBetween: 24, centeredSlides: true, initialSlide: 2,
        grabCursor: true, speed: 700, freeMode: { enabled: true, sticky: false, momentumRatio: .6 },
        breakpoints: { 0: { spaceBetween: 16, initialSlide: 0, centeredSlides: false }, 760: { spaceBetween: 24, initialSlide: 2, centeredSlides: true } }
      });
    }
  }

  /* ---- product categories (Eldcare "living options" tabs) ---- */
  const living = [
    { key: 'diapers', t: 'Пелени и гащи', img: 'assets/img/photos/range-1.jpg', p: 'Пелени „всичко в едно“ за умерена до тежка инконтиненция, пелени с индикатор за влажност и абсорбиращи гащи, които се носят като обикновено бельо. Четири размера по тегло, опаковки по 10 броя.' },
    { key: 'pads', t: 'Подложки и парчета', img: 'assets/img/photos/range-2.jpg', p: 'Анатомични парчета с ултра абсорбиращ троен слой за тежка инконтиненция в M, L и XL, и ергономични урологични подложки за деца и родилки в пет размера.' },
    { key: 'sheets', t: 'Чаршафи за еднократна употреба', img: 'assets/img/photos/range-3.jpg', p: 'Хипоалергенни протектори за легла и фотьойли с непромокаем слой — от 40×60 до 80×180 см, както и детски чаршафи SEVAR Kids в 60×60 и 60×90 см.' },
    { key: 'lady', t: 'Дамски превръзки Амая', img: 'assets/img/photos/range-4.jpg', p: 'Дневни, нощни, коприна, текстил, със и без крилца — меко дишащо покритие, висока абсорбираща способност, дерматологично тествани.' }
  ];
  const tabs = document.getElementById('livingTabs'), imgs = document.getElementById('livingImgs'), text = document.getElementById('livingText'), link = document.getElementById('livingLink');
  if (tabs) {
    tabs.innerHTML = living.map((l, i) => `<button type="button" role="tab" class="${i === 0 ? 'is-active' : ''}" data-i="${i}" aria-selected="${i === 0}"><span class="ico">${I('arrow')}</span>${l.t}</button>`).join('');
    imgs.innerHTML = living.map((l, i) => `<img src="${l.img}" alt="${l.t}" class="${i === 0 ? 'is-active' : ''}" loading="${i === 0 ? 'eager' : 'lazy'}" width="950" height="1060">`).join('');
    text.innerHTML = living.map((l, i) => `<p class="${i === 0 ? 'is-active' : ''}">${l.p}</p>`).join('');
    link.href = 'products.html?cat=' + living[0].key;
    let timer;
    function activate(i) {
      [...tabs.children].forEach((b, k) => { b.classList.toggle('is-active', k === i); b.setAttribute('aria-selected', String(k === i)); });
      [...imgs.children].forEach((im, k) => im.classList.toggle('is-active', k === i));
      [...text.children].forEach((p, k) => p.classList.toggle('is-active', k === i));
      link.href = 'products.html?cat=' + living[i].key;
      if (typeof gsap !== 'undefined') gsap.fromTo(imgs.children[i], { scale: 1.06 }, { scale: 1, duration: 1.1, ease: 'power3.out' });
    }
    tabs.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; clearInterval(timer); activate(+b.dataset.i); });
    tabs.addEventListener('mouseenter', (e) => { const b = e.target.closest && e.target.closest('button'); if (b) { clearInterval(timer); activate(+b.dataset.i); } }, true);
    let cur = 0; timer = setInterval(() => { cur = (cur + 1) % living.length; activate(cur); }, 5000);
  }

  /* ---- product grid ---- */
  const grid = document.getElementById('homeProducts');
  if (grid) {
    SEVAR.renderProducts(grid, SEVAR.products);
    if (SEVAR.motion) SEVAR.motion.initReveals(document.getElementById('homeProductsWrap'));
  }
  SEVAR.initButtons && SEVAR.initButtons(document);

  /* ---- FAQ accordion ---- */
  document.querySelectorAll('.faq').forEach(item => {
    const btn = item.querySelector('.faq-q');
    btn.addEventListener('click', () => {
      const open = item.classList.contains('is-open');
      document.querySelectorAll('.faq.is-open').forEach(o => { if (o !== item) toggle(o, false); });
      toggle(item, !open);
    });
    function toggle(el, open) {
      const p = el.querySelector('.faq-a'), b = el.querySelector('.faq-q');
      el.classList.toggle('is-open', open); b.setAttribute('aria-expanded', String(open));
      if (typeof gsap !== 'undefined') gsap.to(p, { height: open ? 'auto' : 0, duration: .5, ease: 'power3.inOut', onComplete: () => { if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh(); } });
      else p.style.height = open ? 'auto' : '0';
    }
  });
})();
