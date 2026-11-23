"""Share cards, social metadata, structured data, the feed and the sitemap for the main site
(standards 3, 9 and 10 in docs/site-standards.md).

    python3 scripts/site_meta.py --write    rewrite the social tags, feed link and JSON-LD in each page's <head> (commit the result)
    python3 scripts/site_meta.py            render the share cards, feed.xml and sitemap.xml (run by the build)

PAGES is the one record of each page's share card, type and dates. Titles and descriptions are
read from the page itself (<title>, og:title, meta description), so the head stays the source for
those unless an entry below overrides them.

Cards are 1200 x 630 JPG: the page's illustration, with its title set in Libre Caslon Display on a
midnight band. Never WebP: LinkedIn will not show it. The Explorer keeps its own data image
(no generated imagery on data pages, CLAUDE.md rule 7), but gets the same full set of tags.

The Atom feed (/feed.xml) carries the full text of every article. The sitemap lists the pages that
exist in site/, each dated by the last git commit that changed it; school pages take the date of the
data and template they are built from.
"""
import html
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
SITE = os.path.normpath(os.path.join(HERE, '..', 'site'))
FONTS = os.path.join(HERE, 'fonts')
ORIGIN = 'https://mrkdltn.com'
CARDS = 'assets/cards'
W, H = 1200, 630
MIDNIGHT, INK, MUTED, BRASS = '#0B1A2E', '#F5F1E8', '#A8B5C8', '#C9A24B'
EXPLORER_IMG = ('/writing/ofsted-report-cards/img/explorer-card.png', 1600, 900,
                'Ofsted Explorer: a scatter of 3,298 secondary schools, Attainment 8 against their 50 similar '
                "schools' average, coloured by Ofsted achievement grade.")

# file (under site/), card slug, illustration (under site/), what the illustration shows, card fields, type, dates
PAGES = [
    dict(file='index.html', slug='home', art='assets/plates/00-facade.webp', focus=0.55,
         shows='the long front of a two-storey school at sunrise, seen across a field',
         card_title='Mark Dalton', kicker='WRITING · OFSTED EXPLORER', card_sub='Writing and open tools on school accountability in England'),
    dict(file='writing/index.html', slug='writing', art='assets/plates/03-book.webp', focus=0.5,
         shows='an open exercise book with blank ruled pages on a desk in late-morning light',
         card_title='Writing', card_sub='School accountability, disadvantage, curriculum and the teaching workforce'),
    dict(file='writing/belonging/index.html', slug='belonging', art='assets/writing/belonging.webp', focus=0.5,
         shows='a long, calm school corridor in morning sun, four pupils far down it seen from behind',
         type='article', published='2026-11-18', modified='2026-11-18'),
    dict(file='writing/ofsted-report-cards/index.html', slug='ofsted-report-cards', art='assets/writing/report-cards.webp',
         focus=0.6, shows='an empty hall of wooden desks under tall arched windows, a folder on the nearest desk',
         type='article', published='2026-11-16', modified='2026-11-16'),
    dict(file='writing/progress-8/index.html', slug='progress-8', art='assets/writing/progress-8.webp', focus=0.5,
         shows='a glass lens on a sunlit desk, bending light into a spectrum across a grid of blank cells',
         type='article', published='2026-09-20', modified='2026-11-15'),
    dict(file='writing/curriculum-review/index.html', slug='curriculum-review', art='assets/writing/curriculum-review.webp',
         focus=0.5, shows='a classroom wall in morning sun, new textbooks on a shelf beside a planning wall of blank cards',
         type='article', published='2025-11-05', modified='2026-11-15'),
    dict(file='colophon/index.html', slug='colophon', art='assets/plates/04-office.webp', focus=0.5,
         shows='a desk seen from above in afternoon light, a blank sheet of paper in the middle',
         card_title='How this site is made',
         description='How mrkdltn.com is made: a static site with no cookies, set in open typefaces, with charts in '
                     "Ofsted's own colours and every figure linked to its primary source."),
    dict(file='contact/index.html', slug='contact', art='assets/plates/01-corridor.webp', focus=0.5,
         shows='a long school corridor in morning sun, a few pupils far down it seen from behind',
         card_title='Contact', card_sub='Speaking, press, research and anything else'),
    dict(file='404.html', slug=None,
         description='There is no page at this address on mrkdltn.com. Go to the home page, read the writing '
                     'or open the Ofsted Explorer.'),
    # the Explorer: its own data image, never an illustration
    dict(file='explorer/index.html', image=EXPLORER_IMG),
    dict(file='explorer/areas/index.html', image=EXPLORER_IMG),
    dict(file='explorer/updates/index.html', image=EXPLORER_IMG),
    dict(file='explorer/data/index.html', image=EXPLORER_IMG),
    dict(file='explorer/accessibility/index.html', image=EXPLORER_IMG),
    dict(file='explorer/compare/index.html', image=EXPLORER_IMG),
    # Explore a measure draws its own image of the spread (build_explore_pages.py); its per-view pages copy this head
    dict(file='explorer/explore/index.html', image=('/explorer/explore/card.png', 1200, 630,
         'The spread of Attainment 8, 2025/26 across every secondary school in England')),
]

