import fs from 'fs'; import vm from 'vm'; import {csvParse} from 'd3-dsv';
const root = 'site/explorer/';
const listeners = {}; const classes = new Set();
const ctx = { console, Promise, Map, Set, Object, String, Number, Array, setTimeout, clearTimeout, URLSearchParams,
  location: {hash: '#urn=145120', pathname: '/explorer/', search: ''}, history: {replaceState(){}},
  window: null, document: { documentElement: {classList: {add: (c) => classes.add(c), toggle(){}}}, querySelectorAll: () => [] },
  d3: { json: (u) => Promise.resolve(JSON.parse(fs.readFileSync(root + u, 'utf8'))), csv: (u) => Promise.resolve(csvParse(fs.readFileSync(root + u, 'utf8'))) } };
ctx.window = ctx; ctx.window.addEventListener = (e, f) => { listeners[e] = f; }; ctx.window.innerWidth = 1200;
vm.createContext(ctx); vm.runInContext(fs.readFileSync(root + 'dash.js', 'utf8'), ctx);
const dash = ctx.dash;
dash.source('ks4', 'data/ks4.json', {nn: 'data/nn/'}); dash.source('ofsted', 'data/rc.json'); dash.source('fig3', 'data/fig3.csv');
let renders = 0; dash.onData(() => renders++);
dash.start({});
await new Promise(r => setTimeout(r, 300));
const ks = dash.data('ks4').data, rc = dash.data('ofsted').data;
const old = csvParse(fs.readFileSync('data/raw/ks4_model_v3.csv', 'utf8')), oldrc = csvParse(fs.readFileSync('data/raw/ofsted_rc.csv', 'utf8'));
const dailyPath = 'data/raw/reports_daily.csv';
const daily = new Set(fs.existsSync(dailyPath) ? csvParse(fs.readFileSync(dailyPath, 'utf8')).map(r => r.urn) : []);
const same = (a, b) => a === b || (a !== '' && b !== '' && !isNaN(+a) && !isNaN(+b) && Math.abs(+a - +b) < 1e-9);
// Every school in the monthly files must come through unchanged, except report-card fields that a newer
// daily read has legitimately replaced.
const GRADEISH = /^g_|^insp_date$/;
// No figures for groups under 10: the build blanks these two where the group is estimated under 10 pupils.
const small = (r, c) => (c === 'dis_a8' ? Math.round(+r.pupils * +r.dis_pct / 100) < 10 : c === 'nondis_a8' ? Math.round(+r.pupils * (100 - +r.dis_pct) / 100) < 10 : false);
const cmp = (A, B, skip) => { let bad = 0; const ex = []; const cols = Object.keys(B[0]).filter(c => !skip.includes(c));
  const byUrn = new Map(A.map(r => [r.urn, r]));
  for (const b of B) { const a = byUrn.get(b.urn); if (!a) { bad++; continue; }
    for (const c of cols) { if (daily.has(b.urn) && GRADEISH.test(c)) continue; if (small(b, c) && (a[c] ?? '') === '') continue; if (!same(a[c] ?? '', b[c])) { bad++; if (ex.length < 5) ex.push([b.urn, c, a[c], b[c]]); } } }
  return {rows: A.length + '/' + B.length, cols: cols.length, daily: daily.size, mismatches: bad, ex}; };
console.log('ks4', JSON.stringify(cmp(ks, old, ['nn', 'relig', 'ss_z', 'ss_dist', 'ss_mean_25'])));
console.log('rc ', JSON.stringify(cmp(rc, oldrc, [])));
const me = ks.find(r => r.urn === '145120'); const o = old.find(r => r.urn === '145120');
console.log('nn for start school matches:', me.nn === o.nn, me.nn.split(' ').length, 'loaded class:', classes.has('loaded'));
// load every shard and compare all neighbour lists
for (let k = 0; k < 32; k++) { const u = old.find(r => +r.urn % 32 === k).urn; ctx.location.hash = '#urn=' + u; listeners.hashchange(); await new Promise(r => setTimeout(r, 20)); }
let nnBad = 0; old.forEach((r, i) => { if (ks[i].nn !== r.nn) nnBad++; }); console.log('nn mismatches after all shards:', nnBad, 'of', old.length);
const r1 = cmp(ks, old, ['nn', 'relig', 'ss_z', 'ss_dist', 'ss_mean_25']), r2 = cmp(rc, oldrc, []);
if (r1.mismatches || r2.mismatches || nnBad || !classes.has('loaded')) { console.error('LOADER TEST FAILED'); process.exit(1); }
console.log('loader test passed');
