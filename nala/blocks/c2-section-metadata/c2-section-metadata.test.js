import { expect, test } from '@playwright/test';
import { features } from './c2-section-metadata.spec.js';
import C2SectionMetadata from './c2-section-metadata.page.js';

const miloLibs = process.env.MILO_LIBS || '';
const findFeature = (name) => features.find((f) => f.name === name);

const buildUrl = (baseURL, path) => {
  if (!miloLibs) return `${baseURL}${path}`;
  const sep = path.includes('?') ? '&' : '?';
  return `${baseURL}${path}${sep}${miloLibs.replace(/^[?&]/, '')}`;
};

test.describe('BACOM C2 Section Metadata Block Test Suite', () => {
  test(`${findFeature('@c2-section-metadata-style').name} ${findFeature('@c2-section-metadata-style').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@c2-section-metadata-style');
    const c2 = new C2SectionMetadata(page);
    const testPage = buildUrl(baseURL, feature.path);

    await test.step('Go to test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
      await c2.waitForReady();
    });

    await test.step('Style classes are applied to the owning section', async () => {
      // The block applies classes asynchronously after libs load, so poll the
      // class list until every expected style class is present.
      await expect
        .poll(async () => c2.sectionClassList(), { timeout: 5000 })
        .toEqual(expect.arrayContaining(feature.expected.styleClasses));
      // Spacing class is responsive (md desktop / xl mobile) — assert the variant.
      const classes = await c2.sectionClassList();
      const spacing = new RegExp(feature.expected.spacingPattern);
      expect(
        classes.some((c) => spacing.test(c)),
        `a spacing-* bottom variant is applied, got: ${classes.join(' ')}`,
      ).toBe(true);
    });
  });

  test(`${findFeature('@c2-section-metadata-background').name} ${findFeature('@c2-section-metadata-background').tags}`, async ({ page, baseURL }) => {
    const feature = findFeature('@c2-section-metadata-background');
    const c2 = new C2SectionMetadata(page);
    const testPage = buildUrl(baseURL, feature.path);

    await test.step('Go to test page', async () => {
      await page.goto(testPage);
      await page.waitForLoadState('domcontentloaded');
      await c2.waitForReady();
    });

    await test.step('Background metadata adds has-background and a background layer', async () => {
      await expect(c2.section).toHaveClass(/has-background/);
      await expect(c2.background.first()).toBeAttached();
    });
  });
});
