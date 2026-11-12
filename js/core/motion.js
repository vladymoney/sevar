/* SEVAR — motion layer: Lenis smooth scroll + GSAP ScrollTrigger helpers
   data-reveal="up|down|left|right|scale|fade" [data-delay] [data-dur] [data-now]
   data-reveal-stagger            -> animates direct children with a stagger
   data-split                     -> word-by-word mask reveal (data-split="now" plays on load)
   .mark                          -> yellow highlighted phrase with a hand-drawn circle marker (Eldcare "animated headline")
   data-count="500" data-suffix="+" -> counter
   data-scroll-image              -> hero image slowly zooms while scrolling (Eldcare "scroll-image")
   .marquee > .marquee-track      -> infinite marquee
   data-parallax="0.2"            -> scroll parallax
   data-tilt                      -> hover tilt (desktop)
*/
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof gsap !== 'undefined';
  if (hasGsap && typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

  /* ---- Lenis ---- */
  if (!reduce && typeof Lenis !== 'undefined' && hasGsap) {
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
    SEVAR.lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    SEVAR.scrollTo = (target, opts) => lenis.scrollTo(target, Object.assign({ offset: -90, duration: 1.2 }, opts || {}));
  } else {
    SEVAR.scrollTo = (target) => {
      const el = typeof target === 'number' ? null : target;
      window.scrollTo({ top: el ? el.getBoundingClientRect().top + window.scrollY - 90 : 0, behavior: 'smooth' });
    };
  }
  /* in-page "#section" links: always scroll here. Pages have <base href> (server/seo.js), so letting the browser
     follow "#faq" would resolve it against the site root and leave the current page. */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    let el = null; try { el = document.querySelector(id); } catch (_) { /* not a selector, e.g. "#/route" */ }
    if (el) { e.preventDefault(); SEVAR.scrollTo(el); history.replaceState(null, '', location.pathname + location.search + id); }
  });

  /* ---- marker SVG for .mark (hand-drawn ellipse, stretched to the word) ---- */
  const MARK_PATH = 'M40,76 C70,18 446,4 484,62 C502,98 404,146 250,144 C104,142 10,124 14,84 C18,46 120,22 236,18';
  function addMark(el) {
    if (el.querySelector('svg')) return null;
    el.insertAdjacentHTML('beforeend', `<svg viewBox="0 0 500 150" preserveAspectRatio="none" aria-hidden="true"><path d="${MARK_PATH}"/></svg>`);
    return el.querySelector('svg path');
  }
  /* one oval cannot circle a phrase that wraps onto two lines (e.g. on phones) — hide it there, keep the yellow text */
  function checkMarkWrap() {
    document.querySelectorAll('.mark').forEach(el => {
      const lh = parseFloat(getComputedStyle(el).lineHeight) || el.offsetHeight;
      el.classList.toggle('is-wrapped', el.offsetHeight > lh * 1.5);
    });
  }
  let wrapTimer;
  window.addEventListener('resize', () => { clearTimeout(wrapTimer); wrapTimer = setTimeout(checkMarkWrap, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(checkMarkWrap);
  window.addEventListener('load', checkMarkWrap);
  SEVAR.checkMarkWrap = checkMarkWrap;

  if (!hasGsap || reduce) {
    document.querySelectorAll('[data-reveal]').forEach(el => el.style.opacity = 1);
    document.querySelectorAll('[data-count]').forEach(el => el.textContent = el.dataset.count + (el.dataset.suffix || ''));
    document.querySelectorAll('.mark').forEach(addMark);
    SEVAR.motion = { initReveals: () => {}, refresh: () => {} };
    return;
  }

  gsap.defaults({ ease: 'power3.out', duration: 1 });

  /* ---- split words ---- */
  function splitWords(el) {
    if (el.dataset.splitDone) return;
    const walker = (node) => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'word';
            const inner = document.createElement('span'); inner.textContent = part; w.appendChild(inner);
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('word') && n.tagName !== 'svg') walker(n);
      });
    };
    walker(el); el.dataset.splitDone = '1';
  }

  function initReveals(scope) {
    scope = scope || document;
    scope.querySelectorAll('[data-split]').forEach(el => {
      splitWords(el);
      const spans = el.querySelectorAll('.word > span');
      const tween = { y: 0, duration: 1.1, ease: 'power4.out', stagger: 0.045, delay: parseFloat(el.dataset.delay || 0) };
      if (el.dataset.split === 'now') gsap.to(spans, tween);
      else gsap.to(spans, Object.assign(tween, { scrollTrigger: { trigger: el, start: 'top 88%', once: true, fastScrollEnd: true } }));
    });

    scope.querySelectorAll('[data-reveal]').forEach(el => {
      if (el.dataset.revealDone) return; el.dataset.revealDone = '1';
      const type = el.dataset.reveal || 'up';
      const from = { opacity: 0 };
      if (type === 'up') from.y = 48; if (type === 'down') from.y = -48;
      if (type === 'left') from.x = -56; if (type === 'right') from.x = 56;
      if (type === 'scale') { from.scale = .9; from.y = 20; }
      const now = el.dataset.now !== undefined;
      gsap.fromTo(el, from, {
        opacity: 1, x: 0, y: 0, scale: 1, duration: parseFloat(el.dataset.dur || 1.1), delay: parseFloat(el.dataset.delay || 0), ease: 'power3.out',
        scrollTrigger: now ? null : { trigger: el, start: 'top 88%', once: true, fastScrollEnd: true }, clearProps: 'transform'
      });
    });

    scope.querySelectorAll('[data-reveal-stagger]').forEach(group => {
      const kids = [...group.children];
      if (!kids.length || group.dataset.revealDone) return; group.dataset.revealDone = '1';
      gsap.set(kids, { opacity: 0, y: 40 });
      gsap.to(kids, { opacity: 1, y: 0, duration: 1, stagger: parseFloat(group.dataset.revealStagger || .1), ease: 'power3.out',
        scrollTrigger: { trigger: group, start: 'top 85%', once: true, fastScrollEnd: true }, clearProps: 'transform' });
    });

    /* highlighted phrases: draw the marker when in view, redraw every 8s like the theme */
    scope.querySelectorAll('.mark').forEach(el => {
      const path = addMark(el); if (!path) return;
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 });
      const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 6.5 });
      tl.to(path, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' })
        .to(path, { opacity: 0, duration: .35, ease: 'power1.in' }, '+=4.5')
        .set(path, { strokeDashoffset: len, opacity: 1 });
      const now = el.closest('[data-split="now"], [data-now]');
      if (now) gsap.delayedCall(1.1 + parseFloat((el.closest('[data-split]') || {}).dataset?.delay || 0), () => tl.play());
      else ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => gsap.delayedCall(.5, () => tl.play()) });
    });

    scope.querySelectorAll('[data-count]').forEach(el => {
      if (el.dataset.countDone) return; el.dataset.countDone = '1';
      const end = parseFloat(el.dataset.count), suffix = el.dataset.suffix || '', isYear = end > 1900 && end < 2100;
      const obj = { v: isYear ? end - 60 : 0 };
      el.textContent = (isYear ? Math.round(obj.v) : 0) + suffix;
      gsap.to(obj, { v: end, duration: 2, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true, fastScrollEnd: true },
        onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString('bg-BG').replace(/\s/g, '') + suffix; } });
    });

    scope.querySelectorAll('[data-scroll-image]').forEach(el => {
      if (el.dataset.scrollDone) return; el.dataset.scrollDone = '1';
      const img = el.querySelector('img') || el;
      gsap.fromTo(img, { scale: 1 }, { scale: 1.18, ease: 'none', scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true } });
    });

    scope.querySelectorAll('[data-parallax]').forEach(el => {
      if (el.dataset.parallaxDone) return; el.dataset.parallaxDone = '1';
      const speed = parseFloat(el.dataset.parallax || .2);
      gsap.fromTo(el, { y: -speed * 120 }, { y: speed * 120, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    scope.querySelectorAll('.marquee').forEach(m => {
      const track = m.querySelector('.marquee-track'); if (!track || track.dataset.ready) return;
      track.innerHTML += track.innerHTML; track.dataset.ready = '1';
      const tw = gsap.to(track, { xPercent: -50, ease: 'none', duration: parseFloat(m.dataset.speed || 28), repeat: -1 });
      m.addEventListener('mouseenter', () => gsap.to(tw, { timeScale: .25, duration: .6 }));
      m.addEventListener('mouseleave', () => gsap.to(tw, { timeScale: 1, duration: .6 }));
    });

    if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
      scope.querySelectorAll('[data-tilt]').forEach(el => {
        if (el.dataset.tiltDone) return; el.dataset.tiltDone = '1';
        const max = parseFloat(el.dataset.tilt || 8);
        const rx = gsap.quickTo(el, 'rotationX', { duration: .6, ease: 'power3' });
        const ry = gsap.quickTo(el, 'rotationY', { duration: .6, ease: 'power3' });
        gsap.set(el, { transformPerspective: 900 });
        el.addEventListener('mousemove', (e) => {
          const r = el.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - .5) * max * 2);
          rx(-((e.clientY - r.top) / r.height - .5) * max * 2);
        });
        el.addEventListener('mouseleave', () => { rx(0); ry(0); });
      });
    }
  }

  SEVAR.motion = { initReveals, refresh: () => ScrollTrigger.refresh() };
  initReveals(document);
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
