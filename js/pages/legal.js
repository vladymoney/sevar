/* SEVAR — legal pages: fill company data and the delivery/payment tables from the shop settings */
(function () {
  const C = SEVAR.company, S = SEVAR.SHOP;
  const val = (k) => k === 'legal' ? C.legal : k === 'address' ? `${C.address.street}, ${C.address.city}` : k === 'phone' ? C.phoneDisplay : k === 'email' ? C.email : (C[k] || '');
  document.querySelectorAll('[data-co]').forEach(el => {
    const k = el.dataset.co, v = val(k);
    el.textContent = v;
    if (el.hasAttribute('data-co-mail')) el.href = 'mailto:' + C.email;
    if (el.dataset.coHref) el.href = C[el.dataset.coHref];
  });
  /* rows for data that is not filled in yet (ЕИК, ДДС номер) are hidden */
  document.querySelectorAll('[data-co-row]').forEach(r => { if (!C[r.dataset.coRow]) r.hidden = true; });

  const eur = SEVAR.eur;
  const ship = document.querySelector('#shipTable tbody');
  if (ship) {
    ship.innerHTML = S.delivery.map(d => `<tr><td>${d.label}</td><td>${d.price ? eur(d.price) : 'безплатно'}</td><td>${d.eta}</td></tr>`).join('');
    document.getElementById('shipFree').innerHTML = `Доставката е <b>безплатна</b> за поръчки на стойност от <b>${eur(S.freeShippingFrom)}</b> с ДДС (за куриерските методи).`;
    const list = document.querySelector('[data-courier-list]');
    if (list) list.textContent = [...new Set(S.delivery.map(d => d.courier).filter(Boolean))].join(' и ');
  }
  const pay = document.querySelector('#payTable tbody');
  if (pay) pay.innerHTML = S.payments.map(p => `<tr><td>${p.label}</td><td>${p.fee ? eur(p.fee) : 'без такса'}</td><td>${p.note}</td></tr>`).join('');
  document.querySelectorAll('[data-b2b-from]').forEach(el => { el.textContent = S.b2bFrom; });
})();
