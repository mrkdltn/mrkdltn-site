# Attendance Explorer: plan

Written 22 November 2026. A plan only; nothing here is built. `CLAUDE.md` wins where the two differ.

**Verification status.** The research for this plan could not open the DfE, GIAS or ONS sites directly from the cloud session (the hosts are outside its network allowance), so the data facts below come from search summaries of the primary pages, not the pages themselves. They are marked *(to confirm)* where it matters. Phase 0 exists to confirm every one of them against the files before any design is fixed.

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

Nothing official is published openly for wards, constituencies or trusts, and the DfE's own similar-schools attendance reports (median of 20 similar schools, with an improvement expectation to 2028/29) sit behind a sign-in. Those are the gaps a public tool can fill. School-level figures have no pupil-characteristic breakdowns *(to confirm)*, so the tool cannot show, say, disadvantaged pupils' absence for one school, and should say so plainly.

The consequence for "returning every couple of weeks": the fortnightly reason to return is the local authority pulse. School, trust, ward and constituency views change three times a year. The tool should be honest about that on every page, with the date of the data and the date of the next release.

## Who it is for and the questions it answers

A headteacher or attendance lead: how does our absence compare with schools like ours, is the gap closing, and is what we see this fortnight a local pattern or ours alone. A trust leader: where does the spread sit across our schools, and which differences survive context. A local authority officer, councillor or MP's office: how does this area compare and where within it is absence concentrated. A researcher or journalist: what is the shape of the recovery since 2018/19, and what explains the differences between places.

## The views

The tool lives at `/attendance/`, a sibling of the Ofsted Explorer with the same header, type and white data sheets. Every view opens on a chart, with the sentence that reads it beneath, and a table only on request.

**1. Pulse** (national, region, local authority; fortnightly).
- *The year ribbon*: a calendar of the school year, one cell per day, shaded by attendance, with last year's ribbon beneath it. Term structure, the Friday dip and the run-in to holidays show at a glance.
- *This year against the last three*: weekly line, earlier years as quiet threads.
- *Day of the week* and *reasons for absence* (illness, holiday, other unauthorised) as small stacked bars *(day-level and reason detail to confirm)*.
- *Local authority hex map*, each authority one hexagon, so London is not lost and Northumberland does not dominate. Tap for the authority's own pulse.
- *Since the same week last year*: a slope chart of all authorities, the chosen one marked with the midnight diamond.

**2. School** (about 21,000 state-funded primary, secondary and special schools).
- Overall absence, persistent absence and severe absence, each read four ways as in the Ofsted Explorer: against national for the phase, the local authority, similar schools and a contextual expected rate.
- *Twelve years on one line*, 2013/14 to the latest, with the pandemic years drawn as a marked gap, not interpolated.
- *Recovery*: the school's change since 2018/19 set against the distribution of changes nationally.
- *Where it sits*: a beeswarm of every school in the phase, comparison group in verdigris.
- Authorised and unauthorised split, and reasons where published.
- The school's Ofsted "attendance and behaviour" grade, stated as a fact with its date and a link to the Ofsted Explorer. No commentary on it (rule 3).

**3. Compare.** Up to five schools, trusts or areas side by side on the same axes, shareable by link.

**4. Areas.** Region, local authority, constituency and ward, each with a pooled rate (weighted by enrolments), the spread of its schools, its trajectory and a map. Details and cautions in the geography section.

**5. Trusts.** Pooled absence across the trust's schools by phase; a strip plot showing every school in the trust against its own expected rate; trajectory; the trust's schools on the national funnel. Membership is taken from GIAS as it stands today, and the page says so, because a school that joined last year brings a history the trust did not shape. A later refinement can show "since joining".

**6. Patterns.** The modelling brought forward for those who want to explore:
- *Funnel plot*: persistent absence against school size with control limits, which separates unusual schools from small ones.
- *Context scatter*: absence against free school meal eligibility, SEN, deprivation or size, with the fitted curve; choose the axis.
- *Deprivation gradient* by IDACI band and urban or rural setting, year by year.
- *Distribution over time*: one ridge per year, showing the whole distribution shift after 2020 and how far it has returned.
- *Small-multiples atlas*: one small chart per region or authority on shared axes.

## Geography, with the cautions stated

GIAS carries ward, constituency (2024 boundaries *(to confirm)*), district, local authority, region and coordinates for every school, so all aggregation can be built from the school file.

