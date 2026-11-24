"""Inspection timing: where a school stands under Ofsted's published policy on when full inspections fall.

This is a reading of published policy and the law, not a forecast. Ofsted does not publish its schedule and
can inspect at any time. Every rule is quoted, with its source, in docs/inspection-timing-rules.md; the code
below follows that file, and the rule codes are the same.

Rules (code: situation -> what is computed)
  STD4    last full inspection with no concerns -> usual point about 4 years after the report's publication
  RI25    a 2.5-year case on the Sept 2026 list -> usual point about 2.5 years after the report's publication
            (sub-codes in `why`: UNG_CONCERN, UNG_SLIP, RI_OE, RI_KJ)
  MON_NA  a report card with any 'needs attention' area -> monitoring (one on-site visit within 24 months),
            next full inspection about 4 years after publication (monitoring guide, Sept 2026)
  MON_COC a report card with a category of concern -> monitoring programme; no usual point
  MON_LEG serious weaknesses or special measures at end of October 2025 -> legacy monitoring; no usual point
  NEW     a new school (its own URN) not yet inspected -> usually in its third year of operation
  CLOSING proposed to close within 6 months -> no clock
  UNCONF  anything the rules above do not settle -> statutory limit only, with "rule not confirmed"

Statutory latest date (Education (School Inspection) (England) Regulations 2005, reg. 2 and 3, as amended in
2015, 2021 and 2024): 5 years after the end of the school year in which the latest section 5 inspection or
relevant section 8 inspection began; a school year begins on 1 August, so it ends on 31 July. Where that
inspection began between 1 August 2014 and 27 April 2021 the period is 7 years (reg. 3ZA, added 2021).
"""
import datetime as dt

AUG1 = (8, 1)
RENEWED_START = dt.date(2025, 11, 10)   # renewed framework inspections began (operating guide, Nov 2025)
SEPT_2024 = dt.date(2024, 9, 1)
COVID_FROM, COVID_TO = dt.date(2014, 8, 1), dt.date(2021, 4, 27)

AREAS = ['g_inc', 'g_ct', 'g_ach', 'g_ab', 'g_pd', 'g_ey', 'g_p16', 'g_lg']
OEIF_KEY = ['o_qe', 'o_ba', 'o_pd', 'o_lm', 'o_ey', 'o_sf']
UNG_CONCERN = {'School remains Good (Concerns) - S5 Next', 'School remains Outstanding (Concerns) - S5 Next'}
UNG_SLIP = {'Some aspects not as strong'}

RULES = ['STD4', 'RI25', 'MON_NA', 'MON_COC', 'MON_LEG', 'NEW', 'CLOSING', 'UNCONF']


def d(s):
    return dt.date.fromisoformat(s) if s else None


def add_months(x, m):
    if x is None:
        return None
    y, mo = divmod(x.month - 1 + m, 12)
    y += x.year
    mo += 1
    for day in (x.day, 30, 29, 28):
        try:
            return dt.date(y, mo, day)
        except ValueError:
            continue


def school_year_end(x):
    """31 July that ends the statutory school year containing x (school year = 12 months from 1 August)."""
    return dt.date(x.year + (1 if (x.month, x.day) >= AUG1 else 0), 7, 31)


def statutory_latest(start):
    """Latest date for the next section 5 inspection after an inspection that began on `start`."""
    if start is None:
        return None
    years = 7 if COVID_FROM <= start <= COVID_TO else 5
    e = school_year_end(start)
    return dt.date(e.year + years, 7, 31)


def _own(row, p):
    """The inspection fields with prefix p, if they relate to this URN."""
    if not row.get(p + '_start'):
        return None
    return {'start': d(row[p + '_start']), 'pub': d(row.get(p + '_pub')) or d(row[p + '_start']),
            'own': row.get(p + '_rel', 'Yes') != 'No', 'urn': row.get(p + '_urn') or ''}


def merge_daily(mi_row, daily):
    """A report card read from Ofsted's reports site counts only if it is newer than the MI's latest full inspection
    and on or after the renewed framework's start. Monitoring and conversion letters never reach reports_daily.csv
    (fetch_reports.py keeps only documents titled 'School inspection' that carry report-card grades), so they
    cannot restart the clock here."""
    if not daily or not daily.get('insp_date'):
        return mi_row, False
    di = d(daily['insp_date'])
    cur = d(mi_row.get('f_start'))
    if di < RENEWED_START or (cur and di <= cur):
        return mi_row, False
    r = dict(mi_row)
    r.update({'f_start': daily['insp_date'], 'f_pub': daily.get('published') or daily['insp_date'], 'f_rel': 'Yes',
              'f_type': 'Report card read from reports.ofsted.gov.uk', 'coc': ''})
    for a in AREAS + ['g_sg']:
        r[a] = daily.get(a, '')
    if any(daily.get(a) == 'Urgent improvement' for a in AREAS) or daily.get('g_sg') == 'Not met':
        r['coc'] = 'COC'   # category of concern; which category is not in the report card's grade summary
    return r, True


