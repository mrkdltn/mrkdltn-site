# Report Language: parse audit

First audit, 26 November 2026, on the corpus as it stood part-way through the backfill. Re-drawn and repeated on the complete corpus on 28 November 2026; see the last section.

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

## Re-drawn audit on the complete corpus (28 November 2026)

The backfill has finished: 4,293 documents, of which 4,281 are renewed-framework report cards and 12 are not (below). This section repeats the first audit on a fresh draw from the complete corpus, adds the whole-corpus checks, and records every error found and how it was fixed. Reports in the sample are identified by index number only (key held outside the repository with the raw text, `audit/key-complete.csv`).

### Method

**Sample.** `audit_sample.py --label complete` (seed `report-language-audit-1`) drew 50 of the 4,281 report cards, stratified by phase and lowest grade:

| Phase | All expected or better | Any needs attention | Any urgent improvement |
| --- | --: | --: | --: |
| Nursery | 2 | 2 | 1 |
| Primary | 12 | 7 | 2 |
| Secondary | 5 | 4 | 2 |
| Special | 3 | 2 | 2 |
| Alternative provision | 2 | 2 | 2 |

The 50 hold 581 parsed sections (329 evaluation areas; 158 safeguarding, concern, pupil-view and next-steps sections; 94 about and context sections) and 388 graded outcomes (329 area grades, 50 safeguarding outcomes, 9 categories of concern).

**Second extraction.** Every PDF was downloaded again from files.ofsted.gov.uk and checked against the corpus's sha256 before use. (On the first attempt the server returned a different document for 46 of the 50 addresses; a second fetch returned the right file for all 50, each confirmed by its sha256. Any later re-fetch should be checked the same way.) Each was read with poppler's `pdftotext`, in both layout and reading-order modes, independently of the `pypdf` text the parser uses.

**Boundaries.** As in the first audit: a naive split (every line between one heading and the next) compared line by line with the parser's sections, with every difference read; and the first and last six words of every parsed section looked up in the `pdftotext` text.

**Grades.** Every area grade, safeguarding outcome and category of concern compared with the `pdftotext` extraction and with Ofsted's management information (49 reports) or the daily reader (1 report whose inspection is newer than the management information).

**Names, in the sample.** (a) every capitalised word sequence left in the 50 parsed texts listed and read; (b) every name word in the report's structural lines (inspection team, role lines, chair, chief executive, head and executive-lead sentences, now read across line breaks) searched for in its parsed text; (c) the school's name from the front page searched for word by word; (d) the residual-name detector run and every hit read; and (e) the parser's output before and after this audit's fixes compared word by word, with every difference read.

**Names, across the corpus.** (b) and (c) for all 4,281 reports; (f) the distinctive part of each school's trust name (from GIAS) searched for in its parsed text; (g) every residual-detector hit read.

### Results in the sample

| Check | Errors found in the 50 | Rate | After fixes |
| --- | --: | --: | --: |
| Evaluation-area and narrative section boundaries | 0 of 487 sections | 0% | 0 |
| About and context sections | 1 report | 2% of reports | 0 |
| Grades, safeguarding and category of concern | 0 of 388 | 0% | 0 |
| Personal names left in the text | 1 report | 2% of reports | 0 |
| School, trust, partner-school or address left in the text | 1 report | 2% of reports | 0 |

| Report | Error | Fix |
| --- | --- | --- |
| 2 | The report prints "Information about this school:" twice, the first time straight after "About this inspection" and above the inspection text, so that text was filed as context | A context heading straight after "About this inspection", with another context heading later, is taken as part of "About this inspection" (2 reports in the corpus) |
| 12 | The chair's name had four words without a title; the role rule took three, leaving the surname | Names after a role, title or "is" may have up to four words and lower-case particles (da, de, van and others) |
| 4 | A federation's name began with a place and "and", so only its second half was removed | The trust and federation rule takes "of", "and" and "&" inside the name |

