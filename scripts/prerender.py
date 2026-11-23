"""The first finding, written into each school page at build time (speed, 23 November 2026).

On a phone the school's name and its headline finding used to appear only after about 1.3 MB of data had loaded
and been read. These functions write the same name, details line and headline (the 'oe-verdict' block of the
story) into the page itself, so a reader sees them at once. When the data arrive, the page's own script draws
the same thing: if its result matches, the pre-rendered text is kept as it is, so nothing moves or flickers.

This is a Python copy of the wording in site/explorer/app.js (sname, smeta) and site/explorer/extra.js (the
story's head and body). Change both together. On 23 November 2026 the two were compared in the browser for 176
schools of every kind (secondaries, report-card-only, cohorts under 30): name, details and headline matched exactly.
Input rows are read from the built ks4.json and rc.json, so the figures are the exact strings the browser sees.
"""
import datetime
import html
import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', 'site', 'explorer', 'data')
PHL = {'Primary': 'primary schools', 'Secondary': 'secondary schools', 'Special': 'special schools',
       'Alternative provision': 'alternative provision schools', 'Nursery': 'nursery schools'}
OFSTED_TYPE = {'Nursery': 20, 'Primary': 21, 'Alternative provision': 22, 'Secondary': 23, 'Special': 25}
MINUS = '−'


def expand(j):
    rows = []
    for i in range(j['n']):
        o = {}
        for c in j['cols']:
            v = j['data'][c][i]
            if v is None:
                o[c] = ''
            elif c in j['codes']:
                o[c] = j['codes'][c][v]
            else:
                o[c] = js_str(v)
        rows.append(o)
    return rows


def js_str(v):
    """String(v) as JavaScript gives it for a JSON number or string."""
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, float):
        if v == int(v) and abs(v) < 1e21:
            return str(int(v))
        return repr(v)
    return str(v)


def ok(v):
    if v is None or v == '':
        return False
    try:
        return not math.isnan(float(v))
    except (TypeError, ValueError):
        return False


def _fmt(v, spec):
    """d3.format: Number.prototype.toFixed (exact binary value, ties away from zero), a true minus sign,
    and no sign on a value that rounds to zero."""
    from decimal import Decimal, ROUND_HALF_UP
    if math.isnan(v):
        return 'NaN'
    q = Decimal(v).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)
    if q == 0:
        return ('+' if spec.startswith('+') else '') + '0.0'
    s = format(q, 'f')
    if spec.startswith('+') and q > 0:
        s = '+' + s
    return s.replace('-', MINUS)


def f1(v):
    return _fmt(float(v), '.1f')


def fs(v):
    return _fmt(float(v), '+.1f')


def esc(s):
    return html.escape(s, quote=False)


def attr(s):
    return s.replace('&', '&amp;').replace('"', '&quot;')


def rich(text):
    out = []
    for i, t in enumerate(text.split('**')):
        if t:
            out.append(f'<b>{esc(t)}</b>' if i % 2 else esc(t))
    return ''.join(out)


def long_date(iso):
    d = datetime.datetime.fromisoformat(iso[:10])
    return f'{d.day} {d.strftime("%B %Y")}'


