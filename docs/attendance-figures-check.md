# Attendance Explorer: an independent check of the figures

Checked 24 November 2026 against the pages as served from commit `7408458` (14:53 UTC, "writing pass, and one rounding rule"), which landed while the check was running. Every page was rendered again after that commit and the counts below describe that state. Nothing was changed by this check.

## The finding

The fetch scripts read the right columns and the build pools correctly. Rebuilt from the Department for Education's own files, every one of about 1.2 million stored rates agrees with mine to within 0.01 of a percentage point. Of 5,787 figures read off 183 rendered pages, 5,300 matched to one decimal place, 411 differ by 0.1 for reasons of rounding, and 76 are wrong for one cause.

That cause is the one real error in the numbers. **The "a year earlier" figure for a group leaves out every school whose 2024/25 record sits under a predecessor URN**, so a place whose school became an academy during the year is compared with a smaller set of schools than it has now. It touches 848 of the 5,762 group-and-phase views (15%), changes at least one displayed figure on 758 of them, and removes the year-earlier figure altogether from 143 more and from 516 school pages.

Four sentences state something the figures do not support, and one comparison carries the same label on two pages with different schools behind it. These are set out below, most serious first.

## Method

- **Sources, downloaded 24 November 2026.** DfE "Absence - school level - autumn and spring terms combined" (published 15 October 2026) and "Absence rates by school level" (26 March 2026); "Absence by pupil characteristics - autumn and spring terms combined" (15 October 2026); the national rows of "Absence by geographic level" for both releases; the in-year data set `63629501-…` version 4.4 (19 November 2026) and version 3.20 for 2025/26; and the GIAS extracts of 23 November 2026 (establishments, predecessor links, academy group links), the date the tool's own data records.
- **Order of work.** Every figure was computed from those files before `scripts/build_attendance.py` or any fetch script was opened. The scripts were read afterwards, only to diagnose differences.
- **My definitions.** Overall absence is sessions missed over sessions possible; persistent and severe absence are the DfE's counts of pupils missing 10% and 50% or more over enrolments; a group is pooled from the counts of its schools. Rounding to one decimal place is done once, half up, from the unrounded figure.
- **Two comparisons.** (1) Every stored figure in `site/attendance/data/` against mine, for all schools and all groups. (2) A sample of pages rendered with Playwright at 1,500 px, reading the summary, the tiles, the side-by-side table, the tooltips of the year chart, the pupil-group table and the list of schools.
- **Sample.** Python `random.Random(20261124)`, drawn from the DfE files and GIAS, not from the built data. Schools: 8 primary, 8 secondary and 4 special at random, plus URN 141741, 136128 and 107702. The rest of the sample is listed at the end.
- **Verdicts.** "Match" means the displayed figure equals mine at one decimal place. "Rounding" means it is 0.1 away and my unrounded figure explains it. Anything else is named for what it is.

## What was checked

### The stored data, all of it

| What | Compared | Result |
| --- | --- | --- |
| School rates (overall, unauthorised, persistent) for 271,077 school-periods, of which 40,759 are predecessor years | 813,231 | 812,395 identical in hundredths; 836 differ by 0.01; none by more |
| Enrolments for the same school-periods | 271,077 | all identical |
| Pooled rates for 153 local authorities, 48 counties, 543 constituencies, 6,515 wards and 1,139 trusts, every period | 221,205 | 197,543 identical; 23,662 differ by 0.01; none by more |
| Pooled severe absence, the same groups (a rate, or withheld) | 73,735 | all agree, including every case of withholding |
| Local authority and England benchmarks used on school pages | 18,237 | all within 0.01 |
| Pupil-group rates for 153 local authorities and England, 2016/17 to 2025/26 | 59,444 | all within 0.01 |
| Membership of every trust, ward and constituency against GIAS of 23 November | 8,197 groups | identical |
| Schools withheld for fewer than 10 enrolments | 92 school-periods | all withheld |

