# Report card grades and school context: results

Run 25 November 2026 by `scripts/analysis/grades_context.py`, following the plan committed beforehand (`docs/analysis-plans/grades-context-plan.md`, commit `801f11b`). Machine-readable results: `docs/analysis-plans/grades-context-results.json` (every estimate below, plus the descriptive tables and the full trend series). The run is deterministic and reproduces byte for byte.

**Sources and dates.** Ofsted, management information on state-funded schools, latest inspections as at 31 October 2026 (report cards published 11 January to 29 October 2026). DfE, Special educational needs in England, school level, January 2026 census (published 11 June 2026). DfE, Get Information about Schools, extract of 25 November 2026. Secondary prior attainment, mobility and 2024/25 results against 50 similar schools from the Explorer's KS4 file (DfE KS4 performance 2024/25 final and 2025/26 provisional, 28 October 2026; open replica of the similar-schools model). Sensitivity sample: report cards read from Ofsted's reports published 2 to 23 November 2026. Unless stated, every figure below is from the 31 October 2026 MI.

## Summary

**In primary schools, deprivation is associated with lower grades in every area, and holding other context constant barely changes that.** Among 2,638 primaries with a report card, those in the most deprived IDACI fifth were 19 percentage points more likely than those in the least deprived fifth to be graded below Expected standard for attendance and behaviour (95% CI 14 to 24), and 17 points more likely for achievement (11 to 23), with SEN, size, region, urban or rural setting and governance held constant. The gap is 10 points for curriculum and teaching, and 5 to 6 points for leadership and governance, personal development and wellbeing, and inclusion. For early years it is 5 points, but the interval includes zero. There is no public school-level measure of primary prior attainment, mobility or results, so the primary estimates cannot hold "same intake" or "same results" constant. They describe how grades differ between schools serving more and less deprived areas, not why.

**In secondary schools, the raw gaps are larger, and results against similar schools explain little of them; the prior attainment of the intake explains most.** Achievement shows the clearest pattern: schools in the most deprived fifth were 38 points more likely to be graded below Expected standard than those in the least deprived. Holding 2024/25 results against 50 similar schools constant reduces that only to 35 points, because the similar-schools comparison already matches on intake. Adding the intake's prior attainment, SEN, mobility, size, region, setting and governance reduces it to 17 points (6 to 28). Achievement is the only secondary area where a clear gap remains once all of this is held constant, and it survives a correction for testing 14 estimates. For curriculum and teaching, attendance and behaviour, and leadership and governance, the raw gaps of 10 to 22 points fall to between 1 and 7 points, with intervals wide enough to include both no gap and gaps of 10 points or more. These are not evidence of no association; they are too uncertain to call. Inclusion, personal development and wellbeing, and post-16 provision have too few schools below Expected standard for the controlled model to be read with confidence.

**The schools inspected so far are not a random sample, but weighting for that changes little.** Inspected secondaries lean towards the most deprived fifth (25% against 20% of all secondaries) and towards schools previously judged Requires improvement for quality of education (19% against 12%). Re-weighting the estimates towards all state-funded schools moves no main estimate by more than 3.3 points and changes no reading; secondary achievement is between 13.6 and 14.8 points under the three weights, each with an interval that excludes zero.

**The pattern has been stable as report cards have accumulated.** Primary achievement has stayed between 16.7 and 20.2 points since the end of April 2026, when there were first enough report cards to estimate it; secondary achievement has stayed at 17 points since the end of September. Adding the 565 report cards published from 2 to 23 November changes no estimate by more than 1.7 points.

**Two things to read alongside this.** First, an ordinal model of the full five-point scale gives smaller secondary estimates, because the association sits at the boundary between Expected standard and Needs attention rather than running evenly through the scale. Second, an exploratory analysis that was not in the plan suggests that among secondaries with similar prior attainment and results, those in the most deprived fifth were, if anything, more likely to be graded Strong standard or above for attendance and behaviour, leadership and governance, and curriculum and teaching. That needs testing before it is relied on.

