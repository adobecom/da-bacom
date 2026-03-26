import { expect, test } from '@playwright/test';
import ProgressiveProfilingForm from './progressive-profiling.page.js';

const PPSpec = require('./progressive-profiling.spec.js');

const {
  stagedPages,
  journeyFlows,
  ongoingPages,
  outOfScopePages,
} = PPSpec;

const REVISIT_DELAY_MS = Number(process.env.PP_REVISIT_DELAY_MS || '60000');

const TEST_USER = {
  email: 'xiasun+test001@adobetest.com',
  firstName: 'NalaTest',
  lastName: 'Progressive',
  company: 'Adobe Nala Test Corp',
  country: 'United States',
  state: 'California',
  postalCode: '95110',
  phone: '408-555-9999',
  jobTitle: 'Individual Contributor',
  functionalArea: 'Marketing: General',
  primaryProductInterest: 'Real-time web analytics',
};

const KNOWN_VISITOR_FIELDS = [
  'email',
  'firstName',
  'lastName',
  'company',
  'country',
  'jobTitle',
  'functionalArea',
  'phone',
  'state',
  'postalCode',
  'primaryProductInterest',
];

const REQUEST_CONSULTATION_STEP_2_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'jobTitle',
  'functionalArea',
  'company',
  'country',
  'state',
  'postalCode',
  'primaryProductInterest',
];

const REQUEST_CONSULTATION_STEP_1_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'company',
  'country',
];

const REQUEST_CONSULTATION_STEP_3_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'jobTitle',
  'functionalArea',
  'company',
  'country',
  'state',
  'postalCode',
  'primaryProductInterest',
];

let ppForm;

function getPageByFormType(formType) {
  return stagedPages.find((page) => page.formType === formType);
}

function scenarioTag(baseTag, scenario) {
  return `${baseTag}-${scenario}`;
}

async function fillFormByType(formType, userData) {
  if (formType === 'short') {
    await ppForm.fillShortForm(userData);
    return;
  }

  if (formType === 'medium') {
    await ppForm.fillMediumForm(userData);
    return;
  }

  await ppForm.fillRfiForm(userData);
}

async function createKnownVisitor(sourcePage, userData = TEST_USER) {
  await ppForm.clearUserState();
  await ppForm.goto(sourcePage.url);
  await fillFormByType(sourcePage.formType, userData);
  const submitted = await ppForm.submitAndWaitForRedirect();
  expect(submitted, `Expected ${sourcePage.url} to submit successfully`).toBe(true);
}

async function waitForRevisitPropagation() {
  console.info(`[PP] Waiting ${REVISIT_DELAY_MS}ms before revisit validation`);
  await ppForm.page.waitForTimeout(REVISIT_DELAY_MS);
}

async function getVisibleKnownFieldStates(fieldNames = KNOWN_VISITOR_FIELDS) {
  const details = [];

  for (const fieldName of fieldNames) {
    const isVisible = await ppForm.isFieldVisible(fieldName);
    if (isVisible) {
      const isPrefilled = await ppForm.isFieldPrefilled(fieldName);
      details.push({
        field: fieldName,
        state: isPrefilled ? 'prefilled' : 'empty',
      });
    }
  }

  return details;
}

async function getKnownFieldStates(fieldNames = KNOWN_VISITOR_FIELDS) {
  const details = [];

  for (const fieldName of fieldNames) {
    const isVisible = await ppForm.isFieldVisible(fieldName);
    const isPrefilled = isVisible ? await ppForm.isFieldPrefilled(fieldName) : false;
    let state = 'visible-empty';

    if (!isVisible) {
      state = 'hidden';
    } else if (isPrefilled) {
      state = 'prefilled';
    }

    details.push({
      field: fieldName,
      state,
    });
  }

  return details;
}

function compareKnownFieldStates(baselineDetails, revisitDetails) {
  const baselineMap = new Map(baselineDetails.map((detail) => [detail.field, detail.state]));

  const details = revisitDetails.map((detail) => {
    const expected = baselineMap.get(detail.field) || 'hidden';
    return {
      field: detail.field,
      expected,
      actual: detail.state,
      changed: expected !== detail.state,
    };
  });

  return {
    count: details.filter((detail) => detail.changed).length,
    details,
  };
}