These group figures match under the tool's own rule for predecessor schools, which I re-implemented from the GIAS links file. The rule itself is discussed under definitions.

My England totals, summed from schools, equal the DfE's own national rows to five decimal places for 2025/26 (two terms), 2024/25 and 2018/19, in every phase.

### 1. Schools (23 pages)

Summary, tiles, side-by-side table (school, local authority and England rows), each point of the year chart, and the sentence beneath it.

| | Figures | Match | 0.1, two-step rounding | 0.1, change taken from shown figures | Wrong |
| --- | --- | --- | --- | --- | --- |
| Summary, tiles, table, 2018/19 and 2024/25 | 805 | 680 | 47 | 78 | 0 |
| Other years on the chart | 207 | 199 | 8 | 0 | 0 |

No sampled school is among the 516 that have lost their year-earlier figure; one of them was rendered separately (below).

### 2. England by phase

Overall, persistent and severe absence for 2025/26 (two terms) and 2024/25, the two changes, and severe absence in 2018/19, read from the Birmingham and Patterns pages: 42 figures, 35 match, 4 are 0.1 high from two-step rounding, 3 are changes taken from shown figures.

### 3. Groups

Seven local authorities (Birmingham, Warrington, Lancashire, Sandwell, Rutland, and the single-school City of London and Isles of Scilly), four counties, six constituencies, six wards and six trusts, each phase.

| Group | Figures | Match | 0.1, two-step rounding | 0.1, change taken from shown figures | Wrong: year-earlier figure |
| --- | --- | --- | --- | --- | --- |
| Local authorities (including 2,416 rates in the school lists) | 2,808 | 2,638 | 125 | 20 | 25 |
| Counties | 279 | 246 | 13 | 11 | 9 |
| Constituencies | 705 | 634 | 44 | 12 | 15 |
| Wards | 198 | 180 | 9 | 2 | 7 |
| Trusts (including 66 year-chart points) | 437 | 396 | 15 | 6 | 20 |

The latest pooled overall, persistent and severe figures matched everywhere. So did the change since 2018/19, apart from rounding. Every one of the 76 wrong figures is a year-earlier figure or a change in a year.

Membership: the schools listed on each sampled trust and ward page are the schools GIAS gives, and the header counts match (all 15 trust and ward views sampled). Trust 1337 lists 28 schools; GIAS has 29, the other being closed with no 2025/26 record. The trust with exactly five schools (3543) is pooled for its four primary schools, as the rule says.

### 4. Pupil groups

Birmingham, Doncaster and North East Lincolnshire, primary and secondary; free school meals, SEN support and EHC plan against England, with the other two rows of the table as extras: 210 figures, 198 match, 9 are 0.1 high from two-step rounding, 3 are changes taken from shown figures. None wrong.

### 5. The in-year page

England, Milton Keynes, Warrington and Liverpool, all schools and secondary: year to date, the same point last year, the week from 2 November, and (as extras) the reason tiles, weekday averages and highest day. 96 figures, 94 match, 2 differ by 0.1 for rounding. The DfE's own year-to-date percentages agree.

### 6. Sentences that state a finding