These are associations across England, not evidence about whether any grade is right. Deprivation, prior attainment, SEN and mobility overlap, and inspection judges much that no public data set records.

## Pre-registered results

### Main estimates

Average marginal effect (AME) of being in IDACI fifth 5 (most deprived) rather than fifth 1 (least), on the probability of being graded below Expected standard (Needs attention or Urgent improvement), in percentage points with 95% CIs (HC1 robust standard errors, delta method). "Raw" is IDACI fifth alone, on all graded schools (primary 2,638 or 2,453 for early years; secondary 756, or 386 for post-16). "Results only" adds the 2024/25 gap to similar schools. "Controlled" is the main controlled model per the plan's events-per-variable rule: M2 is the full model; M2r the reduced model (IDACI, EHC share, SEN support share, log size, plus prior attainment and results for secondaries). Material: at least 5 points with the CI excluding zero. Holm adjustment across all 14 controlled estimates.

| Phase | Area | n (controlled) | Below Expected | Raw | Results only | Controlled | Model | Reading |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Primary | Inclusion | 2,638 | 246 | +2.6 (−0.8 to +6.0) | n/a | +5.6 (+1.3 to +9.8) | M2 | Material; Holm p 0.096, so not robust to multiple comparisons |
| Primary | Curriculum and teaching | 2,638 | 553 | +9.2 (+4.4 to +14.1) | n/a | +9.6 (+4.1 to +15.0) | M2 | Material; Holm p 0.006 |
| Primary | Achievement | 2,638 | 740 | +18.3 (+13.1 to +23.5) | n/a | +17.2 (+11.4 to +23.0) | M2 | Material; Holm p < 0.001 |
| Primary | Attendance and behaviour | 2,638 | 368 | +20.2 (+16.1 to +24.3) | n/a | +19.3 (+14.3 to +24.2) | M2 | Material; Holm p < 0.001 |
| Primary | Personal development and wellbeing | 2,638 | 99 | +5.4 (+3.0 to +7.9) | n/a | +5.8 (+3.1 to +8.5) | M2r | Material; Holm p < 0.001 |
| Primary | Leadership and governance | 2,638 | 380 | +7.0 (+2.8 to +11.2) | n/a | +6.1 (+1.3 to +11.0) | M2 | Material; Holm p 0.104, so not robust to multiple comparisons |
| Primary | Early years | 2,453 | 266 | +5.3 (+1.3 to +9.3) | n/a | +4.6 (−0.2 to +9.4) | M2 | No clear association (inconclusive); Holm p 0.42 |
| Secondary | Inclusion | 724 | 89 | +10.2 (+4.0 to +16.4) | +9.2 (+2.9 to +15.5) | +4.2 (−3.0 to +11.3) | M2r | Low events per variable (89, one short of the 90 needed); not assessed |
| Secondary | Curriculum and teaching | 724 | 168 | +21.7 (+13.3 to +30.1) | +19.0 (+10.4 to +27.5) | +7.4 (−2.4 to +17.2) | M2r | No clear association (inconclusive) |
| Secondary | Achievement | 724 | 242 | +37.9 (+29.3 to +46.6) | +35.4 (+26.7 to +44.1) | +16.9 (+6.0 to +27.8) | M2 | Material; Holm p 0.024 |
| Secondary | Attendance and behaviour | 724 | 164 | +17.4 (+8.9 to +25.9) | +14.6 (+6.0 to +23.2) | +4.0 (−5.4 to +13.4) | M2r | No clear association (inconclusive) |
| Secondary | Personal development and wellbeing | 724 | 53 | +3.5 (−2.1 to +9.1) | +2.9 (−3.2 to +8.9) | −2.1 (−9.8 to +5.7) | M2r | Low events per variable; not assessed |
| Secondary | Leadership and governance | 724 | 110 | +10.4 (+3.4 to +17.3) | +8.2 (+0.9 to +15.6) | +0.9 (−7.8 to +9.5) | M2r | No clear association (inconclusive) |
| Secondary | Post-16 provision | 384 | 45 | +1.5 (−7.1 to +10.1) | +1.3 (−7.3 to +9.8) | −2.6 (−11.7 to +6.5) | M2r | Low events per variable; not assessed |

