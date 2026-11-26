#!/usr/bin/env python3
"""Backfill the Report Language corpus: the text of every renewed-framework report card for a state-funded school.

Which reports: every school whose latest full inspection in Ofsted's MI (data/raw/ofsted_mi_latest.csv) began on or
after 10 November 2025, plus every report card read daily since the last MI (data/raw/reports_daily.csv, which already
holds each PDF's address). For MI schools the reader opens the school's page on reports.ofsted.gov.uk and takes the
newest document titled "School inspection", exactly as scripts/fetch_reports.py does.

Where it writes: OUT (default ../mrkdltn-data/report-language, outside the repository and its history):
  text/<urn>.txt.gz   the PDF's extracted text, unparsed (the parser removes names and the inspection team section)
  manifest.jsonl      one line per school read: urn, pdf address, document date, pages, characters, sha256, fetched
  errors.jsonl        failures, retried on the next run
Resumable: a URN already in the manifest is skipped, so stopping and starting again loses nothing.

Polite by design: the same user agent and pause as fetch_reports.py, one request at a time.

  python3 scripts/language/backfill.py [--out DIR] [--limit N]
"""
import argparse, csv, datetime as dt, gzip, hashlib, io, json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
import fetch_reports as fr  # noqa: E402  (get(), latest_inspection_pdf(), BASE, UA, PAUSE)

RAW = os.path.join(HERE, '..', '..', 'data', 'raw')
RENEWED = '2025-11-10'
TYPE = {'Nursery': 20, 'Primary': 21, 'Alternative provision': 22, 'Secondary': 23, 'Special': 25}


# Ofsted files some schools under a category other than their phase's (all-through schools under 28, for example);
# when the expected page is missing, try the others in turn
OTHER_TYPES = [28, 21, 23, 25, 22, 20, 24, 26, 27, 29, 30, 31, 32]


def provider_page(t):
    first = TYPE.get(t['phase'], 21)
    for ty in [first] + [x for x in OTHER_TYPES if x != first]:
        try:
            return fr.get(f"{fr.BASE}/provider/{ty}/{t['urn']}")
        except Exception as e:  # noqa: BLE001
            if '404' not in str(e):
                raise
    raise RuntimeError('no provider page under any category')


def targets():
    out = {}
    for r in csv.DictReader(open(os.path.join(RAW, 'ofsted_mi_latest.csv'), encoding='utf-8')):
        if r['f_start'] >= RENEWED and r['f_rel'] != 'No':
            out[r['urn']] = {'urn': r['urn'], 'phase': r['phase'], 'insp_date': r['f_start'], 'pub': r['f_pub'], 'from': 'MI', 'pdf': ''}
    for r in csv.DictReader(open(os.path.join(RAW, 'reports_daily.csv'), encoding='utf-8')):
        if r.get('insp_date', '') >= RENEWED and r['insp_date'] >= out.get(r['urn'], {}).get('insp_date', ''):
            out[r['urn']] = {'urn': r['urn'], 'phase': r['phase'], 'insp_date': r['insp_date'], 'pub': r.get('published', ''),
                             'from': 'daily', 'pdf': r.get('source', '')}
    return sorted(out.values(), key=lambda t: int(t['urn']))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.normpath(os.path.join(HERE, '..', '..', '..', 'mrkdltn-data', 'report-language')))
    ap.add_argument('--limit', type=int, default=0)
    a = ap.parse_args()
    os.makedirs(os.path.join(a.out, 'text'), exist_ok=True)
    man = os.path.join(a.out, 'manifest.jsonl')
    done = set()
    if os.path.exists(man):
        done = {json.loads(l)['urn'] for l in open(man) if l.strip()}
    todo = [t for t in targets() if t['urn'] not in done]
    print(f'{len(done)} already read, {len(todo)} to read', flush=True)
    from pypdf import PdfReader
    n = 0
    for t in todo:
        if a.limit and n >= a.limit:
            break
        try:
            pdf, link_date = t['pdf'], ''
            if not pdf:
                pdf, link_date = fr.latest_inspection_pdf(provider_page(t))
            if not pdf:
                raise RuntimeError('no School inspection document on the provider page')
            b = fr.get(pdf, binary=True)
            reader = PdfReader(io.BytesIO(b))
            text = '\n'.join((p.extract_text() or '') for p in reader.pages)
            with gzip.open(os.path.join(a.out, 'text', t['urn'] + '.txt.gz'), 'wt', encoding='utf-8') as f:
                f.write(text)
            rec = dict(t, pdf=pdf, link_date=link_date, pages=len(reader.pages), chars=len(text),
                       sha256=hashlib.sha256(b).hexdigest(), fetched=dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'))
            with open(man, 'a') as f:
                f.write(json.dumps(rec) + '\n')
            n += 1
            if n % 50 == 0:
                print(f'{dt.datetime.now():%H:%M} {len(done) + n} read', flush=True)
        except Exception as e:  # noqa: BLE001  keep going; failures are retried on the next run
            with open(os.path.join(a.out, 'errors.jsonl'), 'a') as f:
                f.write(json.dumps({'urn': t['urn'], 'error': str(e)[:300], 'at': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')}) + '\n')
    print(f'finished: {len(done) + n} read', flush=True)


if __name__ == '__main__':
    main()