| Sentence | Verdict |
| --- | --- |
| Patterns: free school meals gap, secondary, 9.9% against 6.6%, 3.3 points; 1.7 in 2018/19 | Supported (9.91, 6.58, 3.33, 1.74), using GIAS's free school meals shares |
| Patterns: the same for primary, 6.4% against 4.0%, 2.4 points; 1.4 in 2018/19 | Supported (6.36, 4.01, 2.35, 1.44) |
| Patterns: severe absence in secondary schools 3.9%, from 1.3%, "2.9 times"; heading "more than doubled" | Supported (3.878, 1.321, 2.94). Primary 2.4 times and special 1.5 times also right |
| Patterns: weekdays in 2025/26, secondary: Fridays 9.7%, Mondays 8.0%, midweek 8.0%; September 6.8%, December 9.6%, July 8.3% | Figures supported. The July figure is one day (see below) |
| Patterns: regions, secondary: lowest London, highest North East, England 8.4% and up 2.9 | Supported. The second half is not (see below) |
| Patterns: regions, primary: rise "smallest in the South West" | Not supported (see below) |
| Patterns: spread of secondary schools, 6.9% to 9.9% in 2024/25; 4.6% to 6.3% in 2018/19 | 2024/25 supported. 2018/19 lower quarter is 4.67%, so 4.7% and a spread of 1.6, not 1.7; a banded estimate, as the method note says |
| Trust page (1337): "inside the band that holds about 95% of trusts of its size"; 293 trusts; 8.4% together; 6,277 pupils | Position and counts supported. "About 95%" is not (see below) |
| School page (141741): middle school 8.0%; 35% higher, 65% lower | Supported (7.96, 34.8%, 65.2%) |
| School page (141741): higher than in 2018/19 at 98% of secondary schools; middle school up 2.8; 3,329 schools | Supported (97.7%, 2.81, 3,329) |
| Birmingham: 89 schools from 2.4% to 27.9%; 53 below England; 49 authorities lower and 101 higher | Supported exactly |
| Birmingham, free school meals: 9.2% against 5.8%, a gap of 3.4, "against 6.6 across England"; 17 authorities lower and 133 higher | Supported, except that England's gap is 6.54, so 6.5 |
| In-year, England: 5.7%, 0.2 lower than last year (5.9%); highest on Friday 16 October at 7.0% | Supported (5.73, 5.88, 6.99) |
| In-year: "lower … in 102 of 151 local authorities and higher in 22" | Supported only at one decimal place (see below) |
| Derby special schools: "4.0 points higher than … a year earlier (10.7%)" | Not supported: the year-earlier error |

### 7. Small numbers

- No severe absence appears on any of 36 school pages, and no school-level file in `site/attendance/data/` carries the count.
- All 13 schools with fewer than 10 enrolments in 2025/26 show "No rate is shown for this school", with dashes in the table.
- Three wards with one or two primary schools (E05011139, E05011211, E05012056) show no pooled figure, only the list of schools.
- Across all the data, no group is pooled from fewer than three schools of a phase, no trust with fewer than five schools is pooled, and no severe figure rests on fewer than 10 pupils.

## Mismatches, most serious first

### 1. The year-earlier figure leaves out schools that changed URN. An error, in the build

`raw_history()` in `scripts/build_attendance.py` joins a predecessor's records only for full school years (`not p.endswith('AS')`). The 2024/25 two-term record of a school that converted during or after that year stays under its old URN and is never joined. The latest figure counts the school; the year-earlier figure does not.

Scale, from all the data: 848 of 5,762 group-and-phase views pool the earlier figure from fewer schools than the latest (151 local authority, 80 county, 273 constituency, 146 ward, 198 trust). On 758 at least one displayed figure differs from the like-for-like one; overall absence is out by 0.5 points or more on 59 and persistent absence by 1.0 or more on 159. A further 143 views, and 516 school pages, show no year-earlier figure although the DfE published one.

