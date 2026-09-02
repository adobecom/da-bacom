import { expect } from '@playwright/test';

/**
 * Bento Grid Block Page Object
 *
 * Covers the enhanced bento-grid block (MWPW-202490 / PR #203):
 *  - Featured video bento (eyebrow "Featured video" + play icon top-right)
 *  - Responsive views: single swipeable carousel on mobile, featured + partial
 *    carousel on tablet/desktop (three .grid-view elements are always rendered,
 *    CSS shows only the one matching the viewport)
 *  - Carousel arrow controls (shown only when > 3 cards) with disabled states
 *  - Click-to-play video modal (#bento-grid-video-modal)
 *
 * The block always builds .view-mobile / .view-tablet / .view-desktop; the
 * desktop-scoped locators below are what a desktop project (da-bacom-live-chromium)
 * actually sees. Viewport-dependent assertions live in the responsive test, which
 * resizes the page explicitly.
 */
export default class BentoGrid {
  constructor(page, blockSelector = '.bento-grid') {
    this.page = page;

    // Block root + decorated shell
    this.block = page.locator(blockSelector);
    this.foreground = this.block.locator('.foreground');

    // The three viewport-specific views
    this.viewMobile = this.block.locator('.grid-view.view-mobile');
    this.viewTablet = this.block.locator('.grid-view.view-tablet');
    this.viewDesktop = this.block.locator('.grid-view.view-desktop');

    // Desktop view is the reference view for structural assertions
    const desktop = this.viewDesktop;

    // Section header
    this.sectionHeader = desktop.locator('.bento-section-header');
    this.sectionHeading = desktop.locator('.bento-section-heading');
    this.sectionSubtext = desktop.locator('.bento-section-subtext');

    // Featured video bento
    this.featured = desktop.locator('.bento-featured');
    this.featuredEyebrow = this.featured.locator('.bento-eyebrow');
    this.featuredHeading = this.featured.locator('.bento-heading');
    this.featuredPlayIcon = this.featured.locator('.grid-item-play');
    this.featuredWatchLink = this.featured.locator('.bento-watch-link');

    // Carousel
    this.carousel = desktop.locator('.grid-carousel');
    this.carouselContainer = desktop.locator('.grid-carousel-container');
    this.gridItems = desktop.locator('.grid-carousel .grid-item');
    this.gridItemPlayIcons = desktop.locator('.grid-carousel .grid-item .grid-item-play');
    this.gridItemWatchLinks = desktop.locator('.grid-carousel .grid-item .bento-watch-link');

    // Carousel controls
    this.controls = desktop.locator('.grid-carousel-controls');
    this.prevArrow = desktop.locator('.grid-carousel-arrow-prev');
    this.nextArrow = desktop.locator('.grid-carousel-arrow-next');

    // Video modal. Two authoring modes:
    //  - dedicated pages: block-built mp4 modal (#bento-grid-video-modal)
    //  - integration page: fragment modal (data-modal-path -> .dialog-modal#<hash>,
    //    embeds the video as an adobetv iframe), appended to <body>
    this.modal = page.locator('.dialog-modal, #bento-grid-video-modal, .grid-video-modal');
    this.modalVideo = this.modal.locator('video, iframe');
    this.modalError = this.modal.locator('.grid-video-modal-error');
    this.modalClose = this.modal.locator('.dialog-close');

    // Mobile-view carousel (used by the responsive test)
    this.mobileGridItems = this.viewMobile.locator('.grid-carousel .grid-item');
    this.mobileControls = this.viewMobile.locator('.grid-carousel-controls');
  }

  /**
   * The responsive view matching the current viewport (block CSS breakpoints:
   * mobile < 600px, tablet 600–1199px, desktop >= 1200px).
   */
  async activeView() {
    const width = (await this.page.viewportSize())?.width ?? 1440;
    if (width < 600) return this.viewMobile;
    if (width < 1200) return this.viewTablet;
    return this.viewDesktop;
  }

  /**
   * Wait until the block has finished decorating (foreground + a rendered view).
   */
  async waitForReady() {
    await this.block.waitFor({ state: 'attached' });
    await this.foreground.waitFor({ state: 'visible' });
    const view = await this.activeView();
    await view.locator('.grid-item').first().waitFor({ state: 'visible' });
  }

  /**
   * Section heading + subtext, wherever the page authors them:
   *  - in-block `.bento-section-header` (dedicated pages), or
   *  - a text section directly above the block (integration page).
   */
  async sectionHeadingInfo() {
    return this.block.evaluate((root) => {
      const inBlock = root.querySelector('.bento-section-header');
      if (inBlock) {
        return {
          source: 'in-block',
          heading: inBlock.querySelector('.bento-section-heading')?.textContent.trim() || '',
          subtext: inBlock.querySelector('.bento-section-subtext')?.textContent.trim() || '',
        };
      }
      const prev = root.closest('.section')?.previousElementSibling;
      return {
        source: 'adjacent-section',
        heading: prev?.querySelector('h1,h2,h3')?.textContent.trim() || '',
        subtext: prev?.querySelector('p')?.textContent.trim() || '',
      };
    });
  }

  /**
   * Source URL of the media playing inside the open modal (native <video>
   * source on dedicated pages, adobetv iframe src on the integration page).
   */
  async modalVideoSource() {
    return this.modal.evaluate((m) => {
      const video = m.querySelector('video');
      if (video) return video.querySelector('source')?.src || video.src || '';
      return m.querySelector('iframe')?.src || '';
    });
  }

