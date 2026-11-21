/* SEVAR — web server: static site + public API + admin API */
const fs = require('fs');
const path = require('path');
loadEnv(path.join(__dirname, '..', '.env'));
const express = require('express');
const mail = require('./mail');
const emails = require('./emails');
const { db, nextNumber } = require('./db');
const auth = require('./auth');
const chat = require('./chat');
const { company, products, ROOT, ORDER, skuIndex } = require('./catalog');
const { quotePdf, labelRequestPdf, quoteTotals, pdfBuffer } = require('./pdf');

const PORT = Number(process.env.PORT) || 3000;
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '64kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

/* temporary password lock for the public site: on while SITE_PASSWORD is set (server/lock.js) */
require('./lock').mount(app);

const clip = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const json = (s) => { try { return JSON.parse(s); } catch (_) { return null; } };
const ip = (req) => req.ip || 'unknown';
const wrap = (fn) => (req, res) => { try { fn(req, res); } catch (e) { console.error(e); res.status(500).json({ error: 'server_error' }); } };

/* ---------------- public API ---------------- */
app.get('/api/health', (req, res) => res.json({ ok: true, chat: !!process.env.ANTHROPIC_API_KEY }));

app.post('/api/inquiries', wrap((req, res) => {
  if (!auth.allow('inq:' + ip(req), 10, 3600e3)) return res.status(429).json({ error: 'too_many' });
  const b = req.body || {};
  const name = clip(b.name, 120), phone = clip(b.phone, 40), email = clip(b.email, 120);
  if (!name || (!phone && !email)) return res.status(400).json({ error: 'name_and_contact_required' });
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'bad_email' });
  const inq = { source: 'form', name, company: clip(b.company, 160), phone, email, product: clip(b.product, 600), message: clip(b.message, 3000), page: clip(b.page, 80) };
  db.prepare('INSERT INTO inquiries (source, name, company, phone, email, product, message, page) VALUES (?,?,?,?,?,?,?,?)')
    .run(inq.source, inq.name, inq.company, inq.phone, inq.email, inq.product, inq.message, inq.page);
  mail.later(emails.officeInquiry(inq), mail.recipients.inquiries());
  if (email) mail.later(emails.inquiryReceived(inq), email);
  res.json({ ok: true, email: mail.configured() ? email : '' });
}));

/* shop checkout + B2B request */
const { mount: mountShop, hydrateOrder, hydrateB2B, ORDER_STATUS, B2B_STATUS } = require('./shop');
mountShop(app, { wrap, ip });

app.post('/api/chat', async (req, res) => {
  if (!auth.allow('chat:' + ip(req), 30, 600e3)) return res.status(429).json({ error: 'too_many' });
  const msgs = Array.isArray(req.body && req.body.messages) ? req.body.messages : [];
  try { res.json(await chat.reply(msgs)); }
  catch (e) { if (!e.code) console.error(e); res.status(e.code || 500).json({ error: e.message || 'server_error' }); }
});

/* ---------------- admin auth ---------------- */
app.post('/api/admin/login', (req, res) => {
  if (!process.env.ADMIN_PASSWORD) return res.status(503).json({ error: 'admin_not_configured' });
  if (!auth.allow('login:' + ip(req), 8, 15 * 60e3)) return res.status(429).json({ error: 'too_many' });
  if (!auth.checkPassword(String((req.body || {}).password || ''))) return res.status(401).json({ error: 'wrong_password' });
  auth.setSession(req, res); res.json({ ok: true });
});
app.post('/api/admin/logout', (req, res) => { auth.clearSession(res); res.json({ ok: true }); });
app.get('/api/admin/me', (req, res) => res.json({ authed: auth.isAuthed(req) }));

const admin = express.Router();
admin.use(auth.requireAuth);
app.use('/api/admin', admin);

admin.get('/stats', wrap((req, res) => {
  const c = (sql) => db.prepare(sql).get().n;
  res.json({
    newInquiries: c("SELECT COUNT(*) n FROM inquiries WHERE status='new'"),
    newOrders: c("SELECT COUNT(*) n FROM orders WHERE status='new'"),
    newB2B: c("SELECT COUNT(*) n FROM b2b_requests WHERE status='new'"),
    openQuotes: c("SELECT COUNT(*) n FROM quotes WHERE status IN ('draft','sent')"),
    labelRequests: c("SELECT COUNT(*) n FROM label_requests WHERE status!='done'")
  });
}));
admin.get('/catalog', (req, res) => res.json({ products, company: { legal: company.legal, phone: company.phoneDisplay, email: company.email } }));

