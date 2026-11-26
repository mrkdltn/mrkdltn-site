"""Checks for Discoveries. Run after a build (python3 scripts/build_data.py), from the repository root:

    python3 scripts/discoveries/test_discoveries.py

1. Every discovery file is sound (content.problems) and reads the same with PyYAML, where installed.
2. Every frozen figure, and every chart value, reproduces from its compute function on today's data. With --strict a
   difference fails; without it (as the weekly workflow runs) a difference is reported as stale, since data move daily.
3. Every number in a title, standfirst, body or limitation is one of the discovery's figures, or a fixed part of a
   definition (50 similar schools, 2024/25 results).
4. A production build builds no candidate, draft or approved discovery; a preview build builds them behind the banner.
5. The live check flags a figure that has moved by more than 2 points, and the page then shows the dated line.
6. The LinkedIn chain: a discovery cannot be published (freeze.py, or a production build) without a LinkedIn post
   dated its publication day; links show on the page and in the feed; the post kit shows on preview builds only.
"""
import copy
import os
import re
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
import build  # noqa: E402
import content  # noqa: E402
import figures  # noqa: E402

FIXED = {'50', '2024', '25', '10', '2025', '26', '95'}  # 50 similar schools; 2024/25 and 2025/26 results; groups of 10; 95% intervals
fails = []
stale = []
STRICT = '--strict' in sys.argv


def check(ok, msg):
    if not ok:
        fails.append(msg)


def numbers(text):
    text = re.sub(r'\b20\d\d/\d\d\b', '', text)  # school years
    text = re.sub(r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December) 20\d\d\b', '', text)
    return re.findall(r'\d+(?:\.\d+)?', text)


