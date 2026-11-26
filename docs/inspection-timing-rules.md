# Inspection timing: the rules, quoted

The Inspection timing panel reads Ofsted's published policy and the inspection regulations. It does not forecast. Ofsted does not publish its schedule and can inspect at any time. This file is the record of every rule the panel applies, quoted from its source, with the interpretation where one was needed. `scripts/inspection_timing.py` follows it, and the rule codes are the same.

All pages were fetched and read on **24 November 2026**.

## Sources

| Short name | Document | URL |
| --- | --- | --- |
| **Info** | Ofsted, *Inspection information for state-funded schools*, for use from September 2026 (updated 28 August 2026; for inspections from 7 September 2026) | https://www.gov.uk/government/publications/school-inspection-toolkit-operating-guide-and-information/inspection-information-for-state-funded-schools-for-use-from-september-2026 |
| **Monitoring** | Ofsted, *School monitoring operating guide for inspectors*, for use from September 2026 (updated 28 August 2026) | https://www.gov.uk/government/publications/school-inspection-toolkit-operating-guide-and-information/school-monitoring-operating-guide-for-inspectors-for-use-from-september-2026 |
| **Operating guide** | Ofsted, *School inspection operating guide for inspectors*, for use from September 2026 | https://www.gov.uk/government/publications/school-inspection-toolkit-operating-guide-and-information/school-inspection-operating-guide-for-inspectors-for-use-from-september-2026 |
| **Regs 2005** | The Education (School Inspection) (England) Regulations 2005, SI 2005/2038, reg. 2 (interpretation) and reg. 3 (intervals) | https://www.legislation.gov.uk/uksi/2005/2038/regulation/2 |
| **Regs 2015** | SI 2015/170, which substituted reg. 3 | https://www.legislation.gov.uk/uksi/2015/170/made |
| **Regs 2015 (No. 2)** | SI 2015/1639, which inserted reg. 3A (new schools with predecessors) | https://www.legislation.gov.uk/uksi/2015/1639/made |
| **Regs 2020** | SI 2020/1258, which revoked the outstanding-school exemption and inserted reg. 3B | https://www.legislation.gov.uk/uksi/2020/1258/made |
| **Regs 2021** | SI 2021/845, which inserted reg. 3ZA (the coronavirus extension) | https://www.legislation.gov.uk/uksi/2021/845/made |
| **Regs 2024** | SI 2024/908, which amended reg. 3 from 30 September 2024 | https://www.legislation.gov.uk/uksi/2024/908/made |

The **November 2025** version of the monitoring guide (added to the collection on 5 November 2025, "for use from 10 November 2025") is no longer on GOV.UK: its address now redirects to the collection page, which lists only the September 2026 version. Every monitoring rule below is quoted from the September 2026 version. Where the brief cited the November 2025 version, I could not compare the two texts. The collection's change history records the September 2026 revision as "new versions of the inspection toolkit, operating guide for inspectors, monitoring operating guide for inspectors, and inspection information document", and its summary of changes lists no change to monitoring timing.

## Where the live pages differ from the brief

The pages win. Each difference is applied in the code and listed here for Mark.

