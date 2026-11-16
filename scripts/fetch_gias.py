"""Look up schools read from new report cards in Get Information about Schools (GIAS).

Ofsted's monthly management information carries each school's local authority, region and trust.
A school having its first report card is not in that file yet, so the daily reader knows only its
name, phase and grades. This fills those gaps from the DfE's daily public GIAS extract, and adds
town and postcode for every school with a report card so search works by place.

  python3 scripts/fetch_gias.py            writes data/raw/gias_slim.csv

Ofsted's pupil-based deprivation quintile (IDACI) is not in GIAS; it arrives with the next MI file.
"""
import csv
import datetime
import io
import os
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, '..', 'data', 'raw')
URL = 'https://ea-edubase-api-prod.azurewebsites.net/edubase/downloads/public/edubasealldata{d}.csv'
UA = 'mrkdltn.com Ofsted Explorer (open data; https://mrkdltn.com/explorer/)'
OUT_COLS = ['urn', 'la', 'region', 'mat', 'town', 'postcode', 'status']


def download():
    today = datetime.date.today()
    for back in range(0, 5):
        d = (today - datetime.timedelta(days=back)).strftime('%Y%m%d')
        try:
            req = urllib.request.Request(URL.format(d=d), headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=120) as r:
                raw = r.read()
            print(f'GIAS extract {d}: {len(raw) // 1024} KB')
            return raw.decode('cp1252', errors='replace')
        except Exception as e:  # not published yet today, try the day before
            print(f'GIAS extract {d}: {e}')
    raise SystemExit('no GIAS extract in the last five days')


def main():
    daily_path = os.path.join(RAW, 'reports_daily.csv')
    mi_path = os.path.join(RAW, 'ofsted_rc.csv')
    if not os.path.exists(daily_path):
        print('no daily report cards; nothing to look up'); return
    # every school with a report card: fills gaps for new schools, adds town and postcode for search
    want = {r['urn'] for r in csv.DictReader(open(mi_path, encoding='utf-8'))}
    want |= {r['urn'] for r in csv.DictReader(open(daily_path, encoding='utf-8'))}
    rows = csv.DictReader(io.StringIO(download()))
    out = []
    for g in rows:
        u = (g.get('URN') or '').strip()
        if u in want:
            out.append({'urn': u, 'la': g.get('LA (name)', ''), 'region': g.get('GOR (name)', ''),
                        # only multi-academy trusts, as in Ofsted's MI; maintained schools can name a foundation trust
                        'mat': g.get('Trusts (name)', '') if 'multi-academy' in (g.get('TrustSchoolFlag (name)') or '').lower() else '',
                        'town': g.get('Town', ''),
                        'postcode': g.get('Postcode', ''), 'status': g.get('EstablishmentStatus (name)', '')})
    out.sort(key=lambda r: int(r['urn']))
    with open(os.path.join(RAW, 'gias_slim.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=OUT_COLS); w.writeheader(); w.writerows(out)
    missing = len(want) - len(out)
    print(f'GIAS: matched {len(out)} of {len(want)} schools' + (f' ({missing} not found)' if missing else ''))
    if len(out) < 0.8 * len(want):
        sys.exit('fewer than 80% matched: check the GIAS column names')


if __name__ == '__main__':
    main()
