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

## Re-run at 6f69be2

Run again on 24 November 2026 against commit `6f69be2` ("errors found by the independent figures check, fixed") with the data as rebuilt at that commit. Same seed (20261124), same sample, same 183 pages. The DfE files were downloaded afresh, and GIAS was taken from the extract of 24 November, the date the refetched data now records. My figures were recomputed before the changed scripts were read. Two of my definitions follow the tool's new ones, re-implemented from the primary files: an area is every school there in each period; a trust is today's schools followed back through a single plain predecessor, now for two-term periods as well.

### The finding

The one real error is gone. No year-earlier figure anywhere now leaves a school out, and no group or school lacks one that the DfE published. Of 5,787 displayed figures, 5,647 match to one decimal place, 133 are changes shown as the difference of the displayed figures (deliberate, not counted as errors), and 7 do not match: 4 pooled overall rates 0.1 out, 2 figures shown to two decimal places that are now 0.01 low, and 1 year-earlier severe figure not shown.

Two things remain wrong in the stored data. Pooled overall and unauthorised absence still land on the wrong tenth in about 1.3% of cases. And the fix for rounding has newly broken the two figures on the in-year page that are shown to two decimal places.

### Counts

Stored data, all of it:

| What | Compared | Result |
| --- | --- | --- |
| School rates (overall, unauthorised, persistent), 271,593 school-periods | 814,779 | all within 0.01; all show the right tenth except 23 exact ties at x.x5 |
| Enrolments | 271,593 | all identical |
| Pooled overall and unauthorised absence, every area and trust, every period | 139,836 | all within 0.02; 1,829 (1.3%) show the wrong tenth |
| Pooled persistent absence | 69,918 | all within 0.01; all show the right tenth |
| Pooled severe absence (a rate, or withheld) | 69,918 | all agree; all show the right tenth |
| School-page benchmarks (England and local authority) | 24,368 | all within 0.02; 116 overall or unauthorised rates show the wrong tenth |
| Pupil-group rates, 153 local authorities | 68,661 | all show the right tenth; none withheld at a count of exactly 10; none shown for a group under 50 with 0% or 100% persistent absence |
| Number of schools behind every pooled figure | 69,918 | identical to mine |
| Membership of every trust against GIAS of 24 November | 1,139 | identical |

Pages:

| Group | Figures | Match | Change taken from shown figures (0.1) | Does not match |
| --- | --- | --- | --- | --- |
| Schools (23 pages) | 1,012 | 942 | 70 | 0 |
| England by phase | 42 | 40 | 2 | 0 |
| Local authorities | 2,808 | 2,789 | 16 | 3 |
| Counties | 279 | 271 | 8 | 0 |
| Constituencies | 705 | 692 | 13 | 0 |
| Wards | 198 | 191 | 7 | 0 |
| Trusts | 437 | 425 | 10 | 2 |
| Pupil groups | 210 | 204 | 6 | 0 |
| In-year page | 96 | 93 | 1 | 2 |
| All | 5,787 | 5,647 | 133 | 7 |

At `7408458` the same sample gave 5,300 matches, 275 rates 0.1 out, 136 changes and 76 wrong. The 133 changes are about a quarter of the 530 or so changes checked; each is within 0.1 of the true change.

Small-number rules hold as before: no severe absence on any of 36 school pages, no rate for the 13 schools under 10 enrolments, no pooled figure for the three small wards. No page raised a console error.

### What still does not match

**1. Pooled overall and unauthorised absence: the wrong tenth in about 1 case in 75. Build.** The build now recovers each school's sessions missed from its stored rate. That rate is held to 0.01 of a point and, since this commit, is stepped back by 0.01 wherever it rounded up to a 5. The pooled figure therefore carries an error of up to about 0.01, which is enough to cross a tenth, and `hund()` then steps the pooled figure back as well. Of 69,918 pooled overall figures, 897 show a tenth that is not the true one (about 70% of them 0.1 too low); for unauthorised absence it is 932. Persistent and severe absence are unaffected, because pupil counts recover exactly. This was about 5% before, so it is much reduced, not removed. Seen in the sample:

| Page | Figure | Displayed | Mine | Difference |
| --- | --- | --- | --- | --- |
| `/attendance/group/?k=a&id=E08000025&phase=P` | Overall a year earlier (summary and tile) | 5.8% | 5.850% → 5.9% | −0.1 |
| `/attendance/group/?k=a&id=E06000007&phase=X` | Year chart, 2024/25 | 13.9% | 13.951% → 14.0% | −0.1 |
| `/attendance/group/?k=t&id=1337&phase=X` | Year chart, 2023/24 | 9.4% | 9.453% → 9.5% | −0.1 |
| `/attendance/group/?k=a&id=E06000015&phase=X` (outside the sample) | Overall a year earlier | 13.7% | 13.751% → 13.8% | −0.1 |

The cause is that sessions missed are not kept. The DfE files give the count (`sess_overall`, `sess_unauthorised`); storing it would make every pooled figure exact and remove the need to recover anything.

**2. Figures shown to two decimal places are now 0.01 low. Build; newly broken by this commit.** The step back in `hund()` is right for a figure that will be rounded again to one decimal place and wrong for one that is shown as stored. The in-year page shows unauthorised holiday to two decimal places (`pc(y.hol_u, 2)`, and the reasons tooltip does the same):

| Page | Figure | Displayed | Mine | DfE's own figure |
| --- | --- | --- | --- | --- |
| `/attendance/` | Unauthorised holiday, England, all schools | 0.44% | 0.449% → 0.45% | 0.45 |
| `/attendance/#phase=S` | Unauthorised holiday, England, secondary | 0.34% | 0.345% → 0.35% | 0.35 |

Any stored rate that rounded up to a 5 is affected, about one in twenty.

**3. One year-earlier severe figure is not shown.** `/attendance/group/?k=t&id=3543&phase=P`: the data holds severe absence a year earlier (2.8%, more than 10 pupils), but the tile shows nothing because the latest figure is withheld. A choice of the page, not an error in a number.

