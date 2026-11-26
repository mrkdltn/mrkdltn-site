"""The compute functions behind every discovery's figures (content/discoveries/*.md).

Each figure in a discovery's front matter names one function here (`compute:`). The function takes the Explorer's own
built data (Data, below: the same site/explorer/data/ks4.json the pages load, after the daily report cards are merged
and small groups suppressed) and returns {'value': number, 'n': schools behind it}. Chart functions return the series a
discovery's chart draws. Nothing here names or returns a school.

The definitions match the national view at /explorer/areas/ (site/explorer/areas/areas.js), line for line:
  - a report card grade counts only if it is one of Ofsted's five grades ('Not applicable' and blanks are left out);
  - "below Expected standard" means Needs attention or Urgent improvement;
  - "results close to or above similar schools" means the 2024/25 reading against the 50 similar schools in the open
    replica (ss_band_25) is Close to, Above or Well above;
  - IDACI fifths are Ofsted's own quintile (idaci_q, 1 least deprived);
  - other fifths are cut across every secondary with results, at the 20th, 40th, 60th and 80th percentiles with linear
    interpolation (d3.quantileSorted), a school going in the fifth above any cut it exceeds;
  - groups of fewer than 10 schools give no figure (MIN).

Run from the repository root:  python3 scripts/discoveries/figures.py   (prints every figure from today's data)
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
DATA = os.path.join(ROOT, 'site', 'explorer', 'data')
RAW = os.path.join(ROOT, 'data', 'raw')

GRADES = ('Exceptional', 'Strong standard', 'Expected standard', 'Needs attention', 'Urgent improvement')
BELOW = ('Needs attention', 'Urgent improvement')
MATCHED = ('Close to', 'Above', 'Well above')
MIN = 10
AREAS = [('g_ach', 'Achievement'), ('g_ct', 'Curriculum and teaching'), ('g_ab', 'Attendance and behaviour'),
         ('g_inc', 'Inclusion'), ('g_lg', 'Leadership and governance'), ('g_pd', 'Personal development and wellbeing'),
         ('g_p16', 'Post-16 provision')]


class Data:
    """The Explorer's built data, expanded to rows of strings exactly as dash.js and areas.js expand them."""

    def __init__(self, data_dir=DATA, raw_dir=RAW):
        path = os.path.join(data_dir, 'ks4.json')
        if not os.path.exists(path):
            raise SystemExit(f'{path} is missing: run python3 scripts/build_data.py first')
        with open(path, encoding='utf-8') as f:
            j = json.load(f)
        self.rows = []
        for i in range(j['n']):
            o = {}
            for c in j['cols']:
                v = j['data'][c][i]
                o[c] = '' if v is None else (j['codes'][c][v] if c in j['codes'] else js_string(v))
            self.rows.append(o)
        bpath = os.path.join(data_dir, 'build.json')
        self.build = json.load(open(bpath)) if os.path.exists(bpath) else {}
        mpath = os.path.join(raw_dir, 'ofsted_mi_meta.json')
        self.mi = json.load(open(mpath)) if os.path.exists(mpath) else {}
        self.inspected = [r for r in self.rows if r['g_ach'] in GRADES]
        self.matched = [r for r in self.inspected if r['ss_band_25'] in MATCHED]

    @property
    def as_at(self):
        """The date of the latest inspection in the data: what a figure is 'as at'."""
        return self.build.get('latest_inspection') or ''


def js_string(v):
    """String(v) as JavaScript writes a JSON number: 4.0 is '4'."""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v)


def js_num(s):
    """+s in JavaScript: '' is 0, anything unparseable is NaN (None here)."""
    if s == '':
        return 0.0
    try:
        return float(s)
    except ValueError:
        return None


def share(rows, k):
    g = [r for r in rows if r[k] in GRADES]
    return {'n': len(g), 'value': 100 * sum(r[k] in BELOW for r in g) / len(g) if g else None}


def quantile_sorted(s, p):
    i = (len(s) - 1) * p
    lo = int(i)
    return s[lo] if lo + 1 >= len(s) else s[lo] + (s[lo + 1] - s[lo]) * (i - lo)


