"""Reconnaissance: describe the DfE key stage 2 school information file and check prior-attainment coverage.
Runs on GitHub's runner (the workspace cannot reach the DfE API)."""
import csv, collections, io, urllib.request, gzip
UA = 'mrkdltn.com Ofsted Explorer (open data; https://mrkdltn.com/explorer/)'
def get(ds):
    req = urllib.request.Request(f'https://api.education.gov.uk/statistics/v1/data-sets/{ds}/csv', headers={'User-Agent': UA, 'Accept': 'text/csv'})
    raw = urllib.request.urlopen(req, timeout=600).read()
    if raw[:2] == b'\x1f\x8b': raw = gzip.decompress(raw)
    return list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig', errors='replace'))))
info = get('019afee4-ba17-73cb-85e0-f88c101bb734')
print('== school information:', len(info), 'rows'); print('columns:', list(info[0].keys()))
for c in info[0].keys():
    vals = [r[c] for r in info]; filled = sum(1 for v in vals if v not in ('', 'z', 'x', 'c', 'u', 'low', 'NA'))
    print(f'  {c}: filled {filled}/{len(vals)}; e.g. {collections.Counter(vals).most_common(4)}')
perf = get('019afee4-e5d0-72f9-9a8f-d7a1a56eac1d')
pa = [r for r in perf if r['time_period'] == '202425' and r['breakdown_topic'] == 'Prior attainment group' and r['subject'] == 'Reading, writing and maths']
print('== prior attainment rows 2024/25 (RWM):', len(pa), collections.Counter(r['breakdown'] for r in pa))
print('   filled expected_standard:', sum(1 for r in pa if r['expected_standard_pupil_percent'] not in ('z', 'x', 'c', '')))
tot = [r for r in perf if r['time_period'] == '202425' and r['breakdown'] == 'Total']
for subj in ('Reading', 'Maths', 'Reading, writing and maths'):
    t = [r for r in tot if r['subject'] == subj]
    print(f'== {subj}: {len(t)} schools; scaled score filled', sum(1 for r in t if r['average_scaled_score'] not in ('z', 'x', 'c', '')),
          '; expected filled', sum(1 for r in t if r['expected_standard_pupil_percent'] not in ('z', 'x', 'c', '')),
          '; codes', collections.Counter(r['average_scaled_score'] for r in t if not r['average_scaled_score'].isdigit()).most_common(5))
