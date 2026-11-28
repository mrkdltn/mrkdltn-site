# Results and direction lexicons, v1 (frozen 28 November 2026)

Frozen on 28 November 2026 for Analysis 7 of `docs/report-language/plan.md` (Amendment 1, "words against data"), before anything was counted on the full corpus, set against any school's results or grades, or drawn for validation. It is the v0 draft (`results-lexicon-v0.md`, kept unchanged for the record) with exactly the rules Mark decided in the live conversation on 28 November 2026 and recorded in the plan as Amendment 2. `scripts/language/lexicons.py` (`LEXICON_VERSION = 'v1'`) is what runs. Any change after this freeze is a new version, labelled as such.

Two lexicons:

- **(a) Results lexicon.** Finds the sentences in an achievement section that refer to published outcomes.
- **(b) Direction lexicon.** Classes each of those sentences by what it says about the results, with explicit negation handling.

## What Amendment 2 fixed

1. **Five directions.** Each results sentence is positive, negative, level ("in line with", "close to", "broadly similar"), mixed, or none (it mentions results but says nothing about them).
2. **Sentences with no direction are left out of the section reading.** The section reading is positive, negative or level if every remaining results sentence has that direction; mixed otherwise; and "no results statement" if none remain. (v0 had a separate "no direction" reading for sections whose results sentences all had no direction; under v1 those sections read "no results statement".)
3. **Net direction** is (positive − negative) ÷ (positive + negative + level + mixed). Sentences with no direction are not in the denominator (v0 had them in it). A section with no directional results sentence has no net direction and is left out of the correlation.
4. **Trend words count as direction.** A version without them is reported as exploratory. The trend words are listed under step 3 below.
5. **Results understating the school** ("work is stronger than results suggest") is scored negative about results, as in v0.

No other rule changed.

## How it was drafted

- **Sample.** 150 achievement sections drawn at random (seed 20261128, offset 7 for this draw) from the 4,281 parsed reports with an achievement section.
- **Blind reading.** As for the next-steps lexicon: a script outside the repository wrote only the section text, with no URN, grade, phase, month or results, and with grade words replaced by "[grade]". The key was kept separately and not opened. These 150 sections are excluded from the validation sample.
- **Blindness is only partial, and cannot be more.** Achievement text is written to justify the achievement grade, and it often says so in plain words ("pupils achieve highly", "outcomes are too low"). Reading the text is, in part, reading the grade. What the blind draw protects against is tuning the lexicon to a known grade or a known results gap; it cannot stop the text from carrying the grade's signal.
- **No quotation.** Every example here is invented.

## Rules shared by both lexicons

- **Sentences.** A section is split into sentences at a full stop, question mark or exclamation mark followed by a space and a capital letter, digit, quote or bracket.
- **Preparation.** As in `next-steps-lexicon-v1.md`: lower-case, quotes and dashes normalised, PDF hyphen artefacts closed up, name placeholders removed. Grade words are **not** removed before this analysis, because "the expected standard" and "the higher standard" are also the names of key stage 2 measures. No direction rule relies on a grade word.
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

**Trend words.** The cues that describe a change over time rather than a level: improved, improving, improvement(s), rose, risen, rising, increased (positive); declin\*, dropped, fell, fall, falling, fallen, dip\* (negative). In the exploratory version without trend words, these still occupy their place in the sentence, so no shorter cue inside them counts, but they are not counted as cues. A sentence whose only cues are trend words then has no direction. Phrases about gaps narrowing or widening are not trend words for this purpose: they compare groups.

**Step 4. Negation.** A cue is negated if "not", "no", "never", "nor", "neither", "without", "cannot", "yet to" or a word ending in "n't" sits within the **three words before it, in the same clause**. A clause ends at a comma, semicolon, colon or bracket, or at but, however, although, though, while, whereas or despite. A negated positive becomes negative; a negated negative becomes level ("not below the national average"); a negated level becomes negative ("not in line with").

**Sentence direction.**

- positive and negative cues both present: **mixed**;
- positive cues (with or without level): **positive**;
- negative cues (with or without level): **negative**;
- level cues only: **level**;
- no cue: **none**.

**Section direction.** Results sentences with no direction are left out. Then: positive, negative or level if every remaining results sentence has that direction; "mixed" if they differ; "no results statement" if none remain (including a section with no results sentence at all).

**Net direction** (the plan's continuous measure, as fixed by Amendment 2): (positive − negative) ÷ (positive + negative + level + mixed). A section with no directional results sentence has none.

*Invented examples.*

- Positive: "Results in the phonics screening check have been above the national average for three years."
- Negative: "Attainment in GCSE mathematics is not as strong as in other subjects."
- Negative, through negation: "Pupils have not achieved as well as similar pupils nationally."
- Level: "Key stage 2 results sit broadly in line with national averages."
- Level, through negation of a negative: "Attainment is no longer below the national average."
- Mixed: "Outcomes have improved, although they remain below average."
- None: "Pupils take GCSE examinations in a broad range of subjects."
- None, through a masked intention: "Leaders plan to raise attainment above the national average."

## What the lexicons do on the development sample

Counts from the 150 development sections only, under v1. They are in-sample and say nothing about grades or results.

- 1,530 sentences, of which 328 (21.4%) are results sentences.
- 136 of 150 sections (91%) have at least one results sentence; 14 have none.
- Of the 328 results sentences: positive 136 (41%), negative 94 (29%), level 49 (15%), none 44 (13%), mixed 5 (2%).
- Section reading: mixed 58, positive 45, negative 15, level 14, no results statement 18 (the 14 with no results sentence and 4 whose results sentences all have no direction).
- Without trend words (exploratory): positive 117, negative 92, level 55, none 63, mixed 1.

The section reading is mixed in 58 of the 132 sections with a directional results statement. That is expected: a section often reports one measure above and another below. It means the plan's two discordance shares (results well below similar schools but text wholly positive, and the reverse) rest on fewer sections than the headline counts suggest, and net direction carries most of the information.

## Where I am least sure

- **Generic achievement statements are excluded.** "Pupils achieve well" is not counted as a results sentence. This follows the plan, but it drops the sentence that most directly echoes the grade, and some readers will expect it to count.
- **Measures other than the one in the data.** For secondaries the data measure is Attainment 8, but results sentences also cover sixth-form results, GCSE English and mathematics, and disadvantaged pupils' results. For primaries, phonics and multiplication-check sentences count, though the exploratory data measure is key stage 2 reading, writing and mathematics. Narrowing to the matching measure would be cleaner but would need a measure lexicon of its own.
- **"Qualifications" in special schools and AP.** These sentences usually describe what pupils gain rather than how results compare. Most score "none", which is right, but they add to the denominator of net direction.
- **"Variable", "varies", "inconsistent".** Scored negative. A sentence saying results vary from year to year may mean only that they move about, not that they are low.
- **Negation reach.** Three words, within a clause, catches "not as strong", "has not been replicated successfully" and "did not achieve well", but would miss a negator four or more words back.

## What happens next

Validation, as in Amendment 1: a fresh 150 results sentences (not from these 150 sections), labelled by hand under the rules in `labelling-rules.md` without grades or results in view. Precision of at least 0.8 for each direction, or that direction is merged into "mixed" and the change reported. Mark checks a random 30 of the labels and the agreement rate is reported.
