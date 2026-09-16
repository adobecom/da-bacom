import { expect, test } from '@playwright/test';
import { features } from './iswa-cross-cutting.spec.js';
import IswaCrossCutting from './iswa-cross-cutting.page.js';

const miloLibs = process.env.MILO_LIBS || '';
const findFeature = (name) => features.find((f) => f.name === name);

const buildUrl = (baseURL, path) => {
  if (!miloLibs) return `${baseURL}${path}`;
  const sep = path.includes('?') ? '&' : '?';
  return `${baseURL}${path}${sep}${miloLibs.replace(/^[?&]/, '')}`;
};

test.describe('ISWA Cross-cutting Test Suite', () => {
  test(`${findFeature('@iswa-footer-not-squished').name} ${findFeature('@iswa-footer-not-squished').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@iswa-footer-not-squished');
    const iswa = new IswaCrossCutting(page);

    await test.step('Go to the assembled ISWA page', async () => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(buildUrl(baseURL, feature.path));
      await page.waitForLoadState('domcontentloaded');
      await iswa.waitForReady();
    });

    await test.step('Global footer renders at a standard (not squished) height (AC)', async () => {
      const height = await IswaCrossCutting.height(iswa.footer);
      expect(height, `footer height ${height}px should be a full footer, not squished`).toBeGreaterThan(200);
    });
  });

  test(`${findFeature('@iswa-nav-renders').name} ${findFeature('@iswa-nav-renders').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@iswa-nav-renders');
    const iswa = new IswaCrossCutting(page);

    await test.step('Go to the assembled ISWA page', async () => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(buildUrl(baseURL, feature.path));
      await page.waitForLoadState('domcontentloaded');
      await iswa.waitForReady();
    });

    await test.step('Standard global navigation renders (AC)', async () => {
      await expect(iswa.nav).toBeVisible();
      const height = await IswaCrossCutting.height(iswa.nav);
      expect(height, 'nav has a real height').toBeGreaterThan(40);
    });
  });

  test(`${findFeature('@iswa-content-alignment').name} ${findFeature('@iswa-content-alignment').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@iswa-content-alignment');
    const iswa = new IswaCrossCutting(page);

    await test.step('Go to the assembled ISWA page (large desktop)', async () => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(buildUrl(baseURL, feature.path));
      await page.waitForLoadState('domcontentloaded');
      await iswa.waitForReady();
    });

    await test.step('Blocks share a common content-column left edge (AC)', async () => {
      const marquee = await iswa.margins('.video-marquee .marquee-inner');
      const resource = await iswa.margins('.resource-showcase .resource-showcase-content');
      const bento = await iswa.margins('.bento-grid .foreground');
      const lefts = [marquee, resource, bento].filter(Boolean).map((m) => m.left);
      expect(lefts.length, 'content wrappers measurable').toBeGreaterThan(1);
      expect(Math.max(...lefts) - Math.min(...lefts), `shared left edge, got lefts ${lefts}`).toBeLessThan(8);
    });

    await test.step('Centered blocks have equal left/right margins (AC)', async () => {
      const resource = await iswa.margins('.resource-showcase .resource-showcase-content');
      const bento = await iswa.margins('.bento-grid .foreground');
      [resource, bento].filter(Boolean).forEach((m) => {
        expect(Math.abs(m.left - m.right), `equal margins (left ${m.left} vs right ${m.right})`).toBeLessThan(8);
      });
    });
  });

  test(`${findFeature('@iswa-mobile-marquee-full-width').name} ${findFeature('@iswa-mobile-marquee-full-width').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@iswa-mobile-marquee-full-width');
    const iswa = new IswaCrossCutting(page);

    await test.step('Go to the assembled ISWA page (mobile)', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(buildUrl(baseURL, feature.path));
      await page.waitForLoadState('domcontentloaded');
      await iswa.marquee.waitFor({ state: 'visible' });
    });

    await test.step('Mobile marquee spans the full viewport width, no right gutter (AC)', async () => {
      const box = await iswa.marqueeBox();
      expect(box.left, 'flush to the left edge').toBeLessThanOrEqual(1);
      expect(box.right, `spans to the right edge (right ${box.right} vs viewport ${box.viewport})`)
        .toBeGreaterThanOrEqual(box.viewport - 1);
    });
  });
});
