"""Reconnaissance: download the DfE key stage 2 institution-level data (2024/25 revised) and describe it.
Run on GitHub's runner (the workspace cannot reach the DfE API)."""
import csv, collections, io, sys, urllib.request, gzip, os
SETS = {'ks2_perf': '019afee4-e5d0-72f9-9a8f-d7a1a56eac1d'}
UA = 'mrkdltn.com Ofsted Explorer (open data; https://mrkdltn.com/explorer/)'
for name, ds in SETS.items():
    url = f'https://api.education.gov.uk/statistics/v1/data-sets/{ds}/csv'
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'text/csv'})
    with urllib.request.urlopen(req, timeout=600) as r:
        raw = r.read()
    if raw[:2] == b'\x1f\x8b':
        raw = gzip.decompress(raw)
    text = raw.decode('utf-8-sig', errors='replace')
    os.makedirs('recon', exist_ok=True)
    open(f'recon/{name}.csv.gz', 'wb').write(gzip.compress(raw))
    rows = csv.DictReader(io.StringIO(text))
    print(f'== {name}: {len(raw)//1024} KB'); print('columns:', rows.fieldnames)
    cnt = {k: collections.Counter() for k in ('time_period', 'breakdown_topic', 'breakdown', 'subject')}
    urns = collections.defaultdict(set); sample = []
    for i, r in enumerate(rows):
        for k in cnt:
            if k in r: cnt[k][r[k]] += 1
        urns[r.get('time_period')].add(r.get('school_urn'))
        if len(sample) < 6 and r.get('breakdown') in ('Total', 'All pupils'): sample.append(r)
    for k, c in cnt.items(): print(k, c.most_common(40))
    print('schools by year:', {k: len(v) for k, v in urns.items()})
    for s in sample: print(s)