### The nine original findings

| | Finding | Now |
| --- | --- | --- |
| 1 | Year-earlier figure left out schools that changed URN | **Resolved.** Every pooled figure rests on the same number of schools as mine, in every period. Derby special schools now show a year earlier 13.7% and +1.0 (true 13.75% and +0.9; the 0.1 is item 1 above). Trust 16956 shows 6.0% and persistent +0.8, as it should. School 151185 shows 4.3% a year earlier (4.325%). Trusts 3543 and 15795 now have year-earlier figures. |
| 2 | "Since 2018/19" for a local authority meant two sets of schools | **Resolved.** Wiltshire special schools show +2.0 on both pages (true +2.01). All area figures now equal the school-page benchmark. |
| 3 | Patterns regional sentence named the wrong regions | **Resolved** as to the regions: North East for the smallest primary rise, London alone for the largest, South West alone for the largest secondary rise. The sizes quoted are still differences of the shown figures, so the North East's rise reads 1.1 where it is 1.03, London's secondary rise 2.2 where it is 2.25, and England's special rise 2.7 where it is 2.64. See 6. |
| 4 | Funnel band said to hold about 95% held 87% to 89% | **Resolved.** The band holds 669 of 705 primary trusts and 278 of 293 secondary trusts, 94.9% each, and the sentence no longer mentions chance. |
| 5 | Rates rounded twice, 0.1 too high in about 5% | **Partly resolved.** School rates, pupil groups, England, and all persistent and severe figures now show the DfE's tenth (England primary persistent absence 13.2%, severe 1.0%). Pooled overall and unauthorised absence are still wrong in 1.3% of cases (item 1 above), and the fix has broken two-decimal figures (item 2 above). |
| 6 | Changes are the difference of the shown figures | **Unchanged, by decision.** 133 of about 530 changes checked differ from the true change by 0.1. Not counted as errors. |
| 7 | In-year count of authorities ignored small differences | **Resolved.** The page says lower in 114 of 151 and higher in 33; unrounded it is 114 and 37. The four that differ are equal to the hundredth. Secondary: 109 and 41 shown, 109 and 42 unrounded. The code comment says "unrounded"; it counts on stored hundredths. |
| 8 | Secondary "July averaged" rested on one day | **Resolved.** The sentence now gives March (8.8%; mine 8.81%, 20 days) and drops July. Primary and special keep July, with 13 and 12 days. |
| 9 | Smaller points | **Partly resolved.** The 18-pupil group is gone, and no group under 50 with 0% or 100% persistent absence is shown anywhere. The 2018/19 lower quarter for secondary schools still reads 4.6% (4.67%), a banded estimate the method note declares. A page asked for a phase the place lacks still shows another phase without saying so. |

### Not re-checked

The limits listed under "What I could not check" stand. In addition, the similar-schools match re-run on 24 November was not examined, and only the default view of each group page was read again.

## Third pass at 13e6f7c

A scoped pass on 24 November 2026 against commit `13e6f7c`, with the data as built at that commit. The DfE school files, the in-year data set (version 4.4) and GIAS of 24 November were downloaded again and every figure recomputed from them. Fresh sample, seed 20261125: 210 schools (90 primary, 80 secondary, 40 special), 10 local authorities, 5 counties, 8 constituencies, 8 wards and 9 trusts, plus the in-year page for England and 6 authorities in all four phase views. The four pages whose pooled rates showed the wrong tenth last time are in the sample.

The pages were rendered after commit `3cfe126` had also landed. It adds a feedback form (`chrome.js`, `attendance.css`) and touches neither the data nor the code that draws figures; the data checked was built at 15:24 UTC, before `13e6f7c`.

**Both faults from the re-run are fixed. No rate anywhere in the stored data now shows the wrong tenth, and the two-decimal in-year figures are right.** One difference of definition remains on the in-year page, set out below.

| What | Checked | Match | Not matching |
| --- | --- | --- | --- |
| (a) Pooled overall, unauthorised and persistent absence, every area and trust, every period, stored | 209,754 | 209,754 show the true tenth | 0 |
| (a) Pooled severe absence, stored (a rate, or withheld) | 69,918 | 69,918 | 0 |
| (a) England and local authority benchmarks, stored | 24,368 | 24,368 | 0 |
| (a) Group pages, 104 views: rates displayed | 4,873 | 4,872 | 1 not shown |
| (a) Group pages: changes displayed | 332 | 238 | 94 are the difference of the shown figures, 0.1 from the true change (by decision) |
| (a) Group pages: schools listed and header counts against GIAS | 184 | 184 | 0 |
| (b) School rates, all 21,223 schools, every period, stored | 814,779 | 814,779 show the true tenth | 0 |
| (b) School pages, 210: rates displayed | 6,720 | 6,717 | 3 sentences give no figure because they say "the same" |
| (b) School pages: changes displayed | 2,520 | 1,905 | 606 are the difference of the shown figures; 9 sentences say "the same" where the true gap is under 0.1 |
| (c) In-year page, 28 views: year to date, authorised, illness, unauthorised | 112 | 110 | 2 (definition, below) |
| (c) In-year page: unauthorised holiday, two decimal places | 28 | 28 | 0 |
| (c) In-year year-to-date figures at two decimal places, all 163 areas, stored | 4,501 | 4,495 against the DfE's rows; all against the sum of phases | 6 (definition, below) |

The pages that failed last time now read: Birmingham primary a year earlier 5.9% (5.850%); Warrington special 2024/25 14.0% (13.951%); trust 1337 special 2023/24 9.5% (9.453%); Derby special a year earlier 13.8% (13.751%). Unauthorised holiday for England reads 0.45% for all schools and 0.35% for secondary, as the DfE has them.

### What does not match

