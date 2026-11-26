"""Build Discoveries (/explorer/discoveries/): short, dated findings, each one claim with one chart, each opening the
Explorer on the view that shows the evidence.

Called from scripts/build_data.py after the data and school pages are written, before the share tags, sitemap and
metadata check (site_meta.py, check_meta.py), so every page it writes is checked like any other.

  site/explorer/discoveries/index.html        the dated list, newest first, with a theme filter
  site/explorer/discoveries/<id>/index.html   one page per discovery, and its card.png (1200 x 630, Paper register)
  site/explorer/discoveries/card.png          the list page's share image
  site/explorer/discoveries/feed.xml          Atom feed
  site/explorer/discoveries/index.json        what was built, for the Explorer's related links and the sitemap dates

The approval gate. Only `published` discoveries (and `superseded` ones, so no address ever breaks) are built into
production. Candidates, drafts and approved-but-unpublished discoveries are built only on preview builds, each behind a
"Draft, not published" banner, marked noindex. Production is a Cloudflare build of `main` (CF_PAGES_BRANCH=main); any
other branch, or a local build with no CF_PAGES_BRANCH, is a preview. OE_DISCOVERIES=production|preview overrides both.
With nothing to build, only index.json is written (an empty list), so production shows nothing until something is
published. A status moves to `published` only when Mark says so; this code never changes a status.

Frozen numbers, live check. Each figure's value and n are frozen in its file. Every build re-runs each figure's compute
function on today's data; where a percentage has moved by more than 2 points, or a difference has changed sign, the
page shows a dated line ("Since publication, with N more inspections, this figure is now X.") and build.json lists the
discovery under discoveries.review.
"""
import datetime
import html
import json
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
import content  # noqa: E402
import figures  # noqa: E402

SITE = os.path.normpath(os.path.join(HERE, '..', '..', 'site'))
OUT = os.path.join(SITE, 'explorer', 'discoveries')
BASE = '/explorer/discoveries/'
ORIGIN = 'https://mrkdltn.com'
TOLERANCE = 2.0  # percentage points
PUBLIC = ('published', 'superseded')
STATIC = {'discoveries.css', 'disc.js'}  # committed files in OUT; everything else there is built
FEED_TITLE = 'Ofsted Explorer: discoveries'
PAPER, INK, MUTED, BRASS, BRASS_TEXT, LINE = '#F6F3EC', '#0B1A2E', '#55627A', '#C9A24B', '#7A5C14', '#D8DDE5'


def mode():
    m = (os.environ.get('OE_DISCOVERIES') or '').strip().lower()
    if m in ('production', 'preview'):
        return m
    return 'production' if os.environ.get('CF_PAGES_BRANCH') == 'main' else 'preview'


def preview_host():
    b = os.environ.get('CF_PAGES_BRANCH')
    if not b or b == 'main':
        return None
    return 'https://' + re.sub(r'[^a-z0-9-]', '-', b.lower()).strip('-') + '.mrkdltn-site.pages.dev'


e = lambda s: html.escape(str(s), quote=True)


def long_date(iso):
    return figures.long_date(iso)


def fmt(v, unit, dp=0):
    if v is None:
        return 'not given'
    if unit in ('schools', 'estimates'):
        return f'{int(v):,}'
    if unit == 'p':
        return f'{v:.3f}'
    x = f'{v:.{dp}f}'
    if unit == '%':
        return x + '%'
    if unit == 'pp':
        return x + (' percentage point' if x == '1' else ' percentage points')
    return x


def big(v, unit):
    """A figure as set large on the page and the card."""
    if unit == 'schools':
        return f'{int(v):,}'
    if unit == 'pp':
        return f'{v:+.1f}'.replace('-', '−') + ' pts'
    return f'{v:.0f}%' if unit == '%' else f'{v:.0f}'


# ---------- Markdown, the small part a discovery needs ----------

def inline(s):
    s = e(s).replace('&#x27;', '’')
    s = re.sub(r"(\w)'(\w)", r'\1’\2', s)
    s = re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', lambda m: f'<a href="{m.group(2)}">{m.group(1)}</a>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', s)
    return s


def paras(md):
    return ''.join(f'<p>{inline(p.strip())}</p>\n' for p in re.split(r'\n\s*\n', md.strip()) if p.strip())


def typo(s):
    return str(s).replace("'", '’')


# ---------- live check ----------

