/* Attendance Explorer: school search, shared by the pulse and school pages.
   AXsearch(input, list, onPick) attaches a typeahead; the index (schools.json) loads on first focus. */
(function () {
  let idx = null, grp = [], loading = null;
  const load = () => loading || (loading = Promise.all([fetch('/attendance/data/schools.json').then((r) => r.json()), fetch('/attendance/data/groups.json').then((r) => r.json()).catch(() => null)]).then(([j, g]) => {
    if (g) grp = g.data.id.map((id, i) => ({kind: g.data.k[i], id, name: g.data.name[i], n: g.data.n[i], key: g.data.name[i].toLowerCase()}));
    const d = j.data; idx = d.urn.map((u, i) => ({urn: u, name: d.name[i], town: d.town[i], pc: d.pc[i], ph: d.ph[i],
      key: (d.name[i] + ' ' + d.town[i] + ' ' + d.pc[i] + ' ' + d.pc[i].replace(' ', '')).toLowerCase()})); return idx; }));
  const PH = {P: 'Primary', S: 'Secondary', X: 'Special'};
  const findG = (t) => grp.filter((r) => t.every((w) => r.key.includes(w))).sort((a, b) => (b.key.startsWith(t[0]) - a.key.startsWith(t[0])) || b.n - a.n).slice(0, 3);
  const find = (q, groups) => { const t = q.toLowerCase().split(/\s+/).filter(Boolean); if (!t.length) return [];
    if (groups) { const g = findG(t); return g.concat(findS(t).slice(0, 8 - g.length)); } return findS(t); };
  const findS = (t) => {
    const out = []; for (const r of idx) { if (t.every((w) => r.key.includes(w))) { out.push(r); if (out.length >= 60) break; } }
    const f = t[0]; return out.sort((a, b) => (b.name.toLowerCase().startsWith(f) - a.name.toLowerCase().startsWith(f)) || a.name.localeCompare(b.name)).slice(0, 8); };
  function AXsearch(input, list, onPick, groups) {
    if (!input || !list) return;
    let res = [], sel = -1;
    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); sel = -1; };
    const render = () => { list.innerHTML = '';
      if (!res.length) { const li = document.createElement('li'); li.className = 'none'; li.textContent = groups ? 'Nothing matches. Try a school’s town or postcode.' : 'No school matches. Try the town or postcode.'; list.appendChild(li); }
      res.forEach((r, i) => { const li = document.createElement('li'); li.setAttribute('role', 'option'); li.setAttribute('aria-selected', String(i === sel));
        li.textContent = r.name; const s = document.createElement('small'); s.textContent = r.kind ? (r.kind === 't' ? 'Trust' : 'Constituency') + ' · ' + r.n + ' schools' : [PH[r.ph], r.town, r.pc].filter(Boolean).join(' · '); li.appendChild(s);
        li.addEventListener('pointerdown', (e) => { e.preventDefault(); pick(r); }); list.appendChild(li); });
      list.hidden = false; input.setAttribute('aria-expanded', 'true'); };
    const pick = (r) => { input.value = ''; close(); input.blur(); onPick(r); };
    const run = () => { const q = input.value.trim(); if (q.length < 2) { close(); return; } load().then(() => { if (input.value.trim() !== q) return; res = find(q, groups); sel = res.length ? 0 : -1; render(); }); };
    input.addEventListener('focus', load); input.addEventListener('input', run);
    input.addEventListener('keydown', (e) => { if (list.hidden) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : res.length - 1)) % Math.max(1, res.length); render(); }
      else if (e.key === 'Enter' && res[sel]) { e.preventDefault(); pick(res[sel]); } else if (e.key === 'Escape') close(); });
    input.addEventListener('blur', () => setTimeout(close, 120));
  }
  // School pages live at /attendance/school/<urn>/ where the site runs on Cloudflare Pages; a plain file server needs ?urn=.
  const local = /^(localhost|127\.)/.test(location.hostname);
  AXsearch.href = (urn, extra) => (local ? '/attendance/school/?urn=' + urn : '/attendance/school/' + urn + '/') + (extra || '');
  AXsearch.urn = () => { const m = location.pathname.match(/\/attendance\/school\/(\d{5,7})\/?$/); return m ? m[1] : new URLSearchParams(location.search).get('urn'); };
  AXsearch.ghref = (kind, id) => '/attendance/group/?k=' + kind + '&id=' + encodeURIComponent(id);
  // one handler for pages that search everything: go to the school or the group
  AXsearch.go = (r) => { location.href = r.kind ? AXsearch.ghref(r.kind, r.id) : AXsearch.href(r.urn); };
  window.AXsearch = AXsearch;
})();