1. **In-year "all schools" is the sum of the three phases, not the DfE's all-schools row.** In 10 of 163 areas the DfE's row holds a few more sessions than primary, secondary and special together. It changes a displayed figure in one area in the sample: `/attendance/#area=E09000021` shows overall absence since September 4.7% and authorised absence 3.3%; the DfE's all-schools row gives 4.753% (4.8%) and 3.352% (3.4%); the three phases summed give 4.749% and 3.349%. At two decimal places 6 of 805 all-schools figures differ from the DfE's row by 0.01. The stored figures equal the sum of phases in every case, so this is a choice of definition, present since the first check, and not an arithmetic fault. Reading the DfE's own row for "all schools" would remove it.
2. **One year-earlier severe figure is still not shown** on `/attendance/group/?k=t&id=3543&phase=P` (2.8% a year earlier; the tile is blank because the latest figure is withheld). A choice of the page.

### (d) Counts and small numbers

- No file under `site/attendance/data/` carries sessions missed, or pupils persistently or severely absent, for a single school. Each school-period holds enrolments and five rates; all 271,593 were compared with my rates and match. The distribution, index and group files hold enrolments and rates only.
- Severe absence is withheld wherever fewer than 10 pupils are severely absent and wherever fewer than three schools are pooled: 34,126 withheld figures agree with mine, and none is shown that should be withheld. It appears for no single school.
- No page raised a console error.

Not re-checked in this pass: pupil groups, the Patterns page, and the sentences.

### Acted on after the third pass

The in-year "all schools" figure now reads the DfE's own all-schools row (`fetch_attendance.py` keeps it as phase `A`; `build_attendance.py` falls back to the three phases summed only where a file has none for a day). Both years were refetched on 24 November 2026. The area the checker cited, `E09000021`, now stores overall 4.75 and authorised 3.35, shown as 4.8% and 3.4%, as the DfE has them. Not yet re-verified independently. The year-earlier severe figure left unshown where the latest is withheld stays as it is: showing it would invite a reader to infer the withheld one.

## Fourth pass at 1e1ccc7

Run on 24 November 2026 against the data built at 19:23 UTC for commit `1e1ccc7`. Pages were rendered between 19:28 and 19:34, by which time `4ac6103` and `8750b8c` had also landed (share titles, a scheduled refresh, print and tap-target styles; no change to figures). The DfE school files, the pupil-characteristics file, both years of the in-year data set and GIAS of 24 November were downloaded again and every figure recomputed from them. Fresh sample, seed 20261126: 120 schools (50 primary, 50 secondary, 20 special), 10 local authorities, 5 counties, 8 constituencies, 8 wards, 9 trusts; the in-year page for England, all nine regions and 10 authorities including E09000021; and the Patterns page in six views. 256 pages in all, with 16,429 hover texts read.

**Every change and gap on the school, area and trust pages is now the true difference rounded once: 1,780 of 1,780. No sentence says "the same" where the true gap rounds to 0.1 or more, and none names the wrong direction.** Four things do not match, all smaller than what came before, and they are listed below.

### Counts

| | Checked | Match | Not matching |
| --- | --- | --- | --- |
| (a) Changes and gaps displayed, school pages (120) | 1,440 | 1,440 | 0 |
| (a) Changes and gaps displayed, 104 area and trust views | 340 | 340 | 0 |
| (a) Sentences saying "the same" or "unchanged" | 21 | 21 (true gap rounds to 0.0) | 0 |
| (a) Direction named against the true sign | 1,780 | 1,780 | 0 |
| (b) Rates displayed, school pages | 3,840 | 3,840 | 0 |
| (b) Rates displayed, area and trust views (with school lists) | 4,416 | 4,416 | 0 |
| (b) Rates stored, every school and period | 814,779 | 814,507 show the true tenth | 272 (item 1) |
| (b) Pooled rates and severe absence stored, every area and trust, with the benchmarks | 304,040 | 303,931 | 109 (item 1) |
| (b) Stray decimal places: 256 pages, text, tables, chart labels, 16,429 hover texts | 256 | 256 | 0 |
| (c) In-year "all schools", 20 areas: rates at one decimal place | 116 | 116 | 0 |
| (c) In-year "all schools": changes and gaps | 35 | 35 | 0 |
| (c) In-year "all schools": figures at two decimal places | 20 | 20 | 0 |
| (c) In-year "all schools" stored, all 163 areas, against the DfE's published percentages | 1,127 | 1,127 at one and at two decimal places | 0 |
| (c) In-year, other phases, stored, against the DfE's year-to-date row | 3,374 | 3,332 | 42, in 9 authorities' special schools (item 4) |
| (d) Pupil groups, 9 local authorities: rates | 702 | 702 | 0 |
| (d) Pupil groups, local authorities: changes and gaps | 171 | 165 | 6 (item 2) |
| (d) Pupil groups, 5 counties: rates | 402 | 400 | 2 (item 3) |
| (d) Pupil groups, counties: changes and gaps | 97 | 94 | 3 (item 2) |
| (d) Patterns: rates (regions, England, severe absence, weekdays and months) | 44 | 44 | 0 |
| (d) Patterns: changes, and the regions named lowest, highest, smallest and largest | 36 | 36 | 0 |
| (d) Patterns: spread of schools (banded estimates) | 24 | 21 | 3, as before: 4.6% for 4.67%, 1.7 for 1.63, 15.1% for 15.17% |
| (d) Summary sentences on school, area and trust pages (in the rows above) | 224 pages | all | 0 |

`/attendance/#area=E09000021` now reads 4.8% and 3.4%, as the DfE's all-schools row does. Membership and the number of schools behind every pooled figure are unchanged and still agree. No page raised a console error.

Stored figures are otherwise exact: every one of the 1.1 million rates agrees with mine to the fourth decimal place of a per cent.

### What does not match

**1. A rate a hair under a half-tenth is stored as the half-tenth and shows 0.1 too high. Build.** Rates are kept to two decimal places of a hundredth and the page rounds once more. A true 6.44997% is stored as 645.00 and shown as 6.5%; it should be 6.4%. This is the last trace of rounding twice. It affects 381 stored figures in about 1.1 million (272 school rates, 109 pooled), always upwards. None fell in the page sample. Examples from the data:

