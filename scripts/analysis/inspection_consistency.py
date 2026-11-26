#!/usr/bin/env python3
"""How consistent is inspection? The pre-registered analysis.

Plan: docs/analysis-plans/inspection-consistency-plan.md (commit 196d50c, with Amendment 1 at 9ca9c0b: region x
school term sensitivity run, and the headline reading stated only against the permutation benchmark; approved by Mark on 26 November 2026,
before any inspector code had been fitted or any grade looked at by inspector). This script implements that plan
and nothing else; anything added later must be labelled exploratory in the results.

Writes ONLY national aggregate figures:
  docs/analysis-plans/inspection-consistency-results.json
  docs/analysis-plans/inspection-consistency-results.md
Both are checked before writing: no inspector code, no URN, no inspector-level number and no cell of fewer than
10 schools. If any check fails nothing is written. Inspector random effects are never sampled into the trace
(PyMC keeps only the fixed effects and the inspector SD), never written and never printed.

Inputs for the real run (all outside git except data/raw):
  <corpus>/restricted/lead_inspector.csv  urn, code (keyed hash, 12 hex), role_detected     RESTRICTED: never printed
  <corpus>/parsed/index.csv               urn, insp_date, status ('parsed' = a report card), ...
  <corpus>/manifest.jsonl                 urn, phase, insp_date, fetched, ...  (the backfill's record of what was read)
  data/raw/ofsted_mi_latest.csv           MI grades (g_*), f_start
  data/raw/reports_daily.csv              report cards read since the MI (grades, insp_date); MI wins for the same inspection
  <context>/mi/mi_latest.csv, sen/, gias/ school context via scripts/analysis/grades_context.py (load, inputs)
  data/raw/ks4_model_v3.csv               secondary prior attainment, stability, 2024/25 results gap (via grades_context.load)
  <corpus> defaults to ../mrkdltn-data/report-language, <context> to ../mrkdltn-data/grades-context.

Real run (refuses unless the corpus is complete; see guard_corpus):
  python3 scripts/analysis/inspection_consistency.py --cutoff 2026-12-15            coverage check only, no codes read
  python3 scripts/analysis/inspection_consistency.py --cutoff 2026-12-15 --confirm-complete
Synthetic smoke run (writes to --out, never to docs/):
  python3 scripts/analysis/inspection_consistency.py --synthetic 0.5 --out /tmp/x --perms 20 --draws 500
Tests: python3 scripts/analysis/test_inspection_consistency.py

Expected runtime of the real run on about 4,000 report cards (4 cores): see the measured figures in the docstring
of main() and in the results file, which records the wall time of each step.

Package versions: scripts/analysis/requirements-inspection-consistency.txt.
"""
import argparse, csv, datetime as dt, json, math, os, re, sys, time, warnings

import numpy as np
import pandas as pd
import patsy
from scipy import optimize, sparse, special, stats

warnings.filterwarnings('ignore')
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)

SEED = 20261126
PLAN = {'path': 'docs/analysis-plans/inspection-consistency-plan.md', 'commit': '196d50c', 'amendment_1': '9ca9c0b',
        'approved': '26 November 2026, by Mark in the live conversation'}
OUT_DIR = os.path.join(ROOT, 'docs', 'analysis-plans')
OUT_BASE = 'inspection-consistency-results'
CORPUS = os.path.normpath(os.path.join(ROOT, '..', 'mrkdltn-data', 'report-language'))
CONTEXT = os.path.normpath(os.path.join(ROOT, '..', 'mrkdltn-data', 'grades-context'))
RAW = os.path.join(ROOT, 'data', 'raw')
RENEWED = '2025-11-10'
COVERAGE_MIN = 0.95

SCALE = ['Urgent improvement', 'Needs attention', 'Expected standard', 'Strong standard', 'Exceptional']
BELOW = {'Urgent improvement', 'Needs attention'}
MAIN_AREAS = [('g_ach', 'Achievement'), ('g_ct', 'Curriculum and teaching'), ('g_ab', 'Attendance and behaviour'),
              ('g_lg', 'Leadership and governance')]
OTHER_AREAS = [('g_inc', 'Inclusion'), ('g_pd', 'Personal development and wellbeing'), ('g_ey', 'Early years'),
               ('g_p16', 'Post-16 provision')]
GRADE_COLS = [a for a, _ in MAIN_AREAS + OTHER_AREAS]
MAIN_PHASES = ('Primary', 'Secondary')
DESCRIBED_PHASES = ('Special', 'Alternative provision', 'Nursery')

MIN_CELL = 10          # no cell of fewer than 10 schools is written
EPV = 10               # events rule: at least 10 schools below Expected per fixed-effect parameter
MIN_REPORTS = 5        # main model: codes with fewer report cards pooled into one "few reports" group
SENS_MIN_REPORTS = (10, 1)  # sensitivity: at least 10, and all codes (1 = no pooling)
PERMS = 200
GH_NODES = 30
DRAWS, TUNE, CHAINS, TARGET_ACCEPT = 1000, 1000, 4, 0.9
RHAT_MAX, ESS_MIN = 1.01, 400
Q75 = stats.norm.ppf(0.75)   # 0.6745

