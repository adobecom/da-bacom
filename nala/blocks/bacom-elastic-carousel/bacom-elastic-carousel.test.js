import { expect, test } from '@playwright/test';
import { features } from './bacom-elastic-carousel.spec.js';
import ElasticCarousel from './bacom-elastic-carousel.page.js';

const miloLibs = process.env.MILO_LIBS || '';
const findFeature = (name) => features.find((f) => f.name === name);

const buildUrl = (baseURL, path) => {
  if (!miloLibs) return `${baseURL}${path}`;
  const sep = path.includes('?') ? '&' : '?';
  return `${baseURL}${path}${sep}${miloLibs.replace(/^[?&]/, '')}`;
};

test.describe('BACOM Elastic Carousel Block Test Suite', () => {
  test(`${findFeature('@elastic-carousel-structure').name} ${findFeature('@elastic-carousel-structure').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@elastic-carousel-structure');
    const carousel = new ElasticCarousel(page);

    await test.step('Go to test page', async () => {
      await page.goto(buildUrl(baseURL, feature.path));
      await page.waitForLoadState('domcontentloaded');
      await carousel.waitForReady();
    });

    await test.step('Renders items with header, media and footer', async () => {
      expect(await carousel.items.count()).toBeGreaterThanOrEqual(feature.expected.minSlides);
      await expect(carousel.firstHeader).toBeVisible();
      await expect(carousel.firstAsset).toBeVisible();
      await expect(carousel.firstToggle).toBeVisible();
      await expect(carousel.firstFooterChevron).toBeAttached();
    });
  });

  test(`${findFeature('@elastic-carousel-expand').name} ${findFeature('@elastic-carousel-expand').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@elastic-carousel-expand');
    const carousel = new ElasticCarousel(page);

    await test.step('Go to test page', async () => {
      await page.goto(buildUrl(baseURL, feature.path));
      await page.waitForLoadState('domcontentloaded');
      await carousel.waitForReady();
    });

    let collapsed;
    await test.step('Starts collapsed (description hidden, aria-expanded false)', async () => {
      await expect(carousel.firstToggle).toHaveAttribute('aria-expanded', 'false');
      collapsed = await carousel.expandState();
      expect(collapsed.contentVisible).toBe(false);
    });

    await test.step('Clicking the expand icon reveals the description and re-crops the image (AC)', async () => {
      await carousel.firstToggle.click();
      await expect(carousel.firstToggle).toHaveAttribute('aria-expanded', 'true');
      await expect
        .poll(async () => (await carousel.expandState()).contentVisible, { timeout: 5000 })
        .toBe(true);
      const expanded = await carousel.expandState();
      expect(expanded.assetHeight, 'image height re-crops (shrinks) to fit the revealed text')
        .toBeLessThan(collapsed.assetHeight);
    });

    await test.step('Clicking again collapses', async () => {
      await carousel.firstToggle.click();
      await expect(carousel.firstToggle).toHaveAttribute('aria-expanded', 'false');
    });
  });

  test(`${findFeature('@elastic-carousel-nav').name} ${findFeature('@elastic-carousel-nav').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@elastic-carousel-nav');
    const carousel = new ElasticCarousel(page);

    await test.step('Go to test page', async () => {
      await page.goto(buildUrl(baseURL, feature.path));
      await page.waitForLoadState('domcontentloaded');
      await carousel.waitForReady();
    });

    await test.step('Carousel controls render for >3 cards; Prev disabled at start', async () => {
      // Below tablet the design is swipe-based: the controls are rendered but
      // hidden, and nav is by swipe rather than arrows.
      if ((await page.viewportSize()).width < 768) {
        await expect(carousel.controls).toBeAttached();
      } else {
        await expect(carousel.controls).toBeVisible();
        await expect(carousel.prevArrow).toBeDisabled();
        await expect(carousel.nextArrow).toBeEnabled();
      }
    });

    if ((await page.viewportSize()).width >= 768) {
      await test.step('Clicking Next advances the carousel and enables Prev', async () => {
        await carousel.clickNext();
        await expect(carousel.prevArrow).toBeEnabled();
      });
    } else {
      await test.step('Mobile: full-width stacked cards, controls hidden', async () => {
        // Current mobile build stacks the cards vertically at full width
        // (single-column grid) and hides the arrow controls. NOTE: the earlier
        // QE note expected a swipe carousel on mobile — deviation to confirm.
        const layout = await carousel.viewport.evaluate((vp) => {
          const container = vp.querySelector('.elastic-carousel-container') || vp;
          const cards = [...container.querySelectorAll('.elastic-carousel-item')];
          return {
            count: cards.length,
            cardWidthPct: cards[0] ? Math.round((100 * cards[0].offsetWidth) / container.clientWidth) : null,
            stacked: cards.length > 1
              && cards[1].getBoundingClientRect().top >= cards[0].getBoundingClientRect().bottom - 4,
          };
        });
        expect(layout.count, 'all cards render').toBeGreaterThanOrEqual(3);
        expect(layout.cardWidthPct, 'cards are full width').toBeGreaterThan(90);
        expect(layout.stacked, 'cards stack vertically on mobile').toBe(true);
        await expect(carousel.controls).toBeHidden();
      });
    }
  });

  test(`${findFeature('@elastic-carousel-3up').name} ${findFeature('@elastic-carousel-3up').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@elastic-carousel-3up');
    const carousel = new ElasticCarousel(page);

    await test.step('Go to test page (desktop)', async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(buildUrl(baseURL, feature.path));
      await page.waitForLoadState('domcontentloaded');
      await carousel.waitForReady();
    });

    await test.step('Desktop shows a 3-up view (AC)', async () => {
      expect(await carousel.cardsPerView()).toBe(3);
    });
  });

  test(`${findFeature('@elastic-carousel-toggle-placement').name} ${findFeature('@elastic-carousel-toggle-placement').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@elastic-carousel-toggle-placement');
    const carousel = new ElasticCarousel(page);

    await test.step('Go to test page', async () => {
      await page.goto(buildUrl(baseURL, feature.path));
      await page.waitForLoadState('domcontentloaded');
      await carousel.waitForReady();
    });

    await test.step('Expand icon sits next to the headline (AC)', async () => {
      const placement = await carousel.togglePlacement();
      expect(placement, 'toggle + headline measurable').not.toBeNull();
      expect(placement.sameRow, 'toggle on the same row as the headline').toBe(true);
      expect(placement.toggleRightOfHeadline, 'toggle to the right of the headline').toBe(true);
    });
  });
});
