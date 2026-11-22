/* Every chart: picture, table, download (benchmarks standards 4 and 5, 23 November 2026).

   OE.exhibit({id, host, name, title, source, table, svg}) adds, under a figure:
     - a Chart / Table switch: the table is built from the same data the chart draws;
     - Download PNG, SVG and CSV: the images carry the title, the school, the source line and the data version
       drawn inside them, on a white sheet, in the site's own fonts;
     - a source line on the page, with the data version and a link to Get the data.
   Each figure's draw code leaves what it drew on OE.xd[name]; table() and svg() read from there.
   svg() returns {node, w, h}: a live SVG to clone (styles are inlined from the page) or one built for export. */
(() => {
  const OE = window.OE; if (!OE) return;
  OE.xd = OE.xd || {};
  const NS = 'http://www.w3.org/2000/svg';
  let VER = ''; const verP = fetch('/explorer/data/build.json', {cache: 'no-cache'}).then((r) => r.json()).then((b) => { VER = b.version || (b.built || '').slice(0, 10); }).catch(() => {});
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const school = () => { const s = dash.data('school'); return s.status === 'ok' && s.data && s.data[0] ? s.data[0] : null; };
  const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const save = (blob, name) => { const a = el('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const cap = (t) => String(t).charAt(0).toUpperCase() + String(t).slice(1);
  const q = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

  // fonts, embedded in exported images so they render the same anywhere
  let FONTS = null;
  const b64 = (buf) => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const fonts = () => FONTS || (FONTS = Promise.all([['Hanken Grotesk', 'hanken-grotesk', '100 900'], ['Libre Caslon Display', 'libre-caslon-display', '400']].map(([f, file, w]) =>
    fetch('/assets/fonts/' + file + '.woff2').then((r) => r.arrayBuffer()).then((b) => '@font-face{font-family:"' + f + '";src:url(data:font/woff2;base64,' + b64(b) + ') format("woff2");font-weight:' + w + '}').catch(() => ''))).then((a) => a.join('')));

  // copy the page's computed styles onto a cloned SVG, so it looks the same outside the page
  const PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-linejoin', 'stroke-linecap', 'paint-order', 'letter-spacing', 'opacity', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline', 'visibility', 'display'];
  const DEF = {'fill-opacity': '1', stroke: 'none', 'stroke-width': '1px', 'stroke-opacity': '1', 'stroke-dasharray': 'none', 'stroke-linejoin': 'miter', 'stroke-linecap': 'butt', 'paint-order': 'normal', 'letter-spacing': 'normal', opacity: '1', visibility: 'visible', display: 'inline', 'dominant-baseline': 'auto', 'text-anchor': 'start'};
  const FONT = new Set(['font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline', 'letter-spacing']);
  // only what differs from the defaults, and font styles only on text, keeps an SVG of 3,000 dots small
  const inline = (a, b) => { if (a.nodeType !== 1) return; const cs = getComputedStyle(a), txt = /^(text|tspan|g|svg)$/.test(a.tagName);
    b.setAttribute('style', PROPS.filter((p) => txt || !FONT.has(p)).map((p) => [p, cs.getPropertyValue(p)]).filter(([p, v]) => DEF[p] !== v).map(([p, v]) => p + ':' + v).join(';'));
    for (let i = 0; i < a.children.length; i++) inline(a.children[i], b.children[i]); };

  // wrap text to a width, roughly (average glyph about 0.52 em in Hanken Grotesk)
  const wrap = (s, px, width) => { const max = Math.max(10, Math.floor(width / (px * 0.52))); const out = []; let line = '';
    String(s).split(/\s+/).forEach((w) => { if ((line + ' ' + w).trim().length > max && line) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); }); if (line) out.push(line); return out; };

  // the exported image: title, the school, the figure, then the source and data version, on white
  const compose = async (cfg, fig) => { await verP; const s = cfg.noSchool ? null : school(); const W = Math.max(fig.w, 520), pad = 28;
    // a figure drawn narrower than the image (a phone) is scaled up to fill it
    const FW = W, FH = Math.round(fig.h * W / fig.w);
    const tl = wrap(cfg.title(), 22, W), sl = s ? wrap(s.name + (s.la ? ', ' + s.la : '') + (s.urn ? ' (URN ' + s.urn + ')' : ''), 14, W) : [];
    const kl = cfg.key ? wrap(cfg.key(), 13, W) : [];
    const src = wrap('Source: ' + cap(cfg.source()) + ' Data version ' + (VER || 'unknown') + '. mrkdltn.com/explorer', 12, W);
    const top = pad + tl.length * 28 + sl.length * 19 + kl.length * 18 + 24, H = top + FH + 18 + src.length * 17 + pad;
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('xmlns', NS); svg.setAttribute('width', W + 2 * pad); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W + 2 * pad} ${H}`);
    const st = document.createElementNS(NS, 'style'); st.textContent = await fonts(); svg.append(st);
    const bg = document.createElementNS(NS, 'rect'); bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%'); bg.setAttribute('fill', '#FFFFFF'); svg.append(bg);
    const text = (str, x, y, size, fam, weight, fill) => { const t = document.createElementNS(NS, 'text'); t.setAttribute('x', x); t.setAttribute('y', y); t.setAttribute('style', `font-family:${fam};font-size:${size}px;font-weight:${weight};fill:${fill}`); t.textContent = str; svg.append(t); };
    let y = pad + 20; tl.forEach((l) => { text(l, pad, y, 22, '"Libre Caslon Display",Georgia,serif', 400, '#0B1A2E'); y += 28; });
    y -= 4; sl.forEach((l) => { text(l, pad, y + 14, 14, '"Hanken Grotesk",Arial,sans-serif', 600, '#0B1A2E'); y += 19; });
    kl.forEach((l) => { text(l, pad, y + 14, 13, '"Hanken Grotesk",Arial,sans-serif', 400, '#33405A'); y += 18; });
    const g = document.createElementNS(NS, 'svg'); g.setAttribute('x', pad); g.setAttribute('y', top); g.setAttribute('width', FW); g.setAttribute('height', FH); g.setAttribute('viewBox', `0 0 ${fig.w} ${fig.h}`); g.setAttribute('overflow', 'hidden');
    [...fig.node.childNodes].forEach((c) => g.append(c)); svg.append(g);
    const rule = document.createElementNS(NS, 'line'); rule.setAttribute('x1', pad); rule.setAttribute('x2', W + pad); rule.setAttribute('y1', top + FH + 8); rule.setAttribute('y2', top + FH + 8); rule.setAttribute('style', 'stroke:#C9A24B;stroke-width:1'); svg.append(rule);
    y = top + FH + 26; src.forEach((l) => { text(l, pad, y, 12, '"Hanken Grotesk",Arial,sans-serif', 400, '#55627A'); y += 17; });
    return {str: new XMLSerializer().serializeToString(svg), w: W + 2 * pad, h: H}; };

  const figure = async (cfg) => { const f = await cfg.svg(); if (!f) return null; if (f.live) { const c = f.node.cloneNode(true); inline(f.node, c); c.querySelectorAll('[class]').forEach((n) => n.removeAttribute('class')); return {node: c, w: f.w, h: f.h}; } return f; };
  const fname = (cfg, ext) => { const s = cfg.noSchool ? null : school(); return 'ofsted-explorer-' + cfg.name + (s ? '-' + s.urn + '-' + slug(s.name) : '') + (VER ? '-' + VER : '') + '.' + ext; };

  OE.exhibit = (cfg) => {
    const host = cfg.host; if (!host || host.dataset.exhibit) return; host.dataset.exhibit = cfg.name;
    const bar = el('div', 'oe-xbar noprint'); const seg = el('div', 'oe-xseg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Show as');
    const bC = el('button', '', 'Chart'), bT = el('button', '', 'Table'); [bC, bT].forEach((b) => { b.type = 'button'; seg.append(b); }); bC.setAttribute('aria-pressed', 'true'); bT.setAttribute('aria-pressed', 'false');
    const dl = el('div', 'oe-xdl'); dl.append(el('span', '', 'Download'));
    const tw = el('div', 'oe-tw oe-xtab'); tw.hidden = true; tw.id = 'oe-xt-' + cfg.name; bT.setAttribute('aria-controls', tw.id);
    const srcP = el('p', 'oe-xsrc'); srcP.title = 'Tap to show the full source';
    srcP.addEventListener('click', (e) => { if (e.target.tagName !== 'A') srcP.classList.toggle('open'); });
    const fill = () => { const t = cfg.table(); tw.replaceChildren(); if (!t || !t.rows.length) { tw.append(el('p', 'oe-note', 'Nothing to show for this school.')); return; }
      const tb = el('table'); if (t.caption) tb.append(el('caption', 'sr-only', t.caption)); const th = el('thead'), hr = el('tr'); t.cols.forEach((c, i) => { const h = el('th', t.num && t.num[i] ? 'n' : '', c); h.scope = 'col'; hr.append(h); }); th.append(hr); tb.append(th);
      const body = el('tbody'); t.rows.forEach((r) => { const tr = el('tr'); if (r.self) tr.className = 'self'; r.cells.forEach((v, i) => tr.append(el('td', t.num && t.num[i] ? 'n' : '', v === null || v === undefined || v === '' ? '—' : String(v)))); body.append(tr); }); tb.append(body); tw.append(tb);
      if (t.note) tw.append(el('p', 'oe-note', t.note)); };
    const setSrc = () => { srcP.replaceChildren('Source: ' + cap(cfg.source()) + (VER ? ' Data version ' + VER + '. ' : ' '), Object.assign(el('a', '', 'About this data'), {href: '/explorer/data/'})); };
    verP.then(setSrc); setSrc();
    const show = (table) => { bC.setAttribute('aria-pressed', String(!table)); bT.setAttribute('aria-pressed', String(table)); host.hidden = table; (cfg.hideAlso || []).forEach((e) => { if (e) e.hidden = table; }); tw.hidden = !table; if (table) fill(); else if (cfg.onChart) cfg.onChart(); };
    bC.addEventListener('click', () => show(false)); bT.addEventListener('click', () => show(true));
    const busy = (b, f) => async () => { const t = b.textContent; b.disabled = true; try { await f(); } catch (e) { console.error(e); } b.disabled = false; b.textContent = t; };
    const bP = el('button', '', 'PNG'), bS = el('button', '', 'SVG'), bV = el('button', '', 'CSV'); [bP, bS, bV].forEach((b) => { b.type = 'button'; dl.append(b); });
    bP.setAttribute('aria-label', 'Download this chart as a PNG image'); bS.setAttribute('aria-label', 'Download this chart as an SVG image'); bV.setAttribute('aria-label', 'Download this chart\'s data as CSV');
    bS.addEventListener('click', busy(bS, async () => { const f = await figure(cfg); if (!f) return; const o = await compose(cfg, f); save(new Blob([o.str], {type: 'image/svg+xml'}), fname(cfg, 'svg')); }));
    bP.addEventListener('click', busy(bP, async () => { const f = await figure(cfg); if (!f) return; const o = await compose(cfg, f); const k = 2;
      const img = new Image(); img.src = 'data:image/svg+xml;base64,' + b64(new TextEncoder().encode(o.str)); await img.decode();
      const cv = el('canvas'); cv.width = o.w * k; cv.height = o.h * k; const x = cv.getContext('2d'); x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(img, 0, 0, cv.width, cv.height);
      save(await new Promise((r) => cv.toBlob(r, 'image/png')), fname(cfg, 'png')); }));
    bV.addEventListener('click', busy(bV, async () => { await verP; const t = cfg.table(); if (!t) return; const s = school();
      const head = (t.csvCols || t.cols).concat(['source', 'data_version']); const rows = (t.csv || t.rows.map((r) => r.cells)).map((r) => r.concat([cfg.source(), VER]));
      const body = [head].concat(rows).map((r) => r.map(q).join(',')).join('\n') + '\n'; save(new Blob([body], {type: 'text/csv;charset=utf-8'}), fname(cfg, 'csv')); }));
    // options: noTable (the figure already is a table), kinds (which downloads)
    const kinds = cfg.kinds || ['PNG', 'SVG', 'CSV']; [bP, bS, bV].forEach((b) => { if (!kinds.includes(b.textContent)) b.remove(); });
    if (cfg.noTable) seg.hidden = true;
    bar.append(seg, dl); host.after(bar); bar.after(tw); tw.after(srcP);
    // keep an open table in step with the chart: redraws replace the chart's children, data changes fire onData
    // a figure with nothing to show (a primary school's method figures, say) shows no toolbar or source
    const has = () => { try { const t = cfg.table(); return !!t && ((t.rows && t.rows.length) || (t.csv && t.csv.length)); } catch (e) { return false; } };
    const sync = () => { const h = has(); bar.hidden = !h; srcP.hidden = !h; if (!h && !tw.hidden) show(false); if (!tw.hidden) fill(); setSrc(); };
    new MutationObserver(sync).observe(host, {childList: true}); dash.onData(() => requestAnimationFrame(sync)); sync();
  };
})();
