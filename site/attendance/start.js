/* Attendance Explorer: "Start here". Three questions, then a briefing (brief.js) on the right page.
   Rule-based: every answer maps to sections and settings through the tables below. Choices live in the address:
     /attendance/start/?role=governor&k=s&id=137384&q=compare,improving&step=3
   k is s (school), t, a, y, c, w (as on group pages) or e (England); id is the URN or the group id. */
(function () {
  // ---- Question 1. Role changes the title of the briefing (brief.js) and the order of its sections, never the figures.
  const ROLES = [
    {id: 'head', label: 'Headteacher or senior leader', order: ['compare', 'improving'], hint: 'Your own school is the natural place to start.'},
    {id: 'trust', label: 'Trust leader', order: ['compare', 'improving'], hint: 'Start with your trust, then look at one school at a time.'},
    {id: 'governor', label: 'Governor or trustee', order: ['improving', 'compare'], hint: 'Start with your school, or with your trust if you are a trustee.'},
    {id: 'la', label: 'Local authority officer or councillor', order: ['compare', 'improving'], hint: 'Start with your local authority, or with your ward if you are a councillor.'},
    {id: 'press', label: 'Journalist or researcher', order: ['improving', 'compare'], hint: 'A local authority, county or constituency is a good place to start.'},
    {id: 'parent', label: 'Parent or carer', order: ['improving', 'compare'], hint: 'Start with your child’s school.'}];

  // ---- Question 3, as asked.
  const WANTS = [
    {id: 'compare', label: 'How does it compare?'},
    {id: 'improving', label: 'Is absence falling?'},
    {id: 'groups', label: 'Which pupils miss the most school?'},
    {id: 'severe', label: 'Severe absence'},
    {id: 'whole', label: 'The whole picture'}];

  // ---- The mapping: page type x question -> sections (data-nav names) and settings.
  // "Summary" always opens a briefing and "Method" always closes it. Questions are taken in the role's order.
  // `solo` applies only when "How does it compare?" is not also ticked (one page has one "Compare by" setting).
  // `own` makes a briefing of its own, opened beside the main one, because it needs a different page or measure.
  const MAP = {
    school: {   // /attendance/school/?urn=
      all: ['Summary', 'Three ways', 'Position', 'Year by year', 'Since 2018/19'],
      compare: {show: ['Three ways', 'Position'], says: 'Beside England, its local authority and the 20 schools most like it.'},
      improving: {show: ['Year by year', 'Since 2018/19'], says: 'Year by year, and against 2018/19.'},
      groups: {own: 'la', show: ['Summary', 'Pupil groups'], says: 'The DfE publishes this for local authorities, not for schools, so it opens a second briefing for the school’s local authority.'},
      severe: null,   // never for a single school
      whole: {says: 'Every section of the school’s page.'}},
    group: {    // /attendance/group/?k=&id=   (t trust, a local authority, y county, c constituency, w ward)
      all: ['Summary', 'Side by side', 'Pupil groups', 'School by school', 'Year by year', 'Compared', 'The schools'],
      compare: {show: ['Compared', 'School by school'], set: {v: 'now'}, says: 'Beside England and others of its kind, with the spread across its own schools.'},
      improving: {show: ['Year by year'], solo: {show: ['Compared'], set: {v: 'yr'}}, says: 'Year by year, and the change from a year earlier.'},
      groups: {kinds: 'ay', show: ['Pupil groups'], says: 'Pupils eligible for free school meals, pupils with SEN support and pupils with an education, health and care plan.'},
      severe: {own: 'self', show: ['Summary', 'Year by year', 'Compared'], set: {m: 'sev'}, says: 'The share of pupils who missed half or more of their sessions. This opens as a briefing of its own.'},
      whole: {says: 'Every section of the page.'}},
    england: {  // /attendance/
      all: ['Summary', 'Day by day', 'Week by week', 'Weekdays', 'Reasons', 'Map', 'Against last year'],
      compare: {show: ['Map', 'Against last year'], says: 'Every local authority on a map, and this year beside the same point last year.'},
      improving: {show: ['Week by week', 'Against last year'], says: 'Week by week this year, and beside the same point last year.'},
      groups: null, severe: null,
      whole: {says: 'Every section of the page.'}}};
  // What to say when a question is not offered for the chosen place.
  const NOTES = {
    groups: 'Absence by pupil group is shown for local authorities and counties only, because the DfE does not publish it for anything smaller. Choose a local authority or a county at step 2 to see it.',
    severeSchool: 'Severe absence is never shown for a single school, where it usually describes a handful of children. It is given for trusts and areas.'};

  // How each section is named in the sentence above the button.
  const SAYS = {'Summary': 'the latest figures', 'Three ways': 'the school beside England, its local authority and similar schools',
    'Position': 'where it sits among schools of its phase', 'Year by year': 'the record year by year', 'Since 2018/19': 'the change since 2018/19',
    'Side by side': 'a side-by-side table', 'Pupil groups': 'absence by pupil group', 'School by school': 'the spread across its schools',
    'Compared': 'how it compares with others of its kind', 'The schools': 'the list of its schools', 'Day by day': 'the calendar of school days',
    'Week by week': 'the record week by week', 'Weekdays': 'the pattern across the week', 'Reasons': 'the reasons recorded for absence',
    'Map': 'the map of local authorities', 'Against last year': 'the comparison with the same point last year'};
  const KIND = {s: 'School', t: 'Trust', a: 'Local authority', y: 'County', c: 'Constituency', w: 'Ward', e: 'England'};
  const PH = {P: 'Primary', S: 'Secondary', X: 'Special'};
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const list = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);

  // ---- state
  const S = {step: 1, role: null, k: null, id: null, q: []};
  let place = null;   // {k, id, name, sub, la: {id, name}, ph}
  const readUrl = () => { const p = new URLSearchParams(location.search);
    S.role = ROLES.some((r) => r.id === p.get('role')) ? p.get('role') : null;
    S.k = KIND[p.get('k')] ? p.get('k') : null; S.id = S.k === 'e' ? 'england' : S.k && p.get('id') ? p.get('id') : null; if (!S.id) S.k = null;
    S.q = (p.get('q') || '').split(',').filter((x) => WANTS.some((w) => w.id === x));
    const st = +p.get('step') || 1; S.step = !S.role ? 1 : !S.k ? Math.min(st, 2) : Math.min(Math.max(st, 1), 3); };
  const url = () => { const p = [];
    if (S.role) p.push('role=' + S.role); if (S.k) { p.push('k=' + S.k); if (S.k !== 'e') p.push('id=' + encodeURIComponent(S.id)); }
    if (S.q.length) p.push('q=' + S.q.join(',')); if (S.step > 1) p.push('step=' + S.step);
    return location.pathname + (p.length ? '?' + p.join('&') : ''); };
  const write = (push) => { if (url() !== location.pathname + location.search) history[push ? 'pushState' : 'replaceState'](null, '', url()); };

  // ---- the place: names and a school's local authority come from the search index
  let data = null;
  const load = () => data || (data = Promise.all([fetch('/attendance/data/schools.json').then((r) => r.json()), fetch('/attendance/data/groups.json').then((r) => r.json())])
    .then(([s, g]) => ({s, g: g.data})).catch(() => null));
  const resolve = () => { if (!S.k) { place = null; return Promise.resolve(); }
    if (S.k === 'e') { place = {k: 'e', id: 'england', name: 'England', sub: 'All state-funded schools'}; return Promise.resolve(); }
    if (place && place.k === S.k && String(place.id) === String(S.id) && (S.k !== 's' || place.la !== undefined)) return Promise.resolve();
    return load().then((d) => { if (!d) { if (!place) { S.k = S.id = null; } return; }
      if (S.k === 's') { const i = d.s.data.urn.findIndex((u) => String(u) === String(S.id)); if (i < 0) { place = null; S.k = S.id = null; return; }
        const code = d.s.las && d.s.las[d.s.data.la[i]], j = code ? d.g.id.findIndex((x, n) => x === code && d.g.k[n] === 'a') : -1;
        place = {k: 's', id: String(S.id), name: d.s.data.name[i], ph: d.s.data.ph[i], sub: [PH[d.s.data.ph[i]], d.s.data.town[i]].filter(Boolean).join(' · '),
          la: j >= 0 ? {id: code, name: d.g.name[j]} : null}; }
      else { const i = d.g.id.findIndex((x, n) => x === S.id && d.g.k[n] === S.k); if (i < 0) { place = null; S.k = S.id = null; return; }
        place = {k: S.k, id: S.id, name: d.g.name[i], sub: KIND[S.k] + ' · ' + d.g.n[i] + (d.g.n[i] === 1 ? ' school' : ' schools')}; } }); };

  // ---- which questions are offered for this place, and why not
  const pageOf = (p) => (p.k === 's' ? 'school' : p.k === 'e' ? 'england' : 'group');
  const offered = (p) => { const M = MAP[pageOf(p)], out = [], notes = [];
    WANTS.forEach((w) => { const m = M[w.id];
      if (w.id === 'groups') { const ok = m && (m.own === 'la' ? !!p.la : !m.kinds || m.kinds.includes(p.k)); if (ok) out.push(w); else notes.push(NOTES.groups); }
      else if (w.id === 'severe') { if (m) out.push(w); else if (p.k === 's') notes.push(NOTES.severeSchool); }
      else if (m) out.push(w); });
    return {out, notes}; };

  // ---- answers -> briefings. Returns [{name, href, show, what}], the main briefing first.
  const address = (p, show, set) => { const base = p.k === 's' ? AXsearch.href(p.id) : p.k === 'e' ? '/attendance/' : AXsearch.ghref(p.k, p.id);
    const q = Object.keys(set || {}).filter((k) => !(k === 'v' && set[k] === 'now')).map((k) => k + '=' + encodeURIComponent(set[k]));
    q.push('brief=' + S.role, 'show=' + show.map(encodeURIComponent).join(','));
    return base + (base.includes('?') ? '&' : '?') + q.join('&'); };
  const build = (p) => { const page = pageOf(p), M = MAP[page], role = ROLES.find((r) => r.id === S.role) || ROLES[0];
    const ok = offered(p).out.map((w) => w.id); let q = S.q.filter((x) => ok.includes(x)); const none = !q.length; if (none) q = ['whole'];
    const out = []; let show = ['Summary'], set = {};
    const add = (m) => { m.show.forEach((n) => { if (!show.includes(n)) show.push(n); }); Object.assign(set, m.set || {}); };
    if (q.includes('whole')) show = M.all.slice();
    else { role.order.forEach((id) => { if (!q.includes(id)) return; add(M[id]); if (M[id].solo && !q.includes('compare')) add(M[id].solo); });
      if (q.includes('groups') && !M.groups.own) add(M.groups); }
    const main = q.some((x) => x === 'whole' || !M[x].own);
    if (main) out.push({name: p.name, href: address(p, show, set), show, what: ''});
    q.forEach((id) => { const m = M[id]; if (!m || !m.own) return;
      if (m.own === 'la') out.push({name: p.la.name, href: address({k: 'a', id: p.la.id}, m.show, p.ph ? {phase: p.ph} : {}), show: m.show, what: 'Absence by pupil group in ' + p.la.name});
      else out.push({name: p.name, href: address(p, m.show, m.set), show: m.show, what: 'Severe absence in ' + p.name}); });
    return {out, none}; };

  // ---- drawing
  const option = (type, name, value, label, says, checked) => { const l = el('label', 'st-opt'), i = el('input'); i.type = type; i.name = name; i.value = value; i.checked = checked;
    const t = el('span', 'st-opt-t'); t.appendChild(el('b', null, label)); if (says) t.appendChild(el('small', null, says)); l.append(i, t); return l; };

  function plan() {
    if (!place) return; const {out, none} = build(place), first = out[0];
    $('st-build').href = first.href;
    $('st-plan').textContent = (none ? 'Nothing is ticked yet, so you will get the whole picture. ' : '')
      + 'Your briefing on ' + first.name + ' will show ' + list(first.show.map((n) => SAYS[n] || n.toLowerCase())) + ', then sources and method.';
    const also = $('st-also'); also.innerHTML = ''; also.hidden = out.length < 2;
    if (out.length > 1) { also.appendChild(el('p', null, out.length > 2 ? 'Two more briefings cover the rest of what you chose.' : 'One more briefing covers the rest of what you chose.'));
      out.slice(1).forEach((b) => { const a = el('a', 'ax-btn st-also-a', b.what); a.href = b.href; also.appendChild(a); }); }
  }

  function draw(focus) {
    const role = ROLES.find((r) => r.id === S.role);
    [1, 2, 3].forEach((n) => { $('st-' + n).hidden = S.step !== n; });
    $('st-count').textContent = 'Step ' + S.step + ' of 3';
    [...$('st-steps').querySelectorAll('button')].forEach((b) => { const n = +b.dataset.step, can = n === 1 || (n === 2 && !!S.role) || (n === 3 && !!S.role && !!place);
      b.disabled = !can; if (n === S.step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.querySelector('small').textContent = n === 1 ? (role ? role.label : '') : n === 2 ? (place ? place.name : '') : ''; });
    $('st-need-1').hidden = true; $('st-need-2').hidden = true;

    const roles = $('st-roles'); roles.innerHTML = ''; ROLES.forEach((r) => roles.appendChild(option('radio', 'role', r.id, r.label, '', r.id === S.role)));
    $('st-hint').textContent = (role ? role.hint + ' ' : '') + 'You can choose any school, trust, local authority, county, constituency or ward in England.';
    const ch = $('st-chosen'); ch.hidden = !place; ch.innerHTML = '';
    if (place) { ch.append(el('span', 'st-chosen-k', 'Chosen'), el('b', null, place.name), el('small', null, place.sub || '')); }

    const wants = $('st-wants'), notes = $('st-notes'); wants.innerHTML = ''; notes.innerHTML = '';
    if (place) { const o = offered(place), M = MAP[pageOf(place)];
      o.out.forEach((w) => { let says = M[w.id].says; if (w.id === 'groups' && M.groups.own === 'la') says = 'The DfE publishes this for local authorities, not for schools, so it opens a second briefing for ' + place.la.name + '.';
        wants.appendChild(option('checkbox', 'want', w.id, w.label, says, S.q.includes(w.id))); });
      o.notes.forEach((t) => notes.appendChild(el('p', 'st-note', t)));
      plan(); }
    if (focus) { const lg = $('st-' + S.step).querySelector('legend'); if (lg) lg.focus({preventScroll: true});
      const top = $('st-form').getBoundingClientRect().top; if (top < 0) scrollTo(0, scrollY + top - 12); }
  }

  const go = (n, push) => { S.step = n; write(push !== false); draw(true); };

  function init() {
    const form = $('st-form'); if (!form) return;
    form.addEventListener('submit', (e) => e.preventDefault());
    form.addEventListener('click', (e) => { const r = e.target.closest('input[name=role]'); if (r && e.detail > 0) setTimeout(() => go(2), 120); });
    form.addEventListener('change', (e) => { const t = e.target;
      if (t.name === 'role') { S.role = t.value; $('st-need-1').hidden = true; write(false); draw(false); const again = form.querySelector('input[name=role]:checked'); if (again) again.focus(); }
      if (t.name === 'want') { S.q = [...form.querySelectorAll('input[name=want]:checked')].map((i) => i.value); write(false); plan(); } });
    form.addEventListener('click', (e) => { const b = e.target.closest('[data-go],[data-step]'); if (!b || b.disabled) return; const n = +(b.dataset.go || b.dataset.step);
      if (n > 1 && !S.role) { S.step = 1; draw(false); $('st-need-1').hidden = false; return; }
      if (n > 2 && !place) { S.step = 2; draw(false); $('st-need-2').hidden = false; return; }
      if (n !== S.step) go(n); });
    const pick = (k, id, known) => { S.k = k; S.id = String(id); place = known || null; S.q = []; resolve().then(() => { if (place) go(3); else draw(false); }); };
    AXsearch($('st-q'), $('st-list'), (r) => { if (r.kind) pick(r.kind, r.id, {k: r.kind, id: r.id, name: r.name, sub: KIND[r.kind] + ' · ' + r.n + (r.n === 1 ? ' school' : ' schools')}); else pick('s', r.urn); }, true);
    $('st-england').addEventListener('click', () => pick('e', 'england'));
    $('st-reset').addEventListener('click', () => { S.step = 1; S.role = S.k = S.id = null; S.q = []; place = null; write(true); draw(true); });
    addEventListener('popstate', () => { readUrl(); resolve().then(() => { if (!place && S.step > 2) S.step = 2; draw(true); }); });
    readUrl(); resolve().then(() => { if (!place && S.step > 2) S.step = 2; write(false); draw(false); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
