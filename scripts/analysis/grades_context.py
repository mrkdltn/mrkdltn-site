#!/usr/bin/env python3
"""Report card grades and school context: the pre-registered analysis.

Plan: docs/analysis-plans/grades-context-plan.md (committed before this script was written or run).
Writes docs/analysis-plans/grades-context-results.json (the pre-registered run; the prose results file is
written by hand from it) and data/derived/grades_context.json (aggregates for the areas page).

Inputs (raw downloads kept outside the repository; checksums are recorded, and checked against the
pre-registered run with --strict):
  <data-dir>/mi/mi_latest.csv                 Ofsted MI, latest inspections (31 October 2026 for the pre-registered run)
  <data-dir>/sen/sen_school_level_*.csv       DfE Special educational needs in England, school level (January 2026)
  <data-dir>/gias/edubase_*.csv               GIAS daily extract (urban/rural fallback; optional)
  data/raw/ks4_model_v3.csv                   Explorer secondary file (pa_index, nonmob_pct, ss_diff_25, ss_band_25)
  data/raw/reports_daily.csv                  report cards read from Ofsted's reports since the MI (sensitivity)

  python3 scripts/analysis/grades_context.py --strict            reproduce the pre-registered run (both files)
  python3 scripts/analysis/grades_context.py --weekly --data-dir D
        fetch the latest MI, SEN and GIAS releases into D, record what was used, write only the derived file
        (run weekly by .github/workflows/grades-context.yml)

Never used: ethnicity, trust or sponsor identifiers, inspector identifiers, school names. Local authority is
used only as a clustering unit. Nothing school-level is written out.
"""
import argparse, csv, hashlib, json, math, os, sys, warnings
import numpy as np
import pandas as pd
import patsy
import statsmodels.api as sm
from statsmodels.miscmodels.ordinal_model import OrderedModel

warnings.filterwarnings('ignore')
SEED = 20261125
np.random.seed(SEED)
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'docs', 'analysis-plans', 'grades-context-results.json')
DERIVED = os.path.join(ROOT, 'data', 'derived', 'grades_context.json')
UA = 'Mozilla/5.0 (compatible; open-data-analysis)'
PLAN = {'path': 'docs/analysis-plans/grades-context-plan.md', 'commit': '801f11bcc2652163da1e3e2a0bf018baa1b136ea',
        'committed': '2026-11-25T16:00:29Z', 'results_commit': 'a79cde89e2eaeda4f6c690265ef21b3c59300bcf'}

SHA = {'mi/mi_latest.csv': '791eea96966d6a2de0a50687abd9ea74fd3fa32be6396c8c56ea7bf0f111d53f',
       'sen/sen_school_level_2026.csv': 'a339a409b811099bd200e09ddb3bcd7f9dffb2aa989297f1f27de8e4a749d653'}

AREAS = [('g_inc', 'Inclusion'), ('g_ct', 'Curriculum and teaching'), ('g_ach', 'Achievement'),
         ('g_ab', 'Attendance and behaviour'), ('g_pd', 'Personal development and wellbeing'),
         ('g_lg', 'Leadership and governance'), ('g_ey', 'Early years'), ('g_p16', 'Post-16 provision')]
MI_AREA = {'g_sg': 'Safeguarding standards', 'g_inc': 'Inclusion', 'g_ct': 'Curriculum and teaching', 'g_ach': 'Achievement',
           'g_ab': 'Attendance and behaviour', 'g_pd': 'Personal development and wellbeing',
           'g_ey': 'Early years (where applicable)', 'g_p16': 'Post-16 provision (where applicable)', 'g_lg': 'Leadership and governance'}
SCALE = ['Urgent improvement', 'Needs attention', 'Expected standard', 'Strong standard', 'Exceptional']
BELOW = {'Urgent improvement', 'Needs attention'}
PHASE_AREAS = {'Primary': ['g_inc', 'g_ct', 'g_ach', 'g_ab', 'g_pd', 'g_lg', 'g_ey'],
               'Secondary': ['g_inc', 'g_ct', 'g_ach', 'g_ab', 'g_pd', 'g_lg', 'g_p16']}
ACADEMY = {'Academy Converter', 'Academy Sponsor Led', 'Free School', 'Academy Special Converter', 'Free School Special',
           'Academy Special Sponsor Led', 'Academy Alternative Provision Converter', 'Free School - Alternative Provision',
           'Academy Alternative Provision Sponsor Led', 'University Technical College', 'Studio School', 'City Technology College'}
MAINTAINED = {'Community School', 'Voluntary Aided School', 'Voluntary Controlled School', 'Foundation School',
              'Community Special School', 'LA Nursery School', 'Pupil Referral Unit', 'Foundation Special School'}
MIN_N, MIN_CLASS, EPV, MATERIAL = 100, 40, 10, 5.0

# covariate sets (z_ = standardised within the analysis sample)
IDACI = 'C(idaci, Treatment(1))'
FULL = {'Primary': [IDACI, 'z_ehc', 'z_sensup', 'z_logsize', 'C(region)', 'urban', 'academy'],
        'Secondary': [IDACI, 'z_ehc', 'z_sensup', 'z_logsize', 'C(region)', 'urban', 'academy', 'z_pa', 'z_nonmob', 'z_ss']}
REDUCED = {'Primary': [IDACI, 'z_ehc', 'z_sensup', 'z_logsize'],
           'Secondary': [IDACI, 'z_ehc', 'z_sensup', 'z_logsize', 'z_pa', 'z_ss']}
NPARAM = {('Primary', 'full'): 16, ('Primary', 'reduced'): 7, ('Secondary', 'full'): 19, ('Secondary', 'reduced'): 9}
RAWVARS = {'z_ehc': 'ehc', 'z_sensup': 'sensup', 'z_logsize': 'logsize', 'z_pa': 'pa', 'z_nonmob': 'nonmob', 'z_ss': 'ss'}


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def dmy(v):
    v = (v or '').strip()
    return pd.NaT if v in ('', 'NULL') else pd.to_datetime(v, format='%d/%m/%Y')


