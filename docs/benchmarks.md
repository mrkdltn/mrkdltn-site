# The quality bar: what the best data explorers do, and what the Ofsted Explorer should do next

Research brief, 22 November 2026. Written for whoever builds the Explorer (Claude Code included), at Mark's request: match or exceed the best data sites in the world on quality, structure, function and approach. Read with `CLAUDE.md`, whose rules always win over anything here.

## How to use this file

- Section 1 names the benchmark set and what each does best.
- Section 2 turns that into twelve standards, each with a test you can check before a preview goes to Mark.
- Section 3 is an honest audit of the Explorer today against those standards.
- Section 4 is the build order. Each item is a branch and a preview; nothing goes live without Mark's "Go".
- Section 5 lists what not to copy.
- Every claim about another site has a source and date at the end. Re-check a site before copying a specific behaviour: these products change.

## 1. The benchmark set

Chosen because each is either the best-regarded tool of its kind or the closest relative of the Explorer. Grouped by what they teach.

### School comparison, done fairly

| Site | Why it matters | What to take |
| --- | --- | --- |
| **My School** (ACARA, Australia) | The longest-running national "compare like with like" school site. Built its own index (ICSEA) so that schools are compared with schools serving statistically similar students, and shows the school beside both similar schools and all schools. Its 2011 version showed margins of error around estimates and student gain against starting point. Its 2019 change moved from comparing with an average of 60 similar schools to comparing against students with similar backgrounds. | Similar-schools comparison as the default lens, not an option. Show the margin of error. A plain index explainer. Learn from its evolution: the comparison group itself was refined in public. |
| **Schools Like Yours** (FFT Education Datalab, England) | Lets the user decide what "similar" means: weight the similarity factors, filter, at KS2 and KS4. Free, from England's best-known education data team. | A user-weighted similarity mode beside the replica (the replica stays the default and the record). |
| **Stanford Educational Opportunity Project** (edopportunity.org) | National, school- and district-level, research-grade. Each project has the same five doors: Explorer, About, Methods, FAQ, Get the Data. Users can generate charts, maps and downloadable PDF reports for individual schools and compare selected places. Adds "Discoveries" (short findings) and research papers. Dated updates on the home page. | The five-door structure. Exportable reports. A "Discoveries" layer that turns the tool into stories. Dated "latest update" lines. |
| **SchoolDash** (England) | Long-standing independent school data for England; dashboards for about 40,000 institutions; explicit about errors and about which tools are retired and must not be used. | Candour about data errors and about what is out of date. |
| **ProPublica Miseducation** (US) | A news app: look up 96,000 schools and 17,000 districts, compare with counterparts ("nearby", "higher/lower poverty"), a full methodology page, sources and notes on every page, a stated last-updated date, and scores withheld where groups are too small. | Comparison sets offered as plain-language buttons. Sources and notes on every page, not just in a method section. Suppression explained where it happens. |
| **DfE Find and compare schools** (GOV.UK) | The official record parents use; results, Ofsted reports, admissions and behaviour policies, data downloads. | Parity on basics (search by name, place, postcode; download). The Explorer's job is the analysis GOV.UK does not do. |

### General data explorers, the craft standard

