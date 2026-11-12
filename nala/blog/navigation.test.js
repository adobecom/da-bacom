import { expect, test } from '@playwright/test';
import { features } from './navigation.spec.js';
import BlogNavigation from './navigation.page.js';

const miloLibs = process.env.MILO_LIBS || '';
const [regionFeature, regionalNavigationFeature, signInFeature, menuFeature, brandFeature, ctaFeature] = features;

test.describe('BACOM Blog Navigation Test Suite', () => {
  test.setTimeout(60000);

  for (const viewport of regionFeature.viewports) {
    test(`${regionFeature.name} ${viewport.name} ${regionFeature.tags}`, async ({ page, baseURL }) => {
      const navigation = new BlogNavigation(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await navigation.open(`${baseURL}${regionFeature.path}${miloLibs}`);

      await test.step('Open the language menu and verify its options', async () => {
        await navigation.openRegionMenu();
        await expect.soft(navigation.regionButton).toHaveAttribute('aria-expanded', 'true');
        for (const language of regionFeature.languages) {
          await expect(navigation.languageMenu.getByRole('option', { name: language, exact: true })).toBeVisible();
        }
      });

      await test.step('Close the menu using its desktop or mobile controls', async () => {
        if (viewport.name === 'mobile') {
          await navigation.languageMenu.press('Escape');
        } else {
          await navigation.regionButton.click();
        }
        await expect.soft(navigation.regionButton).toHaveAttribute('aria-expanded', 'false');
        await expect(navigation.languageMenu).toBeHidden();
      });
    });
  }

  test(`${regionalNavigationFeature.name} ${regionalNavigationFeature.tags}`, async ({ page, baseURL }) => {
    const navigation = new BlogNavigation(page);
    await navigation.open(`${baseURL}${regionalNavigationFeature.path}${miloLibs}`);
    await navigation.openRegionMenu();

    await test.step('Selecting Japanese opens a successful Japanese blog destination', async () => {
      const language = navigation.languageMenu.locator('a[href*="/jp/"]');
      await expect(language).toBeVisible();
      const [response] = await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        language.click(),
      ]);
      expect(response?.ok(), `The regional blog destination must load successfully (HTTP ${response?.status()})`).toBe(true);
      await expect(page).toHaveURL((url) => /^\/jp\/blog(?:\/|$)/.test(url.pathname));
      await expect(page.locator('main')).toBeVisible();
    });
  });

  test(`${signInFeature.name} ${signInFeature.tags}`, async ({ page, baseURL }) => {
    const navigation = new BlogNavigation(page);
    await navigation.open(`${baseURL}${signInFeature.path}${miloLibs}`);
    await navigation.openMainMenu();

    await test.step('Open the sign-in dropdown', async () => {
      await expect(navigation.signIn).toBeVisible({ timeout: 20000 });
      await navigation.signIn.click();
      await expect(navigation.signInDropdown).toBeVisible();
    });

    await test.step('Select the authored account destination and reach Adobe authentication', async () => {
      const link = navigation.signInDropdown.getByRole('link', { name: signInFeature.destinationName, exact: true });
      const destination = await navigation.followLink(link);
      await expect(destination).toHaveURL(
        (url) => /^(?:auth(?:-stg\d+)?\.services\.adobe\.com|(?:[^.]+\.)*adobelogin\.com)$/.test(url.hostname),
        { timeout: 15000 },
      );
    });
  });

  test(`${menuFeature.name} ${menuFeature.tags}`, async ({ page, baseURL }) => {
    const navigation = new BlogNavigation(page);
    await navigation.open(`${baseURL}${menuFeature.path}${miloLibs}`);
    await navigation.openMainMenu();

    await test.step('Open the Industries menu', async () => {
      const menu = navigation.header.getByRole('button', { name: menuFeature.menuName, exact: true });
      await menu.click();
      await expect(menu).toHaveAttribute('aria-expanded', 'true');
    });

    await test.step('Follow its authored Financial services destination', async () => {
      const link = navigation.header.getByRole('link', { name: menuFeature.destinationName, exact: true });
      await navigation.followLink(link);
    });
  });

  test(`${brandFeature.name} ${brandFeature.tags}`, async ({ page, baseURL }) => {
    const navigation = new BlogNavigation(page);
    await navigation.open(`${baseURL}${brandFeature.path}${miloLibs}`);

    await test.step('Follow the Adobe for Business brand link', async () => {
      await navigation.followLink(navigation.brand);
    });
  });

  test(`${ctaFeature.name} ${ctaFeature.tags}`, async ({ page, baseURL }) => {
    const navigation = new BlogNavigation(page);
    await navigation.open(`${baseURL}${ctaFeature.path}${miloLibs}`);
    await navigation.openMainMenu();

    await test.step('Follow the primary header CTA', async () => {
      await navigation.followLink(navigation.cta);
    });
  });
});