Notes. 32 inspected secondaries (2 for post-16) drop out of the results and controlled models because they have no 2024/25 results against similar schools, mostly new schools; the raw estimate on the same 724 schools is within 1.6 points of the full-sample raw estimate for every area (JSON `raw_same_sample`). Where M2r is the main model, the full M2 is reported in the JSON as a low-events sensitivity; it is within 5.5 points of M2r in every case and changes no reading.

Pre-registered family: 7 of 14 estimates meet the materiality threshold (the six primary areas other than early years, and secondary achievement); 5 of those 7 are also robust to the Holm correction (primary curriculum and teaching, achievement, attendance and behaviour, and personal development and wellbeing; secondary achievement). Primary inclusion and leadership and governance meet the threshold but not the correction. Of the other 7, primary early years and three secondary areas show no clear association and are inconclusive, and three secondary areas cannot be assessed because of low events.

### Descriptive shares by IDACI fifth

Share of graded schools below Expected standard, least (1) to most (5) deprived fifth (MI, 31 October 2026). Every cell has at least 10 schools.

| Phase | Area | All | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Primary | Inclusion | 9.3% | 7.8% | 8.9% | 11.8% | 7.7% | 10.4% |
| Primary | Curriculum and teaching | 21.0% | 16.5% | 19.3% | 22.5% | 20.0% | 25.7% |
| Primary | Achievement | 28.1% | 18.3% | 22.7% | 29.3% | 31.6% | 36.6% |
| Primary | Attendance and behaviour | 13.9% | 5.4% | 9.3% | 11.2% | 16.4% | 25.6% |
| Primary | Personal development and wellbeing | 3.8% | 2.0% | 2.2% | 3.9% | 2.8% | 7.4% |
| Primary | Leadership and governance | 14.4% | 11.1% | 11.4% | 16.4% | 14.3% | 18.1% |
| Primary | Early years | 10.8% | 9.4% | 8.8% | 11.3% | 9.5% | 14.6% |
| Secondary | Inclusion | 12.2% | 4.2% | 7.2% | 15.7% | 16.8% | 14.4% |
| Secondary | Curriculum and teaching | 23.0% | 9.2% | 15.8% | 25.9% | 28.0% | 30.9% |
| Secondary | Achievement | 32.9% | 8.3% | 23.7% | 34.9% | 42.7% | 46.3% |
| Secondary | Attendance and behaviour | 22.5% | 10.8% | 20.1% | 27.7% | 21.0% | 28.2% |
| Secondary | Personal development and wellbeing | 7.3% | 5.0% | 3.6% | 8.4% | 9.8% | 8.5% |
| Secondary | Leadership and governance | 15.3% | 6.7% | 9.4% | 22.3% | 18.2% | 17.0% |
| Secondary | Post-16 provision | 11.7% | 6.8% | 14.8% | 14.1% | 13.2% | 8.3% |

Special schools (143), alternative provision (38, of which 35 have an IDACI quintile) and nursery schools (62) are descriptive only, as planned. Their IDACI distribution leaves fewer than 10 schools in at least one end fifth, so the JSON reports pooled fifths 1–2 and 4–5 with Wilson intervals. Every interval is wide; no comparison in these phases can be read as a difference. Secondary early years (33 schools) is likewise descriptive only.

### Safeguarding

3,622 schools Met and 15 Not met (MI, 31 October 2026). Not broken down further, as planned.

### Robustness and sensitivity

Controlled AME (IDACI 5 vs 1, percentage points) under each pre-registered variation. CIs for every cell are in the JSON (`sensitivity`).

