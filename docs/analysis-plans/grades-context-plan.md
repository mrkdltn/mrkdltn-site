# Report card grades and school context: pre-registered analysis plan

Written 25 November 2026, before any report card grade was tabulated against any context variable. The commit that adds this file is the evidence of that order; the analysis script and results are committed after it. Anything done that this plan does not describe will be labelled "exploratory" in the results.

## Question

How far is a school's context associated with its Ofsted report card grades (renewed framework, inspections from 10 November 2025), area by area and phase by phase? For secondary schools, how much of any association remains when 2024/25 results against similar schools are held constant?

This is a national, descriptive analysis of associations. It does not estimate whether any grade is right, does not produce an expected grade, residual or ranking for any school, and names no school.

## What was looked at before writing this plan

Availability only: column names, counts of schools by phase, counts of grades in each area (the outcome on its own, needed to set the events-per-variable rules), missingness of each context variable, join coverage and date ranges. No grade was cross-tabulated against IDACI, SEN, size, region, urban/rural, governance, prior attainment, mobility or results, and no model was fitted.

Counts seen (Ofsted MI, latest inspections as at 31 October 2026):

| Phase | Schools open | With a report card | Fewest "below Expected" in an area | Most |
| --- | --- | --- | --- | --- |
| Primary | 16,675 | 2,638 | 99 (personal development and wellbeing) | 740 (achievement) |
| Secondary | 3,423 | 756 | 55 (personal development and wellbeing) | 249 (achievement) |
| Special | 1,125 | 143 | 7 | 27 |
| Alternative provision | 330 | 38 | 3 | 7 |
| Nursery | 373 | 62 | 3 | 7 |

Safeguarding "Not met": 15 schools across all phases. Report cards in the MI were published between 11 January and 29 October 2026 (none in December 2025); inspections started between 11 November 2025 and 6 October 2026.

## Data sources

Raw downloads are kept outside the repository in `/home/user/mrkdltn-data/grades-context/` and identified by SHA-256 so the run can be reproduced exactly.

| Source | Release | What it gives | File and checksum |
| --- | --- | --- | --- |
| Ofsted, "Management information: state-funded schools, latest inspections as at 31 October 2026" (GOV.UK statistical data set "Monthly management information: Ofsted's school inspections outcomes") | As at 31 October 2026; fetched 24 and 25 November 2026 | Every open state-funded school: phase, type of education, Ofsted region, IDACI quintile, total pupils, latest report card grades, inspection start and publication dates, latest OEIF grades | `mi/mi_latest.csv`, sha256 `791eea96…f111d53f` (same file as `data/raw/ofsted_mi_meta.json`) |
| DfE, "Special educational needs in England", school level data 2026 (January 2026 census) | Published 11 June 2026; data set `c5490fd8-6cf3-469e-9f60-0b4262134cb5`, fetched 25 November 2026 | Pupils, pupils with an EHC plan, pupils on SEN support, urban/rural classification, by LAESTAB, for every school | `sen/sen_school_level_2026.csv`, sha256 `a339a409…4a749d653` |
| DfE, Get Information about Schools, daily extract 25 November 2026 | 25 November 2026 | Urban/rural fallback where the SEN file lacks it | `gias/edubase_20261125.csv` |
| Explorer secondary file `data/raw/ks4_model_v3.csv` (in the repository) | DfE KS4 performance 2024/25 (final) and 2025/26 (provisional, 28 October 2026); open replica of the DfE and Ofsted similar-schools model | `pa_index`, `nonmob_pct`, `ss_diff_25`, `ss_band_25` for 3,298 secondaries | in repository at `d246525` |
| `data/raw/reports_daily.csv` (in the repository) | Report cards read from Ofsted's published reports, 2 to 23 November 2026 | 570 report cards published after the MI cut-off | sensitivity analysis only |

Join keys: MI to SEN by LAESTAB (coverage 99.9% primary, 99.6% secondary, 99.5% special, 99.1% AP); MI to KS4 file by URN.

## Population and samples

