# Attendance Explorer: plan

Written 22 November 2026. A plan only; nothing here is built. `CLAUDE.md` wins where the two differ.

**Verification status.** The first draft rested on search summaries. On 23 November the recon phase downloaded the DfE and GIAS files and checked them; the results are in `docs/attendance-data-note.md` and this plan has been corrected to match. Boundary files, licence wording and the future of the fortnightly cadence remain to confirm.

## The finding that shapes everything

The DfE publishes attendance at two speeds, and no single view can serve both.

| | The pulse | The depth |
| --- | --- | --- |
| Publication | Pupil attendance in schools | Pupil absence in schools in England |
| Source | Daily registers shared from school systems | School census |
| Cadence | Fortnightly in term (a move to monthly from spring 2027 was proposed; outcome not found) | Three a year: autumn term, autumn and spring, full year |
| Latest | Week 45 2026, to the week of 2 November | Autumn and spring 2025/26 (15 October 2026); full year 2024/25 (26 March 2026); full year 2025/26 due March 2027, provisional |
| Lowest level | Local authority | School |
| Measures | Attendance and absence by day, week and year to date; persistent absence year to date; reasons | Overall, authorised and unauthorised absence; persistent absence (10% or more); severe absence (50% or more); reasons; 2013/14 onwards |

Nothing official is published openly for wards, constituencies or trusts, and the DfE's own similar-schools attendance reports (median of 20 similar schools, with an improvement expectation to 2028/29) sit behind a sign-in. Those are the gaps a public tool can fill. School-level figures have no pupil-characteristic breakdowns, so the tool cannot show, say, disadvantaged pupils' absence for one school, and should say so plainly. Characteristics are published at local authority level and can appear on authority pages. Alternative provision is published only to authority level.

The consequence for "returning every couple of weeks": the fortnightly reason to return is the local authority pulse. School, trust, ward and constituency views change three times a year. The tool should be honest about that on every page, with the date of the data and the date of the next release.

## Who it is for and the questions it answers

A headteacher or attendance lead: how does our absence compare with schools like ours, is the gap closing, and is what we see this fortnight a local pattern or ours alone. A trust leader: where does the spread sit across our schools, and which differences survive context. A local authority officer, councillor or MP's office: how does this area compare and where within it is absence concentrated. A researcher or journalist: what is the shape of the recovery since 2018/19, and what explains the differences between places.

## The views

The tool lives at `/attendance/`, a sibling of the Ofsted Explorer with the same header, type and white data sheets. Every view opens on a chart, with the sentence that reads it beneath, and a table only on request.

**1. Pulse** (national, region, local authority; fortnightly).
- *The year ribbon*: a calendar of the school year, one cell per day, shaded by attendance, with last year's ribbon beneath it. Term structure, the Friday dip and the run-in to holidays show at a glance.
- *This year against the last three*: weekly line, earlier years as quiet threads.
- *Day of the week* and *reasons for absence* (illness, holiday, other unauthorised) as small stacked bars. The files carry every register code for every authority, each day, by phase.
- *Local authority hex map*, each authority one hexagon, so London is not lost and Northumberland does not dominate. Tap for the authority's own pulse.
- *Since the same week last year*: a slope chart of all authorities, the chosen one marked with the midnight diamond.

**2. School** (about 21,000 state-funded primary, secondary and special schools).
- Overall absence, persistent absence and severe absence, each read four ways as in the Ofsted Explorer: against national for the phase, the local authority, similar schools and a contextual expected rate.
- *Twelve years on one line*, 2013/14 to the latest, with 2019/20 (never published) drawn as a marked gap, not interpolated. Only 13,411 of 21,262 schools have the full run under their present URN, so predecessor schools are joined through GIAS and the line marks where a school converted.
- *Recovery*: the school's change since 2018/19 set against the distribution of changes nationally.
- *Where it sits*: a beeswarm of every school in the phase, comparison group in verdigris.
- Authorised and unauthorised split, and reasons where published.
- The school's Ofsted "attendance and behaviour" grade, stated as a fact with its date and a link to the Ofsted Explorer. No commentary on it (rule 3).

**3. Compare.** Up to five schools, trusts or areas side by side on the same axes, shareable by link.

**4. Areas.** Region, local authority, constituency and ward, each with a pooled rate (weighted by enrolments), the spread of its schools, its trajectory and a map. Details and cautions in the geography section.