1. **The statutory school year starts on 1 August, not 1 September.** Regs 2005, reg. 2(1): "'school year' means the period of 12 months commencing on 1st August". The explanatory notes to the 2021 and 2024 amending regulations repeat it ("the school year starting on the 1st August"). So the brief's worked example (inspected October 2022) gives **31 July 2028**, not 31 August 2028. The boundary that matters is between July and August, not August and September.
2. **Schools with a "needs attention" area still have a four-year clock.** The monitoring guide gives the final feedback after the monitoring visit as including "the approximate timing of the next full inspection – this will typically be approximately 4 years following the publication of the report card from the school's last full inspection". The panel shows the monitoring visit (within 24 months) and the four-year point. The brief said to show no four-year clock.
3. **Ofsted does publish the broad timing after a category of concern.** "If the school is not ready for its final monitoring inspection to be deemed a full inspection, then its next inspection will be a full inspection … It will typically take place during the term following the end of the monitoring programme, although we may inspect sooner than this if we have concerns." The programme length is published (up to 18 or 24 months), but its end is not fixed, so the panel gives no usual date and says how the programme ends.
4. **The coronavirus extension runs from 1 August 2014 to 27 April 2021**, not "before 4 May 2021" (Regs 2021, reg. 3ZA(3)). It is still in force. As at this build, no open school's latest relevant inspection falls in that window, so it changes no date today; the code applies it anyway.
5. **The four-year clock runs from the report's publication.** The Info page says "approximately once every 4 years" without a start point; the monitoring guide says "approximately 4 years following the publication of the report card". The panel anchors the usual point on publication. The statutory limit runs from the inspection's start (reg. 3ZA(9) and reg. 3(10): "an inspection is treated as being carried out at the time at which it is begun").
6. **Closure.** The live wording is a reason a school can give at notification for why "the inspection should not take place (for example, if the school is within 6 months of confirmed closure and this can be evidenced in a funding agreement)" (Info, "Full inspections: information about the inspection process"). It is not a stated scheduling rule. The phrase in the brief ("Ofsted does not normally inspect a school this close to a confirmed closure") is our wording, not Ofsted's, and the panel uses it as a plain description.

## The rules

### STD4: most schools

> "Schools are inspected approximately once every 4 years, except if they are in one of our monitoring programmes. The statutory timeframe requires all schools to be inspected within 5 school years from the end of the school year in which the previous inspection took place." (Info, "When we inspect schools")

> "Most schools should expect an inspection within this approximate timeframe." (Info)

**Applied to:** a report card with no area below "expected standard" and safeguarding met; or, with no report card yet, a last graded inspection judged good or outstanding (or "Not judged" overall after September 2024 with no "requires improvement" key judgement); or a last ungraded inspection with any outcome not listed under RI25.
**Usual point:** 4 years after the latest full or ungraded report was published. **Earliest likely:** 3 years after (see "Earliest likely and the band" below).

### RI25: the 2.5-year cases

The Info page's table "Circumstance / First full inspection", each row ending "A full inspection around 2.5 years from the publication of its most recent ungraded or graded inspection report":

| Code | Circumstance, quoted | MI field used |
| --- | --- | --- |
| `UNG_CONCERN` | "Schools that were judged good or outstanding for overall effectiveness at their most recent graded inspection but whose last inspection was an ungraded inspection that: took place before September 2024; concluded that the lead inspector was not satisfied that the school would have received at least its current grade if it had received a graded inspection instead of an ungraded inspection" | Ungraded outcome "School remains Good (Concerns) - S5 Next" or "School remains Outstanding (Concerns) - S5 Next", start before 1 September 2024 |
| `UNG_SLIP` | "…whose last inspection was an ungraded inspection that: took place after September 2024; concluded that aspects of the school's work may not be as strong as at the time of the previous inspection" | Ungraded outcome "Some aspects not as strong" |
| `RI_OE` | "Schools last inspected before September 2024 that were judged requires improvement for overall effectiveness at their most recent graded inspection." | Latest graded inspection started before 1 September 2024, overall effectiveness 3 |
| `RI_KJ` | "Schools last inspected after September 2024 that were judged requires improvement for at least one key or provision judgement." | Latest graded inspection started on or after 1 September 2024 (overall effectiveness "Not judged"), any of quality of education, behaviour and attitudes, personal development, leadership and management, early years or sixth form graded 3 |

Interpretations:

- The outcome "School remains Good (Improving) - S5 Next" means the inspector thought the school might now be outstanding. It is not a concern, so it is not in `UNG_CONCERN`; those schools take the four-year rule.
- The monitoring guide's Annex 2 says these schools "will usually receive a full inspection within 2.5 years from the publication of the last graded inspection report" and lists "there was no overall effectiveness judgement" among its conditions. Read alongside the Info table (which the guide refers to), a school graded after September 2024 with no "requires improvement" key judgement takes the four-year rule. If Ofsted meant every "Not judged" school to be on 2.5 years, 2,607 schools now on the four-year rule would move; the backtest cannot test this yet, because their 2.5-year points fall from spring 2027.
- **MI quirk:** the October 2026 MI leaves the graded-inspection fields blank for the 7,007 schools whose latest event was an ungraded inspection. The outcome text itself says the school was good or outstanding, so `UNG_CONCERN` does not need the graded fields.

