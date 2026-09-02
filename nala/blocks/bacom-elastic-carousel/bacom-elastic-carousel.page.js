import { expect } from '@playwright/test';

/**
 * BACOM Elastic Carousel Block Page Object
 *
 * Targets the current `expand-content limited` variant on the dedicated Nala page
 * (MWPW-202491). DOM:
 *   .bacom-elastic-carousel
 *     .elastic-carousel-viewport
 *       .elastic-carousel-item > .elastic-carousel-item-container
 *         .elastic-carousel-item-header  (logo img · headline p · .elastic-carousel-expand-toggle [+/-])
 *         .elastic-carousel-item-media   (.elastic-carousel-expand-content · .elastic-carousel-item-media-asset)
 *         .elastic-carousel-item-footer  (h3.heading-2 · .elastic-carousel-footer-chevron)
 *     .elastic-carousel-limited-controls (button.prev / button.next)
 *
 * AC covered: 3-up view, expand icon next to the headline, click reveals the
 * description and re-crops the image, >3 cards → carousel controls.
 */
export default class ElasticCarousel {
  constructor(page, blockSelector = '.bacom-elastic-carousel') {
    this.page = page;
    // The dedicated page renders more than one carousel example; use the first
    // (the `limited` variant with expand toggles + carousel controls).
    this.block = page.locator(blockSelector).first();
    this.viewport = this.block.locator('.elastic-carousel-viewport');
    this.items = this.block.locator('.elastic-carousel-item');

    this.firstItem = this.items.first();
    this.firstHeader = this.firstItem.locator('.elastic-carousel-item-header');
    this.firstHeadline = this.firstItem.locator('.elastic-carousel-item-header p').first();
    this.firstToggle = this.firstItem.locator('.elastic-carousel-expand-toggle');
    this.firstMedia = this.firstItem.locator('.elastic-carousel-item-media');
    this.firstAsset = this.firstItem.locator('.elastic-carousel-item-media-asset');
    this.firstExpandContent = this.firstItem.locator('.elastic-carousel-expand-content');
    this.firstFooterChevron = this.firstItem.locator('.elastic-carousel-footer-chevron');

    this.controls = this.block.locator('.elastic-carousel-limited-controls');
    this.prevArrow = this.block.locator('.elastic-carousel-limited-control.prev');
    this.nextArrow = this.block.locator('.elastic-carousel-limited-control.next');
  }

  async waitForReady() {
    await this.block.waitFor({ state: 'attached' });
    await this.firstToggle.waitFor({ state: 'visible' });
  }

  /** Cards visible across the viewport (AC: 3-up). */
  async cardsPerView() {
    return this.viewport.evaluate((vp) => {
      const first = vp.querySelector('.elastic-carousel-item');
      const gap = parseFloat(getComputedStyle(vp).columnGap) || 0;
      return Math.round(vp.clientWidth / (first.offsetWidth + gap));
    });
  }

  /** Expand toggle position relative to the headline (AC: next to the headline). */
  async togglePlacement() {
    return this.firstItem.evaluate((item) => {
      const headline = item.querySelector('.elastic-carousel-item-header p');
      const toggle = item.querySelector('.elastic-carousel-expand-toggle');
      if (!headline || !toggle) return null;
      const h = headline.getBoundingClientRect();
      const t = toggle.getBoundingClientRect();
      return {
        sameRow: Math.abs((h.y + (h.height / 2)) - (t.y + (t.height / 2))) < 24,
        toggleRightOfHeadline: t.x >= h.x,
      };
    });
  }

  /** Snapshot of expandable content visibility + media-asset height (for re-crop). */
  async expandState() {
    return this.firstItem.evaluate((item) => {
      const content = item.querySelector('.elastic-carousel-expand-content');
      const asset = item.querySelector('.elastic-carousel-item-media-asset');
      const visible = !!content && content.getClientRects().length > 0 && content.clientHeight > 0;
      return { contentVisible: visible, assetHeight: asset ? Math.round(asset.getBoundingClientRect().height) : null };
    });
  }

  /** X position of the first card — moves left as the carousel advances. */
  async firstItemX() {
    return this.firstItem.evaluate((el) => Math.round(el.getBoundingClientRect().x));
  }

  /** Advance the carousel; the `limited` variant moves the track (prev becomes enabled). */
  async clickNext() {
    const before = await this.firstItemX();
    await this.nextArrow.click();
    await expect
      .poll(async () => this.firstItemX(), { timeout: 5000 })
      .toBeLessThan(before);
  }
}
