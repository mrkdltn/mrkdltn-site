---
id: 2026-11-25-same-results-different-grades
date: "2026-11-25"
title: With similar results, achievement is graded below Expected more often in deprived areas
standfirst: Among secondaries whose results were close to or above their similar schools, 29% in the most deprived fifth were graded below Expected standard for achievement, against 9% in the least deprived.
status: draft
theme: achievement-and-context
figures:
  - label: Most deprived fifth, graded below Expected standard for achievement
    unit: "%"
    key: true
    compute: sr_most
    value: 29.23
    n: 130
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 23 November 2026 read from reports.ofsted.gov.uk; DfE, Key stage 4 performance 2024/25 (final), read against the open similar-schools replica"
    as_at: "2026-11-23"
  - label: Least deprived fifth, graded below Expected standard for achievement
    unit: "%"
    key: true
    compute: sr_least
    value: 8.89
    n: 90
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 23 November 2026 read from reports.ofsted.gov.uk; DfE, Key stage 4 performance 2024/25 (final), read against the open similar-schools replica"
    as_at: "2026-11-23"
  - label: Difference between the most and least deprived fifths
    unit: pp
    compute: sr_gap
    value: 20.34
    n: 220
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 23 November 2026 read from reports.ofsted.gov.uk; DfE, Key stage 4 performance 2024/25 (final), read against the open similar-schools replica"
    as_at: "2026-11-23"
  - label: Inspected secondaries with 2024/25 results close to or above their similar schools
    unit: schools
    compute: sr_matched_n
    value: 550
    n: 550
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 23 November 2026 read from reports.ofsted.gov.uk; DfE, Key stage 4 performance 2024/25 (final), read against the open similar-schools replica"
    as_at: "2026-11-23"
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
      values: [8.89, 9.62, 21.49, 20.95, 29.23]
      n: [90, 104, 121, 105, 130]
    - name: All inspected secondaries
      values: [11.02, 25.34, 33.52, 39.77, 48.0]
      n: [127, 146, 182, 171, 200]
  source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 23 November 2026 read from reports.ofsted.gov.uk; DfE, Key stage 4 performance 2024/25 (final), read against the open similar-schools replica"
  as_at: "2026-11-23"
  data_version: 2026-11-25-b00450c5
explore: "/explorer/areas/#sec=results&by=idaci&focus=g_ach"
related: ["/explorer/areas/#results", "/explorer/#allphases"]
limitation: This is an association in the first year of report cards, among the schools Ofsted chose to inspect first, and it does not show that any grade is wrong.
supersedes: null
superseded_by: null
rule: gradient:g_ach:idaci:matched
---

Ofsted's achievement grade is meant to read a school's results in context. This holds results roughly level. It keeps the 550 inspected secondaries whose 2024/25 GCSE results were close to or above those of their 50 similar schools, then groups them by Ofsted's own measure of how deprived pupils' home areas are.

If grades followed results alone, the share graded below Expected standard would be much the same in each fifth. It rises from 9% in the least deprived fifth to 29% in the most deprived, a difference of 20 percentage points. The dashed line, every inspected secondary whatever its results, rises more steeply.
