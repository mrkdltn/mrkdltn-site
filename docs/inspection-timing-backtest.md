# Inspection timing: backtest

Run on 24 November 2026 with `scripts/backtest_inspection_timing.py` and the rules in `docs/inspection-timing-rules.md` (the same `scripts/inspection_timing.py` the build uses).

## Question

Do the rules describe what Ofsted has actually done since renewed-framework inspections began? For each rule group: how many schools were inspected, when relative to the computed usual point, and was anyone inspected after the computed statutory latest date?

## Method

- **Starting state.** Ofsted MI, *latest inspections as at 31 October 2025*, the last release before renewed-framework inspections began on 10 November 2025. Each school is classified exactly as the panel would have classified it on that date. Schools that closed or took a new URN before the October 2026 MI are dropped, because they were not at risk for the whole window.
- **Outcome.** The first full inspection (section 5, or a section 8 inspection deemed section 5) that started on or after **1 December 2025**, from Ofsted's MI *all inspections, year to date* files for 2025/26 (published by 31 August 2026) and 2026/27 (published by 31 October 2026), plus 565 report cards read from Ofsted's reports site since the October MI (`data/raw/reports_daily.csv`). The latest start date in the data is 3 November 2026.
- **Interval.** Start of the new inspection minus the anchor (publication of the last report, or the open date for a new school), in years.
- **Band.** "Within ±12 m" means within 12 months either side of the computed usual point, as the brief specified. That band is wide; the interquartile range is the more telling figure.
- **Statutory check.** Every school whose computed statutory date fell on or before 3 November 2026 was checked for a full inspection by that date. Here any full inspection from 1 November 2025 counts, so the 124 schools inspected between 10 and 30 November 2025 are not wrongly counted as misses.