def _get(url, path):
    import urllib.request
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=600) as r, open(path, 'wb') as f:
        while True:
            b = r.read(1 << 20)
            if not b:
                break
            f.write(b)


def fetch(data_dir):
    """Download the latest public releases into data_dir and write a meta.json beside each."""
    import datetime as dt, re, urllib.request
    sys.path.insert(0, os.path.join(ROOT, 'scripts'))
    import fetch_mi
    today = dt.date.today().isoformat()
    # Ofsted MI: newest "latest inspections as at" CSV listed on GOV.UK
    os.makedirs(os.path.join(data_dir, 'mi'), exist_ok=True)
    as_at, title, url = fetch_mi.latest_attachment()
    p = os.path.join(data_dir, 'mi', 'mi_latest.csv')
    _get(url, p)
    json.dump({'title': title, 'url': url, 'as_at': as_at, 'fetched': today, 'sha256': sha(p)}, open(os.path.join(data_dir, 'mi', 'meta.json'), 'w'), indent=1)
    # DfE SEN in England: the newest "School level data" set in the Explore education statistics catalogue
    os.makedirs(os.path.join(data_dir, 'sen'), exist_ok=True)
    cat = 'https://explore-education-statistics.service.gov.uk/data-catalogue?publicationSlug=special-educational-needs-in-england&latestOnly=true'
    with urllib.request.urlopen(urllib.request.Request(cat, headers={'User-Agent': UA}), timeout=120) as r:
        html = r.read().decode('utf-8', 'replace')
    best = None
    for m in re.finditer(r'data-set/([0-9a-f-]{36})', html):
        t = re.findall(r'>([^<]{8,140})<', html[m.start():m.start() + 1500])
        if len(t) > 1 and t[1].startswith('School level data'):
            best = (m.group(1), t[1]); break
    if not best:
        sys.exit('SEN school level data set not found in the EES catalogue')
    for old in os.listdir(os.path.join(data_dir, 'sen')):
        if old.startswith('sen_school_level'):
            os.remove(os.path.join(data_dir, 'sen', old))
    p = os.path.join(data_dir, 'sen', 'sen_school_level_latest.csv')
    url = f'https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/{best[0]}/csv'
    _get(url, p)
    json.dump({'title': 'Special educational needs in England: ' + best[1], 'dataset_id': best[0], 'url': url, 'fetched': today, 'sha256': sha(p)},
              open(os.path.join(data_dir, 'sen', 'meta.json'), 'w'), indent=1)
    # GIAS daily extract (optional: only fills urban/rural for a handful of schools)
    os.makedirs(os.path.join(data_dir, 'gias'), exist_ok=True)
    for back in range(4):
        d = (dt.date.today() - dt.timedelta(days=back)).strftime('%Y%m%d')
        url = f'https://ea-edubase-api-prod.azurewebsites.net/edubase/downloads/public/edubasealldata{d}.csv'
        try:
            for old in os.listdir(os.path.join(data_dir, 'gias')):
                os.remove(os.path.join(data_dir, 'gias', old))
            p = os.path.join(data_dir, 'gias', f'edubase_{d}.csv')
            _get(url, p)
            json.dump({'title': f'Get Information about Schools, extract {d}', 'url': url, 'fetched': today, 'sha256': sha(p)},
                      open(os.path.join(data_dir, 'gias', 'meta.json'), 'w'), indent=1)
            break
        except Exception as e:
            print('GIAS', d, 'not available:', e)


def inputs(data_dir, strict):
    """Locate the inputs, describe each, and (with --strict) insist on the pre-registered files."""
    def newest(sub, prefix):
        d = os.path.join(data_dir, sub)
        fs = sorted(f for f in os.listdir(d) if f.startswith(prefix) and f.endswith('.csv')) if os.path.isdir(d) else []
        return os.path.join(d, fs[-1]) if fs else None
    def meta(sub):
        m = os.path.join(data_dir, sub, 'meta.json')
        return json.load(open(m)) if os.path.exists(m) else {}
    mi, sen, gias = os.path.join(data_dir, 'mi', 'mi_latest.csv'), newest('sen', 'sen_school_level'), newest('gias', 'edubase_')
    out = {}
    for key, path, rel in [('mi', mi, 'mi/mi_latest.csv'), ('sen', sen, 'sen/sen_school_level_2026.csv'), ('gias', gias, None)]:
        if path is None:
            if key == 'gias':
                continue
            sys.exit(f'missing input: {key}')
        m = meta(key); h = m.get('sha256') or sha(path)
        pinned = SHA.get(rel)
        if strict and pinned and h != pinned:
            sys.exit(f'checksum mismatch for {rel}: {h}')
        if pinned and h != pinned:
            print(f'note: {key} is a newer release than the pre-registered run ({h[:12]})')
        out[key] = dict(m, path=path, sha256=h, pre_registered=(h == pinned) if pinned else None)
    if 'as_at' not in out['mi']:  # the pre-registered file: its as-at date is recorded in data/raw/ofsted_mi_meta.json
        rm = json.load(open(os.path.join(ROOT, 'data', 'raw', 'ofsted_mi_meta.json')))
        if rm.get('sha256_original') == out['mi']['sha256']:
            out['mi'].update(title=rm['title'], url=rm['url'], as_at=rm['as_at'])
    if 'title' not in out['sen'] and out['sen']['pre_registered']:
        out['sen'].update(title='Special educational needs in England: School level data - 2026 (January 2026 census, published 11 June 2026)',
                          dataset_id='c5490fd8-6cf3-469e-9f60-0b4262134cb5',
                          url='https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/c5490fd8-6cf3-469e-9f60-0b4262134cb5/csv')
    return out