SOCIAL = re.compile(r'[ \t]*(?:<meta (?:property|name)="(?:og:[^"]*|twitter:[^"]*|article:[^"]*)" content="[^"]*">'
                    r'|<link rel="alternate" type="application/atom\+xml"[^>]*>'
                    r'|<script type="application/ld\+json">.*?</script>)\n', re.S)

AUTHOR = 'Mark Dalton'
LINKEDIN = 'https://www.linkedin.com/in/mrkdltn'
PERSON_ID = ORIGIN + '/#person'
FEED_TITLE = 'Mark Dalton: writing'
FEED_LINK = f'<link rel="alternate" type="application/atom+xml" title="{FEED_TITLE}" href="/feed.xml">'
# what the school pages are built from: their sitemap date is the latest change to any of these
SCHOOL_SOURCES = ['data/raw', 'site/explorer/index.html', 'scripts/build_pages.py', 'scripts/prerender.py']


def e(s):
    return html.escape(s, quote=False).replace('"', '&quot;')


def url_path(file):
    p = '/' + file
    return p[:-len('index.html')] if p.endswith('index.html') else p


def meta(h, attr, name):
    m = re.search(rf'<meta {attr}="{re.escape(name)}" content="([^"]*)">', h)
    return html.unescape(m.group(1)) if m else None


def read(file):
    with open(os.path.join(SITE, file), encoding='utf-8') as f:
        return f.read()


def save(file, text):
    """Write with the line endings the file already has (a Windows checkout may use CRLF)."""
    path = os.path.join(SITE, file)
    with open(path, 'rb') as f:
        crlf = b'\r\n' in f.read(4096)
    with open(path, 'w', encoding='utf-8', newline='\r\n' if crlf else '\n') as f:
        f.write(text)


def card_title(p, h):
    return p.get('card_title') or meta(h, 'property', 'og:title') or re.search(r'<title>(.*?)</title>', h).group(1)


# ---------- head ----------

def head_block(p, h):
    path = url_path(p['file'])
    is404 = p['file'] == '404.html'
    title = meta(h, 'property', 'og:title') or html.unescape(re.search(r'<title>(.*?)</title>', h).group(1))
    desc = p.get('description') or meta(h, 'property', 'og:description') or meta(h, 'name', 'description')
    tags = [('property', 'og:type', p.get('type', 'website')),
            ('property', 'og:site_name', 'Mark Dalton'),
            ('property', 'og:title', title),
            ('property', 'og:description', desc)]
    if not is404:
        tags.append(('property', 'og:url', ORIGIN + path))
        if p.get('slug'):
            img = (f'/{CARDS}/{p["slug"]}.jpg', W, H,
                   f'Illustration: {p["shows"]}. Title: ' + card_title(p, h).rstrip('.') + '.')
        else:
            img = p['image']
        tags += [('property', 'og:image', ORIGIN + img[0]),
                 ('property', 'og:image:type', 'image/jpeg' if img[0].endswith('.jpg') else 'image/png'),
                 ('property', 'og:image:width', str(img[1])),
                 ('property', 'og:image:height', str(img[2])),
                 ('property', 'og:image:alt', img[3])]
    if p.get('type') == 'article':
        tags += [('property', 'article:published_time', p['published']),
                 ('property', 'article:modified_time', p['modified'])]
    tags.append(('name', 'twitter:card', 'summary_large_image' if not is404 else 'summary'))
    out = ''.join(f'<meta {a}="{n}" content="{e(v)}">\n' for a, n, v in tags) + FEED_LINK + '\n'
    ld = json_ld(p, title, desc, img if not is404 else None)
    if ld:
        out += '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False).replace('</', '<\\/') + '</script>\n'
    return out


