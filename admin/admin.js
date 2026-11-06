/* SEVAR admin — inquiries, quotes (PDF), label requests (PDF) */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CUR = { EUR: '€', BGN: 'лв.' };
  const money = (n, c) => `${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2)} ${CUR[c] || c}`;
  const fmtDate = (s) => { const d = new Date(String(s).replace(' ', 'T') + (String(s).length > 10 ? 'Z' : '')); return isNaN(d) ? '' : d.toLocaleString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  const INQ = { new: 'Нова', in_progress: 'В работа', quoted: 'С оферта', closed: 'Приключена' };
  const QST = { draft: 'Чернова', sent: 'Изпратена', accepted: 'Приета', rejected: 'Отхвърлена' };
  const ORD = { new: 'Нова', confirmed: 'Потвърдена', shipped: 'Изпратена', done: 'Доставена', cancelled: 'Отказана' };
  const B2B = { new: 'Нова', taken: 'Поета', quoted: 'Изпратена оферта', won: 'Договорена', closed: 'Приключена' };
  const LST = { draft: 'Чернова', sent: 'Изпратена', done: 'Изпълнена' };
  const opts = (map, cur) => Object.entries(map).map(([k, v]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${v}</option>`).join('');

  let catalog = { products: [] };

  async function api(path, method = 'GET', body) {
    const r = await fetch('/api/admin' + path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
    if (r.status === 401) { showLogin(); throw new Error('unauthorized'); }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Грешка ' + r.status);
    return data;
  }
  function toast(msg, bad) { const t = $('#toast'); t.textContent = msg; t.classList.toggle('bad', !!bad); t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); }
  const fail = (e) => { if (e.message !== 'unauthorized') toast(e.message, true); };

  /* ---------- modal ---------- */
  function modal(html, narrow) {
    const root = $('#modalRoot');
    root.innerHTML = `<div class="overlay"><div class="modal ${narrow ? 'narrow' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
    const close = () => { root.innerHTML = ''; };
    root.querySelector('.overlay').addEventListener('mousedown', (e) => { if (e.target.classList.contains('overlay')) close(); });
    root.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    return { el: root.querySelector('.modal'), close };
  }
  const confirmBox = (msg) => window.confirm(msg);

  /* ---------- auth ---------- */
  function showLogin() { $('#app').hidden = true; $('#login').hidden = false; $('#pw').focus(); }
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#loginErr'); err.hidden = true;
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: $('#pw').value }) });
    if (r.ok) { $('#pw').value = ''; start(); return; }
    const d = await r.json().catch(() => ({}));
    err.textContent = r.status === 429 ? 'Твърде много опити. Опитайте по-късно.' : d.error === 'admin_not_configured' ? 'Администрацията не е настроена (липсва ADMIN_PASSWORD).' : 'Грешна парола.';
    err.hidden = false;
  });
  $('#logout').addEventListener('click', async () => { await fetch('/api/admin/logout', { method: 'POST' }); showLogin(); });

  /* ---------- routing ---------- */
  const routes = { inquiries: viewInquiries, orders: viewOrders, b2b: viewB2B, quotes: viewQuotes, labels: viewLabels };
  async function route() {
    const name = (location.hash.replace('#/', '') || 'inquiries').split('/')[0];
    const view = routes[name] || viewInquiries;
    document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.route === name));
    try { await view(); refreshBadges(); } catch (e) { fail(e); }
  }
  window.addEventListener('hashchange', route);
  async function refreshBadges() {
    try {
      const s = await api('/stats');
      [['#bdgInq', s.newInquiries], ['#bdgOrd', s.newOrders], ['#bdgB2b', s.newB2B], ['#bdgQuo', s.openQuotes], ['#bdgLab', s.labelRequests]].forEach(([sel, n]) => { const b = $(sel); b.textContent = n; b.hidden = !n; });
    } catch (_) { /* ignore */ }
  }
  async function start() {
    try {
      catalog = await api('/catalog');
      $('#login').hidden = true; $('#app').hidden = false;
      route();
    } catch (_) { showLogin(); }
  }

  /* =====================================================  INQUIRIES  */
  let inqFilter = '';
  async function viewInquiries() {
    const rows = await api('/inquiries' + (inqFilter ? '?status=' + inqFilter : ''));
    $('#main').innerHTML = `
      <div class="head"><h1>Заявки</h1></div>
      <div class="chips">${[['', 'Всички'], ...Object.entries(INQ)].map(([k, v]) => `<button class="chip ${k === inqFilter ? 'on' : ''}" data-f="${k}">${v}</button>`).join('')}</div>
      <div class="table-wrap">${rows.length ? `<table><thead><tr><th>Дата</th><th>Клиент</th><th>Контакт</th><th>Продукт / съобщение</th><th>Статус</th></tr></thead><tbody>
        ${rows.map(r => `<tr class="click" data-id="${r.id}">
          <td class="sub">${esc(fmtDate(r.created_at))}<br>${r.source === 'chat' ? '<span class="tag chat">AI чат</span>' : ''}</td>
          <td><b>${esc(r.name)}</b>${r.company ? `<br><span class="sub">${esc(r.company)}</span>` : ''}</td>
          <td>${esc(r.phone)}${r.phone && r.email ? '<br>' : ''}${esc(r.email)}</td>
          <td>${r.product ? `<b>${esc(r.product)}</b><br>` : ''}<span class="sub">${esc(r.message.split('\n')[0].slice(0, 90))}</span></td>
          <td><span class="tag ${r.status}">${INQ[r.status]}</span></td></tr>`).join('')}</tbody></table>` : '<div class="empty">Няма заявки.</div>'}</div>`;
    document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { inqFilter = c.dataset.f; viewInquiries().catch(fail); }));
    document.querySelectorAll('tr.click').forEach(tr => tr.addEventListener('click', () => openInquiry(rows.find(r => r.id == tr.dataset.id))));
  }
  function openInquiry(r) {
    const m = modal(`
      <div class="modal-head"><h2>Заявка #${r.id}</h2><button class="x" data-close aria-label="Затвори">×</button></div>
      <div class="card"><dl class="kv">
        <dt>Получена</dt><dd>${esc(fmtDate(r.created_at))} ${r.source === 'chat' ? '· AI чат' : '· формуляр' + (r.page ? ' (' + esc(r.page) + ')' : '')}</dd>
        <dt>Име</dt><dd>${esc(r.name)}</dd><dt>Фирма</dt><dd>${esc(r.company) || '—'}</dd>
        <dt>Телефон</dt><dd>${r.phone ? `<a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>` : '—'}</dd>
        <dt>Имейл</dt><dd>${r.email ? `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : '—'}</dd>
        <dt>Продукт</dt><dd>${esc(r.product) || '—'}</dd></dl></div>
      <div class="msg">${esc(r.message) || 'Без съобщение.'}</div>
      <div class="grid"><div><label>Статус</label><select id="iStatus">${opts(INQ, r.status)}</select></div></div>
      <div><label>Вътрешни бележки</label><textarea id="iNotes">${esc(r.notes)}</textarea></div>
      <div class="modal-foot">
        <button class="btn danger" id="iDel">Изтрий</button><span style="flex:1"></span>
        <button class="btn" id="iSave">Запази</button><button class="btn primary" id="iQuote">Създай оферта</button>
      </div>`);
    const save = async () => { await api('/inquiries/' + r.id, 'PATCH', { status: $('#iStatus', m.el).value, notes: $('#iNotes', m.el).value }); };
    $('#iSave', m.el).onclick = async () => { try { await save(); toast('Запазено'); m.close(); viewInquiries(); refreshBadges(); } catch (e) { fail(e); } };
    $('#iDel', m.el).onclick = async () => { if (!confirmBox('Да изтрия ли тази заявка?')) return; try { await api('/inquiries/' + r.id, 'DELETE'); m.close(); viewInquiries(); refreshBadges(); } catch (e) { fail(e); } };
    $('#iQuote', m.el).onclick = async () => { try { await save(); m.close(); openQuote(null, r); } catch (e) { fail(e); } };
  }


  /* =====================================================  ORDERS (online shop)  */
  let ordFilter = '';
  const ordBags = (o) => o.items.reduce((s, i) => s + i.qty, 0);
  const ordSum = (o) => o.totals && o.totals.total != null ? o.totals.total : o.items.reduce((s, i) => s + (i.total || 0), 0);
  const placeOf = (d) => !d || !d.id ? '—' : d.kind === 'pickup' ? 'Склад Петрич' : [d.city, d.kind === 'office' ? d.office : d.address].filter(Boolean).join(', ');
  async function viewOrders() {
    const all = await api('/orders');
    const rows = ordFilter ? all.filter(o => o.status === ordFilter) : all;
    $('#main').innerHTML = `
      <div class="head"><h1>Поръчки от магазина</h1></div>
      <div class="chips">${[['', 'Всички'], ...Object.entries(ORD)].map(([k, v]) => `<button class="chip ${k === ordFilter ? 'on' : ''}" data-f="${k}">${v}</button>`).join('')}</div>
      <div class="table-wrap">${rows.length ? `<table><thead><tr><th>Номер</th><th>Клиент</th><th>Доставка</th><th>Плащане</th><th class="num">Общо с ДДС</th><th>Статус</th></tr></thead><tbody>
        ${rows.map(o => `<tr class="click" data-id="${o.id}">
          <td><b>${esc(o.number)}</b><br><span class="sub">${esc(fmtDate(o.created_at))}</span></td>
          <td><b>${esc(o.customer.name)}</b><br><span class="sub">${esc(o.customer.phone)}</span></td>
          <td>${esc(o.delivery.label || '—')}<br><span class="sub">${esc(placeOf(o.delivery))}</span></td>
          <td>${esc(o.payment.label || '—')}</td>
          <td class="num">${money(ordSum(o), 'EUR')}<br><span class="sub">${o.items.length} арт. / ${ordBags(o)} чув.</span></td>
          <td><span class="tag ${o.status}">${ORD[o.status] || o.status}</span></td></tr>`).join('')}</tbody></table>` : '<div class="empty">Няма поръчки.</div>'}</div>`;
    document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { ordFilter = c.dataset.f; viewOrders().catch(fail); }));
    document.querySelectorAll('tr.click').forEach(tr => tr.addEventListener('click', () => openOrder(rows.find(o => o.id == tr.dataset.id))));
  }
  function openOrder(o) {
    const c = o.customer, t = o.totals || {}, inv = o.invoice || {};
    const m = modal(`
      <div class="modal-head"><h2>Поръчка ${esc(o.number)}</h2><button class="x" data-close aria-label="Затвори">×</button></div>
      <div class="card"><dl class="kv">
        <dt>Получена</dt><dd>${esc(fmtDate(o.created_at))}</dd>
        <dt>Клиент</dt><dd>${esc(c.name)}</dd>
        <dt>Телефон</dt><dd>${c.phone ? `<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>` : '—'}</dd>
        <dt>Имейл</dt><dd>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '—'}</dd>
        <dt>Доставка</dt><dd>${esc(o.delivery.label || '—')} — ${esc(placeOf(o.delivery))}</dd>
        <dt>Плащане</dt><dd>${esc(o.payment.label || '—')}</dd>
        <dt>Фактура</dt><dd>${inv.want ? `${esc(inv.company)} · ЕИК ${esc(inv.eik)}${inv.vat ? ' · ДДС ' + esc(inv.vat) : ''}${inv.address ? '<br>' + esc(inv.address) : ''}` : 'не'}</dd></dl></div>
      <div class="table-wrap"><table><thead><tr><th>Продукт</th><th>Размер / GTIN</th><th class="num">Чувала</th><th class="num">Цена чувал</th><th class="num">Сума с ДДС</th></tr></thead><tbody>
        ${o.items.map(i => `<tr><td><b>${esc(i.product)}</b></td><td>${esc(i.size)}${i.code ? `<br><span class="sub">${esc(i.code)}</span>` : ''}</td><td class="num">${i.qty}</td>
          <td class="num">${i.bag ? `${i.bag} × ${money(i.price, 'EUR')}` : '—'}</td><td class="num">${i.total ? money(i.total, 'EUR') : '—'}</td></tr>`).join('')}
        <tr><td colspan="4" class="num">Стоки</td><td class="num">${money(t.subtotal != null ? t.subtotal : ordSum(o), 'EUR')}</td></tr>
        <tr><td colspan="4" class="num">Доставка</td><td class="num">${t.shipping ? money(t.shipping, 'EUR') : 'безплатна'}</td></tr>
        ${t.fee ? `<tr><td colspan="4" class="num">Такса плащане</td><td class="num">${money(t.fee, 'EUR')}</td></tr>` : ''}
        <tr><td colspan="4" class="num"><b>Общо с ДДС</b></td><td class="num"><b>${money(ordSum(o), 'EUR')}</b></td></tr></tbody></table></div>
      ${o.note ? `<div class="msg">${esc(o.note)}</div>` : ''}
      <div class="grid"><div><label>Статус</label><select id="oStatus">${opts(ORD, o.status)}</select></div>
        <div><label>Товарителница / проследяване</label><input id="oTrack" value="${esc(o.tracking || '')}" placeholder="номер на пратка"></div></div>
      <div><label>Вътрешни бележки</label><textarea id="oNotes">${esc(o.notes)}</textarea></div>
      <div class="modal-foot"><button class="btn danger" id="oDel">Изтрий</button><span style="flex:1"></span><button class="btn primary" id="oSave">Запази</button></div>`);
    $('#oSave', m.el).onclick = async () => {
      try { await api('/orders/' + o.id, 'PATCH', { status: $('#oStatus', m.el).value, notes: $('#oNotes', m.el).value, tracking: $('#oTrack', m.el).value }); toast('Запазено'); m.close(); viewOrders(); refreshBadges(); } catch (e) { fail(e); }
    };
    $('#oDel', m.el).onclick = async () => { if (!confirmBox('Да изтрия ли тази поръчка?')) return; try { await api('/orders/' + o.id, 'DELETE'); m.close(); viewOrders(); refreshBadges(); } catch (e) { fail(e); } };
  }

  /* =====================================================  B2B REQUESTS  */
  let b2bFilter = '';
  async function viewB2B() {
    const all = await api('/b2b');
    const rows = b2bFilter ? all.filter(r => r.status === b2bFilter) : all;
    $('#main').innerHTML = `
      <div class="head"><h1>B2B заявки</h1></div>
      <div class="chips">${[['', 'Всички'], ...Object.entries(B2B)].map(([k, v]) => `<button class="chip ${k === b2bFilter ? 'on' : ''}" data-f="${k}">${v}</button>`).join('')}</div>
      <div class="table-wrap">${rows.length ? `<table><thead><tr><th>Номер</th><th>Фирма</th><th>Контакт</th><th>Заявка</th><th>Отговорник</th><th>Статус</th></tr></thead><tbody>
        ${rows.map(r => `<tr class="click" data-id="${r.id}">
          <td><b>${esc(r.number)}</b><br><span class="sub">${esc(fmtDate(r.created_at))}</span></td>
          <td><b>${esc(r.company)}</b>${r.eik ? `<br><span class="sub">ЕИК ${esc(r.eik)}</span>` : ''}</td>
          <td>${esc(r.name)}<br><span class="sub">${esc(r.phone)}</span></td>
          <td>${r.items.length ? `${r.items.length} арт. / ${r.items.reduce((s, i) => s + i.qty, 0)} чув.` : ''}${r.message ? `<br><span class="sub">${esc(r.message.slice(0, 70))}</span>` : ''}</td>
          <td>${esc(r.owner) || '—'}</td>
          <td><span class="tag ${r.status}">${B2B[r.status] || r.status}</span></td></tr>`).join('')}</tbody></table>` : '<div class="empty">Няма B2B заявки.</div>'}</div>`;
    document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { b2bFilter = c.dataset.f; viewB2B().catch(fail); }));
    document.querySelectorAll('tr.click').forEach(tr => tr.addEventListener('click', () => openB2B(rows.find(r => r.id == tr.dataset.id))));
  }
  function openB2B(r) {
    const m = modal(`
      <div class="modal-head"><h2>B2B заявка ${esc(r.number)}</h2><button class="x" data-close aria-label="Затвори">×</button></div>
      <div class="card"><dl class="kv">
        <dt>Получена</dt><dd>${esc(fmtDate(r.created_at))}</dd>
        <dt>Фирма</dt><dd><b>${esc(r.company)}</b>${r.eik ? ' · ЕИК ' + esc(r.eik) : ''}</dd>
        <dt>Лице</dt><dd>${esc(r.name)}</dd>
        <dt>Телефон</dt><dd>${r.phone ? `<a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>` : '—'}</dd>
        <dt>Имейл</dt><dd>${r.email ? `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : '—'}</dd>
        <dt>Град</dt><dd>${esc(r.city) || '—'}</dd><dt>Периодичност</dt><dd>${esc(r.frequency) || '—'}</dd></dl></div>
      ${r.items.length ? `<div class="table-wrap"><table><thead><tr><th>Продукт</th><th>Размер / GTIN</th><th class="num">Чувала</th></tr></thead><tbody>
        ${r.items.map(i => `<tr><td><b>${esc(i.product)}</b></td><td>${esc(i.size)}${i.code ? `<br><span class="sub">${esc(i.code)}</span>` : ''}</td><td class="num">${i.qty}</td></tr>`).join('')}
        <tr><td colspan="2"><b>Общо</b></td><td class="num"><b>${r.items.reduce((s, i) => s + i.qty, 0)}</b></td></tr></tbody></table></div>` : ''}
      ${r.message ? `<div class="msg">${esc(r.message)}</div>` : ''}
      <div class="grid"><div><label>Статус</label><select id="bStatus">${opts(B2B, r.status)}</select></div>
        <div><label>Отговорник (мениджър)</label><input id="bOwner" value="${esc(r.owner)}" placeholder="кой води заявката"></div></div>
      <div><label>Вътрешни бележки</label><textarea id="bNotes">${esc(r.notes)}</textarea></div>
      <div class="modal-foot"><button class="btn danger" id="bDel">Изтрий</button><span style="flex:1"></span>
        <button class="btn" id="bSave">Запази</button><button class="btn primary" id="bQuote">Създай оферта</button></div>`);
    const save = () => api('/b2b/' + r.id, 'PATCH', { status: $('#bStatus', m.el).value, owner: $('#bOwner', m.el).value, notes: $('#bNotes', m.el).value });
    $('#bSave', m.el).onclick = async () => { try { await save(); toast('Запазено'); m.close(); viewB2B(); refreshBadges(); } catch (e) { fail(e); } };
    $('#bDel', m.el).onclick = async () => { if (!confirmBox('Да изтрия ли тази заявка?')) return; try { await api('/b2b/' + r.id, 'DELETE'); m.close(); viewB2B(); refreshBadges(); } catch (e) { fail(e); } };
    $('#bQuote', m.el).onclick = async () => {
      try {
        await save(); m.close();
        /* prices are negotiated by the manager: the quote starts with the requested quantities and price 0 */
        openQuote(null, null, {
          customer: { name: r.name, company: r.company, eik: r.eik, phone: r.phone, email: r.email, address: r.city },
          items: r.items.map(i => ({ name: i.product, desc: `${i.size}${i.code ? ' · ' + i.code : ''} (чувал: ${i.bag} оп.)`, unit: 'чувала', qty: i.qty, price: 0 }))
        });
      } catch (e) { fail(e); }
    };
  }

  /* =====================================================  QUOTES  */
  async function viewQuotes() {
    const rows = await api('/quotes');
    $('#main').innerHTML = `
      <div class="head"><h1>Оферти</h1><button class="btn primary" id="newQuote">+ Нова оферта</button></div>
      <div class="table-wrap">${rows.length ? `<table><thead><tr><th>Номер</th><th>Клиент</th><th>Дата</th><th class="num">Сума с ДДС</th><th>Статус</th><th></th></tr></thead><tbody>
        ${rows.map(q => `<tr class="click" data-id="${q.id}"><td><b>${esc(q.number)}</b></td>
          <td>${esc(q.customer.company || q.customer.name || '—')}${q.customer.company && q.customer.name ? `<br><span class="sub">${esc(q.customer.name)}</span>` : ''}</td>
          <td class="sub">${esc(fmtDate(q.created_at))}</td><td class="num">${money(q.total, q.currency)}</td>
          <td><span class="tag ${q.status}">${QST[q.status]}</span></td>
          <td class="row-actions"><a class="btn sm" href="/api/admin/quotes/${q.id}/pdf" data-stop>PDF</a></td></tr>`).join('')}</tbody></table>` : '<div class="empty">Все още няма оферти.</div>'}</div>`;
    $('#newQuote').onclick = () => openQuote();
    document.querySelectorAll('[data-stop]').forEach(a => a.addEventListener('click', e => e.stopPropagation()));
    document.querySelectorAll('tr.click').forEach(tr => tr.addEventListener('click', () => openQuote(rows.find(q => q.id == tr.dataset.id))));
  }

  function openQuote(q, inquiry, draft) {
    const isNew = !q || !q.id;
    q = q || (draft ? {
      customer: draft.customer, items: draft.items, vat_rate: 20, discount_pct: 0, currency: 'EUR', status: 'draft',
      valid_until: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10), notes: ''
    } : {
      customer: inquiry ? { name: inquiry.name, company: inquiry.company, phone: inquiry.phone, email: inquiry.email } : {},
      items: [], vat_rate: 20, discount_pct: 0, currency: 'EUR', status: 'draft',
      valid_until: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10), notes: ''
    });
    if (isNew && inquiry && inquiry.product) {
      /* the visitor may have ticked several products: they arrive joined with "; " — one quote line each */
      q.items = inquiry.product.split('; ').filter(Boolean).map(n => {
        const p = catalog.products.find(x => x.name === n);
        return { name: p ? p.name : n, desc: '', unit: 'чувала', qty: 1, price: 0 };
      });
    }
    const c = q.customer || {};
    const m = modal(`
      <div class="modal-head"><h2>${isNew ? 'Нова оферта' : 'Оферта ' + esc(q.number)}</h2><button class="x" data-close aria-label="Затвори">×</button></div>
      <div class="card"><h3 style="font-size:1rem;margin-bottom:10px">Клиент</h3><div class="grid">
        <div><label>Фирма</label><input id="cCompany" value="${esc(c.company)}"></div><div><label>Лице за контакт</label><input id="cName" value="${esc(c.name)}"></div>
        <div><label>ЕИК</label><input id="cEik" value="${esc(c.eik)}"></div><div><label>Телефон</label><input id="cPhone" value="${esc(c.phone)}"></div>
        <div><label>Имейл</label><input id="cEmail" value="${esc(c.email)}"></div><div><label>Адрес</label><input id="cAddr" value="${esc(c.address)}"></div></div></div>
      <div class="card"><h3 style="font-size:1rem;margin-bottom:10px">Артикули</h3>
        <div class="table-wrap" style="box-shadow:none"><table class="items"><thead><tr><th>Избор от каталога</th><th>Наименование / описание</th><th>Кол.</th><th>Мярка</th><th>Ед. цена</th><th class="num">Сума</th><th></th></tr></thead><tbody id="qItems"></tbody></table></div>
        <button class="btn sm" id="addItem" style="margin-top:10px">+ Добави ред</button></div>
      <div class="card"><div class="grid">
        <div><label>Валута</label><select id="qCur"><option value="EUR" ${q.currency === 'EUR' ? 'selected' : ''}>Евро (€)</option><option value="BGN" ${q.currency === 'BGN' ? 'selected' : ''}>Лева (лв.)</option></select></div>
        <div><label>ДДС %</label><input id="qVat" type="number" min="0" max="100" step="0.1" value="${q.vat_rate}"></div>
        <div><label>Отстъпка %</label><input id="qDisc" type="number" min="0" max="100" step="0.1" value="${q.discount_pct}"></div>
        <div><label>Валидна до</label><input id="qValid" type="date" value="${esc(q.valid_until)}"></div>
        <div><label>Статус</label><select id="qStatus">${opts(QST, q.status)}</select></div></div>
        <div style="margin-top:12px"><label>Забележки (виждат се в PDF)</label><textarea id="qNotes">${esc(q.notes)}</textarea></div></div>
      <div class="totals" id="qTotals"></div>
      <div class="modal-foot">
        ${isNew ? '' : '<button class="btn danger" id="qDel">Изтрий</button><span style="flex:1"></span>'}
        <button class="btn" id="qSave">Запази</button><button class="btn primary" id="qPdf">Запази и свали PDF</button>
      </div>`);
    const body = $('#qItems', m.el);
    const prodOpts = '<option value="">— избери —</option>' + catalog.products.map((p, i) => `<option value="${i}">${esc(p.name)}</option>`).join('');

    function addRow(it = {}) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><select class="rp">${prodOpts}</select><select class="rs" style="margin-top:4px" disabled><option value="">— размер —</option></select></td>
        <td><input class="rn" placeholder="Наименование" value="${esc(it.name)}"><input class="rd" style="margin-top:4px" placeholder="Описание / размер" value="${esc(it.desc)}"></td>
        <td><input class="rq w-qty" type="number" min="0" step="any" value="${it.qty == null ? 1 : it.qty}"></td>
        <td><input class="ru w-unit" value="${esc(it.unit || 'кашона')}"></td>
        <td><input class="rc w-price" type="number" min="0" step="0.01" value="${it.price || 0}"></td>
        <td class="num rt"></td><td><button class="x" type="button" aria-label="Премахни">×</button></td>`;
      const pSel = tr.querySelector('.rp'), sSel = tr.querySelector('.rs');
      pSel.onchange = () => {
        const p = catalog.products[pSel.value];
        sSel.innerHTML = '<option value="">— размер —</option>' + (p ? p.sizes.map((s, i) => `<option value="${i}">${esc(s.label)} — ${esc(s.pack)}</option>`).join('') : '');
        sSel.disabled = !p;
        if (p) { tr.querySelector('.rn').value = p.name; tr.querySelector('.rd').value = ''; }
        recalc();
      };
      sSel.onchange = () => { const p = catalog.products[pSel.value], s = p && p.sizes[sSel.value]; if (s) tr.querySelector('.rd').value = `${p.sizesTitle}: ${s.label}, ${s.pack}`; };
      tr.querySelector('.x').onclick = () => { tr.remove(); recalc(); };
      tr.addEventListener('input', recalc);
      body.appendChild(tr);
    }
    const readItems = () => [...body.children].map(tr => ({
      name: tr.querySelector('.rn').value.trim(), desc: tr.querySelector('.rd').value.trim(), unit: tr.querySelector('.ru').value.trim() || 'бр.',
      qty: Number(tr.querySelector('.rq').value) || 0, price: Number(tr.querySelector('.rc').value) || 0
    }));
    function totals() {
      const items = readItems(), cur = $('#qCur', m.el).value;
      const sub = items.reduce((s, i) => s + i.qty * i.price, 0), disc = sub * (Number($('#qDisc', m.el).value) || 0) / 100;
      const net = sub - disc, vat = net * (Number($('#qVat', m.el).value) || 0) / 100;
      return { items, cur, sub, disc, vat, total: net + vat };
    }
    function recalc() {
      const t = totals();
      [...body.children].forEach((tr, i) => { tr.querySelector('.rt').textContent = money(t.items[i].qty * t.items[i].price, t.cur); });
      $('#qTotals', m.el).innerHTML = `<div><span>Междинна сума</span><span>${money(t.sub, t.cur)}</span></div>${t.disc ? `<div><span>Отстъпка</span><span>−${money(t.disc, t.cur)}</span></div>` : ''}
        <div><span>ДДС</span><span>${money(t.vat, t.cur)}</span></div><div class="big"><span>Общо</span><span>${money(t.total, t.cur)}</span></div>`;
    }
    (q.items.length ? q.items : [{}]).forEach(addRow);
    $('#addItem', m.el).onclick = () => { addRow(); recalc(); };
    m.el.querySelectorAll('#qCur,#qVat,#qDisc').forEach(el => el.addEventListener('input', recalc));
    recalc();

    async function save() {
      const payload = {
        inquiry_id: inquiry && inquiry.id, status: $('#qStatus', m.el).value,
        customer: { company: $('#cCompany', m.el).value, name: $('#cName', m.el).value, eik: $('#cEik', m.el).value, phone: $('#cPhone', m.el).value, email: $('#cEmail', m.el).value, address: $('#cAddr', m.el).value },
        items: readItems(), currency: $('#qCur', m.el).value, vat_rate: $('#qVat', m.el).value, discount_pct: $('#qDisc', m.el).value,
        valid_until: $('#qValid', m.el).value, notes: $('#qNotes', m.el).value
      };
      if (!payload.items.some(i => i.name)) throw new Error('Добавете поне един артикул.');
      return isNew ? api('/quotes', 'POST', payload) : api('/quotes/' + q.id, 'PUT', payload);
    }
    $('#qSave', m.el).onclick = async () => { try { await save(); toast('Офертата е запазена'); m.close(); location.hash = '#/quotes'; viewQuotes(); refreshBadges(); } catch (e) { fail(e); } };
    $('#qPdf', m.el).onclick = async () => { try { const s = await save(); window.open('/api/admin/quotes/' + s.id + '/pdf', '_blank'); m.close(); location.hash = '#/quotes'; viewQuotes(); refreshBadges(); } catch (e) { fail(e); } };
    const del = $('#qDel', m.el); if (del) del.onclick = async () => { if (!confirmBox('Да изтрия ли тази оферта?')) return; try { await api('/quotes/' + q.id, 'DELETE'); m.close(); viewQuotes(); refreshBadges(); } catch (e) { fail(e); } };
  }

  /* =====================================================  LABELS  */
  let labelTab = 'requests';
  /* label category from the product name */
  function labelCat(name) {
    const n = String(name).toLowerCase();
    if (n.startsWith('пелени')) return 'Пелени';
    if (n.startsWith('гащи')) return 'Гащи';
    if (n.includes('чаршафи')) return 'Чаршафи';
    if (n.startsWith('анатомични парчета')) return 'Анатомични парчета';
    if (n.startsWith('анатомична подложка')) return 'Подложки';
    if (n.startsWith('дамски')) return 'Дамски превръзки';
    return 'Други';
  }
  async function viewLabels() {
    $('#main').innerHTML = `<div class="head"><h1>Етикети</h1></div>
      <div class="chips"><button class="chip ${labelTab === 'requests' ? 'on' : ''}" data-t="requests">Заявки за етикети</button><button class="chip ${labelTab === 'catalog' ? 'on' : ''}" data-t="catalog">Каталог етикети</button></div><div id="labelBody"></div>`;
    document.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => { labelTab = b.dataset.t; viewLabels().catch(fail); }));
    return labelTab === 'catalog' ? labelCatalog() : labelRequests();
  }

  async function labelRequests() {
    const rows = await api('/label-requests');
    $('#labelBody').innerHTML = `<div style="margin-bottom:12px"><button class="btn primary" id="newLR">+ Нова заявка за етикети</button></div>
      <div class="table-wrap">${rows.length ? `<table><thead><tr><th>Номер</th><th>Дата</th><th>Етикети</th><th class="num">Общо бр.</th><th>Статус</th><th></th></tr></thead><tbody>
      ${rows.map(r => `<tr class="click" data-id="${r.id}"><td><b>${esc(r.number)}</b></td><td class="sub">${esc(fmtDate(r.created_at))}</td>
        <td>${r.items.map(i => `${esc(i.name)} <span class="sub">× ${Number(i.qty).toLocaleString('bg-BG')}</span>`).join('<br>')}</td>
        <td class="num">${r.items.reduce((s, i) => s + i.qty, 0).toLocaleString('bg-BG')}</td><td><span class="tag ${r.status}">${LST[r.status]}</span></td>
        <td><a class="btn sm" href="/api/admin/label-requests/${r.id}/pdf" data-stop>PDF</a></td></tr>`).join('')}</tbody></table>` : '<div class="empty">Все още няма заявки за етикети.</div>'}</div>`;
    $('#newLR').onclick = () => openLabelRequest();
    document.querySelectorAll('[data-stop]').forEach(a => a.addEventListener('click', e => e.stopPropagation()));
    document.querySelectorAll('tr.click').forEach(tr => tr.addEventListener('click', () => openLabelRequest(rows.find(r => r.id == tr.dataset.id))));
  }

  async function openLabelRequest(r) {
    const ORDER = ['Пелени', 'Гащи', 'Анатомични парчета', 'Подложки', 'Чаршафи', 'Дамски превръзки', 'Други'];
    const labels = (await api('/labels')).filter(l => l.active)
      .sort((a, b) => ORDER.indexOf(labelCat(a.name)) - ORDER.indexOf(labelCat(b.name)) || a.name.localeCompare(b.name, 'bg', { numeric: true }));
    if (!labels.length) { toast('Първо добавете етикети в „Каталог етикети“.', true); labelTab = 'catalog'; viewLabels().catch(fail); return; }
    const isNew = !r;
    const cats = [...new Set(labels.map(l => labelCat(l.name)))]; /* already in ORDER because labels are sorted by it */
    const cur = new Map((r ? r.items : []).map(i => [i.label_id, i.qty]));
    const m = modal(`
      <div class="modal-head"><h2>${isNew ? 'Нова заявка за етикети' : 'Заявка ' + esc(r.number)}</h2><button class="x" data-close aria-label="Затвори">×</button></div>
      <div class="chips" id="lrCats" style="margin:0">${[['', 'Всички'], ...cats.map(c => [c, c])].map(([k, v]) => `<button type="button" class="chip ${k === '' ? 'on' : ''}" data-c="${esc(k)}">${esc(v)} <span class="sub" style="color:inherit;opacity:.7">${k ? labels.filter(l => labelCat(l.name) === k).length : labels.length}</span></button>`).join('')}</div>
      <input id="lrSearch" type="search" placeholder="Търси етикет по име или баркод…" aria-label="Търсене">
      <div class="sub" id="lrCount"></div>
      <div class="table-wrap" style="max-height:44vh;overflow:auto"><table><thead><tr><th style="width:36px"></th><th>Етикет</th><th style="width:230px">Тираж</th></tr></thead><tbody id="lrRows">
      ${labels.map(l => {
        const q = cur.get(l.id), known = l.qty_options.includes(q), noPreset = !l.qty_options.length;
        return `<tr data-id="${l.id}" data-cat="${esc(labelCat(l.name))}" data-s="${esc((l.name + ' ' + l.code).toLowerCase())}"><td><input type="checkbox" class="lc" ${q ? 'checked' : ''}></td>
          <td><b>${esc(l.name)}</b>${l.code ? ` <span class="sub">${esc(l.code)}</span>` : ''}${l.description ? `<br><span class="sub">Размер на етикета: ${esc(l.description)}</span>` : ''}</td>
          <td><select class="lq" ${noPreset ? 'hidden' : ''}><option value="">— избери тираж —</option>${l.qty_options.map(n => `<option value="${n}" ${n === q ? 'selected' : ''}>${n.toLocaleString('bg-BG')} бр.</option>`).join('')}<option value="custom" ${noPreset || (q && !known) ? 'selected' : ''}>Друг тираж…</option></select>
          <input class="lo" type="number" min="1" placeholder="бр. етикети" ${noPreset ? '' : 'style="margin-top:4px"'} value="${q && !known ? q : ''}" ${noPreset || (q && !known) ? '' : 'hidden'}></td></tr>`;
      }).join('')}</tbody></table></div>
      <div class="grid"><div><label>Статус</label><select id="lrStatus">${opts(LST, r ? r.status : 'draft')}</select></div></div>
      <div><label>Забележки (виждат се в PDF)</label><textarea id="lrNotes">${esc(r ? r.notes : '')}</textarea></div>
      <div class="modal-foot">${isNew ? '' : '<button class="btn danger" id="lrDel">Изтрий</button><span style="flex:1"></span>'}
        <button class="btn" id="lrSave">Запази</button><button class="btn" id="lrPdf">Запази и свали PDF</button><button class="btn primary" id="lrMail">Запази и изпрати на имейл</button></div>`);
    m.el.querySelectorAll('#lrRows tr').forEach(tr => {
      const sel = tr.querySelector('.lq'), other = tr.querySelector('.lo'), chk = tr.querySelector('.lc');
      sel.onchange = () => { other.hidden = sel.value !== 'custom'; chk.checked = !!sel.value && (sel.value !== 'custom' || Number(other.value) > 0); if (!other.hidden) other.focus(); };
      other.oninput = () => { chk.checked = Number(other.value) > 0; };
      chk.onchange = () => { if (!chk.checked) { if (!sel.hidden) { sel.value = ''; other.hidden = true; } other.value = ''; } };
      tr.addEventListener('click', (e) => {
        if (e.target.closest('select, input[type=number], a')) return;
        if (e.target !== chk) chk.checked = !chk.checked;
        chk.dispatchEvent(new Event('change', { bubbles: true }));
        if (chk.checked && !other.hidden) other.focus();
      });
    });
    let catFilter = '';
    const applyFilter = () => {
      const q = $('#lrSearch', m.el).value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      m.el.querySelectorAll('#lrRows tr').forEach(tr => {
        tr.hidden = (catFilter && tr.dataset.cat !== catFilter) || !q.every(w => tr.dataset.s.includes(w));
        tr.classList.toggle('picked', tr.querySelector('.lc').checked);
      });
      const picked = m.el.querySelectorAll('#lrRows .lc:checked').length;
      $('#lrCount', m.el).textContent = picked ? `Избрани етикети: ${picked}` : '';
    };
    $('#lrSearch', m.el).addEventListener('input', applyFilter);
    m.el.querySelector('#lrRows').addEventListener('change', applyFilter);
    m.el.querySelector('#lrRows').addEventListener('input', applyFilter);
    m.el.querySelector('#lrCats').addEventListener('click', (e) => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      catFilter = b.dataset.c;
      m.el.querySelectorAll('#lrCats .chip').forEach(c => c.classList.toggle('on', c === b));
      applyFilter();
    });
    applyFilter();
    async function save() {
      const items = [...m.el.querySelectorAll('#lrRows tr')].map(tr => {
        const l = labels.find(x => x.id == tr.dataset.id), sel = tr.querySelector('.lq').value;
        const qty = sel === 'custom' ? Number(tr.querySelector('.lo').value) : Number(sel);
        return tr.querySelector('.lc').checked && qty > 0 ? { label_id: l.id, code: l.code, name: l.name, size: l.description, qty } : null;
      }).filter(Boolean);
      if (!items.length) throw new Error('Изберете поне един етикет и тираж.');
      const payload = { items, notes: $('#lrNotes', m.el).value, status: $('#lrStatus', m.el).value };
      return isNew ? api('/label-requests', 'POST', payload) : api('/label-requests/' + r.id, 'PUT', payload);
    }
    $('#lrSave', m.el).onclick = async () => { try { await save(); toast('Заявката е запазена'); m.close(); viewLabels(); refreshBadges(); } catch (e) { fail(e); } };
    $('#lrPdf', m.el).onclick = async () => { try { const s = await save(); window.open('/api/admin/label-requests/' + s.id + '/pdf', '_blank'); m.close(); viewLabels(); refreshBadges(); } catch (e) { fail(e); } };
    $('#lrMail', m.el).onclick = async (ev) => {
      const btn = ev.currentTarget; btn.disabled = true;
      try {
        const s = await save();
        try { const res = await api('/label-requests/' + s.id + '/send', 'POST', {}); toast('Заявката е изпратена на ' + res.to); }
        catch (e) { toast(/smtp_not_configured/.test(e.message) ? 'Заявката е запазена, но имейлът още не е настроен (SMTP в .env).' : 'Заявката е запазена, но изпращането не успя.', true); }
        m.close(); viewLabels(); refreshBadges();
      } catch (e) { btn.disabled = false; fail(e); }
    };
    const del = $('#lrDel', m.el); if (del) del.onclick = async () => { if (!confirmBox('Да изтрия ли тази заявка?')) return; try { await api('/label-requests/' + r.id, 'DELETE'); m.close(); viewLabels(); refreshBadges(); } catch (e) { fail(e); } };
  }

  async function labelCatalog() {
    const rows = await api('/labels');
    $('#labelBody').innerHTML = `<div class="head" style="margin-bottom:12px"><div class="row-actions"><button class="btn primary" id="newLabel">+ Нов етикет</button><button class="btn" id="bulkQty">Тиражи за всички</button></div>
      <input id="lSearch" type="search" placeholder="Търси по име или баркод…" aria-label="Търсене" style="max-width:300px"></div>
      <div class="table-wrap">${rows.length ? `<table><thead><tr><th>Баркод (GTIN)</th><th>Етикет</th><th>Налични тиражи</th><th>Активен</th></tr></thead><tbody>
      ${rows.map(l => `<tr class="click" data-id="${l.id}" data-s="${esc((l.name + ' ' + l.code).toLowerCase())}"><td>${esc(l.code) || '—'}</td><td><b>${esc(l.name)}</b>${l.description ? `<br><span class="sub">${esc(l.description)}</span>` : ''}</td>
        <td>${l.qty_options.map(n => n.toLocaleString('bg-BG')).join(', ') || '<span class="sub">няма</span>'}</td><td>${l.active ? 'Да' : '<span class="sub">Не</span>'}</td></tr>`).join('')}</tbody></table>`
        : '<div class="empty">Каталогът е празен. Добавете етикетите, които печатате, и възможните тиражи за всеки.</div>'}</div>`;
    $('#newLabel').onclick = () => openLabel();
    $('#lSearch').addEventListener('input', (e) => { const q = e.target.value.trim().toLowerCase().split(/\s+/).filter(Boolean); document.querySelectorAll('#labelBody tr.click').forEach(tr => { tr.hidden = !q.every(w => tr.dataset.s.includes(w)); }); });
    $('#bulkQty').onclick = () => {
      const m = modal(`<div class="modal-head"><h2>Тиражи за всички етикети</h2><button class="x" data-close aria-label="Затвори">×</button></div>
        <p style="margin:0">Задава един и същ списък с налични тиражи на всички ${rows.length} етикета (по-късно можете да го промените за отделен етикет).</p>
        <div><label>Тиражи (бройки, разделени със запетая)</label><input id="bQty" placeholder="1000, 2000, 5000, 10000"></div>
        <div class="modal-foot"><button class="btn primary" id="bSave">Приложи</button></div>`, true);
      $('#bSave', m.el).onclick = async () => { try { const r = await api('/labels/bulk-qty', 'POST', { qty_options: $('#bQty', m.el).value }); toast('Обновени етикети: ' + r.updated); m.close(); labelCatalog(); } catch (e) { fail(e); } };
    };
    document.querySelectorAll('tr.click').forEach(tr => tr.addEventListener('click', () => openLabel(rows.find(l => l.id == tr.dataset.id))));
  }
  function openLabel(l) {
    const isNew = !l; l = l || { code: '', name: '', description: '', qty_options: [], active: true };
    const m = modal(`
      <div class="modal-head"><h2>${isNew ? 'Нов етикет' : 'Етикет'}</h2><button class="x" data-close aria-label="Затвори">×</button></div>
      <div class="grid"><div><label>Баркод (GTIN)</label><input id="lCode" value="${esc(l.code)}"></div><div><label>Наименование *</label><input id="lName" value="${esc(l.name)}"></div></div>
      <div><label>Описание / размер</label><input id="lDesc" value="${esc(l.description)}"></div>
      <div><label>Налични тиражи (бройки, разделени със запетая)</label><input id="lQty" placeholder="1000, 2000, 5000" value="${esc(l.qty_options.join(', '))}"></div>
      <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="lActive" style="width:auto" ${l.active ? 'checked' : ''}> Активен (показва се в заявките)</label>
      <div class="modal-foot">${isNew ? '' : '<button class="btn danger" id="lDel">Изтрий</button><span style="flex:1"></span>'}<button class="btn primary" id="lSave">Запази</button></div>`, true);
    $('#lSave', m.el).onclick = async () => {
      const payload = { code: $('#lCode', m.el).value, name: $('#lName', m.el).value, description: $('#lDesc', m.el).value, qty_options: $('#lQty', m.el).value, active: $('#lActive', m.el).checked };
      try { await (isNew ? api('/labels', 'POST', payload) : api('/labels/' + l.id, 'PUT', payload)); toast('Запазено'); m.close(); labelCatalog(); } catch (e) { fail(e); }
    };
    const del = $('#lDel', m.el); if (del) del.onclick = async () => { if (!confirmBox('Да изтрия ли този етикет?')) return; try { await api('/labels/' + l.id, 'DELETE'); m.close(); labelCatalog(); } catch (e) { fail(e); } };
  }

  start();
})();
