# Attendance Explorer: data note (Phase 0 recon)

Checked 22 and 23 November 2026 against the files themselves, downloaded from the DfE and GIAS. Every figure below was computed from those files. Companion to `docs/attendance-explorer-plan.md`.

## Sources, as found

| What | Where | Found |
| --- | --- | --- |
| School-level absence, full years | Explore Education Statistics, "Absence rates by school level" (data set `889f9166-e3bf-4d3a-afb2-d86e4aecc70a`), release of 26 March 2026 | 233,597 rows, 80 columns, 2013/14 to 2024/25. No 2019/20. 123 MB |
| School-level absence, autumn and spring | "Absence - school level - autumn and spring terms combined" (`b01feede-e832-43ce-a806-8e70ec0a9d0a`), release of 15 October 2026 | 72 columns, 2016/17 to 2025/26. 82 MB |
| The fortnightly pulse | Statistics API, "Reasons for absence and attendance" (`63629501-d3ca-c471-9780-ec4cb6fdf172`, v4.4, 19 November 2026) | 1,452,358 rows, Weeks 37 to 45 of 2026 (7 September to 6 November). 10 MB compressed |
| Schools, geography, trusts | GIAS daily extract, 22 November 2026 | 65 MB; every 2024/25 absence school matched by URN |

Download routes that work without a key: `https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/{id}/csv` for catalogue files, and `https://api.education.gov.uk/statistics/v1/data-sets/{id}/csv` for API sets.

**Catalogue ids change with every release.** The autumn and spring id from the previous release still downloads but stops at 2024/25. The fetcher must ask for the latest files each time (`content.explore-education-statistics.service.gov.uk/api/data-set-files?publicationId=cbbd299f-8297-44bc-92ac-558bcf51f8ad&latestOnly=true`) and never hold an id. The API holds only local authority, regional and national sets; no school-level set is in it.

## What the checks showed

**The files reproduce the published national figures.** Summing schools in the autumn and spring 2025/26 file gives overall absence 6.60%, persistent absence 17.50% and severe absence 2.32%, exactly the published headline. This becomes a standing test in the build.

**By phase**, pooled across schools:

| | Schools | Overall absence | Persistent absence | Severe absence |
| --- | --- | --- | --- | --- |
| Full year 2024/25: primary | 16,735 | 5.20% | 12.99% | 0.93% |
| Full year 2024/25: secondary | 3,423 | 8.44% | 23.37% | 3.88% |
| Full year 2024/25: special | 1,104 | 12.76% | 35.26% | 6.91% |
| Autumn and spring 2025/26: primary | 16,696 | 5.13% | 13.25% | 1.05% |
| Autumn and spring 2025/26: secondary | 3,419 | 8.01% | 21.55% | 3.57% |
| Autumn and spring 2025/26: special | 1,108 | 12.86% | 34.72% | 6.88% |

**Coverage.** State-funded primary, secondary and special schools only. Alternative provision is published separately and only to local authority level. Four-year-olds are in a separate school-level file.

**Measures at school level.** Enrolments; sessions possible, overall, authorised and unauthorised; persistent absentees (10% or more) with their own absence rates; severe absentees (50% or more); and every reason code as sessions and as a rate (illness, appointments, authorised and unauthorised holiday, late, excluded, other, and from 2024/25 interview, regulated performance and temporary reduced timetable). No pupil characteristics at school level. Characteristics (free school meals, SEN and others) exist at local authority level in the termly files, so an authority page can carry them.

**Markers.** `z` means not applicable (a code that did not exist that year); `x` appears only on one column in years before 2020. The DfE does not suppress small numbers in these files: a school of 7 enrolments appears with its 7 persistent absentees. Any small-number protection is therefore ours to apply (decision below). Eight schools have fewer than 10 enrolments.

**History breaks at academy conversion.** Of the 21,262 schools in 2024/25, 13,411 have all eleven years under their present URN; 630 have one. 881 are no longer open under that URN. Long lines need predecessor schools joined through the GIAS links file, as the Ofsted Explorer already does for prior attainment, and the page must say when a line crosses a conversion.

**School size.** Median enrolments: primary 187, secondary 962, special 120. One pupil is half a percentage point of persistent absence in a typical primary, which is the case for the funnel plot and size-scaled bands.

**The pulse is richer than expected.** Daily, weekly and year-to-date figures for every local authority, split by primary, secondary and special, with every register code. The Friday pattern is plain in Week 45: unauthorised absence 3.01% on Monday, about 2.0 to 2.2% midweek, 2.34% on Friday; authorised absence 4.34% on Friday against about 3.6% midweek. Each file holds the current year only, so earlier years come from earlier releases.

## Geography, counted

From the 21,262 schools in the 2024/25 file, placed by GIAS:

| Level | Units with a school | Schools per unit (median) | Units with one school | With two | With three or more | Units with a secondary |
| --- | --- | --- | --- | --- | --- | --- |
| Ward | 6,575 | 3 | 1,218 | 1,518 | 3,839 | 2,801 |
| MSOA | 6,653 | 3 | 895 | 1,605 | 4,153 | 2,911 |
| Constituency (2024 boundaries, confirmed) | 543 | 38 | 0 | 0 | 543 | 543 |
| District | 298 | 57 | 2 | 0 | 296 | 296 |
| Local authority | 153 | 96 | 2 | 0 | 151 | 152 |

MSOAs are no steadier than wards for this purpose: 62% would carry a pooled figure under the three-school rule against 58% of wards. Wards are the unit people recognise, so the plan keeps wards and drops the MSOA alternative. The two single-school authorities (the City of London and the Isles of Scilly) need the same guard.

## Trusts, counted

GIAS gives 2,069 trusts among these schools, holding 11,340 of them: 950 with one school, 373 with two to four, 378 with five to nine, 265 with ten to nineteen and 103 with twenty or more (the largest has 103). A trust view is meaningful for the 746 trusts with five or more schools; smaller trusts get a page that lists their schools without a pooled reading. The full-year absence file carries a trust name; the autumn and spring file does not, so GIAS is the single source for membership.

## Still to confirm

- Licence wording on the DfE and GIAS pages (expected Open Government Licence v3.0).
- ONS boundary files and hex layouts: not yet downloaded; needed from Phase 1 (authorities) and Phase 3 (constituencies).
- Whether the fortnightly release moves to monthly from spring 2027.
- The date of the full-year 2025/26 release (announced for March 2027).
