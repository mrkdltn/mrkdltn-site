# Results and direction lexicons, draft v0 (not frozen)

Drafted 28 November 2026 for Analysis 7 of `docs/report-language/plan.md` (Amendment 1, "words against data"). This is a draft for Mark's review. It has not been used to count anything on the full corpus, and nothing here has been set against grades, deprivation, months or any school's results. Once Mark approves it, it is frozen by renaming this file to `results-lexicon-v1.md` and setting `LEXICON_VERSION = 'v1'` in `scripts/language/lexicons.py`, with no other change.

Two lexicons:

- **(a) Results lexicon.** Finds the sentences in an achievement section that refer to published outcomes.
- **(b) Direction lexicon.** Classes each of those sentences by what it says about the results, with explicit negation handling.

## Decisions for Mark

1. **Add a fourth direction, "level", for "in line with", "close to" and "broadly similar to".** The plan names three directions (positive, negative, mixed). One results sentence in seven in the development sample says only that results are level with national figures, and forcing those into positive or negative would decide the analysis by fiat. Recommended: "level" scores 0 in net direction, as mixed does, and a section is "level" if every directional results sentence in it is level. This changes the pre-registered measure, so it needs a short amendment to the plan before freezing.
2. **Leave results sentences with no direction out of the section reading.** "Pupils sit GCSEs in nine subjects" mentions results but says nothing about them. Under the plan's wording ("positive if all results sentences are positive"), one such sentence turns a section mixed. Recommended: they still count in the denominator of net direction (which the plan defines over all results sentences), but not in the section reading. A section whose results sentences are all of this kind is "no direction".
3. **Count trend as direction.** "Outcomes have improved" is scored positive and "outcomes declined" negative, although the data measure is a level (the gap against similar schools), not a change. Recommended: keep trend in, and report, labelled exploratory, net direction with trend-only sentences left out.
4. **Treat "results understate the school" as negative about results.** Sentences such as "published outcomes do not reflect current pupils' work" or "work is stronger than recent results suggest" are almost always written where results are weaker. Recommended: score them negative, because the analysis asks what the text says about the published results.

## How it was drafted

- **Sample.** 150 achievement sections drawn at random (seed 20261128, offset 7 for this draw) from the 4,281 parsed reports with an achievement section.
- **Blind reading.** As for the next-steps lexicon: a script outside the repository wrote only the section text, with no URN, grade, phase, month or results, and with grade words replaced by "[grade]". The key was kept separately and not opened. These 150 sections are excluded from the validation sample.
- **Blindness is only partial, and cannot be more.** Achievement text is written to justify the achievement grade, and it often says so in plain words ("pupils achieve highly", "outcomes are too low"). Reading the text is, in part, reading the grade. What the blind draw protects against is tuning the lexicon to a known grade or a known results gap; it cannot stop the text from carrying the grade's signal.
- **No quotation.** Every example here is invented.

## Rules shared by both lexicons

- **Sentences.** A section is split into sentences at a full stop, question mark or exclamation mark followed by a space and a capital letter, digit, quote or bracket.
- **Preparation.** As in `next-steps-lexicon-v0.md`: lower-case, quotes and dashes normalised, PDF hyphen artefacts closed up, name placeholders removed. Grade words are **not** removed before this analysis, because "the expected standard" and "the higher standard" are also the names of key stage 2 measures. No direction rule relies on a grade word.
- **Word boundaries and stemming** as in the next-steps lexicon: whole words only; \* means any ending; no automatic stemming.
- **Authority.** `scripts/language/lexicons.py` holds the exact patterns; `scripts/language/test_lexicons.py` tests them on invented sentences.

## (a) Results lexicon

A sentence is a **results sentence** if, after the exclusions are blanked, it contains any of these:

