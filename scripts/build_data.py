#!/usr/bin/env python3
"""Build the Ofsted Explorer's data files from the raw sources.

Inputs (data/raw/):
  ks4_model_v3.csv   secondary schools: KS4 results, context, similar-schools model, report card grades
  ofsted_rc.csv      Ofsted report cards, all phases (monthly management information)
  reports_daily.csv  optional: report cards read from Ofsted's published reports since the last MI release
Outputs (site/explorer/data/):
  ks4.json, rc.json  compact column-major JSON, served compressed by Cloudflare Pages
  nn/0..31.json      similar-schools lists, sharded by URN
  build.json         when and from what the data was built

Format (column-major, compresses well): {"n": rows, "cols": [...], "codes": {col: [labels]}, "data": {col: [...]}}.
Grade and band columns hold an index into codes[col]. The 50 similar schools per school are not in ks4.json:
they are split by URN into nn/<urn % 32>.json ({urn: [urns]}) and fetched only for the school being viewed.
dash.js expands everything back into the same string-valued row objects the CSV loader produced, so the
Explorer's code is unchanged.

Run from the repository root: python3 scripts/build_data.py [raw_dir] [out_dir]
"""
import csv, hashlib, json, math, os, sys, datetime

RAW = sys.argv[1] if len(sys.argv) > 1 else 'data/raw'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'site/explorer/data'

GRADES = ['Exceptional', 'Strong standard', 'Expected standard', 'Needs attention', 'Urgent improvement',
          'Not applicable', 'Met', 'Not met']
GRADE_COLS = ['g_ach', 'g_ct', 'g_inc', 'g_ab', 'g_pd', 'g_lg', 'g_sg', 'g_p16', 'g_ey']
BANDS = ['Well above', 'Above', 'Close to', 'Below', 'Well below']
# columns the Explorer never reads
KS4_DROP = {'relig', 'ss_z', 'ss_dist', 'ss_mean_25'}
# decimals kept per column (everything else numeric is kept as written)
ROUND = {'lat': 4, 'lng': 4}
NN_SHARDS = 32


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 16), b''):
            h.update(b)
    return h.hexdigest()


def num(v):
    """Numbers as numbers, keeping the CSV's own precision; '' as None."""
    if v == '' or v is None:
        return None
    try:
        f = float(v)
    except ValueError:
        return v
    if f.is_integer() and '.' not in v and 'e' not in v.lower():
        return int(f)
    return f


def encode(rows, cols, codes, nn_index=None, numeric=()):
    out = []
    for r in rows:
        rec = []
        for c in cols:
            v = r.get(c, '')
            if c in codes:
                rec.append(None if v in ('', None) else codes[c].index(v))
            elif c == 'nn' and nn_index is not None:
                rec.append([nn_index[u] for u in v.split() if u in nn_index] if v else [])
            elif c in numeric:
                x = num(v)
                if isinstance(x, float) and c in ROUND:
                    x = round(x, ROUND[c])
                rec.append(x)
            else:
                rec.append(None if v == '' else v)
        out.append(rec)
    return out