| Where | Source figure | Stored | Shown |
| --- | --- | --- | --- |
| School 145489, overall absence, 2018/19 | 3,544 of 54,946 sessions, 6.44997% | 645.00 | 6.5% |
| `/attendance/group/?k=t&id=16617&phase=S`, overall absence, 2025/26 two terms | 6.04997% | 605.00 | 6.1% |
| `/attendance/group/?k=w&id=E05016503&phase=P`, persistent absence, 2025/26 two terms | 11.54997% | 1155.00 | 11.6% |

Rounding to the tenth from the counts at build, or keeping one more decimal place, would remove it. Exact ties do not arise in these 381: of the 219 school cases tested against the counts, none is a true x.x5.

**2. Pupil-group changes and gaps are not yet the true difference. Fetch.** `la_groups.csv` still holds each group's rates as whole hundredths, stepped back from a rounded-up 5, so a change computed from them can be 0.1 out. Across every authority, 158 of 3,352 pupil-group "overall, in a year" figures differ from the true change. In the sample:

| Page | Figure | Shown | Source |
| --- | --- | --- | --- |
| `k=a&id=E06000015&phase=P` | EHC plan, overall in a year | +0.7 | +0.64 (10.787% from 10.148%) |
| `k=a&id=E06000004&phase=S` | SEN support, overall in a year | +0.2 | +0.14 |
| `k=a&id=E06000004&phase=S` | Free school meals gap, sentence | 6.9 | 6.85 |
| `k=a&id=E10000025&phase=S`, `k=y&id=oxfordshire&phase=S` | Free school meals gap, sentence | 10.6 | 10.55 |
| `k=a&id=E06000016&phase=P` | No identified SEN, overall in a year | −0.4 | −0.34 |
| `k=a&id=E06000051&phase=S` | No identified SEN, overall in a year | +0.2 | +0.15 |
| `k=y&id=surrey&phase=P`, `phase=X` | Free school meals gap, sentence | 5.1, 6.3 | 5.04, 6.25 |

**3. County pupil-group rates are pooled from rounded authority rates. Build.** Two of 402 show the wrong tenth: `k=y&id=dorset&phase=P`, EHC plan severe absence 5.7% (5.7506%, so 5.8%); `k=y&id=derbyshire&phase=P`, no identified SEN persistent absence 9.8% (9.7497%, so 9.7%). Keeping the DfE's counts for pupil groups, as is now done for schools, would settle items 2 and 3 together.

**4. In-year special-school figures in nine authorities are not the DfE's year-to-date figure. Build; present since the first check, found now.** The tool sums the daily rows. Where the DfE withholds some days for a phase, its own year-to-date row covers more than those days add up to:

| Authority, special schools | Shown | DfE year-to-date row | Days withheld |
| --- | --- | --- | --- |
| Barnsley | 15.2% | 14.89% | 3 |
| Bracknell Forest | 9.1% | 9.41% | 3 |
| Shropshire | 14.2% | 14.31% | 1 |
| Sutton | 12.7% | 12.79% | 5 |
| Windsor and Maidenhead | 10.1% | 10.15% | 1 |
| Nottingham | 12.9% | 12.95% | 5 |
| Kingston upon Thames | 11.9% | 11.94% | 5 |
| Brent | 8.6% | 8.55% | 1 |
| Derbyshire | 9.7% | 9.67% | 1 |

The first four differ at one decimal place whichever way a half is rounded. Primary, secondary and all-schools figures agree with the DfE's row in every area.

One effect of the new rule, not an error: a page can now show 5.0% beside "a year earlier 5.1%" and say "unchanged" (`k=y&id=dorset&phase=P`: 5.004% and 5.053%, a true change of −0.05). The change is right; the two shown figures no longer subtract to it.

### (e) Small numbers and the extra precision

- No file under `site/attendance/data/` (642 files) carries sessions missed, or pupils persistently or severely absent, for a single school. A school-period holds enrolments and five rates.
- Severe absence is withheld under 10 pupils and under three schools in every stored figure, and is never given for a single school. No pupil group under 10 is stored or shown, and none under 50 with 0% or 100% persistent absence.
- **What the extra decimal places make inferable.** About pupils, nothing new. The number of pupils persistently absent could already be worked out exactly for every one of the 21,210 schools shown, from the published enrolments and the rate in hundredths, and for 97% of them from the one-decimal figure on the page. Severe absence for a school is still not stored at any precision.
- About sessions, something new. At hundredths, a school's rates fitted thousands of possible totals. At four decimal places, overall and unauthorised absence together fit one total of sessions possible, and so one count of sessions missed, for 46 of 112 sampled schools with fewer than 100 pupils (46 of 600 sampled overall), and a handful of totals for most other small schools. So the session counts that the build takes care not to write to a school's record can be recovered for small schools. They are totals across a whole school, not counts of pupils, and the DfE publishes them for every school in the open file this tool reads. I see no harm, but the statement "the counts are never written to a school's record" is no longer true in effect for small schools.

### Not checked

Captions on saved images (not rendered); maps and other drawn marks beyond their hover text; similar schools; the free school meals fifths exactly (GIAS shares give the overall-absence fifths to within 0.1 and cannot confirm the persistent-absence ones); views of the group page other than the default.

## Fifth pass at 7ffe02d: enforcement

Begun on 24 November 2026 against `7ffe02d` and finished against `e8328b5`, which replaced the "where notices are not used" table with a flag while the pass was running. Everything below was rendered at `e8328b5`, with `prm.json` as built at 20:09 UTC. Recomputed from files downloaded that evening: the DfE's "Parental responsibility measures" 2024/25 (published 29 January 2026), the school-level and local-authority absence files for 2024/25, and the pupil-characteristics file for the autumn and spring terms. The DfE's statutory guidance on gov.uk could not be reached from this session, so the rules were checked against the publication's own methodology page.

Sample, seed 20261127: 40 local authorities (34 drawn, including the two smallest, six with counts of 1 to 9 and four with recorded zeros, plus every flagged authority not already drawn) and 8 counties; Patterns in all 42 pairings of enforcement measure, comparison and measure; and all 201 authority and county pages swept for a flag.

