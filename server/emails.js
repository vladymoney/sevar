/* SEVAR — e-mail templates.
   Every message the site sends uses one branded layout (logo, SEVAR blue + yellow, contacts footer).
   Templates are built from small blocks (paragraph, details card, product list, highlight box, steps, button),
   and each block renders both as HTML and as plain text, so the two versions always say the same thing.
   Preview all of them with sample data in /admin → „Имейли“. */
const { company, products, shop, SHOP, skuIndex } = require('./catalog');

const SITE = () => (process.env.SITE_URL || 'https://sevarbg.com').replace(/\/+$/, '');
const LOGO_CID = 'sevar-logo';

const K = {
  navy: '#0b2a5b', blue: '#1d6fe0', sky: '#5bb5f7', yellow: '#f5c233', yellow100: '#fff3cc',
  cream: '#f4f1eb', ink: '#1b2437', text: '#566074', muted: '#8a93a3', line: '#e2dccf', white: '#ffffff'
};
const HEAD = "'Comfortaa', 'Trebuchet MS', Arial, sans-serif";
const BODY = "'Nunito', 'Segoe UI', Arial, sans-serif";
const F = `font-family:${BODY};`;

/* ---------- helpers ---------- */
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CUR = { EUR: '€', BGN: 'лв.' };
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const money = (n, cur = 'EUR') => `${r2(n).toFixed(2)} ${CUR[cur] || cur}`;
const num = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const qtyFmt = (n) => (Number.isInteger(Number(n)) ? num(n) : String(n));
const bgDate = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}.${m[2]}.${m[1]}` : ''; };
const bags = (n) => `${num(n)} ${Number(n) === 1 ? 'чувал' : 'чувала'}`;
const telHref = (p) => 'tel:' + String(p || '').replace(/[^\d+]/g, '');
/* the visitor's own name is the only free text a confirmation repeats: keep it short and never a link */
const safeName = (s) => { const v = String(s || '').trim().replace(/\s+/g, ' ').slice(0, 60); return /https?:|www\.|:\/\/|[<>@]/i.test(v) ? '' : v; };
const hello = (name) => { const n = safeName(name); return n ? ['Здравейте, ', b(n), '!'] : ['Здравейте!']; };
const mapsUrl = () => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(company.address.mapQuery);
const trackUrl = (courier, n) => {
  if (!n) return '';
  if (/еконт|econt/i.test(courier)) return 'https://www.econt.com/services/track-shipment/' + encodeURIComponent(n);
  if (/спиди|speedy/i.test(courier)) return 'https://www.speedy.bg/bg/track-shipment?shipmentNumber=' + encodeURIComponent(n);
  return '';
};

/* inline text parts: plain strings, b('bold'), a('label', 'href') */
const b = (t) => ({ b: t });
const a = (t, href) => ({ a: t, href });
const flat = (parts) => [].concat(...parts.map(p => (Array.isArray(p) ? flat(p) : [p]))).filter(p => p != null && p !== '');
const partsHtml = (parts) => flat(parts).map(x => typeof x !== 'object' ? esc(x).replace(/\n/g, '<br>')
  : x.href ? `<a href="${esc(x.href)}" style="color:${K.blue};font-weight:700;text-decoration:none">${esc(x.a)}</a>`
  : `<strong style="color:${K.ink};font-weight:700">${esc(x.b)}</strong>`).join('');
const partsText = (parts) => flat(parts).map(x => typeof x !== 'object' ? String(x)
  : x.href ? (/^(mailto|tel):/.test(x.href) ? x.a : `${x.a} (${x.href})`) : x.b).join('');
const valHtml = (v) => (Array.isArray(v) ? partsHtml(v) : esc(v).replace(/\n/g, '<br>'));
const valText = (v) => (Array.isArray(v) ? partsText(v) : String(v));
const rowsOf = (rows) => rows.filter(r => r && r[1] != null && r[1] !== '' && !(Array.isArray(r[1]) && !flat(r[1]).length));

/* ---------- blocks ---------- */
const P = (...parts) => ({ t: 'p', parts });
const KV = (title, rows) => ({ t: 'kv', title, rows: rowsOf(rows) });
const ITEMS = (title, rows, totals = []) => ({ t: 'items', title, rows, totals: totals.filter(Boolean) });
const BOX = (title, rows, note) => ({ t: 'box', title, rows: rowsOf(rows || []), note });
const MSG = (title, text) => (String(text || '').trim() ? { t: 'msg', title, text: String(text).trim() } : null);
const BTN = (label, href, dark) => (href ? { t: 'btn', label, href, dark } : null);
const STEPS = (title, steps) => ({ t: 'steps', title, steps: steps.filter(Boolean) });

const label = (t) => (t ? `<p style="margin:0 0 10px;${F}font-size:12px;line-height:1.4;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${K.muted}">${esc(t)}</p>` : '');
const kvRowsHtml = (rows) => rows.map(([k, v]) => `<tr>
  <td valign="top" style="padding:6px 14px 6px 0;width:34%;${F}font-size:14px;line-height:1.5;color:${K.muted}">${esc(k)}</td>
  <td valign="top" style="padding:6px 0;${F}font-size:15px;line-height:1.5;color:${K.ink};font-weight:600">${valHtml(v)}</td></tr>`).join('');
const TABLE = 'role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"';

const blockHtml = {
  p: (x) => `<p style="margin:0;${F}font-size:16px;line-height:1.65;color:${K.text}">${partsHtml(x.parts)}</p>`,
  kv: (x) => `<table ${TABLE} style="background:${K.cream};border-radius:16px"><tr><td style="padding:18px 22px">${label(x.title)}
    <table ${TABLE}>${kvRowsHtml(x.rows)}</table></td></tr></table>`,
  items: (x) => `<table ${TABLE} style="border:1px solid ${K.line};border-radius:16px;border-collapse:separate"><tr><td style="padding:18px 22px 8px">${label(x.title)}
    <table ${TABLE}>${x.rows.map(r => `<tr>
      <td valign="top" style="padding:12px 14px 12px 0;border-bottom:1px solid ${K.line}">
        <div style="${F}font-size:15px;line-height:1.45;font-weight:700;color:${K.ink}">${esc(r.name)}</div>
        ${r.sub ? `<div style="${F}font-size:13px;line-height:1.5;color:${K.muted};padding-top:2px">${esc(r.sub)}</div>` : ''}</td>
      <td valign="top" align="right" style="padding:12px 0;border-bottom:1px solid ${K.line};${F}font-size:15px;line-height:1.45;font-weight:700;color:${K.ink};white-space:nowrap">${esc(r.amount)}</td></tr>`).join('')}
    ${x.totals.map(([k, v, strong], i) => strong
      ? `<tr><td style="padding:12px 14px 14px 0;font-family:${HEAD};font-size:16px;font-weight:700;color:${K.navy}">${esc(k)}</td>
          <td align="right" style="padding:12px 0 14px;font-family:${HEAD};font-size:20px;font-weight:700;color:${K.navy};white-space:nowrap"><span style="border-bottom:3px solid ${K.yellow};padding-bottom:2px">${esc(v)}</span></td></tr>`
      : `<tr><td style="padding:${i ? 4 : 12}px 14px 4px 0;${F}font-size:14px;color:${K.text}">${esc(k)}</td>
          <td align="right" style="padding:${i ? 4 : 12}px 0 4px;${F}font-size:14px;color:${K.ink};white-space:nowrap">${esc(v)}</td></tr>`).join('')}
    </table></td></tr></table>`,
  box: (x) => `<table ${TABLE} style="background:${K.yellow100};border-radius:16px;border-left:4px solid ${K.yellow}"><tr><td style="padding:18px 22px">
    <p style="margin:0 0 8px;font-family:${HEAD};font-size:16px;line-height:1.4;font-weight:700;color:${K.navy}">${esc(x.title)}</p>
    ${x.rows.length ? `<table ${TABLE}>${kvRowsHtml(x.rows)}</table>` : ''}
    ${x.note ? `<p style="margin:${x.rows.length ? 10 : 0}px 0 0;${F}font-size:14px;line-height:1.6;color:${K.text}">${valHtml(x.note)}</p>` : ''}</td></tr></table>`,
  msg: (x) => `${label(x.title)}<table ${TABLE}><tr><td style="background:${K.white};border:1px dashed ${K.line};border-radius:14px;padding:16px 20px;${F}font-size:15px;line-height:1.6;color:${K.ink}">${esc(x.text).replace(/\n/g, '<br>')}</td></tr></table>`,
  btn: (x) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${x.dark ? K.navy : K.yellow}" style="border-radius:999px;background:${x.dark ? K.navy : K.yellow}">
    <a href="${esc(x.href)}" style="display:inline-block;padding:14px 30px;${F}font-size:15px;line-height:1.2;font-weight:700;color:${x.dark ? K.white : K.navy};text-decoration:none;border-radius:999px">${esc(x.label)}&nbsp;&nbsp;&rarr;</a></td></tr></table>`,
  steps: (x) => `${label(x.title)}<table ${TABLE}>${x.steps.map(([t, d], i) => `<tr>
    <td valign="top" width="46" style="padding:0 14px 14px 0;width:46px"><div style="width:32px;height:32px;border-radius:50%;background:${K.navy};color:${K.white};${F}font-size:14px;font-weight:700;line-height:32px;text-align:center">${i + 1}</div></td>
    <td valign="top" style="padding:4px 0 14px"><div style="${F}font-size:15px;line-height:1.45;font-weight:700;color:${K.ink}">${esc(t)}</div>
      <div style="${F}font-size:14px;line-height:1.6;color:${K.text};padding-top:2px">${valHtml(d)}</div></td></tr>`).join('')}</table>`
};