# context terms (z_ = standardised within the model's sample; sec_ = secondary-only control, zero for primaries)
SHARED = ['C(idaci, Treatment(1))', 'z_ehc', 'z_sensup', 'z_logsize', 'urban', 'academy']
SEC_ONLY = ['z_pa', 'z_nonmob', 'z_ss']        # prior attainment, pupil stability, 2024/25 results gap
RAWVARS = {'z_ehc': 'ehc', 'z_sensup': 'sensup', 'z_logsize': 'logsize', 'z_pa': 'pa', 'z_nonmob': 'nonmob', 'z_ss': 'ss'}
MODELS = {
    # name: (phases, timing terms, inspector threshold, description)
    'main': (MAIN_PHASES, 'region+month', MIN_REPORTS, 'Primaries and secondaries pooled; codes with fewer than 5 report cards pooled'),
    'min10': (MAIN_PHASES, 'region+month', 10, 'As main; codes with fewer than 10 report cards pooled'),
    'all_codes': (MAIN_PHASES, 'region+month', 1, 'As main; every code its own inspector, no pooling'),
    # Amendment 1 (26 Nov 2026): region x school term, not region x month, so the run can meet the events rule
    'region_x_term': (MAIN_PHASES, 'region*term', MIN_REPORTS, 'As main, with region x school term terms in place of region and month'),
    'secondary_full': (('Secondary',), 'region+month', MIN_REPORTS, 'Secondaries only, with the full results controls'),
}


# ---------------------------------------------------------------------------------------------------------------
# corpus completeness: the cut-off guard
# ---------------------------------------------------------------------------------------------------------------

def targets(raw=RAW):
    """The backfill's target list, reproduced from scripts/language/backfill.py targets() on origin/report-language
    (aeb06d0): latest MI full inspection on or after 10 November 2025 relating to the current URN, overridden by a
    report card read daily when its inspection is the same or newer. Returns {urn: insp_date}."""
    out = {}
    with open(os.path.join(raw, 'ofsted_mi_latest.csv'), encoding='utf-8') as f:
        mi = list(csv.DictReader(f))
    with open(os.path.join(raw, 'reports_daily.csv'), encoding='utf-8') as f:
        daily = list(csv.DictReader(f))
    for r in mi:
        if r['f_start'] >= RENEWED and r['f_rel'] != 'No':
            out[r['urn']] = {'insp_date': r['f_start'], 'phase': r['phase']}
    for r in daily:
        if r.get('insp_date', '') >= RENEWED and r['insp_date'] >= out.get(r['urn'], {}).get('insp_date', ''):
            out[r['urn']] = {'insp_date': r['insp_date'], 'phase': r['phase']}
    return out


def read_manifest(path, cutoff):
    """Manifest records fetched on or before the cut-off date (last record per URN)."""
    man = {}
    with open(path) as f:
        for line in f:
            if line.strip():
                r = json.loads(line)
                if r.get('fetched', '')[:10] <= cutoff:
                    man[r['urn']] = r
    return man


def coverage(tg, man):
    hit = sum(1 for u, t in tg.items() if u in man and man[u].get('insp_date') == t['insp_date'])
    return {'target_schools': len(tg), 'in_corpus_schools': hit, 'share': hit / len(tg) if tg else 0.0}


def guard_corpus(cutoff, confirm, corpus=CORPUS, raw=RAW, today=None):
    """Refuse unless a cut-off is given, it is not in the future, the manifest (as fetched by the cut-off) covers at
    least 95% of the target list, and --confirm-complete was passed. Reads no inspector codes."""
    today = today or dt.date.today().isoformat()
    if not cutoff or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', cutoff):
        raise SystemExit('refused: --cutoff YYYY-MM-DD is required for the real run')
    if cutoff > today:
        raise SystemExit(f'refused: the cut-off {cutoff} is in the future')
    cov = coverage(targets(raw), read_manifest(os.path.join(corpus, 'manifest.jsonl'), cutoff))
    msg = f"corpus coverage at {cutoff}: {cov['in_corpus_schools']} of {cov['target_schools']} target report cards ({100 * cov['share']:.1f}%)"
    if cov['share'] < COVERAGE_MIN:
        raise SystemExit(f'refused: {msg}, below the {100 * COVERAGE_MIN:.0f}% needed')
    if not confirm:
        raise SystemExit(f'refused: {msg}. Pass --confirm-complete to run on this cut-off.')
    return dict(cov, cutoff=cutoff)


# ---------------------------------------------------------------------------------------------------------------
# real data (only reached after guard_corpus passes)
# ---------------------------------------------------------------------------------------------------------------

def load_real(cutoff, corpus=CORPUS, context=CONTEXT, raw=RAW):
    """One row per report card: code, phase, region, month, grades, context. URNs stay in memory only."""
    import grades_context as gc
    man = read_manifest(os.path.join(corpus, 'manifest.jsonl'), cutoff)
    idx = pd.read_csv(os.path.join(corpus, 'parsed', 'index.csv'), dtype=str, keep_default_na=False)
    parsed = set(idx.loc[idx['status'] == 'parsed', 'urn'])
    lead = pd.read_csv(os.path.join(corpus, 'restricted', 'lead_inspector.csv'), dtype=str, keep_default_na=False)
    lead = lead[lead['code'].str.strip() != '']
    dup = lead['urn'].duplicated(keep=False)
    lead = lead[~dup].set_index('urn')['code']       # a school with two different lead codes is ambiguous: dropped
    counts = {'corpus_schools': len(man), 'parsed_schools': len(parsed & set(man)), 'ambiguous_code_schools': int(dup.sum())}

    mi = pd.read_csv(os.path.join(raw, 'ofsted_mi_latest.csv'), dtype=str, keep_default_na=False).set_index('urn')
    daily = pd.read_csv(os.path.join(raw, 'reports_daily.csv'), dtype=str, keep_default_na=False)
    daily = daily.sort_values('published').drop_duplicates(['urn', 'insp_date'], keep='last').set_index(['urn', 'insp_date'])
    rows, src = [], {'MI': 0, 'daily': 0, 'none': 0, 'no_code': 0}
    for u, m in man.items():
        if u not in parsed or m.get('insp_date', '') < RENEWED:
            continue
        if u not in lead.index:
            src['no_code'] += 1
            continue
        d = m['insp_date']
        g = None
        if u in mi.index and mi.at[u, 'f_start'] == d and mi.at[u, 'g_ach'] in SCALE:   # MI wins for the same inspection
            g, s = mi.loc[u, GRADE_COLS], 'MI'
        elif (u, d) in daily.index and daily.loc[(u, d), 'g_ach'] in SCALE:
            g, s = daily.loc[(u, d), GRADE_COLS], 'daily'
        if g is None:
            src['none'] += 1
            continue
        src[s] += 1
        rows.append(dict(urn=u, code=lead[u], phase=m['phase'], month=d[:7], **{k: g[k] for k in GRADE_COLS}))
    df = pd.DataFrame(rows)
    ctx = gc.load(gc.inputs(context, False)).drop_duplicates('urn').set_index('urn')
    keep = ['region', 'idaci', 'ehc', 'sensup', 'logsize', 'urban', 'academy', 'pa', 'nonmob', 'ss']
    df = df.join(ctx[keep], on='urn')
    counts.update({f'grades_from_{k}_schools': v for k, v in src.items()})
    counts = {k: cell(v) for k, v in counts.items()}
    return df, counts


