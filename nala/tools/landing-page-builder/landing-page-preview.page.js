import { expect } from '@playwright/test';

const CAAS_CONTENT_TYPE_MAP = {
  Guide: 'caas:content-type/guide',
  Infographic: 'caas:content-type/infographic',
  Report: 'caas:content-type/report',
  'Video/Demo': 'caas:content-type/demos-and-video',
};

export default class LandingPagePreview {
  constructor(page) {
    this.page = page;

    // Marquee block
    this.marquee = page.locator('.marquee');
    this.marqueeHeadline = page.locator('.marquee h1, .marquee h2').first();
    this.marqueeDescription = page.locator('.marquee .body-m, .marquee p').first();
    this.marqueeImage = page.locator('.marquee img, img[alt="marqueeImage"]').first();

    // Body / Text block
    this.bodySection = page.locator('.section:has(.text)');
    this.bodyText = page.locator('.text');

    // Card block
    this.card = page.locator('.card, .consonant-Card');
    this.cardTitle = page.locator('.card h3, .consonant-Card-title').first();
    this.cardDescription = page.locator('.card p, .consonant-Card-description').first();
    this.cardImage = page.locator('.card img, .consonant-Card img').first();

    // Marketo form block (gated pages)
    this.marketoForm = page.locator('.marketo');
    this.formDescription = page.locator('.marketo .body-m, .marketo p').first();
    this.email = page.locator('#Email');
    this.firstName = page.locator('#FirstName');
    this.lastName = page.locator('#LastName');
    this.company = page.locator('#Company');
    this.country = page.locator('#Country');
    this.state = page.locator('#State');
    this.zipCode = page.locator('#Postal_Code__c, #PostalCode');
    this.phone = page.locator('#Phone');
    this.jobTitle = page.locator('#mktoFormCol_Job_Title, select[name="functionalArea"], #functionalArea');
    this.department = page.locator('#Department, select[name="mktoFormCol_Department"]');
    this.submitButton = page.locator('.marketo button[type="submit"], .marketo .mktoButton').first();

    // Thank-you / success state
    this.thankYouMessage = page.getByText(/thank you/i).first();
    this.pdfDownloadLink = page.locator('a[href*=".pdf"]').first();
    this.pdfPreview = page.locator('a[href*=".pdf"], iframe[src*=".pdf"], embed[src*=".pdf"], object[data*=".pdf"], .pdf-container[data-pdf-src*=".pdf"]').first();

    // Video player
    this.videoPlayer = page.locator('video, iframe[src*="tv.adobe.com"], iframe[src*="players.brightcove.net"], .video iframe').first();

    // Experience Fragment / Recommended content
    this.experienceFragment = page.locator('.fragment, .section:last-child');

    // Metadata (from page source)
    this.metaTitle = () => page.locator('meta[property="og:title"]');
    this.metaDescription = () => page.locator('meta[name="description"]');
  }

  // --- Content Verification ---

  async verifyMarqueeContent(headline, description) {
    if (headline) {
      try {
        await expect(this.marqueeHeadline).toContainText(headline);
      } catch {
        await expect(this.page.getByText(headline)).toBeVisible();
      }
    }
    if (description) {
      try {
        await expect(this.marquee).toContainText(description);
      } catch {
        await expect(this.page.getByText(description)).toBeVisible();
      }
    }
  }

  async verifyMarqueeImageVisible() {
    await expect(this.marqueeImage).toBeVisible({ timeout: 15000 });
    const src = await this.marqueeImage.getAttribute('src');
    expect(src).toBeTruthy();
  }

  async verifyCardContent(title, description) {
    if (title) {
      await expect(this.page.getByText(title).first()).toBeAttached();
    }
    if (description) {
      await expect(this.page.getByText(description).first()).toBeAttached();
    }
  }

  async verifyBodyContent(text) {
    await expect(this.page.getByText(text)).toBeVisible();
  }

  async verifyCaaSContentType(contentType) {
    const expectedTag = CAAS_CONTENT_TYPE_MAP[contentType];
    if (!expectedTag) return;
    const pageContent = await this.page.content();
    expect(pageContent).toContain(expectedTag);
  }

  async verifySeoMetadata(title, description) {
    if (title) {
      const ogTitle = await this.metaTitle().getAttribute('content');
      expect(ogTitle).toContain(title);
    }
    if (description) {
      const metaDesc = await this.metaDescription().getAttribute('content');
      expect(metaDesc).toContain(description);
    }
  }

  async verifyVideoPlayer(expectedVideoUrl = '') {
    await expect(this.videoPlayer).toBeVisible({ timeout: 30000 });

    const pageContent = await this.page.content();
    if (expectedVideoUrl) {
      expect(pageContent).toContain(expectedVideoUrl);
      return;
    }
    expect(pageContent).toMatch(/video\.tv\.adobe\.com|tv\.adobe\.com|players\.brightcove\.net/);
  }

  // --- Gated Form Interaction ---

  async verifyFormDisplayed() {
    await expect(this.marketoForm).toBeVisible();
  }

  async verifyFormDescription(expectedText) {
    await expect(this.formDescription).toContainText(expectedText);
  }

  async submitMarketoForm(testData) {
    await expect(async () => {
      await this.marketoForm.scrollIntoViewIfNeeded();
      await expect(this.email).toBeVisible({ timeout: 10000 });
    }).toPass({ intervals: [3000], timeout: 60000 });

    const fillIfVisible = async (locator, value, fillFn = (l, v) => l.fill(v)) => {
      if (!value) return;
      const el = typeof locator === 'function' ? locator() : locator;
      if (await el.isVisible().catch(() => false)) {
        await fillFn(el, value);
      }
    };
    const selectIfVisible = async (locator, value) => {
      if (!value) return;
      const el = typeof locator === 'function' ? locator() : locator;
      if (await el.isVisible().catch(() => false)) {
        await el.selectOption(value);
      }
    };

    await fillIfVisible(() => this.firstName, testData.firstName);
    await fillIfVisible(() => this.lastName, testData.lastName);
    await fillIfVisible(() => this.email, testData.email);
    await fillIfVisible(() => this.company, testData.company);
    await selectIfVisible(() => this.country, testData.country);
    await selectIfVisible(() => this.state, testData.state);
    await fillIfVisible(() => this.zipCode, testData.zipCode);
    await fillIfVisible(() => this.phone, testData.phone);

    await this.submitButton.click();
  }

  async verifyThankYouState(contentType) {
    await expect(this.thankYouMessage).toBeVisible({ timeout: 30000 });
  }

  async verifyPdfAccess() {
    await expect(this.pdfPreview).toBeVisible({ timeout: 15000 });

    const pdfUrl = await this.pdfPreview.getAttribute('href')
      || await this.pdfPreview.getAttribute('src')
      || await this.pdfPreview.getAttribute('data')
      || await this.pdfPreview.getAttribute('data-pdf-src');
    expect(pdfUrl).toContain('.pdf');
  }

  // --- Full Preview Verification ---

  async verifyPreviewContent(data) {
    await this.verifyMarqueeContent(data.headline, data.marqueeDescription);
    await this.verifyMarqueeImageVisible();

    if (data.bodyDescription) {
      await this.verifyBodyContent(data.bodyDescription);
    }

    if (data.cardTitle) {
      await this.verifyCardContent(data.cardTitle, data.cardDescription);
    }

    await this.verifyCaaSContentType(data.contentType);

    if (data.seoTitle) {
      await this.verifySeoMetadata(data.seoTitle, data.seoDescription);
    }
  }
}
