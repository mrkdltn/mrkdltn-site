"""Read and write discovery files: content/discoveries/YYYY-MM-DD-slug.md.

A file is YAML front matter between two '---' lines, then the body in Markdown (paragraphs, **bold**, *italic* and
[links](/explorer/)). The front matter uses a small, strict subset of YAML that this module reads and writes without a
dependency (the Cloudflare build installs only Pillow):

  key: value            a string, number, true/false, null, or a JSON-quoted string ("...") or JSON list ([...])
  key:                  followed by an indented mapping, or by a list whose items start with '- '
  - key: value          a list of mappings; the item's other keys are indented under the first

Every file it writes is valid YAML, and the test reads each one with PyYAML (where installed) to check the two agree.
Fields are described in scripts/discoveries/README.md.
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
CONTENT = os.path.join(ROOT, 'content', 'discoveries')

STATUSES = ('candidate', 'draft', 'approved', 'published', 'superseded')
THEMES = {'achievement-and-context': 'Achievement and context', 'attendance-and-behaviour': 'Attendance and behaviour',
          'inclusion': 'Inclusion', 'later-report-language': 'Later report language'}
NAME = re.compile(r'^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$')
ORDER = ['id', 'date', 'title', 'standfirst', 'status', 'theme', 'figures', 'chart', 'explore', 'related',
         'limitation', 'supersedes', 'superseded_by', 'published', 'approved_by']


# ---------- reading ----------

def scalar(s):
    s = s.strip()
    if s in ('', 'null', '~'):
        return None
    if s in ('true', 'false'):
        return s == 'true'
    if s[0] in '"[{':
        return json.loads(s)
    if s[0] == "'" and s[-1] == "'":
        return s[1:-1].replace("''", "'")
    if re.fullmatch(r'-?\d+', s):
        return int(s)
    if re.fullmatch(r'-?\d+\.\d+', s):
        return float(s)
    return s


def _lines(text):
    out = []
    for raw in text.split('\n'):
        if not raw.strip() or raw.lstrip().startswith('#'):
            continue
        out.append((len(raw) - len(raw.lstrip(' ')), raw.strip()))
    return out


def _block(lines, i, indent):
    """Parse the block of lines at this indent, starting at i. Returns (value, next i)."""
    if i < len(lines) and lines[i][1].startswith('- ') and lines[i][0] == indent:
        items = []
        while i < len(lines) and lines[i][0] == indent and lines[i][1].startswith('- '):
            rest = lines[i][1][2:]
            if re.match(r'^[A-Za-z_][\w]*:( |$)', rest):
                # a mapping item: its first key on the dash line, the others indented by two more
                sub = [(indent + 2, rest)]
                j = i + 1
                while j < len(lines) and lines[j][0] > indent:
                    sub.append(lines[j])
                    j += 1
                val, _ = _block(sub, 0, indent + 2)
                items.append(val)
                i = j
            else:
                items.append(scalar(rest))
                i += 1
        return items, i
    obj = {}
    while i < len(lines) and lines[i][0] == indent:
        m = re.match(r'^([A-Za-z_][\w]*):(?: (.*))?$', lines[i][1])
        if not m:
            raise ValueError(f'cannot read front matter line: {lines[i][1]!r}')
        k, v = m.group(1), m.group(2)
        i += 1
        if v is None or v.strip() == '':
            if i < len(lines) and lines[i][0] > indent:
                obj[k], i = _block(lines, i, lines[i][0])
            elif i < len(lines) and lines[i][0] == indent and lines[i][1].startswith('- '):
                obj[k], i = _block(lines, i, indent)
            else:
                obj[k] = None
        else:
            obj[k] = scalar(v)
    if i < len(lines) and lines[i][0] > indent:
        raise ValueError(f'unexpected indent at: {lines[i][1]!r}')
    return obj, i


def parse(text):
    text = text.replace('\r\n', '\n')
    m = re.match(r'^---\n(.*?)\n---\n?(.*)$', text, re.S)
    if not m:
        raise ValueError('no front matter (the file must start with ---)')
    lines = _lines(m.group(1))
    meta, i = _block(lines, 0, 0) if lines else ({}, 0)
    if i != len(lines):
        raise ValueError(f'could not read front matter from: {lines[i][1]!r}')
    return meta, m.group(2).strip()


def load(path):
    with open(path, encoding='utf-8') as f:
        meta, body = parse(f.read())
    meta['_file'] = os.path.basename(path)
    meta['_body'] = body
    return meta


def load_all(folder=CONTENT):
    out = []
    if not os.path.isdir(folder):
        return out
    for name in sorted(os.listdir(folder)):
        if name.endswith('.md'):
            out.append(load(os.path.join(folder, name)))
    return out


# ---------- writing ----------

PLAIN = re.compile(r'^[A-Za-z0-9/][^:#"\'\[\]{}\n]*$')


def emit_scalar(v):
    if v is None:
        return 'null'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, float)):
        return json.dumps(v)
    if isinstance(v, list):
        return json.dumps(v, ensure_ascii=False)
    s = str(v)
    # plain only where YAML and this reader agree it is a string (a date-like or numeric string is quoted)
    if PLAIN.match(s) and s.strip() == s and s not in ('null', 'true', 'false', 'yes', 'no', 'on', 'off', '~') \
            and not re.fullmatch(r'[-+.\d:eE]+', s) and ' #' not in s and not s.endswith(':'):
        return s
    return json.dumps(s, ensure_ascii=False)


def _flow(v):
    return isinstance(v, list) and all(not isinstance(x, (dict, list)) for x in v)


def _emit(obj, indent, out):
    pad = ' ' * indent
    for k, v in obj.items():
        if isinstance(v, dict):
            out.append(f'{pad}{k}:')
            _emit(v, indent + 2, out)
        elif isinstance(v, list) and not _flow(v):
            out.append(f'{pad}{k}:')
            for item in v:
                if isinstance(item, dict):
                    sub = []
                    _emit(item, indent + 4, sub)
                    sub[0] = pad + '  - ' + sub[0].lstrip()
                    out.extend(sub)
                else:
                    out.append(f'{pad}  - {emit_scalar(item)}')
        else:
            out.append(f'{pad}{k}: {emit_scalar(v)}')


def dump(meta, body):
    keys = [k for k in ORDER if k in meta] + [k for k in meta if k not in ORDER and not k.startswith('_')]
    out = []
    _emit({k: meta[k] for k in keys}, 0, out)
    return '---\n' + '\n'.join(out) + '\n---\n\n' + body.strip() + '\n'


def save(path, meta, body):
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(dump(meta, body))


# ---------- checks ----------

def words(s):
    return len(re.findall(r"[A-Za-z0-9’'%.,-]+", re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', s or '')))


def problems(d):
    """What is wrong with a discovery's front matter and body, as a list of sentences (empty when it is sound)."""
    p = []
    f = d.get('_file', '')
    if not NAME.match(f):
        p.append(f'file name {f!r} is not YYYY-MM-DD-slug.md')
    if d.get('id') != f[:-3]:
        p.append(f'id {d.get("id")!r} differs from the file name')
    if str(d.get('date')) != f[:10]:
        p.append('date differs from the file name')
    for k in ('title', 'standfirst', 'status', 'theme', 'figures', 'chart', 'explore', 'limitation'):
        if not d.get(k):
            p.append(f'no {k}')
    if d.get('status') not in STATUSES:
        p.append(f'status {d.get("status")!r} is not one of {", ".join(STATUSES)}')
    if d.get('theme') and d['theme'] not in THEMES:
        p.append(f'theme {d["theme"]!r} is not one of {", ".join(THEMES)}')
    if len(d.get('title') or '') >= 90:
        p.append(f'title is {len(d["title"])} characters (under 90)')
    if words(d.get('_body')) + words(d.get('limitation')) > 150:
        p.append(f'body and limitation run to {words(d.get("_body")) + words(d.get("limitation"))} words (150 at most)')
    if '!' in (d.get('title', '') + d.get('standfirst', '') + d.get('_body', '') + (d.get('limitation') or '')):
        p.append('an exclamation mark')
    lim = (d.get('limitation') or '').strip()
    if lim and len(re.findall(r'[.?](?:\s|$)', lim)) != 1:
        p.append('the limitation is not one sentence')
    for i, fig in enumerate(d.get('figures') or []):
        for k in ('label', 'value', 'n', 'source', 'as_at', 'compute'):
            if fig.get(k) in (None, ''):
                p.append(f'figure {i + 1} has no {k}')
        if isinstance(fig.get('n'), int) and fig['n'] < 10:
            p.append(f'figure {i + 1} rests on fewer than 10 schools')
    if not any(fig.get('key') for fig in d.get('figures') or []):
        p.append('no figure is marked key: true (the share image needs one)')
    ex = d.get('explore') or ''
    if not ex.startswith('/explorer/') or '#' not in ex or '=' not in ex.split('#', 1)[1]:
        p.append('explore is not an Explorer link with its view in the hash')
    if d.get('status') == 'superseded' and not d.get('superseded_by'):
        p.append('superseded but no superseded_by')
    return p
