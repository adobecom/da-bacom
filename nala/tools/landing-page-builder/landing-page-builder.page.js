import { expect } from '@playwright/test';

const DA_LIVE_URL = 'https://da.live';
const LPB_PATH = '/app/adobecom/da-bacom/tools/generator/landing-page';

export default class LandingPageBuilder {
  constructor(page) {
    this.page = page;
    this.lpbUrlOverride = process.env.LPB_URL || '';
  }

  initLocators(root) {
    // Root component
    this.generator = root.locator('da-generator');

    // Core Options
    this.coreOptionsSection = root.locator('.form-row.core-options');
    this.contentType = root.locator('sl-select[name="contentType"]');
    this.gated = root.locator('sl-select[name="gated"]');
    this.region = root.locator('sl-select[name="region"]');
    this.marqueeHeadlineInput = root.locator('sl-input[name="marqueeHeadline"]');
    this.pathInput = root.locator('path-input[name="pageName"]');
    this.pathInputField = root.locator('path-input[name="pageName"] input.path-input');
    this.pathCheckBtn = root.locator('path-input[name="pageName"] button.path-action-btn');
    this.pathAvailableIcon = root.locator('path-input[name="pageName"] svg.validation-icon.available');
    this.pathConflictIcon = root.locator('path-input[name="pageName"] svg.validation-icon.conflict');
    this.pathCheckingIcon = root.locator('path-input[name="pageName"] svg.validation-icon.checking');
    this.templatePreviewLink = this.coreOptionsSection.locator('a[href]').first();

    // Action buttons
    this.confirmBtn = root.locator('sl-button.confirm');
    this.savePreviewBtn = root.locator('sl-button[type="submit"]');
    this.resetBtn = root.locator('sl-button.reset');
    this.helpText = root.locator('p.help-text');

    // Form section (Gated only)
    this.formTemplate = root.locator('sl-select[name="formTemplate"]');
    this.campaignId = root.locator('sl-input[name="campaignId"]');
    this.marketoPOI = root.locator('sl-select[name="marketoPOI"]');

    // Marquee section
    this.marqueeSection = root.locator('.form-row').filter({ has: root.locator('h2', { hasText: 'Marquee' }) });
    this.marqueeEyebrow = root.locator('sl-select[name="marqueeEyebrow"]');
    this.marqueeDescription = root.locator('sl-input[name="marqueeDescription"]');
    this.marqueeImageDropzone = this.marqueeSection.locator('image-dropzone');
    this.marqueeImageInput = this.marqueeSection.locator('input.img-file-input');
    this.marqueeImagePreview = this.marqueeSection.locator('img[alt="preview image"]');
    this.marqueeImageDelete = this.marqueeSection.locator('.icon-delete');

    // Body section
    this.bodySection = root.locator('.form-row').filter({ has: root.locator('h2', { hasText: 'Body' }) });
    this.bodyDescription = root.locator('text-editor[name="bodyDescription"]');
    this.bodyEditorContent = root.locator('text-editor[name="bodyDescription"] .editor-content');
    this.bodyBoldBtn = root.locator('text-editor[name="bodyDescription"] .toolbar-btn.bold');
    this.bodyItalicBtn = root.locator('text-editor[name="bodyDescription"] .toolbar-btn.italic');
    this.bodyListBtn = root.locator('text-editor[name="bodyDescription"] .toolbar-btn.list');
    this.bodyImageDropzone = this.bodySection.locator('image-dropzone');
    this.bodyImageInput = this.bodySection.locator('input.img-file-input');

    // Card section
    this.cardSection = root.locator('.form-row').filter({ has: root.locator('h2', { hasText: 'Card' }) });
    this.cardTitle = root.locator('sl-input[name="cardTitle"]');
    this.cardDescription = root.locator('sl-input[name="cardDescription"]');
    this.cardImageDropzone = this.cardSection.locator('image-dropzone');
    this.cardImageInput = this.cardSection.locator('input.img-file-input');
    this.cardImagePreview = this.cardSection.locator('img[alt="preview image"]');

    // CaaS section
    this.primaryProducts = root.locator('multi-select[name="primaryProducts"]');
    this.productsDropdownTrigger = root.locator('multi-select[name="primaryProducts"] .selected-items');
    this.productsDropdownMenu = root.locator('multi-select[name="primaryProducts"] .dropdown-menu');
    this.industry = root.locator('sl-select[name="caasIndustry"]');

    // SEO Metadata section
    this.seoTitle = root.locator('sl-input[name="seoMetadataTitle"]');
    this.seoDescription = root.locator('sl-input[name="seoMetadataDescription"]');
    this.primaryProductName = root.locator('sl-select[name="primaryProductName"]');

    // Experience Fragment
    this.experienceFragment = root.locator('sl-select[name="experienceFragment"]');

    // Asset delivery
    this.videoAsset = root.locator('sl-input[name="videoAsset"]');
    this.pdfFileInput = root.locator('input.pdf-file-input');
    this.pdfFileInfo = root.locator('.file-info');
    this.pdfViewLink = root.locator('.file-info a:has-text("View")');
    this.pdfClearLink = root.locator('.file-info a:has-text("Clear")');

    // Toasts
    this.toast = root.locator('toast-message');
    this.toastSuccess = root.locator('toast-message .toast.success');
    this.toastError = root.locator('toast-message .toast.error');
    this.toastInfo = root.locator('toast-message .toast.info');
    this.toastWarning = root.locator('toast-message .toast.warning');
    this.previewLink = root.getByRole('link', { name: 'Open your preview' });

    // Error states
    this.fieldErrors = root.locator('.error-message');
    this.requiredFieldError = root.locator('.inputfield-error');

    // Section headers
    this.sectionHeaders = root.locator('.form-row h2');
  }

