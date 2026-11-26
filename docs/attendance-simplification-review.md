# Attendance Explorer: fresh review and simplification proposal

> **Status, 24 November 2026: the proposal below was not adopted.** Mark saw the school page rebuilt to it and chose to keep the fuller tool, refining the experience and organising the content instead of cutting. The measurements and findings stand as a record; the section "Proposal" and the lists of what to cut do not describe the direction.

24 November 2026. Mark asked for a fresh review of the whole tool with a full understanding of what its audiences need, saying it "appears overly complex". An independent reviewer with no part in building it used the preview on a phone (390 px) and a desktop (1,300 px) as seven different people, each with one question and two minutes, measured every page and compared it with the Ofsted Explorer. This note records what it found and proposes a simpler tool. Nothing has been rebuilt; the proposal is for Mark to accept, change or reject.

## How complex it has become

Phone figure first, then desktop. "Screens" is page height divided by the height of the screen.

| Page | Screens | Sections | Controls before the first figure | Charts and tables | Words | First figure appears at |
| --- | --- | --- | --- | --- | --- | --- |
| Start here | 1.7 / 1.3 | 3 steps | 5 to 6 taps and typing | 0 | 88 | none |
| Areas, in-year | 7.3 / 5.4 | 9 | 2 / 8 | 6 | 935 | 0.6 / 1.0 |
| School | 7.7 / 6.0 | 8 | 3 / 4 | 5 | 798 | 0.6 / 0.7 |
| Local authority | 16.6 / 10.9 | 10, with 8 sub-headings | 3 / 17 | 13 | 1,643 | 0.6 / 0.9 |
| County | 14.0 / 9.6 | 9, with 8 | 3 / 17 | 12 | 1,506 | 0.6 / 0.9 |
| Constituency | 8.5 / 6.7 | 8 | 3 / 12 | 5 | 931 | 0.6 / 0.8 |
| Ward | 8.0 / 6.2 | 8 | 3 / 10 | 5 | 963 | 0.6 / 0.8 |
| Trust | 8.9 / 6.4 | 8 | 3 / 13 | 5 | 1,037 | 0.6 / 0.8 |
| Patterns | 13.2 / 9.8 | 9 | 2 / 6 | 10 | 1,295 | 0.7 / 1.0 |
| Ofsted Explorer, for comparison | 17.3 / 14.6 | 15 | 5 / 5 | 7 | 1,648 | a verdict at 0.6 |

- The whole tool is about 96 phone screens, 9,200 words, 44 charts and 17 tables.
- It covers eight kinds of place, four absence measures and twelve enforcement measures, and names up to seven different years.
- A local authority page has 108 combinations of its four controls, and on a phone the controls sit below the summary they change.
- Every page carries three stacked menus; Areas carries four.
- Enforcement takes six of the local authority page's 16.6 phone screens. With the method and the feedback form it is more than half the page.
- The Attendance Explorer has no tooltips; the Ofsted Explorer has 207. Attendance puts a paragraph of explanation above every chart instead.

## What went wrong for each reader

**The tool contradicts itself about the same place.** The Areas page set to Birmingham says 5.5%, 0.2 points lower than England (all schools, 2026/27 so far). Birmingham's own page says 5.7%, 0.6 points higher than England (primary schools, two terms of 2025/26). Neither mentions the other. A school shows 8.8% at the top and 10.3% under "Year by year". Three clocks are presented as equals: this year week by week, the latest two terms, and full years. This is the largest single source of the complexity.

**The first card does not answer the question asked, and no page states a finding.**

- Headteacher: the summary says higher than England and higher than the local authority. The comparison with similar schools, a screen further down, says 0.3 lower. A head who stops at the first card leaves with the wrong impression.
- Primary attendance lead: similar schools give one pooled figure for overall absence only, with no persistent absence and no range, and the list of 20 has names without figures.
- Governor or parent: a 60-word sentence with three percentages in "points". The plainest answer on the page ("35% of schools had a higher rate") is four screens down.
- Every place page is headed with a period ("Absence in the autumn and spring terms 2025/26"), not a finding. The Ofsted Explorer's first heading is a verdict.

**The ways in and the controls add work without adding answers.**

- Start here costs six taps and typing to remove one section. The parent's and the headteacher's briefings are word for word the same. The local authority role is offered no enforcement question.
- "Schools", "Trusts", "Local authorities" and "Wards" in the menus each open a random place.
- Trust chief executive: the page opens on secondary schools only (9 of 28 in the trust tried), with no all-phase view. The schools table is alphabetical with two columns on a phone and no change in a year, so neither outliers nor improvers can be read.
- Local authority officer: the question about enforcement is answered by two sentences; six screens follow them.
- Journalist: the national picture is split between Areas and Patterns. There is no table of authorities anywhere; places can only be found by tapping hexagons one at a time.
- Returning user: the "new since your last visit" note appears on one page only and says that something was published, not what moved.