**5. Trusts.** Pooled absence across the trust's schools by phase; a strip plot showing every school in the trust against its own expected rate; trajectory; the trust's schools on the national funnel. A pooled reading is given for the 746 trusts with five or more schools; smaller trusts get a list of their schools. Membership is taken from GIAS as it stands today, and the page says so, because a school that joined last year brings a history the trust did not shape. A later refinement can show "since joining".

**6. Patterns.** The modelling brought forward for those who want to explore:
- *Funnel plot*: persistent absence against school size with control limits, which separates unusual schools from small ones.
- *Context scatter*: absence against free school meal eligibility, SEN, deprivation or size, with the fitted curve; choose the axis.
- *Deprivation gradient* by IDACI band and urban or rural setting, year by year.
- *Distribution over time*: one ridge per year, showing the whole distribution shift after 2020 and how far it has returned.
- *Small-multiples atlas*: one small chart per region or authority on shared axes.

## Geography, with the cautions stated

GIAS carries ward, constituency (2024 boundaries, confirmed), district, local authority, region and coordinates for every school, so all aggregation can be built from the school file.

- **Local authority** is the primary unit: the 153 upper-tier authorities, matching how DfE publishes. It is the only level where the fortnightly pulse and the school-level depth meet.
- **"County"** is ambiguous. Recommended: label the primary unit "local authority", and offer the 48 ceremonial counties as an optional grouping built from a lookup, for readers who think in Lancashire or Kent. Local government reorganisation is unsettled (Surrey splits on 1 April 2027; other areas were paused for review in September 2026), so every area is keyed on its official code with a vintage, never on its name.
- **Constituency** (543 in England) works well: about 40 schools each, around six of them secondary. Hex map and boundary map.
- **Ward** needs care. 6,575 wards contain a school; 1,218 have one, 1,518 have two and 3,839 have three or more. Only 2,801 contain a secondary. Three rules follow. A ward figure describes schools located in the ward, not children who live there, and the page says so. A pooled ward rate is shown only where three or more schools contribute (58% of wards); otherwise the page lists the schools. Secondary absence is not mapped by ward at all. MSOAs were tested as an alternative and are no steadier (62% would carry a figure), so wards stay.
- **Maps**: hex cartograms (Open Innovations layouts, MIT) and simplified ONS boundaries drawn as SVG for regions, authorities and constituencies. Wards need vector tiles served as one static file (MapLibre with PMTiles); no paid map service and no third-party tiles.

## Models

- **Similar schools.** For secondaries, reuse the existing 50 similar schools. For primary and special schools, a new match on context (free school meals, SEN support, EHC plans, English as an additional language, deprivation, size, urban or rural, within phase). It will be described as our own match, not a replica of the DfE's 20-school comparison, whose full method is not public.
- **No expected rate** (Mark, 23 November). A regression of absence on context is used only to weight the similar-schools match.
- **Uncertainty.** The "in line" band widens for small schools, as `OE.ctxThr` does. Persistent absence in a school of 60 pupils moves by 1.7 points with one child; the funnel plot and the band exist to stop that being over-read.
- **What is not modelled.** No forecasts of a school's future attendance, and no attempt to reproduce the DfE's improvement expectations.

## Reasons to return

- The pulse updates within a day of each DfE release; every page shows "data to" and "next release".
- *Pinned places*: schools, trusts and areas saved on the device (no account, nothing sent anywhere). The landing page then opens on "since you were last here" for those places.
- A short dated reading of each fortnight's release on the What's new page, in Mark's voice, drafted for his approval, never auto-published.
- PNG slides and share cards for any chart, and the data behind each chart as CSV with source and date.
- Email alerts are possible later but mean holding addresses; a decision for Mark, not assumed.

## Phone first

Design at 375 px before desktop. One chart per screen, each legible without pinching; a sticky bar to jump between Pulse, School, Areas, Trusts and Patterns; search that takes a school name, postcode, trust, constituency or place; tooltips that become tap sheets. Hex maps suit phones far better than boundary maps and are the default there. The standing checks in `CLAUDE.md` apply unchanged.

## Guardrails

