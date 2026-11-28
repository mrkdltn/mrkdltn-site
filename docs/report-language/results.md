# How Ofsted writes report cards: results

Results of the pre-registered analysis in `docs/report-language/plan.md` (28 November 2026, with Amendments 1 and 2), run on 28 November 2026 by `scripts/language/analysis.py`. Every figure below comes from that code; the tables behind them are in `data/derived/report_language/`. Readings are applied exactly by the rules the plan set in advance. Anything the plan did not ask for is marked **exploratory**. Analyses 3 (next steps) and 7 (words against data) were run after their lexicons were frozen as v1 under Amendment 2 (commit `e00a296`), on validation samples drawn and labelled after that freeze. Under Amendment 2, no figure from analysis 6 appears on the page.

The framing throughout is how inspectors write, not what to write to get a grade. The words in a report describe a grade already given.

## Findings

1. **The language of each grade is distinct, and it is mostly a language of degree.** In 26 of the 32 adjacent-grade comparisons that could be run (primaries and secondaries pooled), 7,278 of 63,057 eligible phrases lean towards one grade or the other (|z| ≥ 3.29). Higher grades lean on intensifiers ("highly", "highly effective", "very well", "exceptionally", "exemplary"); Expected standard leans on "typically", "appropriate", "suitable" and "in line with"; Needs attention leans on "however", "enough", "do not", "too many" and "variable"; Urgent improvement on "lack", "low", "capacity" and "leaders have not". This describes the wording used at each grade. Because the text is written to explain the grade, it is not evidence of what decides grades.
2. **Reports borrow little of the toolkit's wording, and that has not changed.** On average 4.0% of a section's words sit inside a run of five or more words that also appears in the toolkit for that area (95% interval 4.0% to 4.1%). Like for like, the share was 4.02% in December 2025 to February 2026 and 4.05% in July, September and October 2026: a difference of +0.03 percentage points (−0.14 to +0.18). By the pre-set rule, there is **no clear change**.
3. **Holding the grade constant, reports for schools in the most deprived fifth are not written differently from those in the least deprived fifth.** On all three pre-specified outcomes the whole 95% interval lies inside the smallest difference that matters, so each reads **no meaningful difference**: length +1.0% (+0.5% to +1.4%; threshold 5%), hedging −0.09 per 100 words (−0.13 to −0.05; threshold 0.2) and toolkit echo −0.08 percentage points (−0.26 to +0.09; threshold 1). The length and hedging differences are statistically detectable but smaller than the thresholds set in advance.
4. **The toolkit map did not pass its validation, and should not be published as planned.** No threshold gave the required precision of 0.8 on the first 100 labelled sentences (the best was 0.35). On the test set, precision was 0.13 and recall 0.02. Under the plan's own rule the map may be shown only as "the standards whose wording reports echo most", but the matcher's errors are systematic (below), so even that reading would mislead. Amendment 2 records Mark's decision: no figure from analysis 6 is published in this release.
5. **The lower the grade, the longer and broader the next steps.** Reports whose lowest area grade is Strong standard list 1.1 next steps on average, touching 1.7 of the fifteen themes; at Urgent improvement, 5.9 next steps touching 8.4 themes. Almost every theme is commoner as the lowest grade falls (disadvantage dips from 22% at Strong standard to 18% at Expected standard before rising). The steepest rises are in leadership oversight (15% of reports at Strong standard, 79% at Urgent improvement), staff expertise (4% to 58%) and behaviour (2% to 47%). Across all reports, the commonest themes are quality and consistency of teaching (54%), reading, writing and number foundations (49%), assessment (45%) and SEND and adaptation (42%). Four themes failed the precision test and carry a warning: curriculum design, personal development, sixth form and published outcomes.
6. **In secondary achievement sections, what the text says about results tracks the published data.** The Spearman correlation between a school's 2024/25 Attainment 8 gap to its 50 similar schools and the net direction of its results sentences is 0.57 (95% interval 0.52 to 0.61; 810 schools). The whole interval lies above 0.3, so by the pre-set rule **the words track the data**. Where results were well above similar schools, 66% of achievement sections are wholly positive about results; where they were well below, 36% are wholly negative and about half mixed. In each discordant cell (well below but wholly positive, well above but wholly negative), fewer than 10 schools fall: under 7.6% and under 9.1% of their bands. Within an achievement grade the link is weaker (0.02 at Strong standard, 0.30 at Expected standard, 0.18 at Needs attention), as expected when the grade already reflects the results.

## Data and sources

