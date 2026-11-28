# How Ofsted writes report cards: pre-registered analysis plan

Written 28 November 2026, after the corpus was built and the parse audit accepted, and before any phrase, length, echo or theme had been counted by grade, deprivation or month. The commit that adds this file is the evidence that the plan came first. Results go to `docs/report-language/results.md`, and to Mark as a short summary before any page is built.

The framing throughout is how inspectors write, never what to write to get a grade. The words in a report describe a grade already given; they do not cause it.

## Data

- **Corpus.** Every renewed-framework report card for a state-funded school whose inspection began on or after 10 November 2025, parsed and name-stripped as described in `docs/report-language/parse-audit.md`. Cut-off for this analysis: 28 November 2026. At the cut-off the corpus holds 4,281 parsed report cards (3,144 primary, 873 secondary, 160 special, 60 nursery, 44 alternative provision). The two reports listed for re-fetching in the audit are re-fetched and checked against their stored checksum before the analysis runs; if either cannot be fetched, the older text is dropped and the count is reported.
- **Grades.** From Ofsted's management information (MI), or from the parsed grade summary for reports not yet in MI. Where MI and the PDF disagree (6 grades in 5 reports), the PDF's grade is used, because it is the grade the text was written to.
- **Text unit.** The section for one evaluation area in one report: inclusion, curriculum and teaching, achievement, attendance and behaviour, personal development and wellbeing, early years, post-16 provision, leadership and governance. Next steps are analysed separately (analysis 3). The safeguarding section, the pupils' view section, "about this inspection" and the context section are not used, except for the length descriptives.
- **Deprivation.** Ofsted's IDACI quintile from MI, 1 least to 5 most deprived, as in the Grades and Context plan. Reports with no quintile are left out of analysis 4 only, and counted.
- **Toolkit.** Ofsted's *State-funded school inspection toolkit*. Version 1.1 (updated 5 November 2025) was in force for inspections from 10 November 2025, and version 2.0 (updated June 2026) for inspections from 7 September 2026. The source, version and date are cited on the page and in the results. Version 2.0 is held, with its checksum. Version 1.1 is no longer on GOV.UK (its old address now redirects to version 2.0); a copy is held by the Digital Education Resource Archive. If version 1.1 cannot be obtained, analysis 2 is run against version 2.0 only, and the results say so.
- **Never used.** Inspector identity of any kind, school names, trust identifiers and ethnicity. No language model reads, summarises or classifies any text.

## Preparing the text (the same for every analysis)

1. Lower-case. Normalise curly quotes and dashes. Keep apostrophes inside words ("pupils'"). Treat "and/or" as one token.
2. Remove the placeholders left by name removal ("[name]", "[school]", "[trust]", "[place]" and so on), and the grade words themselves wherever they appear in the text ("exceptional", "strong standard", "expected standard", "needs attention", "urgent improvement"), so that no phrase is distinctive only because it names the grade.
3. Tokens are runs of letters, with apostrophes and hyphens inside words. Numbers become one token, "#".
4. Phrases are 1 to 3 consecutive tokens within one sentence. Phrases made only of stop words (a fixed list of 179 English function words, `scripts/language/stopwords.txt`, committed with the analysis code) are dropped.

## Analysis 1: distinctive language by grade, within each area

- **Comparisons.** Adjacent grades within one area: Exceptional against Strong standard, Strong standard against Expected standard, Expected standard against Needs attention, and Needs attention against Urgent improvement. A comparison is run only if each grade has at least 30 report sections in that area. Otherwise it is listed as not run, with its counts.
- **Counting.** A phrase is counted once per report section (presence, not frequency), so that one long section cannot dominate.
- **Eligibility.** A phrase counts only if it appears in at least 20 report sections in that area overall, and in at least 10 in each of the two grades compared.
- **Statistic.** The weighted log-odds ratio with an informative Dirichlet prior (Monroe, Colaresi and Quinn, 2008, *Political Analysis* 16(4), equation 22), and its z-score. The prior for each area is the phrase's count across all of that area's sections, at all grades, scaled so that the prior's total is 1,000 pseudo-counts. Sensitivity runs use prior totals of 250 and 4,000, and the results report how many of the phrases with |z| ≥ 3.29 keep that status under each.
- **Reading.** Every eligible phrase's z-score is published, not only the extremes. On the page a phrase is called "leans towards" a grade only where |z| ≥ 3.29 (about p < 0.001 two-sided, chosen in advance because thousands of phrases are tested). Phrases between 1.96 and 3.29 are shown in the table, but not described as distinctive.
- **Phase.** Run for primaries and secondaries pooled, then for each separately where the 30-section rule allows.

## Analysis 2: toolkit echo

