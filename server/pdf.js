/* SEVAR — PDF generation (quotes and label requests) */
const path = require('path');
const PDFDocument = require('pdfkit');
const { company, ROOT } = require('./catalog');

const FONT_DIR = path.dirname(require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf'));
const LOGO = path.join(ROOT, 'assets', 'img', 'brand', 'sevar-logo.png');
const GREEN = '#0b2a5b', YELLOW = '#f5c233', GRAY = '#6b7384', LINE = '#e2dccf';

const CURRENCY = { EUR: '€', BGN: 'лв.' };
const money = (n, cur) => `${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2)} ${CURRENCY[cur] || cur}`;
const bgDate = (s) => { const d = s ? new Date(s.replace(' ', 'T') + (s.length <= 10 ? '' : 'Z')) : null; return d && !isNaN(d) ? d.toLocaleDateString('bg-BG') : ''; };

function quoteTotals(q) {
  const sub = (q.items || []).reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
  const discount = sub * (Number(q.discount_pct) || 0) / 100;
  const net = sub - discount;
  const vat = net * (Number(q.vat_rate) || 0) / 100;
  return { sub, discount, net, vat, total: net + vat };
}

function newDoc(res, filename) {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 48, left: 48, right: 48, bottom: 0 }, info: { Title: filename, Author: company.legal } });
  doc.registerFont('r', path.join(FONT_DIR, 'DejaVuSans.ttf'));
  doc.registerFont('b', path.join(FONT_DIR, 'DejaVuSans-Bold.ttf'));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="sevar-document.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}.pdf`);
  doc.pipe(res);
  return doc;
}

function header(doc, title, number, rightLines) {
  const left = doc.page.margins.left, width = doc.page.width - left - doc.page.margins.right;
  try { doc.image(LOGO, left, 44, { height: 40 }); } catch (_) { doc.font('b').fontSize(20).fillColor(GREEN).text('SEVAR', left, 50); }
  doc.font('r').fontSize(8.5).fillColor(GRAY);
  const co = [company.legal, `${company.address.street}, ${company.address.city}`, `Тел.: ${company.phoneDisplay} · ${company.email}`];
  if (process.env.COMPANY_EIK) co.push(`ЕИК: ${process.env.COMPANY_EIK}${process.env.COMPANY_VAT ? ' · ДДС №: ' + process.env.COMPANY_VAT : ''}`);
  doc.text(co.join('\n'), left, 46, { width, align: 'right', lineGap: 2 });
  doc.moveTo(left, 104).lineTo(left + width, 104).lineWidth(2).strokeColor(YELLOW).stroke();
  doc.font('b').fontSize(18).fillColor(GREEN).text(title, left, 120);
  doc.font('r').fontSize(9.5).fillColor(GRAY).text(`№ ${number}`, left, 144);
  (rightLines || []).forEach((l, i) => doc.text(l, left, 120 + i * 14, { width, align: 'right' }));
  doc.y = 172;
}

function tableHeader(doc, cols, y) {
  const left = doc.page.margins.left, width = doc.page.width - left - doc.page.margins.right;
  doc.rect(left, y, width, 22).fill(GREEN);
  doc.font('b').fontSize(8.5).fillColor('#fff');
  cols.forEach(c => doc.text(c.title, c.x, y + 7, { width: c.w, align: c.align || 'left' }));
  return y + 22;
}

function footer(doc) {
  const left = doc.page.margins.left, width = doc.page.width - left - doc.page.margins.right;
  const y = doc.page.height - 52;
  doc.moveTo(left, y).lineTo(left + width, y).lineWidth(.5).strokeColor(LINE).stroke();
  doc.font('r').fontSize(8).fillColor(GRAY).text(`${company.legal} · ${company.phoneDisplay} · ${company.email} · sevarbg.com`, left, y + 8, { width, align: 'center', lineBreak: false });
}