# ---------------------------------------------------------------------------------------------------------------
# synthetic data (tests and smoke runs)
# ---------------------------------------------------------------------------------------------------------------

REGIONS = ['North East, Yorkshire and the Humber', 'South East', 'North West', 'East of England', 'London',
           'West Midlands', 'South West', 'East Midlands']
MONTHS = ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07',
          '2026-09', '2026-10', '2026-11']


def simulate(n=4000, inspectors=320, sigma=0.5, seed=1, secondary_share=0.18, base=-1.4, n_special=150):
    """Synthetic report cards with a known inspector SD on the log-odds scale. Inspectors work within one region;
    report counts per inspector are skewed (many with few, some with many), like a first year of inspections."""
    rng = np.random.default_rng(seed)
    codes = np.array([f'{x:012x}' for x in rng.integers(0, 16 ** 12, inspectors)])
    home = rng.integers(0, len(REGIONS), inspectors)
    wt = rng.gamma(0.9, 1.0, inspectors)
    u = rng.normal(0, sigma, inspectors) if sigma > 0 else np.zeros(inspectors)
    total = n + n_special
    j = rng.choice(inspectors, total, p=wt / wt.sum())
    phase = np.where(rng.random(total) < secondary_share, 'Secondary', 'Primary').astype(object)
    phase[n:] = rng.choice(list(DESCRIBED_PHASES), n_special)
    df = pd.DataFrame({'code': codes[j], 'phase': phase, 'region': np.array(REGIONS)[home[j]],
                       'month': rng.choice(MONTHS, total),
                       'idaci': rng.integers(1, 6, total).astype(float), 'ehc': rng.gamma(2, 1.2, total),
                       'sensup': rng.gamma(4, 3, total), 'logsize': rng.normal(5.6, 0.5, total),
                       'urban': (rng.random(total) < 0.75).astype(float), 'academy': (rng.random(total) < 0.45).astype(float)})
    sec = (df['phase'] == 'Secondary').to_numpy()
    df['logsize'] += np.where(sec, 1.3, 0)
    for c in ('pa', 'nonmob', 'ss'):
        df[c] = np.where(sec, rng.normal(0, 1, total), np.nan)
    df.loc[rng.random(total) < 0.01, 'ehc'] = np.nan          # a few missing context values
    mo = pd.Series(df['month']).map({m: i for i, m in enumerate(MONTHS)}).to_numpy()
    area_shift = {'g_ach': 0.0, 'g_ct': -0.3, 'g_ab': -0.6, 'g_lg': -0.5, 'g_inc': -0.8, 'g_pd': -1.2, 'g_ey': -1.0, 'g_p16': -0.7}
    for a, sh in area_shift.items():
        eta = (base + sh + 0.25 * (df['idaci'].to_numpy() - 3) + 0.1 * np.nan_to_num(df['ehc'].to_numpy() - 2.4)
               - 0.2 * (df['academy'].to_numpy()) + 0.02 * (mo - 6) + 0.15 * home[j] / 7
               + np.where(sec, 0.3 - 0.4 * np.nan_to_num(df['pa'].to_numpy()) + 0.3 * np.nan_to_num(df['ss'].to_numpy() * -1), 0)
               + u[j])
        y = rng.random(total) < special.expit(eta)
        g = np.where(y, np.where(rng.random(total) < 0.15, 'Urgent improvement', 'Needs attention'),
                     np.where(rng.random(total) < 0.75, 'Expected standard', 'Strong standard')).astype(object)
        if a == 'g_ey':
            g[(df['phase'] != 'Primary').to_numpy() | (rng.random(total) < 0.4)] = ''
        if a == 'g_p16':
            g[~sec | (rng.random(total) < 0.4)] = ''
        df[a] = g
    df['urn'] = [str(100000 + i) for i in range(total)]
    return df


# ---------------------------------------------------------------------------------------------------------------
# design matrices
# ---------------------------------------------------------------------------------------------------------------

