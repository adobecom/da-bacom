# ISWA Redesign Blocks — Test Plan (6 PRs)

Combined test plan for the six ISWA blocks, all retargeted to the **stage dedicated pages** (`stage--da-bacom--adobecom.aem.live`) after the new AC round (MWPW-2048xx).

| PR | Block | Jira | Nala dir | Automation |
|----|-------|------|----------|:---------:|
| [#199](https://github.com/adobecom/da-bacom/pull/199) | video-marquee (net new) | [MWPW-202482](https://jira.corp.adobe.com/browse/MWPW-202482) · [MWPW-204832](https://jira.corp.adobe.com/browse/MWPW-204832) | `nala/blocks/video-marquee/` | ✅ 5 |
| [#201](https://github.com/adobecom/da-bacom/pull/201) | bacom-elastic-carousel (enh.) | [MWPW-202491](https://jira.corp.adobe.com/browse/MWPW-202491) | `nala/blocks/bacom-elastic-carousel/` | ✅ 5 |
| [#203](https://github.com/adobecom/da-bacom/pull/203) | bento-grid (enh.) | [MWPW-202490](https://jira.corp.adobe.com/browse/MWPW-202490) | `nala/blocks/bento-grid/` | 8 (7 ✅ + 1 🔴 design-lock) |
| [#198](https://github.com/adobecom/da-bacom/pull/198) | resource-showcase (net new) | [MWPW-202483](https://jira.corp.adobe.com/browse/MWPW-202483) | `nala/blocks/resource-showcase/` | ✅ 6 |
| [#202](https://github.com/adobecom/da-bacom/pull/202) | c2-section-metadata (net new) | [MWPW-202513](https://jira.corp.adobe.com/browse/MWPW-202513) | `nala/blocks/c2-section-metadata/` | ✅ 2 |
| [#205](https://github.com/adobecom/da-bacom/pull/205) | bacom-carousel-c2 (enh.) | [MWPW-202488](https://jira.corp.adobe.com/browse/MWPW-202488) | `nala/blocks/bacom-carousel-c2/` | ✅ 4 |
| — | ISWA cross-cutting (page-level) | [204904](https://jira.corp.adobe.com/browse/MWPW-204904) · [205058](https://jira.corp.adobe.com/browse/MWPW-205058) · [205025](https://jira.corp.adobe.com/browse/MWPW-205025) · [205271](https://jira.corp.adobe.com/browse/MWPW-205271) | `nala/blocks/iswa-cross-cutting/` | ✅ 4 |

**ISWA cross-cutting** (page-level, runs on the assembled Nala copy of the finished page `/drafts/nala/blocks/resources/it-starts-with-adobe`): `@iswa-footer-not-squished` (footer loads to full height, not the 40px squished state), `@iswa-nav-renders` (standard `global-navigation`), `@iswa-content-alignment` (blocks share a content-column left edge; centered blocks have equal margins), `@iswa-mobile-marquee-full-width` (mobile marquee flush to both edges, no right gutter). The Target/experiment half of 205271 (nav/footer must not revert to C2 when Target is on) needs Target enabled and is left to **manual**.

**Target pages (stage) — dedicated block pages by default, integration page via env:**

| Block | Default (dedicated) | Integration override |
|-------|---------------------|----------------------|
| video-marquee | `/drafts/nala/blocks/marquee/marquee-video` | `ISWA_INTEGRATION_PAGE=/drafts/nala/blocks/resources/it-starts-with-adobe?martech=off` points the whole suite at the **ISWA integration page** (authors all five blocks incl. logo + stat eyebrows) |
| bacom-elastic-carousel | `/drafts/nala/blocks/carousel/elastic-carousel` | 〃 |
| bento-grid | `/drafts/nala/blocks/bento-grid/bento-grid` | 〃 |
| resource-showcase | `/drafts/nala/blocks/resource-showcase/resource-showcase` | 〃 |
| bacom-carousel-c2 | `/drafts/nala/blocks/carousel/carousel-c2` (structure / logo / left-aligned) | 〃 |
| carousel-c2 stat AC | `/drafts/nala/blocks/resources/it-starts-with-adobe` (the dedicated page authors no stat eyebrow) | 〃 |
| c2-section-metadata | `/drafts/slavin/iswa/iswa-v2/c2-blocks-parity` | always (metadata is authored page content — the integration page does not author the c2 block) |

Page-object adaptations make both authoring modes pass: marquee's desktop + mobile media rows (9x16 / 16x9 embeds) are filtered to the visible one; the bento section header is found in-block **or** as the text section above the block; the bento featured modal covers both the block-built mp4 modal (dedicated) and the fragment modal (`data-modal-path` → `.dialog-modal`, integration).

**Figma spec:** [ISWA-A-B-Test](https://www.figma.com/design/oiHVkHPgT4vyJzWNULWFyW/ISWA-A-B-Test?node-id=950-1996) (node `950-1996`; c2 also `866-2393`)

---

## 1. Test layers & how to run

### 1.1 Unit tests (shipped in each PR, run offline via web-test-runner)

```bash
npm run test:file -- "test/blocks/bento-grid/bento-grid.test.js"
npm run test:file -- "test/blocks/video-marquee/video-marquee.test.js"
npm run test:file -- "test/blocks/resource-showcase/resource-showcase.test.js"
```
> `bacom-elastic-carousel` and `c2-section-metadata` ship no unit tests in their PRs — they are covered by the Nala suites below.

### 1.2 Nala E2E (Playwright against the stage dedicated pages)

Run everything against stage:

```bash
env LOCAL_TEST_LIVE_URL=https://stage--da-bacom--adobecom.aem.live \
npx playwright test \
  nala/blocks/video-marquee nala/blocks/bacom-elastic-carousel \
  nala/blocks/bento-grid nala/blocks/resource-showcase nala/blocks/c2-section-metadata \
  nala/blocks/bacom-carousel-c2 \
  --project=da-bacom-live-chromium
```

One block / one case:

```bash
env LOCAL_TEST_LIVE_URL=https://stage--da-bacom--adobecom.aem.live \
npx playwright test nala/blocks/bento-grid/bento-grid.test.js \
  --project=da-bacom-live-chromium --grep @bento-grid-video-modal
```

Run against the combined ISWA integration page instead of the dedicated block pages:

```bash
env LOCAL_TEST_LIVE_URL=https://stage--da-bacom--adobecom.aem.live \
  'ISWA_INTEGRATION_PAGE=/drafts/nala/blocks/resources/it-starts-with-adobe?martech=off' \
npx playwright test nala/blocks/video-marquee nala/blocks/bacom-elastic-carousel \
  nala/blocks/bento-grid nala/blocks/resource-showcase nala/blocks/c2-section-metadata \
  nala/blocks/bacom-carousel-c2 \
  --project=da-bacom-live-chromium
```

Cross-browser spot checks: swap `--project` for `da-bacom-live-webkit` (Safari) or `da-bacom-live-firefox`.

**Current status:** ✅ verified 2026-08-27 on the dedicated block pages **and** the integration page (via `ISWA_INTEGRATION_PAGE`), across three viewports:

| Project | Result | Reds |
|---------|--------|------|
| `da-bacom-live-chromium` (desktop 1440) | **29/30** | bento secondary-bg (design lock, §1.2b) |
| `da-bacom-live-tablet` (iPad Mini 768) | **29/30** | bento secondary-bg (design lock) |
| `mobile-chrome-pixel5` (393) | **28/30** | bento secondary-bg (design lock) + **marquee logo distorted on mobile (bug, §5)** |

The earlier card-radius gap is now **fixed on stage** (`@bento-grid-card-radius` green). The suites are viewport-aware: bento/elastic pick the active responsive view per breakpoint (mobile <600, tablet 600–1199, desktop ≥1200).

### 1.2b Bento — Figma-confirmed spec-lock (red until built)

The ISWA Figma (node `950-1996`) shows the secondary "Leadership POV" cards with the **same light-grey rounded-card background** as the featured card. Live has it on **mobile** (grey `246`) but not yet on **desktop** (secondary bg `transparent`), so this test holds the design contract and stays red until the block CSS is updated:

| Requirement (Figma-confirmed) | Encoded by | Live measured state |
|---|---|---|
| Secondary cards carry the featured card's light-grey rounded background (desktop + mobile) | `@bento-grid-secondary-bg` | desktop secondary bg `transparent` (featured `rgb(246,246,246)`); mobile ✅ grey |

**Resolved on stage:** `@bento-grid-card-radius` — card corner radius now matches the inner image radius (16px = 16px) ✅.

**Mobile carousel controls — reverted (open question).** The QE AC only says "full carousel on mobile" and the current build renders no mobile arrows; an earlier ad-hoc request asked for controls. Left as "no controls" pending PM/design confirmation (one line to flip in `@bento-grid-responsive` / `@bento-grid-partial-vs-full`).

### 1.3 CI gating (important)

The suites target stage / draft pages. On `main` these pages still render the *old* blocks, so a default PR run against `main` would fail. When wiring these into automated PR runs, gate them the same way the PP suite is gated in
[nala/utils/pr.run.sh](../utils/pr.run.sh) (tag-based exclusion), or only run them once each block is on `main`. All specs read `LOCAL_TEST_LIVE_URL`, so pointing them elsewhere is a one-line env change.

---

## 2. Automation coverage

| Block | Tag | Validates |
|-------|-----|-----------|
| **video-marquee** | `@video-marquee-structure` | left content (eyebrow logo / headline / subcopy) + right video panel render |
| | `@video-marquee-embed` | AC: adobetv embed configured with autoplay + captions |
| | `@video-marquee-rounded` | AC (MWPW-204832): video panel has rounded corners that clip its content |
| | `@video-marquee-logo` | AC (MWPW-204832): eyebrow logo renders (not shrunk) with aspect ratio preserved |
| | `@video-marquee-full-bleed` | AC (MWPW-204832): large-desktop marquee spans the full browser width (no side gutters) |
| **elastic-carousel** | `@elastic-carousel-structure` | items with header (logo/headline/expand toggle), media asset, footer |
| | `@elastic-carousel-expand` | AC: expand icon reveals description **and re-crops the image** (asset height shrinks); collapses again |
| | `@elastic-carousel-nav` | AC: `>3` cards → controls; Next scrolls the viewport |
| | `@elastic-carousel-3up` | AC: desktop shows a 3-up view (3 cards across) |
| | `@elastic-carousel-toggle-placement` | AC: expand toggle sits next to the headline (same row, right of the title) |
| **bento-grid** | `@bento-grid-structure` | block shell, responsive views, section header, featured video bento, carousel cards |
| | `@bento-grid-video-modal` | featured click opens modal, plays the mp4, close detaches |
| | `@bento-grid-carousel-nav` | prev disabled/next enabled; next scrolls + enables prev |
| | `@bento-grid-responsive` | desktop featured+carousel; mobile single full carousel (no arrows — open question, §1.2b) |
| | `@bento-grid-play-icon-topright` | AC: play icon in the top-right of the featured + carousel images |
| | `@bento-grid-partial-vs-full` | AC: desktop partial carousel (overflows, cards < 50% width); mobile full-width single carousel |
| | `@bento-grid-secondary-bg` | Figma-confirmed req: secondary cards carry the featured card's light-grey background (desktop + mobile) 🔴 desktop pending |
| | `@bento-grid-card-radius` | Figma-confirmed req: card corner radius matches the inner creative image radius ✅ fixed on stage |
| **resource-showcase** | `@resource-showcase-structure` | heading; featured image/title/desc/CTA+chevron; secondary list |
| | `@resource-showcase-featured-link` | featured is a link labelled by its title (aria-label) |
| | `@resource-showcase-secondary-items` | each secondary item has title + chevron CTA + authored href |
| | `@resource-showcase-featured-image-top` | AC: image above the body (DOM + geometry); responsive `<picture>` sources |
| | `@resource-showcase-responsive` | AC: 2-col desktop; stacks to 1 col (featured first) below tablet |
| | `@resource-showcase-a11y` | AC: one H2 heading; item titles H3; featured img alt; card keyboard-focusable |
| **c2-section-metadata** | `@c2-section-metadata-style` | style classes applied to owning section (`rounded-corners-bottom` / `wide` / `spacing-md-bottom`) |
| | `@c2-section-metadata-background` | `has-background` + `.section-background` layer created |
| **carousel-c2** | `@carousel-c2-structure` | block renders with slides + at least one eyebrow (ingested) |
| | `@carousel-c2-eyebrow-logo` | AC: a logo image is authored in the eyebrow (`.eyebrow` with an img) |
| | `@carousel-c2-eyebrow-stat` | AC: a stat is authored in the eyebrow (`.eyebrow.stat` = strong number + `.stat-description`) — on the combined showcase page |
| | `@carousel-c2-left-aligned` | AC: content components share a left edge + use start/left text-align |

---

## 3. Design parity vs Figma

Compared the live stage render against the ISWA-A-B-Test spec (desktop) and each ticket's
acceptance criteria. Screenshots captured at 1440px.

| Block | Parity | Notes |
|-------|:------:|-------|
| **resource-showcase** | ✅ Strong | Heading, red featured card (image top / title-desc-CTA below), 3 secondary items with chevron CTAs, gradient background — all match the desktop spec. (Gradient is authored via section-metadata, covered by the c2-section-metadata suite on the parity page.) |
| **bento-grid** | ✅ Good | Play icon **top-right** of every image (measured), **featured video bento** (Watch + click-to-modal), **partial carousel** desktop (overflows) / **full** carousel mobile, card **radius now matches** the inner image. ⚠️ Remaining: desktop secondary-card grey background (§1.2b); verify **section-header alignment** (live centers "Leadership POV"; BASE spec shows it left-aligned). |
| **elastic-carousel** | ✅ Good | 3-up ✅, expand icon **next to the headline** with **+/−** glyph ✅, click reveals the description **and re-crops the image** (asset `316px → 256px`) ✅, `>3` cards → carousel controls ✅. |
| **video-marquee** | ✅ Good | Left content (eyebrow logo/headline/subcopy) + right rounded video panel; adobetv iframe player with **autoplay + captions**; full-bleed on large desktop. |
| **c2-section-metadata** | ➖ N/A visual | Not a visual component — it styles its section. Design parity here means the three c2 blocks it supports (latest-news, footer-cta, footer) match spec `866-2393`; manual/visual review, covered in §4. |
| **carousel-c2** | ✅ Good | All AC met + asserted: **logo image** authorable in the eyebrow, **stat** authorable in the eyebrow (`strong` "50%" + `.stat-description`), content **left-aligned** (shared left edge, `text-align: start`). |

---

## 4. Manual verification checklist

Automation covers structure + deterministic interactions. Check the rest by hand on the
stage pages. (The detailed per-interaction template lives in
[bento-grid/TEST-PLAN.md](bento-grid/TEST-PLAN.md).)

**Cross-cutting**
- [ ] Real-browser pass on Chrome, Safari, Firefox, Edge + iOS Safari / Android Chrome.
- [ ] Keyboard: all controls/toggles/arrows focusable and operable (Enter/Space); visible focus.
- [ ] RTL locale mirrors carousels and inverts arrow direction.
- [ ] Reduced-motion: videos do not autoplay when `prefers-reduced-motion` is set.

**video-marquee** — [ ] video paints & muted-autoplays in a real browser · [ ] captions (CC) toggle · [ ] player controls reflect state · [ ] logo legibility at small sizes.

**elastic-carousel** — [ ] full-width swipe on mobile · [ ] hover plays the card video · [ ] RTL mirrors arrows.

**bento-grid** — [ ] any card opens the video modal & plays · [ ] closing stops playback · [ ] broken video shows the fallback message · [ ] mobile swipe snaps to center · [ ] section-header alignment vs spec · [ ] desktop secondary grey background once built.

**resource-showcase** — [ ] featured card + each CTA actually navigate to the authored URL · [ ] visible focus ring when tabbing · [ ] WCAG AA contrast on gradient/red card · [ ] iOS Safari + Android Chrome render correctly.

**carousel-c2** — [ ] logo image alt text is meaningful (or intentionally decorative) · [ ] stat + logo eyebrows read correctly across all slides · [ ] left-alignment holds on mobile · [ ] carousel nav/autoplay unaffected by the enhancement.

**c2-section-metadata** — [ ] latest-news / footer-cta / footer render to spec `866-2393` · [ ] background layers show per viewport · [ ] masonry spans / anchor / rounded-corners apply.

---

## 5. Known gaps / risks

- **Marquee logo distorted on mobile (bug to fix)** — the eyebrow logo is hard-sized `168×20` while its asset is `508×120` (4.23:1), i.e. ~2× horizontal stretch. Desktop is only ~4% off (300×30 vs 303×29). Fix: size by one dimension (`height` + `width: auto` or `aspect-ratio`). Caught by `@video-marquee-logo`.
- **Elastic carousel on mobile stacks vertically** — the current build lays the cards out as a full-width single-column grid (no horizontal swipe, controls hidden). An earlier QE note expected a swipe carousel on mobile; deviation to confirm with design/PM (encoded by `@elastic-carousel-nav`'s mobile branch).
- Analytics attributes (`daa-*`) not asserted.
- Card counts / `start-index` rotation are content-driven — suites assert lower bounds, not fixed counts.
- Visual regression (pixel diffing) is out of scope; parity is by review (§3) + manual (§4).
- `video-marquee` real-browser playback (headless capture shows black) is left to manual checks.
- The carousel-c2 stat test and the c2-section-metadata suite target combined/parity pages rather than isolated ones — authored-content ACs have no isolated page.