- **Corpus.** 4,281 renewed-framework report cards (inspections from 10 November 2025 to the cut-off of 28 November 2026), parsed and name-stripped as in `docs/report-language/parse-audit.md`: 3,144 primary, 873 secondary, 160 special, 60 nursery, 44 alternative provision. 29,216 graded area sections, 456,974 sentences. Source: Ofsted report cards, files.ofsted.gov.uk; contains public sector information licensed under the Open Government Licence v3.0.
- **Re-fetching.** The two reports flagged in the audit were re-fetched and checked on 28 November 2026 (`parse-audit.md`, "Re-fetched"). Neither was dropped.
- **Grades.** As printed in each PDF (which the parser reads). They agree with Ofsted's management information in 32,466 of 32,472 grades; the 6 differences are the source discrepancies recorded in the audit, and the PDF grade is used.
- **Deprivation, school size.** Ofsted, *Management information: state-funded schools, latest inspections as at 31 October 2026* (sha256 791eea96…d53f): the IDACI quintile (1 least, 5 most deprived) and total pupils. Every primary and secondary in the corpus has a quintile.
- **SEN and setting.** DfE, *Special educational needs in England*, January 2026 census, published 11 June 2026 (school-level file, slim extract): pupils, SEN support, EHC plans, urban or rural. GIAS daily extract of 25 November 2026 as fallback for urban or rural.
- **Toolkit.** Ofsted, *State-funded school inspection toolkit*, version 1.1 (updated 5 November 2025, in force from 10 November 2025; copy held by the Digital Education Resource Archive, https://dera.ioe.ac.uk/id/eprint/41595/1/Schools_inspection_toolkit.pdf; sha256 19357681…5243) and version 2.0 (updated June 2026, for inspections from 7 September 2026; https://assets.publishing.service.gov.uk/media/6a915d1c01bbff0bf8f97b51/Schools_inspection_toolkit.pdf; sha256 c3e82d7e…4b80). 3,222 reports were inspected under version 1.1 and 1,059 under version 2.0 (no inspection in the corpus fell between 1 and 7 September 2026).
- **Secondary results (analysis 7).** The Explorer's secondary file, `data/raw/ks4_model_v3.csv` (sha256 c5b29075…c7b2, as committed on 16 November 2026): DfE key stage 4 performance, 2024/25 (final), and the open replica of the DfE and Ofsted similar-schools model, as described on the Explorer's method page. The 2024/25 Attainment 8 gap to the 50 similar schools (`ss_diff_25`) and its reading (`ss_band_25`) are read exactly as the Explorer serves them, after the same small-group suppression its build applies.
- **Primary results (analysis 7, exploratory).** Not run. No school-level 2024/25 key stage 2 reading, writing and mathematics expected-standard file is held in the repository or the data folder (`grades-context/ks2/` holds only a catalogue page).
- **Syllables.** The CMU Pronouncing Dictionary (Carnegie Mellon University), through the `cmudict` Python package, version 1.1.3, with a vowel-group rule for words it does not list.

## Analysis 1: distinctive language by grade, within each area

Tables: `a1_summary.csv` (every comparison, run or not, with counts), `a1_phrases.csv.gz` (every eligible phrase's z-score, for every comparison run).

**Comparisons run.** Primaries and secondaries pooled: 26 of 32 run. Not run because a grade had fewer than 30 sections: curriculum and teaching, Exceptional against Strong standard (29 and 613); personal development and wellbeing, Needs attention against Urgent improvement (166 and <10); early years, Exceptional against Strong standard (21 and 805) and Needs attention against Urgent improvement (269 and 26); post-16, Exceptional against Strong standard (21 and 110) and Needs attention against Urgent improvement (46 and <10). Primaries alone: 17 of 32 run (post-16 has no primary sections). Secondaries alone: 18 of 32 run. The counts for each comparison not run are in `a1_summary.csv`.

**Pooled run.** 63,057 phrase-comparison pairs were eligible. 7,278 have |z| ≥ 3.29 and are read as "leans towards" a grade: 3,316 towards the higher grade, 3,962 towards the lower. A further band of phrases between 1.96 and 3.29 is shown in the table but not described as distinctive. Primaries alone: 5,417 phrases lean; secondaries alone: 648 (fewer sections, so fewer reach the threshold).

**Sensitivity to the prior.** Of the 7,278 phrases with |z| ≥ 3.29 under a prior of 1,000 pseudo-counts, all 7,278 keep that status (same sign) with a prior of 250, and 7,169 (98.5%) with 4,000. With section counts in the hundreds and thousands, the prior barely moves the estimates.

**What leans where (pooled; |z| shown).** The strongest phrases in each direction, for each comparison run, are in `a1_phrases.csv.gz`. A few, to show the pattern:

| Area | Comparison | Leans higher | Leans lower |
| --- | --- | --- | --- |
| Inclusion | Strong v Expected | "highly" (23.6), "highly inclusive" (13.0), "thrive" (12.4) | "typically" (13.6), "appropriately" (10.1), "suitable" (9.0) |
| Inclusion | Expected v Needs attention | "carefully" (5.4), "leaders ensure" (5.2) | "enough" (19.8), "however" (18.1), "staff do not" (13.4) |
| Curriculum and teaching | Expected v Needs attention | "carefully" (8.7), "typically" (7.8), "helps pupils" (7.0) | "enough" (15.6), "teachers do not" (15.5), "variable" (14.1) |
| Achievement | Strong v Expected | "very well" (21.6), "achieve highly" (15.9) | "typically" (13.0), "in line with" (11.9), "however" (11.6) |
| Achievement | Needs attention v Urgent | "some pupils" (4.0) | "not achieve well" (7.9), "without the" (7.2), "lack" (6.9) |
| Attendance and behaviour | Exceptional v Strong | "exemplary" (7.2), "exceptionally" (7.1) | none at 3.29 |
| Attendance and behaviour | Expected v Needs attention | "in line with" (7.8) | "however" (17.8), "too many" (16.3) |
| Personal development and wellbeing | Strong v Expected | "extensive" (14.3), "detailed" (13.8), "deep" (13.3) | "a range of" (10.5), "appropriate" (9.6) |
| Leadership and governance | Needs attention v Urgent | none at 3.29 | "capacity" (7.6), "lack" (5.9), "poor" (5.8), "governors do not" (5.4) |

Two patterns hold across areas. The Expected standard is described in the toolkit's own register of sufficiency ("typically", "appropriate", "in line with"), and the steps above it in intensifiers. The step down to Needs attention is marked by qualification and shortfall ("however", "enough", "not consistently"); the step to Urgent improvement by absence and failure. Comparisons with Exceptional are thin (30 to 90 sections at that grade) and lean almost entirely one way.

**Reading.** As the plan says, this describes the language used at each grade. The text is written to explain the grade, so the link is partly built in.

## Analysis 2: toolkit echo

Table: `a2_echo.csv` (overall; by area, area × grade, phase, phase × area, month, month × area, version; each with a 95% interval from 2,000 bootstrap resamples of reports, seed 20261128; cells with fewer than 10 reports are suppressed).

**Level.** Across all 29,215 sections with text, 4.07% of words sit in a five-token run found in the toolkit version in force (like for like, 4.03%, 95% interval 3.98% to 4.09%). By area, like for like:

| Area | Sections | Echo (like for like) | 95% interval |
| --- | --: | --: | --- |
| Inclusion | 4,281 | 2.6% | 2.5% to 2.7% |
| Curriculum and teaching | 4,281 | 3.4% | 3.3% to 3.5% |
| Achievement | 4,281 | 8.1% | 8.0% to 8.3% |
| Attendance and behaviour | 4,281 | 2.3% | 2.2% to 2.3% |
| Personal development and wellbeing | 4,281 | 3.5% | 3.4% to 3.6% |
| Early years | 3,004 | 4.1% | 4.0% to 4.3% |
| Post-16 provision | 525 | 3.8% | 3.5% to 4.2% |
| Leadership and governance | 4,281 | 4.2% | 4.1% to 4.4% |

Achievement borrows most, chiefly its stock references to national tests and the next stage of education. Within areas, echo is highest at Expected standard (for example achievement: 8.8% at Expected standard, 7.7% at Strong standard, 7.2% at Needs attention); the full grid is in the table. By phase it ranges from 2.4% (nursery) to 4.3% (secondary).

**The pre-set reading (like for like).** First three months with inspections (December 2025 to February 2026; 870 reports, 5,959 sections): 4.02%. Last three complete months (July, September and October 2026; 1,378 reports, 9,413 sections): 4.05%. Difference +0.03 percentage points, 95% interval −0.14 to +0.18. It is not larger than 1 point and the interval includes zero: **no clear change**.

**Against the version in force** (shown beside it, as the plan asks; not used to judge convergence): 4.03% and 4.14%, a difference of +0.11 points (−0.06 to +0.26). The month-by-month series against both references is in the table, with the toolkit change of 7 September 2026 falling between July and September.

**Stock phrasing sensitivity.** Very few five-token runs occur in more than half of an area's sections (3 in inclusion, 2 in curriculum and teaching, 2 in achievement, none elsewhere), and none of them is also a toolkit run. Leaving them out changes no figure.

## Analysis 3: next steps themes

Lexicon: `next-steps-lexicon-v1.md`, frozen 28 November 2026 under Amendment 2 (fifteen themes; this project's own grouping, not Ofsted's categories). Tables: `a3_validation.csv`, `a3_themes.csv` (every theme by lowest area grade and by areas below Expected standard, for all phases and each phase, with Wilson 95% intervals), `a3_items.csv` (item-level shares). Hand labels: `validation_ns_labels.csv` (identifiers and themes only). Labelling rules: `labelling-rules.md`, second part, written before the sample was drawn.

**Validation.** 100 next-steps items drawn at random (seed 20261128 + 3) from the 9,751 items left after the 300 development items were removed, labelled by hand from their text alone, then classified by the lexicon. The lexicon gave exactly the hand-labelled set of themes for 62 of the 100 items.

| Theme | Hand | Lexicon | Both | Precision | Recall | |
| --- | --: | --: | --: | --: | --: | --- |
| Curriculum design and sequencing | 10 | 11 | 7 | 0.64 | 0.70 | **precision below 0.8** |
| Quality and consistency of teaching | 29 | 30 | 26 | 0.87 | 0.90 | |
| Assessment, checking understanding and closing gaps | 26 | 25 | 23 | 0.92 | 0.88 | |
| Reading, writing, language and number foundations | 27 | 27 | 27 | 1.00 | 1.00 | |
| SEND and adaptation | 15 | 18 | 15 | 0.83 | 1.00 | |
| Disadvantaged pupils and the pupil premium | 10 | 10 | 10 | 1.00 | 1.00 | |
| Attendance and punctuality | 10 | 11 | 10 | 0.91 | 1.00 | |
| Behaviour and attitudes | 6 | 6 | 6 | 1.00 | 1.00 | |
| Personal development, wider curriculum and preparation for life | 6 | 13 | 5 | 0.38 | 0.83 | **precision below 0.8** |
| Early years | 6 | 7 | 6 | 0.86 | 1.00 | |
| Sixth form and post-16 | 0 | 1 | 0 | 0.00 | none to find | **precision below 0.8** |
| Leadership oversight, evaluation and governance | 18 | 13 | 13 | 1.00 | 0.72 | |
| Staff expertise, training and workload | 7 | 6 | 6 | 1.00 | 0.86 | |
| Parents, families and partnerships | 3 | 3 | 3 | 1.00 | 1.00 | |
| Published outcomes and attainment | 8 | 15 | 8 | 0.53 | 1.00 | **precision below 0.8** |
| Other (no theme) | 1 | 3 | 0 | | | |

Four themes fall below 0.8 precision and carry that warning wherever they are shown, as the plan sets. Each fails for a reason visible in the false matches: personal development fires on "wider curriculum" (meaning all subjects, not the personal development offer; 5 of its 8 false matches), "wider opportunities", "aspirations" and "employment"; published outcomes on "outcomes" in its general sense, "improve pupils' achievement" and "end of key stage" in purpose clauses; curriculum design on "remember", "prior learning", "essential knowledge" and "build the knowledge" in items about assessment or teaching; sixth form on "students" in an item about the whole school. Several precisions rest on few items (sixth form on one, parents on three). Mark's check of 30 of the labels (`check-for-mark-next-steps.md`) awaits him; the agreement rate will be added here.

**Coverage.** 4,257 of the 4,281 reports have at least one next-steps item (10,051 items in all); the 24 without any are left out. 352 items (3.5%) match no theme and are "other"; 66 reports (1.5%) carry only "other".

**Figures (share of reports carrying each theme; all phases).** Themes marked † carry the precision warning.

| Theme | All reports | Lowest grade: Strong standard | Expected standard | Needs attention | Urgent improvement |
| --- | --: | --: | --: | --: | --: |
| Reports | 4,257 | 422 | 2,354 | 1,366 | 115 |
| Curriculum design and sequencing † | 24% | 6% | 21% | 31% | 48% |
| Quality and consistency of teaching | 54% | 19% | 54% | 63% | 83% |
| Assessment, checking understanding and closing gaps | 45% | 6% | 40% | 63% | 77% |
| Reading, writing, language and number foundations | 49% | 14% | 46% | 63% | 76% |
| SEND and adaptation | 42% | 32% | 36% | 53% | 91% |
| Disadvantaged pupils and the pupil premium | 23% | 22% | 18% | 28% | 61% |
| Attendance and punctuality | 34% | 14% | 27% | 49% | 66% |
| Behaviour and attitudes | 10% | 2% | 6% | 14% | 47% |
| Personal development † | 21% | 13% | 20% | 21% | 62% |
| Early years | 20% | 2% | 19% | 24% | 47% |
| Sixth form and post-16 † | 3% | 2% | 3% | 4% | <10 |
| Leadership oversight, evaluation and governance | 32% | 15% | 26% | 43% | 79% |
| Staff expertise, training and workload | 18% | 4% | 15% | 24% | 58% |
| Parents, families and partnerships | 7% | 4% | 6% | 10% | <10 |
| Published outcomes and attainment † | 24% | 16% | 18% | 35% | 38% |
| Other only | 2% | 12% | 1% | <10 | 0% |

No report has Exceptional as its lowest area grade. By the number of areas below Expected standard (2,776 reports with none, 482 with one, 999 with two or more), the pattern is the same: for example attendance 25%, 45% and 53%, leadership 25%, 30% and 54%, behaviour 6%, 9% and 21%. The full grid, with intervals and every phase, is in `a3_themes.csv`.

**By phase.** Primaries (3,136 reports) follow the all-phase pattern closely. In secondaries (863 reports), attendance is commoner at every grade (21% at Strong standard, 37% at Expected standard, 64% at Needs attention, 82% at Urgent improvement), and so is SEND and adaptation (43% to 91%); the foundations theme is rarer (20% at Expected standard against 53% in primaries). Special schools, nursery schools and alternative provision have few reports in most cells; their cells under 10 are shown as "<10".

**Reading the figures (exploratory context).** Lower grades bring more next steps: 1.1 items per report where the lowest grade is Strong standard, 2.0 at Expected standard, 3.1 at Needs attention and 5.9 at Urgent improvement. So a theme's share rises with the grade's fall partly because there are more items to carry it. The figures describe what next steps ask for at each grade; they are not a list of what to fix to move up a grade.

## Analysis 4: length, reading level and the deprivation comparison

Tables: `a4_descriptives.csv` (median and interquartile range for each area × grade × phase, and all phases; cells under 10 sections suppressed), `a4_deprivation.csv` (headline, sensitivity runs and raw means).

**Descriptives (all phases, medians).** Sections run from about 150 words (achievement) to about 300 (personal development and wellbeing), with mean sentences of 12 to 16 words. Length varies little with grade: Exceptional sections are a little longer in every area (for example inclusion 225 words against 202 at Expected standard). Reading ease falls as the grade rises: in curriculum and teaching the median Flesch reading ease is 35 at Exceptional, 44 at Expected standard and 50 at Urgent improvement (Flesch–Kincaid grade 12.3, 10.6 and 10.0). The median section at Strong standard or Exceptional contains no hedge from the frozen list; the median at Needs attention contains between 1 and 3 per 100 words.

**The comparison (confirmatory).** Primaries and secondaries in IDACI fifth 1 (743 reports) and fifth 5 (908 reports); 11,304 graded area sections. No report in the sample lacked a quintile. Model: outcome ~ most deprived fifth + area × grade + phase + month + phase × area, OLS, standard errors clustered by report; Holm correction across the three outcomes.

| Outcome | Estimate (fifth 5 against fifth 1) | 95% interval | Holm p | Smallest difference that matters | Reading |
| --- | --: | --- | --: | --: | --- |
| Length (words, log; as % difference) | +0.96% | +0.47% to +1.44% | 0.0002 | 5% | **No meaningful difference** |
| Hedging (per 100 words) | −0.089 | −0.126 to −0.051 | <0.0001 | 0.2 | **No meaningful difference** |
| Toolkit echo (like for like, points) | −0.08 | −0.26 to +0.09 | 0.36 | 1 point | **No meaningful difference** |

For context, the raw means: 215 words in fifth 1 and 217 in fifth 5; 0.93 and 0.98 hedges per 100 words; echo 4.20% and 4.07%. The raw hedging gap runs the other way from the adjusted one because fifth 5 has more sections at lower grades, where hedges are commoner.

**Sensitivity (reported in full; it does not change the headline).**

- *Each area separately* (outcome ~ fifth 5 + grade + phase + month). Length: +0.8% to +2.3% in inclusion, curriculum and teaching, achievement and attendance and behaviour, near zero in personal development and leadership; early years +0.5% and post-16 +0.8%, both with wide intervals. Hedging: −0.02 to −0.28 per 100 words, largest in achievement (−0.28, −0.40 to −0.15). Echo: −0.50 to +0.10 points, every interval including zero. The by-area estimates are not multiplicity-adjusted and are not read as findings.
- *Adding school size, SEN support share, EHC plan share and urban or rural setting* (complete cases): length +0.89% (+0.25% to +1.52%), hedging −0.086 (−0.135 to −0.037), echo −0.10 (−0.33 to +0.13).
- *Fifths 1–2 against 4–5* (3,203 reports): length +0.77% (+0.42% to +1.12%), hedging −0.069 (−0.096 to −0.042), echo −0.08 (−0.21 to +0.04).

Every sensitivity interval for the pooled models lies inside the smallest differences that matter, except the achievement-only hedging estimate, whose interval reaches −0.40.

**Limit, as named in advance.** The comparison holds the grade, not the school, constant. Two schools at Expected standard can sit at different places within the grade.

## Analysis 5: over time

Tables: `a5_months.csv` (the months as shown), `a5_phrase_months.csv.gz` (for every phrase eligible in analysis 1, in its area, the share of primary and secondary sections using it each month, raw and directly standardised to the corpus-wide mix of phase × area grade; any count under 10 shown as "<10" and its shares left blank).

| Month shown | Reports (all phases) | Primary and secondary | Toolkit | Note |
| --- | --: | --: | --- | --- |
| 2025-11 | 124 | 114 | v1.1 | Shown on its own: the first weeks of the framework |
| 2025-12 + 2026-01 | 543 | 517 | v1.1 | Merged: December had fewer than 100 reports |
| 2026-02 to 2026-07 | 327 to 734 | 303 to 668 | v1.1 | One row each (see table) |
| 2026-09 | 679 | 655 | v2.0 | No inspections in August; toolkit change on 7 September 2026 |
| 2026-10 | 372 | 354 | v2.0 | The last complete month before the cut-off |

November 2026 (fewer than 10 reports) is left out. This analysis is descriptive. No phrase is singled out here for its trend; any that is later will be labelled exploratory.

## Analysis 6: the toolkit map

Tables: `toolkit_standards_v1.1.csv` (206 standards) and `toolkit_standards_v2.0.csv` (204), committed before any matching; `toolkit_map_labels.csv` (the hand labels, committed before the matcher was run); `a6_threshold_curve.csv`; `a6_toolkit_map.csv.gz`; `a6_unmatched.csv`; `a6_version_links.csv`. Labelling rules: `labelling-rules.md`, written before labelling. 30 items for Mark: `check-for-mark-toolkit-map.md`.

**Validation sample.** 200 area-section sentences drawn at random (seed 20261128): 154 labelled with a standard and 46 "none" (71 and 29 in the first 100; 83 and 17 in the second). Each was labelled from its text, area and toolkit version alone; the key to its report was not opened.

**Threshold.** No threshold on the first 100 reached precision 0.8. Precision rises slowly as the threshold rises and then falls: the highest was 0.35 (6 correct of 17 assigned, at a normalised score of 0.246). The plan does not say what to do when no threshold qualifies; the closest faithful reading was to take that best threshold and test it as planned.

**Test set (second 100).** Precision 0.13 (2 correct of 15 assigned), recall 0.02 (2 of 83 sentences with a standard label), unmatched share 0.85. Test precision is below 0.7, so by the plan's rule the map may be published only as "the standards whose wording reports echo most", with that caveat. It is not described as what reports are about.

**Why it fails (exploratory).** Ignoring the threshold, the best-matching standard was the hand label for 16 of the 83 labelled test sentences, and under the same grade heading for 26. The normalisation the plan fixed (divide by the standard's score against itself) rewards very short standards, whose self-score is small: any sentence mentioning workload scores highly against "Staff workload is unsustainable", and any mentioning pastoral support against "Pupils do not receive the pastoral support they need". As a result the figures assign these Urgent improvement standards to between 70% and 91% of leadership and personal development sections at every grade, including Exceptional. That is an artefact of the measure, not a finding about reports, and it is why even the caveated "echo most" reading would mislead. **Recommendation:** do not publish the map figures. If Mark wants a toolkit map, a second amendment could fix a different normalisation (for example by the sentence's own score, or a length-penalised similarity) and validate it on a fresh sample; anything built that way would be post hoc and labelled so.

**Across versions.** 198 pairs of standards are linked (normalised BM25 similarity of at least 0.8 in both directions); the rest are shown as belonging to one version only (`a6_version_links.csv`). The linking uses the same normalisation, so short standards may be over-linked; it is shown for completeness.

**Mark's check.** The 30 items in `check-for-mark-toolkit-map.md` await Mark. The agreement rate will be added here.

**Amendment 2.** Mark decided on 28 November 2026 that no figure from analysis 6 is published in this release. This section stays as a reported null.

## Analysis 7: words against data

Lexicons: `results-lexicon-v1.md`, frozen 28 November 2026 under Amendment 2. Tables: `a7_validation.csv`, `a7_crosstab.csv`, `a7_spearman.csv`, `a7_discordance.csv`. Hand labels: `validation_rs_labels.csv` (identifiers and labels only). Every table is a national aggregate. No school is listed, flagged or identifiable in any file, and no discordant case is described.

**Validation.** 150 results sentences drawn at random (seed 20261128 + 11) from the 9,199 sentences the results lexicon selects in achievement sections, after every sentence of the 150 development sections was removed. Each was labelled by hand from the sentence alone, then classified.

- *Results lexicon.* 141 of the 150 selected sentences (0.94) do refer to published results. The other 9 use a results word in another sense: "prior attainment", "greater depth" or "below-average starting points" to describe pupils, "outcomes" or "standards" in a general sense, "a result of", or a GCSE examination as a point in time.
- *Direction.* Hand and lexicon agree on 117 of 150 (0.78).

| Direction | Hand | Lexicon | Both | Precision | Recall |
| --- | --: | --: | --: | --: | --: |
| Positive | 66 | 53 | 51 | 0.96 | 0.77 |
| Negative | 29 | 24 | 20 | 0.83 | 0.69 |
| Level | 28 | 27 | 26 | 0.96 | 0.93 |
| Mixed | 4 | 5 | 1 | 0.20 | 0.25 |
| None | 23 | 41 | 19 | 0.46 | 0.83 |

Positive, negative and level each reach precision 0.8, so **no direction is merged into "mixed"** under Amendment 1. The lexicon's main error is to miss a direction (a direction by hand, "none" by the lexicon: 22 sentences), mostly where the direction is carried by a phrase it does not list or masks: pupils "reach" or "meet" the expected or higher standard, "a high proportion pass", "higher outcomes than", "around average", "matches the national average". Those sentences drop out of the section reading and the net direction, rather than being misread. "Mixed" is rare and poorly found (1 of 5); the plan has no rule for it, since it is where other directions are merged. Mark's check of 30 of the labels (`check-for-mark-results.md`) awaits him.

**Sample (confirmatory: secondaries).** 873 secondary report cards; 835 have a 2024/25 Attainment 8 gap to their 50 similar schools in the Explorer (36 are not in the Explorer's secondary file and 2 have no 2024/25 gap in it). They hold 2,269 results sentences: positive 870, negative 480, level 396, mixed 79, none 444. 810 schools have at least one results sentence with a direction, and so a net direction.

**Data measure.** The gap is the Explorer's own 2024/25 figure: the school's Attainment 8 minus the average of its 50 similar schools in the open replica. The Explorer's 2024/25 reading has three bands (Above, Close to, Below: a gap beyond 1.96 standard errors). The plan's five bands are formed by applying the Explorer's own rule for its five-band reading on top: Above or Below becomes Well above or Well below where the gap is also larger than the spread of the 50 similar schools' 2024/25 Attainment 8 (see Deviations). Of the 835 schools: well above 110, above 111, close to 338, below 144, well below 132.

**1. Cross-table (row shares; section reading of the achievement text).**

| 2024/25 gap to similar schools | Schools | Wholly positive | Wholly negative | Level | Mixed | No results statement |
| --- | --: | --: | --: | --: | --: | --: |
| Well above | 110 | 66% (57 to 75) | <10 | <10 | 25% (17 to 33) | <10 |
| Above | 111 | 45% (36 to 54) | 0% (0 to 3) | 10% (6 to 17) | 42% (34 to 52) | <10 |
| Close to | 338 | 27% (22 to 32) | 9% (7 to 13) | 9% (7 to 13) | 52% (46 to 57) | <10 |
| Below | 144 | 9% (5 to 15) | 23% (17 to 30) | 10% (6 to 16) | 55% (47 to 63) | <10 |
| Well below | 132 | <10 | 36% (28 to 44) | <10 | 52% (43 to 60) | <10 |
| All | 835 | 27% | 14% | 9% | 47% | 3% |

Wilson 95% intervals in brackets. A cell of 1 to 9 schools is shown as "<10" with no share.

**2. Spearman correlation between the gap and net direction** (2,000 bootstrap resamples of schools, seed 20261128, percentile intervals).

| Group | Schools | Spearman | 95% interval |
| --- | --: | --: | --- |
| **All secondaries** | 810 | **0.567** | **0.516 to 0.611** |
| Achievement: Strong standard | 154 | 0.022 | −0.144 to 0.186 |
| Achievement: Expected standard | 359 | 0.298 | 0.202 to 0.382 |
| Achievement: Needs attention | 247 | 0.179 | 0.052 to 0.292 |
| Achievement: Exceptional (26 schools), Urgent improvement (24) | | not run: fewer than 30 schools | |

**The pre-set reading.** The overall interval (0.516 to 0.611) lies wholly above 0.3: **the words track the data**. The within-grade correlations are reported beside it and, as the plan says, not read as a headline. They are smaller because the achievement grade already carries much of the results: within a grade, the text still leans with the data at Expected standard and Needs attention, and shows no clear link at Strong standard.

**3. Discordance shares.**

- Results well below similar schools, achievement text wholly positive about results: fewer than 10 of 132 schools (under 7.6%).
- Results well above similar schools, text wholly negative about results: fewer than 10 of 110 schools (under 9.1%).

Both counts are under 10, so only an upper bound is published. As a sensitivity on the Explorer's three-band reading: below and wholly positive, 16 of 276 (5.8%, 3.6% to 9.2%); above and wholly negative, fewer than 10 of 221 (under 4.5%). With the schools that have no results statement left out of the denominator, the bounds barely move (`a7_discordance.csv`).

**Exploratory: without trend words.** Leaving out "improved", "declined" and the other trend words (as listed in the lexicon), the overall correlation is 0.573 (0.523 to 0.618; 801 schools); within grades, −0.023 at Strong standard, 0.255 at Expected standard and 0.232 at Needs attention. Trend words do not drive the result.

**Primaries (exploratory).** Not run: no school-level 2024/25 key stage 2 expected-standard data is held.

**Limits, as named in advance.** Inspectors weigh more than published results, and under the framework the text should not simply restate them. Published results lag the inspection by up to a year. The similar-schools gap is this project's open replica, not Ofsted's own measure. This analysis measures whether the wording follows the published data; it is not evidence that any grade or report is wrong.

## Deviations and judgement calls

Each point below is a place where the plan was impossible to follow to the letter, or left a choice open. In each case the closest faithful reading was taken.

1. **Re-fetch checksums.** The plan asked for each re-fetched report to be "checked against its stored checksum". Both new files differ from the stored ones by nature (one revised, one a different report). Three matching downloads, the URN, inspection date and every grade against the management information were checked instead (`parse-audit.md`).
2. **What a standard is.** In the Expected and Strong standard columns the toolkit prints statements as separate paragraphs without bullets; each paragraph is taken as one standard. Sub-bullets ("−") stay inside their parent standard. Lead-in sentences and the bullets after "If this grade is awarded ..." are not standards. A statement split across a page is re-joined.
3. **Removed words as boundaries.** Placeholders and grade words are removed and also end the run of tokens, so no phrase or five-token run is formed across the gap. "Exceptional" is removed wherever it appears, including as an ordinary adjective, as the plan says.
4. **Sentences.** Split at a full stop, question or exclamation mark followed by a capital, digit, quote or placeholder, except after common abbreviations and initials. Every analysis forms phrases and runs within sentences.
5. **"Primaries and secondaries pooled"** in analysis 1 is read as primary and secondary schools only. Eligibility ("at least 20 sections in that area overall") and the prior use the sections in the run being analysed. The prior is spread over every 1- to 3-token phrase in that run, in proportion to its section count; group totals are the summed section counts of all phrases in the grade.
6. **Echo reference text.** The toolkit's text "for the same evaluation area" is every page from the area's heading to the next area's, grading tables read column by column, paragraphs and bullets kept apart. Version by inspection date: v2.0 from 7 September 2026.
7. **Bootstrap.** Percentile intervals; reports resampled within each cell (fresh generator, seed 20261128, for each cell); for the period difference, reports resampled within each period independently. The first and last three months are pooled sections from those calendar months.
8. **Words.** For length and reading level, words are letter tokens with grade words kept (they are the inspector's words) and numbers left out. Hedges per 100 words use the prepared tokens (grade words removed, numbers kept as "#").
9. **Syllables.** "A published syllable-counting rule" is met by the CMU Pronouncing Dictionary (vowel phonemes of the first pronunciation), with a vowel-group rule, written and tested in `analysis.py`, for words it does not list. The fallback rule is not itself a published one.
10. **Hedges.** Whole-token matching, longest hedge first, no overlaps. "While" counts only as a conjunction, so not after "a", "the", "worth" or "little".
11. **Model.** Month is calendar month (not merged). Empty cells in area × grade and phase × area make the design rank-deficient; the fit uses a pseudo-inverse, which leaves the deprivation coefficient identified. Length is shown as exp(b) − 1. The sensitivity covariates are log pupils (management information, census figure where missing), SEN support and EHC plan percentages (SEN census), and urban (1) or rural (0); complete cases only. By-area models drop the area terms.
12. **Analysis 5.** The phrases are the union of those eligible in any comparison of the pooled run, in their area; the sample is primaries and secondaries, as in that run. Standardisation strata are phase × that area's grade; weights from the whole sample, renormalised over the strata present in a month. Shares from a count under 10 are left blank.
13. **Toolkit-map threshold.** No threshold met the plan's rule; the highest-precision one was used (above). BM25 counts a repeated query word each time it occurs; idf is ln(1 + (N − n + 0.5)/(n + 0.5)) over that area's standards in that version.
14. **Labelling.** A sentence whose meaning depends on the one before ("This helps ...") is labelled "none", as the rules say. The 200 sentences come from every phase.
15. **Small cells.** Throughout, any count from 1 to 9 is shown as "<10", and a share or mean that would reveal it is left blank; cells with fewer than 10 reports show no mean.
16. **Re-parsed corpus.** The corpus was re-parsed on 28 November 2026 after a fix to name removal (`parse-audit.md`, "Name tails beside the placeholder"): where a report used a shorter form of the school's name, the type and denomination words after it ("Primary", "Church of England", "Academy") had been left beside "[the school]". The text changed in 362 sections of 312 reports (706 words fewer in all); no grade, phase or month changed, and the cut-off and the 4,281 reports, 29,216 sections and 456,974 sentences are the same. Analyses 1, 2, 4, 5 and 6 were run again. Three figures above moved, each in its last digit: eligible phrase-comparison pairs 63,058 to 63,057 (in two places; one phrase, "primary school" in leadership and governance, is no longer eligible); phrases keeping their status under a prior of 4,000, 7,171 to 7,169; the length estimate in analysis 4, +0.95% to +0.96%. Every reading is unchanged, and so is every other figure at the precision shown here; analysis 6 is unchanged in full.

17. **Lexicon v1 placements.** Amendment 2 split SEND and disadvantage without saying where four keywords go. "Barriers" and "English as an additional language" went to SEND and adaptation; "vulnerable" and "social care" to disadvantage (`next-steps-lexicon-v1.md`).
18. **Validation pools.** The 100 next-steps items come from the 9,751 items left after removing the 300 development items (the corpus holds 10,051 items after the re-parse). The 150 results sentences come from those the v1 results lexicon selects, so the sample measures the precision of both lexicons but not the recall of the results lexicon. Seeds 20261128 + 3 and + 11, so that no draw repeats another. The labels were made by the analyst who drafted the lexicons, as Amendment 1 records; Mark's check is the guard.
19. **"Other" in analysis 3.** A report carries "other" only if every one of its items matches no theme. The 24 reports with no next-steps item are left out of every denominator.
20. **Lowest area grade** is taken over the eight evaluation areas with a grade; safeguarding (met or not met) is not an area grade.
21. **Five bands for 2024/25.** The plan names the Explorer's five bands; the Explorer's 2024/25 reading (`ss_band_25`) has three. The Close to band is the Explorer's own. Above and Below are split into Well above and Well below by the Explorer's rule for its five-band reading (`ss_band`: the gap is also larger than the standard deviation of the 50 similar schools), using the 2024/25 Attainment 8 of the same 50 schools from the Explorer's lists. Their mean reproduces the Explorer's `ss_mean_25` for all 835 schools. The Explorer's own three-band reading is reported as a sensitivity. The correlation uses the gap itself and does not depend on bands.
22. **Explorer data.** `scripts/build_data.py` passes `ss_diff_25` and `ss_band_25` through unchanged (bands are only coded). The analysis reads the committed raw file and applies the build's small-group suppression, rather than running the full build (which also writes about 6,600 school pages). No generated file is committed.
23. **Matching reports to results.** By URN only. Achievement grade from the PDF, as elsewhere in these results.
24. **Upper bounds for small counts (analysis 7).** Where a count is 1 to 9, the tables give "<10" and, for the discordance shares, "under x%" (10 divided by the band's size), so the figure stays useful without revealing the count. In analysis 3, as before, the share is left blank.
25. **Bootstrap for Spearman.** Schools resampled with replacement, Spearman recomputed on ranks of each resample, 2.5th and 97.5th percentiles. Within each grade, the same seed.
26. **"Mixed" and "none" in validation.** The plan's merge rule covers positive, negative and level. "Mixed" (precision 0.20 on 5 sentences) and "none" (0.46) are reported but no rule is applied to them.

## Reproducing

```bash
python3 scripts/language/test_analysis.py         # synthetic tests
python3 scripts/language/toolkit.py               # the two standards files
python3 scripts/language/analysis.py sample       # the 200 sentences (outside the repository)
python3 scripts/language/analysis.py run          # analyses 1, 2, 4, 5 and 6
python3 scripts/language/analysis.py check        # the 30 items for Mark
python3 scripts/language/test_lexicons.py         # the frozen v1 lexicons, on invented sentences
python3 scripts/language/analysis.py validation-sample   # analyses 3 and 7: fresh samples (outside the repository)
python3 scripts/language/analysis.py validation-score    # precision and recall against the hand labels
python3 scripts/language/analysis.py validation-check    # the 30 + 30 items for Mark
python3 scripts/language/analysis.py run --only 3 7      # analyses 3 and 7
```

The full run takes a few minutes on four cores. It needs numpy, pandas, statsmodels, pdfplumber and cmudict.

## Agreed

Mark agreed these results on 28 November 2026, in the live conversation. He also approved two methods points:
- the Explorer's five-band reading of the 2024/25 Attainment 8 gap (deviation 17) is used for analysis 7;
- the four themes below 0.8 precision are shown with the plan's warning, unchanged.

The results label checks for Mark are optional, and are reported on the method tab if he completes them.
