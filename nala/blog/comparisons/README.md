# Blog comparison reports

These opt-in suites preserve all 3,101 link-comparison paths and 18 visual pages
from the legacy BACOM Blog inventory. Baseline URLs use da-bacom's configured
`main` origin; target URLs use the existing Playwright `baseURL`. Neither run
depends on da-bacom-blog remaining available.

Run from the repository root, selecting a target and browser explicitly:

```bash
BLOG_COMPARISONS=1 \
LOCAL_TEST_LIVE_URL=https://port-blog-e2e--da-bacom--adobecom.aem.live \
npx playwright test nala/blog/comparisons/link-comparison.test.js \
  --project=da-bacom-live-chromium

BLOG_COMPARISONS=1 \
LOCAL_TEST_LIVE_URL=https://port-blog-e2e--da-bacom--adobecom.aem.live \
npx playwright test nala/blog/comparisons/visual-comparison.test.js \
  --project=da-bacom-live-chromium
```

Use Playwright's `--grep` to select particular paths or visual page names. The
existing `MILO_LIBS` query suffix can select target libraries, for example
`MILO_LIBS='?milolibs=stage'`. The baseline continues to use its normal libraries.
Comparing a target with itself is not a useful migration review.

Both suites require `BLOG_COMPARISONS=1` and carry `@nopr`, keeping the full
inventory out of normal Nala/PR checks. Use Playwright directly as shown above:
the Nala wrapper always excludes `nopr`, even when the opt-in variable is set.

## Results

Each case attaches a JSON report to the normal Playwright report. Link reports
include both URL/status/link inventories and differences for baseline links.
Same-environment origins are normalized so a branch hostname does not create
false differences; external destinations, query strings, hashes, and repeated
link labels are retained.

Visual cases attach paired full-page `baseline` and `target` PNGs. As in the
legacy suite, link differences and visual differences are review artifacts,
not automatic parity assertions or pixel-difference failures.

HTTP 404 pages are reported and skipped, not counted as passing comparisons.
Other unsuccessful responses fail. Missing migrated content must be published
before its comparison can establish parity. Screenshots and reports use
Playwright's ignored `test-results/` output, not shared worker files.

## Inventory provenance and retired authoring coverage

The JSON inventories record their pinned source URLs in `adobecom/nala`.
Each original link pair's published path is preserved, replacing the obsolete
same-repository staged-content URL with that path on the selected da-bacom
branch. Visual page names and paths are preserved.

The legacy SharePoint open/edit/save/undo/save workflow is explicitly retired
by approval for this migration because authoring moved to DA. It is not ported
or silently counted as DA coverage; no DA editing replacement is introduced.
