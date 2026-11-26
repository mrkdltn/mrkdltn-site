/* Get the data page: fills in the data version, file sizes and checksums from build.json, names each download
   with the data version, and draws the data dictionary from dictionary.csv. */
(() => {
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const fmtDate = (iso) => new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : '')).toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London'});
  const fmtTime = (iso) => new Date(iso).toLocaleString('en-GB', {day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London'});
  const size = (b) => (b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB');

  // CSV with quoted fields (RFC 4180)
  const parse = (t) => { const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < t.length; i++) { const c = t[i];
      if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; } else if (c !== '\r') f += c; }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows; };

  fetch('/explorer/data/build.json', {cache: 'no-cache'}).then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then((b) => {
    const v = b.version || b.built.slice(0, 10);
    $('gd-version').textContent = v; $('gd-cite-ver').textContent = v;
    $('gd-built').textContent = fmtTime(b.built) + ' (UK time)';
    $('gd-insp').textContent = b.latest_inspection ? fmtDate(b.latest_inspection) + (b.latest_published ? '; newest report card read was published ' + fmtDate(b.latest_published) : '') : '—';
    const c = $('gd-commit'); c.textContent = '';
    if (b.commit) { const a = el('a', 'sha', b.commit.slice(0, 12)); a.href = 'https://github.com/mrkdltn/mrkdltn-site/tree/' + b.commit; c.append(a); } else c.textContent = 'not recorded';
    if (b.small_groups_suppressed !== undefined) $('gd-supp').textContent = 'In this version that is ' + b.small_groups_suppressed + ' figures.';
    const files = b.downloads || {};
    $('gd-files').querySelectorAll('tr').forEach((tr) => { const a = tr.querySelector('a'); const name = a.getAttribute('href').replace('csv/', ''); const f = files[name]; if (!f) return;
      a.setAttribute('download', 'ofsted-explorer-' + name.replace('.csv', '') + '-' + v + '.csv');
      tr.cells[1].append(el('span', 'fsize', ' ' + f.rows.toLocaleString('en-GB') + ' rows, ' + size(f.bytes) + '.'));
      const s = el('code', 'sha', f.sha256); s.title = 'SHA-256 checksum of ' + name; tr.cells[2].replaceChildren(s); });
  }).catch(() => { $('gd-version').textContent = 'Not available just now: see build.json'; });

  fetch('/explorer/data/csv/dictionary.csv', {cache: 'no-cache'}).then((r) => (r.ok ? r.text() : Promise.reject(r.status))).then((t) => {
    const rows = parse(t); const head = rows.shift(); const ix = (k) => head.indexOf(k);
    const by = new Map(); rows.forEach((r) => { if (r.length < head.length) return; const k = r[ix('file')]; if (!by.has(k)) by.set(k, []); by.get(k).push(r); });
    const box = $('gd-dict'); box.replaceChildren();
    by.forEach((list, file) => { const d = el('details'); if (file === 'secondaries.csv') d.open = true;
      d.append(el('summary', '', file + ' · ' + list.length + ' columns'));
      const tw = el('div', 'tw'); const tb = el('table', 'dict'); const th = el('thead'); const hr = el('tr');
      ['Column', 'Meaning', 'Unit', 'Source'].forEach((h) => hr.append(el('th', '', h))); th.append(hr); tb.append(th);
      const body = el('tbody'); list.forEach((r) => { const tr = el('tr'); const c0 = el('td'); c0.append(el('code', '', r[ix('column')])); tr.append(c0, el('td', '', r[ix('meaning')]), el('td', '', r[ix('unit')]), el('td', '', r[ix('source')])); body.append(tr); });
      tb.append(body); tw.append(tb); d.append(tw); box.append(d); });
  }).catch(() => { $('gd-dict').replaceChildren(el('p', '', 'The dictionary could not be loaded just now. Download dictionary.csv above.')); });
})();
