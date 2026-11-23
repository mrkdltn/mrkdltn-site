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


if __name__ == '__main__':
    main()
