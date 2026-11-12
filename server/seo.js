/* SEVAR — SEO layer
   - clean URLs: /products, /about … and /products/<slug>; old *.html, ?p= and WordPress URLs answer with 301
   - every page gets <base>, canonical, robots, Open Graph / Twitter tags and JSON-LD (Organization, WholesaleStore,
     WebSite, FAQPage, BreadcrumbList, Product) rendered on the server, so crawlers do not need to run JavaScript
   - product pages are rendered with their real title/description and a crawlable copy of the content
   - /sitemap.xml and /robots.txt
   SITE_URL (env) is the public address used in canonical/OG/sitemap; default https://sevarbg.com + BASE_PATH. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

module.exports = function createSeo({ ROOT, BASE_PATH }) {
  /* ---------- data: the same files the browser uses ---------- */
  const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
  for (const f of ['js/data/company.js', 'js/data/products.js', 'js/data/shop.js', 'js/core/render.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  }
  const S = ctx.SEVAR, C = S.company, PRODUCTS = S.products;
  const SITE = (process.env.SITE_URL || ('https://sevarbg.com' + BASE_PATH)).replace(/\/+$/, '');
  const abs = (p) => SITE + '/' + String(p || '').replace(/^\.?\//, '');
  const TEL = C.phoneHref.replace(/^tel:/, '');
  const SITE_OG = 'assets/img/og/sevar-og.jpg';

  const PAGES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).map(f => f.slice(0, -5)).filter(n => n !== 'index' && n !== 'product');
  const NOINDEX = new Set(['cart']);
  const IN_SHOP = new Set(['cart']);                       // breadcrumb: Начало › Магазин › …
  const OLD_WP = { timtrade: 'about', contacts: 'contact', 'our-clinic': '', departments: '', news: '' }; // old sevarbg.com pages

  /* ---------- helpers ---------- */
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const strip = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const clip = (s, n) => { s = strip(s); if (s.length <= n) return s; const c = s.slice(0, n - 1); return c.slice(0, c.lastIndexOf(' ')) + '…'; };
  const ld = (graph) => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`;
  const read = (name) => fs.readFileSync(path.join(ROOT, name + '.html'), 'utf8');
  const fromPrice = (p) => { const pr = (p.sizes || []).filter(S.orderable).map(S.bagPrice); return pr.length ? { lo: Math.min(...pr), hi: Math.max(...pr), n: pr.length } : null; };
  const productSlug = (s) => (S.legacySlugs && S.legacySlugs[s]) || s;

  /* ---------- structured data ---------- */
  const DAYS = { 'Понеделник': 'Monday', 'Вторник': 'Tuesday', 'Сряда': 'Wednesday', 'Четвъртък': 'Thursday', 'Петък': 'Friday', 'Събота': 'Saturday', 'Неделя': 'Sunday' };
  const ORDERED = Object.keys(DAYS);
  const hours = (C.hours || []).map(h => {
    const t = String(h.h).match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/); if (!t) return null;
    const [a, b] = String(h.d).split(/\s*[–-]\s*/); const i = ORDERED.indexOf(a), j = b ? ORDERED.indexOf(b) : i;
    if (i < 0 || j < 0) return null;
    return { '@type': 'OpeningHoursSpecification', dayOfWeek: ORDERED.slice(i, j + 1).map(d => 'https://schema.org/' + DAYS[d]), opens: t[1].padStart(5, '0'), closes: t[2].padStart(5, '0') };
  }).filter(Boolean);
  const [postal, ...town] = String(C.address.city).split(' ');
  const ADDRESS = { '@type': 'PostalAddress', streetAddress: C.address.street, addressLocality: town.join(' ') || C.address.city, postalCode: /^\d+$/.test(postal) ? postal : undefined, addressRegion: 'Благоевград', addressCountry: 'BG' };
  const ORG_ID = abs('#organization'), STORE_ID = abs('#store'), SITE_ID = abs('#website');
  const ORG = {
    '@type': 'Organization', '@id': ORG_ID, name: 'SEVAR', legalName: C.legal, alternateName: ['Тим Трейд', 'Севар'], url: abs(''),
    logo: { '@type': 'ImageObject', url: abs('assets/img/brand/sevar-logo.png'), width: 1276, height: 509 },
    email: C.email, telephone: TEL, address: ADDRESS, foundingDate: String(C.founded), sameAs: [C.social.facebook],
    brand: { '@type': 'Brand', name: 'SEVAR' }
  };
  const STORE = {
    '@type': 'WholesaleStore', '@id': STORE_ID, name: 'SEVAR — ' + C.legal, url: abs(''), image: abs(SITE_OG), logo: abs('assets/img/brand/sevar-logo.png'),
    telephone: TEL, email: C.email, address: ADDRESS, openingHoursSpecification: hours, currenciesAccepted: 'EUR',
    areaServed: (C.markets || []).map(n => ({ '@type': 'Country', name: n })), parentOrganization: { '@id': ORG_ID }
  };
  const WEBSITE = { '@type': 'WebSite', '@id': SITE_ID, url: abs(''), name: 'SEVAR', inLanguage: 'bg-BG', publisher: { '@id': ORG_ID } };
  const crumbs = (items) => ({ '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })) });
  function faqFrom(html) {
    const qs = [...html.matchAll(/<button class="faq-q"[^>]*>([\s\S]*?)<i>/g)].map(m => strip(m[1]));
    const as = [...html.matchAll(/<div class="faq-a"><div>([\s\S]*?)<\/div><\/div>/g)].map(m => strip(m[1]));
    if (!qs.length || qs.length !== as.length) return null;
    return { '@type': 'FAQPage', mainEntity: qs.map((q, i) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: as[i] } })) };
  }
  function productLd(p, url) {
    const pr = fromPrice(p);
    const out = {
      '@type': 'Product', '@id': url + '#product', name: p.name, description: strip((p.desc || []).join(' ')) || p.short, sku: p.slug, category: p.catLabel,
      image: [...new Set([...(p.gallery || [p.thumb]), 'assets/img/og/' + p.slug + '.jpg'])].map(abs),
      brand: { '@type': 'Brand', name: 'SEVAR' }, manufacturer: { '@id': ORG_ID }, countryOfOrigin: { '@type': 'Country', name: 'Франция' }
    };
    if (pr) out.offers = { '@type': 'AggregateOffer', priceCurrency: 'EUR', lowPrice: pr.lo.toFixed(2), highPrice: pr.hi.toFixed(2), offerCount: pr.n, availability: 'https://schema.org/InStock', url, seller: { '@id': ORG_ID } };
    return out;
  }

  /* ---------- head injection ---------- */
  function render(html, o) {
    html = html.replace(/\s*<link rel="canonical"[^>]*>/g, '').replace(/\s*<meta (?:property="og:|name="twitter:|name="robots")[^>]*>/g, '')
               .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
    if (o.title) html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(o.title)}</title>`);
    if (o.description) html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(o.description)}">`);
    const title = strip((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1]);
    const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
    const img = abs(o.image || SITE_OG);
    const head = [
      `<link rel="canonical" href="${esc(o.url)}">`,
      `<meta name="robots" content="${o.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">`,
      `<meta name="theme-color" content="#0b2a5b">`,
      `<meta property="og:site_name" content="SEVAR">`, `<meta property="og:locale" content="bg_BG">`,
      `<meta property="og:type" content="${o.ogType || 'website'}">`,
      `<meta property="og:title" content="${esc(o.ogTitle || title)}">`, `<meta property="og:description" content="${desc}">`,
      `<meta property="og:url" content="${esc(o.url)}">`, `<meta property="og:image" content="${esc(img)}">`,
      `<meta property="og:image:width" content="1200">`, `<meta property="og:image:height" content="630">`,
      `<meta property="og:image:alt" content="${esc(o.ogTitle || title)}">`,
      `<meta name="twitter:card" content="summary_large_image">`, `<meta name="twitter:title" content="${esc(o.ogTitle || title)}">`,
      `<meta name="twitter:description" content="${desc}">`, `<meta name="twitter:image" content="${esc(img)}">`,
      o.graph && o.graph.length ? ld(o.graph) : ''
    ].filter(Boolean).join('\n  ');
    html = html.replace(/(<meta charset="[^"]*">)/i, `$1\n  <base href="${BASE_PATH}/">`);   // relative links work at any depth
    html = html.replace('</head>', `  ${head}\n</head>`);
    if (o.main != null) html = html.replace(/(<main id="productView">)[\s\S]*?(<\/main>)/, `$1\n${o.main}\n$2`);
    return html;
  }
  const send = (res, status, html) => { res.status(status).set({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }).send(html); };
  const h1Of = (html) => strip((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1]);

  function renderPage(name) {
    const file = name || 'index', html = read(file), url = abs(name || '');
    const graph = [ORG];
    if (!name) { graph.push(WEBSITE, STORE); const faq = faqFrom(html); if (faq) graph.push(faq); }
    else {
      if (name === 'contact' || name === 'about') graph.push(STORE);
      const trail = [{ name: 'Начало', url: abs('') }];
      if (IN_SHOP.has(name)) trail.push({ name: 'Магазин', url: abs('products') });
      trail.push({ name: h1Of(html) || name, url });
      graph.push(crumbs(trail));
    }
    return render(html, { url, noindex: NOINDEX.has(name), graph });
  }

  function renderProduct(p) {
    const url = abs('products/' + p.slug), pr = fromPrice(p);
    const price = pr ? `Цени на едро от ${S.eur(pr.lo)} с ДДС за чувал.` : 'Цена по запитване.';
    const description = clip(`${p.short} ${price} Френско качество, доставка в цяла България.`, 165);
    const sizes = (p.sizes || []).map(s => `<li><b>${esc(s.label)}</b> — ${esc(s.pack)}${S.orderable(s) ? ` · ${S.eur(S.bagPrice(s))} / чувал (${s.bag} оп.)` : ' · цена по запитване'}</li>`).join('');
    const main = S.banner({ title: p.name, eyebrow: p.catLabel + ' · SEVAR', crumbs: [{ label: 'Магазин', href: 'products' }, { label: p.name }], pos: '50% 25%' }) + `
<section class="section"><div class="container pd-ssr">
  <img src="${esc(p.thumb)}" alt="${esc(p.name)} SEVAR" width="500" height="500">
  <p class="lead">${esc(p.short)}</p>
  ${(p.desc || []).map(d => `<p>${esc(d)}</p>`).join('\n  ')}
  <h2>${esc(p.sizesTitle || 'Размери')} и цени</h2>
  <ul>${sizes}</ul>
</div></section>`;
    return render(read('product'), {
      url, title: `${p.name} SEVAR — размери и цени на едро`, description, ogType: 'product', ogTitle: `${p.name} SEVAR`,
      image: 'assets/img/og/' + p.slug + '.jpg', main,
      graph: [ORG, productLd(p, url), crumbs([{ name: 'Начало', url: abs('') }, { name: 'Магазин', url: abs('products') }, { name: p.name, url }])]
    });
  }

  function render404() {
    const main = S.banner({ title: 'Страницата не е намерена', crumbs: [{ label: 'Магазин', href: 'products' }], lead: 'Страницата, която търсите, не съществува или е преместена. Ето всички продукти, които предлагаме.' });
    return render(read('product'), { url: abs(''), title: 'Страницата не е намерена | SEVAR', description: 'Страницата не съществува. Разгледайте продуктите SEVAR — пелени, гащи, подложки и чаршафи за възрастни на едро.', noindex: true, main, graph: [ORG] });
  }

  /* ---------- sitemap / robots ---------- */
  const mtime = (f) => { try { return fs.statSync(path.join(ROOT, f)).mtime.toISOString().slice(0, 10); } catch (_) { return undefined; } };
  function sitemap() {
    const urls = [{ loc: abs(''), lastmod: mtime('index.html'), pr: '1.0', cf: 'weekly' }]
      .concat(['products', 'catalogue', 'b2b', 'about', 'contact', 'shipping', 'terms', 'privacy'].filter(n => PAGES.includes(n))
        .map(n => ({ loc: abs(n), lastmod: mtime(n + '.html'), pr: n === 'products' ? '0.9' : ['terms', 'privacy', 'shipping'].includes(n) ? '0.3' : '0.6', cf: 'monthly' })))
      .concat(PRODUCTS.map(p => ({ loc: abs('products/' + p.slug), lastmod: mtime('js/data/products.js'), pr: '0.8', cf: 'weekly', img: [p.thumb, ...(p.gallery || [])], title: p.name })));
    const x = (s) => esc(s);
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
      urls.map(u => `  <url><loc>${x(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.cf}</changefreq><priority>${u.pr}</priority>` +
        (u.img ? [...new Set(u.img)].map(i => `<image:image><image:loc>${x(abs(i))}</image:loc><image:title>${x(u.title)}</image:title></image:image>`).join('') : '') + `</url>`).join('\n') +
      `\n</urlset>\n`;
  }
  const robots = () => `User-agent: *\nAllow: ${BASE_PATH}/\nDisallow: ${BASE_PATH}/admin/\nDisallow: ${BASE_PATH}/api/\nDisallow: ${BASE_PATH}/cart\n\nSitemap: ${abs('sitemap.xml')}\n`;

  /* ---------- middleware ---------- */
  const STATIC = /^\/(assets|css|js|admin)(\/|$)/;
  return function seo(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    let p = req.path;
    if (p.startsWith('/api/') || p === '/api') return next();
    const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const go = (to, query = q) => res.redirect(301, BASE_PATH + to + query);

    if (p === '/robots.txt') return res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send(robots());
    if (p === '/sitemap.xml') return res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(sitemap());
    if (STATIC.test(p)) return next();

    /* permanent redirects: *.html, ?p=, trailing slashes, old WordPress URLs */
    let m;
    if (p === '/index.html') return go('/');
    if (p === '/product.html') {
      const sp = new URLSearchParams(q.slice(1)), slug = sp.get('p'); sp.delete('p');
      const rest = sp.toString() ? '?' + sp.toString() : '';
      return slug ? go('/products/' + encodeURIComponent(productSlug(slug)), rest) : go('/products', rest);
    }
    if ((m = p.match(/^\/([\w-]+)\.html$/)) && PAGES.includes(m[1])) return go('/' + m[1]);
    if ((m = p.match(/^\/portfolio-item\/([\w-]+)\/?$/))) return go(S.productBySlug(productSlug(m[1])) ? '/products/' + productSlug(m[1]) : '/products', '');
    if ((m = p.match(/^\/([\w-]+)\/?$/)) && m[1] in OLD_WP) return go('/' + OLD_WP[m[1]], '');
    if (p.length > 1 && p.endsWith('/')) return go(p.replace(/\/+$/, ''));

    /* pages */
    if (p === '/') return send(res, 200, renderPage(''));
    if ((m = p.match(/^\/([\w-]+)$/)) && PAGES.includes(m[1])) return send(res, 200, renderPage(m[1]));
    if ((m = p.match(/^\/products\/([^/]+)$/))) {
      const slug = productSlug(decodeURIComponent(m[1]));
      if (slug !== decodeURIComponent(m[1])) return go('/products/' + slug);
      const prod = S.productBySlug(slug);
      return prod ? send(res, 200, renderProduct(prod)) : send(res, 404, render404());
    }
    /* anything else a browser asks for: friendly 404 instead of plain text */
    if ((req.headers.accept || '').includes('text/html') && !/\.[a-z0-9]{2,5}$/i.test(p)) return send(res, 404, render404());
    next();
  };
};