const kvText = (rows) => rows.map(([k, v]) => `${k}: ${valText(v)}`).join('\n');
const blockText = {
  p: (x) => partsText(x.parts),
  kv: (x) => (x.title ? x.title.toUpperCase() + '\n' : '') + kvText(x.rows),
  items: (x) => (x.title ? x.title.toUpperCase() + '\n' : '') + x.rows.map(r => `- ${r.name}${r.sub ? ' (' + r.sub + ')' : ''}${r.amount ? ': ' + r.amount : ''}`).join('\n') +
    (x.totals.length ? '\n\n' + x.totals.map(([k, v]) => `${k}: ${v}`).join('\n') : ''),
  box: (x) => x.title.toUpperCase() + (x.rows.length ? '\n' + kvText(x.rows) : '') + (x.note ? '\n' + valText(x.note) : ''),
  msg: (x) => (x.title ? x.title.toUpperCase() + '\n' : '') + x.text.split('\n').map(l => '> ' + l).join('\n'),
  btn: (x) => `${x.label}: ${x.href}`,
  steps: (x) => (x.title ? x.title.toUpperCase() + '\n' : '') + x.steps.map(([t, d], i) => `${i + 1}. ${t} — ${valText(d)}`).join('\n')
};

/* ---------- layout ---------- */
function footerHtml(reason) {
  const A = company.address, link = (t, h) => `<a href="${esc(h)}" style="color:${K.yellow};text-decoration:none;font-weight:700">${esc(t)}</a>`;
  return `<tr><td style="padding-top:16px">
    <table ${TABLE} style="background:${K.navy};border-radius:24px"><tr><td class="px" style="padding:28px 44px 18px">
      <p style="margin:0;font-family:${HEAD};font-size:18px;line-height:1.3;font-weight:700;color:${K.white}">${esc(company.brand)} <span style="color:${K.yellow}">&middot;</span> ${esc(company.legal)}</p>
      <p style="margin:4px 0 18px;${F}font-size:13px;line-height:1.5;color:${K.sky}">${esc(company.tagline)}</p>
      <table ${TABLE}><tr>
        <td class="stack" valign="top" width="50%" style="padding:0 16px 12px 0;${F}font-size:14px;line-height:1.75;color:#d7e2f4">
          <strong style="color:${K.white}">Контакти</strong><br>${link(company.phoneDisplay, company.phoneHref)}<br>${link(company.email, 'mailto:' + company.email)}<br>${link('sevarbg.com', SITE())}</td>
        <td class="stack" valign="top" width="50%" style="padding:0 0 12px;${F}font-size:14px;line-height:1.75;color:#d7e2f4">
          <strong style="color:${K.white}">Склад и офис</strong><br>${esc(A.street)}, ${esc(A.city)}<br>${company.hours.map(h => `${esc(h.d)}: ${esc(h.h)}`).join('<br>')}</td>
      </tr></table></td></tr></table></td></tr>
    <tr><td style="padding:16px 24px 0;${F}font-size:12px;line-height:1.6;color:${K.muted};text-align:center">${esc(company.legal)} &middot; ${esc(A.street)}, ${esc(A.city)}${reason ? `<br>${esc(reason)}` : ''}</td></tr>`;
}

