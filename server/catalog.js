/* SEVAR — loads the same company/product data the website uses (js/data/*.js) */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['company.js', 'products.js', 'shop.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'data', f), 'utf8'), sandbox, { filename: f });
}

const SEVAR = sandbox.SEVAR;
const company = SEVAR.company;
const products = (SEVAR.products || []).map(p => ({
  slug: p.slug, name: p.name, cat: p.cat, catLabel: p.catLabel, short: p.short,
  sizesTitle: p.sizesTitle, sizes: (p.sizes || []).map(s => ({ label: s.label, pack: s.pack, bag: s.bag || 0, price: s.price || 0, code: s.code || '', bagPrice: SEVAR.orderable(s) ? SEVAR.bagPrice(s) : 0 }))
}));

const ORDER = SEVAR.ORDER;
/* only sizes with a bag size and a price can be ordered through the site */
const skuIndex = new Map();
products.forEach(p => p.sizes.forEach(s => {
  if (s.bag > 0 && s.price > 0) skuIndex.set(p.slug + '|' + s.label, { product: p.name, size: s.label, pack: s.pack, bag: s.bag, price: s.price, bagPrice: s.bagPrice, code: s.code });
}));

module.exports = { company, products, ROOT, ORDER, skuIndex, SHOP: SEVAR.SHOP, shop: SEVAR };
