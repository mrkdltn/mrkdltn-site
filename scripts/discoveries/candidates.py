"""Suggest discoveries by fixed, published rules. Writes `candidate` files only; never publishes, never names a school.

    python3 scripts/discoveries/candidates.py            write any new candidates to content/discoveries/
    python3 scripts/discoveries/candidates.py --dry-run  list what it would write

Run after python3 scripts/build_data.py, so the data are today's. The rules, their thresholds and why are in
scripts/discoveries/README.md. Every figure in a candidate comes from a compute function in figures.py and is frozen by
freeze.py, so a candidate checks and builds like any other discovery. Each rule has a key (`rule:` in the file), and a
rule that already has a file of any status is not suggested again.
"""
import datetime
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import content  # noqa: E402
import figures  # noqa: E402
import freeze  # noqa: E402

GAP = 15.0        # rule 1: a gradient of at least 15 percentage points between the end fifths
END_N = 30        # ... with at least 30 schools in each end fifth
MONTHS = 3        # rule 2: three complete months in a row, each with at least MONTH_N inspections
MONTH_N = 30
TREND = 10.0      # ... moving the same way each month, by at least 10 percentage points in all
MILESTONE = 250   # rule 3: each multiple of 250 inspected secondaries

AREA = dict(figures.AREAS)
WORD = {2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six'}
THEME = {'g_ab': 'attendance-and-behaviour', 'g_inc': 'inclusion'}
ENDS = {'idaci': ('least deprived fifth', 'most deprived fifth'),
        'dis': ('fifth with the fewest disadvantaged pupils', 'fifth with the most disadvantaged pupils'),
        'nonmob': ('least stable fifth', 'most stable fifth'),
        'pa': ('fifth with the lowest prior attainment', 'fifth with the highest prior attainment'),
        'ehc': ('fifth with the fewest pupils with an EHC plan', 'fifth with the most pupils with an EHC plan')}
SHORT = {'idaci': ('least deprived', 'most deprived'), 'dis': ('fewest disadvantaged', 'most disadvantaged'),
         'nonmob': ('least stable', 'most stable'), 'pa': ('lowest prior attainment', 'highest prior attainment'),
         'ehc': ('fewest EHC plans', 'most EHC plans')}
LIMITATION = 'Written by a fixed rule from the data and not yet read by a person, so the words and the reading still need checking.'


def slug(s):
    words, out = re.sub(r'[^a-z0-9]+', ' ', s.lower()).split(), []
    for w in words:
        if len('-'.join(out + [w])) > 60:
            break
        out.append(w)
    return '-'.join(out)


def pct(v):
    return f'{v:.0f}%'


def gradient(d):
    """Rule 1: an area's share below Expected differs by at least GAP points between the two end fifths."""
    out = []
    views = [(a, g, 'matched') for g in ('idaci', 'dis') for a, _ in figures.AREAS] + \
            [(a, g, '') for g, a in figures.CONTEXT_AREA.items()]
    for area, g, m in views:
        lo = figures.fifth_share(d, area, g, 1, m)
        hi = figures.fifth_share(d, area, g, 5, m)
        if lo['value'] is None or hi['value'] is None or min(lo['n'], hi['n']) < END_N:
            continue
        if abs(hi['value'] - lo['value']) < GAP:
            continue
        tail = '__' + m if m else ''
        (a_q, a), (b_q, b) = sorted([(1, lo), (5, hi)], key=lambda t: -t[1]['value'])  # higher share first
        ends = ENDS[g]
        hl, ll = ends[a_q // 5], ends[b_q // 5]
        lab = AREA[area]
        sh, sl = SHORT[g][a_q // 5], SHORT[g][b_q // 5]
        for title in (f'{lab}: {pct(a["value"])} below Expected in the {hl}, {pct(b["value"])} in the {ll}',
                      f'{lab}: {pct(a["value"])} below Expected in the {sh} fifth, {pct(b["value"])} in the {sl}',
                      f'{lab}: a {abs(a["value"] - b["value"]):.0f}-point gap between the {sh} and {sl} fifths',
                      f'{lab}: a {abs(a["value"] - b["value"]):.0f}-point gap in grades between the end fifths'):
            if len(title) < 90:
                break
        who = ('inspected secondaries whose 2024/25 results were close to or above their similar schools' if m
               else 'inspected secondaries')
        stand = (f'Among {who}, {pct(a["value"])} in the {hl} were graded below Expected standard for '
                 f'{lab.lower()}, against {pct(b["value"])} in the {ll}.')
        body = (f'Among {who}, the share graded below Expected standard for {lab.lower()} is {pct(a["value"])} in the {hl} '
                f'and {pct(b["value"])} in the {ll}, a difference of {abs(a["value"] - b["value"]):.0f} percentage points.')
        sec = figures.GROUPINGS[g][1]
        explore = (f'/explorer/areas/#sec=results&by={g}&focus={area}' if sec == 'results'
                   else f'/explorer/areas/#sec=context&focus={area}')
        out.append(dict(
            rule=f'gradient:{area}:{g}' + (':matched' if m else ''), title=title, standfirst=stand, body=body,
            theme=THEME.get(area, 'achievement-and-context'),
            figures=[{'label': f'{hl[0].upper() + hl[1:]}, graded below Expected for {lab.lower()}', 'unit': '%', 'key': True,
                      'compute': f'fifth_share__{area}__{g}__{a_q}{tail}'},
                     {'label': f'{ll[0].upper() + ll[1:]}, graded below Expected for {lab.lower()}', 'unit': '%', 'key': True,
                      'compute': f'fifth_share__{area}__{g}__{b_q}{tail}'},
                     {'label': 'Difference between the end fifths (fifth 5 minus fifth 1)', 'unit': 'pp',
                      'compute': f'fifth_gap__{area}__{g}{tail}'}],
            chart={'form': 'line5', 'compute': f'chart_fifths__{area}__{g}',
                   'title': f'Share graded below Expected standard for {lab.lower()}, by fifth',
                   'x': figures.GROUPINGS[g][2], 'xtitle': figures.GROUPINGS[g][0]},
            explore=explore, related=[f'/explorer/areas/#{sec}']))
    return out


def trend(d):
    """Rule 2: a newly complete month makes MONTHS months in a row move the same way, by TREND points in all."""
    out = []
    this_month = figures.as_at(d)[:7]
    done = [m for m in figures.months(d) if m < this_month]
    for area, lab in figures.AREAS:
        vals = [(m, figures.month_share(d, area, m)) for m in done]
        vals = [(m, v) for m, v in vals if v['value'] is not None and v['n'] >= MONTH_N]
        if len(vals) < MONTHS:
            continue
        run = vals[-MONTHS:]
        steps = [b[1]['value'] - a[1]['value'] for a, b in zip(run, run[1:])]
        if not (all(s > 0 for s in steps) or all(s < 0 for s in steps)) or abs(sum(steps)) < TREND:
            continue
        first, last = run[0], run[-1]
        word = 'rose' if steps[0] > 0 else 'fell'
        mname = lambda m: datetime.date.fromisoformat(m + '-01').strftime('%B %Y')
        out.append(dict(
            rule=f'trend:{area}:{last[0]}', theme=THEME.get(area, 'achievement-and-context'),
            title=f'{lab}: the share graded below Expected {word} across {WORD[MONTHS]} months in a row',
            standfirst=(f'Among secondaries inspected in {mname(first[0])}, {pct(first[1]["value"])} were graded below Expected '
                        f'standard for {lab.lower()}; in {mname(last[0])}, {pct(last[1]["value"])}.'),
            body=(f'The share of inspected secondaries graded below Expected standard for {lab.lower()} {word} in each of the '
                  f'last {WORD[MONTHS]} complete months of inspections, from {pct(first[1]["value"])} to {pct(last[1]["value"])}. '
                  'The Explorer has no view by inspection month yet, so this needs one before it can be published.'),
            figures=[{'label': f'Inspected in {mname(first[0])}, below Expected for {lab.lower()}', 'unit': '%', 'key': True,
                      'compute': f'month_share__{area}__{first[0]}'},
                     {'label': f'Inspected in {mname(last[0])}, below Expected for {lab.lower()}', 'unit': '%', 'key': True,
                      'compute': f'month_share__{area}__{last[0]}'}],
            chart={'form': 'pairs', 'compute': f'chart_months__{area}__{last[0]}',
                   'title': f'Share graded below Expected standard for {lab.lower()}, by month of inspection',
                   'legend': [['#0B1A2E', 'Inspected that month'], ['#8A96A8', 'All inspected secondaries']]},
            explore='/explorer/areas/#sec=results&by=idaci&focus=' + area, related=['/explorer/areas/#results']))
    return out


def milestone(d):
    """Rule 3: the number of inspected secondaries passes a multiple of MILESTONE."""
    n = figures.n_inspected(d)['value']
    m = (n // MILESTONE) * MILESTONE
    if m < MILESTONE:
        return []
    return [dict(
        rule=f'milestone:{m}', theme='achievement-and-context',
        title=f'{n:,} secondary schools now have a report card and published results',
        standfirst=f'{n:,} secondaries in the Explorer have been inspected under the report card framework.',
        body=(f'{n:,} secondary schools with published GCSE results now have a report card. Each new one moves the '
              'national figures in the Explorer.'),
        figures=[{'label': 'Secondaries with a report card and published results', 'unit': 'schools', 'key': True,
                  'compute': 'n_inspected'}],
        chart=None, explore='/explorer/areas/#sec=results&by=idaci&focus=g_ach', related=['/explorer/areas/#results'])]


def existing_rules():
    return {d.get('rule') for d in content.load_all() if d.get('rule')}


def write(c, d, today, dry):
    if c['chart'] is None:  # no chart of its own: borrow the achievement chart its link opens, so it still builds
        c['chart'] = {'form': 'line5', 'compute': 'chart_sr', 'title': 'Share graded below Expected standard for achievement, by IDACI fifth',
                      'x': figures.GROUPINGS['idaci'][2], 'xtitle': figures.GROUPINGS['idaci'][0]}
    ident = f'{today}-{slug(c["title"])}'
    path = os.path.join(content.CONTENT, ident + '.md')
    meta = {'id': ident, 'date': today, 'title': c['title'], 'standfirst': c['standfirst'], 'status': 'candidate',
            'theme': c['theme'], 'figures': c['figures'], 'chart': c['chart'], 'explore': c['explore'],
            'related': c['related'], 'limitation': LIMITATION, 'supersedes': None, 'superseded_by': None, 'rule': c['rule'],
            '_file': ident + '.md'}
    freeze.freeze(meta, d)
    meta['_body'] = c['body']
    probs = content.problems(meta)
    if probs:
        print('skipped', c['rule'], '; '.join(probs))
        return None
    print(('would write ' if dry else 'wrote ') + os.path.relpath(path))
    if not dry:
        os.makedirs(content.CONTENT, exist_ok=True)
        body = meta.pop('_body')
        meta.pop('_file')
        content.save(path, meta, body)
    return path


def main(argv):
    dry = '--dry-run' in argv
    d = figures.Data()
    today = datetime.date.today().isoformat()
    have = existing_rules()
    n = 0
    for c in gradient(d) + trend(d) + milestone(d):
        if c['rule'] in have:
            continue
        if write(c, d, today, dry):
            n += 1
    print(f'candidates: {n} new' + (' (dry run)' if dry else ''))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