### MON_NA: a "needs attention" area

> "We will usually monitor a school if: we have graded any evaluation area as 'needs attention'; we have placed it in a category of concern" (Info, "Monitoring schools")

> "A school with any evaluation areas graded 'needs attention' will normally have a single on-site monitoring inspection within 24 months of publication of the last full inspection report card. We may inspect sooner when necessary…" (Monitoring, "The improvement monitoring programme for schools with any evaluation area graded 'needs attention'")

> "the approximate timing of the next full inspection – this will typically be approximately 4 years following the publication of the report card from the school's last full inspection, although we may inspect sooner than this if we have any concerns" (Monitoring, final feedback for 1- and 2-day inspections)

**Applied to:** a report card with any area "needs attention", none "urgent improvement", safeguarding met. **Shown:** monitoring flag with "a monitoring visit within 24 months of the report card (by [date])", and the four-year usual point from publication.

### MON_COC: a category of concern under the renewed framework

> "Schools that are found to require significant improvement under the renewed framework may have up to 5 on-site monitoring inspections within 18 months of the last full inspection report card being published." … "Schools that are found to require special measures under the renewed framework may have up to 6 on-site monitoring inspections within 24 months…" "These on-site monitoring inspections are usually scheduled termly." (Monitoring)

> "If the school is not ready for its final monitoring inspection to be deemed a full inspection, then its next inspection will be a full inspection … It will typically take place during the term following the end of the monitoring programme, although we may inspect sooner than this if we have concerns." (Monitoring)

**Applied to:** a report card with category "SM" or "RSI", any area "urgent improvement", or safeguarding not met. For a report card read daily (no category in the grade summary), the panel says "category of concern" without naming which. **Shown:** monitoring; no usual point; the programme's published maximum length; the statutory limit.

### MON_LEG: legacy categories at the end of October 2025

> "School with serious weakness as at end of October 2025." / "Schools in special measures as at end of October 2025." → "Subject to monitoring (see monitoring operating guide for details)" (Info)

> "Schools with serious weaknesses will usually receive up to 5 legacy monitoring inspections. If the school is not showing signs of improvement within 18 months, a full inspection will be scheduled. Schools in special measures will usually receive up to 6 legacy monitoring inspections. If the school is not showing signs of improvement within 24 months, a full inspection will be scheduled." "If at the end of the legacy monitoring programme a full inspection is required, this will typically take place during the term following the end of the monitoring programme." (Monitoring, Annex 1)

### NEW: a new school not yet inspected

> "If a school receives a new URN due to a change in its status or after undergoing a significant change, it becomes a new school for inspection purposes. However, if the school retains its URN following a change, we treat it as the same school. We usually carry out a full inspection of a new school in its third year of operation." (Info)

> "If the merged school receives a new URN, it is legally a new school." (Info)

> "Any school whose predecessor school was eligible for (or had already started) an improvement monitoring programme, and which subsequently receives a new URN, will be treated as a new school. From the point when the URN officially changes, this school will no longer be monitored." (Monitoring)

**Applied to:** no full, graded or ungraded inspection under the school's own URN, with an open date (GIAS, or MI where GIAS has none). Academy converters, sponsored academies, fresh starts and mergers with a new URN all count. **Clock:** from the GIAS open date. Third year of operation = from 2 to 3 years after opening; the band is that year. The predecessor's latest inspection (MI "URN at time of …" where "relate to the URN of the current school" is "No") is shown as context, labelled as the predecessor's, and never starts the clock.
**Statutory:** none. Reg. 3 sets the interval *between* inspections of a school; reg. 3A covers only a new school that has already had a relevant section 8 inspection. No regulation sets a deadline for a new school's first inspection, so the panel shows no statutory date for these schools and says so.

