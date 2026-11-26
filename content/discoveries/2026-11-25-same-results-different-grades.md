---
id: 2026-11-25-same-results-different-grades
date: "2026-11-25"
title: With similar results, achievement is graded below Expected more often in deprived areas
standfirst: Among secondaries whose results were close to or above their similar schools, 28% in the most deprived fifth were graded below Expected standard for achievement, against 9% in the least deprived.
status: draft
theme: achievement-and-context
figures:
  - label: Most deprived fifth, graded below Expected standard for achievement
    unit: "%"
    key: true
    compute: sr_most
    value: 28.36
    n: 134
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 26 November 2026 read from reports.ofsted.gov.uk; DfE, Key stage 4 performance 2024/25 (final), read against the open similar-schools replica"
    as_at: "2026-11-26"
  - label: Least deprived fifth, graded below Expected standard for achievement
    unit: "%"
    key: true
    compute: sr_least
    value: 8.79
    n: 91
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 26 November 2026 read from reports.ofsted.gov.uk; DfE, Key stage 4 performance 2024/25 (final), read against the open similar-schools replica"
    as_at: "2026-11-26"
  - label: Difference between the most and least deprived fifths
    unit: pp
    compute: sr_gap
    value: 19.57
    n: 225
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 26 November 2026 read from reports.ofsted.gov.uk; DfE, Key stage 4 performance 2024/25 (final), read against the open similar-schools replica"
    as_at: "2026-11-26"
  - label: Inspected secondaries with 2024/25 results close to or above their similar schools
    unit: schools
    compute: sr_matched_n
    value: 561
    n: 561
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 26 November 2026 read from reports.ofsted.gov.uk; DfE, Key stage 4 performance 2024/25 (final), read against the open similar-schools replica"
    as_at: "2026-11-26"
chart:
  form: line5
  compute: chart_sr
  title: Share graded below Expected standard for achievement, by IDACI fifth
  x: ["Least", "2", "3", "4", "Most"]
  xtitle: IDACI fifth of pupils (area deprivation)
  ymax: 50
  series:
    - name: Results close to or above similar schools
      main: true
      values: [8.7912, 9.2593, 21.4876, 22.4299, 28.3582]
      n: [91, 108, 121, 107, 134]
    - name: All inspected secondaries
      values: [10.8527, 25.1656, 33.3333, 40.4624, 47.3171]
      n: [129, 151, 183, 173, 205]
  source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 26 November 2026 read from reports.ofsted.gov.uk; DfE, Key stage 4 performance 2024/25 (final), read against the open similar-schools replica"
  as_at: "2026-11-26"
  data_version: 2026-11-26-c762f61b
explore: "/explorer/areas/#sec=results&by=idaci&focus=g_ach"
related: ["/explorer/areas/#results", "/explorer/#allphases"]
limitation: This is an association in the first year of report cards, among the schools Ofsted chose to inspect first, and it does not show that any grade is wrong.
article: /writing/ofsted-report-cards/
linkedin:
  - url: "https://www.linkedin.com/pulse/i-checked-every-ofsted-report-card-results-alone-dont-mark-dalton-bqjue/"
    date: "2026-11-16"
    kind: article
    title: "I checked every Ofsted report card. Results alone don't explain the gap."
todo: "Confirm the LinkedIn article's date (2026-11-16 is the site article's date). Publishing also needs a same-day LinkedIn post."
supersedes: null
superseded_by: null
rule: "gradient:g_ach:idaci:matched"
---

Ofsted's achievement grade is meant to read a school's results in context. This holds results roughly level. It keeps the 561 inspected secondaries whose 2024/25 GCSE results were close to or above those of their 50 similar schools, then groups them by Ofsted's own measure of how deprived pupils' home areas are.

If grades followed results alone, the share graded below Expected standard would be much the same in each fifth. It rises from 9% in the least deprived fifth to 28% in the most deprived, a difference of 20 percentage points. The dashed line, every inspected secondary whatever its results, rises more steeply.