def load(inp):
    mi = pd.read_csv(inp['mi']['path'], dtype=str, encoding='utf-8-sig', keep_default_na=False)
    df = pd.DataFrame({
        'urn': mi['URN'], 'laestab': mi['LAESTAB'], 'phase': mi['Ofsted phase'], 'type': mi['Type of education'],
        'region': mi['Ofsted region'], 'la': mi['Local authority'],
        'idaci': pd.to_numeric(mi['The income deprivation affecting children index (IDACI) quintile'], errors='coerce'),
        'pupils': pd.to_numeric(mi['Total number of pupils'], errors='coerce'),
        'start': mi['Inspection start date'].map(dmy), 'pub': mi['Publication date'].map(dmy),
        'rel': mi['Does the latest full inspection relate to the URN of the current school?'],
        'o_qe': mi['Latest OEIF quality of education']})
    for k, h in MI_AREA.items():
        df[k] = mi[h].where(mi[h].isin(SCALE + ['Met', 'Not met']), '')
    df['inspected'] = (df['g_ach'] != '').astype(int)
    df['academy'] = np.where(df['type'].isin(ACADEMY), 1.0, np.where(df['type'].isin(MAINTAINED), 0.0, np.nan))
    # SEN, January 2026
    sen = {}
    with open(inp['sen']['path']) as f:
        for x in csv.DictReader(f):
            if x['sen_primary_need'] != 'All pupils' or x['specialist_provision_unit_type'] != 'All pupils':
                continue
            d = sen.setdefault(x['school_laestab'], {})
            d[{'All pupils': 'n', 'SEN support': 'sup', 'Education, health and care plans': 'ehc'}[x['sen_provision']]] = float(x['pupil_count'])
            d['ur'] = x['urban_rural']
    s = pd.DataFrame.from_dict(sen, orient='index')
    df = df.join(s, on='laestab')
    ok = df['n'] > 0
    df['ehc'] = np.where(ok, 100 * df['ehc'] / df['n'], np.nan)
    df['sensup'] = np.where(ok, 100 * df['sup'] / df['n'], np.nan)
    # GIAS fallback for urban/rural
    gias = (pd.read_csv(inp['gias']['path'], dtype=str, encoding='cp1252', usecols=['URN', 'UrbanRural (name)'],
                        keep_default_na=False).set_index('URN')['UrbanRural (name)'] if 'gias' in inp else pd.Series(dtype=str))
    ur = df['ur'].fillna('').where(df['ur'].fillna('') != '', df['urn'].map(gias).fillna(''))
    df['urban'] = np.where(ur.str.contains('Urban', case=False), 1.0, np.where(ur.str.contains('rural', case=False), 0.0, np.nan))
    size = df['pupils'].where(df['pupils'] > 0, df['n'])
    df['logsize'] = np.log(size.where(size > 0))
    # secondary file
    k = pd.read_csv(os.path.join(ROOT, 'data', 'raw', 'ks4_model_v3.csv'), dtype=str, keep_default_na=False)
    k = pd.DataFrame({'urn': k['urn'], 'pa': pd.to_numeric(k['pa_index'], errors='coerce'),
                      'nonmob': pd.to_numeric(k['nonmob_pct'], errors='coerce'), 'ss': pd.to_numeric(k['ss_diff_25'], errors='coerce'),
                      'ss_band': k['ss_band_25'], 'pa_imputed': k['pa_imputed'], 'dis_pct': pd.to_numeric(k['dis_pct'], errors='coerce'),
                      'k_idaci': pd.to_numeric(k['idaci_q'], errors='coerce')}).set_index('urn')
    df = df.join(k, on='urn')
    df['oqe'] = df['o_qe'].where(df['o_qe'].isin(['1', '2', '3', '4']), 'none')
    return df


def daily_sample(df):
    """Main sample plus report cards read from Ofsted's reports, 2 to 23 November 2026 (latest per school wins)."""
    d = pd.read_csv(os.path.join(ROOT, 'data', 'raw', 'reports_daily.csv'), dtype=str, keep_default_na=False)
    d = d.sort_values('published').drop_duplicates('urn', keep='last').set_index('urn')
    out = df.copy().set_index('urn')
    common = out.index.intersection(d.index)
    already = int((out.loc[common, 'inspected'] == 1).sum())
    for k in MI_AREA:
        out.loc[common, k] = d.loc[common, k].where(d.loc[common, k].isin(SCALE + ['Met', 'Not met']), '')
    out.loc[common, 'pub'] = pd.to_datetime(d.loc[common, 'published'])
    out.loc[common, 'rel'] = 'Yes'
    out['inspected'] = (out['g_ach'] != '').astype(int)
    return out.reset_index(), already, len(common) - already, len(d) - len(common)


def zscore(s, ref):
    return (s - ref.mean()) / ref.std(ddof=0)


def prep(data, phase, area, terms):
    """Analysis frame for one phase x area: graded rows, complete cases on the terms, z-scored within the sample."""
    d = data[(data['phase'] == phase) & (data[area].isin(SCALE))].copy()
    d['y'] = d[area].isin(BELOW).astype(int)
    need = ['idaci']
    for t in terms:
        if t.startswith('z_'):
            need.append(RAWVARS[t])
        elif t == 'C(region)':
            need.append('region')
        elif t in ('urban', 'academy'):
            need.append(t)
        elif t.startswith('C(ss_band'):
            need.append('ss_band')
    n_before = len(d)
    d = d.dropna(subset=need)
    if 'ss_band' in need:
        d = d[d['ss_band'] != '']
    d['idaci'] = d['idaci'].astype(int)
    for z, raw in RAWVARS.items():
        if raw in d:
            d[z] = zscore(d[raw], d[raw])
    return d, n_before - len(d)


def fit_logit(d, terms, weights=None, cluster=None):
    f = 'y ~ ' + ' + '.join(terms)
    y, X = patsy.dmatrices(f, d, return_type='dataframe')
    kw = {}
    if weights is not None:
        kw['var_weights'] = np.asarray(weights)
    m = sm.GLM(y, X, family=sm.families.Binomial(), **kw)
    if cluster is not None:
        r = m.fit(cov_type='cluster', cov_kwds={'groups': pd.factorize(d[cluster])[0]})
    else:
        r = m.fit(cov_type='HC1')
    return r, X.design_info


