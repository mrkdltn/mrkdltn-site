---
id: 2026-11-25-context-held-constant
date: "2026-11-25"
title: With context held constant, a deprivation gap in secondary achievement grades remains
standfirst: Among inspected secondaries, those in the most deprived fifth were 16.9 points more likely than those in the least deprived to be graded below Expected for achievement, with results, prior attainment and other context held constant.
status: draft
theme: achievement-and-context
figures:
  - label: Gap with deprivation alone, most vs least deprived fifth, below Expected for achievement
    unit: pp
    key: true
    compute: gc_ach_raw
    value: 37.9
    n: 756
    source: "Ofsted, State-funded school inspections and outcomes: management information, latest inspections as at 31 October 2026; DfE, Special educational needs in England: school level data, January 2026; DfE, Key stage 4 performance 2024/25 (final), read against the open similar-schools replica; DfE, Get Information about Schools, extract of 25 November 2026; analysis as pre-registered in docs/analysis-plans/grades-context-plan.md (commit 801f11b, 25 November 2026)"
    as_at: "2026-10-31"
  - label: Gap with results, prior attainment and other context held constant
    unit: pp
    key: true
    compute: gc_ach_controlled
    value: 16.9
    n: 724
    source: "Ofsted, State-funded school inspections and outcomes: management information, latest inspections as at 31 October 2026; DfE, Special educational needs in England: school level data, January 2026; DfE, Key stage 4 performance 2024/25 (final), read against the open similar-schools replica; DfE, Get Information about Schools, extract of 25 November 2026; analysis as pre-registered in docs/analysis-plans/grades-context-plan.md (commit 801f11b, 25 November 2026)"
    as_at: "2026-10-31"
  - label: Lower end of the 95% confidence interval for the controlled gap
    unit: pp
    compute: gc_ach_controlled_lo
    value: 6.0
    n: 724
    source: "Ofsted, State-funded school inspections and outcomes: management information, latest inspections as at 31 October 2026; DfE, Special educational needs in England: school level data, January 2026; DfE, Key stage 4 performance 2024/25 (final), read against the open similar-schools replica; DfE, Get Information about Schools, extract of 25 November 2026; analysis as pre-registered in docs/analysis-plans/grades-context-plan.md (commit 801f11b, 25 November 2026)"
    as_at: "2026-10-31"
  - label: Upper end of the 95% confidence interval for the controlled gap
    unit: pp
    compute: gc_ach_controlled_hi
    value: 27.8
    n: 724
    source: "Ofsted, State-funded school inspections and outcomes: management information, latest inspections as at 31 October 2026; DfE, Special educational needs in England: school level data, January 2026; DfE, Key stage 4 performance 2024/25 (final), read against the open similar-schools replica; DfE, Get Information about Schools, extract of 25 November 2026; analysis as pre-registered in docs/analysis-plans/grades-context-plan.md (commit 801f11b, 25 November 2026)"
    as_at: "2026-10-31"
  - label: Holm-adjusted p-value for the controlled gap
    unit: p
    compute: gc_ach_holm
    value: 0.0235
    n: 724
    source: "Ofsted, State-funded school inspections and outcomes: management information, latest inspections as at 31 October 2026; DfE, Special educational needs in England: school level data, January 2026; DfE, Key stage 4 performance 2024/25 (final), read against the open similar-schools replica; DfE, Get Information about Schools, extract of 25 November 2026; analysis as pre-registered in docs/analysis-plans/grades-context-plan.md (commit 801f11b, 25 November 2026)"
    as_at: "2026-10-31"
  - label: Estimates in the pre-registered family, corrected together
    unit: estimates
    compute: gc_family
    value: 14
    n: 14
    source: "Ofsted, State-funded school inspections and outcomes: management information, latest inspections as at 31 October 2026; DfE, Special educational needs in England: school level data, January 2026; DfE, Key stage 4 performance 2024/25 (final), read against the open similar-schools replica; DfE, Get Information about Schools, extract of 25 November 2026; analysis as pre-registered in docs/analysis-plans/grades-context-plan.md (commit 801f11b, 25 November 2026)"
    as_at: "2026-10-31"
