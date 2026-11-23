#!/usr/bin/env python3
"""Build the Attendance Explorer's data from data/raw/attendance (see scripts/fetch_attendance.py).

Outputs (site/attendance/data/):
  pulse.json        release details, areas, the hex layout, England day by day, and every area week by week
  area/<code>.json  one area day by day (regions and local authorities), fetched when that area is chosen

Rates are percentages of possible sessions, held as hundredths of a point (integers; null where withheld).
A day is withheld where the area had under 80% of its usual possible sessions, and a week where it had
under 70% (holidays fall on different dates in different places, and the pupils still in school on those
days are not typical of the whole) or fewer than
MIN_SESSIONS possible sessions (about 50 pupils), so no rate rests on a handful of children.
Phases: A all, P primary, S secondary, X special. "All" is the sum of the three.

Run from the repository root: python3 scripts/build_attendance.py
"""
import csv, datetime, glob, json, os, statistics, sys

RAW = 'data/raw/attendance'
OUT = 'site/attendance/data'
COLS = ['poss', 'abs', 'auth', 'unauth', 'ill', 'hol_u', 'late', 'none']
RATES = ['abs', 'auth', 'unauth', 'ill', 'hol_u', 'late', 'none']
PH = ['A', 'P', 'S', 'X']
MIN_SESSIONS = 100
USUAL_DAY = 0.8
USUAL_WEEK = 0.7


def rate(n, d):
    return None if not d else round(10000 * n / d)


def monday(d):
    x = datetime.date.fromisoformat(d)
    return (x - datetime.timedelta(days=x.weekday())).isoformat()


def load(path):
    """{code: {phase: {date: [counts]}}}, with phase A added."""
    t = {}
    for r in csv.DictReader(open(path, encoding='utf-8')):
        v = [int(r[c] or 0) for c in COLS]
        a = t.setdefault(r['code'], {})
        a.setdefault(r['phase'], {})[r['date']] = v
        s = a.setdefault('A', {}).setdefault(r['date'], [0] * len(COLS))
        for i, x in enumerate(v):
            s[i] += x
    return t


