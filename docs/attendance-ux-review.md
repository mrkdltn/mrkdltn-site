# Attendance Explorer: independent usability review

Reviewed 24 November 2026 on branch `claude/happy-franklin-3x5ny9` (commit `b9c491f`), served locally, by someone who did not build it. Every task was performed with Playwright at 390 x 844 first, then 1300 px. Screenshots are in `/tmp/claude-0/-home-user-mrkdltn-site/768d1dea-ac5a-51cb-b117-4dad12b98a37/scratchpad/ux-review/` (file names below). A "screen" is one 844 px phone screen.

## 1. Verdict

Not yet. It is useful: the readings are plain, the charts are honest, and Patterns is already good. It is not simple or intuitive on a phone, and two core jobs on the school page are broken. The biggest obstacle is that every page spends its first screen on navigation and controls. On the Birmingham page the first figure is 993 px down; in the Ofsted Explorer the finding starts at about 450 px. A visitor from LinkedIn sees a hero, five kind buttons, a search box, a section menu and up to four control rows before any number, and the controls then change things that are two to four screens below.

## 2. The seven tasks (phone)

1. **Governor, school compared and improving.** Via Start here: done, 6 taps plus typing, then a briefing of about 6 screens. Friction: choosing a role needs a separate "Continue" while choosing a place advances by itself; the briefing drops only one section, so it is barely shorter than the full page. Via `/attendance/school/` and search: **failed**. Picking "Chase High School" does nothing (finding 1).
2. **Councillor, ward.** Done, 2 taps plus typing; "Bebington, Wirral" is the first result. The ward's figure is 1.2 screens down and "The wards of Wirral" map about 4 screens down. Two dead controls sit above the answer (finding 3).
3. **Officer, free school meals, persistent and severe, Birmingham secondaries.** Done, but about 8 taps and 2.5 screens of scrolling each time: the answer is in "By pupil group", which shows one measure and either the level or the change, so four states are needed, and the controls do not travel with the reader.
4. **Trust leader.** Done, 2 taps plus typing, but on the Trusts page "north tyneside" lists the local authority first and a ward second; the trust is third. "School by school" is 2.9 screens down and "Among trusts, allowing for size" 4.3.
5. **Journalist, Patterns and a saved chart.** Done easily. About 9 screens; one tap on "Save image" gives a clean PNG with title, reading and source (`t5-saved-chart.png`).
6. **Head, two named schools and a link.** **Failed** on the school page: "Add a school" finds the school, then nothing is added and the address does not change (finding 1). The same control works on trust and area pages.
7. **Returning visitor.** Done: one tap to save, and "Your places" on Areas shows each with its figure, plus "Compare your 2 local authorities". They appear on no other page, and a saved Birmingham labelled "7.5% in its secondary schools" opens on Primary.

## 3. Findings, most serious first

### Broken

1. **School search and "Add a school" do nothing on the school page** (`t1b-2-school.png`, `t6-3-added2.png`). Console: `history.pushState is not a function`. `school.js` line 130 declares `function history(others)`, which hides the browser's `history` for lines 195 and 199. Opening from the random example, the address also stays `/attendance/school/`, so a copied link gives someone else a different school. Fix: rename the function (`drawHistory`) and its one call; then retest search, compare, Copy link and Back.
2. **A saved or tapped place forgets the phase.** "Your places" says "7.5% in its secondary schools" and opens Primary (`m-places-open.png`); tapping a hexagon from Birmingham secondary opens the next authority on Primary (`m-hex-tap.png`). Fix: store `phase` in the saved link and carry the current `phase`, `m` and `v` on hexagon and ward links.
3. **Hidden controls are showing.** `.ax-field{display:flex}` overrides the `hidden` attribute, so ward, constituency and trust pages show a "Pupils" row (All, Free school meals, SEN support, EHC plan) that does nothing, and ward pages show a "Schools" control with one button, or an empty line (`t2-ward-full-cols.png`, `d-thin-random-w-full.png`). That is 183 px of dead controls on a phone. Fix: add `.ax-field[hidden]{display:none}`.
4. **The random example is often an empty page.** Three of six random wards had "too few schools of one phase here for a pooled figure" (`d-thin-random-w-full.png`); a random local authority gave City of London, one school. Fix: draw random examples only from places with a pooled figure.