**Faults found on the way.**

- Search matches inside words: "St Mary" finds no St Mary's school, because "mary" matches inside "primary", and trusts and wards outrank schools.
- The trust page's method carries two paragraphs about penalty notices, which the page does not show.
- The trust and school pages print the number of pupils on roll. These are sizes, not counts of absent pupils, but they sit close to the rule "rates only, never counts of pupils" and Mark should say whether they stay.

## Why the Ofsted Explorer feels simpler

It is not shorter. It has one kind of thing, one search box and one menu row; a verdict as its first heading; four tiles that each answer a named question; one period; the same comparators in the same order every time; explanation behind an (i); and controls inside the section they change.

## Proposal: five pages, one search, one menu

**Way in.** One search-first home, as the Ofsted Explorer has. The only standing links are "England" and "Method". Place pages link up and down to each other (a school to its trust and authority; an authority to its schools). No Start here, no briefing mode, no menu of kinds of area, no random landings.

**One clock, stated once.** Every place page leads with the latest published figure for that place and says in one line which period it is. Where a second clock exists (this year so far, for authorities) it sits beside the first in the same table with its own label, so the two are never read as disagreeing.

| Page | Shows first | Then |
| --- | --- | --- |
| Home | Search; England in four figures; your saved places with what is new for each | Nothing else |
| School | A verdict sentence naming England, the local authority and the 20 similar schools in that fixed order, with the change in a year and the share of schools higher and lower | A three-row table (overall and persistent absence beside each comparator); one trend line |
| Trust | One table with a row for each phase: rate, England, change in a year | Every school, grouped by phase, alphabetical, with rate, change in a year and gap from England; one trend line |
| Local authority (county on the same template) | The same phase table, with "this year so far" beside it | Pupil groups; two enforcement sentences, one for holiday notices and one for notices for other unauthorised absence, each with its rate beside England and never added together; its schools |
| England (Areas and Patterns merged) | This year against last | The claim-titled sections (long run, free school meals gap, severe absence, regions); the map of authorities with an alphabetical table beneath |

Plus one Method page, linked from every footer, and one feedback link.

**Kept, because a reader's question fails without it**

- A school beside its 20 similar schools, with persistent absence added.
- Change in a year in the first sentence.
- The share of schools with higher and lower rates, moved into the first card.
- All of a trust's schools with their change, every phase visible without a control.
- An authority by phase, by pupil group, and its two notice rates beside England.
- England's trend, the regions and the map.
- Saved places, with a note that says what moved.

**Folded behind one "More detail" step on each page**

- The national distribution and the change since 2018/19.
- Comparing up to four places.
- The school-by-school circles.
- Enforcement year by year, what became of the notices, and the other legal measures.
- History before 2018/19, trust joining dates and predecessor notes.
- The day-by-day calendar (one, on England).

**Cut outright**

- Start here and briefing mode.
- Ward pages; constituency pages unless someone asks for them, reached by search only.
- "Show me another" and every random landing.
- The page-wide Show, Pupils and Measure controls. Measures become rows in a table.
- The trust funnel.
- On Patterns: the circumstances scatter, the "further apart" chart, the second calendar, and similar-schools matching as a section (it moves to Method).
- On Areas: by day of the week, reasons recorded, and the scatter against the same point last year.
- Enforcement: the twelve-measure category strip, the regional placement, the region-by-region section and the chart of how many authorities used each measure.
- "Save image" under every chart (one share action for the page), the feedback form on every page, and the method tabs on every page.
- Severe absence as a selectable measure. It stays as one figure on trust and area pages and never for a single school.

**Words to drop.** "Points" in pills, "sessions", "taken together", "strand", "fifth", "category", "phase", "Read three ways", "Side by side", "Position", "Patterns", "Areas", "briefing", "Chosen above", "the middle school".

## What this would cost and keep

The data, the build, the fetchers, the rounding rules and the independent figures checks all stand: the work is in the pages, not underneath them. Roughly two thirds of the page code would go. The rebuild is best done one page at a time, school first, each shown to Mark on his phone before the next is started, and each measured against a budget: a first answer within one phone screen, no more than five sections, no page-wide controls, and no more than about five phone screens before "More detail".

## Decisions for Mark

1. Whether to accept this shape as the direction. If so, the school page is rebuilt first as a single example before anything else is touched.
2. Whether wards and constituencies are cut. They were in the original brief; the review found no reader whose question needed them.
3. Whether enforcement shrinks to two sentences on the authority page with the rest behind "More detail", after a day spent building it out.
4. Whether pupil numbers on roll may be shown.