**The counts are right. Every one of 58,178 stored counts, zeros, masks and missing figures agrees with the DfE's file, county sums included, and every count, rate for every 1,000 and 10,000 pupils, "N of M" sentence and "authorities recording none" on the sampled pages matches.** Seven things are wrong or claim too much. The two that matter most: one of the ten flags rests on rounding, and a count shown as "fewer than 10" can be worked out exactly from other figures the tool publishes.

### Counts

| | Checked | Match | Not matching |
| --- | --- | --- | --- |
| Stored counts, all areas and years, against the DfE file (zero, 1 to 9 masked, not supplied) | 58,178 | 58,178 | 0 |
| (a) Counts as words on pages: number, None, fewer than 10, dash | 887 | 887 | 0 |
| (a) Notices for every 1,000 pupils, place and England | 330 | 330 | 0 |
| (a) "N of M local authorities issued more for their size", "as did N other" | 72 | 72 | 0 |
| (a) Other legal measures: for every 10,000 pupils, place and England | 618 | 618 | 0 |
| (a) "Authorities recording none", every row and lateness | 480 | 480 | 0 |
| (a) Year by year, notices for every 1,000 (hover), place and England, 2016/17 to 2024/25 | 1,478 | 1,478 | 0 |
| (a) Outcome shares, where no part is masked | 445 | 445 | 0 |
| (a) Outcome shares, where a part is masked | 15 | 8 | 7 (item 4) |
| (a), (c) Unauthorised holiday and other unauthorised absence, place, tiles and sentences | 384 | 364 | 20 (item 3) |
| (a), (c) The same year by year (hover), place | 768 | 727 | 41 (item 3) |
| (a), (c) The same for England, tiles and hover | 768 | 768 | 0 |
| (b) A count of 1 to 9 given a rate, a bound only, or left off the year line | 49 | 49 | 0 |
| (d) Correlation sentences: authorities counted, words for strength, direction | 126 | 126 | 0 |
| (d) Rank correlation | 42 | 40 | 2, by 0.01 |
| (d) Correlation allowing for free school meals | 42 | 40 | 2, by 0.01 |
| (d) Scatter hover text: notices for every 1,000 | 876 | 876 | 0 |
| (d) Scatter hover text: absence | 876 | 846 | 30 (item 3) |
| (d) "How many local authorities used each measure" | 11 measures | 11 | 0 |
| (d) Most and fewest tables: names, rates, numbers | 144 | 144 | 0; the column heading is wrong (item 5) |
| (d) Flagged authorities | 10 | 9 | 1 (item 1) |
| (d) Flag table on Patterns: figures | 71 | 70 | 1 (item 1) |
| (d) Boxed flag on the ten authority pages: figures and thresholds | 88 | 83 | 5 (item 6) |
| (d) Flag shown only where it should be: 153 authorities and 48 counties | 201 | 200 | 1 (item 1); no county is flagged |

(c) in a sentence: unauthorised holiday absence and other unauthorised absence pooled from the DfE's school file are **identical** to the DfE's own local-authority figures for all 153 authorities in 2024/25 and for the 144 that existed in 2018/19. The tool's stored figures are within 0.01 of a point of both; item 3 is about that 0.01.

No page raised a console error.

### What does not match, most serious first

**1. One of the ten flags rests on rounding. Fetch (pupil-group rates held as whole hundredths).** On the DfE's figures 9 authorities meet both conditions, not 10. West Northamptonshire's severe absence among pupils eligible for free school meals is 4.9512%; the 75th percentile is 4.9520%. It falls short by 0.0008 of a point. The tool holds both as 4.95 and flags it. Stockport is on the other side by the same margin (4.9528%) and is rightly flagged. The first condition is right: the lowest quarter ends at 0.84 for every 1,000 pupils (shown as 0.8) and 38 authorities meet it. The second holds in 32 of the other 113, as the note says, and in 9 of the 38, not 10. A flag that names a place should not turn on the fourth decimal place; either the exact figures should decide it or there should be a margin.

**2. A count shown as "fewer than 10" can be recovered. Build and page.**
- *From the pages.* County figures are summed before masking, and a county page shows its total. Where one authority in a county is masked and the others are not, subtraction gives the masked count. In 2024/25 this is so for 29 figures among the measures shown. Example: `k=y&id=berkshire` gives 367 notices for other unauthorised absence; its other five authorities' pages give 137, 15, 15, 191 and none; West Berkshire's "fewer than 10" is therefore 9.
- *From the data file.* `prm.json` holds the total issued beside its parts. Notices issued equal holiday plus lateness plus other, and also paid plus withdrawn plus prosecuted plus unresolved, exactly. Where one part is masked the rest give it: 64 figures in 2024/25 (47 by reason, 17 by outcome), 521 over all years. The pages do not print the total issued, so this route needs the file.
- On the pages themselves the rule is otherwise kept: a recorded zero always reads None, a count of 1 to 9 always reads "fewer than 10" with its rate given only as a bound ("under …") and its year left off the line, and a figure the DfE marks `x` is a dash.
- The DfE publishes every one of these counts unmasked, so nothing is disclosed that is not already public. The point is that the tool's own rule does not hold.

**3. Unauthorised holiday absence is 0.01 too low in about one figure in twenty, and other unauthorised absence 0.01 too high. Fetch.** `school_absence.csv` keeps each school's unauthorised holiday absence as a rate in whole hundredths, stepped back from a rounded-up 5, not as sessions. Pooled, the area rate is biased down by up to 0.01, and "other", which is all unauthorised less holiday, up. These figures are shown to two decimal places, so it shows: 264 of 4,560 stored figures differ from the DfE's at the second decimal place (24 of 404 for 2024/25), nearly all in that direction. Examples for 2024/25: City of London holiday 0.34% (DfE 0.349%), other 0.52% (0.511%); Bristol holiday 0.49% (0.495%); Gateshead 0.58% (0.585%); Hertfordshire 0.36% (0.365%); Kensington and Chelsea other 2.44% (2.435%). England is right. Keeping `sess_unauth_holiday` as a count, as is done for sessions missed, would make these exact. The same cause, in the pupil-group file, puts one scatter figure on the wrong tenth (Sutton, free school meals persistent absence, 31.4% for 31.45%).

