import { expect, test } from '@playwright/test';
import { features } from './article.spec.js';
import BlogArticle from './article.page.js';

const miloLibs = process.env.MILO_LIBS || '';
const [feature, contentFeature] = features;

test.describe('BACOM Blog Article Test Suite', () => {
  test(`${feature.name} ${feature.tags}`, async ({ page, baseURL }) => {
    const article = new BlogArticle(page);

    await test.step('Go to the blog article using the existing Nala base URL', async () => {
      await article.open(`${baseURL}${feature.path}${miloLibs}`);
    });

    await test.step('The automatic header preserves authored article information', async () => {
      expect(article.authored.hasAuthoredHeader, 'The fixture must exercise automatic article-header creation').toBe(false);
      expect(article.authored.title).toBeTruthy();
      expect(article.authored.date).toBeTruthy();
      await expect(page.locator('main h1')).toHaveCount(1);
      await expect(article.title).toHaveText(article.authored.title);
      await expect(article.author).toBeVisible();
      await expect(article.author).toHaveText(article.authored.author);
      await expect(article.date).toBeVisible();
      await expect(article.date).toHaveText(article.authored.date);
    });

    await test.step('The source blog behavior of hiding the category is preserved', async () => {
      await expect(article.category).toHaveText('');
    });
  });

  for (const viewport of contentFeature.viewports) {
    test(`${contentFeature.name} ${viewport.name} ${contentFeature.tags}`, async ({ page, baseURL }) => {
      const article = new BlogArticle(page);

      await test.step(`Open the blog article at the ${viewport.name} viewport`, async () => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await article.open(`${baseURL}${contentFeature.path}${miloLibs}`);
      });

      await test.step('The featured image loads successfully', async () => {
        await expect(article.image).toHaveCount(1);
        await article.image.scrollIntoViewIfNeeded();
        await expect(article.image).toBeVisible();
        await expect.poll(
          () => article.image.evaluate((img) => img.complete && img.naturalWidth > 0),
          { message: 'The featured article image must load successfully' },
        ).toBe(true);
      });

      await test.step('Article body text is visible', async () => {
        await expect(article.bodyParagraphs.first()).toBeVisible();
      });

      await test.step('The article fits the viewport without horizontal scrolling', async () => {
        await expect.poll(
          () => page.evaluate(() => (
            document.documentElement.scrollWidth - document.documentElement.clientWidth
          )),
          { message: `The article must fit the ${viewport.name} viewport` },
        ).toBeLessThanOrEqual(1);
      });
    });
  }
});
