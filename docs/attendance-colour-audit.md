# Attendance Explorer: colour audit

Checked against the Ofsted Explorer, on branch `claude/happy-franklin-3x5ny9`, working tree after commit `0609bdd`. `site/attendance/` was being edited during the audit, so line numbers will drift; function names are given beside them.

**How it was checked.** Every chart's code was read in both tools. These were rendered at 1,300 px and the screenshots looked at: `/explorer/` (one random secondary, all sections open), Areas (Birmingham), a school (141741, with and without four added schools), a local authority (Latest, Change since 2018/19, and with four added), a constituency, a ward, a county, a trust (Latest and Change) and Patterns. The colours present in each svg were extracted by script and every contrast figure was computed. Not looked at: phone widths, saved PNGs, primary and special phases, the Explorer's school pages and slides. "Code only" means read and not seen.

## 1. Verdict

The approach matches; the execution does not yet. The Ofsted Explorer keeps marks neutral (grey dots, a midnight diamond, a slate England tick) and spends colour in two places: Ofsted's grade colours on grades, and verdigris or rust on a gap or a reading. Grades are on almost every chart, so it is the more colourful tool. The Attendance Explorer has one grade chip, so its colour is all verdigris and rust, and it is uneven: the calendar, the maps and the school-by-school circles are saturated, while week by week, weekdays, reasons, both histograms and the funnel carry none. Where attendance sets a figure against England with a gap bar (pupil groups, counties, regions, "Read three ways") it follows the Explorer exactly. It departs in six ways: England drawn in verdigris, verdigris doing three jobs, a four-hue palette for added places, the readings colours used for free-school-meal groups, two legends that do not match their marks, and one grade chip under 4.5:1.

## 2. Every Attendance Explorer chart

