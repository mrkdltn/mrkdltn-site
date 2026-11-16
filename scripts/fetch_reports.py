#!/usr/bin/env python3
"""Read report cards that Ofsted has published since its last monthly management information.

For each day in the window it lists state-school reports published on reports.ofsted.gov.uk, opens each
school's page, downloads the latest school inspection report (PDF) and reads the report card grades from
its text. Ungraded inspections (no report card) are skipped. Results are merged into
data/raw/reports_daily.csv, one row per school (the latest report card wins). build_data.py then folds
them into the Explorer, with Ofsted's monthly management information taking precedence when it arrives.

Run from the repository root:
  python3 scripts/fetch_reports.py                      # yesterday and today
  python3 scripts/fetch_reports.py --since 2026-11-01   # a longer window
  python3 scripts/fetch_reports.py --parse FILE.pdf     # test the parser on one PDF

Polite by design: one request at a time, a pause between requests, and a user agent that says who we are.
"""
import argparse, csv, datetime as dt, io, os, re, sys, time
import urllib.request

BASE = 'https://reports.ofsted.gov.uk'
UA = 'mrkdltn.com Ofsted Explorer data refresh (https://mrkdltn.com/explorer/; github.com/mrkdltn/mrkdltn-site)'
OUT = 'data/raw/reports_daily.csv'
PAUSE = 1.0

# report-card areas as written in the PDF -> column
AREAS = [('Achievement', 'g_ach'), ('Attendance and behaviour', 'g_ab'), ('Curriculum and teaching', 'g_ct'),
         ('Early years', 'g_ey'), ('Inclusion', 'g_inc'), ('Leadership and governance', 'g_lg'),
         ('Personal development and wellbeing', 'g_pd'), ('Post-16', 'g_p16'), ('Sixth form', 'g_p16')]
GRADES = ['Exceptional', 'Strong standard', 'Expected standard', 'Needs attention', 'Urgent improvement']
# search-result category -> phase used in the Explorer (state-funded schools only)
PHASE = {'Primary': 'Primary', 'Secondary': 'Secondary', 'Special School': 'Special',
         'Pupil Referral Unit': 'Alternative provision', 'Nursery': 'Nursery'}
COLS = ['urn', 'name', 'phase', 'region', 'la', 'mat', 'idaci_q', 'pupils', 'insp_date', 'g_sg', 'g_inc', 'g_ct',
        'g_ach', 'g_ab', 'g_pd', 'g_ey', 'g_p16', 'g_lg', 'published', 'source']
MONTHS = {m: i for i, m in enumerate(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
                                      'September', 'October', 'November', 'December'], 1)}