  getLPBUrl(ref = '') {
    if (this.lpbUrlOverride) {
      const url = new URL(this.lpbUrlOverride);
      if (ref && !url.searchParams.has('ref')) {
        url.searchParams.set('ref', ref);
      }
      return url.toString();
    }

    const params = ref ? `?ref=${ref}` : '';
    return `${DA_LIVE_URL}${LPB_PATH}${params}`;
  }

  async navigate(ref = '') {
    const url = this.getLPBUrl(ref);
    await this.page.goto(url);
    await this.page.waitForLoadState('domcontentloaded');
    if (await this.isDisclaimerVisible()) await this.dismissPopup();
    await this.initFrame();
  }

  async isDisclaimerVisible() {
    const iframe = this.page.locator('iframe');
    const disclaimer = this.page.locator('.disclaimer .nx-dialog');
    await iframe.or(disclaimer).first().waitFor({ state: 'visible', timeout: 10000 });
    return disclaimer.isVisible();
  }

  async dismissPopup() {
    const continueBtn = this.page.locator('.disclaimer sl-button[name="continue"]');
    try {
      await continueBtn.click({ timeout: 10000 });
    } catch {
      // No popup appeared, continue normally
    }
  }

  async initFrame() {
    if (this.lpbUrlOverride) {
      await this.page.locator('da-generator').waitFor({ state: 'attached', timeout: 30000 });
      this.iframe = this.page;
      this.initLocators(this.page);
      return;
    }

    await this.page.locator('iframe').waitFor({ state: 'attached', timeout: 30000 });
    this.iframe = this.page.frameLocator('iframe');
    this.initLocators(this.iframe);
  }

  getIframeFrame() {
    if (this.lpbUrlOverride) return this.page;
    return this.page.frames().find((f) => f.url().includes('aem.live') || f.url().includes('localhost'));
  }

  async reloadPage() {
    await this.page.reload();
    await this.page.waitForLoadState('domcontentloaded');
    if (await this.isDisclaimerVisible()) await this.dismissPopup();
    await this.initFrame();
  }

  async clearLocalStorage() {
    const frame = this.getIframeFrame();
    if (frame) {
      await frame.evaluate(() => localStorage.removeItem('landing-page-builder'));
    }
  }

  async navigateFresh(ref = '') {
    await this.navigate(ref);
    await this.clearLocalStorage();
    await this.page.reload();
    await this.page.waitForLoadState('domcontentloaded');
    if (await this.isDisclaimerVisible()) await this.dismissPopup();
    await this.initFrame();
  }

  // --- Core Options ---

  async selectContentType(value) {
    await this.contentType.locator('select').selectOption(value);
    await this.contentType.dispatchEvent('change');
  }

  async selectGated(value) {
    await this.gated.locator('select').selectOption(value);
    await this.gated.dispatchEvent('change');
  }

  async selectRegion(value) {
    await this.region.locator('select').selectOption(value);
    await this.region.dispatchEvent('change');
  }

  async fillMarqueeHeadline(text) {
    const input = this.marqueeHeadlineInput.locator('input');
    await input.fill(text);
    await input.dispatchEvent('input');
  }

  async fillPageName(text) {
    await this.pathInputField.fill(text);
    await this.pathInputField.dispatchEvent('input');
  }

  async clickPathCheck() {
    await this.pathCheckBtn.click();
  }

  async waitForPathAvailable() {
    await this.pathAvailableIcon.waitFor({ state: 'visible', timeout: 15000 });
  }

  async clickConfirm() {
    await this.confirmBtn.click({ force: true });
  }

