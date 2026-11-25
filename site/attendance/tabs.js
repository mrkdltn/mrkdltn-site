/* Attendance Explorer: tabs for a long page. The same sections, organised: one part of the page is shown at a time under a
   bar that travels with the reader, in place of the section menu. Nothing is removed. On local authority pages first
   (25 November 2026). Must load before chrome.js, which leaves the section menu alone when window.AXtabs exists.
   The tab is kept in the address (tab=), so a copied link opens the same part; an old link to #sec-<name> opens the tab that
   holds that section. Every tab is shown when the page is printed. */
(function () {
  const q = new URLSearchParams(location.search), host = document.getElementById('ax-secnav'), main = document.querySelector('main.ax');
  if (!host || !main || q.get('k') !== 'a' || q.get('brief')) return;
  const TABS = [['overview', 'Overview', ['Summary', 'Side by side', 'Year by year', 'Compared']], ['pupils', 'Pupils', ['Pupil groups']], ['schools', 'Schools', ['School by school', 'The schools']],
    ['enforcement', 'Enforcement', ['Enforcement']], ['method', 'Method', ['Method', 'Feedback']]];
  const slug = (n) => 'sec-' + n.toLowerCase().replace(/[^a-z0-9]+/g, '-'), tabOf = (nav) => (TABS.find((t) => t[2].includes(nav)) || TABS[0])[0];
  const want = location.hash.replace(/^#/, ''), fromHash = TABS.find((t) => t[2].some((n) => slug(n) === want));
  const T = {current: fromHash ? fromHash[0] : TABS.some((t) => t[0] === q.get('tab')) ? q.get('tab') : 'overview'};
  let wanted = T.current;          // the tab asked for; shown as soon as its sections have something in them
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
    TABS.forEach(([key]) => { btn[key].hidden = !list.some((s) => tabOf(s.dataset.nav) === key && !s.hidden); });
    const now = btn[wanted].hidden ? 'overview' : wanted, moved = now !== T.current; T.current = now;
    list.forEach((s) => s.classList.toggle('ax-tab-off', tabOf(s.dataset.nav) !== T.current));
    const bar = main.querySelector('.ax-controls'); if (bar) bar.classList.toggle('ax-tab-off', T.current === 'method');
    const foot = document.getElementById('ax-places-foot'); if (foot) foot.classList.toggle('ax-tab-off', T.current !== 'overview');
    TABS.forEach(([key]) => { const on = key === T.current; btn[key].classList.toggle('on', on); btn[key].setAttribute('aria-selected', String(on)); btn[key].tabIndex = on ? 0 : -1; });
    busy = false; if (moved) dispatchEvent(new Event('ax-redraw')); };
  T.show = (key, byUser) => { if (!btn[key] || btn[key].hidden) return; const changed = key !== T.current; wanted = key; T.current = key; apply();
    const u = new URL(location.href); if (key === 'overview') u.searchParams.delete('tab'); else u.searchParams.set('tab', key); history.replaceState(null, '', u.pathname + u.search);
    if (byUser) { const top = main.getBoundingClientRect().top + scrollY - host.parentNode.offsetHeight; if (scrollY > top) scrollTo(0, top); if (host.scrollWidth > host.clientWidth) host.scrollTo({left: btn[key].offsetLeft - 40}); }
    if (changed) dispatchEvent(new Event('ax-redraw')); };          // charts drawn while their tab was closed had no width to draw into
  let t = null; new MutationObserver(() => { clearTimeout(t); t = setTimeout(apply, 60); }).observe(main, {subtree: true, childList: true, attributes: true, attributeFilter: ['hidden']});
  apply();
  // an old link to a section: once the page has drawn, bring that section into view
  if (fromHash) addEventListener('load', () => setTimeout(() => { const s = document.getElementById(want); if (s) s.scrollIntoView({block: 'start'}); }, 1500));
})();
