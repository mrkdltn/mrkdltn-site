# Report Language: parse audit

First audit, 26 November 2026, on the corpus as it stood part-way through the backfill. It will be re-drawn and repeated on the complete corpus (about 4,200 report cards) once the backfill has finished.

Reports are identified here by an index number only. The key from index number to URN, and the audit sheet with each PDF's address, are kept outside the repository with the raw text. No school name and no personal name appears in this file.

## What is being checked

`scripts/language/parse.py` splits each renewed-framework report card into its sections and removes names. Three things can go wrong, and each is checked:

1. **Section boundaries.** Each evaluation area (inclusion; curriculum and teaching; achievement; attendance and behaviour; personal development and wellbeing; early years; post-16; leadership and governance), the safeguarding statement, any category of concern, "What it's like to be a pupil at this school", next steps, "About this inspection" and the school context must start and end where the PDF's do, with nothing from the data tables, the inspection team or the boilerplate inside them.
2. **Grades.** Every area grade on the five-point scale, the safeguarding outcome (met or not met) and any category of concern (special measures, significant improvement).
3. **Names.** No personal name (headteacher, chair, chief executive, inspectors, anyone else) and no name of the school, its trust or federation, its partner schools or its address left in the parsed text. Full dates are replaced too; the inspection's own date and URN are kept only as keys in an index outside the repository.

## Method

**Sample.** `scripts/language/audit_sample.py` drew 50 reports from the 1,041 report cards parsed at the time (seed `report-language-audit-1`; re-created with `--label first --upto 1044`), stratified by phase and by the report's lowest grade:

| Phase | All expected or better | Any needs attention | Any urgent improvement |
| --- | --: | --: | --: |
| Nursery | 3 | 2 | 1 |
| Primary | 15 | 9 | 3 |
| Secondary | 4 | 3 | 2 |
| Special | 3 | 2 | 1 |
| Alternative provision | 2 | 0 | 0 |

The 50 reports hold 584 parsed sections and 391 graded outcomes (334 area grades, 50 safeguarding outcomes, 7 categories of concern).

**Boundaries.** For each report, the first and last words of every parsed section were read against the report text, and an independent, deliberately naive split (every line between one heading and the next, nothing skipped) was compared with the parser's output word by word. Every difference was read by eye.

