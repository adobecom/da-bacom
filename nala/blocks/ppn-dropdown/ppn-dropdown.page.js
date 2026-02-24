import { expect } from '@playwright/test';

const DA_EDIT_BASE = 'https://da.live/edit?ref=md-form-block#/adobecom/da-bacom';

export default class PPNDropdown {
  constructor(page) {
    this.page = page;

    this.openLibraryButton = page.locator('div.open-library, [title="Open library"]');
    this.libraryPanel = page.locator('[class*="library-panel"], [class*="library"]:not(.open-library)').first();
    this.libraryMetadataItem = page.locator(
      'text=Metadata >> visible=true, '
      + '[class*="metadata-builder"], '
      + 'button:has-text("Metadata"), '
      + 'div:has-text("Metadata"):not(:has(div))',
    ).first();

    this.metadataBuilderDialog = page.locator(
      '[role="dialog"]:has-text("Metadata Builder"), [class*="da-library-metadata"]',
    ).first();
    this.metadataDialogCloseButton = page.locator('button:has-text("Close")');
    this.metadataDialogTitle = page.locator(
      'h1:has-text("Metadata Builder"), h2:has-text("Metadata Builder")',
    ).first();
    this.metadataTable = page.locator('table:has-text("metadata")');
    this.selectPropertyText = page.locator('button:has-text("Close")');
    this.metadataIframe = page.locator(
      '.da-library-type-plugin iframe, iframe[src*="md-formatter"]',
    ).first();

    this.propertyDropdownSelector = 'select.select-property';
    this.valueDropdownSelector = 'select.select-value';

    this.allDropdowns = page.locator('select');
    this.allNativeSelects = page.locator('select');

    this.addButton = page.locator(
      'button:has-text("+"), '
      + 'button[title*="add" i], '
      + '[aria-label*="add" i], '
      + 'button:has(svg[class*="plus"])',
    ).first();

    this.removeButton = page.locator(
      'button:has-text("-"), '
      + 'button[title*="remove" i], '
      + 'button[title*="delete" i], '
      + '[aria-label*="remove" i]',
    ).first();

    this.saveButton = page.locator(
      'button:has-text("Save"), '
      + 'button[title*="save" i], '
      + '[aria-label*="save" i]',
    ).first();

    this.propertyRows = page.locator('tr:has(td), [class*="row"]:has(select)');
    this.metadataFields = page.locator('td, [class*="field"]');

    this.errorMessage = page.locator(
      '[class*="error"], [class*="validation"], [role="alert"]',
    );
    this.requiredFieldError = page.locator('[class*="required"]');
    this.metadataBlock = page.locator('table:has-text("metadata")');

    this.placeholderProperty = 'Select property';
    this.placeholderValue = 'Select value';
  }

  static getEditUrl(pagePath) {
    return `${DA_EDIT_BASE}${pagePath}`;
  }

  async openMetadataBuilder() {
    await this.openLibraryButton.waitFor({ state: 'visible', timeout: 30000 });
    await this.openLibraryButton.click();
    await this.page.waitForTimeout(1000);

    const libraryPanel = this.page.locator('[class*="da-library"]').first();
    for (let i = 0; i < 10; i += 1) {
      await libraryPanel.press('End');
      await this.page.waitForTimeout(300);
    }
    await this.page.waitForTimeout(500);

    const metadataBuilderItem = this.page.getByText('Metadata Builder', { exact: true });
    const dialogCloseButton = this.page.locator('button:has-text("Close")');
    const dialogTitle = this.page.locator(
      'h1:has-text("Metadata Builder"), h2:has-text("Metadata Builder")',
    );

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await metadataBuilderItem.click({ force: true });
      await this.page.waitForTimeout(1500);

      const dialogOpened = await dialogCloseButton.isVisible().catch(() => false)
        || await dialogTitle.isVisible().catch(() => false);
      if (dialogOpened) break;
    }
  }

  getMetadataFrameLocator() {
    return this.page.frameLocator(
      '.da-library-type-plugin iframe, iframe[src*="md-formatter"]',
    );
  }

  getPropertyDropdown() {
    return this.getMetadataFrameLocator().locator(this.propertyDropdownSelector);
  }

  getValueDropdown() {
    return this.getMetadataFrameLocator().locator(this.valueDropdownSelector);
  }

  async selectProperty(propertyName) {
    await this.getPropertyDropdown().selectOption({ label: propertyName });
  }

  async selectValue(valueName) {
    await this.getValueDropdown().selectOption({ label: valueName });
  }

  async selectValueByIndex(index) {
    await this.valueDropdown.selectOption({ index });
  }

  async clickAddButton() {
    await this.addButton.click();
  }

  async clickRemoveButton(rowIndex = 0) {
    const btns = this.page.locator('.property-row button.remove, .property-row button:has-text("-")');
    await btns.nth(rowIndex).click();
  }

  async getPropertyOptions() {
    return this.getPropertyDropdown().locator('option').allTextContents();
  }

  async getValueOptions() {
    return this.getValueDropdown().locator('option').allTextContents();
  }

  async getSelectedProperty() {
    return this.propertyDropdown.inputValue();
  }

  async getSelectedValue() {
    return this.valueDropdown.inputValue();
  }

  async hasEmptyValueOptions() {
    const options = await this.getValueOptions();
    const empty = options.filter((opt, i) => {
      if (i === 0 && opt === this.placeholderValue) return false;
      return opt.trim() === '';
    });
    return empty.length > 0;
  }

  async countValidValueOptions() {
    const options = await this.getValueOptions();
    return options.filter((o) => o.trim() !== '' && o !== this.placeholderValue).length;
  }

  async attemptFreeTextInput(text) {
    await this.valueDropdown.focus();
    await this.page.keyboard.type(text);
  }

  async isValueDropdownSelect() {
    const tag = await this.valueDropdown.evaluate((el) => el.tagName.toLowerCase());
    return tag === 'select';
  }

  async addPropertyValuePair(property, value) {
    await this.selectProperty(property);
    await this.selectValue(value);
    await this.clickAddButton();
  }

  async verifyMetadataFieldValue(property, expectedValue) {
    const field = this.page.locator(`[data-property="${property}"]`);
    await expect(field).toContainText(expectedValue);
  }

  async getPropertyRowCount() {
    return this.propertyRows.count();
  }

  async saveMetadata() {
    await this.saveButton.click();
    await this.page.waitForTimeout(1000);
  }
}