def model_frame(df, area, phases):
    """Graded rows in the given phases with complete context; z-scores within the sample (secondary-only controls
    standardised within its secondaries and set to zero for primaries)."""
    d = df[df['phase'].isin(phases) & df[area].isin(SCALE)].copy()
    n0 = len(d)
    need = ['idaci', 'ehc', 'sensup', 'logsize', 'urban', 'academy', 'region', 'month']
    d = d.dropna(subset=need)
    sec = d['phase'] == 'Secondary'
    d = d[~sec | d[['pa', 'nonmob', 'ss']].notna().all(axis=1)].copy()
    sec = (d['phase'] == 'Secondary').to_numpy()
    d['y'] = d[area].isin(BELOW).astype(int)
    d['idaci'] = d['idaci'].astype(int)
    d['secondary'] = sec.astype(float)
    for z, raw in RAWVARS.items():
        if raw in ('pa', 'nonmob', 'ss'):
            v = d[raw].where(sec)
            d[z] = np.where(sec, (v - v[sec].mean()) / v[sec].std(ddof=0), 0.0) if sec.any() else 0.0
        else:
            d[z] = (d[raw] - d[raw].mean()) / d[raw].std(ddof=0)
    d['rt'] = d['region'] + '|' + d['month'].map(term)
    return d, n0 - len(d)


def term(month):
    """School term of an inspection month (Amendment 1): autumn September to December, spring January to March,
    summer April to August."""
    m = int(month[5:7])
    return f"{month[:4]}-autumn" if m >= 9 else (f"{month[:4]}-spring" if m <= 3 else f"{month[:4]}-summer")


def formula(d, timing):
    terms = list(SHARED)
    terms += ['C(region)', 'C(month)'] if timing == 'region+month' else ['C(rt)']
    phases = set(d['phase'])
    if phases == {'Primary', 'Secondary'}:
        terms += ['secondary'] + SEC_ONLY           # phase, and secondary-only controls interacted with phase
    elif phases == {'Secondary'}:
        terms += SEC_ONLY
    return 'y ~ ' + ' + '.join(terms)


def design(d, timing):
    y, X = patsy.dmatrices(formula(d, timing), d, return_type='dataframe')
    keep = [c for c in X.columns if c == 'Intercept' or X[c].std() > 0]   # drop a column that is constant here
    return X[keep], np.asarray(y).ravel().astype(float), X.design_info


