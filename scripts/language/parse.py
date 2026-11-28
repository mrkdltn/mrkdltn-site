#!/usr/bin/env python3
"""Report Language, step 1: split each renewed-framework report card into its sections, and take every name out.

Reads the raw text the backfill wrote OUTSIDE the repository (text/<urn>.txt.gz, manifest.jsonl) and writes, also
outside the repository:
  parsed/<urn>.json   phase, inspection month, safeguarding outcome, category of concern, and for each section its
                      grade and its text, with names removed (no school name, no personal name, no URN or date inside)
  parsed/index.csv    the internal key: urn, inspection date, PDF address, sha256, parse warnings, name-rule counts
  parsed/check.json   agreement of parsed grades with Ofsted MI and the daily reader, and residual name-check hits
  restricted/lead_inspector.csv   urn, a pseudonymous lead-inspector code (HMAC-SHA256 under secrets/inspector.key,
                      first 12 hex characters) and the role detected, for the pre-registered national consistency
                      analysis only; no inspector's name is written anywhere
and, inside the repository (aggregate only, cells under 10 shown as "<10"):
  docs/report-language/corpus-counts.md

How a report is read. The PDF text is a run of lines. Section headings are whole lines: an evaluation area followed by
its grade ("Curriculum and teaching Needs attention"), "Safeguarding standards met|not met", "This school requires
special measures|significant improvement", "What it's like to be a pupil at this school", "Next steps", "About this
inspection", "The inspectors confirmed the following information about the school:". Areas come in any order (Ofsted
orders them by grade). Three kinds of block are dropped: the inspection team (Lead inspector, Team inspectors and
their lines), the facts-and-figures data, and boilerplate (the grade key, "How we evaluate safeguarding", "Our grades
explained", the licence and address footer). The team block and the facts header can fall in the middle of "About this
inspection" because of the PDF's layout, so after them the parser returns to the section it was in.

Names. First by structure: the team block and every role line ("Headteacher: ...", "... : Executive headteacher")
are dropped. Then by pattern on the joined text: the school's own name and its distinctive short form become
[the school], the school's trust or federation becomes [the trust], and personal names become [name] when they follow
a title (Mr, Mrs, Ms, Miss, Dr ...), a role ("the executive headteacher, ...", "chaired by ...", "the chair ... is ..."),
precede an inspector designation, or are a known given name followed by a capitalised surname. The given names come
from a built-in list plus the names found in the structural lines of the corpus itself (held in memory only). A
separate, deliberately broader detector (capitalised bigrams against a stop-list of school, place and curriculum
terms) counts what is left so that residual hits can be read by eye.

  python3 scripts/language/parse.py [--data DIR] [--limit N] [--urn URN ...]
"""
import argparse, collections, csv, datetime as dt, gzip, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, '..', '..'))
RAW = os.path.join(REPO, 'data', 'raw')
DATA = os.path.normpath(os.path.join(REPO, '..', 'mrkdltn-data', 'report-language'))

GRADES = ['Exceptional', 'Strong standard', 'Expected standard', 'Needs attention', 'Urgent improvement']
G_RE = '(' + '|'.join(GRADES) + ')'
AREAS = [
    ('inclusion', r'Inclusion'),
    ('curriculum_teaching', r'Curriculum and teaching'),
    ('achievement', r'Achievement'),
    ('attendance_behaviour', r'Attendance and behaviour'),
    ('personal_development', r'Personal development and well-?being'),
    ('early_years', r'Early years(?: provision| foundation stage)?'),
    ('post16', r'(?:Post[- ]?16|Sixth[- ]form)(?: provision| education| study programmes)?'),
    ('leadership_governance', r'Leadership and governance'),
]
AREA_KEYS = [k for k, _ in AREAS]
CORE = ['inclusion', 'curriculum_teaching', 'achievement', 'attendance_behaviour', 'personal_development',
        'leadership_governance']
# MI / daily column for each area
MI_COL = {'inclusion': 'g_inc', 'curriculum_teaching': 'g_ct', 'achievement': 'g_ach',
          'attendance_behaviour': 'g_ab', 'personal_development': 'g_pd', 'early_years': 'g_ey',
          'post16': 'g_p16', 'leadership_governance': 'g_lg'}

AREA_HEAD = [(k, re.compile(r'^(' + p + r')\s+' + G_RE + r'$', re.I)) for k, p in AREAS]
AREA_ONLY = [(k, re.compile(r'^(' + p + r')$', re.I)) for k, p in AREAS]
GRADE_ONLY = re.compile(r'^' + G_RE + r'$')

# narrative headings -> section key
HEADS = [
    ('safeguarding', re.compile(r'^Safeguarding standards (met|not met)$', re.I)),
    ('concern', re.compile(r'^This school requires (special measures|significant improvement)$', re.I)),
    ('pupil_view', re.compile(r"^What it(?:['’]s| is) like to be an? (?:pupil|child|student|learner)s? (?:at|in) this (?:school|setting)$", re.I)),
    ('next_steps', re.compile(r'^Next steps$', re.I)),
    ('about', re.compile(r'^(?:About this inspection|Information about (?:this|the) inspection|About the inspection):?$', re.I)),
    ('context', re.compile(r'^(?:(?:The )?inspector(?:s|\(s\))? confirmed the following(?: information)? about (?:the|this) school|'
                           r'About this school|Information about (?:this|the) school):?$', re.I)),
]
# blocks dropped whole, until the next heading
DROP_HEADS = [
    ('sg_boiler', re.compile(r'^How we evaluate safeguarding$', re.I)),
    ('end', re.compile(r'^Our grades explained$', re.I)),
]
# interruptions: dropped, then the parser returns to the section it was in
TEAM_HEAD = re.compile(r'^(?:Lead inspector|Team inspectors?|Inspection team|Inspectors?)\s*:?\s*$', re.I)
INSPECTOR_LINE = re.compile(r"(?:,|^)\s*(?:(?:His|Her) Majesty['’]s Inspector|Ofsted Inspector|HMI)s?\s*(?:\(.*\))?\s*$", re.I)
FACTS_HEAD = re.compile(r'^Facts and figures used (?:on|in|during) (?:the )?inspection$', re.I)
FACTS_LINE = re.compile(r'^(?:This (?:was the )?data|The data (?:was|were) used|More recent data|been published since|'
                        r'The inspector(?:\(s\)|s)? used this data|taken from different sources|This data is from|'
                        r'inspection took place\.?$|full inspection took place\.?$)', re.I)
# the start of the data tables: dropped until the next heading
DATA_START = re.compile(r"^(?:School and pupil context|Total pupils|What does this mean\?|National average:.*|"
                        r"(?:Well )?(?:above|below) average|Close to average|This data is from .*|"
                        r"All pupils['’] performance|Pupils eligible for free school meals|School capacity|"
                        r"Overall absence|Absence|Year This school.*|(?-i:Location deprivation|Resourced [Pp]rovision or SEND [Uu]nit.*|No resourced provision|"
                        r"Type of specialist provision.*|Pupils with an education, health and care \(EHC\) plan|"
                        r"Pupils with [Ss]pecial [Ee]ducational [Nn]eeds \(SEN\) support)|\d[\d,]*%?|\d+\.\d+%)$", re.I)
# prose that the PDF's layout puts among the data tables: it returns to the about/context section it belongs to
RESUME = re.compile(r"^(?:Inspectors|The inspectors?|The lead inspector|The school|This school|The nursery|The academy|"
                    r"He|She|They|In addition|Since|At the time|During the inspection)\b(?:\S*\s+){5,}", re.I)
# the data tables' descriptions, recognised only in the closing about/context sections
DATA_DESC = re.compile(r"^(?:(?-i:(?:Percentage|Proportion|Number) of (?:pupils|students))|A measure of|How much progress|"
                       r"The total number of pupils (?:currently at this school and how|who can attend the school and how)|"
                       r"The proportion of pupils (?:eligible for free school meals(?: at any point|\.$)|with an education, health and care plan\. This|with reported special)|"
                       r"The percentage of (?:all possible mornings|pupils missing 10%|(?:disadvantaged )?pupils meeting the expected)|"
                       r"(?:schools )?of this phase in England\.$|this phase in England\.$)", re.I)
TITLES_LINE = r"(?:Mr|Mrs|Ms|Miss|Mx|Dr|Dame|Sir|Professor|Prof|Rev|Revd|Reverend|Father|Canon)"
ROLE_WORD = (r"(?:head ?teachers?|headmaster|headmistress|principals?|head of (?:school|centre)|heads of school|"
             r"chief executive(?: officer)?|ceo|chair(?:person)?(?: of [a-z ]+)?|executive leader|"
             r"school leader|manager|director(?: of [a-z ]+?)?|executive head|head)")
_LABEL = r"(?:(?:executive|interim|acting|co|chief|substantive|associate|federation|joint|regional|deputy|assistant|trust|senior|vice)[- ]?)*" + ROLE_WORD
_LABELS = _LABEL + r"(?:\s*(?:/|,|&|and)?\s*" + _LABEL + r")*"
ROLE_LINE = re.compile(r"^(?:" + _LABELS + r"\.?\s*:\s*\S.{0,100}|(?:" + TITLES_LINE + r"\.?\s+)?[A-Z][\w'’.-]+(?:\s+[A-Z][\w'’.-]+){0,3}"
                       r"(?:\s+and\s+(?:" + TITLES_LINE + r"\.?\s+)?[A-Z][\w'’.-]+(?:\s+[A-Z][\w'’.-]+){0,3})?\s*:\s*" + _LABELS + r")$", re.I)
INSP_ACTIVITIES = re.compile(r'^Inspection activities:?$', re.I)
BULLET = re.compile(r'^[•●▪◦■\-–]\s*')

