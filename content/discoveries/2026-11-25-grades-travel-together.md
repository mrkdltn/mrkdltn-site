---
id: 2026-11-25-grades-travel-together
date: "2026-11-25"
title: When achievement is graded below Expected, other areas usually are too
standfirst: Of 276 secondaries graded below Expected standard for achievement, 78% had at least one other area below Expected; where achievement was Expected standard or better, 14% did.
status: draft
theme: achievement-and-context
figures:
  - label: Achievement below Expected, with at least one other area below Expected
    unit: "%"
    key: true
    compute: gt_low_other
    value: 77.54
    n: 276
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 23 November 2026 read from reports.ofsted.gov.uk"
    as_at: "2026-11-23"
  - label: Achievement Expected or better, with at least one other area below Expected
    unit: "%"
    key: true
    compute: gt_ok_other
    value: 14.0
    n: 550
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 23 November 2026 read from reports.ofsted.gov.uk"
    as_at: "2026-11-23"
  - label: Inspected secondaries graded below Expected standard for achievement
    unit: schools
    compute: gt_low_n
    value: 276
    n: 276
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 23 November 2026 read from reports.ofsted.gov.uk"
    as_at: "2026-11-23"
  - label: Achievement below Expected, also below Expected for curriculum and teaching
    unit: "%"
    compute: gt_low_ct
    value: 63.41
    n: 276
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 23 November 2026 read from reports.ofsted.gov.uk"
    as_at: "2026-11-23"
  - label: Achievement below Expected, also below Expected for attendance and behaviour
    unit: "%"
    compute: gt_low_ab
    value: 49.28
    n: 276
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 23 November 2026 read from reports.ofsted.gov.uk"
    as_at: "2026-11-23"
  - label: Achievement Expected or better, the highest share below Expected in any one other area
    unit: "%"
    compute: gt_ok_max
    value: 9.27
    n: 550
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 23 November 2026 read from reports.ofsted.gov.uk"
    as_at: "2026-11-23"
chart:
  form: pairs
  compute: chart_gt
  title: Share graded below Expected standard in each area, by the achievement grade
  legend:
    - ["#FF8341", "Achievement below Expected standard"]
    - ["#5CD168", "Achievement Expected standard or better"]
  rows:
    - label: Curriculum and teaching
      k: g_ct
      values: [63.41, 2.0]
      n: [276, 550]
    - label: Attendance and behaviour
      k: g_ab
      values: [49.28, 9.27]
      n: [276, 550]
    - label: Inclusion
      k: g_inc
      values: [33.33, 2.55]
      n: [276, 550]
    - label: Leadership and governance
      k: g_lg
      values: [41.3, 2.0]
      n: [276, 550]
    - label: Personal development and wellbeing
      k: g_pd
      values: [18.12, 1.27]
      n: [276, 550]
    - label: Post-16 provision
      k: g_p16
      values: [28.04, 5.06]
      n: [107, 336]
  source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 23 November 2026 read from reports.ofsted.gov.uk"
  as_at: "2026-11-23"
  data_version: 2026-11-25-b00450c5
explore: "/explorer/areas/#sec=together"
related: ["/explorer/areas/#together"]
limitation: Every area is graded by the same team on the same visit, so the grades are not independent measures of a school.
supersedes: null
superseded_by: null
---

A report card has no overall grade, so each area can, in principle, stand on its own. In the first year the grades move together. Of the 276 secondaries graded below Expected standard for achievement, 63% were also below Expected for curriculum and teaching and 49% for attendance and behaviour.

Where achievement was Expected standard or better, no other area was below Expected in more than 9% of schools.

The areas may share causes, or a weak achievement grade may shape the rest of the inspection. The data cannot tell these apart.