### CLOSING

**Applied to:** GIAS status "Open, but proposed to close" with a close date no more than 6 months after the build date. **Shown:** no clock. GIAS's "proposed to close" is the closest public stand-in for "confirmed closure … evidenced in a funding agreement".

### UNCONF: rule not confirmed

Anything the rules above do not settle (for example no inspection and no open date). **Shown:** the statutory limit only, if one can be computed, and "rule not confirmed".

## The statutory limit

**Text.** Regs 2005, reg. 3, as substituted in 2015 and amended in 2021 and 2024:

> "(3) Paragraph (4) applies where no relevant section 8 inspection is carried out subsequent to the earlier section 5 inspection. (4) The interval is a period not exceeding 5 years after the end of the school year in which the earlier section 5 inspection was carried out. (5) Paragraph (6) applies where one or more relevant section 8 inspections are carried out subsequent to the earlier section 5 inspection. (6) The interval is a period not exceeding 5 years after the end of the school year in which the latest of the inspections mentioned in paragraph (5) was carried out."

(Paragraphs (3) and (5) as amended by Regs 2024, reg. 2(2).)

> "(7) In this regulation, 'relevant section 8 inspection' means an inspection of a school carried out under section 8(2) of the 2005 Act … in relation to which the following two conditions are met. (8) The first condition is that the inspection is carried out within the period of 5 years beginning with (a) the end of the school year in which the earlier section 5 inspection was carried out; or (b) … the most recent of those inspections… (9) The second condition is that the Chief Inspector (a) carries out the inspection for the purposes of determining whether the quality of education provided in the school has been maintained, has improved or has deteriorated since the earlier section 5 inspection was carried out"

(Paragraph (9) as amended by Regs 2024, which also omitted the former (9)(b), the condition that the inspector be satisfied the school would still be good.)

> "'school year' means the period of 12 months commencing on 1st August" (reg. 2(1)). "For the purposes of this regulation, an inspection is treated as being carried out at the time at which it is begun." (reg. 3(10))

**Interpretation used.** Take the latest inspection under the school's own URN that is either a full (section 5) inspection or an ungraded inspection. Find the 31 July that ends the school year (1 August to 31 July) in which it began. The statutory latest date is 31 July five years later, or seven years later under reg. 3ZA.

Worked examples (all in `scripts/test_inspection_timing.py`):

| Inspection began | School year | Statutory latest date |
| --- | --- | --- |
| 11 October 2022 | 2022/23, ends 31 July 2023 | 31 July 2028 |
| 31 July 2022 | 2021/22, ends 31 July 2022 | 31 July 2027 |
| 1 August 2022 | 2022/23 | 31 July 2028 |
| 30 August 2022 and 6 September 2022 | both 2022/23 | 31 July 2028 |
| 27 April 2021 (inside the reg. 3ZA window) | 2020/21 | 31 July 2028 (7 years) |
| 28 April 2021 | 2020/21 | 31 July 2026 |

## The open questions, resolved

**1. Does an ungraded (section 8) inspection reset the statutory interval?** Yes, on the regulations as they stand. Since 30 September 2024 a "relevant section 8 inspection" is one carried out within the five-year window to determine whether the quality of education "has been maintained, has improved or has deteriorated", whatever its outcome (Regs 2024 omitted the old "would still be good" condition). Ungraded inspections were exactly that. The data agree: 7 schools graded in May to July 2021 (a 31 July 2026 limit on their graded inspection alone) had an ungraded inspection in 2024/25 and had still not had a full inspection by November 2026. Ofsted would be in breach of the regulations unless the ungraded inspection reset their limit to 31 July 2030. By contrast, all 8 schools whose latest inspection of either kind (graded or ungraded, May to July 2021) gave a 31 July 2026 limit were inspected in November 2025, before it.
*Residual uncertainty:* 41 open schools' latest inspection is a pre-September-2024 ungraded inspection with a "Concerns" outcome. Under the wording in force at the time, those did not count as relevant; under the current wording they do. The panel uses the current wording. All 41 are on the 2.5-year rule, so their usual point (early 2027) comes long before either reading's limit.

