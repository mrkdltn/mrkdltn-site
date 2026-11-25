"""Checks for Discoveries. Run after a build (python3 scripts/build_data.py), from the repository root:

    python3 scripts/discoveries/test_discoveries.py

1. Every discovery file is sound (content.problems) and reads the same with PyYAML, where installed.
2. Every frozen figure, and every chart value, reproduces from its compute function on today's data. A published
   discovery is checked within the live-check tolerance instead (its figures are allowed to age).
3. Every number in a title, standfirst, body or limitation is one of the discovery's figures, or a fixed part of a
   definition (50 similar schools, 2024/25 results).
4. A production build builds no candidate, draft or approved discovery; a preview build builds them behind the banner.
5. The live check flags a figure that has moved by more than 2 points, and the page then shows the dated line.
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

FIXED = {'50', '2024', '25', '10', '2025', '26'}  # 50 similar schools; 2024/25 and 2025/26 results; groups of 10
fails = []


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
        tol = build.TOLERANCE if d['status'] in build.PUBLIC else 0.005
        allowed = set(FIXED)
        for fig in d['figures']:
            r = figures.compute(fig['compute'], data)
            if fig.get('unit') == 'schools':
                check(d['status'] in build.PUBLIC or r['value'] == fig['value'], f'{f}: {fig["compute"]} is {r["value"]}, frozen {fig["value"]}')
            else:
                check(r['value'] is not None and abs(r['value'] - fig['value']) <= tol,
                      f'{f}: {fig["compute"]} is {r["value"]}, frozen {fig["value"]}')
            check(d['status'] in build.PUBLIC or r['n'] == fig['n'], f'{f}: {fig["compute"]} n is {r["n"]}, frozen {fig["n"]}')
            v = fig['value']
            allowed |= {f'{abs(v):.0f}', f'{abs(v):.1f}', str(abs(v)), f'{int(fig["n"])}'}  # a difference is quoted as a size
        if d['status'] not in build.PUBLIC:
            live = figures.compute(d['chart']['compute'], data)
            for k, v in live.items():
                check(d['chart'].get(k) == v, f'{f}: chart {k} does not reproduce from {d["chart"]["compute"]}')
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
        check('Since publication, with 12 more inspections, this figure is now' in h, 'no dated live-check line on the page')
        d2 = copy.deepcopy(pcts[0])
        check(not build.live_check(d2, data) or d2['status'] in build.PUBLIC, 'live check flags an unmoved draft')

    if fails:
        print(f'discoveries: {len(fails)} problems')
        for x in fails:
            print('  ' + x)
        return 1
    print(f'discoveries: {len(every)} files, every figure reproduces, gate and live check behave')
    return 0


if __name__ == '__main__':
    sys.exit(main())
