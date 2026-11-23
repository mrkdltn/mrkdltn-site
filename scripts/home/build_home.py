"""Build site/index.html: the home page as a school day, dawn to dusk.

Run from the repository root: python3 scripts/home/build_home.py
Not part of the Cloudflare build; the output is committed.

Each stop is a plate (an illustration, with a short video move on wide and
tablet screens) carrying a card of text, a brass thread traced over the
image, and small badges that branch off the thread. Paths are in the plate's
own coordinates: 1600 x 900 for wide plates, 900 x 1200 for tall ones.
"""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / 'site'

OFSTED_SRC = 'Ofsted, state-funded school inspections and outcomes: management information as at 31 October 2026, released 11 November 2026.'
LINKEDIN = 'https://www.linkedin.com/in/mrkdltn'

# Achievement grades of the 756 secondary schools with a report card, per 100 (Ofsted MI, 31 October 2026)
ACH = '3,18,46,30,3'

ICONS = {
    'sun': '<path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4"/><circle cx="12" cy="12" r="3.6"/>',
    'clock': '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
    'chart': '<path d="M4 20h16M7 17v-5M11 17V8M15 17v-7M19 17V5"/>',
    'pen': '<path d="M4 20l1.2-4.4L15.5 5.3a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.4 18.8z"/><path d="M13.5 7.3l3.2 3.2"/>',
    'meal': '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 1.5-3 4-3 7h3v11"/>',
    'search': '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
    'cap': '<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5v4c1.6 1.5 3.4 2.2 5.5 2.2s3.9-.7 5.5-2.2v-4M21.5 9.5v5"/>',
    'home': '<path d="M4 11l8-6.5 8 6.5M6 9.5V20h12V9.5M10 20v-5h4v5"/>',
    'arrow': '<path d="M5 12h14M13 6l6 6-6 6"/>',
}
LI_SVG = '<svg class="li" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>'


def icon(name):
    return '<svg viewBox="0 0 24 24" aria-hidden="true">%s</svg>' % ICONS[name]


