"""Share cards and social metadata for the main site (standard 9 in docs/site-standards.md).

    python3 scripts/site_meta.py --write    rewrite the social tags in each page's <head> (commit the result)
    python3 scripts/site_meta.py            render the share cards into site/assets/cards/ (run by the build)

PAGES is the one record of each page's share card, type and dates. Titles and descriptions are
read from the page itself (<title>, og:title, meta description), so the head stays the source for
those unless an entry below overrides them.

Cards are 1200 x 630 JPG: the page's illustration, with its title set in Libre Caslon Display on a
midnight band. Never WebP: LinkedIn will not show it. The Explorer keeps its own data image
(no generated imagery on data pages, CLAUDE.md rule 7), but gets the same full set of tags.
"""
import html
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
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
    dict(file='404.html', slug=None,
         description='There is no page at this address on mrkdltn.com. Go to the home page, read the writing '
                     'or open the Ofsted Explorer.'),
    # the Explorer: its own data image, never an illustration
    dict(file='explorer/index.html', image=EXPLORER_IMG),
    dict(file='explorer/areas/index.html', image=EXPLORER_IMG),
    dict(file='explorer/updates/index.html', image=EXPLORER_IMG),
]

SOCIAL = re.compile(r'[ \t]*<meta (?:property|name)="(?:og:[^"]*|twitter:[^"]*|article:[^"]*)" content="[^"]*">\n')


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
    return ''.join(f'<meta {a}="{n}" content="{e(v)}">\n' for a, n, v in tags)


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


def build():
    render_cards()
    preview_images()


if __name__ == '__main__':
    if '--write' in sys.argv:
        write_heads()
    else:
        render_cards(set(a for a in sys.argv[1:] if not a.startswith('-')) or None)