def ame_logit(r, design_info, d, var='idaci', hi=5, lo=1, weights=None):
    """AME of setting idaci to hi vs lo (or, for linear idaci, +1), delta-method SE."""
    b, V = np.asarray(r.params), np.asarray(r.cov_params())
    d5, d1 = d.copy(), d.copy()
    d5[var], d1[var] = hi, lo
    X5 = np.asarray(patsy.build_design_matrices([design_info], d5)[0])
    X1 = np.asarray(patsy.build_design_matrices([design_info], d1)[0])
    w = np.ones(len(d)) if weights is None else np.asarray(weights, float)
    w = w / w.sum()
    p5, p1 = 1 / (1 + np.exp(-X5 @ b)), 1 / (1 + np.exp(-X1 @ b))
    est = float(w @ (p5 - p1))
    g = (w * p5 * (1 - p5)) @ X5 - (w * p1 * (1 - p1)) @ X1
    se = float(math.sqrt(g @ V @ g))
    return est, se


def summarise(est, se, n, events, flag=None):
    lo, hi = est - 1.96 * se, est + 1.96 * se
    z = est / se if se > 0 else float('nan')
    p = math.erfc(abs(z) / math.sqrt(2))
    e, l, h = 100 * est, 100 * lo, 100 * hi
    if flag == 'low_epv':
        label = 'low events per variable: not assessed for materiality'
    elif abs(e) >= MATERIAL and (l > 0 or h < 0):
        label = 'material'
    elif l > 0 or h < 0:
        label = 'small but distinguishable from zero'
    elif h >= MATERIAL or l <= -MATERIAL:
        label = 'no clear association (inconclusive)'
    else:
        label = 'no clear association'
    return {'ame_pp': round(e, 1), 'lo': round(l, 1), 'hi': round(h, 1), 'p': p, 'n': int(n), 'events': int(events), 'label': label,
            **({'flag': flag} if flag else {})}


def eligible(d):
    n, ev = len(d), int(d['y'].sum())
    return n >= MIN_N and min(ev, n - ev) >= MIN_CLASS, n, min(ev, n - ev)


def main_model(data, phase, area):
    """Choose M2 or M2r per the events-per-variable rule. Returns (terms, model_name, flag)."""
    d, _ = prep(data, phase, area, FULL[phase])
    ok, n, rare = eligible(d)
    if rare >= EPV * NPARAM[(phase, 'full')]:
        return FULL[phase], 'M2', None
    d, _ = prep(data, phase, area, REDUCED[phase])
    ok, n, rare = eligible(d)
    if rare >= EPV * NPARAM[(phase, 'reduced')]:
        return REDUCED[phase], 'M2r', None
    return REDUCED[phase], 'M2r', 'low_epv'


def run_one(data, phase, area, terms, flag=None, weights_col=None, cluster=None, var='idaci'):
    d, dropped = prep(data, phase, area, terms)
    if weights_col is not None:
        d = d.dropna(subset=[weights_col])
    ok, n, rare = eligible(d)
    if not ok:
        return {'n': int(n), 'events': int(rare), 'label': 'below minimum sample: not fitted'}
    w = d[weights_col] if weights_col else None
    try:
        r, di = fit_logit(d, terms, weights=w, cluster=cluster)
        if var == 'idaci_lin':
            d = d.copy()
            est, se = ame_logit_linear(r, di, d, w)
        else:
            est, se = ame_logit(r, di, d, weights=w)
    except Exception as e:  # separation or singular fit
        return {'n': int(n), 'events': int(rare), 'label': f'fit failed: {type(e).__name__}'}
    out = summarise(est, se, n, d['y'].sum(), flag)
    out['dropped_missing'] = int(dropped)
    return out


def ame_logit_linear(r, di, d, w):
    """Average change in P(below) per IDACI fifth with idaci entered linearly: mean of P(idaci+0.5) - P(idaci-0.5)."""
    b, V = np.asarray(r.params), np.asarray(r.cov_params())
    a, c = d.copy(), d.copy()
    a['idaci'] = a['idaci'] + 0.5
    c['idaci'] = c['idaci'] - 0.5
    Xa = np.asarray(patsy.build_design_matrices([di], a)[0]); Xc = np.asarray(patsy.build_design_matrices([di], c)[0])
    ww = np.ones(len(d)) if w is None else np.asarray(w, float)
    ww = ww / ww.sum()
    pa, pc = 1 / (1 + np.exp(-Xa @ b)), 1 / (1 + np.exp(-Xc @ b))
    g = (ww * pa * (1 - pa)) @ Xa - (ww * pc * (1 - pc)) @ Xc
    return float(ww @ (pa - pc)), float(math.sqrt(g @ V @ g))


def run_ordinal(data, phase, area, terms):
    d, _ = prep(data, phase, area, terms)
    ok, n, rare = eligible(d)
    if not ok:
        return {'n': int(n), 'label': 'below minimum sample: not fitted'}
    d['ord'] = pd.Categorical(d[area], categories=SCALE, ordered=True)
    present = [c for c in SCALE if (d['ord'] == c).any()]
    d['ord'] = pd.Categorical(d[area], categories=present, ordered=True)
    nbelow = sum(c in BELOW for c in present)
    X = patsy.dmatrix(' + '.join(terms), d, return_type='dataframe')
    di = X.design_info
    X = X.drop(columns='Intercept')
    m = OrderedModel(d['ord'], X, distr='logit')
    try:
        r = m.fit(method='bfgs', disp=0, maxiter=2000, cov_type='HC1')
        robust = 'HC1'
    except Exception:
        r = m.fit(method='bfgs', disp=0, maxiter=2000)
        robust = 'model-based'
    b, V = np.asarray(r.params), np.asarray(r.cov_params())

    def ame(bb):
        d5, d1 = d.copy(), d.copy()
        d5['idaci'], d1['idaci'] = 5, 1
        X5 = np.asarray(patsy.build_design_matrices([di], d5)[0])[:, 1:]
        X1 = np.asarray(patsy.build_design_matrices([di], d1)[0])[:, 1:]
        P5, P1 = m.predict(bb, exog=X5), m.predict(bb, exog=X1)
        return float(np.mean(P5[:, :nbelow].sum(1) - P1[:, :nbelow].sum(1)))
    est = ame(b)
    eps = 1e-5
    g = np.array([(ame(b + eps * np.eye(len(b))[i]) - ame(b - eps * np.eye(len(b))[i])) / (2 * eps) for i in range(len(b))])
    se = float(math.sqrt(g @ V @ g))
    out = summarise(est, se, n, d['y'].sum())
    out['se_type'] = robust
    return out