def typical_row(d):
    """The typical school: every context measure at its median in the model sample. For unordered categories
    (region) there is no median, so the modal region is used; month (ordered) and IDACI fifth take their lower
    median; binary measures (urban, academy, phase) their lower median, which is the majority value."""
    t = {}
    for c in ('ehc', 'sensup', 'logsize'):
        t['z_' + c] = float(np.median(d['z_' + c]))
    t['idaci'] = int(np.percentile(d['idaci'], 50, method='lower'))
    for c in ('urban', 'academy', 'secondary'):
        t[c] = float(np.percentile(d[c], 50, method='lower'))
    sec = d['secondary'] == 1
    for c in SEC_ONLY:
        t[c] = float(np.median(d.loc[sec, c])) if t['secondary'] == 1 and sec.any() else 0.0
    t['region'] = d['region'].value_counts().idxmax()
    t['month'] = sorted(d['month'])[(len(d) - 1) // 2]
    t['rt'] = t['region'] + '|' + term(t['month'])
    if t['rt'] not in set(d['rt']):
        t['rt'] = d['rt'].value_counts().idxmax()
    t['y'] = 0
    t['phase'] = 'Secondary' if t['secondary'] == 1 else 'Primary'
    return pd.DataFrame([t])


def groups(codes, threshold):
    """Integer inspector index per report card; codes with fewer than `threshold` report cards share one group.
    Returns (index array, number of groups, aggregate description). No code leaves this function."""
    vc = codes.value_counts()
    small = set(vc.index[vc < threshold])
    lab = codes.where(~codes.isin(small), '__pooled__')
    g, uniq = pd.factorize(lab)
    pooled = int(codes.isin(small).sum())
    desc = {'inspectors': int(len(vc)), 'inspectors_pooled': int(len(small)), 'pooled_group_schools': pooled,
            'groups_in_model': int(len(uniq)),
            'reports_per_inspector': {'min': int(vc.min()), 'median': float(vc.median()), 'max': int(vc.max())}}
    return g.astype(np.int64), len(uniq), desc


# ---------------------------------------------------------------------------------------------------------------
# estimation
# ---------------------------------------------------------------------------------------------------------------

def fit_bayes(X, y, g, J, seed=SEED, draws=DRAWS, tune=TUNE, chains=CHAINS, cores=None, target_accept=TARGET_ACCEPT):
    """Random-intercept logistic regression in PyMC. Priors as pre-registered: Normal(0, 2.5) on every fixed effect,
    half-Normal(1) on the inspector SD. Non-centred inspector effects; only beta and sigma are kept in the trace."""
    import pymc as pm
    import arviz as az
    X = np.asarray(X, float)
    with pm.Model():
        beta = pm.Normal('beta', 0.0, 2.5, shape=X.shape[1])
        sigma = pm.HalfNormal('sigma', 1.0)
        z = pm.Normal('z', 0.0, 1.0, shape=J)
        eta = pm.math.dot(X, beta) + sigma * z[g]
        pm.Bernoulli('obs', logit_p=eta, observed=y)
        idata = pm.sample(draws=draws, tune=tune, chains=chains, cores=cores or min(chains, os.cpu_count() or 1),
                          random_seed=seed, target_accept=target_accept, var_names=['beta', 'sigma'],
                          progressbar=False, compute_convergence_checks=False, quiet=True)
    post = idata.posterior
    s = np.asarray(post['sigma'])                  # chains x draws
    b = np.asarray(post['beta'])                   # chains x draws x p
    allp = np.concatenate([s[:, :, None], b], axis=2)                       # rank-normalised split R-hat; bulk and tail ESS
    rh = np.atleast_1d(az.rhat(allp, chain_axis=0, draw_axis=1))
    es = np.r_[np.atleast_1d(az.ess(allp, method='bulk', chain_axis=0, draw_axis=1)),
               np.atleast_1d(az.ess(allp, method='tail', prob=(0.05, 0.95), chain_axis=0, draw_axis=1))]
    try:
        div = int(np.asarray(idata.sample_stats['diverging']).sum())
    except Exception:
        div = None
    diag = {'rhat_max': round(float(np.max(rh)), 4), 'ess_min': round(float(np.min(es))), 'divergences': div, 'chains': chains, 'draws': draws, 'tune': tune,
            'target_accept': target_accept, 'seed': seed}
    diag['converged'] = diag['rhat_max'] < RHAT_MAX and diag['ess_min'] > ESS_MIN
    del idata, post
    return s.ravel(), b.reshape(-1, b.shape[2]), diag


def fit_bayes_checked(X, y, g, J, seed=SEED, draws=DRAWS, tune=TUNE, **kw):
    """Fit; if R-hat or ESS fail the pre-registered thresholds, refit once with twice the draws and tuning and
    target_accept 0.95. A model that still fails is reported with converged = false."""
    s, b, d = fit_bayes(X, y, g, J, seed=seed, draws=draws, tune=tune, **kw)
    if not d['converged']:
        kw2 = dict(kw, target_accept=0.95)
        s, b, d2 = fit_bayes(X, y, g, J, seed=seed + 1, draws=2 * draws, tune=2 * tune, **kw2)
        d2['refit_after'] = {k: d[k] for k in ('rhat_max', 'ess_min')}
        d = d2
    return s, b, d


def ml_sigma(X, y, g, J, nodes=GH_NODES):
    """Maximum-likelihood inspector SD for the same random-intercept logistic model, by Gauss-Hermite quadrature of
    the marginal likelihood (as glmer with nAGQ > 1), analytic gradient, L-BFGS-B. Used for the permutation benchmark,
    identically for observed and shuffled data. Returns sigma-hat only."""
    X = np.asarray(X, float)
    y = np.asarray(y, float)
    n, p = X.shape
    xk, wk = np.polynomial.hermite.hermgauss(nodes)
    lw = np.log(wk / math.sqrt(math.pi))
    rt2x = math.sqrt(2.0) * xk
    M = sparse.csr_matrix((np.ones(n), (g, np.arange(n))), shape=(J, n))

    def f(th):
        b, s = th[:p], th[p]
        E = (X @ b)[:, None] + s * rt2x[None, :]
        ll = y[:, None] * E - np.logaddexp(0.0, E)
        A = M @ ll + lw[None, :]
        L = special.logsumexp(A, axis=1)
        R = np.exp(A - L[:, None])[g]
        res = R * (y[:, None] - special.expit(E))
        return -L.sum(), -np.r_[X.T @ res.sum(1), (res * rt2x[None, :]).sum()]

    best = None
    for s0 in (0.5,):
        th0 = np.r_[np.zeros(p), s0]
        bounds = [(-15, 15)] * p + [(0.0, 10.0)]
        r = optimize.minimize(f, th0, jac=True, method='L-BFGS-B', bounds=bounds, options={'maxiter': 2000})
        if best is None or r.fun < best.fun:
            best = r
    return float(best.x[p])


def permute_codes(codes, strata, rng):
    """Shuffle codes among report cards within strata; each code keeps its number of reports in every stratum."""
    out = codes.to_numpy().copy()
    for idx in pd.Series(np.arange(len(codes))).groupby(strata.to_numpy()).indices.values():
        out[idx] = out[rng.permutation(idx)]
    return pd.Series(out, index=codes.index)


def permutation_benchmark(d, X, y, threshold, perms=PERMS, seed=SEED):
    rng = np.random.default_rng(seed)
    g, J, _ = groups(d['code'], threshold)
    obs = ml_sigma(X, y, g, J)
    strata = d['region'] + '|' + d['month'] + '|' + d['phase']
    sh = np.empty(perms)
    for i in range(perms):
        gi, Ji, _ = groups(permute_codes(d['code'], strata, rng), threshold)
        sh[i] = ml_sigma(X, y, gi, Ji)
    below, ties = (sh < obs - 1e-6).sum(), (np.abs(sh - obs) <= 1e-6).sum()
    q = np.percentile(sh, [2.5, 50, 97.5])
    p95 = float(np.percentile(sh, 95))
    distinct = obs > p95 + 1e-9
    out = {'estimator': 'maximum likelihood, Gauss-Hermite quadrature (30 nodes)', 'shuffles': perms,
           'strata': 'region x month x phase', 'observed_sd_ml': round(obs, 3),
           'shuffled_sd_median': round(float(q[1]), 3), 'shuffled_sd_2_5': round(float(q[0]), 3),
           'shuffled_sd_97_5': round(float(q[2]), 3),
           'shuffled_sd_95': round(p95, 3),
           'observed_percentile': round(100 * (below + 0.5 * ties) / perms, 1),
           'reading': chance_reading(distinct),
           'shuffles_at_or_above_observed': int((sh >= obs - 1e-6).sum())}
    del sh
    return out


# ---------------------------------------------------------------------------------------------------------------
# the reported figures
# ---------------------------------------------------------------------------------------------------------------

def chance_reading(distinct):
    """Amendment 1: the headline reading for an area, stated only against the permutation benchmark."""
    return 'distinguishable from chance' if distinct else 'not distinguishable from chance'


def mor(sigma):
    return np.exp(math.sqrt(2.0) * np.asarray(sigma) * Q75)


def icc(sigma):
    s2 = np.asarray(sigma) ** 2
    return s2 / (s2 + math.pi ** 2 / 3)


def mor_band(lo, hi):
    """Pre-stated reading; stated only where the whole 95% interval falls within one band."""
    def band(v):
        return 'little' if v < 1.2 else ('modest' if v <= 1.5 else 'substantial')
    a, b = band(lo), band(hi)
    words = {'little': 'little association with the lead inspector', 'modest': 'modest', 'substantial': 'substantial'}
    return words[a] if a == b else f'uncertain between {a} and {b}'


def ci(v, digits=3, scale=1.0):
    v = np.asarray(v) * scale
    q = np.percentile(v, [50, 2.5, 97.5])
    return {'median': round(float(q[0]), digits), 'lo': round(float(q[1]), digits), 'hi': round(float(q[2]), digits)}


def figures(s, b, x0):
    eta0 = b @ x0
    p25 = special.expit(eta0 - Q75 * s)
    p75 = special.expit(eta0 + Q75 * s)
    m = ci(mor(s))
    return {'inspector_sd': ci(s), 'median_odds_ratio': m, 'mor_reading': mor_band(m['lo'], m['hi']),
            'typical_school_p25_pct': ci(p25, 1, 100), 'typical_school_p75_pct': ci(p75, 1, 100),
            'spread_pp': ci(p75 - p25, 1, 100), 'icc_latent': ci(icc(s))}


def cell(k):
    """A count of schools: returned as an int only if at least MIN_CELL, else the suppression marker."""
    return int(k) if (k >= MIN_CELL or k == 0) else 'fewer than 10'


def run_model(df, area, name, fit_kw, perms=0):
    phases, timing, thr, desc = MODELS[name]
    d, dropped = model_frame(df, area, phases)
    out = {'model': desc, 'phases': list(phases)}
    if len(d) == 0 or d['y'].nunique() < 2:
        return dict(out, status='not fitted: no variation in the outcome')
    X, y, di = design(d, timing)
    k = X.shape[1] - 1
    ev = int(y.sum())
    out.update({'schools': cell(len(d)), 'events': cell(ev), 'non_events': cell(len(d) - ev),
                'dropped_missing_context_schools': cell(dropped) if dropped else 0,
                'fixed_effect_parameters': k, 'events_needed': EPV * k})
    if d['phase'].nunique() > 1:
        out['schools_primary'] = cell((d['phase'] == 'Primary').sum())
        out['schools_secondary'] = cell((d['phase'] == 'Secondary').sum())
    if ev < EPV * k:
        return dict(out, status='not fitted: events rule (fewer than 10 schools below Expected per fixed-effect parameter)')
    g, J, gdesc = groups(d['code'], thr)
    gdesc['pooled_group_schools'] = cell(gdesc['pooled_group_schools']) if gdesc['pooled_group_schools'] else 0
    out['inspectors'] = gdesc
    t0 = time.time()
    s, b, diag = fit_bayes_checked(X.to_numpy(), y, g, J, **fit_kw)
    x0 = np.asarray(patsy.build_design_matrices([di], typical_row(d))[0])[0]
    x0 = pd.Series(x0, index=di.column_names)[X.columns].to_numpy()
    out.update(status='fitted', convergence=diag, **figures(s, b, x0))
    out['seconds_bayes'] = round(time.time() - t0, 1)
    del s, b, g
    if perms:
        t0 = time.time()
        out['permutation'] = permutation_benchmark(d, X.to_numpy(), y, thr, perms=perms, seed=fit_kw.get('seed', SEED))
        out['reading'] = out['permutation']['reading']      # Amendment 1: the headline reading for the area
        out['seconds_permutation'] = round(time.time() - t0, 1)
    return out


def describe_other_phases(df):
    """Special, alternative provision and nursery report cards: described only, never modelled."""
    out = {}
    for ph in DESCRIBED_PHASES:
        d = df[df['phase'] == ph]
        r = {'schools': cell(len(d))}
        if len(d) >= MIN_CELL:
            r['inspectors'] = int(d['code'].nunique())
            for a, lab in MAIN_AREAS + OTHER_AREAS:
                gd = d[d[a].isin(SCALE)]
                if len(gd) >= MIN_CELL:
                    nb = int(gd[a].isin(BELOW).sum())
                    r[a] = {'area': lab, 'schools': cell(len(gd)),
                            'below_expected_pct': round(100 * nb / len(gd), 1) if min(nb, len(gd) - nb) >= MIN_CELL else 'suppressed (a cell under 10)'}
        out[ph] = r
    return out


def analyse(df, fit_kw=None, perms=PERMS, areas=None, sensitivity=True, log=print):
    fit_kw = fit_kw or {}
    res = {'areas': {}, 'other_areas': {}}
    main_sample = df[df['phase'].isin(MAIN_PHASES)]
    vc = main_sample['code'].value_counts()
    res['sample'] = {'schools': cell(len(df)), 'schools_main_phases': cell(len(main_sample)),
                     'inspectors_main_phases': int(len(vc)),
                     'reports_per_inspector_main_phases': {'min': int(vc.min()), 'median': float(vc.median()), 'max': int(vc.max())},
                     'inspectors_with_5_or_more': int((vc >= 5).sum()), 'inspectors_with_10_or_more': int((vc >= 10).sum())}
    todo = [(a, lab, True) for a, lab in MAIN_AREAS] + [(a, lab, False) for a, lab in OTHER_AREAS]
    if areas:
        todo = [t for t in todo if t[0] in areas]
    for a, lab, main in todo:
        t0 = time.time()
        r = {'area': lab, 'main': run_model(df, a, 'main', fit_kw, perms=perms)}
        if main or r['main'].get('status') == 'fitted':     # other areas only if they reach the events rule
            if sensitivity:
                r['sensitivity'] = {n: run_model(df, a, n, fit_kw) for n in MODELS if n != 'main'}
            (res['areas'] if main else res['other_areas'])[a] = r
        else:
            res['other_areas'][a] = {'area': lab, 'status': r['main']['status'], 'schools': r['main'].get('schools'),
                                     'events': r['main'].get('events'),
                                     'events_needed': r['main'].get('events_needed')}
        log(f'{lab}: {r["main"].get("status")} ({time.time() - t0:.0f}s)')
    res['described_only'] = describe_other_phases(df)
    return res


# ---------------------------------------------------------------------------------------------------------------
# output checks and writing
# ---------------------------------------------------------------------------------------------------------------

HEX12 = re.compile(r'(?<![0-9a-fA-F])[0-9a-fA-F]{12}(?![0-9a-fA-F])')
SIX = re.compile(r'(?<!\d)\d{6}(?!\d)')
CELL_KEYS = re.compile(r'^(schools.*|.*_schools|events|non_events)$')
MAX_NUMERIC_LIST = 8


def check_output(obj, md, codes, urns):
    """Raise if the output holds any code, any URN, an inspector-level number, or a cell of fewer than 10 schools."""
    codes, urns = set(codes), set(urns)
    problems = []

    def text(s, where):
        if s in codes or any(c in s for c in codes if len(c) >= 6):
            problems.append(f'inspector code in {where}')
        if HEX12.search(s):
            problems.append(f'12-hex token in {where}')
        if any(m in urns for m in SIX.findall(s)):
            problems.append(f'URN in {where}')

    def walk(o, path):
        if isinstance(o, dict):
            for k, v in o.items():
                text(str(k), path + '/' + str(k) + ' (key)')
                if CELL_KEYS.match(str(k)) and isinstance(v, (int, np.integer)) and not isinstance(v, bool) and 0 < v < MIN_CELL:
                    problems.append(f'cell of {v} schools at {path}/{k}')
                if str(k).lower() in ('u', 'z', 'random_effects', 'inspector_effects', 'blups', 'codes'):
                    problems.append(f'inspector-level key at {path}/{k}')
                walk(v, path + '/' + str(k))
        elif isinstance(o, (list, tuple, np.ndarray)):
            if sum(isinstance(v, (int, float, np.number)) for v in o) > MAX_NUMERIC_LIST:
                problems.append(f'numeric list of length {len(o)} at {path} (could be inspector-level)')
            for i, v in enumerate(o):
                walk(v, f'{path}[{i}]')
        elif isinstance(o, str):
            text(o, path)

    walk(obj, '')
    text(md, 'results.md')
    if problems:
        raise SystemExit('refused to write: ' + '; '.join(sorted(set(problems))[:10]))


def fmt(c, unit=''):
    return f"{c['median']}{unit} (95% CrI {c['lo']} to {c['hi']}{unit})"


def render_md(res):
    L = ['# How consistent is inspection? Results', '',
         f"Pre-registered plan: `{res['plan']['path']}` (commit {res['plan']['commit']}, approved {res['plan']['approved']}).",
         f"Run: {res['run']['when']} ({res['run']['mode']}). National aggregate figures only: no inspector is named, ranked or profiled, and no inspector-level number is held in this file.", '']
    if res['run']['mode'] != 'real':
        L += ['**Synthetic data.** These figures come from simulated report cards with a known inspector SD and are a test of the method, not results.', '']
    if 'corpus' in res:
        c = res['corpus']
        L += [f"Corpus at the cut-off {c['cutoff']}: {c['in_corpus_schools']} of {c['target_schools']} target report cards ({100 * c['share']:.1f}%).", '']
    s = res['sample']
    rp = s['reports_per_inspector_main_phases']
    L += [f"Primaries and secondaries: {s['schools_main_phases']} report cards led by {s['inspectors_main_phases']} lead inspectors "
          f"(report cards per inspector: minimum {rp['min']}, median {rp['median']:g}, maximum {rp['max']}; "
          f"{s['inspectors_with_5_or_more']} inspectors led 5 or more, {s['inspectors_with_10_or_more']} led 10 or more).", '']
    L += ['## Main model, by area', '',
          '| Area | Schools (below Expected) | Reading against chance | Permutation percentile | Inspector SD | Median odds ratio | MOR band | Typical school, 25th to 75th percentile inspector | Spread (pp) | Latent ICC |',
          '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |']
    for blk in ('areas', 'other_areas'):
        for a, r in res[blk].items():
            m = r.get('main', r)
            if m.get('status') != 'fitted':
                L.append(f"| {r['area']} | {m.get('schools', '')} ({m.get('events', '')}) | {m.get('status')} | | | | | | | |")
                continue
            p = m.get('permutation', {})
            L.append(f"| {r['area']} | {m['schools']} ({m['events']}) | {m.get('reading', 'no benchmark run')} | {p.get('observed_percentile', '')} | "
                     f"{fmt(m['inspector_sd'])} | {fmt(m['median_odds_ratio'])} | "
                     f"{m['mor_reading']} | {m['typical_school_p25_pct']['median']}% to {m['typical_school_p75_pct']['median']}% | "
                     f"{fmt(m['spread_pp'])} | {fmt(m['icc_latent'])} |")
    L += ['', 'Convergence: R-hat below 1.01 and effective sample size above 400 required for every parameter kept.', '']
    for a, r in res['areas'].items():
        m = r['main']
        if m.get('status') == 'fitted':
            c, p = m['convergence'], m.get('permutation')
            L.append(f"- {r['area']}: R-hat max {c['rhat_max']:.3f}, ESS min {c['ess_min']:.0f}, divergences {c['divergences']}, converged {c['converged']}.")
            if p:
                L.append(f"  Permutation ({p['shuffles']} shuffles within {p['strata']}): observed ML SD {p['observed_sd_ml']}, shuffled median {p['shuffled_sd_median']} "
                         f"(2.5th to 97.5th percentile {p['shuffled_sd_2_5']} to {p['shuffled_sd_97_5']}; 95th percentile {p['shuffled_sd_95']}); observed at the {p['observed_percentile']}th percentile: {p['reading']}.")
    L += ['', '## Sensitivity runs', '', '| Area | Run | Status | Inspector SD | Median odds ratio | Reading |', '| --- | --- | --- | --- | --- | --- |']
    for a, r in res['areas'].items():
        for n, m in r.get('sensitivity', {}).items():
            if m.get('status') == 'fitted':
                L.append(f"| {r['area']} | {m['model']} | fitted{'' if m['convergence']['converged'] else ' (not converged)'} | {fmt(m['inspector_sd'])} | {fmt(m['median_odds_ratio'])} | {m['mor_reading']} |")
            else:
                L.append(f"| {r['area']} | {m['model']} | {m.get('status')} | | | |")
    L += ['', '## Described only: special, alternative provision and nursery', '']
    for ph, r in res['described_only'].items():
        L.append(f"- {ph}: {r['schools']} report cards.")
    L += ['', 'MOR reading, set before the analysis: below 1.2 little association with the lead inspector; 1.2 to 1.5 modest; above 1.5 substantial. '
          'A band is stated only where the whole 95% interval falls within one band.', '',
          'Reading against chance (Amendment 1, 26 November 2026): an inspector effect is reported as distinguishable from chance only where the observed '
          'maximum-likelihood inspector SD is above the 95th percentile of its 200 shuffled values; otherwise the reading for that area is '
          '"not distinguishable from chance", whatever the MOR band. The MOR, its interval and its band are reported in full in every case.', '']
    return '\n'.join(L)


def write(res, codes, urns, out_dir=OUT_DIR, base=OUT_BASE):
    js = json.dumps(res, indent=1, ensure_ascii=False, default=lambda o: o.item() if hasattr(o, 'item') else str(o))
    md = render_md(res)
    check_output(json.loads(js), md, codes, urns)
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, base + '.json'), 'w') as f:
        f.write(js + '\n')
    with open(os.path.join(out_dir, base + '.md'), 'w') as f:
        f.write(md)
    return os.path.join(out_dir, base + '.json'), os.path.join(out_dir, base + '.md')