**2. Is the transitional 7-year limit still in force?** Yes. Reg. 3ZA (SI 2021/845) has not been revoked; the 2024 amending regulations cite reg. 3 as "amended by S.I. 2021/845". It applies where the earlier section 5 inspection, or the latest relevant section 8 inspection, began between 1 August 2014 and 27 April 2021. The code applies it. As at 24 November 2026 no open school's latest relevant inspection falls in that window, so it moves no date on the site today.

**3. Last graded inspection between September 2024 and November 2025 (overall effectiveness "Not judged").** With any key or provision judgement "requires improvement": `RI25 / RI_KJ`, 2.5 years from publication (Info table, row 4). With none: four years (`STD4`), by the Info page's general rule. See the Annex 2 note above.

**4. Monitoring inspections are not full inspections and do not restart the four-year clock.** Consistent with the September 2026 pages. For focused monitoring: "Remind leaders that, unless the inspection has been deemed a full inspection, the school's next full inspection will be 4 years after the publication of its last full inspection report card (if the school has one). If the school does not yet have a report card, then its next full inspection will be determined by the timing and outcome of its last inspection before the launch of the renewed EIF." For needs-attention monitoring, the quote under MON_NA. A monitoring inspection that is *deemed* a full inspection produces a new report card and is a full inspection; MI records it as "Schools - S8 deemed S5", and the panel treats it as full.
*Statutory side:* MI does not carry the dates of monitoring inspections, and whether a renewed-framework monitoring inspection is a "relevant section 8 inspection" for reg. 3 is not settled by any published source I could find. The panel computes the statutory limit from the last full or ungraded inspection. If a monitoring inspection did count, the true legal limit would be later than the one shown, never earlier.

## Earliest likely and the band

Ofsted publishes a usual point ("approximately", "around") but no range. The panel's band is the Explorer's convention, labelled as such on the method page, and the backtest checks it:

| Rule | Usual point | Earliest likely (band start) | Band end |
| --- | --- | --- | --- |
| STD4, MON_NA | publication + 4 years | + 3 years | + 5 years, or the statutory limit if sooner |
| RI25 | publication + 2.5 years | + 1.5 years | + 3.5 years, or the statutory limit if sooner |
| NEW | none: the whole third year is the usual period | opening + 2 years | the day before opening + 3 years |

## How the panel serves it

`build_data.py` writes one record per school to `site/explorer/data/it/<urn % 128>.json`, so a school page fetches only its own shard (largest 4.6 KB gzipped on 24 November 2026; 32 shards, as `nn/` uses, would be about 14 KB). Each shard's header carries the build date, the MI as-at date and the backtest figures for groups with at least 100 inspected schools. Totals by rule are in `build.json` under `inspection_timing`.

## Daily reads and MI

MI is the record. A report card read from Ofsted's reports site (`data/raw/reports_daily.csv`) moves the clock only if its inspection started after MI's latest full inspection and on or after 10 November 2025. The daily reader keeps only documents titled "School inspection" that carry report-card grades, so monitoring letters and conversion letters never reach that file and cannot restart the clock (tested).

## Scope

All state-funded schools in Ofsted's MI: maintained schools, academies and free schools, special schools, pupil referral units and alternative provision academies, and maintained nursery schools. Independent schools are out of scope (a separate inspection regime and framework). 16 to 19 academies are out of scope: "The further education and skills inspection information applies to the inspection of 16 to 19 academies" (Info). Schools that GIAS records as closed are skipped.

## What the panel cannot know

Ofsted's own scheduling and risk assessment; complaints and other information that can bring an inspection forward; deferrals and pauses; whether a monitoring inspection will be deemed a full inspection; and anything Ofsted has decided but not published. The panel is not a judgement on any school.
