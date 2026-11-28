#!/usr/bin/env python3
"""Report Language: the draft classification lexicons (version v0, NOT frozen).

Two lexicons, both deterministic and transparent, as set out in docs/report-language/plan.md:

  * Analysis 3: next-steps themes.  classify_next_step(text) -> sorted list of theme keys, or ['other'].
  * Analysis 7: results sentences and their direction.  results_sentences(paragraphs) -> list of sentences that
    refer to published outcomes; sentence_direction(sentence) -> 'positive' | 'negative' | 'mixed' | 'level' | 'none';
    section_direction(paragraphs) -> section-level reading.

The human-readable versions, with definitions, rules and invented examples, are
docs/report-language/next-steps-lexicon-v0.md and docs/report-language/results-lexicon-v0.md. Those files and this
module must say the same thing. Freezing is a rename: once Mark approves, LEXICON_VERSION becomes 'v1', the two
documents are renamed to -v1.md, and nothing else changes. Until then nothing here may be used to count anything by
grade, deprivation, month or results.

No language model is involved: every decision is a regular expression listed below.

Matching rules common to both lexicons
  * Text is prepared as in the plan (step 1): lower-case; curly quotes and dashes normalised; a hyphen with spaces
    round it inside a word ("self - discipline") is closed up; "and or" becomes "and/or"; name-removal placeholders
    ("[name]", "[the school]" and so on) are removed.  Grade words are NOT removed here, because "expected standard"
    and "higher standard" are also the names of key stage 2 measures; no pattern below relies on a grade word.
  * Every pattern is anchored on word boundaries (\\b).  Stemming is explicit: a pattern ending in \\w* matches any
    ending (assess\\w* matches assess, assessed, assessment, assessments); a pattern without it matches only the forms
    written out.
  * Exclusions are applied first: each exclusion pattern is blanked out of the text before that theme's inclusion
    patterns are tried, so an exclusion removes only the phrase it names, not the whole item.
"""
import re

LEXICON_VERSION = 'v0'

# ----------------------------------------------------------------------------------------------------------------
# Preparation
# ----------------------------------------------------------------------------------------------------------------

_QUOTES = str.maketrans({'‘': "'", '’': "'", '“': '"', '”': '"', '–': '-', '—': '-',
                         '‒': '-', '−': '-', ' ': ' '})
_PLACEHOLDER = re.compile(r'\[[a-z ]{2,20}\]')


def prepare(text):
    # A plain hyphen with spaces round it inside a word is a PDF artefact ("self - discipline"); close it up before
    # dashes are normalised, so that a real spaced en or em dash is left as a gap.
    t = re.sub(r'(?<=[A-Za-z])\s+-\s+(?=[A-Za-z])', '-', text or '')
    t = t.translate(_QUOTES).lower()
    t = _PLACEHOLDER.sub(' ', t)
    t = re.sub(r'\band or\b', 'and/or', t)
    t = re.sub(r'\bor/', 'and/or ', t)                      # "and or/disabilities" slip
    return re.sub(r'\s+', ' ', t).strip()


def _blank(pattern, text):
    return re.sub(pattern, lambda m: ' ' * len(m.group(0)), text)


# Up to n intervening words, e.g. "improve(?:GAP3)achievement" -> "improve pupils' overall achievement".
def _gap(n):
    return r"(?:\W+[\w'/-]+){0,%d}\W+" % n


G2, G3, G4, G6 = _gap(2), _gap(3), _gap(4), _gap(6)

# The grammatical subject at the start of a sentence ("Leaders and those responsible for governance should ...").
# It is blanked for the leadership theme only, because who is asked to act is not what they are asked to do.
_SUBJECT = re.compile(r"(?:^|(?<=[.;] ))([^.;]{0,90}?)\b(should|must|need to|needs to)\b")


def _blank_subjects(text):
    return _SUBJECT.sub(lambda m: ' ' * len(m.group(1)) + m.group(2), text)