function quotePdf(q, res) {
  const doc = newDoc(res, `Оферта ${q.number}`);
  const cur = q.currency, c = q.customer || {};
  header(doc, 'Ценова оферта', q.number, [`Дата: ${bgDate(q.created_at)}`, q.valid_until ? `Валидна до: ${bgDate(q.valid_until)}` : '']);
  const left = doc.page.margins.left, width = doc.page.width - left - doc.page.margins.right;

  doc.font('b').fontSize(9).fillColor(GRAY).text('ЗА', left, doc.y);
  doc.font('b').fontSize(11).fillColor(GREEN).text(c.company || c.name || '—', left, doc.y + 2);
  doc.font('r').fontSize(9).fillColor('#333');
  [c.company && c.name, c.eik && `ЕИК: ${c.eik}`, c.address, [c.phone, c.email].filter(Boolean).join(' · ')].filter(Boolean).forEach(l => doc.text(l, left, doc.y + 1));
  doc.moveDown(1.2);

  const cols = [
    { title: '№', x: left + 6, w: 20 },
    { title: 'Продукт / описание', x: left + 30, w: width - 30 - 62 - 40 - 76 - 76 },
    { title: 'Кол.', x: left + width - 76 - 76 - 40 - 62, w: 62, align: 'right' },
    { title: 'Мярка', x: left + width - 76 - 76 - 40, w: 40, align: 'center' },
    { title: 'Ед. цена', x: left + width - 76 - 76, w: 70, align: 'right' },
    { title: 'Сума', x: left + width - 76, w: 70, align: 'right' }
  ];
  let y = tableHeader(doc, cols, doc.y);
  (q.items || []).forEach((it, i) => {
    const desc = it.name + (it.desc ? `\n${it.desc}` : '');
    doc.font('r').fontSize(9);
    const h = Math.max(24, doc.heightOfString(desc, { width: cols[1].w }) + 12);
    if (y + h > doc.page.height - 120) { footer(doc); doc.addPage(); y = tableHeader(doc, cols, 60); }
    if (i % 2) doc.rect(left, y, width, h).fill('#faf8f3');
    doc.fillColor('#222').font('r').fontSize(9);
    doc.text(String(i + 1), cols[0].x, y + 7, { width: cols[0].w });
    doc.font('b').text(it.name, cols[1].x, y + 7, { width: cols[1].w, continued: false });
    if (it.desc) doc.font('r').fontSize(8).fillColor(GRAY).text(it.desc, cols[1].x, doc.y, { width: cols[1].w });
    doc.fillColor('#222').font('r').fontSize(9);
    doc.text(String(it.qty), cols[2].x, y + 7, { width: cols[2].w, align: 'right' });
    doc.text(it.unit || 'бр.', cols[3].x, y + 7, { width: cols[3].w, align: 'center' });
    doc.text(money(it.price, cur), cols[4].x, y + 7, { width: cols[4].w, align: 'right' });
    doc.text(money((Number(it.qty) || 0) * (Number(it.price) || 0), cur), cols[5].x, y + 7, { width: cols[5].w, align: 'right' });
    doc.moveTo(left, y + h).lineTo(left + width, y + h).lineWidth(.4).strokeColor(LINE).stroke();
    y += h;
  });

  const t = quoteTotals(q);
  const rows = [['Междинна сума', money(t.sub, cur)]];
  if (t.discount) rows.push([`Отстъпка ${q.discount_pct}%`, '−' + money(t.discount, cur)]);
  rows.push([`ДДС ${q.vat_rate}%`, money(t.vat, cur)]);
  y += 14;
  if (y > doc.page.height - 170) { footer(doc); doc.addPage(); y = 60; }
  rows.forEach(([k, v]) => {
    doc.font('r').fontSize(9.5).fillColor(GRAY).text(k, left + width - 240, y, { width: 150 });
    doc.fillColor('#222').text(v, left + width - 90, y, { width: 90, align: 'right' });
    y += 17;
  });
  doc.rect(left + width - 250, y + 2, 250, 28).fill(YELLOW);
  doc.font('b').fontSize(11).fillColor(GREEN).text('Общо', left + width - 240, y + 10, { width: 100 });
  doc.text(money(t.total, cur), left + width - 150, y + 10, { width: 144, align: 'right' });
  y += 46;

  doc.font('r').fontSize(9).fillColor('#333');
  if (q.notes) { doc.font('b').text('Забележки', left, y); doc.font('r').text(q.notes, left, doc.y + 2, { width }); y = doc.y + 10; }
  doc.font('r').fontSize(8.5).fillColor(GRAY).text(`Цените са в ${cur === 'EUR' ? 'евро' : 'лева'}${q.vat_rate ? ', без включено ДДС в единичните цени' : ''}. Доставка по договаряне.`, left, y, { width });
  footer(doc);
  doc.end();
}

function labelRequestPdf(r, res) {
  const doc = newDoc(res, `Заявка за етикети ${r.number}`);
  header(doc, 'Заявка за етикети', r.number, [`Дата: ${bgDate(r.created_at)}`]);
  const left = doc.page.margins.left, width = doc.page.width - left - doc.page.margins.right;
  const cols = [
    { title: '№', x: left + 6, w: 20 },
    { title: 'Баркод (GTIN)', x: left + 30, w: 96 },
    { title: 'Етикет', x: left + 130, w: width - 130 - 82 - 74 - 10 },
    { title: 'Размер', x: left + width - 150, w: 78 },
    { title: 'Тираж (бр.)', x: left + width - 70, w: 64, align: 'right' }
  ];
  let y = tableHeader(doc, cols, doc.y);
  let total = 0;
  (r.items || []).forEach((it, i) => {
    doc.font('b').fontSize(9);
    const h = Math.max(26, doc.heightOfString(it.name, { width: cols[2].w }) + 16);
    if (y + h > doc.page.height - 120) { footer(doc); doc.addPage(); y = tableHeader(doc, cols, 60); }
    if (i % 2) doc.rect(left, y, width, h).fill('#faf8f3');
    doc.fillColor('#222').font('r').fontSize(9.5);
    doc.text(String(i + 1), cols[0].x, y + 8, { width: cols[0].w });
    doc.text(it.code || '—', cols[1].x, y + 8, { width: cols[1].w });
    doc.font('b').fontSize(9).text(it.name, cols[2].x, y + 8, { width: cols[2].w });
    doc.font('r').fontSize(9.5).text(it.size || '—', cols[3].x, y + 8, { width: cols[3].w });
    doc.text(Number(it.qty).toLocaleString('bg-BG'), cols[4].x, y + 8, { width: cols[4].w, align: 'right' });
    doc.moveTo(left, y + h).lineTo(left + width, y + h).lineWidth(.4).strokeColor(LINE).stroke();
    total += Number(it.qty) || 0; y += h;
  });
  y += 12;
  doc.font('b').fontSize(10.5).fillColor(GREEN).text(`Общо: ${total.toLocaleString('bg-BG')} бр. етикети в ${(r.items || []).length} вида`, left, y, { width, align: 'right' });
  if (r.notes) { doc.font('b').fontSize(9.5).fillColor('#333').text('Забележки', left, y + 30); doc.font('r').text(r.notes, left, doc.y + 2, { width }); }
  footer(doc);
  doc.end();
}

module.exports = { quotePdf, labelRequestPdf, quoteTotals };