function render({ subject, preheader, eyebrow, title, intro, blocks, office, reason, replyTo }) {
  const list = (blocks || []).filter(Boolean);
  const introBlocks = (Array.isArray(intro) ? intro : [intro]).filter(Boolean);
  const all = [...introBlocks, ...list];
  const body = all.map(x => `<tr><td style="padding:0 0 22px">${blockHtml[x.t](x)}</td></tr>`).join('');
  const topRight = office
    ? `<span style="${F}font-size:13px;font-weight:700;color:${K.muted}">Известие от сайта</span>`
    : `<a href="${esc(company.phoneHref)}" style="${F}font-size:14px;font-weight:700;color:${K.navy};text-decoration:none">${esc(company.phoneDisplay)}</a>`;

  const html = `<!DOCTYPE html>
<html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(subject)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@700&family=Nunito:wght@400;600;700&display=swap');
body{margin:0;padding:0;background:${K.cream};-webkit-text-size-adjust:100%}
a{color:${K.blue}}
@media (max-width:620px){.px{padding-left:22px!important;padding-right:22px!important}.h1{font-size:24px!important}.stack{display:block!important;width:100%!important;padding-right:0!important}}
</style></head>
<body style="margin:0;padding:0;background:${K.cream}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${esc(preheader || '')}${'&#8199;&#847; '.repeat(30)}</div>
<table ${TABLE} bgcolor="${K.cream}" style="background:${K.cream}"><tr><td align="center" style="padding:26px 12px 34px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
    <tr><td style="padding:0 8px 16px"><table ${TABLE}><tr>
      <td valign="middle"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${K.white}" style="background:${K.white};border-radius:999px;padding:6px 18px">
        <a href="${esc(SITE())}"><img src="cid:${LOGO_CID}" width="110" height="44" alt="SEVAR" style="display:block;border:0;width:110px;height:44px"></a></td></tr></table></td>
      <td valign="middle" align="right">${topRight}</td></tr></table></td></tr>
    <tr><td style="background:${K.white};border-radius:24px;overflow:hidden">
      <table ${TABLE}><tr><td height="6" style="height:6px;line-height:6px;font-size:0;background:${K.yellow};border-radius:24px 24px 0 0">&nbsp;</td></tr>
      <tr><td class="px" style="padding:34px 44px 14px">
        <span style="display:inline-block;background:${K.cream};border-radius:999px;padding:6px 14px;${F}font-size:12px;line-height:1.4;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${K.navy}"><span style="color:${K.yellow}">&#9679;</span>&nbsp; ${esc(eyebrow)}</span>
        <h1 class="h1" style="margin:16px 0 18px;font-family:${HEAD};font-size:28px;line-height:1.25;font-weight:700;color:${K.navy}">${esc(title)}</h1>
        <table ${TABLE}>${body}</table>
      </td></tr></table></td></tr>
    ${office
      ? `<tr><td style="padding:16px 24px 0;${F}font-size:12px;line-height:1.6;color:${K.muted};text-align:center">Автоматично известие от sevarbg.com${replyTo ? ' &middot; „Отговор“ на това писмо отива директно до клиента' : ''}</td></tr>`
      : footerHtml(reason)}
  </table></td></tr></table></body></html>`;

  const A = company.address;
  const text = [title, '='.repeat(Math.min(60, title.length)), '', ...all.map(x => blockText[x.t](x) + '\n'),
    '--',
    office ? 'Автоматично известие от sevarbg.com'
      : `${company.brand} · ${company.legal}\nТел.: ${company.phoneDisplay} · ${company.email} · ${SITE()}\n${A.street}, ${A.city}\n` +
        company.hours.map(h => `${h.d}: ${h.h}`).join('\n') + (reason ? `\n\n${reason}` : '')
  ].join('\n');

  return { subject, html, text, replyTo };
}

