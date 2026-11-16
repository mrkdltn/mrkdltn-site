# mrkdltn.com

The source of [mrkdltn.com](https://mrkdltn.com): Mark Dalton's writing on English education, and the
[Ofsted Explorer](https://mrkdltn.com/explorer/), a free tool that sets any secondary school's Ofsted report
card beside its GCSE results, read against the national average, 50 statistically similar schools and a
contextual model.

The site is static. Cloudflare Pages builds and serves it from this repository: every push to `main` deploys.

## What is here

| Path | What |
| --- | --- |
| `site/` | The website as served (HTML, CSS, JavaScript, images) |
| `site/explorer/` | The Ofsted Explorer: `dash.js` (data loading and view state), `app.js` and `extra.js` (the page), `explorer.css` |
| `data/raw/` | The Explorer's inputs: `ks4_model_v3.csv` (3,298 secondaries: results, context, similar-schools model), `ofsted_rc.csv` (report cards, all phases), `fig3.csv` (Ofsted's published validation split), `reports_daily.csv` (report cards read since the last monthly release) |
| `scripts/build_data.py` | Builds the compact data the Explorer loads (`site/explorer/data/ks4.json`, `rc.json`, `nn/`, `build.json`). Runs on every Cloudflare build |
| `scripts/fetch_reports.py` | Reads newly published report cards from Ofsted's reports website |
| `scripts/test_loader.mjs` | Checks that the built data reproduces the inputs exactly |
| `.github/workflows/daily-report-cards.yml` | Runs the reader every morning and commits anything new |

## How current the data is

- **Report cards** come from Ofsted's monthly management information, which records each school's latest
  report card once it has been published. Between releases, a scheduled job reads report cards from
  [reports.ofsted.gov.uk](https://reports.ofsted.gov.uk) as they are published (the grade summary is plain
  text in each report's PDF). When the next monthly file arrives it replaces those daily reads: Ofsted's
  official file is the record.
- **Results** are DfE key stage 4 performance data, 2025/26 provisional (final data due February 2027), with
  2024/25 and 2023/24 final results for comparison.
- **Similar schools** are an open replica of the DfE and Ofsted similar-schools model for attainment, rebuilt
  from its published technical note using the closest public data. It is an approximation; the official
  groups use pupil-level data that is not public.

`site/explorer/data/build.json` records when the data was built, from which input files (with SHA-256
checksums) and the latest inspection it includes.

## Build locally

```
python3 scripts/build_data.py               # writes site/explorer/data/
npm install --no-save d3-dsv@3 && node scripts/test_loader.mjs
python3 -m http.server -d site 8000         # then open http://localhost:8000/explorer/
```

Reading new report cards needs `pip install pypdf`:

```
python3 scripts/fetch_reports.py --since 2026-11-01
```

## Sources

- Ofsted, [State-funded school inspections and outcomes: management information](https://www.gov.uk/government/statistical-data-sets/monthly-management-information-ofsteds-school-inspections-outcomes), and individual inspection reports from [reports.ofsted.gov.uk](https://reports.ofsted.gov.uk)
- DfE, [Key stage 4 performance](https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-4-performance), school census and SEN data
- DfE and Ofsted, [Similar schools model for attainment: technical note](https://www.gov.uk/government/publications/similar-schools-model-for-attainment/similar-schools-model-for-attainment-technical-note)
- DfE, [Get Information about Schools](https://get-information-schools.service.gov.uk/)

## Licensing

- **Code** (`scripts/`, `.github/`, and the JavaScript and CSS in `site/`): MIT licence, see [LICENSE](LICENSE).
  Reuse the method freely.
- **Writing, images and design artwork** on the site (articles, page text, photographs, illustrations,
  charts): © 2026 Mark Dalton, all rights reserved. Short quotations with attribution and a link are welcome.
- **Public data** in `data/raw/` and the Explorer's derived data contain public sector information licensed
  under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).
  D3 (`site/assets/d3.min.js`) is © Mike Bostock, ISC licence. Fonts in `site/assets/fonts/` are under the
  SIL Open Font Licence.

## Corrections

If something looks wrong, open an issue or message Mark on [LinkedIn](https://www.linkedin.com/in/mrkdltn).
The Explorer's written commentary is generated from the published figures by fixed rules: it is a reading of
the data, not a judgement on any school.
