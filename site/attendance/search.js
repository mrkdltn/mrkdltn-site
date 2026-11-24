/* Attendance Explorer: school search, shared by the pulse and school pages.
   AXsearch(input, list, onPick) attaches a typeahead; the index (schools.json) loads on first focus. */
(function () {
  let idx = null, grp = [], loading = null;
  const load = () => loading || (loading = Promise.all([fetch('/attendance/data/schools.json').then((r) => r.json()), fetch('/attendance/data/groups.json').then((r) => r.json()).catch(() => null)]).then(([j, g]) => {
    if (g) grp = g.data.id.map((id, i) => ({kind: g.data.k[i], id, name: g.data.name[i], n: g.data.n[i], key: ' ' + g.data.name[i].toLowerCase().replace(/[^a-z0-9 ]+/g, ' ')}));
    const d = j.data; idx = d.urn.map((u, i) => ({urn: u, name: d.name[i], town: d.town[i], pc: d.pc[i], ph: d.ph[i],
      key: ' ' + (d.name[i] + ' ' + d.town[i]).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ') + ' ' + (d.pc[i] + ' ' + d.pc[i].replace(' ', '')).toLowerCase()})); return idx; }));
  const PH = {P: 'Primary', S: 'Secondary', X: 'Special'};
  const findG = (t, prefer) => grp.filter((r) => t.every((w) => r.key.includes(' ' + w))).sort((a, b) => ((b.kind === prefer) - (a.kind === prefer)) || (b.key.startsWith(' ' + t[0]) - a.key.startsWith(' ' + t[0])) || ((b.kind !== 'w') - (a.kind !== 'w')) || b.n - a.n).slice(0, 4);
  const find = (q, groups, only, prefer) => { const t = q.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean); if (!t.length) return [];
    if (only) return grp.filter((r) => r.kind === only && t.every((w) => r.key.includes(' ' + w))).sort((a, b) => (b.key.startsWith(' ' + t[0]) - a.key.startsWith(' ' + t[0])) || a.name.localeCompare(b.name)).slice(0, 8);
    if (!groups) return findS(t);
    // an area or trust whose name begins with what was typed comes first; then schools; then other areas and trusts
    const g = findG(t, prefer), lead = g.filter((r) => r.kind !== 'w' && r.kind !== 'c' && r.key.startsWith(' ' + t.join(' '))).slice(0, 3), rest = g.filter((r) => !lead.includes(r));
    const sch = findS(t).slice(0, Math.max(4, 8 - lead.length - Math.min(2, rest.length))); return lead.concat(sch, rest).slice(0, 8); };
  // every school is scored, so a common name is not cut off at the first few in the list: the name beginning with the
  // words typed comes first, then every word found in the name, then matches on town or postcode
  const findS = (t) => { const phrase = ' ' + t.join(' '), out = [];
    for (const r of idx) { if (!t.every((w) => r.key.includes(' ' + w))) continue; const nm = ' ' + r.name.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ');
      out.push([nm.startsWith(phrase) ? 2 : t.every((w) => nm.includes(' ' + w)) ? 1 : 0, r]); }
    return out.sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name) || a[1].town.localeCompare(b[1].town)).slice(0, 8).map((x) => x[1]); };
  function AXsearch(input, list, onPick, groups, only, prefer) {
    if (!input || !list) return;
    let res = [], sel = -1;
    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); sel = -1; };
    const render = () => { list.innerHTML = '';
      if (!res.length) { const li = document.createElement('li'); li.className = 'none'; li.textContent = only ? 'Nothing of the same kind matches.' : groups ? 'Nothing matches. Try a school’s town or postcode.' : 'No school matches. Try the town or postcode.'; list.appendChild(li); }
      res.forEach((r, i) => { const li = document.createElement('li'); li.setAttribute('role', 'option'); li.setAttribute('aria-selected', String(i === sel));
        li.textContent = r.name; const s = document.createElement('small'); s.textContent = r.kind ? ({t: 'Trust', c: 'Constituency', w: 'Ward', y: 'County', a: 'Local authority'}[r.kind]) + ' · ' + r.n + (r.n === 1 ? ' school' : ' schools') : [PH[r.ph], r.town, r.pc].filter(Boolean).join(' · '); li.appendChild(s);
        li.addEventListener('pointerdown', (e) => { e.preventDefault(); pick(r); }); list.appendChild(li); });
      list.hidden = false; input.setAttribute('aria-expanded', 'true'); };
    const pick = (r) => { input.value = ''; close(); input.blur(); onPick(r); };
    const run = () => { const q = input.value.trim(); if (q.length < 2) { close(); return; } load().then(() => { if (input.value.trim() !== q) return; res = find(q, groups, only, prefer); sel = res.length ? 0 : -1; render(); }); };
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