/* ---------- shared pieces for orders ---------- */
const placeOf = (d) => !d ? '' : d.kind === 'pickup' ? `${company.address.street}, ${company.address.city}` : [d.city, d.kind === 'office' ? d.office : d.address].filter(Boolean).join(', ');
const etaOf = (d) => ((d && shop.shopDelivery(d.id)) || {}).eta || '';
const orderRows = (items) => items.map(i => ({
  name: `${i.product} — ${i.size}`,
  sub: `${bags(i.qty)} × ${i.bag} оп.${i.code ? ' · ' + i.code : ''}`,
  amount: i.total != null ? money(i.total) : bags(i.qty)
}));
const orderTotals = (o) => {
  const t = o.totals || {}, p = o.payment || {};
  return [['Стоки', money(t.subtotal)], ['Доставка', t.shipping ? money(t.shipping) : 'безплатна'],
    t.fee ? [`Такса ${String(p.label || 'плащане').toLowerCase()}`, money(t.fee)] : null, ['Общо с ДДС', money(t.total), true]];
};
const deliveryKV = (o, title = 'Доставка и плащане') => {
  const d = o.delivery || {}, inv = o.invoice || {};
  return KV(title, [['Доставка', d.label], [d.kind === 'pickup' ? 'Място' : 'Адрес', placeOf(d)], ['Плащане', (o.payment || {}).label],
    inv.want ? ['Фактура', `${inv.company}, ЕИК ${inv.eik}${inv.vat ? ', ДДС ' + inv.vat : ''}`] : null]);
};
const bankBox = (o, note) => BOX('Данни за банков превод', [['Получател', SHOP.bank.holder], ['Банка', SHOP.bank.bankName], ['IBAN', SHOP.bank.iban],
  ['BIC', SHOP.bank.bic], ['Основание', `Поръчка ${o.number}`], ['Сума', money((o.totals || {}).total)]], note);
const shopBtn = () => BTN('Към магазина', SITE() + '/products');
const adminBtn = (hash) => BTN('Отвори в администрацията', `${SITE()}/admin/#/${hash}`, true);
const contactLine = () => ['Въпроси? Обадете се на ', a(company.phoneDisplay, company.phoneHref), ' или просто отговорете на този имейл.'];

/* ============================================================  TO CUSTOMERS  */
function orderReceived(o) {
  const d = o.delivery || {}, p = o.payment || {}, eta = etaOf(d);
  return render({
    subject: `Получихме поръчка ${o.number} — SEVAR`,
    preheader: `Общо ${money(o.totals.total)} с ДДС. Ще се свържем с вас за потвърждение.`,
    eyebrow: `Поръчка ${o.number}`, title: 'Благодарим за поръчката!',
    intro: P(hello(o.customer.name), ' Получихме поръчката ви и ще се свържем с вас за потвърждение.'),
    blocks: [
      ITEMS('Вашата поръчка', orderRows(o.items), orderTotals(o)),
      deliveryKV(o),
      p.id === 'bank' ? bankBox(o, 'Изпращаме стоката, след като сумата постъпи по сметката.') : null,
      STEPS('Какво следва', [
        ['Потвърждение', `Обаждаме се на ${o.customer.phone || 'посочения телефон'} в работно време, за да потвърдим поръчката.`],
        d.kind === 'pickup'
          ? ['Подготовка', 'Подготвяме стоката и ви съобщаваме, когато е готова за вземане от склада в Петрич.']
          : ['Изпращане', `Предаваме пратката на ${d.courier || 'куриер'}${eta ? ' — доставка за ' + eta : ''}. Ще получите имейл с номер за проследяване.`],
        p.id === 'cod' ? ['Плащане', 'Плащате на куриера при получаване (наложен платеж).']
          : p.id === 'bank' ? ['Плащане', 'Превеждате сумата по сметката по-горе с основание номера на поръчката.']
          : ['Плащане', 'Плащате на място при вземане от склада.']
      ]),
      P(contactLine())
    ],
    reason: 'Получавате това писмо, защото направихте поръчка на sevarbg.com.'
  });
}

