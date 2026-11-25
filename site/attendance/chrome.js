/* Attendance Explorer: the section menu that travels down the page, as in the Ofsted Explorer.
   It lists the sections on screen (those marked data-nav and not hidden), keeps the current one underlined,
   and rebuilds itself when a view shows or hides a section. */
(function () {
  const host = document.getElementById('ax-secnav'); if (!host || window.AXtabs) return;          // a page organised into tabs (tabs.js) has its own bar
  let sig = '', io = null, links = [];
  const secs = () => [...document.querySelectorAll('main.ax section[data-nav]')].filter((s) => !s.hidden && s.offsetParent !== null);
  const build = () => {
    const list = secs(); list.forEach((s, i) => { if (!s.id) s.id = 'sec-' + s.dataset.nav.toLowerCase().replace(/[^a-z0-9]+/g, '-'); });
    const now = list.map((s) => s.id).join('|'); if (now === sig) return; sig = now;
    host.innerHTML = ''; links = list.map((s) => { const a = document.createElement('a'); a.href = '#' + s.id; a.textContent = s.dataset.nav;
      a.addEventListener('click', (e) => { e.preventDefault(); s.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'}); }); host.appendChild(a); return a; });
    if (links[0]) links[0].classList.add('on');
    if (io) io.disconnect();
    if ('IntersectionObserver' in window) { io = new IntersectionObserver((es) => { es.forEach((e) => { if (!e.isIntersecting) return;
      links.forEach((a) => { const on = a.getAttribute('href') === '#' + e.target.id; a.classList.toggle('on', on); if (on && host.scrollWidth > host.clientWidth) host.scrollTo({left: a.offsetLeft - 40, behavior: 'auto'}); }); }); }, {rootMargin: '-20% 0px -70% 0px'});
      list.forEach((s) => io.observe(s)); }
  };
  let t = null; const later = () => { clearTimeout(t); t = setTimeout(build, 200); };
  new MutationObserver(later).observe(document.querySelector('main.ax'), {subtree: true, attributes: true, attributeFilter: ['hidden']});
  addEventListener('load', later); later();
})();

/* The method card as tabs, in the Ofsted Explorer's manner. Each paragraph of a plain method card starts with a
   bold title; paragraphs are gathered under a few tabs by that title. Every panel is shown when printed. */
(function () {
  const card = document.querySelector('.ax-method'); if (!card || card.querySelector('[role=tablist]')) return;
  const TABS = ['How it is counted', 'Comparisons', 'Places', 'Sources and dates', 'Small numbers', 'What is not here'];
  const WHERE = {'Source': 3, 'Map': 3, 'Maps': 3, 'Ofsted': 3,
    'Similar schools': 1, 'England and the local authority': 1, 'The funnel': 1, 'Change': 1, 'Last year': 1, 'Since 2018/19': 1, 'Colours': 1, 'Trusts over time': 1, 'Pupil groups': 1,
    'Areas': 2, 'Local authorities': 2, 'Wards': 2, 'Counties': 2, 'Constituencies': 2, 'Trusts': 2, 'Schools that changed': 2,
    'What is withheld': 4, 'What is not shown': 4, 'Small schools': 4, 'Small numbers': 4, 'Severe absence': 4,
    'Not the termly statistics': 5, 'No expected rate': 5, 'Special schools': 5, 'Not a judgement': 5};
  const groups = TABS.map(() => []);
  [...card.querySelectorAll(':scope > p')].forEach((p) => { const b = p.querySelector('b'), t = b ? b.textContent.replace(/\.$/, '').trim() : ''; groups[WHERE[t] == null ? 0 : WHERE[t]].push(p); });
  const used = TABS.map((t, i) => i).filter((i) => groups[i].length); if (used.length < 2) return;
  const list = document.createElement('div'); list.className = 'ax-tabs'; list.setAttribute('role', 'tablist'); list.setAttribute('aria-label', 'Method');
  const h2 = card.querySelector('h2'); h2.after(list);
  const tabs = [], panels = [];
  used.forEach((i, k) => { const id = 'axm-' + i, b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.id = id + '-t'; b.setAttribute('aria-controls', id); b.textContent = TABS[i];
    const pn = document.createElement('div'); pn.className = 'ax-panel'; pn.id = id; pn.setAttribute('role', 'tabpanel'); pn.setAttribute('aria-labelledby', b.id); pn.dataset.title = TABS[i]; groups[i].forEach((p) => pn.appendChild(p));
    list.appendChild(b); card.appendChild(pn); tabs.push(b); panels.push(pn); });
  const show = (k, focus) => { tabs.forEach((b, j) => { b.setAttribute('aria-selected', String(j === k)); b.tabIndex = j === k ? 0 : -1; panels[j].hidden = j !== k; }); if (focus) tabs[k].focus(); };
  tabs.forEach((b, k) => { b.addEventListener('click', () => show(k));
    b.addEventListener('keydown', (e) => { const c = e.key; if (c === 'ArrowRight' || c === 'ArrowLeft' || c === 'Home' || c === 'End') { e.preventDefault(); show(c === 'Home' ? 0 : c === 'End' ? tabs.length - 1 : (k + (c === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length, true); } }); });
  show(0);
})();

/* Usability pass, 24 November 2026.
   On phones each row of choice buttons becomes one compact menu, so four rows of controls fit in two short lines.
   Once the controls scroll out of sight, a one-line "Showing" strip under the section menu says what is chosen and
   leads back to them. A skip link takes keyboard users past the navigation. */
(function () {
  const main = document.querySelector('main.ax'); if (!main) return;
  if (!main.id) main.id = 'ax-main';
  const skip = document.createElement('a'); skip.className = 'ax-skip'; skip.href = '#' + main.id; skip.textContent = 'Skip to the figures'; document.body.insertBefore(skip, document.body.firstChild);
  const bar = document.querySelector('.ax-controls'); if (!bar) return;
  const segs = () => [...bar.querySelectorAll('.ax-seg')];
  const sync = () => { segs().forEach((seg) => { const btns = [...seg.querySelectorAll('button')]; let sel = seg.parentNode.querySelector('select.ax-msel');
      const sig = btns.map((b) => b.textContent).join('|');
      if (!sel) { sel = document.createElement('select'); sel.className = 'ax-msel'; const lab = seg.getAttribute('aria-labelledby'), l = lab && document.getElementById(lab); sel.setAttribute('aria-label', l ? l.textContent : 'Choose');
        sel.addEventListener('change', () => { const b = [...seg.querySelectorAll('button')][sel.selectedIndex]; if (b) b.click(); }); seg.after(sel); }
      if (sel.dataset.sig !== sig) { sel.innerHTML = ''; btns.forEach((b) => sel.appendChild(new Option(b.textContent))); sel.dataset.sig = sig; }
      const on = btns.findIndex((b) => b.getAttribute('aria-pressed') === 'true'); if (on >= 0) sel.selectedIndex = on; });
    strip(); };
  // the "Showing" strip
  const nav = document.querySelector('.ax-secnav'); let st = null, out = false;
  const strip = () => { if (!nav) return; if (!st) { st = document.createElement('div'); st.className = 'ax-showing'; st.hidden = true; st.innerHTML = '<span></span><button type="button">Change</button>'; nav.appendChild(st);
      st.querySelector('button').addEventListener('click', () => bar.scrollIntoView({block: 'center', behavior: 'auto'})); }
    const parts = segs().filter((s) => s.parentNode.offsetParent !== null || s.offsetParent !== null).map((s) => { const b = s.querySelector('button[aria-pressed=true]'); return b ? b.textContent : null; }).filter(Boolean);
    const pick = bar.querySelector('select.ax-select'); if (pick && pick.selectedOptions[0]) parts.unshift(pick.selectedOptions[0].textContent);
    st.querySelector('span').innerHTML = '<b>Showing</b> ' + parts.join(' · '); st.hidden = !(out && parts.length); };
  new MutationObserver(() => sync()).observe(bar, {subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'hidden'], childList: true});
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { out = !es[0].isIntersecting && es[0].boundingClientRect.top < 0; strip(); }).observe(bar);
  bar.addEventListener('change', () => setTimeout(strip, 0));
  sync();
})();

/* One "Copy link" for the page, in the header, in place of one under every chart. */
(function () {
  const hero = document.querySelector('.ax-hero-in'); if (!hero || document.documentElement.classList.contains('ax-brief')) return;
  let row = hero.querySelector('.ax-head-row'); if (!row) { row = document.createElement('div'); row.className = 'ax-head-row'; (hero.querySelector('.ax-top') || hero).appendChild(row); }
  const b = document.createElement('button'); b.type = 'button'; b.className = 'ax-btn ax-copy'; b.textContent = 'Copy link';
  b.addEventListener('click', () => { const done = (ok) => { b.textContent = ok ? 'Link copied' : 'Could not copy'; setTimeout(() => { b.textContent = 'Copy link'; }, 2000); };
    try { navigator.clipboard.writeText(location.href).then(() => done(true), () => done(false)); } catch (e) { done(false); } });
  row.appendChild(b);
})();

/* On phones the answer comes first: where a page opens with a Summary, the controls sit directly beneath it. */
(function () {
  const bar = document.querySelector('.ax-controls'), mq = matchMedia('(max-width: 480px)'); if (!bar) return;
  const home = bar.parentNode, next = bar.nextSibling;
  const place = () => { const sum = document.querySelector('main.ax section[data-nav="Summary"]');
    if (mq.matches && sum) { if (sum.nextSibling !== bar) sum.after(bar); bar.classList.add('ax-controls-below'); }
    else if (bar.parentNode !== home || bar.classList.contains('ax-controls-below')) { home.insertBefore(bar, next && next.parentNode === home ? next : home.firstChild); bar.classList.remove('ax-controls-below'); } };
  mq.addEventListener ? mq.addEventListener('change', place) : mq.addListener(place); place();
})();

/* Saved places follow the reader: on every page except Areas (which shows them at the top), the list sits
   above the method section once something is saved. */
(function () {
  if (!window.AXtools || document.getElementById('ax-places') || document.documentElement.classList.contains('ax-brief')) return;
  const method = document.querySelector('main.ax .ax-method'); if (!method) return;
  const host = document.createElement('div'); host.id = 'ax-places-foot'; method.parentNode.insertBefore(host, method);
  try { AXtools.renderPins(host); } catch (e) { host.remove(); }
})();

/* Feedback, as on the Ofsted Explorer: one form at the foot of every page, posted to /api/feedback (the same private
   store), with the address of the page attached so the place and the choices on screen come with the message. */
(function () {
  const method = document.querySelector('main.ax .ax-method'); if (!method || document.documentElement.classList.contains('ax-brief')) return;
  const s = document.createElement('section'); s.className = 'ax-card ax-fb'; s.dataset.nav = 'Feedback'; s.id = 'feedback';
  s.innerHTML = '<h2>Tell me what to improve</h2>'
    + '<p class="ax-sub">Spotted a figure that looks wrong, want something added, or have a question about the data? Every message is read.</p>'
    + '<form novalidate>'
    + '<div class="ax-fbrow"><label for="ax-fb-type">What is it about?</label><select id="ax-fb-type" name="type" class="ax-select"><option value="suggestion">A suggestion or feature</option><option value="error">Something looks wrong</option><option value="data">A question about the data</option><option value="other">Something else</option></select></div>'
    + '<div class="ax-fbrow"><label for="ax-fb-msg">Your message</label><textarea id="ax-fb-msg" name="message" rows="5" maxlength="4000" required placeholder="The more specific the better: which place, which chart, what you expected to see."></textarea></div>'
    + '<div class="ax-fbrow ax-fbhp" aria-hidden="true"><label for="ax-fb-web">Leave this empty</label><input id="ax-fb-web" name="website" tabindex="-1" autocomplete="off"></div>'
    + '<div class="ax-fbrow"><label class="ax-fbchk"><input type="checkbox" id="ax-fb-consent"> I&rsquo;d like a reply. Keep my email address for that.</label>'
    + '<input type="email" id="ax-fb-email" name="email" placeholder="Email address (optional)" autocomplete="email" disabled></div>'
    + '<p class="ax-fbnote">Messages are stored privately on this site&rsquo;s hosting and read only by Mark Dalton, to improve the Attendance Explorer. The address of the page you were viewing is attached. Your email, if you give it, is used only to reply and is deleted within 12 months. Please do not include details about individual pupils or staff.</p>'
    + '<p class="ax-fbact"><button type="submit" class="ax-btn ax-fbsend">Send</button> <span id="ax-fb-note" role="status" aria-live="polite"></span></p>'
    + '</form>';
  method.after(s);
  const f = s.querySelector('form'), consent = s.querySelector('#ax-fb-consent'), email = s.querySelector('#ax-fb-email'), note = s.querySelector('#ax-fb-note'), btn = s.querySelector('.ax-fbsend');
  consent.addEventListener('change', () => { email.disabled = !consent.checked; if (consent.checked) email.focus(); else email.value = ''; });
  const say = (t, bad) => { note.textContent = t; note.className = bad ? 'bad' : ''; };
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = f.message.value.trim(); if (msg.length < 5) { say('Please write a little more.', true); f.message.focus(); return; }
    const urn = (/[?&]urn=(\d+)/.exec(location.search) || /\/school\/(\d+)/.exec(location.pathname) || [])[1] || '';
    const body = {type: f.type.value, message: msg, consent: consent.checked, email: consent.checked ? email.value.trim() : '', page: location.pathname + location.search + location.hash, urn, website: f.website.value};
    btn.disabled = true; say('Sending…');
    try {
      const r = await fetch('/api/feedback', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { f.reset(); email.disabled = true; say('Thank you. Your message has been received.'); }
      else say(j.error || 'Sorry, that did not send. Please try again later.', true);
    } catch (err) { say('Sorry, that did not send. Please check your connection and try again.', true); }
    btn.disabled = false;
  });
})();

/* How to read a chart, on request. The paragraph above each chart explains how it is drawn; now that each heading says what
   the chart shows, that paragraph is folded under "How to read this" and opens on a tap. Nothing is removed, the same element
   is kept (so pages go on writing to it), and it is opened for printing. Summary and Method keep their text in the open. */
(function () {
  const main = document.querySelector('main.ax'); if (!main || document.documentElement.classList.contains('ax-brief')) return;
  const chartAfter = (p) => { let n = p.nextElementSibling, i = 0; while (n && i++ < 3) { if (n.matches('.ax-chart, .ax-multi, .ax-tablewrap, .en-pair') || n.querySelector('.ax-chart')) return true; if (!n.matches('.ax-seg, .ax-field, .ax-controls, .en-ctl')) return false; n = n.nextElementSibling; } return false; };
  const fold = () => { main.querySelectorAll('section[data-nav] p.ax-sub').forEach((p) => { const sec = p.closest('section[data-nav]'), nav = sec.dataset.nav;
      if (nav === 'Summary' || nav === 'Method' || p.classList.length > 1 || p.parentNode.classList.contains('ax-how')) return;
      if ((p.textContent || '').trim().length < 120 || !chartAfter(p)) return;
      const d = document.createElement('details'); d.className = 'ax-how'; const s = document.createElement('summary'); s.textContent = 'How to read this'; p.before(d); d.appendChild(s); d.appendChild(p); });
    main.querySelectorAll('details.ax-how').forEach((d) => { const p = d.querySelector('p'); d.hidden = !p || p.hidden || !(p.textContent || '').trim(); }); };
  let t = null; new MutationObserver(() => { clearTimeout(t); t = setTimeout(fold, 80); }).observe(main, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden']});
  fold();
  addEventListener('beforeprint', () => main.querySelectorAll('details.ax-how').forEach((d) => { d.dataset.was = d.open ? '1' : ''; d.open = true; }));
  addEventListener('afterprint', () => main.querySelectorAll('details.ax-how').forEach((d) => { d.open = d.dataset.was === '1'; }));
})();
