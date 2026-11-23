"""Share pages for Explore a measure (benchmarks item 7, 23 November 2026).

A shared link to a view of Explore a measure should show a preview image of that view. Link previews are fetched
by sites that never run the page's script or read the part of an address after '#', so each measure, and each
measure in each region, gets its own address with its own title and image:

  site/explorer/explore/<measure>/index.html            and card.png   (every secondary in England)
  site/explorer/explore/<measure>/<region>/index.html   and card.png   (that region against England)

Attainment 8 for all of England is the page itself (/explorer/explore/). Other settings (disadvantaged fifth,
a name filter, the sort) stay after the '#' and are not drawn in the image. The image shows the spread only:
no school is named, and nothing about report card grades.
Called from build_pages.py with the same rows as the school pages, after small groups are suppressed.
"""
import html
import json
import os
import re
import statistics

HERE = os.path.dirname(os.path.abspath(__file__))
EXPLORE = os.path.join(HERE, '..', 'site', 'explorer', 'explore')
ORIGIN = 'https://mrkdltn.com'
GROUND, INK, MUTED, LINE, BRASS, VERDIGRIS = '#0B1A2E', '#F5F1E8', '#A8B5C8', '#2B3C55', '#C9A24B', '#2F6F66'

KS4 = 'DfE, Key stage 4 performance 2025/26 (provisional, 28 October 2026)'
# the same measures, in the same order, as explore.js (M)
MEASURES = [
    ('a8', 'Attainment 8, 2025/26', '{:.1f}', KS4),
    ('em5', 'English and maths grade 5+, 2025/26', '{:.1f}%', KS4),
    ('em4', 'English and maths grade 4+, 2025/26', '{:.1f}%', KS4),
    ('ss_diff', 'Gap to the 50 similar schools, Attainment 8', '{:+.1f}', KS4 + '; open similar-schools replica'),
    ('cva_res', 'Gap to the contextual model, Attainment 8', '{:+.1f}', KS4 + '; the Explorer’s contextual model'),
    ('a8_25', 'Attainment 8, 2024/25 (final)', '{:.1f}', 'DfE, Key stage 4 performance 2024/25 (final)'),
    ('p8_24', 'Progress 8, 2023/24', '{:+.2f}', 'DfE, Key stage 4 performance 2023/24'),
    ('dis_a8', 'Attainment 8 of disadvantaged pupils, 2025/26', '{:.1f}', KS4 + '; blank where fewer than 10 such pupils'),
    ('dis_pct', 'Disadvantaged pupils in the GCSE year group', '{:.1f}%', KS4),
    ('pa_index', 'Prior attainment index (key stage 2 profile)', '{:+.1f}', 'DfE, Key stage 4 performance 2023/24'),
]


def slug(s):
    return re.sub(r'^-|-$', '', re.sub(r'[^a-z]+', '-', s.lower()))


def num(v):
    try:
        x = float(v)
        return x if x == x else None
    except (TypeError, ValueError):
        return None


def q(s, p):
    """Quantile of a sorted list, as d3.quantileSorted."""
    i = (len(s) - 1) * p
    lo = int(i)
    return s[lo] if lo + 1 >= len(s) else s[lo] + (s[lo + 1] - s[lo]) * (i - lo)


def nice_step(span, count):
    import math
    raw = span / count
    p = 10 ** math.floor(math.log10(raw))
    for m in (1, 2, 5, 10):
        if raw <= m * p * 1.0001:
            return m * p
    return 10 * p