def fifth_cuts(rows, k):
    v = sorted(x for x in (js_num(r[k]) for r in rows) if x is not None)
    return [quantile_sorted(v, q) for q in (0.2, 0.4, 0.6, 0.8)]


def fifth_of(cuts, x):
    return None if x is None else 1 + sum(x > c for c in cuts)


def idaci(r):
    q = str(r['idaci_q']).split('.')[0]
    return int(q) if q in ('1', '2', '3', '4', '5') else None


def by_fifth(rows, group, k):
    return [share([r for r in rows if group(r) == q], k) for q in range(1, 6)]


def ok(f):
    """A figure from a group of fewer than 10 schools is not given."""
    if f['value'] is None or f['n'] < MIN:
        return {'value': None, 'n': f['n']}
    return f


def r1(x):
    return None if x is None else round(x, 4)  # four places, so a whole-number label rounds as the page rounds it


def top(points):
    """The y-axis top the areas page uses (its top()): the largest share drawn, rounded up to 10, at least 40."""
    import math
    v = [p['value'] for p in points if p['value'] is not None and p['n'] >= MIN]
    return max(40, math.ceil(max(v) / 10) * 10) if v else 40


def series(name, pts, main=False):
    out = {'name': name}
    if main:
        out['main'] = True
    out['values'] = [r1(p['value']) if p['n'] >= MIN else None for p in pts]
    out['n'] = [p['n'] for p in pts]
    return out


# ---------- seed 1: same results, different grades (achievement by IDACI fifth, results held roughly level) ----------

def sr_matched_n(d):
    """Inspected secondaries whose 2024/25 results were close to or above their 50 similar schools."""
    n = sum(r['g_ach'] in GRADES for r in d.matched)
    return {'value': n, 'n': n}


def sr_least(d):
    """Of those, the share graded below Expected standard for achievement in the least deprived IDACI fifth."""
    return ok(by_fifth(d.matched, idaci, 'g_ach')[0])


def sr_most(d):
    """The same share in the most deprived IDACI fifth."""
    return ok(by_fifth(d.matched, idaci, 'g_ach')[4])


def sr_gap(d):
    """Most deprived fifth minus least deprived fifth, in percentage points."""
    a, b = sr_least(d), sr_most(d)
    if a['value'] is None or b['value'] is None:
        return {'value': None, 'n': a['n'] + b['n']}
    return {'value': b['value'] - a['value'], 'n': a['n'] + b['n']}


def chart_sr(d):
    """The areas page's Achievement chart, grouped by IDACI fifth, on the same scale as the page (its yA)."""
    m = by_fifth(d.matched, idaci, 'g_ach')
    a = by_fifth(d.inspected, idaci, 'g_ach')
    every = [p for k, _ in AREAS for p in by_fifth(d.inspected, idaci, k) + by_fifth(d.matched, idaci, k)]
    return {'ymax': top(every),
            'series': [series('Results close to or above similar schools', m, True), series('All inspected secondaries', a)]}


# ---------- seed 2: grades travel together ----------

def _ach_split(d):
    low = [r for r in d.inspected if r['g_ach'] in BELOW]
    okk = [r for r in d.inspected if r['g_ach'] not in BELOW]
    return low, okk


def _any_other_below(r):
    return any(r[k] in BELOW for k, _ in AREAS if k != 'g_ach')


def gt_low_n(d):
    """Inspected secondaries graded below Expected standard for achievement."""
    low, _ = _ach_split(d)
    return {'value': len(low), 'n': len(low)}


def gt_low_other(d):
    """Of those, the share with at least one other area also below Expected standard."""
    low, _ = _ach_split(d)
    return ok({'n': len(low), 'value': 100 * sum(map(_any_other_below, low)) / len(low) if low else None})


def gt_low_alone(d):
    """Of those, the share with no other area below Expected standard (the areas page's own figure)."""
    f = gt_low_other(d)
    return {'n': f['n'], 'value': None if f['value'] is None else 100 - f['value']}


