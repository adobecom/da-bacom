import { expect, test } from '@playwright/test';
import { features } from './bacom-carousel-c2.spec.js';
import CarouselC2 from './bacom-carousel-c2.page.js';

const miloLibs = process.env.MILO_LIBS || '';
const findFeature = (name) => features.find((f) => f.name === name);

const buildUrl = (baseURL, path) => {
  if (!miloLibs) return `${baseURL}${path}`;
  const sep = path.includes('?') ? '&' : '?';
  return `${baseURL}${path}${sep}${miloLibs.replace(/^[?&]/, '')}`;
};

test.describe('BACOM Carousel C2 Block Test Suite', () => {
  test(`${findFeature('@carousel-c2-structure').name} ${findFeature('@carousel-c2-structure').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@carousel-c2-structure');
    const c2 = new CarouselC2(page);

    await test.step('Go to test page', async () => {
      await page.goto(buildUrl(baseURL, feature.path));
      await page.waitForLoadState('domcontentloaded');
      await c2.waitForReady();
    });

    await test.step('Block renders with slides and an eyebrow', async () => {
      await expect(c2.block).toBeVisible();
      expect(await c2.slides.count()).toBeGreaterThanOrEqual(1);
      expect(await c2.eyebrows.count()).toBeGreaterThanOrEqual(1);
    });
  });

  test(`${findFeature('@carousel-c2-eyebrow-logo').name} ${findFeature('@carousel-c2-eyebrow-logo').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@carousel-c2-eyebrow-logo');
    const c2 = new CarouselC2(page);

    await test.step('Go to test page', async () => {
      await page.goto(buildUrl(baseURL, feature.path));
      await page.waitForLoadState('domcontentloaded');
      await c2.waitForReady();
    });

    await test.step('A logo image is authored in the eyebrow (AC)', async () => {
      await expect(c2.logoEyebrow).toBeVisible();
      await expect(c2.logoEyebrowImg).toBeAttached();
      await expect(c2.logoEyebrowImg).toHaveAttribute('src', /.+/);
    });
  });

  test(`${findFeature('@carousel-c2-eyebrow-stat').name} ${findFeature('@carousel-c2-eyebrow-stat').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@carousel-c2-eyebrow-stat');
    const c2 = new CarouselC2(page);

    await test.step('Go to test page', async () => {
      await page.goto(buildUrl(baseURL, feature.path));
      await page.waitForLoadState('domcontentloaded');
      await c2.waitForReady();
    });

    await test.step('A stat is authored in the eyebrow (AC)', async () => {
      await expect(c2.statEyebrow).toBeVisible();
      await expect(c2.statNumber).not.toBeEmpty();
      expect((await c2.statNumber.textContent())?.trim()).toMatch(/\d/);
      await expect(c2.statDescription).not.toBeEmpty();
    });
  });

  test(`${findFeature('@carousel-c2-left-aligned').name} ${findFeature('@carousel-c2-left-aligned').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@carousel-c2-left-aligned');
    const c2 = new CarouselC2(page);

    await test.step('Go to test page', async () => {
      await page.goto(buildUrl(baseURL, feature.path));
      await page.waitForLoadState('domcontentloaded');
      await c2.waitForReady();
    });

    await test.step('All content components are left aligned (AC)', async () => {
      const alignment = await c2.contentAlignment();
      expect(alignment.parts.length, 'measured multiple components').toBeGreaterThan(1);
      expect(alignment.allStartAligned, 'components use start/left text-align').toBe(true);
      expect(alignment.sharedLeftEdge, 'components share a left edge').toBe(true);
    });
  });
});