**4. "What became of the notices" is wrong where a part is masked. Page.** A part of 1 to 9 is drawn as nothing and left out of the total, so the other shares are too large. Herefordshire (`k=a&id=E06000019`): paid within 21 days shown as 92%, DfE 89.0% of notices issued; prosecuted and unresolved shown as 0%, DfE 1.2% and 1.5%. Richmond upon Thames (`E09000027`): 61% for 59.0%, withdrawn 28% for 26.8%, prosecuted 0% for 2.7%. 19 of 153 authorities have a masked part in this chart.

**5. The most and fewest tables are headed "For every 100 pupils" and hold figures for every 1,000. Page.** Barnsley's 167.2 is 5,275 holiday notices for every 1,000 pupils. All three versions of both tables.

**6. One threshold in the flag is 0.01 out. Fetch, as item 1.** The highest quarter for severe absence among pupils with an EHC plan is given as 8.54% on Patterns and in five boxes (Cornwall, Norfolk, Reading, South Gloucestershire, Warwickshire); it is 8.550%, so 8.55%. The other five thresholds are right (33.9% and 4.95%; 28.2% and 4.61%; 35.7%).

**7. Four correlations differ from mine by 0.01.** Case management against unauthorised holiday absence +0.26 (mine +0.254); case management against severe absence of pupils not eligible −0.10 (−0.105); notices for other unauthorised absence against SEN support, allowing for free school meals, +0.10 (+0.094); against EHC plan +0.02 (+0.015). The cause is the rounded inputs of items 1 and 3. No word for strength and no direction changes.

### Is the free school meals share soundly derived?