/* inquiries */
const INQ_STATUS = ['new', 'in_progress', 'quoted', 'closed'];
admin.get('/inquiries', wrap((req, res) => {
  const st = clip(req.query.status, 20);
  const rows = st && INQ_STATUS.includes(st)
    ? db.prepare('SELECT * FROM inquiries WHERE status = ? ORDER BY id DESC LIMIT 500').all(st)
    : db.prepare('SELECT * FROM inquiries ORDER BY id DESC LIMIT 500').all();
  res.json(rows);
}));
admin.patch('/inquiries/:id', wrap((req, res) => {
  const b = req.body || {}, cur = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'not_found' });
  const status = INQ_STATUS.includes(b.status) ? b.status : cur.status;
  db.prepare('UPDATE inquiries SET status = ?, notes = ? WHERE id = ?').run(status, b.notes == null ? cur.notes : clip(b.notes, 3000), cur.id);
  res.json(db.prepare('SELECT * FROM inquiries WHERE id = ?').get(cur.id));
}));
admin.delete('/inquiries/:id', wrap((req, res) => { db.prepare('DELETE FROM inquiries WHERE id = ?').run(req.params.id); res.json({ ok: true }); }));

/* orders */
admin.get('/orders', wrap((req, res) => res.json(db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 500').all().map(hydrateOrder))));
/* status e-mails to the customer: sent only when the admin ticks „Уведоми клиента“ */
const ORDER_MAIL = { confirmed: emails.orderConfirmed, shipped: emails.orderShipped, cancelled: emails.orderCancelled };
admin.patch('/orders/:id', async (req, res) => {
  try {
    const b = req.body || {}, cur = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!cur) return res.status(404).json({ error: 'not_found' });
    const status = ORDER_STATUS.includes(b.status) ? b.status : cur.status;
    db.prepare('UPDATE orders SET status = ?, notes = ?, tracking = ? WHERE id = ?')
      .run(status, b.notes == null ? cur.notes : clip(b.notes, 3000), b.tracking == null ? cur.tracking : clip(b.tracking, 80), cur.id);
    const o = hydrateOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(cur.id));
    let mailed = '';
    if (b.notify && ORDER_MAIL[status] && o.customer.email) {
      try { await mail.send(ORDER_MAIL[status](o), o.customer.email); mailed = o.customer.email; }
      catch (e) { console.error('order status mail:', e.message); return res.json({ ...o, mailError: e.code === 'smtp_not_configured' ? 'smtp_not_configured' : 'send_failed' }); }
    }
    res.json({ ...o, mailed });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server_error' }); }
});
admin.get('/orders/:id/email/:status/preview', wrap((req, res) => {
  const o = hydrateOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)), make = ORDER_MAIL[req.params.status];
  if (!o || !make) return res.status(404).send('Not found');
  previewHtml(res, make({ ...o, status: req.params.status, tracking: req.query.tracking == null ? o.tracking : clip(req.query.tracking, 80) }));
}));
admin.delete('/orders/:id', wrap((req, res) => { db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id); res.json({ ok: true }); }));

