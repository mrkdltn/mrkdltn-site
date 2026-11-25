// Related discoveries: up to two quiet links at the foot of the section a discovery sits beside (25 November 2026).
// The build writes /explorer/discoveries/index.json with the discoveries it built (production: published only) and,
// for each, the sections it relates to ("/explorer/areas/#results"). Nothing shows until one is built.
(() => {
  const here = /^\/explorer\/school\/\d+\/?$/.test(location.pathname) ? '/explorer/' : location.pathname.replace(/index\.html$/, '');
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  fetch('/explorer/discoveries/index.json', {cache: 'no-cache'}).then((r) => (r.ok ? r.json() : null)).then((j) => {
    if (!j || !j.discoveries || !j.discoveries.length) return;
    const by = new Map();
    j.discoveries.forEach((d) => (d.related || []).forEach((rel) => { const [p, id] = rel.split('#'); if (p !== here || !id) return;
      if (!by.has(id)) by.set(id, []); by.get(id).push(d); }));
    by.forEach((list, id) => {
      const sec = document.getElementById(id); if (!sec) return;
      const box = el('div', 'oe-disc-rel noprint');
      box.append(el('p', 'oe-disc-h', list.length > 1 ? 'Related discoveries' : 'Related discovery'));
      list.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 2).forEach((d) => {
        const p = el('p'); const a = el('a', '', d.title); a.href = d.url; p.append(a);
        if (d.status !== 'published') p.append(el('span', 'oe-disc-draft', ' (draft, preview only)'));
        box.append(p); });
      sec.append(box); });
  }).catch(() => {});
})();