Yes, for this purpose. The page works the share out as (all pupils' rate less not-eligible rate) over (eligible rate less not-eligible rate). That is a share of sessions, not of pupils, and it ignores the small "unclassified" group. Against the share of enrolments in the DfE's own file it ranks authorities almost identically (rank correlation 0.998), though it runs a little high (mean 28.8% against 28.2%, never more than 4 points out). Using the true share moves the "allowing for" figure by 0.01 or 0.02 in some pairings and never changes the words. The enrolments are in the file the tool already fetches, so the true share is there to be used.

### (e) The rules, against the DfE's methodology

Source: DfE, "Parental responsibility measures" methodology, Explore Education Statistics, read 24 November 2026.

| The page says | The DfE says | |
| --- | --- | --- |
| Since August 2024 one national framework applies | "the changes introduced from 19 August 2024" | Supported |
| A notice is considered once a pupil has 10 sessions of unauthorised absence in 10 school weeks | "state funded schools must consider a penalty notice when a pupil reaches the threshold of 10 sessions of unauthorised absence in a rolling period of 10 school weeks" | Supported |
| The charge is £160, reduced to £80 if paid within 21 days | "An increase in the rate of the penalty from £120 to £160 if paid within 28 days, reduced to £80 (up from £60) if paid within 21 days" | Supported |
| A second notice to the same parent for the same child within three years is £160 | "Any second notice issued to a parent in respect of the same child in a 3 year rolling period is charged at a standard rate of £160" | Supported |
| After two notices in three years other measures are used | "A single national limit of two penalty notices … In a case where the national threshold is met for a third (or subsequent times) within those 3 years, alternative action such as prosecution should be taken instead" | Supported |
| The reason for each notice has been recorded since 2016/17 | "The reason for issuing penalty notices was collected on a voluntary basis in 2016/17, two local authorities did not submit this data" | Supported; 2016/17 is incomplete and the page does not say so |
| No figures were collected for 2019/20 | "a decision was also made not to run the data collection exercise for the 2019/20 academic year" | Supported |
| 2024/25 is the first year counted on the same rules everywhere | "2024/25, the first year of the national framework" | Supported |

Two things the page leaves out. The threshold "can be met with any combination of unauthorised absence (e.g. 4 sessions of holiday taken in term time plus 6 sessions of arriving late)", and the reason recorded is the main one, so the two strands are not as cleanly separate in the source as on the page. And the DfE's enrolments, used for "every 1,000 pupils", include state-funded alternative provision, while the absence rates beside them do not.

### (f) The note, `docs/attendance-enforcement-note.md`

Reproduced: England's totals and rates (492,825; 6.68, 4.67 and 5.41 for every 100; 93.2% and 86.5% holiday; 72% paid within 21 days; 28,909; 87,859; 29; 52); the strands (459,288 at 62.2, 32,113 at 4.4, 1,424 at 0.2); the range to 17.1 and the middle half 4.0 to 9.1; every "recorded none" count (145, 142, 115, 113, 92, 45, 29, 17, and two with no notices at all); the group table of 8, 13, 43, 43 and 44 authorities, to within 0.01 on three severe figures; 29.3% against 31.6% and 3.62% against 4.08%; nine London boroughs in the 21; the regression (−0.49, standard error 0.65; −0.08, 0.21; −0.50, 0.54; −1.63, 0.76); 38 authorities meeting the first condition; 32 of the other 113.

Not reproduced, or needing a word:

| The note says | Mine |
| --- | --- |
| The second condition holds in 10 of the 38 (26%) | 9 of 38 (24%) on the DfE's figures; item 1 |
| "under 1 for every 100 pupils in seven" | Five, besides the two that issued none |
| "230 figures across authorities are counts of 1 to 9" | 163 among the 18 measures the tool carries; 344 over every column of the DfE file |
| Notices for other unauthorised absence, "authorities with an exact figure": median 3.2, middle half 1.2 to 6.6 | Right only if the 8 recorded zeros are counted (3.16, 1.19, 6.61, 138 authorities). Among the 130 with 10 or more it is 3.38, 1.66 to 6.68 |
| Holiday notices for every 1,000 days of unauthorised holiday: middle half about 50 to 93 | 49.5 to 90.7; the top of the range, about 135, is right |
| First table, all notices: +0.71 and +0.66 with holiday absence; SEN support +0.29, +0.25 | +0.74 and +0.69; +0.26 and +0.23. The others are within 0.02. The note already says this table is superseded |
| Strand table | All 24 figures within 0.02, the difference being the derived share |
| Over time: −0.16, +0.01, −0.04 | −0.15, +0.02; the third could not be recomputed (the DfE marks some 2022/23 pupil-group figures `x`) |
| "the differences are small and within what chance would give (… EHC plan persistent −1.6, 0.76)" | The EHC plan figure is 2.1 standard errors from zero. By the usual test that is not within chance. It points the other way from the concern (lower persistent absence where few notices are issued), and one result in four tested is weak evidence, but the sentence should not say all four are within chance |

### Does any wording claim more than the data supports?

- **The flag.** It is worded with care and says it shows no cause. But a page headed "Flagged: few notices … with high persistent and severe absence in a pupil group" invites the reader to link the two, and the note itself records that the second condition is as common where more notices are issued (32 of 113, 28%, against 9 or 10 of 38). The page does not say that. One sentence giving those two proportions would stop the flag being read as a finding.
- **"High".** The second condition is the top quarter of authorities, so about a quarter of authorities meet it for any one group whatever the level; with three groups, 41 of 151 meet it for at least one. "High" is relative, and the page gives the thresholds, which is enough if the reader sees them.
- **"in its schools"** for the two single-school authorities. City of London and the Isles of Scilly show unauthorised holiday absence "in its schools"; each figure is one school's rate. The tool does not otherwise pool fewer than three schools.
- **Two strands "kept apart".** Fair as presentation, with the caveat under (e) that one notice can rest on both kinds of absence.
- Nothing else. The correlation sentences match their figures, the words for strength follow stated cut-offs, and the caveats about association are on the page.

### Not checked

The DfE's statutory guidance itself (gov.uk unreachable); the hexagon map's colours; county pages' absence figures against a DfE county figure (the DfE publishes none); the phone layout of the tables; anything committed after `e8328b5`.

## Sixth pass: headings, tabs and the clock line

Run on 25 November 2026 against commit `f625d5d` ("tabs on the Areas and Patterns pages; one line reconciling the two clocks"), with the data as built on 24 November. The DfE files were downloaded again and every figure recomputed from them before the headings were read. Pages were rendered with Playwright at 390 px, opening every tab in turn and then again in reverse.

Sample, seed 20261128: 43 schools (11 primary, 11 secondary and 9 special at random, 5 in an authority with fewer than three schools of their phase, 5 with 10 to 30 pupils, 2 with fewer than 10), each with overall and with persistent absence chosen; 25 local authorities (including the two with one school each), 8 counties, 12 trusts, 10 constituencies and 8 wards, each at its default, in every phase it has with persistent absence chosen, and with severe absence chosen, and local authorities in every phase at the default as well; the in-year page for England and 10 authorities in all four phase views; and Patterns. 419 pages, 2,000 tab views.

**Every finding-heading is true: 1,791 of 1,791, with every count, percentage, direction word and "more / fewer / about as many" right.** The faults are in how the headings behave, not in their arithmetic. Three are bugs, and five headings should be reworded.

### Counts

| | Checked | True or working | Not |
| --- | --- | --- | --- |
| (a) School headings: summary, similar schools, position, year by year, since 2018/19 | 388 | 388 | 0 |
| (a) Local authority headings: summary, school by school, year by year, compared, pupil groups, enforcement | 891 | 891 | 0 |
| (a) County headings | 145 | 145 | 0 |
| (a) Constituency headings | 158 | 158 | 0 |
| (a) Trust headings | 155 | 155 | 0 |
| (a) Ward headings | 54 | 54 | 0 |
| (a) "Close to" in the school summary, against a band of under 0.3 points | 103 gaps | 100 | 3 (item 5) |
| (b) Area and trust summary heading, read against the measure chosen, when that is persistent or severe absence | 191 | 112 | 79 would read differently (item 1) |
| (d) Clock line: dates, phase, the area's rate, England's rate, the gap | 68 authority-and-phase pairs, 340 figures | 340 | 0 |
| (d) Clock line absent where it should be: counties, trusts, constituencies, wards; other tabs | 145 pages | 145 | 0 |
| (e) In-year "illness accounts for …%, and unauthorised holiday for …%" | 43 | 43 | 0 |
| (e) In-year "lower than at the same point last year in N of M local authorities" | 44 | 44 | 0 |
| (f) Every section reachable in some tab, eight kinds of page | 69 sections | 69 | 0 |
| (f) An address with `tab=` opens that tab | 24 | 24 | 0 |
| (f) The address a page shows after it has opened | 4 kinds of page | 3 | 1: school pages (item 2) |
| (f) Old `#sec-<name>` links open the right tab | 34 | 34 | 0 |
| (f) Old `#sec-<name>` links bring the section into view | 34 | 25 | 9 (item 4) |
| (f) Every tab printed | 8 kinds of page | 8 | 0 (the feedback form is left out of print) |
| (f) Keyboard: arrow keys move between tabs and focus follows; Enter opens a tab; Tab reaches the tab's content | 8 kinds of page | 8 | 0 |
| (g) Console errors | 419 pages | 419 clean | 0 |
| (g) Sideways scroll at 390 px | 2,000 tab views | 2,000 | 0 |
| (g) Charts drawn at full width, first time and after switching away and back | 2,858 each way | 2,797 | 61, all intended: the school-by-school chart is empty under severe absence (60) and one weekday chart had too few sessions |
| (g) Controls inside a tab: phase, persistent, severe, school measure, in-year phase | 5 changes | 4 | 1 (item 3) |

What "true" rests on. Counts such as "185 of its 293 primary schools", "higher here than in 138 of the other 150 local authorities", "35% of secondary schools had higher" and "it is higher at 98% of secondary schools" were recounted from the DfE's school and area figures. Differences were taken from unrounded figures and rounded once. The 20-similar-schools figure is the tool's own and was not rebuilt; the heading's gap from it was. Ward pages have no "compared" heading, so none was checked.

The clock line. The area and England rates match the DfE's daily rows summed from 7 September to 6 November 2026 in all 68 pairs, and the DfE's own year-to-date percentage wherever that is given to enough places to tell. "Since September 2026, up to 6 November 2026" is right. "End at Easter 2026" is right: the DfE's autumn and spring terms 2025/26 run to Easter. It appears only on local authority pages, only on the Overview tab, and not where the authority has no in-year figure for the phase (2 pairs). It speaks of overall absence whatever measure is chosen, and says "missed … of sessions", which makes that plain. The nine authorities whose special-school year-to-date figure differs from the DfE's (fourth pass, item 4) were not in this sample; nothing has changed there.

### What is wrong

**1. The summary heading speaks of overall absence whatever measure is chosen, and it misleads. Page.** "Absence in its secondary schools is lower than across England, and lower than a year earlier" is computed from overall absence. With persistent or severe absence chosen, every other heading on the page follows the choice and this one does not. In 79 of 191 such views the words would be different for the measure on screen. Example, `/attendance/group/?k=a&id=E10000019&phase=S&m=pa`: the heading says "lower than across England, and lower than a year earlier"; persistent absence there is higher than across England and unchanged. The heading is true of overall absence and does not say that is what it means.

**2. A school page opened at a tab or a section shows `tab=method` in its address. Page (`tabs.js` with `school.js`).** Open `/attendance/school/?urn=141741&tab=compare`: the Compare tab opens, and the address becomes `?urn=141741&tab=method`. The same happens for `tab=time` and for every `#sec-` link (10 of 10 tried). The address is stamped while only the Method section has anything in it and is not corrected when the wanted tab opens. A link copied from that page opens Method. Clicking a tab puts it right. Area, in-year and Patterns pages keep the right address.

**3. The school-by-school heading goes stale under severe absence. Page (`strip()` in `group.js`).** Choose persistent absence and then severe: the section says "Severe absence is never shown for a single school", under a heading that still reads "54 of its 89 secondary schools have higher persistent absence than England's secondary schools taken together" (`k=a&id=E08000025&phase=S`, Schools tab). Opened directly with severe chosen, the heading is the plain label, as it should be.

**4. Nine old section links open the right tab but not the section.** `tabs.js` looks for an element whose id is `sec-<name>`, and gives that id only to a section with no id of its own. Sections that already have one (`gx-hist-c`, `gx-over-c`, `gx-cmp-c`, `sx-read-c`, `px-cal-c`, `px-sev-c`, `px-enf-c`, `px-scat-c`) are not found, so the page stays at the top of the tab. On a local authority page `#sec-year-by-year` leaves the section 2,200 px down and `#sec-compared` 2,750 px down. `#sec-enforcement`, which the tool's own links use, lands in view because that section leads its tab.

**5. "Close to" stops at 0.25, not 0.3.** The test is on the rounded gap, so 0.2 is the last "close to". Three of 103 gaps lie between 0.25 and 0.3 and are called higher or lower: school 146404 against England (+0.29), 119536 against its authority (−0.29), 110733 against similar schools (−0.25).

### Headings I would reword, and why

| Now | Why | Suggested |
| --- | --- | --- |
| "Absence in its secondary schools is lower than across England, and lower than a year earlier" (areas and trusts) | Item 1. It is about overall absence and does not say so | "Overall absence in its secondary schools …", or follow the measure chosen as the other headings do |
| "Absence is lower than England and Hampshire" (schools) | "Absence" is overall absence; "lower than England" compares a school with a country | "Overall absence is lower than across England's primary schools and Hampshire's" |
| "Overall absence is 0.4 points lower than in 2018/19; it is higher at 88% of primary schools" (schools) | "It" reads as this school, so the second half seems to contradict the first. 22 of the 86 sampled read this way | "…; across England it is higher than in 2018/19 at 88% of primary schools" |
| "None penalty notices for term-time holiday, and none for other unauthorised absence" (`k=y&id=city-of-london`) | Not English | "No penalty notices for term-time holiday or for other unauthorised absence" |
| "… before the pandemic; across England it rose by 1.2" (areas and trusts) | The unit is missing from the second figure | "… it rose by 1.2 points" |

Two labels to look at as well. On trust pages the small line above the "compared" heading reads "Among trusts, allowing for size", but the heading beneath is a plain count of trusts with a lower rate, which makes no allowance for size. And a heading that is a rank ("higher here than in 138 of the other 150 local authorities") is a reading of figures, not a judgement, but it is the nearest thing on the site to a league-table line; the count is exact, so if it stays it is at least right.

### (b) and (c) in brief

- Apart from items 1 and 3, no heading contradicts the sentence, table or chart beneath it. Where a heading and its sentence give the same figure (the position percentage, the gap from similar schools, the change since 2018/19) they agree in all 43 schools and every area checked.
- The school "year by year" heading gives the change between the last two full years, while the sentence under the chart gives the change since 2018/19. Both are true and they do not conflict, but they answer different questions.
- "Since before the pandemic" on a school page is always overall absence, and its heading says "Overall absence", so it does not mislead when persistent absence is chosen elsewhere.
- No heading reads as a judgement of a named school or place, and none implies cause. "Before the pandemic" is a date, not an explanation. The enforcement heading says "for its size" and stops there.

### Smaller points

- The page tabs carry `role="tab"` inside a `role="tablist"` but have no `aria-controls` and no `role="tabpanel"` on what they show. Keyboard use works; a screen reader is told less than it could be.
- At 390 px the phase and measure buttons are replaced by drop-downs. They work inside every tab.
- Patterns and the in-year page keep their old static headings apart from the two new ones checked under (e).

### Not checked

The similar-schools figure itself; the wording of sections that have no finding-heading; screen-reader behaviour beyond roles and focus; widths other than 390 px; anything committed after `f625d5d`.
