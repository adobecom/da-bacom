import { expect, test } from '@playwright/test';
import { BASE_URLS } from '../../libs/config.js';
import { features } from './comparison.spec.js';
import BlogComparison, { compareLinks } from './comparison.page.js';

const miloLibs = process.env.MILO_LIBS || '';

test.describe('BACOM Blog Link Comparison Reports', () => {
  const [feature] = features;
  test.skip(process.env.BLOG_COMPARISONS !== '1', 'Set BLOG_COMPARISONS=1 to run the full legacy comparison inventory.');
  test.setTimeout(60000);

  for (const [index, path] of feature.paths.entries()) {
    test(`${feature.name} ${index + 1}: ${path} ${feature.tags}`, async ({ page, baseURL }, testInfo) => {
      const comparison = new BlogComparison(page);
      const baseline = await comparison.readLinks(new URL(path, BASE_URLS.main).href);
      const target = await comparison.readLinks(new URL(`${path}${miloLibs}`, baseURL).href);
      const differences = baseline.links && target.links ? compareLinks(baseline.links, target.links) : null;

      await testInfo.attach('link-comparison', {
        body: JSON.stringify({ baseline, target, differences }, null, 2),
        contentType: 'application/json',
      });

      if (baseline.status !== 404) expect(baseline.ok, `Baseline page returned HTTP ${baseline.status}`).toBe(true);
      if (target.status !== 404) expect(target.ok, `Target page returned HTTP ${target.status}`).toBe(true);
      test.skip(baseline.status === 404 || target.status === 404, 'The comparison page is not available in both environments; see the attached status report.');
    });
  }
});

test.describe('BACOM Blog Visual Comparison Reports', () => {
  const [, feature] = features;
  test.skip(process.env.BLOG_COMPARISONS !== '1', 'Set BLOG_COMPARISONS=1 to run the legacy visual comparison inventory.');
  test.setTimeout(90000);

  for (const { name, path } of feature.pages) {
    test(`${feature.name} ${name} ${feature.tags}`, async ({ page, baseURL }, testInfo) => {
      const comparison = new BlogComparison(page);
      const baseline = await comparison.capture(
        new URL(path, BASE_URLS.main).href,
        testInfo.outputPath('baseline.png'),
      );
      const target = await comparison.capture(
        new URL(`${path}${miloLibs}`, baseURL).href,
        testInfo.outputPath('target.png'),
      );

      await testInfo.attach('visual-comparison', {
        body: JSON.stringify({ baseline, target }, null, 2),
        contentType: 'application/json',
      });
      for (const [label, result] of [['baseline', baseline], ['target', target]]) {
        if (result.screenshot) {
          await testInfo.attach(label, { path: result.screenshot, contentType: 'image/png' });
        }
      }

      if (baseline.status !== 404) expect(baseline.ok, `Baseline page returned HTTP ${baseline.status}`).toBe(true);
      if (target.status !== 404) expect(target.ok, `Target page returned HTTP ${target.status}`).toBe(true);
      test.skip(baseline.status === 404 || target.status === 404, 'The comparison page is not available in both environments; see the attached status report.');
    });
  }
});
