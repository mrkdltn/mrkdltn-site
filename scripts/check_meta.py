"""Fail if any page is missing the tags it needs to share well (standard 9 in docs/site-standards.md).

    python3 scripts/check_meta.py

Every HTML page under site/ except 404.html needs og:title, og:description, og:url, og:type, og:image,
og:image:width, og:image:height, og:image:alt and twitter:card; articles (og:type article) also need
article:published_time and article:modified_time. The share image must be JPG or PNG (never WebP),
at least 1200 x 627 and under 5 MB, and must match the size the page declares. 404.html needs a real
description and must not carry a canonical. Run by build_data.py, so a missing tag fails the build.
"""
import os
import re
import sys

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


def check(path, sizes):
    rel = os.path.relpath(path, SITE).replace(os.sep, '/')
    h = head(path)
    tags = {}
    for k, v in TAG.findall(h):
        tags.setdefault(k, v)
    desc = tags.get('description', '')
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
    return probs


def main():
    sizes, failures, n = {}, [], 0
    for root, dirs, files in os.walk(SITE):
        dirs.sort()
        for name in sorted(files):
            if name.endswith('.html'):
                n += 1
                p = os.path.join(root, name)
                for prob in check(p, sizes):
                    failures.append(f'{os.path.relpath(p, SITE)}: {prob}')
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