Sources: Ofsted, [State-funded school inspections and outcomes: management information](https://www.gov.uk/government/statistical-data-sets/monthly-management-information-ofsteds-school-inspections-outcomes) (files as at 31 October 2025 and 31 October 2026; year to date to 31 August 2026 and 31 October 2026), fetched 24 November 2026.

## Summary

| Rule group | Eligible at 31 Oct 2025 | Inspected | Share inspected | Usual point fell in window: inspected | Before usual −12 m | Within ±12 m | After usual +12 m | Before usual point | Median interval (yrs) | IQR (yrs) | After statutory |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| STD4 (last: graded) | 9,973 | 1,277 | 13% | 940 of 1,299 | 1% | 99% | 0% | 39% | 4.06 | 3.92–4.20 | 0 |
| STD4 (last: ungraded) | 8,335 | 1,434 | 17% | 1,027 of 1,335 | 1% | 99% | 0% | 37% | 4.08 | 3.93–4.22 | 0 |
| **STD4, all** | **18,308** | **2,711** | **15%** | **1,967 of 2,634** | 1% | 99% | 0% | 38% | **4.07** | **3.93–4.22** | **0** |
| NEW (predecessor inspected) | 1,569 | 347 | 22% | 152 of 508 | 3% | 95% | 1% | 7% | 2.98 | 2.79–3.15 | 0 |
| NEW (no predecessor inspection) | 133 | 39 | 29% | 33 of 50 | 0% | 100% | 0% | 0% | 2.81 | 2.76–2.85 | 0 |
| RI25: RI_OE (RI overall, before Sept 2024) | 722 | 462 | 64% | 382 of 459 | 0% | 100% | 0% | 63% | 2.43 | 2.28–2.57 | 0 |
| RI25: UNG_CONCERN (ungraded "concerns", before Sept 2024) | 123 | 73 | 59% | 36 of 43 | 1% | 99% | 0% | 85% | 2.17 | 1.97–2.36 | 0 |
| RI25: RI_KJ (RI key judgement, after Sept 2024) | 528 | 4 | 1% | none yet | 75% | 25% | 0% | 100% | 1.31 | 1.10–1.60 | 0 |
| RI25: UNG_SLIP (ungraded "not as strong", after Sept 2024) | 126 | 7 | 6% | none yet | 100% | 0% | 0% | 100% | 1.04 | 0.98–1.16 | 0 |
| MON_LEG (serious weaknesses or special measures) | 57 | 24 | 42% | – | – | – | – | – | 1.82 | 1.62–2.27 | 0 |

Not in the table: MON_NA and MON_COC did not exist at 31 October 2025 (they follow renewed-framework report cards), and CLOSING cannot be backtested because GIAS keeps no history of proposed closures.

STD4 pooled intervals, percentiles: 5th 3.65, 10th 3.75, 25th 3.93, median 4.07, 75th 4.22, 90th 4.35, 95th 4.44 years. 24 of the 2,711 (0.9%) were inspected under 3 years after their last report.

## Statutory limit

- **Inspected after the computed statutory latest date: none.**
- **Statutory date reached with no full inspection by it: none.** Before the November check was widened, 8 schools (URNs 105090, 109481, 116249, 123200, 133364, 139094, 139918, 143430) appeared here. Each had a 31 July 2026 limit and each was inspected between 11 and 25 November 2025, before the 1 December cut-off. They were artefacts of the window, not misses.
- **The statutory reading holds where it could fail.** Two tests, each of which could have contradicted it:
  - *Ungraded inspections reset the limit.* 7 schools graded in May to July 2021 (a 31 July 2026 limit from the graded inspection alone) had an ungraded inspection in 2024/25 and still have no full inspection. If ungraded inspections did not reset the clock, all 7 would be past their statutory limit. With the reset their limit is 31 July 2030.
  - *The 7-year transitional rule.* URN 136734, last inspected 26 November 2019, was inspected on 24 March 2026, 6.2 years later. Under a flat five-year rule its limit would have been 31 July 2025; under reg. 3ZA it is 31 July 2027. The only other baseline school in that window had a graded inspection in June 2025 that was published after the October 2025 snapshot.
- **School year from 1 August.** The data cannot separate a 1 August from a 1 September year-start, because Ofsted does not inspect in August. The regulation's wording settles it.

## What this shows

1. **The four-year rule describes current practice closely.** Half of the 2,711 STD4 schools inspected since December 2025 were inspected between 3.93 and 4.22 years after their last report was published; 90% fell between 3.75 and 4.44 years. It makes no difference whether the last inspection was graded or ungraded. Ofsted is working through schools close to their four-year points: of the schools whose usual point fell inside the window, three quarters were inspected within it.
2. **The 2.5-year rule fits the RI schools.** For schools judged requires improvement overall before September 2024, the median was 2.43 years and the IQR 2.28–2.57. Ungraded "concerns" schools came a little earlier (median 2.17).
3. **New schools are inspected late in their third year.** The median was 2.98 years after opening for schools with an inspected predecessor and 2.81 years for new provision; only 7% were inspected before the middle of the third year. The rules file draws the band as the whole third year with no single usual point, and the panel should do the same.
4. **The two post-September-2024 RI groups have not reached their usual points yet** (spring 2027 onwards). The handful inspected so far came early, as Ofsted's "we may inspect sooner" allows. The rule is untested for them.
5. **Legacy categories** were followed by a full inspection a median 1.82 years after the graded report, consistent with Annex 1's 18 and 24-month programmes.

## Caveats

- **Selection.** Intervals describe schools that *were* inspected within an 11-month window. Schools further from their usual point are under-represented, so the spread describes Ofsted's recent practice, not the chance that a given school is inspected at a given time. The panel's empirical line must be worded as a description of what happened.
- **Right-censoring.** Inspections started in October 2026 but not yet published are missing. The share inspected is a floor.
- **Monitoring inspections** are not in the MI files used, so they can be neither counted nor tested.

## The empirical line on the panel

The brief allows one empirical line for a rule group with at least 100 inspected schools. That qualifies **STD4** (2,711), **RI25: RI_OE** (462) and **NEW, predecessor inspected** (347). It does not qualify NEW without a predecessor inspection (39), UNG_CONCERN (73), RI_KJ (4), UNG_SLIP (7) or MON_LEG (24), so those show no empirical line. Proposed wording for STD4:

> Of 2,711 schools on the four-year rule inspected between December 2025 and November 2026, half were inspected between 3.9 and 4.2 years after their previous report was published.

The backtest writes these figures to `data/raw/inspection_timing_backtest.json`, which the build reads, so the line is never typed by hand. They change only when the backtest is re-run against a new MI release.