def gt_low_ct(d):
    """Where achievement is below Expected standard, the share also below Expected for curriculum and teaching."""
    low, _ = _ach_split(d)
    return ok(share(low, 'g_ct'))


def gt_low_ab(d):
    """Where achievement is below Expected standard, the share also below Expected for attendance and behaviour."""
    low, _ = _ach_split(d)
    return ok(share(low, 'g_ab'))


def gt_ok_other(d):
    """Where achievement is Expected standard or better, the share with any other area below Expected standard."""
    _, okk = _ach_split(d)
    return ok({'n': len(okk), 'value': 100 * sum(map(_any_other_below, okk)) / len(okk) if okk else None})


def gt_ok_max(d):
    """Where achievement is Expected standard or better, the highest share below Expected standard in any one other
    area (the areas page's own figure; n is the schools behind that area's share)."""
    _, okk = _ach_split(d)
    best = {'value': 0.0, 'n': 0}
    for k, _ in AREAS:
        if k == 'g_ach':
            continue
        s = share(okk, k)
        if s['n'] >= MIN and s['value'] > best['value']:
            best = s
    return best


def chart_gt(d):
    """The areas page's "Grades travel together" bars: each other area, split by the achievement grade."""
    low, okk = _ach_split(d)
    rows = []
    for k, lab in AREAS:
        if k == 'g_ach':
            continue
        a, b = ok(share(low, k)), ok(share(okk, k))
        rows.append({'label': lab, 'k': k, 'values': [r1(a['value']), r1(b['value'])], 'n': [a['n'], b['n']]})
    return {'rows': rows}


# ---------- seed 3: stability and behaviour ----------

def _mob(d):
    cuts = fifth_cuts(d.rows, 'nonmob_pct')
    return lambda r: fifth_of(cuts, js_num(r['nonmob_pct']))


def sb_least(d):
    """Share graded below Expected standard for attendance and behaviour, least stable fifth (fewest pupils who
    joined at the usual time)."""
    return ok(by_fifth(d.inspected, _mob(d), 'g_ab')[0])


def sb_most(d):
    """The same share in the most stable fifth."""
    return ok(by_fifth(d.inspected, _mob(d), 'g_ab')[4])


def sb_gap(d):
    a, b = sb_least(d), sb_most(d)
    if a['value'] is None or b['value'] is None:
        return {'value': None, 'n': a['n'] + b['n']}
    return {'value': a['value'] - b['value'], 'n': a['n'] + b['n']}


def sb_cut_low(d):
    """The top of the least stable fifth: the share of pupils who joined at the usual time (20th percentile)."""
    v = fifth_cuts(d.rows, 'nonmob_pct')[0]
    return {'value': v, 'n': len(d.rows)}


def sb_cut_high(d):
    """The bottom of the most stable fifth (80th percentile)."""
    v = fifth_cuts(d.rows, 'nonmob_pct')[3]
    return {'value': v, 'n': len(d.rows)}


CONTEXT = [('g_ab', 'nonmob_pct'), ('g_ct', 'pa_index'), ('g_inc', 'ehc_pct')]


def chart_sb(d):
    """The areas page's Attendance and behaviour chart by pupil-stability fifth, on the page's scale (its yC, across
    the three context charts)."""
    every = []
    for k, f in CONTEXT:
        cuts = fifth_cuts(d.rows, f)
        every += by_fifth(d.inspected, lambda r, c=cuts, f=f: fifth_of(c, js_num(r[f])), k)
    s = by_fifth(d.inspected, _mob(d), 'g_ab')
    return {'ymax': top(every), 'series': [series('Inspected secondaries', s, True)]}


# ---------- milestones (the candidate generator) ----------

def n_inspected(d):
    """Secondaries with a report card and published results."""
    return {'value': len(d.inspected), 'n': len(d.inspected)}


# ---------- seed 4: grades and context, held constant (the pre-registered analysis) ----------
# These figures are read, not re-estimated: the models are fitted by scripts/analysis/grades_context.py (branch
# areas-context-2) to the plan committed beforehand (docs/analysis-plans/grades-context-plan.md, commit 801f11b), and
# written to data/derived/grades_context.json. Each function returns the frozen estimate from that file, so a re-run of
# the analysis that moves an estimate shows on the discovery's page through the live check.

