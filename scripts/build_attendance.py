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
    # models of percentages stay within 0-100%
    for c in pulse['ytd']:
        for y in pulse['ytd'][c]:
            for p, v in pulse['ytd'][c][y].items():
                assert v is None or all(0 <= x <= 10000 for x in v.values()), (c, y, p)


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

    def history(u):
        """Full-year history under this URN, extended back through single predecessors. Returns ({period: values}, join)."""
        out, join, seen, cur = {}, None, {u}, u
        for p, v in rows[u].items():
            out[p] = shown(v)
        while True:
            pr = meta.get(cur, {}).get('pred')
            if not pr or pr in seen or pr not in rows:
                break
            seen.add(pr)
            first = min([p for p in out if not p.endswith('AS')] or ['9999'])
            add = {p: shown(v) for p, v in rows[pr].items() if not p.endswith('AS') and p < first}
            if add:
                join = join or first
                out.update(add)
            cur = pr
        return out, join

    current = sorted((u for u in rows if latest in rows[u] or fy_last in rows[u]), key=int)
    current = [u for u in current if latest in rows[u]]            # the newest release defines who is listed
    out = os.path.join(OUT, 'sch')
    os.makedirs(out, exist_ok=True)
    shards = [dict() for _ in range(SHARDS)]
    las = sorted({meta[u]['la'] for u in current})
    index = {k: [] for k in ('urn', 'name', 'town', 'pc', 'la', 'ph')}
    dist = {ph: {k: [] for k in ('urn', 'la', 'enrol', 'abs', 'pa', 'chg')} for ph in 'PSX'}
    base = '2018'
    for u in current:
        m = meta[u]
        h, join = history(u)
        rec = {'n': m['name'], 'ph': m['phase'], 'la': m['la'], 'town': m['town'], 'pc': m['postcode'], 'trust': m['trust'],
               'ward': m['ward'], 'pcon': m['pcon'], 'h': {p: v for p, v in h.items() if v}}
        if join:
            rec['join'] = join
        if u in grade:
            rec['g'] = list(grade[u])
        shards[int(u) % SHARDS][u] = rec
        for k, v in (('urn', int(u)), ('name', m['name']), ('town', m['town']), ('pc', m['postcode']), ('la', las.index(m['la'])), ('ph', m['phase'])):
            index[k].append(v)
        now = h.get(latest)
        if now and m['phase'] in dist:
            d = dist[m['phase']]
            a, b = h.get(fy_last), h.get(base)
            d['urn'].append(int(u)); d['la'].append(las.index(m['la'])); d['enrol'].append(now[0]); d['abs'].append(now[1]); d['pa'].append(now[3])
            d['chg'].append(a[1] - b[1] if a and b else None)
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


if __name__ == '__main__':
    main()
    schools()