function orderConfirmed(o) {
  const d = o.delivery || {}, p = o.payment || {}, eta = etaOf(d);
  return render({
    subject: `Поръчка ${o.number} е потвърдена — SEVAR`,
    preheader: d.kind === 'pickup' ? 'Подготвяме поръчката ви за вземане.' : 'Подготвяме поръчката ви за изпращане.',
    eyebrow: `Поръчка ${o.number}`, title: 'Поръчката ви е потвърдена',
    intro: P(hello(o.customer.name), ' ', d.kind === 'pickup'
      ? 'Потвърдихме поръчката и я подготвяме. Ще ви съобщим, когато е готова за вземане от склада.'
      : `Потвърдихме поръчката и я подготвяме за изпращане с ${d.courier || 'куриер'}${eta ? ' (доставка за ' + eta + ')' : ''}. Когато пратката тръгне, ще получите номер за проследяване.`),
    blocks: [
      ITEMS('Поръчка', orderRows(o.items), orderTotals(o)),
      deliveryKV(o),
      p.id === 'bank' ? bankBox(o, 'Ако вече сте превели сумата — благодарим! Изпращаме веднага щом плащането постъпи.') : null,
      P(contactLine())
    ],
    reason: 'Получавате това писмо, защото направихте поръчка на sevarbg.com.'
  });
}

function orderShipped(o) {
  const d = o.delivery || {}, p = o.payment || {}, total = money((o.totals || {}).total);
  if (d.kind === 'pickup') {
    return render({
      subject: `Поръчка ${o.number} е готова за вземане — SEVAR`,
      preheader: `Можете да я вземете от склада в Петрич. ${company.hours[0].d}: ${company.hours[0].h}.`,
      eyebrow: `Поръчка ${o.number}`, title: 'Поръчката е готова за вземане',
      intro: P(hello(o.customer.name), ' Поръчката ви ви очаква в склада ни в Петрич.'),
      blocks: [
        BOX('Къде да я вземете', [['Адрес', `${company.address.street}, ${company.address.city}`],
          ['Работно време', company.hours.map(h => `${h.d}: ${h.h}`).join('\n')],
          ['Плащане', p.id === 'cash' ? `${total} в брой на място` : p.label]], 'Носете номера на поръчката или кажете името си на място.'),
        BTN('Виж на картата', mapsUrl()),
        ITEMS('Поръчка', orderRows(o.items), orderTotals(o)),
        P(contactLine())
      ],
      reason: 'Получавате това писмо, защото направихте поръчка на sevarbg.com.'
    });
  }
  const url = trackUrl(d.courier, o.tracking);
  return render({
    subject: `Поръчка ${o.number} е изпратена — SEVAR`,
    preheader: o.tracking ? `Товарителница ${o.tracking} (${d.courier}).` : `Пратката е предадена на ${d.courier || 'куриер'}.`,
    eyebrow: `Поръчка ${o.number}`, title: 'Поръчката ви е на път',
    intro: P(hello(o.customer.name), ` Предадохме пратката на ${d.courier || 'куриер'}.`),
    blocks: [
      BOX('Проследяване', [['Куриер', d.courier], ['Товарителница', o.tracking], ['Доставка до', placeOf(d)], ['Срок', etaOf(d)]],
        p.id === 'cod' ? ['При получаване платете на куриера ', b(total), ' (наложен платеж).'] : null),
      BTN('Проследи пратката', url),
      ITEMS('Поръчка', orderRows(o.items), orderTotals(o)),
      P(contactLine())
    ],
    reason: 'Получавате това писмо, защото направихте поръчка на sevarbg.com.'
  });
}

function orderCancelled(o) {
  return render({
    subject: `Поръчка ${o.number} е отказана — SEVAR`,
    preheader: 'Ако това е грешка, свържете се с нас — ще помогнем.',
    eyebrow: `Поръчка ${o.number}`, title: 'Поръчката е отказана',
    intro: P(hello(o.customer.name), ` Поръчка ${o.number} беше отказана. Ако това е грешка или искате да промените поръчката, свържете се с нас — ще помогнем.`),
    blocks: [
      ITEMS('Отказана поръчка', orderRows(o.items), orderTotals(o)),
      (o.payment || {}).id === 'bank' ? P('Ако вече сте превели сума за тази поръчка, ще ви я върнем — отговорете на този имейл с данни за сметката.') : null,
      shopBtn(),
      P(contactLine())
    ],
    reason: 'Получавате това писмо, защото направихте поръчка на sevarbg.com.'
  });
}

