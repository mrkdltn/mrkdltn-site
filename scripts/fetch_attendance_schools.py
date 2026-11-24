#!/usr/bin/env python3
"""Fetch the DfE's school-level absence statistics and the GIAS details the Attendance Explorer needs.

Sources (Open Government Licence v3.0):
  Department for Education, "Pupil absence in schools in England" (Explore Education Statistics): the newest
  full-year school-level file and the newest autumn-and-spring school-level file. Catalogue ids change with
  every release, so the newest files are looked up each time.
  Get Information about Schools (GIAS): the daily establishment extract and the predecessor links.

  python3 scripts/fetch_attendance_schools.py

Writes data/raw/attendance/:
  school_absence.csv   urn, period (2024 = full year 2024/25; 2025AS = autumn and spring 2025/26), enrolments, possible sessions, and
                       then counts: sessions missed, sessions missed without authorisation, pupils persistently absent (10% or
                       more); then illness and unauthorised holiday as rates in hundredths of a percentage point. Empty = not published for that year.
                       sev is the count of severely absent pupils (50% or more missed). It is kept only so that areas,
                       trusts and phases can be pooled; it is never shown for a single school.
  schools.csv          one row per school that appears in either file, with the date it joined its present trust
                       (GIAS) and, where the DfE recorded a different trust before that date, that trust's name
  schools_release.json what was read and when it was published
The DfE files are 80 to 120 MB each and are read as a stream; they are never written to disk.
"""
import csv, datetime, io, json, os, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'data', 'raw', 'attendance')
PUB = 'cbbd299f-8297-44bc-92ac-558bcf51f8ad'
LIST = ('https://content.explore-education-statistics.service.gov.uk/api/data-set-files?publicationId=' + PUB +
        '&latestOnly=false&pageSize=40&geographicLevel=SCH&sort=published&sortDirection=Desc&page={page}')
CSV = 'https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/{id}/csv'
GIAS = 'https://ea-edubase-api-prod.azurewebsites.net/edubase/downloads/public/{name}{d}.csv'
UA = 'mrkdltn.com Attendance Explorer (open data; https://mrkdltn.com/)'
PHASE = {'State-funded primary': 'P', 'State-funded secondary': 'S', 'Special': 'X'}
NOT = ('four year', 'enrolments with', 'alternative provision', 'location')


def get(url, timeout=300):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=timeout)


def newest():
    """The newest full-year and autumn-and-spring school-level absence files."""
    found, page = {}, 1
    while len(found) < 2 and page < 6:
        j = json.load(get(LIST.format(page=page), 60))
        for d in j['results']:
            t, rel = d['title'].lower(), d['release']['title']
            if 'school level' not in t or any(n in t for n in NOT):
                continue
            kind = 'fy' if rel.startswith('Academic year') else 'as' if rel.startswith('Autumn and spring') else None
            if kind and kind not in found:
                found[kind] = {'id': d['id'], 'title': d['title'], 'release': rel, 'published': d['published'][:10]}
        if page >= j['paging']['totalPages']:
            break
        page += 1
    if len(found) < 2:
        raise SystemExit('could not find both school-level files: has the catalogue changed?')
    return found


def hund(x):
    """A rate in hundredths of a point that still rounds to the right tenth. Pages show one decimal place by rounding these
    hundredths, so 13.2476 must not be stored as 13.25 (which would show as 13.3): where rounding up lands on a 5, step back one."""
    r = round(x)
    return r - 1 if r % 10 == 5 and r - x > 1e-6 else r


def bp(v):
    """A DfE percentage as hundredths of a point; '' for not applicable or missing."""
    try:
        return hund(float(v) * 100)
    except ValueError:
        return ''


def read_absence(file_id, suffix, rows, names, trusts=None):
    n = 0
    for r in csv.DictReader(io.TextIOWrapper(get(CSV.format(id=file_id)), encoding='utf-8-sig', newline='')):
        urn, per = r['school_urn'], r['time_period'][:4] + suffix
        if not urn.isdigit() or not r['enrolments'].isdigit():
            continue
        num = lambda c: r[c] if r.get(c, '').isdigit() else ''
        # counts, not rates, for overall, unauthorised and persistent absence: rates are then exact for a school and for any group of schools
        rows[(urn, per)] = [r['enrolments'], r['sess_possible'], num('sess_overall'), num('sess_unauthorised'),
                            num('enrolments_pa_10_exact'), bp(r['sess_auth_illness_rate']), bp(r['sess_unauth_holiday_rate']),
                            r.get('enrolments_pa_50_exact', '') if r.get('enrolments_pa_50_exact', '').isdigit() else '']
        if trusts is not None and r.get('trust_name'):
            trusts.setdefault(urn, {})[per[:4]] = r['trust_name']      # recorded by the DfE from 2020/21
        cur = names.get(urn)
        if cur is None or per[:4] >= cur[0]:
            names[urn] = (per[:4], r['school_name'], PHASE.get(r['education_phase'], ''), r['new_la_code'])
        n += 1
    return n


