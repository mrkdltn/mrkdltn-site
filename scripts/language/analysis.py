#!/usr/bin/env python3
"""Report Language: the pre-registered analysis of how Ofsted writes report cards.

Implements docs/report-language/plan.md (28 November 2026) and its Amendment 1, exactly as written; where the plan
left a choice open, the choice made is stated here and in docs/report-language/results.md under "Deviations and
judgement calls".

  Analysis 1  distinctive language by grade, within each area         run
  Analysis 2  toolkit echo                                              run
  Analysis 3  next-steps themes                                         run (frozen lexicon v1; validation, figures)
  Analysis 4  length, reading level and the deprivation comparison     run
  Analysis 5  phrase shares over time                                   run
  Analysis 6  the toolkit map                                           run (sample, labels, threshold, figures)
  Analysis 7  words against data                                        run (frozen lexicons v1; secondaries only)

Inputs, all outside the repository: the parsed, name-stripped corpus (../mrkdltn-data/report-language/parsed/), Ofsted's
management information (../mrkdltn-data/grades-context/mi/mi_latest.csv), DfE SEN January 2026 (sen_slim_2026.csv),
GIAS (urban/rural fallback) and the two toolkit PDFs (../mrkdltn-data/toolkit/, read by toolkit.py).

Outputs: aggregate tables only, in data/derived/report_language/. No URN, no school-level row, and any count from 1 to
9 is written "<10" (with the share it would reveal left blank). The labelling sample for analysis 6 holds sentence
text, so it is written outside the repository (../mrkdltn-data/report-language/audit/), with its key to URNs kept in a
separate file there.

  python3 scripts/language/analysis.py sample      # analysis 6: draw the 200 sentences to label (no scores shown)
  python3 scripts/language/analysis.py run         # analyses 1, 2, 4, 5 and 6 on the full corpus
  python3 scripts/language/analysis.py run --only 1 2
  python3 scripts/language/analysis.py validation-sample   # analyses 3 and 7: the fresh samples (outside the repository)
  python3 scripts/language/analysis.py validation-score    # precision and recall against the hand labels
  python3 scripts/language/analysis.py validation-check    # the 30 + 30 items for Mark
  python3 scripts/language/analysis.py run --only 3 7      # analyses 3 and 7 on the full corpus

No language model reads, summarises or classifies any text here: every figure comes from this code.
"""
import argparse, collections, csv, gzip, json, math, os, re, sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import toolkit as tk  # noqa: E402

REPO = os.path.normpath(os.path.join(HERE, '..', '..'))
DATA = os.path.normpath(os.path.join(REPO, '..', 'mrkdltn-data'))
CORPUS = os.path.join(DATA, 'report-language')
CONTEXT = os.path.join(DATA, 'grades-context')
OUT = os.path.join(REPO, 'data', 'derived', 'report_language')
AUDIT = os.path.join(CORPUS, 'audit')

SEED = 20261128
BOOT = 2000
AREAS = tk.AREAS
AREA_LABEL = {'inclusion': 'Inclusion', 'curriculum_teaching': 'Curriculum and teaching', 'achievement': 'Achievement',
              'attendance_behaviour': 'Attendance and behaviour', 'personal_development': 'Personal development and wellbeing',
              'early_years': 'Early years', 'post16': 'Post-16 provision', 'leadership_governance': 'Leadership and governance'}
GRADES = ['Exceptional', 'Strong standard', 'Expected standard', 'Needs attention', 'Urgent improvement']
PHASES = ['Primary', 'Secondary', 'Special', 'Nursery', 'Alternative provision']
COMPARISONS = [(GRADES[i], GRADES[i + 1]) for i in range(4)]
MI_CSV = os.path.join(CONTEXT, 'mi', 'mi_latest.csv')
MI_SHA = '791eea96966d6a2de0a50687abd9ea74fd3fa32be6396c8c56ea7bf0f111d53f'
SEN_CSV = os.path.join(CONTEXT, 'sen', 'sen_slim_2026.csv')
IDACI_COL = 'The income deprivation affecting children index (IDACI) quintile'
CUTOFF = '2026-11-28'

# ---------------------------------------------------------------------------------------------------------------
# Preparing the text (plan, "Preparing the text"; the same for every analysis)
# ---------------------------------------------------------------------------------------------------------------

STOPWORDS = frozenset(l.strip() for l in open(os.path.join(HERE, 'stopwords.txt'), encoding='utf-8')
                      if l.strip() and not l.startswith('#'))
assert len(STOPWORDS) == 179, len(STOPWORDS)

PLACEHOLDER = re.compile(r'\[[^\[\]]{1,40}\]')
GRADE_WORDS = re.compile(r"\b(?:exceptional|strong standard|expected standard|needs attention|urgent improvement)\b")
NUMBER = re.compile(r'\d+(?:[.,:/]\d+)*')
LETTER = r"a-zß-öø-ɏ#"
TOKEN = re.compile(rf"and/or|[{LETTER}]+(?:['-][{LETTER}]+)*(?:(?<=s)'(?![{LETTER}]))?")
ABBREV = re.compile(r'(?:\b(?:e\.g|i\.e|etc|St|Mr|Mrs|Ms|Dr|No|vs|approx)\.|\b[A-Z]\.)$')
BOUNDARY = '\x00'


def normalise(text):
    """Step 1, before lower-casing: curly quotes and dashes normalised; a line-broken hyphenated word re-joined."""
    t = text.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"').replace(' ', ' ')
    t = re.sub(r'(?<=[A-Za-z])-\s*\n\s*(?=[a-z])', '-', t)
    t = re.sub(r'\s*[–—−]\s*', ' - ', t)
    return re.sub(r'\s+', ' ', t).strip()


def split_sentences(text):
    """Sentences of one paragraph (already normalised): a break after . ! or ? followed by a capital, a digit, a quote
    or a placeholder, unless the full stop ends a common abbreviation or an initial."""
    out, start = [], 0
    for m in re.finditer(r'[.!?]["\')]*\s+(?=["\'(\[A-Z0-9])', text):
        head = text[start:m.start() + 1]
        if ABBREV.search(head.rstrip('"\')')):
            continue
        out.append(text[start:m.end()].strip())
        start = m.end()
    if text[start:].strip():
        out.append(text[start:].strip())
    return out


def _tokens(chunk):
    toks = []
    for t in TOKEN.findall(chunk):
        if set(t) <= {'#', '-', "'"}:
            t = '#'
        toks.append(t)
    return toks


def prepare_sentence(sentence):
    """One sentence -> (segments, all_tokens).

    segments: lists of tokens after steps 1 to 3; a placeholder or a grade word is removed and also ends a segment, so
    no phrase or run is formed across the gap it leaves. all_tokens: the same sentence with the grade words kept (they
    are words the inspector wrote), used only for the length and reading-level descriptives."""
    s = normalise(sentence).lower()
    s = PLACEHOLDER.sub(BOUNDARY, s)
    s = NUMBER.sub('#', s)
    all_tokens = _tokens(s.replace(BOUNDARY, ' '))
    s = GRADE_WORDS.sub(BOUNDARY, s)
    segments = [seg for seg in (_tokens(c) for c in s.split(BOUNDARY)) if seg]
    return segments, all_tokens


def prepare_paragraphs(paragraphs):
    """A section's paragraphs -> list of sentences, each {'text', 'segments', 'all'}."""
    out = []
    for p in paragraphs:
        for s in split_sentences(normalise(p)):
            segs, allt = prepare_sentence(s)
            out.append({'text': s, 'segments': segs, 'all': allt})
    return out


def phrases(segments, nmax=3):
    """Step 4: the set of 1- to 3-token phrases within the segments of a sentence, without stop-word-only phrases."""
    out = set()
    for seg in segments:
        L = len(seg)
        for n in range(1, nmax + 1):
            for i in range(L - n + 1):
                g = seg[i:i + n]
                if all(t in STOPWORDS for t in g):
                    continue
                out.add(' '.join(g))
    return out


def ngrams(segments, n=5):
    return {tuple(seg[i:i + n]) for seg in segments for i in range(len(seg) - n + 1)}


# ---------------------------------------------------------------------------------------------------------------
# Readability (analysis 4 descriptives)
# ---------------------------------------------------------------------------------------------------------------

_CMU = None


def _cmu():
    global _CMU
    if _CMU is None:
        try:
            import cmudict  # The CMU Pronouncing Dictionary (Carnegie Mellon University), via the cmudict package
            _CMU = cmudict.dict()
        except ImportError:
            _CMU = {}
    return _CMU


def syllables_rule(word):
    """Fallback rule for words not in the CMU dictionary: groups of consecutive vowels (a e i o u y), less a silent
    final e (but not a final consonant + le), less a final -es (not after s, x, z, c, g or h) or -ed (not after t or
    d), which add no syllable; at least one."""
    w = re.sub(r"[^a-z]", '', word.lower())
    if not w:
        return 0
    if len(w) <= 3:
        return 1
    w2 = re.sub(r'(?:[^laeiouysxzcgh]es|[^laeiouytd]ed|[^laeiouy]e)$', '', w)
    w2 = re.sub(r'^y', '', w2)
    n = len(re.findall(r'[aeiouy]+', w2))
    return max(1, n)


def syllables(word):
    """Syllables in a word: from the CMU Pronouncing Dictionary (count of vowel phonemes, first pronunciation) where the
    word is listed, else syllables_rule. Hyphenated words are counted part by part."""
    parts = [p for p in re.split(r"[-]", word.lower().replace("'", '')) if p]
    total = 0
    d = _cmu()
    for p in parts:
        if p in d and d[p]:
            total += sum(1 for ph in d[p][0] if ph[-1].isdigit())
        else:
            total += syllables_rule(p)
    return total


def readability(sentences):
    """Words, sentences, mean sentence length, Flesch reading ease and Flesch-Kincaid grade for a section.
    Words are letter tokens (numbers are left out of the counts)."""
    words = [t for s in sentences for t in s['all'] if t != '#' and t != 'and/or']
    nw, ns = len(words), sum(1 for s in sentences if any(t != '#' for t in s['all']))
    if not nw or not ns:
        return None
    syl = sum(syllables(w) for w in words)
    wps, spw = nw / ns, syl / nw
    return {'words': nw, 'sentences': ns, 'sentence_length': wps,
            'flesch': 206.835 - 1.015 * wps - 84.6 * spw, 'fk_grade': 0.39 * wps + 11.8 * spw - 15.59}


# ---------------------------------------------------------------------------------------------------------------
# Hedging (analysis 4; the list frozen in the plan)
# ---------------------------------------------------------------------------------------------------------------

