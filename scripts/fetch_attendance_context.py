#!/usr/bin/env python3
"""Fetch each school's context for the Attendance Explorer's similar-schools match and expected rates.

Sources (Open Government Licence v3.0), newest release of each, looked up every time:
  Department for Education, "Schools, pupils and their characteristics": school-level file (January school census):
  pupils, eligibility for free school meals, first language other than English, urban or rural setting.
  Department for Education, "Special educational needs in England": school-level file: SEN support and
  education, health and care plans.
Ethnicity is in the census file and is deliberately not read.

  python3 scripts/fetch_attendance_context.py [census.csv sen.csv]     (local copies are used if given)

Writes data/raw/attendance/school_context.csv and context_release.json. The census file is about 2.8 GB and is
read as a stream; run this once a year, after the June releases.
"""
import csv, io, json, os, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'data', 'raw', 'attendance')
LIST = ('https://content.explore-education-statistics.service.gov.uk/api/data-set-files?publicationId={pub}'
        '&latestOnly=true&pageSize=40&geographicLevel=SCH')
CSV = 'https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/{id}/csv'
UA = 'mrkdltn.com Attendance Explorer (open data; https://mrkdltn.com/)'
PUBS = {'census': 'a91d9e05-be82-474c-85ae-4913158406d0', 'sen': 'f657afb4-8f4a-427d-a683-15f11a2aefb5'}


def get(url, timeout=600):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=timeout)


def newest(pub):
    for d in json.load(get(LIST.format(pub=pub), 60))['results']:
        if d['title'].lower().startswith('school level'):
            return {'id': d['id'], 'title': d['title'], 'release': d['release']['title'], 'published': d['published'][:10]}
    raise SystemExit('no school-level file found: has the catalogue changed?')


def reader(kind, local):
    if local:
        return None, csv.DictReader(open(local, encoding='utf-8-sig', newline=''))
    f = newest(PUBS[kind])
    return f, csv.DictReader(io.TextIOWrapper(get(CSV.format(id=f['id'])), encoding='utf-8-sig', newline=''))


def urn(v):
    try:
        return str(int(float(v)))        # the DfE files write 100000 as 1e+05
    except ValueError:
        return None


def num(v):
    try:
        return float(v)
    except ValueError:
        return None


def main():
    local = sys.argv[1:3] if len(sys.argv) >= 3 else [None, None]
    S, rel = {}, {}
    rel['census'], rows = reader('census', local[0])
    for r in rows:
        if r['attendance_pattern'] != 'Total' or r['sex'] != 'Total':
            continue
        t, b = r['breakdown_topic'], r['breakdown']
        key = 'pupils' if t == 'Total' else 'fsm' if (t, b) == ('Free school meal status', 'FSM eligible') else \
            'eal' if (t, b) == ('First language', 'First language other than English') else None
        u = urn(r['school_urn'])
        if not key or not u:
            continue
        s = S.setdefault(u, {'rural': 0 if r['urban_rural'].startswith('Urban') else 1,
                             'selective': 1 if r['admissions_policy'] == 'Selective' else 0})
        s[key] = num(r['pupil_count'])
    rel['sen'], rows = reader('sen', local[1])
    for r in rows:
        if r['sen_primary_need'] != 'All pupils' or r['specialist_provision_unit_type'] != 'All pupils':
            continue      # the file repeats each school for its SEN unit and resourced provision
        u = urn(r['school_urn'])
        key = {'All pupils': 'sen_all', 'SEN support': 'sen', 'Education, health and care plans': 'ehcp'}.get(r['sen_provision'])
        if u in S and key:
            S[u][key] = num(r['pupil_count'])
    os.makedirs(OUT, exist_ok=True)
    n = 0
    with open(os.path.join(OUT, 'school_context.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['urn', 'pupils', 'fsm_pct', 'eal_pct', 'sen_pct', 'ehcp_pct', 'rural', 'selective'])
        pct = lambda a, b: '' if a is None or not b else round(100 * a / b, 1)
        for u in sorted(S, key=int):
            s = S[u]
            p = s.get('pupils')
            if not p:
                continue
            w.writerow([u, int(p), pct(s.get('fsm'), p), pct(s.get('eal'), p), pct(s.get('sen'), s.get('sen_all') or p),
                        pct(s.get('ehcp'), s.get('sen_all') or p), s['rural'], s['selective']])
            n += 1
    if rel['census']:
        json.dump(rel, open(os.path.join(OUT, 'context_release.json'), 'w'), indent=1)
    print(f'school_context.csv: {n} schools')


if __name__ == '__main__':
    main()
