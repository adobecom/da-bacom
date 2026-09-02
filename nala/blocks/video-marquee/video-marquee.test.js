import { expect, test } from '@playwright/test';
import { features } from './video-marquee.spec.js';
import VideoMarquee from './video-marquee.page.js';

const miloLibs = process.env.MILO_LIBS || '';
const findFeature = (name) => features.find((f) => f.name === name);

const buildUrl = (baseURL, path) => {
  if (!miloLibs) return `${baseURL}${path}`;
  const sep = path.includes('?') ? '&' : '?';
  return `${baseURL}${path}${sep}${miloLibs.replace(/^[?&]/, '')}`;
};

test.describe('BACOM Video Marquee Block Test Suite', () => {
  test(`${findFeature('@video-marquee-structure').name} ${findFeature('@video-marquee-structure').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@video-marquee-structure');
    const marquee = new VideoMarquee(page);

    await test.step('Go to test page', async () => {
      await page.goto(buildUrl(baseURL, feature.path));
      await page.waitForLoadState('domcontentloaded');
      await marquee.waitForReady();
    });

    await test.step('Left content (eyebrow logo, headline, subcopy) + right video panel', async () => {
      await expect(marquee.logoImg).toBeVisible();
      await expect(marquee.headline).not.toBeEmpty();
      await expect(marquee.subcopy).toBeVisible();
      await expect(marquee.media).toBeVisible();
      await expect(marquee.videoIframe).toBeAttached();
    });
  });

  test(`${findFeature('@video-marquee-embed').name} ${findFeature('@video-marquee-embed').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@video-marquee-embed');
    const marquee = new VideoMarquee(page);

    await test.step('Go to test page', async () => {
      await page.goto(buildUrl(baseURL, feature.path));
      await page.waitForLoadState('domcontentloaded');
      await marquee.waitForReady();
    });

    await test.step('Video embed autoplays and exposes captions (AC)', async () => {
      const src = await marquee.iframeSrc();
      expect(src, 'Adobe TV video embed').toMatch(/video\.tv\.adobe\.com/);
      expect(src, 'autoplays on load').toMatch(/autoplay=true/);
      expect(src, 'captions (CC) enabled').toMatch(/captions=/);
    });
  });

  test(`${findFeature('@video-marquee-rounded').name} ${findFeature('@video-marquee-rounded').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@video-marquee-rounded');
    const marquee = new VideoMarquee(page);

    await test.step('Go to test page', async () => {
      await page.goto(buildUrl(baseURL, feature.path));
      await page.waitForLoadState('domcontentloaded');
      await marquee.waitForReady();
    });

    await test.step('Video panel has rounded corners and clips content (AC)', async () => {
      const style = await marquee.mediaStyle();
      expect(style.radius, 'rounded corners').toBeGreaterThan(0);
      expect(style.overflow, 'clips to the rounded panel').not.toBe('visible');
    });
  });

  test(`${findFeature('@video-marquee-logo').name} ${findFeature('@video-marquee-logo').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@video-marquee-logo');
    const marquee = new VideoMarquee(page);

    await test.step('Go to test page', async () => {
      await page.goto(buildUrl(baseURL, feature.path));
      await page.waitForLoadState('domcontentloaded');
      await marquee.waitForReady();
    });

    await test.step('Eyebrow logo renders at a real size with preserved aspect ratio (AC)', async () => {
      const logo = await marquee.logoGeometry();
      expect(logo.w, 'logo not collapsed').toBeGreaterThan(60);
      expect(logo.h, 'logo not collapsed').toBeGreaterThan(12);
      expect(logo.aspectPreserved, 'aspect ratio preserved (not distorted)').toBe(true);
    });
  });

  test(`${findFeature('@video-marquee-full-bleed').name} ${findFeature('@video-marquee-full-bleed').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@video-marquee-full-bleed');
    const marquee = new VideoMarquee(page);

    await test.step('Go to test page at large desktop', async () => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(buildUrl(baseURL, feature.path));
      await page.waitForLoadState('domcontentloaded');
      await marquee.waitForReady();
    });

    await test.step('Marquee spans the full browser width (no white side gutters) (AC)', async () => {
      const { blockWidth, viewportWidth } = await marquee.fullBleed();
      expect(blockWidth, `block ${blockWidth}px should span viewport ${viewportWidth}px`)
        .toBeGreaterThanOrEqual(viewportWidth - 2);
    });
  });
});