# ----------------------------------------------------------------------------------------------------------------
# Analysis 3: next-steps themes
# ----------------------------------------------------------------------------------------------------------------
# Order is the order shown on review pages. Each entry: label, include patterns, exclude patterns, and whether the
# sentence subject is blanked first.

THEMES = {
    'curriculum_design': {
        'label': 'Curriculum design and sequencing',
        'include': [
            r'\bcurricul\w* (?:is |are )?(?:design\w*|plan\w*|structur\w*|review\w*|refine\w*|content|areas?|thinking)\b',
            r'\bdesign\w*' + G2 + r'curricul\w*',
            r'\b(?:new|newly designed|revised|recently implemented|renewed|redesigned|refined) curricul\w*',
            r'\brefine\w*' + G3 + r'curricul\w*',
            r'\bsequenc\w*', r'\border(?:ed|ing)? the knowledge\b',
            r'\b(?:essential|key|important|component|core|intended) (?:component )?knowledge\b',
            r'\bidentif\w*' + G3 + r'knowledge (?:and skills )?(?:that )?(?:pupils|children) (?:should|need|must)\b',
            r'\bknowledge builds?\b', r'\bbuild\w*' + G2 + r'knowledge\b',
            r'\bbuild\w* (?:on|upon) (?:their |pupils\' )?(?:prior|previous|what)\b',
            r'\b(?:prior|previous) (?:learning|knowledge)\b',
            r'\b(?:recall|recap|retriev\w*|revisit\w*|remember\w*|retain\w*)\b',
            r'\bconnect\w*' + G2 + r'knowledge\b', r'\bwell-connected\b',
        ],
        'exclude': [r'\bpersonal development curricul\w*', r'\bearly years curricul\w*',
                    r'\b(?:personal, social[\w ,]*|relationships?) (?:education )?curricul\w*'],
    },
    'teaching_quality': {
        'label': 'Quality and consistency of teaching',
        'include': [
            r'\bquality of (?:the )?teaching\b', r'\bconsistency (?:of|in) (?:the )?teaching\b',
            r'\b(?:high-quality|effective|highly effective|consistent|strong|responsive) teaching\b',
            r'\bteaching (?:is|across|consistently|supports|provides|gives|enables|in all|activities|tasks|approaches|varies)\b',
            r'\bvar\w* in (?:the quality of )?teaching\b',
            r'\b(?:improve\w*|strengthen\w*|raise\w*)' + G2 + r'teaching\b',
            r'\bdeliver\w*' + G2 + r'curricul\w*', r'\bcurricul\w* (?:is |are )?(?:consistently )?(?:taught|delivered|implemented)\b',
            r"\b(?:implement\w*|teach) (?:the |their |its )?(?:[\w']+ ){0,2}curricul\w*", r'\btaught (?:consistently )?well\b',
            r'\b(?:taught|delivered|implemented) consistently well\b',
            r'\b(?:learning|teaching|lesson|curriculum) (?:activities|tasks)\b', r'\btasks?\b', r'\bactivities\b',
            r'\bexpectations?\b', r'\bambiti\w*', r'\bchalleng\w* (?:pupils|all pupils|students)\b',
            r'\bdeepen\w*', r'\bdepth of\b', r'\bmodelling\b', r'\bpresentation\b', r'\bquality of (?:pupils\' )?work\b',
        ],
        'exclude': [r'\bextra-curricular activities\b', r'\bdepth of challenge\b',
                    r'\bbehaviour\w* (?:and \w+ )?(?:policy |policies )?expectations?\b',
                    r'\bexpectations?' + G3 + r'behaviour\w*', r'\bhigh expectations of children\'s learning\b(?=[^.]*early years)'],
    },
    'assessment': {
        'label': 'Assessment, checking understanding and closing gaps',
        'include': [
            r'\bassess\w*', r'\bcheck\w*' + G4 + r'(?:learning|understanding|understood|knowledge|know|learned|learnt|remember\w*|getting on|progress|work)\b',
            r'\bcheck\w* for understanding\b', r'\bmisconception\w*', r'\bmisunderstanding\w*', r'\berrors?\b', r'\bmistakes?\b',
            r'\bgaps?' + G3 + r'(?:knowledge|learning|understanding|skills)\b', r'\bclose\w* gaps?\b', r'\bfall\w* behind\b',
            r'\bwhat (?:pupils|children|they) (?:already )?know\b',
            r'\b(?:track\w*|monitor\w*) (?:the |pupils\' |of pupils\' )?progress\b', r'\btargets?\b',
        ],
        'exclude': [r'\bnational assessments?\b', r'\bassess\w* the school\'s (?:effectiveness|performance)\b',
                    r'\bquality assur\w*', r'\bchecks? the (?:quality|effectiveness)\b', r'\bgap with non-disadvantaged\b',
                    r'\bimprovement targets?\b'],
    },
    'foundational': {
        'label': 'Reading, writing, language and number foundations',
        'include': [
            r'\bphonics\b', r'\bread(?:ing|ers?)?\b', r'\bdecod\w*', r'\bwrit(?:e|es|ing|ten|ers?)\b', r'\bhandwriting\b',
            r'\bspell\w*', r'\bpunctuation\b', r'\bgrammar\b', r'\bletter formation\b', r'\btranscription\b',
            r'\bvocabulary\b', r'\boracy\b', r'\bspeaking\b', r'\bspoken\b', r'\bcommunication and language\b',
            r'\blanguage (?:and communication|development)\b', r'\bfoundational\b', r'\bbasic (?:knowledge|skills)\b',
            r'\bfoundations in\b', r'\bnumber\b', r'\bnumeracy\b', r'\btimes tables?\b', r'\bmultiplication\b',
            r'\bmathematics\b', r'\bmaths\b', r'\benglish\b', r'\bliteracy\b',
        ],
        'exclude': [r'\benglish as an additional language\b', r'\bspeak(?:ing|s)? english\b',
                    r'\bnumber of\b', r'\bwritten (?:feedback|policy|plans?)\b', r'\bready\b'],
    },
    'inclusion_send': {
        'label': 'SEND, disadvantage and adaptation',
        'include': [
            r'\bsend\b', r'\bspecial educational needs\b', r'\bdisabilit\w*', r'\behc\b', r'\beducation, health and care\b',
            r'\b(?:additional|complex|highest|specific|identified|emerging|individual|diverse|range of) (?:\w+ )?needs\b',
            r'\bpupils\' (?:\w+ )?needs\b', r'\bneeds of (?:all )?(?:pupils|children)\b', r'\badapt\w*', r'\badjustments?\b',
            r'\bbarriers?\b', r'\binclusi\w*', r'\balternative provision\b', r'\bspecialist (?:advice|provision|support)\b',
            r'\bresourced? provision\b', r'\benglish as an additional language\b',
            r'\bdisadvantage\w*', r'\bpupil premium\b', r'\badditional funding\b', r'\beligible pupils\b', r'\bvulnerable\b',
            r'\bsocial care\b', r'\bfacing additional challenges\b|\bface additional challenges\b',
        ],
        'exclude': [r'\bbarriers to (?:regular )?attendance\b', r'\bfamilies\' barriers\b'],
    },
    'attendance': {
        'label': 'Attendance and punctuality',
        'include': [r'\battendance\b', r'\babsen\w*', r'\bpunctual\w*', r'\battend (?:school|more|regularly|frequently)\b',
                    r'\bmiss(?:es|ing)? (?:school|learning)\b', r'\bon time\b', r'\blateness\b'],
        'exclude': [r'\battend alternative provision\b'],
    },
    'behaviour': {
        'label': 'Behaviour and attitudes',
        'include': [r'\bbehaviour\w*', r'\bbehavior\w*', r'\bsuspen\w*', r'\bexclusions?\b', r'\bexcluded\b',
                    r'\bself-discipline\b', r'\battitudes? to (?:their )?learning\b', r'\broutines\b', r'\bdisrupt\w*',
                    r'\bregulate\w*' + G2 + r'emotions\b', r'\bself-regulat\w*', r'\bconduct\b', r'\bcalm\b', r'\borderly\b',
                    r'\bbullying\b', r'\bderogatory\b'],
        'exclude': [],
    },
    'personal_development': {
        'label': 'Personal development, wider curriculum and preparation for life',
        'include': [
            r'\bpersonal development\b', r'\bpersonal, (?:social|health)\b', r'\bpshe\w*', r'\brshe\b',
            r'\brelationships (?:and (?:sex|health) )?(?:education|curricul\w*)\b', r'\bhealth education\b',
            r'\bbritish values\b', r'\bprotected characteristics\b', r'\bcareers?\b', r'\bemployment\b',
            r'\bwider (?:opportunities|development|experiences|curriculum)\b', r'\bextra-curricular\b', r'\benrichment\b',
            r'\bclubs\b', r'\btrips\b', r'\beducational visits\b',
            r'\bdiversity\b', r'\bfaiths?\b', r'\bcultur(?:es|al)\b', r'\bmodern britain\b', r'\brespect\b', r'\btolera\w*',
            r'\baspirations?\b', r'\bresilien\w*', r'\blife beyond school\b', r'\bcitizenship\b', r'\bspiritual\b',
            r'\bmental health\b', r'\bcommunities\b', r'\bpeople from different\b',
        ],
        'exclude': [r'\bschool community\b', r'\bculture (?:of|where)\b'],
    },
    'early_years': {
        'label': 'Early years',
        'include': [r'\bearly years\b', r'\beyfs\b', r'\breception\b', r'\bnursery\b', r'\bfoundation stage\b',
                    r'\b(?:younger|youngest) children\b', r'\btwo-year-olds?\b', r'\bpre-school\b',
                    r'\b(?:high-quality|adult) interactions\b', r'\binteractions (?:between adults and|with) children\b'],
        'exclude': [],
    },
    'post16': {
        'label': 'Sixth form and post-16',
        'include': [r'\bpost-16\b', r'\bsixth[- ]form\b', r'\bkey stage 5\b', r'\b16 to 19\b', r'\bstudy programmes?\b',
                    r'\bstudents\b'],
        'exclude': [],
    },
    'leadership': {
        'label': 'Leadership oversight, evaluation and governance',
        'blank_subject': True,
        'include': [
            r'\bgovern\w*', r'\boversight\b', r'\bquality assur\w*', r'\bevaluat\w*', r'\bmonitor\w*', r'\banalys\w*',
            r'\b(?:support and|effective|robust|well-informed|depth of) challenge\b', r'\bchallenge (?:to|for) leaders\b',
            r'\bto account\b', r'\baccountab\w*', r'\bstrategic\b', r'\bschool improvement\b',
            r'\bimprovement (?:priorities|plans?|actions|work|journey|strategies)\b', r'\bareas of improvement\b',
            r'\bdrive' + G3 + r'improvement\b', r'\bcapacity\b', r'\bleader(?:s|ship) at (?:all|every) levels?\b',
            r'\bcheck\w* (?:the )?(?:quality|effectiveness|impact)\b', r'\bchecked and challenged\b', r'\bscrutin\w*',
            r'\b(?:middle|subject|senior) leaders\b', r'\barea of responsibility\b', r'\bthe trust\b', r'\btrust (?:board|leaders)\b',
            r'\binterim executive board\b', r'\bsystems and processes\b', r'\bimpact of (?:their|its|the school\'s) (?:work|actions|plans|strategies)\b',
            r'\bleaders\' actions\b',
        ],
        'exclude': [r'\bbuild trust\b', r'\bpupils\' (?:progress|performance)\b(?=[^.]*monitor)'],
    },
    'staff_development': {
        'label': 'Staff expertise, training and workload',
        'include': [
            r'\bexpertise\b', r'\bsubject knowledge\b', r'\bprofessional (?:learning|development)\b', r'\btraining\b', r'\bcpd\b',
            r'\bstaff\'s knowledge\b', r'\bstaff knowledge\b', r'\bequip\w*', r'\bguidance\b',
            r'\b(?:staff|teachers)' + G2 + r'confiden\w*', r'\bstaff confidence\b',
            r'\b(?:staff|teachers) (?:have|has|receive|develop|gain)' + G3 + r'(?:knowledge|skills|expertise)\b',
            r'\bworkload\b', r'\bunreasonable amount of work\b', r'\bstaff wellbeing\b', r'\bwellbeing of staff\b',
            r'\bshare effective practice\b',
        ],
        'exclude': [r'\b(?:education|employment),? (?:or |and )?training\b', r'\beducation, employment\b',
                    r'\bequip(?:s|ped)? (?:pupils|children)\b'],
    },
    'parents_partnerships': {
        'label': 'Parents, families and partnerships',
        'include': [r'\bparents?\b', r'\bcarers\b', r'\bfamil(?:y|ies)\b', r'\b(?:school|wider|local|the) community\b',
                    r'\bcommunity\'s\b', r'\bstakeholders\b', r'\bexternal agencies\b', r'\bpartnerships?\b',
                    r'\b(?:other|mainstream|special) schools\b'],
        'exclude': [],
    },
    'outcomes': {
        'label': 'Published outcomes and attainment',
        'include': [
            r'\boutcomes\b', r'\battainment\b', r'\bpublished\b', r'\bnational (?:tests?|assessments?|averages?|curriculum tests)\b',
            r'\bnationally\b', r'\bexamination\w*', r'\bexams?\b', r'\bgcses?\b', r'\bqualifications?\b', r'\bresults\b',
            r'\bend of key stage\b', r'\bstandards of attainment\b',
            r'\b(?:improve\w*|raise\w*|raising)' + G3 + r'achievement\b', r'\bachievement (?:improves|is further improved|continues to improve)\b',
        ],
        'exclude': [r'\bcurriculum outcomes\b', r'\battendance' + G6 + r'national averages?\b', r'\bin line with national averages?\b(?=[^.]*attend)'],
    },
    'safeguarding': {
        'label': 'Safeguarding and record-keeping',
        'include': [r'\bsafeguard\w*', r'\bchild protection\b', r'\brecord-keeping\b', r'\brecords?\b(?! of attendance)',
                    r'\brecruitment\b', r'\bsingle central record\b', r'\bkeep\w*' + G2 + r'safe\b', r'\brisk assessments?\b',
                    r'\bonline safety\b', r'\bdesignated safeguarding\b', r'\bsafer recruitment\b'],
        'exclude': [r'\btrack record\b'],
    },
}