async function expectVisibleKnownFieldsEmpty(pageUrl, stepLabel, fieldNames = KNOWN_VISITOR_FIELDS) {
  const visibleFieldStates = await getVisibleKnownFieldStates(fieldNames);

  visibleFieldStates.forEach((detail) => {
    console.info(`[PP][${stepLabel}] ${detail.field}: ${detail.state}`);
    expect(
      detail.state,
      `Expected ${detail.field} to stay empty on ${stepLabel} for ${pageUrl}`,
    ).toBe('empty');
  });
}

async function expectKnownFieldsVisible(pageUrl, stepLabel, fieldNames) {
  for (const fieldName of fieldNames) {
    expect(
      await ppForm.isFieldVisible(fieldName),
      `Expected ${fieldName} to remain visible on ${stepLabel} for ${pageUrl}`,
    ).toBe(true);
  }
}

function getMultistepKnownFieldsByStep(pageData) {
  return pageData.knownFieldsByStep || {
    1: REQUEST_CONSULTATION_STEP_1_FIELDS,
    2: REQUEST_CONSULTATION_STEP_2_FIELDS,
    3: REQUEST_CONSULTATION_STEP_3_FIELDS,
  };
}

async function completeOutOfScopeMultistepFlow(pageData, options = {}) {
  const {
    validateFirstStep = false,
    expectEmptyKnownFields = false,
    expectedVisibleFieldsByStep = {},
  } = options;

  expect(
    await ppForm.getCurrentStep(),
    `Expected ${pageData.url} to start on step 1`,
  ).toBe(1);

  if (expectEmptyKnownFields) {
    await expectVisibleKnownFieldsEmpty(pageData.url, 'Multistep Step 1');
  }

  if (validateFirstStep) {
    await ppForm.clickNextStep();
    expect(
      await ppForm.hasAnyValidationErrors(),
      `Expected step 1 validation on ${pageData.url}`,
    ).toBe(true);
  }

  await ppForm.fillVisibleRequiredFields(TEST_USER);
  await ppForm.clickNextStep();
  await ppForm.waitForStepChange(1);

  if (expectedVisibleFieldsByStep[2]?.length) {
    await expectKnownFieldsVisible(pageData.url, 'Multistep Step 2', expectedVisibleFieldsByStep[2]);
  }

  if (expectEmptyKnownFields) {
    await expectVisibleKnownFieldsEmpty(pageData.url, 'Multistep Step 2');
  }

  await ppForm.fillVisibleRequiredFields(TEST_USER);
  await ppForm.clickNextStep();
  await ppForm.waitForStepChange(2);

  if (expectedVisibleFieldsByStep[3]?.length) {
    await expectKnownFieldsVisible(pageData.url, 'Multistep Step 3', expectedVisibleFieldsByStep[3]);
  }

  if (expectEmptyKnownFields) {
    await expectVisibleKnownFieldsEmpty(pageData.url, 'Multistep Step 3');
  }

  await ppForm.fillVisibleRequiredFields(TEST_USER);
  expect(
    await ppForm.submitAnyFormAndWaitForSuccess(),
    `Expected multi-step flow to submit successfully on ${pageData.url}`,
  ).toBe(true);
}

async function collectMultistepKnownVisitorEffects(pageData) {
  const knownFieldsByStep = getMultistepKnownFieldsByStep(pageData);
  const steps = [];
  let totalEffects = 0;

  const step1Effects = await ppForm.getKnownVisitorEffects(knownFieldsByStep[1] || REQUEST_CONSULTATION_STEP_1_FIELDS);
  steps.push({ step: 1, ...step1Effects });
  totalEffects += step1Effects.count;

  await ppForm.fillVisibleRequiredFields(TEST_USER);
  await ppForm.clickNextStep();
  await ppForm.waitForStepChange(1);

  const step2Effects = await ppForm.getKnownVisitorEffects(knownFieldsByStep[2] || REQUEST_CONSULTATION_STEP_2_FIELDS);
  steps.push({ step: 2, ...step2Effects });
  totalEffects += step2Effects.count;

  await ppForm.fillVisibleRequiredFields(TEST_USER);
  await ppForm.clickNextStep();
  await ppForm.waitForStepChange(2);

  const step3Effects = await ppForm.getKnownVisitorEffects(knownFieldsByStep[3] || REQUEST_CONSULTATION_STEP_3_FIELDS);
  steps.push({ step: 3, ...step3Effects });
  totalEffects += step3Effects.count;

  return { count: totalEffects, steps };
}

