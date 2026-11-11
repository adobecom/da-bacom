import { expect, test } from '@playwright/test';
import { features } from './article.spec.js';
import BlogArticle from './article.page.js';

const miloLibs = process.env.MILO_LIBS || '';
const [feature] = features;

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
});
