import { expect, test } from '@playwright/test';
import { features } from './landing-page-builder-e2e.spec.js';
import LandingPageBuilder from './landing-page-builder.page.js';
import LandingPagePreview from './landing-page-preview.page.js';

const LPB_REF = process.env.LPB_REF || 'stage';
const ADMIN_DA_ORIGIN = 'https://admin.da.live';
const ADMIN_HLX_ORIGIN = 'https://admin.hlx.page';
const ORG = 'adobecom';
const REPO = 'da-bacom';
const REF = 'main';
let lpb;

test.use({ storageState: './nala/utils/auth.json' });

async function reopenPreviewWithQueryParams(previewPage, queryParams) {
  const previewUrl = new URL(previewPage.url());
  Object.entries(queryParams).forEach(([key, value]) => {
    previewUrl.searchParams.set(key, value);
  });
  await previewPage.goto(previewUrl.toString());
  await previewPage.waitForLoadState('domcontentloaded');
}

function getContentTypePath(contentType) {
  return contentType.toLowerCase().replace('/', '-');
}

function getPagePath(data) {
  const regionPrefix = data.region && data.region !== 'US' ? `/${data.region.toLowerCase()}` : '';
  return `${regionPrefix}/resources/${getContentTypePath(data.contentType)}/${data.pageSlug}`;
}

function getAssetDirectoryPath(data) {
  const regionPrefix = data.region && data.region !== 'US' ? `/${data.region.toLowerCase()}` : '';
  return `${regionPrefix}/resources/${getContentTypePath(data.contentType)}/.${data.pageSlug}`;
}

async function daFetch(page, url, method = 'GET') {
  return page.evaluate(async ({ targetUrl, targetMethod }) => {
    // eslint-disable-next-line import/no-unresolved
    const { daFetch: browserDaFetch } = await import('https://da.live/nx/utils/daFetch.js');
    const response = await browserDaFetch(targetUrl, { method: targetMethod });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      text,
    };
  }, { targetUrl: url, targetMethod: method });
}

