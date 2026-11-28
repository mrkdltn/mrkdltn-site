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

# Labelling rules: the validation samples for analyses 3 and 7

Written 28 November 2026, after both lexicons were frozen as v1 (commit `e00a296`) and before either validation sample was drawn or any item in it read. As for analysis 6, the labels are made by the analyst (Claude), reading each item, as Amendment 1 records; Mark checks a random 30 of each sample, and the agreement rate is reported.

## Common to both samples

- **Fresh items only.** Each sample is drawn at random from the corpus with a fixed seed, after the development items used to draft the lexicons have been removed: the 300 next-steps items, and every sentence of the 150 development achievement sections.
- **What the labeller sees.** The item's text only, name-stripped as parsed, with any grade word ("exceptional", "strong standard", "expected standard", "needs attention", "urgent improvement") replaced by "[grade]". Not the school, its phase, month, grades, deprivation or results, and not what the lexicon says about the item. The key from each item to its report, and the lexicon's output, are written to separate files outside the repository and are not opened until every label is fixed.
- **Labels are fixed before scoring.** The hand labels are written out, then the lexicon is run on the same items. No label is changed after that.
- **Files.** Sample text and keys stay outside the repository (`../mrkdltn-data/report-language/audit/`). The repository holds only the identifiers and labels (no text, no URN), and the 30 items for Mark, with their text.

## Analysis 3: next-steps items (100 items)

- **Unit.** One item in a report's next-steps list, as parsed (it can hold more than one sentence).
- **What is labelled.** Every theme of `next-steps-lexicon-v1.md` that the item asks for, judged by the theme's definition (its italic description), not by its keywords. An item can carry several themes. If it carries none, its label is "other".
- **What counts as asking for a theme.** The theme is part of what the item asks the school to change, or names the pupils the change is for. A theme mentioned only as background ("although attendance has risen, ...") or only as the reason for a different change is not labelled.
- **Who acts is not what is asked.** "Leaders should" or "governors should" does not by itself make an item about leadership. Leadership is labelled when the item asks for monitoring, evaluation, quality assurance, governance, challenge, accountability, strategy, capacity, or for safeguarding arrangements and records (folded into leadership by Amendment 2).
- **Theme by theme.** Subject-specific teaching ("tasks in science") is quality and consistency of teaching. English and mathematics, phonics, reading, writing, vocabulary and number are the foundations theme, as its definition says. Pupils with SEND, adaptations and specialist support are SEND and adaptation; disadvantaged pupils, the pupil premium and vulnerable pupils are the disadvantage theme. Raising results, attainment or qualifications is published outcomes. Staff training or subject knowledge is staff expertise. Sixth form and post-16 is labelled only where the item is about provision for students aged 16 to 19.
- **Uncertain cases.** Where a theme is borderline, it is labelled only if a reader with the theme's definition would clearly say the item is about it. Borderline calls are noted beside the label.

## Analysis 7: results sentences (150 sentences)

- **Unit.** One sentence from an achievement section that the v1 results lexicon selects as a results sentence. The labeller sees the sentence on its own, as the lexicon does.
- **First label: is it a results sentence?** Yes if it refers to published outcomes: tests, checks, examinations, qualifications, published or national data, or results at the end of a key stage. No otherwise (for example a general statement that pupils achieve well, with no reference to results). This gives the precision of the results lexicon, reported beside the direction figures.
- **Second label: direction about the results.**
  - *positive*: the results are good, high, above a comparison, improved, or pupils do well in them;
  - *negative*: the results are low, below a comparison, declined, or weaker in some group or subject; or the sentence says results understate the school ("current work is stronger than results suggest"), as Amendment 2 sets;
  - *level*: the results are in line with, close to or similar to a comparison, and nothing better or worse is said;
  - *mixed*: the sentence says both positive and negative things about results;
  - *none*: it mentions results but says nothing about how good they are (a description of what pupils sit, an intention or plan, a statement of what leaders are doing). A sentence labelled "not a results sentence" also takes direction "none".
- **Trend counts.** "Improved" is positive and "declined" negative, as Amendment 2 sets, whatever the level.
- **Comparisons within the school.** "Disadvantaged pupils do less well than their peers" is negative; "pupils with SEND achieve as well as their peers" is level; "results in mathematics are stronger than in English" is mixed.
- **Scoring.** For each direction, precision is the share of sentences the lexicon put in that direction whose hand label is the same. Recall is also reported. A direction with precision below 0.8 is merged into "mixed" under Amendment 1, and the merge is reported.