HEDGES = ['however', 'although', 'though', 'while', 'whereas', 'not yet', 'not always', 'not consistently', 'inconsistent',
          'inconsistently', 'variable', 'variably', 'at times', 'sometimes', 'occasionally', 'in some', 'some pupils',
          'some staff', 'some subjects', 'a few', 'a small number', 'beginning to', 'starting to', 'still developing',
          'less secure', 'less well', 'not as well', 'not as strong', 'in places', 'on occasion', 'on the whole', 'mostly',
          'most pupils', 'largely', 'generally', 'typically']
_HEDGE_TOK = sorted((tuple(h.split()) for h in HEDGES), key=lambda h: -len(h))


def hedge_count(segments):
    """Hedges in a list of segments: whole tokens, longest match first, no overlaps. 'while' counts only as a
    conjunction, so not after 'a', 'the', 'worth' or 'little' ('a while', 'worth while')."""
    n = 0
    for seg in segments:
        i = 0
        while i < len(seg):
            hit = None
            for h in _HEDGE_TOK:
                if tuple(seg[i:i + len(h)]) == h:
                    if h == ('while',) and i > 0 and seg[i - 1] in ('a', 'the', 'worth', 'little'):
                        continue
                    hit = h
                    break
            if hit:
                n += 1
                i += len(hit)
            else:
                i += 1
    return n


# ---------------------------------------------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------------------------------------------

def load_corpus(corpus=CORPUS):
    """Every parsed report card: phase, date, month, toolkit version, grades and prepared area sections."""
    idx = {r['urn']: r for r in csv.DictReader(open(os.path.join(corpus, 'parsed', 'index.csv'), encoding='utf-8'))
           if r['status'] == 'parsed'}
    reports = []
    for u in sorted(idx, key=int):
        rec = json.load(open(os.path.join(corpus, 'parsed', u + '.json'), encoding='utf-8'))
        date = idx[u]['pdf_date'] or idx[u]['insp_date']
        r = {'urn': u, 'phase': rec['phase'], 'date': date, 'month': rec['insp_month'], 'version': tk.version_for(date),
             'grades': rec['grades'], 'sections': {}}
        for a in AREAS:
            sec = rec['sections'].get(a)
            g = rec['grades'].get(a)
            if sec and g in GRADES:
                r['sections'][a] = {'grade': g, 'sentences': prepare_paragraphs(sec['paragraphs'])}
        reports.append(r)
    return reports


def sha256(path):
    import hashlib
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def load_context():
    """IDACI quintile (MI), school size (MI), SEN support and EHC plan shares and urban/rural (DfE SEN, January 2026,
    with GIAS as fallback for urban/rural), by URN."""
    if sha256(MI_CSV) != MI_SHA:
        raise SystemExit('MI file does not match the pre-registered checksum')
    ctx = {}
    for r in csv.DictReader(open(MI_CSV, encoding='utf-8-sig')):
        q = r[IDACI_COL].strip()
        try:
            pupils = float(r['Total number of pupils'])
        except ValueError:
            pupils = float('nan')
        ctx[r['URN']] = {'idaci': int(q) if q.isdigit() else None, 'laestab': r['LAESTAB'], 'pupils': pupils}
    sen = {r['laestab']: r for r in csv.DictReader(open(SEN_CSV, encoding='utf-8'))}
    gias = {}
    gdir = os.path.join(CONTEXT, 'gias')
    for f in sorted(os.listdir(gdir)):
        if f.startswith('edubase_') and f.endswith('.csv'):
            for r in csv.DictReader(open(os.path.join(gdir, f), encoding='cp1252')):
                gias[r['URN']] = r['UrbanRural (name)']
    for u, c in ctx.items():
        s = sen.get(c['laestab'])
        n = float(s['pupils_jan26']) if s and s['pupils_jan26'] not in ('', 'z', 'x') else float('nan')
        c['sensup'] = 100 * float(s['sensup_n']) / n if s and n > 0 else float('nan')
        c['ehc'] = 100 * float(s['ehc_n']) / n if s and n > 0 else float('nan')
        ur = (s['urban_rural'] if s else '') or gias.get(u, '')
        c['urban'] = 1.0 if ur.lower().startswith('urban') else (0.0 if 'rural' in ur.lower() else float('nan'))
        if not (c['pupils'] > 0) and n > 0:
            c['pupils'] = n
    return ctx


# ---------------------------------------------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------------------------------------------

def sup(n):
    """A count for publication: 1 to 9 becomes '<10'."""
    return '<10' if 0 < n < 10 else str(int(n))


def fmt(x, d=4):
    return '' if x is None or (isinstance(x, float) and not math.isfinite(x)) else f'{x:.{d}f}'


def write_csv(name, rows, fields, gz=False):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + ('.gz' if gz else ''))
    op = (lambda p: gzip.open(p, 'wt', encoding='utf-8', newline='')) if gz else (lambda p: open(p, 'w', encoding='utf-8', newline=''))
    with op(path) as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
        w.writeheader()
        for r in rows:
            w.writerow(r)
    return path


def boot_mean(values, clusters, B=BOOT, seed=SEED):
    """Mean of values with a 95% percentile interval from B bootstrap resamples of clusters (reports)."""
    values = np.asarray(values, float)
    uniq, inv = np.unique(np.asarray(clusters), return_inverse=True)
    sums = np.bincount(inv, weights=values)
    cnts = np.bincount(inv).astype(float)
    k = len(uniq)
    rng = np.random.default_rng(seed)
    est = np.empty(B)
    for b in range(B):
        w = np.bincount(rng.integers(0, k, k), minlength=k)
        est[b] = (w @ sums) / (w @ cnts)
    return values.mean(), np.percentile(est, 2.5), np.percentile(est, 97.5)


def boot_diff(v1, c1, v0, c0, B=BOOT, seed=SEED):
    """Difference of means (group 1 minus group 0), resampling reports within each group; 95% percentile interval."""
    rng = np.random.default_rng(seed)
    parts = []
    for v, c in ((v1, c1), (v0, c0)):
        v = np.asarray(v, float)
        uniq, inv = np.unique(np.asarray(c), return_inverse=True)
        parts.append((np.bincount(inv, weights=v), np.bincount(inv).astype(float), len(uniq), v.mean()))
    est = np.empty(B)
    for b in range(B):
        m = []
        for sums, cnts, k, _ in parts:
            w = np.bincount(rng.integers(0, k, k), minlength=k)
            m.append((w @ sums) / (w @ cnts))
        est[b] = m[0] - m[1]
    return parts[0][3] - parts[1][3], np.percentile(est, 2.5), np.percentile(est, 97.5)


def section_segments(sec):
    return [seg for st in sec['sentences'] for seg in st['segments']]


def section_phrases(sec):
    """Phrases present in a section (presence, not frequency), formed within sentences."""
    out = set()
    for st in sec['sentences']:
        out |= phrases(st['segments'])
    return out


def sections(reports, areas=AREAS, phases=None):
    for r in reports:
        if phases and r['phase'] not in phases:
            continue
        for a in areas:
            if a in r['sections']:
                yield r, a, r['sections'][a]


# ---------------------------------------------------------------------------------------------------------------
# Analysis 1: distinctive language by grade, within each area (Monroe, Colaresi and Quinn 2008, eq. 22)
# ---------------------------------------------------------------------------------------------------------------

A1_RUNS = {'Primary and secondary': ('Primary', 'Secondary'), 'Primary': ('Primary',), 'Secondary': ('Secondary',)}
PRIORS = (1000, 250, 4000)
Z_LEAN, Z_SHOW = 3.29, 1.96
MIN_GRADE_SECTIONS, MIN_PHRASE_TOTAL, MIN_PHRASE_GRADE = 30, 20, 10


def log_odds(y_i, n_i, y_j, n_j, alpha_w, alpha0):
    """Weighted log-odds ratio with an informative Dirichlet prior and its z-score (Monroe et al. 2008, eq. 22)."""
    d = (np.log((y_i + alpha_w) / (n_i + alpha0 - y_i - alpha_w))
         - np.log((y_j + alpha_w) / (n_j + alpha0 - y_j - alpha_w)))
    var = 1.0 / (y_i + alpha_w) + 1.0 / (y_j + alpha_w)
    return d, d / np.sqrt(var)


def analysis1(reports):
    summary, rows, eligible = [], [], collections.defaultdict(set)
    for run, phases in A1_RUNS.items():
        for a in AREAS:
            secs = [(s['grade'], section_phrases(s)) for _, _, s in sections(reports, [a], phases)]
            n_by = collections.Counter(g for g, _ in secs)
            by = {g: collections.Counter() for g in GRADES}
            tot = collections.Counter()
            for g, ph in secs:
                by[g].update(ph)
                tot.update(ph)
            tot_sum = sum(tot.values())
            n_tok = {g: sum(by[g].values()) for g in GRADES}
            for hi, lo in COMPARISONS:
                row = {'run': run, 'area': AREA_LABEL[a], 'comparison': f'{hi} v {lo}',
                       'sections_higher': sup(n_by[hi]), 'sections_lower': sup(n_by[lo])}
                if n_by[hi] < MIN_GRADE_SECTIONS or n_by[lo] < MIN_GRADE_SECTIONS:
                    row['status'] = 'not run: fewer than 30 sections in a grade'
                    summary.append(row)
                    continue
                cand = sorted(w for w, c in tot.items() if c >= MIN_PHRASE_TOTAL and by[hi][w] >= MIN_PHRASE_GRADE
                              and by[lo][w] >= MIN_PHRASE_GRADE)
                yi = np.array([by[hi][w] for w in cand], float)
                yj = np.array([by[lo][w] for w in cand], float)
                share = np.array([tot[w] for w in cand], float) / tot_sum
                res = {}
                for a0 in PRIORS:
                    res[a0] = log_odds(yi, n_tok[hi], yj, n_tok[lo], a0 * share, a0)
                d, z = res[1000]
                lean = np.abs(z) >= Z_LEAN
                keep = {a0: int(np.sum(lean & (np.abs(res[a0][1]) >= Z_LEAN) & (np.sign(res[a0][1]) == np.sign(z))))
                        for a0 in (250, 4000)}
                row.update(status='run', eligible_phrases=len(cand), lean_higher=int(np.sum(z >= Z_LEAN)),
                           lean_lower=int(np.sum(z <= -Z_LEAN)), shown_1_96_to_3_29=int(np.sum((np.abs(z) >= Z_SHOW) & ~lean)),
                           kept_prior_250=keep[250], kept_prior_4000=keep[4000])
                summary.append(row)
                if run == 'Primary and secondary':
                    eligible[a].update(cand)
                for k, w in enumerate(cand):
                    zz = z[k]
                    reading = (f'leans towards {hi}' if zz >= Z_LEAN else f'leans towards {lo}' if zz <= -Z_LEAN
                               else 'shown, not described as distinctive' if abs(zz) >= Z_SHOW else '')
                    rows.append({'run': run, 'area': AREA_LABEL[a], 'comparison': f'{hi} v {lo}', 'phrase': w,
                                 'tokens': len(w.split()), 'sections_higher': int(yi[k]), 'sections_lower': int(yj[k]),
                                 'share_higher': fmt(yi[k] / n_by[hi]), 'share_lower': fmt(yj[k] / n_by[lo]),
                                 'log_odds': fmt(d[k]), 'z': fmt(zz, 3), 'z_prior_250': fmt(res[250][1][k], 3),
                                 'z_prior_4000': fmt(res[4000][1][k], 3), 'reading': reading})
    write_csv('a1_summary.csv', summary, ['run', 'area', 'comparison', 'sections_higher', 'sections_lower', 'status',
                                          'eligible_phrases', 'lean_higher', 'lean_lower', 'shown_1_96_to_3_29',
                                          'kept_prior_250', 'kept_prior_4000'])
    write_csv('a1_phrases.csv', rows, ['run', 'area', 'comparison', 'phrase', 'tokens', 'sections_higher', 'sections_lower',
                                       'share_higher', 'share_lower', 'log_odds', 'z', 'z_prior_250', 'z_prior_4000',
                                       'reading'], gz=True)
    return summary, rows, eligible


