"""Build a page and a share image for every secondary school in the Explorer.

  site/explorer/school/<URN>/index.html   the Explorer, opening on that school, with its own
                                          title, description, canonical address and share image
  site/explorer/school/<URN>/card.png     1200 x 630 share image
  site/sitemap.xml                        the site's pages plus every school page

Called from build_data.py once the rows are merged, so the pages always match the data.
The images need Pillow; if it is missing the pages are still built and share the Explorer's image.

The share image states published facts only (Ofsted's grades as published, Attainment 8 beside
the similar-schools and England averages). It carries no verdict or commentary on the school.
"""
import datetime
import html
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, '..', 'site')
EXPLORER = os.path.join(SITE, 'explorer')
FONTS = os.path.join(HERE, 'fonts')
ORIGIN = 'https://mrkdltn.com'

AREAS = [('g_ach', 'Achievement'), ('g_ct', 'Curriculum and teaching'), ('g_ab', 'Attendance and behaviour'),
         ('g_pd', 'Personal development and wellbeing'), ('g_inc', 'Inclusion'), ('g_lg', 'Leadership and governance'),
         ('g_ey', 'Early years'), ('g_p16', 'Post-16 provision')]
GRADE_COLOUR = {'Exceptional': '#0176E0', 'Strong standard': '#33903C', 'Expected standard': '#5CD168',
                'Needs attention': '#FF8341', 'Urgent improvement': '#CE1E02'}
GROUND, PANEL, INK, MUTED, LINE, BRASS = '#0B1A2E', '#13263F', '#F5F1E8', '#A8B5C8', '#2B3C55', '#C9A24B'

STATIC_PAGES = ['/', '/explorer/', '/explorer/areas/', '/writing/', '/writing/ofsted-report-cards/', '/writing/progress-8/',
                '/writing/curriculum-review/', '/colophon/']


