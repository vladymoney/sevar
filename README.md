# SEVAR — Тим Трейд ООД (редизайн на sevarbg.com)

Нов корпоративен сайт на **Тим Трейд ООД** (бранд **SEVAR**) — производител и дистрибутор на едро
на пелени, гащи, чаршафи и хигиенни продукти за възрастни, гр. Петрич. Съдържанието (текстове,
снимки на продуктите, размери, каталог) е взето от стария сайт sevarbg.com (WordPress / Enfold).

## Стартиране

Статичен сайт — няма build стъпка и няма външни зависимости освен Google Fonts (Comfortaa за заглавия и Nunito за текст — и двата с кирилица,
заместител на Parkinsans от темата). GSAP, ScrollTrigger, Lenis, Swiper и page-flip са включени локално
в `js/vendor/` и `css/vendor/`.

Дизайнът следва елементите на темата **Eldcare** (PavoThemes): кремав фон, вмъкнати снимкови банери със
заоблени ъгли и „breadcrumb“ бутон, бели pill етикети с жълта точка, заглавия с жълто подчертана фраза и
анимиран „кръгъл маркер“, pill бутони с кръгла икона и „следващ курсора“ hover, бели карти с жълти икони,
карусел (Swiper), панел с табове за продуктовите категории, bento броячи, CTA панел върху снимка, FAQ
акордеон, тъмен заоблен footer с бърза форма. Основен цвят остава синьото на SEVAR (`--navy`, `--blue`),
второстепенен — жълтото на темата (`--yellow`), виж `css/base.css`.

Сайтът се сервира от малък Node.js сървър (`server/`), който освен статичните файлове дава API за
запитванията, AI чата и администрацията. Нужен е Node.js 22.13 или по-нов (ползва се вграденият `node:sqlite`).

```bash
npm install
cp .env.example .env     # задайте ADMIN_PASSWORD и SESSION_SECRET; по желание ANTHROPIC_API_KEY
PORT=8791 npm start
```

и отворете <http://localhost:8791/>. Администрацията е на <http://localhost:8791/admin/>.

| Страница | URL | Съдържание |
|---|---|---|
| Начало | `index.html` | Hero (снимка + жълта карта), „Нека се представим“ + брояч, „Защо SEVAR“ карусел, продуктови категории с табове, bento броячи, продукти, каталог панел, CTA, FAQ |
| Продукти | `products.html` | Филтър по категории + 8 продукта (`?cat=diapers|pads|sheets|lady`) |
| Продукт | `product.html?p=<slug>` | Галерия, характеристики, описание, таблица с размери/опаковки, стъпки за употреба, свързани продукти |
| Каталог | `catalogue.html` | 3D flipbook (page-flip) от 21-те страници на PDF каталога + PDF за сваляне |
| За нас | `about.html` | История, ценности, броячи, пазари, гама |
| Контакти | `contact.html` | Форма, адрес, телефон, имейл, работно време, Google Maps |

Бутоните „Запитване“/„Поръчай“ отварят модален формуляр (на всяка страница).

## Структура

```
assets/
  catalogue/           sevar-catalogue-2024.pdf + pages/page-NN.jpg (1000px) + thumb-NN.jpg
  img/brand/           лого (изрязано от оригиналния PNG)
  img/products/        всички продуктови снимки и пиктограми като WebP
  img/photos/          hero снимка
  source/              оригиналните файлове от стария сайт (не се деплойват, в .gitignore)
css/base.css           токени, reset, типография, бутони, eyebrow pills, header + off-canvas меню, банер, footer, модал, форми
css/pages.css          секциите по страници
css/vendor/            Swiper
js/data/company.js     контакти, работно време, пазари, статистики, formEndpoint
js/data/products.js    8-те продукта (текстове, размери, снимки, стъпки)
js/core/layout.js      header, off-canvas меню, footer + бърза форма, модал за запитване, toast, button hover, преходи
js/core/motion.js      Lenis + GSAP helpers (data-reveal, data-split, .mark маркер, data-count, data-scroll-image, parallax, tilt)
js/core/render.js      продуктова карта + SEVAR.banner() за вътрешните страници
js/pages/*.js          логика по страници
js/core/chat.js        AI чат уиджет (зарежда се от layout.js)
server/index.js        Express сървър: статични файлове (само разрешени папки), публичен и админ API
server/db.js           SQLite (вграден node:sqlite): заявки, оферти, етикети, заявки за етикети
server/auth.js         вход с парола, подписан httpOnly cookie, ограничаване на опитите
server/pdf.js          PDF оферти и PDF заявки за етикети (pdfkit + DejaVu шрифт с кирилица)
server/chat.js         AI асистент през Anthropic API (ключът остава само на сървъра)
server/catalog.js      чете js/data/company.js и products.js — една и съща информация за сайта, офертите и чата
admin/                 панел за управление на <адрес на сайта>/admin/
data/                  базата данни (sevar.db) — не е в git; в Docker е том `sevar-data`
```

## Форми, AI чат и администрация

