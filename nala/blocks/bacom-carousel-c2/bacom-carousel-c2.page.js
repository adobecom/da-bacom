/**
 * BACOM Carousel C2 Block Page Object
 *
 * Covers the carousel-c2 enhancement (MWPW-202488 / PR #205):
 *  - Author a logo image in the eyebrow of the content (`.eyebrow` containing an img)
 *  - Author a stat in the eyebrow (`.eyebrow.stat` = <strong>number</strong> + `.stat-description`)
 *  - All content components remain left aligned (shared left edge, text-align start)
 *
 * Slide shape: .carousel-slide > .bacom-rich-content > .foreground > .content
 *   .content: p.eyebrow (logo) · h3.heading-2 · p.eyebrow.stat · p.action-area
 */
export default class CarouselC2 {
  constructor(page, blockSelector = '.bacom-carousel-c2') {
    this.page = page;
    this.block = page.locator(blockSelector);
    this.slides = this.block.locator('.carousel-slide');
    this.eyebrows = this.block.locator('.eyebrow');

    // Logo eyebrow (an eyebrow that contains an image)
    this.logoEyebrow = this.block.locator('.eyebrow:has(img)').first();
    this.logoEyebrowImg = this.logoEyebrow.locator('img');

    // Stat eyebrow
    this.statEyebrow = this.block.locator('.eyebrow.stat').first();
    this.statNumber = this.statEyebrow.locator('strong');
    this.statDescription = this.statEyebrow.locator('.stat-description');
  }

  async waitForReady() {
    await this.block.waitFor({ state: 'attached' });
    await this.eyebrows.first().waitFor({ state: 'visible' });
  }

  /**
   * Left-alignment of the content components inside the slide holding the eyebrows.
   * Returns whether they share a left edge and all use a start/left text alignment.
   */
  async contentAlignment() {
    return this.block.evaluate((root) => {
      const stat = root.querySelector('.eyebrow.stat');
      const content = (stat && stat.closest('.content')) || root.querySelector('.content') || root;
      const measure = (sel) => {
        const el = content.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { sel, left: Math.round(r.x), textAlign: getComputedStyle(el).textAlign };
      };
      const parts = ['.eyebrow', 'h1,h2,h3,h4,h5,h6', '.eyebrow.stat', '.action-area']
        .map(measure)
        .filter(Boolean);
      const lefts = parts.map((p) => p.left);
      return {
        parts,
        sharedLeftEdge: lefts.length > 1 ? (Math.max(...lefts) - Math.min(...lefts) < 6) : null,
        allStartAligned: parts.every((p) => p.textAlign === 'start' || p.textAlign === 'left'),
      };
    });
  }
}