def fnum(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def long_date(iso):
    d = datetime.date.fromisoformat(iso[:10])
    return f'{d.day} {d.strftime("%B %Y")}'


PHASE_PLURAL = {'Primary': 'primary schools', 'Secondary': 'secondary schools', 'Special': 'special schools',
                'Alternative provision': 'alternative provision schools', 'Nursery': 'nursery schools'}


def describe(r):
    where = r.get('la') or 'England'
    if r.get('rc_only'):
        return (f"{r['name']} ({where}): its Ofsted report card, each area set beside other "
                f"{PHASE_PLURAL.get(r.get('phase'), 'schools')} in England and those with similarly deprived intakes. Built from public data.")
    return (f"{r['name']} ({where}): its Ofsted report card beside its GCSE results, read against "
            f"its 50 most similar schools, the national average and a contextual model. Built from public data.")


# ---------- page ----------

def page(template, r, has_card):
    name, urn = r['name'], r['urn']
    title = f"{name} · Ofsted Explorer"
    desc = describe(r)
    url = f'{ORIGIN}/explorer/school/{urn}/'
    img = f'{ORIGIN}/explorer/school/{urn}/card.png' if has_card else \
        f'{ORIGIN}/writing/ofsted-report-cards/img/explorer-card.png'
    e = lambda s: html.escape(s, quote=True)
    h = template
    subs = [
        (r'<title>.*?</title>', f'<title>{e(title)}</title>'),
        (r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{e(desc)}">'),
        (r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{url}">'),
        (r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{e(name)}">'),
        (r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{e(desc)}">'),
        (r'<meta property="og:image" content="[^"]*">', f'<meta property="og:image" content="{img}">'
         '\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">'
         f'\n<meta property="og:image:alt" content="{e(("Ofsted report card for " if r.get("rc_only") else "Ofsted report card and Attainment 8 for ") + name)}">'
         f'\n<meta property="og:url" content="{url}">'),
    ]
    for pat, rep in subs:
        h, n = re.subn(pat, lambda m: rep, h, count=1)
        if n != 1:
            raise SystemExit(f'school page template: no match for {pat}')
    h = h.replace('<script src="/explorer/dash.js', f'<script>window.OE_URN="{urn}";</script>\n<script src="/explorer/dash.js', 1)
    if 'window.OE_URN' not in h:
        raise SystemExit('school page template: dash.js must be loaded from /explorer/dash.js')
    return h


# ---------- share image ----------

def wrap(draw, text, font, width):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=font) <= width or not cur:
            cur = t
        else:
            lines.append(cur); cur = w
    if cur:
        lines.append(cur)
    return lines


def card(r, nat_mean, fonts):
    from PIL import Image, ImageDraw
    W, H, M = 1200, 630, 64
    im = Image.new('RGB', (W, H), GROUND)
    d = ImageDraw.Draw(im)
    disp, sans = fonts

    # masthead
    d.text((M, 50), 'OFSTED EXPLORER', font=sans(20, 650), fill=BRASS, spacing=0)
    t = 'mrkdltn.com'
    d.text((W - M - d.textlength(t, font=sans(20, 450)), 50), t, font=sans(20, 450), fill=MUTED)

    # school name, up to two lines
    y = 96
    for size in (60, 52, 46, 40):
        f = disp(size); lines = wrap(d, r['name'], f, W - 2 * M)
        if len(lines) <= 2:
            break
    lines = lines[:2]
    for ln in lines:
        d.text((M, y), ln, font=f, fill=INK); y += int(size * 1.12)
    sub = ' · '.join(x for x in (r.get('la'), r.get('phase') or 'Secondary') if x)
    d.text((M, y + 8), sub, font=sans(24, 450), fill=MUTED)
    top = y + 64
    d.line([(M, top), (M + 72, top)], fill=BRASS, width=2)

    # report card, left column
    y = top + 22
    graded = [(lab, r.get(k, '')) for k, lab in AREAS if r.get(k, '') in GRADE_COLOUR]
    if graded:
        head = 'Report card' + (f", {long_date(r['insp_date'])}" if r.get('insp_date') else '')
        d.text((M, y), head, font=sans(20, 600), fill=MUTED); y += 36
        has_sg = r.get('g_sg', '') in ('Met', 'Not met')
        room = (H - 76) - y - (26 if has_sg else 0)
        step = max(24, min(33, room // len(graded)))
        fs = 21 if step >= 30 else 19
        for lab, g in graded:
            d.rectangle([M, y + 4 + (step - 24) // 2, M + 16, y + 20 + (step - 24) // 2], fill=GRADE_COLOUR[g])
            d.text((M + 28, y + (step - 30) // 2), lab, font=sans(fs, 450), fill=INK)
            d.text((M + 404, y + (step - 30) // 2), g, font=sans(fs, 650), fill=INK)
            y += step
        sg = r.get('g_sg', '')
        if sg in ('Met', 'Not met'):
            d.text((M + 28, y), 'Safeguarding standards ' + sg.lower(), font=sans(19, 450), fill=MUTED)
    else:
        d.text((M, y), 'Report card', font=sans(20, 600), fill=MUTED)
        d.text((M, y + 38), 'Not yet inspected under', font=sans(24, 450), fill=INK)
        d.text((M, y + 70), 'the report card framework.', font=sans(24, 450), fill=INK)

    x = 720
    if r.get('rc_only'):
        yy = top + 22
        d.text((x, yy), 'Phase', font=sans(20, 600), fill=MUTED)
        d.text((x, yy + 26), r.get('phase') or '', font=disp(60 if len(r.get('phase') or '') < 12 else 44), fill=INK)
        q = str(r.get('idaci_q') or '').split('.')[0]
        if q in ('1', '2', '3', '4', '5'):
            d.text((x, yy + 120), "Pupils' deprivation fifth", font=sans(21, 450), fill=MUTED)
            d.text((x + 260, yy + 120), f'{q} of 5', font=sans(21, 650), fill=INK)
            d.text((x, yy + 153), '1 is least deprived', font=sans(17, 450), fill=MUTED)
        d.line([(M, H - 64), (W - M, H - 64)], fill=LINE, width=1)
        d.text((M, H - 46), 'Built from public DfE and Ofsted data. A reading of the data, not a judgement on the school.',
               font=sans(17, 450), fill=MUTED)
        return im.quantize(colors=96, method=2, dither=0)

    # Attainment 8, right column
    a8, ss = fnum(r.get('a8')), fnum(r.get('ss_mean'))
    yy = top + 22
    d.text((x, yy), 'Attainment 8, 2025/26', font=sans(20, 600), fill=MUTED)
    if a8 is not None:
        d.text((x, yy + 26), f'{a8:.1f}', font=disp(92), fill=INK)
        rows = []
        if ss is not None:
            rows.append(('50 similar schools', f'{ss:.1f}'))
        if nat_mean is not None:
            rows.append(('England', f'{nat_mean:.1f}'))
        ry = yy + 138
        for lab, v in rows:
            d.text((x, ry), lab, font=sans(21, 450), fill=MUTED)
            d.text((x + 260, ry), v, font=sans(21, 650), fill=INK)
            ry += 33
        d.text((x, ry + 6), 'Provisional results', font=sans(17, 450), fill=MUTED)
    else:
        d.text((x, yy + 38), 'Not published', font=sans(24, 450), fill=INK)

    # foot
    d.line([(M, H - 64), (W - M, H - 64)], fill=LINE, width=1)
    d.text((M, H - 46), 'Built from public DfE and Ofsted data. A reading of the data, not a judgement on the school.',
           font=sans(17, 450), fill=MUTED)
    return im.quantize(colors=96, method=2, dither=0)


def load_fonts():
    from PIL import ImageFont
    cache = {}

    def disp(size):
        k = ('d', size)
        if k not in cache:
            cache[k] = ImageFont.truetype(os.path.join(FONTS, 'libre-caslon-display.ttf'), size)
        return cache[k]

    def sans(size, weight=450):
        k = ('s', size, weight)
        if k not in cache:
            f = ImageFont.truetype(os.path.join(FONTS, 'hanken-grotesk.ttf'), size)
            try:
                f.set_variation_by_axes([weight])
            except Exception:
                pass
            cache[k] = f
        return cache[k]
    return disp, sans


# ---------- build ----------

_FONTS = None


def _draw(job):
    global _FONTS
    r, nat_mean, path = job
    if _FONTS is None:
        _FONTS = load_fonts()
    card(r, nat_mean, _FONTS).save(path, optimize=True)
    return 1


def main(rows, rc_rows=(), only=None):
    have = {r['urn'] for r in rows}
    extra = [dict(r, rc_only='yes') for r in rc_rows if r['urn'] not in have]
    rows = list(rows) + sorted(extra, key=lambda r: int(r['urn']))
    with open(os.path.join(EXPLORER, 'index.html'), encoding='utf-8') as f:
        template = f.read()
    try:
        fonts = load_fonts()
    except Exception as ex:  # Pillow missing: pages still build
        print('school pages: no share images (', ex, ')')
        fonts = None
    diffs = [(fnum(r.get('a8')), fnum(r.get('nat_diff'))) for r in rows if not r.get('rc_only')]
    nats = [a - n for a, n in diffs if a is not None and n is not None]
    nat_mean = round(sum(nats) / len(nats), 2) if nats else None

    sample = int(os.environ.get('OE_PAGES_SAMPLE') or 0)
    if sample and not only:
        only = {r['urn'] for r in rows[:sample]}
    out = os.path.join(EXPLORER, 'school')
    jobs, n_pages = [], 0
    for r in rows:
        if only and r['urn'] not in only:
            continue
        d = os.path.join(out, r['urn']); os.makedirs(d, exist_ok=True)
        if fonts:
            jobs.append((r, nat_mean, os.path.join(d, 'card.png')))
        with open(os.path.join(d, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(page(template, r, bool(fonts)))
        n_pages += 1
    n_img = 0
    if jobs:
        from concurrent.futures import ProcessPoolExecutor
        with ProcessPoolExecutor(max_workers=os.cpu_count() or 2) as ex:
            n_img = sum(ex.map(_draw, jobs, chunksize=64))

    today = datetime.date.today().isoformat()
    urls = [ORIGIN + p for p in STATIC_PAGES] + [f'{ORIGIN}/explorer/school/{r["urn"]}/' for r in rows]
    with open(os.path.join(SITE, 'sitemap.xml'), 'w') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        for u in urls:
            f.write(f'<url><loc>{u}</loc><lastmod>{today}</lastmod></url>\n')
        f.write('</urlset>\n')
    print(f'school pages: {n_pages} pages ({len(extra)} without results), {n_img} share images, England A8 mean {nat_mean}')


if __name__ == '__main__':
    import sys, csv
    sys.path.insert(0, HERE)
    rows = list(csv.DictReader(open(os.path.join(HERE, '..', 'data', 'raw', 'ks4_model_v3.csv'), encoding='utf-8')))
    rc = list(csv.DictReader(open(os.path.join(HERE, '..', 'data', 'raw', 'ofsted_rc.csv'), encoding='utf-8')))
    main(rows, rc, only=set(sys.argv[1:]) or None)
