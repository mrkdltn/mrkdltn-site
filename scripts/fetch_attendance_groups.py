#!/usr/bin/env python3
"""Fetch absence by pupil group for local authorities, regions and England.

Source: Department for Education, "Pupil absence in schools in England", newest release, data set "Absence by pupil
characteristics - autumn and spring terms combined" (Open Government Licence v3.0). The DfE publishes pupil groups
down to local authority level only; there is no such breakdown for individual schools.

  python3 scripts/fetch_attendance_groups.py [local.csv]

Writes data/raw/attendance/la_groups.csv: period (2025AS = autumn and spring 2025/26), area code, phase
(A all, P primary, S secondary, X special), group (all, fsm, nfsm, sen, ehcp, nosen), enrolments, possible sessions,
and overall, persistent (10% or more missed) and severe (50% or more missed) absence in hundredths of a percentage point. Ethnicity is in the file and is not read.
"""
import csv, io, json, os, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'data', 'raw', 'attendance')
PUB = 'cbbd299f-8297-44bc-92ac-558bcf51f8ad'
LIST = 'https://content.explore-education-statistics.service.gov.uk/api/data-set-files?publicationId=' + PUB + '&latestOnly=true&pageSize=40&searchTerm=characteristic'
CSV = 'https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/{id}/csv'
UA = 'mrkdltn.com Attendance Explorer (open data; https://mrkdltn.com/)'
GROUP = {('Total', 'Total'): 'all', ('FSM', 'FSM eligible'): 'fsm', ('FSM', 'FSM not eligible'): 'nfsm', ('SEN provision', 'SEN support'): 'sen',
         ('SEN provision', 'EHC plan'): 'ehcp', ('SEN provision', 'No identified SEN'): 'nosen'}
PHASE = {'Total': 'A', 'State-funded primary': 'P', 'State-funded secondary': 'S', 'Special': 'X'}


def get(url, timeout=600):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=timeout)


def main():
    rel = None
    if len(sys.argv) > 1:
        f = open(sys.argv[1], encoding='utf-8-sig', newline='')
    else:
        d = next(d for d in json.load(get(LIST, 60))['results'] if 'Local authority' in d['meta']['geographicLevels'] and 'autumn and spring' in d['title'].lower())
        rel = {'id': d['id'], 'title': d['title'], 'release': d['release']['title'], 'published': d['published'][:10]}
        f = io.TextIOWrapper(get(CSV.format(id=d['id'])), encoding='utf-8-sig', newline='')
    out = []
    for r in csv.DictReader(f):
        g, ph = GROUP.get((r['characteristic'], r['characteristic_breakdown'])), PHASE.get(r['education_phase'])
        if not g or not ph:
            continue
        lvl = r['geographic_level']
        code = r['new_la_code'] if lvl == 'Local authority' else r['region_code'] if lvl == 'Regional' else r['country_code']
        try:
            out.append([r['time_period'][:4] + 'AS', code, ph, g, int(float(r['enrolments'])), int(float(r['sess_possible'])), round(float(r['sess_overall_percent']) * 100), round(float(r['enrolments_pa_10_exact_percent']) * 100),
                        round(float(r['enrolments_pa_50_exact_percent']) * 100) if r.get('enrolments_pa_50_exact_percent', '').replace('.', '', 1).isdigit() else ''])
        except ValueError:
            continue
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, 'la_groups.csv'), 'w', newline='', encoding='utf-8') as fo:
        w = csv.writer(fo, lineterminator='\n')
        w.writerow(['period', 'code', 'phase', 'group', 'enrol', 'poss', 'abs', 'pa', 'sev'])
        w.writerows(sorted(out))
    if rel:
        json.dump(rel, open(os.path.join(OUT, 'groups_release.json'), 'w'), indent=1)
    print(f'la_groups.csv: {len(out)} rows')


if __name__ == '__main__':
    main()