def main():
    data = figures.Data()
    every = content.load_all()
    check(every, 'no discoveries found')
    for d in every:
        f = d['_file']
        for p in content.problems(d):
            fails.append(f'{f}: {p}')
        try:
            import yaml
            raw = open(os.path.join(content.CONTENT, f), encoding='utf-8').read().split('---')[1]
            check(yaml.safe_load(raw) == {k: v for k, v in d.items() if not k.startswith('_')}, f'{f}: PyYAML reads it differently')
        except ImportError:
            pass
        # data move daily, so a draft frozen yesterday may differ today: that is reported as stale (run freeze.py),
        # and fails only with --strict. A published discovery's drift is the live check's job (build.json review).
        allowed = set(FIXED)
        for fig in d['figures']:
            r = figures.compute(fig['compute'], data)
            check(r['value'] is not None, f'{f}: {fig["compute"]} gives no figure')
            if r['value'] is not None and (abs(r['value'] - fig['value']) > 0.005 or r['n'] != fig['n']):
                stale.append(f'{f}: {fig["compute"]} is {r["value"]:.2f} (n {r["n"]}), frozen {fig["value"]} (n {fig["n"]})')
            v = fig['value']
            allowed |= {f'{abs(v):.0f}', f'{abs(v):.1f}', str(abs(v)), f'{int(fig["n"])}'}  # a difference is quoted as a size
        live = figures.compute(d['chart']['compute'], data)
        for k, v in live.items():
            if d['chart'].get(k) != v:
                stale.append(f'{f}: chart {k} differs from {d["chart"]["compute"]} on today\'s data')
        text = ' '.join([d['title'], d['standfirst'], d['_body'], d['limitation']])
        for n in numbers(text.replace(',', '')):
            check(n in allowed, f'{f}: the number {n} in the text is not one of its figures')

    # 4. the approval gate
    real_out = build.OUT
    for m in ('production', 'preview'):
        with tempfile.TemporaryDirectory() as tmp:
            os.environ['OE_DISCOVERIES'] = m
            build.OUT = tmp
            s = build.build(data=data, fonts=False, today='2026-11-25')
            built = set(s['built'])
            for d in every:
                pub = d['status'] in build.PUBLIC
                if m == 'production':
                    check((d['id'] in built) == pub, f'production: {d["id"]} ({d["status"]}) built={d["id"] in built}')
                else:
                    check(d['id'] in built, f'preview: {d["id"]} not built')
                    if d['id'] in built:
                        h = open(os.path.join(tmp, d['id'], 'index.html'), encoding='utf-8').read()
                        check(('Draft, not published' in h) == (not pub), f'preview: {d["id"]} banner wrong')
                        check(('noindex' in h) == (not pub), f'preview: {d["id"]} noindex wrong')
            check(os.path.exists(os.path.join(tmp, 'index.json')), f'{m}: no index.json')
            if m == 'production' and not built:
                check(not os.path.exists(os.path.join(tmp, 'index.html')), 'production: a list page with nothing published')
    os.environ.pop('OE_DISCOVERIES', None)
    build.OUT = real_out

    # 5. the live check
    pcts = [x for x in every if any(f.get('unit') == '%' for f in x['figures'])]
    if pcts:
        d = copy.deepcopy(pcts[0])
        fig = next(x for x in d['figures'] if x.get('unit') == '%')
        fig['value'] += 5
        fig['n'] -= 12
        moved = build.live_check(d, data)
        check(any(x['compute'] == fig['compute'] for x in moved), 'live check missed a 5-point move')
        _, h = build.page(d, {}, '2026-12-01', False)
        more = figures.compute(fig['compute'], data)['n'] - fig['n']
        check(f'Since publication, with {more:,} more inspections, this figure is now' in h, 'no dated live-check line on the page')
        d2 = copy.deepcopy(pcts[0])
        if not stale:
            check(not build.live_check(d2, data), 'live check flags an unmoved draft')

    # 6. the LinkedIn chain and the publishing rule
    if every:
        d = copy.deepcopy(every[0])
        d['status'] = 'published'
        d['published'] = '2026-12-01'
        d['linkedin'] = []
        check(any('no linkedin post' in x for x in content.problems(d)), 'published without a LinkedIn post was allowed')
        d['linkedin'] = [{'url': 'https://www.linkedin.com/posts/example-0001', 'date': '2026-11-30', 'kind': 'post', 'title': 'A post'}]
        check(any('dated that day' in x for x in content.problems(d)), 'a post from another day was allowed')
        d['linkedin'][0]['date'] = '2026-12-01'
        check(not [x for x in content.problems(d) if 'linkedin' in x or 'published' in x], 'a same-day post was refused')
        d['linkedin'].append({'url': 'https://example.com/x', 'date': '2026-12-01', 'kind': 'tweet', 'title': ''})
        probs = content.problems(d)
        check(any('not a linkedin.com link' in x for x in probs) and any('kind' in x for x in probs), 'a bad linkedin entry was allowed')
        d['linkedin'].pop()
        try:
            import freeze
            freeze.freeze(dict(d, linkedin=[]), data)
            check(False, 'freeze.py let a discovery be published without its post')
        except SystemExit as ex:
            check('cannot be published' in str(ex), 'freeze.py refused for the wrong reason')
        _, h = build.page(d, {}, '2026-12-01', False, kit=False)
        check('Discussed on LinkedIn' in h and 'linkedin.com/posts/example-0001' in h, 'no LinkedIn link on the page')
        check(('From the article' in h) == bool(d.get('article')), 'article link wrong')
        check('Post kit' not in h, 'post kit on a production page')
        _, h = build.page(d, {}, '2026-12-01', True, kit=True)
        check('Post kit' in h and h.count('class="dc-copy"') >= 4, 'no post kit on a preview page')
        f = build.feed([d], '2026-12-01')
        check('rel="related" type="text/html" href="https://www.linkedin.com/posts/example-0001"' in f, 'no LinkedIn link in the feed')
        # a production build refuses a published discovery without its post
        with tempfile.TemporaryDirectory() as tmp:
            os.environ['OE_DISCOVERIES'] = 'production'
            real, build.OUT = build.OUT, tmp
            orig = content.load_all
            content.load_all = lambda: [dict(d, linkedin=[])]
            try:
                build.build(data=data, fonts=False, today='2026-12-01')
                check(False, 'a production build published a discovery with no LinkedIn post')
            except SystemExit:
                pass
            content.load_all = lambda: [d]
            s6 = build.build(data=data, fonts=False, today='2026-12-01')
            check(s6['built'] == [d['id']], 'a production build refused a discovery with its post')
            ph = open(os.path.join(tmp, d['id'], 'index.html'), encoding='utf-8').read()
            check('Post kit' not in ph and 'Draft, not published' not in ph, 'production page shows the kit or the banner')
            content.load_all = orig
            build.OUT = real
            os.environ.pop('OE_DISCOVERIES', None)

    if stale:
        print(f'discoveries: {len(stale)} figures differ from today\'s data (refreeze drafts with freeze.py; '
              'published ones are flagged by the live check)')
        for x in stale:
            print('  stale ' + x)
        if STRICT:
            fails.extend(stale)
    if fails:
        print(f'discoveries: {len(fails)} problems')
        for x in fails:
            print('  ' + x)
        return 1
    print(f'discoveries: {len(every)} files, every figure reproduces, gate and live check behave')
    return 0


if __name__ == '__main__':
    sys.exit(main())