GC_PATH = os.path.join(ROOT, 'data', 'derived', 'grades_context.json')


def _gc(d):
    if getattr(d, '_gc', None) is None:
        if not os.path.exists(GC_PATH):
            raise SystemExit(f'{GC_PATH} is missing (it comes from the grades and context analysis)')
        with open(GC_PATH, encoding='utf-8') as f:
            d._gc = json.load(f)
    return d._gc


def _gc_row(d, phase, area):
    return next(r for r in _gc(d)['held'][phase] if r['area'] == area)


def gc_ach_raw(d):
    """Secondary achievement: the gap in the chance of a below Expected grade (Needs attention or Urgent improvement)
    between schools in the most and least deprived IDACI fifths, with deprivation alone, in percentage points (an
    average marginal effect from a logistic model, on every inspected secondary)."""
    r = _gc_row(d, 'Secondary', 'g_ach')
    return {'value': r['raw'][0], 'n': r['n_raw']}


def gc_ach_controlled(d):
    """The same gap with other context held constant: 2024/25 results against 50 similar schools, prior attainment,
    SEN (EHC plan and SEN support shares), pupil stability, size, region, urban or rural setting and governance. On the
    inspected secondaries with all of these (those without 2024/25 results against similar schools drop out)."""
    r = _gc_row(d, 'Secondary', 'g_ach')
    return {'value': r['controlled'][0], 'n': r['n']}


def gc_ach_controlled_lo(d):
    """Lower end of the 95% confidence interval for the controlled gap (robust HC1 standard errors, delta method)."""
    r = _gc_row(d, 'Secondary', 'g_ach')
    return {'value': r['controlled'][1], 'n': r['n']}


def gc_ach_controlled_hi(d):
    """Upper end of the 95% confidence interval for the controlled gap."""
    r = _gc_row(d, 'Secondary', 'g_ach')
    return {'value': r['controlled'][2], 'n': r['n']}


def gc_ach_holm(d):
    """Holm-adjusted p-value for the controlled gap, correcting for all the estimates in the pre-registered family."""
    r = _gc_row(d, 'Secondary', 'g_ach')
    return {'value': r['p_holm'], 'n': r['n']}


def gc_family(d):
    """The number of controlled estimates in the pre-registered family (seven areas in primaries, seven in secondaries),
    all corrected together."""
    n = _gc(d)['family_size']
    return {'value': n, 'n': n}


READINGS = {'clear': 'Clear', 'clear_single': 'Clear on its own, not after correction', 'inconclusive': 'Too uncertain to call',
            'low_events': 'Too few schools below Expected to read', 'not_fitted': 'Too few schools'}


def chart_gc_secondary(d):
    """Every secondary area: the gap with deprivation alone and with other context held constant, with 95% intervals."""
    g = _gc(d)
    rows = [{'label': r['name'], 'k': r['area'], 'raw': r['raw'], 'controlled': r['controlled'], 'n_raw': r['n_raw'],
             'n': r['n'], 'reading': READINGS.get(r['reading'], r['reading']),
             'low': r['reading'] in ('low_events', 'not_fitted')} for r in g['held']['Secondary']]
    return {'rows': rows, 'threshold': g['threshold_pp']}


# ---------- general figures for the candidate generator (named with their arguments: fifth_share__g_inc__idaci__5) ----

# the groupings the areas page can show: (label, how a school is placed, page section, x labels)
GROUPINGS = {
    'idaci': ('IDACI fifth of pupils (area deprivation)', 'results', ['Least', '2', '3', '4', 'Most']),
    'dis': ('Fifth by disadvantaged share of GCSE year group', 'results', ['Fewest', '2', '3', '4', 'Most']),
    'nonmob': ('Fifths of all secondaries', 'context', ['Least stable', '2', '3', '4', 'Most stable']),
    'pa': ('Fifths of all secondaries', 'context', ['Lowest', '2', '3', '4', 'Highest']),
    'ehc': ('Fifths of all secondaries', 'context', ['Fewest', '2', '3', '4', 'Most']),
}
FIELD = {'dis': 'dis_pct', 'nonmob': 'nonmob_pct', 'pa': 'pa_index', 'ehc': 'ehc_pct'}
# the area each context grouping is drawn for on the areas page (its "Other parts of context" section)
CONTEXT_AREA = {'nonmob': 'g_ab', 'pa': 'g_ct', 'ehc': 'g_inc'}