NARRATIVE = set(AREA_KEYS) | {'safeguarding', 'concern', 'pupil_view', 'next_steps', 'about', 'context'}


def norm_line(l):
    l = l.replace(' ', ' ').replace('‑', '-').replace(' ‑ ', '-').replace('‑', '-')
    return re.sub(r'\s+', ' ', l).strip()


def classify(line, nxt=''):
    """Return (kind, key, grade) for a heading line, or None."""
    for k, rx in AREA_HEAD:
        m = rx.match(line)
        if m:
            return ('area', k, next(g for g in GRADES if g.lower() == m.group(2).lower()))
    for k, rx in AREA_ONLY:  # heading and grade on two lines
        if rx.match(line) and GRADE_ONLY.match(nxt):
            return ('area2', k, nxt)
    for k, rx in HEADS:
        m = rx.match(line)
        if m:
            g = None
            if k == 'safeguarding':
                g = 'Met' if m.group(1).lower() == 'met' else 'Not met'
            if k == 'concern':
                g = 'Special measures' if 'special' in m.group(1).lower() else 'Significant improvement'
            return ('head', k, g)
    for k, rx in DROP_HEADS:
        if rx.match(line):
            return ('drop', k, None)
    return None


def is_table_line(l, boiler):
    """While back in prose taken from among the tables: does this line return to the tables?"""
    if DATA_START.match(l) or DATA_DESC.match(l):
        return True
    if re.search(r'average|\d%|^Year |National|What does this mean|\b[A-Z]{2,5} - |\d{4}/\d{2}', l):
        return True
    if re.match(r"^(?:Pupils reaching|Disadvantaged pupils|All pupils|Students|Progress 8|Attainment 8|English and maths|"
                r"A-level|Pupils eligible|Pupils with|Based on the English|Whether school has|['‘]S['’] in the table)", l):
        return True
    return (l in boiler and not l[:1].islower() and '. ' not in l and len(l.split()) <= 12
            and not re.search(r"[.,;:]['’]?$", l) and not RESUME.match(l))


def is_stray_prose(l, boiler):
    """A line among the data tables that is report prose, not table text: not a line repeated across reports, not
    numbers, not a table description."""
    if DATA_DESC.match(l) or DATA_START.match(l):
        return False
    if RESUME.match(l) or re.match(r'^(?:[•●▪]\s*)?(?:Leaders|Governors|Those responsible|The trust|The local authority)\b.*\b(?:should|must)\b', l):
        return True
    if re.search(r"\band overseen by (?:a|the) (?:board|trust)", l):   # the end of the trust sentence, carried over the tables
        return True
        return True
    if l in boiler:
        return False
    if re.match(r'^[a-z].*[a-z]{2}[.;]$', l) and len(l.split()) >= 2:
        return True
    if re.search(r'average|\d%|\b[A-Z]{2,5} - |^\(|^Year |\bpp$|National|\d{4}/\d{2}', l):
        return False
    return len(l.split()) >= 5 and re.search(r'[a-z]{3}', l) is not None


def split_sections(raw, boiler=frozenset()):
    """Split raw report text into {key: [lines]} plus grades, warnings and dropped-line counts. No name handling.
    boiler: lines that recur across reports (table labels, descriptions), never taken as stray prose."""
    lines = [norm_line(l) for l in raw.split('\n')]
    lines = [l for l in lines if l]
    out = collections.OrderedDict()
    grades, warn, dropped = {}, [], collections.Counter()
    header = []
    cur = 'header'
    resume = None   # section to return to after an interruption
    mode = None     # None | 'team' | 'facts'
    data_resume = None  # narrative section the data tables interrupted
    resumed = []
    in_resumed = False
    i = 0
    while i < len(lines):
        l = lines[i]
        nxt = lines[i + 1] if i + 1 < len(lines) else ''
        c = classify(l, nxt)
        if c:
            kind, key, g = c
            mode = None
            in_resumed = False
            if kind in ('area', 'area2', 'head'):
                if key == 'context' and cur == 'about' and not out['about'] and \
                        any(classify(x) == ('head', 'context', None) for x in lines[i + 1:]):
                    # a context heading straight after "About this inspection", with the real one further on: the
                    # report has mislabelled its about-the-inspection text, which stays in about
                    i += 1
                    continue
                if key in out and key in ('about', 'context'):
                    cur = key          # a second heading for the same section: carry on in it
                    i += 1
                    continue
                if key in out:
                    warn.append(f'duplicate heading: {key}')
                    key = key + '_dup'
                out[key] = []
                if g:
                    grades[key] = g
                cur = key
                if kind == 'area2':
                    i += 1
            else:
                cur = 'drop:' + key
            i += 1
            continue
        # interruptions
        if TEAM_HEAD.match(l) or (mode == 'team' and (INSPECTOR_LINE.search(l) or re.match(r"^(?:(?:His|Her) Majesty['’]s )?Inspectors?$", l))):
            if mode is None:
                resume = cur
            mode = 'team'
            dropped['team'] += 1
            i += 1
            continue
        if FACTS_HEAD.match(l) or (mode == 'facts' and FACTS_LINE.match(l)):
            if mode is None:
                resume = cur
            mode = 'facts'
            dropped['facts'] += 1
            i += 1
            continue
        if INSPECTOR_LINE.search(l) and len(l) < 90 and re.match(r"^[A-Z][\w'’. -]+,", l):
            dropped['team'] += 1   # a stray inspector line outside the block
            i += 1
            continue
        if mode is not None:
            mode = None
            cur = resume
        if ROLE_LINE.match(l) and len(l) < 120:
            dropped['role_line'] += 1
            i += 1
            continue
        if cur == 'header':
            header.append(l)
            i += 1
            continue
        if cur.replace('_dup', '') in NARRATIVE:
            if in_resumed and is_table_line(l, boiler):
                in_resumed = False   # back among the tables
                cur = 'drop:data'
                dropped['data'] += 1
                i += 1
                continue
            if DATA_START.match(l) or (cur in ('about', 'context') and DATA_DESC.match(l)):
                data_resume = cur
                cur = 'drop:data'
                dropped['data'] += 1
                i += 1
                continue
            if FACTS_LINE.match(l):           # facts-and-figures boilerplate outside its block
                dropped['facts'] += 1
                i += 1
                continue
            if GRADE_ONLY.match(l):          # stray grade key from the front page graphic
                dropped['grade_key'] += 1
                i += 1
                continue
            if INSP_ACTIVITIES.match(l):
                i += 1
                continue
            out[cur].append(l)
        elif cur == 'drop:data' and data_resume and is_stray_prose(l, boiler):
            cur = data_resume
            in_resumed = True
            out[cur].append(l)
            dropped['resumed_from_data'] += 1
            resumed.append(l)
        else:
            dropped[cur.split(':', 1)[-1]] += 1
        i += 1
    return {'header': header, 'sections': out, 'grades': grades, 'warnings': warn, 'dropped': dict(dropped),
            'resumed': resumed}


def school_name_from_header(header):
    """The school's name is the text above 'Address:' on the first page."""
    name = []
    for l in header:
        if l.startswith('Address:') or l.startswith('Unique reference number'):
            break
        name.append(l)
    n = ' '.join(name).strip().rstrip(',')
    return re.sub(r',\s*[A-Z]{1,2}\d[\dA-Z]?$', '', n).strip()


def join_lines(lines):
    """Join wrapped lines into paragraphs. A paragraph ends where a line ends a sentence well short of the
    section's full line width (the PDF has no blank lines between paragraphs)."""
    if not lines:
        return []
    width = max(len(l) for l in lines)
    paras, buf = [], ''
    for idx, l in enumerate(lines):
        is_bullet = bool(BULLET.match(l))
        if is_bullet:
            l = BULLET.sub('', l)
            if buf:
                paras.append(buf)
                buf = ''
        if not buf:
            buf = l
        elif re.search(r"[^\W_]-$", buf) and (l[:1].islower() or (re.search(r"[^\W\d_]-$", buf) and re.match(r"[A-Z][a-z]", l))):
            buf = buf + l
        else:
            buf = buf + ' ' + l
        nxt = lines[idx + 1] if idx + 1 < len(lines) else ''
        ends = re.search(r"[.?!:;]['’\")]?$", l) is not None
        if ends and (len(l) < 0.82 * width or BULLET.match(nxt)) and not nxt[:1].islower():
            paras.append(buf)
            buf = ''
    if buf:
        paras.append(buf)
    return paras


# ---------------------------------------------------------------- names

TITLES = (r"(?:(?:Mr|Mrs|Ms|Miss|Mx|Dr|Dame|Sir|Professor|Prof|Rev|Revd|Reverend|Father|Canon|Councillor|Cllr|"
          r"Lieutenant|Lt|Colonel|Col|Major|Captain|Capt|Commander|Brigadier|Wing Commander|Squadron Leader)\.?\s+)*"
          r"(?:Mr|Mrs|Ms|Miss|Mx|Dr|Dame|Sir|Professor|Prof|Rev|Revd|Reverend|Father|Canon|Councillor|Cllr|"
          r"Lieutenant|Lt|Colonel|Col|Major|Captain|Capt|Commander|Brigadier)")
# letters include accented ones ("Renée", "Zoë")
UP = r"[A-ZÀ-ÖØ-Þ]"
LOW = r"(?:[^\W\d_]|['’])"
NAME_TOK = UP + LOW + r"+(?:-" + UP + LOW + r"+)?"
NAME_TOK_ANY = (r"(?!(?:Inspectors?|The|This|They|Following|Leaders|Pupils|Staff|Governors|Children|In|At|On)\b)"
                r"(?:Mc|Mac|O['’]|D['’])?" + UP + LOW + r"+(?:-" + UP + LOW + r"+)?")
