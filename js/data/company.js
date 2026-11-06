/* SEVAR — company data shared by every page (header, footer, contact, inquiry modal) */
window.SEVAR = window.SEVAR || {};

SEVAR.company = {
  brand: 'SEVAR',
  legal: 'Тим Трейд ООД',
  tagline: 'Производител и дистрибутор на пелени и хигиенни продукти за възрастни',
  founded: 2017,
  phoneDisplay: '+359 886 02 09 07',
  phoneHref: 'tel:+359886020907',
  email: 'info@sevarbg.com',
  emailAlt: 'timtradeltd2017@gmail.com',
  eik: '',   /* ЕИК — shown on the legal pages when filled in */
  vat: '',   /* ДДС номер (BG…) */
  address: {
    street: 'ул. Христо Чернопеев 1',
    city: '2850 Петрич',
    region: 'обл. Благоевград, България',
    mapQuery: 'ул. Христо Чернопеев 1, Петрич, България'
  },
  hours: [
    { d: 'Понеделник – Петък', h: '08:00 – 17:00' },
    { d: 'Събота', h: '10:00 – 14:00' },
    { d: 'Неделя', h: 'Затворено' }
  ],
  markets: ['България', 'Румъния', 'Гърция', 'Северна Македония', 'Сърбия', 'Черна гора'],
  social: {
    facebook: 'https://www.facebook.com/SevarPetrich'
  },
  stats: [
    { value: 2017, label: 'Година на основаване', suffix: '' },
    { value: 40, label: 'Служители', suffix: '+' },
    { value: 20, label: 'Години опит', suffix: '+' },
    { value: 500, label: 'Клиенти', suffix: '+' }
  ],
  /* Forms post to the site's own server (server/index.js) and appear in /admin. If the request fails, forms fall back to mailto:. */
  formEndpoint: '/api/inquiries'
};

SEVAR.nav = [
  { href: 'index.html', label: 'Начало', key: 'home' },
  { href: 'products.html', label: 'Магазин', key: 'products' },
  { href: 'catalogue.html', label: 'Каталог', key: 'catalogue' },
  { href: 'about.html', label: 'За нас', key: 'about' },
  { href: 'contact.html', label: 'Контакти', key: 'contact' },
  { href: 'b2b.html', label: 'B2B поръчки', key: 'b2b', cls: 'nav-b2b' }   /* last item, highlighted */
];