- **Population for representativeness and weights:** every open state-funded school in the MI, by Ofsted phase.
- **Main analysis sample:** schools with a report card in the MI as at 31 October 2026. The MI holds only each school's latest full inspection. Inspections that relate to a predecessor URN (15 schools) are kept in the main analysis and dropped in a sensitivity run.
- **Secondary results sample:** main-analysis secondaries that match the KS4 file and have `ss_diff_25` (the 2024/25 Attainment 8 gap to their 50 similar schools).
- **Sensitivity sample:** the main sample plus report cards from `reports_daily.csv` (published 2 to 23 November 2026), with IDACI quintile, size, phase, type and region taken from the MI row for the same URN.

## Outcomes

For each evaluation area: inclusion; curriculum and teaching; achievement; attendance and behaviour; personal development and wellbeing; leadership and governance; early years (primary, where graded); post-16 provision (secondary, where graded).

- **Main outcome:** binary, 1 if the area is graded Needs attention or Urgent improvement ("below Expected standard"), 0 if Expected standard, Strong standard or Exceptional.
- **Robustness:** ordinal logit on the five-point scale (Urgent improvement < Needs attention < Expected standard < Strong standard < Exceptional), reporting the same contrast as the change in predicted probability of being below Expected standard.
- **Safeguarding:** descriptive only (counts of Met and Not met by phase). No model, no breakdown by context, because Not met is too rare (15 schools) and any breakdown would approach groups under 10.

## Context variables, by phase

Decided now, before results. "Yes" means it enters the controlled model for that phase.

| Variable | Definition and source | Primary | Secondary | Special, AP, nursery |
| --- | --- | --- | --- | --- |
| IDACI fifth (exposure of interest) | Ofsted's IDACI quintile, 1 least to 5 most deprived (MI) | Yes | Yes | Descriptive only |
| EHC plan share | EHC plan pupils / all pupils, January 2026 (SEN) | Yes | Yes | Descriptive only |
| SEN support share | SEN support pupils / all pupils, January 2026 (SEN) | Yes | Yes | Descriptive only |
| School size | log of total pupils (MI) | Yes | Yes | Descriptive only |
| Ofsted region | 8 regions (MI) | Yes | Yes | No |
| Urban/rural | Urban vs rural, from the DfE rural-urban classification (SEN file, GIAS fallback) | Yes | Yes | No |
| Governance | Academy (any academy, free school, UTC, studio school, CTC) vs LA-maintained (community, voluntary aided, voluntary controlled, foundation) (MI type of education) | Yes | Yes | No |
| Prior attainment | `pa_index`, KS2 profile of the 2023/24 GCSE year group | **Not available** (KS1 2022/23 proxy undecided; no school-level KS2-entry measure published) | Yes | No |
| Pupil mobility | `nonmob_pct`, share of the 2025/26 GCSE year group who joined at the usual time | **Not available** (no school-level primary mobility in any public file on the allowed hosts) | Yes | No |
| Results | `ss_diff_25`, 2024/25 A8 gap to 50 similar schools, standardised | **Not available** (no school-level KS2 results on the allowed hosts; out of scope) | Yes (results control) | No |

Continuous variables enter linearly, standardised to mean 0 and SD 1 within the phase's analysis sample. Missing context: complete-case analysis; the number dropped is reported for each model.

**Never used:** ethnicity (of pupils or school), trust or MAT identifiers, sponsor identifiers, inspector identifiers, school names. The local authority is used only as a clustering unit in one sensitivity run, never as a predictor.

## Models

Logistic regression for each phase × area, fitted with statsmodels.

- **M0 (raw):** IDACI fifth only.
- **M1 (secondary only, results):** IDACI fifth + `ss_diff_25`.
- **M2 (controlled):** IDACI fifth + every "Yes" variable for the phase in the table above (for secondaries this includes `ss_diff_25`, so "same results" sits inside the model).

**Estimate:** the average marginal effect (AME) of being in the most deprived IDACI fifth rather than the least, others held at their observed values: for each school in the sample, predicted probability with IDACI set to 5 minus predicted probability with IDACI set to 1, averaged. Reported in percentage points with a 95% confidence interval by the delta method (numerical gradient).

**Standard errors:** heteroskedasticity-robust HC1 (sandwich) throughout. Sensitivity: cluster-robust by local authority.

**Materiality threshold (pre-stated):** an AME is called a material association if its absolute size is at least **5 percentage points** and its 95% CI excludes zero. An AME whose CI excludes zero but is under 5 points is reported as "small but distinguishable from zero". Anything else is reported as "no clear association", and where the CI is wide enough to include 5 points either way it is also called "inconclusive".