| Page | Chart (file:line) | Colours and what they mean there | Verdict |
| --- | --- | --- | --- |
| All | Headline pills (`colour.js:17`) | `#2F6F66` lower, `#A3402B` higher, `#55627A` same; all slate on a school page. White text 5.86, 6.31, 6.15:1 | Consistent |
| Areas | Calendar, `ribbon` (`pulse.js:91`) | Ramp `#1E544D` to `#E7EFEC`, `#F6E9E4` to `#7A2617`, centred on England's year so far | Consistent; the most colour on the site |
| Areas | Week by week, `weeks` (`pulse.js:120-122`) | `#0B1A2E` this year, `#2F6F66` England, `#A9B2C1` last year | Inconsistent |
| Areas | Weekdays, `dow` (`pulse.js:150-151`) | `#A9B2C1` authorised, `#0B1A2E` unauthorised | Too grey; ink misused |
| Areas | Reasons, `reasons` (`pulse.js:163-164`) | Six navy steps `#C3CAD6` `#97A2B4` `#5F6E87` `#3D4C68` `#22324D` `#0B1A2E` | Too grey; last three cannot be told apart |
| Areas | Hex map, `hex` (`pulse.js:193,199`) | Diverging ramp against England; `#C9A24B` outline, selected | Consistent |
| Areas | Against last year, `change` (`pulse.js:218`) | All authorities `#2F6F66` at 55%; ink diamond; slate dashed diagonal | Inconsistent |
| School | Read three ways, `readings` (`school.js:79-85`) | Gap line and label by direction; England and authority ticks `#55627A`; similar-schools tick `#2F6F66`; ink diamond | Inconsistent (minor) |
| School | Position and Since 2018/19, `strip` (`school.js:102-109`) | Bars `#C9D0DB`; authority's other schools `#2F6F66` ticks; ink diamond | Inconsistent (minor) |
| School | Year by year, `history` (`school.js:133-135,147-149`) | England `#55627A`; authority `#C9D0DB`; added schools `#7A5C14` `#8A4B6B` `#3F6FA6` `#6B6F2A`; `#C9A24B` joining markers | Too much; authority line near invisible |
| School | Ofsted chip (`school.js:9`, `attendance.css:57`) | Grade colours on a grade only | Consistent; one contrast failure |
| Group | Side by side table, `compare` (`group.js:268-269`) | Figures verdigris or rust against England; swatches from the four-hue palette | Figures consistent; swatches too much |
| Group | Pupil groups, `groups` (`group.js:247`) | Gap by direction, slate England tick, ink diamond, others `#C9D0DB` | Consistent; the model to follow |
| Group | School by school, `strip` (`group.js:88`) | Each school on the diverging ramp against England; slate England line | Consistent; key does not match |
| Group | Year by year, `hist` (`group.js:102-105`) | England slate, place ink (dashed for "held today"), added places four hues | Too much when places are added |
| Group | Hex maps, `hexMap` (`group.js:170-173`) | Ramp against England's level or change; brass outline | Consistent |
| Ward | District map, `wardMap` (`group.js:210-213`, `attendance.css:120`) | Same ramp; selected ward outlined `#0B1A2E` | Consistent, except the outline |
| County | Ordered plot, `ordered` (`group.js:227-228`) | Line and dot by direction, slate England, ink diamond | Consistent |
| Trust | Funnel, `funnel` (`group.js:194`) | Trusts `#55627A` at 50%; bands `#E6EAF0` `#F4F5F8`; slate pooled line | Consistent (grey on purpose) |
| Trust | Change dots, `over` (`group.js:151`) | Verdigris or rust against England's change | Consistent |
| Patterns | Free school meals, `gradient` (`patterns.js:6,41`) | `#1E544D` `#6FA299` `#9AA3B2` `#C98672` `#7A2617` for the five groups | Inconsistent |
| Patterns | Circumstances, `scatter` (`patterns.js:57,65-66`) | Dots slate at 16%; middle-school line `#2F6F66` | Inconsistent (minor) |
| Patterns | Spread, `spread` (`patterns.js:92-94`) | Bands `#E9EDF3` `#C9D0DB`; middle school `#0B1A2E` | Consistent |
| Patterns | Regions, `regions` (`patterns.js:137`) | Verdigris below England, rust above, slate equal | Consistent |
| Patterns | Severe absence, `severe` (`patterns.js:179`) | Chosen phase ink, others `#C9D0DB`, labelled at the line end | Consistent |

## 3. Inconsistencies, most important first