THEME_ORDER = list(THEMES)
_COMPILED = {k: ([re.compile(p) for p in v['include']], [re.compile(p) for p in v['exclude']], v.get('blank_subject', False))
             for k, v in THEMES.items()}


def theme_matches(text):
    """{theme: [matched strings]} for every theme that matches. Useful for review and the validation sample."""
    t0 = prepare(text)
    out = {}
    for k in THEME_ORDER:
        inc, exc, subj = _COMPILED[k]
        t = _blank_subjects(t0) if subj else t0
        for e in exc:
            t = _blank(e, t)
        hits = [m.group(0).strip() for p in inc for m in p.finditer(t)]
        if hits:
            out[k] = hits
    return out


def classify_next_step(text):
    """Multi-label: every theme with at least one inclusion match. 'other' only if no theme matches."""
    m = theme_matches(text)
    return [k for k in THEME_ORDER if k in m] or ['other']


# ----------------------------------------------------------------------------------------------------------------
# Analysis 7: results sentences and direction
# ----------------------------------------------------------------------------------------------------------------

_SENT = re.compile(r'(?<=[.!?])\s+(?=[A-Z\'"(\[‘“0-9])')


def sentences(paragraphs):
    if isinstance(paragraphs, str):
        paragraphs = [paragraphs]
    out = []
    for p in paragraphs:
        out += [s.strip() for s in _SENT.split(p or '') if s.strip()]
    return out