  async fillCoreOptionsAndConfirm(data) {
    await this.selectContentType(data.contentType);
    await this.selectGated(data.gated);
    if (data.region) await this.selectRegion(data.region);
    await this.fillMarqueeHeadline(data.headline);
    if (data.pageSlug) {
      await this.fillPageName(data.pageSlug);
      await this.waitForPathAvailable();
    }
    await this.page.waitForTimeout(1000);
    await this.clickConfirm();
    await this.savePreviewBtn.waitFor({ state: 'visible', timeout: 10000 });
  }

  // --- Form Section (Gated) ---

  async selectFormTemplate(value) {
    await this.formTemplate.locator('select').selectOption(value);
    await this.formTemplate.dispatchEvent('change');
  }

  async fillCampaignId(value) {
    const input = this.campaignId.locator('input');
    await input.fill(value);
    await input.dispatchEvent('input');
  }

  async selectMarketoPOI(value) {
    await this.marketoPOI.locator('select').selectOption(value);
    await this.marketoPOI.dispatchEvent('change');
  }

  async fillFormSection(data) {
    if (data.formTemplate) await this.selectFormTemplate(data.formTemplate);
    if (data.campaignId) await this.fillCampaignId(data.campaignId);
    if (data.poi) await this.selectMarketoPOI(data.poi);
  }

  // --- Marquee Section ---

  async selectMarqueeEyebrow(value) {
    await this.marqueeEyebrow.locator('select').selectOption(value);
    await this.marqueeEyebrow.dispatchEvent('change');
  }

  async fillMarqueeDescription(text) {
    const input = this.marqueeDescription.locator('input');
    await input.fill(text);
    await input.dispatchEvent('input');
  }

  async uploadMarqueeImage(filePath) {
    await this.marqueeImageDropzone.scrollIntoViewIfNeeded();
    await this.marqueeImageInput.setInputFiles(filePath);
  }

  async deleteMarqueeImage() {
    await this.marqueeImageDelete.click();
  }

  // --- Body Section ---

  async fillBodyDescription(text) {
    await this.bodyEditorContent.click();
    await this.bodyEditorContent.fill(text);
  }

  async applyBoldFormatting() {
    await this.bodyBoldBtn.click();
  }

  async applyItalicFormatting() {
    await this.bodyItalicBtn.click();
  }

  async applyBulletList() {
    await this.bodyListBtn.click();
  }

  async uploadBodyImage(filePath) {
    await this.bodyImageInput.setInputFiles(filePath);
  }

  // --- Card Section ---

  async fillCardTitle(text) {
    const input = this.cardTitle.locator('input');
    await input.fill(text);
    await input.dispatchEvent('input');
  }

  async fillCardDescription(text) {
    const input = this.cardDescription.locator('input');
    await input.fill(text);
    await input.dispatchEvent('input');
  }

  async uploadCardImage(filePath) {
    await this.cardImageDropzone.scrollIntoViewIfNeeded();
    await this.cardImageInput.setInputFiles(filePath);
  }

  // --- CaaS Section ---

  async selectProducts(products) {
    await this.productsDropdownTrigger.click();
    await this.productsDropdownMenu.waitFor({ state: 'visible' });
    for (const product of products) {
      const option = this.productsDropdownMenu.locator(`.dropdown-option:has-text("${product}")`);
      await option.click();
    }
    await this.iframe.locator('h1').first().click();
  }

  async removeProductTag(product) {
    const tag = this.primaryProducts.locator(`.selected-tag:has-text("${product}") button`);
    await tag.click();
  }

  async getSelectedProducts() {
    const tags = this.primaryProducts.locator('.selected-tag');
    return tags.allTextContents();
  }

  async selectIndustry(value) {
    await this.industry.locator('select').selectOption(value);
    await this.industry.dispatchEvent('change');
  }

  // --- SEO Metadata ---

  async fillSeoTitle(text) {
    const input = this.seoTitle.locator('input');
    await input.fill(text);
    await input.dispatchEvent('input');
  }

  async fillSeoDescription(text) {
    const input = this.seoDescription.locator('input');
    await input.fill(text);
    await input.dispatchEvent('input');
  }

  async selectPrimaryProductName(value) {
    await this.primaryProductName.locator('select').selectOption(value);
    await this.primaryProductName.dispatchEvent('change');
  }

  // --- Experience Fragment ---

  async selectExperienceFragment(value) {
    await this.experienceFragment.locator('select').selectOption(value);
    await this.experienceFragment.dispatchEvent('change');
  }

  // --- Asset Delivery ---

  async fillVideoUrl(url) {
    const input = this.videoAsset.locator('input');
    await input.fill(url);
    await input.dispatchEvent('input');
  }