| Page | Figure | Displayed | Mine, like for like | Difference |
| --- | --- | --- | --- | --- |
| `/attendance/group/?k=a&id=E06000015&phase=X` (Derby, special; 6 of 7 schools) | Overall a year earlier | 10.7% | 13.8% | −3.1 |
| | Overall, in a year | +4.0 | +0.9 | +3.1 |
| | Persistent a year earlier | 32.8% | 38.7% | −5.9 |
| | Severe a year earlier | 3.4% | 8.1% | −4.7 |
| `/attendance/group/?k=t&id=16956&phase=P` (7 of 9 schools) | Overall a year earlier | 4.4% | 6.0% | −1.6 |
| | Persistent, in a year | +8.2 | +0.8 | +7.4 |
| `/attendance/group/?k=t&id=2932&phase=X` (3 of 4 schools; not rendered, from the data) | Overall a year earlier | 25.2% | 19.6% | +5.6 |
| `/attendance/group/?k=y&id=west-midlands&phase=X` (63 of 68) | Overall a year earlier | 13.1% | 12.8% | +0.3 |
| | Summary | "unchanged" | up 0.3 | |
| `/attendance/group/?k=w&id=E05016502&phase=P` | Overall a year earlier | 5.8% | 6.2% | −0.4 |
| | Persistent, in a year | −1.7 | −3.1 | +1.4 |
| `/attendance/group/?k=a&id=E08000025&phase=X` (Birmingham, special; 26 of 27) | Persistent, in a year | −2.0 | −1.5 | −0.5 |
| `/attendance/group/?k=c&id=E14001140&phase=P` | Overall, in a year | −0.2 | 0.0 | −0.2 |
| `/attendance/group/?k=t&id=3543&phase=P`, `…id=15795&phase=P` | Year-earlier tiles and both changes | none shown | 4.3% and 5.7% | absent |
| `/attendance/school/?urn=151185` | Year-earlier tiles and both changes | none shown | published under URN 123550 | absent |

These are faults in the tool's comparison, not findings about the places named.

### 2. One label, two sets of schools. A difference of definition between pages

"Overall, since 2018/19" for a local authority means two things. On the authority's own page it follows today's schools back in time. On a school page, the local authority row uses every school open in the authority in each year. Of 435 authority-and-phase pairs, 51 show different figures at one decimal place and 12 differ by 0.25 points or more.

| Page | Row | Displayed |
| --- | --- | --- |
| `/attendance/group/?k=a&id=E06000054&phase=X` | Wiltshire, special, since 2018/19 | −0.3 |
| `/attendance/school/?urn=145198` | Wiltshire special schools, since 2018/19 | +2.1 |

