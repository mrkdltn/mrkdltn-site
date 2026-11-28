# How consistent is inspection? Results

Pre-registered plan: `docs/analysis-plans/inspection-consistency-plan.md` (commit 196d50c, approved 26 November 2026, by Mark in the live conversation).
Run: 2026-11-28T08:51:15 (real). National aggregate figures only: no inspector is named, ranked or profiled, and no inspector-level number is held in this file.

Corpus at the cut-off 2026-11-28: 4293 of 4295 target report cards (100.0%).

Primaries and secondaries: 4013 report cards led by 386 lead inspectors (report cards per inspector: minimum 1, median 9, maximum 29; 269 inspectors led 5 or more, 182 led 10 or more).

## Main model, by area

| Area | Schools (below Expected) | Reading against chance | Permutation percentile | Inspector SD | Median odds ratio | MOR band | Typical school, 25th to 75th percentile inspector | Spread (pp) | Latent ICC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Achievement | 3975 (1125) | distinguishable from chance | 99.5 | 0.32 (95% CrI 0.132 to 0.462) | 1.357 (95% CrI 1.134 to 1.554) | uncertain between little and substantial | 18.4% to 25.6% | 7.3 (95% CrI 3.0 to 11.2) | 0.03 (95% CrI 0.005 to 0.061) |
| Curriculum and teaching | 3975 (815) | distinguishable from chance | 100.0 | 0.445 (95% CrI 0.278 to 0.608) | 1.529 (95% CrI 1.303 to 1.786) | uncertain between modest and substantial | 13.0% to 21.5% | 8.3 (95% CrI 5.0 to 12.4) | 0.057 (95% CrI 0.023 to 0.101) |
| Attendance and behaviour | 3975 (616) | distinguishable from chance | 100.0 | 0.49 (95% CrI 0.301 to 0.659) | 1.596 (95% CrI 1.333 to 1.875) | uncertain between modest and substantial | 5.6% to 10.2% | 4.6 (95% CrI 2.6 to 7.5) | 0.068 (95% CrI 0.027 to 0.117) |
| Leadership and governance | 3975 (543) | distinguishable from chance | 100.0 | 0.594 (95% CrI 0.427 to 0.769) | 1.762 (95% CrI 1.503 to 2.083) | substantial | 7.3% to 14.9% | 7.5 (95% CrI 4.7 to 11.6) | 0.097 (95% CrI 0.053 to 0.152) |
| Inclusion | 3975 (384) | distinguishable from chance | 100.0 | 0.621 (95% CrI 0.414 to 0.827) | 1.808 (95% CrI 1.484 to 2.201) | uncertain between modest and substantial | 4.7% to 10.2% | 5.4 (95% CrI 3.0 to 9.5) | 0.105 (95% CrI 0.049 to 0.172) |
| Personal development and wellbeing | 3975 (170) | not fitted: events rule (fewer than 10 schools below Expected per fixed-effect parameter) | | | | | | | |
| Early years | 2953 (294) | not fitted: events rule (fewer than 10 schools below Expected per fixed-effect parameter) | | | | | | | |
| Post-16 provision | 450 (46) | not fitted: events rule (fewer than 10 schools below Expected per fixed-effect parameter) | | | | | | | |

Convergence: R-hat below 1.01 and effective sample size above 400 required for every parameter kept. A fit that misses is refitted with twice the draws (target_accept 0.95), then if needed with four times the draws; one that still misses is reported as not converged.

- Achievement: R-hat max 1.004, ESS min 1739, divergences 0, refits 1, converged True.
  Permutation (200 shuffles within region x month x phase): observed ML SD 0.295, shuffled median 0.0 (2.5th to 97.5th percentile 0.0 to 0.2; 95th percentile 0.168); observed at the 99.5th percentile: distinguishable from chance.
- Curriculum and teaching: R-hat max 1.006, ESS min 457, divergences 0, refits 0, converged True.
  Permutation (200 shuffles within region x month x phase): observed ML SD 0.412, shuffled median 0.0 (2.5th to 97.5th percentile 0.0 to 0.223; 95th percentile 0.2); observed at the 100.0th percentile: distinguishable from chance.
- Attendance and behaviour: R-hat max 1.009, ESS min 607, divergences 0, refits 0, converged True.
  Permutation (200 shuffles within region x month x phase): observed ML SD 0.449, shuffled median 0.0 (2.5th to 97.5th percentile 0.0 to 0.306; 95th percentile 0.289); observed at the 100.0th percentile: distinguishable from chance.
