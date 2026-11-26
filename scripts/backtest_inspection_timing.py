#!/usr/bin/env python3
"""Backtest the Inspection timing rules on the full inspections that actually happened.

Starting state: Ofsted MI, latest inspections as at 31 October 2025 (the last release before renewed-framework
inspections began). Each school is classified by scripts/inspection_timing.py exactly as the panel would have
classified it then. Outcome: the first full inspection (section 5, or section 8 deemed section 5) that started
on or after 1 December 2025, from Ofsted's "all inspections, year to date" MI files, plus report cards read
since the last MI release (data/raw/reports_daily.csv).

  python3 scripts/backtest_inspection_timing.py BASE_2025_10.csv YTD_2025_26.csv YTD_2026_27.csv LATEST_2026_10.csv

Writes the summary as Markdown to stdout, the per-school results to backtest_inspection_timing.csv in the
current directory (not committed: it is derived and reproducible), and data/raw/inspection_timing_backtest.json:
per rule group (as served: STD4, NEW with an inspected predecessor, RI25 sub-codes) the number inspected and the
quartiles of the interval, which the build passes to the panel for its one empirical line (n >= 100 only).
"""
import json
import csv, datetime as dt, io, os, statistics, sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import inspection_timing as it

FROM = dt.date(2025, 12, 1)
RAW = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'raw')


def read(path):
    b = open(path, 'rb').read()
    try:
        t = b.decode('utf-8-sig')
    except UnicodeDecodeError:
        t = b.decode('cp1252')
    return list(csv.DictReader(io.StringIO(t)))


def iso(v):
    v = (v or '').strip()
    if v in ('', 'NULL'):
        return ''
    a, b, c = v.split('/')
    return f'{int(c):04d}-{int(b):02d}-{int(a):02d}'


def c(v):
    v = (v or '').strip()
    return '' if v == 'NULL' else v


def base_row(r):
    """Map the October 2025 MI layout (original framework only) to the fields inspection_timing reads."""
    return {
        'urn': r['URN'], 'name': r['School name'], 'phase': r['Ofsted phase'], 'type': r['Type of education'],
        'open': iso(r['School open date']),
        'o_type': c(r['Inspection type']), 'o_start': iso(r['Inspection start date']), 'o_pub': iso(r['Publication date']),
        'o_rel': c(r['Does the latest graded inspection relate to the URN of the current school?']),
        'o_urn': c(r['URN at time of latest graded inspection']), 'o_coc': c(r['Category of concern']),
        'o_oe': c(r['Overall effectiveness']), 'o_qe': c(r['Quality of education']),
        'o_ba': c(r['Behaviour and attitudes']), 'o_pd': c(r['Personal development']),
        'o_lm': c(r['Effectiveness of leadership and management']),
        'o_ey': c(r['Early years provision (where applicable)']), 'o_sf': c(r['Sixth form provision (where applicable)']),
        'u_start': iso(r['Date of latest ungraded inspection']), 'u_pub': iso(r['Ungraded inspection publication date']),
        'u_rel': c(r['Does the ungraded inspection relate to the URN of the current school?']),
        'u_urn': c(r['URN at time of the ungraded inspection']), 'u_out': c(r['Ungraded inspection overall outcome']),
        'n_mon': c(r['Number of monitoring and urgent inspections since last graded inspection']),
    }


def q(xs, p):
    xs = sorted(xs)
    if not xs:
        return None
    k = (len(xs) - 1) * p
    f = int(k)
    return xs[f] + (xs[min(f + 1, len(xs) - 1)] - xs[f]) * (k - f)