test.describe('BACOM Progressive Profiling Test Suite', () => {
  test.setTimeout(8 * 60 * 1000);

  test.beforeEach(async ({ page }) => {
    ppForm = new ProgressiveProfilingForm(page);
  });

  test.describe('Staged Pages - Unknown Visitor', () => {
    stagedPages.forEach((pageData) => {
      test(`${pageData.tcid}: ${scenarioTag(pageData.name, 'Unknown')}, ${pageData.tags}`, async () => {
        await ppForm.clearUserState();
        await ppForm.goto(pageData.url);
        await ppForm.clearStorageOnPage();

        const results = await ppForm.verifyFieldVisibility(
          pageData.unknownVisitor.visible,
          pageData.unknownVisitor.hidden || [],
        );

        results.details.forEach((detail) => {
          console.info(`[PP][Unknown] ${detail.field}: expected=${detail.expected}, actual=${detail.actual}`);
        });

        expect(results.failed).toBe(0);

        if (pageData.unknownVisitor.visibleAfterCountry?.length) {
          await ppForm.fillField('country', TEST_USER.country);
          await ppForm.page.waitForTimeout(1000);

          for (const fieldName of pageData.unknownVisitor.visibleAfterCountry) {
            expect(await ppForm.isFieldVisible(fieldName), `${fieldName} should appear after selecting country`).toBe(true);
          }
        }
      });
    });
  });

  test.describe('Staged Pages - Required Validation', () => {
    stagedPages.forEach((pageData) => {
      test(`${pageData.tcid}: ${scenarioTag(pageData.name, 'Validation')}, ${pageData.tags}`, async () => {
        await ppForm.clearUserState();
        await ppForm.goto(pageData.url);

        const hasValidationErrors = await ppForm.submitAndCheckValidationErrors();
        expect(hasValidationErrors, `Expected required validation on ${pageData.url}`).toBe(true);
      });
    });
  });

  test.describe('Staged Pages - Revisit Prefill', () => {
    stagedPages.forEach((pageData) => {
      test(`${pageData.tcid}: ${scenarioTag(pageData.name, 'Revisit')}, ${pageData.tags}`, async () => {
        await createKnownVisitor(pageData);
        await waitForRevisitPropagation();

        await ppForm.goto(pageData.url);

        await expect(async () => {
          const results = await ppForm.verifyFieldPrefill(pageData.revisitPrefill, []);

          results.details.forEach((detail) => {
            console.info(`[PP][Revisit] ${detail.field}: expected=${detail.expected}, actual=${detail.actual}`);
          });

          expect(results.failed).toBe(0);
        }).toPass({ timeout: 45000 });
      });
    });
  });

  test.describe('Manual Email Link Journeys', () => {
    journeyFlows.forEach((flow) => {
      test(`${flow.tcid}: ${flow.name}, ${flow.tags}`, async () => {
        await createKnownVisitor({
          url: flow.sourceUrl,
          formType: flow.sourceFormType,
        });

        console.info('='.repeat(60));
        console.info(`[MANUAL PP] Validation via email link for ${flow.name}`);
        console.info(`1. Open the email for ${TEST_USER.email}`);
        console.info(`2. Click the link to ${flow.destinationUrl}`);
        console.info(`3. Validate hidden fields: ${flow.expectedHidden.join(', ')}`);
        console.info(`4. Validate visible fields: ${flow.expectedVisible.join(', ')}`);
        console.info('5. Resume in Playwright Inspector when done');
        console.info('='.repeat(60));

        await ppForm.page.pause();
      });
    });
  });

  test.describe('In-Scope Ongoing Pages', () => {
    ongoingPages.forEach((pageData) => {
      test(`${pageData.tcid}: ${scenarioTag(pageData.name, 'Unknown')}, ${pageData.tags}`, async () => {
        await ppForm.clearUserState();
        await ppForm.goto(pageData.url);

        const baseline = await ppForm.captureFormSignature(KNOWN_VISITOR_FIELDS);
        expect(baseline.genericVisibleFieldCount, `Expected a visible form on ${pageData.url}`).toBeGreaterThan(0);

        const visibleFieldStates = await getVisibleKnownFieldStates();
        visibleFieldStates.forEach((detail) => {
          console.info(`[PP][Ongoing Unknown] ${detail.field}: ${detail.state}`);
          expect(detail.state, `${detail.field} should not be prefilled for an unknown visitor on ${pageData.url}`).toBe('empty');
        });
      });

      test(`${pageData.tcid}: ${scenarioTag(pageData.name, 'Validation')}, ${pageData.tags}`, async () => {
        await ppForm.clearUserState();
        await ppForm.goto(pageData.url);

        if (pageData.multiStep) {
          await ppForm.clickNextStep();
          expect(await ppForm.hasAnyValidationErrors(), `Expected step 1 validation on ${pageData.url}`).toBe(true);
          return;
        }

        expect(await ppForm.submitAndCheckValidationErrors(), `Expected required validation on ${pageData.url}`).toBe(true);
      });

      test(`${pageData.tcid}: ${scenarioTag(pageData.name, 'Revisit')}, ${pageData.tags}`, async () => {
        await ppForm.clearUserState();
        await ppForm.goto(pageData.url);

        if (pageData.multiStep) {
          await completeOutOfScopeMultistepFlow(pageData, {
            expectedVisibleFieldsByStep: getMultistepKnownFieldsByStep(pageData),
          });

          await waitForRevisitPropagation();
          await ppForm.goto(pageData.url);

          const effects = await collectMultistepKnownVisitorEffects(pageData);
          effects.steps.forEach((stepResult) => {
            stepResult.details.forEach((detail) => {
              console.info(`[PP][Ongoing Step ${stepResult.step}] ${detail.field}: ${detail.actual}`);
            });
          });

          expect(effects.count, `Expected known visitor behavior somewhere in the multistep flow on ${pageData.url}`).toBeGreaterThan(0);
          return;
        }

        await ppForm.fillVisibleFields(TEST_USER, KNOWN_VISITOR_FIELDS);

        const submitted = await ppForm.submitAndWaitForRedirect();
        expect(submitted, `Expected ${pageData.url} to submit successfully before revisit validation`).toBe(true);

        await waitForRevisitPropagation();
        await ppForm.goto(pageData.url);

        const effects = await ppForm.getKnownVisitorEffects(KNOWN_VISITOR_FIELDS);
        effects.details.forEach((detail) => {
          console.info(`[PP][Ongoing] ${detail.field}: ${detail.actual}`);
        });

        expect(effects.count, `Expected known visitor behavior on ${pageData.url}`).toBeGreaterThan(0);
      });
    });
  });

  test.describe('Out-of-Scope Regression', () => {
    const seedPage = getPageByFormType('short');

    outOfScopePages.forEach((pageData) => {
      if (pageData.multiStep) {
        test(`${pageData.tcid}: ${scenarioTag(pageData.name, 'NoPPFlow')}, ${pageData.tags}`, async () => {
          await ppForm.clearUserState();
          await ppForm.goto(pageData.url, false);

          await completeOutOfScopeMultistepFlow(pageData, {
            validateFirstStep: true,
            expectedVisibleFieldsByStep: pageData.knownFieldsByStep || {},
          });

          await createKnownVisitor(seedPage);
          await waitForRevisitPropagation();

          await ppForm.goto(pageData.url, false);

          await completeOutOfScopeMultistepFlow(pageData, {
            expectEmptyKnownFields: true,
            expectedVisibleFieldsByStep: pageData.knownFieldsByStep || {},
          });
        });
        return;
      }

      test(`${pageData.tcid}: ${scenarioTag(pageData.name, 'NoChange')}, ${pageData.tags}`, async () => {
        await ppForm.clearUserState();
        await ppForm.goto(pageData.url, false);

        const baseline = await ppForm.captureFormSignature(KNOWN_VISITOR_FIELDS);
        const baselineKnownFieldStates = await getKnownFieldStates(KNOWN_VISITOR_FIELDS);
        expect(baseline.genericVisibleFieldCount, `Expected a visible form on ${pageData.url}`).toBeGreaterThan(0);
        expect(await ppForm.submitAnyFormAndCheckValidationErrors(), `Expected ${pageData.url} to remain functionally valid on empty submit`).toBe(true);

        await createKnownVisitor(seedPage);
        await waitForRevisitPropagation();

        await ppForm.goto(pageData.url, false);

        const revisit = await ppForm.captureFormSignature(KNOWN_VISITOR_FIELDS);
        const revisitKnownFieldStates = await getKnownFieldStates(KNOWN_VISITOR_FIELDS);
        const effects = compareKnownFieldStates(baselineKnownFieldStates, revisitKnownFieldStates);

        effects.details.forEach((detail) => {
          console.info(`[PP][OutOfScope] ${detail.field}: expected=${detail.expected}, actual=${detail.actual}`);
        });

        expect(revisit.genericVisibleFieldCount).toBe(baseline.genericVisibleFieldCount);
        expect(revisit.marketoVisibleFields).toEqual(baseline.marketoVisibleFields);
        expect(effects.count, `Expected no known-field state changes on ${pageData.url}`).toBe(0);
      });
    });
  });
});