- Leadership and governance: R-hat max 1.005, ESS min 614, divergences 0, refits 0, converged True.
  Permutation (200 shuffles within region x month x phase): observed ML SD 0.549, shuffled median 0.0 (2.5th to 97.5th percentile 0.0 to 0.313; 95th percentile 0.286); observed at the 100.0th percentile: distinguishable from chance.

## Sensitivity runs

| Area | Run | Status | Inspector SD | Median odds ratio | Reading |
| --- | --- | --- | --- | --- | --- |
| Achievement | As main; codes with fewer than 10 report cards pooled | fitted, refits 1 | 0.344 (95% CrI 0.159 to 0.497) | 1.389 (95% CrI 1.163 to 1.606) | uncertain between little and substantial |
| Achievement | As main; every code its own inspector, no pooling | fitted, refits 0 | 0.331 (95% CrI 0.154 to 0.472) | 1.372 (95% CrI 1.159 to 1.568) | uncertain between little and substantial |
| Achievement | As main, with region x school term terms in place of region and month | fitted, refits 1 | 0.319 (95% CrI 0.116 to 0.459) | 1.356 (95% CrI 1.117 to 1.55) | uncertain between little and substantial |
| Achievement | Secondaries only, with the full results controls | not fitted: events rule (fewer than 10 schools below Expected per fixed-effect parameter) | | | |
| Curriculum and teaching | As main; codes with fewer than 10 report cards pooled | fitted, refits 0 | 0.451 (95% CrI 0.283 to 0.617) | 1.537 (95% CrI 1.31 to 1.801) | uncertain between modest and substantial |
| Curriculum and teaching | As main; every code its own inspector, no pooling | fitted, refits 0 | 0.464 (95% CrI 0.309 to 0.614) | 1.557 (95% CrI 1.343 to 1.796) | uncertain between modest and substantial |
| Curriculum and teaching | As main, with region x school term terms in place of region and month | fitted, refits 1 | 0.455 (95% CrI 0.295 to 0.608) | 1.543 (95% CrI 1.325 to 1.785) | uncertain between modest and substantial |
| Curriculum and teaching | Secondaries only, with the full results controls | not fitted: events rule (fewer than 10 schools below Expected per fixed-effect parameter) | | | |
| Attendance and behaviour | As main; codes with fewer than 10 report cards pooled | fitted, refits 0 | 0.506 (95% CrI 0.321 to 0.693) | 1.621 (95% CrI 1.358 to 1.937) | uncertain between modest and substantial |
| Attendance and behaviour | As main; every code its own inspector, no pooling | fitted, refits 0 | 0.506 (95% CrI 0.335 to 0.674) | 1.62 (95% CrI 1.376 to 1.902) | uncertain between modest and substantial |
| Attendance and behaviour | As main, with region x school term terms in place of region and month | fitted, refits 1 | 0.477 (95% CrI 0.292 to 0.652) | 1.577 (95% CrI 1.322 to 1.863) | uncertain between modest and substantial |
| Attendance and behaviour | Secondaries only, with the full results controls | not fitted: events rule (fewer than 10 schools below Expected per fixed-effect parameter) | | | |
| Leadership and governance | As main; codes with fewer than 10 report cards pooled | fitted, refits 0 | 0.617 (95% CrI 0.44 to 0.807) | 1.802 (95% CrI 1.521 to 2.159) | substantial |
| Leadership and governance | As main; every code its own inspector, no pooling | fitted, refits 1 | 0.597 (95% CrI 0.43 to 0.766) | 1.767 (95% CrI 1.508 to 2.075) | substantial |
| Leadership and governance | As main, with region x school term terms in place of region and month | fitted, refits 1 | 0.588 (95% CrI 0.415 to 0.761) | 1.752 (95% CrI 1.486 to 2.066) | uncertain between modest and substantial |
| Leadership and governance | Secondaries only, with the full results controls | not fitted: events rule (fewer than 10 schools below Expected per fixed-effect parameter) | | | |

## Described only: special, alternative provision and nursery

- Special: 160 report cards.
- Alternative provision: 44 report cards.
- Nursery: 60 report cards.

MOR reading, set before the analysis: below 1.2 little association with the lead inspector; 1.2 to 1.5 modest; above 1.5 substantial. A band is stated only where the whole 95% interval falls within one band.

Reading against chance (Amendment 1, 26 November 2026): an inspector effect is reported as distinguishable from chance only where the observed maximum-likelihood inspector SD is above the 95th percentile of its 200 shuffled values; otherwise the reading for that area is "not distinguishable from chance", whatever the MOR band. The MOR, its interval and its band are reported in full in every case.