def get(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                b = r.read()
            time.sleep(PAUSE)
            return b if binary else b.decode('utf-8', 'replace')
        except Exception as e:  # noqa: BLE001
            if attempt == 2:
                raise
            time.sleep(5 * (attempt + 1))


def long_date(s):
    m = re.search(r'(\d{1,2}) (\w+) (\d{4})', s or '')
    return dt.date(int(m.group(3)), MONTHS[m.group(2)], int(m.group(1))).isoformat() if m and m.group(2) in MONTHS else ''


def parse_pdf_text(text):
    """Report-card grades from a report's text. Returns {} when the report has no report card."""
    lines = [re.sub(r'\s+', ' ', l).strip() for l in text.split('\n')]
    out = {}
    for line in lines:
        for label, col in AREAS:
            if col in out or not line.startswith(label + ' '):
                continue
            rest = line[len(label) + 1:]
            if rest in GRADES:
                out[col] = rest
    if not any(k in out for k in ('g_ach', 'g_ct', 'g_lg')):
        return {}
    joined = ' '.join(lines)
    if re.search(r'Safeguarding standards not met', joined):
        out['g_sg'] = 'Not met'
    elif re.search(r'Safeguarding standards met', joined):
        out['g_sg'] = 'Met'
    m = re.search(r'Inspection report: (\d{1,2} \w+ \d{4})', joined)
    out['insp_date'] = long_date(m.group(1)) if m else ''
    m = re.search(r'Unique reference number \(URN\): (\d+)', joined)
    out['urn_in_pdf'] = m.group(1) if m else ''
    return out


def parse_pdf(data):
    from pypdf import PdfReader
    r = PdfReader(io.BytesIO(data))
    return parse_pdf_text('\n'.join((p.extract_text() or '') for p in r.pages))


def search_day(day):
    """All state-school results whose latest report was published on `day`."""
    d = day.strftime('%d-%m-%Y')
    found, start = [], 0
    while True:
        html = get(f'{BASE}/search?level_1_types=1&latest_report_date_start={d}&latest_report_date_end={d}'
                   f'&status%5B0%5D=1&start={start}&rows=100&sort=date&order=desc')
        items = re.findall(r'<li class="search-result">(.*?)</li>\s*(?=<li class="search-result">|</ul>)', html, re.S)
        for it in items:
            href = re.search(r'href="(/provider/\d+/(\d+))"', it)
            name = re.search(r'<a href="[^"]+">([^<]+)</a>', it)
            cat = re.search(r'Category: <strong>([^<]+)</strong>', it)
            if href and cat and cat.group(1).strip() in PHASE:
                found.append({'href': href.group(1), 'urn': href.group(2), 'name': name.group(1).strip() if name else '',
                              'phase': PHASE[cat.group(1).strip()], 'published': day.isoformat()})
        if len(items) < 100:
            return found
        start += 100


def latest_inspection_pdf(provider_html):
    """URL and date of the newest 'School inspection' document on a provider page."""
    for m in re.finditer(r'href="(https://files\.ofsted\.gov\.uk/v1/file/\d+)"[^>]*>(.*?)</a>', provider_html, re.S):
        txt = re.sub(r'<[^>]+>|\s+', ' ', m.group(2))
        if 'School inspection' in txt:
            return m.group(1), long_date(txt)
    return None, ''


def load_existing():
    if not os.path.exists(OUT):
        return {}
    with open(OUT, newline='', encoding='utf-8') as f:
        return {r['urn']: r for r in csv.DictReader(f)}


def save(rows):
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=COLS)
        w.writeheader()
        for urn in sorted(rows, key=int):
            w.writerow({c: rows[urn].get(c, '') for c in COLS})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--since', help='first publication date, YYYY-MM-DD (default: yesterday)')
    ap.add_argument('--until', help='last publication date, YYYY-MM-DD (default: today)')
    ap.add_argument('--parse', help='parse one local PDF and print the grades')
    a = ap.parse_args()
    if a.parse:
        print(parse_pdf(open(a.parse, 'rb').read()))
        return
    today = dt.date.today()
    since = dt.date.fromisoformat(a.since) if a.since else today - dt.timedelta(days=1)
    until = dt.date.fromisoformat(a.until) if a.until else today
    rows, added, skipped = load_existing(), 0, 0
    day = since
    while day <= until:
        for s in search_day(day):
            pdf_url, link_date = latest_inspection_pdf(get(BASE + s['href']))
            if not pdf_url:
                skipped += 1
                continue
            g = parse_pdf(get(pdf_url, binary=True))
            if not g or (g.get('urn_in_pdf') and g['urn_in_pdf'] != s['urn']):
                skipped += 1  # ungraded inspection, monitoring letter, or a mismatch worth not trusting
                continue
            g.pop('urn_in_pdf', None)
            row = dict(s, **g, source=pdf_url)
            row['insp_date'] = row.get('insp_date') or link_date
            row.pop('href', None)
            cur = rows.get(s['urn'])
            if cur is None or row['insp_date'] >= cur.get('insp_date', ''):
                rows[s['urn']] = row
                added += 1
        save(rows)  # after every day, so a long backfill that is cut short keeps what it has read
        print(f'{day}: {added} read so far, {skipped} skipped', flush=True)
        day += dt.timedelta(days=1)
    save(rows)
    print(f'{since}..{until}: {added} report cards read, {skipped} skipped (no report card), {len(rows)} held')


if __name__ == '__main__':
    sys.exit(main())
