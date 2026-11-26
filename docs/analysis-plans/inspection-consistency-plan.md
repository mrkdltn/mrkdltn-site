# How consistent is inspection? Pre-registered analysis plan

Written 26 November 2026, before any inspector code had been created or any grade looked at by inspector. The commit that adds this file is the evidence that the plan came first. Mark asked for this analysis in the live conversation on 26 November 2026, on the condition set out below: one national answer, never a judgement on any individual.

## The question

Among renewed-framework report cards, how much of the variation in whether an area is graded below Expected standard is associated with which lead inspector led the inspection, once school context, region and timing are held constant?

The answer is a small set of national figures with their uncertainty. Nothing in this analysis is reported, published or shown to anyone for an individual inspector, including to Mark.

## What this analysis will never do

- Name, rank, profile or score any inspector, or produce a "report card" for one.
- Publish or keep per-inspector estimates outside the restricted folder described below.
- Try to re-identify any inspector from a code.
- Say that any grade is wrong. A difference between inspectors' grading patterns, after the controls here, is still an association. It may reflect work that no public data records, or the schools each inspector is sent to.

## Data

- **Report cards:** every renewed-framework full inspection of a state-funded school that began on or after 10 November 2025 and is in the Report Language corpus at the cut-off date (Ofsted management information plus report cards read daily since). The cut-off and counts are recorded with the results.
- **Grades:** from Ofsted's management information, or from the report card's grade summary for reports not yet in MI (the parser's grades are checked against MI; see `docs/report-language/parse-audit.md`).
- **Lead inspector code:** taken from the report text by the Report Language parser and converted on extraction to a keyed hash (HMAC-SHA256, 12 hex characters). The key is held separately from the codes, outside the repository; no name is stored anywhere new. Only the lead inspector is coded; team members are not.
- **School context** (as in `docs/analysis-plans/grades-context-plan.md`): IDACI fifth, SEN support and EHC plan shares, size, urban or rural setting, governance, phase. For secondaries also prior attainment, pupil stability and the 2024/25 results gap against 50 similar schools.
- **Region and timing:** Ofsted region; month the inspection began.

Ethnicity, trust identifiers and any information about inspectors beyond the code are never used.

## Outcomes

For each of the four areas with the most schools below Expected standard, so that the models have enough events: achievement, curriculum and teaching, attendance and behaviour, and leadership and governance. The outcome is binary: Needs attention or Urgent improvement against Expected standard or above. Inclusion, personal development and wellbeing, early years and post-16 are reported only if they reach the events rule below.

## Model

A logistic model with a random intercept for lead inspector:

below Expected ~ context + phase + Ofsted region + month + (1 | lead inspector)

- **Main sample:** primaries and secondaries pooled, with phase and phase-specific context terms (secondary-only controls interacted with phase). Special, alternative provision and nursery schools are excluded from the main model and described only.
- **Fitting:** Bayesian estimation (PyMC) with weakly informative priors: Normal(0, 2.5) on fixed effects, half-Normal(1) on the inspector standard deviation. Four chains, convergence checked (R-hat below 1.01, effective sample size above 400). Fixed seed; code in `scripts/analysis/inspection_consistency.py`.
- **Inclusion of inspectors:** lead codes with at least 5 report cards in the main model. Codes with fewer are pooled into one "few reports" group. Sensitivity runs: at least 10, and all codes.
- **Events rule:** a model is fitted only where there are at least 10 schools below Expected standard per fixed-effect parameter; otherwise the area is reported descriptively only.

## The figures reported

For each area, with 95% credible intervals:

1. **The inspector standard deviation** on the log-odds scale.
2. **The median odds ratio (MOR):** for two report cards on identical schools led by two inspectors picked at random, the median ratio of their odds of a below-Expected grade.
3. **A plain-language spread:** for a typical school (all context at its median), the predicted chance of a below-Expected grade under an inspector at the 25th and at the 75th percentile of the inspector distribution, in percentage points.
4. **The latent-scale intra-class correlation:** σ² / (σ² + π²/3).

Pre-stated reading of the MOR, set now:
- below 1.2: little association with the lead inspector;
- 1.2 to 1.5: modest;
- above 1.5: substantial.

A reading is stated only where the whole 95% interval falls within one band; otherwise it is reported as uncertain between bands.

## A benchmark for chance

Some apparent clustering by inspector arises by chance and from how inspections are allocated. To separate the two:

- **Permutation benchmark:** shuffle lead codes among report cards within strata of region × month × phase, keeping each code's number of reports, and re-estimate the inspector standard deviation, 200 times (a faster maximum-likelihood fit, the same for observed and shuffled data). The observed value is reported against the distribution of shuffled values, as a percentile.
- **Allocation:** the main model holds region and month constant, because inspectors largely work within regions. A sensitivity run adds region × month terms. A second sensitivity run restricts to secondaries with the full results controls.

## What is reported, and to whom

- **Results first go to Mark** as a short summary and a results file with national figures only: `docs/analysis-plans/inspection-consistency-results.md`.
- **Every pre-registered figure is reported, including nulls.** Anything added later is labelled exploratory.
- **No table, chart or file outside the restricted folder holds an inspector-level number.** Counts are given as the number of inspectors and the distribution of reports per inspector (minimum, median, maximum).
- **Publication on the site is a separate decision for Mark**, after he has seen the results.

## Data protection

- **What is personal data here.** Lead inspector names in published report texts are personal data, even though they appear in public documents and relate to a public role.
- **Purpose.** Research into the consistency of a public function, with a single national, aggregate output.
- **Minimisation.** Names are converted to codes at extraction. The key is kept apart from the codes. Only the lead inspector is coded. No individual-level output is produced or shared.
- **Storage.** Codes live only in `restricted/` in the corpus folder outside the repository, never in git, never in the published corpus bucket, and never in the derived statistics.
- **Retention.** The codes and the key are deleted once the results are agreed, unless Mark decides to repeat the analysis on a later cut. In that case they are kept no longer than 12 months.
- **Legal advice.** This plan is not legal advice. Before anything from it is published, Mark may wish to have the approach checked by someone qualified in data protection law.

## Limits named in advance

- **Not random allocation.** Inspectors are not assigned at random. Region and month controls reduce, but cannot remove, differences in the schools each inspector meets.
- **The lead inspector does not grade alone.** Team members and Ofsted's quality assurance and moderation also shape the final grades.
- **Unobserved school differences.** Whatever no public data records stays in the inspector term if it happens to be clustered by inspector.
- **Few reports per inspector.** With only a year of renewed-framework inspections, many inspectors have led few report cards. The inspector standard deviation will be estimated with wide uncertainty, and that is the honest result.

## Amendment 1, 26 November 2026 (before any real data was fitted)

Approved by Mark in the live conversation on 26 November 2026. At the time of this amendment the analysis code had been run only on synthetic data; no lead-inspector code had been read or fitted. The real run had not taken place and was blocked by the completeness guard (45% of the corpus).

**1. The allocation sensitivity run uses region × school term, not region × month.** Region × month adds about 96 terms, and the events rule (10 schools below Expected standard per fixed-effect parameter) would need more than 1,100 such schools per area. That is out of reach, so the run could never be fitted. Region × term (autumn: September to December; spring: January to March; summer: April to August), about 24 terms, keeps the allocation check within the events rule. The main model is unchanged and still has region and month terms.

**2. The headline reading is stated only against the chance benchmark.** On synthetic data with no true inspector effect, chance clustering among inspectors who lead few reports still gave a median odds ratio of 1.25 (95% interval 1.04 to 1.42). The bands alone would have read that as "uncertain between little and modest". So:
- An inspector effect is reported as distinguishable from chance only where the observed inspector SD (maximum-likelihood fit) is above the 95th percentile of the 200 shuffled values.
- Otherwise the reading for that area is "not distinguishable from chance", whatever the MOR band.
- The MOR, its interval and its band are still reported in full in every case.