| Site | Why it matters | What to take |
| --- | --- | --- |
| **Our World in Data Grapher** | A widely reused open data-visualisation tool; open source (MIT); 14,000+ interactive charts. Its October 2023 redesign: chart, map and table views on every visual; only the controls relevant to the current view; the source shown prominently on every visual with a "learn more about this data" overlay; download as SVG, PNG and CSV; embed code; social previews that show the exact chart state shared; full-screen; a feedback button and an open invitation to user-research calls. | Every chart has a table view and a download. Context-specific controls. Source on the visual. Share links whose preview image matches what was shared. Embeds. |
| **ONS Explore Local Statistics** | UK government's flagship place-comparison service (beta March 2024); won an Analysis in Government award for communication. Two journeys from the home page: by area or by indicator. Compares an area with statistically similar areas (published clustering method). All data downloadable as XLSX, CSV, CSVW or JSON-Stat. A published quality and methodology note. | The two journeys (school-first and measure-first). Statistical neighbours as a first-class comparison. Machine-readable downloads. A formal quality note. |
| **OHID Fingertips** (public health profiles) | England's long-running benchmarking tool. The spine chart shows, at a glance, how one area compares with others across many indicators: the range across all areas as a bar, a diamond for the comparator, significance colouring with confidence intervals. | A spine chart: one row per measure, England range, similar-schools marker, this school, coloured only where the difference is statistically clear. |
| **Opportunity Atlas** (Opportunity Insights and US Census Bureau) | The reference for small-area estimates handled honestly: areas under 20 children shown grey as insufficient data, warnings where margins of error are high, a "number of children" field so users can judge reliability, colour scaling that can switch from national to on-screen, user-uploaded overlays, stories and a tutorial. | Make reliability visible, not just suppressed. A guided tour. |
| **Explore Education Statistics** (DfE) | The source of most of the Explorer's data. Permalinks to an exact table view, which track whether the data has since been updated; featured tables that pre-load the tool; accessibility tested by the Digital Accessibility Centre; open data standards and a public API. | Permalinks that know when the data behind them changed. Featured views that pre-load a useful state. External accessibility testing. |
| **Urban Institute Education Data Portal** | One harmonised source for US school data, with a point-and-click Explorer, an API and R and Stata packages. | A documented, versioned data download and a simple API for researchers. |
| **Government Analysis Function guidance** | The UK government standard for charts, colour, tables and dashboards, with an accessible-charts checklist. | Use its checklist as the accessibility floor. |

## 2. Twelve standards, each with a test

1. **One question, answered first.** The page leads with what the data says about this school, in a sentence, before any chart. *Test:* above the fold on a 375 px phone, a reader sees the school, its report card and one plain sentence of finding.
2. **Fair comparison is the default.** Every result is shown beside national and beside similar schools, never alone. *Test:* no headline number appears without its comparator and the size of the gap.
3. **Uncertainty is visible.** Where a figure is uncertain, show a range; where it is too small, say so in place. *Test:* every gap has a likely range or an explicit "too small to read"; nothing for groups under 10.
4. **Every chart has three faces: picture, table, download.** *Test:* each figure has a "Table" toggle and a "Download" (PNG, SVG, CSV) with the source and date in the file.
5. **Source on the exhibit.** Each chart carries its source line and data date on the chart itself, with a "about this data" link to the method. *Test:* screenshot any chart on its own; the source and date are in the image.
6. **Two journeys.** School-first (search a school) and measure-first (pick a measure, see every school, then drill in). *Test:* from the home of the Explorer, both are one tap away.
7. **Shareable state.** Every view has a stable link; the share image matches the view; links say if the data has changed since. *Test:* share a link to a filtered view; open it in a clean browser; the view and the preview image match.
8. **Controls only where they matter.** Each panel shows only its own controls; defaults are sensible; nothing needs a manual. *Test:* no panel shows a control that does nothing in its current state.
9. **Method in the open, in layers.** One sentence on the page, a tip for detail, the method section for the full account, versioned data and code for the rest. *Test:* every number can be traced to a source file and a method paragraph in three clicks.
10. **Accessible by design.** WCAG 2.2 AA, keyboard and screen reader, colour never the only signal, text alternatives for charts. *Test:* the Analysis Function accessible-charts checklist passes; axe reports no serious issues; a keyboard-only walk-through completes.
11. **Fast on a phone.** *Test:* on a mid-range phone over 4G, a school page shows its first finding in under 2.5 seconds (LCP), with no layout shift after load (CLS under 0.1); total transfer for a first school view under 1 MB.
12. **Honest about what it is.** Last updated, what changed, known errors, how to report one, what not to use it for. *Test:* the What's new page, the feedback route and a "not a judgement on the school" line are reachable from every school page.