- **Measure.** For each report section, the share of its tokens that sit inside a run of five or more consecutive tokens that also appears, after the same preparation, in the toolkit's text for the same evaluation area. Each report section is compared with the toolkit version in force on its inspection date. The share is reported per section, then averaged across sections, by area, grade, phase and month, with 95% intervals from 2,000 bootstrap resamples of reports (seed 20261128).
- **Like-for-like over time.** A change of toolkit in September 2026 could change echo simply because the reference text changed. So the month-by-month series is also given against the five-token runs found in both versions. That is the series used to say whether reports are converging on the toolkit's language. The series against the version in force is shown beside it.
- **Stock phrasing.** Report templates repeat some fixed sentences that are not toolkit wording. As a sensitivity, five-token runs found in more than half of that area's sections are left out of the measure.
- **Reading.** A month-on-month trend is described only if the like-for-like share in the last three complete months with inspections (July, September and October 2026) differs from the first three (December 2025 to February 2026) by more than 1 percentage point, and the 95% bootstrap interval for the difference excludes zero. Otherwise it is "no clear change".

## Analysis 3: next steps themes

- **Lexicon.** A transparent theme lexicon (keywords and phrases per theme, with exclusions) is drafted from a random development sample of 300 next-steps items. While drafting, the sample is read without its school's grades or deprivation. Mark reviews the draft, and it is then frozen as `docs/report-language/next-steps-lexicon-v1.md` before any theme is counted on the full corpus. Themes are this project's own grouping, never presented as Ofsted's categories.
- **Classification.** Each next-steps item can carry more than one theme. Items that match no theme are counted as "other", and that share is reported.
- **Validation.** After the lexicon is frozen, a fresh random sample of 100 items (not the development sample) is classified by hand. Precision and recall for each theme are reported against the hand labels. A theme with precision below 0.8 is shown with that warning on the page.
- **Figures.** The share of reports carrying each theme: (a) by the report's lowest area grade, and (b) by the number of areas below Expected standard (0, 1, 2 or more). Phase is shown separately for each. Wilson 95% intervals. Cells with fewer than 10 reports are shown as "<10".

## Analysis 4: length and reading level, and the pre-registered deprivation comparison

**Descriptives.** For each area and grade:
- words per section;
- sentences per section;
- mean sentence length;
- Flesch reading ease;
- Flesch–Kincaid grade, using a published syllable-counting rule, implemented in the analysis code and tested.

These are the median and interquartile range, by phase.

**The comparison (confirmatory).** Holding grade constant, are reports for schools in the most deprived fifth (IDACI 5) written differently from reports for schools in the least deprived fifth (IDACI 1)?

- **Sample.** Primaries and secondaries in IDACI fifths 1 and 5, all eight area sections that have a grade. Special, AP and nursery are excluded (too few in each fifth).
- **Outcomes (three, pre-specified):**
  1. **Length:** words in the section (log).
  2. **Hedging:** qualifying words and phrases per 100 words, using the frozen hedge list below.
  3. **Toolkit echo:** the like-for-like measure from analysis 2.
- **Model.** For each outcome, one pooled regression on area sections: outcome ~ most deprived fifth + area × grade + phase + month + phase × area. Standard errors are clustered by report. The estimate is the coefficient on the most deprived fifth, with its 95% confidence interval. Length is reported as a percentage difference.
- **Multiplicity.** Holm correction across the three outcomes.
- **Smallest difference that matters, set now:**
  - length: 5% of words;
  - hedging: 0.2 per 100 words;
  - echo: 1 percentage point.
- **Reading, set now:**
  - **"Written differently"** only if the Holm-adjusted p is below 0.05 and the estimate is larger than the smallest difference that matters.
  - **"No meaningful difference"** if the whole 95% interval lies within plus or minus that smallest difference.
  - Otherwise **"inconclusive"**.
- **Sensitivity:**
  - each area separately;
  - adding school size, SEN support and EHC plan shares, and urban or rural setting;
  - fifths 1–2 against 4–5.

  The sensitivity runs are reported in full. They don't change the headline reading.

**Hedge list, frozen now.** The hedges are:

> however; although; though; while (as a conjunction); whereas; not yet; not always; not consistently; inconsistent; inconsistently; variable; variably; at times; sometimes; occasionally; in some; some pupils; some staff; some subjects; a few; a small number; beginning to; starting to; still developing; less secure; less well; not as well; not as strong; in places; on occasion; on the whole; mostly; most pupils; largely; generally; typically.

Matching is on whole tokens after preparation.

## Analysis 5: over time