# 2 to 4 capitalised tokens ("Firstname Middle Da Surname"), optionally a middle initial and lower-case particles
NAME2 = (NAME_TOK + r"(?:\s+[A-Z]\.?)?(?:\s+(?:(?:da|de|di|du|del|della|van|von|der|den|le|la|ter|bin|al)\s+)?"
         + NAME_TOK_ANY + r"){1,3}")
ROLE_BEFORE = (r"(?:(?:executive |interim |acting |substantive |associate |co-|deputy |assistant |new |federation |"
               r"part-time |chief executive |trust |founding |former |previous |current |vice-?)*"
               r"(?:head ?teachers?|headmaster|headmistress|principals?|head of school|heads of school|"
               r"chief (?:executive|education|operating) officer(?: \(CEO\))?|CEO|chair(?: of [a-z ]+?)?|chairs?|vice-chair|trustees?|"
               r"special educational needs (?:and disabilities )?co-?ordinator(?: \(SENCo\))?|SENCo|SENDCo|"
               r"designated safeguarding lead|director of [a-z ]+|leader|manager|executive lead(?:er)?|head)"
               r"|chaired by|led by|run by)")
# Words that are never a personal name's first token in these reports
NOT_NAME_START = set("""The A An This That These Those Their Its It In On At Of For From By With And Or But As If When
While Where Which Who Whose Inspectors Inspector Leaders Leader Staff Pupils Pupil Children Students Governors Trustees
Ofsted His Her Majesty Majesty's Chief Local Authority Department Education School Schools Academy Trust Federation
Year Years Key Stage Early Reception Nursery Sixth Form Personal Curriculum Inclusion Achievement Attendance Leadership
Safeguarding English Mathematics Maths Science Religious Physical Art Music History Geography Computing French Spanish
Church England Catholic Diocese Council Board Interim Executive Governing Parent View Special Educational Needs Since
During After Before Following However Also Overall Most Many Some All Each Every Both Other New Senior""".split())

# Common given names (generic list, not drawn from any report). Extended at run time with the given names found in
# the corpus's own structural lines.
GIVEN = set("""Aaron Abby Abdul Abigail Adam Adrian Ahmed Aidan Aisha Alan Alex Alexander Alexandra Ali Alice Alison
Amanda Amber Amelia Amy Andrea Andrew Andy Angela Anita Ann Anna Anne Annette Anthony Antony Asif Barbara Barry Ben
Benjamin Beth Bethan Beverley Bill Bob Brenda Brian Bridget Caroline Carl Carol Caroline Catherine Charlotte Chris
Christina Christine Christopher Claire Clare Colin Craig Daniel Danielle Darren Dave David Dawn Dean Deborah Debbie
Denise Diane Dianne Dominic Donna Duncan Edward Elaine Eleanor Elizabeth Ellie Emily Emma Fiona Frances Francis Gail
Gareth Gary Gavin Gemma Geoff Geoffrey George Gillian Gill Graham Hannah Harriet Hayley Heather Helen Ian Imran Jack
Jackie Jacqueline James Jamie Jane Janet Janice Jason Jayne Jean Jeff Jennifer Jenny Jeremy Jessica Jill Jo Joanna Joanne
Jodie John Jon Jonathan Joseph Josephine Julia Julian Julie Justin Karen Kate Katherine Kathryn Katie Kay Keith Kelly
Kerry Kevin Kim Kirsty Laura Lauren Lee Lesley Leslie Linda Lindsay Lisa Liz Lorraine Louise Lucy Lynn Lynne Maria
Marie Mark Martin Mary Matt Matthew Melanie Michael Michelle Mike Mohammed Muhammad Nadia Natalie Neil Nicholas Nichola
Nicky Nicola Nigel Nick Pam Pamela Patricia Paul Paula Pauline Peter Philip Phil Rachel Rebecca Richard Rob Robert
Robin Rosemary Ruth Ryan Sally Sam Samantha Sandra Sarah Sara Scott Sean Shaun Sharon Shirley Simon Sophie Stephanie
Stephen Steve Steven Stuart Sue Susan Suzanne Tanya Teresa Tim Timothy Tina Toby Tom Tony Tracey Tracy Una Valerie
Vanessa Vicky Victoria Wendy William Yvonne Zoe""".split())
# given names that are also ordinary capitalised words in reports; matched only with a title or role
GIVEN_AMBIGUOUS = set("""Will May Grace Hope Faith Joy Rose Holly Ivy Amber Summer Sky Victoria Florence Jordan Mark
Bill Rob Sue Art Learning Forest Royal Duke Sun Dawn Read Write Ruth Kay Lee Dean Jack Robin Pat Carol Ray Rich
Wood Hall Park Hill""".split())

INSPECTOR_NAME = re.compile(r"\b(" + NAME2 + r")\s*,\s*(?:(?:His|Her) Majesty['’]s Inspector|Ofsted Inspector|HMI)\b")
TITLE_NAME = re.compile(r"\b" + TITLES + r"\.?\s+(?:[A-Z]\.?\s+)?" + NAME_TOK_ANY + r"(?:\s+" + NAME_TOK_ANY + r"){0,2}")
ROLE_NAME = re.compile(r"\b(" + ROLE_BEFORE + r")(\s*,?\s*(?:\((?:[A-Za-z]+)\)\s*,?\s*)?)(" + NAME2 + r")\b")
IS_NAME = re.compile(r"\b((?i:co-?chair['’]?s|chair|chairs|chairperson|head ?teacher|principal|chief executive officer|CEO|head of school)"
                     r"[^.]{0,90}?\b(?:is|are|was|were)\s+(?:" + TITLES + r"\.?\s+)?)(" + NAME2 + r")"
                     r"(?=\s*(?:[.,&]|and\b|$|(?:The|Inspectors|Following|This|They)\b))")
ROLE_COLON = re.compile(r"(?i:\b(" + _LABELS + r")(\s*:\s*))(?:" + TITLES + r"\.?\s+)?(" + NAME2 + r")")
NAME_ROLE_APPOS = re.compile(r"\b(" + NAME2 + r")\s*\((?:the )?(?:head ?teacher|principal|chair|CEO|head of school)[^)]*\)")


# capitalised words that begin or end school names but are ordinary words in reports
COMMON_WORDS = set("""Green Wood Woods Field Fields Bridge Valley Meadow Meadows Grove Heath Brook Lane Hill Hills Park
Vale View Court Manor Abbey Castle Tower Towers Lodge Gate Gates Mill Mills Cross Common Moor Moors Marsh Water Waters
Spring Springs Rise Ridge Croft Farm Glebe Grange Orchard Orchards Oaks Elms Willows Beeches Cedars Pines Rivers River
Bridges Haven Harbour Port Bay Cliff Cliffs Dale Dales Down Downs Edge End Fold Ford Garth Gardens Glen Hall Hollow
Howe Hurst Ings Knoll Leys Mead Mount Nook Peak Pool Pools Row Shaw Side Stone Stones Thorn Thorns Top Well Wells Wold
Wolds Worth Phoenix Rainbow Sunshine Horizon Horizons Pathways Bridge Unity Harmony Discovery Inspire Aspire Endeavour
Excel Pioneer Pioneers Victory Liberty Hope Heritage Legacy Beacon Lighthouse Compass Anchor Kingfisher Robin Wren
Swallow Swan Heron Falcon Eagle Phoenix Acorn Acorns Oak Ash Elm Willow Hazel Holly Rowan Cedar Maple Birch Beech
Primrose Bluebell Daisy Poppy Rose Lavender Heather Ivy Marigold Sunflower Clover Primary Junior Infant Nursery
Central Northern Southern Eastern Western Upper Lower Middle Little Great Greater Royal Queen King Kings Queens Prince
Princess Bishop Cardinal Saint Saints Holy Christ Trinity Blessed Sacred Heart Immaculate Conception Assumption
Annunciation Ascension Resurrection Nativity Emmanuel Good Shepherd Family Cathedral Minster Grammar Technical Studio
Riverside Woodside Parkside Hillside Lakeside Seaside Brookside Fairfield Highfield Westfield Eastfield Northfield
Southfield Greenfield Springfield""".split())


# acronyms common in reports, never taken as a school's initials
ACRONYMS = set("""SEN SEND SENCO SENDCO PSHE RSE RSHE EYFS EHC DSL HMI OIS GCSE BTEC EBACC MFL ICT PE RE DT KS PRU SEMH SLCN
ASD MLD SLD PMLD VI HI MSI PD OTH LGBT NHS CAMHS TA TAS ECT ECTS NPQ NPQH SLT MAT DFE ESFA LA LAC PEP SPAG CPD PPA WAGOLL
UNICEF STEM STEAM BAME EAL FSM AP""".split())


SCHOOL_TYPE_WORDS = set("""Girls Boys Voluntary Preschool Pre-school Selective Specialist Nursery Infants Infant Junior Primary
Academy School College Centre Sixth Form Unit Hub""".split()) | {'Sixth Form', 'Sixth Form College', 'Voluntary Academy',
                                                             'Nursery School', 'Pre School'}
# type and denomination words that follow a school's distinctive name, as regex alternatives (longest first)
NAME_TAIL_WORDS = [r"Church\s+of\s+England", r"C\s+of\s+E", r"C\.\s?E\.", r"CofE", r"CE", r"Roman\s+Catholic", r"RC",
                   r"Catholic", r"Methodist", r"Voluntary\s+(?:Aided|Controlled)", r"VA", r"VC", r"Church", r"Primary",
                   r"Junior", r"Infants?", r"Nursery", r"First", r"Middle", r"Secondary", r"High", r"Grammar", r"Community",
                   r"Foundation", r"Village", r"Endowed", r"Federated", r"Free", r"Special", r"Day", r"Sixth\s+Form",
                   r"School", r"Academy", r"College", r"Centre"]