# ---------------------------------------------------------------------------------------------------------------
# Analysis 2: toolkit echo
# ---------------------------------------------------------------------------------------------------------------

FIRST3 = ('2025-12', '2026-01', '2026-02')
LAST3 = ('2026-07', '2026-09', '2026-10')


def toolkit_ngrams():
    """5-token runs in each version's text for each area, and the runs found in both versions (like-for-like)."""
    out = {}
    for v in tk.VERSIONS:
        for a, text in tk.area_text(v).items():
            g = set()
            for st in prepare_paragraphs(text.split('\n\n')):
                g |= ngrams(st['segments'])
            out[(v, a)] = g
    for a in AREAS:
        out[('both', a)] = out[('v1.1', a)] & out[('v2.0', a)]
    return out


def coverage(segments, grams, n=5):
    """Tokens of a section inside a run of n or more consecutive tokens that appears in grams."""
    covered = total = 0
    for seg in segments:
        total += len(seg)
        mark = [False] * len(seg)
        for i in range(len(seg) - n + 1):
            if tuple(seg[i:i + n]) in grams:
                for j in range(i, i + n):
                    mark[j] = True
        covered += sum(mark)
    return covered, total


def echo_measures(reports):
    """Per section: echo against the version in force, like-for-like, and both without stock phrasing."""
    tg = toolkit_ngrams()
    stock = {}
    for a in AREAS:
        c = collections.Counter()
        n = 0
        for _, _, s in sections(reports, [a]):
            n += 1
            c.update(ngrams(section_segments(s)))
        stock[a] = {g for g, k in c.items() if k > n / 2}
    rows = []
    for r, a, s in sections(reports):
        segs = section_segments(s)
        cf, t = coverage(segs, tg[(r['version'], a)])
        if not t:
            continue
        cl, _ = coverage(segs, tg[('both', a)])
        cfs, _ = coverage(segs, tg[(r['version'], a)] - stock[a])
        cls, _ = coverage(segs, tg[('both', a)] - stock[a])
        rows.append({'urn': r['urn'], 'area': a, 'grade': s['grade'], 'phase': r['phase'], 'month': r['month'],
                     'version': r['version'], 'in_force': 100 * cf / t, 'like_for_like': 100 * cl / t,
                     'in_force_no_stock': 100 * cfs / t, 'like_for_like_no_stock': 100 * cls / t})
    meta = {'toolkit_5grams': {f'{k[0]}|{k[1]}': len(v) for k, v in tg.items()},
            'stock_5grams': {a: len(v) for a, v in stock.items()}}
    return rows, meta


ECHO_MEASURES = ['in_force', 'like_for_like', 'in_force_no_stock', 'like_for_like_no_stock']


def analysis2(echo):
    out = []
    groupings = [('all', ()), ('area', ('area',)), ('area x grade', ('area', 'grade')), ('phase', ('phase',)),
                 ('phase x area', ('phase', 'area')), ('month', ('month',)), ('month x area', ('month', 'area')),
                 ('version', ('version',))]
    for name, keys in groupings:
        cells = collections.defaultdict(list)
        for e in echo:
            cells[tuple(e[k] for k in keys)].append(e)
        for key in sorted(cells, key=lambda k: tuple(_order(x) for x in k)):
            es = cells[key]
            row = {'grouping': name}
            for k, v in zip(keys, key):
                row[k] = AREA_LABEL.get(v, v)
            nrep = len({e['urn'] for e in es})
            row['sections'], row['reports'] = sup(len(es)), sup(nrep)
            if nrep >= 10:  # a cell is shown only with 10 or more reports
                for m in ECHO_MEASURES:
                    mean, lo, hi = boot_mean([e[m] for e in es], [e['urn'] for e in es])
                    row[m], row[m + '_lo'], row[m + '_hi'] = fmt(mean, 3), fmt(lo, 3), fmt(hi, 3)
            out.append(row)
    fields = ['grouping', 'area', 'grade', 'phase', 'month', 'version', 'sections', 'reports']
    for m in ECHO_MEASURES:
        fields += [m, m + '_lo', m + '_hi']
    write_csv('a2_echo.csv', out, fields)
    # the pre-set reading: like-for-like, last three complete months with inspections against the first three
    reading = {}
    for m in ('like_for_like', 'like_for_like_no_stock', 'in_force'):
        g1 = [e for e in echo if e['month'] in LAST3]
        g0 = [e for e in echo if e['month'] in FIRST3]
        d, lo, hi = boot_diff([e[m] for e in g1], [e['urn'] for e in g1], [e[m] for e in g0], [e['urn'] for e in g0])
        clear = abs(d) > 1 and (lo > 0 or hi < 0)
        reading[m] = {'first3_mean': float(np.mean([e[m] for e in g0])), 'last3_mean': float(np.mean([e[m] for e in g1])),
                      'difference_pp': d, 'lo': lo, 'hi': hi, 'sections_first3': len(g0), 'sections_last3': len(g1),
                      'reports_first3': len({e['urn'] for e in g0}), 'reports_last3': len({e['urn'] for e in g1}),
                      'reading': ('reports moved towards the toolkit wording' if clear and d > 0 else
                                  'reports moved away from the toolkit wording' if clear else 'no clear change')}
    return out, reading


def _order(x):
    if x in AREAS:
        return (0, AREAS.index(x))
    if x in GRADES:
        return (1, GRADES.index(x))
    if x in PHASES:
        return (2, PHASES.index(x))
    return (3, str(x))


# ---------------------------------------------------------------------------------------------------------------
# Analyses 3 and 7: validation samples for the frozen v1 lexicons (labelling-rules.md, second part)
# ---------------------------------------------------------------------------------------------------------------

import lexicons as LX  # noqa: E402

DEV_KEY = os.path.join(AUDIT, 'lexicon-dev-key.json')      # the development items used to draft v0 (excluded)
NS_N, RS_N = 100, 150
GRADE_TEXT = re.compile(r'\b(exceptional|strong standard|expected standard|needs attention|urgent improvement)\b', re.I)


def _raw_reports(corpus=CORPUS):
    idx = [r['urn'] for r in csv.DictReader(open(os.path.join(corpus, 'parsed', 'index.csv'), encoding='utf-8'))
           if r['status'] == 'parsed']
    for u in sorted(idx, key=int):
        yield u, json.load(open(os.path.join(corpus, 'parsed', u + '.json'), encoding='utf-8'))


def draw_validation():
    """Fresh random samples for analyses 3 and 7, after removing the development items. Writes the blind text (grade
    words replaced by "[grade]"), and separately the key (URN, position) and the lexicon's output, all outside the
    repository. Seeds: 20261128 + 3 (next steps) and 20261128 + 11 (results sentences)."""
    dev = json.load(open(DEV_KEY))
    dev_ns = {(u, i) for u, i in dev['next_steps']}
    dev_ach = set(dev['achievement'])
    items, rsent = [], []
    for u, rec in _raw_reports():
        s = rec['sections']
        for i, t in enumerate((s.get('next_steps') or {}).get('items') or []):
            if t and t.strip() and (u, i) not in dev_ns:
                items.append((u, i, t))
        if u not in dev_ach:
            paras = (s.get('achievement') or {}).get('paragraphs') or []
            for k, st in enumerate(LX.sentences(paras)):
                if LX.is_results_sentence(st):
                    rsent.append((u, k, st))
    ns = random_sample(items, NS_N, SEED + 3)
    rs = random_sample(rsent, RS_N, SEED + 11)
    out = {}
    for name, samp, f in (('ns', ns, lambda t: LX.classify_next_step(t)), ('rs', rs, lambda t: LX.sentence_direction(t))):
        blind = [{'id': f'{name.upper()}{j + 1:03d}', 'text': GRADE_TEXT.sub('[grade]', t)} for j, (_, _, t) in enumerate(samp)]
        key = [{'id': b['id'], 'urn': u, 'position': i} for b, (u, i, _) in zip(blind, samp)]
        lex = [{'id': b['id'], 'lexicon': ';'.join(f(t)) if name == 'ns' else f(t),
                'lexicon_no_trend': '' if name == 'ns' else LX.sentence_direction(t, trend=False)}
               for b, (_, _, t) in zip(blind, samp)]
        for suffix, rows in (('sample', blind), ('key', key), ('lexicon', lex)):
            path = os.path.join(AUDIT, f'validation-{name}-{suffix}.csv')
            with open(path, 'w', newline='', encoding='utf-8') as fh:
                w = csv.DictWriter(fh, fieldnames=list(rows[0]))
                w.writeheader()
                w.writerows(rows)
        out[name] = {'pool': len(items) if name == 'ns' else len(rsent), 'drawn': len(samp)}
    return out


VALID_NS = os.path.join(OUT, 'validation_ns_labels.csv')
VALID_RS = os.path.join(OUT, 'validation_rs_labels.csv')
DIRECTIONS = ['positive', 'negative', 'level', 'mixed', 'none']


