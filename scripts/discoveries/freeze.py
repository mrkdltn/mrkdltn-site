"""Fill a draft discovery's figures and chart from today's data, by their compute functions.

    python3 scripts/discoveries/freeze.py content/discoveries/2026-11-25-some-finding.md [...]

For each figure it writes value, n, source and as_at from the function its `compute:` names (scripts/discoveries/
figures.py); for the chart, the series (or rows) and the y-axis top. It works only on candidates and drafts: an
approved, published or superseded discovery is frozen and is never rewritten (supersede it with a new file instead).
Run python3 scripts/build_data.py first, so the data are today's.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import content  # noqa: E402
import figures  # noqa: E402

FROZEN = ('approved', 'published', 'superseded')


def rounded(v, unit):
    if v is None:
        return None
    if unit in ('schools', 'estimates'):
        return int(round(v))
    if unit == 'p':
        return round(float(v), 4)
    return round(float(v), 2)


def freeze(meta, d):
    """Recompute every figure and the chart in place. Returns meta."""
    if meta.get('status') in FROZEN:
        raise SystemExit(f'{meta.get("_file")}: status {meta["status"]}, so its figures are frozen; supersede it instead')
    stamp = figures.as_at(d)
    for fig in meta.get('figures') or []:
        r = figures.compute(fig['compute'], d)
        if r['value'] is None:
            raise SystemExit(f'{meta.get("_file")}: {fig["compute"]} gives no figure (a group under 10 schools?)')
        fig['value'] = rounded(r['value'], fig.get('unit'))
        fig['n'] = int(r['n'])
        fig['source'] = figures.source_for(fig['compute'], d)
        fig['as_at'] = figures.as_at_for(fig['compute'], d)
    ch = meta.get('chart') or {}
    if ch.get('compute'):
        ch.update(figures.compute(ch['compute'], d))
        ch['source'] = figures.source_for(ch['compute'], d)
        ch['as_at'] = figures.as_at_for(ch['compute'], d)
        ch['data_version'] = d.build.get('version') or ''
    return meta


def main(paths):
    d = figures.Data()
    for p in paths:
        meta = content.load(p)
        body = meta.pop('_body')
        freeze(meta, d)
        meta.pop('_file', None)
        content.save(p, meta, body)
        print('froze', p)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    main(sys.argv[1:])
