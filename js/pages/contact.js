/* SEVAR — contact page: fill company details, product select, map, submit */
(function () {
  const C = SEVAR.company;
  const a = C.address;
  document.getElementById('cAddress').innerHTML = `${a.street}<br>${a.city}, ${a.region}`;
  const ph = document.getElementById('cPhoneLink'); ph.href = C.phoneHref; ph.textContent = C.phoneDisplay;
  const em = document.getElementById('cEmailLink'); em.href = 'mailto:' + C.email; em.textContent = C.email;
  document.getElementById('cHours').innerHTML = C.hours.map(h => `<div><span>${h.d}</span><strong>${h.h}</strong></div>`).join('');
  document.getElementById('cMap').src = 'https://www.google.com/maps?q=' + encodeURIComponent(a.mapQuery) + '&z=15&hl=bg&output=embed';

  const sel = document.getElementById('cProduct');
  sel.innerHTML = ['<option value="">— изберете —</option>']
    .concat(SEVAR.products.map(p => `<option value="${p.name}">${p.name}</option>`))
    .concat(['<option value="Цялата гама / оферта">Цялата гама / обща оферта</option>', '<option value="Друго">Друг въпрос</option>']).join('');
  const pre = new URLSearchParams(location.search).get('product');
  if (pre) { const o = [...sel.options].find(x => x.value === pre); if (o) sel.value = pre; }

  const form = document.getElementById('contactForm');
  form.addEventListener('submit', (e) => { e.preventDefault(); SEVAR.submitForm(form, 'Съобщение от сайта'); });
})();