def _pr(tp, fp, fn):
    return (tp / (tp + fp) if tp + fp else None), (tp / (tp + fn) if tp + fn else None)


def validation_score():
    """Precision and recall of the frozen v1 lexicons against the hand labels (labelling-rules.md, second part).
    Analysis 3: per theme, over the 100 items. Analysis 7: precision of the results lexicon (the share of selected
    sentences that are results sentences), and per direction, over the 150 sentences; a direction with precision
    under 0.8 is merged into 'mixed' (Amendment 1), and the merged classes are scored again."""
    lab = {r['id']: set(r['labels'].split(';')) for r in csv.DictReader(open(VALID_NS, encoding='utf-8'))}
    lex = {r['id']: set(r['lexicon'].split(';')) for r in csv.DictReader(open(os.path.join(AUDIT, 'validation-ns-lexicon.csv'), encoding='utf-8'))}
    assert set(lab) == set(lex) and len(lab) == NS_N
    ns_rows = []
    for t in LX.THEME_ORDER + ['other']:
        tp = sum(1 for i in lab if t in lab[i] and t in lex[i])
        fp = sum(1 for i in lab if t not in lab[i] and t in lex[i])
        fn = sum(1 for i in lab if t in lab[i] and t not in lex[i])
        pr, rc = _pr(tp, fp, fn)
        ns_rows.append({'theme': t, 'label': LX.THEMES[t]['label'] if t in LX.THEMES else 'Other (no theme)',
                        'hand': tp + fn, 'lexicon': tp + fp, 'both': tp, 'precision': fmt(pr, 3), 'recall': fmt(rc, 3),
                        'warning': 'precision below 0.8' if pr is not None and pr < 0.8 else ''})
    exact = sum(1 for i in lab if lab[i] == lex[i])
    write_csv('a3_validation.csv', ns_rows, list(ns_rows[0]))

    hl = {r['id']: r for r in csv.DictReader(open(VALID_RS, encoding='utf-8'))}
    lx = {r['id']: r for r in csv.DictReader(open(os.path.join(AUDIT, 'validation-rs-lexicon.csv'), encoding='utf-8'))}
    assert set(hl) == set(lx) and len(hl) == RS_N
    is_res = sum(1 for r in hl.values() if r['results_sentence'] == 'yes')

    def score(mapping, key='lexicon'):
        rows = []
        classes = sorted({mapping(d) for d in DIRECTIONS}, key=lambda d: DIRECTIONS.index(d))
        for d in classes:
            tp = sum(1 for i in hl if mapping(hl[i]['direction']) == d and mapping(lx[i][key]) == d)
            fp = sum(1 for i in hl if mapping(hl[i]['direction']) != d and mapping(lx[i][key]) == d)
            fn = sum(1 for i in hl if mapping(hl[i]['direction']) == d and mapping(lx[i][key]) != d)
            pr, rc = _pr(tp, fp, fn)
            rows.append({'direction': d, 'hand': tp + fn, 'lexicon': tp + fp, 'both': tp, 'precision': pr, 'recall': rc})
        agree = sum(1 for i in hl if mapping(hl[i]['direction']) == mapping(lx[i][key]))
        return rows, agree
    rows, agree = score(lambda d: d)
    merged = [r['direction'] for r in rows if r['direction'] in ('positive', 'negative', 'level')
              and (r['precision'] is None or r['precision'] < 0.8)]
    out = [dict(r, stage='as frozen', precision=fmt(r['precision'], 3), recall=fmt(r['recall'], 3)) for r in rows]
    if merged:
        m_rows, m_agree = score(lambda d: 'mixed' if d in merged else d)
        out += [dict(r, stage='after merging ' + ', '.join(merged) + ' into mixed', precision=fmt(r['precision'], 3),
                     recall=fmt(r['recall'], 3)) for r in m_rows]
    else:
        m_agree = agree
    write_csv('a7_validation.csv', out, ['stage', 'direction', 'hand', 'lexicon', 'both', 'precision', 'recall'])
    # exploratory: the version without trend words, against the same labels
    nt_rows, nt_agree = score(lambda d: d, key='lexicon_no_trend')
    # among sentences that are results sentences by hand
    return {'a3': {'items': NS_N, 'exact_match': exact, 'themes': ns_rows,
                   'other_share_lexicon': sum(1 for i in lex if lex[i] == {'other'}) / NS_N,
                   'other_share_hand': sum(1 for i in lab if lab[i] == {'other'}) / NS_N},
            'a7': {'sentences': RS_N, 'results_sentence_precision': is_res / RS_N, 'direction_agreement': agree / RS_N,
                   'directions': [{k: (fmt(v, 3) if isinstance(v, float) else v) for k, v in r.items()} for r in rows],
                   'merged_into_mixed': merged, 'agreement_after_merge': m_agree / RS_N,
                   'no_trend_exploratory': {'agreement': nt_agree / RS_N,
                                            'directions': [{k: (fmt(v, 3) if isinstance(v, float) else v) for k, v in r.items()} for r in nt_rows]}}}


CHECK_NS = os.path.join(REPO, 'docs', 'report-language', 'check-for-mark-next-steps.md')
CHECK_RS = os.path.join(REPO, 'docs', 'report-language', 'check-for-mark-results.md')


def write_validation_checks(n=30):
    """30 labelled items from each validation sample, drawn with seed 20261128, for Mark to check: the blind text and
    the hand label only (no school, grade, phase, month, results or lexicon output)."""
    out = {}
    for name, path, labels in (('ns', CHECK_NS, VALID_NS), ('rs', CHECK_RS, VALID_RS)):
        samp = list(csv.DictReader(open(os.path.join(AUDIT, f'validation-{name}-sample.csv'), encoding='utf-8')))
        lab = {r['id']: r for r in csv.DictReader(open(labels, encoding='utf-8'))}
        pick = sorted(int(i) for i in np.random.default_rng(SEED).choice(len(samp), n, replace=False))
        if name == 'ns':
            L = ['# For Mark to check: 30 labelled next-steps items', '',
                 'These are 30 of the 100 next-steps items labelled by hand to validate the frozen theme lexicon '
                 '(`next-steps-lexicon-v1.md`, analysis 3), drawn at random with seed 20261128. Each was labelled from its '
                 'text alone, under the second part of `labelling-rules.md`, without its school, grades, phase, month or '
                 'deprivation in view, and before the lexicon was run on it. The text is as parsed, with names already '
                 'removed and grade words shown as "[grade]".', '',
                 'For each, please mark whether you agree with the themes. Where you disagree, the themes you would add or '
                 'remove are enough. The agreement rate goes into the results.', '',
                 'Themes: ' + '; '.join(f'{i + 1}. {LX.THEMES[t]["label"]}' for i, t in enumerate(LX.THEME_ORDER)) + '.', '']
        else:
            L = ['# For Mark to check: 30 labelled results sentences', '',
                 'These are 30 of the 150 results sentences labelled by hand to validate the frozen results and direction '
                 'lexicons (`results-lexicon-v1.md`, analysis 7), drawn at random with seed 20261128. Each was labelled from '
                 'the sentence alone, under the second part of `labelling-rules.md`, without its school, grades, phase, '
                 'month or results in view, and before the lexicon was run on it. The text is as parsed, with names '
                 'already removed and grade words shown as "[grade]" (so "the [grade]" in a key stage 2 sentence is the '
                 'expected standard).', '',
                 'Two labels for each: whether the sentence refers to published results, and its direction about them '
                 '(positive, negative, level, mixed, or none). Please mark whether you agree; where you disagree, your '
                 'label is enough. The agreement rate goes into the results.', '']
        for k, i in enumerate(pick, 1):
            sm = samp[i]
            r = lab[sm['id']]
            L += [f'## {k}. {sm["id"]}', '', f'> {sm["text"]}', '']
            if name == 'ns':
                th = r['labels'].split(';')
                L.append('**Themes:** ' + ('; '.join(LX.THEMES[t]['label'] for t in th) if th != ['other'] else 'other (no theme)'))
            else:
                L.append(f'**Results sentence:** {r["results_sentence"]}. **Direction:** {r["direction"]}.')
            if r['note']:
                L += ['', f'*Note:* {r["note"]}.']
            L += ['', 'Agree? yes / no. If no, my label: ____', '']
        open(path, 'w', encoding='utf-8').write('\n'.join(L))
        out[name] = [samp[i]['id'] for i in pick]
    return out


def random_sample(pool, n, seed):
    import random
    return random.Random(seed).sample(pool, n)


# ---------------------------------------------------------------------------------------------------------------
# Analysis 3: next-steps themes (frozen lexicon v1, docs/report-language/next-steps-lexicon-v1.md)
# ---------------------------------------------------------------------------------------------------------------

NEXT_STEPS_LEXICON = os.path.join(REPO, 'docs', 'report-language', 'next-steps-lexicon-v1.md')
Z95 = 1.959963984540054


def wilson(k, n, z=Z95):
    if n <= 0:
        return None, None
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return max(0.0, c - h), min(1.0, c + h)


def share_row(k, n):
    """A count and its share for publication: a group under 10, or a count from 1 to 9, is shown as '<10' and its
    share and interval left blank (as everywhere in these results)."""
    if n < 10:
        return {'reports': sup(n), 'carrying': '', 'share': '', 'lo': '', 'hi': ''}
    lo, hi = wilson(k, n)
    if 0 < k < 10:
        return {'reports': str(n), 'carrying': '<10', 'share': '', 'lo': '', 'hi': ''}
    return {'reports': str(n), 'carrying': str(k), 'share': fmt(k / n), 'lo': fmt(lo), 'hi': fmt(hi)}


def lowest_grade(grades):
    gs = [grades[a] for a in AREAS if grades.get(a) in GRADES]
    return max(gs, key=GRADES.index) if gs else None


def below_expected(grades):
    n = sum(1 for a in AREAS if grades.get(a) in ('Needs attention', 'Urgent improvement'))
    return '2 or more' if n >= 2 else str(n)