/* only names that exist in the catalogue are repeated back to the visitor */
const knownProducts = (s) => String(s || '').split(';').map(x => x.trim()).filter(n => products.some(p => p.name === n));

function inquiryReceived(inq) {
  const prods = knownProducts(inq.product);
  return render({
    subject: 'Получихме запитването ви — SEVAR',
    preheader: 'Ще ви отговорим възможно най-скоро в работно време.',
    eyebrow: 'Запитване', title: 'Получихме запитването ви',
    intro: P(hello(inq.name), ' Благодарим, че се свързахте с Тим Трейд. Наш служител ще ви отговори възможно най-скоро в работно време.'),
    blocks: [
      prods.length ? ITEMS('Продукти в запитването', prods.map(n => ({ name: n, sub: '', amount: '' }))) : null,
      BOX('Ако е спешно', [['Телефон', [a(company.phoneDisplay, company.phoneHref)]], ['Работно време', company.hours.map(h => `${h.d}: ${h.h}`).join('\n')]]),
      P('Междувременно можете да разгледате целия ни каталог с размери и опаковки:'),
      BTN('Разгледай каталога', SITE() + '/catalogue')
    ],
    reason: 'Получавате това писмо, защото изпратихте запитване през sevarbg.com.'
  });
}

function b2bReceived(r) {
  const total = (r.items || []).reduce((s, i) => s + i.qty, 0);
  return render({
    subject: `Получихме B2B заявка ${r.number} — SEVAR`,
    preheader: 'Мениджър ще се свърже с вас с цени на едро и условия за доставка.',
    eyebrow: `B2B заявка ${r.number}`, title: 'Получихме B2B заявката ви',
    intro: P(hello(r.name), ' Благодарим за интереса към SEVAR. Мениджър ще прегледа заявката и ще се свърже с вас с цени на едро и условия за доставка.'),
    blocks: [
      r.items && r.items.length ? ITEMS('Заявени продукти', r.items.map(i => ({ name: `${i.product} — ${i.size}`, sub: `${i.bag} оп. в чувал${i.code ? ' · ' + i.code : ''}`, amount: bags(i.qty) })),
        [['Общо', bags(total), true]]) : null,
      KV('Фирма', [['Фирма', r.company], ['ЕИК', r.eik], ['Град', r.city], ['Периодичност', r.frequency]]),
      STEPS('Какво следва', [
        ['Преглед', 'Проверяваме наличности и срокове за заявените количества.'],
        ['Оферта', 'Изпращаме ви оферта с цени на едро — по имейл или по телефона.'],
        ['Доставка', 'След потвърждение доставяме с куриер или собствен транспорт, еднократно или по график.']
      ]),
      P(contactLine())
    ],
    reason: 'Получавате това писмо, защото изпратихте B2B заявка през sevarbg.com.'
  });
}

function quoteTotalsOf(q) {
  const sub = (q.items || []).reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
  const discount = sub * (Number(q.discount_pct) || 0) / 100, net = sub - discount, vat = net * (Number(q.vat_rate) || 0) / 100;
  return { sub, discount, net, vat, total: net + vat };
}
const quoteDefaultMessage = (q) => {
  const n = safeName((q.customer || {}).name);
  return `Здравейте${n ? ', ' + n : ''},\n\nблагодарим за интереса към продуктите SEVAR. Изпращаме ви оферта ${q.number} — подробностите са по-долу и в приложения PDF.\n\nАко имате въпроси или искате промяна в количествата, просто отговорете на този имейл.`;
};
function quote(q, message) {
  const cur = q.currency || 'EUR', t = quoteTotalsOf(q), c = q.customer || {};
  const paras = String(message || quoteDefaultMessage(q)).trim().split(/\n\s*\n/).map(s => P(s.trim()));
  return render({
    subject: `Оферта ${q.number} — ${company.legal} / SEVAR`,
    preheader: `Общо ${money(t.total, cur)}${q.valid_until ? ', валидна до ' + bgDate(q.valid_until) : ''}. PDF е приложен.`,
    eyebrow: `Оферта ${q.number}`, title: c.company ? `Оферта за ${c.company}` : 'Вашата оферта от SEVAR',
    intro: paras,
    blocks: [
      ITEMS('Оферта', (q.items || []).map(i => ({
        name: i.name, sub: `${qtyFmt(i.qty)} ${i.unit || 'бр.'} × ${money(i.price, cur)}${i.desc ? ' · ' + i.desc : ''}`, amount: money((Number(i.qty) || 0) * (Number(i.price) || 0), cur)
      })), [
        ['Междинна сума', money(t.sub, cur)],
        t.discount ? [`Отстъпка ${Number(q.discount_pct)}%`, '−' + money(t.discount, cur)] : null,
        [`ДДС ${Number(q.vat_rate)}%`, money(t.vat, cur)],
        ['Общо', money(t.total, cur), true]
      ]),
      BOX('Условия', [['Валидна до', bgDate(q.valid_until)], ['Документ', `PDF „${q.number}“ е приложен към писмото`]]),
      MSG('Забележки', q.notes),
      BTN('Приемам офертата', `mailto:${company.email}?subject=${encodeURIComponent('Приемам оферта ' + q.number)}`)
    ],
    reason: `Получавате това писмо като запитване към ${company.legal}.`
  });
}