def classify(row, gias=None, as_at=None):
    """Return the timing record for one school.

    row: one row of data/raw/ofsted_mi_latest.csv (after merge_daily). gias: the school's row of gias_slim.csv.
    as_at: the date the reading is made (build date)."""
    gias = gias or {}
    as_at = as_at or dt.date.today()
    full, graded, ungraded = _own(row, 'f'), _own(row, 'o'), _own(row, 'u')
    own = [x for x in (full, graded, ungraded) if x and x['own']]
    pred = [x for x in (full, graded, ungraded) if x and not x['own']]
    rec = {'rule': 'UNCONF', 'why': '', 'anchor': None, 'anchor_kind': '', 'last': None, 'last_kind': '',
           'usual': None, 'earliest': None, 'band_end': None, 'statutory': None, 'mon': '', 'mon_by': None,
           'new': False, 'pred_urn': '', 'pred_date': None, 'close': None}

    # statutory: latest own section 5 inspection or relevant section 8 (ungraded) inspection, by start date
    last = max(own, key=lambda x: x['start']) if own else None
    if last:
        rec['last'] = last['start']
        rec['last_kind'] = 'full' if last is full else ('graded' if last is graded else 'ungraded')
        rec['statutory'] = statutory_latest(last['start'])
    if pred:
        p = max(pred, key=lambda x: x['start'])
        rec['pred_urn'], rec['pred_date'] = p['urn'], p['start']

    # proposed closure within 6 months
    status = (gias.get('status') or '')
    close = d(gias.get('close_date'))
    if 'proposed to close' in status.lower() and close and close <= add_months(as_at, 6):
        rec.update(rule='CLOSING', close=close)
        return rec

    def clock(anchor, kind, months, band, why=''):
        rec.update(anchor=anchor, anchor_kind=kind, why=why, usual=add_months(anchor, months),
                   earliest=add_months(anchor, months - band), band_end=add_months(anchor, months + band))
        if rec['statutory'] and rec['band_end'] > rec['statutory']:
            rec['band_end'] = rec['statutory']

    # renewed framework report card
    if full and full['own']:
        grades = [row.get(a) for a in AREAS]
        if row.get('coc') in ('SM', 'RSI', 'COC') or 'Urgent improvement' in grades or row.get('g_sg') == 'Not met':
            kind = row.get('coc') if row.get('coc') in ('SM', 'RSI') else 'COC'
            months = {'RSI': 18, 'SM': 24}.get(kind)
            rec.update(rule='MON_COC', mon=kind, anchor=full['pub'], anchor_kind='report card published',
                       mon_by=add_months(full['pub'], months) if months else None)
            return rec
        if 'Needs attention' in grades:
            rec.update(rule='MON_NA', mon='NA', mon_by=add_months(full['pub'], 24))
            clock(full['pub'], 'report card published', 48, 12)
            return rec
        rec['rule'] = 'STD4'
        clock(full['pub'], 'report card published', 48, 12)
        return rec

    # original framework: legacy category of concern at end of October 2025
    if graded and graded['own'] and row.get('o_coc') in ('SM', 'SWK'):
        kind = row['o_coc']
        rec.update(rule='MON_LEG', mon=kind, anchor=graded['pub'], anchor_kind='report published',
                   mon_by=add_months(graded['pub'], {'SWK': 18, 'SM': 24}[kind]))
        return rec

    if not own:
        opened = d(gias.get('open_date')) or d(row.get('open'))
        if opened:
            rec.update(rule='NEW', new=True)
            clock(opened, 'opened', 30, 6)   # third year of operation: from 2 to 3 years after opening
            return rec
        rec['why'] = 'no inspection and no open date'
        return rec

    if last is ungraded:
        out = row.get('u_out', '')
        # the outcome itself says the school was good or outstanding ("School remains Good (Concerns) - S5 Next");
        # the MI leaves the graded fields blank where a later ungraded inspection exists, so they are not needed here
        if out in UNG_CONCERN and ungraded['start'] < SEPT_2024:
            rec['rule'] = 'RI25'
            clock(ungraded['pub'], 'report published', 30, 12, 'UNG_CONCERN')
        elif out in UNG_SLIP:
            rec['rule'] = 'RI25'
            clock(ungraded['pub'], 'report published', 30, 12, 'UNG_SLIP')
        else:
            rec['rule'] = 'STD4'
            clock(ungraded['pub'], 'report published', 48, 12)
        return rec

    # last inspection graded under the original framework
    oe = row.get('o_oe', '')
    if graded['start'] < SEPT_2024 and oe == '3':
        rec['rule'] = 'RI25'
        clock(graded['pub'], 'report published', 30, 12, 'RI_OE')
    elif graded['start'] >= SEPT_2024 and any(row.get(k) == '3' for k in OEIF_KEY):
        rec['rule'] = 'RI25'
        clock(graded['pub'], 'report published', 30, 12, 'RI_KJ')
    elif oe in ('1', '2') or (oe == 'Not judged' and graded['start'] >= SEPT_2024):
        rec['rule'] = 'STD4'
        clock(graded['pub'], 'report published', 48, 12)
    else:
        rec['why'] = f'graded outcome {oe or "blank"} not covered'
    return rec


def iso(x):
    return x.isoformat() if x else None


def compact(rec):
    """The record as served to a school page (site/explorer/data/it/<urn % N>.json)."""
    out = {'r': rec['rule'], 'w': rec['why'] or None, 'a': iso(rec['anchor']), 'ak': rec['anchor_kind'] or None,
           'l': iso(rec['last']), 'lk': rec['last_kind'] or None, 'u': iso(rec['usual']), 'e': iso(rec['earliest']),
           'b': iso(rec['band_end']), 's': iso(rec['statutory']), 'm': rec['mon'] or None, 'mb': iso(rec['mon_by']),
           'n': 1 if rec['new'] else None, 'pu': rec['pred_urn'] or None, 'pd': iso(rec['pred_date']),
           'c': iso(rec['close'])}
    return {k: v for k, v in out.items() if v is not None}