NAME_TAIL_SAME = [[r"Church\s+of\s+England", r"C\s+of\s+E", r"C\.\s?E\.", r"CofE", r"CE"],
                  [r"Roman\s+Catholic", r"RC", r"Catholic"], [r"School", r"Academy"]]
# the words of a type that only a school's own name puts before "School" or "Academy" ("Primary", "C of E")
NAME_LEVEL_WORDS = set(NAME_TAIL_WORDS) - {r"School", r"Academy", r"College", r"Centre", r"Church", r"Day", r"Free",
                                           r"Special", r"Foundation", r"Village", r"Community", r"Federated"}
NUMBER_WORDS = set("One Two Three Four Five Six Seven Eight Nine Ten Eleven Twelve Twenty Hundred First Second Third".split())


def school_name_forms(name, extra=(), common=frozenset(), trust_words=frozenset()):
    """Full name plus the distinctive short form ("Quillbrook Meadow" from "Quillbrook Meadow Primary School").
    common: ordinary lower-case words, never taken alone as the name; trust_words: words of the trust's name, which
    some schools carry in front of their own."""
    forms = set()
    for n in [name, *extra]:
        n = re.sub(r'\s+', ' ', (n or '').replace('’', "'")).strip(' ,')
        if not n:
            continue
        forms.add(n)
        forms.add(re.sub(r'^The\s+', '', n))
        core = n
        generic = (r"\b(?:and Sixth Form(?: College)?|Sixth Form|Church of England|C of E|CofE|C\.E\.|CE|Roman Catholic|RC|"
                   r"Catholic|Methodist|Voluntary (?:Aided|Controlled)|VA|VC|Primary|Junior|Infants?|Nursery|First|Middle|"
                   r"Secondary|High|Community|Foundation|Federation|School|Schools|Academy|College|Free|Grammar|"
                   r"Special|Pupil Referral Unit|PRU|Centre|Trust|Village|County|Endowed|Aided|Controlled|Church|"
                   r"Infant|and|&|of|Studio|UTC|Learning|Partnership|Alternative Provision|Provision)\b")
        prev = None
        while prev != core:
            prev = core
            core = re.sub(r'\s*' + generic + r'\s*$', '', core).strip(' ,-')
            core = re.sub(r'^(?:The)\s+', '', core)
        core = core.strip()
        words = core.split()
        if core and core not in ('St', 'Saint', 'The', 'Holy', 'Christ', 'Our Lady') \
                and len(core) >= 4 and not all(w in NOT_NAME_START for w in words):
            forms.add(core)
            # the leading words of a longer core ("Quillbrook Hall" from "Quillbrook Hall Day"), so that a shorter use
            # of the name is removed whole rather than leaving its second word beside the placeholder
            for k in range(2, len(words)):
                f = ' '.join(words[:k])
                if len(f) >= 5 and words[k - 1] not in ('of', 'and', '&', 'the', 'St', 'Saint') \
                        and not all(w in NOT_NAME_START or w in STOP_TOKENS for w in words[:k]):
                    forms.add(f)
            # "Quillbrook" from "Quillbrook Meadow", "Brightwater" from "Bishop Brightwater": one word of the name used alone
            # (in this school's own report only, so an ordinary word such as "Willow" is taken as the name too)
            for w in ([words[0], words[-1]] if len(words) >= 2 else []):
                w = re.sub(r"'s$", "", w)
                if len(w) >= 4 and w.isalpha() and w[0].isupper() and w not in STOP_TOKENS and w not in NOT_NAME_START \
                        and w not in GIVEN and w not in NUMBER_WORDS and w.lower() not in common:
                    forms.add(w)
        # the distinctive part after the school type ("Brightwater Primary Academy, Fallow End"): "Brightwater Fallow
        # End", "Brightwater" and "Fallow End"
        m = re.match(r"^(?:The\s+)?(.+?)\s+(?:(?:Primary|Junior|Infants?|Nursery|Secondary|High|Community|C of E|CofE|CE|"
                     r"Church of England|Roman Catholic|RC|Catholic|Methodist|Free|Special)\s+)*(?:School|Academy|College)\s*[,\-–]?\s+(.+)$", n)
        if m and not re.fullmatch(r"(?:\s*" + generic + r")+", m.group(2)):
            for f in (m.group(1) + ' ' + m.group(2), m.group(1), m.group(2)):
                f = f.strip(' ,-')
                if len(f) >= 4 and f not in ('St', 'Saint', 'The', 'Holy', 'Christ', 'Our Lady') and ' ' in f \
                        and not all(w in NOT_NAME_START or w in STOP_TOKENS for w in f.split()):
                    forms.add(f)
        # every distinctive part between the school-type words, brackets, joiners and the trust's own name:
        # "Quillbrook and Fallow End" -> both; "Fallow End St Ninian's" -> "Fallow End" and "St Ninian's";
        # "Quillbrook CofE (Controlled)" -> "Quillbrook"; "QZB Academy" -> "QZB"; "[trust word] Quillbrook" -> "Quillbrook"
        bare = re.sub(r"\([^)]*\)|\b\d+\s*-\s*\d+\b|/\s*\w+", " ", n)
        bare = re.sub(r"\b(?:Pre[- ]?[Ss]chool|Preschool|Voluntary|Parochial|Selective|Specialist|United|Memorial|Educate|"
                      r"Technology|International|Hub|Academies?)\b", "|", bare)
        if trust_words:
            bare = re.sub(r"(?<![\w-])(?:" + "|".join(map(re.escape, sorted(trust_words, key=len, reverse=True))) + r")(?![\w-])",
                          "|", bare, flags=re.I)
        bare = re.sub(generic.replace(r"|and|&|of|", r"|"), "|", bare)
        segs = re.split(r"\s*(?:\||,|&|\band\b| - | – |\bfor\b|\bA\b(?= ))\s*", bare)
        parts = []
        for sg in segs:
            sg = re.sub(r"^(?:The|of)\s+|\s+(?:of|the)$", "", sg.strip(" ,.-'")).strip()
            parts += [x.strip() for x in re.split(r"\s+(?=(?:St|Saint)\.?\s)", sg) if x.strip()]
        for f in parts:
            ws = f.split()
            if not ws or f in ('St', 'Saint', 'The', 'Holy', 'Christ', 'Our Lady', 'Lady', 'Our'):
                continue
            if len(ws) >= 2:
                if len(f) >= 5 and not all(w in NOT_NAME_START or w in STOP_TOKENS or w in ('St', 'St.', 'Saint') for w in ws):
                    forms.add(f)
            elif re.fullmatch(r"[A-Z]{3,6}", f) and f not in ACRONYMS:
                forms.add(f)
            else:
                w = re.sub(r"'s?$", "", f)
                if len(w) >= 4 and w.isalpha() and w[0].isupper() and w not in STOP_TOKENS and w not in NOT_NAME_START \
                        and w not in GIVEN and w not in NUMBER_WORDS and w.lower() not in common:
                    forms.add(w)
        initials = ''.join(w[0] for w in re.findall(r"[A-Z][\w'-]*", n) if w not in ('of', 'and', 'the', 'The'))
        if 3 <= len(initials) <= 6 and initials not in ACRONYMS:
            forms.add(initials)
    out = set()
    for f in forms:   # no joiner at either end, and no form that is only a school-type word
        f = re.sub(r"^(?:(?:&|and|for|of|A)\s+)+|(?:\s+(?:&|and|for|of))+$", "", f).strip(" ,-")
        if f and f not in SCHOOL_TYPE_WORDS:
            out.add(f)
    return sorted(out, key=lambda f: (-len(f), f))   # longest first, in a fixed order


def structural_surnames(raw):
    """Surnames of the people this report names in its structural lines (inspection team, role lines, the chair,
    head and CEO sentences). Held in memory only, so that the same surname used elsewhere in the report (a reward
    or a pet named after the headteacher) is also removed."""
    out = set()
    for l in (norm_line(x) for x in raw.split('\n')):
        cands = []
        m = re.match(r"^(.+?)\s*,\s*(?:(?:His|Her) Majesty['’]s Inspector|Ofsted Inspector)", l)
        if m:
            cands.append(m.group(1))
        if ROLE_LINE.match(l) and len(l) < 120:
            cands += re.split(r':', l)
        for m in re.finditer(r"(?i:chair|chairs|chief (?:executive|education|operating) officer|ceo|executive lead|head ?teacher|head of school|principal)[^.]{0,90}?"
                             r"\b(?:is|are|by|,)\s+((?:" + TITLES + r"\.?\s+)?" + NAME2 + r")", l):
            cands.append(m.group(1))
        for c in cands:
            toks = re.findall(UP + r"(?:[^\W\d_]|['’-]){2,}", re.sub(TITLES + r"\.?\s", '', c))
            for t in toks[1:]:
                if t not in STOP_TOKENS and t not in NOT_NAME_START and t not in COMMON_WORDS and t not in GIVEN \
                        and not re.search(r'(?i)head|teacher|principal|executive|interim|acting|school|inspector', t):
                    out.add(t.replace('’', "'"))
    return out


TRUST_GENERIC = (r"(?i:\b(?:the|multi[- ]?academy|academy|academies|trust|ltd|limited|company|learning|education|educational|"
                 r"schools?|partnership|federation|catholic|diocesan|church of england|c of e|foundation|community|of|and|"
                 r"mat|cmat|mac|group|alliance|family|collaborative|st|saint)\b\.?)")
TRUST_SUFFIX = (r"(?i:(?:\s+(?:catholic|church of england|c of e|cofe|diocesan|christian|multi[- ]?academy|academy|academies|"
                r"learning|education(?:al)?|schools?|partnership|group|federation))*"
                r"\s+(?:trust|company|partnership|federation|mat|cmat|mac|academies|schools)\b)")