1. **England is verdigris in Week by week** (`pulse.js:121`). It should be slate `#55627A`; last year stays `#A9B2C1`. Seen.
2. **Verdigris has three meanings.** Lower than the comparison (everywhere); a comparison group (`school.js:82` similar schools, `school.js:106` the authority's schools, `pulse.js:218` every authority); and a neutral trend line (`patterns.js:65`). In "Read three ways" the similar-schools row joins a verdigris tick to a verdigris "lower" line (seen). The Ofsted Explorer does the same (`app.js:279` gap fill, `app.js:296` group average), so the fault is in the rule. Proposed: in attendance, verdigris means lower and nothing else; comparison marks are slate. That departs from "the comparison group is verdigris" and needs Mark's decision.
3. **The authority is drawn three ways on one school page**: slate tick (`school.js:82`), verdigris ticks (`school.js:106`) and a `#C9D0DB` line (`school.js:134`) that is 1.55:1 on white and barely visible (seen). It should be slate throughout, dashed beside England.
4. **"Against the same point last year" colours every authority verdigris** (`pulse.js:218`), though the chart asks lower or higher than last year. Dots should take `AXc.gap(gap(d.y, d.x))`: verdigris below the diagonal, rust above.
5. **The four-hue palette for added places** (`school.js:8`, `group.js:263`). `#7A5C14` is deep brass and sits beside the brass joining markers; `#8A4B6B` reads as rust; `#3F6FA6` is close to Ofsted's Exceptional blue; `#7A5C14` and `#6B6F2A` are 1.17:1 apart, and Coventry and Solihull could not be told apart on the Birmingham chart (seen). It should be one navy-grey family, told apart by dash and a label at the line end.
6. **Free-school-meal groups use the readings colours** (`patterns.js:6`): verdigris means "fewest eligible" and rust "most eligible", a second meaning that reads as a judgement on intake. The middle three lines are under 3:1 on white (2.88, 2.54, 2.94). It should be one sequential navy ramp, for example `#C3CAD6` `#97A2B4` `#5F6E87` `#3D4C68` `#0B1A2E`.
7. **Weekdays and reasons are wholly navy-grey, and ink stands for a category** (`pulse.js:151,164`) when ink means "this place". Making unauthorised absence rust would be wrong: it is a category, not a reading. The Explorer's method is neutral marks plus a coloured gap, so add England as a slate tick on each bar with the difference in verdigris or rust, and cut reasons to four distinguishable tones.
8. **Legends that do not match the marks** (seen). `group.js:91` shows solid `#2F6F66` and `#A3402B` swatches for circles drawn on a pale-to-deep ramp; `patterns.js:66` shows a `#C9D0DB` swatch for slate dots.
9. **Selection is marked two ways**: brass on hexagons (`pulse.js:199`, `group.js:172`), ink on the ward map (`attendance.css:120`). Brass is the stated rule.
10. **Text on a fill.** "Strong standard" is white on `#33903C`, 4.04:1 (`school.js:9`). Midnight text gives 4.32:1, so neither passes and the colour may not change; only bold text of 18.7 px or more would comply. Exceptional is 4.50:1. Everything else passes.

Smaller: `ramp` is unused in `pulse.js:6` and `group.js:8`. Not colour, but seen: the local authority "Year by year" subtitle says "located in the constituency" (`group.js:98`).

### The Ofsted Explorer against its own rules

- Brass as data in the method figures: the 50 nearest schools "(gold)" (`explorer.css:240`, `method.js:132`, seen); "on both lists" (`explorer.css:199,208`), the official average tick (`explorer.css:215`) and "lowers the expectation" (`explorer.css:254`), code only.
- White on `#FF8341`, 2.45:1: bar labels in "grades by deprivation" (`app.js:377`, 11 px, measured) and the report-card tile for Needs attention (`app.js:227`, code only). The table chips and area bars already use midnight text.
- White on `#33903C`, 4.04:1, on chips, tiles and bar labels (measured).
- Leftover tokens `#0B1D3A`, `#5E6B80` and cobalt `#2E5BFF` (`index.html:16,33`), overridden in `explorer.css`; code only.

## 4. Recommended changes, in order

1. `pulse.js:121`: England line `VERD` to `MUTED`.
2. `pulse.js:218` and its key at `:224`: colour dots by direction against last year.
3. `patterns.js:6`: replace `SHADES` with the sequential navy ramp.
4. `school.js:8` and `group.js:263`: replace `OTHERS` with navy-greys plus dash patterns; label lines at the right-hand end.
5. `school.js:134` and `:106`: authority line and ticks to slate (line dashed).
6. `patterns.js:65`: middle-school line to `INK`, matching `spread`; fix the swatch at `:66`.
7. `group.js:91`: use the ramp legend.
8. `pulse.js:150-151,163-164`: stop using ink for a category; add the England tick and coloured gap; four tones for reasons.
9. `attendance.css:120`: ward outline to brass, or all selections to ink.
10. Ask Mark: verdigris for direction only (inconsistency 2), and whether school circles coloured against England on area and trust pages (`group.js:88`) sit comfortably with slate pills on a school's own page.

### Leave alone

- The calendar, hex maps, county plot, regions and pupil-group charts: the Explorer's method, applied correctly.
- Slate pills on a school page, and the single Ofsted chip.
- The funnel, both histograms and the spread chart staying grey: they show spread and chance, and colour there would overstate differences.
- Brass joining markers on a school's history: they mark an event, not data.
- Ofsted's grade colours, in both tools.
