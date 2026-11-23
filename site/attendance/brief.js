/* Attendance Explorer: briefing mode.
   Any page of the Explorer becomes a short document when its address carries
     brief=<role>                  head | trust | governor | la | press | parent (anything else gives a plain title)
     show=<comma list>             the data-nav names of the sections to keep, in the order to show them
   for example /attendance/group/?k=a&id=E08000025&brief=la&show=Summary,Pupil%20groups
   Method is always kept, last. With no show list every section stays. Without brief this file does nothing. */
(function () {
  const read = (s) => new URLSearchParams(s);
  let P = read(location.search);
  if (P.get('brief') === null) { const h = read(location.hash.slice(1)); if (h.get('brief') !== null) P = h; }
  // a page may already have rewritten its address before this file ran: the address the page was opened with still says
  if (P.get('brief') === null) { try { const n = performance.getEntriesByType('navigation')[0]; if (n && n.name) { const u = new URL(n.name);
    if (u.origin === location.origin && u.pathname === location.pathname) P = read(u.search); } } catch (e) { /* no record: leave the page alone */ } }
  if (P.get('brief') === null) return;
  const role = (P.get('brief') || '').toLowerCase();
  const showRaw = P.get('show') || '';
  const show = showRaw.split(',').map((s) => s.trim()).filter((s) => s && s !== 'Method');

  const TITLE = {head: 'A headteacher’s briefing', trust: 'A trust leader’s briefing', governor: 'A governor’s briefing',
    la: 'A local authority briefing', press: 'A briefing for reporting', parent: 'A parent’s briefing'};
  // how each section is described in the sentence under the title
  const SAYS = {'Summary': 'the latest figures', 'Three ways': 'the school beside England, its local authority and similar schools',
    'Position': 'where it sits among schools of its phase', 'Year by year': 'the record year by year', 'Since 2018/19': 'the change since 2018/19',
    'Side by side': 'a side-by-side table', 'Pupil groups': 'absence by pupil group', 'School by school': 'the spread across its schools',
    'Compared': 'how it compares with others of its kind', 'The schools': 'the list of its schools', 'Day by day': 'the calendar of school days',
    'Week by week': 'the record week by week', 'Weekdays': 'the pattern across the week', 'Reasons': 'the reasons for absence',
    'Map': 'the map of local authorities', 'Against last year': 'the comparison with last year'};

  // Pages rewrite their own address as they draw, which would drop brief and show: put them back each time,
  // so the briefing survives a refresh and "Copy link" copies a briefing.
  const keep = (u) => { try { const x = new URL(u, location.href); if (x.origin !== location.origin) return u;
    const q = x.search.replace(/^\?/, '').split('&').filter((p) => p && !/^(brief|show)=/.test(p));
    q.push('brief=' + encodeURIComponent(role)); if (show.length) q.push('show=' + show.map(encodeURIComponent).join(','));
    return x.pathname + '?' + q.join('&') + x.hash; } catch (e) { return u; } };
  ['replaceState', 'pushState'].forEach((fn) => { const o = history[fn].bind(history); history[fn] = (s, t, u) => o(s, t, u == null ? u : keep(u)); });
  const full = () => { const x = new URL(location.href); const q = x.search.replace(/^\?/, '').split('&').filter((p) => p && !/^(brief|show)=/.test(p));
    const h = x.hash.replace(/^#/, '').split('&').filter((p) => p && !/^(brief|show)=/.test(p));
    return x.pathname + (q.length ? '?' + q.join('&') : '') + (h.length ? '#' + h.join('&') : ''); };

  document.documentElement.classList.add('ax-brief');   // the stylesheet hides the hero's controls from the first paint

  function init() {
    const main = document.querySelector('main.ax'); if (!main) return;
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const set = (e, t) => { if (e.textContent !== t) e.textContent = t; };
    const today = new Date().toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'});

    const head = el('section', 'ax-card ax-brief-head'); head.setAttribute('aria-label', 'Briefing');
    const site = el('p', 'ax-brief-site', 'mrkdltn.com/attendance');
    const label = el('p', 'ax-brief-label', 'Briefing');
    const title = el('h2', 'ax-brief-title');
    const meta = el('p', 'ax-brief-meta');
    const date = el('p', 'ax-brief-date', today);
    const says = el('p', 'ax-brief-says');
    const acts = el('div', 'ax-brief-actions');
    const bPrint = el('button', 'ax-btn ax-brief-primary', 'Print or save as PDF'); bPrint.type = 'button';
    const bCopy = el('button', 'ax-btn', 'Copy link'); bCopy.type = 'button';
    const aFull = el('a', 'ax-btn ax-brief-full', 'See the full page'); aFull.href = full();
    const status = el('span', 'ax-brief-status'); status.setAttribute('role', 'status');
    acts.append(bPrint, bCopy, aFull, status);
    head.append(site, label, title, meta, date, says, acts);
    main.insertBefore(head, main.firstChild);
    const foot = el('p', 'ax-brief-foot'); main.appendChild(foot);

    bPrint.addEventListener('click', () => window.print());
    aFull.addEventListener('click', () => { aFull.href = full(); });
    bCopy.addEventListener('click', () => { const url = location.origin + keep(location.href);
      const done = (ok) => { set(status, ok ? 'Link copied' : 'Copy the address from your browser’s address bar'); setTimeout(() => set(status, ''), 4000); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => done(true), () => done(false)); else done(false); });

    const h1 = document.querySelector('.ax-hero h1') || document.querySelector('h1');
    const metaSrc = document.querySelector('.ax-hero .ax-top .ax-date');
    const list = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
    const pressed = (id) => { const b = document.querySelector('#' + id + ' button[aria-pressed="true"]'); const f = b && b.closest('.ax-field');
      return b && !(f && f.hidden) ? b.textContent.trim() : ''; };

    function apply() {
      const secs = [...main.querySelectorAll('section[data-nav]')];
      // the chosen order is applied only where the kept sections sit together in one column of their own (school and group pages)
      const homes = new Set(secs.filter((s) => show.includes(s.dataset.nav)).map((s) => s.parentElement)), sort = homes.size === 1 && !homes.has(main);
      secs.forEach((s) => { const n = s.dataset.nav, i = show.indexOf(n), off = show.length > 0 && n !== 'Method' && i < 0;
        s.classList.toggle('ax-brief-off', off);
        const o = sort && i >= 0 ? String(i + 1) : ''; if (s.style.order !== o) s.style.order = o; });
      const place = h1 ? h1.textContent.trim() : '';
      set(title, (TITLE[role] || 'A briefing') + (place ? ': ' + place : ''));
      set(meta, metaSrc ? metaSrc.textContent.trim() : '');
      const seen = secs.filter((s) => s.dataset.nav !== 'Method' && !s.classList.contains('ax-brief-off') && !s.hidden && s.offsetParent !== null).map((s) => s.dataset.nav);
      const inOrder = show.length ? show.filter((n) => seen.includes(n)) : seen;
      const parts = inOrder.map((n) => SAYS[n] || n.toLowerCase());
      const setting = [pressed('gx-phase'), pressed('gx-meas') && pressed('gx-meas') + ' absence', pressed('gx-view')].filter(Boolean);
      set(says, (parts.length ? 'This briefing gives ' + list(parts) + ', with sources and method at the end. ' : 'Sources and method are at the end. ')
        + (setting.length ? 'Shown for: ' + setting.join(', ').toLowerCase() + '. ' : '')
        + 'It is a reading of published DfE data, not a judgement.');
      set(foot, (document.body.dataset.axSource || 'Source: Department for Education.') + ' Made ' + today + ' at mrkdltn.com' + full().split('#')[0]);
    }
    let t = null; const later = () => { clearTimeout(t); t = setTimeout(apply, 60); };
    new MutationObserver(later).observe(main, {subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'aria-pressed']});
    const hero = document.querySelector('.ax-hero'); if (hero) new MutationObserver(later).observe(hero, {subtree: true, childList: true, characterData: true});
    if (location.pathname + location.search + location.hash !== keep(location.href)) history.replaceState(history.state, '', location.href);
    apply();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