# ---- the day -------------------------------------------------------------
# path: thread in plate coordinates. It must start above the top edge and end
# below the bottom edge with vertical segments, so the joins between plates
# are straight whatever the crop.
# badges: (icon, label, (x, y) badge centre, (x, y) where the branch leaves the thread)
STOPS = [
    dict(key='00-facade', time='07:30', ground='#C9D7E6', tone='day',
         alt='Illustration: the long front of a two-storey school at sunrise, seen across a field, a path leading to the door.',
         w=dict(path='M972,372 H800 V1300', badges=[('sun', '07:30', (1150, 372), (972, 372))]),
         t=dict(path='M270,690 V842 H450 V1500', badges=[('sun', '07:30', (700, 690), (270, 690))])),
    dict(key='01-corridor', time='08:35', ground='#DDE5EC', tone='day', side='left',
         alt='Illustration: a long school corridor in morning sun, a few pupils far down it seen from behind.',
         w=dict(path='M1255,-300 V640 L930,515 V1300', badges=[('clock', '08:35', (1430, 300), (1255, 300))]),
         t=dict(path='M745,-300 V560 L560,672 V1500', badges=[('clock', '08:35', (250, 300), (745, 300))]),
         label='The corridor', h2='It starts before the first lesson.',
         body='Who is here, who is late, who has not been seen since Tuesday. The first evidence of the day is a register.',
         note='Progress 8 returns with the summer 2027 results, the first score since 2024.',
         link=('/writing/progress-8/', 'Progress 8: a lens refracted by context', 'p8')),
    dict(key='02-classroom', time='09:50', ground='#E6EBEE', tone='day', side='left',
         alt='Illustration: a sunlit classroom with a display screen showing a grid of one hundred squares.',
         w=dict(path='M1100,-300 V262 H630 V485 H1000 V520 H1440 V1300',
                badges=[('chart', '1 in 3', (1300, 262), (1100, 262))],
                grid=(716, 276, 17, 3)),
         t=dict(path='M620,-300 V465 H270 V665 H620 V1500',
                badges=[('chart', '1 in 3', (200, 300), (620, 300))],
                grid=(362, 482, 14, 3)),
         label='The classroom', fig='249',
         body='of the 756 secondary schools with a report card were graded below Expected for achievement. That is one in three.',
         src=OFSTED_SRC,
         link=('/writing/ofsted-report-cards/', 'I checked every Ofsted report card', 'rc')),
    dict(key='03-book', time='11:15', ground='#EEEAE0', tone='day', side='right',
         alt='Illustration: an open exercise book with blank ruled pages on a desk in late-morning light.',
         w=dict(path='M800,-300 V1300', badges=[('pen', '2028', (1010, 140), (800, 140))]),
         t=dict(path='M450,-300 V1500', badges=[('pen', '2028', (700, 220), (450, 220))]),
         label='The book', h2='The work itself.',
         body='An exercise book is the most honest record a school keeps. It shows what was asked, and what came back.',
         note='A revised national curriculum is due for first teaching in September 2028.',
         link=('/writing/curriculum-review/', 'The questions every school leader should be asking now', 'car')),
    dict(key='05-canteen', time='12:30', ground='#F4EEDF', tone='day', side='left',
         alt='Illustration: an empty dining hall at midday, sunshine pouring through tall windows onto a long table.',
         w=dict(path='M720,-300 V500 L1500,596 V1300', badges=[('meal', '29.8%', (980, 300), (720, 300))]),
         t=dict(path='M770,-300 V330 L520,690 V1500', badges=[('meal', '29.8%', (300, 250), (770, 250))]),
         label='The canteen', h2='Who the school serves.',
         body='Context is not an excuse, and it is not noise. It is part of the evidence.',
         fig='29.8%', figsub='of pupils finishing key stage 4 in 2025/26 were disadvantaged, up from 28.2% a year earlier.',
         src='DfE, Key stage 4 performance 2025/26 (provisional), 15 October 2026.',
         link=('/writing/progress-8/', 'What Progress 8 does not control for', 'p8')),
    dict(key='04-office', time='14:00', ground='#EFE6D3', tone='day', side='right',
         alt='Illustration: a desk seen from above in afternoon light, a sheet of paper carrying two grids of squares.',
         w=dict(path='M640,-300 V250 H960 V665 H800 V1300',
                badges=[('search', 'Explorer', (430, 250), (640, 250))],
                sheet=[(680, 292, '4,26,62,7,1'), (812, 292, '2,16,36,42,4')]),
         t=dict(path='M625,-300 V360 H275 V840 H450 V1500',
                badges=[('search', 'Explorer', (330, 250), (625, 250))],
                sheet=[(372, 392, '4,26,62,7,1', 13), (372, 612, '2,16,36,42,4', 13)]),
         label='The office', fig2=('8', '46'),
         body='In the least deprived fifth of neighbourhoods, 10 of 120 secondary schools were graded below Expected for achievement. In the most deprived fifth, 87 of 188.',
         src=OFSTED_SRC,
         link=('/explorer/', 'Check any school against its 50 similar schools', 'ex')),
    dict(key='06-playground', time='15:20', ground='#E8D6B4', tone='day', side='left',
         alt='Illustration: a playground in afternoon sun, a few pupils seen from behind walking towards open gates.',
         w=dict(path='M1500,-300 V500 H800 V1300', badges=[('cap', '89%', (1300, 330), (1500, 330))]),
         t=dict(path='M820,-300 V650 H460 V1500', badges=[('cap', '89%', (300, 300), (820, 300))]),
         label='The playground', h2='Half past three.',
         body='What a school learns in a day leaves through the gate with the pupils it describes.',
         fig='89%', figsub='of the secondary teacher training target was met in 2025/26, up from 61% the year before.',
         src='DfE, Initial Teacher Training Census 2025/26.'),
    dict(key='07-street', time='17:30', ground='#283656', tone='night', side='right',
         alt='Illustration: open school gates onto a street of terraced houses at dusk, windows lit, hills beyond.',
         w=dict(path='M930,-300 V505 H800 V1300', badges=[('home', 'Fifths', (1120, 300), (930, 300))]),
         t=dict(path='M730,-300 V700 H560 V1500', badges=[('home', 'Fifths', (300, 400), (730, 400))]),
         label='The community', h2='Where pupils live.',
         body='Ofsted sorts schools into fifths by the deprivation of the neighbourhoods their pupils come from. Follow the line through those fifths.',
         link=('/explorer/', 'Look up any secondary school in the Ofsted Explorer', 'ex')),
]

