# Attendance Explorer: Mark's critique and the worklist

From Mark's review of the preview on 24 November 2026. Not ready to go live; work continues over the coming days. `CLAUDE.md` wins where the two differ. Tick items here as they are done.

| # | What Mark said | What it means | State |
| --- | --- | --- | --- |
| 1 | The header and hero do not match the Ofsted Explorer; it needs a menu bar that scrolls down with the reader | Full-width midnight hero with the search inside it; a section menu that stays at the top and marks the current section | Done 24 Nov |
| 2 | "The Pulse" makes no sense as a name; it is an area view | Renamed "Areas". Top navigation is now Areas, Schools, Trusts, Patterns | Done 24 Nov |
| 3 | Constituencies belong with geography; trusts are a separate thing | Trusts have their own entry. Local authorities, counties, constituencies and wards sit under Areas, with a row to move between them | Done 24 Nov |
| 4 | What does pinning do? It is not clear on the site | Renamed "Save to your places". Saved places show their latest figure and can be opened side by side | First pass 24 Nov; review with Mark |
| 5 | Comparisons appear in some spots and not others | Every school, trust and area page now has the same "Side by side" section: a table against England with up to four others added, which also join the year-by-year chart. School figures in it carry no green or rust | Done 25 Nov; the week-by-week Areas view still has none |
| 6 | Review how much colour is in the charts against the Ofsted Explorer; be consistent | Audit written up in `docs/attendance-colour-audit.md` (25 Nov). Fixed: England is slate everywhere; year-on-year dots take direction colours; free school meal groups use one navy ramp; added places are numbered slate lines, not extra hues; the local authority is slate on school pages | Fixes done 25 Nov; Mark agreed all three on 24 Nov: green and rust mean direction only, with every comparison mark in slate; school circles on area and trust pages are plain; an Ofsted grade is shown as a colour swatch with its name in ink. The Ofsted Explorer's own chips are unchanged |
| 7 | The distribution year by year overlaps badly | Replaced with a band chart by year: the middle school as a line, the middle half and middle eight in ten of schools as bands | Done 24 Nov |
| 8 | Region by region is cluttered | Replaced nine small charts with one ordered chart of the regions against England, with the change since 2018/19 beside it (a toggle on phones) | Done 24 Nov |
| 9 | How similar schools are matched: use the same approach to methodology and writing as before | Patterns now has one tabbed method section in the Ofsted Explorer's manner (what this shows, sources and dates, similar schools, small numbers, what is not here). The other three pages still have the older single method card | Done: Patterns 24 Nov; Areas, Schools and Trusts 25 Nov (their method paragraphs gathered under tabs) |
| 10 | Severe absence where appropriate, not only persistent | Severe absence (half or more of sessions missed) is a third measure on every area and trust page, in the side-by-side table, the maps, the change views and the pupil groups. Never for a single school, and not where fewer than 10 pupils are severely absent | Done 24 Nov for areas and trusts; a year-by-year chart by phase added to Patterns 25 Nov |
| 11 | Group-based data and splits should be obvious and intuitive | Local authority and county pages now have a "Pupils" control beside the others (all, free school meals, SEN support, EHC plan) that switches the map and the change views to that group. Not possible below local authority: the DfE does not publish it | Done 25 Nov |
| 12 | Pilot a guided way in: questions, a menu, a questionnaire flow, or a prompt | A guided flow that asks who you are and what you want to know, then assembles a short briefing. Rule-based first; a free-text prompt would need an AI service and is a separate decision | Pilot built 25 Nov: "Start here" (`/attendance/start/`) asks who you are, which place and what you want to know, then opens a briefing: the right page with only the sections that answer the question, a briefing header, and print or save as PDF. For Mark to try and react to |
| 13 | "The DfE squares for patterns data is important" | Mark confirmed (24 Nov): the coloured day-by-day calendar. Now on Patterns as well as Areas, for England by phase, this year and last | Done 24 Nov |

Mark also said: looking by area and by geography is really useful; Schools works quite well; the comparisons are interesting; Patterns is useful.

## Usability review, 24 November 2026

Mark asked for another review for simplicity, usefulness and intuitive operation. An independent review, working seven real tasks on a phone, is in `docs/attendance-ux-review.md`. What it found and what has been done:

