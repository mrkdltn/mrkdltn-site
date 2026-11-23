/* The home page as a school day. A brass thread is drawn through each plate as the reader scrolls,
   badges branch off it, the plates drift a little slower than the page, short video moves play once,
   and the ground colour follows the light from dawn to dusk. Nothing loops or replays. */
(function () {
  var day = document.getElementById('day');
  if (!day || !window.requestAnimationFrame) return;
  var root = document.documentElement, body = document.body;
  var mq = function (q) { return window.matchMedia && matchMedia(q).matches; };
  var reduce = mq('(prefers-reduced-motion: reduce)');
  var saveData = navigator.connection && navigator.connection.saveData;
  var NS = 'http://www.w3.org/2000/svg';
  var GC = ['#0176E0', '#33903C', '#5CD168', '#FF8341', '#CE1E02'];
  root.classList.add('js');

  // Grids of 100 squares, one per school in every hundred, coloured on arrival.
  document.querySelectorAll('g.grid').forEach(function (g) {
    var x = +g.dataset.x, y = +g.dataset.y, s = +g.dataset.size, gap = +g.dataset.gap, cols = [];
    g.dataset.counts.split(',').forEach(function (n, i) { for (var k = 0; k < +n; k++) cols.push(GC[i]); });
    for (var i = 0; i < 100; i++) {
      var r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', x + (i % 10) * (s + gap)); r.setAttribute('y', y + Math.floor(i / 10) * (s + gap));
      r.setAttribute('width', s); r.setAttribute('height', s); r.setAttribute('class', 'sq');
      r.dataset.c = cols[i]; r.style.transitionDelay = (i * 8) + 'ms';
      g.appendChild(r);
    }
  });
  function light(g) { g.querySelectorAll('.sq').forEach(function (r) { r.style.fill = r.dataset.c; }); }

  var stops = [].slice.call(day.querySelectorAll('.stop'));
  var nat = day.querySelector('.national');
  var items = [];   // every drawable piece of thread, in reading order
  var portrait = false, narrow = false;

  function sample(path, n) {
    var L = path.getTotalLength(), pts = [];
    for (var i = 0; i <= n; i++) { var p = path.getPointAtLength(L * i / n); pts.push([p.x, p.y, L * i / n]); }
    return { L: L, pts: pts };
  }
  function nearestLen(smp, x, y) {
    var best = Infinity, len = 0;
    smp.pts.forEach(function (p) { var d = (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y); if (d < best) { best = d; len = p[2]; } });
    return len;
  }

  function geom(layer, vb) {
    var W = layer.clientWidth, H = layer.clientHeight, s = Math.max(W / vb[0], H / vb[1]);
    return { s: s, ox: (W - vb[0] * s) / 2, oy: (H - vb[1] * s) / 2 };
  }

  function build() {
    portrait = mq('(orientation: portrait)');
    narrow = portrait;
    var old = items; items = [];
    stops.forEach(function (st, i) {
      var layer = st.querySelector('.layer');
      var svg = st.querySelector('.art.' + (portrait ? 't' : 'w'));
      var vb = portrait ? [900, 1200] : [1600, 900];
      var g = geom(layer, vb);
      var path = svg.querySelector('.th'), tip = svg.querySelector('.tip');
      path.style.strokeWidth = (2.4 / g.s).toFixed(3);
      tip.setAttribute('r', (4.5 / g.s).toFixed(2));
      svg.querySelectorAll('.br').forEach(function (b) { b.style.strokeWidth = (1.25 / g.s).toFixed(3); });
      var smp = sample(path, 240);
      path.style.strokeDasharray = smp.L + ' ' + smp.L;
      var trig = [];
      svg.querySelectorAll('g.grid').forEach(function (gr) {
        trig.push({ len: nearestLen(smp, +gr.dataset.x, +gr.dataset.y), fn: function () { light(gr); } });
      });
      var bds = st.querySelectorAll('.bds.' + (portrait ? 't' : 'w') + ' .bd');
      var brs = svg.querySelectorAll('.br');
      bds.forEach(function (bd, k) {
        var a = bd.dataset.at.split(','), f = bd.dataset.from.split(',');
        var bx = g.ox + a[0] * g.s, hw = bd.offsetWidth / 2 + 8;
        bx = Math.max(hw, Math.min(layer.clientWidth - hw, bx));   // never let a badge run off the edge
        bd.style.left = bx + 'px'; bd.style.top = (g.oy + a[1] * g.s) + 'px';
        var br = brs[k];
        trig.push({ len: nearestLen(smp, +f[0], +f[1]), fn: function () { if (br) br.classList.add('on'); bd.classList.add('on'); } });
      });
      var start = path.getPointAtLength(0), end = path.getPointAtLength(smp.L);
      var it = { kind: 'plate', st: st, layer: layer, path: path, tip: tip, smp: smp, g: g, trig: trig,
        x0: g.ox + start.x * g.s, x1: g.ox + end.x * g.s };
      var prev = old.filter(function (o) { return o.st === st && o.kind === 'plate'; })[0];
      it.frac = prev ? prev.frac : 0;
      items.push(it);
      // the join to the next plate, or into the national chart
      var seam = st.querySelector('.seam');
      items.push({ kind: 'seam', st: st, svg: seam, path: seam.querySelector('.th'), tip: seam.querySelector('.tip'), i: i,
        frac: (old.filter(function (o) { return o.st === st && o.kind === 'seam'; })[0] || {}).frac || 0 });
    });
    // seam geometry needs the next plate's entry point
    items.forEach(function (it, k) {
      if (it.kind !== 'seam') return;
      var from = items[k - 1], to = items[k + 1];
      var st = it.st, plate = st.querySelector('.frame');
      var sr = st.getBoundingClientRect(), pr = plate.getBoundingClientRect();
      var top = pr.bottom - sr.top, h = sr.height - top, W = st.clientWidth;
      var x1 = from.x1 + (pr.left - sr.left), x2;
      var bottomExtra = 0;
      if (to) {
        var nr = to.st.querySelector('.frame').getBoundingClientRect();
        x2 = to.x0 + (nr.left - sr.left);
        bottomExtra = nr.top - sr.bottom;
      } else {
        var lead = nat.querySelector('.lead'), lr = lead.getBoundingClientRect();
        x2 = lr.left - sr.left;
        bottomExtra = lr.top - sr.bottom;
      }
      var H = h + Math.max(0, bottomExtra);
      it.svg.style.top = top + 'px'; it.svg.style.height = H + 'px';
      it.svg.setAttribute('width', W); it.svg.setAttribute('height', H); it.svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var d, gut = 12;
      if (narrow && h > 80) d = 'M' + x1 + ',0 V14 H' + gut + ' V' + (H - 14) + ' H' + x2 + ' V' + H;
      else { var m = Math.round(H / 2); d = 'M' + x1 + ',0 V' + m + ' H' + x2 + ' V' + H; }
      it.path.setAttribute('d', d);
      // the seam carries the colour of the light from one plate to the next
      var ca = getComputedStyle(st).getPropertyValue('--th').trim() || '#C9A24B';
      var cb = to ? (getComputedStyle(to.st).getPropertyValue('--th').trim() || ca) : '#C9A24B';
      var gid = 'sg' + it.i, defs = it.svg.querySelector('defs');
      if (!defs) { defs = document.createElementNS(NS, 'defs'); it.svg.insertBefore(defs, it.svg.firstChild); }
      defs.innerHTML = '<linearGradient id="' + gid + '" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="' + H + '"><stop offset="0" stop-color="' + ca + '"/><stop offset="1" stop-color="' + cb + '"/></linearGradient>';
      it.path.style.stroke = 'url(#' + gid + ')';
      it.tip.style.fill = cb;
      it.path.style.strokeWidth = 2.4;
      it.smp = sample(it.path, 80);
      it.path.style.strokeDasharray = it.smp.L + ' ' + it.smp.L;
      it.top = top;
    });
    // the last run: down the edge of the national sheet to the axis
    var lead = nat.querySelector('.lead'), axis = nat.querySelector('.axis');
    var lr = lead.getBoundingClientRect(), ar = axis.getBoundingClientRect();
    var dx = ar.left + 1 - lr.left;   // the axis sits on the line, so this is ~0 and the run is straight
    var LH = ar.top - lr.top, LW = Math.max(40, dx + 2);
    lead.setAttribute('width', LW); lead.setAttribute('height', LH); lead.setAttribute('viewBox', '0 0 ' + LW + ' ' + LH);
    lead.style.height = LH + 'px'; lead.style.width = LW + 'px';
    var lp = lead.querySelector('.th');
    lp.setAttribute('d', Math.abs(dx) < 6 ? 'M' + Math.max(0, dx) + ',0 V' + LH
      : 'M0,0 V' + Math.max(8, LH - 28) + ' H' + dx + ' V' + LH);
    lp.style.strokeWidth = 2.4;
    var lsm = sample(lp, 40);
    lp.style.strokeDasharray = lsm.L + ' ' + lsm.L;
    var prevLead = old.filter(function (o) { return o.kind === 'lead'; })[0];
    items.push({ kind: 'lead', svg: lead, path: lp, tip: lead.querySelector('.tip'), smp: lsm, frac: prevLead ? prevLead.frac : 0,
      after: function () { nat.classList.add('reached'); } });
    if (reduce) items.forEach(function (it) { it.frac = 1; });
    items.forEach(function (it) { it.goal = it.frac; });
    measure(); apply(true);
  }

  // How far along each piece the reading line has reached, in path length.
  function wanted(it, line) {
    var r, yUser;
    if (it.kind === 'plate') {
      r = it.layer.getBoundingClientRect();
      yUser = (line - r.top - it.g.oy) / it.g.s;
    } else {
      r = it.svg.getBoundingClientRect();
      yUser = line - r.top;
    }
    var pts = it.smp.pts, env = -Infinity, len = 0;
    for (var i = 0; i < pts.length; i++) {
      env = Math.max(env, pts[i][1]);
      if (env <= yUser) len = pts[i][2]; else break;
    }
    if (yUser >= env && i === pts.length) len = it.smp.L;
    return len / it.smp.L;
  }

  function measure() {
    var line = window.innerHeight * 0.64;
    items.forEach(function (it) { var w = wanted(it, line); if (w > it.goal) it.goal = w; });
  }

  var running = false;
  function apply(force) {
    var moving = false, active = null;
    items.forEach(function (it) {
      var d = it.goal - it.frac;
      if (d > 0.0005) { it.frac += Math.max(d * 0.12, Math.min(d, 0.004)); moving = true; }
      else it.frac = it.goal;
      var L = it.smp.L, len = it.frac * L;
      it.path.style.strokeDashoffset = Math.max(0, L - len);
      if (it.frac > 0.002 && it.frac < 0.998) active = it;
      if (it.trig) it.trig.forEach(function (t) { if (!t.done && len >= t.len - 1) { t.done = true; t.fn(); } });
      if (it.after && it.frac >= 0.998 && !it.doneAfter) { it.doneAfter = true; it.after(); }
      if (it.tip) it.tip.style.opacity = 0;
    });
    if (active && active.tip) {
      var p = active.path.getPointAtLength(active.frac * active.smp.L);
      active.tip.setAttribute('cx', p.x); active.tip.setAttribute('cy', p.y); active.tip.style.opacity = 1;
    }
    return moving;
  }
  function frame() { if (apply()) requestAnimationFrame(frame); else running = false; }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }

  // Parallax: each plate's picture drifts against the page; the card rides a little the other way.
  var plates = stops.map(function (st) { return { st: st, layer: st.querySelector('.layer'), card: st.querySelector('.pc') }; });
  function parallax() {
    if (reduce) return;
    var vh = window.innerHeight;
    plates.forEach(function (p) {
      var r = p.st.querySelector('.frame').getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var c = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);   // -1 .. 1 across the screen
      c = Math.max(-1, Math.min(1, c));
      p.layer.style.transform = 'translate3d(0,' + (c * r.height * 0.07).toFixed(1) + 'px,0)';
      if (p.card && !portrait) p.card.style.transform = 'translate3d(0,' + (c * -26).toFixed(1) + 'px,0)';
    });
  }

  // The ground follows the light: dawn blue, midday cream, afternoon gold, dusk navy, then paper.
  var grounds = [].slice.call(day.querySelectorAll('[data-ground]')).map(function (el) { return { el: el, c: hex(el.dataset.ground) }; });
  var after = document.getElementById('after');
  grounds.push({ el: after, c: hex('#ECE9E1') });
  function hex(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function ground() {
    var mid = window.innerHeight / 2, k = 0, t = 0;
    for (var i = 0; i < grounds.length; i++) {
      var r = grounds[i].el.getBoundingClientRect();
      var c = r.top + Math.min(r.height, window.innerHeight) / 2;
      if (c <= mid) k = i;
    }
    var a = grounds[k], b = grounds[Math.min(k + 1, grounds.length - 1)];
    if (a !== b) {
      var ra = a.el.getBoundingClientRect(), rb = b.el.getBoundingClientRect();
      var ca = ra.top + Math.min(ra.height, window.innerHeight) / 2, cb = rb.top + Math.min(rb.height, window.innerHeight) / 2;
      t = Math.max(0, Math.min(1, (mid - ca) / Math.max(1, cb - ca)));
    }
    var c = a.c.map(function (v, j) { return Math.round(v + (b.c[j] - v) * t); });
    body.style.backgroundColor = 'rgb(' + c.join(',') + ')';
    var lum = (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
    body.classList.toggle('dark-ground', lum < 0.45);
  }

  // Video moves: one short clip per plate (vertical cuts on portrait screens), loaded when near, played once when seen.
  var vids = [].slice.call(day.querySelectorAll('video.mv'));
  var allowVideo = !reduce && !saveData;   // phones too: the vertical clips are 100-245 KB each
  function prime(v) {
    if (v.dataset.loaded) return;
    v.dataset.loaded = '1';
    v.src = portrait ? v.dataset.t : v.dataset.w;
    v.addEventListener('playing', function () { v.classList.add('on'); }, { once: true });
    v.addEventListener('error', function () { v.remove(); }, { once: true });
  }
  if (allowVideo && 'IntersectionObserver' in window) {
    var near = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { prime(e.target); near.unobserve(e.target); } });
    }, { rootMargin: '120% 0px' });
    var seen = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        prime(e.target);
        var p = e.target.play(); if (p && p.catch) p.catch(function () {});
        seen.unobserve(e.target);
      });
    }, { threshold: 0.45 });
    vids.forEach(function (v) { near.observe(v); seen.observe(v); });
  } else vids.forEach(function (v) { v.remove(); });

  // Cards and their figures are on the page from the start (standard 12); arrival only lights the Explorer grid.
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        if (e.target.classList.contains('explorer')) e.target.querySelectorAll('g.grid').forEach(light);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    day.querySelectorAll('.pc,.plate').forEach(function (el) { io.observe(el); });
  } else {
    day.querySelectorAll('.pc,.plate').forEach(function (el) { el.classList.add('in'); });
    day.querySelectorAll('.explorer g.grid').forEach(light);
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { ticking = false; parallax(); ground(); measure(); kick(); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  var lastW = window.innerWidth, lastP = mq('(orientation: portrait)'), rt;
  window.addEventListener('resize', function () {
    var p = mq('(orientation: portrait)');
    if (window.innerWidth === lastW && p === lastP) return;
    lastW = window.innerWidth; lastP = p;
    clearTimeout(rt); rt = setTimeout(function () { build(); parallax(); ground(); kick(); }, 150);
  });
  function start() { build(); parallax(); ground(); measure(); kick(); }
  window.addEventListener('load', start);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  start();
})();