def bins(vals, lo, step, n):
    out = [0] * n
    for v in vals:
        i = int((v - lo) // step)
        if 0 <= i < n:
            out[i] += 1
    return out


def card(key, lab, fmt, src, allv, sel, region, fonts):
    from PIL import Image, ImageDraw
    from build_pages import wrap
    W, H, M = 1200, 630, 64
    disp, sans = fonts
    fm = lambda v: fmt.format(v).replace("-", "−")
    im = Image.new('RGB', (W, H), GROUND)
    d = ImageDraw.Draw(im)
    d.text((M, 50), 'OFSTED EXPLORER · EXPLORE A MEASURE', font=sans(20, 650), fill=BRASS)
    t = 'mrkdltn.com'
    d.text((W - M - d.textlength(t, font=sans(20, 450)), 50), t, font=sans(20, 450), fill=MUTED)
    y = 96
    for size in (54, 48, 42):
        f = disp(size); lines = wrap(d, lab, f, W - 2 * M)
        if len(lines) <= 2:
            break
    for ln in lines[:2]:
        d.text((M, y), ln, font=f, fill=INK); y += int(size * 1.12)
    a, s = sorted(allv), sorted(sel)
    sub = (f'{len(s):,} secondary schools in {region}, against England' if region
           else f'Every secondary school in England with a figure: {len(a):,}')
    d.text((M, y + 6), sub, font=sans(24, 450), fill=MUTED)

    # the spread: each group as a share of itself, as on the page
    top, bot = y + 60, H - 128
    lo, hi = q(a, 0.002), q(a, 0.998)
    step = nice_step(hi - lo, 40)
    import math
    lo, hi = math.floor(lo / step) * step, math.ceil(hi / step) * step
    n = max(1, round((hi - lo) / step))
    bA, bS = bins(a, lo, step, n), bins(s, lo, step, n)
    tA, tS = sum(bA) or 1, sum(bS) or 1
    peak = max([c / tA for c in bA] + ([c / tS for c in bS] if region else [])) or 1
    X = lambda v: M + (W - 2 * M) * (v - lo) / (hi - lo)
    Y = lambda share: bot - (bot - top) * share / peak
    bw = (W - 2 * M) / n
    for i in range(n):
        x0 = M + i * bw
        if bA[i]:
            d.rectangle([x0 + 1, Y(bA[i] / tA), x0 + bw - 1, bot], fill=LINE if region else '#55627A')
    if region:
        for i in range(n):
            x0 = M + i * bw
            if bS[i]:
                d.rectangle([x0 + 3, Y(bS[i] / tS), x0 + bw - 3, bot], fill=VERDIGRIS, outline='#4E9A8F')
    d.line([(M, bot), (W - M, bot)], fill=MUTED, width=1)
    med = q(a, 0.5)
    for yy in range(int(top) - 6, int(bot), 10):
        d.line([(X(med), yy), (X(med), yy + 5)], fill=INK, width=2)
    tf = sans(18, 450)
    for v in (lo, med, hi):
        tx = fm(v)
        w = d.textlength(tx, font=tf)
        x = min(max(X(v) - w / 2, M), W - M - w)
        d.text((x, bot + 8), tx, font=tf, fill=INK if v == med else MUTED)

    sm = q(s, 0.5) if len(s) >= 10 else None
    if region:
        line = (f'Median school: England {fm(med)}' + (f' · {region} {fm(sm)}, middle half {fm(q(s, 0.25))} to {fm(q(s, 0.75))}'
                if sm is not None else f' · too few schools in {region} to describe their spread'))
    else:
        line = f'Median school {fm(med)} · middle half {fm(q(a, 0.25))} to {fm(q(a, 0.75))}'
    d.text((M, bot + 38), line, font=sans(20, 600), fill=INK)
    d.line([(M, H - 54), (W - M, H - 54)], fill=LINE, width=1)
    foot = 'Source: ' + src + '. A reading of the data, not a judgement on any school.'
    ff = sans(16, 450)
    while d.textlength(foot, font=ff) > W - 2 * M and ff.size > 12:
        ff = sans(ff.size - 1, 450)
    d.text((M, H - 40), foot, font=ff, fill=MUTED)
    return im.quantize(colors=48, method=2, dither=0)


def page(template, key, lab, region, img):
    e = lambda s: html.escape(s, quote=True)
    path = f'/explorer/explore/{key}/' + (slug(region) + '/' if region else '')
    url = ORIGIN + path
    where = f'secondary schools in {region}, against England' if region else 'every secondary school in England'
    title = f'{lab}: {where} · Ofsted Explorer'
    desc = f'{lab} across {where}: the spread, the median and a table of schools, each linked to its own page. Built from public data.'
    h = template
    subs = [
        (r'<title>.*?</title>', f'<title>{e(title)}</title>'),
        (r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{e(desc)}">'),
        (r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{url}">'),
        (r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{e(lab + ": " + where)}">'),
        (r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{e(desc)}">'),
    ]
    for pat, rep in subs:
        h, k = re.subn(pat, lambda m: rep, h, count=1)
        if k != 1:
            raise SystemExit(f'explore page template: no match for {pat}')
    # the template's own image lines (Attainment 8 across England) are swapped for this view's
    for pat, rep in [(r'<meta property="og:image" content="[^"]*">', f'<meta property="og:image" content="{img}">'),
                     (r'<meta property="og:image:alt" content="[^"]*">', f'<meta property="og:image:alt" content="{e("The spread of " + lab + " across " + where)}">'),
                     (r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{url}">')]:
        h, k = re.subn(pat, lambda m: rep, h, count=1)
        if k != 1:
            raise SystemExit(f'explore page template: no match for {pat}')
    view = json.dumps({'m': key, 'reg': region} if region else {'m': key}).replace('</', '<\\/')
    h = h.replace('<script src="/explorer/dash.js', f'<script>window.OE_XVIEW={view};</script>\n<script src="/explorer/dash.js', 1)
    if 'window.OE_XVIEW' not in h:
        raise SystemExit('explore page template: dash.js must be loaded from /explorer/dash.js')
    return path, h


def main(rows, fonts):
    """rows: the Explorer's secondary rows (dicts of strings). fonts: build_pages.load_fonts() or None."""
    with open(os.path.join(EXPLORE, 'index.html'), encoding='utf-8') as f:
        template = f.read()
    regions = sorted({r.get('region') for r in rows if r.get('region')})
    paths, n_img = [], 0
    for key, lab, fmt, src in MEASURES:
        allv = [v for v in (num(r.get(key)) for r in rows) if v is not None]
        if len(allv) < 10:
            continue
        for region in [''] + regions:
            if key == 'a8' and not region:  # the page itself: only its image is built
                if fonts:
                    card(key, lab, fmt, src, allv, allv, '', fonts).save(os.path.join(EXPLORE, 'card.png'), optimize=True)
                    n_img += 1
                continue
            sel = allv if not region else [v for v in (num(r.get(key)) for r in rows if r.get('region') == region) if v is not None]
            # every view the page can reach gets an address, so a link never 404s; a region with fewer than 10 schools
            # (or a build without Pillow) borrows a broader image rather than drawing a spread from too few
            own = bool(fonts) and len(sel) >= 10
            path = f'/explorer/explore/{key}/' + (slug(region) + '/' if region else '')
            img = (ORIGIN + path + 'card.png' if own else ORIGIN + ('/explorer/explore/card.png' if key == 'a8' else f'/explorer/explore/{key}/card.png') if fonts
                   else ORIGIN + '/writing/ofsted-report-cards/img/explorer-card.png')
            path, h = page(template, key, lab, region, img)
            d = os.path.join(EXPLORE, *path.strip('/').split('/')[2:])
            os.makedirs(d, exist_ok=True)
            with open(os.path.join(d, 'index.html'), 'w', encoding='utf-8') as f:
                f.write(h)
            if own:
                card(key, lab, fmt, src, allv, sel, region, fonts).save(os.path.join(d, 'card.png'), optimize=True)
                n_img += 1
            paths.append(path)
    print(f'explore pages: {len(paths)} pages, {n_img} share images')
    return paths
