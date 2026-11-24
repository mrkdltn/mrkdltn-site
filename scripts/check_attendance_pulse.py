#!/usr/bin/env python3
"""Sanity checks on the built in-year attendance data, run by the scheduled refresh before it commits.
A release that fails any of these is not committed, so a changed file format cannot quietly reach the site.

  python3 scripts/check_attendance_pulse.py      (after scripts/build_data.py)
"""
import csv, datetime, glob, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, '..', 'data', 'raw', 'attendance')
OUT = os.path.join(HERE, '..', 'site', 'attendance', 'data')
bad = []


def check(ok, what):
    if not ok:
        bad.append(what)


rel = json.load(open(os.path.join(RAW, 'pulse_release.json')))
pulse = json.load(open(os.path.join(OUT, 'pulse.json')))
newest = sorted(glob.glob(os.path.join(RAW, 'pulse_2*.csv')))[-1]
rows = list(csv.DictReader(open(newest, encoding='utf-8')))
codes = {r['code'] for r in rows}
dates = sorted({r['date'] for r in rows})

check(len(codes) >= 160, f'only {len(codes)} areas in {os.path.basename(newest)} (expected England, 9 regions and about 153 authorities)')
check({r['phase'] for r in rows} == {'A', 'P', 'S', 'X'}, 'a phase is missing (expected all schools, primary, secondary and special)')
check(dates and dates[-1] == rel['to'], f"the last day in the file ({dates[-1] if dates else 'none'}) is not the release's last day ({rel['to']})")
check(dates and datetime.date.fromisoformat(dates[-1]) <= datetime.date.today(), 'the file holds a day in the future')

eng = next((c for c in codes if c.startswith('E92')), None)
check(eng is not None, 'no row for England')
if eng:
    year = max(pulse['ytd'][eng])
    for ph, lo, hi in (('A', 300, 1200), ('P', 200, 1000), ('S', 400, 1500), ('X', 600, 2500)):
        v = pulse['ytd'][eng][year].get(ph, {}).get('abs')
        check(v is not None and lo <= v <= hi, f'England overall absence for phase {ph} is {v} hundredths, outside {lo} to {hi}')
    a = pulse['ytd'][eng][year]['A']
    check(abs(a['abs'] - a['auth'] - a['unauth']) <= 2, 'authorised and unauthorised absence do not sum to overall absence for England')
    # the all-schools row should sit between the phases and close to their sum
    tot = {}
    for r in rows:
        if r['code'] == eng:
            t = tot.setdefault(r['phase'], [0, 0])
            t[0] += int(r['poss'] or 0)
            t[1] += int(r['abs'] or 0)
    if all(p in tot for p in 'APSX') and tot['A'][0]:
        s = sum(tot[p][0] for p in 'PSX')
        check(abs(tot['A'][0] - s) / tot['A'][0] < 0.01, "England's all-schools sessions differ from the three phases summed by more than 1%")

if bad:
    print('In-year attendance data FAILED its checks:')
    for b in bad:
        print('  -', b)
    sys.exit(1)
print(f"in-year attendance data passes: {len(codes)} areas, {len(dates)} school days to {rel['to']}")