- **Запитвания:** формите (контакти, модал, бърза форма във футъра) се изпращат до `POST /api/inquiries` и се виждат в
  **Администрация → Заявки**. Ако сървърът не отговаря, формата се връща към `mailto:` към `info@sevarbg.com`.
- **AI чат:** плаващият бутон долу вдясно. Асистентът знае продуктите и размерите (от `js/data/products.js`), не измисля цени и
  при желание на клиента записва запитване (идва като заявка с етикет „AI чат“). Работи само с `ANTHROPIC_API_KEY`;
  без него показва покана за запитване. Моделът се сменя с `CHAT_MODEL`.
- **Администрация** (`/admin/`, вход с `ADMIN_PASSWORD`):
  - **Заявки** — статус (нова / в работа / с оферта / приключена), бележки, бутон „Създай оферта“.
  - **Оферти** — клиент, артикули (избор от каталога с размери и опаковки или свободен ред), ДДС, отстъпка, валидност,
    **PDF за сваляне** (номерация ОФ-ГГГГ-0001). ЕИК и ДДС номер на фирмата в PDF се задават с `COMPANY_EIK` / `COMPANY_VAT`.
  - **Етикети** — каталог с етикети (код, име, налични тиражи) и **заявки за етикети**: избирате етикети и тираж за всеки,
    после **PDF** (номерация ЕТ-ГГГГ-0001).
- **Сигурност:** паролата и ключовете са само в `.env` (не е в git). Администрацията и API-то са зад подписан httpOnly cookie
  със `SameSite=Strict`; опитите за вход и запитванията са ограничени по IP. Сървърът сервира само `assets/`, `css/`, `js/`,
  `admin/` и `*.html` — `server/`, `data/` и `.env` не се достъпват през браузъра. Сложете сайта зад HTTPS (certbot).

## Деплой с Docker (VPS)

Един контейнер с Node.js (сайт + API + админ). Порт на хоста: **24917** — нарочно необичаен, за да не се бие с
другите проекти на VPS-а (сменя се с `WEB_PORT` в `.env`). Базата е в Docker том `sevar-data` и оцелява при rebuild.

```bash
git clone https://github.com/vladymoney/sevar.git && cd sevar
cp .env.example .env             # по желание, но нужно за /admin (ADMIN_PASSWORD, SESSION_SECRET) и AI чата
docker compose up -d --build     # http://<IP-на-VPS>:24917
```

Без `.env` сайтът тръгва, но администрацията и AI чатът са изключени. Обновяване: `git pull && docker compose up -d --build`.

Контейнерът е във вградената мрежа на Docker (`network_mode: bridge`) и не създава собствена — така тръгва и на VPS,
където другите compose проекти са изчерпали адресите на Docker („all predefined address pools have been fully subnetted“).

### Публикуване на sevarbg.com/new (старият WordPress остава на sevarbg.com)

Домейнът сочи към SuperHosting (cPanel), а новият сайт е на VPS-а. Папката `/new` на хостинга препраща към контейнера:

1. На VPS-а: `git pull && docker compose up -d --build` — контейнерът по подразбиране е с `BASE_PATH=/new`
   (сайтът отговаря и на `/new/`, и на корена). Портът 24917 трябва да е отворен във firewall-а на VPS-а.
2. В cPanel → File Manager → `public_html` → нова папка `new` → качете `deploy/cpanel-new.htaccess` като `.htaccess`
   и сменете `VPS_IP` с адреса на VPS-а.
3. Отворете `https://sevarbg.com/new/`. Правилата в `public_html/new/.htaccess` заменят тези на WordPress само за `/new`.

Ако `/new` дава „500 Internal Server Error“, хостингът не позволява proxy от `.htaccess`. Тогава: в cPanel → DNS зона →
A запис `new.sevarbg.com` → IP на VPS-а; на VPS-а nginx vhost като `deploy/sevarbg.com.conf` със
`server_name new.sevarbg.com` + `certbot --nginx -d new.sevarbg.com`; в cPanel → Пренасочвания: `/new` → `https://new.sevarbg.com`.

Внимание: при варианта с `.htaccess` връзката хостинг → VPS е по HTTP (без криптиране), включително паролата за `/admin`.
За преглед е достатъчно; за постоянно ползване на администрацията предпочетете поддомейна с HTTPS.

Собствен домейн: host nginx vhost `deploy/sevarbg.com.conf` (proxy към 127.0.0.1:24917), после
`certbot --nginx -d sevarbg.com -d www.sevarbg.com` и `BIND_ADDR=127.0.0.1` в `.env` (+ `docker compose up -d`), за да
е достъпен само през nginx/HTTPS. Резервно копие на данните:
`docker run --rm -v sevar_sevar-data:/d -v "$PWD":/b alpine tar czf /b/sevar-data.tgz -C /d .`

## Какво е поправено спрямо стария сайт

- HTTPS canonical/og URL-и, без mixed content; липсващ H1, alt текстове, lazy loading
- Няма demo страници от темата, няма мъртви линкове (FAQ и каталог в top bar-а водеха към `#`)
- Единни данни за фирмата (основана 2017, един адрес, един имейл) — виж `js/data/company.js`
- Работеща карта, форма на всяка страница, таблици с размери на всеки продукт
