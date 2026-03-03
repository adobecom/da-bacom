import { expect } from '@playwright/test';

/**
 * Progressive Profiling Form Page Object
 * Handles form field interactions and validations for progressive profiling tests
 *
 * =============================================================================
 * FORM FIELD SPECIFICATIONS
 * =============================================================================
 *
 * Essential / Short (flex_content):
 * - First name (FirstName)
 * - Last name (LastName)
 * - Business email (Email)
 * - Organization name (mktoFormsCompany)
 * - Country (Country)
 * - Company type* (mktoFormsCompanyType) - Depends on POI
 *
 * Expanded / Medium (flex_event):
 * - First name (FirstName)
 * - Last name (LastName)
 * - Business email (Email)
 * - Job title or role (mktoFormsJobTitle)
 * - Department (mktoFormsFunctionalArea)
 * - Organization name (mktoFormsCompany)
 * - Country (Country)
 * - Company type* (mktoFormsCompanyType) - Depends on POI
 *
 * Full / Long (flex_contact / RFI):
 * - First name (FirstName)
 * - Last name (LastName)
 * - Business email (Email)
 * - Business phone (Phone)
 * - Job Title or role (mktoFormsJobTitle)
 * - Department (mktoFormsFunctionalArea)
 * - Organization name (mktoFormsCompany)
 * - Country (Country)
 * - State/province (State)
 * - Zip/postal code (PostalCode)
 * - Primary product of interest (mktoFormsPrimaryProductInterest)
 *
 * =============================================================================
 * PROGRESSIVE PROFILING RULES
 * =============================================================================
 *
 * Previously collected fields become HIDDEN on subsequent forms:
 * - Short → Medium: firstName, lastName, company become HIDDEN
 * - Short → RFI: firstName, lastName, company become HIDDEN
 * - Medium → RFI: firstName, lastName, company, jobTitle, department become HIDDEN
 */
export default class ProgressiveProfilingForm {
  constructor(page) {
    this.page = page;
    this.marketo = this.page.locator('.marketo');

    // ==========================================================================
    // Core fields (Short/Essential form - flex_content)
    // ==========================================================================
    this.email = this.marketo.locator('input[name="Email"]');
    this.firstName = this.marketo.locator('input[name="FirstName"]');
    this.lastName = this.marketo.locator('input[name="LastName"]');
    this.company = this.marketo.locator('input[name="mktoFormsCompany"]');
    this.country = this.marketo.locator('select[name="Country"]');

    // ==========================================================================
    // Medium/Expanded form fields (flex_event) - additional fields
    // ==========================================================================
    this.jobTitle = this.marketo.locator('select[name="mktoFormsJobTitle"]');
    this.functionalArea = this.marketo.locator('select[name="mktoFormsFunctionalArea"]');

    // ==========================================================================
    // RFI/Full form fields (flex_contact) - additional fields
    // ==========================================================================
    this.phone = this.marketo.locator('input[name="Phone"]');
    this.state = this.marketo.locator('select[name="State"]');
    this.postalCode = this.marketo.locator('input[name="PostalCode"]');
    this.primaryProductInterest = this.marketo.locator('select[name="mktoFormsPrimaryProductInterest"]');

    // ==========================================================================
    // Conditional field (depends on POI)
    // ==========================================================================
    this.companyType = this.marketo.locator('select[name="mktoFormsCompanyType"]');

    // ==========================================================================
    // Form elements
    // ==========================================================================
    this.submitButton = this.marketo.locator('#mktoButton_new');
    this.formTitle = this.marketo.locator('.marketo-title');
    this.formDescription = this.marketo.locator('.marketo-description');
    this.errorMessage = this.marketo.locator('.msg-error');

    this.fieldMap = {
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      company: this.company,
      country: this.country,
      jobTitle: this.jobTitle,
      functionalArea: this.functionalArea,
      phone: this.phone,
      state: this.state,
      postalCode: this.postalCode,
      primaryProductInterest: this.primaryProductInterest,
      companyType: this.companyType,
    };
  }

  async waitForFormLoad() {
    await this.marketo.waitFor({ state: 'visible', timeout: 30000 });
    await this.email.waitFor({ state: 'visible', timeout: 30000 });
  }

  async getFormTemplate() {
    const template = await this.page.evaluate(
      'window.mcz_marketoForm_pref?.form?.template',
    );
    return template || 'unknown';
  }

  async getPOI() {
    const poi = await this.page.evaluate(
      'window.mcz_marketoForm_pref?.program?.poi',
    );
    return poi || '';
  }

  async isFieldVisible(fieldName) {
    const field = this.fieldMap[fieldName];
    if (!field) {
      console.warn(`[PP] Unknown field: ${fieldName}`);
      return false;
    }

    try {
      const isVisible = await field.isVisible({ timeout: 5000 });
      return isVisible;
    } catch {
      return false;
    }
  }

  async isFieldHidden(fieldName) {
    return !(await this.isFieldVisible(fieldName));
  }

  async isFieldPrefilled(fieldName) {
    const field = this.fieldMap[fieldName];
    if (!field) {
      console.warn(`[PP] Unknown field: ${fieldName}`);
      return false;
    }

    try {
      const isVisible = await field.isVisible({ timeout: 3000 });
      if (!isVisible) return false;

      const tagName = await field.evaluate((el) => el.tagName.toLowerCase());

      if (tagName === 'select') {
        const selectedValue = await field.inputValue();
        return selectedValue !== '' && selectedValue !== '0';
      }
      const value = await field.inputValue();
      return value !== '' && value.length > 0;
    } catch {
      return false;
    }
  }

