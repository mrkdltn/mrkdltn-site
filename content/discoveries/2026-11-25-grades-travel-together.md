---
id: 2026-11-25-grades-travel-together
date: "2026-11-25"
title: When achievement is graded below Expected, other areas usually are too
standfirst: Of 280 secondaries graded below Expected standard for achievement, 78% had at least one other area below Expected; where achievement was Expected standard or better, 14% did.
status: draft
theme: achievement-and-context
figures:
  - label: Achievement below Expected, with at least one other area below Expected
    unit: "%"
    key: true
    compute: gt_low_other
    value: 77.86
    n: 280
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 26 November 2026 read from reports.ofsted.gov.uk"
    as_at: "2026-11-26"
  - label: Achievement Expected or better, with at least one other area below Expected
    unit: "%"
    key: true
    compute: gt_ok_other
    value: 13.73
    n: 561
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 26 November 2026 read from reports.ofsted.gov.uk"
    as_at: "2026-11-26"
  - label: Inspected secondaries graded below Expected standard for achievement
    unit: schools
    compute: gt_low_n
    value: 280
    n: 280
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 26 November 2026 read from reports.ofsted.gov.uk"
    as_at: "2026-11-26"
  - label: Achievement below Expected, also below Expected for curriculum and teaching
    unit: "%"
    compute: gt_low_ct
    value: 63.21
    n: 280
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 26 November 2026 read from reports.ofsted.gov.uk"
    as_at: "2026-11-26"
  - label: Achievement below Expected, also below Expected for attendance and behaviour
    unit: "%"
    compute: gt_low_ab
    value: 49.64
    n: 280
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 26 November 2026 read from reports.ofsted.gov.uk"
    as_at: "2026-11-26"
  - label: Achievement Expected or better, the highest share below Expected in any one other area
    unit: "%"
    compute: gt_ok_max
    value: 9.09
    n: 561
    source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 26 November 2026 read from reports.ofsted.gov.uk"
    as_at: "2026-11-26"
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
      values: [63.2143, 1.9608]
      n: [280, 561]
    - label: Attendance and behaviour
      k: g_ab
      values: [49.6429, 9.0909]
      n: [280, 561]
    - label: Inclusion
      k: g_inc
      values: [32.8571, 2.4955]
      n: [280, 561]
    - label: Leadership and governance
      k: g_lg
      values: [41.0714, 1.9608]
      n: [280, 561]
    - label: Personal development and wellbeing
      k: g_pd
      values: [17.8571, 1.2478]
      n: [280, 561]
    - label: Post-16 provision
      k: g_p16
      values: [27.9279, 4.9708]
      n: [111, 342]
  source: "Ofsted, State-funded school inspections and outcomes: management information (latest inspections as at 31 October 2026), with report cards published to 26 November 2026 read from reports.ofsted.gov.uk"
  as_at: "2026-11-26"
  data_version: 2026-11-26-c762f61b
explore: "/explorer/areas/#sec=together"
related: ["/explorer/areas/#together"]
limitation: Every area is graded by the same team on the same visit, so the grades are not independent measures of a school.
article: /writing/ofsted-report-cards/
linkedin:
  - url: "https://www.linkedin.com/pulse/i-checked-every-ofsted-report-card-results-alone-dont-mark-dalton-bqjue/"
    date: 2026-11-16
    kind: article
    title: "I checked every Ofsted report card. Results alone don't explain the gap."
todo: "Confirm the LinkedIn article's date (2026-11-16 is the site article's date). Publishing also needs a same-day LinkedIn post."
supersedes: null
superseded_by: null
---

A report card has no overall grade, so each area can, in principle, stand on its own. In the first year the grades move together. Of the 280 secondaries graded below Expected standard for achievement, 63% were also below Expected for curriculum and teaching and 50% for attendance and behaviour.

Where achievement was Expected standard or better, no other area was below Expected in more than 9% of schools.

The areas may share causes, or a weak achievement grade may shape the rest of the inspection. The data cannot tell these apart.