- No ranked lists of schools by absence, and no "worst" or "best" tables. Tables of schools sort by name by default. Areas may be ordered; trusts are shown on the funnel and against expected, not as a league table.
- Commentary reads the data and never judges a school. Attendance uses the readings scale with plain wording ("lower than", "close to", "higher than" expected); Ofsted grade colours appear only on the Ofsted grade itself.
- The DfE does not suppress small numbers in the school-level files, so the protection is ours. Proposed: rates only, never pupil counts; no school shown with fewer than 10 enrolments (eight schools); severe absence shown for areas, trusts and phases but not for single schools, where it is usually a handful of pupils. Decision 4 below.
- In-year and census figures are never mixed on one chart: they differ in source, coverage and definition.
- Every school appears on the same terms, as in the Ofsted Explorer.

## How it would be built

- `site/attendance/` with its own modules, reusing the `dash.js` runtime (URL state, draw registry, column-major JSON) and `slide.js`. Shared pieces move to a common folder so the two tools cannot drift.
- `scripts/fetch_attendance.py` reads the DfE files (the statistics API where a data set is exposed, the catalogue files otherwise) and writes slim CSVs to `data/raw/attendance/`; the school-level files are 80 to 120 MB each and are not committed. Catalogue ids change with each release, so the fetcher asks the DfE for the latest files every time. The build tests that school rows sum to the published national figures (they do: 6.60%, 17.50% and 2.32% for autumn and spring 2025/26). `scripts/build_attendance.py`, called from `build_data.py`, writes per-school history in shards, one file per area level, trust tables and the model.
- A GitHub Action checks twice a week for a new release. Whether it may commit to `main` unattended, as the daily report-card reader does, is Mark's call.
- **File limit.** A static page per school is not possible: about 13,100 files deploy now and Cloudflare's limit is 20,000. School pages for this tool need a Pages Function that writes the title and share tags on request. This is the same decision already pending for primary schools, and one Function can serve both tools.
- Sources and licences: DfE statistics, GIAS and ONS boundaries are Open Government Licence v3.0 (wording still to confirm), with the ONS and Ordnance Survey attribution lines on any map.

## Phases

| Phase | What | Outcome |
| --- | --- | --- |
| 0. Recon (done 23 Nov) | Files opened; columns, markers, coverage, joins and counts checked | `docs/attendance-data-note.md` and this corrected plan |
| 1. Pulse (built 23 Nov, preview) | Year ribbon, weekly lines, reasons, authority hex map and slopes; the fetch Action | First preview; the fortnightly habit starts here |
| 2. Schools (built 23 Nov, preview; similar schools and the contextual reading follow in Phase 4) | School view, history, recovery, beeswarm, compare, search, the Pages Function | Every school has a page |
| 3. Trusts and constituencies (built 23 Nov, preview; hex map only, boundary map to follow) | Pooled rates, strip plots, constituency hex and boundary maps | Group and political geography |
| 4. Models (built 23 Nov, preview; special schools not modelled) | Similar schools for all phases, contextual expected, funnel, Patterns | The analytical core |
| 5. Small areas (built 23 Nov, preview; SVG ward maps by district, not vector tiles) | Wards with vector tiles; ceremonial counties | The full geographic set |
| 6. Returning (built 23 Nov, preview; fortnightly readings and CSV downloads still to do) | Pinned places, "since you were last here", slides, share cards, fortnightly readings | The reason to come back |

Each phase is its own branch and preview, and none goes to production without Mark's "Go".

## Decisions for Mark

Settled: the two-speed shape (Mark, 23 November); wards over MSOAs (on the recon evidence); network access (a separate `mrkdltn-site` cloud environment now allows the DfE, GIAS and ONS hosts).

1. **School comparisons.** No ranked school lists, trusts on a funnel instead of a league table. Recommended: yes.
2. **County.** Local authority as the unit, ceremonial county as an optional grouping. Recommended: yes.
3. **Contextual expected attendance.** Decided 23 November: no. The Explorer gives no expected rate; schools are set beside England, their local authority and their 20 similar schools.
4. **Small numbers at school level.** Decided 23 November: apply them. Rates only, no school under 10 enrolments, severe absence kept to areas, trusts and phases, and no pupil group under 10.
5. **School pages by Pages Function**, settling the pending primary-schools question at the same time. Recommended: yes.
6. **Unattended data commits to `main`** for new DfE releases. Recommended: yes for data only, once Phase 1 has run cleanly by hand twice.

Also decided on 23 November: school pages keep the sentence giving the share of schools with higher and lower rates; trust histories keep earlier years and show which schools were in the trust at the time, with joining dates and transfers.