| Phase | Area | Main | IPW: context | IPW: + prior grade | Ordinal | Cluster by LA | Excl. predecessor URN | + Nov reports | Linear IDACI, per fifth | Results as band | Excl. imputed prior attainment |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Primary | Inclusion | +5.6 | +5.9 | +5.2 | +3.2 | +5.6 | +5.5 | +5.4 | +1.3 | n/a | n/a |
| Primary | Curriculum and teaching | +9.6 | +9.6 | +8.6 | +6.5 | +9.6 | +9.4 | +8.1 | +2.3 | n/a | n/a |
| Primary | Achievement | +17.2 | +17.0 | +16.0 | +16.2 | +17.2 | +17.1 | +16.4 | +4.5 | n/a | n/a |
| Primary | Attendance and behaviour | +19.3 | +19.5 | +19.7 | +13.8 | +19.3 | +19.2 | +18.5 | +4.8 | n/a | n/a |
| Primary | Personal development and wellbeing | +5.8 | +5.4 | +4.3 | +1.8 | +5.8 | +5.8 | +5.3 | +1.3 | n/a | n/a |
| Primary | Leadership and governance | +6.1 | +5.6 | +4.8 | +5.0 | +6.1 | +6.1 | +5.9 | +1.7 | n/a | n/a |
| Primary | Early years | +4.6 | +4.7 | +5.0 | +3.4 | +4.6 | +4.5 | +5.0 | +1.1 | n/a | n/a |
| Secondary | Inclusion | +4.2 | +3.3 | +1.7 | −2.3 | +4.2 | +4.2 | +3.4 | +0.7 | +4.5 | +4.1 |
| Secondary | Curriculum and teaching | +7.4 | +6.9 | +6.5 | −0.8 | +7.4 | +7.4 | +7.2 | +1.3 | +9.0 | +7.2 |
| Secondary | Achievement | +16.9 | +14.8 | +14.5 | +7.7 | +16.9 | +16.9 | +16.0 | +3.4 | +19.3 | +16.6 |
| Secondary | Attendance and behaviour | +4.0 | +4.5 | +3.1 | −5.1 | +4.0 | +4.0 | +5.7 | −0.5 | +4.6 | +3.9 |
| Secondary | Personal development and wellbeing | −2.1 | −1.7 | −2.5 | −0.5 | −2.1 | −2.1 | −1.1 | −0.2 | −1.8 | −2.1 |
| Secondary | Leadership and governance | +0.9 | +0.6 | −0.4 | −3.7 | +0.9 | +0.9 | +1.7 | −0.3 | +1.6 | +0.8 |
| Secondary | Post-16 provision | −2.6 | −2.1 | −2.7 | −0.3 | −2.6 | −2.6 | −1.1 | −1.4 | −3.2 | −2.6 |

Reading the sensitivities:

- **Weighting.** For secondaries a third weight, which also includes the 2024/25 results gap, gives estimates within 0.6 points of the context weight (JSON `ipw_context_results`; secondary achievement 13.6, CI 4.0 to 23.2). The fullest secondary weight (context and prior OEIF quality of education grade) gives achievement 14.5 (4.8 to 24.3); the primary equivalent gives achievement 16.0 (10.2 to 21.8).
- **Clustering by local authority** widens intervals slightly and changes no reading.
- **Predecessor URNs, daily reports, results as a band, imputed prior attainment:** no reading changes. With the November reports added, primary early years rises to 5.0 (0.7 to 9.4), which would just meet the materiality threshold; the main estimate does not.
- **Linear IDACI.** The per-fifth slope times four is close to the 5 vs 1 contrast for primary achievement (4.5 × 4 = 18) and attendance and behaviour (4.8 × 4 = 19), so those are not driven by one fifth. For secondary achievement it is 3.4 per fifth (13.6 across four steps), a little below the categorical 16.9.
- **Ordinal.** Primary estimates are similar in direction and mostly in size (achievement 16.2, 11.1 to 21.3). Secondary estimates are smaller and some change sign (achievement 7.7, 0.7 to 14.7; attendance and behaviour −5.1, −11.7 to +1.4). The ordinal model assumes deprivation shifts grades evenly across the whole scale; the exploratory analysis below shows that in secondaries it does not, which is why the binary outcome was chosen as the main measure and the ordinal model as a check.

### Representativeness

