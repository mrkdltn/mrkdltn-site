// Speed check for a page (benchmarks item 4, standard 11), with no packages: drives the installed Chrome over the
// DevTools protocol, as a mid-range phone on 4G (Lighthouse's mobile profile: 4x CPU slowdown, 150 ms round trip,
// 1.6 Mb/s down, 750 kb/s up, 412 x 823 at 1.75x), cold cache. Reports LCP, CLS, the element behind each, and the
// bytes transferred. Usage:
//   node scripts/measure.mjs URL [URL...] [--runs 3] [--desktop] [--chrome PATH]
// Prints one line per run and the median per URL. The standard: LCP under 2.5 s, CLS under 0.1, under 1 MB.
import {spawn} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (k) => { const i = args.indexOf(k); if (i < 0) return false; args.splice(i, 1); return true; };
const runs = +opt('--runs', 3);
const desktop = flag('--desktop');
const verbose = flag('--verbose');  // every shift, and every LCP candidate
const chrome = opt('--chrome', process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
const urls = args;
if (!urls.length) { console.error('usage: node scripts/measure.mjs URL [URL...] [--runs 3] [--desktop]'); process.exit(2); }

const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'oe-measure-'));
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  ...(process.env.OE_NOSANDBOX ? ['--no-sandbox'] : []), '--no-first-run', '--no-default-browser-check', '--disable-extensions', 'about:blank'], {stdio: 'ignore'});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 50; i++) {
    try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const p = l.find((t) => t.type === 'page'); if (p) return p.webSocketDebuggerUrl; } catch (e) { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('Chrome did not start');
}

function client(ws) {
  let id = 0; const wait = new Map(), on = new Map();
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data);
    if (d.id && wait.has(d.id)) { const [ok, no] = wait.get(d.id); wait.delete(d.id); d.error ? no(new Error(d.error.message)) : ok(d.result); }
    else if (d.method && on.has(d.method)) on.get(d.method).forEach((f) => f(d.params)); });
  return {send: (method, params = {}) => new Promise((ok, no) => { const i = ++id; wait.set(i, [ok, no]); ws.send(JSON.stringify({id: i, method, params})); }),
    on: (ev, f) => { if (!on.has(ev)) on.set(ev, []); on.get(ev).push(f); }};
}

// collected in the page: LCP (last candidate before input), CLS (session windows, as web-vitals), and what moved
const OBSERVE = `(() => { const w = window.__oe = {lcp: 0, lcpEl: '', cls: 0, shifts: []};
  const desc = (n) => n && n.nodeType !== 1 ? desc(n.parentElement) : n ? (n.id ? '#' + n.id : n.tagName.toLowerCase() + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\\s+/).join('.') : (n.parentElement && n.parentElement !== document.body ? ' in ' + desc(n.parentElement) : ''))) : '';
  new PerformanceObserver((l) => { for (const e of l.getEntries()) { w.lcp = e.startTime; w.lcpEl = desc(e.element) + (e.url ? ' ' + e.url.split('/').pop() : ''); (w.cands = w.cands || []).push(Math.round(e.startTime) + ' ms ' + e.size + 'px² ' + w.lcpEl + ' «' + ((e.element && e.element.textContent) || '').slice(0, 50) + '»'); } }).observe({type: 'largest-contentful-paint', buffered: true});
  let win = 0, first = 0, last = 0;
  new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (e.hadRecentInput) continue;
    if (win && e.startTime - last < 1000 && e.startTime - first < 5000) { win += e.value; last = e.startTime; } else { win = e.value; first = last = e.startTime; }
    w.cls = Math.max(w.cls, win);
    w.shifts.push({t: Math.round(e.startTime), v: +e.value.toFixed(4), from: (e.sources || []).map((s) => desc(s.node) + ' x ' + Math.round(s.previousRect.x) + '→' + Math.round(s.currentRect.x) + ' y ' + Math.round(s.previousRect.y) + '→' + Math.round(s.currentRect.y) + ' h ' + Math.round(s.previousRect.height) + '→' + Math.round(s.currentRect.height)).filter(Boolean).slice(0, 4).join(', ')}); } }).observe({type: 'layout-shift', buffered: true});
})();`;