  async uploadPdf(filePath) {
    await this.pdfFileInput.setInputFiles(filePath);
  }

  async clearPdf() {
    await this.pdfClearLink.click();
  }

  async viewPdf() {
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page'),
      this.pdfViewLink.click(),
    ]);
    return newPage;
  }

  // --- Actions ---

  async clickSaveAndPreview() {
    await this.savePreviewBtn.click();
  }

  async clickReset() {
    await this.resetBtn.click();
  }

  async submitAndWaitForPreview() {
    const previewPagePromise = this.page.context()
      .waitForEvent('page', { timeout: 60000 })
      .catch(() => null);

    await this.clickSaveAndPreview();

    const previewPage = await previewPagePromise;
    if (previewPage) {
      await previewPage.waitForLoadState('domcontentloaded');
      return previewPage;
    }

    const previewLink = await this.waitForPreviewLink(30000);
    const href = await previewLink.getAttribute('href');
    const newPage = await this.page.context().newPage();
    await newPage.goto(href);
    await newPage.waitForLoadState('domcontentloaded');
    return newPage;
  }

  // --- Toast Verification ---

  async waitForToast(text, type = '', timeout = 10000) {
    const selector = type
      ? `toast-message .toast.${type}`
      : 'toast-message .toast';
    const toast = this.iframe.locator(selector).filter({ hasText: text });
    await toast.waitFor({ state: 'visible', timeout });
    return toast;
  }

  async verifyToastSequence(messages) {
    for (const { text, type } of messages) {
      await this.waitForToast(text, type, 30000);
    }
  }

  async waitForPreviewLink(timeout = 30000) {
    await this.previewLink.waitFor({ state: 'visible', timeout });
    return this.previewLink;
  }

  async waitForStoredField(fieldName, timeout = 30000) {
    await expect.poll(async () => {
      const frame = this.getIframeFrame();
      if (!frame) return '';
      return frame.evaluate(({ key, field }) => {
        const stored = localStorage.getItem(key);
        if (!stored) return '';

        const form = JSON.parse(stored);
        const value = form[field];
        if (!value) return '';
        if (typeof value === 'object') return value.url || value.name || '';
        return value;
      }, { key: 'landing-page-builder', field: fieldName });
    }, {
      timeout,
      intervals: [500, 1000, 2000],
    }).toBeTruthy();
  }

  // --- Validation Helpers ---

  async getVisibleSectionHeaders() {
    return this.sectionHeaders.allTextContents();
  }

  async isFullFormVisible() {
    return this.savePreviewBtn.isVisible();
  }

  async isCoreOptionsLocked() {
    const classes = await this.coreOptionsSection.getAttribute('class');
    return classes?.includes('locked') || false;
  }

  async getFieldError(fieldName) {
    const container = this.iframe.locator(`[name="${fieldName}"]`).locator('..');
    const error = container.locator('.error-message, .inputfield-error');
    if (await error.isVisible()) return error.textContent();
    return null;
  }

  async verifyRequiredFieldsHighlighted(fields) {
    for (const field of fields) {
      const element = this.iframe.locator(`[name="${field}"]`);
      const errorAttr = await element.getAttribute('error');
      expect(errorAttr).toBeTruthy();
    }
  }

  // --- Full Form Fill ---

  async fillCompleteForm(data) {
    if (data.gated === 'Gated') {
      await this.fillFormSection(data);
    }

    if (data.marqueeDescription) await this.fillMarqueeDescription(data.marqueeDescription);
    if (data.marqueeImage) await this.uploadMarqueeImage(data.marqueeImage);

    if (data.bodyDescription) await this.fillBodyDescription(data.bodyDescription);
    if (data.bodyImage) await this.uploadBodyImage(data.bodyImage);

    if (data.cardTitle) await this.fillCardTitle(data.cardTitle);
    if (data.cardDescription) await this.fillCardDescription(data.cardDescription);
    if (data.cardImage) await this.uploadCardImage(data.cardImage);

    if (data.products?.length) await this.selectProducts(data.products);
    if (data.industry) await this.selectIndustry(data.industry);

    if (data.seoTitle) await this.fillSeoTitle(data.seoTitle);
    if (data.seoDescription) await this.fillSeoDescription(data.seoDescription);
    if (data.primaryProductName) await this.selectPrimaryProductName(data.primaryProductName);

    if (data.experienceFragment) await this.selectExperienceFragment(data.experienceFragment);

    if (data.videoUrl) await this.fillVideoUrl(data.videoUrl);
    if (data.pdfAsset) await this.uploadPdf(data.pdfAsset);

    await this.page.waitForTimeout(2000);
  }
}