  /**
   * Current horizontal scroll offset of the desktop carousel container.
   */
  async getScrollLeft() {
    return this.carouselContainer.evaluate((el) => el.scrollLeft);
  }

  /**
   * Click the Next arrow and wait for the carousel to actually move.
   */
  async clickNext() {
    const before = await this.getScrollLeft();
    await this.nextArrow.click();
    await expect
      .poll(async () => this.getScrollLeft(), { timeout: 5000 })
      .toBeGreaterThan(before);
  }

  /**
   * Click the Prev arrow and wait for the carousel to move back.
   */
  async clickPrev() {
    const before = await this.getScrollLeft();
    await this.prevArrow.click();
    await expect
      .poll(async () => this.getScrollLeft(), { timeout: 5000 })
      .toBeLessThan(before);
  }

  /**
   * Open the video modal: the featured bento on tablet/desktop, the first video
   * card on mobile (the mobile view has no separate featured card).
   */
  async openFeaturedVideo() {
    const view = await this.activeView();
    await view.locator('.bento-featured, .grid-item.has-video').first().click();
    await this.modal.waitFor({ state: 'visible' });
    await this.modalVideo.waitFor({ state: 'attached' });
  }

  /**
   * Close the currently open video modal.
   */
  async closeModal() {
    await this.modalClose.click();
    await this.modal.waitFor({ state: 'detached' });
  }

  /**
   * Placement of a play icon relative to its media box (AC: top-right of the image).
   * @param {'featured'|'card'} kind
   */
  async playIconPlacement(kind) {
    const sel = kind === 'featured'
      ? { media: '.view-desktop .bento-featured .bento-featured-media', icon: '.view-desktop .bento-featured .grid-item-play' }
      : { media: '.view-desktop .grid-carousel .grid-item .grid-item-media', icon: '.view-desktop .grid-carousel .grid-item .grid-item-play' };
    return this.block.evaluate((root, s) => {
      const media = root.querySelector(s.media);
      const icon = root.querySelector(s.icon);
      if (!media || !icon) return null;
      const i = icon.getBoundingClientRect();
      const m = media.getBoundingClientRect();
      return {
        inRightHalf: (i.left + (i.width / 2)) > (m.left + (m.width / 2)),
        inTopHalf: (i.top + (i.height / 2)) < (m.top + (m.height / 2)),
      };
    }, sel);
  }

  /** Desktop carousel geometry (AC: partial carousel that peeks the next card). */
  async desktopCarouselPartial() {
    return this.viewDesktop.evaluate((view) => {
      const container = view.querySelector('.grid-carousel-container');
      const cards = [...view.querySelectorAll('.grid-carousel .grid-item')];
      const rightEdge = container.getBoundingClientRect().right;
      const partialPeek = cards.some((c) => {
        const r = c.getBoundingClientRect();
        return r.left < rightEdge - 4 && r.right > rightEdge + 4;
      });
      return {
        overflows: container.scrollWidth > container.clientWidth + 4,
        partialPeek,
        cardWidthPct: Math.round((100 * cards[0].offsetWidth) / container.clientWidth),
      };
    });
  }

  /** Mobile carousel geometry (full-width single carousel; now expects arrows too). */
  async mobileCarouselFull() {
    return this.viewMobile.evaluate((view) => {
      const container = view.querySelector('.grid-carousel-container');
      const cards = [...view.querySelectorAll('.grid-carousel .grid-item')];
      return {
        controls: view.querySelectorAll('.grid-carousel-controls').length,
        cardWidthPct: cards[0] ? Math.round((100 * cards[0].offsetWidth) / container.clientWidth) : null,
        overflows: container.scrollWidth > container.clientWidth + 4,
      };
    });
  }

  /**
   * Background + corner-radius audit for the secondary-card enhancement:
   *  - secondary card background should match the featured card's subtle light grey
   *  - card corner radius should match the inner creative image's radius
   */
  async cardStyleAudit(viewSelector) {
    return this.block.evaluate((root, viewSel) => {
      const view = root.querySelector(viewSel) || root;
      const bg = (el) => (el ? getComputedStyle(el).backgroundColor : null);
      const radius = (el) => (el ? parseFloat(getComputedStyle(el).borderTopLeftRadius) : null);
      const isOpaqueGrey = (color) => {
        const m = color && color.match(/rgba?\(([^)]+)\)/);
        if (!m) return false;
        const [r, g, b, a = '1'] = m[1].split(',').map((s) => parseFloat(s));
        return Number(a) > 0 && Math.abs(r - g) < 8 && Math.abs(g - b) < 8 && r > 205 && r < 252;
      };
      const featured = view.querySelector('.bento-featured');
      const card = view.querySelector('.grid-item');
      const media = view.querySelector('.grid-item .grid-item-media');
      return {
        featuredBg: bg(featured),
        secondaryBg: bg(card),
        bgMatchesFeatured: !!featured && !!card && bg(card) === bg(featured),
        secondaryBgIsGrey: isOpaqueGrey(bg(card)),
        cardRadius: radius(card),
        mediaRadius: radius(media),
        radiusMatchesImage: radius(card) !== null && radius(media) !== null && radius(card) === radius(media),
      };
    }, viewSelector);
  }
}
