# Attendance Explorer: writing pass

24 November 2026, on branch `claude/happy-franklin-3x5ny9`. Nothing is committed. Words only: no logic, markup structure, ids, classes, numbers, calculations or colours were changed. The one piece of non-text touched is the `WHERE` table in `site/attendance/chrome.js`, which sorts the method paragraphs into tabs by their bold titles.

Files changed: the five pages (`index.html`, `school/index.html`, `group/index.html`, `patterns/index.html`, `start/index.html`) and `pulse.js`, `school.js`, `group.js`, `patterns.js`, `start.js`, `brief.js`, `chrome.js`. `places.js` and `tools.js` were read and left as they are.

## Conventions applied

**Measures.** Always "overall absence", "persistent absence" and "severe absence", never "absence rate" or "PA". Each page now defines them near the top: persistent absence is "the share of pupils who missed a tenth or more of their sessions" (it was "10% or more" in two places), severe absence "the share who missed half or more". A session is "a morning or an afternoon" and is defined the first time each page leans on it.

**Pupil groups.** "Pupils eligible for free school meals", "pupils with SEN support", "pupils with an education, health and care plan". "EHC plan" stays on the control only.

**Periods.** "The autumn and spring terms 2025/26" for the newest termly figures, "a year earlier" for the same two terms a year before, "the same point last year" for the in-year figures on Areas (it was "this point last year" in some places and "last year" in others). 2018/19 is "the last full year before the pandemic" once per page.

**"Pooled" has gone from the pages.** A governor will not know it. Readings, legends and sub-headings now say "taken together" ("its schools taken together", "England's secondary schools taken together"). The method defines it once: one rate for the schools together, so larger schools count for more, and not the average of the schools' own rates.

**Points.** Differences are in percentage points, shortened to "points", as before. Each method now says so in a paragraph titled "Points".

**Tense.** Published periods are in the past tense ("was 8.0%", "had a lower rate"). The in-year comparison on Areas keeps the present where it describes the position today ("is lower than at the same point last year in 102 of 151 local authorities").

**Findings first.** A reading sentence starts with the figure and its comparison. Where one sentence joined two findings with a colon or semicolon it is now two sentences ("...for other pupils. That is a gap of 4.9 points, against 3.7 across England.").

**Colour is explained in words.** Every sub-heading that relies on green and rust says what they mean in a full sentence, and each method has a "Colours" paragraph ending "Colour shows direction only."

**Labels match what a tap does.** Where a tap names a place beneath the chart with an Open button, the text says "Tap a hexagon to name it", not "to open it". The county chart still opens on a tap and says so.

