/* Attendance Explorer tools: save a card as an image, copy a link, and pin places in this browser.
   Exposed as window.AXtools. No dependencies; nothing leaves the device. */
(function () {
  'use strict';
  const INK = '#0B1A2E', MUTED = '#55627A', LINE = '#D8DDE5', BRASS_TEXT = '#7A5C14';
  const SANS = '"Hanken Grotesk", system-ui, -apple-system, "Segoe UI", Arial, sans-serif';
  const SERIF = '"Source Serif 4", Georgia, serif';
  const DISPLAY = '"Libre Caslon Display", Georgia, serif';
  const W = 800, PAD = 40, CW = W - PAD * 2, SCALE = 2, MAX_H = 8000;
  const PIN_KEY = 'ax-pins', SEEN_KEY = 'ax-seen', PIN_MAX = 12;
  const KIND = {school: 'School', group: 'Area or trust', area: 'Area, week by week'};

  /* ---------- small helpers ---------- */
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const clean = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const slug = (s) => { let t = clean(s).toLowerCase(); try { t = t.normalize('NFKD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* keep as is */ }
    t = t.replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return t.length > 60 ? t.slice(0, 61).replace(/-[^-]*$/, '') : t; };
  const shown = (n) => !!(n && n.getClientRects().length);
  const flash = (btn, text) => { if (btn._axT) clearTimeout(btn._axT); if (btn._axLabel == null) btn._axLabel = btn.textContent;
    btn.textContent = text; const st = btn.parentNode && btn.parentNode.querySelector('.ax-tools-status'); if (st) st.textContent = text;
    btn._axT = setTimeout(() => { btn.textContent = btn._axLabel; if (st) st.textContent = ''; btn._axT = null; }, 2000); };

  /* ---------- copy link ---------- */
  function copyText(text) {
    const legacy = () => new Promise((res, rej) => {
      const ta = el('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0';
      document.body.appendChild(ta); let ok = false;
      try { ta.select(); ta.setSelectionRange(0, text.length); ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove(); if (ok) res(); else rej(new Error('copy failed')); });
    try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).catch(legacy); } catch (e) { /* fall through */ }
    return legacy();
  }

  /* ---------- canvas text ---------- */
  const mctx = () => (mctx.c || (mctx.c = document.createElement('canvas').getContext('2d')));
  function setFont(ctx, f) { ctx.font = f.font; if ('letterSpacing' in ctx) ctx.letterSpacing = f.ls || '0px';
    if ('fontVariantNumeric' in ctx) { try { ctx.fontVariantNumeric = f.tab ? 'tabular-nums' : 'normal'; } catch (e) { /* not supported */ } } }
  const width = (text, f) => { const c = mctx(); setFont(c, f); return c.measureText(text).width; };
  /* runs: [{t, f}] where f = {font, color, ls?, tab?}. Returns lines of placed pieces [{t, x, f}]. */
  function wrapRuns(runs, maxW) {
    const lines = [[]]; let x = 0, pendingSpace = null;
    const put = (t, f) => { const w = width(t, f); lines[lines.length - 1].push({t, x, f}); x += w; };
    const nl = () => { lines.push([]); x = 0; pendingSpace = null; };
    runs.forEach((r) => {
      String(r.t).split(/(\s+)/).forEach((tok) => {
        if (!tok) return;
        if (/^\s+$/.test(tok)) { if (x > 0) pendingSpace = r.f; return; }
        const sp = pendingSpace ? width(' ', pendingSpace) : 0; let w = width(tok, r.f);
        if (x > 0 && x + sp + w > maxW) nl(); else if (pendingSpace) { x += sp; }
        pendingSpace = null;
        while (w > maxW && tok.length > 1) { /* a single word wider than the line: break it */
          let n = tok.length - 1; while (n > 1 && width(tok.slice(0, n), r.f) > maxW - x) n--;
          put(tok.slice(0, n), r.f); nl(); tok = tok.slice(n); w = width(tok, r.f); }
        put(tok, r.f);
      });
    });
    return lines.filter((l, i) => l.length || i === 0);
  }
  const drawLine = (ctx, line, x, y) => line.forEach((p) => { setFont(ctx, p.f); ctx.fillStyle = p.f.color; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.fillText(p.t, x + p.x, y); });

  /* ---------- svg to image ---------- */
  let fontCss = null;
  function b64(buf) { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
  /* An svg drawn as an image cannot see the page's web fonts, so the data font is embedded in it. */
  function loadFontCss() {
    if (fontCss != null) return Promise.resolve(fontCss);
    let url = '/assets/fonts/hanken-grotesk.woff2', range = '100 900';
    try { Array.from(document.styleSheets).forEach((sh) => { let rules; try { rules = sh.cssRules; } catch (e) { return; }
      Array.from(rules || []).forEach((r) => { if (r.type !== 5 || !/Hanken Grotesk/i.test(r.style.getPropertyValue('font-family'))) return;
        const m = /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(r.style.getPropertyValue('src')); if (m) { url = new URL(m[1], sh.href || location.href).href; range = r.style.getPropertyValue('font-weight') || range; } }); }); } catch (e) { /* default path */ }
    return fetch(url).then((r) => { if (!r.ok) throw new Error('font'); return r.arrayBuffer(); })
      .then((buf) => (fontCss = '@font-face{font-family:"Hanken Grotesk";src:url(data:font/woff2;base64,' + b64(buf) + ') format("woff2");font-weight:' + range + ';font-style:normal}'))
      .catch(() => (fontCss = ''));
  }
  const TEXT_PROPS = ['font-family', 'font-size', 'font-weight', 'font-style', 'fill', 'letter-spacing', 'font-variant-numeric'];
  const SHAPE_PROPS = ['fill', 'stroke', 'stroke-width'];
  const SHAPES = 'path,line,rect,circle,ellipse,polyline,polygon';
  function svgImage(svg, pxPerUnit) {
    const vbA = svg.viewBox && svg.viewBox.baseVal, r0 = svg.getBoundingClientRect();
    const vb = vbA && vbA.width ? {x: vbA.x, y: vbA.y, w: vbA.width, h: vbA.height} : {x: 0, y: 0, w: r0.width, h: r0.height};
    /* the page lets marks overflow the viewBox; widen the box so nothing is cut off */
    const box = {x: vb.x, y: vb.y, w: vb.w, h: vb.h};
    try { const bb = svg.getBBox(), lim = Math.max(vb.w, vb.h) * 0.25;
      const x0 = Math.max(vb.x - lim, Math.min(vb.x, Math.floor(bb.x - 2))), y0 = Math.max(vb.y - lim, Math.min(vb.y, Math.floor(bb.y - 2)));
      const x1 = Math.min(vb.x + vb.w + lim, Math.max(vb.x + vb.w, Math.ceil(bb.x + bb.width + 2))), y1 = Math.min(vb.y + vb.h + lim, Math.max(vb.y + vb.h, Math.ceil(bb.y + bb.height + 2)));
      if (bb.width && bb.height) { box.x = x0; box.y = y0; box.w = x1 - x0; box.h = y1 - y0; } } catch (e) { /* keep the viewBox */ }
    const clone = svg.cloneNode(true);
    const inline = (sel, props) => { const a = svg.querySelectorAll(sel), b = clone.querySelectorAll(sel);
      for (let i = 0; i < a.length && i < b.length; i++) { const cs = getComputedStyle(a[i]); props.forEach((p) => { const v = cs.getPropertyValue(p); if (v) b[i].style.setProperty(p, v); }); } };
    inline('text,tspan', TEXT_PROPS); inline(SHAPES, SHAPE_PROPS);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); clone.setAttribute('viewBox', [box.x, box.y, box.w, box.h].join(' '));
    clone.setAttribute('width', Math.max(1, Math.round(box.w * pxPerUnit))); clone.setAttribute('height', Math.max(1, Math.round(box.h * pxPerUnit)));
    clone.removeAttribute('class'); clone.style.cssText = '';
    if (fontCss) { const st = document.createElementNS('http://www.w3.org/2000/svg', 'style'); st.textContent = fontCss; clone.insertBefore(st, clone.firstChild); }
    const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
    return new Promise((res, rej) => { const img = new Image(); img.onload = () => res({img, vb, box}); img.onerror = () => rej(new Error('svg image')); img.src = src; });
  }

  /* ---------- blocks: each returns {h, draw(ctx, y)} ---------- */
  function textBlock(text, f, lh, maxW) { const lines = wrapRuns([{t: text, f}], maxW || CW), asc = f.asc;
    return {h: lines.length * lh, draw: (ctx, y) => lines.forEach((l, i) => drawLine(ctx, l, PAD, y + i * lh + asc))}; }

  /* One chart host: an optional canvas with any svgs laid over or after it, in a box boxW wide at x0. */
  function hostBlock(host, x0, boxW) {
    const hr = host.getBoundingClientRect(); if (!hr.width) return Promise.resolve(null);
    const k = boxW / hr.width, parts = [];
    host.querySelectorAll('canvas').forEach((c) => { const r = c.getBoundingClientRect(); if (r.width && r.height && c.width && c.height) parts.push({canvas: c, r}); });
    const svgs = Array.from(host.querySelectorAll('svg')).filter((s) => !s.parentNode.closest('svg') && !s.closest('.ax-key') && s.getBoundingClientRect().width > 0);
    return Promise.all(svgs.map((s) => { const r = s.getBoundingClientRect(), vbw = (s.viewBox && s.viewBox.baseVal && s.viewBox.baseVal.width) || r.width;
      return svgImage(s, (r.width * k / vbw) * SCALE).then((o) => ({svg: o, r, u: r.width * k / vbw})); })).then((imgs) => {
      parts.push.apply(parts, imgs); if (!parts.length) return null;
      let top = Infinity, bottom = -Infinity;
      parts.forEach((p) => { p.x = (p.r.left - hr.left) * k; p.y = (p.r.top - hr.top) * k; p.w = p.r.width * k; p.h = p.r.height * k;
        if (p.svg) { const o = p.svg; p.x += (o.box.x - o.vb.x) * p.u; p.y += (o.box.y - o.vb.y) * p.u; p.w = o.box.w * p.u; p.h = o.box.h * p.u; }
        top = Math.min(top, p.y); bottom = Math.max(bottom, p.y + p.h); });
      return {h: bottom - top, left: Math.min.apply(null, parts.map((p) => p.x)), right: Math.max.apply(null, parts.map((p) => p.x + p.w)),
        draw: (ctx, y, dx) => parts.forEach((p) => ctx.drawImage(p.canvas || p.svg.img, x0 + (dx || 0) + p.x, y - top + p.y, p.w, p.h))};
    });
  }
  function chartBlock(host) {
    return hostBlock(host, PAD, CW).then((b) => { if (!b) return null;
      /* overflowing marks may reach past the content box: nudge the chart back inside the sheet */
      let dx = 0; if (b.left < -PAD + 8) dx = -PAD + 8 - b.left; else if (b.right > CW + PAD - 8) dx = CW + PAD - 8 - b.right;
      return {h: b.h, draw: (ctx, y) => b.draw(ctx, y, dx)}; });
  }
  function multiBlock(multi) {
    const cols = 3, gap = 20, cw = (CW - gap * (cols - 1)) / cols, f = {font: '600 13px ' + SANS, color: INK, asc: 13};
    const boxes = Array.from(multi.children).filter((c) => shown(c) && c.querySelector('svg,canvas'));
    return Promise.all(boxes.map((bx, i) => { const x = PAD + (i % cols) * (cw + gap), h3 = bx.querySelector('h3'), t = h3 ? clean(h3.textContent) : '';
      const lines = t ? wrapRuns([{t, f}], cw) : [];
      /* scale from the svg alone so the title does not count towards the host width */
      const sv = bx.querySelector('svg,canvas'), fake = {getBoundingClientRect: () => sv.getBoundingClientRect(), querySelectorAll: (q) => bx.querySelectorAll(q)};
      return hostBlock(fake, x, cw).then((b) => ({x, lines, b})); })).then((cells) => {
      cells = cells.filter((c) => c.b); if (!cells.length) return null;
      const rows = []; cells.forEach((c, i) => { const r = Math.floor(i / cols); c.th = c.lines.length * 17 + (c.lines.length ? 3 : 0); c.h = c.th + c.b.h; (rows[r] = rows[r] || {h: 0, th: 0, cells: []}).cells.push(c); });
      rows.forEach((r) => { r.th = Math.max.apply(null, r.cells.map((c) => c.th)); r.h = r.th + Math.max.apply(null, r.cells.map((c) => c.b.h)); });
      const rgap = 18, h = rows.reduce((a, r) => a + r.h, 0) + rgap * (rows.length - 1);
      return {h, draw: (ctx, y) => { let yy = y; rows.forEach((r) => { r.cells.forEach((c) => { c.lines.forEach((l, j) => drawLine(ctx, l, c.x, yy + j * 17 + 13)); c.b.draw(ctx, yy + r.th); }); yy += r.h + rgap; }); }};
    });
  }

  /* Legend: each span is an item made of words and swatches, flowed and wrapped. */
  const colours = (s) => String(s).match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/gi) || [];
  const clear = (c) => !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c);
  function swatch(i) {
    const cs = getComputedStyle(i), w = parseFloat(cs.width) || 14, h = parseFloat(cs.height) || 0, bw = parseFloat(cs.borderTopWidth) || 0;
    const ml = parseFloat(cs.marginLeft) || 0, mr = parseFloat(cs.marginRight) || 0, grad = /gradient/.test(cs.backgroundImage);
    if (i.classList.contains('ln') || (h === 0 && bw > 0)) { const st = cs.borderTopStyle, col = cs.borderTopColor, lw = bw || 3;
      return {w, ml, mr, draw: (ctx, x, yMid) => { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(st === 'dashed' ? [lw * 2, lw * 1.4] : st === 'dotted' ? [lw, lw] : []);
        ctx.beginPath(); ctx.moveTo(x, yMid); ctx.lineTo(x + w, yMid); ctx.stroke(); ctx.restore(); }}; }
    if (grad) { let c = colours(cs.backgroundImage); if (c.length < 2) c = ['#E9EDF3', INK]; const hh = h || 10;
      return {w, ml, mr, draw: (ctx, x, yMid) => { const g = ctx.createLinearGradient(x, 0, x + w, 0); c.forEach((col, j) => g.addColorStop(j / (c.length - 1), col)); ctx.fillStyle = g; ctx.fillRect(x, yMid - hh / 2, w, hh); }}; }
    const bg = cs.backgroundColor, bst = cs.borderTopStyle, bc = cs.borderTopColor, round = /%/.test(cs.borderTopLeftRadius) || parseFloat(cs.borderTopLeftRadius) >= Math.min(w, h || 10) / 2;
    const ow = w + (cs.boxSizing === 'border-box' ? 0 : bw * 2), oh = (h || 10) + (cs.boxSizing === 'border-box' ? 0 : bw * 2);
    let rot = 0; const tm = /^matrix\(([^,]+),([^,]+),/.exec(cs.transform || ''); if (tm) rot = Math.atan2(parseFloat(tm[2]), parseFloat(tm[1])) || 0;
    return {w: ow, ml, mr, draw: (ctx, x, yMid) => { ctx.save();
      if (rot) { ctx.translate(x + ow / 2, yMid); ctx.rotate(rot); ctx.translate(-(x + ow / 2), -yMid); } ctx.beginPath();
      if (round) ctx.ellipse(x + ow / 2, yMid, ow / 2 - bw / 2, oh / 2 - bw / 2, 0, 0, Math.PI * 2); else ctx.rect(x + bw / 2, yMid - oh / 2 + bw / 2, ow - bw, oh - bw);
      if (!clear(bg)) { ctx.fillStyle = bg; ctx.fill(); }
      if (bw > 0 && bst !== 'none' && !clear(bc)) { ctx.strokeStyle = bc; ctx.lineWidth = bw; ctx.stroke(); } ctx.restore(); }};
  }
  function keyBlock(key) {
    const f = {font: '400 13px ' + SANS, color: MUTED}, lh = 22, gap = 18, space = width(' ', f);
    const items = Array.from(key.children).map((sp) => { const atoms = [];
      const walk = (n) => n.childNodes.forEach((c) => {
        if (c.nodeType === 3) { c.nodeValue.split(/\s+/).forEach((wd) => { if (wd) atoms.push({t: wd, w: width(wd, f)}); }); }
        else if (c.nodeType === 1 && c.tagName === 'I') { const s = swatch(c); atoms.push({s, w: s.ml + s.w + s.mr}); }
        else if (c.nodeType === 1) walk(c); });
      walk(sp); return atoms; }).filter((a) => a.length);
    if (!items.length) return null;
    const placed = []; let x = 0, line = 0;
    items.forEach((atoms) => {
      let total = 0; atoms.forEach((a, i) => { total += a.w + (i && a.t && atoms[i - 1].t ? space : 0); });
      if (x > 0 && x + total > CW) { x = 0; line++; }
      atoms.forEach((a, i) => { const sp = i && a.t && atoms[i - 1].t ? space : 0;
        if (x > 0 && x + sp + a.w > CW) { x = 0; line++; } else x += sp;
        placed.push({a, x, line}); x += a.w; });
      x += gap;
    });
    return {h: (line + 1) * lh, draw: (ctx, y) => placed.forEach((p) => { const base = y + p.line * lh + 15;
      if (p.a.t) { setFont(ctx, f); ctx.fillStyle = f.color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(p.a.t, PAD + p.x, base); }
      else p.a.s.draw(ctx, PAD + p.x + p.a.s.ml, base - 4.5); })};
  }
  function readingBlock(p) {
    const body = {font: '400 17px ' + SERIF, color: INK}, bold = {font: '600 16.5px ' + SANS, color: INK, tab: true}, runs = [];
    const fonts = {}, pick = (b, col) => { const k = (b ? 'b' : 'r') + col; return fonts[k] || (fonts[k] = Object.assign({}, b ? bold : body, {color: col || INK})); };
    const walk = (n, b, col) => n.childNodes.forEach((c) => { if (c.nodeType === 3) runs.push({t: c.nodeValue, f: pick(b, col)});
      else if (c.nodeType === 1 && c.tagName === 'BR') runs.push({t: ' ', f: body});
      else if (c.nodeType === 1) walk(c, b || c.tagName === 'B' || c.tagName === 'STRONG', getComputedStyle(c).color || col); });
    walk(p, false, INK); if (!clean(runs.map((r) => r.t).join(''))) return null;
    const lines = wrapRuns(runs, CW), lh = 26;
    return {h: lines.length * lh, draw: (ctx, y) => lines.forEach((l, i) => drawLine(ctx, l, PAD, y + i * lh + 18))};
  }

  /* ---------- compose a card ---------- */
  function fontsReady() {
    const want = ['400 30px "Libre Caslon Display"', '600 20px "Hanken Grotesk"', '400 13px "Hanken Grotesk"', '400 17px "Source Serif 4"'];
    let p = Promise.resolve();
    try { if (document.fonts) p = Promise.all(want.map((f) => document.fonts.load(f).catch(() => null))).then(() => document.fonts.ready); } catch (e) { /* draw with fallbacks */ }
    return Promise.resolve(p).catch(() => null).then(loadFontCss);
  }
  function pageTitle(card) {
    const h1 = document.querySelector('main.ax h1') || document.querySelector('h1');
    return clean(card.dataset.axTitle || document.body.dataset.axTitle || (h1 && h1.textContent) || 'Attendance Explorer');
  }
  function compose(card) {
    return fontsReady().then(() => {
      const h2 = card.querySelector('h2'), title = pageTitle(card), sub = clean(h2 && h2.textContent);
      const nodes = Array.from(card.querySelectorAll('.ax-chart, .ax-multi, .ax-key, .ax-reading')).filter((n) => shown(n) && !(n.classList.contains('ax-chart') && n.parentNode.closest('.ax-multi')));
      const jobs = nodes.map((n) => {
        if (n.classList.contains('ax-multi')) return multiBlock(n).then((b) => b && {b, gap: 16, chart: true});
        if (n.classList.contains('ax-chart')) return chartBlock(n).then((b) => b && {b, gap: 16, chart: true});
        if (n.classList.contains('ax-key')) return Promise.resolve(keyBlock(n)).then((b) => b && {b, gap: 10});
        return Promise.resolve(readingBlock(n)).then((b) => b && {b, gap: 16});
      });
      return Promise.all(jobs).then((list) => {
        list = list.filter(Boolean); if (!list.some((o) => o.chart)) throw new Error('nothing to draw');
        const head = [
          {b: textBlock('ATTENDANCE EXPLORER', {font: '600 12px ' + SANS, color: BRASS_TEXT, ls: '1.1px', asc: 11}, 16), gap: 0},
          {b: textBlock(title, {font: '400 30px ' + DISPLAY, color: INK, asc: 27}, 35), gap: 10},
        ];
        if (sub) head.push({b: textBlock(sub, {font: '600 20px ' + SANS, color: INK, asc: 20}, 26), gap: 12});
        const all = head.concat(list);
        /* footer */
        const ff = {font: '400 12px ' + SANS, color: MUTED}, right = 'mrkdltn.com/attendance', rw = width(right, ff);
        const src = clean(document.body.dataset.axSource) || 'Source: Department for Education', fl = wrapRuns([{t: src, f: ff}], CW - rw - 24), flh = 17;
        let h = PAD; all.forEach((o) => { h += o.gap + o.b.h; });
        const ruleY = h + 22, footY = ruleY + 14; h = footY + fl.length * flh + PAD - 10;
        if (h > MAX_H) throw new Error('too tall');
        const cv = document.createElement('canvas'); cv.width = W * SCALE; cv.height = Math.ceil(h * SCALE);
        const ctx = cv.getContext('2d'); ctx.scale(SCALE, SCALE); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, h + 1);
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        let y = PAD; all.forEach((o) => { y += o.gap; o.b.draw(ctx, y); y += o.b.h; });
        ctx.fillStyle = LINE; ctx.fillRect(PAD, ruleY, CW, 1);
        fl.forEach((l, i) => drawLine(ctx, l, PAD, footY + i * flh + 12));
        setFont(ctx, ff); ctx.fillStyle = MUTED; ctx.textAlign = 'right'; ctx.fillText(right, W - PAD, footY + 12); ctx.textAlign = 'left';
        const name = 'attendance-' + (slug(title) || 'explorer') + '-' + (slug(sub) || 'chart') + '.png';
        return new Promise((res, rej) => { try { cv.toBlob((blob) => (blob ? res({blob, name, canvas: cv}) : rej(new Error('no image'))), 'image/png'); } catch (e) { rej(e); } });
      });
    });
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), a = el('a'); a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  function saveImage(card, btn) {
    if (btn && btn._axBusy) return Promise.resolve(false);
    if (btn) btn._axBusy = true;
    let p; try { p = compose(card); } catch (e) { p = Promise.reject(e); }
    return p.then((o) => { download(o.blob, o.name); return true; })
      .catch(() => { if (btn) flash(btn, 'Could not save image'); return false; })
      .then((ok) => { if (btn) btn._axBusy = false; return ok; });
  }

  /* ---------- card toolbars ---------- */
  function cards() {
    try {
      document.querySelectorAll('.ax .ax-card:not(.ax-method)').forEach((card) => {
        if (!card.querySelector('.ax-chart, .ax-multi')) return;
        if (Array.from(card.children).some((c) => c.classList && c.classList.contains('ax-tools'))) return;
        const bar = el('div', 'ax-tools'), h2 = card.querySelector('h2'), what = clean(h2 && h2.textContent);
        bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', what ? 'Share: ' + what : 'Share this chart');
        const save = el('button', 'ax-tool', 'Save image'); save.type = 'button';
        const copy = el('button', 'ax-tool', 'Copy link'); copy.type = 'button';
        const st = el('span', 'ax-tools-status'); st.setAttribute('role', 'status');
        save.addEventListener('click', () => { saveImage(save.closest('.ax-card'), save); });
        copy.addEventListener('click', () => { copyText(location.href).then(() => flash(copy, 'Link copied'), () => flash(copy, 'Could not copy link')); });
        bar.appendChild(save); bar.appendChild(copy); bar.appendChild(st); card.appendChild(bar);
      });
    } catch (e) { /* the page works without the tools */ }
  }

  /* ---------- pinned places ---------- */
  let place = null; const lists = [];
  const safeHref = (h) => { try { const u = new URL(String(h), location.origin); return u.origin === location.origin ? u.pathname + u.search + u.hash : null; } catch (e) { return null; } };
  const norm = (p) => { if (!p || typeof p !== 'object' || !KIND[p.kind] || p.id == null) return null;
    const name = clean(p.name).slice(0, 200), href = safeHref(p.href); return name && href ? {kind: p.kind, id: String(p.id), name, href} : null; };
  function pins() {
    try { const a = JSON.parse(localStorage.getItem(PIN_KEY) || '[]'); return Array.isArray(a) ? a.map(norm).filter(Boolean).slice(0, PIN_MAX) : []; } catch (e) { return []; }
  }
  function writePins(a) { let ok = true; try { localStorage.setItem(PIN_KEY, JSON.stringify(a.slice(0, PIN_MAX))); } catch (e) { ok = false; } refresh(); return ok; }
  const same = (a, b) => a.kind === b.kind && String(a.id) === String(b.id);
  const isPinned = (it) => pins().some((p) => same(p, it));
  function toggle(it) { const cur = pins(), rest = cur.filter((p) => !same(p, it)); return writePins(rest.length < cur.length ? rest : [it].concat(rest)); }
  function unpin(it) { return writePins(pins().filter((p) => !same(p, it))); }

  function renderPinButton() {
    const host = document.getElementById('ax-pin'); if (!host) return;
    if (!place) { host.textContent = ''; return; }
    const on = isPinned(place); let btn = host.querySelector('.ax-pinbtn');
    if (!btn) { host.textContent = ''; btn = el('button', 'ax-pinbtn'); btn.type = 'button';
      btn.appendChild(el('i', 'ax-pinmark')).setAttribute('aria-hidden', 'true'); btn.appendChild(el('span'));
      btn.addEventListener('click', () => { if (place) toggle(place); }); host.appendChild(btn); }
    btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.lastChild.textContent = on ? 'Saved to your places' : 'Save to your places';
    btn.title = on ? 'Remove ' + place.name + ' from your places' : 'Keep ' + place.name + ' in your places on this device';
  }
  function setPlace(item) { place = item == null ? null : norm(item); renderPinButton(); }

  let uid = 0;
  function fillPins(host) {
    const list = pins(), wrap = el('div', 'ax-places'), id = host._axId || (host._axId = 'ax-places-t' + (++uid));
    const t = el('p', 'ax-places-t', 'Your places'); t.id = id; wrap.appendChild(t);
    if (!list.length) wrap.appendChild(el('p', 'ax-places-none', 'Save a school, trust or area and it is kept here with its latest figure, ready to open or compare each time you come back. Saved only on this device.'));
    else { const ul = el('ul'); ul.setAttribute('aria-labelledby', id);
      list.forEach((p) => { const li = el('li'), a = el('a'); a.href = p.href; a.appendChild(el('span', 'ax-places-n', p.name)); a.appendChild(el('small', null, p.kind === 'group' ? ({a: 'Local authority', y: 'County', c: 'Constituency', w: 'Ward', t: 'Trust'}[String(p.id).split(':')[0]] || KIND[p.kind]) : KIND[p.kind]));
        const rm = el('button', 'ax-places-x'); rm.type = 'button'; rm.setAttribute('aria-label', 'Remove ' + p.name + ' from your places'); rm.appendChild(el('span', null, '×')).setAttribute('aria-hidden', 'true');
        rm.addEventListener('click', () => { unpin(p); const next = host.querySelector('.ax-places-x, a'); if (next) { try { next.focus(); } catch (e) { /* no focus */ } } });
        li.appendChild(a); li.appendChild(rm); ul.appendChild(li); });
      wrap.appendChild(ul); }
    host.textContent = ''; host.appendChild(wrap);
  }
  function renderPins(host) { if (!host) return; if (lists.indexOf(host) < 0) lists.push(host); try { fillPins(host); } catch (e) { /* leave as is */ } }
  function refresh() { try { renderPinButton(); lists.forEach(fillPins); } catch (e) { /* leave as is */ } }

  function seen(key, value) {
    let prev = null;
    try { let o = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); if (!o || typeof o !== 'object' || Array.isArray(o)) o = {};
      if (Object.prototype.hasOwnProperty.call(o, key) && o[key] != null) prev = o[key];
      if (value !== undefined) { o[key] = value; localStorage.setItem(SEEN_KEY, JSON.stringify(o)); } } catch (e) { return prev; }
    return prev;
  }

  window.addEventListener('storage', (e) => { if (e.key === PIN_KEY || e.key === null) refresh(); });
  window.AXtools = {cards, setPlace, pins, renderPins, seen, saveImage: (card) => saveImage(card, null), compose};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cards); else cards();
})();