- **Local authority** is the primary unit: the 153 upper-tier authorities, matching how DfE publishes. It is the only level where the fortnightly pulse and the school-level depth meet.
- **"County"** is ambiguous. Recommended: label the primary unit "local authority", and offer the 48 ceremonial counties as an optional grouping built from a lookup, for readers who think in Lancashire or Kent. Local government reorganisation is unsettled (Surrey splits on 1 April 2027; other areas were paused for review in September 2026), so every area is keyed on its official code with a vintage, never on its name.
- **Constituency** (543 in England) works well: about 40 schools each, around six of them secondary. Hex map and boundary map.
- **Ward** (about 6,800) needs care. The average ward has three schools; many have one or none, and most have no secondary. Three rules follow. A ward figure describes schools located in the ward, not children who live there, and the page says so. A pooled ward rate is shown only where three or more schools contribute; otherwise the page lists the schools. Secondary absence is not mapped by ward at all. If Mark wants a truer small-area picture, MSOA (larger, steadier units) is the better statistical choice and could replace or sit beside wards.
- **Maps**: hex cartograms (Open Innovations layouts, MIT) and simplified ONS boundaries drawn as SVG for regions, authorities and constituencies. Wards need vector tiles served as one static file (MapLibre with PMTiles); no paid map service and no third-party tiles.

## Models

- **Similar schools.** For secondaries, reuse the existing 50 similar schools. For primary and special schools, a new match on context (free school meals, SEN support, EHC plans, English as an additional language, deprivation, size, urban or rural, within phase). It will be described as our own match, not a replica of the DfE's 20-school comparison, whose full method is not public.
- **Contextual expected rate.** Fractional logit, as already used for English and maths 5+, so expected rates stay within 0 to 100%. Fitted by phase for overall absence and persistent absence. Region is left out, so regional differences remain visible instead of being adjusted away. Ethnicity is never used, as now, and the method note will say that this is a choice and what it costs in fit.
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
- DfE suppression is carried through untouched, and nothing is derived that could recover a suppressed figure. No figure for fewer than 10 pupils.
- In-year and census figures are never mixed on one chart: they differ in source, coverage and definition.
- Every school appears on the same terms, as in the Ofsted Explorer.

## How it would be built

- `site/attendance/` with its own modules, reusing the `dash.js` runtime (URL state, draw registry, column-major JSON) and `slide.js`. Shared pieces move to a common folder so the two tools cannot drift.
- `scripts/fetch_attendance.py` reads the DfE files (the statistics API where a data set is exposed, the catalogue files otherwise) and writes slim CSVs to `data/raw/attendance/`; the full school-level file is some 230,000 rows and is not committed. `scripts/build_attendance.py`, called from `build_data.py`, writes per-school history in shards, one file per area level, trust tables and the model.
- A GitHub Action checks twice a week for a new release. Whether it may commit to `main` unattended, as the daily report-card reader does, is Mark's call.
- **File limit.** A static page per school is not possible: about 13,100 files deploy now and Cloudflare's limit is 20,000. School pages for this tool need a Pages Function that writes the title and share tags on request. This is the same decision already pending for primary schools, and one Function can serve both tools.
- Sources and licences: DfE statistics, GIAS and ONS boundaries are Open Government Licence v3.0 *(wording to confirm)*, with the ONS and Ordnance Survey attribution lines on any map.

## Phases

| Phase | What | Outcome |
| --- | --- | --- |
| 0. Recon | Open the files; confirm columns, suppression, coverage and licences; count wards by number of schools and trusts by size; decide ward or MSOA on the evidence | A short data note and a corrected version of this plan |
| 1. Pulse | Year ribbon, weekly lines, reasons, authority hex map and slopes; the fetch Action | First preview; the fortnightly habit starts here |
| 2. Schools | School view, history, recovery, beeswarm, compare, search, the Pages Function | Every school has a page |
| 3. Trusts and constituencies | Pooled rates, strip plots, constituency hex and boundary maps | Group and political geography |
| 4. Models | Similar schools for all phases, contextual expected, funnel, Patterns | The analytical core |
| 5. Small areas | Wards or MSOAs with vector tiles; ceremonial counties | The full geographic set |
| 6. Returning | Pinned places, "since you were last here", slides, share cards, fortnightly readings | The reason to come back |

Each phase is its own branch and preview, and none goes to production without Mark's "Go".

## Decisions for Mark

1. **Shape.** Accept the two-speed design (fortnightly pulse at authority level; schools, trusts and small areas three times a year)? Recommended: yes; it is what the data allows.
2. **School comparisons.** No ranked school lists, trusts on a funnel instead of a league table. Recommended: yes.
3. **County.** Local authority as the unit, ceremonial county as an optional grouping. Recommended: yes.
4. **Small areas.** Wards with the three-school rule, MSOAs, or both. Recommended: decide after Phase 0 shows how many wards would carry a figure.
5. **Contextual expected attendance.** Include it, knowing some will read it as excusing absence? Recommended: yes, in Phase 4, framed as a reading and never as a target.
6. **School pages by Pages Function**, settling the pending primary-schools question at the same time. Recommended: yes.
7. **Unattended data commits to `main`** for new DfE releases. Recommended: yes for data only, once Phase 1 has run cleanly by hand twice.
8. **Network access for the build session.** Phase 0 needs the DfE statistics, GIAS and ONS geography hosts allowed in the cloud environment, or the recon run from Mark's PC.
