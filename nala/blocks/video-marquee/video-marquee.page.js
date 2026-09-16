import { expect } from '@playwright/test';

/**
 * BACOM Video Marquee Block Page Object
 *
 * Targets the current version on the dedicated Nala page (MWPW-202482 + fixes
 * MWPW-204832). The video is embedded as an Adobe TV player iframe (not a native
 * <video>), so play/pause/mute/CC/volume are provided by that (cross-origin) player;
 * this suite verifies the embed configuration + layout, and leaves in-player control
 * interaction to manual/player-API checks.
 *
 * DOM: .video-marquee > .marquee-inner
 *        .marquee-content-row > .marquee-content (.marquee-eyebrow img · h1.marquee-headline · p.marquee-subcopy)
 *        .marquee-video-row > .marquee-media (rounded, overflow hidden) > .milo-video > iframe (video.tv.adobe.com)
 */
export default class VideoMarquee {
  constructor(page, blockSelector = '.video-marquee') {
    this.page = page;
    this.block = page.locator(blockSelector).first();
    this.eyebrow = this.block.locator('.marquee-eyebrow');
    this.logoImg = this.block.locator('.marquee-eyebrow img');
    this.headline = this.block.locator('.marquee-headline');
    this.subcopy = this.block.locator('.marquee-subcopy').first();
    // The integration page authors desktop + mobile media rows (and two embeds,
    // 9x16 portrait + 16x9 landscape); only the breakpoint-appropriate ones show.
    this.media = this.block.locator('.marquee-media').locator('visible=true').first();
    this.videoIframe = this.block.locator('.marquee-media iframe').locator('visible=true').first();
  }

  async waitForReady() {
    await this.block.waitFor({ state: 'attached' });
    await this.videoIframe.waitFor({ state: 'attached' });
  }

  /** Rounded corners + clipping on the video panel (AC: rounded corners). */
  async mediaStyle() {
    return this.media.evaluate((el) => {
      const s = getComputedStyle(el);
      return { radius: parseFloat(s.borderTopLeftRadius), overflow: s.overflow };
    });
  }

  /** Logo render geometry (AC: renders at spec size, not shrunk / distorted). */
  async logoGeometry() {
    return this.logoImg.evaluate((img) => {
      const r = img.getBoundingClientRect();
      const rendered = r.width / r.height;
      const natural = img.naturalWidth / img.naturalHeight;
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        // 5% relative tolerance: catches gross distortion, tolerates the
        // minor hard-sizing drift seen on the integration page (~4%).
        aspectPreserved: img.naturalWidth > 0
          ? Math.abs(rendered - natural) / natural < 0.05
          : null,
      };
    });
  }

  async iframeSrc() {
    return this.videoIframe.getAttribute('src');
  }

  /** Block width vs viewport, for the full-bleed background check. */
  async fullBleed() {
    return this.block.evaluate((el) => ({
      blockWidth: Math.round(el.getBoundingClientRect().width),
      viewportWidth: window.innerWidth,
    }));
  }
}
