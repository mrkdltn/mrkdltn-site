#!/usr/bin/env python3
"""Report Language: draw a reproducible audit sample of parsed report cards and write an audit sheet.

The sample is stratified by phase and by the report's lowest area grade (any Urgent improvement; any Needs attention;
otherwise all Expected or better). Within each stratum reports are ordered by sha256(seed + urn), so the draw is
fixed for a given corpus and, as the corpus grows, earlier picks mostly stay picked. Each stratum gets at least two
reports where it has them (all of them if fewer), and the rest of the sample is shared in proportion to stratum size.
Re-draw on the complete corpus by running this again once the backfill has finished.

Everything this writes stays OUTSIDE the repository, because it holds PDF addresses and URNs:
  audit/sheet-<label>.md  for each report: index number, PDF address, grades, and the first and last words of every
                          parsed section, for comparison with the PDF
  audit/key-<label>.csv   index number -> URN (the only link between the sheet's numbers and schools)

  python3 scripts/language/audit_sample.py [--n 50] [--seed report-language-audit-1] [--label first] [--upto N]

The first audit (docs/report-language/parse-audit.md) is re-created with --label first --upto 1044.
"""
import argparse, collections, csv, hashlib, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import parse as P  # noqa: E402

BANDS = ['Urgent improvement', 'Needs attention', 'Expected or better']


def band(rec):
    g = set(rec['grades'].values())
    if 'Urgent improvement' in g or rec.get('safeguarding') == 'Not met':
        return BANDS[0]
    if 'Needs attention' in g:
        return BANDS[1]
    return BANDS[2]


def draw(recs, n, seed, floor=2):
    """recs: {urn: parsed record}. Returns a list of URNs."""
    strata = collections.defaultdict(list)
    for u, r in recs.items():
        strata[(r['phase'], band(r))].append(u)
    for k in strata:
        strata[k].sort(key=lambda u: hashlib.sha256(f'{seed}:{u}'.encode()).hexdigest())
    take = {k: min(floor, len(v)) for k, v in strata.items()}
    left = n - sum(take.values())
    total = sum(len(v) for v in strata.values())
    if left > 0:
        # largest remainder over what is left in each stratum
        want = {k: left * len(v) / total for k, v in strata.items()}
        add = {k: min(int(want[k]), len(strata[k]) - take[k]) for k in strata}
        for k in add:
            take[k] += add[k]
        rest = n - sum(take.values())
        for k in sorted(strata, key=lambda k: -(want[k] - int(want[k]))):
            if rest <= 0:
                break
            if take[k] < len(strata[k]):
                take[k] += 1
                rest -= 1
    out = []
    for k in sorted(strata):
        out += strata[k][:take[k]]
    return out[:n] if len(out) > n else out


def ends(paras, k=8):
    words = ' '.join(paras).split()
    if len(words) <= 2 * k:
        return ' '.join(words), ''
    return ' '.join(words[:k]), ' '.join(words[-k:])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default=P.DATA)
    ap.add_argument('--n', type=int, default=50)
    ap.add_argument('--seed', default='report-language-audit-1')
    ap.add_argument('--label', default='first')
    ap.add_argument('--upto', type=int, default=0, help='draw only from the first N manifest rows (the manifest is '
                    'append-only, so this re-creates an earlier draw)')
    a = ap.parse_args()
    rows = [json.loads(l) for l in open(os.path.join(a.data, 'manifest.jsonl')) if l.strip()]
    if a.upto:
        rows = rows[:a.upto]
    man = {r['urn']: r for r in rows}
    pdir = os.path.join(a.data, 'parsed')
    recs = {}
    for u in man:
        f = os.path.join(pdir, u + '.json')
        if os.path.exists(f):
            recs[u] = json.load(open(f))
    pick = draw(recs, a.n, a.seed)
    os.makedirs(os.path.join(a.data, 'audit'), exist_ok=True)
    with open(os.path.join(a.data, 'audit', f'key-{a.label}.csv'), 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['index', 'urn', 'phase', 'band'])
        for i, u in enumerate(pick, 1):
            w.writerow([i, u, recs[u]['phase'], band(recs[u])])
    L = [f'# Parse audit sheet ({a.label})', '',
         f'{len(pick)} reports drawn from {len(recs)} parsed (seed "{a.seed}"), stratified by phase and lowest grade. '
         'For each, open the PDF and check: (1) every section starts and ends where shown, (2) every grade, '
         '(3) no personal name or school name is left in the parsed text. Kept outside the repository.', '']
    for i, u in enumerate(pick, 1):
        r = recs[u]
        L += [f'## {i}. {r["phase"]}, {band(r)}', '', f'PDF: {man[u]["pdf"]}', '',
              f'Safeguarding: {r["safeguarding"]}. Category of concern: {r["concern"] or "none"}.', '',
              '| Section | Grade | Words | Starts | Ends |', '| --- | --- | --: | --- | --- |']
        for k, v in r['sections'].items():
            s, e = ends(v['paragraphs'])
            L.append(f'| {k} | {v.get("grade") or ""} | {v["words"]} | {s} | {e} |')
        L.append('')
    path = os.path.join(a.data, 'audit', f'sheet-{a.label}.md')
    open(path, 'w').write('\n'.join(L))
    c = collections.Counter((recs[u]['phase'], band(recs[u])) for u in pick)
    print(f'{len(pick)} drawn; sheet at {path}')
    for k in sorted(c):
        print(' ', k, c[k])


if __name__ == '__main__':
    main()