def live_check(d, data):
    """Recompute every figure. Returns [{compute, frozen, live, n_frozen, n_live, moved}] for the figures that moved
    beyond tolerance (and records every live value on the figure as _live)."""
    moved = []
    for fig in d.get('figures') or []:
        try:
            r = figures.compute(fig['compute'], data)
        except KeyError as ex:
            raise SystemExit(f'{d["_file"]}: {ex}')
        fig['_live'] = r
        if fig.get('unit') not in ('%', 'pp') or r['value'] is None or fig.get('value') is None:
            continue
        a, b = float(fig['value']), float(r['value'])
        flip = fig.get('unit') == 'pp' and a * b < 0
        if abs(b - a) > TOLERANCE or flip:
            moved.append({'compute': fig['compute'], 'label': fig['label'], 'frozen': a, 'live': round(b, 2),
                          'n_frozen': fig.get('n'), 'n_live': r['n'], 'direction_changed': flip})
            fig['_moved'] = moved[-1]
    return moved


def since_line(fig, today):
    m = fig['_moved']
    more = (m['n_live'] or 0) - (m['n_frozen'] or 0)
    what = f'with {more:,} more inspection{"s" if more != 1 else ""}' if more > 0 else 'on the latest data'
    return (f'<p class="dc-since">Since publication, {what}, this figure is now '
            f'<b>{fmt(m["live"], fig.get("unit"))}</b>. <time datetime="{today}">Checked {long_date(today)}</time>.</p>')


# ---------- share image ----------

def card(d, fonts, draft, out_path):
    from PIL import Image, ImageDraw
    from build_pages import wrap
    disp, sans = fonts
    W, H, M = 1200, 630, 64
    im = Image.new('RGB', (W, H), PAPER)
    dr = ImageDraw.Draw(im)
    dr.text((M, 50), 'OFSTED EXPLORER · DISCOVERY', font=sans(20, 650), fill=BRASS_TEXT)
    right = 'DRAFT · NOT PUBLISHED' if draft else 'mrkdltn.com'
    f = sans(20, 650 if draft else 450)
    dr.text((W - M - dr.textlength(right, font=f), 50), right, font=f, fill='#A3402B' if draft else MUTED)
    title = typo(d['title'])
    y = 98
    figs = [x for x in d['figures'] if x.get('key')][:2]
    max_lines = 3 if figs else 4
    for size in (58, 52, 46, 42, 38):
        tf = disp(size)
        lines = wrap(dr, title, tf, W - 2 * M)
        if len(lines) <= max_lines:
            break
    for ln in lines[:max_lines]:
        dr.text((M, y), ln, font=tf, fill=INK)
        y += int(size * 1.14)
    y += 14
    dr.line([(M, y), (M + 72, y)], fill=BRASS, width=3)
    y += 24
    if figs:
        col = (W - 2 * M) // len(figs)
        vf = disp(92 if len(lines) < 3 else 76)
        lf = sans(21, 450)
        for i, fig in enumerate(figs):
            x = M + i * col
            dr.text((x, y), big(fig['value'], fig.get('unit')), font=vf, fill=INK)
            ly = y + (114 if len(lines) < 3 else 96)  # clear of the descenders in 'pts'
            for ln in wrap(dr, typo(fig['label']), lf, col - 40)[:2]:
                dr.text((x, ly), ln, font=lf, fill=MUTED)
                ly += 27
            dr.text((x, ly + 2), f'{fig["n"]:,} schools', font=sans(18, 600), fill=INK)
    # foot: the source, then the date
    dr.line([(M, H - 70), (W - M, H - 70)], fill=LINE, width=1)
    date = long_date(d['date'])
    df = sans(18, 600)
    dw = dr.textlength(date, font=df) if date else 0
    src = 'Source: ' + typo(short_source(d)) + '.'
    sf = sans(16, 450)
    lines = wrap(dr, src, sf, W - 2 * M - dw - 40)
    while len(lines) > 2 and sf.size > 12:
        sf = sans(sf.size - 1, 450)
        lines = wrap(dr, src, sf, W - 2 * M - dw - 40)
    yy = H - 56 if len(lines) > 1 else H - 46
    for ln in lines[:2]:
        dr.text((M, yy), ln, font=sf, fill=MUTED)
        yy += sf.size + 5
    if date:
        dr.text((W - M - dw, H - 46), date, font=df, fill=INK)
    im.quantize(colors=64, method=2, dither=0).save(out_path, optimize=True)


