/* SEVAR — online shop checkout (/api/orders) and B2B request (/api/b2b) */
const { db, nextNumber } = require('./db');
const auth = require('./auth');
const mail = require('./mail');
const { skuIndex, ORDER, SHOP, shop } = require('./catalog');

const ORDER_STATUS = ['new', 'confirmed', 'shipped', 'done', 'cancelled'];
const B2B_STATUS = ['new', 'taken', 'quoted', 'won', 'closed'];
const json = (s) => { try { return JSON.parse(s); } catch (_) { return null; } };
const clip = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const r2 = (n) => Math.round(n * 100) / 100;
const eur = (n) => r2(n).toFixed(2) + ' €';
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const managerMail = () => process.env.ORDERS_MAIL_TO || process.env.NOTIFY_MAIL_TO || process.env.LABELS_MAIL_TO || 'd.alishahov@yahoo.com';

const hydrateOrder = (r) => r && {
  ...r, customer: json(r.customer) || {}, items: json(r.items) || [], delivery: json(r.delivery) || {},
  payment: json(r.payment) || {}, invoice: json(r.invoice) || {}, totals: json(r.totals) || {}
};
const hydrateB2B = (r) => r && { ...r, items: json(r.items) || [] };

/* lines are always priced from the catalogue on the server, never from the browser */
function cleanLines(list, withPrice) {
  const merged = new Map();
  (Array.isArray(list) ? list : []).slice(0, 300).forEach(i => {
    const ref = skuIndex.get(String(i && i.sku));
    const qty = Math.round(Number(i && i.qty));
    if (!ref || !(qty >= ORDER.min)) return;
    merged.set(i.sku, Math.min(ORDER.max, (merged.get(i.sku) || 0) + qty));
  });
  return [...merged].map(([sku, qty]) => {
    const r = skuIndex.get(sku);
    const line = { sku, product: r.product, size: r.size, code: r.code, pack: r.pack, bag: r.bag, qty };
    if (withPrice) { line.price = r.price; line.total = r2(qty * r.bagPrice); }
    return line;
  });
}

const lineText = (i) => `${i.product} — ${i.size}${i.code ? ' (' + i.code + ')' : ''}: ${i.qty} чув. × ${i.bag} оп.` + (i.total != null ? ` = ${eur(i.total)}` : '');