## 3. Where the Explorer stands (22 November 2026)

**Already at or above the bar**
- Fair comparison by default: national, 50 similar schools (open replica of the DfE and Ofsted model), contextual model, Progress 8; four readings side by side (standard 2).
- Method in the open: tabbed method section, replica checks, model coefficients published in `model.json`, citation, What's new page, feedback form (standards 9 and 12).
- A page and share image per school; stable school URLs (part of 7).
- Reliability rules: no figures under 10 pupils; the "in line" band scales with cohort size (part of 3).
- Report card colours unaltered, readings on their own palette (part of 10).

**Gaps, largest first**
1. **No data download.** Only a PDF profile and PNG slides. No CSV of a school, its 50, a chart, or the full dataset (standards 4, 9). Every benchmark offers this.
2. **Uncertainty is implied, not drawn.** No ranges around gaps (standard 3). This is roadmap batch 6.
3. **No table view or per-chart download** for the strip, the profile, the national scatter or the method figures (standard 4).
4. **Sources sit in the method section, not on each exhibit** (standard 5).
5. **One journey only.** School-first is strong; measure-first exists only as the national scatter inside a collapsed section (standard 6).
6. **Share previews are per school, not per view;** links do not say when the data behind them changed (standard 7).
7. **No published speed or accessibility audit.** The page loads about 1.3 MB of school data on first view (standards 10, 11).
8. **No user-weighted similarity** (Schools Like Yours) and **no side-by-side comparison of two or three schools** (roadmap batch 7).
9. **No spine chart:** "How alike are they?" is close, but there is no single at-a-glance summary of every measure against England and the 50 (Fingertips).
10. **No "Get the data" page or API:** versioned CSVs, a data dictionary and a licence for researchers and journalists.

## 4. Build order

Each item is its own branch and preview. Respect every rule in `CLAUDE.md`; nothing here overrides them.

### Now (closes the biggest gaps against every benchmark)
1. **Get the data.** A `/explorer/data/` page: versioned CSVs (schools and results, report cards, similar-schools lists, model coefficients), a data dictionary, sources with dates, licence (Open Government Licence for the inputs; state the licence for derived data), build checksum from `build.json`. A "Download CSV" for the selected school and its 50. *Done when* a researcher can rebuild any number on a school page from the downloads.
2. **Every chart: table, download, source line.** A shared helper so each figure has Chart / Table toggles and Download (PNG, SVG, CSV), with the source and data date drawn inside the exported image. *Done when* standards 4 and 5 pass for every figure.
3. **Uncertainty drawn.** Likely ranges on the four readings and the strip (batch 6), the cohort size beside every school figure, and plain "too small to read" text where suppressed. *Done when* standard 3 passes.
4. **Speed and accessibility baseline.** Measure LCP, CLS and transfer on a school page (phone profile); split the data so a school view loads only what it needs; run axe and a keyboard walk-through; fix serious issues; publish an accessibility statement. *Done when* standards 10 and 11 pass and the numbers are recorded in the changelog.

### Next
5. **Spine chart summary** at the top of the profile: one row per measure, England range bar, similar-schools tick, this school's diamond, colour only where the difference is statistically clear, with a table view.
6. **Measure-first journey:** "Explore a measure" from the Explorer home: choose a measure, see every school (sortable table and scatter), filter by region, phase and context fifth, click through to a school.
7. **Per-view sharing:** share links carry the view state and get a matching preview image; links show a notice if the data has been rebuilt since they were made.
8. **Compare two or three schools** side by side (batch 7), with the same comparators and caveats.

### Later
9. **Your own similar schools** (after Schools Like Yours): adjust the factor weights within limits, see the group change, with the replica always shown as the reference. Never presented as official.
10. **Guided tour and "Discoveries":** a three-step first-visit tour; short dated findings that open the Explorer in a pre-set view (as Stanford and OWID do).
11. **Embed:** an embeddable school card and chart (iframe) with source and link back, for trusts, governors and journalists.
12. **Public API:** read-only JSON per school and per measure, versioned, documented on the Get the data page.
13. **User research:** five short sessions (a head, a governor, a parent, a journalist, a researcher), the findings logged, and the build order revisited.

