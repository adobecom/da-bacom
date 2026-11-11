import { expect } from '@playwright/test';

export default class BlogArticle {
  constructor(page) {
    this.page = page;
    this.header = page.locator('main .article-header');
    this.title = this.header.locator('.article-title h1');
    this.author = this.header.locator('.article-author');
    this.date = this.header.locator('.article-date');
    this.category = this.header.locator('.article-category');
  }

  async open(url) {
    const response = await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    expect(response?.ok(), `The blog article must be accessible to the test browser (HTTP ${response?.status()})`).toBe(true);

    this.authored = await this.page.evaluate((html) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return {
        hasAuthoredHeader: Boolean(doc.querySelector('main .article-header, main .blog-header')),
        title: doc.querySelector('main h1')?.textContent.trim(),
        author: doc.querySelector('meta[name="author"]')?.content || 'Adobe Communications Team',
        date: doc.querySelector('meta[name="publication-date"]')?.content,
      };
    }, await response.text());

    await expect(this.header).toHaveAttribute('data-block-status', 'loaded', { timeout: 15000 });
  }
}