def analysis3(classify=None, warn=None):
    """The plan's figures: the share of reports carrying each theme (a report carries a theme if any of its items
    does), (a) by the report's lowest area grade and (b) by the number of areas below Expected standard (0, 1, 2 or
    more), for all phases and each phase, with Wilson 95% intervals; cells under 10 shown as '<10'."""
    classify = classify or LX.classify_next_step
    if LX.LEXICON_VERSION != 'v1' or not os.path.exists(NEXT_STEPS_LEXICON):
        raise SystemExit('analysis 3 runs only on the frozen v1 lexicon')
    warn = warn or {}
    reps, no_items, item_n, item_other = [], 0, 0, 0
    item_counts = collections.Counter()
    for u, rec in _raw_reports():
        its = [t for t in ((rec['sections'].get('next_steps') or {}).get('items') or []) if t and t.strip()]
        if not its:
            no_items += 1
            continue
        th = set()
        for t in its:
            c = classify(t)
            item_n += 1
            item_counts.update(c)
            item_other += c == ['other']
            th.update(c)
        reps.append({'phase': rec['phase'], 'lowest': lowest_grade(rec['grades']), 'below': below_expected(rec['grades']),
                     'themes': th - {'other'} if th != {'other'} else {'other'}, 'items': len(its)})
    themes = LX.THEME_ORDER + ['other']
    rows = []
    for by, levels in (('lowest area grade', GRADES), ('areas below Expected standard', ['0', '1', '2 or more'])):
        key = 'lowest' if by.startswith('lowest') else 'below'
        for ph in ['All phases'] + PHASES:
            pool = [r for r in reps if ph == 'All phases' or r['phase'] == ph]
            for lv in ['All'] + levels:
                grp = [r for r in pool if lv == 'All' or r[key] == lv]
                if lv == 'All' and by != 'lowest area grade':
                    continue           # the 'All' row is written once, under the first grouping
                for t in themes:
                    k = sum(1 for r in grp if t in r['themes'])
                    rows.append(dict({'grouping': by if lv != 'All' else 'all reports', 'phase': ph, 'level': lv, 'theme': t,
                                      'theme_label': LX.THEMES[t]['label'] if t in LX.THEMES else 'Other (no theme)',
                                      'warning': warn.get(t, '')}, **share_row(k, len(grp))))
    write_csv('a3_themes.csv', rows, ['grouping', 'phase', 'level', 'theme', 'theme_label', 'reports', 'carrying', 'share',
                                      'lo', 'hi', 'warning'])
    items = [{'theme': t, 'theme_label': LX.THEMES[t]['label'] if t in LX.THEMES else 'Other (no theme)',
              'items': sup(item_counts[t]), 'share_of_items': fmt(item_counts[t] / item_n) if item_counts[t] >= 10 else ''}
             for t in themes]
    write_csv('a3_items.csv', items, ['theme', 'theme_label', 'items', 'share_of_items'])
    return {'reports_with_items': len(reps), 'reports_without_items': no_items, 'items': item_n,
            'items_other': item_other, 'items_other_share': item_other / item_n,
            'by_phase': dict(collections.Counter(r['phase'] for r in reps)),
            # context for reading the shares: reports with lower grades list more next steps
            'items_per_report_by_lowest_grade': {g: round(float(np.mean([r['items'] for r in reps if r['lowest'] == g])), 2)
                                                 for g in GRADES if sum(1 for r in reps if r['lowest'] == g) >= 10},
            'themes_per_report_by_lowest_grade': {g: round(float(np.mean([len(r['themes'] - {'other'}) for r in reps if r['lowest'] == g])), 2)
                                                  for g in GRADES if sum(1 for r in reps if r['lowest'] == g) >= 10}}


# ---------------------------------------------------------------------------------------------------------------
# Analysis 4: length, reading level and the deprivation comparison
# ---------------------------------------------------------------------------------------------------------------

SMALLEST = {'log_words': 5.0, 'hedges_per_100': 0.2, 'echo_like_for_like': 1.0}


def section_measures(reports, echo):
    e_by = {(e['urn'], e['area']): e for e in echo}
    rows = []
    for r, a, s in sections(reports):
        rd = readability(s['sentences'])
        if not rd:
            continue
        segs = section_segments(s)
        ntok = sum(len(x) for x in segs)
        e = e_by.get((r['urn'], a))
        rows.append(dict(rd, urn=r['urn'], area=a, grade=s['grade'], phase=r['phase'], month=r['month'],
                         hedges_per_100=100 * hedge_count(segs) / ntok if ntok else float('nan'),
                         echo_like_for_like=e['like_for_like'] if e else float('nan')))
    return rows


def analysis4_descriptives(meas):
    out = []
    cells = collections.defaultdict(list)
    for m in meas:
        for ph in ('All phases', m['phase']):
            cells[(m['area'], m['grade'], ph)].append(m)
    for key in sorted(cells, key=lambda k: (AREAS.index(k[0]), GRADES.index(k[1]), (['All phases'] + PHASES).index(k[2]))):
        ms = cells[key]
        row = {'area': AREA_LABEL[key[0]], 'grade': key[1], 'phase': key[2], 'sections': sup(len(ms))}
        if len(ms) >= 10:
            for v in ('words', 'sentences', 'sentence_length', 'flesch', 'fk_grade', 'hedges_per_100'):
                x = np.array([m[v] for m in ms], float)
                q1, med, q3 = np.percentile(x, [25, 50, 75])
                row[v + '_median'], row[v + '_q1'], row[v + '_q3'] = fmt(med, 2), fmt(q1, 2), fmt(q3, 2)
        out.append(row)
    fields = ['area', 'grade', 'phase', 'sections']
    for v in ('words', 'sentences', 'sentence_length', 'flesch', 'fk_grade', 'hedges_per_100'):
        fields += [v + '_median', v + '_q1', v + '_q3']
    write_csv('a4_descriptives.csv', out, fields)
    return out


def _fit(df, y, formula_rhs, dep='dep'):
    import statsmodels.formula.api as smf
    d = df.dropna(subset=[y]).copy()
    groups = d['urn'].astype('category').cat.codes
    m = smf.ols(f'{y} ~ {dep} + {formula_rhs}', data=d).fit(cov_type='cluster', cov_kwds={'groups': groups})
    b, se = m.params[dep], m.bse[dep]
    lo, hi = m.conf_int().loc[dep]
    return {'estimate': b, 'se': se, 'lo': lo, 'hi': hi, 'p': m.pvalues[dep], 'sections': int(m.nobs),
            'reports': int(d['urn'].nunique()), 'reports_dep': int(d.loc[d[dep] == 1, 'urn'].nunique()),
            'reports_ref': int(d.loc[d[dep] == 0, 'urn'].nunique())}


def _scale(res, y):
    """Length on the percentage scale (exp(b) - 1); the others as they are."""
    if y == 'log_words':
        return {k: (100 * (math.exp(res[k]) - 1) if k in ('estimate', 'lo', 'hi') else res[k]) for k in res}
    return dict(res)


def reading_for(res, y, p_adj):
    s = SMALLEST[y]
    if p_adj < 0.05 and abs(res['estimate']) > s:
        return 'written differently'
    if res['lo'] > -s and res['hi'] < s:
        return 'no meaningful difference'
    return 'inconclusive'


def holm(ps):
    order = sorted(range(len(ps)), key=lambda i: ps[i])
    adj, run = [0.0] * len(ps), 0.0
    for rank, i in enumerate(order):
        run = max(run, min(1.0, (len(ps) - rank) * ps[i]))
        adj[i] = run
    return adj


def analysis4_model(meas, ctx):
    import pandas as pd
    df = pd.DataFrame(meas)
    df = df[df['phase'].isin(['Primary', 'Secondary'])].copy()
    df['idaci'] = df['urn'].map(lambda u: (ctx.get(u) or {}).get('idaci'))
    no_q = df.loc[df['idaci'].isna(), 'urn'].nunique()
    df['log_words'] = np.log(df['words'])
    for k in ('pupils', 'sensup', 'ehc', 'urban'):
        df[k] = df['urn'].map(lambda u: (ctx.get(u) or {}).get(k, float('nan')))
    df['log_pupils'] = np.log(df['pupils'].where(df['pupils'] > 0))
    outcomes = ['log_words', 'hedges_per_100', 'echo_like_for_like']
    main_rhs = 'C(area) * C(grade) + C(phase) * C(area) + C(month)'
    results = {'reports_without_quintile_pri_sec': int(no_q)}

    def sample(lo_q, hi_q):
        d = df[df['idaci'].isin(lo_q + hi_q)].copy()
        d['dep'] = d['idaci'].isin(hi_q).astype(int)
        return d

    head = sample([1], [5])
    rows = []
    fits = {y: _fit(head, y, main_rhs) for y in outcomes}
    padj = holm([fits[y]['p'] for y in outcomes])
    for y, pa in zip(outcomes, padj):
        sc = _scale(fits[y], y)
        rows.append(dict(sc, analysis='headline', outcome=y, area='All areas', p_holm=pa, reading=reading_for(sc, y, pa)))
    results['headline'] = rows[:]
    # sensitivity runs (reported in full; they do not change the headline reading)
    for a in AREAS:
        d = head[head['area'] == a]
        if d['dep'].nunique() < 2 or d['urn'].nunique() < 30:
            continue
        for y in outcomes:
            try:
                sc = _scale(_fit(d, y, 'C(grade) + C(phase) + C(month)'), y)
            except Exception as ex:  # noqa: BLE001
                rows.append({'analysis': 'by area', 'outcome': y, 'area': AREA_LABEL[a], 'reading': f'not estimable: {ex}'})
                continue
            rows.append(dict(sc, analysis='by area', outcome=y, area=AREA_LABEL[a]))
    adj = head.dropna(subset=['log_pupils', 'sensup', 'ehc', 'urban'])
    for y in outcomes:
        sc = _scale(_fit(adj, y, main_rhs + ' + log_pupils + sensup + ehc + urban'), y)
        rows.append(dict(sc, analysis='adding size, SEN support, EHC plans, urban/rural', outcome=y, area='All areas'))
    wide = sample([1, 2], [4, 5])
    for y in outcomes:
        sc = _scale(_fit(wide, y, main_rhs), y)
        rows.append(dict(sc, analysis='fifths 1-2 v 4-5', outcome=y, area='All areas'))
    # descriptive means in the two fifths (sections), for context
    for y in outcomes:
        for dv, lab in ((0, 'IDACI 1'), (1, 'IDACI 5')):
            x = head.loc[head['dep'] == dv, y].dropna()
            rows.append({'analysis': 'raw mean', 'outcome': y, 'area': 'All areas', 'group': lab,
                         'estimate': float(np.exp(x).mean()) if y == 'log_words' else float(x.mean()),
                         'sections': int(len(x)), 'reports': int(head.loc[head['dep'] == dv, 'urn'].nunique())})
    out = []
    for r in rows:
        o = {k: r.get(k, '') for k in ('analysis', 'outcome', 'area', 'group', 'reading')}
        for k in ('estimate', 'se', 'lo', 'hi', 'p', 'p_holm'):
            o[k] = fmt(r[k], 4) if isinstance(r.get(k), float) else r.get(k, '')
        for k in ('sections', 'reports', 'reports_dep', 'reports_ref'):
            o[k] = sup(r[k]) if isinstance(r.get(k), int) else ''
        out.append(o)
    write_csv('a4_deprivation.csv', out, ['analysis', 'outcome', 'area', 'group', 'estimate', 'se', 'lo', 'hi', 'p',
                                          'p_holm', 'reading', 'sections', 'reports', 'reports_dep', 'reports_ref'])
    results['rows'] = out
    return results


