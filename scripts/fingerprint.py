"""Give long-lived assets fingerprinted names (standard 15 in docs/site-standards.md).

    FINGERPRINT=1 python3 scripts/fingerprint.py     (the Cloudflare build runs it; CF_PAGES is set there)

Fonts, plates, video, writing images and d3 are moved to /static/<path>.<hash>.<ext>, where <hash> is
the first 10 hex digits of the file's SHA-256, and every reference to them in the built HTML, CSS, JS
and feed is rewritten. site/_headers serves /static/* with Cache-Control: public, max-age=31536000,
immutable; everything else keeps max-age=0, must-revalidate. A file that changes gets a new name, so a
browser never holds a stale copy.

The sources in the repository keep their plain names: this rewrites the build output only. After a
local run, `git checkout -- site` and deleting site/static/ put the working tree back. The build fails
if any page still points at an original name afterwards.
"""
import glob
import hashlib
import os
import posixpath
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.normpath(os.path.join(HERE, '..', 'site'))
SOURCES = ['assets/fonts/*.woff2', 'assets/plates/*', 'assets/video/*', 'assets/writing/*',
           'writing/*/img/*', 'assets/d3.min.js']
TEXT = ('.html', '.css', '.js', '.xml')
HOST = r'(?:https://(?:mrkdltn\.com|[a-z0-9-]+\.mrkdltn-site\.pages\.dev))?'
# an absolute or site-root path to one of the fingerprinted kinds of file
ABS = re.compile(r'(?<![\w.%/-])(' + HOST + r')(/[A-Za-z0-9._/-]+\.(?:woff2|webp|mp4|jpe?g|png|gif|js))(?![\w.-])')
# a relative src/href/srcset/poster in HTML (resolved against the page's own address)
REL = re.compile(r'\b(src|href|poster|srcset|data-w|data-t)="([^"]*)"')


def plan():
    moves = {}
    for pat in SOURCES:
        for src in sorted(glob.glob(os.path.join(SITE, *pat.split('/')))):
            if not os.path.isfile(src):
                continue
            rel = os.path.relpath(src, SITE).replace(os.sep, '/')
            with open(src, 'rb') as f:
                h = hashlib.sha256(f.read()).hexdigest()[:10]
            stem, ext = posixpath.splitext(rel[len('assets/'):] if rel.startswith('assets/') else rel)
            moves['/' + rel] = f'/static/{stem}.{h}{ext}'
    return moves


def rewrite(text, moves, page_dir=None):
    n = 0

    def absolute(m):
        nonlocal n
        new = moves.get(m.group(2))
        if not new:
            return m.group(0)
        n += 1
        return m.group(1) + new
    text = ABS.sub(absolute, text)
    if page_dir is not None:
        def relative(m):
            nonlocal n
            items = m.group(2).split(',') if m.group(1) == 'srcset' else [m.group(2)]
            parts, hit = [], 0
            for item in items:
                bits = item.strip().split(' ', 1)
                u = bits[0]
                if u and not re.match(r'^(?:[a-z]+:|/|#|\?)', u):
                    target = posixpath.normpath(posixpath.join(page_dir, u))
                    if target in moves:
                        bits[0] = moves[target]
                        hit += 1
                parts.append(' '.join(bits))
            if not hit:
                return m.group(0)
            n += hit
            return f'{m.group(1)}="{", ".join(parts)}"'
        text = REL.sub(relative, text)
    return text, n


def main():
    if not (os.environ.get('CF_PAGES') or os.environ.get('FINGERPRINT')):
        print('fingerprint: skipped (set FINGERPRINT=1 to run outside the Cloudflare build)')
        return 0
    moves = plan()
    total, files = 0, 0
    for root, dirs, names in os.walk(SITE):
        dirs[:] = [d for d in dirs if d not in ('static', 'data')]
        for name in names:
            if not name.endswith(TEXT):
                continue
            path = os.path.join(root, name)
            rel = '/' + os.path.relpath(path, SITE).replace(os.sep, '/')
            with open(path, 'rb') as f:
                raw = f.read()
            text = raw.decode('utf-8')
            page_dir = posixpath.dirname(rel) if name.endswith('.html') else None
            new, n = rewrite(text, moves, page_dir)
            if n:
                with open(path, 'wb') as f:
                    f.write(new.encode('utf-8'))
                total += n
                files += 1
    for old, new in moves.items():
        dst = os.path.join(SITE, *new.strip('/').split('/'))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        os.replace(os.path.join(SITE, *old.strip('/').split('/')), dst)
    # nothing may still point at a plain name
    left = []
    for root, dirs, names in os.walk(SITE):
        dirs[:] = [d for d in dirs if d not in ('static', 'data')]
        for name in names:
            if name.endswith(TEXT):
                with open(os.path.join(root, name), encoding='utf-8') as f:
                    t = f.read()
                for m in ABS.finditer(t):
                    if m.group(2) in moves:
                        left.append(f'{os.path.relpath(os.path.join(root, name), SITE)}: {m.group(2)}')
    print(f'fingerprint: {len(moves)} files to /static/, {total} references rewritten in {files} files')
    if left:
        print('fingerprint: still pointing at plain names:')
        for line in left[:20]:
            print('  ' + line)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