- **Phrase shares by month.** For every phrase eligible in analysis 1, the share of report sections using it, monthly from December 2025 to the last complete month before the cut-off (October 2026).
  - **Months shown separately:** November 2025, which has 124 reports, is shown on its own and labelled.
  - **Months merged:** a month with fewer than 100 reports is merged with the following month and labelled. There were no inspections in August.
  - **Toolkit change:** the change from version 1.1 to version 2.0, on 7 September 2026, is marked on every time series.
- **Mix of schools.** Which schools are inspected changes from month to month. Each monthly share is therefore also given standardised to the corpus-wide mix of phase × area grade (direct standardisation).
- **Status.** This analysis is descriptive. Any phrase singled out for its trend is labelled exploratory.

## Determinism and code

- The code goes in `scripts/language/analysis.py`, with tests on synthetic text in `scripts/language/test_analysis.py`.
- Fixed seeds; the outputs are aggregate tables in `data/derived/report_language/`.
- Snippets for the page are chosen later, by a fixed rule (random with a fixed seed, among sections containing the phrase). They are labelled only by phase, area, grade and month, and are never shown for a cell of fewer than 10 reports.
- Every pre-registered figure is reported, including nulls and comparisons not run. Anything added after this plan is labelled exploratory.

## Limits named in advance

- **Circularity.** Report text is written to justify the grade, so the link between words and grade is partly built in. Analysis 1 describes the language used at each grade. It is not evidence of what drives grades.
- **Not a random sample of inspections.** Timing, phase and which schools are due for inspection change across the year, so monthly change is partly a change of schools. The standardised series reduces this, but cannot remove it.
- **The deprivation comparison holds the grade, not the school, constant.** Two schools at Expected standard can sit at different places within the grade. A difference in wording may reflect that, not a difference in how inspectors write about deprived schools.
- **Parse error.** The audit found boundary errors in about 2% of context sections and no errors in area sections; small residual errors remain possible.
- **Toolkit versions.** Echo against two versions is not strictly comparable. The like-for-like series is the guard, and only it is used to judge convergence.
- **Templates.** Some phrasing comes from Ofsted's report templates and editing rather than from individual inspectors. The stock-phrasing sensitivity shows how much this matters.

## Amendment 1, 28 November 2026 (before any counting)

Approved by Mark in the live conversation on 28 November 2026. At the time of this amendment nothing in the plan had been counted, and no report text had been read by grade, deprivation or month. It adds two analyses and corrects one statement.

### Correction: who labels the validation samples

The Data section says that no language model reads or classifies any text. That is true of every published figure: each one comes from the deterministic code and the frozen lexicons in this plan. But the hand-labelled samples used to validate those lexicons (analysis 3, and analyses 6 and 7 below) are labelled by the analyst, and the analyst here is Claude, reading each item. To keep that honest:

- the labelling rules are written down before any labelling;
- each item is labelled without its school's grades, deprivation or results in view;
- Mark checks a random 30 items from each labelled sample, and the agreement rate is reported.

No language-model output appears on the site.

### Analysis 6: the toolkit map (which standards inspectors write about)

**Standards.** Each toolkit version is split into its standards. For each evaluation area, a standard is one bulleted statement under a grade heading. Each standard gets an identifier (area, grade heading, position) and keeps its text. The split is committed as `data/derived/report_language/toolkit_standards_v1.1.csv` and `_v2.0.csv` before any matching.

**Matching.**
- Each sentence of an area section is compared with every standard for the same area, in the version in force on its inspection date.
- Similarity is BM25 (k1 = 1.2, b = 0.75) on the prepared tokens with stop words removed, normalised by the score of the standard matched against itself.
- A sentence is assigned to its best-matching standard only if the normalised score reaches a threshold. Otherwise it is "unmatched".

**Threshold and validation.**
- 200 area-section sentences are drawn at random (seed 20261128) and labelled with the standard each one evidences, or "none".
- The first 100 set the threshold: the lowest value giving precision of at least 0.8 for assigned sentences.
- The second 100 test it. Precision, recall and the unmatched share are reported from the test set only.
- If test precision is below 0.7, the map is published only as "the standards whose wording reports echo most", with that caveat. It is not described as what reports are about.

**Figures (descriptive).** For each area and grade:
- the share of sentences assigned to each standard;
- the share of report sections with at least one sentence assigned to it.

Both are grouped by the standard's grade heading. They are also shown by phase. Cells of fewer than 10 report sections are shown as "<10". A standard is said to be "written about at this grade" only if at least 20% of sections at that grade carry it. Nothing here is a confirmatory test.

**Across versions.** Standards in v1.1 and v2.0 are linked where their texts have a normalised BM25 similarity of at least 0.8 in both directions. Linked standards are shown as one row across the September 2026 change. Unlinked ones are shown as belonging to one version only.

### Analysis 7: words against data (does achievement text track published results?)