def trust_patterns(trust_names, common=frozenset()):
    """Regexes for the school's trust as reports write it: the full name, and the distinctive core of the name with or
    without a trust word after it ("Q-ZAT", "the Vellacombe multi-academy trust", "the 'Vellacombe Games'"). A core
    made only of ordinary words or places ("Bloom", "Learn", "Imaginaryton") is removed only with a trust word after it.
    common: lower-case words that are ordinary in reports (from the corpus), and place words."""
    out = []
    for f in trust_names:
        f = re.sub(r"\s+", " ", (f or '').replace('’', "'")).strip()
        full = re.sub(r"(?i)\s+(?:ltd|limited)\.?$", "", f)
        if len(full) >= 4:
            out.append((r"(?<![\w-])(?:the )?" + re.escape(full) + r"(?![\w-])", re.I, False))
        core = re.sub(r"\s+", " ", re.sub(TRUST_GENERIC, " ", full)).strip(" ,.-&")
        words = re.findall(r"[^\W_][\w'.-]*", core)
        if not words or len(core) < 2:
            continue
        ordinary = all(w.lower().strip(".") in common or w.title() in STOP_TOKENS or w.title() in NOT_NAME_START
                       or w.title() in COMMON_WORDS or w.title() in GIVEN for w in words)
        rx_core = r"\s+".join(re.escape(w).replace("'", "'?") for w in core.split(" ")) + r"\.?"
        acronym = core.replace("-", "").replace(".", "").isupper() and len(core) <= 8 and " " not in core
        pre = r"(?<![\w\[-])(?:(?i:the|St\.?|Saint)\s+)?"
        out.append((pre + rx_core + r"(?:" + TRUST_SUFFIX + r")(?![\w-])", re.I, True))      # with a trust word
        if not ordinary and (len(core) >= 4 or acronym):
            out.append((r"(?<![\w\[-])" + rx_core + r"(?![\w-])", re.I, True))  # the core alone
    # longest first: a name with its trust word before the full name, and both before the core alone
    return sorted(out, key=lambda x: (0 if x[0].endswith(TRUST_SUFFIX + r")(?![\w-])") else 1 if not x[2] else 2))


def scrub(text, school_forms=(), trust_names=(), given=None, counts=None, own_names=(), common=frozenset()):
    """Replace the school's name, its trust's name and personal names. Returns the new text.
    own_names: surnames named in this report's structural lines, removed wherever they recur.
    common: ordinary lower-case words and places, so that a trust named with one is removed only as a trust."""
    given = GIVEN if given is None else given
    counts = counts if counts is not None else collections.Counter()

    def sub(rx, repl, s, tag, flags=0):
        new, n = re.subn(rx, repl, s, flags=flags)
        counts[tag] += n
        return new

    t = text.replace('’', "'")
    tpats = trust_patterns(trust_names, common)
    for rx, fl, cap in tpats:
        if rx.endswith(TRUST_SUFFIX + r")(?![\w-])"):
            t = sub(rx, lambda m: '[the trust]' if re.sub(r"(?i)^(?:the|st\.?|saint)\s+", "", m.group(0))[:1].isupper()
                    else m.group(0), t, 'trust', fl)
    # the type and denomination words of the school's own name ("Primary", "Church of England", "C of E", "Academy"):
    # a use of the name that stops short of the full form ("Quillbrook Primary" for "Quillbrook Meadow Primary School")
    # takes them with it, so that no part of the name is left beside the placeholder
    own_tail = [w for w in NAME_TAIL_WORDS if any(re.search(r"(?<![\w-])" + w + r"(?![\w.-])", f) for f in school_forms)]
    for group in NAME_TAIL_SAME:     # one way of writing the denomination stands for the others
        if any(w in own_tail for w in group):
            own_tail += [w for w in group if w not in own_tail]
    own_tail.sort(key=NAME_TAIL_WORDS.index)
    tail = (r"(?-i:(?:\s+(?:(?:of|and|&)\s+)?(?:" + "|".join(own_tail) + r"))*)") if own_tail else ""
    for f in school_forms:
        if re.fullmatch(r'[A-Z]{3,6}', f):      # the school's initials ("Team ABS")
            t = sub(r"\b" + f + r"\b" + tail, '[the school]', t, 'school')
            continue
        rx = re.escape(f).replace("'", "'?")
        rx = re.sub(r"\\ (?:\\&|and)\\ ", r"\\s+(?:&|and)\\s+", rx)   # "Sports & Science" also matches "Sports and Science"
        rx = re.sub(r"([a-z])s\b", r"\1'?s", rx)    # "Wrens Nest" also matches "Wren's Nest"
        rx = re.sub(r"\b(?:St(?:\\\.)?|Saint)\\ ", r"(?:St\\.?|Saint)\\s+", rx)   # "St Mary's" also matches "St. Mary's"
        t = sub(r"(?<![\w-])" + rx + r"(?:s|ers?)?" + tail + r"(?![\w-])", '[the school]', t, 'school', re.I if len(f) > 12 else 0)
    if own_tail:
        # a trust or federation named after the school ("[the school] Federation") is the trust
        t = sub(r"\[the school\]\s+(?:(?:Multi[- ]Academy|Academy|Learning|Schools?|Education(?:al)?)\s+)?"
                r"(?:Trust|Federation|Partnership)\b", '[the trust]', t, 'trust')
        # a misspelt form of the full name ("Quillbrook Meadows Primary School" for "Quillbrook Meadow Primary School"):
        # the placeholder, one or two capitalised words, then the school's own type words
        level = [w for w in own_tail if w in NAME_LEVEL_WORDS]
        if level:
            t = sub(r"\[the school\](?:\s+[A-Z][\w'-]+){1,2}(?:\s+(?:" + "|".join(level) + r"))+\s+(?:School|Academy)(?![\w-])",
                    '[the school]', t, 'school')
    # the school's own trust (GIAS), before other schools so that "St X Church of England Multi Academy Trust" stays whole
    for rx, fl, cap in tpats:
        t = sub(rx, lambda m: '[the trust]' if (not cap or re.sub(r"(?i)^(?:the|st\.?|saint)\s+", "", m.group(0))[:1].isupper())
                else m.group(0), t, 'trust', fl)
    # another school named in the text (a federation partner, a shared sixth form)
    def other_school(m):
        lead = re.findall(r"[A-Z][\w'-]*", m.group(1))
        if not lead or all(w in STOP_TOKENS or w in NOT_NAME_START or w in COMMON_WORDS for w in lead):
            return m.group(0)
        counts['other_school'] += 1
        return '[another school]'
    t = re.sub(r"\b((?:(?:St|Saint)\.?\s+)?(?:[A-Z][\w'-]+\s+){1,5})(?:(?:C of E|CofE|C\.\s?E\.|CE|RC|Catholic|Church of England|"
               r"Methodist)\s+)?(?:(?:Primary|Infant|Infants|Junior|Nursery|High|Secondary|Community|Grammar|Special|Free|"
               r"Middle|First)\s+)?(?:School|Academy|College|Campus)\b", other_school, t)
    # a named unit of the school ("Brightwater Boys and Brightwater Girls")
    t = re.sub(r"\b([A-Z][\w'-]+) (?:Boys|Girls)\b(?!['’])", lambda m: m.group(0) if (m.group(1).lower() in common or m.group(1) in STOP_TOKENS
               or m.group(1) in NOT_NAME_START or m.group(1) in COMMON_WORDS) else (counts.update(['other_school']), '[another school]')[1], t)
    # addresses: postcodes and the street before them
    t = sub(r"\b(?:[A-Z][\w'-]+\s+){1,3}(?:Road|Rd|Street|St|Lane|Avenue|Ave|Drive|Close|Way|Crescent|Place|Terrace|Gardens|"
            r"Estate|Court|Walk|Square|Grove|Row|Mews|Parade|Hill|Park|Green)\b\.?"
            r"(?=(?:,?\s+(?:\[the school\]|[A-Z][\w'-]+(?:\s+(?:and\s+|on\s+|upon\s+)?[A-Z][\w'-]+){0,3})){0,4},?\s+[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b)",
            '[address]', t, 'address')
    t = sub(r"\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b", '[postcode]', t, 'address')
    # a trust or federation named in the text
    t = sub(r"\b(?:the\s+)?(?:[A-Z][\w'&.-]*\s+(?:(?:of|and|&)\s+)?){1,7}(?:Multi[- ]Academy Trust|Academy Trust|Learning Trust|"
            r"Educational Trust|Education Trust|Schools Trust|Catholic Trust|Federation|Learning Partnership|"
            r"Multi[- ]Academy Company|MAT|MAC|Trust)\b(?:\s*\((?:[A-Z]{2,8})\))?", lambda m: m.group(0) if m.group(0).strip() in ('The Trust', 'the Trust') else '[the trust]', t, 'trust')
    t = sub(r"\b((?:federation|partnership|trust|collaboration|hub) (?:called|named|known as) )(?:the )?(?=[A-Z\[])(?:\bSt\.|[^.])+?(?=(?<!\bSt)[.,;]|$| which| with| and the)",
            r"\1[the trust]", t, 'trust')
    t = sub(r"\b((?:changed|change) (?:its|their) names? from )[A-Z][^.]*?( to )", r"\1[the school]\2", t, 'school')
    t = sub(r"\bthe Federation of (?:[A-Z][\w'&.-]*\s*(?:and\s+)?){1,8}", '[the trust] ', t, 'trust')

    def keep_if_not_name(m, name_group, build):
        cand = m.group(name_group)
        if cand.split()[0] in NOT_NAME_START:
            return m.group(0)
        return build(m)

    t = INSPECTOR_NAME.sub(lambda m: (counts.update(['inspector']), '[name]')[1] + m.group(0)[len(m.group(1)):], t)
    t = sub(TITLE_NAME, '[name]', t, 'title')
    t = IS_NAME.sub(lambda m: keep_if_not_name(m, 2, lambda m: (counts.update(['role']), m.group(1) + '[name]')[1]), t)
    t = ROLE_NAME.sub(lambda m: keep_if_not_name(m, 3, lambda m: (counts.update(['role']), m.group(1) + m.group(2) + '[name]')[1]), t)
    t = ROLE_COLON.sub(lambda m: keep_if_not_name(m, 3, lambda m: (counts.update(['role']), m.group(1) + m.group(2) + '[name]')[1]), t)
    t = NAME_ROLE_APPOS.sub(lambda m: keep_if_not_name(m, 1, lambda m: (counts.update(['role']), '[name]' + m.group(0)[len(m.group(1)):])[1]), t)

    # known given name + capitalised surname
    def given_sub(m):
        first, rest = m.group(1), m.group(2)
        if first in GIVEN_AMBIGUOUS or rest.split()[0] in NOT_NAME_START or rest.split()[0] in STOP_TOKENS:
            return m.group(0)
        counts['given'] += 1
        return '[name]'
    if given:
        t = re.sub(r"\b(" + '|'.join(sorted(map(re.escape, given), key=len, reverse=True)) + r")\s+(" + NAME_TOK_ANY + r"(?:\s+" + NAME_TOK_ANY + r")?)\b", given_sub, t)
    # full dates (the inspection's own dates are kept only as keys in the index); month and year alone are kept
    mon = r"(?:January|February|March|April|May|June|July|August|September|October|November|December)"
    day = r"(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+)?\d{1,2}(?:st|nd|rd|th)?"
    t = sub(r"\b" + day + r"(?:\s+" + mon + r")?(?:\s*(?:,|and|to|-|–)\s*" + day + r")*\s+" + mon + r"(?:\s+\d{4})?\b",
            '[date]', t, 'date')
    # the second of a pair: "[name] and Firstname Surname"
    t = sub(r"\[name\](\s*(?:,|and|&)\s*)(?:" + TITLES + r"\.?\s+)?" + NAME2 + r"\b", r"[name]\1[name]", t, 'pair')
    for n in sorted(own_names, key=lambda x: (-len(x), x)):   # a fixed order, whatever the hash seed
        t = sub(r"(?:\b" + NAME_TOK + r"\s+)?\b" + re.escape(n) + r"\b", '[name]', t, 'own')
    # tidy "[name] and [name]" pairs left as "[name] [name]"
    t = re.sub(r'\[name\](?:\s+(?:Judge\s+)?\[name\])+', '[name]', t)
    # an honorific left in front of a removed name ("His Honour Judge ..." -> "[name]")
    t = re.sub(r"\b(?:His|Her)\s+(?:Honour\s+)?(?:Judge\s+)?\[name\]", '[name]', t)
    return t