/* ============================================================  TO THE OFFICE  */
const contactRows = (x) => [['Име', x.name], ['Фирма', x.company], ['Телефон', x.phone ? [a(x.phone, telHref(x.phone))] : ''], ['Имейл', x.email ? [a(x.email, 'mailto:' + x.email)] : '']];

function officeInquiry(inq) {
  const chat = inq.source === 'chat';
  return render({
    subject: chat ? `Ново запитване от AI чата — ${inq.name}` : `Ново запитване от ${inq.name}`,
    preheader: `${inq.phone || ''} ${inq.email || ''} · ${inq.product || 'без продукт'}`.trim(),
    eyebrow: chat ? 'AI чат' : 'Ново запитване', title: inq.company ? `${inq.name} · ${inq.company}` : inq.name,
    office: true, replyTo: inq.email || undefined,
    blocks: [
      KV('Контакт', [...contactRows(inq), ['Продукт', inq.product], ['Страница', chat ? 'AI чат' : inq.page]]),
      MSG(chat ? 'Запитване и разговор' : 'Съобщение', inq.message),
      adminBtn('inquiries')
    ]
  });
}

function officeOrder(o) {
  const c = o.customer || {};
  return render({
    subject: `Нова поръчка ${o.number} — ${money(o.totals.total)}`,
    preheader: `${c.name} · ${(o.delivery || {}).label} · ${(o.payment || {}).label}`,
    eyebrow: `Нова поръчка ${o.number}`, title: `${money(o.totals.total)} · ${c.name}`,
    office: true, replyTo: c.email || undefined,
    blocks: [
      KV('Клиент', contactRows(c)),
      ITEMS('Артикули', orderRows(o.items), orderTotals(o)),
      deliveryKV(o),
      MSG('Бележка от клиента', o.note),
      adminBtn('orders')
    ]
  });
}

function officeB2B(r) {
  const total = (r.items || []).reduce((s, i) => s + i.qty, 0);
  return render({
    subject: `Нова B2B заявка ${r.number} — ${r.company}`,
    preheader: `${r.name} · ${r.phone}${total ? ' · ' + bags(total) : ''}`,
    eyebrow: `Нова B2B заявка ${r.number}`, title: r.company,
    office: true, replyTo: r.email || undefined,
    blocks: [
      KV('Фирма и контакт', [['Фирма', r.company], ['ЕИК', r.eik], ...contactRows({ ...r, company: '' }), ['Град', r.city], ['Периодичност', r.frequency]]),
      r.items && r.items.length ? ITEMS('Заявени продукти', r.items.map(i => ({ name: `${i.product} — ${i.size}`, sub: `${i.bag} оп. в чувал${i.code ? ' · ' + i.code : ''}`, amount: bags(i.qty) })),
        [['Общо', bags(total), true]]) : null,
      MSG('Съобщение', r.message),
      adminBtn('b2b')
    ]
  });
}

function labelRequest(r) {
  const total = (r.items || []).reduce((s, i) => s + i.qty, 0);
  return render({
    subject: `Заявка за етикети ${r.number}`,
    preheader: `${r.items.length} вида, общо ${num(total)} бр. PDF е приложен.`,
    eyebrow: `Заявка ${r.number}`, title: 'Заявка за етикети',
    intro: P('Здравейте! Изпращаме заявка за ', b(`${r.items.length} вида етикети`), ' — общо ', b(`${num(total)} бр.`), ' PDF със същото съдържание е приложен.'),
    blocks: [
      ITEMS('Етикети', r.items.map((i, n) => ({ name: `${n + 1}. ${i.name}`, sub: [i.code, i.size].filter(Boolean).join(' · '), amount: `${num(i.qty)} бр.` })),
        [['Общо', `${num(total)} бр.`, true]]),
      MSG('Забележки', r.notes),
      P('Моля, потвърдете получаването и срока за изпълнение с отговор на този имейл.')
    ]
  });
}