def person(full=True):
    p = {'@type': 'Person', '@id': PERSON_ID, 'name': AUTHOR, 'url': ORIGIN + '/', 'sameAs': [LINKEDIN]}
    if full:
        p = {'@context': 'https://schema.org', **p,
             'jobTitle': 'Secondary school principal',
             'honorificSuffix': 'FRSA, FCCT',
             'description': 'Secondary school principal in the West Midlands, writing on school accountability, '
                            'disadvantage, curriculum and the teaching workforce in England.',
             'image': ORIGIN + '/assets/img/mark-dalton.webp',
             'knowsAbout': ['School accountability', 'Ofsted inspection', 'Educational disadvantage',
                            'Curriculum', 'Teacher workforce']}
    return p


def json_ld(p, title, desc, img):
    """Person on the home page; Article on every article."""
    if p.get('slug') == 'home':
        return person()
    if p.get('type') != 'article':
        return None
    url = ORIGIN + url_path(p['file'])
    return {'@context': 'https://schema.org', '@type': 'Article', '@id': url + '#article',
            'headline': title, 'description': desc, 'url': url, 'mainEntityOfPage': url,
            'datePublished': p['published'], 'dateModified': p['modified'],
            'inLanguage': 'en-GB', 'isAccessibleForFree': True,
            'author': person(False), 'publisher': person(False),
            'image': {'@type': 'ImageObject', 'url': ORIGIN + img[0], 'width': img[1], 'height': img[2]}}


def write_heads():
    for p in PAGES:
        h = read(p['file'])
        block = head_block(p, h)
        h = SOCIAL.sub('', h)
        if p.get('description'):
            h = re.sub(r'<meta name="description" content="[^"]*">',
                       f'<meta name="description" content="{e(p["description"])}">', h, count=1)
        if p['file'] == '404.html':
            h = re.sub(r'<link rel="canonical" href="[^"]*">\n', '', h)
            anchor = re.search(r'<meta name="description" content="[^"]*">\n', h)
        else:
            anchor = re.search(r'<link rel="canonical" href="[^"]*">\n', h)
        if not anchor:
            raise SystemExit(f'{p["file"]}: no anchor for the social tags')
        h = h[:anchor.end()] + block + h[anchor.end():]
        save(p['file'], h)
        print('head', p['file'])


# ---------- cards ----------

def fonts():
    from PIL import ImageFont

    def disp(size):
        return ImageFont.truetype(os.path.join(FONTS, 'libre-caslon-display.ttf'), size)

    def sans(size, weight=450):
        f = ImageFont.truetype(os.path.join(FONTS, 'hanken-grotesk.ttf'), size)
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
        return f
    return disp, sans


def wrap(d, text, font, width):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=font) <= width or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = w
    return lines + ([cur] if cur else [])


def render(p, h, f):
    from PIL import Image, ImageDraw
    disp, sans = f
    M = 64
    title, sub = card_title(p, h).replace("'", '’'), p.get('card_sub')
    probe = ImageDraw.Draw(Image.new('RGB', (1, 1)))
    for size in (60, 56, 52, 48, 44):
        font = disp(size)
        lines = wrap(probe, title, font, W - 2 * M)
        if len(lines) <= (2 if sub else 3):
            break
    lh = int(size * 1.13)
    band = 40 + 26 + 22 + len(lines) * lh + (44 if sub else 0) + 40

    # the illustration, cover-cropped into the space above the band
    art = Image.open(os.path.join(SITE, p['art'])).convert('RGB')
    aw, ah = W, H - band
    s = max(aw / art.width, ah / art.height)
    art = art.resize((round(art.width * s), round(art.height * s)), Image.LANCZOS)
    top = round((art.height - ah) * p.get('focus', 0.5))
    left = (art.width - aw) // 2
    im = Image.new('RGB', (W, H), MIDNIGHT)
    im.paste(art.crop((left, top, left + aw, top + ah)), (0, 0))

    d = ImageDraw.Draw(im)
    y = H - band
    d.rectangle([0, y, W, y + 3], fill=BRASS)
    y += 40
    d.text((M, y), p.get('kicker', 'MARK DALTON'), font=sans(20, 650), fill=MUTED)
    t = 'mrkdltn.com'
    d.text((W - M - d.textlength(t, font=sans(20, 450)), y), t, font=sans(20, 450), fill=MUTED)
    y += 26 + 22
    for ln in lines:
        d.text((M, y), ln, font=font, fill=INK)
        y += lh
    if sub:
        d.text((M, y + 8), sub, font=sans(24, 450), fill=MUTED)
    return im


def render_cards(only=None):
    out = os.path.join(SITE, *CARDS.split('/'))
    os.makedirs(out, exist_ok=True)
    f = fonts()
    for p in PAGES:
        if not p.get('slug') or (only and p['slug'] not in only):
            continue
        h = read(p['file'])
        path = os.path.join(out, p['slug'] + '.jpg')
        render(p, h, f).save(path, 'JPEG', quality=86, optimize=True, progressive=True)
        print('card', p['slug'], os.path.getsize(path))