def versions():
    import importlib
    v = {}
    for m in ('numpy', 'pandas', 'scipy', 'statsmodels', 'patsy', 'pymc', 'pytensor', 'arviz'):
        try:
            v[m] = importlib.import_module(m).__version__
        except Exception:
            v[m] = None
    return v


def main():
    """Measured runtime (26 Nov 2026, this container, 4 cores; synthetic data of the real run's size, 4,000 primary
    and secondary report cards, 287 lead codes): 10.4 minutes in all. Each PyMC fit (4 chains x 1,000 draws after
    1,000 tuning) takes about 25-35 seconds; each maximum-likelihood fit about 0.3 seconds, so the 200 shuffles take
    about a minute per area. Five areas reached the events rule there; with all eight, allow about 20 minutes."""
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--cutoff', help='corpus cut-off date, YYYY-MM-DD (real run)')
    ap.add_argument('--confirm-complete', action='store_true', help='confirm the corpus is complete at the cut-off')
    ap.add_argument('--corpus', default=CORPUS)
    ap.add_argument('--context', default=CONTEXT)
    ap.add_argument('--synthetic', type=float, help='run on synthetic data with this true inspector SD (writes to --out)')
    ap.add_argument('--n', type=int, default=4000, help='synthetic report cards')
    ap.add_argument('--out', help='output folder (synthetic runs only; the real run writes to docs/analysis-plans)')
    ap.add_argument('--perms', type=int, default=PERMS)
    ap.add_argument('--draws', type=int, default=DRAWS)
    ap.add_argument('--no-sensitivity', action='store_true')
    a = ap.parse_args()
    t0 = time.time()
    fit_kw = {'seed': SEED, 'draws': a.draws, 'tune': a.draws}
    if a.synthetic is not None:
        if not a.out or os.path.abspath(a.out) == os.path.abspath(OUT_DIR):
            raise SystemExit('a synthetic run must write to its own --out folder, never to docs/analysis-plans')
        df = simulate(n=a.n, sigma=a.synthetic, seed=SEED)
        res = analyse(df, fit_kw, perms=a.perms, sensitivity=not a.no_sensitivity)
        res['run'] = {'mode': f'synthetic, true inspector SD {a.synthetic}', 'when': dt.datetime.now().isoformat(timespec='seconds')}
        out_dir = a.out
    else:
        if a.out or a.perms != PERMS or a.draws != DRAWS or a.no_sensitivity:
            raise SystemExit('the real run uses the pre-registered settings and output path only')
        cov = guard_corpus(a.cutoff, a.confirm_complete, corpus=a.corpus)
        df, counts = load_real(a.cutoff, corpus=a.corpus, context=a.context)
        res = analyse(df, fit_kw, perms=PERMS)
        res['corpus'] = dict(cov, **counts)
        res['run'] = {'mode': 'real', 'when': dt.datetime.now().isoformat(timespec='seconds')}
        out_dir = OUT_DIR
    res['plan'] = PLAN
    res['run'].update(seconds=round(time.time() - t0), versions=versions(), seed=SEED)
    codes, urns = set(df['code']), set(df['urn'])
    del df
    paths = write(res, codes, urns, out_dir=out_dir)
    print('wrote', *paths)


if __name__ == '__main__':
    main()
