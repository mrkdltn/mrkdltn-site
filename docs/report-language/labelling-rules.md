# Labelling rules: the toolkit-map validation sample (analysis 6)

Written 28 November 2026, before any sentence in the sample was read. These rules govern the hand labels used to set and test the threshold for the toolkit map (`docs/report-language/plan.md`, Amendment 1, analysis 6). The labels are made by the analyst (Claude), as the amendment records; Mark checks a random 30 of them.

## What is labelled

- **The sample.** 200 sentences from the evaluation-area sections of the corpus, drawn at random with seed 20261128 by `scripts/language/analysis.py sample`. The first 100 drawn set the threshold; the second 100 test it.
- **What the labeller sees.** The sentence text (already name-stripped), its evaluation area and the toolkit version in force on its inspection date. Nothing else: not the school's grades, phase, month, deprivation or results, and not the matcher's scores or best match. The key from each sentence to its report is held in a separate file outside the repository and is not opened until every label is fixed.
- **What can be chosen.** One standard from that area in that version (`data/derived/report_language/toolkit_standards_v1.1.csv` or `_v2.0.csv`), or "none".

## When a sentence evidences a standard

1. The sentence states, about this school, the practice, condition or outcome that the standard describes. Substance decides, not shared words: a paraphrase counts, and a sentence that repeats a standard's words while saying something else does not.
2. A concrete example counts when it is an instance of what the standard describes (a sentence listing clubs and trips evidences the standard about a range of opportunities that broaden pupils' experiences).
3. One label per sentence. Where a sentence touches more than one standard, the label is the standard its main claim (normally its main clause) evidences.

## Choosing between grade headings

Several standards describe the same matter at different strengths (for example, identifying pupils' needs, under Expected standard, Strong standard and Urgent improvement). The choice is made from the sentence's own wording, never from a guess about the school's grade:

- plain positive wording ("effective", "well", "appropriate", "generally") points to the Expected standard;
- the strong standard's own kind of wording ("consistently", "highly", "rigorously", "astute", "sophisticated", "deep", "swiftly and skilfully") points to the Strong standard;
- "exceptionally", "transformational", "sustained over time" point to Exceptional;
- partial weakness ("inconsistent", "not all", "some", "recently started", "too soon to see the impact") points to Needs attention;
- outright failure ("do not", "ineffective", "lacks", "too low", "unsafe") points to Urgent improvement.

If the matter is covered under one heading only, that standard is the label whatever the strength of the wording, provided rule 1 holds.

## When the label is "none"

- The sentence gives context or describes provision without the evaluative content of any standard ("The school has a resource base for pupils with autism").
- It belongs to a matter that no standard in this area covers, including a matter from another evaluation area.
- It is too general to point to one standard ("Leaders want the best for pupils").
- It is a link or summary sentence ("This is the case across the school"), or its meaning depends on the sentence before it.

## After labelling

The labels are written to `data/derived/report_language/toolkit_map_labels.csv` (sample identifier and label only; no text, no URN) and are not changed after the matcher has been run. The 30 items for Mark are drawn from the 200 with seed 20261128 and written, with text, area, version, label and the label's standard text, to `docs/report-language/check-for-mark-toolkit-map.md`. The agreement rate with Mark's check is reported with the results.