- outcome(s); result(s); attain\*; examination\*; exam(s); GCSE(s); A level(s); qualification(s); accreditation(s); published; published, national or performance data;
- national tests, assessments, curriculum tests, checks, average(s), figures, outcomes, measures, standards, expectations or data; nationally;
- above, below, close to, in line with or "than" (the) average; above-average; below-average;
- statutory, national, key stage, reading, external or end-of-key-stage test(s); test results or scores;
- phonics screening check (or test, or result); phonics check; multiplication (tables) check; times tables check;
- Progress 8, progress measures or scores; Attainment 8; higher standard(s); greater depth; grade 4 to 9; standard, strong or good (GCSE) pass; combined measure or attainment; three-year trend(s); scores;
- the proportion (of pupils) reaching, achieving, attaining or passing; reaching, achieving or attaining the expected, required or appropriate standard.

**Or** if it names the end of a key stage or of Year 2, 6, 11 or 13 **and** has an achievement verb (achiev\*, attain\*, perform\*, reach\*). "At the end of Year 6, most pupils attain well in mathematics" refers to the key stage 2 results.

**Exclusions** (blanked first): "as a result"; "results in" (the verb); outcomes in or of EHC plans; learning outcomes; personal outcomes; wellbeing outcomes.

**Deliberately not results sentences:** general statements of achievement with no reference to results, such as "Pupils achieve well across the curriculum." The plan defines results sentences as those that refer to published outcomes, and most achievement sections open with a sentence of this kind that is about the grade, not the data.

*Invented examples.* Results: "Results in the multiplication tables check have risen for two years." "Most pupils gain five GCSEs, including English and mathematics." Not results: "As a result, pupils are ready for Year 7." "Pupils work towards the outcomes in their EHC plans."

## (b) Direction lexicon

Each results sentence is processed in four steps.

**Step 1. Mask.** These are blanked because they contain direction words but carry no direction:

- measure names: higher standard(s), greater depth, expected standard(s);
- descriptions of intake: high, low, lower or higher prior attain\*; high, low, lower or higher (academic) starting points; lower or upper key stage; high proportion; high level of; high or low attendance; non-disadvantaged;
- fixed phrases: as a result; no matter; not only; positive and negative; high-performing subjects; "capable of …" to the end of its clause;
- **intentions**, to the end of their clause: "to", "will", "can", "could", "should" or "would" followed by improve, raise, increase, achieve, attain, reach, strengthen, close, ensure or enable (but not after "continue(s) to"); and need\*, aim\*, ambition, ambitious, plan(s), action(s), work, steps, focus or time followed by "to". "Leaders are taking action to raise attainment above average" says nothing yet about results.

**Step 2. Fixed negative phrases.** Each of these counts once as negative, and its words are then blanked so that nothing inside it counts again:

- not as well, high, highly, strong, good or successful;
- not (…) high, strong, good or well enough;
- do, does, did, have, has or had not (…) achieve\*, attain\*, perform\*, reach\*, match\* or do as well, with any following "as well as similar pupils" and the like;
- not (yet) (been) (fully) reflected; do/does/did not (…) reflect (the same …);
- yet to show, be, translate or have; not (yet) translated;
- "stronger / better / more developed than (…) results, outcomes or data suggest, show or indicate";
- too low; too few; too many pupils do not, leave or are not; not achieved; not enough pupils; could be (even) better.

**Step 3. Cues.** Longer cues are tried first and an overlapping shorter cue is not counted twice.

| Level | Positive | Negative |
| --- | --- | --- |
| in line with; close to; closer to; broadly similar, in line, close or average; similar to; around the national average; at (the) national average; the same as; attain the national average; as well as other, their, similar or disadvantaged pupils, peers or others | above; above-average; exceed\*; outperform\*; better (than); higher than; improved; improving; improvement(s); rose; risen; rising; increased; achieve\*, attain\*, perform\* or do (very, particularly, consistently …) well or highly, but not when followed by "above" or "below"; is, are, was, been or remain (very, especially …) high; high standards, attainment, outcomes, achievement or performance; very high; highly positive; positive; strong\*; strength; success\*; impressive; excellent; encouraging; sustained; gap(s) narrowing, closing, small or reducing; closing or narrowing the gap; differences narrowing; gain(s); noteworthy; as well as or better than; more pupils achieve, attain, reach or pass; most, almost all, all or many pass | below; below-average; lower; low; weak\*; declin\*; dropped; fell; fall, falling, fallen; dip\*; fewer; underperform\*; under performance; uneven\*; inconsisten\*; variab\*; vary, varies; fluctuat\*; behind; lack\*; less well, secure, high, strong or consistent; worse; poor\*; gap(s) growing or widening; mixed picture |

