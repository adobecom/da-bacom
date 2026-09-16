# Bento Grid — Test Plan (Pilot)

**Feature:** Bento Grid enhancement — [MWPW-202490](https://jira.corp.adobe.com/browse/MWPW-202490) / PR [#203](https://github.com/adobecom/da-bacom/pull/203)
**Repo:** `adobecom/da-bacom` → `nala/blocks/bento-grid/`
**Suite:** [bento-grid.test.js](bento-grid.test.js) · **Spec:** [bento-grid.spec.js](bento-grid.spec.js) · **Page object:** [bento-grid.page.js](bento-grid.page.js)
**Live under test:** `https://iswa--da-bacom--adobecom.aem.live/drafts/jsandlan/elastic?martech=off`

---

## 1. Overview

### 1.1 What the PR adds

- Featured **video bento** (eyebrow "Featured video" + description + Watch link).
- **Play icon** on the top-right of every bento image.
- **Partial carousel** on desktop/tablet + **full swipeable carousel** on mobile.
- Click a video card → **video modal** (`#bento-grid-video-modal`) that autoplays the mp4.

### 1.2 Scope

| In scope | Out of scope |
|----------|--------------|
| Block shell, responsive views, section header rendering | Exact pixel layout / visual regression |
| Featured video card structure + play icon + watch link | CDN video streaming reliability |
| Video modal open/close + source wiring | Milo modal internals |
| Carousel arrow states + scroll navigation | Analytics (`daa-*`) payload correctness |
| Mobile-vs-desktop view switching | Full device matrix in every run |

### 1.3 Prerequisites

| Requirement | Details |
|-------------|---------|
| Node.js | v18+ with Playwright installed (`npm ci`) |
| Network | Reach `*--da-bacom--adobecom.aem.live` and the demo mp4 host |
| Base URL | Set `LOCAL_TEST_LIVE_URL` to the branch under test |

---

## 2. How to run

### 2.1 Unit tests (shipped with the PR)

```bash
npm run test:file -- "test/blocks/bento-grid/bento-grid.test.js"
```

### 2.2 Nala E2E against the ISWA branch

```bash
env LOCAL_TEST_LIVE_URL=https://iswa--da-bacom--adobecom.aem.live \
npx playwright test nala/blocks/bento-grid/bento-grid.test.js \
--project=da-bacom-live-chromium
```

Run a single case by tag:

```bash
env LOCAL_TEST_LIVE_URL=https://iswa--da-bacom--adobecom.aem.live \
npx playwright test nala/blocks/bento-grid/bento-grid.test.js \
--project=da-bacom-live-chromium --grep @bento-grid-video-modal
```

> **Note:** the suite targets a **desktop** project (`da-bacom-live-chromium`). The
> `@bento-grid-responsive` case resizes the viewport itself, so it does not need a
> separate mobile project. Point `LOCAL_TEST_LIVE_URL` at `stage`/`main` once the
> block is merged there.

---

## 3. Automated coverage

| TCID | Test (tag) | Validates |
|------|------------|-----------|
| BENTO-01 | `@bento-grid-structure` | `con-block`, `role=region`, `aria-label`; mobile/tablet/desktop views all built with only desktop visible; section header heading + subtext; featured card is a `has-video` link with "Featured video" eyebrow, play icon, watch link; ≥4 carousel cards each with play icon + watch link; controls visible |
| BENTO-02 | `@bento-grid-video-modal` | Clicking the featured card opens `#bento-grid-video-modal`; `<video><source>` src equals the card href; error message hidden; closing (`.dialog-close`) detaches the modal |
| BENTO-03 | `@bento-grid-carousel-nav` | Prev arrow disabled at start, Next enabled; clicking Next scrolls the container and enables Prev; Prev scrolls back |
| BENTO-04 | `@bento-grid-responsive` | Desktop shows featured + carousel; resizing to 390px shows the mobile view, hides desktop, keeps carousel cards, and renders **no** arrow controls |

**Status:** ✅ 4/4 passing on `da-bacom-live-chromium` against `iswa` (verified).

---

## 4. Manual verification checklist

Automation covers structure and deterministic interactions. Check the following by hand
(ideally on the ISWA page above), because they are visual, timing-, or input-dependent.

### 4.1 Visual / layout

- [ ] Featured bento sits left with its "Featured video" eyebrow, heading, description, Watch link.
- [ ] Play icon renders in the **top-right** of every image and stays there on hover.
- [ ] Desktop shows a **partial** carousel (next card peeks at the right edge).
- [ ] Section header (title + subtext) is correctly aligned above the featured card.
- [ ] No layout shift / overlap at 1280, 1440, and 1920 widths.

### 4.2 Video modal

- [ ] Clicking the featured card and any carousel card opens the modal and the video **plays**.
- [ ] Closing the modal (X, ESC, click-outside) **stops** playback (no audio keeps playing).
- [ ] A broken/unavailable video shows "This video is currently unavailable." instead of a blank modal.

### 4.3 Carousel

- [ ] Arrows only appear when there are **more than 3** cards.
- [ ] Next/Prev move roughly one card at a time; scroll is smooth.
- [ ] Prev is disabled at the far left, Next is disabled at the far right.
- [ ] Trackpad / wheel horizontal scroll also updates the arrow disabled states.

### 4.4 Mobile (real device or emulation)

- [ ] Single full-width swipeable carousel; the featured card is folded into it.
- [ ] No arrow controls on mobile; swipe snaps cards to center.
- [ ] Tapping a card opens the video modal full-screen-friendly.

### 4.5 Cross-browser / a11y

- [ ] Spot-check Safari (`--project=da-bacom-live-webkit`) and Firefox (`--project=da-bacom-live-firefox`).
- [ ] Keyboard: cards and arrows are focusable and operable with Enter/Space.
- [ ] RTL locale mirrors the carousel and inverts arrow directions.

---

## 5. Known gaps / follow-ups

- Analytics attributes (`daa-lh` / `daa-ll`) are not asserted.
- Exact card count and the `start-index` rotation are content-driven; the suite asserts a
  lower bound (`minCards`) rather than a fixed number to stay resilient to authoring changes.
- Visual regression (screenshots) is intentionally left to manual review for the pilot.
