/* The brass thread: one line drawn through the plates as the reader scrolls. It only ever advances; nothing replays. */
(function () {
var J = document.getElementById('journey');
if (!J || !window.requestAnimationFrame) return;
var root = document.documentElement;
var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
var NS = 'http://www.w3.org/2000/svg';
var GC = ['#0176E0', '#33903C', '#5CD168', '#FF8341', '#CE1E02'];
root.classList.add('js');
J.querySelectorAll('g[data-counts]').forEach(function (g) {
var x = +g.dataset.x, y = +g.dataset.y, s = +g.dataset.size, gap = +g.dataset.gap, cols = [];
g.dataset.counts.split(',').forEach(function (n, i) { for (var k = 0; k < +n; k++) cols.push(GC[i]); });
for (var i = 0; i < 100; i++) {
var r = document.createElementNS(NS, 'rect');
r.setAttribute('x', x + (i % 10) * (s + gap)); r.setAttribute('y', y + Math.floor(i / 10) * (s + gap));
r.setAttribute('width', s); r.setAttribute('height', s); r.setAttribute('class', 'sq');
r.dataset.c = cols[i]; r.style.transitionDelay = (i * 9) + 'ms';
g.appendChild(r);
}
});
function light(el) { el.querySelectorAll('.sq').forEach(function (r) { r.style.fill = r.dataset.c; }); }
var svg = J.querySelector('.thread'), line = svg.querySelector('.thread-line'), tip = svg.querySelector('.thread-tip');
var pts = [], cum = [], env = [], triggers = [], total = 0, drawn = 0, goal = 0, running = false;
function build() {
var frac = total ? drawn / total : 0, gfrac = total ? goal / total : 0;
var jr = J.getBoundingClientRect(), W = J.clientWidth, H = J.scrollHeight;
svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
var narrow = W < 760, gutter = 11, g = 28;
pts = []; triggers.forEach(function (t) { t.len = Infinity; });
var fresh = [];
J.querySelectorAll('[data-thread],[data-thread-box]').forEach(function (el) {
if (!el.getClientRects().length) return;
var local = [];
if (el.hasAttribute('data-thread')) {
var m = el.getScreenCTM();
el.getAttribute('data-thread').trim().split(/\s+/).forEach(function (p) {
var a = p.split(','), x = +a[0], y = +a[1];
local.push([m.a * x + m.c * y + m.e - jr.left, m.b * x + m.d * y + m.f - jr.top]);
});
} else {
var r = el.getBoundingClientRect();
el.getAttribute('data-thread-box').trim().split(/\s+/).forEach(function (p) {
var a = p.split(',');
local.push([r.left - jr.left + r.width * a[0] / 100, r.top - jr.top + r.height * a[1] / 100]);
});
}
if (pts.length) {
var a = pts[pts.length - 1], b = local[0];
if (narrow) pts.push([a[0], a[1] + g], [gutter, a[1] + g], [gutter, b[1] - g], [b[0], b[1] - g]);
else if (Math.abs(a[0] - b[0]) > 1) pts.push([a[0], a[1] + g], [b[0], a[1] + g]);
}
var start = pts.length;
local.forEach(function (p) { pts.push(p); });
if (el.dataset.node != null) fresh.push({ el: el, i: start + (+el.dataset.node), kind: 'light' });
var plate = el.closest ? el.closest('.plate') : null;
if (plate) fresh.push({ el: plate, i: start, kind: 'wake' });
if (el.classList.contains('axis')) {
var box = el.getBoundingClientRect();
J.querySelectorAll('.bar').forEach(function (bar) {
var br = bar.getBoundingClientRect();
fresh.push({ el: bar, i: start + 1, f: (br.left + br.width / 2 - box.left) / box.width, j: start + 2, kind: 'bar' });
});
}
});
cum = [0]; env = [pts[0][1]];
var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
for (var i = 1; i < pts.length; i++) {
cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
env[i] = Math.max(env[i - 1], pts[i][1]);
d += 'L' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1);
}
total = cum[cum.length - 1];
line.setAttribute('d', d);
line.style.strokeDasharray = total + ' ' + total;
fresh.forEach(function (t) {
t.len = t.kind === 'bar' ? cum[t.i] + t.f * (cum[t.j] - cum[t.i]) : cum[t.i];
var old = triggers.filter(function (o) { return o.el === t.el; })[0];
t.done = old ? old.done : false;
});
triggers = fresh;
drawn = frac * total; goal = gfrac * total;
if (reduce) { drawn = goal = total; }
apply();
}
function wanted() {
var Y = window.innerHeight * 0.62 - J.getBoundingClientRect().top;
if (Y <= env[0]) return 0;
for (var i = env.length - 1; i >= 0; i--) {
if (env[i] <= Y) {
if (i === env.length - 1) return total;
var span = env[i + 1] - env[i];
return cum[i] + (span > 0 ? (Y - env[i]) / span : 1) * (cum[i + 1] - cum[i]);
}
}
return 0;
}
function apply() {
line.style.strokeDashoffset = Math.max(0, total - drawn);
if (drawn > 1) svg.classList.add('on');
if (drawn >= total - 1) svg.classList.add('done');
if (drawn > 1 && drawn < total - 1) {
var p = line.getPointAtLength(drawn);
tip.setAttribute('cx', p.x); tip.setAttribute('cy', p.y);
}
triggers.forEach(function (t) {
if (!t.done && drawn >= Math.max(t.len, 1)) {
t.done = true;
if (t.kind === 'light') light(t.el); else t.el.classList.add(t.kind === 'wake' ? 'awake' : 'up');
}
});
}
function frame() {
var d = goal - drawn;
if (d > 0.5) {
drawn += Math.max(d * 0.11, Math.min(d, 5));
apply();
requestAnimationFrame(frame);
} else { drawn = goal; apply(); running = false; }
}
var dawn = J.querySelector('.dawn');
function onScroll() {
if (!total) return;
var w = wanted();
if (w > goal) goal = w;
if (!running && goal - drawn > 0.5) { running = true; requestAnimationFrame(frame); }
if (dawn) {
var r = dawn.getBoundingClientRect();
var p = (window.innerHeight * 0.55 - r.top) / (window.innerHeight * 0.7);
root.style.setProperty('--dawn', Math.max(0, Math.min(1, p)).toFixed(3));
}
}
function count(el) {
var n = +el.dataset.count, t0 = null;
if (reduce) return;
el.textContent = '0';
requestAnimationFrame(function step(t) {
if (t0 === null) t0 = t;
var k = Math.min(1, (t - t0) / 1100), e = 1 - Math.pow(1 - k, 3);
el.textContent = Math.round(n * e);
if (k < 1) requestAnimationFrame(step);
});
}
if ('IntersectionObserver' in window && !reduce) {
var io = new IntersectionObserver(function (es) {
es.forEach(function (e) {
if (!e.isIntersecting) return;
e.target.classList.add('in');
e.target.querySelectorAll('[data-count]').forEach(count);
io.unobserve(e.target);
});
}, { rootMargin: '0px 0px -18% 0px', threshold: 0.12 });
J.querySelectorAll('.plate,.say').forEach(function (el) { io.observe(el); });
} else {
J.querySelectorAll('.plate,.say').forEach(function (el) { el.classList.add('in'); });
}
var rt;
function rebuild() { build(); onScroll(); }
window.addEventListener('scroll', onScroll, { passive: true });
var lastW = window.innerWidth;
window.addEventListener('resize', function () { if (window.innerWidth === lastW) return; lastW = window.innerWidth; clearTimeout(rt); rt = setTimeout(rebuild, 150); });
window.addEventListener('load', rebuild);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
rebuild();
})();
