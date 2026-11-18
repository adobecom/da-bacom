import { expect, test } from '@playwright/test';
import { features } from './article.spec.js';
import BlogArticle from './article.page.js';

const miloLibs = process.env.MILO_LIBS || '';
const [feature, contentFeature, recommendationsFeature, navigationFeature] = features;

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

  test(`${recommendationsFeature.name} ${recommendationsFeature.tags}`, async ({ page, baseURL }) => {
    const article = new BlogArticle(page);

    await test.step('Go to the blog article using the existing Nala base URL', async () => {
      await article.open(`${baseURL}${recommendationsFeature.path}${miloLibs}`);
    });

    await test.step('Recommendations render cards instead of an initialization error', async () => {
      await article.recommendations.scrollIntoViewIfNeeded();
      await expect(article.recommendations).toHaveAttribute('data-block-status', 'loaded', { timeout: 15000 });
      await expect(article.cards.first()).toBeVisible();
      await expect(article.recommendations.getByRole('alert')).toHaveCount(0);
    });

    await test.step('Each card has a visible title, a loaded image and a blog article link', async () => {
      for (const card of await article.cards.all()) {
        await expect(card.locator('h3')).toBeVisible();
        await expect(card.locator('h3')).toHaveText(/\S/);
        await expect(card).toHaveAttribute('href', /^\/blog\/.+/);

        const image = card.locator('.article-card-image picture img');
        await expect(image).toHaveCount(1);
        await image.scrollIntoViewIfNeeded();
        await expect(image).toBeVisible();
        await expect.poll(
          () => image.evaluate((img) => img.complete && img.naturalWidth > 0),
          { message: 'Recommended article images must load successfully' },
        ).toBe(true);
      }
    });

    await test.step('Selecting a card loads its linked article', async () => {
      const card = article.cards.first();
      const target = new URL(await card.getAttribute('href'), page.url()).href;
      const [response] = await Promise.all([
        page.waitForResponse((res) => (
          res.request().isNavigationRequest()
          && res.request().frame() === page.mainFrame()
          && (res.status() < 300 || res.status() >= 400)
        )),
        card.locator('h3').click(),
      ]);
      expect(response.ok(), `The recommended article must load successfully (HTTP ${response.status()})`).toBe(true);

      let request = response.request();
      while (request.redirectedFrom()) request = request.redirectedFrom();
      expect(request.url()).toBe(target);
      await expect(page).toHaveURL(response.url());
      await expect(page.locator('main h1')).toBeVisible();
    });
  });

  test(`${navigationFeature.name} ${navigationFeature.tags}`, async ({ page, baseURL }) => {
    const article = new BlogArticle(page);

    await test.step('Go to the blog article using the existing Nala base URL', async () => {
      await article.open(`${baseURL}${navigationFeature.path}${miloLibs}`);
    });

    for (const [name, block] of [['navigation', article.nav], ['footer', article.footer]]) {
      await test.step(`BACOM ${name} contains a visible, enabled destination link`, async () => {
        await block.scrollIntoViewIfNeeded();
        await expect(block).toBeVisible();
        const link = block.locator('a[href]:not([href=""]):not([href^="#"]):not([href^="javascript:" i]):visible').first();
        await expect(link).toBeVisible({ timeout: 15000 });
        await expect(link).toBeEnabled();
        const destination = new URL(await link.getAttribute('href'), page.url());
        expect(['http:', 'https:']).toContain(destination.protocol);
      });
    }
  });
});
