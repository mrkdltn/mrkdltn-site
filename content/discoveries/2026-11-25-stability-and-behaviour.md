---
id: 2026-11-25-stability-and-behaviour
date: "2026-11-25"
title: Less stable intakes, more attendance and behaviour grades below Expected
standfirst: In the fifth of secondaries where the fewest pupils joined at the usual time, 32% were graded below Expected standard for attendance and behaviour; in the most stable fifth, 5%.
status: draft
theme: attendance-and-behaviour
figures:
  - label: Least stable fifth, graded below Expected for attendance and behaviour
    unit: "%"
    key: true
    compute: sb_least
    value: 32.29
    n: 192
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 23 November 2026 read from reports.ofsted.gov.uk; DfE, Key stage 4 performance 2025/26 (provisional, 28 October 2026)"
    as_at: "2026-11-23"
  - label: Most stable fifth, graded below Expected for attendance and behaviour
    unit: "%"
    key: true
    compute: sb_most
    value: 4.84
    n: 124
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 23 November 2026 read from reports.ofsted.gov.uk; DfE, Key stage 4 performance 2025/26 (provisional, 28 October 2026)"
    as_at: "2026-11-23"
  - label: Difference between the least and most stable fifths
    unit: pp
    compute: sb_gap
    value: 27.45
    n: 316
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 23 November 2026 read from reports.ofsted.gov.uk; DfE, Key stage 4 performance 2025/26 (provisional, 28 October 2026)"
    as_at: "2026-11-23"
  - label: Top of the least stable fifth (pupils who joined at the usual time)
    unit: "%"
    compute: sb_cut_low
    value: 94.1
    n: 3298
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 23 November 2026 read from reports.ofsted.gov.uk; DfE, Key stage 4 performance 2025/26 (provisional, 28 October 2026)"
    as_at: "2026-11-23"
  - label: Bottom of the most stable fifth (pupils who joined at the usual time)
    unit: "%"
    compute: sb_cut_high
    value: 98.5
    n: 3298
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 23 November 2026 read from reports.ofsted.gov.uk; DfE, Key stage 4 performance 2025/26 (provisional, 28 October 2026)"
    as_at: "2026-11-23"
chart:
  form: line5
  compute: chart_sb
  title: Share graded below Expected standard for attendance and behaviour, by pupil stability
  x: ["Least stable", "2", "3", "4", "Most stable"]
  xtitle: Fifths of all secondaries
  ymax: 40
  series:
    - name: Inspected secondaries
      main: true
      values: [32.29, 31.94, 19.87, 16.67, 4.84]
      n: [192, 191, 151, 168, 124]
  source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 23 November 2026 read from reports.ofsted.gov.uk; DfE, Key stage 4 performance 2025/26 (provisional, 28 October 2026)"
  as_at: "2026-11-23"
  data_version: 2026-11-25-b00450c5
explore: "/explorer/areas/#sec=context&focus=g_ab"
related: ["/explorer/areas/#context"]
limitation: Less stable intakes are also more often in deprived areas, and this chart does not separate the two.
supersedes: null
superseded_by: null
rule: gradient:g_ab:nonmob
---

The DfE records how many pupils in each GCSE year group joined their school at the usual time. Where 94.1% or fewer did, 32% of inspected secondaries were graded below Expected standard for attendance and behaviour. Where more than 98.5% did, 5% were, a difference of 27 percentage points.

The share is much the same in the two least stable fifths and falls from there. Pupil stability is one of the factors in the similar-schools model, so it is already part of the context the Explorer reads results against. The report card's grade for attendance and behaviour has no such adjustment, and this chart shows the pattern, not its cause.