  async getFieldValue(fieldName) {
    const field = this.fieldMap[fieldName];
    if (!field) return '';

    try {
      const isVisible = await field.isVisible({ timeout: 3000 });
      if (!isVisible) return '';

      return await field.inputValue();
    } catch {
      return '';
    }
  }

  async fillField(fieldName, value) {
    const field = this.fieldMap[fieldName];
    if (!field) {
      console.warn(`[PP] Unknown field: ${fieldName}`);
      return;
    }

    const tagName = await field.evaluate((el) => el.tagName.toLowerCase());

    if (tagName === 'select') {
      try {
        await field.selectOption({ label: value });
      } catch {
        await field.selectOption({ index: 1 });
      }
    } else {
      await field.fill(value);
    }
  }

  /**
   * Fill the Short/Essential form (flex_content)
   * Fields: email, firstName, lastName, company, country
   */
  async fillShortForm(userData) {
    await this.fillField('email', userData.email);
    await this.fillField('firstName', userData.firstName);
    await this.fillField('lastName', userData.lastName);
    await this.fillField('company', userData.company);
    await this.fillField('country', userData.country);
  }

  /**
   * Fill the Medium/Expanded form (flex_event)
   * Fields: email, firstName, lastName, company, country, jobTitle, functionalArea
   */
  async fillMediumForm(userData) {
    await this.fillShortForm(userData);
    await this.fillField('jobTitle', userData.jobTitle);
    await this.fillField('functionalArea', userData.functionalArea);
  }

  /**
   * Fill the RFI/Full form (flex_contact)
   * Fields: ALL
   */
  async fillRfiForm(userData) {
    await this.fillMediumForm(userData);
    await this.fillField('phone', userData.phone);
    await this.fillField('state', userData.state);
    await this.fillField('postalCode', userData.postalCode);
    await this.fillField('primaryProductInterest', userData.primaryProductInterest);
  }

  async fillVisibleFields(userData, fieldsToFill) {
    for (const fieldName of fieldsToFill) {
      const isVisible = await this.isFieldVisible(fieldName);
      if (isVisible && userData[fieldName]) {
        await this.fillField(fieldName, userData[fieldName]);
      }
    }
  }

  async fillProgressiveFields(userData, newFields) {
    for (const fieldName of newFields) {
      if (userData[fieldName]) {
        await this.fillField(fieldName, userData[fieldName]);
      }
    }
  }

  async submitForm() {
    await this.submitButton.click();
  }

  async submitAndWaitForRedirect() {
    await this.submitForm();

    try {
      await expect(async () => {
        await this.submitButton.waitFor({ state: 'detached', timeout: 30000 });
        const currentUrl = this.page.url();
        expect(currentUrl).toContain('submissionid');
      }).toPass({ timeout: 60000 });
      return true;
    } catch {
      return false;
    }
  }

  async verifyFieldVisibility(expectedVisible, expectedHidden) {
    const results = {
      passed: 0,
      failed: 0,
      details: [],
    };

    for (const fieldName of expectedVisible) {
      const isVisible = await this.isFieldVisible(fieldName);
      if (isVisible) {
        results.passed += 1;
        results.details.push({ field: fieldName, expected: 'visible', actual: 'visible', pass: true });
      } else {
        results.failed += 1;
        results.details.push({ field: fieldName, expected: 'visible', actual: 'hidden', pass: false });
      }
    }

    for (const fieldName of expectedHidden) {
      const isHidden = await this.isFieldHidden(fieldName);
      if (isHidden) {
        results.passed += 1;
        results.details.push({ field: fieldName, expected: 'hidden', actual: 'hidden', pass: true });
      } else {
        results.failed += 1;
        results.details.push({ field: fieldName, expected: 'hidden', actual: 'visible', pass: false });
      }
    }

    return results;
  }

  async verifyFieldPrefill(expectedPrefilled, expectedEmpty) {
    const results = {
      passed: 0,
      failed: 0,
      details: [],
    };

    for (const fieldName of expectedPrefilled) {
      const isPrefilled = await this.isFieldPrefilled(fieldName);
      if (isPrefilled) {
        results.passed += 1;
        const value = await this.getFieldValue(fieldName);
        results.details.push({ field: fieldName, expected: 'prefilled', actual: `prefilled (${value})`, pass: true });
      } else {
        results.failed += 1;
        results.details.push({ field: fieldName, expected: 'prefilled', actual: 'empty', pass: false });
      }
    }

    for (const fieldName of expectedEmpty) {
      const isPrefilled = await this.isFieldPrefilled(fieldName);
      if (!isPrefilled) {
        results.passed += 1;
        results.details.push({ field: fieldName, expected: 'empty', actual: 'empty', pass: true });
      } else {
        results.failed += 1;
        const value = await this.getFieldValue(fieldName);
        results.details.push({ field: fieldName, expected: 'empty', actual: `prefilled (${value})`, pass: false });
      }
    }

    return results;
  }

  async logFormState() {
    console.info('[PP] Form State:');
    console.info(`  Template: ${await this.getFormTemplate()}`);
    console.info(`  POI: ${await this.getPOI()}`);

    for (const [name, field] of Object.entries(this.fieldMap)) {
      try {
        const isVisible = await field.isVisible({ timeout: 1000 });
        if (isVisible) {
          const value = await field.inputValue();
          console.info(`  ${name}: visible, value="${value}"`);
        } else {
          console.info(`  ${name}: hidden`);
        }
      } catch {
        console.info(`  ${name}: not found`);
      }
    }
  }

  async clearUserState() {
    await this.page.context().clearCookies();
  }

  async clearStorageOnPage() {
    try {
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    } catch (e) {
      console.info('[PP] Could not clear storage (may be expected):', e.message);
    }
  }
}
