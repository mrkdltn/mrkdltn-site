#!/usr/bin/env python3
"""Fetch the DfE's in-year attendance data and keep the slim daily table the Attendance Explorer needs.

Source: Department for Education, "Pupil attendance in schools" (Explore Education Statistics), data set
"Reasons for absence and attendance": daily register counts for England, each region and each local
authority, by school phase. Published fortnightly in term. Open Government Licence v3.0.

  python3 scripts/fetch_attendance.py                    current year, from the statistics API
  python3 scripts/fetch_attendance.py --file <id>        an earlier year's end-of-year file, by its
                                                         data catalogue id (see docs/attendance-data-note.md)

Writes data/raw/attendance/pulse_<year>.csv (one row per area, phase and school day; session counts, so
rates can be pooled) and areas.csv (code, name, level, region). <year> is the year the school year starts.
The full download is about 270 MB uncompressed and is read as a stream; it is never written to disk.
"""
import csv, gzip, io, json, os, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'data', 'raw', 'attendance')
API_SET = '63629501-d3ca-c471-9780-ec4cb6fdf172'
API = 'https://api.education.gov.uk/statistics/v1/data-sets/' + API_SET
CATALOGUE = 'https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/{id}/csv'
UA = 'mrkdltn.com Attendance Explorer (open data; https://mrkdltn.com/)'

# register reasons kept, by the DfE's label -> our column
KEEP = {
    'All possible sessions': 'poss', 'Overall absence': 'abs', 'All authorised': 'auth', 'All unauthorised': 'unauth',
    'Illness (i)': 'ill', 'Unauthorised holiday (g)': 'hol_u', 'Late after registers closed (u)': 'late',
    'No reason yet (n)': 'none',
}
COLS = ['poss', 'abs', 'auth', 'unauth', 'ill', 'hol_u', 'late', 'none']
# 'All schools' is kept as the DfE publishes it: in a few areas it holds slightly more sessions than the three phases summed
PHASE = {'Primary': 'P', 'Secondary': 'S', 'Special': 'X', 'All schools': 'A'}
DAYS = {'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'}


def open_csv(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Encoding': 'gzip'})
    r = urllib.request.urlopen(req, timeout=300)
    raw = r
    if r.headers.get('Content-Encoding') == 'gzip' or url.startswith(API):
        raw = gzip.GzipFile(fileobj=r)
    return csv.DictReader(io.TextIOWrapper(raw, encoding='utf-8-sig', newline=''))


def main():
    if '--file' in sys.argv:
        url, version = CATALOGUE.format(id=sys.argv[sys.argv.index('--file') + 1]), None
    else:
        meta = json.load(urllib.request.urlopen(urllib.request.Request(API, headers={'User-Agent': UA}), timeout=60))
        version = meta['latestVersion']
        url = API + '/csv'
    table, areas, ytd = {}, {}, {}
    for r in open_csv(url):
        col = KEEP.get(r['attendance_reason'])
        ph = PHASE.get(r['education_phase'])
        if not col or not ph or (r['time_frame'] not in DAYS and r['time_frame'] != 'Year to date'):
            continue
        lvl = r['geographic_level']
        code = r['new_la_code'] if lvl == 'Local authority' else r['region_code'] if lvl == 'Regional' else r['country_code']
        if not code:
            continue
        if code not in areas:
            areas[code] = {'code': code, 'name': r['la_name'] or r['region_name'] or r['country_name'],
                           'level': {'Local authority': 'la', 'Regional': 'region'}.get(lvl, 'national'),
                           'region': r['region_code'] if lvl == 'Local authority' else ''}
        try:
            n = int(float(r['session_count']))
        except ValueError:
            continue
        if r['time_frame'] == 'Year to date':
            # the DfE's own total for the year so far: it can differ from the days added up, because some days are withheld
            ytd.setdefault((code, ph), {})[col] = n
            continue
        table.setdefault((r['reference_date'], code, ph), {})[col] = n
    if not table:
        raise SystemExit('no rows read: has the file format changed?')
    dates = sorted({k[0] for k in table})
    year = int(dates[0][:4]) - (1 if dates[0][5:7] < '08' else 0)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f'pulse_{year}.csv')
    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['date', 'code', 'phase'] + COLS)
        for k in sorted(table):
            v = table[k]
            if v.get('poss'):
                w.writerow(list(k) + [v.get(c, '') for c in COLS])
    if ytd and version:
        with open(os.path.join(OUT, 'pulse_ytd.csv'), 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f, lineterminator='\n')
            w.writerow(['year', 'code', 'phase'] + COLS)
            for k in sorted(ytd):
                if ytd[k].get('poss'):
                    w.writerow([year] + list(k) + [ytd[k].get(c, '') for c in COLS])
    # areas: keep any already known (earlier years), add or refresh the ones in this file
    apath = os.path.join(OUT, 'areas.csv')
    known = {r['code']: r for r in csv.DictReader(open(apath, encoding='utf-8'))} if os.path.exists(apath) else {}
    known.update(areas)
    with open(apath, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, ['code', 'name', 'level', 'region'], lineterminator='\n')
        w.writeheader()
        for c in sorted(known):
            w.writerow(known[c])
    if version:
        json.dump({'data_set': API_SET, 'version': version['version'], 'published': version['published'][:10],
                   'to': dates[-1], 'title': 'Pupil attendance in schools: reasons for absence and attendance'},
                  open(os.path.join(OUT, 'pulse_release.json'), 'w'), indent=1)
    print(f'{path}: {len(table)} rows, {dates[0]} to {dates[-1]}, {len(dates)} school days, {len(areas)} areas')


if __name__ == '__main__':
    main()