# ---------------------------------------------------------------- the residual-name detector

STOP_TOKENS = set("""Year Years Key Stage Stages Early Foundation Reception Nursery Sixth Form English Maths Mathematics
Science Sciences History Geography Religious Education Physical Art Arts Design Technology Computing Music Drama
Dance French Spanish German Latin Mandarin Italian Urdu Arabic Polish Relationships Sex Health Personal Social Economic
Citizenship British Britain Christian Christianity Christmas Easter Diwali Eid Ramadan Hanukkah Vaisakhi God Jesus
Bible Church England English Catholic Anglican Methodist Muslim Islam Jewish Judaism Hindu Hinduism Sikh Sikhism
Buddhist Buddhism Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July
August September October November December Ofsted Parent View Department Local Authority Council Trust Academy School
Schools Primary Secondary Junior Infant Infants College University Sixth Form Forest Duke Edinburgh Award Awards Scouts
Brownies Guides Cadets Combined Cadet Force Royal Hall Museum Gallery Park Road Street Lane Avenue Centre House Houses
City County Football Club Little Wandle Read Write Inc Phonics Letters Sounds Mastery Maths Hub Hubs National Curriculum
Assessment Programme Programmes Panel Board Governors Governing Body Interim Executive Trustees Directors Members
Leaders Leader Inspectors Inspector His Her Majesty Majesty's Chief Special Educational Needs Disabilities SEND SEN
Disability Code Practice Pupil Premium Sports Premium Physical Healthy Schools Award Gold Silver Bronze Mark Charter
Rights Respecting UNICEF Ambassadors Ambassador Council Councils Captains Captain Prefects Head Boy Girl Student
Students Pupil Pupils Children Child Parents Carers Family Families Staff Team Teams Unit Units Resource Resourced
Provision Base Hub Hive Nest Room Rooms Class Classes Library Hall Garden Gardens Allotment Farm Beach Woodland Forest
North South East West Northern Southern Eastern Western Central Greater London Birmingham Manchester Liverpool Leeds
Bristol Sheffield Newcastle Kent Essex Surrey Yorkshire Lancashire Midlands Devon Cornwall Wales Scotland Ireland
Europe European Africa African Asia Asian America American India Indian Pakistan China Chinese Japan Ukraine Polish
Black White Minority Ethnic Asian Gypsy Roma Traveller Travellers Showmen Irish Caribbean History Month Pride Week Day
World Book Science Week Anti Bullying Remembrance Armistice Olympics Olympic Paralympic Commonwealth Games Cup League
Premier Shakespeare Dickens Darwin Churchill Nightingale Seacole Rosa Parks Martin Luther King Mandela Gandhi Picasso
Monet Van Gogh Kahlo Frida Mozart Beethoven Tudor Tudors Victorian Victorians Roman Romans Romans Viking Vikings Saxon
Saxons Anglo Egypt Egyptians Greek Greeks Ancient Stone Age Bronze Iron Great Fire Plague War Wars Holocaust
Parliament Prime Minister King Queen Charles Elizabeth Mayor Houses Commons Lords Speaker Westminster Downing
Bank Barclays NHS Police Fire Service Army Navy Air Ambulance Lifeboat Royal National Institution Commission
Inclusion Achievement Attendance Behaviour Curriculum Teaching Leadership Governance Wellbeing Development Personal
Safeguarding Next Steps Strong Standard Expected Exceptional Needs Attention Urgent Improvement Met Not Facts Figures
GCSE GCSEs Level Levels BTEC BTECs Extended Project Qualification EPQ Baccalaureate EBacc Progress Attainment Eight
Multiplication Tables Check Phonics Screening Times Tables Rock Stars Stars Numbots Accelerated Reader Oxford Reading
Tree Talk Pathways Power Maths White Rose Kagan Thrive ELSA Zones Regulation Jigsaw PSHE RSHE RE PE DT ICT MFL
Speech Language Communication Therapy Therapist Therapists Educational Psychologist Psychologists Specialist Teacher
Teachers Teaching Assistant Assistants Learning Mentor Mentors Support Apprenticeship Apprenticeships Careers
Gatsby Benchmarks Benchmark Provider Access Legislation Young Enterprise Enterprise Prince Princess Trust Duke
Brilliant Club Debate Mate Model United Nations First Lego Robotics Eco Green Flag Flags Plastic Free Fairtrade Arts
Mark Artsmark Music Mark Sing Up Choir Orchestra Band Bands Theatre Theatres Cathedral Abbey Chapel Mosque Temple
Gurdwara Synagogue Mass Collective Worship Lent Advent Harvest Festival Festivals Nativity Saint St Our Lady Holy
Spirit Trinity Christ Sacred Heart Blessed Virgin Mary Joseph John Peter Paul Francis Assisi Teresa Pope Bishop
Diocesan Diocese Archdiocese Methodist Baptist Quaker Society Friends Breakfast Club Clubs After Wraparound Holiday
Activities Food HAF Free Meals Meal Virtual""".split())

# second words that make a sentence-initial capitalised pair ordinary prose ("Many Year 6 pupils" etc. are already
# caught by the stop-list); kept short on purpose
COMMON_CAPS = set("""I British English Christian Muslim Jewish Hindu Sikh Ofsted""".split())
DETECT_BIGRAM = re.compile(r"(?<![\w\[])(" + NAME_TOK_ANY + r")\s+(" + NAME_TOK_ANY + r")(?![\w\]])")


def detect(text, place_tokens=frozenset(), given=None):
    """Conservative residual detector. Returns a list of (kind, match). Strong kinds are names by pattern; 'bigram'
    is a capitalised pair, neither word a stop word, school/curriculum or place term, at mid-sentence."""
    given = GIVEN if given is None else given
    hits = []
    for m in TITLE_NAME.finditer(text):
        hits.append(('title', m.group(0)))
    for m in INSPECTOR_NAME.finditer(text):
        hits.append(('inspector', m.group(1)))
    for m in ROLE_NAME.finditer(text):
        if m.group(3).split()[0] not in NOT_NAME_START:
            hits.append(('role', m.group(0)))
    for m in IS_NAME.finditer(text):
        if m.group(2).split()[0] not in NOT_NAME_START:
            hits.append(('role', m.group(0)))
    if re.search(r'(?im)^\s*(?:head ?teacher|principal|chair|chief executive officer|ceo)\s*:\s*\S', text):
        hits.append(('label', 'role label'))
    for m in DETECT_BIGRAM.finditer(text):
        a, b = m.group(1), m.group(2)
        sentence_start = m.start() == 0 or re.search(r'[.!?:;"‘\'(]\s*$', text[max(0, m.start() - 3):m.start()]) is not None
        toks = [a, b]
        if any(x in STOP_TOKENS or x in NOT_NAME_START or x in place_tokens for x in toks):
            continue
        if a in given and a not in GIVEN_AMBIGUOUS:
            hits.append(('given', m.group(0)))
        elif not sentence_start:
            hits.append(('bigram', m.group(0)))
        elif b not in COMMON_CAPS:
            hits.append(('bigram_start', m.group(0)))
    return hits


# ---------------------------------------------------------------- whole report