def wilson(k, n):
    if n == 0:
        return None, None
    z, p = 1.96, k / n
    den = 1 + z * z / n
    c = (p + z * z / (2 * n)) / den
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den
    return round(100 * (c - h), 1), round(100 * (c + h), 1)


def descriptive(data, phase, areas):
    """Share below Expected by IDACI fifth (and pooled 1-2 vs 4-5). Cells under 10 schools suppressed."""
    out = {}
    for a in areas:
        d = data[(data['phase'] == phase) & (data[a].isin(SCALE))].dropna(subset=['idaci'])
        if len(d) < 10:
            continue
        row = {'n': int(len(d)), 'share_below': round(100 * d[a].isin(BELOW).mean(), 1)}
        cells = {}
        for name, qs in [('1', [1]), ('2', [2]), ('3', [3]), ('4', [4]), ('5', [5]), ('1-2', [1, 2]), ('4-5', [4, 5])]:
            s = d[d['idaci'].isin(qs)]
            if len(s) < 10:
                cells[name] = {'n': 'fewer than 10'}
                continue
            k = int(s[a].isin(BELOW).sum())
            lo, hi = wilson(k, len(s))
            cells[name] = {'n': int(len(s)), 'share_below': round(100 * k / len(s), 1), 'lo': lo, 'hi': hi}
        row['by_idaci'] = cells
        out[a] = row
    return out


def smd(a, b):
    a, b = a.dropna(), b.dropna()
    s = math.sqrt((a.var() + b.var()) / 2) if len(a) > 1 and len(b) > 1 else float('nan')
    return round(float((a.mean() - b.mean()) / s), 3) if s and s > 0 else None


def representativeness(data, phase):
    p = data[data['phase'] == phase]
    ins, rest = p[p['inspected'] == 1], p[p['inspected'] == 0]
    out = {'n_all': int(len(p)), 'n_inspected': int(len(ins)), 'share_inspected': round(100 * len(ins) / len(p), 1), 'vars': {}}
    cont = ['ehc', 'sensup', 'pupils', 'urban', 'academy'] + (['pa', 'nonmob', 'ss', 'dis_pct'] if phase == 'Secondary' else [])
    for v in cont:
        out['vars'][v] = {'mean_all': round(float(p[v].mean()), 2), 'mean_inspected': round(float(ins[v].mean()), 2),
                          'smd_inspected_vs_not': smd(ins[v], rest[v]), 'missing_all': int(p[v].isna().sum())}
    def cat(col, vals):
        o = {}
        for v in vals:
            k = int((ins[col] == v).sum())
            o[str(v)] = {'all': round(100 * float((p[col] == v).mean()), 1),
                         'inspected': round(100 * k / len(ins), 1) if k >= 10 else 'fewer than 10 schools'}
        return o
    out['idaci_share'] = cat('idaci', [1, 2, 3, 4, 5])
    out['region_share'] = cat('region', sorted(p['region'].unique()))
    out['oqe_share'] = cat('oqe', ['1', '2', '3', '4', 'none'])
    return out


def ipw(data, phase, extra=()):
    """Stabilised, trimmed inverse-probability-of-inspection weights from a logit on context (+ extra terms)."""
    terms = [t for t in FULL[phase] if t != 'z_ss'] + list(extra)
    p = data[data['phase'] == phase].copy()
    need = ['idaci', 'region', 'urban', 'academy'] + [RAWVARS[t] for t in terms if t.startswith('z_')]
    p = p.dropna(subset=need)
    p['idaci'] = p['idaci'].astype(int)
    for z, raw in RAWVARS.items():
        p[z] = zscore(p[raw], p[raw])
    y, X = patsy.dmatrices('inspected ~ ' + ' + '.join(terms), p, return_type='dataframe')
    r = sm.GLM(y, X, family=sm.families.Binomial()).fit()
    ph = r.predict(X)
    w = p['inspected'].mean() / ph
    wi = w[p['inspected'] == 1]
    lo, hi = np.percentile(wi, [1, 99])
    w = w.clip(lo, hi)
    s = pd.Series(np.nan, index=data.index)
    s.loc[p.index[p['inspected'] == 1]] = w[p['inspected'] == 1].values
    auc = auc_score(np.asarray(p['inspected']), np.asarray(ph))
    return s, {'terms': terms, 'n': int(len(p)), 'auc': round(auc, 3), 'w_min': round(float(lo), 3), 'w_max': round(float(hi), 3)}


def auc_score(y, s):
    order = np.argsort(s)
    ranks = np.empty(len(s)); ranks[order] = np.arange(1, len(s) + 1)
    n1 = y.sum(); n0 = len(y) - n1
    return float((ranks[y == 1].sum() - n1 * (n1 + 1) / 2) / (n1 * n0))


def holm(ps):
    idx = sorted(range(len(ps)), key=lambda i: ps[i])
    adj = [0.0] * len(ps); run = 0.0
    for r, i in enumerate(idx):
        run = max(run, min(1.0, (len(ps) - r) * ps[i]))
        adj[i] = run
    return adj