/* B2B requests */
admin.get('/b2b', wrap((req, res) => res.json(db.prepare('SELECT * FROM b2b_requests ORDER BY id DESC LIMIT 500').all().map(hydrateB2B))));
admin.patch('/b2b/:id', wrap((req, res) => {
  const b = req.body || {}, cur = db.prepare('SELECT * FROM b2b_requests WHERE id = ?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'not_found' });
  db.prepare('UPDATE b2b_requests SET status = ?, owner = ?, notes = ? WHERE id = ?')
    .run(B2B_STATUS.includes(b.status) ? b.status : cur.status, b.owner == null ? cur.owner : clip(b.owner, 80), b.notes == null ? cur.notes : clip(b.notes, 3000), cur.id);
  res.json(hydrateB2B(db.prepare('SELECT * FROM b2b_requests WHERE id = ?').get(cur.id)));
}));
admin.delete('/b2b/:id', wrap((req, res) => { db.prepare('DELETE FROM b2b_requests WHERE id = ?').run(req.params.id); res.json({ ok: true }); }));

/* quotes */
const QUOTE_STATUS = ['draft', 'sent', 'accepted', 'rejected'];
const hydrateQuote = (r) => r && { ...r, customer: json(r.customer) || {}, items: json(r.items) || [] };
const cleanItems = (items) => (Array.isArray(items) ? items : []).slice(0, 100).map(i => ({
  name: clip(i.name, 200), desc: clip(i.desc, 300), unit: clip(i.unit, 12) || 'бр.',
  qty: Math.max(0, Number(i.qty) || 0), price: Math.max(0, Number(i.price) || 0)
})).filter(i => i.name);
const cleanCustomer = (c = {}) => ({
  name: clip(c.name, 120), company: clip(c.company, 160), eik: clip(c.eik, 30),
  address: clip(c.address, 200), phone: clip(c.phone, 40), email: clip(c.email, 120)
});
function quoteFields(b) {
  const cur = ['EUR', 'BGN'].includes(b.currency) ? b.currency : 'EUR';
  return {
    customer: JSON.stringify(cleanCustomer(b.customer)), items: JSON.stringify(cleanItems(b.items)),
    vat_rate: Math.min(100, Math.max(0, Number(b.vat_rate))) || 0,
    discount_pct: Math.min(100, Math.max(0, Number(b.discount_pct) || 0)), currency: cur,
    valid_until: clip(b.valid_until, 10), notes: clip(b.notes, 2000),
    status: QUOTE_STATUS.includes(b.status) ? b.status : 'draft'
  };
}
admin.get('/quotes', wrap((req, res) => {
  res.json(db.prepare('SELECT * FROM quotes ORDER BY id DESC LIMIT 500').all().map(hydrateQuote).map(q => ({ ...q, total: quoteTotals(q).total })));
}));
admin.get('/quotes/:id', wrap((req, res) => {
  const q = hydrateQuote(db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id));
  q ? res.json(q) : res.status(404).json({ error: 'not_found' });
}));
admin.post('/quotes', wrap((req, res) => {
  const b = req.body || {}, f = quoteFields({ vat_rate: 20, ...b });
  const inquiryId = Number(b.inquiry_id) || null;
  const info = db.prepare('INSERT INTO quotes (number, inquiry_id, customer, items, vat_rate, discount_pct, currency, valid_until, notes, status) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(nextNumber('quotes', 'ОФ'), inquiryId, f.customer, f.items, f.vat_rate, f.discount_pct, f.currency, f.valid_until, f.notes, f.status);
  if (inquiryId) db.prepare("UPDATE inquiries SET status = 'quoted' WHERE id = ? AND status IN ('new','in_progress')").run(inquiryId);
  res.json(hydrateQuote(db.prepare('SELECT * FROM quotes WHERE id = ?').get(info.lastInsertRowid)));
}));
admin.put('/quotes/:id', wrap((req, res) => {
  if (!db.prepare('SELECT 1 FROM quotes WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'not_found' });
  const f = quoteFields(req.body || {});
  db.prepare('UPDATE quotes SET customer=?, items=?, vat_rate=?, discount_pct=?, currency=?, valid_until=?, notes=?, status=? WHERE id=?')
    .run(f.customer, f.items, f.vat_rate, f.discount_pct, f.currency, f.valid_until, f.notes, f.status, req.params.id);
  res.json(hydrateQuote(db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id)));
}));
admin.delete('/quotes/:id', wrap((req, res) => { db.prepare('DELETE FROM quotes WHERE id = ?').run(req.params.id); res.json({ ok: true }); }));
admin.get('/quotes/:id/pdf', wrap((req, res) => {
  const q = hydrateQuote(db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id));
  q ? quotePdf(q, res) : res.status(404).json({ error: 'not_found' });
}));
/* e-mail a quote to the customer with the PDF attached; a draft becomes „Изпратена“ */
admin.get('/quotes/:id/email', wrap((req, res) => {
  const q = hydrateQuote(db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id));
  if (!q) return res.status(404).json({ error: 'not_found' });
  res.json({ to: q.customer.email || '', message: emails.quoteDefaultMessage(q), configured: mail.configured() });
}));
admin.get('/quotes/:id/email/preview', wrap((req, res) => {
  const q = hydrateQuote(db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id));
  if (!q) return res.status(404).send('Not found');
  previewHtml(res, emails.quote(q, clip(req.query.message, 4000)));
}));
admin.post('/quotes/:id/send', async (req, res) => {
  try {
    const q = hydrateQuote(db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id));
    if (!q) return res.status(404).json({ error: 'not_found' });
    const b = req.body || {}, to = clip(b.to || q.customer.email, 200);
    if (!EMAIL_RE.test(to)) return res.status(400).json({ error: 'bad_email' });
    if (!mail.configured()) return res.status(503).json({ error: 'smtp_not_configured' });
    const pdf = await pdfBuffer(quotePdf, q);
    await mail.send(emails.quote(q, clip(b.message, 4000)), to, [{ filename: `${q.number}.pdf`, content: pdf, contentType: 'application/pdf' }]);
    if (q.status === 'draft') db.prepare("UPDATE quotes SET status = 'sent' WHERE id = ?").run(q.id);
    res.json({ ok: true, to });
  } catch (e) { console.error('send quote:', e.message); res.status(502).json({ error: 'send_failed' }); }
});