def list_card(newest, fonts, out_path, preview=False):
    """The list page's share image: the name, what it is, and the newest discovery's title."""
    from PIL import Image, ImageDraw
    from build_pages import wrap
    disp, sans = fonts
    W, H, M = 1200, 630, 64
    im = Image.new('RGB', (W, H), PAPER)
    dr = ImageDraw.Draw(im)
    dr.text((M, 50), 'OFSTED EXPLORER', font=sans(20, 650), fill=BRASS_TEXT)
    t, tf = ('PREVIEW · DRAFTS SHOWN', sans(20, 650)) if preview else ('mrkdltn.com', sans(20, 450))
    dr.text((W - M - dr.textlength(t, font=tf), 50), t, font=tf, fill='#A3402B' if preview else MUTED)
    dr.text((M, 104), 'Discoveries', font=disp(108), fill=INK)
    dr.text((M, 236), 'Short, dated findings from public data, each one claim with one chart.', font=sans(27, 450), fill=MUTED)
    dr.line([(M, 300), (M + 72, 300)], fill=BRASS, width=3)
    y = 326
    dr.text((M, y), 'LATEST · ' + long_date(newest['date']).upper(), font=sans(18, 650), fill=BRASS_TEXT)
    y += 34
    tf = disp(40)
    for ln in wrap(dr, typo(newest['title']), tf, W - 2 * M)[:3]:
        dr.text((M, y), ln, font=tf, fill=INK)
        y += 48
    dr.line([(M, H - 70), (W - M, H - 70)], fill=LINE, width=1)
    dr.text((M, H - 46), 'Built from public DfE and Ofsted data. A reading of the data, not a judgement on any school.',
            font=sans(17, 450), fill=MUTED)
    im.quantize(colors=64, method=2, dither=0).save(out_path, optimize=True)


def short_source(d):
    """The card's source line: the data sets and their dates, without the long release titles."""
    if d.get('card_source'):
        return d['card_source']
    srcs = d['chart'].get('source') or d['figures'][0]['source']
    out = []
    if 'Ofsted' in srcs:
        out.append(f'Ofsted report cards published to {long_date(d["figures"][0]["as_at"])}')
    if '2024/25 (final)' in srcs:
        out.append('DfE GCSE results 2024/25 (final)')
    if '2025/26 (provisional' in srcs:
        out.append('DfE GCSE results 2025/26 (provisional)')
    return '; '.join(out) + '. Secondary schools in England'


# ---------- pages ----------

NAV = ('<header class="site-head band midnight"><div class="wrap">\n  <a class="brand" href="/">Mark Dalton</a>\n'
       '  <nav class="nav" aria-label="Main"><a href="/writing/">Writing</a><a href="/explorer/" aria-current="page"><span class="nav-long">Ofsted </span>Explorer</a>'
       '<a href="/#about">About</a><a href="/contact/">Contact</a><a class="nav-li" href="https://www.linkedin.com/in/mrkdltn" aria-label="Mark Dalton on LinkedIn">'
       '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg></a></nav>\n'
       '</div></header>\n')
FOOT = ('<footer class="site-foot noprint"><div class="wrap">\n  <span>© 2026 Mark Dalton. Built from public DfE and Ofsted data. Views are my own.</span>\n'
        '  <span><a href="/">Home</a> · <a href="/explorer/">Explorer</a> · <a href="/explorer/discoveries/feed.xml">Feed</a> · <a href="/colophon/">Colophon</a></span>\n'
        '</div></footer>\n')