MONTHS = {m: i for i, m in enumerate(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
                                       'September', 'October', 'November', 'December'], 1)}


def report_date(header):
    """The inspection date printed on the report card's first page ('Inspection report: 29 September 2026')."""
    for l in header:
        m = re.match(r'^Inspection (?:report|date):\s*(\d{1,2})\s+([A-Z][a-z]+)\s+(\d{4})', l)
        if m and m.group(2) in MONTHS:
            return f'{m.group(3)}-{MONTHS[m.group(2)]:02d}-{int(m.group(1)):02d}'
    return ''


def is_report_card(raw):
    """A renewed-framework report card: the five-point grade key and at least five graded evaluation areas."""
    lines = {norm_line(l) for l in raw.split('\n')}
    heads = sum(1 for l in lines for _, rx in AREA_HEAD if rx.match(l))
    return all(g in lines for g in GRADES) and heads >= 5 and any(l.startswith('Safeguarding standards') for l in lines)


def parse_report(raw, meta=None, school_extra=(), trust_names=(), given=None, boiler=frozenset(), common=frozenset(),
                 name_common=None):
    """name_common: ordinary lower-case words, not places (a school named after its town is still the school); by
    default the same as common."""
    """Raw text -> parsed record with names removed. meta: manifest row (phase, insp_date)."""
    meta = meta or {}
    s = split_sections(raw, boiler)
    pdf_date = report_date(s['header'])
    own = structural_surnames(raw)
    name = school_name_from_header(s['header'])
    trust_words = {w for f in trust_names for w in re.findall(r"[^\W_][\w'-]*", re.sub(TRUST_GENERIC, " ", f or ''))
                   if len(w) >= 2}
    forms = school_name_forms(name, school_extra, common if name_common is None else name_common, trust_words)
    counts = collections.Counter()
    sections = collections.OrderedDict()
    for key, lines in s['sections'].items():
        paras = [scrub(p, forms, trust_names, given, counts, own, common) for p in join_lines(lines)]
        rec = {'grade': s['grades'].get(key), 'paragraphs': paras, 'words': sum(len(p.split()) for p in paras)}
        if key == 'next_steps':
            rec['items'] = paras
            rec['must'] = sum(1 for p in paras if re.search(r'\bmust\b', p))
        sections[key] = rec
    warn = list(s['warnings'])
    for k in CORE:
        if k not in sections:
            warn.append(f'missing area: {k}')
    for k in ('safeguarding', 'next_steps', 'pupil_view'):
        if k not in sections:
            warn.append(f'missing section: {k}')
    for k, v in sections.items():
        if k in AREA_KEYS and v['words'] < 40:
            warn.append(f'short section: {k} ({v["words"]} words)')
    rec = {
        'phase': meta.get('phase', ''),
        'insp_month': (pdf_date or meta.get('insp_date') or '')[:7],
        'safeguarding': s['grades'].get('safeguarding'),
        'concern': s['grades'].get('concern'),
        'grades': {k: s['grades'][k] for k in AREA_KEYS if k in s['grades']},
        'sections': sections,
    }
    if meta.get('insp_date') and pdf_date and pdf_date != meta['insp_date']:
        warn.append(f'report date differs from the list it was fetched for')
    diag = {'pdf_date': pdf_date, 'school_name_found': bool(name), 'warnings': warn, 'dropped': s['dropped'], 'name_rules': dict(counts)}
    return rec, diag


# ---------------------------------------------------------------- lead inspector, as a pseudonymous code only
# For the pre-registered national consistency analysis. The name is read, normalised and turned into an HMAC code in
# one step; it is never returned to the caller, stored, logged or printed. Codes go only to restricted/ outside the repo.

LEAD_HEAD = re.compile(r'^Lead inspector\s*:?\s*$', re.I)
LEAD_PLURAL = re.compile(r'^(?:Joint |Co-)?Lead inspectors\s*:?\s*$', re.I)
LEAD_SAME_LINE = re.compile(r'^Lead inspector\s*:\s*(\S.*)$', re.I)


def normalise_person(name):
    """Case, accents, titles, punctuation and spacing removed, so spellings of one person agree."""
    import unicodedata
    n = unicodedata.normalize('NFKD', name)
    n = ''.join(ch for ch in n if not unicodedata.combining(ch)).lower()
    n = re.sub(r"[’'`.]", '', n)
    n = re.sub(r'[^a-z]+', ' ', n)
    n = re.sub(r'^(?:(?:mr|mrs|ms|miss|mx|dr|dame|sir|professor|prof|rev|revd|reverend)\s+)+', '', n.strip())
    return re.sub(r'\s+', ' ', n).strip()


def _split_inspector_line(l):
    m = re.match(r"^(.+?)\s*,\s*((?:His|Her) Majesty['’]s Inspector|Ofsted Inspector|HMI)\b", l, re.I)
    if not m:
        return None
    role = 'HMI' if re.search(r'Majesty|HMI', m.group(2), re.I) else 'OI'
    return m.group(1), role


def lead_inspector_code(raw, key):
    """(code, role_detected) for the report's lead inspector, or ('', reason). key: secret bytes."""
    import hashlib, hmac
    lines = [norm_line(l) for l in raw.split('\n')]
    lines = [l for l in lines if l]
    for i, l in enumerate(lines):
        if LEAD_PLURAL.match(l):
            return '', 'more than one lead listed'
        same = LEAD_SAME_LINE.match(l)
        cand = None
        if same:
            cand = _split_inspector_line(same.group(1))
        elif LEAD_HEAD.match(l):
            # the first inspector line after the heading, before any team heading (the PDF layout can put other
            # lines in between)
            for l2 in lines[i + 1:i + 60]:
                if re.match(r'^Team inspectors?\s*:?', l2, re.I):
                    break
                cand = _split_inspector_line(l2)
                if cand:
                    break
        if cand:
            norm = normalise_person(cand[0])
            if len(norm.split()) < 2:
                return '', 'name not parsed'
            code = hmac.new(key, norm.encode('utf-8'), hashlib.sha256).hexdigest()[:12]
            return code, 'lead_' + cand[1]
        if same or LEAD_HEAD.match(l):
            return '', 'lead heading without an inspector line'
    return '', 'no lead heading'


def inspector_key(data_dir):
    """The secret key, created once with 32 random bytes, mode 600. Never printed."""
    d = os.path.join(data_dir, 'secrets')
    path = os.path.join(d, 'inspector.key')
    if not os.path.exists(path):
        os.makedirs(d, mode=0o700, exist_ok=True)
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'wb') as f:
            f.write(os.urandom(32))
    os.chmod(path, 0o600)
    with open(path, 'rb') as f:
        return f.read()


def section_text(rec):
    return '\n'.join(p for v in rec['sections'].values() for p in v['paragraphs'])


# ---------------------------------------------------------------- corpus

def load_reference():
    """MI and daily grades by URN and inspection date, school names, trusts, and place tokens."""
    mi, daily, names, trust, places = {}, {}, {}, {}, set()
    for r in csv.DictReader(open(os.path.join(RAW, 'ofsted_mi_latest.csv'), encoding='utf-8')):
        mi[r['urn']] = r
        names.setdefault(r['urn'], set()).add(r['name'])
    for r in csv.DictReader(open(os.path.join(RAW, 'reports_daily.csv'), encoding='utf-8')):
        daily[r['urn']] = r
        names.setdefault(r['urn'], set()).add(r['name'])
    for r in csv.DictReader(open(os.path.join(RAW, 'gias_slim.csv'), encoding='utf-8')):
        if r['mat']:
            trust[r['urn']] = r['mat']
        for f in ('la', 'region', 'town'):
            for w in re.findall(r"[A-Z][a-zA-Z'’-]+", r[f] or ''):
                places.add(w)
    return mi, daily, names, trust, places


def corpus_given_names(texts):
    """Given names from structural lines only (inspector lines, role labels, 'chair ... is X Y')."""
    found = collections.Counter()
    pats = [re.compile(r"^(" + NAME_TOK + r")\s+" + NAME_TOK_ANY + r".{0,30},\s*(?:(?:His|Her) Majesty['’]s Inspector|Ofsted Inspector)", re.M),
            re.compile(r"^[A-Za-z -]*(?:head ?teacher|principal)s?\s*:\s*(?:" + TITLES + r"\.?\s+)?(" + NAME_TOK + r")\s+" + NAME_TOK_ANY, re.M | re.I),
            re.compile(r"chair[^.\n]{0,60} is (?:" + TITLES + r"\.?\s+)?(" + NAME_TOK + r")\s+" + NAME_TOK_ANY)]
    for t in texts:
        for p in pats:
            for m in p.finditer(t):
                found[m.group(1)] += 1
    return {n for n, c in found.items() if n not in STOP_TOKENS and n not in NOT_NAME_START and len(n) > 2}


def corpus_boilerplate(texts, min_reports=3):
    """Lines that occur in at least min_reports different reports: table labels and descriptions."""
    c = collections.Counter()
    for t in texts:
        c.update({norm_line(l) for l in t.split('\n')})
    return frozenset(l for l, n in c.items() if n >= min_reports and l)


def corpus_common_words(texts, min_reports=20):
    """Lower-case words used in at least min_reports reports: ordinary English in this corpus."""
    c = collections.Counter()
    for t in texts:
        c.update(set(re.findall(r"(?<![\w'’-])[a-z][a-z'’-]+", t)))
    return frozenset(w for w, n in c.items() if n >= min_reports)


def suppress(n):
    return '<10' if 0 < n < 10 else str(n)