## 5. What not to copy

- **Single ratings or rankings of schools** (star scores, league positions). The Explorer reads data; it does not judge schools. Sorting within a table is fine; a ranking headline is not.
- **Gated access or terms walls** before data can be seen.
- **Map-first layouts** for school comparison: maps are a supporting view here, not the entry point.
- **Unexplained composite indices.** Any index the Explorer shows must be published with its inputs and weights.
- **Generated imagery anywhere in the Explorer,** and motion that loops (see `CLAUDE.md`).
- **Ethnicity in matching or expected scores** (see `CLAUDE.md`).

## Sources (accessed 22 November 2026)

- Our World in Data, Redesigning our interactive data visualizations (18 October 2023): https://ourworldindata.org/redesigning-our-interactive-data-visualizations
- Our World in Data, coverage (14,000+ interactive charts): https://ourworldindata.org/about/coverage
- OWID Grapher source (MIT licence): https://github.com/owid/owid-grapher
- ONS, Explore local statistics: https://www.ons.gov.uk/explore-local-statistics/ ; quality and methodology information: https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/healthandwellbeing/methodologies/explorelocalstatisticsserviceqmi ; ONS blog, 26 March 2024: https://blog.ons.gov.uk/2024/03/26/local-data-at-your-fingertips/ ; Analysis Function case study (award): https://analysisfunction.civilservice.gov.uk/case-studies/case-study-launching-explore-local-statistics-service-ons
- OHID Fingertips spine chart, child health profiles 2023 indicator guide: https://www.gov.uk/government/statistics/2023-child-health-profiles/local-authority-child-health-profile-reports-2023-indicator-guide ; UKHSA blog on spine charts (3 July 2018): https://ukhsa.blog.gov.uk/2018/07/03/local-authority-health-profiles-2018-update-how-to-interpret-the-report-for-your-area/
- Opportunity Atlas FAQ: https://opportunityinsights.org/?p=1505
- Stanford Educational Opportunity Project: https://edopportunity.org/ ; Stanford GSE on the Explorer's charts, maps and PDF reports: https://ed.stanford.edu/node/13013
- ACARA My School, ICSEA guide: https://myschool.edu.au/media/1067/guide_to_understanding_icsea_values.pdf ; New features of My School 2011: https://liverpool-h65.schools.nsw.gov.au/content/dam/doe/sws/schools/l/liverpool-h/localcontent/1318053325673_19eb9eec2dddd2dd012e6a8f9c086053.pdf ; 2019 technical report (reference only, link currently returns not found): https://www.myschool.edu.au/media/1836/techncial-report-2019-approach-to-reporting-on-my-school.pdf
- FFT Education Datalab, Schools Like Yours: https://schoolslikeyours.ffteducationdatalab.org.uk/resource/about.php ; FFT on weighting factors: https://fft.org.uk/?p=263
- SchoolDash, About: https://www.schooldash.com/about.html
- ProPublica Miseducation: https://projects.propublica.org/miseducation/ ; methodology: https://projects.propublica.org/miseducation/methodology
- DfE, Find and compare schools and colleges in England: https://www.gov.uk/find-compare-schools-colleges
- DfE design histories, the EES table tool (permalinks, featured tables, accessibility testing): https://design-histories.education.gov.uk/explore-education-statistics/table-tool
- Urban Institute Education Data Portal (Brookings): https://www.brookings.edu/articles/the-education-data-portal-making-federal-data-accessible-to-study-small-student-populations/
- Government Analysis Function, Accessible charts: a checklist of the basics (2 May 2023): https://analysisfunction.civilservice.gov.uk/policy-store/charts-a-checklist ; Data visualisation: charts: https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-charts