/* ============================================================  SAMPLES (admin preview / test e-mail)  */
function samples() {
  const skus = [...skuIndex.entries()].slice(0, 3);
  const items = skus.map(([sku, s], n) => ({ sku, product: s.product, size: s.size, code: s.code, pack: s.pack, bag: s.bag, qty: [3, 2, 1][n], price: s.price, total: r2([3, 2, 1][n] * s.bagPrice) }));
  const sub = r2(items.reduce((s, i) => s + i.total, 0));
  const order = (deliveryId, paymentId, extra = {}) => {
    const d = shop.shopDelivery(deliveryId), p = shop.shopPayment(paymentId);
    const totals = shop.shopTotals(sub, d.id, p.id);
    return {
      number: 'ПО-2026-0042', customer: { name: 'Мария Иванова', phone: '+359 888 123 456', email: 'maria@example.com' }, items,
      delivery: { id: d.id, label: d.label, courier: d.courier, kind: d.kind, city: 'София', office: 'офис Люлин 5, ул. Обиколна 12', address: '', price: totals.shipping },
      payment: { id: p.id, label: p.label, fee: totals.fee }, invoice: {}, totals, note: 'Моля, обадете се преди доставка.', tracking: '1051234567', ...extra
    };
  };
  const names = products.slice(0, 2).map(p => p.name);
  const inquiry = { source: 'form', name: 'Георги Петров', company: 'Дом за възрастни „Слънце“', phone: '+359 887 555 010', email: 'georgi@example.com',
    product: names.join('; '), message: 'Здравейте! Търсим месечна доставка на пелени размер L и M за 40 души. Какви са цените на едро?', page: 'contact' };
  const b2b = { number: 'B2B-2026-0007', company: 'Аптеки Здраве ЕООД', eik: '204512345', name: 'Иван Димитров', phone: '+359 878 222 333', email: 'ivan@example.com',
    city: 'Благоевград', frequency: 'Всеки месец', message: 'Интересуваме се от редовни доставки за 3 аптеки.',
    items: items.map((i, n) => ({ product: i.product, size: i.size, code: i.code, pack: i.pack, bag: i.bag, qty: [20, 10, 6][n] })) };
  const valid = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const q = { number: 'ОФ-2026-0012', currency: 'EUR', vat_rate: 20, discount_pct: 5, valid_until: valid, notes: 'Цените включват доставка до вашия склад.',
    customer: { company: 'Дом за възрастни „Слънце“', name: 'Георги Петров', email: 'georgi@example.com' },
    items: items.map((i, n) => ({ name: i.product, desc: `${i.size}, ${i.pack}`, unit: 'чувала', qty: [20, 10, 6][n], price: r2(i.price * i.bag * 0.85 / 1.2) })) };
  const lr = { number: 'ЕТ-2026-0003', notes: 'Срок: до края на месеца.', items: [
    { code: '3800123450011', name: 'Пелени SEVAR L', size: '10 бр.', qty: 5000 }, { code: '3800123450028', name: 'Пелени SEVAR M', size: '10 бр.', qty: 3000 },
    { code: '3800123450035', name: 'Гащи SEVAR XL', size: '10 бр.', qty: 2000 }] };
  return { order, inquiry, b2b, q, lr };
}

const CATALOG = [
  ['order_received', 'customer', 'Поръчка — получена', 'Автоматично веднага след поръчка в магазина (с банкови данни при превод).', (s) => orderReceived(s.order('econt_office', 'bank'))],
  ['order_confirmed', 'customer', 'Поръчка — потвърдена', 'Когато смените статуса на „Потвърдена“ в Поръчки.', (s) => orderConfirmed(s.order('econt_office', 'cod'))],
  ['order_shipped', 'customer', 'Поръчка — изпратена', 'Статус „Изпратена“ — с товарителница и бутон за проследяване.', (s) => orderShipped(s.order('econt_office', 'cod'))],
  ['order_ready', 'customer', 'Поръчка — готова за вземане', 'Статус „Изпратена“, когато клиентът взима от склада.', (s) => orderShipped(s.order('pickup', 'cash'))],
  ['order_cancelled', 'customer', 'Поръчка — отказана', 'Когато смените статуса на „Отказана“.', (s) => orderCancelled(s.order('speedy_address', 'cod'))],
  ['inquiry_received', 'customer', 'Запитване — потвърждение', 'Автоматично след формуляр или AI чат, ако клиентът е дал имейл.', (s) => inquiryReceived(s.inquiry)],
  ['b2b_received', 'customer', 'B2B заявка — потвърждение', 'Автоматично след B2B заявка, ако клиентът е дал имейл.', (s) => b2bReceived(s.b2b)],
  ['quote', 'customer', 'Оферта (с PDF)', 'Бутон „Изпрати по имейл“ в Оферти.', (s) => quote(s.q)],
  ['office_inquiry', 'office', 'Ново запитване', 'До офиса при всяко запитване от сайта.', (s) => officeInquiry(s.inquiry)],
  ['office_chat', 'office', 'Запитване от AI чата', 'До офиса, когато AI чатът запише клиент.', (s) => officeInquiry({ ...s.inquiry, source: 'chat', message: s.inquiry.message + '\n\n— Разговор в чата —\nКлиент: Имате ли размер L?\nАсистент: Да, …' })],
  ['office_order', 'office', 'Нова поръчка', 'До офиса при всяка поръчка от магазина.', (s) => officeOrder(s.order('econt_office', 'cod'))],
  ['office_b2b', 'office', 'Нова B2B заявка', 'До офиса при всяка B2B заявка.', (s) => officeB2B(s.b2b)],
  ['label_request', 'office', 'Заявка за етикети (с PDF)', 'Бутон „Изпрати по имейл“ в Етикети.', (s) => labelRequest(s.lr)]
].map(([id, group, title, when, build]) => ({ id, group, title, when, build: () => build(samples()) }));

module.exports = {
  LOGO_CID, orderReceived, orderConfirmed, orderShipped, orderCancelled, inquiryReceived, b2bReceived, quote, quoteDefaultMessage,
  officeInquiry, officeOrder, officeB2B, labelRequest, CATALOG
};