Inspected schools against all open state-funded schools in the phase (MI, 31 October 2026; SEN, January 2026). Standardised mean differences (inspected vs not yet inspected) are all below 0.23 in absolute size in primary and secondary.

| | Primary: all | Primary: inspected | Secondary: all | Secondary: inspected |
| --- | --- | --- | --- | --- |
| Schools | 16,675 | 2,638 (15.8%) | 3,423 | 756 (22.1%) |
| IDACI fifth 1 (least deprived) | 20.0% | 19.1% | 20.0% | 15.9% |
| IDACI fifth 5 (most deprived) | 19.9% | 21.9% | 20.0% | 24.9% |
| EHC plan share (mean) | 4.2% | 4.4% | 3.7% | 4.0% |
| SEN support share (mean) | 15.8% | 16.5% | 14.7% | 15.8% |
| Pupils (mean) | 268 | 256 | 1,064 | 1,017 |
| Academy | 50% | 48% | 84% | 82% |
| Previous OEIF quality of education Requires improvement | 6.6% | 13.3% | 11.6% | 19.2% |
| Previous OEIF quality of education Outstanding | 6.7% | 2.1% | 11.6% | 4.5% |

The inspection model on context alone discriminates weakly (AUC 0.57 primary, 0.60 secondary); adding the previous OEIF quality of education grade raises it to 0.64 and 0.63. Trimmed weights range from 0.38 to 3.37 (primary) and 0.47 to 2.92 (secondary). Weighting moves no main estimate by more than 3.3 points (secondary achievement, results-inclusive weight) and changes no reading.

### Trend

Controlled AME re-estimated on report cards published (MI publication date) by the end of each month. A month is reported only when the sample passes the plan's minimum-size and events rules, so early months are blank.

| Published by | Primary achievement | Primary attendance and behaviour | Secondary achievement |
| --- | --- | --- | --- |
| 30 April 2026 | +16.8 (+7.1 to +26.5), n 692 | not enough events | not enough events |
| 31 May 2026 | +20.2 (+11.3 to +29.0), n 968 | not enough events | not enough events |
| 30 June 2026 | +19.0 (+11.6 to +26.5), n 1,439 | +19.6 (+13.1 to +26.1) | not enough events |
| 31 July 2026 | +16.7 (+9.6 to +23.7), n 1,732 | +20.5 (+14.5 to +26.4) | not enough events |
| 31 August 2026 | +16.8 (+9.8 to +23.8), n 1,735 | +20.5 (+14.6 to +26.5) | not enough events |
| 30 September 2026 | +17.7 (+11.5 to +23.8), n 2,304 | +20.8 (+15.5 to +26.1) | +16.6 (+5.4 to +27.7), n 657 |
| 31 October 2026 | +17.2 (+11.4 to +23.0), n 2,638 | +19.3 (+14.3 to +24.2) | +16.9 (+6.0 to +27.8), n 724 |
| 23 November 2026 (with daily-read reports) | +16.4 (+11.1 to +21.8), n 3,074 | +18.5 (+14.0 to +23.0) | +16.0 (+6.0 to +26.0), n 824 |

Every other area's series is in the JSON. None shows a drift larger than its interval; primary leadership and governance moves from 10.9 (June) to 6.1 (October), within overlapping intervals. Secondary inclusion, personal development and wellbeing and post-16 provision never reach the events threshold in any month.

## Exploratory (not in the plan)

These were run after the pre-registered results were seen, to understand them. They should be treated as leads, not findings.

**1. Top of the scale.** AME (IDACI 5 vs 1) on the probability of being graded Strong standard or Exceptional, with the same models.

| Phase | Area | Raw | Controlled |
| --- | --- | --- | --- |
| Primary | Achievement | −6.8 (−11.2 to −2.5) | −7.7 (−12.7 to −2.6) |
| Primary | Attendance and behaviour | −20.0 (−25.3 to −14.6) | −18.9 (−25.1 to −12.7) |
| Secondary | Achievement | −12.4 (−22.3 to −2.6) | +2.7 (−5.6 to +11.1) |
| Secondary | Attendance and behaviour | −10.8 (−21.4 to −0.3) | +12.4 (+3.2 to +21.6) |
| Secondary | Curriculum and teaching | −5.8 (−15.1 to +3.5) | +8.0 (+0.6 to +15.4) |
| Secondary | Leadership and governance | −5.2 (−15.4 to +4.9) | +9.2 (0.0 to +18.3) |