**Sample.**
- *Confirmatory:* secondary schools with a report card and a 2024/25 Attainment 8 gap against their 50 similar schools in the Explorer (the published, open measure).
- *Exploratory:* primaries, against 2024/25 KS2 reading, writing and maths expected standard, where school-level data is published.

**Text measure.**
- *Results sentences:* sentences in the achievement section that refer to published outcomes. They are found by a frozen results lexicon: outcomes, results, attainment, examinations, GCSE, national tests, key stage, published data, progress measures, national average, and their forms.
- *Direction:* each results sentence is classed positive, negative or mixed, using a frozen direction lexicon with negation handling.
- *Section direction:* positive if all results sentences are positive, negative if all are negative, mixed otherwise, and "no results statement" if there are none.
- *Drafting and validation:* both lexicons are drafted from a development sample of 150 achievement sections, read without results or grades. They are validated on a fresh 150 sentences: precision of at least 0.8 for each direction, or the direction is merged into "mixed" and the change reported.

**Data measure.** The Explorer's reading of the Attainment 8 gap against similar schools, in its five bands (well below to well above), and the gap itself in points.

**Figures.**
1. A cross-table of data band × section direction, with row shares and Wilson intervals.
2. Spearman correlation between the Attainment 8 gap and net direction (positive minus negative results sentences, over all results sentences), with a 2,000-resample bootstrap interval. It is given overall, and within each achievement grade with at least 30 schools.
3. Two discordance shares:
   - schools whose results are well below similar schools, but whose achievement text is wholly positive about results;
   - schools whose results are well above, but whose text is wholly negative.

**Reading, set now.**
- "The words track the data" if the overall correlation's 95% interval lies above 0.3.
- "Weak tracking" if it lies above 0 but not wholly above 0.3.
- "No clear tracking" otherwise.
- The within-grade correlations are reported beside the overall one, and are not read as a headline.

**Rules.**
- National and phase aggregates only.
- No school is listed, flagged or shown with its text direction anywhere: on this page, on a school page, or in a download.
- Discordant cases are never named or described individually, not even to Mark.
- This analysis measures whether the wording follows the published data. It is not evidence that any grade or report is wrong.

**Limits.**
- Inspectors weigh more than published results: current pupils' work, the quality of internal assessment, and the secure-fit rules. Under the framework the text should not simply restate the data.
- Published results lag the inspection by up to a year.
- The Explorer's similar-schools gap is this project's open replica, not Ofsted's own measure.

## Amendment 2, 28 November 2026 (after analyses 1, 2, 4, 5 and 6; before analyses 3 and 7)

Approved by Mark in the live conversation on 28 November 2026. At the time of this amendment, analyses 1, 2, 4, 5 and 6 had been run (see `results.md`). Analyses 3 and 7 had not been run, and nothing had been counted by grade, deprivation, month or results with either lexicon.

### Analysis 6 is not published in this release

The toolkit map failed its pre-set validation: precision 0.13 and recall 0.02 on the test set, against a target of 0.8. The plan's fallback, showing the map as "the standards whose wording reports echo most", would still mislead, because the matching favours very short standards. So no figure from analysis 6 appears on the page.

The full result stays in `results.md` as a reported null. Any later attempt would need a new method and a fresh validation sample, and would be labelled as designed after this failure.

### Analysis 3: the next-steps lexicon, frozen as v1

The v0 draft (`next-steps-lexicon-v0.md`) is frozen as v1, with three changes:
- **SEND and disadvantage are split into two themes.**
- **Safeguarding and record-keeping is folded into leadership oversight, evaluation and governance.** It matched 1 item in 300.
- **Sixth form and post-16 stays a theme of its own.**

All other rules are unchanged.

### Analysis 7: the results and direction lexicons, frozen as v1

The v0 draft (`results-lexicon-v0.md`) is frozen as v1, with these rules.

**Directions.** Each results sentence is classed in one of five directions:
- positive;
- negative;
- level ("in line with", "close to", "broadly similar");
- mixed;
- no direction (it mentions results but says nothing about them).

**Section direction.** Sentences with no direction are left out when a section is read as a whole. The section reading is one of:
- positive, if all remaining results sentences are positive;
- negative, if all are negative;
- level, if all are level;
- mixed, otherwise;
- "no results statement", if none remain.

The discordance shares in analysis 7 use the wholly positive and wholly negative sections.

**Net direction.** For the correlation, net direction is (positive − negative) ÷ (positive + negative + level + mixed).

**Trend words.** "Improved" and "declined" count as direction. A version without them is reported as exploratory.

**Results understating the school.** Sentences saying results understate the school, such as "stronger than results suggest", are scored negative about results.

**Validation.** Validation proceeds as set out in the plan and Amendment 1. Mark is asked to check a random 30 of each labelled sample.