class Rows:
    def __init__(self):
        with open(os.path.join(DATA, 'ks4.json'), encoding='utf-8') as f:
            self.ks4 = expand(json.load(f))
        with open(os.path.join(DATA, 'rc.json'), encoding='utf-8') as f:
            self.rc = expand(json.load(f))
        self.by_ks4 = {r['urn']: r for r in self.ks4}
        self.by_rc = {r['urn']: r for r in self.rc}
        v = sorted(float(r['pupils']) for r in self.ks4 if ok(r['pupils']) and float(r['pupils']) > 0)
        self.med = v[len(v) // 2] if v else 180

    def school(self, urn):
        """As the 'school' calc in app.js: the results row for a secondary, else the report card row."""
        k = self.by_ks4.get(urn)
        if k:
            return dict({'phase': 'Secondary'}, **k)
        o = self.by_rc.get(urn)
        return dict({'rc_only': 'yes'}, **o) if o else None


def meta(r):
    date = long_date(r['insp_date']) if r.get('insp_date') else ''
    if r.get('rc_only'):
        town = r.get('town') if r.get('town') and r.get('town') != r.get('la') and r.get('town') != 'London' else ''
        parts = [r.get('phase'), town, r.get('la'), r.get('region'), r.get('postcode'), r.get('mat') or '']
    else:
        parts = ['Secondary', r.get('la'), r.get('region'), r.get('postcode'), r.get('mat') or 'Not in a multi-academy trust', r.get('type'), r.get('selective')]

    def link(text, href, title):
        return f'<a href="{attr(href)}" target="_blank" rel="noopener" title="{attr(title)}" class="oe-ext">{esc(text)}</a>'
    ofsted = f"https://reports.ofsted.gov.uk/provider/{OFSTED_TYPE.get(r.get('phase') or 'Secondary', 23)}/{r['urn']}"
    items = [esc(p) for p in parts if p]
    items.append(link('URN ' + r['urn'], 'https://get-information-schools.service.gov.uk/Establishments/Establishment/Details/' + r['urn'],
                      "This school's official record on the DfE's Get Information about Schools (opens in a new tab)"))
    items.append(link('Inspected ' + date, ofsted, "This school's inspection reports on the Ofsted website (opens in a new tab)") if date
                 else link('No report card inspection yet', ofsted, "This school's earlier inspection reports on the Ofsted website (opens in a new tab)"))
    return ' · '.join(items)


def verdict(r, med):
    """The headline block of the story, or '' where the page draws none."""
    if r.get('rc_only'):
        ph = PHL.get(r.get('phase'), 'schools')
        why = ('No 2025/26 GCSE results are published for this school, so this profile shows its report card on its own.' if r.get('phase') == 'Secondary'
               else 'The Explorer reads results for secondary schools only so far, so this profile shows the report card on its own.')
        body = why + ' Below, each graded area is set beside other ' + ph + ' in England' + (' and those whose pupils come from similarly deprived areas' if r.get('idaci_q') else '') + '.'
        return f'<div class="oe-verdict"><h3>The report card, beside comparable schools.</h3><p>{rich(body)}</p></div>'
    if not ok(r.get('a8')):
        return ''
    nat = float(r['nat_diff']) if ok(r.get('nat_diff')) else float('nan')
    ssd = float(r['ss_diff']) if ok(r.get('ss_diff')) else float('nan')
    band = str(r.get('ss_band') or '')
    up, down = 'above' in band.lower(), 'below' in band.lower()
    nat_low, nat_high = nat <= -2, nat >= 2

    def rel(v):
        if math.isnan(v):
            return 'NaN points below'
        return 'level with' if abs(v) < 0.05 else f1(abs(v)) + ' points ' + ('above' if v > 0 else 'below')
    nat_t, ss_t = rel(nat), rel(ssd)
    SS = 'the 50 schools with the most similar intakes'
    if nat_low and up:
        head, body = 'A gap to national, but ahead of schools like it.', 'Results sit **' + nat_t + '** the national average. Against ' + SS + ', though, the school is **' + f1(ssd) + ' points ahead**. On this evidence the gap to national says more about intake than about the school.'
    elif nat_low and down:
        head, body = 'Below national, and below schools like it.', 'Results sit **' + nat_t + '** the national average and **' + ss_t + '** the average of ' + SS + '. On these measures intake does not account for the whole gap.'
    elif nat_low:
        head, body = 'Below national, and about where similar schools are.', 'Results sit **' + nat_t + '** the national average but within the normal range for ' + SS + ' (**' + ss_t + '** their average). The gap to national is largely one those schools share.'
    elif nat_high and up:
        head, body = 'Above national, and ahead of schools like it.', 'Results sit **' + nat_t + '** the national average and **' + ss_t + '** the average of ' + SS + '. The headline is not simply a product of intake.'
    elif nat_high and down:
        head, body = 'Above national, but behind schools like it.', 'Results sit **' + nat_t + '** the national average, yet **' + ss_t + '** the average of ' + SS + '. On its own the headline figure overstates the picture: schools with this intake typically achieve more.'
    elif nat_high:
        head, body = 'Above national, in line with schools like it.', 'Results sit **' + nat_t + '** the national average and close to ' + SS + ' (**' + ss_t + '** their average). The headline mostly reflects a favourable intake.'
    else:
        head = 'Close to national, and ' + ('ahead of' if up else 'behind' if down else 'in line with') + ' schools like it.'
        body = 'Results sit **' + nat_t + '** the national average and **' + ss_t + '** the average of ' + SS + '.'
    if ok(r.get('cva_res')):
        cva = float(r['cva_res'])
        cv = '**' + fs(cva) + '** against expectation'
        n = float(r['pupils']) if ok(r.get('pupils')) else 0
        ct = 2 * math.sqrt(med / n) if n > 0 else 2
        if (cva > ct) if up else (cva < -ct) if down else (abs(cva) <= ct):
            body += ' The contextual model agrees (' + cv + ').'
        elif (up and cva > 0) or (down and cva < 0):
            body += ' The contextual model points the same way, less strongly (' + cv + ').'
        elif not up and not down:
            body += ' The contextual model is a little more ' + ('positive' if cva > 0 else 'negative') + ' (' + cv + '), so read “in line” as approximate.'
        else:
            body += ' The contextual model points the other way (' + cv + '), so the two readings disagree and the direction is uncertain.'
    if ok(r.get('pupils')) and float(r['pupils']) < 30:
        body += ' With only **' + str(int(math.floor(float(r['pupils']) + 0.5))) + ' pupils** in the cohort, a few results move these figures a long way.'
    return f'<div class="oe-verdict"><h3>{esc(head)}</h3><p>{rich(body)}</p></div>'


def fill(h, r, med):
    """Write the name, details and headline into a school page built from the Explorer template."""
    name = esc(r['name'])
    a = '<p class="oe-school" data-draw="sname" role="heading" aria-level="2">—</p><p class="oe-meta" data-draw="smeta">—</p>'
    b = '<div class="oe-story" data-draw="story" data-source="school neigh stats"></div>'
    if a not in h or b not in h:
        raise SystemExit('school page template: the school head or story block has changed; update scripts/prerender.py')
    urn = r['urn']
    h = h.replace(a, f'<p class="oe-school" data-draw="sname" role="heading" aria-level="2" data-pre="{urn}">{name}</p>'
                     f'<p class="oe-meta" data-draw="smeta" data-pre="{urn}">{meta(r)}</p>', 1)
    v = verdict(r, med)
    if v:
        h = h.replace(b, f'<div class="oe-story" data-draw="story" data-source="school neigh stats" data-pre="{urn}">{v}</div>', 1)
    # the buttons show from the start (oe-prd), with Compare set as the script will set it, so nothing moves when it runs
    c = '<a class="oe-btn" id="oe-cmp" href="/explorer/compare/">'
    if c in h:
        h = h.replace(c, '<a class="oe-btn" id="oe-cmp" href="/explorer/compare/" hidden>' if r.get('rc_only') else f'<a class="oe-btn" id="oe-cmp" href="/explorer/compare/#u={urn}">', 1)
    cls = ['oe-prd'] + (['oe-rconly'] if r.get('rc_only') else []) + (['oe-nonsec'] if (r.get('phase') or 'Secondary') != 'Secondary' else []) + ([] if r.get('rc_only') else ['oe-pre'])
    if cls:
        h = h.replace('<html lang="en-GB">', f'<html lang="en-GB" class="{" ".join(cls)}">', 1)
    return h