def head(title, desc, path, img, alt, kind='website', published=None, modified=None, noindex=False, ld=None):
    url = ORIGIN + path
    t = [f'<!doctype html>\n<html lang="en-GB">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">',
         f'<title>{e(title)}</title>',
         f'<meta name="description" content="{e(desc)}">']
    if noindex:
        t.append('<meta name="robots" content="noindex">')
    t += [f'<link rel="canonical" href="{url}">',
          f'<meta property="og:type" content="{kind}">',
          '<meta property="og:site_name" content="Mark Dalton">',
          f'<meta property="og:title" content="{e(title.split(" · ")[0])}">',
          f'<meta property="og:description" content="{e(desc)}">',
          f'<meta property="og:url" content="{url}">',
          f'<meta property="og:image" content="{(preview_host() or ORIGIN) + img}">',
          '<meta property="og:image:type" content="image/png">',
          '<meta property="og:image:width" content="1200">',
          '<meta property="og:image:height" content="630">',
          f'<meta property="og:image:alt" content="{e(alt)}">']
    if kind == 'article':
        t += [f'<meta property="article:published_time" content="{published}">',
              f'<meta property="article:modified_time" content="{modified}">']
    t += ['<meta name="twitter:card" content="summary_large_image">',
          '<link rel="alternate" type="application/atom+xml" title="Mark Dalton: writing" href="/feed.xml">',
          f'<link rel="alternate" type="application/atom+xml" title="{FEED_TITLE}" href="/explorer/discoveries/feed.xml">']
    if ld:
        t.append('<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False).replace('</', '<\\/') + '</script>')
    t += ['<meta name="theme-color" content="#0B1A2E">',
          '<link rel="preload" href="/assets/fonts/libre-caslon-display.woff2" as="font" type="font/woff2" crossorigin>',
          '<link rel="stylesheet" href="/assets/site.css">',
          '<link rel="stylesheet" href="/explorer/explorer.css">',
          '<link rel="stylesheet" href="/explorer/discoveries/discoveries.css">',
          '<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">',
          '</head>']
    return '\n'.join(t) + '\n'


def banner(d):
    s = d['status']
    what = {'candidate': 'Candidate', 'draft': 'Draft', 'approved': 'Approved'}.get(s, s.capitalize())
    return (f'<div class="dc-draft" role="note"><div class="wrap"><b>Draft, not published.</b> {what}: shown on preview builds only. '
            'Its figures and words are not yet approved and it is not on mrkdltn.com.</div></div>\n')


def chart_json(d, small=False):
    ch = d['chart']
    spec = {k: ch.get(k) for k in ('form', 'title', 'x', 'xtitle', 'ymax', 'series', 'rows', 'legend', 'threshold') if ch.get(k) is not None}
    spec.update({'id': d['id'], 'source': chart_source(d), 'version': ch.get('data_version') or ''})
    if small:
        spec['small'] = True
    return e(json.dumps(spec, ensure_ascii=False, separators=(',', ':')))


def chart_source(d):
    ch = d['chart']
    return (f'{ch.get("source") or d["figures"][0]["source"]}. Figures as published on {long_date(d["date"])}, '
            f'report cards to {long_date(ch.get("as_at") or d["figures"][0]["as_at"])}.')


def legend(d):
    ch = d['chart']
    if ch['form'] == 'whisker':
        items = ['<span><i class="dc-dot dc-dot-raw"></i>Deprivation alone</span>',
                 '<span><i class="dc-dot dc-dot-ctl"></i>Other context held constant</span>',
                 '<span><i class="dc-dot dc-dot-low"></i>Too few schools to read</span>']
    elif ch['form'] == 'pairs':
        items = [f'<span><b style="background:{c}"></b>{e(n)}</span>' for c, n in ch.get('legend') or []]
    else:
        items = ['<span><i{}></i>{}</span>'.format('' if s.get('main') else ' class="d"', e(s['name'])) for s in ch.get('series') or []]
        if len(items) < 2:
            return ''
    return '<div class="dc-legend">' + ''.join(items) + '</div>'


def chart_table(d):
    """The chart's figures as a plain table, in the page itself: readable with no script, and in the feed."""
    ch = d['chart']
    pc = lambda v: '—' if v is None else f'{v:.0f}%'
    if ch['form'] == 'whisker':
        ci = lambda c: '{} ({} to {})'.format(*[('+' if x > 0 else '−' if x < 0 else '') + f'{abs(x):.1f}' for x in c])
        head = ('<tr><th scope="col">Area</th><th scope="col">Deprivation alone</th><th scope="col">Context held constant</th>'
                '<th scope="col">Reading</th></tr>')
        body = ''.join(f'<tr><th scope="row">{e(r["label"])}</th><td>{ci(r["raw"])} <small>({r["n_raw"]:,})</small></td>'
                       f'<td>{ci(r["controlled"])} <small>({r["n"]:,})</small></td><td>{e(r["reading"])}</td></tr>' for r in ch['rows'])
        return (f'<table class="dc-ftable"><caption>{e(ch["title"])}: percentage points, 95% confidence interval (schools)</caption>'
                f'<thead>{head}</thead><tbody>{body}</tbody></table>')
    if ch['form'] == 'pairs':
        names = [n for _, n in ch.get('legend') or []]
        head = '<tr><th scope="col">Area</th>' + ''.join(f'<th scope="col">{e(n)}</th>' for n in names) + '</tr>'
        body = ''.join('<tr><th scope="row">' + e(r['label']) + '</th>' +
                       ''.join(f'<td>{pc(v)} <small>({n:,})</small></td>' for v, n in zip(r['values'], r['n'])) + '</tr>'
                       for r in ch['rows'])
    else:
        head = '<tr><th scope="col">Group</th>' + ''.join(f'<th scope="col">{e(s["name"])}</th>' for s in ch['series']) + '</tr>'
        body = ''.join('<tr><th scope="row">' + e(x) + '</th>' +
                       ''.join(f'<td>{pc(s["values"][i])} <small>({s["n"][i]:,})</small></td>' for s in ch['series']) + '</tr>'
                       for i, x in enumerate(ch['x']))
    return (f'<table class="dc-ftable"><caption>{e(ch["title"])}: share below Expected standard (schools)</caption>'
            f'<thead>{head}</thead><tbody>{body}</tbody></table>')


def method_items(d, today):
    out = []
    for fig in d['figures']:
        fn = figures.FIGURES.get(fig['compute'])
        how = ' '.join((fn.__doc__ or '').split()) if fn else ''
        live = since_line(fig, today) if fig.get('_moved') else ''
        schools = ' ({:,} schools)'.format(int(fig['n'])) if fig.get('unit') in ('%', 'pp', 'p') else ''
        out.append(f'<li><p class="dc-ml"><b>{e(typo(fig["label"]))}</b>: {fmt(fig["value"], fig.get("unit"), 1)}'
                   f'{schools}</p>'
                   f'<p>{e(typo(how))}</p>'
                   f'<p class="dc-msrc">Source: {e(typo(fig["source"]))}. As at {long_date(fig["as_at"])}. '
                   f'Computed by <code>{e(fig["compute"])}</code> in <code>scripts/discoveries/figures.py</code>.</p>{live}</li>')
    return '<ol class="dc-method">' + ''.join(out) + '</ol>'


def article_title(path):
    """The site article's own title (its og:title), so the link never drifts from the article."""
    f = os.path.join(SITE, *path.strip('/').split('/'), 'index.html')
    try:
        h = open(f, encoding='utf-8').read(20000)
    except OSError:
        raise SystemExit(f'discoveries: article {path} does not exist on the site')
    m = re.search(r'<meta property="og:title" content="([^"]*)">', h)
    return html.unescape(m.group(1)) if m else path


def chain(d):
    """'From the article' and 'Discussed on LinkedIn': quiet, dated links, only where the file names them."""
    out = []
    if d.get('article'):
        out.append(f'<p><span class="dc-chl">From the article</span> <a href="{e(d["article"])}">{e(typo(article_title(d["article"])))}</a></p>')
    for x in sorted(d.get('linkedin') or [], key=lambda x: str(x['date'])):
        kind = 'post' if x['kind'] == 'post' else 'article'
        out.append(f'<p><span class="dc-chl">Discussed on LinkedIn</span> <a href="{e(x["url"])}" rel="noopener">{e(typo(x["title"]))}</a> '
                   f'<span class="dc-chd">({kind}, <time datetime="{x["date"]}">{long_date(x["date"])}</time>)</span></p>')
    return f'<div class="dc-chain">{"".join(out)}</div>' if out else ''


def post_kit(d):
    """Preview builds only: the facts Mark needs for the LinkedIn post, each with a copy button. No post text."""
    path = BASE + d['id'] + '/'
    keyf = [f for f in d['figures'] if f.get('key')]
    items = [('Link', ORIGIN + path), ('Share image', ORIGIN + path + 'card.png'), ('Claim', typo(d['title']))]
    for f in keyf:
        items.append(('Key figure', f'{typo(f["label"])}: {fmt(f["value"], f.get("unit"), 1)} ({int(f["n"]):,} schools)'))
    items.append(('Source', typo(f'{keyf[0]["source"] if keyf else d["figures"][0]["source"]}. As at {long_date((keyf or d["figures"])[0]["as_at"])}.')))
    rows = ''.join(f'<div class="dc-kr"><dt>{e(k)}</dt><dd><span class="dc-kv">{e(v)}</span>'
                   f'<button type="button" class="dc-copy" data-copy="{e(v)}" aria-label="Copy the {e(k.lower())}">Copy</button></dd></div>'
                   for k, v in items)
    return ('<aside class="dc-kit noprint" aria-labelledby="dc-kh"><h2 id="dc-kh">Post kit</h2>'
            '<p class="dc-kn">Preview only. The facts for the LinkedIn post; the post itself is written by hand. '
            'The link and image work once the discovery is published.</p>'
            f'<dl>{rows}</dl></aside>')


def page(d, all_by_id, today, draft, kit=False):
    path = BASE + d['id'] + '/'
    url = ORIGIN + path
    modified = str(d.get('modified') or d['date'])
    title = typo(d['title'])
    keyf = [f for f in d['figures'] if f.get('key')]
    alt = (f'{title}. ' + '; '.join(f'{f["label"]}: {big(f["value"], f.get("unit"))}' for f in keyf[:2]) +
           f'. {long_date(d["date"])}.')
    ld = {'@context': 'https://schema.org', '@type': 'Article', '@id': url + '#article', 'headline': title,
          'description': typo(d['standfirst']), 'url': url, 'mainEntityOfPage': url,
          'datePublished': str(d['date']), 'dateModified': modified, 'inLanguage': 'en-GB', 'isAccessibleForFree': True,
          'author': {'@type': 'Person', '@id': ORIGIN + '/#person', 'name': 'Mark Dalton', 'url': ORIGIN + '/'},
          'publisher': {'@type': 'Person', '@id': ORIGIN + '/#person', 'name': 'Mark Dalton', 'url': ORIGIN + '/'},
          'image': {'@type': 'ImageObject', 'url': ORIGIN + path + 'card.png', 'width': 1200, 'height': 630},
          'isPartOf': {'@type': 'CollectionPage', 'name': 'Discoveries', 'url': ORIGIN + BASE}}
    h = head(f'{title} · Ofsted Explorer discoveries', typo(d['standfirst']), path, path + 'card.png', alt,
             'article', str(d['date']), modified, noindex=draft, ld=ld)
    theme = content.THEMES.get(d['theme'], '')
    note = ''
    if d.get('superseded_by') and d['superseded_by'] in all_by_id:
        n = all_by_id[d['superseded_by']]
        note = (f'<p class="dc-super">Superseded on {long_date(n["date"])} by '
                f'<a href="{BASE}{n["id"]}/">{e(typo(n["title"]))}</a>. This page is kept as first published.</p>')
    elif d.get('superseded_by'):
        note = '<p class="dc-super">This discovery has been superseded. It is kept as first published.</p>'
    if d.get('supersedes') and d['supersedes'] in all_by_id:
        o = all_by_id[d['supersedes']]
        note += f'<p class="dc-super">This replaces <a href="{BASE}{o["id"]}/">an earlier discovery</a> of {long_date(o["date"])}.</p>'
    keys = ''.join(f'<div class="dc-k"><b>{big(f["value"], f.get("unit"))}</b><span>{e(typo(f["label"]))}</span>'
                   f'<small>{int(f["n"]):,} schools</small>{since_line(f, today) if f.get("_moved") else ""}</div>' for f in keyf)
    related = ''.join(f'<li><a href="{e(r)}">{e(related_label(r))}</a></li>' for r in d.get('related') or [])
    cite = (f'Dalton, M. ({str(d["date"])[:4]}). {e(title)}. Ofsted Explorer discoveries, {long_date(d["date"])}. '
            f'{url}')
    body = f"""<body class="stone dc-page">
<a class="skip" href="#main">Skip to the content</a>
{NAV}<main id="main">
{banner(d) if draft else ''}<div class="band midnight article-band"><div class="wrap"><header class="article-head">
<p class="label"><a href="{BASE}">Discoveries</a> &middot; <time datetime="{d['date']}">{long_date(d['date'])}</time> &middot; {e(theme)}</p>
<h1>{e(title)}</h1>
<p class="standfirst">{e(typo(d['standfirst']))}</p>
</header></div></div>
<div class="wrap"><article class="prose-sheet dc-sheet">
{note}<div class="dc-keys">{keys}</div>
<figure class="dc-fig oe" aria-labelledby="dc-ct">
<p class="dc-ct" id="dc-ct">{e(typo(d['chart']['title']))}</p>
{legend(d)}
<div class="dc-ch ar-ch" id="dc-chart" data-chart="{chart_json(d)}">{chart_table(d)}</div>
</figure>
<div class="dc-body">
{paras(d['_body'])}<p class="dc-lim"><b>Limitation.</b> {inline(d['limitation'])}</p>
</div>
<p class="dc-cta"><a class="btn" href="{e(d['explore'])}">Explore this</a><span>Opens the Explorer on the view behind this chart, worked out afresh from today&rsquo;s data.</span></p>
{chain(d)}{post_kit(d) if kit else ''}
<section class="dc-sec" aria-labelledby="dc-mh"><h2 id="dc-mh">Method</h2>
<p>Every figure here is frozen as it stood on {long_date(d['date'])}. Each is reproduced by a named function in the site&rsquo;s open code, run on the Explorer&rsquo;s own data, and every build of the site runs it again: if a share moves by more than 2 percentage points, this page says so under the figure. Groups of fewer than 10 schools give no figure. A grade counts as below Expected standard when it is Needs attention or Urgent improvement.</p>
{method_items(d, today)}
</section>
<section class="dc-sec" aria-labelledby="dc-ch2"><h2 id="dc-ch2">Cite this</h2><p class="dc-cite">{cite}</p></section>
{f'<section class="dc-sec" aria-labelledby="dc-rh"><h2 id="dc-rh">Beside this in the Explorer</h2><ul class="dc-rel">{related}</ul></section>' if related else ''}
<p class="dc-back"><a href="{BASE}">All discoveries</a></p>
</article></div>
</main>
{FOOT}<script src="/assets/d3.min.js"></script>
<script src="/explorer/dash.js"></script>
<script src="/explorer/areas/chart.js"></script>
<script src="/explorer/exhibit.js"></script>
<script src="/explorer/discoveries/disc.js"></script>
</body>
</html>
"""
    return path, h + body


RELATED = {'/explorer/areas/': 'Report card areas in context', '/explorer/': 'The Ofsted Explorer'}
SECTIONS = {'results': 'same results, different grades', 'together': 'grades travel together', 'context': 'other parts of context',
            'allphases': 'report card grades by pupils’ deprivation, all phases', 'national': 'results against context'}


def related_label(r):
    p, _, sec = r.partition('#')
    base = RELATED.get(p, p)
    return base + (f': {SECTIONS.get(sec, sec)}' if sec else '')


def list_page(items, draft_any):
    path = BASE
    desc = ('Short, dated findings from the Ofsted Explorer: one claim and one chart each, with the figures frozen as '
            'published and a link that opens the Explorer on the evidence.')
    h = head('Discoveries · Ofsted Explorer', desc, path, path + 'card.png',
             'Discoveries from the Ofsted Explorer: short, dated findings from public data on report cards and results.',
             noindex=False)
    themes = sorted({d['theme'] for d in items}, key=list(content.THEMES).index)
    filt = ('<div class="dc-filter" role="group" aria-label="Show discoveries about"><span class="ml">Show</span>'
            '<button type="button" data-theme="" aria-pressed="true">All</button>' +
            ''.join(f'<button type="button" data-theme="{t}" aria-pressed="false">{e(content.THEMES[t])}</button>' for t in content.THEMES) +
            '</div>')
    rows = []
    for d in items:
        draft = d['status'] not in PUBLIC
        keyf = [f for f in d['figures'] if f.get('key')]
        figs = ' · '.join(f'{big(f["value"], f.get("unit"))} {e(typo(f["label"][0].lower() + f["label"][1:]))}' for f in keyf[:2])
        rows.append(f"""<li class="dc-item" data-theme="{d['theme']}">
<div class="dc-it">
<p class="dc-meta"><time datetime="{d['date']}">{long_date(d['date'])}</time> &middot; {e(content.THEMES[d['theme']])}{' &middot; <span class="dc-tag">Draft, not published</span>' if draft else ''}{' &middot; Superseded' if d['status'] == 'superseded' else ''}</p>
<h2><a href="{BASE}{d['id']}/">{e(typo(d['title']))}</a></h2>
<p class="dc-sf">{e(typo(d['standfirst']))}</p>
</div>
<div class="dc-mini ar-ch" data-chart="{chart_json(d, small=True)}" role="img" aria-label="{e(typo(d['chart']['title']))}. {figs}"></div>
</li>""")
    body = f"""<body class="stone dc-page">
<a class="skip" href="#main">Skip to the content</a>
{NAV}<main id="main">
{'<div class="dc-draft" role="note"><div class="wrap"><b>Preview build.</b> Discoveries marked &ldquo;Draft, not published&rdquo; are shown here only; production shows published discoveries alone.</div></div>' if draft_any else ''}
<div class="band midnight article-band"><div class="wrap"><header class="article-head">
<p class="label"><a href="/explorer/">Ofsted Explorer</a> &middot; Discoveries</p>
<h1>Discoveries</h1>
<p class="standfirst">Short, dated findings from the Explorer&rsquo;s data. Each makes one claim with one chart, keeps its figures as they were on the day, and opens the Explorer on the evidence.</p>
</header></div></div>
<div class="wrap"><div class="prose-sheet dc-sheet dc-list">
{filt}
<p class="dc-count" id="dc-count" aria-live="polite">{len(items)} discover{'y' if len(items) == 1 else 'ies'}, newest first.</p>
<ol class="dc-items">
{''.join(rows)}
</ol>
<p class="dc-foot">Each discovery is a reading of public data across many schools, never a judgement on any one school. New discoveries are announced in the <a href="/explorer/discoveries/feed.xml">discoveries feed</a>.</p>
</div></div>
</main>
{FOOT}<script src="/assets/d3.min.js"></script>
<script src="/explorer/areas/chart.js"></script>
<script src="/explorer/discoveries/disc.js"></script>
</body>
</html>
"""
    return path, h + body


def feed(items, today):
    x = lambda s: html.escape(str(s), quote=False)
    updated = max(str(d.get('modified') or d['date']) for d in items) + 'T00:00:00Z'
    out = ['<?xml version="1.0" encoding="utf-8"?>',
           '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en-GB">',
           f'<title>{x(FEED_TITLE)}</title>',
           '<subtitle>Short, dated findings from the Ofsted Explorer, each one claim with one chart.</subtitle>',
           f'<link rel="alternate" type="text/html" href="{ORIGIN}{BASE}"/>',
           f'<link rel="self" type="application/atom+xml" href="{ORIGIN}{BASE}feed.xml"/>',
           f'<id>{ORIGIN}{BASE}feed.xml</id>',
           f'<updated>{updated}</updated>',
           f'<author><name>Mark Dalton</name><uri>{ORIGIN}/</uri></author>',
           f'<rights>© {updated[:4]} Mark Dalton</rights>']
    for d in items:
        url = f'{ORIGIN}{BASE}{d["id"]}/'
        keyf = ''.join(f'<li>{x(typo(f["label"]))}: {fmt(f["value"], f.get("unit"))} ({int(f["n"]):,} schools)</li>' for f in d['figures'] if f.get('key'))
        html_body = (f'<p><em>{x(typo(d["standfirst"]))}</em></p><ul>{keyf}</ul>{chart_table(d)}{paras(d["_body"])}'
                     f'<p><strong>Limitation.</strong> {inline(d["limitation"])}</p>'
                     f'<p>Source: {x(typo(chart_source(d)))}</p>'
                     f'<p><a href="{ORIGIN}{d["explore"]}">Explore this in the Ofsted Explorer</a></p>'
                     + ''.join(f'<p>Discussed on LinkedIn: <a href="{e(li["url"])}">{x(typo(li["title"]))}</a> ({li["date"]})</p>'
                               for li in d.get('linkedin') or [])
                     + (f'<p>From the article: <a href="{ORIGIN}{d["article"]}">{x(typo(article_title(d["article"])))}</a></p>'
                        if d.get('article') else ''))
        out += ['<entry>', f'<title>{x(typo(d["title"]))}</title>', f'<link rel="alternate" type="text/html" href="{url}"/>',
                f'<id>{url}</id>', f'<published>{d["date"]}T00:00:00Z</published>',
                f'<updated>{d.get("modified") or d["date"]}T00:00:00Z</updated>',
                f'<summary>{x(typo(d["standfirst"]))}</summary>']
        out += [f'<link rel="related" type="text/html" href="{e(li["url"])}" title="{e(typo(li["title"]))} (LinkedIn {li["kind"]})"/>'
                for li in d.get('linkedin') or []]
        out += [f'<content type="html">{x(html_body)}</content>', '</entry>']
    out.append('</feed>')
    return '\n'.join(out) + '\n'


# ---------- build ----------

def clean():
    os.makedirs(OUT, exist_ok=True)
    for name in os.listdir(OUT):
        if name in STATIC:
            continue
        p = os.path.join(OUT, name)
        if os.path.isdir(p) and content.NAME.match(name + '.md'):
            shutil.rmtree(p)
        elif name in ('index.html', 'feed.xml', 'index.json', 'card.png'):
            os.remove(p)


def build(data=None, fonts=None, today=None):
    m = mode()
    today = today or datetime.date.today().isoformat()
    every = content.load_all()
    by_id = {d['id']: d for d in every}
    chosen = [d for d in every if d['status'] in PUBLIC or m == 'preview']
    bad = {d['_file']: content.problems(d) for d in chosen}
    bad = {k: v for k, v in bad.items() if v}
    if bad:
        for k, v in bad.items():
            print(f'discoveries: {k}: ' + '; '.join(v))
        raise SystemExit('discoveries: fix the files above')
    clean()
    summary = {'mode': m, 'built': [], 'not_built': sorted(d['id'] for d in every if d not in chosen), 'review': []}
    index = {'mode': m, 'discoveries': [], 'pages': {}}
    if chosen:
        data = data or figures.Data()
        if fonts is None:
            try:
                from build_pages import load_fonts
                fonts = load_fonts()
            except Exception as ex:
                print('discoveries: no share images (', ex, ')')
                fonts = False
        items = sorted(chosen, key=lambda d: (str(d['date']), d['id']), reverse=True)
        for d in items:
            moved = live_check(d, data)
            if moved:
                summary['review'].append({'id': d['id'], 'figures': moved})
            draft = d['status'] not in PUBLIC
            path, h = page(d, by_id, today, draft, kit=(m == 'preview'))
            folder = os.path.join(OUT, d['id'])
            os.makedirs(folder, exist_ok=True)
            with open(os.path.join(folder, 'index.html'), 'w', encoding='utf-8', newline='\n') as f:
                f.write(h)
            if fonts:
                card(d, fonts, draft, os.path.join(folder, 'card.png'))
            summary['built'].append(d['id'])
            index['discoveries'].append({'id': d['id'], 'url': path, 'title': typo(d['title']), 'date': str(d['date']),
                                         'status': d['status'], 'theme': d['theme'], 'related': d.get('related') or []})
            index['pages'][path] = str(d.get('modified') or d['date'])
        path, h = list_page(items, any(d['status'] not in PUBLIC for d in items))
        with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8', newline='\n') as f:
            f.write(h)
        index['pages'][path] = max(index['pages'].values())
        if fonts:
            list_card(items[0], fonts, os.path.join(OUT, 'card.png'), any(d['status'] not in PUBLIC for d in items))
        with open(os.path.join(OUT, 'feed.xml'), 'w', encoding='utf-8', newline='\n') as f:
            f.write(feed(items, today))
    with open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(index, f, ensure_ascii=False, indent=1)
    print(f'discoveries ({m}): built {len(summary["built"])}, not built {len(summary["not_built"])}, '
          f'for review {len(summary["review"])}')
    return summary


if __name__ == '__main__':
    print(json.dumps(build(), indent=1))