THUMBS = {'p8': '/assets/writing/progress-8.webp', 'car': '/assets/writing/curriculum-review.webp',
          'rc': '/assets/writing/report-cards.webp', 'ex': None}

e = html.escape

# How far each stop's thread has turned from midnight towards brass (0 = #0B1A2E, 1 = #C9A24B).
WARM = {'00-facade': 0, '01-corridor': 0, '02-classroom': 0, '03-book': 0, '05-canteen': 0.08,
        '04-office': 0.25, '06-playground': 0.62, '07-street': 1}


def thread_colour(key):
    t = WARM[key]
    a, b = (0x0B, 0x1A, 0x2E), (0xC9, 0xA2, 0x4B)
    return '#%02X%02X%02X' % tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def badges(spec):
    out = []
    for ic, lab, at, frm in spec.get('badges', []):
        out.append('<span class="bd" data-at="%d,%d" data-from="%d,%d">%s<b>%s</b></span>' % (at[0], at[1], frm[0], frm[1], icon(ic), e(lab)))
    return ''.join(out)


def art(spec, vb, cls):
    w, h = vb
    inner = '<path class="th" d="%s"/>' % spec['path']
    for ic, lab, at, frm in spec.get('badges', []):
        if frm[1] == at[1]:
            inner += '<path class="br" d="M%d,%d H%d"/>' % (frm[0], frm[1], at[0])
        else:
            inner += '<path class="br" d="M%d,%d V%d H%d"/>' % (frm[0], frm[1], at[1], at[0])
    if 'grid' in spec:
        x, y, s, g = spec['grid']
        inner += '<g class="grid" data-counts="%s" data-x="%d" data-y="%d" data-size="%d" data-gap="%d"></g>' % (ACH, x, y, s, g)
    for item in spec.get('sheet', []):
        x, y, counts = item[:3]
        s = item[3] if len(item) > 3 else 10
        g = 3 if s > 10 else 2
        span = 10 * s + 9 * g
        inner += '<rect class="ink" x="%d" y="%d" width="%d" height="%d"/>' % (x, y, min(150, span), 7 if s > 10 else 8)
        inner += '<g class="grid" data-counts="%s" data-x="%d" data-y="%d" data-size="%d" data-gap="%d"></g>' % (counts, x, y + 24, s, g)
    inner += '<circle class="tip" r="4.5"/>'
    return '<svg class="art %s" viewBox="0 0 %d %d" preserveAspectRatio="xMidYMid slice" aria-hidden="true">%s</svg>' % (cls, w, h, inner)