def usual(series):
    """The possible sessions on a usual day (or week) for this series: the median of its upper half."""
    p = sorted(v[0] for v in series.values())
    return statistics.median(p[len(p) // 2:]) if p else 0


def keep(v, base, floor, share):
    return v is not None and v[0] >= floor and v[0] >= share * base


def daily(series, dates):
    base = usual(series)
    out = {k: [] for k in RATES}
    for d in dates:
        v = series.get(d)
        ok = keep(v, base, MIN_SESSIONS, USUAL_DAY)
        for i, k in enumerate(RATES):
            out[k].append(rate(v[i + 1], v[0]) if ok else None)
    return out


def weekly(series, weeks):
    w = {}
    for d, v in series.items():
        s = w.setdefault(monday(d), [0] * len(COLS))
        for i, x in enumerate(v):
            s[i] += x
    base = usual(w)
    out = {k: [] for k in ('abs', 'auth', 'unauth')}
    for m in weeks:
        v = w.get(m)
        ok = keep(v, base, MIN_SESSIONS * 5, USUAL_WEEK)
        for i, k in enumerate(('abs', 'auth', 'unauth')):
            out[k].append(rate(v[i + 1], v[0]) if ok else None)
    return out


def to_date(series, last):
    """Year to date rates up to and including the date `last` (ISO)."""
    s = [0] * len(COLS)
    for d, v in series.items():
        if d <= last:
            for i, x in enumerate(v):
                s[i] += x
    if s[0] < MIN_SESSIONS * 5:
        return None
    return {k: rate(s[i + 1], s[0]) for i, k in enumerate(RATES)}


def main():
    files = sorted(glob.glob(os.path.join(RAW, 'pulse_2*.csv')))
    if not files:
        print('attendance: no raw data, nothing built'); return
    years = [int(os.path.basename(f)[6:10]) for f in files]
    data = {y: load(f) for y, f in zip(years, files)}
    areas = list(csv.DictReader(open(os.path.join(RAW, 'areas.csv'), encoding='utf-8')))
    order = {'national': 0, 'region': 1, 'la': 2}
    areas.sort(key=lambda a: (order[a['level']], a['name']))
    eng = next(a['code'] for a in areas if a['level'] == 'national')
    cur = years[-1]
    days = {y: sorted(data[y][eng]['A']) for y in years}
    weeks = {y: sorted({monday(d) for d in days[y]}) for y in years}
    last = days[cur][-1]
    # the same point in each earlier year: the same number of days after 1 September
    def same_point(y):
        x = datetime.date.fromisoformat(last)
        return x.replace(year=x.year - (cur - y)).isoformat()

    os.makedirs(os.path.join(OUT, 'area'), exist_ok=True)
    release = json.load(open(os.path.join(RAW, 'pulse_release.json')))
    pulse = {'release': release, 'built': datetime.date.today().isoformat(), 'years': years, 'rates': RATES,
             'areas': [{'c': a['code'], 'n': a['name'], 'l': a['level'], 'r': a['region']} for a in areas],
             'hex': json.load(open(os.path.join(RAW, 'la_hex.json'))),
             'days': {str(y): days[y] for y in years}, 'weeks': {str(y): weeks[y] for y in years},
             'england': {}, 'weekly': {}, 'ytd': {}}
    for y in years:
        pulse['england'][str(y)] = {p: daily(data[y][eng].get(p, {}), days[y]) for p in PH}
    n = 0
    for a in areas:
        c = a['code']
        pulse['weekly'][c] = {str(y): {p: weekly(data[y].get(c, {}).get(p, {}), weeks[y]) for p in PH} for y in years}
        pulse['ytd'][c] = {str(y): {p: to_date(data[y].get(c, {}).get(p, {}), same_point(y)) for p in PH} for y in years}
        if c != eng:
            one = {'code': c, 'name': a['name'],
                   'daily': {str(y): {p: daily(data[y].get(c, {}).get(p, {}), days[y]) for p in PH} for y in years}}
            json.dump(one, open(os.path.join(OUT, 'area', c + '.json'), 'w'), separators=(',', ':'))
            n += 1
    path = os.path.join(OUT, 'pulse.json')
    json.dump(pulse, open(path, 'w'), separators=(',', ':'))
    e = pulse['ytd'][eng][str(cur)]['A']
    print(f'attendance: {path} {os.path.getsize(path) // 1024} KB, {n} area files; England {cur}/{cur % 100 + 1} to {last}: '
          f"overall absence {e['abs'] / 100:.2f}%")
    share_card(pulse, eng, cur, last)
    # models of percentages stay within 0-100%
    for c in pulse['ytd']:
        for y in pulse['ytd'][c]:
            for p, v in pulse['ytd'][c][y].items():
                assert v is None or all(0 <= x <= 10000 for x in v.values()), (c, y, p)


def share_card(pulse, eng, cur, last):
    """The image shown when an Attendance Explorer link is shared: 1200 x 630 PNG, drawn from the newest figures."""
    try:
        from PIL import Image, ImageDraw
        import build_pages
        disp, sans = build_pages.load_fonts()
    except Exception as e:                      # no Pillow: the pages still work, links just share without an image
        print('attendance: share card not drawn:', e); return
    W, H, M = 1200, 630, 64
    GROUND, INK, MUTED, BRASS, VERD, RUST = '#0B1A2E', '#F5F1E8', '#A8B5C8', '#C9A24B', '#6FA299', '#C98672'
    im = Image.new('RGB', (W, H), GROUND); d = ImageDraw.Draw(im)
    d.text((M, 56), 'ATTENDANCE EXPLORER', font=sans(22, 600), fill=BRASS)
    d.text((M, 96), 'School attendance,', font=disp(68), fill=INK); d.text((M, 172), 'day by day', font=disp(68), fill=INK)
    y = pulse['ytd'][eng][str(cur)]['A']; prev = pulse['ytd'][eng].get(str(cur - 1), {}).get('A')
    day = datetime.date.fromisoformat(last)
    d.text((M, 286), f"{y['abs'] / 100:.1f}%", font=sans(96, 600), fill=INK)
    d.text((M + 300, 306), 'of sessions missed in England', font=sans(28), fill=INK)
    d.text((M + 300, 346), f"since September, to {day.day} {day.strftime('%B %Y')}" + (f"; {prev['abs'] / 100:.1f}% a year earlier" if prev else ''), font=sans(28), fill=MUTED)
    # the year so far: one square a day, green below the average for the year and rust above
    days, vals = pulse['days'][str(cur)], pulse['england'][str(cur)]['A']['abs']
    base = datetime.date(cur, 9, 1); base -= datetime.timedelta(days=base.weekday())
    cw, x0, y0 = 22, M, 430
    for iso, v in zip(days, vals):
        if v is None:
            continue
        dt = datetime.date.fromisoformat(iso); wk, dow = (dt - base).days // 7, dt.weekday()
        d.rectangle([x0 + wk * cw, y0 + dow * cw, x0 + wk * cw + cw - 4, y0 + dow * cw + cw - 4], fill=VERD if v < y['abs'] else RUST)
    d.line([(M, H - 54), (W - M, H - 54)], fill=BRASS, width=2)
    d.text((M, H - 42), 'Every local authority, school, trust, constituency and ward. Source: Department for Education.', font=sans(20), fill=MUTED)
    d.text((W - M, H - 42), 'mrkdltn.com/attendance', font=sans(20, 600), fill=INK, anchor='ra')
    im.save(os.path.join(OUT, 'card.png'), optimize=True)


# ---------------------------------------------------------------- schools (termly and full-year census statistics)
SHARDS = 64
MIN_ENROL = 10          # no rate is shown for a school with fewer than 10 enrolments
SCOLS = ['enrol', 'abs', 'unauth', 'pa', 'ill', 'hol_u']
OFSTED = ['Exceptional', 'Strong standard', 'Expected standard', 'Needs attention', 'Urgent improvement']


def schools():
    apath = os.path.join(RAW, 'school_absence.csv')
    if not os.path.exists(apath):
        print('attendance: no school data, school view not built'); return
    I = lambda v: int(v) if v != '' else None
    rows = {}
    for r in csv.DictReader(open(apath, encoding='utf-8')):
        rows.setdefault(r['urn'], {})[r['period']] = [I(r['enrol']), I(r['poss'])] + [I(r[c]) for c in SCOLS[1:]]
    meta = {r['urn']: r for r in csv.DictReader(open(os.path.join(RAW, 'schools.csv'), encoding='utf-8'))}
    periods = sorted({p for h in rows.values() for p in h})
    fy = [p for p in periods if not p.endswith('AS')]
    terms = [p for p in periods if p.endswith('AS')]
    latest, fy_last = terms[-1], fy[-1]
    release = json.load(open(os.path.join(RAW, 'schools_release.json')))

    # Ofsted's attendance and behaviour grade, newest report card per school (stated as a fact, with its date)
    grade = {}
    for name in ('ofsted_rc.csv', 'reports_daily.csv'):
        path = os.path.join('data/raw', name)
        if os.path.exists(path):
            for r in csv.DictReader(open(path, encoding='utf-8')):
                if r.get('g_ab') in OFSTED and (r['urn'] not in grade or (r.get('insp_date') or '') > grade[r['urn']][1]):
                    grade[r['urn']] = (OFSTED.index(r['g_ab']), r.get('insp_date') or '')

    # benchmarks: pooled rates for England and each local authority, by phase and period
    def pool(urns_periods):
        e = po = ab = un = pa = 0
        for v in urns_periods:
            if v[0] is None or v[1] is None or v[2] is None:
                continue
            e += v[0]; po += v[1]; ab += v[2] * v[1]; un += (v[3] or 0) * v[1]; pa += (v[4] or 0) * v[0]
        return None if not po or e < MIN_ENROL else [round(ab / po), round(un / po), round(pa / e)]
    groups = {}
    for u, h in rows.items():
        m = meta[u]
        for p, v in h.items():
            groups.setdefault(('E', m['phase'], p), []).append(v)
            groups.setdefault((m['la'], m['phase'], p), []).append(v)
            groups.setdefault(('E', 'A', p), []).append(v)
    bench = {}
    for (a, ph, p), vs in groups.items():
        bench.setdefault(a, {}).setdefault(ph, {})[p] = pool(vs)
    eng = bench['E']['A'][latest]
    print(f"attendance schools: England {latest}: overall {eng[0] / 100:.2f}%, persistent absence {eng[2] / 100:.2f}%")

    def shown(v):
        """A school's figures for one period, or None where withheld."""
        return None if v is None or v[0] is None or v[0] < MIN_ENROL or v[2] is None else [v[0]] + v[2:]

    def raw_history(u):
        """Every period under this URN, with full years extended back through single predecessors. ({period: raw}, join)."""
        out, join, seen, cur = dict(rows[u]), None, {u}, u
        while True:
            pr = meta.get(cur, {}).get('pred')
            if not pr or pr in seen or pr not in rows:
                break
            seen.add(pr)
            first = min([p for p in out if not p.endswith('AS')] or ['9999'])
            add = {p: v for p, v in rows[pr].items() if not p.endswith('AS') and p < first}
            if add:
                join = join or first
                out.update(add)
            cur = pr
        return out, join

    def history(u):
        raw, join = raw_history(u)
        return {p: shown(v) for p, v in raw.items()}, join

    # context and similar schools (scripts/model_attendance.py), where present. No expected rate is published.
    ctx, mod, model = {}, {}, None
    if os.path.exists(os.path.join(RAW, 'school_model.csv')):
        F = lambda v: float(v) if v != '' else None
        ctx = {r['urn']: [F(r['fsm_pct']), F(r['eal_pct']), F(r['sen_pct']), F(r['ehcp_pct']), int(r['pupils']), int(r['rural'])]
               for r in csv.DictReader(open(os.path.join(RAW, 'school_context.csv'), encoding='utf-8'))}
        mod = {r['urn']: r for r in csv.DictReader(open(os.path.join(RAW, 'school_model.csv'), encoding='utf-8'))}
        model = json.load(open(os.path.join(RAW, 'model.json')))
        model['release'] = json.load(open(os.path.join(RAW, 'context_release.json')))
        if model['period'] != latest:
            print(f"attendance: similar schools were matched on {model['period']} but the newest period is {latest}; re-run scripts/model_attendance.py")

    current = sorted((u for u in rows if latest in rows[u] or fy_last in rows[u]), key=int)
    current = [u for u in current if latest in rows[u]]            # the newest release defines who is listed
    out = os.path.join(OUT, 'sch')
    os.makedirs(out, exist_ok=True)
    shards = [dict() for _ in range(SHARDS)]
    las = sorted({meta[u]['la'] for u in current})
    index = {k: [] for k in ('urn', 'name', 'town', 'pc', 'la', 'ph')}
    dist = {ph: {k: [] for k in ('urn', 'la', 'enrol', 'abs', 'pa', 'chg', 'fsm', 'eal', 'sen', 'ehcp')} for ph in 'PSX'}
    base = '2018'
    trust_n = {}
    for u in current:
        trust_n[meta[u].get('trust_id', '')] = trust_n.get(meta[u].get('trust_id', ''), 0) + 1
    for u in current:
        m = meta[u]
        h, join = history(u)
        rec = {'n': m['name'], 'ph': m['phase'], 'la': m['la'], 'town': m['town'], 'pc': m['postcode'], 'trust': m['trust'], 'tid': m.get('trust_id', ''),
               'ward': m['ward'], 'pcon': m['pcon'], 'pc_code': m['pcon_code'], 'h': {p: v for p, v in h.items() if v}}
        if m.get('trust_id'):
            rec['tname'] = tidy(m['trust']); rec['multi'] = trust_n[m['trust_id']] >= 2
            if m.get('trust_joined'):
                rec['tj'] = m['trust_joined'][:7]
            if m.get('trust_before'):
                rec['tprev'] = tidy(m['trust_before'])
        if join:
            rec['join'] = join
        if u in grade:
            rec['g'] = list(grade[u])
        if u in ctx:
            rec['ctx'] = ctx[u]
        if u in mod and h.get(latest):
            k = mod[u]
            nn = [x for x in k['nn'].split() if latest in rows.get(x, {})]
            rec['nn'] = [int(x) for x in nn]
            rec['sim'] = pool([rows[x][latest] for x in nn])
        shards[int(u) % SHARDS][u] = rec
        for k, v in (('urn', int(u)), ('name', m['name']), ('town', m['town']), ('pc', m['postcode']), ('la', las.index(m['la'])), ('ph', m['phase'])):
            index[k].append(v)
        now = h.get(latest)
        if now and m['phase'] in dist:
            d = dist[m['phase']]
            a, b = h.get(fy_last), h.get(base)
            d['urn'].append(int(u)); d['la'].append(las.index(m['la'])); d['enrol'].append(now[0]); d['abs'].append(now[1]); d['pa'].append(now[3])
            d['chg'].append(a[1] - b[1] if a and b else None)
            c = ctx.get(u, [None] * 6)
            for i, k in enumerate(('fsm', 'eal', 'sen', 'ehcp')):
                d[k].append(c[i])
    for i, sh in enumerate(shards):
        json.dump(sh, open(os.path.join(out, f'{i}.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
    json.dump({'n': len(current), 'las': las, 'data': index}, open(os.path.join(OUT, 'schools.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
    for ph, d in dist.items():
        json.dump(d, open(os.path.join(OUT, f'dist_{ph}.json'), 'w'), separators=(',', ':'))
    names = {a['code']: a['name'] for a in csv.DictReader(open(os.path.join(RAW, 'areas.csv'), encoding='utf-8'))}
    json.dump({'release': release, 'periods': periods, 'fy': fy, 'latest': latest, 'fy_last': fy_last, 'base': base, 'shards': SHARDS,
               'min_enrol': MIN_ENROL, 'cols': SCOLS, 'la_names': {c: names.get(c, c) for c in las}, 'bench': bench},
              open(os.path.join(OUT, 'bench.json'), 'w'), separators=(',', ':'))
    withheld = sum(1 for u in current if not shown(rows[u][latest]))
    print(f'attendance schools: {len(current)} schools in {SHARDS} shards; {withheld} withheld (under {MIN_ENROL} enrolments); '
          f"{sum(1 for sh in shards for r in sh.values() if 'join' in r)} with a predecessor's history joined; "
          f"{sum(1 for u in current if u in grade)} with an Ofsted attendance and behaviour grade")
    for d in dist.values():
        assert all(0 <= x <= 10000 for x in d['abs'] + d['pa'])
    groups_build(current, meta, rows, raw_history, shown, pool, periods, latest, bench, names)
    patterns_build(current, meta, rows, raw_history, pool, fy, ctx, model, bench, names)


# ---------------------------------------------------------------- trusts and constituencies
G_SHARDS = 16
MIN_SCHOOLS = 3         # a pooled rate for a phase needs at least three schools
MIN_TRUST = 5           # and a trust needs at least five schools in all


def tidy(name):
    """GIAS holds trust names in capitals."""
    small = {'of', 'and', 'the', 'for', 'in', 'at', 'on'}
    keep = {'CE', 'RC', 'UK', 'MAT', 'CIO', 'II', 'III', 'E-ACT', 'ARK', 'TKAT', 'DRET', 'OGAT', 'CofE'}
    out = []
    for i, w in enumerate(name.split()):
        if w in keep or not w.isupper():
            out.append(w)
        elif w.lower() in small and i:
            out.append(w.lower())
        else:
            out.append('-'.join(x[:1] + x[1:].lower() for x in w.split('-')).replace("'S", "'s"))
    return ' '.join(out)


G_KIND_SHARDS = {'t': 16, 'c': 16, 'w': 64, 'y': 1, 'a': 8}
PG = ['all', 'fsm', 'nfsm', 'sen', 'ehcp', 'nosen']


def pupil_groups():
    """Absence by pupil group for England, regions and local authorities (DfE): {code: {phase: {group: {period: [enrol, poss, abs, pa]}}}}.
    Groups of fewer than 10 pupils are dropped."""
    path = os.path.join(RAW, 'la_groups.csv')
    out = {}
    if os.path.exists(path):
        for r in csv.DictReader(open(path, encoding='utf-8')):
            if int(r['enrol']) >= MIN_ENROL:
                out.setdefault(r['code'], {}).setdefault(r['phase'], {}).setdefault(r['group'], {})[r['period']] = [int(r['enrol']), int(r['poss']), int(r['abs']), int(r['pa'])]
    return out


def pg_pool(parts):
    """Pool several areas' pupil-group figures: {phase: {group: {period: [abs, pa]}}}."""
    acc = {}
    for a in parts:
        for ph, gs in a.items():
            for g, ps in gs.items():
                for p, v in ps.items():
                    t = acc.setdefault(ph, {}).setdefault(g, {}).setdefault(p, [0, 0, 0, 0])
                    t[0] += v[0]; t[1] += v[1]; t[2] += v[2] * v[1]; t[3] += v[3] * v[0]
    return {ph: {g: {p: [round(t[2] / t[1]), round(t[3] / t[0])] for p, t in ps.items() if t[0] >= MIN_ENROL and t[1]} for g, ps in gs.items()} for ph, gs in acc.items()}


def groups_build(current, meta, rows, raw_history, shown, pool, periods, latest, bench=None, la_names=None):
    """Trusts (t), constituencies (c), wards (w, primary schools only) and ceremonial counties (y)."""
    county = {r['la']: r['county'] for r in csv.DictReader(open(os.path.join(RAW, 'counties.csv'), encoding='utf-8'))}
    geo = json.load(open(os.path.join(RAW, 'ward_geo.json'))) if os.path.exists(os.path.join(RAW, 'ward_geo.json')) else {'districts': {}}
    ward_lad = {w: d for d, v in geo['districts'].items() for w in v['wards']}
    slug = lambda t: ''.join(ch if ch.isalnum() else '-' for ch in t.lower()).strip('-')
    la_hex = json.load(open(os.path.join(RAW, 'la_hex.json')))['hexes']
    pg = pupil_groups()
    terms = [p for p in periods if p.endswith('AS')]
    fys = [p for p in periods if not p.endswith('AS')]
    prev_as, fy_last, base = (terms[-2] if len(terms) > 1 else None), fys[-1], '2018'
    members = {}
    for u in current:
        m = meta[u]
        if m.get('trust_id'):
            members.setdefault(('t', m['trust_id']), []).append(u)
        if m['pcon_code'].startswith('E14'):
            members.setdefault(('c', m['pcon_code']), []).append(u)
        if m['ward_code'].startswith('E05'):
            members.setdefault(('w', m['ward_code']), []).append(u)
        if m['la'] in county:
            members.setdefault(('y', slug(county[m['la']])), []).append(u)
            members.setdefault(('a', m['la']), []).append(u)
    hexes = json.load(open(os.path.join(RAW, 'pcon_hex.json')))
    shards = {k: [dict() for _ in range(n)] for k, n in G_KIND_SHARDS.items()}
    index = {k: [] for k in ('k', 'id', 'name', 'n')}
    overview = {k: [] for k in G_KIND_SHARDS}
    ward_val = {}
    hist = {u: raw_history(u)[0] for u in current}
    key = lambda kind, g: sum(ord(c) for c in g) % G_KIND_SHARDS[kind]
    for (kind, gid), us in sorted(members.items()):
        if kind == 't' and len(us) < 2:
            continue
        m0 = meta[us[0]]
        name = {'t': lambda: tidy(m0['trust']), 'c': lambda: m0['pcon'], 'y': lambda: county[m0['la']], 'a': lambda: (la_names or {}).get(m0['la'], m0['la']),
                'w': lambda: m0['ward'] + ', ' + (geo['districts'].get(ward_lad.get(gid), {}).get('name') or (la_names or {}).get(m0['la'], ''))}[kind]()
        big = kind != 't' or len(us) >= MIN_TRUST
        rec = {'name': name, 'n': len(us), 'pooled': big, 'bench': {}, 'schools': []}
        row = {'id': gid, 'name': name, 'n': len(us)}
        for ph in ('P' if kind == 'w' else 'PSX'):      # secondary pupils travel too far for a ward figure to mean much
            ms = [u for u in us if meta[u]['phase'] == ph]
            if big and len(ms) >= MIN_SCHOOLS:
                b = {}
                for p in periods:
                    vs = [hist[u][p] for u in ms if p in hist[u]]
                    if len(vs) >= MIN_SCHOOLS:
                        r = pool(vs)
                        if r:
                            b[p] = r + [len(vs)]
                rec['bench'][ph] = b
                if latest in b:
                    g2 = lambda p, i: b[p][i] if p and p in b else None
                    # schools, pupils, overall, unauthorised, persistent; then the same two terms a year earlier (overall, persistent);
                    # then the newest full year and 2018/19 (overall, overall, persistent, persistent), for comparing change
                    row[ph] = [len(ms), sum(rows[u][latest][0] or 0 for u in ms if latest in rows[u])] + b[latest][:3] + [g2(prev_as, 0), g2(prev_as, 2), g2(fy_last, 0), g2(base, 0), g2(fy_last, 2), g2(base, 2)]
        if kind == 't' and big:
            # the trust's own record: only schools that had joined by the end of December of each year, under their present URN
            rec['bench_in'] = {}
            for ph in 'PSX':
                b = {}
                for p in periods:
                    vs = [rows[u][p] for u in us if meta[u]['phase'] == ph and p in rows[u] and meta[u].get('trust_joined') and meta[u]['trust_joined'] <= p[:4] + '-12-31']
                    if len(vs) >= MIN_SCHOOLS:
                        r = pool(vs)
                        if r:
                            b[p] = r + [len(vs)]
                if b:
                    rec['bench_in'][ph] = b
        if kind == 'a' and gid in pg:
            rec['pg'] = {ph: {g: {p: v[2:] for p, v in ps.items()} for g, ps in gs.items()} for ph, gs in pg[gid].items()}
        if kind == 'y':
            rec['pg'] = pg_pool([pg[la] for la in {meta[u]['la'] for u in us} if la in pg])
        if kind in 'ay' and rec.get('pg'):
            row['pg'] = {ph: {g: ps.get(latest) for g, ps in gs.items() if ps.get(latest)} for ph, gs in rec['pg'].items()}
        if kind == 'y':
            rec['las'] = [[la, (la_names or {}).get(la, la), {ph: (bench[la].get(ph, {}).get(latest) if bench and la in bench else None) for ph in 'PSX'}]
                          for la in sorted({meta[u]['la'] for u in us}, key=lambda c: (la_names or {}).get(c, c))]
        if kind == 'w':
            rec['lad'] = ward_lad.get(gid)
            ward_val[gid] = [len(us)] + (row['P'][2:] if 'P' in row else [None] * 9)
        for u in ([] if kind == 'y' else sorted(us, key=lambda u: meta[u]['name'])):
            v = shown(rows[u].get(latest))
            rec['schools'].append([int(u), meta[u]['name'], meta[u]['phase'], meta[u]['town']] + (v[:2] + [v[3]] if v else [None, None, None])
                                  + ([meta[u].get('trust_joined', '')[:7] or None, tidy(meta[u]['trust_before']) if meta[u].get('trust_before') else None] if kind == 't' else []))
        shards[kind][key(kind, gid)][gid] = rec
        for k, v in (('k', kind), ('id', gid), ('name', name), ('n', len(us))):
            index[k].append(v)
        if kind != 'w' and (kind != 't' or big):
            if kind == 'c':
                row.update(hexes['hexes'].get(gid, {}))
            if kind == 'a':
                row.update(la_hex.get(gid, {}))
            overview[kind].append(row)
    out = os.path.join(OUT, 'grp')
    os.makedirs(out, exist_ok=True)
    for kind in G_KIND_SHARDS:
        for i, sh in enumerate(shards[kind]):
            json.dump(sh, open(os.path.join(out, f'{kind}{i}.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
        json.dump(overview[kind], open(os.path.join(out, f'{kind}_all.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
    # ward maps: one file per district, each ward with its outline and its primary schools' pooled rate where shown
    gdir = os.path.join(OUT, 'geo')
    os.makedirs(gdir, exist_ok=True)
    for code, d in geo['districts'].items():
        json.dump({'name': d['name'], 'w': d['w'], 'h': d['h'], 'wards': [{'c': w, 'n': v['n'], 'p': v['p'], 'v': ward_val.get(w)} for w, v in d['wards'].items()]},
                  open(os.path.join(gdir, code + '.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
    eng_code = next((c for c in pg if c.startswith('E92')), None)
    json.dump({'periods': terms, 'groups': PG, 'england': {ph: {g: {p: v[2:] for p, v in ps.items()} for g, ps in gs.items()} for ph, gs in pg.get(eng_code, {}).items()},
               'release': json.load(open(os.path.join(RAW, 'groups_release.json'))) if os.path.exists(os.path.join(RAW, 'groups_release.json')) else None},
              open(os.path.join(OUT, 'pg.json'), 'w'), separators=(',', ':'))
    nomap = sum(1 for (k, g) in members if k == 'w' and g not in ward_lad)
    json.dump({'shards': G_KIND_SHARDS, 'data': index}, open(os.path.join(OUT, 'groups.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
    print(f"attendance groups: {index['k'].count('a')} local authorities, {index['k'].count('y')} counties, {index['k'].count('w')} wards ({sum(1 for v in ward_val.values() if v[1] is not None)} with a pooled primary rate, {nomap} without an outline), {index['k'].count('c')} constituencies, {index['k'].count('t')} trusts with two or more schools "
          f"({len(overview['t'])} with {MIN_TRUST} or more, which get pooled figures)")


# ---------------------------------------------------------------- patterns (the national picture)
def patterns_build(current, meta, rows, raw_history, pool, fy, ctx, model, bench, names):
    hist = {u: raw_history(u)[0] for u in current}
    out = {'fy': fy, 'model': model, 'gradient': {}, 'ridges': {}, 'regions': {}}
    # by eligibility for free school meals: schools in five equal groups by their newest census figure
    for ph in 'PS':
        us = sorted((u for u in current if meta[u]['phase'] == ph and ctx.get(u) and ctx[u][0] is not None), key=lambda u: ctx[u][0])
        q = [us[i * len(us) // 5:(i + 1) * len(us) // 5] for i in range(5)]
        out['gradient'][ph] = {'cut': [[ctx[g[0]][0], ctx[g[-1]][0]] for g in q],
                               'rate': [[pool([hist[u][p] for u in g if p in hist[u]]) for p in fy] for g in q]}
    # the whole distribution, year by year
    step = {'P': 25, 'S': 50, 'X': 100}
    top = {'P': 1200, 'S': 1800, 'X': 3600}
    for ph in 'PSX':
        us = [u for u in current if meta[u]['phase'] == ph]
        yrs = {}
        for p in fy:
            v = [hist[u][p][2] for u in us if p in hist[u] and hist[u][p][2] is not None and (hist[u][p][0] or 0) >= MIN_ENROL]
            b = [0] * (top[ph] // step[ph])
            for x in v:
                b[min(len(b) - 1, x // step[ph])] += 1
            yrs[p] = {'n': len(v), 'bins': b, 'median': sorted(v)[len(v) // 2] if v else None}
        out['ridges'][ph] = {'step': step[ph], 'years': yrs}
    # regions, pooled from schools
    area = {a['code']: a for a in csv.DictReader(open(os.path.join(RAW, 'areas.csv'), encoding='utf-8'))}
    reg = {}
    for u in current:
        r = area.get(meta[u]['la'], {}).get('region')
        if r:
            reg.setdefault((r, meta[u]['phase']), []).append(u)
    for (r, ph), us in reg.items():
        out['regions'].setdefault(ph, {})[names.get(r, r)] = [pool([hist[u][p] for u in us if p in hist[u]]) for p in fy]
    for ph in 'PSX':
        out['regions'].setdefault(ph, {})['England'] = [bench['E'][ph].get(p) for p in fy]
    json.dump(out, open(os.path.join(OUT, 'patterns.json'), 'w'), separators=(',', ':'))
    print(f"attendance patterns: {os.path.getsize(os.path.join(OUT, 'patterns.json')) // 1024} KB")


if __name__ == '__main__':
    main()
    schools()