def main(base_path, ytd1, ytd2, latest_path):
    base = [base_row(r) for r in read(base_path)]
    latest = {r['URN']: r for r in read(latest_path)}
    # first full inspection from 1 December 2025, per URN; for the statutory check, any full inspection after the
    # October 2025 snapshot (renewed-framework inspections began on 10 November 2025)
    first, first_any = {}, {}
    for p in (ytd1, ytd2):
        for r in read(p):
            ev = c(r.get('Event type grouping'))
            if ev not in ('Schools - S5', 'Schools - S8 deemed S5'):
                continue
            s = iso(r['Inspection start date'])
            if s and s >= '2025-11-01' and (r['URN'] not in first_any or s < first_any[r['URN']]):
                first_any[r['URN']] = s
            if s and s >= FROM.isoformat() and (r['URN'] not in first or s < first[r['URN']][0]):
                first[r['URN']] = (s, 'MI', c(r['Inspection type']))
    daily_n = 0
    for r in csv.DictReader(open(os.path.join(RAW, 'reports_daily.csv'), encoding='utf-8')):
        s = r.get('insp_date')
        if s and s >= FROM.isoformat() and r['urn'] not in first:
            first[r['urn']] = (s, 'daily', 'report card read from reports site')
            daily_n += 1
        if s and s >= '2025-11-01' and r['urn'] not in first_any:
            first_any[r['urn']] = s
    cutoff = max(v[0] for v in first.values())

    as_at = dt.date(2025, 10, 31)
    groups = defaultdict(list)
    rows_out = []
    for b in base:
        if b['urn'] not in latest:      # closed or replaced since October 2025: not at risk for the whole window
            continue
        rec = it.classify(b, {'open_date': b['open']}, as_at)
        key = rec['rule'] + (':' + rec['why'] if rec['why'] else '')
        if rec['rule'] == 'STD4':
            key += ' (last: ' + rec['last_kind'] + ')'
        if rec['rule'] == 'NEW':
            key += ' (predecessor inspected)' if rec['pred_urn'] else ' (no predecessor inspection)'
        ins = first.get(b['urn'])
        x = {'urn': b['urn'], 'name': b['name'], 'phase': b['phase'], 'rule': key, 'anchor': rec['anchor'],
             'last': rec['last'], 'last_kind': rec['last_kind'], 'usual': rec['usual'], 'statutory': rec['statutory'],
             'inspected': ins[0] if ins else '', 'source': ins[1] if ins else '', 'insp_type': ins[2] if ins else '',
             'n_mon': b['n_mon'], 'o_oe': b['o_oe'], 'u_out': b['u_out'], 'any_from_nov': first_any.get(b['urn'], '')}
        groups[key].append(x)
        rows_out.append(x)

    def years(a, b):
        return (b - a).days / 365.25

    print(f'Window: full inspections starting {FROM} to {cutoff} (latest start date in the data); '
          f'{sum(1 for v in first.values() if v[1] == "daily")} of them from daily reads.\n')
    print('| Rule group | Eligible at 31 Oct 2025 | Inspected | Share inspected | Usual point in window: inspected | Before usual −12 m | Within ±12 m | After usual +12 m | Before usual point | Median interval (yrs) | IQR (yrs) | After statutory |')
    print('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|')
    order = sorted(groups, key=lambda k: -len(groups[k]))
    late = []
    for k in order:
        g = groups[k]
        ins = [x for x in g if x['inspected']]
        n = len(ins)
        bef = wit = aft = early = 0
        iv = []
        after_stat = 0
        for x in ins:
            di = dt.date.fromisoformat(x['inspected'])
            if x['anchor']:
                iv.append(years(x['anchor'], di))
            if x['usual']:
                lo, hi = it.add_months(x['usual'], -12), it.add_months(x['usual'], 12)
                bef += di < lo; wit += lo <= di <= hi; aft += di > hi; early += di < x['usual']
            if x['statutory'] and di > x['statutory']:
                after_stat += 1
                late.append(x)
        pct = lambda a: f'{100 * a / n:.0f}%' if n and any(y['usual'] for y in ins) else '–'
        med = f'{statistics.median(iv):.2f}' if iv else '–'
        iqr = f'{q(iv, .25):.2f}–{q(iv, .75):.2f}' if len(iv) >= 4 else '–'
        due = [x for x in g if x['usual'] and FROM <= x['usual'] <= dt.date.fromisoformat(cutoff)]
        due_s = f"{sum(1 for x in due if x['inspected'])} of {len(due)}" if due else '–'
        print(f'| {k} | {len(g)} | {n} | {100 * n / len(g):.0f}% | {due_s} | {pct(bef)} | {pct(wit)} | {pct(aft)} | {pct(early)} | {med} | {iqr} | {after_stat} |')

    # schools whose computed statutory date fell inside the window and who were not inspected by it
    missed = [x for x in rows_out if x['statutory'] and x['statutory'] <= dt.date.fromisoformat(cutoff)
              and (not x['any_from_nov'] or dt.date.fromisoformat(x['any_from_nov']) > x['statutory'])]
    print(f'\nInspected after the computed statutory date: {len(late)}')
    for x in late:
        print(f"  {x['urn']} {x['name']} ({x['rule']}): last {x['last_kind']} {x['last']}, statutory {x['statutory']}, inspected {x['inspected']} [{x['insp_type']}]")
    print(f'Statutory date on or before {cutoff} and no full inspection by it (any full inspection from 1 November 2025 counts): {len(missed)}')
    for x in missed:
        print(f"  {x['urn']} {x['name']} ({x['rule']}): last {x['last_kind']} {x['last']}, statutory {x['statutory']}, first full inspection {x['any_from_nov'] or 'not yet'}")

    # served groups: the panel's rule (and sub-code); NEW only where a predecessor was inspected
    served = defaultdict(list)
    for x in rows_out:
        if not x['inspected'] or not x['anchor']:
            continue
        k = x['rule'].split(' (')[0].replace(':', '.')
        if x['rule'].startswith('NEW') and 'predecessor inspected' not in x['rule']:
            k = 'NEW.nopred'
        served[k].append(years(x['anchor'], dt.date.fromisoformat(x['inspected'])))
    out = {'window_from': FROM.isoformat(), 'window_to': cutoff, 'run': dt.date.today().isoformat(),
           'baseline': 'Ofsted MI, latest inspections as at 31 October 2025', 'min_n': 100,
           'groups': {k: {'n': len(v), 'q1': round(q(v, .25), 2), 'median': round(statistics.median(v), 2),
                          'q3': round(q(v, .75), 2)} for k, v in sorted(served.items()) if len(v) >= 4}}
    with open(os.path.join(RAW, 'inspection_timing_backtest.json'), 'w') as f:
        json.dump(out, f, indent=1)

    with open('backtest_inspection_timing.csv', 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows_out[0]))
        w.writeheader()
        for x in rows_out:
            w.writerow({k: (v.isoformat() if isinstance(v, dt.date) else v) for k, v in x.items()})


if __name__ == '__main__':
    main(*sys.argv[1:5])
