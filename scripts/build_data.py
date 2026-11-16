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
import csv, hashlib, json, os, sys, datetime

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


def main():
    os.makedirs(OUT, exist_ok=True)
    ks4_path, rc_path = os.path.join(RAW, 'ks4_model_v3.csv'), os.path.join(RAW, 'ofsted_rc.csv')
    daily_path = os.path.join(RAW, 'reports_daily.csv')
    ks4, rc = load(ks4_path), load(rc_path)

    # report cards: MI is the record; daily reads add schools or newer inspections only
    daily_added = 0
    if os.path.exists(daily_path):
        by = {r['urn']: r for r in rc}
        for d in load(daily_path):
            cur = by.get(d['urn'])
            if cur is None or (d.get('insp_date') or '') > (cur.get('insp_date') or ''):
                base = cur if cur is not None else {c: '' for c in rc[0].keys()}
                merged = dict(base, **{k: v for k, v in d.items() if v != '' and k in rc[0]})
                by[d['urn']] = merged
                daily_added += 1
        rc = list(by.values())
        # carry newer grades onto the KS4 rows too
        k_by = {r['urn']: r for r in ks4}
        for r in rc:
            k = k_by.get(r['urn'])
            if k and (r.get('insp_date') or '') > (k.get('insp_date') or ''):
                for c in GRADE_COLS + ['insp_date']:
                    if c in k and c in r:
                        k[c] = r[c]

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
    rcols = ['urn', 'name', 'phase', 'region', 'la', 'mat', 'idaci_q', 'pupils', 'insp_date'] + \
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
        'sources': {os.path.basename(p): sha(p) for p in (ks4_path, rc_path, daily_path) if os.path.exists(p)},
    }
    with open(os.path.join(OUT, 'build.json'), 'w') as f:
        json.dump(meta, f, indent=1)
    for n in ('ks4.json', 'rc.json'):
        print(n, os.path.getsize(os.path.join(OUT, n)))
    print(json.dumps(meta, indent=1))


if __name__ == '__main__':
    main()
