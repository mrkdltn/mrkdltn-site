#!/usr/bin/env python3
"""Fetch ward boundaries for the Attendance Explorer's ward maps.

Source: Office for National Statistics, Open Geography Portal, "Wards (May 2026) Boundaries UK BSC" (super
generalised, 200 m), England only. Open Government Licence v3.0. Attribution on any map: "Source: Office for
National Statistics licensed under the Open Government Licence v.3.0. Contains OS data (c) Crown copyright and
database right 2026".

  python3 scripts/fetch_attendance_wards.py

Writes data/raw/attendance/ward_geo.json: wards grouped by local authority district, each ward's outline as
rings of whole-number coordinates (British National Grid, in units of 50 m from the district's south-west corner).
Run again when GIAS moves to a newer set of ward codes (the build reports how many schools' wards have no outline).
"""
import json, os, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'data', 'raw', 'attendance', 'ward_geo.json')
SVC = 'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/WD_MAY_2026_UK_BSC/FeatureServer/0/query'
UA = 'mrkdltn.com Attendance Explorer (open data; https://mrkdltn.com/)'
UNIT = 50


def page(offset):
    p = {'where': "WD26CD LIKE 'E05%'", 'outFields': 'WD26CD,WD26NM,LAD26CD,LAD26NM', 'outSR': 27700, 'f': 'geojson',
         'resultOffset': offset, 'resultRecordCount': 1000, 'orderByFields': 'WD26CD'}
    req = urllib.request.Request(SVC + '?' + urllib.parse.urlencode(p), headers={'User-Agent': UA})
    return json.load(urllib.request.urlopen(req, timeout=180))


def main():
    feats, off = [], 0
    while True:
        j = page(off)
        fs = j.get('features', [])
        if not fs:
            break
        feats += fs; off += len(fs)
        print(f'{off} wards', end='\r')
    lads = {}
    for f in feats:
        a, g = f['properties'], f['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        lads.setdefault(a['LAD26CD'], {'name': a['LAD26NM'], 'wards': {}})['wards'][a['WD26CD']] = (a['WD26NM'], [ring for p in polys for ring in p])
    out = {'source': 'ONS Wards (May 2026) Boundaries UK BSC', 'unit': UNIT, 'districts': {}}
    for code, d in sorted(lads.items()):
        xs = [x for _, rings in d['wards'].values() for r in rings for x, _ in r]
        ys = [y for _, rings in d['wards'].values() for r in rings for _, y in r]
        x0, y0 = min(xs), min(ys)
        wards = {}
        for wc, (name, rings) in sorted(d['wards'].items()):
            rr = []
            for r in rings:
                q, last = [], None
                for x, y in r:
                    pt = (round((x - x0) / UNIT), round((y - y0) / UNIT))
                    if pt != last:
                        q += pt; last = pt
                if len(q) >= 8:
                    rr.append(q)
            wards[wc] = {'n': name, 'p': rr}
        out['districts'][code] = {'name': d['name'], 'w': round((max(xs) - x0) / UNIT), 'h': round((max(ys) - y0) / UNIT), 'wards': wards}
    json.dump(out, open(OUT, 'w'), separators=(',', ':'), ensure_ascii=False)
    print(f'{len(feats)} wards in {len(lads)} districts; {os.path.getsize(OUT) // 1024} KB')


if __name__ == '__main__':
    main()
