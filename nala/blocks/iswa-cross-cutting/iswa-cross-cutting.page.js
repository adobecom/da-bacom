import { expect } from '@playwright/test';

/**
 * ISWA Cross-cutting Page Object
 *
 * Page-level (not block-level) checks that only make sense on the assembled ISWA
 * page: content-column alignment, footer height, nav, and the mobile marquee gutter.
 * Covers the cross-cutting fix tickets MWPW-204904 / 205058 / 205025 / (205271 partial).
 * Target: the Nala copy of the finished page (public on stage), which authors all
 * five blocks + the real global nav/footer.
 */
export default class IswaCrossCutting {
  constructor(page) {
    this.page = page;
    this.marquee = page.locator('.video-marquee').first();
    this.nav = page.locator('header.global-navigation').first();
    this.footer = page.locator('footer.global-footer').first();
    this.footerLink = this.footer.locator('a').first();
  }

  /** Wait for the blocks + the lazily-loaded global footer to populate. */
  async waitForReady() {
    await this.marquee.waitFor({ state: 'attached' });
    await this.footerLink.waitFor({ state: 'attached', timeout: 20000 });
    await expect
      .poll(async () => this.footer.evaluate((el) => Math.round(el.getBoundingClientRect().height)), { timeout: 15000 })
      .toBeGreaterThan(150);
  }

  static async height(locator) {
    return locator.evaluate((el) => Math.round(el.getBoundingClientRect().height));
  }

  /** Left/right margins of a content wrapper within the viewport. */
  async margins(selector) {
    return this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { width: Math.round(r.width), left: Math.round(r.x), right: Math.round(window.innerWidth - r.right) };
    }, selector);
  }

  /** Bounding box of the marquee (for the mobile full-width / no-gutter check). */
  async marqueeBox() {
    return this.marquee.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { left: Math.round(r.x), right: Math.round(r.right), width: Math.round(r.width), viewport: window.innerWidth };
    });
  }
}
