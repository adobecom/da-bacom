/**
 * Resource Showcase Block Page Object
 *
 * Covers the net-new resource-showcase block (MWPW-202483 / PR #198):
 *  - Section heading
 *  - One featured card (image + title + description + text CTA). When the CTA has
 *    an href the whole card becomes a link with an aria-label and aria-hidden inner
 *    content.
 *  - A stacked list of N secondary items, each with title, description and a text
 *    CTA rendered with a trailing chevron icon.
 */
export default class ResourceShowcase {
  constructor(page, blockSelector = '.resource-showcase') {
    this.page = page;

    this.block = page.locator(blockSelector);
    this.heading = this.block.locator('.resource-showcase-heading');
    this.content = this.block.locator('.resource-showcase-content');

    // Featured card
    this.featured = this.block.locator('.resource-showcase-featured');
    this.featuredImage = this.featured.locator('.resource-showcase-featured-image');
    this.featuredTitle = this.featured.locator('.resource-showcase-featured-title');
    this.featuredDescription = this.featured.locator('.resource-showcase-featured-description');
    this.featuredCta = this.featured.locator('.resource-showcase-cta');
    this.featuredChevron = this.featured.locator('.resource-showcase-cta .resource-showcase-chevron');

    this.featuredBody = this.featured.locator('.resource-showcase-featured-body');
    this.featuredImg = this.featuredImage.locator('img');
    this.featuredPictureSources = this.featuredImage.locator('picture source');

    // Secondary list
    this.list = this.block.locator('.resource-showcase-list');
    this.items = this.block.locator('.resource-showcase-list .resource-showcase-item');
    this.itemTitles = this.block.locator('.resource-showcase-item-title');
    this.itemDescriptions = this.block.locator('.resource-showcase-item .resource-showcase-item-description');
    this.itemCtas = this.block.locator('.resource-showcase-item .resource-showcase-cta');
  }

  async waitForReady() {
    await this.block.waitFor({ state: 'attached' });
    await this.heading.waitFor({ state: 'visible' });
    await this.featured.waitFor({ state: 'visible' });
  }

  /** Bounding boxes for the featured image/body and the featured/list columns. */
  async layout() {
    return this.block.evaluate((root) => {
      const box = (sel) => {
        const el = root.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom),
        };
      };
      return {
        image: box('.resource-showcase-featured .resource-showcase-featured-image'),
        body: box('.resource-showcase-featured .resource-showcase-featured-body'),
        featured: box('.resource-showcase-featured'),
        list: box('.resource-showcase-list'),
      };
    });
  }

  /** Tag name of a locator's first element (e.g. to verify heading levels). */
  static async tagOf(locator) {
    return locator.evaluate((el) => el.tagName);
  }
}
