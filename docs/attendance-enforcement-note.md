# Attendance Explorer: enforcement (parental responsibility measures)

Written 24 November 2026, when Mark asked for a clear breakdown of parental responsibility data by area, showing where holidays and unauthorised absence have led to enforcement, and for the link he sees with the attendance of vulnerable groups to be explored. Every figure below was computed from the DfE's files on that date.

## The source, as found

DfE, "Parental responsibility measures", academic year 2024/25, published 29 January 2026 (Explore Education Statistics, publication `86af24dc-67c4-47f0-a849-e94c7a1cfe9b`; one file, about 500 KB; the catalogue id changes each year, so the fetcher finds the newest). Yearly, each January.

- **Coverage:** England, regions and every local authority, 2009/10 to 2024/25. No figures for 2019/20. Rates and reasons from 2013/14 and 2016/17.
- **What it holds:** penalty notices issued, by reason (unauthorised holiday, late, other); paid within 21 days and within 28; withdrawn, with reasons; prosecuted for non-payment; unresolved; from 2024/25, second notices within three years and prosecutions at the two-notice limit; cases entering attendance case management and what became of them; parenting contracts and orders; education supervision orders; and the enrolments the DfE uses as denominator.
- **What it does not hold:** anything by school, by phase or by pupil group. Nobody can say from this file whether families of pupils eligible for free school meals, or of pupils with special educational needs, are fined more or less often than others.
- **Small numbers:** the DfE does not suppress. In 2024/25, 230 figures across authorities are counts of 1 to 9 (mostly prosecutions, orders and the less common reasons). The tool writes these as "fewer than 10".

## England, 2024/25

492,825 penalty notices, 6.68 for every 100 enrolments (4.67 in 2018/19; 5.41 in 2022/23). 93.2% were for unauthorised holiday (86.5% in 2018/19). 72% were paid within 21 days; 28,909 led to prosecution for non-payment. 87,859 cases entered attendance case management; 29 parenting orders; 52 education supervision orders.

Across local authorities the notice rate runs from none (the two smallest) and under 1 for every 100 pupils in seven, to 17.1; the middle half lie between 4.0 and 9.1.

## The link with holidays and with pupil groups

Rank correlations across local authorities, 2024/25 (pupil groups: autumn and spring terms 2024/25). "Allowing for FSM" compares authorities with a similar share of pupils eligible for free school meals.

| Notices for every 100 pupils, against | Correlation | Allowing for FSM |
| --- | --- | --- |
| Unauthorised holiday absence (holiday notices) | +0.71 | +0.66 |
| Share of pupils eligible for free school meals | +0.41 | |
| Overall absence, pupils eligible for free school meals | +0.04 | +0.27 |
| Overall absence, pupils not eligible | −0.02 | −0.02 |
| Overall absence, SEN support | +0.29 | +0.25 |
| Overall absence, EHC plan | +0.14 | +0.22 |
| Overall absence, no identified SEN | +0.44 | +0.28 |

Over time: an authority's notice rate in 2022/23 against the change in its unauthorised holiday absence by 2024/25 is −0.16; the change in notice rate against the change in holiday absence is +0.01; the change in notice rate against the change in absence of pupils eligible for free school meals is −0.04.

What this supports, and what it does not:

1. **Enforcement follows holidays closely.** Authorities with more unauthorised holiday issue more holiday notices. That is what the rules produce, since a notice follows an absence.
2. **Practice still differs a great deal.** For every 1,000 days of unauthorised holiday, the middle half of authorities issued between about 50 and 93 holiday notices; the range runs from almost none to about 135.
3. **More deprived authorities issue more notices** (+0.41 with the share eligible for free school meals).
4. **The link with the absence of vulnerable groups is weak, not clear.** Taken plainly there is no pattern for pupils eligible for free school meals (+0.04). Among authorities of similar deprivation there is a weak positive one (+0.27): where those pupils are absent more, somewhat more notices are issued. For SEN support it is weak (+0.29); for EHC plans weaker still.
5. **Nothing here shows what enforcement does.** These are comparisons between areas in one year. The over-time figures give no sign that issuing more notices is followed by less holiday absence, or by any change in the absence of pupils eligible for free school meals, but two years across 150 authorities cannot settle that either way.

So the tool shows the association and says plainly how strong it is, computed on the page for whichever pair the reader chooses, with the caveats attached. It does not say enforcement helps or harms any group.

## What was built

- `scripts/fetch_attendance_prm.py` to `data/raw/attendance/prm.csv`; `prm_build()` to `site/attendance/data/prm.json` (counties summed from their authorities before the small-number rule; each area's unauthorised holiday absence pooled from its schools at the time).
- "Enforcement" on every local authority and county page: notices issued and for every 100 pupils against England, the share for unauthorised holiday, unauthorised holiday absence beside it, both year by year since 2013/14, what became of the notices, and the other measures for every 10,000 pupils.
- "Enforcement" on Patterns: every local authority as a circle, a choice of enforcement measure against unauthorised holiday absence or a pupil group's absence, the strength of the pattern in a sentence, a map, and the authorities with most and fewest for their size.

## None is not fewer than 10

Mark's point of 24 November: many authorities record none of a measure, and that is a finding in itself. In 2024/25, of 153 local authorities: 145 recorded no education supervision orders, 142 no parenting orders, 115 no prosecutions at the two-notice limit, 113 no notices for lateness, 92 offered no parenting contracts, 45 prosecuted nobody after case management, 29 had no case management cases and 17 prosecuted nobody for non-payment. Two issued no penalty notices at all. The tool writes a recorded zero as "None", a count of 1 to 9 as "fewer than 10", and a dash where the authority supplied no figure; each authority's table says how many authorities recorded none, and Patterns shows the split for every measure. On phones the table keeps the number and that count and drops the two per-10,000 columns.

## For Mark to decide

1. Settled by Mark's reply on 24 November, which took the counts as read and asked that none be kept apart from fewer than 10. For the record, the question was whether counts of notices and cases at local authority level sit within the rule "rates only, never pupil counts". They count notices, not pupils, and the DfE publishes them; the tool shows them with a rate beside each.
2. Whether the two short tables naming the authorities with most and fewest notices for their size should stay. They are a reading of published data and carry no judgement, but they are lists of named places.
3. Whether to seek the pupil-level picture elsewhere. No published source splits penalty notices by pupil group; a freedom of information request to the DfE or to authorities is the only route.
