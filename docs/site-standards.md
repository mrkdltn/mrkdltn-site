# Site standards: mrkdltn.com

Written 22 November 2026 from a critical review of the main site (home, writing, articles, colophon, 404) at commit `02605c4`. The full review, with evidence and reasoning, is the Claude Doc "mrkdltn.com: critical review and site standards" (https://claude.ai/artifact/BBpWGggbrSXPF7U4qxQgrR). This file is the working copy for code.

The Explorer has its own standard (`explorer-benchmarks.md` in the claude.ai Project). Where the two overlap, the stricter applies. `CLAUDE.md` always wins over anything here.

## What the site is for

The permanent, citable home for Mark's writing and open tools, and the place where readers arriving from LinkedIn decide whether he is worth reading, quoting or inviting. Judge every change by whether it helps a head, researcher, journalist, official or event organiser do that in under a minute.

## The sixteen standards

Each has a test. Run the tests before any preview goes to Mark.

### Who Mark is, and how to reach him

1. **Identity in the first screen.** *Test:* at 375 × 812 and 1400 × 860 the first screen shows his name, a plain role line ("Secondary principal in the West Midlands") and one route into the writing and one into the Explorer.
2. **Reachable.** *Test:* a contact link in the header or footer of every page; a speaking and press page with a 50-word and a 150-word biography, approved photographs, topics, talks and how to request a comment. No personal email address published.
3. **Followable.** *Test:* `/feed.xml` validates as Atom with full text and dates, is linked from every page head, and updates in the same build as the article.

### The writing

4. **One template, every article.** *Test:* every article has, in order: label and date, title stating the claim, standfirst, byline with first publication, a dated update box ("No changes since publication" counts), margin notes, numbered sources, Cite as, author note, two related pieces, follow prompt.
5. **Every figure sourced, dated and current.** *Test:* every number on the site is in a figure register (page, figure, source, release date, next release date); a monthly check flags figures whose source has been updated.
6. **Citable and reusable.** *Test:* Cite as gives author, year, title, full URL, first-published and last-updated dates; BibTeX and RIS downloads; chart data as CSV with source and date; licences for text, images, data and code stated in the footer and colophon (code MIT; writing and images all rights reserved).
7. **Corrections in the open.** *Test:* a corrections page lists every substantive change, newest first; each corrected article links to it from its update box.
8. **A home for the whole body of work.** *Test:* a page per theme (fair accountability; disadvantage and belonging; building teachers) and a record page for talks, consultation responses, evidence, press and podcasts, each dated and linked.

### Reach

9. **Shares well everywhere, especially LinkedIn.** *Test:* every page has `og:title`, `og:description`, `og:url`, `og:type`, `og:image` (JPG or PNG, at least 1200 × 627, under 5 MB, never WebP) with `og:image:width`, `og:image:height` and `og:image:alt`, plus `twitter:card`; articles add `article:published_time` and `article:modified_time`. The build fails if any is missing.
10. **Findable and understood by machines.** *Test:* `Person` JSON-LD on home and About with `sameAs` to LinkedIn; `Article` JSON-LD on every article with author, dates and image; sitemap generated from the pages actually built, with real modification dates; unique titles and descriptions.

### Trust in the imagery and design

11. **Honest imagery.** *Test:* no real statistic is drawn inside a generated scene without a nearby "Illustration" label (pending Mark's decision, below); alt text starts "Illustration:"; Content Credentials survive the image pipeline; prompt, model and date logged for each illustration.
12. **Text never waits for motion.** *Test:* with JavaScript off, with reduced motion on, and before any scroll, every word is readable. Animation only adds to content already visible.

### Quality underneath

13. **Accessible to WCAG 2.2 AA.** *Test:* axe reports no serious or critical issues on every template at 375 and 1400 wide; text contrast at least 4.5:1 against every ground the page can show, including animated ones; targets at least 24 × 24 px; keyboard and screen-reader walk-through each quarter; accessibility statement on the site.
14. **Fast on a phone.** *Test:* on a mid-range phone profile over 4G, LCP under 2.5 s, CLS under 0.1, INP under 200 ms; first load of an article under 500 KB and of the home page under 1 MB including the first video; unchanging assets fingerprinted and cached for a year (`immutable`), HTML revalidated.
15. **Secure and private by default.** *Test:* HSTS, a Content-Security-Policy with no inline script or handlers, `Permissions-Policy`, `frame-ancestors`, `/.well-known/security.txt`; no cookies; no third-party requests except cookieless analytics; a plain privacy note.
16. **Built, checked and durable.** *Test:* pages come from one set of templates and one metadata source; every preview runs an automated gate (links, HTML validity, metadata, sitemap, feed, axe, performance budget, British English spelling); no published URL ever breaks; a dated site changelog records each production release.

## Scorecard, 22 November 2026

Met 0 · Partly met 10 · Not met 6. Re-score monthly.

Updated 23 November 2026 as each "Now" item ships: Met 2 · Partly met 9 · Not met 5.

| # | Standard | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Identity in the first screen | Partly | Wordmark only, no role line; intro and Explorer cards below the fold on desktop |
| 2 | Reachable | Not met | LinkedIn is the only route |
| 3 | Followable | Not met | `/feed.xml` returns 404 |
| 4 | One template | Partly | Update box on 2 of 4 articles; report-cards piece on an older pattern; no author note or related reading |
| 5 | Figures current | Partly | All sourced and dated; no register or freshness check |
| 6 | Citable | Partly | Cite as partial; no BibTeX, CSV or licence on the site |
| 7 | Corrections | Not met | No log |
| 8 | Body of work | Not met | No theme or record pages |
| 9 | Shares well | Met (23 Nov) | 23 Nov: every page but 404 has a 1200 × 630 JPG card and full OG and Twitter tags, articles with dates; `scripts/check_meta.py` passes on all 6,642 pages and fails the build otherwise. Post Inspector check is Mark's to run (needs his sign-in) |
| 10 | Findable | Not met | No JSON-LD; `STATIC_PAGES` in `scripts/build_pages.py` omits `/writing/belonging/`; every `lastmod` is the build date |
| 11 | Honest imagery | Partly | Grade grid drawn inside a generated classroom; no label near figures |
| 12 | Text before motion | Met (23 Nov) | 23 Nov: every home card and figure readable at load with JavaScript off, with reduced motion and before any scroll (0 of 9 cards hidden, was 8 of 9 on a phone); figures no longer count up; motion only adds thread, badges and bar growth |
| 13 | Accessible | Partly (23 Nov) | 23 Nov: home clean on axe (no serious or critical) at 375 × 812 and 1400 × 860, top, middle and bottom, motion on and reduced; `.paper` paints its own stone ground. Still to do: axe on every template, keyboard and screen-reader walk-through, accessibility statement |
| 14 | Fast | Partly | Desktop cold load ~360 ms, 87 KB, CLS 0; no phone measurement; everything `max-age=0` |
| 15 | Secure | Partly | Only `nosniff` and `Referrer-Policy`; inline `onclick` on print buttons |
| 16 | Built and checked | Partly | Hand-built pages and one-off scripts per article; no site gate or changelog |

Other specifics found: portrait `site/assets/img/mark-dalton.webp` is 400 × 500 but declared 880w, and the 480w file is identical; home links Progress 8 twice under different titles; the report-cards piece is dated "November 2026" with no day; colophon and 404 descriptions are one word; the 404 page carries a canonical.

## Plan

Each item is its own branch and preview. Nothing reaches `main` without Mark's "Go".

### Now

| Branch (suggested) | Item | Standards | Done when |
| --- | --- | --- | --- |
| `share-cards` | Build renders a 1200 × 630 JPG per page (illustration plus title in Caslon on a midnight band) and writes full OG and Twitter tags, with dates on articles | 9 | Metadata check passes on every page; Post Inspector shows a large card for home and all articles |
| `text-first` | Cards visible from the start, motion only adds; the paper section paints its own ground | 12, 13 | Phone first screen shows the intro; axe clean at every scroll position |
| `contact` | Role line under the headline; "Contact" in every nav, a short form reusing `functions/api/feedback.js` and D1 (new `kind`, no new resource) | 1, 2 | First-screen test passes; a test message arrives |
| `feed-and-schema` | Atom feed; sitemap built from pages that exist, with real dates; `Person` and `Article` JSON-LD | 3, 10 | Feed validates; belonging in sitemap; Rich Results Test reads author and dates |
| `headers` | HSTS (short max-age first), CSP report-only, `Permissions-Policy`, `frame-ancestors`, `security.txt`; fingerprinted assets with a year-long immutable cache; print buttons moved off inline `onclick` | 14, 15 | Header check passes; a week with no CSP reports, then enforce |
| `portrait` | Re-export from the photo set at 880 × 1100 and 480 × 600 | 1 | Sharp at 2× |

### Next (December to January)

- One article template built from Markdown content files with front matter; migrate the four articles with update boxes, author notes, related reading, full Cite as, BibTeX and RIS (4, 6, 16).
- About page, and Speaking and press page (1, 2). Needs Mark's biographies and photo choices.
- Theme pages and a record page (8).
- Figure register plus a monthly freshness check; public corrections page (5, 7).
- Quality gate as a GitHub Action on every non-`main` push: link check, HTML validation, metadata check, axe at 375 and 1400 wide, Lighthouse budget on a phone profile, British English spelling (13, 14, 16).
- Imagery and data, after Mark's decision (11).

### Later (February to April)

- Home page second pass: four or five stops, a "latest" strip near the top, phone page under 7,000 px.
- Email updates, if Mark chooses.
- CSV for every chart; DOIs for major analyses; versioned snapshots.
- Manual accessibility audit and published statement.
- Static search once there are a dozen pieces.
- Cookieless analytics events (LinkedIn referrals, Explorer opens, feed and contact use) reported monthly beside the LinkedIn experiment log.

## How we iterate

- **Per change:** plan an item, build on a branch, the gate runs, a passing preview goes to Mark with a link and a two-line note, he says Go, push to `main`, check the live site, log the release.
- **Per article:** the publishing checklist adds the share card check, feed and sitemap, figure register, related reading and update box.
- **Monthly:** re-score the table above, run the figure check, review analytics beside the experiment log, choose the next three items.
- **Quarterly:** manual accessibility walk-through, phone performance run on a real mid-range device, review these standards against new guidance, and a fresh look by an agent that has not worked on the site.

## Decisions for Mark (open)

1. Contact route other than LinkedIn. Recommended: a private contact form.
2. Speaking and press page. Recommended: yes.
3. Figures on generated scenes. Recommended: move the grade grid onto its own white sheet; alternative, a quiet "Illustration" line by each figure card.
4. Email updates. Recommended: not yet; feed first.
5. How identifiable the About text is. Mark to confirm he is comfortable.

## Sources (accessed 22 November 2026)

- LinkedIn Help, Make your website shareable on LinkedIn: https://www.linkedin.com/help/linkedin/answer/46687
- Google Search Central, Article structured data: https://developers.google.com/search/docs/data-types/article
- web.dev, Web Vitals: https://web.dev/vitals/ ; thresholds: https://web.dev/articles/defining-core-web-vitals-thresholds
- W3C WAI, What's new in WCAG 2.2: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- Mozilla Web Security Guidelines: https://infosec.mozilla.org/guidelines/web_security ; OWASP HTTP Headers Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
- C2PA, Content Credentials Deployment Guidance (July 2026): https://c2pa.org/wp-content/uploads/sites/33/2026/07/Content-Credentials-Deployment-Guidance.pdf
- Our World in Data, How to use Our World in Data: https://ourworldindata.org/how-to-use-our-world-in-data
- Simon Willison, About (feeds and biography): https://simonwillison.net/about
