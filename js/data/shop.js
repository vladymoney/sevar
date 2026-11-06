/* SEVAR — online shop rules: delivery, payment, free-shipping threshold, B2B threshold.
   Shared by the website and the server (server/catalog.js loads this file), so prices are always checked on the server.
   DEMO VALUES: replace the delivery prices, fees, bank details and thresholds once the courier and bank are agreed. */
window.SEVAR = window.SEVAR || {};

SEVAR.SHOP = {
  demo: true,
  currency: '€',
  freeShippingFrom: 150,   /* order value (с ДДС) from which delivery is free */
  b2bFrom: 5,              /* bags — mentioned on the B2B page and in the legal texts */
  b2bPromptFrom: 2000,     /* order value (с ДДС) from which the cart invites the visitor to ask for B2B discounts */
  delivery: [
    { id: 'econt_office', label: 'Еконт — до офис', courier: 'Еконт', kind: 'office', price: 4.5, eta: '1–2 работни дни' },
    { id: 'econt_address', label: 'Еконт — до адрес', courier: 'Еконт', kind: 'address', price: 6, eta: '1–2 работни дни' },
    { id: 'speedy_office', label: 'Спиди — до офис', courier: 'Спиди', kind: 'office', price: 4.5, eta: '1–2 работни дни' },
    { id: 'speedy_address', label: 'Спиди — до адрес', courier: 'Спиди', kind: 'address', price: 6, eta: '1–2 работни дни' },
    { id: 'pickup', label: 'Вземане от склада в Петрич', courier: '', kind: 'pickup', price: 0, eta: 'след потвърждение' }
  ],
  payments: [
    { id: 'cod', label: 'Наложен платеж', fee: 1.5, note: 'Плащате на куриера при получаване.', not: ['pickup'] },
    { id: 'bank', label: 'Банков превод', fee: 0, note: 'Изпращаме ви данни за плащане; изпращаме стоката след постъпване на сумата.' },
    { id: 'cash', label: 'В брой при вземане', fee: 0, note: 'Плащате на място в склада.', only: ['pickup'] }
  ],
  bank: { holder: 'Тим Трейд ООД', bankName: 'Банка (демо)', iban: 'BG00 DEMO 0000 0000 0000 00', bic: 'DEMOBGSF' }
};

SEVAR.shopDelivery = (id) => SEVAR.SHOP.delivery.find(d => d.id === id);
SEVAR.shopPayment = (id) => SEVAR.SHOP.payments.find(p => p.id === id);
/* payment methods allowed with a delivery method */
SEVAR.shopPaymentsFor = (deliveryId) => SEVAR.SHOP.payments.filter(p => !(p.not || []).includes(deliveryId) && (!p.only || p.only.includes(deliveryId)));

/* order totals (всички суми са с ДДС) */
SEVAR.shopTotals = function (subtotal, deliveryId, paymentId) {
  const S = SEVAR.SHOP, d = SEVAR.shopDelivery(deliveryId), p = SEVAR.shopPayment(paymentId);
  const r2 = (n) => Math.round(n * 100) / 100;
  const free = subtotal >= S.freeShippingFrom;
  const shipping = d ? (free ? 0 : d.price) : 0;
  const fee = p ? p.fee : 0;
  return { subtotal: r2(subtotal), shipping: r2(shipping), fee: r2(fee), total: r2(subtotal + shipping + fee), free };
};
