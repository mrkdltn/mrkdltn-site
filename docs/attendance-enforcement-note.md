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

## Two strands, kept apart

Mark's instruction of 24 November: penalty notices for a holiday in term time that the school did not agree, and penalty notices for other unauthorised absence from school, are separate things and must be treated as such. The pages never add them together. Each strand has its own count, its own rate for every 1,000 pupils and its own kind of absence beside it (unauthorised holiday absence; and unauthorised absence other than holiday, which is all unauthorised absence less unauthorised holiday and so includes arriving after the register has closed and absences with no reason yet given). The total appears only where the DfE gives nothing finer: what became of the notices (paid, withdrawn, prosecuted) is published for all notices together.

England, 2024/25: 459,288 notices for unauthorised holiday (62.2 for every 1,000 pupils), 32,113 for other unauthorised absence (4.4) and 1,424 for lateness (0.2). Across local authorities with an exact figure, notices for other unauthorised absence have a median of 3.2 for every 1,000 pupils, the middle half between 1.2 and 6.6.

Rank correlations by strand (local authorities, 2024/25; second figure allows for the share eligible for free school meals):

| Set against | Holiday notices (151 authorities) | Notices for other unauthorised absence (138) |
| --- | --- | --- |
| Unauthorised holiday absence | +0.74, +0.69 | +0.21, +0.07 |
| Other unauthorised absence | +0.40, +0.17 | +0.34, +0.12 |
| Absence, pupils eligible for free school meals | +0.07, +0.30 | −0.08, +0.09 |
| Absence, pupils not eligible | −0.06, −0.07 | +0.10, +0.12 |
| Absence, SEN support | +0.27, +0.25 | +0.13, +0.10 |
| Absence, EHC plan | +0.16, +0.25 | −0.02, +0.02 |

Read separately, the two strands behave differently. Holiday notices follow holiday absence closely. Notices for other unauthorised absence follow that absence only weakly, and hardly at all once deprivation is allowed for: how far an authority uses notices for non-holiday absence looks much more like a choice of practice than a response to how much of it there is. Neither strand shows a clear link with the absence of pupils eligible for free school meals or with special educational needs. (These supersede the combined figures in the table further up, which used all notices together.)

## Where notices are not used for other unauthorised absence

Mark asked on 24 November for the tool to highlight where local authorities do not enforce for unauthorised absence other than holiday, and the impact on vulnerable learners' persistent and severe absence. The highlight is built on Patterns. The data does not show the impact he expected, and the page says what it does show.

Of the 151 authorities with 2,000 or more pupils, 8 recorded no such notices in 2024/25 and 13 recorded fewer than 10. Middle authority of each group, autumn and spring terms 2024/25:

| Notices for other unauthorised absence | Authorities | FSM: persistent, severe | SEN support: persistent, severe | EHC plan: persistent, severe |
| --- | --- | --- | --- | --- |
| None | 8 | 31.3%, 3.91% | 25.0%, 3.69% | 32.5%, 6.50% |
| Fewer than 10 | 13 | 29.1%, 2.97% | 25.2%, 2.80% | 31.2%, 4.64% |
| Lower third of the rest | 43 | 32.8%, 4.48% | 26.4%, 4.13% | 33.9%, 7.90% |
| Middle third | 43 | 30.9%, 3.80% | 26.2%, 3.80% | 32.0%, 6.39% |
| Upper third | 44 | 30.8%, 3.84% | 27.2%, 4.16% | 34.7%, 6.87% |

Authorities that issue none or very few do not have higher persistent or severe absence among these pupils; taken plainly it is a little lower (pupils eligible for free school meals: 29.3% against 31.6% persistent; 3.62% against 4.08% severe). Nine of the 21 are London boroughs, where absence is lower in general. Allowing for the share eligible for free school meals and for London, the differences are small and within what chance would give (free school meals persistent −0.5 points, standard error 0.65; severe −0.1, 0.21; SEN support −0.5, 0.54; EHC plan persistent −1.6, 0.76). So there is no evidence here that not issuing these notices goes with worse attendance for vulnerable pupils, and none that issuing them goes with better. One year across 151 areas cannot show cause in either direction, and authorities that issue none may be doing other things instead.

The scatter on Patterns also now lets the reader choose overall, persistent or severe absence for each pupil group.

## None is not fewer than 10

Mark's point of 24 November: many authorities record none of a measure, and that is a finding in itself. In 2024/25, of 153 local authorities: 145 recorded no education supervision orders, 142 no parenting orders, 115 no prosecutions at the two-notice limit, 113 no notices for lateness, 92 offered no parenting contracts, 45 prosecuted nobody after case management, 29 had no case management cases and 17 prosecuted nobody for non-payment. Two issued no penalty notices at all. The tool writes a recorded zero as "None", a count of 1 to 9 as "fewer than 10", and a dash where the authority supplied no figure; each authority's table says how many authorities recorded none, and Patterns shows the split for every measure. On phones the table keeps the number and that count and drops the two per-10,000 columns.

## For Mark to decide

1. Settled by Mark's reply on 24 November, which took the counts as read and asked that none be kept apart from fewer than 10. For the record, the question was whether counts of notices and cases at local authority level sit within the rule "rates only, never pupil counts". They count notices, not pupils, and the DfE publishes them; the tool shows them with a rate beside each.
2. Whether the two short tables naming the authorities with most and fewest notices for their size should stay. They are a reading of published data and carry no judgement, but they are lists of named places.
3. Whether to seek the pupil-level picture elsewhere. No published source splits penalty notices by pupil group; a freedom of information request to the DfE or to authorities is the only route.
