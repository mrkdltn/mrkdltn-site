/* Attendance Explorer: tabs for a long page. The same sections, organised: one part of the page is shown at a time under a
   bar that travels with the reader, in place of the section menu. Nothing is removed. On every page of the tool
   (25 November 2026). A tab with nothing in it for a kind of place is not offered. Must load before chrome.js, which leaves the section menu alone when window.AXtabs exists.
   The tab is kept in the address (tab=), so a copied link opens the same part; an old link to #sec-<name> opens the tab that
   holds that section. Every tab is shown when the page is printed. */
(function () {
  const q = new URLSearchParams(location.search), host = document.getElementById('ax-secnav'), main = document.querySelector('main.ax');
  if (!host || !main || q.get('brief') || !main.querySelector('section[data-nav]')) return;
  const M = ['method', 'Method', ['Method', 'Feedback']], path = location.pathname;
  const TABS = /\/attendance\/school\//.test(path) ? [['overview', 'Overview', ['Summary', 'Three ways']], ['compare', 'Compare', ['Position', 'Side by side']], ['time', 'Over time', ['Year by year', 'Since 2018/19']], M]
    : /\/attendance\/patterns\//.test(path) ? [['overview', 'Disadvantage', ['Free school meals', 'Circumstances']], ['time', 'Over time', ['Distribution', 'Severe absence', 'Day by day']], ['regions', 'Regions', ['Regions', 'Enforcement']], M]
    : /\/attendance\/(index\.html)?$/.test(path) ? [['overview', 'This year', ['Summary', 'Day by day']], ['weeks', 'Week by week', ['Week by week', 'Weekdays']], ['reasons', 'Reasons', ['Reasons']], ['areas', 'Other areas', ['Map', 'Against last year']], M]
    : [['overview', 'Overview', ['Summary', 'Side by side', 'Year by year', 'Compared']], ['pupils', 'Pupils', ['Pupil groups']], ['schools', 'Schools', ['School by school', 'The schools']], ['enforcement', 'Enforcement', ['Enforcement']], M];
  const slug = (n) => 'sec-' + n.toLowerCase().replace(/[^a-z0-9]+/g, '-'), tabOf = (nav) => (TABS.find((t) => t[2].includes(nav)) || TABS[0])[0];
  const want = location.hash.replace(/^#/, ''), fromHash = TABS.find((t) => t[2].some((n) => slug(n) === want));
  const T = {current: fromHash ? fromHash[0] : TABS.some((t) => t[0] === q.get('tab')) ? q.get('tab') : 'overview'};
  let wanted = T.current; Object.defineProperty(T, 'wanted', {get: () => wanted});          // the tab asked for; shown as soon as its sections have something in them
  window.AXtabs = T;
  host.setAttribute('role', 'tablist'); host.setAttribute('aria-label', 'Parts of this page');
  const btn = {}; TABS.forEach(([key, label]) => { const a = document.createElement('a'); a.href = '#tab-' + key; a.textContent = label; a.setAttribute('role', 'tab'); a.id = 'axt-' + key;
    a.addEventListener('click', (e) => { e.preventDefault(); T.show(key, true); });
    a.addEventListener('keydown', (e) => { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; e.preventDefault(); const open = TABS.map((t) => t[0]).filter((k) => !btn[k].hidden), i = open.indexOf(key), n = open[(i + (e.key === 'ArrowRight' ? 1 : open.length - 1)) % open.length]; T.show(n, true); btn[n].focus(); });
    host.appendChild(a); btn[key] = a; });
  const secs = () => [...main.querySelectorAll('section[data-nav]')];
  let busy = false;
  const apply = () => { if (busy) return; busy = true;
    const list = secs(); list.forEach((s) => { if (!s.id) s.id = slug(s.dataset.nav); });
    TABS.forEach(([key]) => { btn[key].hidden = !list.some((s) => tabOf(s.dataset.nav) === key && !s.closest('[hidden]')); });
    const open1 = TABS.map((t) => t[0]).find((k) => !btn[k].hidden) || 'overview', now = btn[wanted].hidden ? open1 : wanted, moved = now !== T.current; T.current = now;
    list.forEach((s) => s.classList.toggle('ax-tab-off', tabOf(s.dataset.nav) !== T.current));
    // controls show only where they change something: none on Method or Enforcement (penalty notices are not published
    // by phase, pupil group or measure), and no choice of pupil group on Schools, where no pupil-group figure is published
    const bar = main.querySelector('.ax-controls'); if (bar) bar.classList.toggle('ax-tab-off', T.current === 'method' || T.current === 'enforcement');
    const pgf = document.getElementById('gx-pg-f'); if (pgf) pgf.classList.toggle('ax-tab-off', T.current === 'schools');
    const foot = document.getElementById('ax-places-foot'); if (foot) foot.classList.toggle('ax-tab-off', T.current !== 'overview');
    TABS.forEach(([key]) => { const ids = list.filter((x) => tabOf(x.dataset.nav) === key).map((x) => x.id).join(' '); if (ids) btn[key].setAttribute('aria-controls', ids); });
    TABS.forEach(([key]) => { const on = key === T.current; btn[key].classList.toggle('on', on); btn[key].setAttribute('aria-selected', String(on)); btn[key].tabIndex = on ? 0 : -1; });
    busy = false; if (moved) dispatchEvent(new Event('ax-redraw')); };
  T.show = (key, byUser) => { if (!btn[key] || btn[key].hidden) return; const changed = key !== T.current; wanted = key; T.current = key; apply();
    T.stamp();
    if (byUser) { const top = main.getBoundingClientRect().top + scrollY - host.parentNode.offsetHeight; if (scrollY > top) scrollTo(0, top); if (host.scrollWidth > host.clientWidth) host.scrollTo({left: btn[key].offsetLeft - 40}); }
    if (changed) dispatchEvent(new Event('ax-redraw')); };          // charts drawn while their tab was closed had no width to draw into
  // write the open tab into the address, keeping whatever else the page holds there
  T.stamp = () => { const u = new URL(location.href); if (wanted === 'overview') u.searchParams.delete('tab'); else u.searchParams.set('tab', wanted); history.replaceState(history.state, '', u.pathname + u.search + (/^#(sec-|tab-)/.test(u.hash) ? '' : u.hash)); };
  let t = null; new MutationObserver(() => { clearTimeout(t); t = setTimeout(apply, 60); }).observe(main, {subtree: true, childList: true, attributes: true, attributeFilter: ['hidden']});
  apply();
  // an old link to a section: once the page has drawn, bring that section into view
  if (fromHash) addEventListener('load', () => setTimeout(() => { const s = secs().find((x) => slug(x.dataset.nav) === want); if (s) { const y = s.getBoundingClientRect().top + scrollY - host.parentNode.offsetHeight - 8; scrollTo(0, y); } }, 1800));
})();