def plate(st, i):
    k = st['key']
    lazy = '' if i == 0 else ' loading="lazy"'
    fetch = ' fetchpriority="high"' if i == 0 else ''
    return ('<div class="plate"><div class="frame"><div class="layer">'
            '<picture><source media="(orientation:portrait)" srcset="/assets/plates/%s-v.webp" width="1080" height="1440">'
            '<img src="/assets/plates/%s.webp" width="1600" height="900" alt="%s"%s%s></picture>'
            '<video class="mv" muted playsinline preload="none" disablepictureinpicture aria-hidden="true" tabindex="-1" data-w="/assets/video/%s.mp4" data-t="/assets/video/%s-v.mp4"></video>'
            '%s%s<div class="bds w" aria-hidden="true">%s</div><div class="bds t" aria-hidden="true">%s</div></div></div>') % (
        k, k, e(st['alt']), lazy, fetch, k, k,
        art(st['w'], (1600, 900), 'w'), art(st['t'], (900, 1200), 't'), badges(st['w']), badges(st['t']))


def card(st):
    out = ['<p class="pw"><span>%s</span> %s</p>' % (st['time'], e(st['label']))]
    if 'h2' in st:
        out.append('<h2>%s</h2>' % e(st['h2']))
    if 'fig' in st and 'h2' not in st:
        out.append('<p class="fig"><span data-count="%s">%s</span></p>' % (st['fig'], st['fig']))
    if 'fig2' in st:
        a, b = st['fig2']
        out.append('<p class="fig two"><span><span data-count="%s">%s</span>%%</span><span><span data-count="%s">%s</span>%%</span></p>' % (a, a, b, b))
    out.append('<p>%s</p>' % e(st['body']))
    if 'fig' in st and 'h2' in st:
        out.append('<p class="stat"><b>%s</b> %s</p>' % (e(st['fig']), e(st['figsub'])))
    if 'note' in st:
        out.append('<p class="stat">%s</p>' % e(st['note']))
    if 'src' in st:
        out.append('<p class="src">%s</p>' % e(st['src']))
    if 'link' in st:
        href, text, th = st['link']
        img = THUMBS.get(th)
        pic = ('<img src="%s" alt="" width="160" height="90" loading="lazy">' % img) if img else '<span class="ex">%s</span>' % icon('search')
        out.append('<a class="go" href="%s">%s<span>%s</span>%s</a>' % (href, pic, e(text), icon('arrow')))
    return '<div class="pc %s %s">%s</div>' % (st.get('side', 'left'), st['tone'], ''.join(out))


def hero(st):
    return ('<section class="stop hero" data-ground="%s" style="--th:%s">%s'
            '<div class="hero-copy"><h1><span>Leading schools.</span> <span>Challenging assumptions.</span> <span>Building what comes next.</span></h1></div>'
            '</div>'
            '<div class="hero-cards">'
            '<div class="pc left day intro"><p>I lead a secondary school in the West Midlands, and write about fair accountability, disadvantage and building teachers: national measures read through the practice of a school, with every figure linked to its source.</p>'
            '<p class="acts"><a class="btn" href="#writing">Read the writing</a><a class="btn quiet lin" href="%s">%s<span>Follow on LinkedIn</span></a></p></div>'
            '<div class="pc right sheet explorer"><p class="pw"><span>Free tool</span> Report cards added daily</p>'
            '<h2>Ofsted Explorer</h2>'
            '<div class="ex-row"><p>Look up any secondary school in England: its report card beside its GCSE results, read against the national average and its 50 most similar schools.</p>'
            '<figure class="mini"><svg viewBox="0 0 120 120" role="img" aria-label="Achievement grades of the 756 secondary schools with a report card"><g class="grid" data-counts="%s" data-x="0" data-y="0" data-size="10" data-gap="2"></g></svg>'
            '<figcaption>Achievement grades, 756 secondary report cards</figcaption></figure></div>'
            '<p class="acts"><a class="btn" href="/explorer/">Open the Explorer</a><span class="n">3,298 secondary schools</span></p></div>'
            '</div><svg class="seam" aria-hidden="true"><path class="th"/><circle class="tip" r="4.5"/></svg></section>') % (
        st['ground'], thread_colour(st['key']), plate(st, 0), LINKEDIN, LI_SVG, ACH)


