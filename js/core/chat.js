/* SEVAR — AI chat widget (talks to /api/chat; the API key never reaches the browser) */
(function () {
  const C = window.SEVAR && SEVAR.company;
  if (!C || document.getElementById('chatLauncher')) return;
  const KEY = 'sevar_chat_v1';
  const ICON = {
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 1 1 21 11.5z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');

  let history = [];
  try { history = JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch (_) { /* storage unavailable */ }
  const persist = () => { try { sessionStorage.setItem(KEY, JSON.stringify(history.slice(-20))); } catch (_) { /* ignore */ } };

  const box = document.createElement('div');
  box.innerHTML = `
<button class="chat-launcher" id="chatLauncher" type="button" aria-label="Чат с асистента" aria-expanded="false">${ICON.chat}</button>
<section class="chat-panel" id="chatPanel" role="dialog" aria-label="Чат с асистента на SEVAR" hidden>
  <header class="chat-head"><div><b>Асистент SEVAR</b><span>Питайте за продукти, размери и оферти</span></div><button type="button" id="chatClose" aria-label="Затвори чата">${ICON.close}</button></header>
  <div class="chat-log" id="chatLog" aria-live="polite"></div>
  <div class="chat-chips" id="chatChips"></div>
  <form class="chat-form" id="chatForm" autocomplete="off">
    <input id="chatInput" type="text" maxlength="500" placeholder="Напишете съобщение…" aria-label="Съобщение" required>
    <button type="submit" aria-label="Изпрати">${ICON.send}</button>
  </form>
  <p class="chat-note">AI асистент — отговорите са ориентировъчни. Тел. <a href="${C.phoneHref}">${C.phoneDisplay}</a></p>
</section>`;
  document.body.appendChild(box);

  const $ = (id) => document.getElementById(id);
  const launcher = $('chatLauncher'), panel = $('chatPanel'), log = $('chatLog'), input = $('chatInput'), form = $('chatForm'), chips = $('chatChips');
  let busy = false;

  function add(role, text, extra) {
    const el = document.createElement('div');
    el.className = 'chat-msg is-' + role;
    el.innerHTML = fmt(text) + (extra || '');
    log.appendChild(el); log.scrollTop = log.scrollHeight;
    return el;
  }
  function greet() {
    add('bot', 'Здравейте! Аз съм асистентът на SEVAR. Мога да ви помогна с информация за продуктите и размерите или да запиша запитване за оферта на едро. С какво да помогна?');
    chips.innerHTML = ['Какви размери има?', 'Искам оферта на едро', 'Къде произвеждате?'].map(t => `<button type="button">${t}</button>`).join('');
  }
  function open(state) {
    panel.hidden = !state; launcher.setAttribute('aria-expanded', String(state));
    launcher.classList.toggle('is-open', state);
    launcher.innerHTML = state ? ICON.close : ICON.chat;
    if (state) { input.focus(); log.scrollTop = log.scrollHeight; }
  }
  history.forEach(m => add(m.role === 'user' ? 'user' : 'bot', m.content));
  if (!history.length) greet();

  async function send(text) {
    if (busy || !text.trim()) return;
    busy = true; chips.innerHTML = '';
    add('user', text); history.push({ role: 'user', content: text }); persist();
    const wait = add('bot', '…'); wait.classList.add('is-wait');
    try {
      const r = await fetch('api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history.slice(-12) }) });
      const d = await r.json().catch(() => ({}));
      wait.remove();
      if (!r.ok) throw Object.assign(new Error(d.error || 'error'), { status: r.status });
      add('bot', d.reply); history.push({ role: 'assistant', content: d.reply }); persist();
      if (d.inquiryCreated) SEVAR.toast && SEVAR.toast('Запитването е изпратено. Ще се свържем с вас до един работен ден.', 'success');
    } catch (e) {
      wait.remove();
      const msg = e.status === 429 ? 'Изпратихте твърде много съобщения. Опитайте след малко или се обадете на ' + C.phoneDisplay + '.'
        : 'Чатът временно не е наличен. Можете да изпратите запитване или да ни се обадите на ' + C.phoneDisplay + '.';
      add('bot', msg, e.status === 429 ? '' : '<button type="button" class="chat-cta" data-inquiry>Изпрати запитване</button>');
      history.pop(); persist();
    }
    busy = false; input.focus();
  }

  launcher.addEventListener('click', () => open(panel.hidden));
  $('chatClose').addEventListener('click', () => open(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) open(false); });
  form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value.trim(); input.value = ''; send(v); });
  chips.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) send(b.textContent); });
})();
