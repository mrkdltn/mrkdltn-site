#!/usr/bin/env python3
"""Report Language: split Ofsted's school inspection toolkit into evaluation areas and standards.

Used by analysis.py (analyses 2 and 6 of docs/report-language/plan.md). Reads the two toolkit PDFs, which are kept
outside the repository (../mrkdltn-data/toolkit/), checks each against its sha256, and returns for each version:

  area_text(version)[area]   the toolkit's whole text for that evaluation area (every page from the area's heading
                             to the next area's), as paragraphs separated by a blank line (a heading, a bullet or a
                             paragraph each), with the three-column grading tables read column by column, so that a
                             run of words never crosses from one column, bullet or heading into another
  standards(version)         one row per standard: a statement under a grade heading in the area's grading table

What counts as a standard (plan, Amendment 1, "Standards"). Under each of the five grade headings (Needs attention,
Expected standard and Strong standard, which share a three-column table, then Urgent improvement and Exceptional),
each separate statement is one standard. In the Needs attention, Urgent improvement and Exceptional lists the
statements are bulleted; in the Expected and Strong columns they are printed as separate paragraphs without bullets,
and each paragraph is taken as one statement. Lead-in sentences ("... meets the 'expected standard' when all the
following apply:", "This may include when ...:") are not standards, and nor are the bullets after "If this grade is
awarded, leaders should use their exceptional success ... to:", which say what an exceptional school should go on to
do rather than what earns the grade.

  python3 scripts/language/toolkit.py   # writes data/derived/report_language/toolkit_standards_v1.1.csv and _v2.0.csv
"""
import csv, functools, hashlib, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, '..', '..'))
TOOLKIT_DIR = os.path.normpath(os.path.join(REPO, '..', 'mrkdltn-data', 'toolkit'))
OUT = os.path.join(REPO, 'data', 'derived', 'report_language')

VERSIONS = {
    'v1.1': {'file': 'toolkit_v1.1.pdf',
             'sha256': '193576810f37ff9cb37d8bd19d1d2c9f2b70168b57321bf9cd9407a1ec435243',
             'updated': '5 November 2025', 'in_force_from': '2025-11-10',
             'source': 'https://dera.ioe.ac.uk/id/eprint/41595/1/Schools_inspection_toolkit.pdf'},
    'v2.0': {'file': 'toolkit_v2.0.pdf',
             'sha256': 'c3e82d7eb092d842edb06bb119784daad2e95730bf6ec2604fb1f67014274b80',
             'updated': 'June 2026', 'in_force_from': '2026-09-07',
             'source': 'https://assets.publishing.service.gov.uk/media/6a915d1c01bbff0bf8f97b51/Schools_inspection_toolkit.pdf'},
}
V2_FROM = VERSIONS['v2.0']['in_force_from']

# report-card area key -> the toolkit's heading for it (first line of the area's first page)
AREA_HEAD = {
    'inclusion': r'Inclusion',
    'curriculum_teaching': r'Curriculum and teaching',
    'achievement': r'Achievement',
    'attendance_behaviour': r'Attendance and behaviour',
    'personal_development': r'Personal development and well-?being',
    'early_years': r'Early years',
    'post16': r'Post-16 provision',
    'leadership_governance': r'Leadership and governance',
}
AREAS = list(AREA_HEAD)
GRADE_HEADS = ['Needs attention', 'Expected standard', 'Strong standard', 'Urgent improvement', 'Exceptional']
GRADE_CODE = {'Exceptional': 'EX', 'Strong standard': 'SS', 'Expected standard': 'ES', 'Needs attention': 'NA',
              'Urgent improvement': 'UI'}
BULLETS = {'', '•', '', '', '▪', '●'}
LEAD_IN = re.compile(r"(?:is|are) likely to be graded|(?:meets?|reach(?:es)?) the ['‘’]?(?:expected|strong)|"
                     r"may consider .* to be ['‘’]?exceptional|^This may include|when the ['‘’]?expected standard['‘’]? has not been met",
                     re.I)
AFTER_AWARD = re.compile(r'^If this grade is awarded', re.I)