The fixes also changed, without any name having been left: in 13 of the 50 reports, a placeholder made more accurate (a trust's name ending "Trust" had become "[another school] Trust"; it is now "[the trust]"); in 2, a staff role line whose name was already removed ("Director of ...: [name]") now dropped as a role line; in 1, an ordinary word no longer removed as part of the school's name; and in 1, a governance phrase ending "Trust" now replaced as a trust (harmless over-removal).

### Whole-corpus checks (4,281 report cards, 28 November 2026)

- **Grades against Ofsted's management information:** 32,457 of 32,463 grades agree (99.98%); categories of concern 3,607 of 3,607; against the daily reader 6,057 of 6,057. The six differences are classified below; none is a parsing error.
- **Structural names:** after the fixes below, none of the 45,779 candidate name words that reports give in their structural lines appears in the same report's parsed text. (The extraction is deliberately broad: the 112 matches that remain are ordinary words it picks up, such as "There" or "Deputy", an honour, and a role title, a diocese, a provision and a duck that share a word with a name.)
- **Residual-name detector:** 1,327 hits in 921 reports (609 capitalised pairs mid-sentence, 718 at the start of a sentence), down from 1,376. Every hit was read, all 947 distinct strings in the first pass and the three new strings after the fixes. After the fixes none is a private individual. Two were before the fixes (a chief executive given a role the rules did not know; a regional executive principal on a label line), both fixed below. What remains: programme, event, room and value names; characters and mascots; places, rivers and landmarks; books, films and songs; and public figures taught as curriculum content (artists, writers, explorers, athletes), kept under the accepted rule. The detector now reads accented letters, which it missed before.
- **School and trust names:** before the fixes, a distinctive part of the school's GIAS trust name was left in 58 reports, a word of the school's own name in 134, and a street address with more than one place before the postcode in 8. After them: 0, 19 and 0. The 19 are kept by design or are ordinary words: a place or diocese named in the text, a saint's or founder's name in a possessive, an ordinary word that is also part of the school's name, and a few house names that half-share a word with the school.

### Every error found across the corpus, and the fix

| Error | Reports | Fix |
| --- | --: | --- |
| A double-barrelled surname broken across a line: the second half was left ("[name]- Surname") | 6 | A word ending in a hyphen joins the next line without a space when that line starts with a capital, as it already did for lower case |
| A name with accented letters was not recognised, so it was left whole | 2 | Name patterns accept accented letters |
| A trust's sentence naming its chief executive was cut by the data tables, and its continuation (surname, then the chair) was taken for table text because the same line recurs in that trust's other reports; the given name was left | 3 | The continuation of the trust sentence ("..., and overseen by a board of trustees ...") is taken back from among the tables |
| A role the rules did not know: "interim executive lead", "chief education officer", a "Regional Executive Principal:" label line | 3 | Those roles added; role labels with a colon are recognised inside paragraphs too |
| Four-word names (see report 12 above) | at least 1 | As above |
| The school's trust named with a lower-case trust word ("... multi-academy trust"), by an acronym alone, as "MAT" or "MAC", or in a trust-branded programme ("the Trustname Games") | 58 (distinctive names) | The trust's name from GIAS is reduced to its distinctive core and removed with or without a trust word after it; a core made only of ordinary words or places is removed only with a trust word after it |
| A word of the school's own name used alone or with the school type in the middle ("Name Primary Academy, Place"), a "St." spelt with a full stop, plural forms ("Names Got Talent"), names with brackets, "&" or "and" | 134 (a word of the name) | Every distinctive part of the name between school-type words, brackets and joiners becomes a form; "St" and "St." match each other; plural and "-er" endings match. One-word forms are now allowed for ordinary words such as a tree's name (in that school's own report only), but not for words used in lower case in 20 or more reports, numbers or given names |
| A street address with more than one place before the postcode, or written with "Rd" or "Estate" | 8 | The address rule allows up to four places before the postcode and more street words |
| Named units of the school ("Name Boys", "Name Girls") | 1 | Replaced as another school |
| A federation named by "called" was cut at "St." | 1 | "St." no longer ends the name |

Every fix has a synthetic test in `test_parse.py` (invented names only). After the fixes the parser's text changed in 958 of the 4,281 reports, almost all of them a trust or school name now removed, or a placeholder made more accurate. Grades are unchanged. Section boundaries change only in the 2 reports with the mislabelled heading, and where a trust sentence's continuation is now taken back from among the tables into "About this inspection".

### Kept by design

Mark confirmed both rules below on 28 November 2026, in the live conversation.


- **Trust and school nicknames made of ordinary words.** Where a trust's name is an ordinary word or a place (as in an invented "Bloom Learning Trust"), its programme and value names are kept ("the trust's Bloom Voices event"): about 36 mentions in 27 reports. Removing every capitalised use of such a word from those reports would damage the text, and a trust's name is shared by many schools. In about 10 reports, a value or reward is named with a nickname derived from the school's name (a shortened or altered form of it); these cannot be found by rule and are kept. Recommendation: accept both; neither is personal data, and each would need local knowledge to link back to a school.
- **Given names alone.** Rooms, cafés, rewards and pets named with a given name (a garden or a resource base called after someone's first name, a therapy dog, a duck, mascots and story characters) are kept. A given name alone does not identify a private individual.

### Grade disagreements, non-report-card documents and warnings

| Item | Number | Classification |
| --- | --: | --- |
| Grade differs from the management information | 6 grades in 5 reports | **Source discrepancy.** All 5 schools are in special measures. In each case the PDF (read by both libraries) prints a lower grade than the management information records: Urgent improvement where it records Needs attention (2 early years, 1 inclusion), and "Safeguarding standards not met" where it records Met (3). The parser follows the PDF. |
| Not a report card | 12 documents | **Expected.** For each school, the management information's latest event is a monitoring visit (7 special-measures or serious-weaknesses monitoring visits, 5 section 8 visits with no formal designation), not a report-card inspection; the newest "School inspection" document on the school's page is an older-framework report (dated 2019 to 2025). There is no report card to fetch. The parser skips them and they are not in the counts. |
| Missing section: next steps | 25 reports | **Expected, 24; source revised, 1.** In 24, the PDF has no next steps (confirmed by `pdftotext`); every one of them is graded expected standard or better in every area, and 22 have no area below strong standard. In 1, the corpus address now serves a revised file of the same report (same school, URN and date; a different sha256 on six fetches) that does have next steps; the corpus holds the earlier version. It needs re-fetching. |
| Report date differs from the list it was fetched for | 1 report | **Wrong report fetched (source).** The PDF is the school's earlier report card (January 2026); the management information's inspection is June 2026. The record is right for the PDF it holds, but the newer report is missing. It is the 1 report with no grade reference. It needs re-fetching. |
| Short section | 1 report | **Source.** The PDF prints the post-16 heading and grade with no text under it. |

### Re-fetching

Two reports need re-fetching (the revised PDF and the earlier report card). The 12 non-report-card documents need nothing until those schools have a report card.


### Re-fetched (28 November 2026)

Both reports were fetched again from files.ofsted.gov.uk on 28 November 2026, three times each, before the analysis. Each fetch was checked before use: the three downloads had the same sha256, the URN and the inspection date printed on the PDF matched the management information, and after parsing every grade matched the management information.

| Report | What was wrong | What was fetched | Check |
| --- | --- | --- | --- |
| The revised PDF | The corpus held an earlier version of the report, without next steps | The current file at the same address (a new sha256, the same on all three fetches) | Same URN and inspection date (June 2026); 7 of 7 area grades and the safeguarding outcome match the management information; next steps now present (3 items) |
| The earlier report card | The corpus held the January 2026 report card; the management information's inspection is June 2026 | The June 2026 report card, which the school's page files as "Full inspection" rather than "School inspection", so the backfill's rule passed over it | URN and inspection date (June 2026) match; 7 of 7 area grades and the safeguarding outcome match the management information |

The manifest now records the new address and sha256 for each, marked as re-fetched. The parser was then run on the whole corpus again (`parse.py --no-codes`, so no inspector code or key was created). Apart from the two reports, the text changed in 2 others, where a title before an already-removed name ("His [name]") is now removed with it; nothing else changed. The corpus still holds 4,281 report cards. Against the management information, 32,466 of 32,472 grades agree (the same 6 source discrepancies as above) and categories of concern 3,608 of 3,608; no report is without a grade reference; 24 reports have no next steps, all as published. `corpus-counts.md` is regenerated: the earlier report card's grades and month are replaced by the June 2026 report's, which moves one report from January to June and changes a few grade counts by one.

The plan asked for each re-fetch to be "checked against its stored checksum". Neither can be: one is a revised file and the other a different document, so each has a new checksum by definition. The checks above (three matching downloads, URN, date and grades) stand in for it, and the new checksums are stored.

## Name tails beside the placeholder (28 November 2026)

**The fault.** While the lexicons were drafted, 2 of 150 randomly sampled achievement sections had a word of the school's own name left beside "[the school]". The parser removes the school's full name and its distinctive short form. Where a report used a form in between ("Quillbrook Primary" or "Quillbrook C of E Primary" for an invented "Quillbrook Meadow Church of England Primary School"), only the short form matched, and the words after it were left: "[the school] Primary", "[the school] Church of England Primary".

**How it was counted.** For every parsed report, each token of the school's own GIAS establishment name (25 November 2026 extract) was looked for within 4 tokens of "[the school]", and, separately, any capitalised words of that name directly after it. Before the fix:

| What was left beside the placeholder | Reports |
| --- | --: |
| A type word of the name only ("Primary", "School", "Academy", "Junior", "High", "First School") | 157 |
| A denomination, with or without a type word ("Church of England", "CofE", "Catholic", "RC", "Methodist"), including where the report wrote it differently from GIAS ("CE" for "Church of England") | 36 |
| A distinctive word of a longer name: the second word of a three-word name used as two ("[the school] Hall", "[the school] House"), or the second half of a name with "&" that the report wrote with "and" | 8 |
| **Any of these** | **201** |

The achievement section was affected in 12 reports. Three related faults were found in the same pass: a school's initials followed by its type word ("[the school] School Values"; 2 reports); a trust or federation named after the school, left as "[the school] Trust" or "[the school] Federation" (20 reports); and another school written with "C.E." ("... C.E. Primary School"), which the rule for other schools did not recognise, so that school's name was left in full (2 reports). Brackets, hyphens and line breaks caused none of them: paragraphs are joined before names are removed, and bracketed parts and hyphenated names were already handled.

**The fix** (`parse.py`, with synthetic tests in `test_parse.py`, invented names only):

- Every form of the school's name, and its initials, takes with it any run of the type and denomination words that the school's own name contains ("Primary", "Church of England", "Academy", "Nursery", "Day", joined by "of", "and" or "&"). One spelling of a denomination stands for the others ("Church of England", "C of E", "CofE", "CE", "C.E."; "Roman Catholic", "RC", "Catholic"), and "School" and "Academy" stand for each other. A type word that is not in the school's own name is kept ("[the school] High" for a primary school stays as written).
- The leading words of a longer name are also forms ("Quillbrook Hall" from "Quillbrook Hall Day"), and "&" in a name also matches "and".
- "[the school] Trust" and "[the school] Federation" become "[the trust]"; a misspelt full name (the placeholder, one or two capitalised words, then the school's own type words) becomes "[the school]"; "C.E." is recognised in other schools' names.
- Two orderings that depended on Python's hash seed are now fixed (the school's name forms, and the surnames from the report's structural lines), and a title left in front of a removed name ("His Honour ...") is removed with it. With the old ordering, a title could survive on one run and not on the next; two whole-corpus runs with different hash seeds now give identical output.

**Re-check** (whole corpus, `parse.py --no-codes`, same data directory). 4,281 report cards, as before. Grades unchanged: 32,466 of 32,472 agree with the management information (the same 6 source discrepancies), categories of concern 3,608 of 3,608, and no report's grades, phase or month changed. The text changed in 362 sections of 312 reports, 706 words fewer in all. The adjacency check now finds no school-name tail: the only remaining hits are 2 where the word is ordinary prose that is also in the name ("Children at [the school]" for a nursery whose name includes "Children's Centre"), and 1 where another provision is listed beside the school with "&". The residual-name detector is unchanged (609 mid-sentence and 718 sentence-start capitalised pairs, as before). "[the school] [another school]" now occurs in 5 reports (25 before) and "[the school] Trust" or "Federation" in none (20 before). `corpus-counts.md` was regenerated and is unchanged. The analyses were re-run on the new corpus; the changes are recorded in `results.md` (deviation 16).

The private bucket holds the earlier parse and needs refreshing from the new one.