**Search boxes.** One label pattern ("Find an area, school or trust", ordered by the page's own kind) and one placeholder ("Name, town or postcode").

**Method.** Each of the three older method cards is now headed "How this page works", to match Patterns and "How the Explorer works". Each paragraph carries one idea in short sentences, with the caveat stated plainly. Every card ends with "Not a judgement".

## Areas (`index.html`, `pulse.js`)

**Meta description**
- Before: School attendance in England, day by day: every local authority and region read against England and against last year. Built from the DfE's fortnightly attendance data.
- After: Absence from school in England this school year, day by day and week by week. Every region and local authority is read against England and the same point last year. From the DfE's fortnightly attendance data.

**Open Graph**: title "Attendance Explorer" becomes "Attendance by area · Attendance Explorer"; description rewritten to match.

**Hero**
- Before: England, every region and every local authority, day by day through this school year, read against the country and against last year. Counties, constituencies and wards are one step away.
- After: Absence in England, each region and each local authority, day by day through this school year, read against England and the same point last year. Counties, constituencies and wards have pages of their own.

**Summary reading**
- Before: Pupils in secondary schools in Birmingham missed 7.5% of sessions between 7 September and 6 November 2026, 0.2 points lower than at this point last year (7.7%). England stands at 8.0%, so absence here is 0.5 points lower.
- After: Pupils in secondary schools in Birmingham missed 7.5% of their sessions between 7 September and 6 November 2026, 0.2 points lower than at the same point last year (7.7%). England's figure was 8.0%, so absence here was 0.5 points lower.
- Where the figures match: "the same as at this point last year" becomes "unchanged from the same point last year"; "That matches England." becomes "England's figure was the same."

**Tiles**: "Authorised / illness 2.7%" becomes "Authorised absence / of which illness 2.7%"; "Unauthorised / term-time holiday 0.45%" becomes "Unauthorised absence / of which holiday 0.45%"; "last year 5.9%" becomes "same point last year 5.9%".

**The year so far, one square a day (sub)**
- Before: Each square is a school day: green where fewer sessions were missed than England's average for the year, rust where more. Rows run Monday to Friday; last year sits beneath for comparison. Blank squares are holidays, or days when under 80% of the usual pupils were due in.
- After: Each square is one school day, coloured by the share of sessions that pupils missed. A session is a morning or an afternoon. Green days had lower absence than England's average for the year so far, rust days higher. Rows run Monday to Friday, with last year beneath. Blank squares are holidays, or days when fewer than 80% of the usual pupils were due in.

**Weekday reading**
- Before: Fridays averaged 6.3% and Mondays 5.6%, against 5.4% from Tuesday to Thursday.
- After: Absence averaged 6.3% on Fridays and 5.6% on Mondays, against 5.4% from Tuesday to Thursday.

**Reasons heading**: "What the absence was" becomes "The reasons recorded for absence". The legend's "No reason yet" becomes "No reason given yet".

**Map (sub)**
- Before: One hexagon for each of the 153 authorities, placed roughly where it sits, coloured by overall absence since September against England. Tap one to read it.
- After: One hexagon for each of the 153 local authorities, placed roughly where it sits and coloured by overall absence since September against England. Green is lower than England, rust higher. Tap a hexagon to show that local authority on this page.

**Against the same point last year (sub and reading)**
- Before: Each dot is a local authority. Dots below the line have lower absence than at this point last year; dots above have higher. / Absence in all schools is lower than at this point last year in 102 of 151 authorities and higher in 22.
- After: Each dot is a local authority. Below the dashed line, absence is lower than at the same point last year. Above it, absence is higher. / Overall absence in all schools is lower than at the same point last year in 102 of 151 local authorities and higher in 22.

**No figures**
- Before: The DfE's release has no figures for special schools in Rutland, or too few pupils to show a rate.
- After: No rate is shown for special schools in Rutland. The DfE's release has no figures, or there were too few pupils to show one.

**Method.** Six paragraphs became eleven. New: "Authorised and unauthorised" (what the reasons chart groups under each), "Points", "Colours", "Areas" (which fills the Places tab, empty on this page before) and "Not a judgement". "What is counted", "Last year", "Source", "Map", "What is withheld" and "Not the termly statistics" keep every fact, in shorter sentences. Example:
- Before: A day is left blank where an area had under 80% of its usual sessions, and a week where it had under 70%, because the pupils in school when holidays are staggered are not typical of the whole.
- After: A day is left blank where an area had under 80% of its usual sessions, and a week where it had under 70%. When holidays are staggered, the pupils in school are not typical of the whole.

Trivial, grouped: "Data to" becomes "Figures to" in the date line; the title on saved images becomes "Birmingham: absence in secondary schools"; "Too few sessions to show weekdays here." becomes "There are too few sessions here to show each weekday."; the calendar reading opens "Absence so far this year was highest on".

## Schools (`school/index.html`, `school.js`)

**Title and share text.** The static title "School attendance" becomes "Schools". The description and Open Graph text were the Areas page's by mistake; they now describe this page: "Absence at any state-funded primary, secondary or special school in England, set beside England, its local authority and the 20 schools most like it, and year by year from 2013/14. From the DfE's termly absence statistics." (On the live site the Pages Function replaces these for each school; that file was not touched.)

**Summary heading**: "The autumn and spring terms 2025/26" becomes "Absence in the autumn and spring terms 2025/26".

**Summary reading**: "missed 8.8% of sessions" becomes "of their sessions". Where nothing changed: "the same as in the same two terms a year earlier" becomes "unchanged from the same two terms a year earlier", and "the figure was 5.1%." becomes "the figure was 5.1%, the same."

**Read three ways**
- Sub, before: ...Green marks lower absence at this school than the comparison, rust higher.
- Sub, after: ...A green bar means lower absence at this school than the comparison, a rust bar higher.
- Label at the end of each bar, before: 8.0% · 0.8 points higher
- After: 8.0% · school 0.8 higher (the old label sat beside England's figure and read as if England were higher)
- Legend: "Higher" becomes "Higher absence here".
- Reading: "The school's 8.8% is 0.3 points lower." becomes "was 0.3 points lower."; "so small gaps mean little" becomes "so a small gap means little".
- The list of similar schools is now headed "The 20 similar schools, in alphabetical order".

**Side by side (sub)**
- Before: The first two columns are the autumn and spring terms 2025/26; "in a year" compares them with the same two terms a year earlier; "since 2018/19" compares full years 2018/19 and 2024/25.
- After: Overall absence is the share of sessions (mornings and afternoons) that pupils missed. Persistent absence is the share of pupils who missed a tenth or more of their sessions. The first two columns are the autumn and spring terms 2025/26. "In a year" is the change from the same two terms a year earlier, and "since 2018/19" the change between the full years 2018/19 and 2024/25, both in percentage points.

**Where it sits**
- Sub, before: Every school of the same phase in England, by overall absence... The marks beneath are the other schools in the same local authority. This is a position in a distribution, not a judgement of the school.
- Sub, after: Every school in England of the same phase (primary, secondary or special), by overall absence... The taller the bar, the more schools at that rate. The marks beneath are the other schools in its local authority. This is a position in a distribution, not a judgement of the school.
- Reading, before: Overall absence here was 8.8%. The middle school of this phase had 8.0%; 35% of secondary schools had a higher rate and 65% a lower one.
- Reading, after: Overall absence here was 8.8%. The middle school in England, with as many schools above it as below, had 8.0%. 35% of secondary schools had a higher rate than this school and 65% a lower one.

**Since before the pandemic (reading)**
- Before: ...at 98% of secondary schools; the middle school rose by 2.8 points.
- After: ...at 98% of secondary schools. At the middle school it rose by 2.8 points.

**Method.** Twelve paragraphs became sixteen. New: "Points", "Since 2018/19", "Colours" and "Not a judgement". Changes of substance in wording only:
- "Similar schools", before: ...Each factor is weighted by how strongly it relates to absence. This is our own match from published data, not the DfE's. Context figures are from the January 2026 school census.
- After: ...Each factor is weighted by how strongly it goes with overall absence across schools. The match is made here from published data and is not the DfE's. The factors are from the January 2026 school census. The Patterns page sets out the weights. ("Our" has gone because the site is one person's; "goes with" matches Patterns; the link is new.)
- "No expected rate", before: The Explorer does not calculate what a school's absence "should" be.
- After: No expected rate is calculated for any school. (The decision, stated as it was made.)
- "What is not shown": "fewer than 10 enrolments" becomes "fewer than 10 pupils on roll"; "Severe absence (missing half or more of sessions) is not shown for single schools because it is usually a handful of children" becomes "Severe absence, which is missing half or more of sessions, is never shown for a single school, where it usually describes a handful of children."
- "England and the local authority": "pooled across schools of the same phase... persistent absentees over enrolments" becomes "one rate for all its schools of the same phase taken together... persistently absent pupils over pupils on roll. Larger schools count for more."
- "Ofsted" now adds that the grade is shown "in Ofsted's own colour".

Trivial, grouped: the random-school hint, "Any school added under Side by side is drawn here too", "No full-year figures have been published for this school yet", "Earlier years are from the predecessor school", "Other schools in its local authority", "No school with that number is in the newest release", and the no-rate message split into two sentences.

## Areas and trusts (`group/index.html`, `group.js`)

**Share text.** Description and Open Graph text were the Areas page's; they now read "Overall, persistent and severe absence across the schools of any local authority, county, constituency, ward or trust in England, against England and year by year. Built from the DfE's school-level absence statistics." The fallback line under the heading now lists local authorities too.

**Summary**: heading and "of their sessions" as on school pages; the same two "unchanged" and "the same" endings.

**Side by side (sub)**
- Before: Secondary schools. The first three columns are the autumn and spring terms 2025/26; "in a year" compares them with the same two terms a year earlier; "since 2018/19" compares full years 2018/19 and 2024/25. Figures are coloured against England.
- After: Secondary schools. Overall absence is the share of sessions (mornings and afternoons) that pupils missed. Persistent absence is the share of pupils who missed a tenth or more of their sessions, and severe absence the share who missed half or more. The first three columns are the autumn and spring terms 2025/26. "In a year" is the change from the same two terms a year earlier, and "since 2018/19" the change between the full years 2018/19 and 2024/25, both in percentage points. A green figure is lower than England's, a rust figure higher.

**By pupil group (sub)**
- Before (free school meals and change in a year chosen): The change in severe absence on the same two terms a year earlier for pupils eligible for free school meals for groups of pupils in its secondary schools, autumn and spring terms 2025/26. Published by the DfE for local authorities, not for single schools.
- After: The change in severe absence from the same two terms a year earlier for pupils eligible for free school meals. Every pupil group in its secondary schools is shown for the autumn and spring terms 2025/26, with any group chosen above highlighted. The DfE publishes these figures for local authorities and above, not for single schools.
- Reading, before: ...against 4.0% for other pupils: a gap of 4.9 points, where England's is 3.7.
- Reading, after: ...against 4.0% for other pupils. That is a gap of 4.9 points, against 3.7 across England.

**School by school**
- Sub, before: Each circle is one of its secondary schools, sized by the number of pupils and placed by overall absence... Tap a circle for the school.
- Sub, after: Each circle is one of its secondary schools, placed by overall absence... A larger circle is a larger school. Tap a circle to name the school.
- Legend: "Birmingham, pooled" becomes "Birmingham, its schools taken together".
- Reading, before: ...ran from 4.2% to 9.8%; five had a lower rate than England's secondary schools as a whole.
- Reading, after: ...ran from 4.2% to 9.8%, and five had a lower rate than England's secondary schools taken together.
- With severe absence chosen, before: Severe absence is not shown school by school: in one school it usually describes a handful of children.
- After: Severe absence is never shown for a single school, where it usually describes a handful of children.

**Year by year (sub, trusts)**
- Before: The solid line pools only the schools that were in the trust in each year: the trust's own record. The dashed line pools all the schools it holds today in every year, including years before they joined.
- After: The solid line takes together only the schools that were in the trust in each year. It is the trust's own record. The dashed line takes together the schools it holds today in every year, including the years before they joined.
- Reading: "...and September 2023; one came from another trust." becomes "...and September 2023, and one came from another trust."

**Maps and ordered charts.** The colour key inside each sub-heading is now a sentence of its own.
- Before: One hexagon each, placed roughly where it sits and coloured by overall absence in its primary schools against England: green lower, rust higher. Grey where there is no figure. Tap one to open it.
- After: One hexagon for each, placed roughly where it sits and coloured by overall absence in its primary schools against England. Green is lower than England, rust higher. Grey means no figure. Tap a hexagon to name it.
- For a change: "green fell or rose less than England, rust rose more" becomes "Green means it fell, or rose less than across England, and rust that it rose more."
- Readings move to the past tense and lose a semicolon: "41 of the other 542 constituencies had a lower rate than Aldershot and 501 a higher one."; "For Birmingham, the change... was −0.6 points, against −0.3 points across England."
- "the change in overall absence on the same two terms a year earlier" becomes "from the same two terms a year earlier" everywhere it is used.
- Wards: "18 of the 22 wards in Wirral carry a figure" becomes "have a figure".

**Among trusts, allowing for size**
- Sub, before: ...placed by pupils and by overall absence. The bands show where about 95% and 99.8% of trusts of each size fall. Small trusts vary more by chance.
- Sub, after: ...placed by its number of pupils and by overall absence. The bands show where about 95% and 99.8% of trusts of each size fall. A small trust varies more by chance, so the bands are wider on the left. Tap a dot to name the trust.
- Reading, before: ...with higher overall absence than size alone would explain.
- Reading, after: ...with higher overall absence than chance alone would explain in a trust of its size. (The bands describe chance at a given size; "size alone" suggested size itself drove absence.)

**Not enough schools**
- Before: A figure for all its schools together is given for trusts with five or more...
- After: A figure for all of a trust's schools taken together is given only for trusts with five or more...

**Method.** Thirteen paragraphs became nineteen, and the "What is not here" tab, empty on these pages before, now has two. Titles renamed: "Pooled rates" is "Taken together"; "When a pooled rate is shown" is "Small numbers". New: "Points", "Colours", "Trusts" (under Places), "Severe absence" (split out of "Three measures"), "No expected rate" and "Not a judgement". Merged: the sentence about local authority figures differing from the DfE's own totals was in both "Local authorities" and "Counties" and is now once, under "Local authorities", keeping "which include other settings". The ward boundary credit moved from "Wards" to "Maps". Examples:
- "Taken together", before: Sessions missed across the schools over sessions possible, and persistent and severe absentees over pupils on roll.
- After: Each figure for a place is one rate for its schools taken together: sessions missed across the schools over sessions possible, and persistently and severely absent pupils over pupils on roll. Larger schools count for more, so it is not the average of the schools' own rates.
- "Constituencies", before: 2024 boundaries. A figure describes the schools located in the constituency, not the children who live there; many pupils cross boundaries to school.
- After: Parliamentary constituencies on their 2024 boundaries. A figure describes the schools located in the constituency, not the children who live there. Many pupils cross a boundary to go to school.
- "The funnel" gains the sentence already in the reading: "The comparison takes no account of the pupils a trust's schools serve."
- "Pupil groups" now names all five groups shown, including pupils not eligible for free school meals.

Trivial, grouped: search label and placeholder; the controls region was labelled "Search" for screen readers and is now "Choose what to show"; "Not found" becomes "Place not found" with "No area or trust matches that address"; county table "schools, pooled" becomes "schools, taken together"; "any one phase" in the too-few-schools message.

## Patterns (`patterns/index.html`, `patterns.js`)

Lightly touched: this page's method is the model for the others.

**Share text.** The description said the spread between schools "has widened since 2018/19", which is a finding the page tests rather than a fixed fact; it now says "has moved since 2013/14", as the hero does.

**Hero**
- Before: Every state-funded school in England at once: how absence varies with the circumstances of a school, how the whole distribution has moved since 2013/14, and where the gaps have opened.
- After: Every state-funded school in England at once: how absence varies with a school's circumstances, and how the spread between schools has moved since 2013/14. Overall absence is the share of sessions (mornings and afternoons) that pupils missed. Persistent absence is the share of pupils who missed a tenth or more of their sessions.

**The school year, one square a day (sub)**
- Before: Every school day in England, from the registers schools share with the DfE each day: green where fewer sessions were missed than on the average day of the last full year, rust where more. Rows run Monday to Friday. The pattern of the week and of the terms shows at a glance. It follows the schools chosen above.
- After: Each square is one school day in England, from the registers schools share with the DfE each day. Green days had lower absence than the average day of the last full school year, rust days higher. Rows run Monday to Friday. This chart follows the schools chosen above, not the measure.

**Readings.** Two colons and a semicolon became full stops: "...in the fifth with the fewest. That is a gap of 3.3 points."; "...of 4.7%. In the twentieth with the most, it had 9.5%."

**Circumstances chart.** The control "Across the page" is now "Circumstance", and its options name pupils in full ("Pupils with an education, health and care plan").

**Method.** "What this shows" gains two rows for the two charts added after it was written ("One square a day", "Severe absence") and definitions of "Severe absence" and "Points". "Pooled" in the definitions is now "Taken together", and "10% or more" is "a tenth or more". "Small numbers" gains a row: severe absence is shown for England by phase only, never for a single school.

Trivial, grouped: "pooled" becomes "taken together" in four sub-headings; the regions toggle is labelled "Show" for screen readers, not "Compare by"; "under 80%" becomes "fewer than 80%"; the date line reads "Full school years to 2024/25, and each school's figures for the autumn and spring terms 2025/26."

## Start here and briefings (`start/index.html`, `start.js`, `brief.js`)

**Share text.** Was the Areas page's. Now: "Three questions, then a short briefing on school absence for the school, trust or area you choose. Built from the figures the Department for Education publishes."

**Hints at step 2.** The old hints said what "most" people in a role do, which nothing here measures.
- Before: Most governors start with their school, and most trustees with their trust. Any school, trust, local authority, county, constituency or ward in England will do.
- After: Start with your school, or with your trust if you are a trustee. You can choose any school, trust, local authority, county, constituency or ward in England.
- The other five follow the same pattern ("Your own school is the natural place to start.", "Start with your child's school.").

**Questions at step 3**
- "Is it improving?" becomes "Is absence falling?" (it names the measure and makes no judgement).
- "Which pupils miss most?" becomes "Which pupils miss the most school?"
- Under severe absence: "Pupils who missed half or more of their sessions" becomes "The share of pupils who missed half or more of their sessions" (rates, not counts).
- "Year by year, and the change in the last year." becomes "Year by year, and the change from a year earlier."
- "this year beside last" becomes "this year beside the same point last year" in both England options.

**Notes when a question is not offered**
- Before: Absence by pupil group is published for local authorities and counties only. Choose a local authority at step 2 to see it.
- After: Absence by pupil group is shown for local authorities and counties only, because the DfE does not publish it for anything smaller. Choose a local authority or a county at step 2 to see it.
- Before: Severe absence is not shown for a single school, because it usually describes a handful of children.
- After: Severe absence is never shown for a single school, where it usually describes a handful of children.

**Briefing header.** "A briefing for reporting" becomes "A briefing for reporting and research" (the role is "Journalist or researcher"). "It is a reading of published DfE data" becomes "a reading of data published by the DfE". In the list of what a briefing gives, "the reasons for absence" becomes "the reasons recorded for absence" and "the comparison with last year" becomes "the comparison with the same point last year"; the same two phrases changed in `start.js`, which holds a copy.

Trivial, grouped: "Choose the one that fits you best", "choose England as a whole", "One more briefing covers the rest of what you chose", "so you can share the page or come back to it".

## Claims to check

None of these was reworded in substance. Each is a sentence whose claim I could not confirm from the pages alone, or a place where two figures on one page disagree. The second group is for whoever is checking the figures.

1. **"Days when fewer than 80% of the usual pupils were due in"** (calendar sub-headings on Areas and Patterns) against **"under 80% of its usual sessions"** (Areas method). Pupils and sessions are not the same count. One of the two wordings should give way to the other.
2. **"In secondary schools that includes most days from June, once Year 11 has left"** (Patterns calendar legend). Plausible, but it is a statement about the data that the page does not show.
3. **"About 44% of wards with a school carry a figure"** (group method, Wards). A fixed number in static text; it will drift with each release.
4. **"The list includes the trusts of some maintained foundation schools, which have no joining dates"** (group method). Kept as written.
5. **"At the middle school it rose by 2.8 points"** (school page, Since before the pandemic). The sentence assumes the median change is a rise. If it were ever a fall it would read "rose by -0.3 points". True for every phase today.
6. **Trust pages with no joining dates** (for example The North Tyneside Learning Trust). The sub-heading describes a solid and a dashed line; only one line is drawn, and the reading beneath says so. The sub-heading is chosen by kind of place, so fixing it needs a small change to logic.
7. **"With 56 pupils on roll"** (school page, Read three ways) beside **"98 pupils"** in the census line two sentences later, for the same school. The first is the absence file's enrolment for ages 5 to 15 and the second the census headcount. Both are right; together they look like an error. It also prints a pupil count beside a persistent absence rate in a very small school, which sits close to the rule on rates only.
8. **Rounding between a reading and its table.** The summary takes the difference between the two figures as shown; the Side by side table rounds the exact difference. They can differ by 0.1. Seen today: Chase High School, "3.6 points higher than in 2018/19" in the reading and "+3.7" in the table; The North Tyneside Learning Trust, "0.2 points higher" and "+0.1"; Bebington ward, "0.6 points lower" and "−0.5"; Savile Town, "+2.2 points" on the chart label and "rose by 2.1 points" beneath it.
9. **A reading that disagrees with its own figures.** Advance Learning Partnership, secondary schools: "missed 8.8%... 0.8 points lower than in the same two terms a year earlier (9.7%)". 9.7 less 8.8 is 0.9. The percentage is formatted one way and the difference rounded another, so a figure ending in 5 can land on either side.
10. **"Ofsted graded attendance and behaviour ... at the inspection of [date]"** on school pages. It states the grade as published and says nothing more, which I read as inside the rule against commentary on individual schools' new grades. Worth Mark's eye all the same.

## Left as it was, and why

- **"Read three ways", "Side by side", "Year by year", "School by school", "The schools".** Section headings that are labels, not findings. The data under them changes with every school, so a claim in the heading would need logic. The headings that already switch to a claim when the data supports it (Patterns: "The gap by free school meals has widened", "Schools are further apart than in 2018/19", "Severe absence has more than doubled since 2018/19") are unchanged.
- **Section names in the travelling menu and in briefing addresses** (`data-nav`: "Three ways", "Compared", "Against last year" and the rest). They are data attributes and the briefing links depend on them.
- **Control labels "Overall", "Persistent", "Severe"** on area and trust pages. The briefing header builds "severe absence" from the button text, so the buttons must stay one word.
- **"Chosen above:"** at the start of the line that reports the controls. `CLAUDE.md` and the checks name it.
- **Pills** ("0.5 points lower than England") and the search results' wording live in `colour.js` and `search.js`, outside this pass. Search still says "Nothing matches. Try a school's town or postcode."
- **`data-ax-source`**, the source line printed on saved images. It is a data attribute, and it reads well.
- **The alt text of the share image** on all five pages. I have not changed it because it describes the image, which is the same on every page.
- **`places.js` and `tools.js`.** "Save to your places", "Your places", "Save image" and the empty state already read as Mark's.
- **"School by school" with severe absence chosen from the address** (for example `...&m=sev`). The sub-heading reads "Each circle is one of its , placed by ." because the two blanks are filled only after another measure has been drawn. Words cannot fix it. The fix is to fill the two spans before the early return for severe absence in `strip()` in `group.js`, or to hide the sub-heading when severe is chosen.
- **"Five had a lower rate"** when all five did (Bebington ward). "All five" would read better and needs a condition.
- **The briefing title on Areas** reads "A briefing for reporting and research: Attendance by area", not "England", because the title takes the page heading. Needs logic.

## Checked

Each changed script parses. With the site served locally, these were loaded at 390 px and 1300 px: Areas; school pages for URNs 141741 and 107702; Birmingham (secondary, and with free school meals, change in a year and severe absence chosen); The North Tyneside Learning Trust; Bebington ward; Kent; Aldershot; Patterns; Start here. No console errors, no sideways scroll, six method tabs on Areas, Schools and group pages and five on Patterns, none empty. The visible text and every method panel of each page were read through. Further views were read the same way: Start here at steps 2 and 3 for a school, a local authority and England; a briefing on each of the three kinds of page; a trust with joining dates; a trust and a ward with change in a year; a county with a pupil group and change since 2018/19; a constituency with severe absence since 2018/19; a special school; a school with another added; and the two not-found messages.

Not checked: the Pages Function route, print output of a briefing, the saved PNG of each chart (headings feed its title and file name), 375 px and 1,900 px, and `scripts/check_attendance_ux.js` on port 8765.