/* labels catalogue */
const hydrateLabel = (r) => r && { ...r, active: !!r.active, qty_options: json(r.qty_options) || [] };
const cleanQty = (a) => [...new Set((Array.isArray(a) ? a : String(a || '').split(/[,;\s]+/)).map(Number).filter(n => n > 0 && Number.isFinite(n)))].sort((x, y) => x - y).slice(0, 30);
admin.get('/labels', wrap((req, res) => res.json(db.prepare('SELECT * FROM labels ORDER BY name').all().map(hydrateLabel))));
admin.post('/labels', wrap((req, res) => {
  const b = req.body || {}; if (!clip(b.name, 160)) return res.status(400).json({ error: 'name_required' });
  const info = db.prepare('INSERT INTO labels (code, name, description, qty_options, active) VALUES (?,?,?,?,?)')
    .run(clip(b.code, 40), clip(b.name, 160), clip(b.description, 400), JSON.stringify(cleanQty(b.qty_options)), b.active === false ? 0 : 1);
  res.json(hydrateLabel(db.prepare('SELECT * FROM labels WHERE id = ?').get(info.lastInsertRowid)));
}));
admin.post('/labels/bulk-qty', wrap((req, res) => {
  const qty = JSON.stringify(cleanQty((req.body || {}).qty_options));
  const ids = Array.isArray((req.body || {}).ids) ? req.body.ids.map(Number).filter(Boolean) : null;
  const upd = db.prepare('UPDATE labels SET qty_options = ? WHERE id = ?');
  const targets = ids || db.prepare('SELECT id FROM labels').all().map(r => r.id);
  db.exec('BEGIN'); targets.forEach(id => upd.run(qty, id)); db.exec('COMMIT');
  res.json({ ok: true, updated: targets.length });
}));
admin.put('/labels/:id', wrap((req, res) => {
  const b = req.body || {}; if (!clip(b.name, 160)) return res.status(400).json({ error: 'name_required' });
  db.prepare('UPDATE labels SET code=?, name=?, description=?, qty_options=?, active=? WHERE id=?')
    .run(clip(b.code, 40), clip(b.name, 160), clip(b.description, 400), JSON.stringify(cleanQty(b.qty_options)), b.active === false ? 0 : 1, req.params.id);
  res.json(hydrateLabel(db.prepare('SELECT * FROM labels WHERE id = ?').get(req.params.id)));
}));
admin.delete('/labels/:id', wrap((req, res) => { db.prepare('DELETE FROM labels WHERE id = ?').run(req.params.id); res.json({ ok: true }); }));

/* label requests */
const LR_STATUS = ['draft', 'sent', 'done'];
const hydrateLR = (r) => r && { ...r, items: json(r.items) || [] };
const cleanLRItems = (items) => (Array.isArray(items) ? items : []).slice(0, 100).map(i => ({
  label_id: Number(i.label_id) || null, code: clip(i.code, 40), name: clip(i.name, 160), size: clip(i.size, 40), qty: Math.max(0, Math.round(Number(i.qty) || 0))
})).filter(i => i.name && i.qty > 0);
admin.get('/label-requests', wrap((req, res) => res.json(db.prepare('SELECT * FROM label_requests ORDER BY id DESC LIMIT 300').all().map(hydrateLR))));
admin.post('/label-requests', wrap((req, res) => {
  const b = req.body || {}, items = cleanLRItems(b.items);
  if (!items.length) return res.status(400).json({ error: 'items_required' });
  const info = db.prepare('INSERT INTO label_requests (number, items, notes, status) VALUES (?,?,?,?)')
    .run(nextNumber('label_requests', 'ЕТ'), JSON.stringify(items), clip(b.notes, 2000), LR_STATUS.includes(b.status) ? b.status : 'draft');
  res.json(hydrateLR(db.prepare('SELECT * FROM label_requests WHERE id = ?').get(info.lastInsertRowid)));
}));
admin.put('/label-requests/:id', wrap((req, res) => {
  const b = req.body || {}, items = cleanLRItems(b.items);
  if (!items.length) return res.status(400).json({ error: 'items_required' });
  db.prepare('UPDATE label_requests SET items=?, notes=?, status=? WHERE id=?')
    .run(JSON.stringify(items), clip(b.notes, 2000), LR_STATUS.includes(b.status) ? b.status : 'draft', req.params.id);
  res.json(hydrateLR(db.prepare('SELECT * FROM label_requests WHERE id = ?').get(req.params.id)));
}));
admin.delete('/label-requests/:id', wrap((req, res) => { db.prepare('DELETE FROM label_requests WHERE id = ?').run(req.params.id); res.json({ ok: true }); }));
admin.get('/label-requests/:id/pdf', wrap((req, res) => {
  const r = hydrateLR(db.prepare('SELECT * FROM label_requests WHERE id = ?').get(req.params.id));
  r ? labelRequestPdf(r, res) : res.status(404).json({ error: 'not_found' });
}));
admin.post('/label-requests/:id/send', async (req, res) => {
  try {
    const r = hydrateLR(db.prepare('SELECT * FROM label_requests WHERE id = ?').get(req.params.id));
    if (!r) return res.status(404).json({ error: 'not_found' });
    if (!mail.configured()) return res.status(503).json({ error: 'smtp_not_configured' });
    const pdf = await pdfBuffer(labelRequestPdf, r);
    const to = mail.recipients.labels();
    await mail.send(emails.labelRequest(r), to, [{ filename: `${r.number}.pdf`, content: pdf, contentType: 'application/pdf' }]);
    db.prepare("UPDATE label_requests SET status='sent' WHERE id=?").run(r.id);
    res.json({ ok: true, to });
  } catch (e) { console.error('send label request:', e.message); res.status(502).json({ error: 'send_failed' }); }
});

