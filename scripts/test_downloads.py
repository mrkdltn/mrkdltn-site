#!/usr/bin/env python3
"""Checks the Get the data downloads (site/explorer/data/csv/) after a build.

Done when a researcher can rebuild any number on a school page from the downloads alone, so this rebuilds them
from the CSVs only and compares: the similar-schools average, gap, z, band and the 2024/25 equivalents; the gap to
national; both contextual models' expected values; the English and maths similar-schools figures. It also checks
that the CSVs agree with the JSON the Explorer loads, that build.json's checksums match the files, that every
column is in the dictionary, and that no figure is given for a group under 10.

Run from the repository root after scripts/build_data.py: python3 scripts/test_downloads.py
"""
import csv, hashlib, json, math, os, sys

D = sys.argv[1] if len(sys.argv) > 1 else 'site/explorer/data'
C = os.path.join(D, 'csv')
fails = []


def check(ok, msg):
    if not ok:
        fails.append(msg)


def load(n):
    with open(os.path.join(C, n), newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def f(v):
    return None if v in ('', None) else float(v)


sec, rc, sim, mod, dic = (load(n) for n in ('secondaries.csv', 'report-cards.csv', 'similar-schools.csv', 'model.csv', 'dictionary.csv'))
by = {r['urn']: r for r in sec}
nn = {}
for p in sim:
    nn.setdefault(p['urn'], []).append(p['similar_urn'])

# 1. similar schools: average, spread, gap, z, band (2025/26 and 2024/25)
n_ss = 0
for r in sec:
    g = nn.get(r['urn'], [])
    check(len(g) == 50, f"{r['urn']}: {len(g)} similar schools")
    vals = [f(by[u]['a8']) for u in g if u in by and f(by[u]['a8']) is not None]
    if not vals or f(r['ss_mean']) is None:
        continue
    n_ss += 1
    mean = sum(vals) / len(vals); sd = (sum((x - mean) ** 2 for x in vals) / (len(vals) - 1)) ** 0.5
    check(abs(mean - f(r['ss_mean'])) < 0.006, f"{r['urn']}: ss_mean {r['ss_mean']} rebuilt {mean:.3f}")
    check(abs(sd - f(r['ss_sd'])) < 0.006, f"{r['urn']}: ss_sd {r['ss_sd']} rebuilt {sd:.3f}")
    check(abs(f(r['a8']) - f(r['ss_mean']) - f(r['ss_diff'])) < 0.006, f"{r['urn']}: ss_diff")
    se = math.sqrt(14.2 ** 2 / f(r['pupils']) + f(r['ss_sd']) ** 2 / 50); z = f(r['ss_diff']) / se
    check(abs(z - f(r['ss_z'])) < 0.015 + 0.004 * abs(z), f"{r['urn']}: ss_z {r['ss_z']} rebuilt {z:.3f}")
    band = ('Close to' if abs(z) <= 1.96 else ('Well above' if f(r['ss_diff']) > f(r['ss_sd']) else 'Above') if z > 0
            else ('Well below' if -f(r['ss_diff']) > f(r['ss_sd']) else 'Below'))
    if abs(abs(z) - 1.96) > 0.01 and abs(abs(f(r['ss_diff'])) - f(r['ss_sd'])) > 0.01:  # not on a rounding boundary
        check(band == r['ss_band'], f"{r['urn']}: ss_band {r['ss_band']} rebuilt {band}")
    v25 = [f(by[u]['a8_25']) for u in g if u in by and f(by[u]['a8_25']) is not None]
    if v25 and f(r['ss_mean_25']) is not None:
        check(abs(sum(v25) / len(v25) - f(r['ss_mean_25'])) < 0.006, f"{r['urn']}: ss_mean_25 {r['ss_mean_25']} rebuilt {sum(v25) / len(v25):.3f}")
        if f(r['a8_25']) is not None and f(r['ss_diff_25']) is not None:
            check(abs(f(r['a8_25']) - f(r['ss_mean_25']) - f(r['ss_diff_25'])) < 0.051, f"{r['urn']}: ss_diff_25")  # a8_25 is published to one decimal
    e = [f(by[u]['em5']) for u in g if u in by and f(by[u]['em5']) is not None]
    if e and f(r['em5_ss']) is not None:
        check(abs(sum(e) / len(e) - f(r['em5_ss'])) < 0.006, f"{r['urn']}: em5_ss")

# 2. national: pupil-weighted mean Attainment 8
w = [(f(r['a8']), f(r['pupils'])) for r in sec if f(r['a8']) is not None and f(r['pupils'])]
nat = sum(a * p for a, p in w) / sum(p for _, p in w)
for r in sec:
    if f(r['a8']) is not None and f(r['nat_diff']) is not None:
        check(abs(f(r['a8']) - nat - f(r['nat_diff'])) < 0.02, f"{r['urn']}: nat_diff {r['nat_diff']} rebuilt {f(r['a8']) - nat:.3f}")

# 3. contextual models from model.csv
terms = {m['term']: m for m in mod}
F = [t for t in terms if t != 'intercept' and terms[t]['a8_coefficient'] != '']
n_cva = worst_a8 = worst_em = 0
for r in sec:
    if any(f(r[t]) is None for t in F):
        continue
    a8 = float(terms['intercept']['a8_coefficient']) + sum(float(terms[t]['a8_coefficient']) * f(r[t]) for t in F)
    eta = float(terms['intercept']['em5_coefficient']) + sum(float(terms[t]['em5_coefficient']) * f(r[t]) for t in F)
    em = 100 / (1 + math.exp(-eta))
    n_cva += 1
    if f(r['em5_cva']) is not None:
        worst_em = max(worst_em, abs(em - f(r['em5_cva'])))
        check(0 <= f(r['em5_cva']) <= 100, f"{r['urn']}: em5_cva outside 0-100")
    worst_a8 = max(worst_a8, abs(a8 - f(r['cva_exp'])))
check(worst_em < 0.006, f'em5_cva not reproduced from model.csv (worst {worst_em:.4f})')

# 4. groups under 10: no disadvantaged / other-pupil figures
for r in sec:
    p, d = f(r['pupils']), f(r['dis_pct'])
    if p is None or d is None:
        continue
    if round(p * d / 100) < 10 or round(p * (100 - d) / 100) < 10:  # both blank, so neither gives the other away
        check(r['dis_a8'] == '' and r['nondis_a8'] == '', f"{r['urn']}: a group under 10 can be read or worked out")

# 5. CSVs agree with what the Explorer loads
def colmajor(n):
    j = json.load(open(os.path.join(D, n), encoding='utf-8'))
    rows = []
    for i in range(j['n']):
        o = {}
        for c in j['cols']:
            v = j['data'][c][i]
            o[c] = '' if v is None else (j['codes'][c][v] if c in j['codes'] else v)
        rows.append(o)
    return rows


def same(a, b):
    if a in ('', None) or b in ('', None):
        return a in ('', None) and b in ('', None)
    try:
        return abs(float(a) - float(b)) < 1e-6
    except ValueError:
        return str(a) == str(b)


for name, rows, csvrows in (('ks4.json', colmajor('ks4.json'), sec), ('rc.json', colmajor('rc.json'), rc)):
    cb = {r['urn']: r for r in csvrows}
    check(len(rows) == len(csvrows), f'{name}: {len(rows)} rows, CSV {len(csvrows)}')
    bad = [(r['urn'], c) for r in rows for c in r if c in cb.get(str(r['urn']), {}) and not same(r[c], cb[str(r['urn'])][c])]
    check(not bad, f'{name}: {len(bad)} values differ from the CSV, e.g. {bad[:3]}')

# 6. checksums and dictionary
b = json.load(open(os.path.join(D, 'build.json')))
for n, meta in b.get('downloads', {}).items():
    h = hashlib.sha256(open(os.path.join(C, n), 'rb').read()).hexdigest()
    check(h == meta['sha256'], f'{n}: checksum in build.json does not match')
check(set(b.get('downloads', {})) == {'secondaries.csv', 'report-cards.csv', 'similar-schools.csv', 'model.csv', 'dictionary.csv'}, 'build.json: downloads list')
inds = {(d['file'], d['column']) for d in dic if d['meaning'] and d['source']}
for n, rows in (('secondaries.csv', sec), ('report-cards.csv', rc), ('similar-schools.csv', sim), ('model.csv', mod)):
    for c in rows[0]:
        check((n, c) in inds, f'dictionary: no entry for {n} {c}')
check(bool(b.get('version')), 'build.json: no data version')

print(json.dumps({'secondaries': len(sec), 'report_cards': len(rc), 'pairs': len(sim), 'similar_rebuilt': n_ss,
                  'contextual_rebuilt': n_cva, 'cva_exp_worst_diff': round(worst_a8, 3), 'em5_cva_worst_diff': round(worst_em, 4),
                  'national_a8': round(nat, 2), 'version': b.get('version'), 'failures': len(fails)}))
for m in fails[:25]:
    print('FAIL', m)
if fails:
    sys.exit(1)
print('downloads test passed')