# ---------------------------------------------------------------------------------------------------------------
# Analysis 5: phrase shares over time
# ---------------------------------------------------------------------------------------------------------------

def month_labels(counts):
    """Months as shown: a month with fewer than 100 reports is merged with the following month (November 2025, with
    124, stands on its own); months after the last complete month before the cut-off (October 2026) are left out."""
    lab, pending = {}, []
    months = sorted(k for k in counts if k <= '2026-10')
    for k in months:
        pending.append(k)
        if counts[k] >= 100 or k == months[-1]:
            lab.update({x: '+'.join(pending) for x in pending})
            pending = []
    return lab


def analysis5(reports, eligible):
    counts = collections.Counter(r['month'] for r in reports)
    ml = month_labels(counts)
    labels = {m: ml.get(m) for m in counts}
    phases = A1_RUNS['Primary and secondary']
    out = []
    for a in AREAS:
        want = eligible.get(a, set())
        if not want:
            continue
        secs = [(labels[r['month']], (r['phase'], s['grade']), section_phrases(s) & want)
                for r, _, s in sections(reports, [a], phases) if labels[r['month']]]
        strata = collections.Counter(st for _, st, _ in secs)
        nstr = sum(strata.values())
        weights = {k: v / nstr for k, v in strata.items()}
        by_m = collections.defaultdict(list)
        for m, st, ph in secs:
            by_m[m].append((st, ph))
        for m in sorted(by_m):
            items = by_m[m]
            n_m = len(items)
            n_st = collections.Counter(st for st, _ in items)
            c = collections.Counter()
            c_st = collections.defaultdict(collections.Counter)
            for st, ph in items:
                c.update(ph)
                c_st[st].update(ph)
            present = [k for k in weights if n_st.get(k)]
            wsum = sum(weights[k] for k in present)
            for w in sorted(want):
                k = c.get(w, 0)
                std = sum(weights[s] * c_st[s].get(w, 0) / n_st[s] for s in present) / wsum
                out.append({'area': AREA_LABEL[a], 'phrase': w, 'month': m,
                            'toolkit': 'v2.0' if m >= '2026-09' else 'v1.1', 'sections': sup(n_m),
                            'sections_with_phrase': sup(k), 'share': fmt(k / n_m) if k >= 10 else '',
                            'share_standardised': fmt(std) if k >= 10 else ''})
    write_csv('a5_phrase_months.csv', out, ['area', 'phrase', 'month', 'toolkit', 'sections', 'sections_with_phrase',
                                            'share', 'share_standardised'], gz=True)
    mrows = []
    for m in sorted(set(v for v in labels.values() if v)):
        mrows.append({'month': m, 'reports_all_phases': sup(sum(counts[k] for k in m.split('+'))),
                      'reports_primary_secondary': sup(sum(1 for r in reports if labels[r['month']] == m and r['phase'] in phases)),
                      'note': ('shown on its own: the first weeks of the framework' if m == '2025-11' else
                               'merged: a month with fewer than 100 reports joins the next' if '+' in m else ''),
                      'toolkit': 'v2.0' if m >= '2026-09' else 'v1.1'})
    write_csv('a5_months.csv', mrows, ['month', 'reports_all_phases', 'reports_primary_secondary', 'toolkit', 'note'])
    return out, mrows, labels


# ---------------------------------------------------------------------------------------------------------------
# Analysis 6: the toolkit map
# ---------------------------------------------------------------------------------------------------------------

K1, B = 1.2, 0.75
THRESH_PRECISION = 0.8
SAMPLE_N = 200


def content_tokens(segments):
    return [t for seg in segments for t in seg if t not in STOPWORDS]


class BM25:
    """Okapi BM25 over one area's standards in one toolkit version (k1 = 1.2, b = 0.75; idf = ln(1 + (N - n + 0.5) /
    (n + 0.5))). A query's score against a standard sums over the query's tokens, each counted as often as it occurs.
    score_norm divides by the score of the standard matched against itself."""

    def __init__(self, docs):
        self.docs = docs
        self.N = len(docs)
        tf = [collections.Counter(d) for d in docs]
        ln = np.array([len(d) for d in docs], float)
        avg = ln.mean() if self.N else 0.0
        df = collections.Counter(t for d in tf for t in d)
        self.w = {}
        for t, n in df.items():
            idf = math.log(1 + (self.N - n + 0.5) / (n + 0.5))
            f = np.array([d.get(t, 0) for d in tf], float)
            self.w[t] = idf * f * (K1 + 1) / (f + K1 * (1 - B + B * ln / avg))
        self.self_score = np.array([self.score(d)[i] for i, d in enumerate(docs)])

    def score(self, query):
        s = np.zeros(self.N)
        for t, qn in collections.Counter(query).items():
            w = self.w.get(t)
            if w is not None:
                s += qn * w
        return s

    def score_norm(self, query):
        return self.score(query) / np.where(self.self_score > 0, self.self_score, 1.0)


def standards_index():
    idx = {}
    for v in tk.VERSIONS:
        stds = tk.standards(v)
        for a in AREAS:
            rows = [s for s in stds if s['area'] == a]
            docs = [content_tokens(prepare_sentence(s['text'])[0]) for s in rows]
            idx[(v, a)] = (rows, BM25(docs), docs)
    return idx


def best_match(idx, version, area, tokens):
    rows, bm, _ = idx[(version, area)]
    s = bm.score_norm(tokens)
    if not len(s) or not tokens:
        return None, 0.0
    i = int(np.argmax(s))
    return rows[i]['standard_id'], float(s[i])


def all_sentences(reports):
    """Every area-section sentence, in a fixed order (URN, area order, position)."""
    for r in reports:
        for a in AREAS:
            if a in r['sections']:
                for k, st in enumerate(r['sections'][a]['sentences']):
                    yield r, a, k, st


def draw_sample(reports):
    """The 200 sentences to label (seed 20261128): text, area and toolkit version only. The key to URN, grade and
    month goes to a separate file, opened only after labelling."""
    pool = list(all_sentences(reports))
    rng = np.random.default_rng(SEED)
    pick = rng.choice(len(pool), SAMPLE_N, replace=False)
    os.makedirs(AUDIT, exist_ok=True)
    samp, key = [], []
    for j, i in enumerate(pick):
        r, a, k, st = pool[int(i)]
        sid = f'S{j + 1:03d}'
        samp.append({'sample_id': sid, 'set': 'threshold' if j < 100 else 'test', 'area': a, 'version': r['version'],
                     'text': st['text']})
        key.append({'sample_id': sid, 'urn': r['urn'], 'sentence_index': k, 'grade': r['sections'][a]['grade'],
                    'phase': r['phase'], 'month': r['month']})
    for name, rows in (('toolkit-map-sample.csv', samp), ('toolkit-map-key.csv', key)):
        with open(os.path.join(AUDIT, name), 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0]))
            w.writeheader()
            w.writerows(rows)
    return samp


LABELS = os.path.join(OUT, 'toolkit_map_labels.csv')
CHECK_MD = os.path.join(REPO, 'docs', 'report-language', 'check-for-mark-toolkit-map.md')


def write_check_for_mark(n=30):
    """30 of the 200 labelled sentences, drawn with seed 20261128, for Mark to check: text, area, version, the label
    and the label's standard. No grade, phase, month or school."""
    samp = list(csv.DictReader(open(os.path.join(AUDIT, 'toolkit-map-sample.csv'), encoding='utf-8')))
    labels = {r['sample_id']: r['label'] for r in csv.DictReader(open(LABELS, encoding='utf-8'))}
    stds = {s['standard_id']: s for v in tk.VERSIONS for s in tk.standards(v)}
    pick = sorted(int(i) for i in np.random.default_rng(SEED).choice(len(samp), n, replace=False))
    L = ['# For Mark to check: 30 labelled sentences from the toolkit-map sample', '',
         'These are 30 of the 200 sentences labelled by hand for analysis 6 (the toolkit map), drawn at random with seed '
         '20261128. Each was labelled from its text, its evaluation area and the toolkit version in force, under '
         '`docs/report-language/labelling-rules.md`, without its school, grades, phase, month or deprivation in view. '
         'The text is as parsed, with names already removed.', '',
         'For each, please mark whether you agree with the label (the standard the sentence evidences, or "none"). '
         'Where you disagree, the standard you would choose is enough. The agreement rate goes into the results.', '']
    for k, i in enumerate(pick, 1):
        s = samp[i]
        lab = labels[s['sample_id']]
        L += [f'## {k}. {s["sample_id"]}: {AREA_LABEL[s["area"]]} (toolkit {s["version"]})', '',
              f'> {s["text"]}', '',
              f'**Label:** {lab}' + (f' ({stds[lab]["grade_heading"]})' if lab in stds else ''), '']
        if lab in stds:
            L += [f'*Standard:* {stds[lab]["text"]}', '']
        L += ['Agree? yes / no. If no, my label: ____', '']
    open(CHECK_MD, 'w', encoding='utf-8').write('\n'.join(L))
    return [samp[i]['sample_id'] for i in pick]