def version_for(insp_date):
    """The toolkit version in force on an inspection date (ISO string)."""
    return 'v2.0' if insp_date >= V2_FROM else 'v1.1'


def _check(version):
    v = VERSIONS[version]
    path = os.path.join(TOOLKIT_DIR, v['file'])
    h = hashlib.sha256(open(path, 'rb').read()).hexdigest()
    if h != v['sha256']:
        raise SystemExit(f'{path}: sha256 {h} does not match the stored checksum')
    return path


def _lines(words, tol=4.0):
    """Cluster words into lines by their top coordinate; a bullet glyph sits a few points above its text."""
    out = []
    for w in sorted(words, key=lambda w: (w['top'], w['x0'])):
        if out and w['top'] - out[-1]['top'] <= tol:
            out[-1]['words'].append(w)
        else:
            out.append({'top': w['top'], 'words': [w]})
    for l in out:
        l['words'].sort(key=lambda w: w['x0'])
        l['bullet'] = any(w['text'] in BULLETS for w in l['words'])
        l['text'] = ' '.join(w['text'] for w in l['words'] if w['text'] not in BULLETS).strip()
    return [l for l in out if l['text'] or l['bullet']]


def _join(lines):
    s = ''
    for t in lines:
        if s.endswith('-') and not s.endswith(' -'):
            s += t
        else:
            s = (s + ' ' + t).strip()
    return s


def _paragraphs(lines, gap=17.0):
    """Split a column's lines into paragraphs: a new one at a bullet or at a gap wider than normal line spacing.

    The bullet glyph is sometimes a line of its own just above its text; such a line has a bullet and no text, and
    the text line that follows belongs to it."""
    # Inside a bulleted list the wrapped lines of one bullet can be spaced unevenly, so there a new paragraph starts only
    # at a bullet, or at a line that starts left of the bullets' text (an unbulleted sentence after the list).
    indents = [min(w['x0'] for w in l['words'] if w['text'] not in BULLETS) for l in lines if l['bullet'] and l['text']]
    indent = min(indents) if indents else None
    paras, cur, last_top, in_list = [], [], None, False
    for l in lines:
        x = min((w['x0'] for w in l['words'] if w['text'] not in BULLETS), default=0)
        if l['bullet']:
            new, in_list = True, True
        elif in_list:
            new = x < indent - 4
            if new:
                in_list = False
        else:
            new = last_top is not None and l['top'] - last_top > gap
        if new and cur:
            paras.append(cur)
            cur = []
        if l['text']:
            cur.append(l['text'])
        last_top = l['top']
    if cur:
        paras.append(cur)
    return [_join(p) for p in paras]