**Minimum sample and events per variable (pre-stated):**
- A model is fitted only if the phase × area sample has at least 100 schools and at least 40 schools below Expected standard and 40 at or above it (the rarer class).
- M2 is the main controlled model if the rarer class has at least 10 events per model parameter (excluding the intercept). If not, a reduced model **M2r** is the main controlled model: IDACI fifth + EHC share + SEN support share + log size (+ `pa_index` and `ss_diff_25` for secondaries). M2 is then reported as a sensitivity, flagged "low events per variable".
- If even M2r fails the 10-events rule, it is still reported but flagged "low events per variable", and its result cannot be called material.
- Parameter counts: primary M2 = 4 (IDACI) + 3 + 7 (region) + 1 + 1 = 16; primary M2r = 7; secondary M2 = 4 + 3 + 7 + 1 + 1 + 3 (pa, mobility, results) = 19; secondary M2r = 9.
- Special, AP and nursery: expected to fail the minimum, so descriptive only: share below Expected standard in the least and most deprived IDACI fifths (and pooled 1–2 vs 4–5), with Wilson CIs, suppressed where a cell has fewer than 10 schools.

## Representativeness

For each phase, compare inspected and all open state-funded schools on every context variable available for that phase (means, or shares by category), with standardised mean differences. Then fit a logit of being inspected (in the MI sample) on the phase's context variables (the M2 set, excluding `ss_diff_25` for the main weight; for secondaries a second weight adds it), compute inverse-probability-of-inspection weights (stabilised by the overall inspected share, trimmed at the 1st and 99th percentiles), and re-run the main controlled AMEs as a weighted logit (GLM binomial with the weights as `var_weights`, HC1 standard errors). Report raw vs weighted AMEs side by side.

**Second sensitivity on selection (pre-stated):** Ofsted's scheduling depends heavily on the previous inspection, so a further weight adds the latest OEIF quality of education grade (1–4, with "none or not judged" as its own category) to the inspection model. This is labelled as a sensitivity, not the main weight.

## Trend

Re-estimate the main controlled deprivation AME (IDACI 5 vs 1) for every area in primary and secondary on the report cards published (MI publication date) on or before the last day of each month, January to October 2026 (December 2025 has no publications). The same minimum-sample and events rules apply to each month; months that fail them are not reported. The headline trend is achievement; all areas are reported in the results file. A further point at 23 November 2026 uses the sensitivity sample with daily-read reports.

## Other robustness and sensitivity runs (all pre-stated)

1. Ordinal logit on the five-point scale (main controlled covariates), AME on P(below Expected).
2. Cluster-robust SEs by local authority.
3. Excluding inspections that relate to a predecessor URN.
4. Adding report cards published 2 to 23 November 2026 (`reports_daily.csv`).
5. Secondaries: `ss_band_25` (Below, Close to, Above) in place of continuous `ss_diff_25`.
6. Secondaries: excluding the 34 schools whose `pa_index` is imputed.
7. Linear IDACI (1 to 5) in place of categories, reporting the per-fifth slope as a check that the 5 vs 1 contrast is not driven by one fifth.

## Multiple comparisons and reading the results

The pre-registered family is the main controlled IDACI 5 vs 1 AME for each area in primary (7 areas) and secondary (7 areas): 14 estimates. All 14 are reported, whatever they show, with raw and controlled estimates side by side. The materiality label above is applied to each. In addition, Holm-adjusted p-values across the 14 are reported, and a result is described as "robust to multiple comparisons" only if its Holm-adjusted p is below 0.05. No area or phase is singled out in the summary unless it meets the materiality threshold; nulls are reported in the same tables. Sensitivity runs are read for direction and rough size, not re-tested for significance.

## Reporting rules

- British English; "is associated with", never "causes" or "biased".
- No figure for a group under 10 schools. No school-level expected grade, residual, ranking or list. No school named.
- Every number carries its source and date.
- Results go to `docs/analysis-plans/grades-context-results.md` and a compact machine-readable file `docs/analysis-plans/grades-context-results.json`, produced by `scripts/analysis/grades_context.py` (fixed seeds, documented inputs).
- Any deviation from this plan is listed in the results under "Deviations from the plan".
