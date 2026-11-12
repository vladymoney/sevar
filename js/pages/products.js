/* SEVAR — products page: category filter + grid */
(function () {
  const bar = document.getElementById('filterBar');
  const grid = document.getElementById('productsGrid');
  const wrap = document.getElementById('productsWrap');
  if (!bar || !grid) return;

  const params = new URLSearchParams(location.search);
  let active = params.get('cat') || 'all';
  if (!SEVAR.categories.some(c => c.key === active)) active = 'all';

  function count(key) { return key === 'all' ? SEVAR.products.length : SEVAR.products.filter(p => p.cat === key).length; }

  bar.innerHTML = SEVAR.categories.map(c =>
    `<button class="filter-btn${c.key === active ? ' is-active' : ''}" type="button" data-cat="${c.key}">${c.label}<span class="filter-count">${count(c.key)}</span></button>`).join('');

  function render(first) {
    const list = active === 'all' ? SEVAR.products : SEVAR.products.filter(p => p.cat === active);
    const draw = () => {
      SEVAR.renderProducts(grid, list);
      delete grid.dataset.revealDone;
      if (SEVAR.motion) SEVAR.motion.initReveals(wrap);
      SEVAR.initButtons && SEVAR.initButtons(wrap);
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    };
    if (first || typeof gsap === 'undefined') { draw(); return; }
    gsap.to(grid.children, { opacity: 0, y: 16, duration: .25, stagger: .02, onComplete: draw });
  }
  render(true);

  bar.addEventListener('click', (e) => {
    const b = e.target.closest('.filter-btn'); if (!b) return;
    active = b.dataset.cat;
    bar.querySelectorAll('.filter-btn').forEach(x => x.classList.toggle('is-active', x === b));
    history.replaceState(null, '', active === 'all' ? 'products' : 'products?cat=' + active);
    render(false);
  });
})();