Both are arithmetically right for their definition (three of today's five schools have a 2018/19 figure; six schools were open then). A reader sees opposite signs under the same words. Cause: the build makes two benchmarks (`bench.json` and the group files) and the pages do not say which is which.

### 3. Patterns: the regional sentence names the wrong regions. Wording, from rounding

The sentence ranks regions by the difference of two rounded figures. On the stored figures themselves:

| Page | Sentence | Mine |
| --- | --- | --- |
| `/attendance/patterns/#phase=P` | "The rise was smallest in the South West (1.0 points)" | Smallest in the North East, +1.03. East of England +1.06, South West +1.07 |
| | "largest in London and the West Midlands (1.3 points)" | London alone, +1.35. West Midlands +1.28 |
| `/attendance/patterns/#phase=S` | "largest in the North East and the South West (3.3 points)" | South West alone, +3.37. North East +3.23 |
| | "smallest in London (2.2 points)" | +2.25, so 2.3 |
| `/attendance/patterns/#phase=X` | "risen by 2.7 points across England" | +2.64, so 2.6 |

The margins are small (0.04 between the first and third region for primary schools), which is itself a reason not to name a single region.

### 4. Trust page: the "95%" band holds fewer. Wording

The funnel sentence says a trust sits inside or outside "the band that holds about 95% of trusts of its size". Counting the trusts: 255 of 293 secondary trusts (87%) and 630 of 705 primary trusts (89%) lie inside it, and 97% lie inside the band called 99.8%. The limits are theoretical ones widened for over-dispersion, not observed shares. More than one trust in ten is outside the "95%" band, so "higher overall absence than chance alone would explain" (as on `/attendance/group/?k=t&id=16956&phase=P`) claims more than the band can carry.

### 5. Rates rounded twice. A rounding difference of 0.1, but systematic

The fetch keeps the DfE's percentages to two decimal places, the build pools to two decimal places, and the page rounds that to one. A true 13.248% becomes 13.25 and then 13.3. Of about 5,100 rates read from pages, 275 (about 5%) are 0.1 from the correctly rounded figure, nearly all of them 0.1 too high. It is a rounding difference and I call it that, but it is one-sided and it reaches headline figures:

| Page | Figure | Displayed | Mine | DfE national file |
| --- | --- | --- | --- | --- |
| Every primary school and area page | England primary persistent absence, 2025/26 two terms | 13.3% | 13.248% → 13.2% | 13.24762 |
| Every primary area page | England primary severe absence | 1.1% | 1.046% → 1.0% | 1.04568 |
| Secondary pupil-group tables | England, eligible for free school meals, overall | 12.7% | 12.649% → 12.6% | |
| `/attendance/school/?urn=147626` | Overall absence | 6.8% | 6.749% → 6.7% | |

Cause: fetch and build (two decimal places is one too few to round again from). Storing three decimal places, or the counts, would remove it.

### 6. Changes are the difference of the shown figures. A rounding difference of 0.1, by design

Since commit `7408458` every change is the difference of the two figures as displayed. That makes each page consistent with itself: before the commit the summary and the table disagreed by 0.1 on 31 of 104 sampled pages, and now on none. The cost is that 136 of about 530 changes checked are 0.1 from the true change. Examples: England special schools since 2018/19, shown +2.7, true +2.64; school 141741 since 2018/19, shown +3.6, true +3.65; England primary persistent absence in a year, shown 0.0, true −0.07. Mismatch 3 is where this choice turns into a wrong statement.

### 7. In-year page: the count of authorities. Wording

`/attendance/`: "lower than at the same point last year in 102 of 151 local authorities and higher in 22". The count ignores differences that do not show at one decimal place and does not say so. Unrounded, absence is lower in 114 and higher in 37. Rounded once from the unrounded figures it is 101 and 24. The 27 authorities counted as "the same" are not mentioned in the sentence.

### 8. Patterns: "July averaged 8.3%" for secondary schools is one day. Wording

The 80% rule blanks 12 of the 13 July days for secondary schools in 2025/26. The July average is 1 July 2026 alone (8.34%). The key explains the blanks; the sentence does not.

### 9. Two smaller points

- `/attendance/group/?k=a&id=E08000025&phase=X`, pupil groups: "No identified SEN" shows persistent 100.0% and severe 100.0%. The figures are the DfE's and are right, but the group is 18 pupils. The under-10 rules pass it; the effect is to state that every one of 18 pupils was severely absent.
- A page asked for a phase the place does not have shows another phase without saying so (`/attendance/group/?k=a&id=E06000053&phase=P` lists the one secondary school).

## Where practice differs from the stated method

1. **Local authority membership is not from GIAS.** It is the local authority code in the DfE absence file. That is the better choice: GIAS gives 284 of these schools the placeholder `X999999` and has moved Barnsley and Sheffield to new codes. The method should say so. Trust, ward and constituency membership is from GIAS, as stated.
2. **Pooling is from rounded percentages, not counts.** Sessions missed are rebuilt as the DfE's percentage (two decimal places) times sessions possible. The effect is at most 0.01 points, but see mismatch 5.
3. **"Today's schools in every year" follows only a single, plain predecessor.** A school with one GIAS link of type "Predecessor" inherits that school's full years. Merged, amalgamated and split schools inherit nothing, by design, so their pupils are missing from the group's earlier years. Following every kind of link instead would move the 2018/19 overall figure by 0.1 or more for 8 of 435 authority-and-phase pairs, but would double count split schools, so I do not say the tool's rule is wrong. Two-term periods are not followed at all, which is mismatch 1.
4. **England and the school-page local authority benchmark are every school open at the time**, with each school placed in the phase of its latest record. School counts differ from the DfE's by one or two in some years; rates agree.
5. **A period needs three schools with figures in that period**, so the number of schools behind a group's line changes from year to year. The tooltip gives the count.
6. **"Trusts" includes foundation-school trusts.** Any GIAS "Trusts (code)" counts. Trust 1337 is one: 28 maintained foundation schools, with no joining dates, which the page says. A trust page exists for any trust with two or more schools that have a 2025/26 record; a closed school still linked in GIAS is not counted.
7. **Severe absence for pupil groups is withheld at 10 as well as below it** in 26 cases, because the test multiplies a rounded rate by enrolments. Stricter than "fewer than 10", so harmless. County pupil-group severe absence is withheld if any of its authorities is.
8. **Schools with fewer than 10 enrolments still count in pooled figures.** They are only not shown individually.
9. **In-year.** "All schools" is the sum of the three phases, not the DfE's own row (they agree). "The same point last year" is the same calendar date, 6 November 2025, a Thursday, against a Friday this year; taking the same week instead moves England from 5.88% to 5.89%. Days with fewer than 80% of the usual sessions are dropped from daily figures and weekday averages.
10. **Free school meals fifths** use the census file; the cut points on the page (2% to 76.5% for secondary) differ a little from GIAS's shares (1.3% to 77.3%).

## What I could not check

- **The free school meals charts exactly.** I did not download the 2.8 GB census file. GIAS carries free school meals shares from the same January 2026 census, and with those the overall-absence fifths agree to 0.1. The persistent-absence gap for secondary schools is 12.7 on my grouping against 12.5 shown, and the top twentieth of special schools is 25.2% against 26.5% shown; I cannot say whether that is the different source or a fault.
- **Similar schools, school circumstances and the Ofsted grade** on school pages.
- **Illness and unauthorised-holiday rates** in the school files. Unauthorised absence was checked and matched.
- **Anything drawn but not written**: map colours, the distribution and funnel dots, the school-by-school circles, the calendars. Only the year chart's tooltips were read.
- **Other views of a group page**: "Change in a year", "Change since 2018/19", the persistent and severe measures, pupil-group maps, and side-by-side comparisons (`vs=`). Only the default view of each phase was read. I did not confirm whether pupil-group figures for the two single-school authorities (City of London, Isles of Scilly), which are in the data files but not on their own pages, appear as marks on other authorities' pupil-group charts.
- **Trust joining dates and "came from another trust"**, beyond their use in the year chart, which matched.
- **Ward maps and boundaries**, the Start here and briefing pages, the Pages Function address `/attendance/school/<urn>/`, and any width but 1,500 px.
- **GIAS after 23 November.** The extract of 24 November closes three schools (141103, 150212, 151001) and removes them from their trusts.
- **Anything committed after `7408458`.**

## The sample

Seed 20261124.

- Schools: 118728, 100341, 104807, 115690, 149419, 150905, 117741, 147626 (primary); 138184, 148790, 141369, 136643, 114590, 149771, 146793, 100053 (secondary); 104977, 116634, 147874, 138935 (special); 141741, 136128, 107702.
- Local authorities: E08000025, E06000053 and E09000001 (the two smallest, one school each), E06000007, E10000017, E08000031, and E06000017 added as a small authority with pooled figures.
- Counties: Kent, West Midlands, Staffordshire, Gloucestershire.
- Constituencies: E14001137, E14001140, E14001604, E14001323, E14001230, E14001523.
- Wards: E05015520, E05013475, E05012106, E05012496, E05015938, E05016502; and, for the small-number rule, E05011139, E05011211, E05012056.
- Trusts: 1337, 3543 (exactly five schools), 16467, 3025, 17399, 15795.
- Pupil groups: E08000025, E08000017, E06000012. In-year: England, E06000042, E06000007, E08000012.
- Schools with fewer than 10 enrolments: 109476, 110405, 112803, 114065, 115703, 117064, 121480, 122294, 123756, 142250, 145341, 150249, 151001.
- Rendered in addition, to show the worst cases: `k=a&id=E06000015&phase=X`, `k=t&id=16956&phase=P`, `urn=151185`, `k=a&id=E06000054&phase=X`, `urn=145198`.