/* e-mail templates: SMTP status, previews with sample data, test e-mail */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
function previewHtml(res, msg) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(msg.html.replace(new RegExp('cid:' + emails.LOGO_CID, 'g'), '/assets/img/brand/sevar-logo-email.png'));
}
admin.get('/emails', wrap((req, res) => {
  res.json({
    configured: mail.configured(), from: mail.fromAddress(), replyTo: mail.replyAddress(),
    to: { inquiries: mail.recipients.inquiries(), orders: mail.recipients.orders(), labels: mail.recipients.labels() },
    templates: emails.CATALOG.map(t => ({ id: t.id, group: t.group, title: t.title, when: t.when, subject: t.build().subject }))
  });
}));
admin.get('/emails/:id/preview', wrap((req, res) => {
  const t = emails.CATALOG.find(x => x.id === req.params.id);
  t ? previewHtml(res, t.build()) : res.status(404).send('Not found');
}));
admin.post('/emails/test', async (req, res) => {
  try {
    const b = req.body || {}, to = clip(b.to, 200), t = emails.CATALOG.find(x => x.id === b.id) || emails.CATALOG[0];
    if (!EMAIL_RE.test(to)) return res.status(400).json({ error: 'bad_email' });
    if (!auth.allow('mailtest:' + ip(req), 20, 3600e3)) return res.status(429).json({ error: 'too_many' });
    if (!mail.configured()) return res.status(503).json({ error: 'smtp_not_configured' });
    const msg = t.build();
    await mail.send({ ...msg, subject: '[ТЕСТ] ' + msg.subject, replyTo: undefined }, to);
    res.json({ ok: true, to });
  } catch (e) { console.error('test mail:', e.message); res.status(502).json({ error: 'send_failed', detail: e.message }); }
});
admin.use((req, res) => res.status(404).json({ error: 'not_found' }));

/* ---------------- pages: clean URLs, redirects, server-rendered SEO, sitemap, robots ---------------- */
app.use(require('./seo')({ ROOT }));

/* ---------------- static site (allow-listed paths only) ---------------- */
const ALLOWED = /^\/(assets|css|js|admin)(\/|$)|^\/[\w-]+\.html$|^\/$/;
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not_found' });
  if (!ALLOWED.test(req.path) || req.path.includes('..')) return res.status(404).send('Not found');
  next();
});
app.use('/admin', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex'); next(); });
/* HTML is revalidated on every visit (cheap 304 via ETag), so a new ?v= tag on CSS/JS reaches visitors right after a deploy;
   versioned assets keep the 1h cache */
app.use(express.static(ROOT, {
  index: 'index.html', extensions: ['html'], dotfiles: 'ignore', maxAge: '1h',
  setHeaders: (res, file) => { if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); }
}));
app.use((req, res) => res.status(404).send('Not found'));

app.listen(PORT, () => {
  console.log(`SEVAR running on http://localhost:${PORT}`);
  if (process.env.SITE_PASSWORD) console.log('! The public site is LOCKED with SITE_PASSWORD (remove it from .env to open the site).');
  if (!process.env.ADMIN_PASSWORD) console.warn('! ADMIN_PASSWORD is not set — the admin panel is disabled.');
  if (!process.env.ANTHROPIC_API_KEY) console.warn('! ANTHROPIC_API_KEY is not set — the AI chat is disabled.');
});

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
}