chart:
  form: whisker
  compute: chart_gc_secondary
  title: Gap in the chance of a below Expected grade, most vs least deprived IDACI fifth, secondary schools
  rows:
    - label: Inclusion
      k: g_inc
      raw: [10.2, 4.0, 16.4]
      controlled: [4.2, -3.0, 11.3]
      n_raw: 756
      n: 724
      reading: Too few schools below Expected to read
      low: true
    - label: Curriculum and teaching
      k: g_ct
      raw: [21.7, 13.3, 30.1]
      controlled: [7.4, -2.4, 17.2]
      n_raw: 756
      n: 724
      reading: Too uncertain to call
      low: false
    - label: Achievement
      k: g_ach
      raw: [37.9, 29.3, 46.6]
      controlled: [16.9, 6.0, 27.8]
      n_raw: 756
      n: 724
      reading: Clear
      low: false
    - label: Attendance and behaviour
      k: g_ab
      raw: [17.4, 8.9, 25.9]
      controlled: [4.0, -5.4, 13.4]
      n_raw: 756
      n: 724
      reading: Too uncertain to call
      low: false
    - label: Personal development and wellbeing
      k: g_pd
      raw: [3.5, -2.1, 9.1]
      controlled: [-2.1, -9.8, 5.7]
      n_raw: 756
      n: 724
      reading: Too few schools below Expected to read
      low: true
    - label: Leadership and governance
      k: g_lg
      raw: [10.4, 3.4, 17.3]
      controlled: [0.9, -7.8, 9.5]
      n_raw: 756
      n: 724
      reading: Too uncertain to call
      low: false
    - label: Post-16 provision
      k: g_p16
      raw: [1.5, -7.1, 10.1]
      controlled: [-2.6, -11.7, 6.5]
      n_raw: 386
      n: 384
      reading: Too few schools below Expected to read
      low: true
  threshold: 5.0
  source: "Ofsted, State-funded school inspections and outcomes: management information, latest inspections as at 31 October 2026; DfE, Special educational needs in England: school level data, January 2026; DfE, Key stage 4 performance 2024/25 (final), read against the open similar-schools replica; DfE, Get Information about Schools, extract of 25 November 2026; analysis as pre-registered in docs/analysis-plans/grades-context-plan.md (commit 801f11b, 25 November 2026)"
  as_at: "2026-10-31"
  data_version: 2026-11-26-c762f61b
explore: "/explorer/areas/#sec=held&phase=secondary"
related: ["/explorer/areas/#held"]
limitation: These are associations in a first set of inspections that is not a random sample, they cannot allow for what no public data records, and the results gap comes from an open replica.
card_source: Ofsted management information, latest inspections as at 31 October 2026; DfE SEN school level data, January 2026; DfE GCSE results 2024/25 via the open similar-schools replica. Pre-registered analysis
article: /writing/ofsted-report-cards/
linkedin: []
todo: Add the LinkedIn post for /writing/ofsted-report-cards/ under linkedin (url, date, kind, title) once its URL is known; do not guess it.
supersedes: null
superseded_by: null
---

Among 756 inspected secondaries, those in the most deprived IDACI fifth were 37.9 percentage points more likely than those in the least deprived to be graded below Expected standard for achievement.

A plan committed before any results were seen then held constant 2024/25 results against 50 similar schools, prior attainment, special educational needs, pupil stability, size, region, urban or rural setting and governance. For the 724 secondaries with all of these, the gap narrows to 16.9 points (95% confidence interval 6.0 to 27.8). It survives a correction for testing 14 estimates together.

For the other secondary areas, the gap with context held constant is too uncertain to call.