**Step 4. Negation.** A cue is negated if "not", "no", "never", "nor", "neither", "without", "cannot", "yet to" or a word ending in "n't" sits within the **three words before it, in the same clause**. A clause ends at a comma, semicolon, colon or bracket, or at but, however, although, though, while, whereas or despite. A negated positive becomes negative; a negated negative becomes level ("not below the national average"); a negated level becomes negative ("not in line with").

**Sentence direction.**

- positive and negative cues both present: **mixed**;
- positive cues (with or without level): **positive**;
- negative cues (with or without level): **negative**;
- level cues only: **level** (see decision 1);
- no cue: **none**.

**Section direction** (see decision 2): "no results statement" if the section has no results sentence; otherwise positive, negative or level if every results sentence with a direction has that direction; "mixed" if they differ; "no direction" if none has a direction.

**Net direction** (the plan's continuous measure): positive minus negative results sentences, over all results sentences. Mixed, level and none count 0.

*Invented examples.*

- Positive: "Results in the phonics screening check have been above the national average for three years."
- Negative: "Attainment in GCSE mathematics is not as strong as in other subjects."
- Negative, through negation: "Pupils have not achieved as well as similar pupils nationally."
- Level: "Key stage 2 results sit broadly in line with national averages."
- Level, through negation of a negative: "Attainment is no longer below the national average."
- Mixed: "Outcomes have improved, although they remain below average."
- None: "Pupils take GCSE examinations in a broad range of subjects."
- None, through a masked intention: "Leaders plan to raise attainment above the national average."

## What the draft does on the development sample

Counts from the 150 development sections only. They are in-sample and say nothing about grades or results.

- 1,530 sentences, of which 328 (21.4%) are results sentences.
- 136 of 150 sections (91%) have at least one results sentence; 14 have none.
- Of the 328 results sentences: positive 136 (41%), negative 94 (29%), level 49 (15%), none 44 (13%), mixed 5 (2%).
- Section direction: mixed 58, positive 45, negative 15, level 14, no direction 4, no results statement 14.

The section reading is mixed in 58 of the 136 sections with a results statement. That is expected: a section often reports one measure above and another below. It means the plan's two discordance shares (results well below similar schools but text wholly positive, and the reverse) will rest on fewer sections than the headline counts suggest, and net direction carries most of the information.

## Where I am least sure

- **Generic achievement statements are excluded.** "Pupils achieve well" is not counted as a results sentence. This follows the plan, but it drops the sentence that most directly echoes the grade, and some readers will expect it to count.
- **Measures other than the one in the data.** For secondaries the data measure is Attainment 8, but results sentences also cover sixth-form results, GCSE English and mathematics, and disadvantaged pupils' results. For primaries, phonics and multiplication-check sentences count, though the exploratory data measure is key stage 2 reading, writing and mathematics. Narrowing to the matching measure would be cleaner but would need a measure lexicon of its own.
- **"Qualifications" in special schools and AP.** These sentences usually describe what pupils gain rather than how results compare. Most score "none", which is right, but they add to the denominator of net direction.
- **"Variable", "varies", "inconsistent".** Scored negative. A sentence saying results vary from year to year may mean only that they move about, not that they are low.
- **Negation reach.** Three words, within a clause, catches "not as strong", "has not been replicated successfully" and "did not achieve well", but would miss a negator four or more words back.

## What happens next

1. Mark decides the four points above. Decisions 1 and 2 need a short amendment to the plan; the code already follows the recommended options.
2. Freeze: rename to `results-lexicon-v1.md`, set `LEXICON_VERSION = 'v1'`, commit before any count.
3. Validation, as in Amendment 1: a fresh 150 sentences (not from these 150 sections), labelled by hand under written rules without grades or results in view. Precision of at least 0.8 for each direction, or that direction is merged into "mixed" and the change reported. Mark checks a random 30 of the labels and the agreement rate is reported.