### Confusing

5. **Controls change nothing in view** (`t3-7-inayear.png`). With "Free school meals", "Change in a year" and "Severe" chosen, the summary directly beneath still reads all pupils, latest, overall. Fix: one line under the controls, "Showing: severe absence, pupils eligible for free school meals, change in a year: in By pupil group and the map", each a link to that section; and keep the control row with the section menu when scrolled.
6. **"Compare by"** offers "Latest", which is not a comparison. Fix: label it "Show" with "Latest figure / Change in a year / Change since 2018/19".
7. **The Trusts page carries the Areas row** ("This year, week by week", "Local authorities", "Counties", "Constituencies", "Wards") under a trust's name (`t4-3-trust.png`). Fix: hide `#ax-kinds` when `k=t`, and list trusts first in that page's search.
8. **Choosing Secondary still lists primaries.** "The schools" on Birmingham secondary opens with Abbey Catholic Primary School and "Show all 409 schools" (`t3-bham-full-cols.png`). Fix: filter the table to the chosen phase, with a "Show all phases" link.
9. **"Severe" silently removes a section.** "School by school" vanishes from the page and the menu. Fix: keep the card with one sentence, "Severe absence is not shown for single schools".
10. **Side-by-side tables are cut off on phones** with no cue: "Persistent in a yea" (`t6-3-added2.png`). Fix: on phones show two columns and a "Latest / In a year / Since 2018/19" toggle, or a fade on the right edge.
11. **Wording that assumes knowledge.** "pooled" appears in chart legends and readings before it is explained; "in a year" means the same two terms a year earlier; "none" labels the 2019/20 gap on the school chart; saved places are tagged "Area or trust". Fix: "all its schools together", "than a year earlier", "no figures 2019/20", and the real kind ("Local authority").
12. **The hexagon map cannot be read by touch.** Hover names a hexagon on desktop (`d-hex-hover.png`); on a phone a tap leaves the page for an unnamed authority. Fix: first tap shows the name and figure with an "Open" link.

### Could be simpler

13. **Summary paragraphs carry seven figures in one block** and repeat the tiles below. Fix: two sentences (the rate against England; the change in a year), tiles for the rest.
14. **Start here: uneven steps and a thin payoff.** Fix: advance on choosing a role; let "Is it improving?" alone give only Summary, Year by year and Since 2018/19; put the first reading above the "Print or save as PDF" block (`t1a-7-brief.png`).
15. **Keyboard: 28 tab stops before the first control** on an area page, and no skip link. Order and focus rings are otherwise sound. Fix: a "Skip to the figures" link as the first focusable element.

## 4. Remove or merge

- Shrink the hero to the Ofsted Explorer's size: name, one line, search. Move "Save to your places" and "Show me another" beside the name, as "Another" sits beside the Explorer's search.
- Take the five kind buttons out of every place page; a breadcrumb ("Areas · Wards · Wirral") does the job. Keep the row only on `/attendance/`.
- Merge "Side by side" into the summary as its table; that removes a section and a second set of the same figures.
- On Areas, show "Your places" only when something is saved; the empty card pushes England's figure off the first screen.
- Replace the four toggles for pupil groups with one small table on local authority pages: each group, persistent and severe, latest and change, against England. It answers task 3 without a tap.
- Drop the "Measure" control from Patterns charts it does not affect ("Overall absence only, whichever measure is chosen above").
- Cut "Copy link" under every chart; keep one per page and "Save image" per chart.

## 5. Keep as it is

- Claim titles and the brass-ruled reading under each chart, above all on Patterns.
- Search: forgiving, kind and school count shown, results in under a second.
- The saved chart image, with its title, reading and source.
- Honest small-number messages ("too few pupils to show") and "a position in a distribution, not a judgement".
- "Read three ways" on school pages and the ward map of a district.
- Controls that do not fill the Back history: Back returned to the previous page every time.
- No console errors and no sideways page scroll on any page at 390 px, apart from finding 1.

## Not tested

The Pages Function route `/attendance/school/<urn>/` (local server uses `?urn=`), real touch devices and screen readers, print output of a briefing, the 1,900 px width, and "new since your last visit".
