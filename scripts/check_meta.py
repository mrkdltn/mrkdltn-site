"""Fail if any page is missing the tags it needs to share well (standard 9 in docs/site-standards.md).

    python3 scripts/check_meta.py

Every HTML page under site/ except 404.html needs og:title, og:description, og:url, og:type, og:image,
og:image:width, og:image:height, og:image:alt and twitter:card; articles (og:type article) also need
article:published_time and article:modified_time. The share image must be JPG or PNG (never WebP),
at least 1200 x 627 and under 5 MB, and must match the size the page declares. 404.html needs a real
description and must not carry a canonical. Run by build_data.py, so a missing tag fails the build.

Standards 3 and 10: every page links the Atom feed from its head; the home page carries Person
JSON-LD with sameAs to LinkedIn; every article carries Article JSON-LD with author, dates and image.
feed.xml must parse as Atom with the full text of every article, and sitemap.xml must list every
indexable page with a date.
"""
import json
import os
import re
import sys
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.normpath(os.path.join(HERE, '..', 'site'))
REQUIRED = ['og:title', 'og:description', 'og:url', 'og:type', 'og:image', 'og:image:width',
            'og:image:height', 'og:image:alt', 'twitter:card']
ARTICLE = ['article:published_time', 'article:modified_time']
HOSTS = re.compile(r'^https://(?:mrkdltn\.com|[a-z0-9-]+\.mrkdltn-site\.pages\.dev)(/[^?#]*)$')
TAG = re.compile(r'<meta (?:property|name)="([^"]+)" content="([^"]*)">')
DATE = re.compile(r'^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2}))?$')


def head(path):
    with open(path, encoding='utf-8') as f:
        t = f.read(24000)
    i = t.find('</head>')
    return t if i < 0 else t[:i]


def image_problems(url, w, h, sizes):
    probs = []
    if not re.search(r'\.(jpe?g|png)$', url, re.I):
        return [f'og:image is not JPG or PNG: {url}']
    m = HOSTS.match(url)
    if not m:
        return [f'og:image is not on this site: {url}']
    local = os.path.join(SITE, *m.group(1).strip('/').split('/'))
    if not os.path.exists(local):
        return [f'og:image file missing: {m.group(1)}']
    if local not in sizes:
        from PIL import Image
        with Image.open(local) as im:
            sizes[local] = (im.size, os.path.getsize(local))
    (iw, ih), nbytes = sizes[local]
    if (iw, ih) != (w, h):
        probs.append(f'og:image is {iw} x {ih} but the page declares {w} x {h}')
    if iw < 1200 or ih < 627:
        probs.append(f'og:image is {iw} x {ih}, smaller than 1200 x 627')
    if nbytes >= 5 * 1024 * 1024:
        probs.append(f'og:image is {nbytes} bytes, over 5 MB')
    return probs


FEED = '<link rel="alternate" type="application/atom+xml"'
LINKEDIN = 'https://www.linkedin.com/in/mrkdltn'
ATOM = '{http://www.w3.org/2005/Atom}'


def ld_problems(rel, h, tags):
    blocks = re.findall(r'(?s)<script type="application/ld\+json">(.*?)</script>', h)
    try:
        lds = [json.loads(b) for b in blocks]
    except ValueError as ex:
        return [f'JSON-LD does not parse: {ex}']
    probs = []
    if rel == 'index.html':
        ps = [d for d in lds if d.get('@type') == 'Person']
        if not ps or LINKEDIN not in ps[0].get('sameAs', []):
            probs.append('home: no Person JSON-LD with sameAs LinkedIn')
    if tags.get('og:type') == 'article':
        arts = [d for d in lds if d.get('@type') in ('Article', 'BlogPosting')]
        if not arts:
            return probs + ['no Article JSON-LD']
        a = arts[0]
        for k in ('headline', 'datePublished', 'dateModified', 'image', 'author'):
            if not a.get(k):
                probs.append(f'Article JSON-LD lacks {k}')
        if (a.get('author') or {}).get('name') != 'Mark Dalton':
            probs.append('Article JSON-LD author is not Mark Dalton')
        if a.get('datePublished') != tags.get('article:published_time') or a.get('dateModified') != tags.get('article:modified_time'):
            probs.append('Article JSON-LD dates differ from the article: tags')
    return probs