RESULTS_INCLUDE = [
    r'\boutcomes?\b', r'\bresults?\b', r'\battain\w*', r'\bexamination\w*', r'\bexams?\b', r'\bgcses?\b', r'\ba[- ]levels?\b',
    r'\bqualifications?\b', r'\baccreditations?\b', r'\bpublished\b', r'\b(?:published |national |performance )data\b',
    r'\bnational (?:tests?|assessments?|curriculum tests|checks?|averages?|figures?|outcomes|measures?|standards?|expectations|data)\b',
    r'\bnationally\b', r'\b(?:above|below|close to|in line with|than) (?:the )?average\b', r'\babove-average\b', r'\bbelow-average\b',
    r'\b(?:statutory|national|key stage \d|reading|external|end-of-key-stage) tests?\b', r'\btests? (?:results|scores)\b',
    r'\b(?:phonics )?screening (?:check|test|result)s?\b', r'\bphonics check\b', r'\bmultiplication (?:times )?(?:tables? )?(?:check|test)\b',
    r'\btimes tables? check\b', r'\bprogress (?:8|measures?|scores?)\b', r'\battainment 8\b', r'\bhigher standards?\b',
    r'\bgreater depth\b', r'\bgrade [4-9]\b', r'\b(?:standard|strong|good) (?:gcse )?pass\b', r'\bcombined (?:measure|attainment)\b',
    r'\bthree-year trends?\b', r'\bproportion (?:of )?(?:[\w-]+ ){0,2}(?:that |who )?(?:reach|achiev|attain|pass)\w*', r'\bscores\b',
    r'\b(?:reach\w*|achiev\w*|attain\w*) (?:the )?(?:expected|required|appropriate) standards?\b',
]
RESULTS_EXCLUDE = [
    r'\bas a result\b', r'\bresults? in (?=\w)', r'\b(?:education, health and care|ehc)(?: \(ehc\))? plans? outcomes\b',
    r'\boutcomes? (?:in|of|set out in) (?:their |the )?(?:education, health and care|ehc)\b', r'\blearning outcomes\b',
    r'\bpersonal outcomes\b', r'\bwellbeing outcomes\b',
]
# A sentence that names the end of a key stage or of Year 6/11/13 together with an achievement verb also counts,
# because "At the end of Year 6, most pupils attain well in mathematics" refers to the published key stage 2 results.
RESULTS_COOCCUR = (r'\bend of (?:key stage [1-5]|year (?:2|6|11|13))\b', r'\b(?:achiev\w*|attain\w*|perform\w*|reach\w*)\b')

