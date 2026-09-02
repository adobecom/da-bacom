import { expect, test } from '@playwright/test';
import { features } from './bento-grid.spec.js';
import BentoGrid from './bento-grid.page.js';

const miloLibs = process.env.MILO_LIBS || '';
const findFeature = (name) => features.find((f) => f.name === name);

const buildUrl = (baseURL, path) => {
  if (!miloLibs) return `${baseURL}${path}`;
  const sep = path.includes('?') ? '&' : '?';
  return `${baseURL}${path}${sep}${miloLibs.replace(/^[?&]/, '')}`;
};

test.describe('BACOM Bento Grid Block Test Suite', () => {
  test(`${findFeature('@bento-grid-structure').name} ${findFeature('@bento-grid-structure').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@bento-grid-structure');
    const bento = new BentoGrid(page);
    const testPage = buildUrl(baseURL, feature.path);

    await test.step('Go to test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
      await bento.waitForReady();
    });

    await test.step('Block shell has region role and accessible label', async () => {
      await expect(bento.block).toHaveClass(/con-block/);
      await expect(bento.block).toHaveAttribute('role', feature.expected.role);
      await expect(bento.block).toHaveAttribute('aria-label', feature.expected.ariaLabel);
    });

    await test.step('All three responsive views render; the viewport-appropriate one is visible', async () => {
      await expect(bento.viewMobile).toBeAttached();
      await expect(bento.viewTablet).toBeAttached();
      await expect(bento.viewDesktop).toBeAttached();
      const view = await bento.activeView();
      await expect(view).toBeVisible();
      for (const other of [bento.viewMobile, bento.viewTablet, bento.viewDesktop].filter((v) => v !== view)) {
        await expect(other).toBeHidden();
      }
    });

    await test.step('Section header shows a heading and subtext', async () => {
      // Header may be authored in-block (dedicated pages) or as the text
      // section directly above the block (integration page).
      const header = await bento.sectionHeadingInfo();
      expect(header.heading, `section heading (${header.source})`).not.toBe('');
      expect(header.subtext, `section subtext (${header.source})`).not.toBe('');
    });

    if ((await page.viewportSize()).width >= 600) {
      await test.step('Featured video bento renders as a clickable video card', async () => {
        const view = await bento.activeView();
        const featured = view.locator('.bento-featured');
        await expect(featured).toBeVisible();
        await expect(featured).toHaveClass(/has-video/);
        await expect(featured).toHaveAttribute('href', /.+/);
        await expect(featured.locator('.bento-heading')).not.toBeEmpty();
        await expect(featured.locator('.grid-item-play')).toBeVisible();
        await expect(featured.locator('.bento-watch-link')).toBeVisible();
      });
    } else {
      await test.step('Mobile: the carousel leads with a video card (no separate featured)', async () => {
        const view = await bento.activeView();
        const first = view.locator('.grid-item').first();
        await expect(first).toHaveClass(/has-video/);
        await expect(first.locator('.bento-heading')).not.toBeEmpty();
        await expect(first.locator('.grid-item-play')).toBeVisible();
        await expect(first.locator('.bento-watch-link')).toBeVisible();
      });
    }

    await test.step('Carousel renders cards, each with a play icon and watch link', async () => {
      const view = await bento.activeView();
      const cardCount = await view.locator('.grid-carousel .grid-item').count();
      expect(cardCount).toBeGreaterThanOrEqual(feature.expected.minCards);
      await expect(view.locator('.grid-carousel .grid-item .grid-item-play')).toHaveCount(cardCount);
      await expect(view.locator('.grid-carousel .grid-item .bento-watch-link')).toHaveCount(cardCount);
      // Arrow controls are a desktop affordance (mobile is swipe-based per QE AC).
      if ((await bento.page.viewportSize()).width >= 1200) {
        await expect(view.locator('.grid-carousel-controls')).toBeVisible();
      }
    });
  });

  test(`${findFeature('@bento-grid-video-modal').name} ${findFeature('@bento-grid-video-modal').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@bento-grid-video-modal');
    const bento = new BentoGrid(page);
    const testPage = buildUrl(baseURL, feature.path);

    await test.step('Go to test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
      await bento.waitForReady();
    });

    await test.step('Clicking the featured video opens the video modal', async () => {
      await bento.openFeaturedVideo();
      await expect(bento.modal).toBeVisible();
      await expect(bento.modalVideo).toBeAttached();
      await expect(bento.modalError).toBeHidden();
    });

    await test.step('The modal plays the featured video', async () => {
      // Dedicated page: native <video><source> mp4. Integration page: the
      // fragment modal embeds the video as an adobetv iframe.
      const src = await bento.modalVideoSource();
      expect(src, 'modal video source (mp4 or embed)').toMatch(/.+/);
    });

    await test.step('Closing the modal removes it from the page', async () => {
      await bento.closeModal();
      await expect(bento.modal).toHaveCount(0);
    });
  });

  test(`${findFeature('@bento-grid-carousel-nav').name} ${findFeature('@bento-grid-carousel-nav').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@bento-grid-carousel-nav');
    const bento = new BentoGrid(page);
    const testPage = buildUrl(baseURL, feature.path);

    await test.step('Go to test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
      await bento.waitForReady();
    });

    if ((await page.viewportSize()).width >= 1200) {
      await test.step('Prev arrow starts disabled, Next arrow is enabled', async () => {
        await expect(bento.controls).toBeVisible();
        await expect(bento.prevArrow).toBeDisabled();
        await expect(bento.nextArrow).toBeEnabled();
      });

      await test.step('Clicking Next scrolls the carousel and enables Prev', async () => {
        await bento.clickNext();
        await expect(bento.prevArrow).toBeEnabled();
      });

      await test.step('Clicking Prev scrolls back toward the start', async () => {
        await bento.clickPrev();
      });
    } else {
      await test.step('Below desktop: single swipeable carousel without arrows (QE AC)', async () => {
        const view = await bento.activeView();
        const info = await view.evaluate((v) => {
          const container = v.querySelector('.grid-carousel-container');
          return { overflows: container.scrollWidth > container.clientWidth + 4 };
        });
        expect(info.overflows, 'carousel content overflows (swipeable)').toBe(true);
      });
    }
  });

  test(`${findFeature('@bento-grid-responsive').name} ${findFeature('@bento-grid-responsive').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@bento-grid-responsive');
    const bento = new BentoGrid(page);
    const testPage = buildUrl(baseURL, feature.path);

    await test.step('Go to test page (desktop)', async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
      await bento.waitForReady();
    });

    await test.step('Desktop shows the featured card + carousel controls', async () => {
      await expect(bento.viewDesktop).toBeVisible();
      await expect(bento.featured).toBeVisible();
    });

    await test.step('Mobile collapses to a single carousel with arrow controls', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(bento.viewMobile).toBeVisible();
      await expect(bento.viewDesktop).toBeHidden();
      expect(await bento.mobileGridItems.count()).toBeGreaterThan(0);
      await expect(bento.mobileControls.first()).toBeVisible();
    });
  });

  test(`${findFeature('@bento-grid-play-icon-topright').name} ${findFeature('@bento-grid-play-icon-topright').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@bento-grid-play-icon-topright');
    const bento = new BentoGrid(page);
    const testPage = buildUrl(baseURL, feature.path);

    await test.step('Go to test page (desktop)', async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
      await bento.waitForReady();
    });

    await test.step('Featured play icon sits in the top-right of the image (AC)', async () => {
      const p = await bento.playIconPlacement('featured');
      expect(p, 'featured icon + media measurable').not.toBeNull();
      expect(p.inRightHalf, 'featured play icon in right half').toBe(true);
      expect(p.inTopHalf, 'featured play icon in top half').toBe(true);
    });

    await test.step('Carousel card play icon sits in the top-right of the image (AC)', async () => {
      const p = await bento.playIconPlacement('card');
      expect(p, 'card icon + media measurable').not.toBeNull();
      expect(p.inRightHalf, 'card play icon in right half').toBe(true);
      expect(p.inTopHalf, 'card play icon in top half').toBe(true);
    });
  });

  test(`${findFeature('@bento-grid-partial-vs-full').name} ${findFeature('@bento-grid-partial-vs-full').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@bento-grid-partial-vs-full');
    const bento = new BentoGrid(page);
    const testPage = buildUrl(baseURL, feature.path);

    await test.step('Go to test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
      await bento.waitForReady();
    });

    await test.step('Desktop is a partial carousel (overflows; multiple cards visible) (AC)', async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      const d = await bento.desktopCarouselPartial();
      expect(d.overflows, 'carousel content overflows the viewport (scrollable)').toBe(true);
      expect(d.cardWidthPct, 'each card is well under full width (partial — multiple visible)').toBeLessThan(50);
    });

    await test.step('Mobile is a full-width single carousel with arrow controls', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      const m = await bento.mobileCarouselFull();
      expect(m.controls, 'mobile carousel exposes arrow controls').toBeGreaterThan(0);
      expect(m.overflows, 'mobile carousel is swipeable').toBe(true);
      expect(m.cardWidthPct, 'each mobile card is near full width').toBeGreaterThan(60);
    });
  });

  // SKIPPED — bento-grid is not ready yet: the ISWA Figma (node 950-1996) shows the
  // secondary cards with the same light-grey rounded-card background as the featured
  // card (mobile already matches; DESKTOP secondary cards are still transparent). The
  // card RADIUS fix has landed (@bento-grid-card-radius passes). Flip test.skip -> test
  // once the desktop grey background is implemented.
  test.skip(`${findFeature('@bento-grid-secondary-bg').name} ${findFeature('@bento-grid-secondary-bg').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@bento-grid-secondary-bg');
    const bento = new BentoGrid(page);
    const testPage = buildUrl(baseURL, feature.path);

    await test.step('Go to test page (desktop)', async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
      await bento.waitForReady();
    });

    await test.step('Desktop: secondary cards match the featured card grey background', async () => {
      const audit = await bento.cardStyleAudit('.view-desktop');
      expect(audit.secondaryBgIsGrey, `secondary bg should be light grey, got ${audit.secondaryBg}`).toBe(true);
      expect(audit.bgMatchesFeatured, `secondary bg ${audit.secondaryBg} should match featured ${audit.featuredBg}`).toBe(true);
    });

    await test.step('Mobile: the grey background carries through', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      const audit = await bento.cardStyleAudit('.view-mobile');
      expect(audit.secondaryBgIsGrey, `mobile secondary bg should be light grey, got ${audit.secondaryBg}`).toBe(true);
    });
  });

  // SPEC-LOCK (red until built): Figma-confirmed — see note above.
  test(`${findFeature('@bento-grid-card-radius').name} ${findFeature('@bento-grid-card-radius').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@bento-grid-card-radius');
    const bento = new BentoGrid(page);
    const testPage = buildUrl(baseURL, feature.path);

    await test.step('Go to test page (desktop)', async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
      await bento.waitForReady();
    });

    await test.step('Card corner radius matches the inner creative image radius', async () => {
      const audit = await bento.cardStyleAudit('.view-desktop');
      expect(
        audit.radiusMatchesImage,
        `card radius ${audit.cardRadius}px should match image radius ${audit.mediaRadius}px`,
      ).toBe(true);
    });
  });
});