def grouper(d, grouping):
    if grouping == 'idaci':
        return idaci
    cuts = fifth_cuts(d.rows, FIELD[grouping])
    return lambda r: fifth_of(cuts, js_num(r[FIELD[grouping]]))


def fifth_share(d, area, grouping, q, matched=''):
    """The share graded below Expected standard in one area, in one fifth of schools (1 to 5), among inspected
    secondaries, or with 'matched' only those whose 2024/25 results were close to or above their similar schools."""
    rows = d.matched if matched == 'matched' else d.inspected
    return ok(by_fifth(rows, grouper(d, grouping), area)[int(q) - 1])


def fifth_gap(d, area, grouping, matched=''):
    """The most-deprived (or fifth 5) share minus the fifth 1 share, in percentage points."""
    a, b = fifth_share(d, area, grouping, 1, matched), fifth_share(d, area, grouping, 5, matched)
    if a['value'] is None or b['value'] is None:
        return {'value': None, 'n': a['n'] + b['n']}
    return {'value': b['value'] - a['value'], 'n': a['n'] + b['n']}


def chart_fifths(d, area, grouping):
    """The areas page's chart for this area and grouping, on the page's own scale."""
    g = grouper(d, grouping)
    if GROUPINGS[grouping][1] == 'results':
        every = [p for k, _ in AREAS for p in by_fifth(d.inspected, g, k) + by_fifth(d.matched, g, k)]
        return {'ymax': top(every), 'series': [series('Results close to or above similar schools', by_fifth(d.matched, g, area), True),
                                               series('All inspected secondaries', by_fifth(d.inspected, g, area))]}
    every = [p for gr, k in CONTEXT_AREA.items() for p in by_fifth(d.inspected, grouper(d, gr), k)]
    return {'ymax': top(every), 'series': [series('Inspected secondaries', by_fifth(d.inspected, g, area), True)]}


def months(d):
    return sorted({r['insp_date'][:7] for r in d.inspected if r.get('insp_date')})


def month_share(d, area, month):
    """The share graded below Expected standard in one area, among inspected secondaries whose latest inspection fell
    in that calendar month (YYYY-MM)."""
    return ok(share([r for r in d.inspected if r.get('insp_date', '')[:7] == month], area))


def chart_months(d, area, last):
    """Six complete months of inspections up to `last` (YYYY-MM): each month's share below Expected standard in one
    area, beside the share across every month. Months with fewer than 10 inspections give no bar."""
    ms = [m for m in months(d) if m <= last][-6:]
    import datetime
    allm = share(d.inspected, area)
    rows = []
    for m in ms:
        s = ok(month_share(d, area, m))
        rows.append({'label': datetime.date.fromisoformat(m + '-01').strftime('%B %Y'), 'values': [r1(s['value']), r1(allm['value'])],
                     'n': [s['n'], allm['n']]})
    return {'rows': rows}


GENERAL = {'fifth_share': fifth_share, 'fifth_gap': fifth_gap, 'chart_fifths': chart_fifths, 'month_share': month_share,
           'chart_months': chart_months}


# ---------- sources: each figure's primary sources, named with their release, from the files the build used ----------

def long_date(iso):
    import datetime
    if not iso:
        return ''
    t = datetime.date.fromisoformat(str(iso)[:10])
    return f'{t.day} {t.strftime("%B %Y")}'