def threshold_and_test(idx, samp, labels):
    """Threshold from the first 100 (the lowest giving precision >= 0.8 among assigned sentences); precision, recall
    and the unmatched share on the second 100."""
    rows = []
    for s in samp:
        sid, score = best_match(idx, s['version'], s['area'], content_tokens(prepare_sentence(s['text'])[0]))
        lab = labels[s['sample_id']]
        rows.append({'sample_id': s['sample_id'], 'set': s['set'], 'label': lab, 'best': sid, 'score': score,
                     'correct': sid == lab})
    tr = [r for r in rows if r['set'] == 'threshold']
    cands = sorted({r['score'] for r in tr if r['score'] > 0})
    thr = None
    curve = []
    for t in cands:
        a = [r for r in tr if r['score'] >= t]
        prec = sum(r['correct'] for r in a) / len(a)
        curve.append({'threshold': t, 'assigned': len(a), 'precision': prec})
        if thr is None and prec >= THRESH_PRECISION:
            thr = t
    rule = 'lowest threshold with precision >= 0.8 on the first 100'
    if thr is None and curve:
        # No threshold reaches 0.8 (the plan does not say what to do then). Closest faithful reading: take the
        # threshold with the highest precision on the first 100 (the lowest such value if tied), test it on the
        # second 100 as planned, and let the plan's rule for test precision below 0.7 govern how the map is shown.
        best = max(c['precision'] for c in curve)
        thr = min(c['threshold'] for c in curve if c['precision'] == best)
        rule = f'fallback: no threshold reached precision 0.8; highest precision on the first 100 was {best:.3f}'
    te = [r for r in rows if r['set'] == 'test']

    def stats(rs, t):
        if t is None:
            return {'assigned': 0, 'precision': None, 'recall': None, 'unmatched_share': 1.0}
        a = [r for r in rs if r['score'] >= t]
        pos = [r for r in rs if r['label'] != 'none']
        tp = sum(1 for r in a if r['correct'])
        return {'n': len(rs), 'labelled_with_standard': len(pos), 'assigned': len(a), 'correct': tp,
                'precision': tp / len(a) if a else None, 'recall': tp / len(pos) if pos else None,
                'unmatched_share': 1 - len(a) / len(rs)}
    # exploratory diagnostic (not in the plan): among assigned test sentences with a standard label, how often the
    # best match is under the same grade heading as the label, and how often in the same area at all
    code = lambda sid: sid.split(':')[2] if sid and sid != 'none' else None  # noqa: E731
    a = [r for r in te if r['score'] >= thr and r['label'] != 'none'] if thr is not None else []
    diag = {'assigned_with_standard_label': len(a),
            'same_grade_heading': sum(1 for r in a if code(r['best']) == code(r['label'])),
            'all_test_with_standard_label': sum(1 for r in te if r['label'] != 'none'),
            'all_test_same_grade_heading_at_any_score': sum(1 for r in te if r['label'] != 'none' and code(r['best']) == code(r['label'])),
            'all_test_exact_at_any_score': sum(1 for r in te if r['label'] != 'none' and r['correct'])}
    return {'threshold': thr, 'rule': rule, 'train': stats(tr, thr), 'test': stats(te, thr), 'curve': curve,
            'rows': rows, 'diagnostic_exploratory': diag}


def analysis6(reports, idx, thr):
    """Assign every area-section sentence; share of sentences and of sections per standard, by area, grade, phase."""
    cell_sent = collections.Counter()
    cell_sec = collections.Counter()
    std_sent = collections.Counter()
    std_sec = collections.Counter()
    unmatched = collections.Counter()
    for r in reports:
        for a, s in r['sections'].items():
            got = set()
            for ph in ('All phases', r['phase']):
                cell_sec[(r['version'], a, s['grade'], ph)] += 1
            for st in s['sentences']:
                sid, score = best_match(idx, r['version'], a, content_tokens(st['segments']))
                ok = thr is not None and sid is not None and score >= thr
                for ph in ('All phases', r['phase']):
                    cell_sent[(r['version'], a, s['grade'], ph)] += 1
                    if ok:
                        std_sent[(r['version'], a, s['grade'], ph, sid)] += 1
                    else:
                        unmatched[(r['version'], a, s['grade'], ph)] += 1
                if ok:
                    got.add(sid)
            for sid in got:
                for ph in ('All phases', r['phase']):
                    std_sec[(r['version'], a, s['grade'], ph, sid)] += 1
    stds = {s['standard_id']: s for v in tk.VERSIONS for s in tk.standards(v)}
    out = []
    for (v, a, g, ph), nsec in sorted(cell_sec.items(), key=lambda kv: (kv[0][0], AREAS.index(kv[0][1]), GRADES.index(kv[0][2]),
                                                                         (['All phases'] + PHASES).index(kv[0][3]))):
        nsent = cell_sent[(v, a, g, ph)]
        for sid, sd in stds.items():
            if sd['version'] != v or sd['area'] != a:
                continue
            k_sent, k_sec = std_sent[(v, a, g, ph, sid)], std_sec[(v, a, g, ph, sid)]
            row = {'version': v, 'area': AREA_LABEL[a], 'grade': g, 'phase': ph, 'sections': sup(nsec),
                   'sentences': sup(nsent), 'standard_id': sid, 'standard_grade_heading': sd['grade_heading'],
                   'sentences_assigned': sup(k_sent), 'sections_with_standard': sup(k_sec)}
            if nsec >= 10:
                row['share_of_sentences'] = fmt(k_sent / nsent) if k_sent >= 10 else ''
                row['share_of_sections'] = fmt(k_sec / nsec) if k_sec >= 10 else ''
                row['written_about_at_this_grade'] = 'yes' if k_sec >= 10 and k_sec / nsec >= 0.20 else 'no'
            out.append(row)
    write_csv('a6_toolkit_map.csv', out, ['version', 'area', 'grade', 'phase', 'sections', 'sentences', 'standard_id',
                                          'standard_grade_heading', 'sentences_assigned', 'sections_with_standard',
                                          'share_of_sentences', 'share_of_sections', 'written_about_at_this_grade'], gz=True)
    um = []
    for (v, a, g, ph), nsent in sorted(cell_sent.items(), key=lambda kv: (kv[0][0], AREAS.index(kv[0][1]), GRADES.index(kv[0][2]),
                                                                           (['All phases'] + PHASES).index(kv[0][3]))):
        k = unmatched[(v, a, g, ph)]
        nsec = cell_sec[(v, a, g, ph)]
        um.append({'version': v, 'area': AREA_LABEL[a], 'grade': g, 'phase': ph, 'sections': sup(nsec),
                   'sentences': sup(nsent), 'unmatched_share': fmt(k / nsent) if nsec >= 10 and k >= 10 and nsent - k >= 10 else ''})
    write_csv('a6_unmatched.csv', um, ['version', 'area', 'grade', 'phase', 'sections', 'sentences', 'unmatched_share'])
    return out, um


def link_versions(idx):
    """Standards linked across versions: normalised BM25 similarity of at least 0.8 in both directions."""
    out = []
    for a in AREAS:
        r1, bm1, d1 = idx[('v1.1', a)]
        r2, bm2, d2 = idx[('v2.0', a)]
        s12 = np.array([bm2.score_norm(d) for d in d1])          # v1.1 standard as query, against v2.0 standards
        s21 = np.array([bm1.score_norm(d) for d in d2]).T        # v2.0 standard as query, against v1.1 standards
        for i, a1 in enumerate(r1):
            for j, a2 in enumerate(r2):
                if s12[i, j] >= 0.8 and s21[i, j] >= 0.8:
                    out.append({'area': AREA_LABEL[a], 'v1.1': a1['standard_id'], 'v2.0': a2['standard_id'],
                                'sim_v1_to_v2': fmt(s12[i, j], 3), 'sim_v2_to_v1': fmt(s21[i, j], 3)})
    linked1 = {o['v1.1'] for o in out}
    linked2 = {o['v2.0'] for o in out}
    for v, linked in (('v1.1', linked1), ('v2.0', linked2)):
        for s in tk.standards(v):
            if s['standard_id'] not in linked:
                out.append({'area': AREA_LABEL[s['area']], v: s['standard_id'], 'note': f'{v} only'})
    write_csv('a6_version_links.csv', out, ['area', 'v1.1', 'v2.0', 'sim_v1_to_v2', 'sim_v2_to_v1', 'note'])
    return out


# ---------------------------------------------------------------------------------------------------------------
# Analysis 7: words against data (frozen lexicons v1, docs/report-language/results-lexicon-v1.md)
# ---------------------------------------------------------------------------------------------------------------

RESULTS_LEXICON = os.path.join(REPO, 'docs', 'report-language', 'results-lexicon-v1.md')
KS4_CSV = os.path.join(REPO, 'data', 'raw', 'ks4_model_v3.csv')
BANDS5 = ['Well above', 'Above', 'Close to', 'Below', 'Well below']
BANDS3 = ['Above', 'Close to', 'Below']
READINGS = ['positive', 'negative', 'level', 'mixed', 'no results statement']


def explorer_ks4():
    """The Explorer's secondary rows as its build serves them (scripts/build_data.py): the raw file, with the same
    small-group suppression applied first. The 2024/25 gap (ss_diff_25) and reading (ss_band_25) are read exactly as
    the Explorer shows them ("On the 2024/25 results inspectors had in front of them ..."). That reading has three
    bands (Above, Close to, Below: |gap| beyond 1.96 standard errors). For the plan's five bands, the Explorer's own
    rule for ss_band is applied on top: Above or Below becomes Well above or Well below where the gap is also larger
    than the spread (SD) of the 50 similar schools' 2024/25 Attainment 8, computed from the Explorer's lists."""
    sys.path.insert(0, os.path.join(REPO, 'scripts'))
    import data_downloads
    rows = list(csv.DictReader(open(KS4_CSV, encoding='utf-8')))
    data_downloads.suppress_small_groups(rows)
    by = {r['urn']: r for r in rows}
    f = lambda v: float(v) if v not in ('', None) else None
    out = {}
    for r in rows:
        d, b3 = f(r['ss_diff_25']), r['ss_band_25']
        if d is None or not b3:
            continue
        nb = [f(by[u]['a8_25']) for u in (r['nn'] or '').split() if u in by and f(by[u]['a8_25']) is not None]
        m = sum(nb) / len(nb)
        sd = (sum((x - m) ** 2 for x in nb) / (len(nb) - 1)) ** 0.5
        b5 = ('Well ' + b3.lower()) if b3 in ('Above', 'Below') and abs(d) > sd else b3
        out[r['urn']] = {'gap': d, 'band3': b3, 'band5': b5, 'ss_mean_check': abs(m - f(r['ss_mean_25'])) < 0.06}
    return out


def spearman(x, y):
    from scipy.stats import spearmanr
    return float(spearmanr(x, y).statistic)


def boot_spearman(x, y, B=BOOT, seed=SEED):
    x, y = np.asarray(x, float), np.asarray(y, float)
    rng = np.random.default_rng(seed)
    from scipy.stats import rankdata
    vals = []
    for _ in range(B):
        i = rng.integers(0, len(x), len(x))
        a, b = rankdata(x[i]), rankdata(y[i])
        if a.std() == 0 or b.std() == 0:
            continue
        vals.append(np.corrcoef(a, b)[0, 1])
    return float(np.percentile(vals, 2.5)), float(np.percentile(vals, 97.5))


def reading7(lo):
    return 'the words track the data' if lo > 0.3 else 'weak tracking' if lo > 0 else 'no clear tracking'


