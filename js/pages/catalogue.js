/* SEVAR — catalogue flipbook (page-flip / StPageFlip) built from the rendered PDF pages */
(function () {
  const el = document.getElementById('flipBook');
  if (!el || typeof St === 'undefined') return;
  const TOTAL = 21;
  const pad = (n) => String(n).padStart(2, '0');
  const pages = Array.from({ length: TOTAL }, (_, i) => `assets/catalogue/pages/page-${pad(i + 1)}.jpg`);
  const thumbs = Array.from({ length: TOTAL }, (_, i) => `assets/catalogue/pages/thumb-${pad(i + 1)}.jpg`);

  const stage = document.getElementById('flipStage');
  const pageNo = document.getElementById('flipPageNo');
  const thumbWrap = document.getElementById('flipThumbs');

  const book = new St.PageFlip(el, {
    width: 700, height: 700, size: 'stretch',
    minWidth: 260, maxWidth: 1100, minHeight: 260, maxHeight: 1100,
    showCover: true, drawShadow: true, maxShadowOpacity: .45, flippingTime: 850,
    usePortrait: true, mobileScrollSupport: false, autoSize: true, swipeDistance: 20, showPageCorners: true
  });
  book.loadFromImages(pages);
  SEVAR.book = book;

  thumbWrap.innerHTML = thumbs.map((t, i) => `<button type="button" data-page="${i}" aria-label="Страница ${i + 1}"><img src="${t}" alt="" width="160" height="160"></button>`).join('');
  const thumbBtns = [...thumbWrap.children];

  function update() {
    const i = book.getCurrentPageIndex();
    const portrait = book.getOrientation() === 'portrait';
    let label;
    if (portrait || i === 0 || i === TOTAL - 1) label = `${i + 1} / ${TOTAL}`;
    else label = `${i + 1}–${Math.min(i + 2, TOTAL)} / ${TOTAL}`;
    pageNo.textContent = label;
    thumbBtns.forEach((b, k) => b.classList.toggle('is-active', k === i || (!portrait && i !== 0 && k === i + 1)));
    const act = thumbBtns[i];
    if (act) thumbWrap.scrollTo({ left: act.offsetLeft - thumbWrap.clientWidth / 2 + act.offsetWidth / 2, behavior: 'smooth' });
    document.getElementById('flipPrev').disabled = i === 0;
    document.getElementById('flipFirst').disabled = i === 0;
    document.getElementById('flipNext').disabled = i >= TOTAL - 1;
    document.getElementById('flipLast').disabled = i >= TOTAL - 1;
  }
  book.on('flip', update);
  book.on('changeOrientation', update);
  book.on('init', update);

  document.getElementById('flipPrev').addEventListener('click', () => book.flipPrev());
  document.getElementById('flipNext').addEventListener('click', () => book.flipNext());
  document.getElementById('flipFirst').addEventListener('click', () => book.flip(0));
  document.getElementById('flipLast').addEventListener('click', () => book.flip(TOTAL - 1));
  thumbWrap.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) book.flip(+b.dataset.page); });

  document.getElementById('flipFull').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (stage.requestFullscreen) stage.requestFullscreen();
  });
  document.addEventListener('fullscreenchange', () => setTimeout(() => book.update(), 150));

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === 'ArrowRight') book.flipNext();
    if (e.key === 'ArrowLeft') book.flipPrev();
  });

  /* keep Lenis from hijacking drag gestures on the book */
  el.setAttribute('data-lenis-prevent', '');
  setTimeout(update, 50);
})();