def load(path):
    with open(path, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


EM_FACTORS = ['pa_index', 'nor', 'nonmob_pct', 'dis_pct', 'idaci_q', 'ehc_pct', 'sensup_pct', 'eal_school']


def _lstsq(X, y):
    """Ordinary least squares by the normal equations (small, dependency-free)."""
    k = len(X[0])
    A = [[sum(r[i] * r[j] for r in X) for j in range(k)] + [sum(r[i] * yy for r, yy in zip(X, y))] for i in range(k)]
    for c in range(k):
        p = max(range(c, k), key=lambda i: abs(A[i][c])); A[c], A[p] = A[p], A[c]
        for i in range(k):
            if i != c and A[c][c]:
                f = A[i][c] / A[c][c]; A[i] = [a - f * b for a, b in zip(A[i], A[c])]
    return [A[i][k] / A[i][i] for i in range(k)]


def _fraclogit(X, p, iters=50):
    """Fractional logit (quasi-binomial GLM) by iteratively reweighted least squares. Predictions stay between 0 and 1,
    so a percentage measure such as EM 5+ cannot be expected above 100% or below 0%."""
    beta = [0.0] * len(X[0])
    for _ in range(iters):
        eta = [sum(a * x for a, x in zip(beta, f)) for f in X]
        mu = [1 / (1 + math.exp(-e)) for e in eta]
        w = [max(u * (1 - u), 1e-6) for u in mu]
        sw = [ww ** 0.5 for ww in w]
        z = [e + (y - u) / ww for e, y, u, ww in zip(eta, p, mu, w)]
        nb = _lstsq([[x * s for x in f] for f, s in zip(X, sw)], [zz * s for zz, s in zip(z, sw)])
        done = max(abs(a - c) for a, c in zip(nb, beta)) < 1e-9
        beta = nb
        if done:
            break
    return beta


def enrich_em(ks4):
    """For each school: the mean and spread of its 50 similar schools on em5 (English and maths grade 5+), and the expected
    value from one regression on the same public factors as the Attainment 8 contextual model.
    The similar-schools groups are the Attainment 8 replica's, so these are an approximation."""
    by = {r['urn']: r for r in ks4}
    med = {}
    for f in EM_FACTORS:
        v = sorted(float(r[f]) for r in ks4 if num(r.get(f)) is not None)
        med[f] = v[len(v) // 2] if v else 0.0
    feats = lambda r: [1.0] + [float(r[f]) if num(r.get(f)) is not None else med[f] for f in EM_FACTORS]
    for m in ('em5',):
        rows = [r for r in ks4 if num(r.get(m)) is not None]
        b = _fraclogit([feats(r) for r in rows], [float(r[m]) / 100 for r in rows])
        for r in ks4:
            v = num(r.get(m))
            nb = [float(by[u][m]) for u in (r.get('nn') or '').split() if u in by and num(by[u].get(m)) is not None]
            if nb:
                mean = sum(nb) / len(nb); sd = (sum((x - mean) ** 2 for x in nb) / max(len(nb) - 1, 1)) ** 0.5
                r[m + '_ss'], r[m + '_ssd'] = f'{mean:.2f}', f'{sd:.2f}'
            else:
                r[m + '_ss'] = r[m + '_ssd'] = ''
            r[m + '_cva'] = f'{100 / (1 + math.exp(-sum(a * x for a, x in zip(b, feats(r))))):.2f}' if v is not None else ''


def write_model(ks4):
    """model.json: what the Explorer needs to draw how the comparisons are built. The factor means and standard
    deviations used to standardise, the published similar-schools weights, and the two contextual models' coefficients
    (Attainment 8: least squares, reproduces cva_exp; EM 5+: fractional logit, reproduces em5_cva)."""
    F = EM_FACTORS
    rows = [r for r in ks4 if all(num(r.get(f)) is not None for f in F)]
    X = [[1.0] + [float(r[f]) for f in F] for r in rows]
    st = {}
    for i, f in enumerate(F):
        v = [x[i + 1] for x in X]; m = sum(v) / len(v)
        st[f] = {'mean': m, 'sd': (sum((a - m) ** 2 for a in v) / (len(v) - 1)) ** 0.5}
    a8 = [r for r in rows if num(r.get('a8')) is not None]
    em = [r for r in rows if num(r.get('em5')) is not None]
    b_a8 = _lstsq([[1.0] + [float(r[f]) for f in F] for r in a8], [float(r['a8']) for r in a8])
    b_em = _fraclogit([[1.0] + [float(r[f]) for f in F] for r in em], [float(r['em5']) / 100 for r in em])
    model = {'factors': F, 'stats': st, 'n': len(rows),
             'weights': {'pa_index': 0.46, 'dis_pct': 0.14, 'polar4': 0.11, 'sensup_pct': 0.09, 'nonmob_pct': 0.06,
                         'idaci_q': 0.06, 'ehc_pct': 0.04, 'eal_school': 0.03, 'nor': 0.02},
             'a8': {'form': 'linear', 'coef': b_a8, 'mean_y': sum(float(r['a8']) for r in a8) / len(a8)},
             'em5': {'form': 'logit', 'coef': b_em}}
    with open(os.path.join(OUT, 'model.json'), 'w') as f:
        json.dump(model, f, separators=(',', ':'))


def main():
    os.makedirs(OUT, exist_ok=True)
    ks4_path, rc_path = os.path.join(RAW, 'ks4_model_v3.csv'), os.path.join(RAW, 'ofsted_rc.csv')
    daily_path = os.path.join(RAW, 'reports_daily.csv')
    ks4, rc = load(ks4_path), load(rc_path)

    # report cards: MI is the record; daily reads add schools or newer inspections only
    daily_added, latest_published = 0, None
    if os.path.exists(daily_path):
        by = {r['urn']: r for r in rc}
        daily = load(daily_path)
        latest_published = max((d.get('published') or '' for d in daily), default='') or None
        for d in daily:
            cur = by.get(d['urn'])
            if cur is None or (d.get('insp_date') or '') > (cur.get('insp_date') or ''):
                base = cur if cur is not None else {c: '' for c in rc[0].keys()}
                merged = dict(base, **{k: v for k, v in d.items() if v != '' and k in rc[0]})
                by[d['urn']] = merged
                daily_added += 1
        rc = list(by.values())
    # Get Information about Schools: fill gaps for new schools; town and postcode for search
    gias_path = os.path.join(RAW, 'gias_slim.csv')
    gias = {g['urn']: g for g in load(gias_path)} if os.path.exists(gias_path) else {}
    in_mi = {r['urn'] for r in load(rc_path)}
    for r in rc:
        g = gias.get(r['urn'], {})
        if r['urn'] not in in_mi:  # MI is the record; GIAS only fills gaps for schools not in it yet
            for c in ('la', 'region', 'mat'):
                if not r.get(c) and g.get(c):
                    r[c] = g[c]
        r['town'], r['postcode'] = g.get('town', ''), g.get('postcode', '')
    if os.path.exists(daily_path):
        # carry newer grades onto the KS4 rows too
        k_by = {r['urn']: r for r in ks4}
        for r in rc:
            k = k_by.get(r['urn'])
            if k and (r.get('insp_date') or '') > (k.get('insp_date') or ''):
                for c in GRADE_COLS + ['insp_date']:
                    if c in k and c in r:
                        k[c] = r[c]

    # --- English and maths at grade 5+ and 4+: similar-schools averages and a contextual expectation ---
    enrich_em(ks4)
    write_model(ks4)

    # --- ks4 ---
    cols = [c for c in ks4[0].keys() if c not in KS4_DROP]
    codes = {c: GRADES for c in cols if c in GRADE_COLS}
    codes.update({c: BANDS for c in ('ss_band', 'ss_band_25') if c in cols})
    text = {'urn', 'name', 'la', 'region', 'mat', 'type', 'selective', 'pa_imputed', 'insp_date', 'nn',
            'postcode', 'pred', 'district', 'pcon'}
    numeric = [c for c in cols if c not in text and c not in codes]
    nn_index = {r['urn']: i for i, r in enumerate(ks4)}
    for c, labels in codes.items():
        bad = {r[c] for r in ks4 if r[c] not in ('', *labels)}
        if bad:
            raise SystemExit(f'unknown values in {c}: {bad}')
    ks4_out = {'cols': cols, 'codes': codes, 'rows': encode(ks4, cols, codes, None, numeric)}

    # --- report cards, all phases ---
    rcols = ['urn', 'name', 'phase', 'region', 'la', 'mat', 'town', 'postcode', 'idaci_q', 'pupils', 'insp_date'] + \
            [c for c in GRADE_COLS if c in rc[0]]
    rcodes = {c: GRADES for c in rcols if c in GRADE_COLS}
    rcodes['phase'] = sorted({r['phase'] for r in rc})
    rcodes['region'] = sorted({r['region'] for r in rc})
    for c, labels in rcodes.items():
        bad = {r.get(c, '') for r in rc if r.get(c, '') not in ('', *labels)}
        if bad:
            raise SystemExit(f'unknown values in {c}: {bad}')
    rc_out = {'cols': rcols, 'codes': rcodes, 'rows': encode(rc, rcols, rcodes, numeric=('idaci_q', 'pupils'))}

    def colmajor(obj):
        cols, rows = obj['cols'], obj['rows']
        return {'n': len(rows), 'cols': cols, 'codes': obj['codes'], 'data': {c: [r[i] for r in rows] for i, c in enumerate(cols)}}

    # similar-schools lists out of the main file, sharded by URN
    nn_dir = os.path.join(OUT, 'nn'); os.makedirs(nn_dir, exist_ok=True)
    shards = {}
    for r in ks4:
        shards.setdefault(int(r['urn']) % NN_SHARDS, {})[r['urn']] = [int(u) for u in r['nn'].split()] if r['nn'] else []
    for k in range(NN_SHARDS):
        with open(os.path.join(nn_dir, f'{k}.json'), 'w') as f:
            json.dump(shards.get(k, {}), f, separators=(',', ':'))
    i_nn = ks4_out['cols'].index('nn')
    ks4_out = {'cols': [c for c in ks4_out['cols'] if c != 'nn'], 'codes': ks4_out['codes'],
               'rows': [r[:i_nn] + r[i_nn + 1:] for r in ks4_out['rows']]}
    ks4_out, rc_out = colmajor(ks4_out), colmajor(rc_out)

    for name, obj in (('ks4.json', ks4_out), ('rc.json', rc_out)):
        with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
            json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))

    rc_dates = sorted(r['insp_date'] for r in rc if r.get('insp_date'))
    meta = {
        'built': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'secondaries': len(ks4), 'report_cards': len(rc), 'daily_reports_merged': daily_added,
        'latest_inspection': rc_dates[-1] if rc_dates else None,
        'latest_published': latest_published,
        'sources': {os.path.basename(p): sha(p) for p in (ks4_path, rc_path, daily_path, gias_path) if os.path.exists(p)},
    }
    with open(os.path.join(OUT, 'build.json'), 'w') as f:
        json.dump(meta, f, indent=1)
    for n in ('ks4.json', 'rc.json'):
        print(n, os.path.getsize(os.path.join(OUT, n)))
    print(json.dumps(meta, indent=1))

    # a page and share image per school
    import build_pages
    build_pages.main(ks4, rc)
    import build_attendance   # the Attendance Explorer's data (site/attendance/data)
    build_attendance.main()


if __name__ == '__main__':
    main()
