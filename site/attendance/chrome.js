/* Attendance Explorer: the section menu that travels down the page, as in the Ofsted Explorer.
   It lists the sections on screen (those marked data-nav and not hidden), keeps the current one underlined,
   and rebuilds itself when a view shows or hides a section. */
(function () {
  const host = document.getElementById('ax-secnav'); if (!host) return;
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
  const WHERE = {'Source': 3, 'Sources': 3, 'Map': 3, 'Maps': 3, 'Ofsted': 3,
    'Similar schools': 1, 'England and the local authority': 1, 'The funnel': 1, 'Change': 1, 'Last year': 1, 'Trusts over time': 1, 'Pupil groups': 1,
    'Local authorities': 2, 'Wards': 2, 'Counties': 2, 'Constituencies': 2, 'Trusts': 2, 'Schools that changed': 2,
    'What is withheld': 4, 'What is not shown': 4, 'Small schools': 4, 'When a pooled rate is shown': 4, 'Small numbers': 4,
    'Not the termly statistics': 5, 'No expected rate': 5, 'Special schools': 5};
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