def write_counts(recs, path, as_at):
    phases = ['Nursery', 'Primary', 'Secondary', 'Special', 'Alternative provision']
    by_phase = collections.Counter(r['phase'] for r in recs)
    L = ['# Report Language: corpus counts', '',
         f'Parsed report cards in the corpus as at {as_at}. Aggregate counts only; any cell from 1 to 9 is shown as "<10". '
         'Source: Ofsted report cards (renewed framework, inspections from 10 November 2025), read from '
         'files.ofsted.gov.uk; Contains public sector information licensed under the Open Government Licence v3.0. '
         'The backfill of the corpus is complete; counts change as new report cards are added. No analysis of language is in this file.', '',
         f'Reports parsed: {len(recs)}.', '', '## By phase', '', '| Phase | Reports |', '| --- | --: |']
    for p in phases:
        L.append(f'| {p} | {suppress(by_phase.get(p, 0))} |')
    L += ['', '## Grades by evaluation area (all phases)', '',
          '| Area | ' + ' | '.join(GRADES) + ' | Not graded |', '| --- |' + ' --: |' * (len(GRADES) + 1)]
    labels = {'inclusion': 'Inclusion', 'curriculum_teaching': 'Curriculum and teaching', 'achievement': 'Achievement',
              'attendance_behaviour': 'Attendance and behaviour', 'personal_development': 'Personal development and wellbeing',
              'early_years': 'Early years', 'post16': 'Post-16 provision', 'leadership_governance': 'Leadership and governance'}
    for k in AREA_KEYS:
        c = collections.Counter(r['grades'].get(k, 'none') for r in recs)
        L.append(f'| {labels[k]} | ' + ' | '.join(suppress(c.get(g, 0)) for g in GRADES) + f' | {suppress(c.get("none", 0))} |')
    sg = collections.Counter(r['safeguarding'] for r in recs)
    coc = collections.Counter(r['concern'] or 'None' for r in recs)
    L += ['', '## Safeguarding and categories of concern', '', '| Outcome | Reports |', '| --- | --: |',
          f'| Safeguarding standards met | {suppress(sg.get("Met", 0))} |',
          f'| Safeguarding standards not met | {suppress(sg.get("Not met", 0))} |',
          f'| Special measures | {suppress(coc.get("Special measures", 0))} |',
          f'| Significant improvement | {suppress(coc.get("Significant improvement", 0))} |']
    L += ['', '## Grades by evaluation area and phase', '']
    for p in phases:
        rp = [r for r in recs if r['phase'] == p]
        if not rp:
            continue
        L += [f'### {p} ({suppress(len(rp))} reports)', '', '| Area | ' + ' | '.join(GRADES) + ' | Not graded |',
              '| --- |' + ' --: |' * (len(GRADES) + 1)]
        for k in AREA_KEYS:
            c = collections.Counter(r['grades'].get(k, 'none') for r in rp)
            L.append(f'| {labels[k]} | ' + ' | '.join(suppress(c.get(g, 0)) for g in GRADES) + f' | {suppress(c.get("none", 0))} |')
        L.append('')
    months = sorted({r['insp_month'] for r in recs})
    L += ['## By month of inspection', '', '| Month | ' + ' | '.join(phases) + ' | All |', '| --- |' + ' --: |' * (len(phases) + 1)]
    for m in months:
        rm = [r for r in recs if r['insp_month'] == m]
        c = collections.Counter(r['phase'] for r in rm)
        L.append(f'| {m} | ' + ' | '.join(suppress(c.get(p, 0)) for p in phases) + f' | {suppress(len(rm))} |')
    L.append('')
    open(path, 'w').write('\n'.join(L))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default=DATA)
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--urn', nargs='*')
    ap.add_argument('--counts', default=os.path.join(REPO, 'docs', 'report-language', 'corpus-counts.md'))
    ap.add_argument('--no-codes', action='store_true',
                    help='never create lead-inspector codes (no key, no restricted/ file): for runs away from this machine')
    a = ap.parse_args()
    man = [json.loads(l) for l in open(os.path.join(a.data, 'manifest.jsonl')) if l.strip()]
    if a.urn:
        man = [m for m in man if m['urn'] in set(a.urn)]
    if a.limit:
        man = man[:a.limit]
    os.makedirs(os.path.join(a.data, 'parsed'), exist_ok=True)
    mi, daily, names, trust, places = load_reference()
    raws = {m['urn']: gzip.open(os.path.join(a.data, 'text', m['urn'] + '.txt.gz'), 'rt', encoding='utf-8').read() for m in man}
    given = (GIVEN | corpus_given_names(raws.values())) - GIVEN_AMBIGUOUS
    boiler = corpus_boilerplate(raws.values())
    name_common = corpus_common_words(raws.values())
    common = name_common | {p.lower() for p in places}
    recs, index = [], []
    agree = collections.Counter()
    disagree = []
    resid = collections.Counter()
    resid_ex = collections.defaultdict(list)
    skipped = []
    key = None if a.no_codes else inspector_key(a.data)
    lead_rows = []
    for m in man:
        u = m['urn']
        if not is_report_card(raws[u]):
            skipped.append(u)
            stale = os.path.join(a.data, 'parsed', u + '.json')
            if os.path.exists(stale):
                os.remove(stale)
            index.append({'urn': u, 'insp_date': m['insp_date'], 'pdf_date': '', 'pdf': m['pdf'], 'sha256': m['sha256'],
                          'status': 'not a report card', 'ref': '', 'warnings': '', 'dropped': '', 'name_rules': '',
                          'residual_hits': ''})
            continue
        if key is not None:
            code, role = lead_inspector_code(raws[u], key)
            lead_rows.append({'urn': u, 'code': code, 'role_detected': role})
        rec, diag = parse_report(raws[u], m, names.get(u, ()), [trust[u]] if u in trust else [], given, boiler, common, name_common)
        json.dump(rec, open(os.path.join(a.data, 'parsed', u + '.json'), 'w'), ensure_ascii=False, indent=1)
        recs.append(rec)
        # cross-check grades: MI when its inspection date matches, else the daily reader
        ref, src = None, ''
        d = diag['pdf_date'] or m['insp_date']
        if u in mi and mi[u]['f_start'] == d:
            ref, src = mi[u], 'MI'
        elif u in daily and daily[u]['insp_date'] == d:
            ref, src = daily[u], 'daily'
        if ref:
            for k, col in [*MI_COL.items(), ('safeguarding', 'g_sg')]:
                want = (ref.get(col) or '').strip()
                if want in ('', 'Not applicable'):
                    want = None
                got = rec['safeguarding'] if k == 'safeguarding' else rec['grades'].get(k)
                ok = want == got
                agree[(src, ok)] += 1
                if not ok:
                    disagree.append({'urn': u, 'src': src, 'area': k, 'parsed': got, 'reference': want})
            if src == 'MI':
                want = {'SM': 'Special measures', 'RSI': 'Significant improvement'}.get(mi[u]['coc'])
                agree[('MI-coc', want == rec['concern'])] += 1
                if want != rec['concern']:
                    disagree.append({'urn': u, 'src': 'MI', 'area': 'concern', 'parsed': rec['concern'], 'reference': want})
        else:
            agree[('none', None)] += 1
        hits = detect(section_text(rec), places, given)
        for kind, h in hits:
            resid[kind] += 1
            resid_ex[kind].append((u, h))
        index.append({'urn': u, 'insp_date': m['insp_date'], 'pdf_date': diag['pdf_date'], 'pdf': m['pdf'],
                      'sha256': m['sha256'], 'status': 'parsed', 'ref': src,
                      'warnings': '; '.join(diag['warnings']), 'dropped': json.dumps(diag['dropped']),
                      'name_rules': json.dumps(diag['name_rules']), 'residual_hits': len(hits)})
    with open(os.path.join(a.data, 'parsed', 'index.csv'), 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(index[0]))
        w.writeheader()
        w.writerows(index)
    if key is not None:
        os.makedirs(os.path.join(a.data, 'restricted'), mode=0o700, exist_ok=True)
        lpath = os.path.join(a.data, 'restricted', 'lead_inspector.csv')
        with open(lpath, 'w', newline='') as f:
            w = csv.DictWriter(f, fieldnames=['urn', 'code', 'role_detected'])
            w.writeheader()
            w.writerows(lead_rows)
        os.chmod(lpath, 0o600)
    per = collections.Counter(r['code'] for r in lead_rows if r['code'])
    if per:
        ns = sorted(per.values())
        print(f"lead inspector code found for {len([r for r in lead_rows if r['code']])}/{len(lead_rows)} reports; "
              f"{len(per)} distinct codes; reports per code min {ns[0]}, median {ns[len(ns) // 2]}, max {ns[-1]}; "
              f"codes with 10 or more reports: {sum(1 for n in ns if n >= 10)}; roles "
              f"{dict(collections.Counter(r['role_detected'] for r in lead_rows))}")
    check = {'reports': len(recs), 'not_report_cards': skipped, 'agreement': {f'{k[0]}:{k[1]}': v for k, v in agree.items()},
             'disagreements': disagree, 'residual_hits': dict(resid),
             'residual_examples': {k: v[:400] for k, v in resid_ex.items()},
             'warnings': collections.Counter(w.split(':')[0] for r in index for w in r['warnings'].split('; ') if w)}
    json.dump(check, open(os.path.join(a.data, 'parsed', 'check.json'), 'w'), indent=1, ensure_ascii=False)
    if not a.urn and not a.limit:
        write_counts(recs, a.counts, dt.date.today().isoformat())
    tot = {s: sum(v for (src, ok), v in agree.items() if src == s) for s in ('MI', 'daily', 'MI-coc')}
    for s in tot:
        if tot[s]:
            print(f'{s}: {agree[(s, True)]}/{tot[s]} grades agree ({100 * agree[(s, True)] / tot[s]:.2f}%)')
    print('no reference for', agree[('none', None)], 'reports;', len(skipped), 'documents are not report cards')
    print('residual detector hits:', dict(resid))
    print('warnings:', dict(check['warnings']))


if __name__ == '__main__':
    main()