| Finding | State |
| --- | --- |
| On a school page, choosing a school from search and adding a school to compare did nothing (a function named `history` hid the browser's own) | Fixed 24 Nov; now part of the checks |
| Controls meant to be hidden were showing (a "Pupils" row on ward, constituency and trust pages that did nothing) | Fixed 24 Nov |
| The first figure was 993 px down a phone screen on a local authority page | Now 460 to 530 px on every page: shorter hero on phones, a breadcrumb in place of the row of area kinds, and the summary above the controls, which are four compact menus in two columns |
| Controls changed things out of sight | The summary now states what is chosen ("Chosen above: ..."), and a one-line "Showing" strip under the section menu appears once the controls scroll away |
| A saved place or a tapped hexagon forgot the chosen phase, measure and view | Fixed: links carry them |
| Random examples were often near-empty pages | Fixed: drawn only from places with a pooled figure |
| A copied link from a random example opened a different place | Fixed: the address always names the place on screen |
| "Compare by" contained "Latest" | Now "Show": latest figures, change in a year, change since 2018/19 |
| "The schools" listed every phase when one was chosen | Lists the chosen phase, with a link to show all |
| "Severe" silently removed "School by school" | The section stays and says why no school is shown |
| Side-by-side tables were cut off on phones | Phones show the first three columns, with a note that more show on a wider screen |
| On the Trusts page, search put a local authority and a ward above the trust | The page's own kind now comes first |
| No way past the navigation for keyboard users | A "Skip to the figures" link |
| A briefing dropped only one section, so was barely shorter than the page | Part done: the briefing's buttons are one row and choosing a role moves straight on. The mapping in `start.js` still to tighten |
| The hexagon maps cannot be read by touch | Fixed: a tapped hexagon, ward or trust dot names itself beneath the chart with its figure and an Open button |
| Saved places appear only on Areas | To do. The empty "Your places" card no longer shows until something is saved |
| Summaries carried seven figures in one paragraph | Two sentences now; the tiles carry the rest |
| Pupil groups took four control changes to read | A table in "By pupil group" gives every group's overall, persistent and severe absence against England at once |
| "Copy link" under every chart | One in the header on wider screens; "Save image" stays per chart |
| Words that assume knowledge ("pooled", "none", "Area or trust") | Reworded |

## Writing pass and figures, 24 November 2026

A writing pass in Mark's voice covered every page; each substantive change is listed before and after in `docs/attendance-writing-pass.md` for Mark to review. It found that a summary and its table could differ by 0.1 because they rounded differently; one rounding rule now applies everywhere. An independent check of the figures against the DfE's own files is in `docs/attendance-figures-check.md` when complete.

### Figures check, 24 November 2026

An independent worker recomputed 5,787 displayed figures on 183 pages from the DfE's own files (`docs/attendance-figures-check.md`). The stored data agreed with the DfE to within 0.01 of a point throughout and the small-number rules all held. What it found on the pages, and what was done:

| Finding | State |
| --- | --- |
| "A year earlier" left out schools that had changed URN, so about one area or trust view in seven compared this year with fewer schools than last; 516 school pages had no year-earlier figure | Fixed: predecessors are followed for the two-term periods too |
| "Since 2018/19" for a local authority meant today's schools followed back on its own page, and every school open at the time on a school page | Fixed: an area is always the schools there at the time; only trusts follow today's schools back |
| About 5% of displayed rates were 0.1 too high because rates were rounded twice (England primary persistent absence showed 13.3% where the DfE's figure is 13.2%) | Fixed: stored rates now round to the right tenth |
| The Patterns regional sentence named the wrong regions where two tied at one decimal place | Fixed: decided on unrounded figures |
| The trust funnel's "95%" band held 87 to 89% of trusts, and "chance alone" overclaimed | Fixed: the band is set from the trusts themselves to hold 95%; the outer band is gone; the wording claims only that a trust is unusual for its size |
| The in-year "lower in 102 of 151" counted only differences visible at one decimal place | Fixed: counted on the stored figures |
| "July averaged" for secondary schools rested on one day | Fixed: a month is quoted only with ten or more days of figures |
| A group of 18 pupils showed 100% persistent absence | Fixed: a pupil group under 50 in which every pupil, or none, is persistently absent is left out |
| Changes were the difference of the figures as shown, so about a quarter were 0.1 from the true change | Decided by Mark, 24 Nov: true change. Rates are now stored to two further decimal places and every difference is taken before rounding; against the DfE's counts, 11 of 20,631 school year-on-year changes still fall on the other tenth (exact ties). Each method section explains why a difference can be 0.1 from subtracting the figures on screen |

### After the figures check

| Item | State |
| --- | --- |
| Pooled overall and unauthorised absence still landed on the wrong tenth in about 1.3% of views, and in-year figures to two decimal places were 0.01 low | Fixed in `2c179d4`: school rates and every pooled rate are computed from the DfE's counts; the in-year two-decimal figures use plain hundredths. A third, scoped pass by the independent checker is recorded in `docs/attendance-figures-check.md` |
| The Areas page was blank on the preview between `2c179d4` and `13e6f7c` | A one-line patch commented out the rest of its statement. Fixed, and `scripts/check_attendance.sh` is now the gate before every commit to `site/attendance/` |
| No way to report a wrong figure | A feedback form sits at the foot of every page except briefings and Start here. It posts to the Ofsted Explorer's `/api/feedback` with the page address attached, so no new cloud resource is needed. Not yet tried on Cloudflare; a What's new page for Attendance waits until it goes live |
| In-year "all schools" was the three phases summed, which differs from the DfE's own all-schools row in 10 of 163 areas | Fixed: the DfE's row is used. Third pass otherwise clean: every stored school and pooled rate shows the true tenth; no single-school counts in the built data; severe absence withheld correctly |
| A shared link to an area or trust page named no place | `functions/attendance/group/index.js` gives each its own title, description and address; tried under Cloudflare's local runner for an authority, a county, a trust and an unknown id. Not yet tried on the Cloudflare preview |
| In-year data refreshed by hand | `attendance-pulse.yml` fetches each fortnightly release, checks it (`check_attendance_pulse.py`) and commits. It does nothing until it is on `main`, which is Mark's call |
| Touch, keyboard and print not tried | Tried in Chromium only (no Firefox or Safari in the cloud session; Mark's phone is the Safari test). Printed pages showed one method tab only, because the rule that enforces `hidden` outranked the print rule: fixed. "Show all schools" and the feedback email field were under 44 px: fixed. Keyboard: every stop has a visible focus ring, the skip link comes first, and search works by keyboard alone. No chart reading leaves the screen on a phone |

### Fourth figures pass (at `1e1ccc7`) and enforcement, 24 November 2026

| Item | State |
| --- | --- |
| Every change and gap is the true difference rounded once | Confirmed by the independent checker: 1,780 of 1,780 on school, area and trust pages; 8,256 sampled rates all the true tenth; in-year all-schools figures match the DfE's row |
| A rate a hair under a half-tenth (6.44997%) was stored as 645.00 and shown 0.1 high: 381 of about 1.1 million figures | Fixed in `hund()`; not yet re-verified |
| Pupil-group changes and gaps are not yet true differences, and county pupil-group rates are pooled from rounded authority rates (9 of 268 and 2 of 402 in the sample) | Fixed: pupil-group rates, and schools' illness and unauthorised holiday rates, are now kept at the DfE's full precision (both files refetched 24 Nov). Not yet re-verified |
| In-year special-school figures in nine authorities are sums of daily rows, where the DfE withholds some days, so they differ from the DfE's own year-to-date figure (Barnsley 15.2% against 14.89%) | Fixed 25 Nov: the DfE's own year-to-date totals are fetched and used for the current year (Barnsley's special schools now 14.89%, as the DfE has it; eight figures moved, the ones the checker listed). Not re-verified independently |
| At four decimal places a small school's sessions possible and missed can be worked back from its rates | Noted. These are whole-school totals the DfE publishes openly, and no pupil count is newly exposed; the handover note's wording is corrected |
| Parental responsibility measures by area | Built, preview only: see `docs/attendance-enforcement-note.md`, with three decisions for Mark. Not yet independently checked |
| Enforcement figures, independent fifth pass | Counts all agree with the DfE. Seven faults found; six fixed (see the end of `docs/attendance-enforcement-note.md`). Open: whether the flag should carry one sentence saying the high-absence condition is as common where more notices are issued (9 of 38 against 32 of 113), which the checker recommends and Mark has yet to decide |
| Enforcement: flags and the pattern explorer | Dropped by Mark on 24 Nov. Replaced by the category (none, fewer than 10, fifths) each authority and region falls in for each measure. The open question about a sentence on the flag no longer arises. Not yet independently checked |

## Fresh review, 24 November 2026

Mark said the tool appears overly complex and asked for a fresh review of the whole of it. `docs/attendance-simplification-review.md` holds an independent reviewer's measurements and findings and a proposal for five pages, one search and one menu, with a named list of what to cut. No rebuilding until Mark has chosen a direction; the items above are on hold until then.

Mark accepted the direction on 24 Nov ("Ok go"). School page rebuilt as the example: 3.1 phone screens with "More detail" closed (was 7.7), four sections (was eight), no controls, the answer at about half a screen. Search now matches whole words and ranks schools properly ("st mary" finds St Mary's schools). Awaiting Mark's view before the trust page is started.

Mark rejected the cut-down school page on seeing it (24 Nov) and asked to roll back and refine and organise instead. Rolled back; the search fix is kept. Next: Mark to choose how the fuller content should be organised.

### Refining without cutting, 25 November 2026

| Item | State |
| --- | --- |
| Tabs on the local authority page | Built as the example: Overview, Pupils, Schools, Enforcement, Method. Longest tab on a phone is Enforcement at 8.8 screens; the page was 16.6 in one run. Awaiting Mark |
| Headings that state a finding | Built on the same page: summary, year by year, compared with other authorities, pupil groups, school by school and enforcement. Awaiting Mark |
| Summary that names every comparison; one line reconciling this year so far with last year's two terms; controls beside what they change; menus that open a list, not a random place; (i) notes in place of paragraphs | Not started |
| The same treatment for county, trust, constituency, ward, school, Areas and Patterns pages | Not started; waits for Mark's view of the example |
| Mark confirmed the example ("it is", 25 Nov) | Tabs and finding-headings carried to county, trust, constituency and ward pages and to the school page (Overview, Compare, Over time, Method). The school's summary heading now names England, the local authority and similar schools, so it can no longer point the opposite way to the section beneath. The measure choice on the school page sits beside each chart it changes |
| Areas (in-year) and Patterns pages; the two-clocks line; controls beside what they change on area and trust pages; menus that open a list; (i) notes; an independent check of the new headings | Not started |
| Areas and Patterns pages | Tabs on both (Areas: This year, Week by week, Reasons, Other areas, Method; Patterns: Disadvantage, Over time, Regions, Method). Finding-headings on Areas for reasons and for the comparison with last year; Patterns already had three |
| The two clocks | A line under a local authority's summary gives this school year so far for the same phase, says it is a different period, and links to the week-by-week view |
| Independent check of the new headings and the line | Done (sixth pass): 1,791 of 1,791 headings true, the clock line right on 68 authority and phase pairs, every section reachable, no errors. Three bugs fixed: a school page opened at a tab wrote `tab=method` into its address; the school-by-school heading went stale under severe absence; nine old section links opened the right tab but not the section. Rewordings made: summaries say "Overall absence"; the school's since-2018/19 heading no longer reads as if the school were the 88%; "No penalty notices…" where there are none; "points" added; the trust comparison's small label no longer claims an allowance for size. Fixes not re-verified independently |
| Controls beside what they change (area and trust pages) | Done within the tabs: no controls on Enforcement or Method, where they change nothing, and no pupil-group choice on Schools. The controls were not moved into individual sections, since phase and measure change several sections at once |
| (i) notes in place of the paragraph above each chart | Done on every page: 2 to 3 folded per tab; opens on a tap; printed open |
| Menus that open a list instead of a random place | Closed: Mark confirmed on 25 Nov that the landings stay as they are |

### Seventh independent pass and the unlisted release, 26 November 2026

| Item | State |
| --- | --- |
| Sixth-pass bugs and rewordings | Confirmed fixed at 390 and 1,300 px; 1,038 of 1,039 headings true (one constituency rank out by one on an exact tie) |
| "The same point last year" was this year's DfE total against last year's days added up | Fixed: last year is now the total the DfE published at the same week a year earlier (version 3.2 of the data set). England reads 0.2 points lower, not 0.1; lower in 128 of 151 authorities, not 114; Barnsley's special schools 3.3 lower, not 1.4 higher |
| Sections with nothing in them printed as empty headings | Fixed |
| Controls shown where they do nothing | Fixed for Show and Pupils on Schools tabs, Measure on a county's Schools tab and on Patterns, Over time. Left: the two single-school authorities |
| Notes a reader needs were folded away | Nine now stay open (the enforcement introduction and category strip, the regional table, three on Patterns, the school's position and side-by-side notes, the trust's two history lines) |
| In-year method text out of date | Rewritten |
| A home postcode found nothing | Now finds schools in the same postcode sector, then district |
| Tool menu under 44 px on phones | Fixed |
| Left as they are | An authority asked for a phase it lacks shows another without saying so; the site header's links are 40 px high (a live-site style, not the tool's) |
| Unlisted release | Prepared on the branch; see `CLAUDE.md`. Awaiting Mark's Go |
| Trusts | Withheld from the release by Mark's decision of 26 Nov: no pages, data, search entries, menu item or mentions. A school's page still names its trust and joining date |
| Unlisted release | Live on 26 Nov with Mark's Go, without trusts. Checked on the live site: pages, page functions, trust redirect, no links from the rest of the site, noindex, sitemap, feedback endpoint |