_R_INC = [re.compile(p) for p in RESULTS_INCLUDE]
_R_EXC = [re.compile(p) for p in RESULTS_EXCLUDE]
_R_CO = [re.compile(p) for p in RESULTS_COOCCUR]


def is_results_sentence(sentence):
    t = prepare(sentence)
    for e in _R_EXC:
        t = _blank(e, t)
    if any(p.search(t) for p in _R_INC):
        return True
    return all(p.search(t) for p in _R_CO)


def results_sentences(paragraphs):
    return [s for s in sentences(paragraphs) if is_results_sentence(s)]


# Direction ---------------------------------------------------------------------------------------------------
# Measure names and fixed phrases that contain direction words but carry no direction are blanked first.
DIRECTION_MASK = [
    r'\bhigher standards?\b', r'\bgreater depth\b', r'\bexpected standards?\b', r'\b(?:high|low|lower|higher) prior attain\w*',
    r'\b(?:high|low|lower|higher)(?: academic)? starting points?\b', r'\b(?:lower|upper) key stage\b',
    r'\bhigh proportion\b', r'\bhigh level of\b', r'\b(?:high|low) attendance\b', r'\bhigh-performing subjects\b',
    r'\bnon-disadvantaged\b', r'\bas a result\b', r'\bno matter\b', r'\bnot only\b', r'\bpositive and negative\b',
    r'\bcapable of\b[^,.;]*',
    # intentions and plans are not statements about results
    # (an intention blanks the rest of its clause)
    r'(?<!continue )(?<!continues )(?<!continued )\b(?:to|will|can|could|should|would) (?:further )?(?:improve|raise|increase|achieve|attain|reach|strengthen|close|ensure|enable|be even better|be better)\b[^,.;]*',
    r'\b(?:need\w*|aim\w*|ambition|ambitious|plans?|actions?|action|work|steps|focus|time) to\b[^,.;]*',
]
NEGATION_PHRASES = [  # each counts once as a negative cue, and its words are then blanked
    r'\bnot as (?:well|high|highly|strong|good|successful\w*)\b', r'\bnot (?:\w+ )?(?:high|strong|good|well) enough\b',
    r'\b(?:do|does|did|have|has|had)(?: not|n\'t) (?:\w+ ){0,2}(?:achiev\w*|attain\w*|perform\w*|reach\w*|match\w*|do as well)\b(?: (?:as well|as highly) as (?:[\w-]+ )?(?:pupils|peers|others|other|similar|those)\b)?',
    r'\bnot (?:yet )?(?:been )?(?:fully )?reflected\b', r'\b(?:do|does|did) not (?:\w+ )?reflect(?: (?:the same|how well|the)\b(?: [\w-]+){0,3})?',
    r'\byet to (?:show|be|translate|have)\b', r"\b(?:[\w-]+ ){0,3}than (?:[\w'-]+ ){0,4}(?:results|outcomes|data) (?:suggest|show|indicate)\w*",
    r'\bnot enough pupils\b',
    r'\bnot (?:yet )?translated\b', r'\btoo (?:low|few)\b', r'\btoo many pupils (?:do not|leave|are not)\b', r'\bnot achieved\b',
    r'\bcould be (?:even )?better\b',
]
POSITIVE = [
    r'\babove\b', r'\babove-average\b', r'\bexceed\w*', r'\boutperform\w*', r'\bbetter (?:than|outcomes|results)\b', r'\bbetter\b',
    r'\bhigher than\b', r'\bimproved\b', r'\bimproving\b', r'\bimprovements?\b', r'\brose\b', r'\brisen\b', r'\brising\b', r'\bincreased\b',
    r'\b(?:achiev\w*|attain\w*|perform\w*|do|did|does) (?:very |extremely |exceptionally |particularly |consistently |notably )?(?:highly|well)\b(?! (?:above|below))',
    r'\b(?:is|are|was|were|been|remains?|be) (?:very |especially |consistently |particularly |significantly )?high\b',
    r'\bhigh (?:standards?|attainment|outcomes|achievement|performance)\b', r'\bvery high\b', r'\bhighly positive\b', r'\bpositive\b',
    r'\bstrong\w*', r'\bstrength\b', r'\bsuccess\w*', r'\bimpressive\b', r'\bexcellent\b', r'\bencouraging\b', r'\bsustained\b',
    r'\bgaps? (?:\w+ ){0,4}(?:narrow\w*|closing|is small|reducing)\b', r'\b(?:closing|narrowing|closed|narrowed) (?:the )?gaps?\b',
    r'\bdifferences? (?:\w+ ){0,6}narrow\w*', r'\bgains?\b', r'\bnoteworthy\b', r'\bas well as or better than\b',
    r'\bmore pupils (?:\w+ ){0,2}(?:achiev|attain|reach|pass)\w*', r'\b(?:most|almost all|all|many) (?:pupils )?pass\b',
]
NEGATIVE = [
    r'\bbelow\b', r'\bbelow-average\b', r'\blower\b', r'\blow\b', r'\bweak\w*', r'\bdeclin\w*', r'\bdropped\b', r'\bfell\b',
    r'\bfall(?:ing|en)?\b', r'\bdip\w*', r'\bfewer\b', r'\bunderperform\w*', r'\bunder performance\b', r'\buneven\w*',
    r'\binconsisten\w*', r'\bvariab\w*', r'\bvar(?:y|ies)\b', r'\bfluctuat\w*', r'\bbehind\b', r'\black\w*', r'\bless (?:well|secure|high|strong|consistent)\b',
    r'\bworse\b', r'\bpoor\w*', r'\bgaps? (?:\w+ ){0,4}(?:grow\w*|widen\w*)\b', r'\bmixed picture\b',
]
LEVEL = [
    r'\bin line with\b', r'\bclose to\b', r'\bcloser to\b', r'\bbroadly (?:similar|in line|close|average)\b', r'\bsimilar to\b',
    r'\bsimilar (?:to )?(?:those|national)\b', r'\baround the national average\b', r'\bas well as (?:other|their|similar|disadvantaged|pupils|peers|others|the|those)\b',
    r'\bat (?:the )?national average\b', r'\b(?:the )?same as\b', r'\battain the national average\b',
]
NEGATORS = r"\b(?:not|no|never|nor|neither|without|n't|cannot|yet to)\b"
# Clause boundaries limit the reach of a negator.
_CLAUSE = re.compile(r'[,;:()]|\b(?:but|however|although|though|while|whereas|despite)\b')
NEGATION_WINDOW = 3   # tokens before a cue

