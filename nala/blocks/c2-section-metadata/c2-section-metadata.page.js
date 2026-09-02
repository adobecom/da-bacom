import { expect } from '@playwright/test';

/**
 * C2 Section Metadata Block Page Object
 *
 * Covers the net-new c2-section-metadata block (MWPW-202513 / PR #202).
 *
 * This block is not a visual component: it reads authored metadata rows and
 * applies style classes, a background layer, masonry spans, anchors, etc. to its
 * parent .section. E2E coverage is therefore intentionally light — it asserts the
 * structural side effects on the section. Visual fidelity is validated by the
 * manual checklist / Figma parity review.
 */
export default class C2SectionMetadata {
  constructor(page, blockSelector = '.c2-section-metadata') {
    this.page = page;

    this.block = page.locator(blockSelector).first();
    // The section that owns the (first) c2-section-metadata block.
    this.section = page
      .locator('.section')
      .filter({ has: page.locator(blockSelector) })
      .first();
    this.background = this.section.locator('.section-background');
  }

  async waitForReady() {
    await this.block.waitFor({ state: 'attached' });
    await this.section.waitFor({ state: 'attached' });
    // The owning section decorates lazily (Milo defers below-the-fold sections), so
    // nudge it into view to trigger decoration and wait for the section-metadata
    // classes to be applied. CI runners are slow — allow a generous window so the
    // subsequent assertions don't race the async block decoration.
    await this.section.scrollIntoViewIfNeeded().catch(() => {});
    await expect
      .poll(async () => (await this.sectionClassList()).length, { timeout: 20000 })
      .toBeGreaterThan(1);
  }

  /** Class list applied to the owning section. */
  async sectionClassList() {
    return this.section.evaluate((el) => [...el.classList]);
  }
}