function mount(app, { wrap, ip }) {
  /* ---------- online shop order ---------- */
  app.post('/api/orders', wrap((req, res) => {
    if (!auth.allow('ord:' + ip(req), 12, 3600e3)) return res.status(429).json({ error: 'too_many' });
    const b = req.body || {};
    const items = cleanLines(b.items, true);
    if (!items.length) return res.status(400).json({ error: 'items_required' });

    const c = b.customer || {};
    const customer = { name: clip(c.name, 120), phone: clip(c.phone, 40), email: clip(c.email, 120) };
    if (!customer.name || !customer.phone) return res.status(400).json({ error: 'name_and_phone_required' });
    if (!EMAIL.test(customer.email)) return res.status(400).json({ error: 'bad_email' });
    if (!b.consent) return res.status(400).json({ error: 'consent_required' });

    const d = shop.shopDelivery(clip(b.delivery && b.delivery.id, 30));
    if (!d) return res.status(400).json({ error: 'delivery_required' });
    const dIn = b.delivery || {};
    const delivery = { id: d.id, label: d.label, courier: d.courier, kind: d.kind, city: clip(dIn.city, 80), office: clip(dIn.office, 160), address: clip(dIn.address, 250) };
    if (d.kind === 'office' && (!delivery.city || !delivery.office)) return res.status(400).json({ error: 'office_required' });
    if (d.kind === 'address' && (!delivery.city || !delivery.address)) return res.status(400).json({ error: 'address_required' });

    const allowed = shop.shopPaymentsFor(d.id);
    const p = allowed.find(x => x.id === clip(b.payment && b.payment.id, 30));
    if (!p) return res.status(400).json({ error: 'payment_required' });

    const iIn = b.invoice || {};
    const invoice = iIn.want ? { want: true, company: clip(iIn.company, 160), eik: clip(iIn.eik, 30), vat: clip(iIn.vat, 30), address: clip(iIn.address, 250) } : {};
    if (invoice.want && (!invoice.company || !invoice.eik)) return res.status(400).json({ error: 'invoice_required' });

    const subtotal = r2(items.reduce((s, i) => s + i.total, 0));
    const totals = shop.shopTotals(subtotal, d.id, p.id);
    delivery.price = totals.shipping;
    const payment = { id: p.id, label: p.label, fee: totals.fee };
    const bags = items.reduce((s, i) => s + i.qty, 0);
    const number = nextNumber('orders', 'ПО');
    db.prepare('INSERT INTO orders (number, type, customer, items, note, delivery, payment, invoice, totals) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(number, 'shop', JSON.stringify(customer), JSON.stringify(items), clip(b.note, 1000), JSON.stringify(delivery), JSON.stringify(payment), JSON.stringify(invoice), JSON.stringify(totals));

    const where = d.kind === 'pickup' ? 'Вземане от склада в Петрич' : d.kind === 'office' ? `${d.label}: ${delivery.city}, ${delivery.office}` : `${d.label}: ${delivery.city}, ${delivery.address}`;
    const summary = items.map(lineText).join('\n') +
      `\n\nСтойност на стоките: ${eur(totals.subtotal)}\nДоставка: ${totals.shipping ? eur(totals.shipping) : 'безплатна'}` +
      (totals.fee ? `\nТакса ${p.label.toLowerCase()}: ${eur(totals.fee)}` : '') + `\nОбщо за плащане (с ДДС): ${eur(totals.total)}`;

    mail.notify(`Нова поръчка ${number} — ${eur(totals.total)}`,
      `${customer.name} · ${customer.phone} · ${customer.email}\n${where}\nПлащане: ${p.label}\n` +
      (invoice.want ? `Фактура: ${invoice.company}, ЕИК ${invoice.eik}${invoice.vat ? ', ДДС ' + invoice.vat : ''}\n` : '') + `\n${summary}` + (b.note ? `\n\nБележка: ${clip(b.note, 1000)}` : ''), managerMail());
    if (mail.configured()) {
      const bank = p.id === 'bank' ? `\n\nДанни за плащане:\nПолучател: ${SHOP.bank.holder}\nIBAN: ${SHOP.bank.iban}\nОснование: поръчка ${number}\nСума: ${eur(totals.total)}` : '';
      mail.send({
        to: customer.email, subject: `Получихме поръчка ${number} — Тим Трейд / SEVAR`,
        text: `Здравейте, ${customer.name}!\n\nБлагодарим за поръчката. Ще се свържем с вас за потвърждение.\n\n${where}\nПлащане: ${p.label}\n\n${summary}${bank}\n\nТим Трейд ООД · SEVAR`
      }).catch(e => console.error('customer mail:', e.message));
    }
    res.json({ ok: true, number, bags, lines: items.length, totals, payment: p.id, bank: p.id === 'bank' ? SHOP.bank : null, email: mail.configured() ? customer.email : '' });
  }));

  /* ---------- B2B request: no prices, handled by a manager outside the site ---------- */
  app.post('/api/b2b', wrap((req, res) => {
    if (!auth.allow('b2b:' + ip(req), 8, 3600e3)) return res.status(429).json({ error: 'too_many' });
    const b = req.body || {};
    const company = clip(b.company, 160), name = clip(b.name, 120), phone = clip(b.phone, 40), email = clip(b.email, 120);
    if (!company || !name || !phone) return res.status(400).json({ error: 'company_name_phone_required' });
    if (email && !EMAIL.test(email)) return res.status(400).json({ error: 'bad_email' });
    if (!b.consent) return res.status(400).json({ error: 'consent_required' });
    const items = cleanLines(b.items, false);
    const message = clip(b.message, 3000);
    if (!items.length && !message) return res.status(400).json({ error: 'items_or_message_required' });
    const number = nextNumber('b2b_requests', 'B2B');
    db.prepare('INSERT INTO b2b_requests (number, company, eik, name, phone, email, city, items, message, frequency) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(number, company, clip(b.eik, 30), name, phone, email, clip(b.city, 80), JSON.stringify(items), message, clip(b.frequency, 120));
    const bags = items.reduce((s, i) => s + i.qty, 0);
    mail.notify(`Нова B2B заявка ${number} — ${company}`,
      `${company}${b.eik ? ' · ЕИК ' + clip(b.eik, 30) : ''}\n${name} · ${phone}${email ? ' · ' + email : ''}\n${clip(b.city, 80)}${b.frequency ? '\nПериодичност: ' + clip(b.frequency, 120) : ''}\n\n` +
      (items.length ? items.map(lineText).join('\n') + `\n\nОбщо: ${bags} ${ORDER.units}\n\n` : '') + message, managerMail());
    res.json({ ok: true, number, bags, lines: items.length });
  }));
}

module.exports = { mount, hydrateOrder, hydrateB2B, ORDER_STATUS, B2B_STATUS };