def check(path, sizes):
    rel = os.path.relpath(path, SITE).replace(os.sep, '/')
    h = head(path)
    tags = {}
    for k, v in TAG.findall(h):
        tags.setdefault(k, v)
    desc = tags.get('description', '')
    if FEED not in h:
        return ['no feed link in the head']
    if rel == '404.html':
        probs = []
        if 'rel="canonical"' in h:
            probs.append('carries a canonical')
        if len(desc.split()) < 8:
            probs.append(f'description too short: "{desc}"')
        return probs
    probs = [f'missing {t}' for t in REQUIRED if not tags.get(t)]
    if len(desc.split()) < 8:
        probs.append(f'description too short: "{desc}"')
    if tags.get('og:type') == 'article':
        probs += [f'missing {t}' for t in ARTICLE if not tags.get(t)]
        probs += [f'{t} is not an ISO date: {tags[t]}' for t in ARTICLE if tags.get(t) and not DATE.match(tags[t])]
    if tags.get('twitter:card') and tags['twitter:card'] != 'summary_large_image':
        probs.append('twitter:card is not summary_large_image')
    if tags.get('og:image') and tags.get('og:image:width', '').isdigit() and tags.get('og:image:height', '').isdigit():
        probs += image_problems(tags['og:image'], int(tags['og:image:width']), int(tags['og:image:height']), sizes)
    if 'application/ld+json' in h or rel == 'index.html' or tags.get('og:type') == 'article':
        probs += ld_problems(rel, h, tags)
    return probs


def site_problems(pages, articles):
    """feed.xml and sitemap.xml, against the pages that exist."""
    probs = []
    try:
        feed = ET.parse(os.path.join(SITE, 'feed.xml')).getroot()
    except (OSError, ET.ParseError) as ex:
        probs.append(f'feed.xml: {ex}')
    else:
        if feed.tag != ATOM + 'feed':
            probs.append('feed.xml: not an Atom feed')
        for k in ('title', 'id', 'updated', 'author'):
            if feed.find(ATOM + k) is None:
                probs.append(f'feed.xml: no {k}')
        entries = {}
        for en in feed.findall(ATOM + 'entry'):
            link = en.find(ATOM + 'link')
            entries[link.get('href') if link is not None else ''] = en
            for k in ('title', 'id', 'published', 'updated', 'content'):
                if en.find(ATOM + k) is None or not (en.find(ATOM + k).text or '').strip():
                    probs.append(f'feed.xml: an entry has no {k}')
        for url in articles:
            en = entries.get(url)
            if en is None:
                probs.append(f'feed.xml: no entry for {url}')
            elif len(en.find(ATOM + 'content').text or '') < 3000:
                probs.append(f'feed.xml: {url} is not full text')
    try:
        sm = ET.parse(os.path.join(SITE, 'sitemap.xml')).getroot()
    except (OSError, ET.ParseError) as ex:
        probs.append(f'sitemap.xml: {ex}')
    else:
        ns = '{http://www.sitemaps.org/schemas/sitemap/0.9}'
        locs = {}
        for u in sm.findall(ns + 'url'):
            loc = u.find(ns + 'loc').text
            if loc in locs:
                probs.append(f'sitemap.xml: {loc} listed twice')
            lm = u.find(ns + 'lastmod')
            locs[loc] = lm.text if lm is not None else None
        for url in pages:
            if url not in locs:
                probs.append(f'sitemap.xml: missing {url}')
            elif not locs[url] or not DATE.match(locs[url]):
                probs.append(f'sitemap.xml: {url} has no date')
    return probs


def main():
    sizes, failures, n, pages, articles = {}, [], 0, [], []
    for root, dirs, files in os.walk(SITE):
        dirs.sort()
        for name in sorted(files):
            if name.endswith('.html'):
                n += 1
                p = os.path.join(root, name)
                rel = os.path.relpath(p, SITE).replace(os.sep, '/')
                for prob in check(p, sizes):
                    failures.append(f'{rel}: {prob}')
                if name == 'index.html':
                    url = 'https://mrkdltn.com/' + rel[:-len('index.html')]
                    pages.append(url)
                    if not rel.startswith('explorer/school/') and '<meta property="og:type" content="article">' in head(p):
                        articles.append(url)
    failures += site_problems(pages, articles)
    if failures:
        print(f'metadata check: {len(failures)} problems in {n} pages')
        for f in failures[:60]:
            print('  ' + f)
        if len(failures) > 60:
            print(f'  ... and {len(failures) - 60} more')
        return 1
    print(f'metadata check: {n} pages, all tags present')
    return 0


if __name__ == '__main__':
    sys.exit(main())