def preview_images():
    """On a Cloudflare preview build, point og:image at the preview so a share debugger can fetch it.
    Canonical and og:url stay on mrkdltn.com. Production builds are left untouched."""
    branch = os.environ.get('CF_PAGES_BRANCH')
    if not branch or branch == 'main':
        return
    host = 'https://' + re.sub(r'[^a-z0-9-]', '-', branch.lower()).strip('-') + '.mrkdltn-site.pages.dev'
    for p in PAGES:
        if p['file'] == '404.html':
            continue
        h = read(p['file'])
        save(p['file'], h.replace(f'<meta property="og:image" content="{ORIGIN}/',
                                  f'<meta property="og:image" content="{host}/'))
    print('preview: og:image points at', host)


# ---------- feed ----------

def chart_text(inner):
    """A chart drawn in HTML and CSS reads as text in a feed reader: title, the values row by row, the source."""
    out, rows = [], []

    def flush():
        if rows:
            out.append('<ul>' + ''.join(f'<li>{r}</li>' for r in rows) + '</ul>')
            rows.clear()
    tok = re.compile(r'(?s)<p class="ct">(?P<ct>.*?)</p>|<p class="cs">(?P<cs>.*?)</p>'
                     r'|<p class="hgroup"[^>]*>(?P<hg>.*?)</p>'
                     r'|<div class="hrow"><span class="lab">(?P<lab>.*?)</span>.*?<b[^>]*>(?P<val>.*?)</b>'
                     r'|<svg[^>]*?aria-label="(?P<svg>[^"]*)"[^>]*>.*?</svg>'
                     r'|(?P<table><table>.*?</table>)|<figcaption>(?P<cap>.*?)</figcaption>')
    for m in tok.finditer(inner):
        g = m.groupdict()
        if g['lab'] is not None:
            rows.append(f'{g["lab"]}: {g["val"]}')
            continue
        flush()
        if g['ct'] is not None:
            out.append(f'<p><strong>{g["ct"]}</strong></p>')
        elif g['cs'] is not None:
            out.append(f'<p>{g["cs"]}</p>')
        elif g['hg'] is not None:
            out.append(f'<p>{g["hg"]}</p>')
        elif g['svg'] is not None:
            out.append(f'<p><em>Chart: {g["svg"]}</em></p>')
        elif g['table'] is not None:
            out.append(g['table'])
        elif g['cap'] is not None:
            out.append(f'<p><small>{g["cap"]}</small></p>')
    flush()
    return '<figure>' + ''.join(out) + '</figure>'


def article_html(p):
    """The article's full text, cleaned for a feed reader: absolute links, no scripts, styles or buttons."""
    h = read(p['file'])
    url = ORIGIN + url_path(p['file'])
    stand = re.search(r'(?s)<p class="standfirst">(.*?)</p>', h)
    body = re.search(r'(?s)<article[^>]*>(.*)</article>', h).group(1)
    body = re.sub(r'(?s)<figure class="chart"[^>]*>(.*?)</figure>', lambda m: chart_text(m.group(1)), body)
    body = re.sub(r'(?s)<span class="mnote cite"><b>(.*?)</b>(.*?)</span>', r'<p><small>\1: \2</small></p>', body)
    body = re.sub(r'(?s)<span class="mnote"><b>\d+</b>(.*?)</span>', r' <small>(\1)</small>', body)
    body = re.sub(r'(?s)<(script|button|style)\b.*?</\1>', '', body)
    body = re.sub(r'\s(?:style|class|role|loading|fetchpriority|decoding|onclick)="[^"]*"', '', body)

    def absolute(m):
        attr, v = m.group(1), m.group(2)
        if re.match(r'^(?:https?:|mailto:|data:)', v):
            return m.group(0)
        if v.startswith('/'):
            v = ORIGIN + v
        elif v.startswith('#'):
            v = url + v
        else:
            v = url + v
        return f'{attr}="{v}"'
    body = re.sub(r'\b(href|src)="([^"]*)"', absolute, body)
    lead = f'<p><em>{stand.group(1)}</em></p>' if stand else ''
    return lead + body.strip()


def feed_date(d):
    return d if 'T' in d else d + 'T00:00:00Z'


