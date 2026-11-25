#!/usr/bin/env python3
"""Fetch Ofsted's monthly management information (MI) for state-funded schools and keep what the
Inspection timing panel needs.

Source: Ofsted, "State-funded school inspections and outcomes: management information", the file
"Management information - state-funded schools - latest inspections as at <date>" (CSV). One row per open
state-funded school, with both the renewed-framework report card fields (latest full inspection) and the
original-framework fields (latest graded inspection, latest ungraded inspection).

  python3 scripts/fetch_mi.py                    newest release listed on GOV.UK
  python3 scripts/fetch_mi.py --file PATH.csv    a file already downloaded (as-at date read from its name)

Writes data/raw/ofsted_mi_latest.csv (ISO dates, short column names, one row per URN) and
data/raw/ofsted_mi_meta.json (title, URL, as-at date, SHA-256 of the original file). The column map below
is checked against the real headers: if Ofsted renames a column the script stops rather than guess.
"""
import argparse, csv, datetime as dt, hashlib, io, json, os, re, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, '..', 'data', 'raw')
PAGE = 'https://www.gov.uk/api/content/government/statistical-data-sets/monthly-management-information-ofsteds-school-inspections-outcomes'
UA = 'mrkdltn.com Ofsted Explorer (open data; https://mrkdltn.com/explorer/)'

# short name -> exact MI header (as published from October 2026; the first column's name varies, so it is not used)
COLS = {
    'urn': 'URN',
    'name': 'School name',
    'phase': 'Ofsted phase',
    'type': 'Type of education',
    'open': 'School open date',
    # renewed framework: latest full inspection (report card)
    'f_type': 'Inspection type',
    'f_event': 'Event type grouping',
    'f_start': 'Inspection start date',
    'f_pub': 'Publication date',
    'f_rel': 'Does the latest full inspection relate to the URN of the current school?',
    'f_urn': 'URN at time of latest full inspection',
    'coc': 'Category of concern',
    'g_sg': 'Safeguarding standards',
    'g_inc': 'Inclusion',
    'g_ct': 'Curriculum and teaching',
    'g_ach': 'Achievement',
    'g_ab': 'Attendance and behaviour',
    'g_pd': 'Personal development and wellbeing',
    'g_ey': 'Early years (where applicable)',
    'g_p16': 'Post-16 provision (where applicable)',
    'g_lg': 'Leadership and governance',
    # original framework: latest graded inspection
    'o_type': 'Inspection type of latest OEIF graded inspection',
    'o_event': 'Event type grouping of latest OEIF graded inspection',
    'o_start': 'Inspection start date of latest OEIF graded inspection',
    'o_pub': 'Publication date of latest OEIF graded inspection',
    'o_rel': 'Does the latest OEIF graded inspection relate to the URN of the current school?',
    'o_urn': 'URN at time of latest OEIF graded inspection',
    'o_coc': 'Latest OEIF category of concern',
    'o_oe': 'Latest OEIF overall effectiveness',
    'o_qe': 'Latest OEIF quality of education',
    'o_ba': 'Latest OEIF behaviour and attitudes',
    'o_pd': 'Latest OEIF personal development',
    'o_lm': 'Latest OEIF effectiveness of leadership and management',
    'o_ey': 'Latest OEIF early years provision (where applicable)',
    'o_sf': 'Latest OEIF sixth form provision (where applicable)',
    # original framework: latest ungraded inspection
    'u_start': 'Date of latest ungraded inspection',
    'u_pub': 'Ungraded inspection publication date',
    'u_rel': 'Does the ungraded inspection relate to the URN of the current school?',
    'u_urn': 'URN at time of ungraded inspection',
    'u_out': 'Ungraded inspection overall outcome',
    'coc_recent': 'Most recent category of concern',
}
DATES = {'open', 'f_start', 'f_pub', 'o_start', 'o_pub', 'u_start', 'u_pub'}
MONTHS = {m.lower()[:3]: i for i, m in enumerate(['January', 'February', 'March', 'April', 'May', 'June', 'July',
                                                  'August', 'September', 'October', 'November', 'December'], 1)}


def iso(v):
    v = (v or '').strip()
    if v in ('', 'NULL'):
        return ''
    d, m, y = v.split('/')
    return f'{int(y):04d}-{int(m):02d}-{int(d):02d}'


def clean(v):
    v = (v or '').strip()
    return '' if v == 'NULL' else v


def as_at_from_title(t):
    m = re.search(r'as at (\d{1,2}) (\w+) (\d{4})', t)
    return dt.date(int(m.group(3)), MONTHS[m.group(2).lower()[:3]], int(m.group(1))).isoformat() if m else ''


def latest_attachment():
    with urllib.request.urlopen(urllib.request.Request(PAGE, headers={'User-Agent': UA}), timeout=60) as r:
        page = json.load(r)
    best = None
    for a in page['details'].get('attachments', []):
        t = a.get('title') or ''
        if 'latest inspections as at' in t and (a.get('url') or '').endswith('.csv'):
            d = as_at_from_title(t)
            if d and (best is None or d > best[0]):
                best = (d, t, a['url'])
    if not best:
        raise SystemExit('no "latest inspections" CSV found on the MI page')
    return best


def convert(raw_bytes, as_at, title, url):
    try:
        text = raw_bytes.decode('utf-8-sig')
    except UnicodeDecodeError:
        text = raw_bytes.decode('cp1252')
    rows = csv.DictReader(io.StringIO(text))
    missing = [h for h in COLS.values() if h not in rows.fieldnames]
    if missing:
        raise SystemExit(f'MI headers changed; not found: {missing}')
    out = []
    for r in rows:
        rec = {k: (iso(r[h]) if k in DATES else clean(r[h])) for k, h in COLS.items()}
        out.append(rec)
    out.sort(key=lambda r: int(r['urn']))
    path = os.path.join(RAW, 'ofsted_mi_latest.csv')
    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(COLS)); w.writeheader(); w.writerows(out)
    meta = {'title': title, 'url': url, 'as_at': as_at, 'rows': len(out),
            'sha256_original': hashlib.sha256(raw_bytes).hexdigest(),
            'fetched': dt.date.today().isoformat()}
    with open(os.path.join(RAW, 'ofsted_mi_meta.json'), 'w') as f:
        json.dump(meta, f, indent=1)
    print(f'MI as at {as_at}: {len(out)} schools -> {path}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--file')
    ap.add_argument('--url', default='')
    a = ap.parse_args()
    if a.file:
        title = os.path.basename(a.file)
        as_at = as_at_from_title(title.replace('_', ' ')) or ''
        convert(open(a.file, 'rb').read(), as_at, title, a.url)
        return
    as_at, title, url = latest_attachment()
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=300) as r:
        raw = r.read()
    convert(raw, as_at, title, url)


if __name__ == '__main__':
    sys.exit(main())
