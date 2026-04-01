const path = require('path');

const ASSETS_DIR = path.join(__dirname, 'assets');
const SAMPLE_PNG = path.join(ASSETS_DIR, 'sample-marquee.png');
const SAMPLE_CARD_PNG = path.join(ASSETS_DIR, 'sample-card.png');
const SAMPLE_PDF = path.join(ASSETS_DIR, 'sample-guide.pdf');

const FORM_TEST_DATA = {
  firstName: 'NalaTest',
  lastName: 'Tester',
  email: 'qa-test@adobetest.com',
  jobTitle: 'Other',
  department: 'Other',
  company: 'Adobe Nala Test Corp',
  country: 'United States',
  state: 'California',
  zipCode: '95110',
  phone: '408-555-9999',
};

module.exports = {
  name: 'Landing Page Builder E2E',
  features: [
    // =========================================================
    // E2E-001: Gated Guide (Parts A + B + C + D)
    // =========================================================
    {
      tcid: '0',
      name: '@lpb-e2e-gated-guide: Full gated guide journey',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-e2e @gated @guide @smoke @regression @bacom',
      data: {
        contentType: 'Guide',
        gated: 'Gated',
        region: 'US',
        headline: 'Nala Auto Gated Guide US',
        pageSlug: 'nala-auto-guide-gated-us',
        marqueeEyebrow: 'Guide',
        formTemplate: 'Medium',
        campaignId: '0',
        poi: 'ANALYTICSSOLNSTANNDARD',
        marqueeDescription: 'Learn how enterprise teams use analytics to drive growth.',
        marqueeImage: SAMPLE_PNG,
        bodyDescription: 'Best practices for analytics implementation across the enterprise.',
        cardTitle: 'Enterprise Analytics Guide',
        cardDescription: 'Download our complete guide to enterprise analytics.',
        cardImage: SAMPLE_CARD_PNG,
        products: [],
        industry: '',
        seoTitle: 'Enterprise Analytics Guide | Adobe',
        seoDescription: 'Download our comprehensive analytics guide for enterprise teams.',
        primaryProductName: 'Analytics',
        experienceFragment: 'Generic',
        pdfAsset: SAMPLE_PDF,
        expectedCaasTag: 'caas:content-type/guide',
        formTestData: FORM_TEST_DATA,
      },
    },

    // =========================================================
    // E2E-002: Ungated Report (Parts A + B + C)
    // =========================================================
    {
      tcid: '1',
      name: '@lpb-e2e-ungated-report: Full ungated report journey',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-e2e @ungated @report @smoke @regression @bacom',
      data: {
        contentType: 'Report',
        gated: 'Ungated',
        region: 'US',
        headline: 'Nala Auto Ungated Report US',
        pageSlug: 'nala-auto-report-ungated-us',
        marqueeEyebrow: 'Report',
        marqueeDescription: 'Insights from 5,000+ marketing leaders worldwide.',
        marqueeImage: SAMPLE_PNG,
        bodyDescription: 'Key trends shaping the future of digital marketing.',
        cardTitle: 'Digital Marketing Report',
        cardDescription: 'Get the latest insights on digital marketing trends.',
        cardImage: SAMPLE_CARD_PNG,
        products: [],
        industry: '',
        seoTitle: 'State of Digital Marketing 2025 | Adobe',
        seoDescription: 'Discover key trends shaping the marketing landscape.',
        primaryProductName: 'Analytics',
        experienceFragment: 'Generic',
        pdfAsset: SAMPLE_PDF,
        expectedCaasTag: 'caas:content-type/report',
      },
    },

    // =========================================================
    // E2E-003: Video/Demo (Parts A + B + C)
    // =========================================================
    {
      tcid: '2',
      name: '@lpb-e2e-video-demo: Full video/demo journey',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-e2e @ungated @video @smoke @regression @bacom',
      data: {
        contentType: 'Video/Demo',
        gated: 'Ungated',
        region: 'US',
        headline: 'Nala Auto Video Demo US',
        pageSlug: 'nala-auto-video-demo-ungated-us',
        marqueeEyebrow: 'Video/Demo',
        marqueeDescription: 'See Adobe Analytics in action with this product walkthrough.',
        marqueeImage: SAMPLE_PNG,
        bodyDescription: 'Product experts demonstrate the power of Adobe Analytics.',
        cardTitle: 'Analytics Product Demo',
        cardDescription: 'Watch the full demo of Adobe Analytics.',
        cardImage: SAMPLE_CARD_PNG,
        products: [],
        industry: '',
        seoTitle: 'Adobe Analytics Demo | Adobe',
        seoDescription: 'Watch our product demo showcasing Adobe Analytics capabilities.',
        primaryProductName: 'Analytics',
        experienceFragment: 'Generic',
        videoUrl: 'https://video.tv.adobe.com/v/3456789',
        expectedCaasTag: 'caas:content-type/demos-and-video',
      },
    },

    // =========================================================
    // E2E-004: Infographic Ungated JP (Parts A + B + C)
    // =========================================================
    {
      tcid: '3',
      name: '@lpb-e2e-infographic-jp: Full ungated infographic journey in JP',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-e2e @ungated @infographic @region @smoke @regression @bacom',
      data: {
        contentType: 'Infographic',
        gated: 'Ungated',
        region: 'JP',
        headline: 'Nala Auto Infographic JP',
        pageSlug: 'nala-auto-infographic-ungated-jp',
        marqueeEyebrow: 'Infographic',
        marqueeDescription: 'A quick visual summary of the latest analytics trends.',
        // No marqueeImage: ungated Infographic does not show the marquee image field
        bodyDescription: 'Explore the standout analytics insights in a concise infographic format.',
        cardTitle: 'Analytics Trends Infographic',
        cardDescription: 'Download the infographic for a visual breakdown of the trends.',
        cardImage: SAMPLE_CARD_PNG,
        products: [],
        industry: '',
        seoTitle: 'Analytics Trends Infographic | Adobe',
        seoDescription: 'See the key analytics trends in a concise infographic.',
        primaryProductName: 'Analytics',
        experienceFragment: 'Generic',
        pdfAsset: SAMPLE_PDF,
        expectedCaasTag: 'caas:content-type/infographic',
      },
    },

    // =========================================================
    // E2E-005: Gated Infographic US (Parts A + B + C + D)
    // =========================================================
    {
      tcid: '4',
      name: '@lpb-e2e-infographic-gated: Full gated infographic journey',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-e2e @gated @infographic @smoke @regression @bacom',
      data: {
        contentType: 'Infographic',
        gated: 'Gated',
        region: 'US',
        headline: 'Nala Auto Gated Infographic US',
        pageSlug: 'nala-auto-infographic-gated-us',
        marqueeEyebrow: 'Infographic',
        formTemplate: 'Medium',
        campaignId: '0',
        poi: 'ANALYTICSSOLNSTANNDARD',
        marqueeDescription: 'A quick visual summary of the latest analytics trends.',
        marqueeImage: SAMPLE_PNG,
        bodyDescription: 'Explore the standout analytics insights in a concise infographic format.',
        cardTitle: 'Analytics Trends Infographic',
        cardDescription: 'Download the infographic for a visual breakdown of the trends.',
        cardImage: SAMPLE_CARD_PNG,
        products: [],
        industry: '',
        seoTitle: 'Analytics Trends Infographic | Adobe',
        seoDescription: 'See the key analytics trends in a concise infographic.',
        primaryProductName: 'Analytics',
        experienceFragment: 'Generic',
        pdfAsset: SAMPLE_PDF,
        expectedCaasTag: 'caas:content-type/infographic',
        formTestData: FORM_TEST_DATA,
      },
    },
  ],
};