TERM_NAMES = {'C(idaci, Treatment(1))': 'IDACI fifth', 'z_ehc': 'EHC plan share', 'z_sensup': 'SEN support share', 'z_logsize': 'school size',
              'C(region)': 'Ofsted region', 'urban': 'urban or rural', 'academy': 'academy or LA-maintained', 'z_pa': 'prior attainment',
              'z_nonmob': 'pupil stability', 'z_ss': '2024/25 results against similar schools', 'C(oqe)': 'previous OEIF quality of education grade'}


def derive(res, inp, daily_to):
    """Aggregates for the areas page: no school-level values; every group shown has at least 10 schools."""
    names = dict(AREAS)
    ci = lambda v: [v['ame_pp'], v['lo'], v['hi']] if v and 'ame_pp' in v else None

    def reading(c):
        lab = c.get('label', '')
        if lab == 'material':
            return 'clear' if c.get('robust_to_multiple_comparisons') else 'clear_single'
        if lab.startswith('low events'):
            return 'low_events'
        if lab.startswith('small'):
            return 'small'
        if lab.startswith('no clear'):
            return 'inconclusive' if 'inconclusive' in lab else 'none'
        return 'not_fitted'
    held, shift, settling = {}, {}, {}
    for ph, areas in res['main'].items():
        rows, mx = [], 0.0
        for ar, row in areas.items():
            c, s = row['controlled'], res['sensitivity'][ph][ar]
            ipw = {k: ci(v) for k, v in s.items() if k.startswith('ipw')}
            for v in ipw.values():
                if v and c.get('ame_pp') is not None and reading(c) != 'low_events':
                    mx = max(mx, abs(v[0] - c['ame_pp']))
            rows.append({'area': ar, 'name': names[ar], 'n': c.get('n'), 'below': c.get('events'), 'model': row['model'],
                         'raw': ci(row['raw']), 'n_raw': row['raw'].get('n'), 'results_only': ci(row.get('results_only')), 'controlled': ci(c),
                         'reading': reading(c), 'p_holm': c.get('p_holm'), 'ordinal': ci(s.get('ordinal')), 'weighted': ipw})
        held[ph] = rows
        shift[ph] = round(mx, 1)
        settling[ph] = {ar: [{'to': p['to'], 'e': p['ame_pp'], 'lo': p['lo'], 'hi': p['hi'], 'n': p['n']} if 'ame_pp' in p else {'to': p['to'], 'e': None}
                             for p in pts if 'daily' not in p['to']] for ar, pts in res['trend'][ph].items()}
    insp = {}
    for ph in ['Primary', 'Secondary']:
        r = res['representativeness'][ph]
        def cat(block, key):
            v = r[block][key]
            return [v['all'], v['inspected'] if not isinstance(v['inspected'], str) else None]
        rows = [['idaci5', 'Most deprived IDACI fifth', *cat('idaci_share', '5'), '%'],
                ['idaci1', 'Least deprived IDACI fifth', *cat('idaci_share', '1'), '%'],
                ['ehc', 'Pupils with an EHC plan (average share)', r['vars']['ehc']['mean_all'], r['vars']['ehc']['mean_inspected'], '%'],
                ['sensup', 'Pupils on SEN support (average share)', r['vars']['sensup']['mean_all'], r['vars']['sensup']['mean_inspected'], '%'],
                ['academy', 'Academies', round(100 * r['vars']['academy']['mean_all'], 1), round(100 * r['vars']['academy']['mean_inspected'], 1), '%'],
                ['urban', 'Urban schools', round(100 * r['vars']['urban']['mean_all'], 1), round(100 * r['vars']['urban']['mean_inspected'], 1), '%'],
                ['oqe3', 'Last OEIF quality of education: Requires improvement', *cat('oqe_share', '3'), '%'],
                ['oqe1', 'Last OEIF quality of education: Outstanding', *cat('oqe_share', '1'), '%'],
                ['pupils', 'Pupils (average)', round(r['vars']['pupils']['mean_all']), round(r['vars']['pupils']['mean_inspected']), 'pupils']]
        insp[ph] = {'all': r['n_all'], 'inspected': r['n_inspected'], 'rows': [dict(zip(['key', 'label', 'all', 'inspected', 'unit'], x)) for x in rows]}
    weights = {ph: {k: {'includes': [TERM_NAMES.get(t, t) for t in v['terms']], 'auc': v['auc'], 'range': [v['w_min'], v['w_max']], 'n': v['n']}
                    for k, v in m.items()} for ph, m in res['ipw_models'].items()}
    top = {ph: {ar: {'raw': ci(v['raw']), 'controlled': ci(v['controlled'])} for ar, v in res['exploratory_strong_or_above'][ph].items()}
           for ph in ['Primary', 'Secondary']}
    def src(k):
        m = inp.get(k)
        return None if not m else {kk: m.get(kk) for kk in ('title', 'url', 'as_at', 'dataset_id', 'fetched', 'sha256', 'pre_registered') if m.get(kk) is not None}
    return {
        'schema': 1,
        'as_at': inp['mi']['as_at'],
        'report_cards': sum(v['inspected'] for v in res['counts'].values()),
        'daily': {'to': daily_to, **res['daily_sample']},
        'counts': res['counts'],
        'plan': PLAN, 'family_size': sum(1 for ph in res['main'].values() for c in ph.values() if 'p_holm' in c['controlled']),
        'threshold_pp': MATERIAL, 'min_events_per_parameter': EPV,
        'sources': {'mi': src('mi'), 'sen': src('sen'), 'gias': src('gias'),
                    'ks4': 'DfE key stage 4 performance 2024/25 (final) and 2025/26 (provisional, 28 October 2026), via the Explorer; open replica of the DfE and Ofsted similar-schools model',
                    'daily': f"Report cards read from Ofsted's published reports, to {daily_to}"},
        'held': held, 'weight_shift_max': shift, 'inspected': insp, 'weights': weights, 'settling': settling,
        'exploratory': {'strong_or_above': top},
        'safeguarding': {k: v for k, v in res['safeguarding'].items() if k != 'note'},
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data-dir', default='/home/user/mrkdltn-data/grades-context')
    ap.add_argument('--strict', action='store_true', help='insist on the pre-registered input files')
    ap.add_argument('--weekly', action='store_true', help='fetch the latest releases; write only the derived file')
    a = ap.parse_args()
    if a.weekly:
        fetch(a.data_dir)
    inp = inputs(a.data_dir, a.strict)
    df = load(inp)
    as_at = pd.Timestamp(inp['mi']['as_at'])
    daily_to = pd.read_csv(os.path.join(ROOT, 'data', 'raw', 'reports_daily.csv'), dtype=str)['published'].max()
    # sanity: IDACI direction (5 = most deprived) against disadvantaged share in the secondary file
    chk = df.dropna(subset=['dis_pct', 'idaci']).groupby('idaci')['dis_pct'].mean()
    assert chk.is_monotonic_increasing, chk
    res = {'meta': {
        'plan': 'docs/analysis-plans/grades-context-plan.md', 'seed': SEED,
        'sources': {
            'ofsted_mi': 'Ofsted, Management information: state-funded schools, latest inspections as at 31 October 2026 (sha256 ' + SHA['mi/mi_latest.csv'] + ')',
            'sen': 'DfE, Special educational needs in England, school level data, January 2026 census, published 11 June 2026 (sha256 ' + SHA['sen/sen_school_level_2026.csv'] + ')',
            'gias': 'DfE, Get Information about Schools, daily extract 25 November 2026 (urban/rural fallback)',
            'ks4': 'Explorer data/raw/ks4_model_v3.csv: DfE KS4 performance 2024/25 final and 2025/26 provisional (28 October 2026); open replica of the similar-schools model',
            'daily': 'Report cards read from Ofsted reports published 2 to 23 November 2026 (data/raw/reports_daily.csv), sensitivity only'},
        'outcome': 'Area graded Needs attention or Urgent improvement (below Expected standard)',
        'estimate': 'Average marginal effect, IDACI fifth 5 (most deprived) vs 1 (least), percentage points, 95% CI, HC1 robust SEs, delta method',
        'materiality': 'abs(AME) >= 5 pp and 95% CI excludes zero'}}

    # counts and safeguarding (descriptive)
    res['counts'] = {ph: {'open': int((df['phase'] == ph).sum()), 'inspected': int(((df['phase'] == ph) & (df['inspected'] == 1)).sum())}
                     for ph in ['Primary', 'Secondary', 'Special', 'Alternative provision', 'Nursery']}
    sg = df[df['g_sg'].isin(['Met', 'Not met'])]
    res['safeguarding'] = {'met': int((sg['g_sg'] == 'Met').sum()), 'not_met': int((sg['g_sg'] == 'Not met').sum()),
                           'note': 'Descriptive only; not broken down by phase or context because counts are under 10.'}

    # main family
    main, fam = {}, []
    for ph, areas in PHASE_AREAS.items():
        main[ph] = {}
        for ar in areas:
            terms, mname, flag = main_model(df, ph, ar)
            row = {'model': mname}
            row['raw'] = run_one(df, ph, ar, [IDACI])
            if ph == 'Secondary':
                row['results_only'] = run_one(df, ph, ar, [IDACI, 'z_ss'])
                # raw on the same sample as the controlled model, so the change is not a sample artefact
                row['raw_same_sample'] = run_one(df[df['ss'].notna()], ph, ar, [IDACI])
            row['controlled'] = run_one(df, ph, ar, terms, flag=flag)
            if mname == 'M2r':
                row['full_M2_sensitivity'] = run_one(df, ph, ar, FULL[ph], flag='low_epv')
            main[ph][ar] = row
            if 'p' in row['controlled']:
                fam.append((ph, ar, row['controlled']['p']))
    adj = holm([p for _, _, p in fam])
    for (ph, ar, _), q in zip(fam, adj):
        main[ph][ar]['controlled']['p_holm'] = round(q, 4)
        main[ph][ar]['controlled']['robust_to_multiple_comparisons'] = bool(q < 0.05)
        main[ph][ar]['controlled']['p'] = round(main[ph][ar]['controlled']['p'], 4)
    for ph in main:
        for ar in main[ph]:
            for k, v in main[ph][ar].items():
                if isinstance(v, dict) and 'p' in v and not isinstance(v['p'], str):
                    v['p'] = round(v['p'], 4)
    res['main'] = main

    # descriptive by IDACI fifth, every phase
    res['descriptive'] = {ph: descriptive(df, ph, [k for k, _ in AREAS]) for ph in ['Primary', 'Secondary', 'Special', 'Alternative provision', 'Nursery']}

    # representativeness and IPW
    res['representativeness'] = {ph: representativeness(df, ph) for ph in ['Primary', 'Secondary', 'Special', 'Alternative provision', 'Nursery']}
    sens = {}
    wdefs = {'Primary': {'ipw_context': ()}, 'Secondary': {'ipw_context': (), 'ipw_context_results': ('z_ss',)}}
    for ph in PHASE_AREAS:
        for wname, extra in list(wdefs[ph].items()) + [('ipw_prior_grade', ('C(oqe)',))]:
            w, info = ipw(df, ph, extra)
            col = f'w_{ph}_{wname}'
            df[col] = w
            res.setdefault('ipw_models', {}).setdefault(ph, {})[wname] = info
            for ar in PHASE_AREAS[ph]:
                terms, mname, flag = main_model(df, ph, ar)
                sens.setdefault(ph, {}).setdefault(ar, {})[wname] = run_one(df, ph, ar, terms, flag=flag, weights_col=col)

    # other pre-registered sensitivities
    dd, n_replaced, n_new, n_unmatched = daily_sample(df.drop(columns=[c for c in df.columns if c.startswith('w_')]))
    res['daily_sample'] = {'reports_read': n_replaced + n_new + n_unmatched, 'replaced_a_report_card_in_mi': n_replaced,
                           'first_report_card': n_new, 'not_in_mi': n_unmatched}
    for ph in PHASE_AREAS:
        for ar in PHASE_AREAS[ph]:
            terms, mname, flag = main_model(df, ph, ar)
            s = sens[ph][ar]
            s['ordinal'] = run_ordinal(df, ph, ar, terms)
            s['cluster_la'] = run_one(df, ph, ar, terms, flag=flag, cluster='la')
            s['exclude_predecessor'] = run_one(df[df['rel'] != 'No'], ph, ar, terms, flag=flag)
            s['with_daily_reports'] = run_one(dd, ph, ar, terms, flag=flag)
            s['idaci_linear_per_fifth'] = run_one(df, ph, ar, ['idaci' if t == IDACI else t for t in terms], flag=flag, var='idaci_lin')
            if ph == 'Secondary':
                s['ss_band'] = run_one(df, ph, ar, [t if t != 'z_ss' else 'C(ss_band, Treatment("Close to"))' for t in terms], flag=flag)
                s['exclude_pa_imputed'] = run_one(df[df['pa_imputed'] != 'yes'], ph, ar, terms, flag=flag)
    res['sensitivity'] = sens

    # trend: by month-end publication date, plus 23 November with daily reports
    trend = {}
    ends = pd.date_range('2026-01-31', as_at + pd.offsets.MonthEnd(0), freq='ME')
    ends = [e for e in ends if e <= as_at]
    for ph in PHASE_AREAS:
        for ar in PHASE_AREAS[ph]:
            terms, mname, flag = main_model(df, ph, ar)
            pts = []
            for e in ends:
                sub = df[(df['inspected'] == 0) | (df['pub'] <= e)]
                sub = sub.assign(**{k: sub[k].where((sub['pub'] <= e), '') for k in MI_AREA})
                d, _ = prep(sub, ph, ar, terms)
                ok, n, rare = eligible(d)
                epv_ok = rare >= EPV * NPARAM[(ph, 'full' if mname == 'M2' else 'reduced')]
                if not ok or not epv_ok:
                    pts.append({'to': e.date().isoformat(), 'n': int(n), 'label': 'below minimum sample or events: not reported'})
                    continue
                r = run_one(sub, ph, ar, terms)
                r['to'] = e.date().isoformat()
                pts.append(r)
            r = run_one(dd, ph, ar, terms, flag=flag)
            r['to'] = f'{daily_to} (with daily-read reports)'
            pts.append(r)
            trend.setdefault(ph, {})[ar] = pts
    res['trend'] = trend

    # exploratory: other context variables in the controlled model (AME of +1 SD), achievement and the area most tied to each
    expl = {}
    for ph in PHASE_AREAS:
        for ar in PHASE_AREAS[ph]:
            terms, mname, flag = main_model(df, ph, ar)
            d, _ = prep(df, ph, ar, terms)
            if not eligible(d)[0]:
                continue
            r, di = fit_logit(d, terms)
            row = {}
            for z in [t for t in terms if t.startswith('z_')]:
                b, V = np.asarray(r.params), np.asarray(r.cov_params())
                hi_, lo_ = d.copy(), d.copy()
                hi_[z] = hi_[z] + 0.5; lo_[z] = lo_[z] - 0.5
                Xh = np.asarray(patsy.build_design_matrices([di], hi_)[0]); Xl = np.asarray(patsy.build_design_matrices([di], lo_)[0])
                ph_, pl_ = 1 / (1 + np.exp(-Xh @ b)), 1 / (1 + np.exp(-Xl @ b))
                g = (ph_ * (1 - ph_)) @ Xh / len(d) - (pl_ * (1 - pl_)) @ Xl / len(d)
                est, se = float(np.mean(ph_ - pl_)), float(math.sqrt(g @ V @ g))
                row[z] = {'ame_pp_per_sd': round(100 * est, 1), 'lo': round(100 * (est - 1.96 * se), 1), 'hi': round(100 * (est + 1.96 * se), 1)}
            expl.setdefault(ph, {})[ar] = row
    res['exploratory_other_context_per_sd'] = expl

    # exploratory: top of the scale (Strong standard or Exceptional), to read the ordinal results
    top = {}
    for ph in PHASE_AREAS:
        for ar in PHASE_AREAS[ph]:
            terms, mname, flag = main_model(df, ph, ar)
            t = df.copy()
            t[ar] = t[ar].map(lambda g: '' if g not in SCALE else ('Needs attention' if g in ('Strong standard', 'Exceptional') else 'Expected standard'))
            top.setdefault(ph, {})[ar] = {'raw': run_one(t, ph, ar, [IDACI]), 'controlled': run_one(t, ph, ar, terms, flag=flag)}
    res['exploratory_strong_or_above'] = {'note': 'AME (IDACI 5 vs 1) on the probability of Strong standard or Exceptional', **top}

    # exploratory: which secondary controls carry the change from raw to controlled
    dec = {}
    for ar in PHASE_AREAS['Secondary']:
        dec[ar] = {name: run_one(df, 'Secondary', ar, tt) for name, tt in [
            ('idaci_plus_pa', [IDACI, 'z_pa']), ('idaci_plus_ss', [IDACI, 'z_ss']), ('idaci_plus_pa_ss', [IDACI, 'z_pa', 'z_ss']),
            ('idaci_plus_sen_size', [IDACI, 'z_ehc', 'z_sensup', 'z_logsize'])]}
    res['exploratory_secondary_decomposition'] = dec

    if not a.weekly:
        with open(OUT, 'w') as f:
            json.dump(res, f, indent=1, default=lambda o: None if (isinstance(o, float) and math.isnan(o)) else str(o))
        print('wrote', OUT)
    os.makedirs(os.path.dirname(DERIVED), exist_ok=True)
    with open(DERIVED, 'w') as f:
        json.dump(derive(res, inp, daily_to), f, indent=1, ensure_ascii=False)
        f.write('\n')
    print('wrote', DERIVED)


if __name__ == '__main__':
    main()
