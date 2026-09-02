import { expect, test } from '@playwright/test';
import { features } from './resource-showcase.spec.js';
import ResourceShowcase from './resource-showcase.page.js';

const miloLibs = process.env.MILO_LIBS || '';
const findFeature = (name) => features.find((f) => f.name === name);

const buildUrl = (baseURL, path) => {
  if (!miloLibs) return `${baseURL}${path}`;
  const sep = path.includes('?') ? '&' : '?';
  return `${baseURL}${path}${sep}${miloLibs.replace(/^[?&]/, '')}`;
};

test.describe('BACOM Resource Showcase Block Test Suite', () => {
  test(`${findFeature('@resource-showcase-structure').name} ${findFeature('@resource-showcase-structure').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@resource-showcase-structure');
    const resource = new ResourceShowcase(page);
    const testPage = buildUrl(baseURL, feature.path);

    await test.step('Go to test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
      await resource.waitForReady();
    });

    await test.step('Section heading renders', async () => {
      await expect(resource.heading).toBeVisible();
      await expect(resource.heading).not.toBeEmpty();
    });

    await test.step('Featured card renders image, title, description and a chevron CTA', async () => {
      await expect(resource.featured).toBeVisible();
      await expect(resource.featuredImage).toBeVisible();
      await expect(resource.featuredTitle).not.toBeEmpty();
      await expect(resource.featuredCta).toBeVisible();
      await expect(resource.featuredChevron).toBeAttached();
    });

    await test.step('Secondary list renders at least one item', async () => {
      await expect(resource.list).toBeVisible();
      expect(await resource.items.count()).toBeGreaterThanOrEqual(feature.expected.minItems);
    });
  });

  test(`${findFeature('@resource-showcase-featured-link').name} ${findFeature('@resource-showcase-featured-link').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@resource-showcase-featured-link');
    const resource = new ResourceShowcase(page);
    const testPage = buildUrl(baseURL, feature.path);

    await test.step('Go to test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
      await resource.waitForReady();
    });

    await test.step('Featured card is a link labelled by its title', async () => {
      const tag = await resource.featured.evaluate((el) => el.tagName);
      expect(tag).toBe('A');
      await expect(resource.featured).toHaveAttribute('href', /.+/);
      const title = (await resource.featuredTitle.textContent())?.trim();
      await expect(resource.featured).toHaveAttribute('aria-label', title);
    });
  });

  test(`${findFeature('@resource-showcase-secondary-items').name} ${findFeature('@resource-showcase-secondary-items').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@resource-showcase-secondary-items');
    const resource = new ResourceShowcase(page);
    const testPage = buildUrl(baseURL, feature.path);

    await test.step('Go to test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
      await resource.waitForReady();
    });

    await test.step('Each secondary item has a title, a chevron CTA and an authored href', async () => {
      const itemCount = await resource.items.count();
      expect(itemCount).toBeGreaterThan(0);
      await expect(resource.itemTitles).toHaveCount(itemCount);
      await expect(resource.itemCtas).toHaveCount(itemCount);
      const chevrons = resource.block.locator('.resource-showcase-item .resource-showcase-cta .resource-showcase-chevron');
      await expect(chevrons).toHaveCount(itemCount);
      const hrefs = await resource.itemCtas.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
      expect(hrefs).toHaveLength(itemCount);
      hrefs.forEach((href) => expect(href, 'CTA has an authored destination').toBeTruthy());
    });
  });

  test(`${findFeature('@resource-showcase-featured-image-top').name} ${findFeature('@resource-showcase-featured-image-top').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@resource-showcase-featured-image-top');
    const resource = new ResourceShowcase(page);
    const testPage = buildUrl(baseURL, feature.path);

    await test.step('Go to test page', async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
      await resource.waitForReady();
    });

    await test.step('Featured image sits above the title/description/CTA body (AC)', async () => {
      const imageBeforeBody = await resource.featured.evaluate((el) => {
        const kids = [...el.children];
        const img = el.querySelector('.resource-showcase-featured-image');
        const body = el.querySelector('.resource-showcase-featured-body');
        return !!(img && body && kids.indexOf(img) < kids.indexOf(body));
      });
      expect(imageBeforeBody, 'image before body in DOM order').toBe(true);
      const lay = await resource.layout();
      expect(lay.image.y, 'image rendered above body').toBeLessThan(lay.body.y);
    });

    await test.step('Featured image is served responsively (picture sources)', async () => {
      await expect(resource.featuredImg).toHaveAttribute('src', /.+/);
      const srcsets = await resource.featuredPictureSources
        .evaluateAll((els) => els.map((e) => e.getAttribute('srcset')).filter(Boolean));
      expect(srcsets.length, 'featured <picture> exposes responsive <source srcset>').toBeGreaterThan(0);
    });
  });

  test(`${findFeature('@resource-showcase-responsive').name} ${findFeature('@resource-showcase-responsive').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@resource-showcase-responsive');
    const resource = new ResourceShowcase(page);
    const testPage = buildUrl(baseURL, feature.path);

    await test.step('Go to test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
      await resource.waitForReady();
    });

    await test.step('Desktop: featured and list are side by side', async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      const lay = await resource.layout();
      expect(lay.list.x, 'list column is right of the featured column')
        .toBeGreaterThan(lay.featured.x + (lay.featured.w / 2));
    });

    await test.step('Below tablet: single column, featured card first (AC)', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      const lay = await resource.layout();
      expect(lay.featured.y, 'featured above list').toBeLessThan(lay.list.y);
      expect(lay.list.y, 'list stacks below featured').toBeGreaterThanOrEqual(lay.featured.bottom - 5);
      expect(Math.abs(lay.list.x - lay.featured.x), 'shared left edge = one column').toBeLessThan(40);
    });
  });

  test(`${findFeature('@resource-showcase-a11y').name} ${findFeature('@resource-showcase-a11y').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@resource-showcase-a11y');
    const resource = new ResourceShowcase(page);
    const testPage = buildUrl(baseURL, feature.path);

    await test.step('Go to test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
      await resource.waitForReady();
    });

    await test.step('Exactly one section heading, rendered as H2', async () => {
      await expect(resource.heading).toHaveCount(1);
      expect(await ResourceShowcase.tagOf(resource.heading)).toBe('H2');
    });

    await test.step('Secondary item titles are H3 headings', async () => {
      const count = await resource.itemTitles.count();
      expect(count).toBeGreaterThan(0);
      const tags = await resource.itemTitles.evaluateAll(
        (els) => [...new Set(els.map((e) => e.tagName))],
      );
      expect(tags).toEqual(['H3']);
    });

    await test.step('Featured image exposes authorable alt text', async () => {
      await expect(resource.featuredImg).toHaveAttribute('alt', /.*/);
    });

    await test.step('Featured card is keyboard-focusable', async () => {
      await resource.featured.focus();
      await expect(resource.featured).toBeFocused();
    });
  });
});
