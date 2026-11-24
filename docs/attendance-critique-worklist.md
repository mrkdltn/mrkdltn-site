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
| The first figure was 993 px down a phone screen on a local authority page | Now 668 px: shorter hero on phones, controls as four compact menus in two columns. The Ofsted Explorer's is about 450 px; more to do |
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
| A briefing dropped only one section, so was barely shorter than the page | To do: tighten the mapping in `start.js` |
| The hexagon maps cannot be read by touch | To do |
| Saved places appear only on Areas | To do |