def source_parts(d):
    mi = long_date(d.mi.get('as_at'))
    pub = long_date(d.build.get('latest_published'))
    ofsted = ('Ofsted, State-funded school inspections and outcomes: management information'
              + (f' (latest inspections as at {mi})' if mi else '')
              + (f', with report cards published to {pub} read from reports.ofsted.gov.uk' if pub else ''))
    return {
        'ofsted': ofsted,
        'ks4_25': 'DfE, Key stage 4 performance 2024/25 (final), read against the open similar-schools replica',
        'ks4_26': 'DfE, Key stage 4 performance 2025/26 (provisional, 28 October 2026)',
        'ks4_24': 'DfE, Key stage 4 performance 2023/24 (final), prior attainment index',
        'sen': 'DfE, Special educational needs in England, January 2026',
    }


# which sources lie behind each family of figures (by the name's prefix)
SOURCES = {'sr': ('ofsted', 'ks4_25'), 'gt': ('ofsted',), 'sb': ('ofsted', 'ks4_26'), 'n': ('ofsted', 'ks4_26'),
           'chart_sr': ('ofsted', 'ks4_25'), 'chart_gt': ('ofsted',), 'chart_sb': ('ofsted', 'ks4_26')}


def grades_context_source(d):
    g = _gc(d)
    mi = long_date(g['sources']['mi']['as_at'])
    plan = g['plan']
    return (f'Ofsted, State-funded school inspections and outcomes: management information, latest inspections as at {mi}; '
            'DfE, Special educational needs in England: school level data, January 2026; '
            'DfE, Key stage 4 performance 2024/25 (final), read against the open similar-schools replica; '
            'DfE, Get Information about Schools, extract of 25 November 2026; '
            f'analysis as pre-registered in docs/analysis-plans/grades-context-plan.md (commit {plan["commit"][:7]}, '
            f'{long_date(plan["committed"][:10])})')


def source_for(name, d):
    if name.startswith(('gc_', 'chart_gc')):
        return grades_context_source(d)
    keys = SOURCES.get(name) or SOURCES.get(name.split('_')[0]) or ('ofsted',)
    if '__' in name:
        args = name.split('__')[1:]
        keys = ['ofsted'] + (['ks4_25'] if 'matched' in args or (name.startswith('chart_fifths') and GROUPINGS[args[1]][1] == 'results') else [])
        keys += {'dis': ['ks4_26'], 'nonmob': ['ks4_26'], 'pa': ['ks4_24'], 'ehc': ['sen']}.get(args[1] if len(args) > 1 else '', [])
    parts = source_parts(d)
    return '; '.join(parts[k] for k in keys)


def as_at_for(name, d):
    """What a figure is 'as at': for the grades and context analysis, the date of the MI release it was fitted to."""
    if name.startswith(('gc_', 'chart_gc')):
        return str(_gc(d)['as_at'])[:10]
    return as_at(d)


def as_at(d):
    """What a frozen figure is 'as at': the last report card publication in the data (the daily read), or failing
    that the latest inspection."""
    return str(d.build.get('latest_published') or d.build.get('latest_inspection') or '')[:10]


FIGURES = {k: v for k, v in globals().items() if callable(v) and k.split('_')[0] in ('sr', 'gt', 'sb', 'n', 'gc') and not k.startswith('_')}
CHARTS = {'chart_sr': chart_sr, 'chart_gt': chart_gt, 'chart_sb': chart_sb, 'chart_gc_secondary': chart_gc_secondary}


def compute(name, d):
    if '__' in name:
        fn, *args = name.split('__')
        if fn not in GENERAL:
            raise KeyError(f'no compute function {fn} in scripts/discoveries/figures.py')
        return GENERAL[fn](d, *args)
    if name in CHARTS:
        return CHARTS[name](d)
    if name not in FIGURES:
        raise KeyError(f'no compute function {name} in scripts/discoveries/figures.py')
    return FIGURES[name](d)


if __name__ == '__main__':
    d = Data(*(sys.argv[1:2] or []))
    print('as at', d.as_at, '·', len(d.rows), 'secondaries,', len(d.inspected), 'inspected,', len(d.matched), 'matched')
    for k, f in sorted(FIGURES.items()):
        v = f(d)
        print(f'{k:16} {v["value"] if v["value"] is None else round(v["value"], 2)!s:>8}  n={v["n"]}')
    for k, f in CHARTS.items():
        print(k, json.dumps(f(d)))
