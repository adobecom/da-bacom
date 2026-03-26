import { expect } from '@playwright/test';

const GENERIC_FORM_TIMEOUT_MS = Number(process.env.PP_FORM_LOAD_TIMEOUT_MS || '120000');

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
    this.formRoot = this.page.locator('.marketo, form').first();
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
    this.submitButton = this.marketo.locator('#mktoButton_new, .mktoButton, button[type="submit"]').first();
    this.anySubmitButton = this.page.locator('form button[type="submit"], form input[type="submit"], .mktoButton').first();
    this.nextStepButton = this.page.locator('button#mktoButton_next, .mktoButtonRow button#mktoButton_next').first();
    this.stepDetails = this.page.locator('.step-details .step').first();
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

  async goto(url, waitForMarketo = true) {
    await this.page.goto(url);
    await this.page.waitForLoadState('domcontentloaded');

    if (waitForMarketo) {
      await this.waitForFormLoad();
      return;
    }

    await this.waitForAnyFormLoad();
  }

  async waitForAnyFormLoad() {
    await expect(async () => {
      await this.page.evaluate(() => {
        const marketoAnchor = document.querySelector('.marketo-form-wrapper, .marketo.multi-step, .marketo, [class*="marketo"]');
        if (marketoAnchor) {
          marketoAnchor.scrollIntoView({ block: 'center', behavior: 'instant' });
          return;
        }

        window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
      }).catch(() => {});

      const visibleFormCount = await this.getGenericVisibleFormCount();
      expect(visibleFormCount).toBeGreaterThan(0);
    }).toPass({ timeout: GENERIC_FORM_TIMEOUT_MS });

    await expect(async () => {
      const visibleFieldCount = await this.getGenericVisibleFieldCount();
      expect(visibleFieldCount).toBeGreaterThan(0);
    }).toPass({ timeout: GENERIC_FORM_TIMEOUT_MS });
  }

  async waitForFormLoad() {
    try {
      await this.marketo.waitFor({ state: 'visible', timeout: 30000 });
      await this.email.waitFor({ state: 'visible', timeout: 30000 });
      return;
    } catch (error) {
      // Some live Marketo pages render the shell first and hydrate fields later.
      await this.waitForAnyFormLoad();

      const recoveryLocators = [
        this.email,
        this.firstName,
        this.company,
        this.country,
        this.submitButton,
      ];

      const recovered = await Promise.all(
        recoveryLocators.map((locator) => locator.isVisible().catch(() => false)),
      );

      if (recovered.some(Boolean)) {
        return;
      }

      throw error;
    }
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

  async submitAndCheckValidationErrors() {
    await this.submitForm();
    await this.page.waitForTimeout(1000);
    return this.hasValidationErrors();
  }

  async submitAnyForm() {
    await this.anySubmitButton.click();
  }

  async submitAnyFormAndCheckValidationErrors() {
    await this.submitAnyForm();
    await this.page.waitForTimeout(1000);
    return this.hasAnyValidationErrors();
  }

  async submitAnyFormAndWaitForSuccess() {
    const startingUrl = this.page.url();
    await this.submitAnyForm();

    try {
      await expect(async () => {
        const currentUrl = this.page.url();
        const thankYouMessage = await this.page.locator('.ty-message, [class*="thank"], [class*="success"]').count();
        const formVisible = await this.formRoot.isVisible().catch(() => false);

        expect(
          currentUrl !== startingUrl
            || currentUrl.includes('submissionid')
            || thankYouMessage > 0
            || formVisible === false,
        ).toBe(true);
      }).toPass({ timeout: 60000 });
      return true;
    } catch {
      return false;
    }
  }

  async submitAndWaitForRedirect() {
    const startingUrl = this.page.url();
    await this.submitForm();

    try {
      await expect(async () => {
        const currentUrl = this.page.url();
        const thankYouMessage = await this.page.locator('.ty-message, [class*="thank"], [class*="success"]').count();
        const submitButtonVisible = await this.submitButton.isVisible().catch(() => false);
        const visibleFormCount = await this.getGenericVisibleFormCount().catch(() => 0);

        expect(
          currentUrl !== startingUrl
            || currentUrl.includes('submissionid')
            || thankYouMessage > 0
            || submitButtonVisible === false
            || visibleFormCount === 0,
        ).toBe(true);
      }).toPass({ timeout: 60000 });
      return true;
    } catch {
      return false;
    }
  }

  async hasValidationErrors() {
    const invalidStateCount = await this.marketo.locator('[aria-invalid="true"], .mktoInvalid, .mktoError, .mktoErrorMsg, .msg-error').count();
    return invalidStateCount > 0;
  }

  async hasAnyValidationErrors() {
    const invalidStateCount = await this.page.locator('form [aria-invalid="true"], form .mktoInvalid, form .mktoError, form .mktoErrorMsg, form .msg-error, form :invalid').count();
    return invalidStateCount > 0;
  }

  async getCurrentStep() {
    const formWithStep = this.page.locator('form[data-step]').first();
    const dataStep = await formWithStep.getAttribute('data-step').catch(() => null);
    if (dataStep) {
      return Number(dataStep);
    }

    const stepText = await this.stepDetails.textContent().catch(() => '');
    const match = stepText?.match(/Step\s+(\d+)\s+of\s+\d+/i);
    return match ? Number(match[1]) : null;
  }

  async clickNextStep() {
    await this.nextStepButton.click();
  }

  async waitForStepChange(previousStep) {
    await expect(async () => {
      const currentStep = await this.getCurrentStep();
      expect(currentStep).toBe(previousStep + 1);
    }).toPass({ timeout: 30000 });
  }

  async selectVisibleOption(field, preferredLabel) {
    if (preferredLabel) {
      try {
        await field.selectOption({ label: preferredLabel });
        return true;
      } catch {
        // Fall back to the first non-empty option once the field is populated.
      }
    }

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const optionCount = await field.evaluate((element) => element.options?.length || 0).catch(() => 0);
      if (optionCount > 1) {
        try {
          await field.selectOption({ index: 1 });
          return true;
        } catch {
          // Keep polling while dependent options are still stabilizing.
        }
      }

      await this.page.waitForTimeout(250);
    }

    return false;
  }

  async fillVisibleRequiredFields(userData) {
    const visibleFields = await this.page.locator('form input, form select, form textarea').elementHandles();
    const fieldValues = {
      Email: userData.email,
      FirstName: userData.firstName,
      LastName: userData.lastName,
      mktoFormsCompany: userData.company,
      Phone: userData.phone,
      PostalCode: userData.postalCode,
      Country: userData.country,
      State: userData.state,
      mktoFormsJobTitle: userData.jobTitle,
      mktoFormsFunctionalArea: userData.functionalArea,
      mktoFormsPrimaryProductInterest: userData.primaryProductInterest,
    };

    for (const field of visibleFields) {
      const isVisible = await field.isVisible().catch(() => false);
      const disabled = await field.isDisabled().catch(() => false);
      if (isVisible && !disabled) {
        const required = await field.evaluate((element) => {
          const htmlElement = element;
          const fieldContainer = htmlElement.closest('.mktoFieldDescriptor, .mktoFieldWrap, .mktoFormRow, .mktoFormCol');
          return htmlElement.required
            || htmlElement.getAttribute('aria-required') === 'true'
            || htmlElement.classList.contains('mktoRequired')
            || fieldContainer?.classList?.contains('mktoRequired')
            || fieldContainer?.classList?.contains('mktoRequiredField')
            || fieldContainer?.querySelector?.('.mktoAsterix') !== null
            || fieldContainer?.querySelector?.('label.mktoLabel .mktoAsterix') !== null;
        }).catch(() => false);

        if (required) {
          const tagName = await field.evaluate((element) => element.tagName.toLowerCase());
          const type = await field.getAttribute('type');
          const name = await field.getAttribute('name');
          const isCloneField = name?.endsWith('_clone');

          if (type !== 'hidden' && !isCloneField) {
            if (tagName === 'select') {
              if (name === 'Country') {
                const selectedCountry = await this.selectVisibleOption(field, userData.country);
                if (!selectedCountry) {
                  await field.selectOption({ value: 'US' }).catch(() => {});
                }
              } else if (name === 'State') {
                await this.selectVisibleOption(field, userData.state);
              } else if (fieldValues[name]) {
                await this.selectVisibleOption(field, fieldValues[name]);
              } else {
                await this.selectVisibleOption(field);
              }
            } else if (type === 'checkbox' || type === 'radio') {
              await field.check().catch(() => {});
            } else {
              const existingValue = await field.inputValue().catch(() => '');

              if (!existingValue) {
                let value = fieldValues[name];
                if (!value) {
                  if (type === 'email') value = userData.email;
                  else if (type === 'tel') value = userData.phone;
                  else if (tagName === 'textarea') value = 'Nala regression test';
                  else value = 'NalaTest';
                }

                await field.fill(value).catch(() => {});
              }
            }
          }
        }
      }
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

  async getVisibleFieldNames(fieldNames = Object.keys(this.fieldMap)) {
    const visibleFields = [];

    for (const fieldName of fieldNames) {
      if (await this.isFieldVisible(fieldName)) {
        visibleFields.push(fieldName);
      }
    }

    return visibleFields;
  }

  async getKnownVisitorEffects(fieldNames = Object.keys(this.fieldMap)) {
    const details = [];
    let count = 0;

    for (const fieldName of fieldNames) {
      const isVisible = await this.isFieldVisible(fieldName);
      const isPrefilled = isVisible ? await this.isFieldPrefilled(fieldName) : false;
      const hasEffect = !isVisible || isPrefilled;

      if (hasEffect) {
        count += 1;
      }

      let actual = 'visible-empty';
      if (!isVisible) {
        actual = 'hidden';
      } else if (isPrefilled) {
        actual = 'prefilled';
      }

      details.push({
        field: fieldName,
        actual,
      });
    }

    return { count, details };
  }

  async getGenericVisibleFormCount() {
    return this.page.evaluate(() => [...document.querySelectorAll('form')]
      .filter((form) => {
        const style = window.getComputedStyle(form);
        const rect = form.getBoundingClientRect();
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && style.opacity !== '0'
          && rect.width > 0
          && rect.height > 0;
      }).length);
  }

  async getGenericVisibleFieldCount() {
    return this.page.evaluate(() => [...document.querySelectorAll('form input, form select, form textarea')]
      .filter((element) => {
        if (element instanceof HTMLInputElement && element.type === 'hidden') {
          return false;
        }

        if (element.name?.endsWith('_clone')) {
          return false;
        }

        const form = element.closest('form');
        if (!form) {
          return false;
        }

        const formStyle = window.getComputedStyle(form);
        const formRect = form.getBoundingClientRect();
        if (
          formStyle.display === 'none'
          || formStyle.visibility === 'hidden'
          || formStyle.opacity === '0'
          || formRect.width === 0
          || formRect.height === 0
        ) {
          return false;
        }

        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && style.opacity !== '0'
          && rect.width > 0
          && rect.height > 0;
      }).length);
  }

  async captureFormSignature(fieldNames = Object.keys(this.fieldMap)) {
    await this.waitForAnyFormLoad();

    return {
      genericVisibleFieldCount: await this.getGenericVisibleFieldCount(),
      marketoVisibleFields: await this.getVisibleFieldNames(fieldNames),
    };
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