@functools.lru_cache(maxsize=None)
def _parse(version):
    import pdfplumber
    pdf = pdfplumber.open(_check(version))
    pages = pdf.pages
    first = [((p.extract_text() or '').strip().split('\n') or [''])[0].strip() for p in pages]
    starts = {}
    for a, head in AREA_HEAD.items():
        idx = [i for i, t in enumerate(first) if re.fullmatch(head, t) and i > 9]
        if a == 'curriculum_teaching' or a == 'achievement':  # the post-16 section has sub-headings of the same name
            idx = idx[:1]
        if len(idx) != 1:
            raise SystemExit(f'{version}: cannot find the start of {a}: {idx}')
        starts[a] = idx[0]
    order = sorted(AREAS, key=lambda a: starts[a])
    text, stds = {}, []
    for k, a in enumerate(order):
        end = starts[order[k + 1]] if k + 1 < len(order) else len(pages)
        portrait, grading = [], []
        heading, cols, after_award = None, None, False
        carry = {}  # grade heading -> its paragraphs, continued across pages
        for i in range(starts[a], end):
            p = pages[i]
            words = [w for w in p.extract_words(extra_attrs=['fontname', 'size']) if w['top'] < p.height - 45]
            if p.width < p.height:  # portrait: ordinary running text
                portrait.append('\n\n'.join(_paragraphs(_lines(words))))
                continue
            words = [w for w in words if w['size'] < 15]  # drop the "Grading ..." page title
            lines = _lines(words)
            # split the page into blocks at grade headings
            blocks, cur = [], None
            for l in lines:
                t = l['text']
                if t.startswith('Needs attention') and 'Expected standard' in t and 'Strong standard' in t:
                    xs = [w['x0'] for w in l['words'] if w['text'] in ('Needs', 'Expected', 'Strong')]
                    cur = {'kind': 'three', 'xs': xs, 'lines': []}
                    blocks.append(cur)
                elif t in ('Urgent improvement', 'Exceptional'):
                    cur = {'kind': 'one', 'head': t, 'lines': []}
                    blocks.append(cur)
                elif cur is None:  # continuation of the previous page's block
                    cur = dict(cols) if cols else {'kind': 'one', 'head': heading, 'lines': []}
                    cur['lines'] = [l]
                    blocks.append(cur)
                else:
                    cur['lines'].append(l)
            for b in blocks:
                if b['kind'] == 'three':
                    cols = {'kind': 'three', 'xs': b['xs']}
                    heading = None
                    xs = b['xs']
                    bounds = [-1, xs[1] - 6, xs[2] - 6, 1e9]
                    ws = [w for l in b['lines'] for w in l['words']]
                    for c, g in enumerate(GRADE_HEADS[:3]):
                        cw = [w for w in ws if bounds[c] <= w['x0'] < bounds[c + 1]]
                        paras = _paragraphs(_lines(cw))
                        _add(carry, g, paras)
                else:
                    cols = None
                    heading = b['head']
                    if heading == 'Exceptional':
                        after_award = False
                    paras = _paragraphs(b['lines'])
                    keep = []
                    for para in paras:
                        if AFTER_AWARD.match(para):
                            after_award = True
                        keep.append((para, after_award))
                    _add(carry, heading, keep)
        # area text: running pages, then the grading table column by column (lead-ins included)
        grading_text = []
        for g in GRADE_HEADS:
            grading_text.append(g)
            grading_text += [p if isinstance(p, str) else p[0] for p in carry.get(g, [])]
        text[a] = _clean('\n\n'.join(portrait + grading_text))
        for g in GRADE_HEADS:
            pos = 0
            for para in carry.get(g, []):
                para, excluded = (para, False) if isinstance(para, str) else para
                if excluded or AFTER_AWARD.match(para) or para.endswith(':') or LEAD_IN.search(para):
                    continue
                pos += 1
                stds.append({'version': version, 'area': a, 'grade_heading': g, 'position': pos,
                             'standard_id': f'{version}:{a}:{GRADE_CODE[g]}:{pos:02d}', 'text': _clean(para)})
    return text, stds


def _add(carry, g, paras):
    """Append paragraphs to a grade heading's list, re-joining a paragraph split across a page break."""
    lst = carry.setdefault(g, [])
    for i, p in enumerate(paras):
        ptext = p if isinstance(p, str) else p[0]
        if i == 0 and lst:
            prev = lst[-1] if isinstance(lst[-1], str) else lst[-1][0]
            if prev and not re.search(r'[.;:]$', prev):
                joined = _join([prev, ptext])
                lst[-1] = joined if isinstance(lst[-1], str) else (joined, lst[-1][1])
                continue
        lst.append(p)


def _clean(t):
    t = t.replace(' ', ' ')
    return re.sub(r'[ \t]+', ' ', t).strip()  # paragraph breaks ('\n\n') are kept


def area_text(version):
    return _parse(version)[0]


def standards(version):
    return _parse(version)[1]


def write_standards(out=OUT):
    os.makedirs(out, exist_ok=True)
    paths = []
    for v in VERSIONS:
        path = os.path.join(out, f'toolkit_standards_{v}.csv')
        with open(path, 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=['standard_id', 'version', 'area', 'grade_heading', 'position', 'text'])
            w.writeheader()
            for r in standards(v):
                w.writerow(r)
        paths.append(path)
    return paths


if __name__ == '__main__':
    for p in write_standards():
        print('wrote', os.path.relpath(p, REPO))
    for v in VERSIONS:
        s = standards(v)
        import collections
        print(v, len(s), dict(collections.Counter((r['area'], r['grade_heading']) for r in s)))
