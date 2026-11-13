import { expect } from '@playwright/test';

export default class BlogNavigation {
  constructor(page) {
    this.page = page;
    this.header = page.locator('header.global-navigation');
    this.footer = page.locator('footer.global-footer, footer.bacom-global-footer');
    this.menuToggle = this.header.getByRole('button', { name: 'Navigation menu', exact: true });
    this.brand = this.header.locator('a.feds-brand');
    this.cta = this.header.locator('a.feds-cta--primary:visible').first();
    this.signIn = this.header.getByRole('button', { name: /^sign in$/i }).first();
    this.signInDropdown = this.header.locator('.feds-signIn-dropdown');
    this.regionButton = this.footer.locator('.feds-regionPicker');
    this.languageMenu = this.footer.getByRole('listbox');
  }

  async open(url) {
    const response = await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    expect(response?.ok(), `The blog fixture must be accessible (HTTP ${response?.status()})`).toBe(true);
    await expect(this.header).toHaveAttribute('data-block-status', 'loaded', { timeout: 15000 });
    await expect(this.brand).toBeVisible();
  }

  async openMainMenu() {
    if (await this.menuToggle.isVisible()) {
      if (await this.menuToggle.getAttribute('aria-expanded') !== 'true') {
        await this.menuToggle.click();
      }
      await expect(this.menuToggle).toHaveAttribute('aria-expanded', 'true');
    }
  }

  async openRegionMenu() {
    await this.footer.scrollIntoViewIfNeeded();
    await expect(this.regionButton).toHaveAttribute('aria-controls', 'language-selector-listbox', { timeout: 15000 });
    await this.regionButton.click();
    await expect(this.languageMenu).toBeVisible();
  }

  async followLink(link) {
    await expect(link).toBeVisible({ timeout: 15000 });
    await expect(link).toBeEnabled();
    const start = this.page.url();
    const target = new URL(await link.getAttribute('href'), start);
    expect(['http:', 'https:']).toContain(target.protocol);
    target.hash = '';
    const destinationPage = await link.getAttribute('target') === '_blank'
      ? this.page.waitForEvent('popup')
      : Promise.resolve(this.page);

    // Context responses cover both current-tab navigation and authored popup links.
    const [response, destination] = await Promise.all([
      this.page.context().waitForEvent('response', {
        timeout: 30000,
        predicate: (res) => {
          if (!res.request().isNavigationRequest()) return false;
          if (res.status() >= 300 && res.status() < 400) return false;
          let request = res.request();
          while (request.redirectedFrom()) request = request.redirectedFrom();
          return request.url() === target.href;
        },
      }),
      destinationPage,
      link.click(),
    ]);

    expect(response.ok(), `The linked destination must load successfully (HTTP ${response.status()})`).toBe(true);
    await destination.waitForLoadState('domcontentloaded');
    await expect(destination).toHaveURL((url) => {
      url.hash = '';
      return url.href === response.url();
    });
    await expect(destination).not.toHaveURL(start);
    return destination;
  }
}
