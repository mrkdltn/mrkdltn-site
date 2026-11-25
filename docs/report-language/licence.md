# Report Language: licence of the report texts

Checked 25 November 2026, before any report text was stored.

Every Ofsted report card checked carries this statement on its last page:

> "You may reuse this information (not including logos) free of charge in any format or medium, under the terms of the Open Government Licence. To view this licence, visit www.nationalarchives.gov.uk/doc/open-government-licence …" and "© Crown copyright 2026".

Sample checked: one report card per phase, chosen at random from `data/raw/reports_daily.csv` (seed 7): alternative provision (files.ofsted.gov.uk/v1/file/50318065), primary (50318473), secondary (50318172) and special (50318351), plus the first three reports read by the backfill. All seven carry the same statement.

**Conclusion.** The text is reusable under the Open Government Licence v3.0 with attribution: "Contains public sector information licensed under the Open Government Licence v3.0. Source: Ofsted inspection reports." Logos are excluded, and the corpus keeps text only.

**Personal data.** OGL does not cover personal data. Report texts name headteachers, chairs and inspectors. The parser drops the inspection team section and runs a name check, and no name is kept in anything derived or published (see the parse audit).