async function run(url) {
  const ws = new WebSocket(await target()); await new Promise((r) => ws.addEventListener('open', r));
  const c = client(ws);
  await c.send('Page.enable'); await c.send('Network.enable');
  await c.send('Network.clearBrowserCache'); await c.send('Network.setCacheDisabled', {cacheDisabled: false});
  if (desktop) {
    await c.send('Emulation.setDeviceMetricsOverride', {width: 1350, height: 940, deviceScaleFactor: 1, mobile: false});
  } else {
    await c.send('Emulation.setDeviceMetricsOverride', {width: 412, height: 823, deviceScaleFactor: 1.75, mobile: true});
    await c.send('Emulation.setCPUThrottlingRate', {rate: 4});
    await c.send('Network.emulateNetworkConditions', {offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8});
  }
  let bytes = 0; const sizes = new Map();
  c.on('Network.loadingFinished', (p) => { bytes += p.encodedDataLength; sizes.set(p.requestId, p.encodedDataLength); });
  const names = new Map(); c.on('Network.responseReceived', (p) => names.set(p.requestId, p.response.url));
  await c.send('Page.addScriptToEvaluateOnNewDocument', {source: OBSERVE});
  const loaded = new Promise((r) => c.on('Page.loadEventFired', r));
  await c.send('Page.navigate', {url});
  await loaded;
  // let the data arrive and the page settle: wait until no bytes move for 2 s (at most 30 s)
  let prev = -1, still = 0;
  for (let i = 0; i < 60 && still < 4; i++) { await sleep(500); still = bytes === prev ? still + 1 : 0; prev = bytes; }
  const r = (await c.send('Runtime.evaluate', {expression: 'JSON.stringify(window.__oe)', returnByValue: true})).result.value;
  ws.close();
  const top = [...sizes].map(([id, n]) => [n, (names.get(id) || '').replace(/^https?:\/\/[^/]+/, '')]).sort((a, b) => b[0] - a[0]).slice(0, 5);
  return {...JSON.parse(r), bytes, top};
}

const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
try {
  for (const url of urls) {
    const got = [];
    for (let i = 0; i < runs; i++) {
      const r = await run(url); got.push(r);
      console.log(`${url}  run ${i + 1}: LCP ${(r.lcp / 1000).toFixed(2)} s (${r.lcpEl})  CLS ${r.cls.toFixed(3)}  ${(r.bytes / 1024).toFixed(0)} KB`);
      if (verbose) for (const c of r.cands || []) console.log('    LCP candidate ' + c);
      for (const s of r.shifts.filter((s) => verbose || s.v >= 0.005)) console.log(`    shift ${s.v} at ${s.t} ms: ${s.from}`);
      if (i === 0) console.log('    largest: ' + r.top.map(([n, p]) => `${p} ${(n / 1024).toFixed(0)} KB`).join('; '));
    }
    const lcp = med(got.map((r) => r.lcp)) / 1000, cls = med(got.map((r) => r.cls)), kb = med(got.map((r) => r.bytes)) / 1024;
    console.log(`${url}  MEDIAN (${desktop ? 'desktop' : 'phone, 4G'}): LCP ${lcp.toFixed(2)} s ${lcp < 2.5 ? 'pass' : 'FAIL'}  CLS ${cls.toFixed(3)} ${cls < 0.1 ? 'pass' : 'FAIL'}  ${kb.toFixed(0)} KB ${kb < 1024 ? 'pass' : 'FAIL'}`);
  }
} finally {
  proc.kill(); await sleep(500);
  try { rmSync(profile, {recursive: true, force: true}); } catch (e) { /* Chrome may still hold a file */ }
}