_D_MASK = [re.compile(p) for p in DIRECTION_MASK]
_D_NEGP = [re.compile(p) for p in NEGATION_PHRASES]
_D_POS = [re.compile(p) for p in POSITIVE]
_D_NEG = [re.compile(p) for p in NEGATIVE]
_D_LEV = [re.compile(p) for p in LEVEL]
_D_NOT = re.compile(NEGATORS)


def _negated(text, start):
    """True if a negator sits within NEGATION_WINDOW tokens before position start, in the same clause."""
    before = text[:start]
    cut = max([m.end() for m in _CLAUSE.finditer(before)] or [0])
    toks = re.findall(r"[\w'-]+", before[cut:])[-NEGATION_WINDOW:]
    return any(_D_NOT.fullmatch(w) or w.endswith("n't") for w in toks)


def direction_cues(sentence):
    """List of (polarity, matched text) after masking, fixed negative phrases and negation flips.
    A negated positive becomes negative; a negated negative becomes level; a negated level becomes negative."""
    t = prepare(sentence)
    for p in _D_MASK:
        t = _blank(p, t)
    cues = []
    for p in _D_NEGP:
        for m in p.finditer(t):
            cues.append(('negative', m.group(0)))
        t = _blank(p, t)
    taken = []
    for pol, pats in (('level', _D_LEV), ('positive', _D_POS), ('negative', _D_NEG)):
        for p in pats:
            for m in p.finditer(t):
                if any(a < m.end() and m.start() < b for a, b in taken):
                    continue           # overlaps a longer cue already counted
                taken.append((m.start(), m.end()))
                q = pol
                if _negated(t, m.start()):
                    q = {'positive': 'negative', 'negative': 'level', 'level': 'negative'}[pol]
                cues.append((q, m.group(0)))
    return cues


def sentence_direction(sentence):
    pols = {p for p, _ in direction_cues(sentence)}
    if 'positive' in pols and 'negative' in pols:
        return 'mixed'
    if 'positive' in pols:
        return 'positive'
    if 'negative' in pols:
        return 'negative'
    if 'level' in pols:
        return 'level'
    return 'none'


def section_direction(paragraphs):
    """'no results statement' if no results sentence; else positive / negative / level if every results sentence with a
    direction has that direction; 'mixed' otherwise. Results sentences with no direction cue ('none') are left out of
    the section reading (but counted). Draft rule: see results-lexicon-v0.md, decision 2."""
    rs = results_sentences(paragraphs)
    if not rs:
        return 'no results statement'
    ds = {sentence_direction(s) for s in rs} - {'none'}
    if not ds:
        return 'no direction'
    return ds.pop() if len(ds) == 1 else 'mixed'


def net_direction(paragraphs):
    """(positive - negative) / all results sentences; None if there are none. Mixed, level and none count as 0."""
    rs = results_sentences(paragraphs)
    if not rs:
        return None
    ds = [sentence_direction(s) for s in rs]
    return (ds.count('positive') - ds.count('negative')) / len(ds)