def write_feed():
    arts = sorted((p for p in PAGES if p.get('type') == 'article'), key=lambda p: p['published'], reverse=True)
    updated = max(feed_date(p['modified']) for p in arts)
    x = lambda s: html.escape(s, quote=False)
    out = ['<?xml version="1.0" encoding="utf-8"?>',
           '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en-GB">',
           f'<title>{x(FEED_TITLE)}</title>',
           '<subtitle>School accountability, disadvantage, curriculum and the teaching workforce in England.</subtitle>',
           f'<link rel="alternate" type="text/html" href="{ORIGIN}/writing/"/>',
           f'<link rel="self" type="application/atom+xml" href="{ORIGIN}/feed.xml"/>',
           f'<id>{ORIGIN}/feed.xml</id>',
           f'<updated>{updated}</updated>',
           f'<author><name>{AUTHOR}</name><uri>{ORIGIN}/</uri></author>',
           f'<rights>© {updated[:4]} {AUTHOR}</rights>']
    for p in arts:
        h = read(p['file'])
        url = ORIGIN + url_path(p['file'])
        title = meta(h, 'property', 'og:title')
        desc = meta(h, 'name', 'description')
        out += ['<entry>',
                f'<title>{x(title)}</title>',
                f'<link rel="alternate" type="text/html" href="{url}"/>',
                f'<id>{url}</id>',
                f'<published>{feed_date(p["published"])}</published>',
                f'<updated>{feed_date(p["modified"])}</updated>',
                f'<summary>{x(desc)}</summary>',
                f'<content type="html">{x(article_html(p))}</content>',
                '</entry>']
    out.append('</feed>')
    with open(os.path.join(SITE, 'feed.xml'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(out) + '\n')
    print('feed:', len(arts), 'articles, updated', updated)


# ---------- sitemap ----------

def git(*args):
    r = subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True, timeout=180)
    return r.stdout.strip() if r.returncode == 0 else ''


def git_dates():
    """Last commit date of every tracked file under site/ and of the school pages' sources.
    A shallow clone would date every file to the last commit, so deepen it first."""
    if git('rev-parse', '--is-shallow-repository') == 'true':
        try:
            git('fetch', '--unshallow', '--quiet')
        except Exception as ex:
            print('sitemap: could not unshallow the clone (', ex, ')')
        if git('rev-parse', '--is-shallow-repository') == 'true':
            print('sitemap: WARNING the clone is shallow, so dates may all be the last commit')
    dates = {}
    for path in ['site'] + SCHOOL_SOURCES:
        for line in git('ls-files', path).splitlines():
            if line.endswith('.html') or not line.startswith('site/'):
                d = git('log', '-1', '--format=%cs', '--', line)
                if d:
                    dates[line] = d
    return dates


def write_sitemap():
    dates = git_dates()
    school = max((d for k, d in dates.items() if any(k == s or k.startswith(s + '/') for s in SCHOOL_SOURCES)),
                 default=None)
    urls, n_school, undated = [], 0, []
    for root, dirs, files in os.walk(SITE):
        dirs.sort(key=lambda d: (d.isdigit(), int(d) if d.isdigit() else 0, d))
        if 'index.html' not in files:
            continue
        rel = os.path.relpath(os.path.join(root, 'index.html'), SITE).replace(os.sep, '/')
        is_school = rel.startswith('explorer/school/')
        if not is_school:
            with open(os.path.join(SITE, rel), encoding='utf-8') as f:
                if re.search(r'<meta name="robots" content="[^"]*noindex', f.read(8000)):
                    continue
        # Explore a measure's per-view pages are built from the data too (build_explore_pages.py): dated like the schools,
        # or by their template if that changed later
        built = re.match(r'explorer/explore/[^/]+/', rel) is not None
        d = school if is_school else max(filter(None, [school, dates.get('site/explorer/explore/index.html')]), default=None) if built else dates.get('site/' + rel)
        if not d:
            undated.append(rel)
        n_school += is_school
        urls.append((ORIGIN + url_path(rel), d))
    with open(os.path.join(SITE, 'sitemap.xml'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        for u, d in urls:
            f.write(f'<url><loc>{u}</loc>' + (f'<lastmod>{d}</lastmod>' if d else '') + '</url>\n')
        f.write('</urlset>\n')
    print(f'sitemap: {len(urls) - n_school} pages and {n_school} school pages, school pages dated {school}'
          + (f'; no git date for {", ".join(undated[:5])}' if undated else ''))


def build():
    render_cards()
    preview_images()
    write_feed()
    write_sitemap()


if __name__ == '__main__':
    if '--write' in sys.argv:
        write_heads()
    else:
        render_cards(set(a for a in sys.argv[1:] if not a.startswith('-')) or None)