def stop(st, i):
    return ('<section class="stop" data-ground="%s" style="--th:%s">%s%s</div><svg class="seam" aria-hidden="true"><path class="th"/><circle class="tip" r="4.5"/></svg></section>') % (
        st['ground'], thread_colour(st['key']), plate(st, i), card(st))


NATIONAL = '''<section class="national" data-ground="#0B1A2E">
  <div class="wrap"><div class="sheet">
    <svg class="lead" aria-hidden="true"><path class="th"/><circle class="tip" r="4.5"/></svg>
    <p class="label">The national picture</p>
    <h2>The ceiling is open; the floor is tilted.</h2>
    <p class="chart-title">Secondary schools graded below Expected for achievement, by the deprivation of the neighbourhoods their pupils live in.</p>
    <div class="bars"><div class="axis"></div>{cols}</div>
    <p class="legend"><span><i style="background:#FF8341"></i>Needs attention</span><span><i style="background:#CE1E02"></i>Urgent improvement</span></p>
    <p class="src">{src} 756 secondary schools with a report-card grade for achievement.</p>
    <p class="acts"><a class="btn" href="/writing/ofsted-report-cards/">Read the analysis</a><a class="btn quiet" href="/explorer/">Open the Explorer</a></p>
  </div></div>
</section>'''
COLS = [('Least deprived fifth', '10 of 120', 7.5, 0.8, 8), ('Second fifth', '33 of 139', 22.3, 1.4, 24),
        ('Middle fifth', '58 of 166', 30.1, 4.8, 35), ('Fourth fifth', '61 of 143', 38.5, 4.2, 43),
        ('Most deprived fifth', '87 of 188', 42.6, 3.7, 46)]


def national():
    cols = ''.join('<div class="col"><div class="bar" style="--na:%s;--ui:%s"><b>%d%%</b><i class="ui"></i><i class="na"></i></div><p><strong>%s</strong><br>%s</p></div>' % (na, ui, p, a, b) for a, b, na, ui, p in COLS)
    return NATIONAL.format(cols=cols, src=OFSTED_SRC)


def writing_cards(entries):
    out = []
    for href, kind, when, title, desc, note, img in entries:
        out.append('<a class="wcard" href="%s"><img src="%s" alt="" width="800" height="450" loading="lazy"><span class="b"><span class="when">%s · %s</span><span class="t">%s</span><span class="d">%s</span></span></a>' % (href, img, kind, when, title, desc))
    return '\n'.join(out)


ENTRIES = [
    ('/writing/belonging/', 'Analysis', '18 November 2026', "Behaviour has improved fast. Belonging hasn't kept pace.", 'Pupils rate behaviour far more highly than a year ago. The share who feel they belong has not risen with it.', '', '/assets/writing/belonging.webp'),
    ('/writing/ofsted-report-cards/', 'Analysis', 'November 2026', "I checked every Ofsted report card. Results alone don't explain the gap.", 'A year of report cards read against deprivation and against statistically similar schools.', '', '/assets/writing/report-cards.webp'),
    ('/writing/progress-8/', 'Analysis', '20 September 2026', 'Progress 8: a lens refracted by context', 'The measure returns with the summer 2027 results. What it controls for, what it does not, and why it should start the conversation about a school, not finish it.', '', '/assets/writing/progress-8.webp'),
]

