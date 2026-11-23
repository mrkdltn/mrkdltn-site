/* A small stand-in for the dashboard runtime the Explorer was first built on.
   It loads CSVs, keeps view state in the URL hash, recomputes derived tables
   and redraws the elements marked data-draw.
   Motion rule (15 November 2026): intro animations play once per school. A redraw
   for any other reason (resize, a control change, a table sort) is drawn still,
   and height-only resizes (the mobile address bar showing or hiding) are ignored.
   Data (16 November 2026 build): sources may be column-major JSON, and the similar-schools lists are loaded
   per school from nn/<urn % 32>.json before that school is drawn. */
(function () {
  const sources = {}, calcs = {}, draws = {}, models = new Map(), onDataFns = [];
  let state = {}, cache = {}, loaded = false, defaults = {};
  let fresh = false, resizing = false, shown = null, rid = 0;
  // view settings kept in the address; a page can add its own (dash.keep)
  const KEEP = ['urn', 'x', 'area', 'phase', 'area2', 'meas'];
  const still = (on) => document.documentElement.classList.toggle('oe-still', on);

  const readHash = () => {
    const p = new URLSearchParams(location.hash.slice(1)); const o = {};
    p.forEach((v, k) => { o[k] = v; }); return o;
  };
  // A chosen school lives at /explorer/school/URN/ (its own title and share image); other view settings stay in the hash.
  // The school picked at random on /explorer/ stays in the hash, so the landing address is unchanged until someone chooses.
  const schoolPath = /^\/explorer\/school\/\d+\/?$/;
  const writeHash = () => {
    const keep = {}; KEEP.forEach((k) => { if (state[k] && state[k] !== defaults[k]) keep[k] = state[k]; });
    const usePath = state.urn && (schoolPath.test(location.pathname) || String(state.urn) !== String(window.OE_RANDOM || ''));
    if (usePath) delete keep.urn;
    const s = new URLSearchParams(keep).toString();
    const path = usePath ? '/explorer/school/' + state.urn + '/' : location.pathname;
    history.replaceState(null, '', path + location.search + (s ? '#' + s : ''));
  };

  const data = (name) => {
    if (sources[name]) return sources[name].rows ? {status: 'ok', data: sources[name].rows} : {status: sources[name].error ? 'error' : 'loading', data: null};
    if (calcs[name]) {
      if (name in cache) return cache[name];
      const c = calcs[name]; const ins = c.inputs.map(data);
      if (ins.some((d) => d.status !== 'ok')) return {status: 'loading', data: null};
      let out; try { out = {status: 'ok', data: c.fn(...ins.map((d) => d.data))}; } catch (e) { console.error(name, e); out = {status: 'error', data: null}; }
      cache[name] = out; return out;
    }
    return {status: 'error', data: null};
  };

  // Column-major JSON ({n, cols, codes, data}) expanded to row objects of strings, exactly as d3.csv gave them.
  const expand = (j) => { const rows = new Array(j.n); const cols = j.cols;
    for (let i = 0; i < j.n; i++) { const o = {}; for (const c of cols) { const v = j.data[c][i]; o[c] = v === null || v === undefined ? '' : (j.codes[c] ? j.codes[c][v] : String(v)); } rows[i] = o; }
    return rows; };
  const loadSource = (url) => (/\.json$/.test(url) ? d3.json(url).then(expand) : d3.csv(url));
  // The 50 similar schools are fetched per school (nn/<urn % 32>.json) and written back as the space-separated
  // 'nn' string the code expects. Every row in the shard is filled, so nearby lookups are often free.
  const nnShards = new Map();
  const ensureNN = (urn) => { const s = sources.ks4; if (!urn || !s || !s.rows || !s.nnUrl) return Promise.resolve();
    const k = (+urn) % 32; if (!nnShards.has(k)) nnShards.set(k, d3.json(s.nnUrl + k + '.json').then((m) => {
      if (!s.byUrn) s.byUrn = new Map(s.rows.map((r) => [r.urn, r]));
      Object.entries(m).forEach(([u, list]) => { const r = s.byUrn.get(u); if (r) r.nn = list.join(' '); }); }).catch((e) => { nnShards.delete(k); console.error('nn', e); }));
    return nnShards.get(k); };

  const drawOne = (el) => {
    const name = el.getAttribute('data-draw'); const d = draws[name]; if (!d) return;
    try {
      if (typeof d === 'function') d(el);
      else { if (!models.has(el)) models.set(el, d.mount(el)); d.update(el, models.get(el)); }
    } catch (e) { console.error('draw', name, e); }
  };
  const render = (only, why) => {
    const my = ++rid; cache = {};
    if (loaded && !only) onDataFns.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
    if (my !== rid) return; // an onData handler already re-rendered (e.g. picked a random school)
    fresh = loaded && !only && why !== 'resize' && !!state.urn && state.urn !== shown;
    resizing = why === 'resize';
    still(!fresh);
    document.querySelectorAll('[data-draw]').forEach((el) => { if (!only || only.includes(el.getAttribute('data-draw'))) drawOne(el); });
    if (fresh) shown = state.urn;
    fresh = false; resizing = false;
  };

  window.dash = {
    source: (name, url, opts) => { sources[name] = Object.assign({url}, opts && opts.nn ? {nnUrl: opts.nn} : {}); },
    calc: (name, def) => { calcs[name] = def; },
    draw: (name, def) => {
      if (def === undefined) { cache = {}; fresh = false; document.querySelectorAll('[data-draw="' + name + '"]').forEach(drawOne); return; }
      draws[name] = def;
    },
    data,
    fresh: () => fresh,
    resizing: () => resizing,
    params: () => Object.assign({}, state),
    setParams: (p) => {
      const changed = [];
      Object.entries(p).forEach(([k, v]) => { if (v === null || v === undefined || v === '') { if (k in state) { delete state[k]; changed.push(k); } } else if (state[k] !== String(v)) { state[k] = String(v); changed.push(k); } });
      if (!changed.length) return;
      writeHash();
      if (changed.includes('urn') && loaded) { rid++; ensureNN(state.urn).then(() => render()); return; }
      render(changed.every((k) => k === 'q') ? ['results'] : null);
    },
    onData: (f) => { onDataFns.push(f); },
    keep: (ks) => { ks.forEach((k) => { if (!KEEP.includes(k)) KEEP.push(k); }); },
    start: (defs) => {
      defaults = defs || {}; state = Object.assign({}, defaults, window.OE_URN ? {urn: String(window.OE_URN)} : {}, readHash());
      window.addEventListener('hashchange', () => { if (!location.hash.includes('=')) return; /* a jump link such as #main is not a view */ const h = readHash(); if (h.urn && h.urn !== state.urn) { state = Object.assign(state, h); writeHash(); rid++; ensureNN(state.urn).then(() => render()); return; }
        // other view settings in the address (measure, chart options) also apply when only they change
        const ch = {}; KEEP.filter((k) => k !== 'urn').forEach((k) => { const v = k in h ? h[k] : (defaults[k] ?? null); if ((v ?? null) !== (state[k] ?? null)) ch[k] = v; /* a key taken out of the address clears it */ }); if (Object.keys(ch).length) window.dash.setParams(ch); });
      let t, lastW = window.innerWidth;
      window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { const w = window.innerWidth; if (w === lastW) return; lastW = w; render(null, 'resize'); }, 200); });
      render();
      Promise.all(Object.values(sources).map((s) => loadSource(s.url).then((rows) => { s.rows = rows; }).catch((e) => { s.error = e; })))
        .then(() => ensureNN(state.urn)).then(() => { loaded = true; document.documentElement.classList.add('loaded'); render(); });
    }
  };
})();