def bounded_share(k, n):
    """A share for publication; a count from 1 to 9 is shown only as an upper bound ('<10', 'under x%')."""
    if n < 10:
        return {'n': sup(n), 'k': '', 'share': '', 'lo': '', 'hi': ''}
    if 0 < k < 10:
        return {'n': str(n), 'k': '<10', 'share': f'under {100 * 10 / n:.1f}%', 'lo': '', 'hi': ''}
    lo, hi = wilson(k, n)
    return {'n': str(n), 'k': str(k), 'share': fmt(k / n), 'lo': fmt(lo), 'hi': fmt(hi)}


def analysis7():
    """Confirmatory secondaries: the band x section-reading cross-table with row shares and Wilson intervals; Spearman
    between the 2024/25 Attainment 8 gap and net direction (2,000 bootstrap resamples of schools, seed 20261128),
    overall and within each achievement grade with 30 or more schools; the two discordance shares; the pre-set
    reading. National aggregates only: no school-level row is written anywhere."""
    if LX.LEXICON_VERSION != 'v1' or not os.path.exists(RESULTS_LEXICON):
        raise SystemExit('analysis 7 runs only on the frozen v1 lexicons')
    ks4 = explorer_ks4()
    sch, n_sec, no_data = [], 0, 0
    for u, rec in _raw_reports():
        if rec['phase'] != 'Secondary':
            continue
        n_sec += 1
        if u not in ks4:
            no_data += 1
            continue
        paras = (rec['sections'].get('achievement') or {}).get('paragraphs') or []
        rs = LX.results_sentences(paras)
        d = [LX.sentence_direction(x) for x in rs]
        dn = [LX.sentence_direction(x, trend=False) for x in rs]
        sch.append(dict(ks4[u], grade=rec['grades'].get('achievement'), n_rs=len(rs),
                        reading=LX.section_reading(d), net=LX.net_from(d),
                        reading_nt=LX.section_reading(dn), net_nt=LX.net_from(dn), dirs=collections.Counter(d)))
    # 1. cross-tables
    rows = []
    for bands, bk in ((BANDS5, 'band5'), (BANDS3, 'band3')):
        for b in bands + ['All']:
            grp = [x for x in sch if b == 'All' or x[bk] == b]
            for rd in READINGS:
                k = sum(1 for x in grp if x['reading'] == rd)
                rows.append(dict({'bands': 'five (plan)' if bk == 'band5' else 'three (Explorer 2024/25 reading)',
                                  'data_band': b, 'section_reading': rd}, **bounded_share(k, len(grp))))
    write_csv('a7_crosstab.csv', rows, ['bands', 'data_band', 'section_reading', 'n', 'k', 'share', 'lo', 'hi'])
    # 2. Spearman
    def corr(grp, key):
        g = [x for x in grp if x[key] is not None]
        if len(g) < 30:
            return {'schools': sup(len(g)), 'rho': '', 'lo': '', 'hi': '', 'reading': 'not run (fewer than 30 schools)'}
        r = spearman([x['gap'] for x in g], [x[key] for x in g])
        lo, hi = boot_spearman([x['gap'] for x in g], [x[key] for x in g])
        return {'schools': str(len(g)), 'rho': fmt(r, 3), 'lo': fmt(lo, 3), 'hi': fmt(hi, 3), 'reading': reading7(lo)}
    crows = []
    for key, label in (('net', 'confirmatory'), ('net_nt', 'exploratory: without trend words')):
        crows.append(dict({'measure': label, 'group': 'All secondaries'}, **corr(sch, key)))
        for g in GRADES:
            c = corr([x for x in sch if x['grade'] == g], key)
            if key == 'net':
                c['reading'] = c['reading'] if c['reading'].startswith('not run') else 'reported beside the overall; not read as a headline'
            else:
                c['reading'] = c['reading'] if c['reading'].startswith('not run') else 'exploratory'
            crows.append(dict({'measure': label, 'group': 'Achievement: ' + g}, **c))
    crows[0]['reading'] = crows[0]['reading']
    write_csv('a7_spearman.csv', crows, ['measure', 'group', 'schools', 'rho', 'lo', 'hi', 'reading'])
    # 3. discordance
    drows = []
    for bk, lo_b, hi_b in (('band5', 'Well below', 'Well above'), ('band3', 'Below', 'Above')):
        tag = 'five (plan)' if bk == 'band5' else 'three (Explorer 2024/25 reading; sensitivity)'
        for b, rd, what in ((lo_b, 'positive', f'results {lo_b.lower()} similar schools, text wholly positive about results'),
                            (hi_b, 'negative', f'results {hi_b.lower()} similar schools, text wholly negative about results')):
            grp = [x for x in sch if x[bk] == b]
            grp_rs = [x for x in grp if x['reading'] != 'no results statement']
            k = sum(1 for x in grp if x['reading'] == rd)
            for denom, g in (('all schools in the band', grp), ('schools in the band with a results statement', grp_rs)):
                drows.append(dict({'bands': tag, 'discordance': what, 'denominator': denom}, **bounded_share(k, len(g))))
    write_csv('a7_discordance.csv', drows, ['bands', 'discordance', 'denominator', 'n', 'k', 'share', 'lo', 'hi'])
    # descriptives (aggregate)
    dirs = collections.Counter()
    for x in sch:
        dirs.update(x['dirs'])
    overall = crows[0]
    return {'secondaries_in_corpus': n_sec, 'without_2024_25_gap': no_data, 'schools': len(sch),
            'with_net_direction': sum(1 for x in sch if x['net'] is not None),
            'results_sentences': sum(x['n_rs'] for x in sch), 'sentence_directions': dict(dirs),
            'band5': dict(collections.Counter(x['band5'] for x in sch)), 'band3': dict(collections.Counter(x['band3'] for x in sch)),
            'readings': dict(collections.Counter(x['reading'] for x in sch)),
            'ss_mean_reproduced': sum(x['ss_mean_check'] for x in sch),
            'spearman_overall': overall, 'pre_set_reading': overall['reading'],
            'primaries': 'not run: no school-level 2024/25 key stage 2 reading, writing and mathematics expected-standard file is held'}


# ---------------------------------------------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['sample', 'check', 'validation-sample', 'validation-score', 'validation-check', 'run'])
    ap.add_argument('--only', nargs='*', type=int, default=[1, 2, 4, 5, 6])  # 3 and 7: run --only 3 7
    a = ap.parse_args()
    if a.cmd == 'check':
        print('wrote', os.path.relpath(CHECK_MD, REPO), write_check_for_mark())
        return
    if a.cmd == 'validation-check':
        print(write_validation_checks())
        return
    if a.cmd == 'validation-sample':
        print(draw_validation())
        return
    if a.cmd == 'validation-score':
        v = validation_score()
        path = os.path.join(OUT, 'summary.json')
        summary = json.load(open(path)) if os.path.exists(path) else {}
        summary['validation_v1'] = v
        json.dump(summary, open(path, 'w'), indent=1, default=float)
        print(json.dumps(v, indent=1, default=float))
        return
    reports = load_corpus()
    print(f'{len(reports)} report cards; {sum(len(r["sections"]) for r in reports)} graded area sections', flush=True)
    if a.cmd == 'sample':
        samp = draw_sample(reports)
        print(f'wrote {len(samp)} sentences to label to {AUDIT}')
        return
    summary = {'cutoff': CUTOFF, 'reports': len(reports),
               'sections': sum(len(r['sections']) for r in reports),
               'sentences': sum(len(s['sentences']) for r in reports for s in r['sections'].values()),
               'by_version': dict(collections.Counter(r['version'] for r in reports))}
    path = os.path.join(OUT, 'summary.json')
    if os.path.exists(path):
        old = json.load(open(path))
        old.update(summary)
        summary = old
    eligible = None
    if 1 in a.only or 5 in a.only:
        s1, _, eligible = analysis1(reports)
        summary['a1'] = {'eligible_phrases_pooled': {AREA_LABEL[k]: len(v) for k, v in eligible.items()}}
        print('analysis 1 done', flush=True)
    echo = None
    if any(k in a.only for k in (2, 4)):
        echo, meta = echo_measures(reports)
        summary['a2_meta'] = meta
    if 2 in a.only:
        _, reading = analysis2(echo)
        summary['a2_reading'] = reading
        print('analysis 2 done', flush=True)
    if 4 in a.only:
        meas = section_measures(reports, echo)
        analysis4_descriptives(meas)
        ctx = load_context()
        res = analysis4_model(meas, ctx)
        summary['a4'] = {'headline': res['headline'], 'reports_without_quintile_pri_sec': res['reports_without_quintile_pri_sec']}
        print('analysis 4 done', flush=True)
    if 5 in a.only:
        _, mrows, _ = analysis5(reports, eligible)
        summary['a5_months'] = mrows
        print('analysis 5 done', flush=True)
    if 6 in a.only:
        idx = standards_index()
        links = link_versions(idx)
        samp = list(csv.DictReader(open(os.path.join(AUDIT, 'toolkit-map-sample.csv'), encoding='utf-8')))
        labels = {r['sample_id']: r['label'] for r in csv.DictReader(open(LABELS, encoding='utf-8'))}
        tt = threshold_and_test(idx, samp, labels)
        write_csv('a6_threshold_curve.csv', [{k: fmt(v) if isinstance(v, float) else v for k, v in c.items()} for c in tt['curve']],
                  ['threshold', 'assigned', 'precision'])
        summary['a6'] = {'threshold': tt['threshold'], 'rule': tt['rule'], 'train': tt['train'], 'test': tt['test'],
                         'diagnostic_exploratory': tt['diagnostic_exploratory'],
                         'map_status': ('validated' if tt['test']['precision'] is not None and tt['test']['precision'] >= 0.7
                                        else 'not validated: shown only as the standards whose wording reports echo most'),
                         'links': sum(1 for l in links if l.get('v1.1') and l.get('v2.0'))}
        analysis6(reports, idx, tt['threshold'])
        print('analysis 6 done', flush=True)
    if 3 in a.only:
        v = summary.get('validation_v1') or validation_score()
        warn = {r['theme']: r['warning'] for r in v['a3']['themes'] if r['warning'] and r['theme'] != 'other'}
        summary['a3'] = analysis3(warn=warn)
        print('analysis 3 done', flush=True)
    if 7 in a.only:
        summary['a7'] = analysis7()
        print('analysis 7 done', flush=True)
    json.dump(summary, open(path, 'w'), indent=1, default=float)
    print(json.dumps({k: v for k, v in summary.items() if k in ('a2_reading', 'a4', 'a6', 'a3', 'a7')}, indent=1, default=float))


if __name__ == '__main__':
    main()