def gias(name):
    today = datetime.date.today()
    for back in range(0, 6):
        d = (today - datetime.timedelta(days=back)).strftime('%Y%m%d')
        try:
            return d, csv.DictReader(io.StringIO(get(GIAS.format(name=name, d=d), 180).read().decode('cp1252', errors='replace')))
        except Exception as e:
            print(f'GIAS {name} {d}: {e}')
    raise SystemExit('no GIAS extract in the last six days')


def main():
    files = newest()
    rows, names, trusts = {}, {}, {}
    for kind, suffix in (('fy', ''), ('as', 'AS')):
        n = read_absence(files[kind]['id'], suffix, rows, names, trusts if kind == 'fy' else None)
        print(f"{files[kind]['title']} ({files[kind]['release']}, published {files[kind]['published']}): {n} rows")
    # keep autumn-and-spring rows only for the two newest years: the long run comes from full years
    as_years = sorted({p for _, p in rows if p.endswith('AS')})[-2:]
    rows = {k: v for k, v in rows.items() if not k[1].endswith('AS') or k[1] in as_years}
    have = {u for u, _ in rows}
    gdate, g = gias('edubasealldata')
    G = {r['URN']: r for r in g if r['URN'] in have}
    # predecessors: followed only where a school has exactly one, so merged schools do not inherit a blended history
    _, links = gias('links_edubasealldata')
    pred = {}
    for r in links:
        if r['LinkType'] == 'Predecessor' and r['URN'] in have and r['LinkURN'] in have:
            pred.setdefault(r['URN'], []).append(r['LinkURN'])
    # when each academy joined its present trust (GIAS group links), and the trust the DfE recorded for it before then.
    # A change of name alone is not a transfer: only a recorded trust from a year before the joining date counts.
    _, gl = gias('grouplinks_edubaseallacademiesandfree')
    joined = {}
    for r in gl:
        if r['Group Type'] in ('Multi-academy trust', 'Single-academy trust') and r['URN'] in have and r['Joined date']:
            d, m, y = r['Joined date'].split('-')
            joined[r['URN']] = (f'{y}-{m}-{d}', r['Linked UID'])
    def before(u):
        if u not in joined or u not in trusts:
            return ''
        y = int(joined[u][0][:4]) - (1 if joined[u][0][5:7] < '09' else 0)       # the school year in which it joined
        cur = G.get(u, {}).get('Trusts (name)', '').strip().upper()
        old = [n for p, n in sorted(trusts[u].items()) if int(p) < y and n.strip().upper() != cur]
        return old[-1] if old else ''
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, 'school_absence.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['urn', 'period', 'enrol', 'poss', 'missed', 'missed_unauth', 'pa_n', 'ill', 'hol_u', 'sev'])
        for k in sorted(rows, key=lambda k: (int(k[0]), k[1])):
            w.writerow(list(k) + rows[k])
    with open(os.path.join(OUT, 'schools.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['urn', 'name', 'phase', 'la', 'town', 'postcode', 'trust_id', 'trust', 'ward_code', 'ward', 'pcon_code', 'pcon', 'open', 'pred', 'trust_joined', 'trust_before'])
        for u in sorted(have, key=int):
            g, n = G.get(u, {}), names[u]
            p = pred.get(u, [])
            w.writerow([u, g.get('EstablishmentName') or n[1], n[2], n[3], g.get('Town', ''), g.get('Postcode', ''),
                        g.get('Trusts (code)', ''), g.get('Trusts (name)', ''), g.get('AdministrativeWard (code)', ''), g.get('AdministrativeWard (name)', ''),
                        g.get('ParliamentaryConstituency (code)', ''), g.get('ParliamentaryConstituency (name)', ''),
                        '1' if g.get('EstablishmentStatus (name)', '').startswith('Open') else '0', p[0] if len(p) == 1 else '',
                        joined[u][0] if u in joined and joined[u][1] == g.get('Trusts (code)', '') else '', before(u)])
    json.dump({'full_year': files['fy'], 'autumn_spring': files['as'], 'gias': gdate},
              open(os.path.join(OUT, 'schools_release.json'), 'w'), indent=1)
    print(f'{len(rows)} school-period rows, {len(have)} schools, {sum(1 for u in have if len(pred.get(u, [])) == 1)} with one predecessor; GIAS {gdate}')


if __name__ == '__main__':
    main()
