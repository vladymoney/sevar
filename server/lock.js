/* SEVAR — temporary password lock for the public site.
   ON  : put SITE_PASSWORD=… in .env and restart (docker compose up -d).
   OFF : delete the SITE_PASSWORD line and restart. Nothing else to change.
   While locked every page shows a branded "coming soon" screen with a password field; the right password
   unlocks the site in that browser for 30 days. The admin (/admin, /api/admin) keeps its own login and is never
   locked, a signed-in admin also sees the site, and static files stay reachable (the lock page needs the logo). */
const crypto = require('crypto');
const express = require('express');
const { company } = require('./catalog');
const auth = require('./auth');

const COOKIE = 'sevar_preview';
const DAYS = 30;
const OPEN = /^\/(admin|api\/admin|api\/health|assets|css|js|\.well-known)(\/|$)|^\/(robots\.txt|favicon\.ico)$/;

const enabled = () => !!process.env.SITE_PASSWORD;
const key = () => process.env.SESSION_SECRET || process.env.SITE_PASSWORD;
/* the password is part of the signature, so changing SITE_PASSWORD logs everyone out */
const sign = (exp) => crypto.createHmac('sha256', key()).update(`${exp}|${process.env.SITE_PASSWORD}`).digest('base64url');
const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();
const samePassword = (input) => crypto.timingSafeEqual(digest(input), digest(process.env.SITE_PASSWORD));
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* only same-site paths: never redirect to another host */
const safeNext = (v) => { const s = String(v || '/'); return /^\/(?![\/\\])/.test(s) && !/[\r\n]/.test(s) ? s.slice(0, 500) : '/'; };

function cookieOf(req) {
  const m = String(req.headers.cookie || '').match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : '';
}
function hasAccess(req) {
  if (auth.isAuthed(req)) return true;
  const [exp, sig] = cookieOf(req).split('.');
  if (!sig || !(Number(exp) > Date.now())) return false;
  const want = sign(exp);
  return want.length === sig.length && crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sig));
}
function grant(req, res) {
  const exp = String(Date.now() + DAYS * 864e5);
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader('Set-Cookie', `${COOKIE}=${exp}.${sign(exp)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DAYS * 86400}${secure ? '; Secure' : ''}`);
}

function lockPage(error, next) {
  const A = company.address;
  return `<!DOCTYPE html>
<html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>SEVAR — скоро</title>
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@700&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--navy:#0b2a5b;--blue:#1d6fe0;--sky:#5bb5f7;--yellow:#f5c233;--cream:#f4f1eb;--line:#e2dccf;--text:#566074;--muted:#8a93a3;--red:#c0392b}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%}
body{font:16px/1.6 'Nunito',system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--text);background:var(--cream);
  background-image:radial-gradient(circle at 12% 10%,rgba(245,194,51,.18),transparent 34%),radial-gradient(circle at 92% 90%,rgba(29,111,224,.12),transparent 40%);
  min-height:100vh;display:grid;place-items:center;padding:28px 16px}
.wrap{width:min(480px,100%);display:grid;gap:16px}
.card{background:#fff;border-radius:28px;padding:34px 34px 30px;box-shadow:0 34px 70px -30px rgba(11,42,91,.35);position:relative;overflow:hidden}
.card::before{content:'';position:absolute;inset:0 0 auto;height:6px;background:var(--yellow)}
.logo{display:block;height:52px;width:auto;margin:4px 0 22px}
.pill{display:inline-flex;align-items:center;gap:8px;background:var(--cream);border-radius:999px;padding:6px 14px;font-size:12px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--navy)}
.pill::before{content:'';width:8px;height:8px;border-radius:50%;background:var(--yellow)}
h1{font:700 clamp(24px,6vw,30px)/1.25 'Comfortaa','Nunito',sans-serif;color:var(--navy);margin:16px 0 10px}
p{margin:0 0 22px}
label{display:block;font-weight:700;font-size:14px;color:var(--navy);margin-bottom:6px}
.row{display:flex;gap:10px}
input{flex:1;min-width:0;font:inherit;color:#1b2437;padding:13px 16px;border:1.5px solid var(--line);border-radius:999px;background:#fff}
input:focus{outline:0;border-color:var(--navy);box-shadow:0 0 0 4px rgba(11,42,91,.08)}
button{font:inherit;font-weight:700;border:0;border-radius:999px;padding:13px 24px;background:var(--yellow);color:var(--navy);cursor:pointer;transition:background .2s,color .2s}
button:hover,button:focus-visible{background:var(--navy);color:#fff;outline:0}
.err{margin:10px 0 0;color:var(--red);font-weight:600;font-size:14px}
.contact{background:var(--navy);color:#d7e2f4;border-radius:24px;padding:20px 26px;font-size:14px;line-height:1.7}
.contact b{color:#fff;display:block;font-size:15px;margin-bottom:2px}
.contact a{color:var(--yellow);font-weight:700;text-decoration:none}
.foot{text-align:center;font-size:12px;color:var(--muted)}
@media (max-width:420px){.card{padding:28px 22px 24px}.row{flex-direction:column}button{width:100%}}
</style></head>
<body><main class="wrap">
  <div class="card">
    <img class="logo" src="/assets/img/brand/sevar-logo.png" alt="SEVAR" width="130" height="52">
    <span class="pill">Скоро</span>
    <h1>Новият сайт на SEVAR е почти готов</h1>
    <p>Подготвяме новия сайт на ${esc(company.legal)}. Дотогава достъпът е само с парола.</p>
    <form method="post" action="/_unlock">
      <input type="hidden" name="next" value="${esc(next)}">
      <label for="pw">Парола за достъп</label>
      <div class="row"><input id="pw" name="password" type="password" autocomplete="current-password" required autofocus${error ? ' aria-invalid="true" aria-describedby="err"' : ''}><button type="submit">Влез</button></div>
      ${error ? `<p class="err" id="err" role="alert">${esc(error)}</p>` : ''}
    </form>
  </div>
  <div class="contact"><b>Поръчки и въпроси междувременно</b>
    <a href="${esc(company.phoneHref)}">${esc(company.phoneDisplay)}</a> &nbsp;·&nbsp; <a href="mailto:${esc(company.email)}">${esc(company.email)}</a><br>
    ${esc(A.street)}, ${esc(A.city)}</div>
  <p class="foot">© ${new Date().getFullYear()} ${esc(company.legal)} · SEVAR</p>
</main></body></html>`;
}

function send(res, status, error, next) {
  res.status(status);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (status === 503) res.setHeader('Retry-After', '86400');   // "temporarily closed" for search engines
  res.send(lockPage(error, next));
}

function mount(app) {
  app.post('/_unlock', express.urlencoded({ extended: false, limit: '4kb' }), (req, res) => {
    const b = req.body || {}, next = safeNext(b.next);
    if (!enabled()) return res.redirect(303, next);
    if (!auth.allow('unlock:' + (req.ip || ''), 10, 15 * 60e3)) return send(res, 429, 'Твърде много опити. Опитайте отново след 15 минути.', next);
    if (!samePassword(String(b.password || ''))) return send(res, 401, 'Грешна парола. Опитайте отново.', next);
    grant(req, res);
    res.redirect(303, next);
  });
  app.use((req, res, nextFn) => {
    if (!enabled() || OPEN.test(req.path) || hasAccess(req)) return nextFn();
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'site_locked' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(401).send('Locked');
    send(res, 503, '', safeNext(req.originalUrl));
  });
}

module.exports = { mount, enabled };