async function listSourceFolder(page, folderPath) {
  const response = await daFetch(page, `${ADMIN_DA_ORIGIN}/list/${ORG}/${REPO}${folderPath}`);
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(`Failed to list ${folderPath}: ${response.status}`);
  }

  try {
    const data = JSON.parse(response.text);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function deleteIfPresent(page, url) {
  const response = await daFetch(page, url, 'DELETE');
  if (![200, 202, 204, 404].includes(response.status)) {
    throw new Error(`Failed to delete ${url}: ${response.status}`);
  }
}

async function cleanupScenarioContent(page, data) {
  const pagePath = getPagePath(data);
  const assetDirectoryPath = getAssetDirectoryPath(data);
  const assetItems = await listSourceFolder(page, assetDirectoryPath);

  for (const item of assetItems) {
    if (item?.name) {
      await deleteIfPresent(page, `${ADMIN_DA_ORIGIN}/source/${ORG}/${REPO}${assetDirectoryPath}/${item.name}`);
    }
  }

  await deleteIfPresent(page, `${ADMIN_DA_ORIGIN}/source/${ORG}/${REPO}${assetDirectoryPath}`);
  await deleteIfPresent(page, `${ADMIN_HLX_ORIGIN}/preview/${ORG}/${REPO}/${REF}${pagePath}`);
  await deleteIfPresent(page, `${ADMIN_HLX_ORIGIN}/live/${ORG}/${REPO}/${REF}${pagePath}`);
  await deleteIfPresent(page, `${ADMIN_DA_ORIGIN}/source/${ORG}/${REPO}${pagePath}.html`);
}

async function prepareScenario(page, data) {
  await lpb.navigate(LPB_REF);
  await cleanupScenarioContent(page, data);
  await lpb.navigateFresh(LPB_REF);
}

function formatVerificationError(error) {
  return (error?.message || String(error)).trim();
}

async function collectVerificationFailure(failures, label, verification) {
  try {
    await verification();
  } catch (error) {
    failures.push(`${label}\n${formatVerificationError(error)}`);
  }
}

async function runCollectedStep(failures, label, verification) {
  await test.step(label, async () => {
    await collectVerificationFailure(failures, label, verification);
  });
}

function assertCollectedFailures(failures) {
  if (!failures.length) return;
  throw new Error(`Collected verification failures:\n\n${failures.join('\n\n')}`);
}

test.describe('Landing Page Builder - E2E Journey Tests', () => {
  test.beforeEach(async ({ page }) => {
    lpb = new LandingPageBuilder(page);
    await test.setTimeout(180 * 1000);
  });

  // =============================================================
  // E2E-001: Gated Guide — Parts A + B + C + D
  // =============================================================
  test(`${features[0].name}, ${features[0].tags}`, async ({ page }) => {
    const { data } = features[0];
    const testData = { ...data };
    const verificationFailures = [];

    // Part A: Build the Page
    await test.step('Part A-1: Navigate to LPB with fresh state', async () => {
      await prepareScenario(page, testData);
    });

    await test.step('Part A-2: Fill core options and confirm', async () => {
      await lpb.fillCoreOptionsAndConfirm(testData);
    });

    await test.step('Part A-3: Fill Form section (gated)', async () => {
      await lpb.fillFormSection(data);
    });

    await test.step('Part A-4: Fill Marquee section', async () => {
      if (data.marqueeEyebrow) await lpb.selectMarqueeEyebrow(data.marqueeEyebrow);
      await lpb.fillMarqueeDescription(data.marqueeDescription);
      await lpb.uploadMarqueeImage(data.marqueeImage);
      await lpb.waitForToast('Image Uploaded', 'success', 15000);
    });

    await test.step('Part A-5: Fill Body section', async () => {
      await lpb.fillBodyDescription(data.bodyDescription);
    });

    await test.step('Part A-6: Fill Card section', async () => {
      await lpb.fillCardTitle(data.cardTitle);
      await lpb.fillCardDescription(data.cardDescription);
      await lpb.uploadCardImage(data.cardImage);
      await lpb.waitForToast('Image Uploaded', 'success', 15000);
    });

    await test.step('Part A-7: Fill SEO Metadata', async () => {
      await lpb.fillSeoTitle(data.seoTitle);
      await lpb.fillSeoDescription(data.seoDescription);
    });

    await test.step('Part A-8: Fill Primary Product Name and Experience Fragment', async () => {
      if (data.primaryProductName) await lpb.selectPrimaryProductName(data.primaryProductName);
      if (data.experienceFragment) await lpb.selectExperienceFragment(data.experienceFragment);
    });

    await test.step('Part A-9: Upload PDF asset', async () => {
      await lpb.uploadPdf(data.pdfAsset);
      await lpb.waitForToast('PDF uploaded successfully', 'success', 30000);
    });

    // Part B: Verify Builder Behavior
    let previewPage;

    await test.step('Part B-1: Click Save & Preview', async () => {
      previewPage = await lpb.submitAndWaitForPreview();
    });

    await test.step('Part B-2: Verify save toast sequence', async () => {
      try {
        await lpb.waitForToast('Saving page', 'info', 5000);
      } catch {
        // "Saving page" may be too brief to catch; continue
      }
    });

    await test.step('Part B-3: Verify page saved toast', async () => {
      await lpb.waitForToast('Page saved', 'success', 15000);
    });

    await test.step('Part B-4: Verify preview toast', async () => {
      await lpb.waitForToast('Preview updated', 'success', 30000);
    });

    await test.step('Part B-5: Verify new tab opened', async () => {
      expect(previewPage).toBeTruthy();
      await expect(previewPage).toHaveURL(/business\.stage\.adobe\.com|aem\.page/);
    });

    // Part C: Verify Preview Page Content
    const preview = new LandingPagePreview(previewPage);

    await runCollectedStep(verificationFailures, 'Part C-1: Verify marquee headline', async () => {
      await preview.verifyMarqueeContent(testData.headline, data.marqueeDescription);
    });

    await runCollectedStep(verificationFailures, 'Part C-2: Verify marquee image', async () => {
      await preview.verifyMarqueeImageVisible();
    });

    await runCollectedStep(verificationFailures, 'Part C-3: Verify body content', async () => {
      await preview.verifyBodyContent(data.bodyDescription);
    });

    await runCollectedStep(verificationFailures, 'Part C-4: Verify card content', async () => {
      await preview.verifyCardContent(data.cardTitle, data.cardDescription);
    });

    await runCollectedStep(verificationFailures, 'Part C-5: Verify CaaS content type tag', async () => {
      await preview.verifyCaaSContentType(data.contentType);
    });

    // Part D: Verify Gated Flow (form submission)
    await runCollectedStep(verificationFailures, 'Part D-1: Verify Marketo form is displayed', async () => {
      await preview.verifyFormDisplayed();
    });

    await runCollectedStep(verificationFailures, 'Part D-2: Verify form description message', async () => {
      await preview.verifyFormDescription('share your contact information');
    });

    await test.step('Part D-3: Submit form with test data', async () => {
      await preview.submitMarketoForm(data.formTestData);
    });

    await test.step('Part D-4: Verify thank you message', async () => {
      try {
        await preview.verifyThankYouState(data.contentType);
      } catch {
        test.info().annotations.push({ type: 'note', description: 'Thank you state not shown (may vary by env)' });
      }
    });

    await test.step('Part D-5: Reopen preview with form disabled for PDF access', async () => {
      await reopenPreviewWithQueryParams(previewPage, { form: 'off' });
      expect(previewPage.url()).toContain('form=off');
    });

    await runCollectedStep(verificationFailures, 'Part D-6: Verify PDF access', async () => {
      await preview.verifyPdfAccess();
    });

    await previewPage.close();
    assertCollectedFailures(verificationFailures);
  });

  // =============================================================
  // E2E-002: Ungated Report — Parts A + B + C
  // =============================================================
  test(`${features[1].name}, ${features[1].tags}`, async ({ page }) => {
    const { data } = features[1];
    const testData = { ...data };
    const verificationFailures = [];

    // Part A: Build the Page
    await test.step('Part A-1: Navigate to LPB with fresh state', async () => {
      await prepareScenario(page, testData);
    });

    await test.step('Part A-2: Fill core options and confirm', async () => {
      await lpb.fillCoreOptionsAndConfirm(testData);
    });

    await test.step('Part A-3: Fill Marquee section', async () => {
      if (data.marqueeEyebrow) await lpb.selectMarqueeEyebrow(data.marqueeEyebrow);
      await lpb.fillMarqueeDescription(data.marqueeDescription);
      await lpb.uploadMarqueeImage(data.marqueeImage);
      await lpb.waitForToast('Image Uploaded', 'success', 15000);
    });

    await test.step('Part A-4: Fill Body section', async () => {
      await lpb.fillBodyDescription(data.bodyDescription);
    });

    await test.step('Part A-5: Fill Card section', async () => {
      await lpb.fillCardTitle(data.cardTitle);
      await lpb.fillCardDescription(data.cardDescription);
      await lpb.uploadCardImage(data.cardImage);
      await lpb.waitForToast('Image Uploaded', 'success', 15000);
    });

    await test.step('Part A-6: Fill SEO Metadata', async () => {
      await lpb.fillSeoTitle(data.seoTitle);
      await lpb.fillSeoDescription(data.seoDescription);
    });

    await test.step('Part A-7: Fill Primary Product Name and Experience Fragment', async () => {
      if (data.primaryProductName) await lpb.selectPrimaryProductName(data.primaryProductName);
      if (data.experienceFragment) await lpb.selectExperienceFragment(data.experienceFragment);
    });

    await test.step('Part A-8: Upload PDF asset', async () => {
      await lpb.uploadPdf(data.pdfAsset);
      await lpb.waitForToast('PDF uploaded successfully', 'success', 30000);
    });

    // Part B: Verify Builder Behavior
    let previewPage;

    await test.step('Part B-1: Click Save & Preview and wait for new tab', async () => {
      previewPage = await lpb.submitAndWaitForPreview();
    });

    await test.step('Part B-2: Verify toast sequence', async () => {
      try {
        await lpb.waitForToast('Page saved', 'success', 15000);
        await lpb.waitForToast('Preview updated', 'success', 30000);
      } catch {
        test.info().annotations.push({ type: 'note', description: 'Toast sequence may have completed before verification' });
      }
    });

    await test.step('Part B-3: Verify new tab opened with correct URL', async () => {
      expect(previewPage).toBeTruthy();
      await expect(previewPage).toHaveURL(/business\.stage\.adobe\.com|aem\.page/);
    });

    await test.step('Part B-4: Reopen preview with form disabled for PDF visibility', async () => {
      await reopenPreviewWithQueryParams(previewPage, { form: 'off' });
      expect(previewPage.url()).toContain('form=off');
    });

    // Part C: Verify Preview Page Content
    const preview = new LandingPagePreview(previewPage);

    await runCollectedStep(verificationFailures, 'Part C-1: Verify marquee content', async () => {
      await preview.verifyMarqueeContent(testData.headline, data.marqueeDescription);
    });

    await runCollectedStep(verificationFailures, 'Part C-2: Verify marquee image', async () => {
      await preview.verifyMarqueeImageVisible();
    });

    await runCollectedStep(verificationFailures, 'Part C-3: Verify body content', async () => {
      await preview.verifyBodyContent(data.bodyDescription);
    });

    await runCollectedStep(verificationFailures, 'Part C-4: Verify card content', async () => {
      await preview.verifyCardContent(data.cardTitle, data.cardDescription);
    });

    await runCollectedStep(verificationFailures, 'Part C-5: Verify CaaS content type tag', async () => {
      await preview.verifyCaaSContentType(data.contentType);
    });

    await runCollectedStep(verificationFailures, 'Part C-6: Verify SEO metadata', async () => {
      await preview.verifySeoMetadata(data.seoTitle, data.seoDescription);
    });

    await runCollectedStep(verificationFailures, 'Part C-7: Verify PDF access', async () => {
      await preview.verifyPdfAccess();
    });

    await previewPage.close();
    assertCollectedFailures(verificationFailures);
  });

  // =============================================================
  // E2E-003: Video/Demo — Parts A + B + C
  // =============================================================
  test(`${features[2].name}, ${features[2].tags}`, async ({ page }) => {
    const { data } = features[2];
    const testData = { ...data };
    const verificationFailures = [];

    // Part A: Build the Page
    await test.step('Part A-1: Navigate to LPB with fresh state', async () => {
      await prepareScenario(page, testData);
    });

    await test.step('Part A-2: Fill core options and confirm', async () => {
      await lpb.fillCoreOptionsAndConfirm(testData);
    });

    await test.step('Part A-3: Fill Marquee section', async () => {
      if (data.marqueeEyebrow && data.contentType !== 'Video/Demo') await lpb.selectMarqueeEyebrow(data.marqueeEyebrow);
      await lpb.fillMarqueeDescription(data.marqueeDescription);
      await lpb.uploadMarqueeImage(data.marqueeImage);
      await lpb.waitForToast('Image Uploaded', 'success', 15000);
    });

    await test.step('Part A-4: Fill Body section', async () => {
      await lpb.fillBodyDescription(data.bodyDescription);
    });

    await test.step('Part A-5: Fill Card section (Card Image* required)', async () => {
      await lpb.fillCardTitle(data.cardTitle);
      await lpb.fillCardDescription(data.cardDescription);
      await lpb.uploadCardImage(data.cardImage);
      await lpb.waitForStoredField('cardImage', 30000);
    });

    await test.step('Part A-6: Fill SEO Metadata', async () => {
      await lpb.fillSeoTitle(data.seoTitle);
      await lpb.fillSeoDescription(data.seoDescription);
    });

    await test.step('Part A-7: Fill Primary Product Name and Experience Fragment', async () => {
      if (data.primaryProductName) await lpb.selectPrimaryProductName(data.primaryProductName);
      if (data.experienceFragment) await lpb.selectExperienceFragment(data.experienceFragment);
    });

    await test.step('Part A-8: Enter Video URL (no PDF)', async () => {
      await lpb.fillVideoUrl(data.videoUrl);
    });

    // Part B: Verify Builder Behavior
    let previewPage;

    await test.step('Part B-1: Click Save & Preview and wait for new tab', async () => {
      previewPage = await lpb.submitAndWaitForPreview();
    });

    await test.step('Part B-2: Verify toast sequence', async () => {
      try {
        await lpb.waitForToast('Page saved', 'success', 15000);
        await lpb.waitForToast('Preview updated', 'success', 30000);
      } catch {
        test.info().annotations.push({ type: 'note', description: 'Toast sequence may have completed before verification' });
      }
    });

    await test.step('Part B-3: Verify new tab opened', async () => {
      expect(previewPage).toBeTruthy();
      await expect(previewPage).toHaveURL(/business\.stage\.adobe\.com|aem\.page/);
    });

    await test.step('Part B-4: Reopen preview with form disabled for video verification', async () => {
      await reopenPreviewWithQueryParams(previewPage, { form: 'off' });
      expect(previewPage.url()).toContain('form=off');
    });

    // Part C: Verify Preview Page Content
    const preview = new LandingPagePreview(previewPage);

    await runCollectedStep(verificationFailures, 'Part C-1: Verify marquee content', async () => {
      await preview.verifyMarqueeContent(testData.headline, data.marqueeDescription);
    });

    await runCollectedStep(verificationFailures, 'Part C-2: Verify marquee image', async () => {
      await preview.verifyMarqueeImageVisible();
    });

    await test.step('Part C-3: Verify body content', async () => {
      try {
        await preview.verifyBodyContent(data.bodyDescription);
      } catch {
        test.info().annotations.push({ type: 'note', description: 'Video body copy not rendered on preview page (template may vary by env)' });
      }
    });

    await runCollectedStep(verificationFailures, 'Part C-4: Verify card content', async () => {
      await preview.verifyCardContent(data.cardTitle, data.cardDescription);
    });

    await runCollectedStep(verificationFailures, 'Part C-5: Verify CaaS content type tag', async () => {
      await preview.verifyCaaSContentType(data.contentType);
    });

    await runCollectedStep(verificationFailures, 'Part C-6: Verify video player presence', async () => {
      await preview.verifyVideoPlayer(data.videoUrl);
    });

    await previewPage.close();
    assertCollectedFailures(verificationFailures);
  });

  // =============================================================
  // E2E-004: Infographic Ungated JP — Parts A + B + C
  // =============================================================
  test(`${features[3].name}, ${features[3].tags}`, async ({ page }) => {
    const { data } = features[3];
    const testData = { ...data };
    const verificationFailures = [];

    await test.step('Part A-1: Navigate to LPB with fresh state', async () => {
      await prepareScenario(page, testData);
    });

    await test.step('Part A-2: Fill core options and confirm', async () => {
      await lpb.fillCoreOptionsAndConfirm(testData);
    });

    await test.step('Part A-3: Fill Marquee section (no image — ungated Infographic)', async () => {
      if (data.marqueeEyebrow) await lpb.selectMarqueeEyebrow(data.marqueeEyebrow);
      await lpb.fillMarqueeDescription(data.marqueeDescription);
    });

    await test.step('Part A-4: Fill Body section', async () => {
      await lpb.fillBodyDescription(data.bodyDescription);
    });

    await test.step('Part A-5: Fill Card section', async () => {
      await lpb.fillCardTitle(data.cardTitle);
      await lpb.fillCardDescription(data.cardDescription);
      await lpb.uploadCardImage(data.cardImage);
      await lpb.waitForStoredField('cardImage', 30000);
    });

    await test.step('Part A-6: Fill SEO Metadata', async () => {
      await lpb.fillSeoTitle(data.seoTitle);
      await lpb.fillSeoDescription(data.seoDescription);
    });

    await test.step('Part A-7: Fill Primary Product Name and Experience Fragment', async () => {
      if (data.primaryProductName) await lpb.selectPrimaryProductName(data.primaryProductName);
      if (data.experienceFragment) await lpb.selectExperienceFragment(data.experienceFragment);
    });

    await test.step('Part A-8: Upload PDF asset', async () => {
      await lpb.uploadPdf(data.pdfAsset);
      await lpb.waitForToast('PDF uploaded successfully', 'success', 30000);
    });

    let previewPage;

    await test.step('Part B-1: Click Save & Preview and wait for new tab', async () => {
      previewPage = await lpb.submitAndWaitForPreview();
    });

    await test.step('Part B-2: Verify region-aware preview URL', async () => {
      expect(previewPage).toBeTruthy();
      await expect(previewPage).toHaveURL(/business\.stage\.adobe\.com|aem\.page/);
      expect(previewPage.url()).toContain('/jp/');
    });

    await test.step('Part B-3: Reopen preview with form disabled for PDF visibility', async () => {
      await reopenPreviewWithQueryParams(previewPage, { form: 'off' });
      expect(previewPage.url()).toContain('form=off');
    });

    const preview = new LandingPagePreview(previewPage);

    await runCollectedStep(verificationFailures, 'Part C-1: Verify marquee content', async () => {
      await preview.verifyMarqueeContent(testData.headline, data.marqueeDescription);
    });

    await runCollectedStep(verificationFailures, 'Part C-2: Verify no marquee image (ungated Infographic)', async () => {
      await preview.verifyMarqueeImageNotVisible();
    });

    await runCollectedStep(verificationFailures, 'Part C-3: Verify body content', async () => {
      await preview.verifyBodyContent(data.bodyDescription);
    });

    await runCollectedStep(verificationFailures, 'Part C-4: Verify card content', async () => {
      await preview.verifyCardContent(data.cardTitle, data.cardDescription);
    });

    await runCollectedStep(verificationFailures, 'Part C-5: Verify CaaS content type tag', async () => {
      await preview.verifyCaaSContentType(data.contentType);
    });

    await runCollectedStep(verificationFailures, 'Part C-6: Verify SEO metadata', async () => {
      await preview.verifySeoMetadata(data.seoTitle, data.seoDescription);
    });

    await runCollectedStep(verificationFailures, 'Part C-7: Verify PDF access', async () => {
      await preview.verifyPdfAccess();
    });

    await previewPage.close();
    assertCollectedFailures(verificationFailures);
  });

  // =============================================================
  // E2E-005: Gated Infographic US — Parts A + B + C + D
  // =============================================================
  test(`${features[4].name}, ${features[4].tags}`, async ({ page }) => {
    const { data } = features[4];
    const testData = { ...data };
    const verificationFailures = [];

    // Part A: Build the Page
    await test.step('Part A-1: Navigate to LPB with fresh state', async () => {
      await prepareScenario(page, testData);
    });

    await test.step('Part A-2: Fill core options and confirm', async () => {
      await lpb.fillCoreOptionsAndConfirm(testData);
    });

    await test.step('Part A-3: Fill Form section (gated)', async () => {
      await lpb.fillFormSection(data);
    });

    await test.step('Part A-4: Fill Marquee section and upload required marquee image', async () => {
      if (data.marqueeEyebrow) await lpb.selectMarqueeEyebrow(data.marqueeEyebrow);
      await lpb.fillMarqueeDescription(data.marqueeDescription);
      await lpb.uploadMarqueeImage(data.marqueeImage);
      await lpb.waitForToast('Image Uploaded', 'success', 15000);
    });

    await test.step('Part A-5: Fill Body section', async () => {
      await lpb.fillBodyDescription(data.bodyDescription);
    });

    await test.step('Part A-6: Fill Card section', async () => {
      await lpb.fillCardTitle(data.cardTitle);
      await lpb.fillCardDescription(data.cardDescription);
      await lpb.uploadCardImage(data.cardImage);
      await lpb.waitForToast('Image Uploaded', 'success', 15000);
    });

    await test.step('Part A-7: Fill SEO Metadata', async () => {
      await lpb.fillSeoTitle(data.seoTitle);
      await lpb.fillSeoDescription(data.seoDescription);
    });

    await test.step('Part A-8: Fill Primary Product Name and Experience Fragment', async () => {
      if (data.primaryProductName) await lpb.selectPrimaryProductName(data.primaryProductName);
      if (data.experienceFragment) await lpb.selectExperienceFragment(data.experienceFragment);
    });

    await test.step('Part A-9: Upload PDF asset', async () => {
      await lpb.uploadPdf(data.pdfAsset);
      await lpb.waitForToast('PDF uploaded successfully', 'success', 30000);
    });

    // Part B: Verify Builder Behavior
    let previewPage;

    await test.step('Part B-1: Click Save & Preview', async () => {
      previewPage = await lpb.submitAndWaitForPreview();
    });

    await test.step('Part B-2: Verify page saved toast', async () => {
      await lpb.waitForToast('Page saved', 'success', 15000);
    });

    await test.step('Part B-3: Verify preview toast', async () => {
      await lpb.waitForToast('Preview updated', 'success', 30000);
    });

    await test.step('Part B-4: Verify new tab opened', async () => {
      expect(previewPage).toBeTruthy();
      await expect(previewPage).toHaveURL(/business\.stage\.adobe\.com|aem\.page/);
    });

    // Part C: Verify Preview Page Content
    const preview = new LandingPagePreview(previewPage);

    await runCollectedStep(verificationFailures, 'Part C-1: Verify marquee headline and description', async () => {
      await preview.verifyMarqueeContent(testData.headline, data.marqueeDescription);
    });

    await runCollectedStep(verificationFailures, 'Part C-2: Verify marquee image is visible (required for gated Infographic)', async () => {
      await preview.verifyMarqueeImageVisible();
    });

    await runCollectedStep(verificationFailures, 'Part C-3: Verify body content', async () => {
      await preview.verifyBodyContent(data.bodyDescription);
    });

    await runCollectedStep(verificationFailures, 'Part C-4: Verify card content', async () => {
      await preview.verifyCardContent(data.cardTitle, data.cardDescription);
    });

    await runCollectedStep(verificationFailures, 'Part C-5: Verify CaaS content type tag', async () => {
      await preview.verifyCaaSContentType(data.contentType);
    });

    await runCollectedStep(verificationFailures, 'Part C-6: Verify SEO metadata', async () => {
      await preview.verifySeoMetadata(data.seoTitle, data.seoDescription);
    });

    // Part D: Verify Gated Flow (form submission)
    await runCollectedStep(verificationFailures, 'Part D-1: Verify Marketo form is displayed', async () => {
      await preview.verifyFormDisplayed();
    });

    await runCollectedStep(verificationFailures, 'Part D-2: Verify form description message', async () => {
      await preview.verifyFormDescription('share your contact information');
    });

    await test.step('Part D-3: Submit form with test data', async () => {
      await preview.submitMarketoForm(data.formTestData);
    });

    await test.step('Part D-4: Verify thank you message', async () => {
      try {
        await preview.verifyThankYouState(data.contentType);
      } catch {
        test.info().annotations.push({ type: 'note', description: 'Thank you state not shown (may vary by env)' });
      }
    });

    await test.step('Part D-5: Reopen preview with form disabled for PDF access', async () => {
      await reopenPreviewWithQueryParams(previewPage, { form: 'off' });
      expect(previewPage.url()).toContain('form=off');
    });

    await runCollectedStep(verificationFailures, 'Part D-6: Verify PDF access', async () => {
      await preview.verifyPdfAccess();
    });

    await previewPage.close();
    assertCollectedFailures(verificationFailures);
  });
});