In primaries, deprivation is associated with fewer high grades as well as more low ones. In secondaries, once prior attainment and results are held constant, schools in the most deprived fifth are, if anything, more often graded Strong standard or above in several areas, while still more often graded below Expected standard for achievement. All other areas are in the JSON.

**2. Which secondary controls carry the change.** Achievement AME: raw on the same 724 schools 38.4; plus results gap 35.4; plus SEN and size 33.5; plus prior attainment 21.8; plus prior attainment and results 17.9; full model 16.9. The same pattern holds in every area: prior attainment of the intake accounts for most of the fall from raw to controlled. Prior attainment and IDACI fifth are correlated (r = −0.35 among inspected secondaries), so the controlled comparison is between deprived and less deprived schools with similar intakes, a narrower comparison with wider intervals.

**3. Other context in the controlled models.** AME per standard deviation, holding IDACI and the rest constant (JSON `exploratory_other_context_per_sd`). In primaries, a higher SEN support share is associated with a higher chance of being below Expected standard for achievement (+5.2 points per SD, +3.5 to +7.0), and larger schools with a lower chance in most areas (about −2 points per SD). In secondaries, higher prior attainment (−15.8 per SD for achievement) and a better 2024/25 results gap (−22.5 per SD for achievement) are both strongly associated with fewer below-Expected grades in every area, and pupil stability is associated with fewer for achievement (−6.0 per SD, −9.5 to −2.6).

## Deviations from the plan

1. **Sensitivity sample.** The plan described the November reports as "added". In the event 565 were first report cards and 5 replaced an earlier report card for the same school; both are handled as planned (latest per school).
2. **Prior-grade weight.** As planned, it adds the previous OEIF quality of education grade to the context model; for secondaries it does not also include the results gap (that is the separate `ipw_context_results` weight). An earlier draft of the script included both; it was corrected before results were written up, and the difference was under 0.5 points.
3. **Trend for M2r areas.** Months for areas whose main model is M2r use the M2r events threshold (70 primary, 90 secondary events), consistent with the plan's rules.
4. **Exploratory analyses** above were added after seeing the results and are labelled as such.
5. **Representativeness tables** suppress any inspected category with fewer than 10 schools (relevant to alternative provision and nursery), which the plan implied but did not state.

No pre-registered estimate was dropped, re-specified or re-run with different choices after the results were seen.

## Data gaps and limits

- **Primary context is thin.** No public school-level primary prior attainment, mobility or results on the allowed sources, so primary estimates cannot hold intake attainment constant. Given how much prior attainment changed the secondary estimates, the primary estimates should not be read as "same intake, different grades".
- **Secondary prior attainment** (`pa_index`) describes the 2023/24 GCSE year group, not the whole school, and mobility (`nonmob_pct`) the 2025/26 GCSE year group. Both are proxies for the whole-school intake.
- **The 2024/25 results gap** comes from the Explorer's open replica of the similar-schools model, not the official list.
- **IDACI quintile** is Ofsted's, based on where pupils live. The plan used it as the exposure; the existing areas page's alternative (disadvantaged share) was not used here.
- **Small phases.** Special, alternative provision and nursery schools are too few to model; nothing can be said about context in those phases yet.
- **Low events.** Secondary inclusion (89 below Expected, one short of the threshold), personal development and wellbeing (53) and post-16 (45) cannot be assessed.
- **Selection on unobservables.** Weighting handles what Ofsted's scheduling shares with observed context and prior grades, not anything else that drives who is inspected first.
- **The MI holds only each school's latest full inspection,** so a school re-inspected under the renewed framework counts once, with its latest grades.
