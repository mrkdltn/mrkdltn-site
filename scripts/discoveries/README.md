# Discoveries

Short, dated findings at `/explorer/discoveries/`: one claim, one chart, figures frozen as published, and an "Explore
this" link that opens the Explorer on the view behind the chart.

| File | What |
| --- | --- |
| `content/discoveries/YYYY-MM-DD-slug.md` | One discovery: front matter, then up to 150 words of body |
| `figures.py` | The compute functions every figure and chart names; `python3 scripts/discoveries/figures.py` prints them all |
| `freeze.py` | Fills a candidate's or draft's figures and chart from today's data (refuses approved, published, superseded) |
| `build.py` | Builds the pages, share images, feed and `index.json`; called by `scripts/build_data.py` |
| `candidates.py` | Suggests candidates by the rules below |
| `test_discoveries.py` | Every figure reproduces; the approval gate; the live check |
| `content.py` | Reads and writes the front matter (a strict subset of YAML, no dependency) |

## Front matter

`id` (the file name without `.md`), `date`, `title` (states the finding, under 90 characters), `standfirst` (one
sentence), `status`, `theme` (`achievement-and-context`, `attendance-and-behaviour`, `inclusion`,
`later-report-language`), `figures` (each: `label`, `value`, `unit` (`%`, `pp` or `schools`), `n`, `source`, `as_at`,
`compute`, and `key: true` on the one or two figures for the share image), `chart` (`form` `line5` or `pairs`, drawn by
`site/explorer/areas/chart.js`, the areas page's own chart code; its `compute` fills the series), `explore` (an Explorer
link with the view in the hash), `related` (Explorer sections it sits beside, e.g. `/explorer/areas/#results`; the
Explorer shows up to two quiet links there), `limitation` (one sentence), `supersedes`, `superseded_by`, and `rule`
for anything the generator could suggest.

Optional: `article` (the site article it comes from, e.g. `/writing/ofsted-report-cards/`; its title is read from the
article itself), `linkedin` (a list of `{url, date, kind: post|article, title}`), `published` (the publication date),
`todo` (a note to whoever edits the file next), `card_source` (a shorter source line for the share image).

Every number in the title, standfirst, body and limitation must be one of the file's figures; the test checks this.

## The LinkedIn chain

Each discovery page shows, quietly and dated, "From the article" and "Discussed on LinkedIn" links where the file names
them; the Atom feed entry carries the same links (`<link rel="related">` and in the content).

**The publishing rule, enforced in code.** A discovery cannot be `published` unless it has a `published:` date and at
least one `linkedin` entry of kind `post`, with a linkedin.com URL, dated that same day: the post and the discovery go
out together, so the discovery is never public without the post that introduces it, and the post always has its
evidence page. `content.problems()` holds the rule; a production build fails on a discovery that breaks it, and
`freeze.py` refuses it. Order of work: Mark writes and posts the post, the post's URL and date go into `linkedin`, and
only then does the status become `published` (on Mark's word), with `published` set to that day.

**Post kit.** On preview builds only, each discovery page has a Post kit panel: the canonical link, the share image
link, the claim (the title), each key figure with its number of schools, and the source line, each with a Copy
button. It holds facts only; the post itself is Mark's to write. Production pages never show it.

## Status and the approval gate

`candidate` (written by the generator) → `draft` (being written) → `approved` → `published`; later `superseded`.

- Production (`CF_PAGES_BRANCH=main`) builds `published` and `superseded` only. Everything else is built on preview
  builds only (any other branch, or a local build), behind a "Draft, not published" banner and marked noindex.
  `OE_DISCOVERIES=production` or `preview` overrides, for testing.
- A status becomes `published` only when Mark says so in a live conversation. Nothing in this code changes a status.
- Never edit a published discovery's figures or claim. Write a new file with `supersedes: <old id>`, and set the old
  one's `status: superseded` and `superseded_by: <new id>`. Its page stays up, with a note.

## Frozen numbers, live check

Figures are frozen in the file when it is written (`freeze.py`). Every build runs each figure's compute function again.
If a percentage has moved by more than 2 points, or a difference has changed sign, the page shows "Since publication,
with N more inspections, this figure is now X." with the date, and `build.json` lists it under `discoveries.review`.

## The candidate generator's rules

`python3 scripts/discoveries/candidates.py` (after a build). It writes `candidate` files with computed figures and a
factual title. It never names a school, never writes about one school, and never publishes. Each rule has a key; a key
that already has a file, of any status, is not suggested again.

1. **A gradient crosses a set size.** For each report card area grouped as the areas page groups it (IDACI fifths and
   disadvantaged fifths among schools whose results were close to or above their similar schools; pupil stability,
   prior attainment and EHC plan fifths for the area each is drawn against), a candidate when the share graded below
   Expected standard differs by **15 percentage points or more** between the two end fifths, with **at least 30
   schools** in each. Its link opens that chart on the areas page. Key `gradient:<area>:<grouping>[:matched]`.
2. **A new month makes a trend clear.** By month of inspection, a candidate when the last **three complete months**,
   each with **at least 30** inspected secondaries, moved the same way each month and by **10 points or more** in all.
   The Explorer has no view by month yet, so the candidate says it needs one before it can be published. Key
   `trend:<area>:<month>`.
3. **A milestone count.** Each multiple of **250** secondaries with a report card and published results. Key
   `milestone:<count>`.

Groups under 10 schools never give a figure. The thresholds are set at the top of `candidates.py`; change them there
and here together.

The workflow `.github/workflows/discovery-candidates.yml` runs the generator weekly (Mondays) and on demand, and pushes
any new candidates to the branch `discovery-candidates`, whose preview build shows them. It never touches `main`. It is
active only once this file is on `main`.
