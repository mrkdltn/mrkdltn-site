#!/usr/bin/env python3
"""Fetch the DfE's "Parental responsibility measures" statistics: penalty notices for unauthorised absence (by reason,
and what became of them), attendance case management, parenting orders and contracts, and education supervision
orders, for every local authority, region and England, 2009/10 onwards. Published yearly (January). Open Government
Licence v3.0.

  python3 scripts/fetch_attendance_prm.py            the newest release (found through the catalogue; ids change each year)
  python3 scripts/fetch_attendance_prm.py file.csv   a file already downloaded

Writes data/raw/attendance/prm.csv (the DfE's figures unchanged, fewer columns) and prm_release.json.
"""
import csv, io, json, os, sys, urllib.request

PUB = '86af24dc-67c4-47f0-a849-e94c7a1cfe9b'
LIST = 'https://content.explore-education-statistics.service.gov.uk/api/data-set-files?publicationId=' + PUB + '&latestOnly=true&pageSize=40'
CSV = 'https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/{id}/csv'
UA = 'mrkdltn.com Attendance Explorer (open data; https://mrkdltn.com/)'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'raw', 'attendance')
# the DfE's column -> ours. Counts throughout; 'z' = not collected that year, 'x' = not available.
COLS = {'enrolments': 'enrol', 'pn_issued': 'issued', 'reason_pn_hols': 'hols', 'reason_pn_late': 'late', 'reason_pn_other': 'other',
        'repeated_pn': 'repeat', 'pn_paid': 'paid', 'pn_paid_21': 'paid21', 'pn_withdrawn': 'withdrawn', 'pn_prosecuted_non_payment': 'pros',
        'pn_unresolved': 'unresolved', 'prosecution_pn_limit': 'pros_limit', 'case_management': 'cm', 'case_management_prosecuted': 'cm_pros',
        'case_management_withdrawn_att_improved': 'cm_improved', 'parenting_orders_granted': 'orders', 'parenting_contracts_offered': 'contracts',
        'parenting_contracts_accepted': 'contracts_acc', 'supervision_orders_total': 'eso'}


def get(url, timeout=300):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=timeout)


def main():
    rel = None
    if len(sys.argv) > 1:
        f = open(sys.argv[1], encoding='utf-8-sig', newline='')
    else:
        d = next(d for d in json.load(get(LIST, 60))['results'] if 'Local authority' in d['meta']['geographicLevels'])
        rel = {'id': d['id'], 'title': d['title'], 'release': d['release']['title'], 'published': d['published'][:10]}
        f = io.TextIOWrapper(get(CSV.format(id=d['id'])), encoding='utf-8-sig', newline='')
    out = []
    for r in csv.DictReader(f):
        lvl = r['geographic_level']
        code = r['new_la_code'] if lvl == 'Local authority' else r['region_code'] if lvl == 'Regional' else r['country_code']
        if not code or code.startswith('E13'):          # Inner and Outer London are not areas the tool uses
            continue
        out.append([int(r['time_period'][:4]), code] + [r[c] if r[c] in ('z', 'x') else str(int(float(r[c]))) for c in COLS])
    if not out:
        raise SystemExit('no rows read: has the file format changed?')
    out.sort()
    path = os.path.join(OUT, 'prm.csv')
    with open(path, 'w', newline='', encoding='utf-8') as g:
        w = csv.writer(g, lineterminator='\n')
        w.writerow(['year', 'code'] + list(COLS.values()))
        w.writerows(out)
    if rel:
        json.dump(rel, open(os.path.join(OUT, 'prm_release.json'), 'w'), indent=1)
    print(f'{path}: {len(out)} rows, {out[0][0]}/{(out[0][0] + 1) % 100:02d} to {out[-1][0]}/{(out[-1][0] + 1) % 100:02d}, {len({o[1] for o in out})} areas')


if __name__ == '__main__':
    main()