**Grades.** Each grade was compared with three independent sources: Ofsted's management information (as at 31 October 2026), the site's daily report-card reader, and a second extraction of each PDF, downloaded again from files.ofsted.gov.uk and read with a different PDF library (poppler's `pdftotext`, layout mode) rather than the `pypdf` text the parser uses.

**Names.** Four checks: (a) every capitalised word sequence left in the 50 parsed texts was listed and read; (b) every name the report gives in its structural lines (inspection team, the headteacher line, the chair, chief executive and head-of-school sentences) was split into words and searched for in the parsed text; (c) the school's own name, from the report's first page, was searched for word by word; (d) the residual-name detector (below) was run and every hit read.

## Results

| Check | Errors found in the 50 | Rate | After fixes |
| --- | --: | --: | --: |
| Area section boundaries | 0 of 584 sections | 0% | 0 |
| About and context sections (boilerplate or table text inside, or a line lost) | 6 reports | 12% of reports | 0 |
| Grades, safeguarding and category of concern | 0 of 391 | 0% | 0 |
| Personal names left in the text | 0 reports (1 in the preliminary pass) | 0% (2%) | 0 |
| School, partner-school or address left in the text | 6 reports | 12% of reports | 0 |
| Lead-inspector code (see below) | 0 of 50 | 0% | 0 |

Every error was in the closing "About this inspection" and context sections, or in name removal. No error affected an evaluation area's boundaries or any grade.

### Every error found, and the fix

| Report | Error | Fix |
| --- | --- | --- |
| Preliminary pass (same seed, drawn from 989 reports) | The chair's name had a title and three words; the title rule took two, leaving the surname | The title rule takes up to three name words; a check across the whole corpus then searched every report's own structural names in its parsed text (none left) |
| 3 | In "About this inspection", a line continuing a sentence among the data tables was dropped, because the same words occur in other reports and were taken for table text | A line is taken as table text only if it is short, unpunctuated and recurs across reports, or matches a table label |
| 18, 21, 24, 27, 31 | The facts-and-figures sentence giving the date the data was used sat at the end of the context section, because the PDF puts it outside its block | That sentence is dropped wherever it falls |
| 3 | A federated partner school was named, and the federation's name contained the school's own name | Other schools' names become "[another school]"; federations and trusts become "[the trust]" |
| 11 | The school's initials were used as a name ("Team" plus initials) | The school's initials are removed as well as its name |
| 15 | The school's own short name was not removed, because short forms that are also saints' names had been excluded | Only bare one-word forms (such as "St" or "Holy") are excluded now |
| 19 | The school's name was written with an apostrophe in the text and without one on the front page | Apostrophes are optional when matching the school's name |
| 42 | A partner school sharing the sixth form was named | As for report 3 |
| 46 | The addresses and postcodes of the school's two sites were given | Street names before a postcode become "[address]", postcodes become "[postcode]"; the name of a separate site ("... Campus") becomes "[another school]" |

Also found while building the parser, across the whole corpus rather than in the sample, and fixed before the audit: the chair given a military rank; co-chairs named in pairs; a headteacher's surname reused for a pupil reward and for the school dog's name (2 reports; every surname a report names in its structural lines is now removed wherever it recurs in that report); data-table lines and next steps interleaved by the PDF's layout; and three documents fetched by the backfill that are not report cards (see below).

## Whole-corpus checks (1,296 report cards parsed on 26 November 2026)

- **Grades against Ofsted's management information:** 9,926 of 9,927 grades agree (99.99%); categories of concern 1,103 of 1,103. The one difference is an early years grade printed as urgent improvement in the PDF and recorded as needs attention in the management information; the PDF read by the second library agrees with the parser, so it is a difference between Ofsted's two publications, not a parsing error. Against the daily reader: 1,728 of 1,728.
- **Structural names:** the 12,659 name words that reports give in their structural lines were each searched for in the same report's parsed text: none found.
- **Residual-name detector:** 372 hits in 1,296 reports (180 capitalised pairs mid-sentence; 192 at the start of a sentence), all read. None is a private individual. They are programme and event names ("Three Billy Goats Gruff", "Safer Internet Day"), places, works and public figures named as curriculum content (artists, writers, explorers). Those public figures are kept; see the decision below.
- **Lost text:** 30 lines of prose (out of roughly 240,000 dropped table and boilerplate lines) are not in any section: chiefly the list of special-provision types in special schools' data tables, and a few context sentences printed inside the tables.
- **Not report cards:** 3 of the 1,299 documents the backfill has read are not renewed-framework report cards (older-style reports from 2023, fetched because the newer report was not the newest "School inspection" document on the school's page). The parser skips them; they need re-fetching.
- **Wrong report:** for 1 school the PDF is an earlier report card than the inspection in the management information. The parser uses the date printed on the PDF, so the record is right for that PDF, but the newer report is missing from the corpus.

## The residual-name detector

Deliberately broader than the removal rules, so that what it finds can be read: titles followed by capitalised words; role words followed by a name; inspector designations; a known given name followed by a capitalised word; and any pair of capitalised words in which neither word is in a stop-list of school, curriculum, faith, calendar and place terms (places from GIAS towns, local authorities and regions). It flags; it does not replace.

## Lead-inspector codes

For the separately pre-registered national consistency analysis, the parser converts the lead inspector named on each report into a pseudonymous code (a keyed hash; the key is held outside the repository) and writes only the code, to a restricted file outside the repository. No inspector's name is stored, logged or published, and the parsed text has every inspector's name removed as before. On the 50 audit reports the lead was identified correctly in all 50: the inspector line directly under "Lead inspector:" in every case (never a team inspector), and the code computed from the second PDF extraction matched the code from the parser's text in all 50. Across the corpus the lead line sits directly under its heading in every report checked (1,092 of 1,092 at the time of the check). One report lists two leads; it gets no code rather than a guessed one.

## Re-running the audit

Once the backfill is complete: run `scripts/language/parse.py`, then `scripts/language/audit_sample.py --label complete` for a fresh draw of 50 from the full corpus, repeat the checks above and add the results here.

## Accepted

Mark accepted this audit on 26 November 2026, in the live conversation, with two rules:

- People named as curriculum content (artists, authors, explorers and other public figures taught in school) are kept. They are not personal data in this context.
- Month-and-year mentions ("appointed in September 2025") are kept. Full dates are replaced with [date].

The audit is re-drawn on the complete corpus (`audit_sample.py --label complete`) before any analysis, and its result is added here.
