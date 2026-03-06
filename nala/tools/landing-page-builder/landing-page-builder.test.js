import { expect, test } from '@playwright/test';
import { features } from './landing-page-builder.spec.js';
import LandingPageBuilder from './landing-page-builder.page.js';

const LPB_REF = process.env.LPB_REF || 'stage';

test.use({ storageState: './nala/utils/auth.json' });

const toAutoSlug = (text) => text
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');
const DEV_JARGON = ['error code', 'stack trace', 'undefined', 'null reference', 'exception', 'status 4', 'status 5'];

let lpb;

test.describe('Landing Page Builder - Form & Field Tests', () => {
  test.beforeEach(async ({ page }) => {
    lpb = new LandingPageBuilder(page);
    await test.setTimeout(120 * 1000);
  });

  // =============================================================
  // 1.1 Core Options & Form Flow
  // =============================================================

  test(`${features[0].name}, ${features[0].tags}`, async () => {
    await test.step('Navigate to LPB with fresh state', async () => {
      await lpb.navigateFresh(LPB_REF);
    });

    await test.step('Verify page loads without auth or org access errors', async () => {
      const errorBanner = lpb.iframe.locator('.org-access-error, .auth-error, .error-banner');
      await expect(errorBanner).not.toBeVisible();
    });

    await test.step('Verify only Core Options section is visible', async () => {
      await expect(lpb.contentType).toBeVisible();
      await expect(lpb.gated).toBeVisible();
      await expect(lpb.marqueeHeadlineInput).toBeVisible();
    });

    await test.step('Verify Confirm button is visible but full form is hidden', async () => {
      await expect(lpb.confirmBtn).toBeVisible();
      expect(await lpb.isFullFormVisible()).toBe(false);
    });

    await test.step('Verify Save & Preview is NOT visible', async () => {
      await expect(lpb.savePreviewBtn).not.toBeVisible();
    });
  });

  test(`${features[1].name}, ${features[1].tags}`, async () => {
    await test.step('Navigate to LPB with fresh state', async () => {
      await lpb.navigateFresh(LPB_REF);
    });

    await test.step('Verify Confirm is disabled when content type is empty', async () => {
      const isDisabled = await lpb.confirmBtn.locator('button').getAttribute('disabled');
      expect(isDisabled).not.toBeNull();
    });

    await test.step('Fill only Content Type, verify still disabled', async () => {
      await lpb.selectContentType('Guide');
      const helpVisible = await lpb.helpText.isVisible();
      expect(helpVisible).toBe(true);
    });

    await test.step('Verify full form stays hidden', async () => {
      expect(await lpb.isFullFormVisible()).toBe(false);
    });
  });

  test(`${features[2].name}, ${features[2].tags}`, async () => {
    const { data } = features[2];

    await test.step('Navigate to LPB with fresh state', async () => {
      await lpb.navigateFresh(LPB_REF);
    });

    await test.step('Fill core options', async () => {
      await lpb.selectContentType(data.contentType);
      await lpb.selectGated(data.gated);
      await lpb.selectRegion(data.region);
      await lpb.fillMarqueeHeadline(data.headline);
    });

    await test.step('Verify path input is populated with correct prefix', async () => {
      const prefix = lpb.iframe.locator('.path-input-container .path-prefix');
      const prefixText = await prefix.textContent();
      expect(prefixText).toContain('resources');
      expect(prefixText.toLowerCase()).toContain(data.contentType.toLowerCase());
    });

    await test.step('Verify page name placeholder is auto-generated from headline', async () => {
      const placeholder = await lpb.iframe.locator('input.path-input[name="pageName"]').getAttribute('placeholder');
      expect(placeholder).toBe('nala-lpb-test-auto-url');
    });
  });

  test(`${features[3].name}, ${features[3].tags}`, async () => {
    const { data } = features[3];

    await test.step('Navigate and fill core options', async () => {
      await lpb.navigateFresh(LPB_REF);
      await lpb.fillCoreOptionsAndConfirm(data);
    });

    await test.step('Verify full form sections are visible', async () => {
      const headers = await lpb.getVisibleSectionHeaders();
      expect(headers).toContain('Marquee');
      expect(headers).toContain('Body');
      expect(headers).toContain('Card');
      expect(headers).toContain('CaaS Content');
      expect(headers).toContain('Metadata');
      expect(headers).toContain('Experience Fragment');
      expect(headers).toContain('Asset Delivery');
    });

    await test.step('Verify Save & Preview button is visible', async () => {
      await expect(lpb.savePreviewBtn).toBeVisible();
    });

    await test.step('Verify Reset button is visible and placed before Save & Preview', async () => {
      await expect(lpb.resetBtn).toBeVisible();
      const submitBox = await lpb.savePreviewBtn.boundingBox();
      const resetBox = await lpb.resetBtn.boundingBox();
      expect(submitBox).not.toBeNull();
      expect(resetBox).not.toBeNull();
      expect(submitBox.x).toBeGreaterThan(resetBox.x);
    });

    await test.step('Verify core options section is locked', async () => {
      expect(await lpb.isCoreOptionsLocked()).toBe(true);
    });
  });

  test(`${features[4].name}, ${features[4].tags}`, async () => {
    const { data } = features[4];

    await test.step('Navigate, fill core options, and confirm', async () => {
      await lpb.navigateFresh(LPB_REF);
      await lpb.fillCoreOptionsAndConfirm(data);
    });

    await test.step('Verify full form is visible', async () => {
      expect(await lpb.isFullFormVisible()).toBe(true);
    });

    await test.step('Click Reset Form', async () => {
      await lpb.clickReset();
    });

    await test.step('Verify form returns to initial state', async () => {
      expect(await lpb.isFullFormVisible()).toBe(false);
      await expect(lpb.confirmBtn).toBeVisible();
    });

    await test.step('Verify fields are cleared after refresh', async () => {
      await lpb.reloadPage();
      expect(await lpb.isFullFormVisible()).toBe(false);
    });
  });

  // =============================================================
  // 1.2 Required Field Validation
  // =============================================================

  test(`${features[5].name}, ${features[5].tags}`, async () => {
    const { data } = features[5];

    await test.step('Navigate, fill core options, and confirm', async () => {
      await lpb.navigateFresh(LPB_REF);
      await lpb.fillCoreOptionsAndConfirm(data);
    });

    await test.step('Click Save & Preview without filling required fields', async () => {
      await lpb.clickSaveAndPreview();
    });

    await test.step('Verify error toast appears', async () => {
      await lpb.waitForToast('Please complete all required fields', 'error');
    });

    await test.step('Verify required field errors are highlighted and user-friendly', async () => {
      const toastText = await lpb.toastError.first().textContent();
      for (const jargon of DEV_JARGON) {
        expect(toastText.toLowerCase()).not.toContain(jargon);
      }

      const errors = await lpb.fieldErrors.allTextContents();
      expect(errors.length).toBeGreaterThan(0);
      for (const errorText of errors) {
        for (const jargon of DEV_JARGON) {
          expect(errorText.toLowerCase()).not.toContain(jargon);
        }
      }
    });
  });

  test(`${features[6].name}, ${features[6].tags}`, async () => {
    const { data } = features[6];

    await test.step('Navigate, fill core options with Gated, and confirm', async () => {
      await lpb.navigateFresh(LPB_REF);
      await lpb.fillCoreOptionsAndConfirm(data);
    });

    await test.step('Verify Form section is visible for Gated', async () => {
      const headers = await lpb.getVisibleSectionHeaders();
      expect(headers).toContain('Form');
    });

    await test.step('Verify Form Template, Campaign ID, POI are visible', async () => {
      await expect(lpb.formTemplate).toBeVisible();
      await expect(lpb.campaignId).toBeVisible();
      await expect(lpb.marketoPOI).toBeVisible();
    });

    await test.step('Click Save & Preview without filling gated fields', async () => {
      await lpb.clickSaveAndPreview();
      await lpb.waitForToast('Please complete all required fields', 'error');
    });
  });

  // =============================================================
  // 1.3 Image Upload
  // =============================================================

  test(`${features[7].name}, ${features[7].tags}`, async () => {
    const { data } = features[7];

    await test.step('Navigate, fill core options, and confirm', async () => {
      await lpb.navigateFresh(LPB_REF);
      await lpb.fillCoreOptionsAndConfirm(data);
    });

    await test.step('Upload PNG to marquee image dropzone', async () => {
      await lpb.uploadMarqueeImage(data.imagePath);
    });

    await test.step('Verify image preview appears', async () => {
      await expect(lpb.marqueeImagePreview).toBeVisible({ timeout: 15000 });
    });

    await test.step('Verify success toast', async () => {
      await lpb.waitForToast('Image Uploaded', 'success');
    });
  });

  test(`${features[8].name}, ${features[8].tags}`, async () => {
    const { data } = features[8];

    await test.step('Navigate, fill core options, and confirm', async () => {
      await lpb.navigateFresh(LPB_REF);
      await lpb.fillCoreOptionsAndConfirm(data);
    });

    await test.step('Upload image', async () => {
      await lpb.uploadMarqueeImage(data.imagePath);
      await expect(lpb.marqueeImagePreview).toBeVisible({ timeout: 15000 });
    });

    await test.step('Delete uploaded image', async () => {
      await lpb.deleteMarqueeImage();
    });

    await test.step('Verify dropzone returns to empty state', async () => {
      await expect(lpb.marqueeImagePreview).not.toBeVisible();
      await expect(lpb.marqueeImageInput).toBeAttached();
    });

    await test.step('Re-upload a new image', async () => {
      await lpb.uploadMarqueeImage(data.imagePath);
      await expect(lpb.marqueeImagePreview).toBeVisible({ timeout: 15000 });
    });
  });

  // =============================================================
  // 1.4 PDF Upload
  // =============================================================

  test(`${features[9].name}, ${features[9].tags}`, async () => {
    const { data } = features[9];

    await test.step('Navigate, fill core options, and confirm', async () => {
      await lpb.navigateFresh(LPB_REF);
      await lpb.fillCoreOptionsAndConfirm(data);
    });

    await test.step('Upload PDF file', async () => {
      await lpb.uploadPdf(data.pdfPath);
    });

    await test.step('Verify PDF success toast', async () => {
      await lpb.waitForToast('PDF uploaded successfully', 'success', 30000);
    });

    await test.step('Verify file info with View/Clear links', async () => {
      await expect(lpb.pdfFileInfo).toBeVisible();
      await expect(lpb.pdfViewLink).toBeVisible();
      await expect(lpb.pdfClearLink).toBeVisible();
    });
  });

  test(`${features[10].name}, ${features[10].tags}`, async () => {
    const { data } = features[10];

    await test.step('Navigate, fill core options, and confirm', async () => {
      await lpb.navigateFresh(LPB_REF);
      await lpb.fillCoreOptionsAndConfirm(data);
    });

    await test.step('Upload PDF', async () => {
      await lpb.uploadPdf(data.pdfPath);
      await expect(lpb.pdfFileInfo).toBeVisible({ timeout: 30000 });
    });

    await test.step('Click Clear', async () => {
      await lpb.clearPdf();
    });

    await test.step('Verify PDF is cleared, upload input reappears', async () => {
      await expect(lpb.pdfFileInfo).not.toBeVisible();
      await expect(lpb.pdfFileInput).toBeAttached();
    });
  });

  test(`${features[11].name}, ${features[11].tags}`, async () => {
    const { data } = features[11];

    await test.step('Navigate, fill core options with Video/Demo, and confirm', async () => {
      await lpb.navigateFresh(LPB_REF);
      await lpb.fillCoreOptionsAndConfirm(data);
    });

    await test.step('Verify PDF upload is NOT visible', async () => {
      await expect(lpb.pdfFileInput).not.toBeVisible();
    });

    await test.step('Verify Video Asset input IS visible', async () => {
      await expect(lpb.videoAsset).toBeVisible();
    });
  });

  // =============================================================
  // 1.5 Multi-Select Products
  // =============================================================

  test(`${features[12].name}, ${features[12].tags}`, async () => {
    const { data } = features[12];

    await test.step('Navigate, fill core options, and confirm', async () => {
      await lpb.navigateFresh(LPB_REF);
      await lpb.fillCoreOptionsAndConfirm(data);
    });

    await test.step('Open products dropdown and select two products', async () => {
      await lpb.productsDropdownTrigger.click();
      await expect(lpb.productsDropdownMenu).toBeVisible();
      const options = lpb.productsDropdownMenu.locator('.dropdown-option');
      const count = await options.count();
      expect(count).toBeGreaterThan(0);

      await options.nth(0).click();
      await options.nth(1).click();
    });

    await test.step('Verify both appear as selected tags', async () => {
      const tags = lpb.primaryProducts.locator('.selected-tag');
      expect(await tags.count()).toBe(2);
    });

    await test.step('Verify dropdown shows checkmarks for selected', async () => {
      const selectedOptions = lpb.productsDropdownMenu.locator('.dropdown-option.selected');
      expect(await selectedOptions.count()).toBe(2);
    });
  });

  test(`${features[13].name}, ${features[13].tags}`, async () => {
    const { data } = features[13];

    await test.step('Navigate, fill core options, and confirm', async () => {
      await lpb.navigateFresh(LPB_REF);
      await lpb.fillCoreOptionsAndConfirm(data);
    });

    await test.step('Select two products', async () => {
      await lpb.productsDropdownTrigger.click();
      const options = lpb.productsDropdownMenu.locator('.dropdown-option');
      await options.nth(0).click();
      await options.nth(1).click();
      await lpb.iframe.locator('h1').first().click();
    });

    await test.step('Remove one tag by clicking X', async () => {
      const removeBtn = lpb.primaryProducts.locator('.selected-tag button').first();
      await removeBtn.click();
    });

    await test.step('Verify only one tag remains', async () => {
      const tags = lpb.primaryProducts.locator('.selected-tag');
      expect(await tags.count()).toBe(1);
    });
  });

  test(`${features[14].name}, ${features[14].tags}`, async () => {
    const { data } = features[14];

    await test.step('Navigate, fill core options, and confirm', async () => {
      await lpb.navigateFresh(LPB_REF);
      await lpb.fillCoreOptionsAndConfirm(data);
    });

    await test.step('Open products dropdown', async () => {
      await lpb.productsDropdownTrigger.click();
      await expect(lpb.productsDropdownMenu).toBeVisible();
    });

    await test.step('Select a product', async () => {
      const options = lpb.productsDropdownMenu.locator('.dropdown-option');
      await options.nth(0).click();
    });

    await test.step('Click outside to close dropdown', async () => {
      await lpb.iframe.locator('h1').first().click();
    });

    await test.step('Verify dropdown is closed but selection retained', async () => {
      const menuHidden = lpb.productsDropdownMenu.locator('.hidden');
      const tags = lpb.primaryProducts.locator('.selected-tag');
      expect(await tags.count()).toBe(1);
    });
  });

  // =============================================================
  // 1.6 Form State Persistence
  // =============================================================

  test(`${features[15].name}, ${features[15].tags}`, async () => {
    const { data } = features[15];

    await test.step('Navigate, fill core options, and confirm', async () => {
      await lpb.navigateFresh(LPB_REF);
      await lpb.fillCoreOptionsAndConfirm(data);
    });

    await test.step('Fill some form fields', async () => {
      await lpb.fillSeoTitle('Nala Persistence SEO Title');
      await lpb.fillSeoDescription('Nala Persistence SEO Description');
    });

    await test.step('Refresh the page', async () => {
      await lpb.reloadPage();
    });

    await test.step('Verify form fields are restored', async () => {
      const seoTitleVal = await lpb.seoTitle.locator('input').inputValue();
      expect(seoTitleVal).toBe('Nala Persistence SEO Title');

      const seoDescVal = await lpb.seoDescription.locator('input').inputValue();
      expect(seoDescVal).toBe('Nala Persistence SEO Description');
    });
  });

  test(`${features[16].name}, ${features[16].tags}`, async () => {
    const { data } = features[16];

    await test.step('Navigate, fill core options, and confirm', async () => {
      await lpb.navigateFresh(LPB_REF);
      await lpb.fillCoreOptionsAndConfirm(data);
    });

    await test.step('Fill some fields', async () => {
      await lpb.fillCardTitle('Nala Reset Card');
    });

    await test.step('Click Reset', async () => {
      await lpb.clickReset();
    });

    await test.step('Refresh page and verify form is empty', async () => {
      await lpb.reloadPage();
      expect(await lpb.isFullFormVisible()).toBe(false);
    });

    await test.step('Verify localStorage is cleared', async () => {
      const frame = lpb.getIframeFrame();
      const stored = await frame.evaluate(() => localStorage.getItem('landing-page-builder'));
      expect(stored).toBeNull();
    });
  });

  // =============================================================
  // 1.7 Rich Text Formatting
  // =============================================================

  test(`${features[17].name}, ${features[17].tags}`, async () => {
    const { data } = features[17];

    await test.step('Navigate, fill core options, and confirm', async () => {
      await lpb.navigateFresh(LPB_REF);
      await lpb.fillCoreOptionsAndConfirm(data);
    });

    await test.step('Click in body description editor and type text', async () => {
      await lpb.bodyEditorContent.click();
      await lpb.bodyEditorContent.pressSequentially('Bold text test');
    });

    await test.step('Select text and apply bold via Cmd+B', async () => {
      await lpb.bodyEditorContent.press('Meta+a');
      await lpb.bodyEditorContent.press('Meta+b');
    });

    await test.step('Verify bold formatting is applied', async () => {
      const html = await lpb.bodyEditorContent.innerHTML();
      expect(html).toMatch(/<(b|strong)>/);
    });
  });

  test(`${features[18].name}, ${features[18].tags}`, async () => {
    const { data } = features[18];

    await test.step('Navigate, fill core options, and confirm', async () => {
      await lpb.navigateFresh(LPB_REF);
      await lpb.fillCoreOptionsAndConfirm(data);
    });

    await test.step('Type text and apply italic via Cmd+I', async () => {
      await lpb.bodyEditorContent.click();
      await lpb.bodyEditorContent.pressSequentially('Italic text test');
      await lpb.bodyEditorContent.press('Meta+a');
      await lpb.bodyEditorContent.press('Meta+i');
    });

    await test.step('Verify italic formatting', async () => {
      const html = await lpb.bodyEditorContent.innerHTML();
      expect(html).toMatch(/<(i|em)>/);
    });
  });

  test(`${features[19].name}, ${features[19].tags}`, async () => {
    const { data } = features[19];

    await test.step('Navigate, fill core options, and confirm', async () => {
      await lpb.navigateFresh(LPB_REF);
      await lpb.fillCoreOptionsAndConfirm(data);
    });

    await test.step('Click bullet list button and type items', async () => {
      await lpb.bodyEditorContent.click();
      await lpb.applyBulletList();
      await lpb.bodyEditorContent.pressSequentially('First bullet');
      await lpb.bodyEditorContent.press('Enter');
      await lpb.bodyEditorContent.pressSequentially('Second bullet');
    });

    await test.step('Verify bullet list formatting', async () => {
      const html = await lpb.bodyEditorContent.innerHTML();
      expect(html).toContain('<ul>');
      expect(html).toContain('<li>');
    });
  });

  // =============================================================
  // 3.2 Template Link Regression
  // =============================================================

  test(`${features[20].name}, ${features[20].tags}`, async () => {
    const { data } = features[20];

    await test.step('Navigate to LPB with fresh state', async () => {
      await lpb.navigateFresh(LPB_REF);
    });

    await test.step('Select content type and gated option', async () => {
      await lpb.selectContentType(data.contentType);
      await lpb.selectGated(data.gated);
    });

    await test.step('Verify template preview link is visible', async () => {
      await expect(lpb.templatePreviewLink).toBeVisible({ timeout: 15000 });
    });

    await test.step('Verify link points to a real example on aem.live', async () => {
      const href = await lpb.templatePreviewLink.getAttribute('href');
      expect(href).toMatch(/aem\.live/);
      expect(href).not.toContain('placeholder');
    });
  });

  [21, 22, 23].forEach((featureIndex) => {
    test(`${features[featureIndex].name}, ${features[featureIndex].tags}`, async () => {
      const { data } = features[featureIndex];

      await test.step('Navigate to LPB with fresh state', async () => {
        await lpb.navigateFresh(LPB_REF);
      });

      await test.step('Fill core options for the selected region', async () => {
        await lpb.selectContentType(data.contentType);
        await lpb.selectGated(data.gated);
        await lpb.selectRegion(data.region);
        await lpb.fillMarqueeHeadline(data.headline);
      });

      await test.step('Verify page name input is enabled and auto-generated from the headline', async () => {
        await expect(lpb.pathInputField).toBeEnabled();
        const placeholder = await lpb.pathInputField.getAttribute('placeholder');
        expect(placeholder).toBe(toAutoSlug(data.headline));
      });

      await test.step('Verify the selected region is persisted in localStorage', async () => {
        const frame = lpb.getIframeFrame();
        const storedRegion = await frame.evaluate(() => JSON.parse(localStorage.getItem('landing-page-builder') || '{}').region);
        expect(storedRegion).toBe(data.storedRegion);
      });

      await test.step('Confirm and verify the form stays on the selected region after reload', async () => {
        await lpb.clickConfirm();
        await expect(lpb.savePreviewBtn).toBeVisible();
        await lpb.reloadPage();
        await expect(lpb.savePreviewBtn).toBeVisible();
        const selectedRegionLabel = await lpb.region.locator('select option:checked').textContent();
        expect(selectedRegionLabel.trim()).toBe(data.region);
      });
    });
  });
});