def page():
    head = '''<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mark Dalton · Leading schools. Challenging assumptions. Building what comes next.</title>
<meta name="description" content="Mark Dalton, secondary principal, FRSA, FCCT. Writing and open tools on school accountability, disadvantage and the teaching workforce in England, including the Ofsted Explorer.">
<link rel="canonical" href="https://mrkdltn.com/">
<meta property="og:title" content="Mark Dalton">
<meta property="og:description" content="Leading schools. Challenging assumptions. Building what comes next. Writing and open tools on school accountability in England.">
<meta name="theme-color" content="#C9D7E6">
<link rel="preload" href="/assets/fonts/libre-caslon-display.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" as="image" href="/assets/plates/00-facade.webp" media="(orientation:landscape)">
<link rel="preload" as="image" href="/assets/plates/00-facade-v.webp" media="(orientation:portrait)">
<link rel="stylesheet" href="/assets/site.css">
<link rel="stylesheet" href="/assets/home.css">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
</head>
<body class="home">
<a class="skip" href="#main">Skip to the content</a>
<header class="site-head over"><div class="wrap">
  <a class="brand" href="/">Mark Dalton</a>
  <nav class="nav" aria-label="Main"><a href="/writing/">Writing</a><a href="/explorer/">Ofsted Explorer</a><a href="#about">About</a><a class="nav-li" href="%s" aria-label="Mark Dalton on LinkedIn">%s</a></nav>
</div></header>
<main id="main">
<div class="day" id="day">
''' % (LINKEDIN, LI_SVG)
    body = hero(STOPS[0]) + '\n' + '\n'.join(stop(s, i) for i, s in enumerate(STOPS) if i) + '\n' + national() + '\n</div>\n'
    about = '''<div class="paper" id="after">
<section class="wrap block" id="writing">
  <p class="label">Writing</p>
  <h2 class="sec-h">Challenging assumptions.</h2>
  <div class="wcards">
%s
  </div>
  <p class="all"><a href="/writing/">All writing</a></p>
</section>
<section class="wrap block about" id="about">
  <img src="/assets/img/mark-dalton.webp" srcset="/assets/img/mark-dalton-480.webp 480w, /assets/img/mark-dalton.webp 880w" sizes="(max-width:760px) 70vw, 340px" width="880" height="1100" alt="Mark Dalton" loading="lazy">
  <div class="prose">
    <p class="label">About</p>
    <h2>Leading schools.</h2>
    <p>I run a secondary school in the West Midlands, and I write about what national education policy looks like from inside one.</p>
    <p>I have led my current school, which serves one of England's most deprived communities, since 2023, through a period of substantial improvement that is the work I am proudest of. Across my career I have led schools in both regional and national trusts, mostly in communities where disadvantage shapes the daily work, and that has taught me how much of a school's improvement depends on the system around it: how it is held to account, how it is supported, and how well it grows its own teachers.</p>
    <p>Those are the problems I care most about. Accountability should be fair: measures ought to reward what matters, and context should sharpen judgement rather than lower expectations. Disadvantage should not decide a child's outcomes, and a real sense of belonging is part of how it stops doing so. And schools need more good teachers than the system currently trains and keeps.</p>
    <p>I'm always glad to hear from school and trust leaders, researchers, policymakers and journalists working on the same questions.</p>
    <p class="label">Secondary principal, West Midlands · Fellow of the Royal Society of Arts · Fellow of the Chartered College of Teaching · Teach First, 2003</p>
    <p class="acts"><a class="btn quiet lin" href="%s">%s<span>Follow on LinkedIn</span></a></p>
  </div>
</section>
<footer class="site-foot"><div class="wrap">
  <span>© 2026 Mark Dalton. Views are my own.</span>
  <span><a href="/writing/">Writing</a> · <a href="/explorer/">Ofsted Explorer</a> · <a href="/colophon/">Colophon</a> · <a href="%s">LinkedIn</a></span>
</div></footer>
</div>
</main>
<script src="/assets/day.js" defer></script>
</body>
</html>
''' % (writing_cards(ENTRIES), LINKEDIN, LI_SVG, LINKEDIN)
    return head + body + about


if __name__ == '__main__':
    out = page()
    (SITE / 'index.html').write_text(out, encoding='utf-8')
    print('index.html', len(out))
    # the share-card and Open Graph tags come from one source: scripts/site_meta.py
    import sys
    sys.path.insert(0, str(ROOT / 'scripts'))
    import site_meta
    site_meta.write_heads()
