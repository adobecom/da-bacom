const path = require('path');

const ASSETS_DIR = path.join(__dirname, 'assets');
const SAMPLE_PNG = path.join(ASSETS_DIR, 'sample-marquee.png');
const SAMPLE_CARD_PNG = path.join(ASSETS_DIR, 'sample-card.png');
const SAMPLE_PDF = path.join(ASSETS_DIR, 'sample-guide.pdf');

module.exports = {
  name: 'Landing Page Builder',
  features: [
    // =========================================================
    // 1.1 Core Options & Form Flow
    // =========================================================
    {
      tcid: '0',
      name: '@lpb-initial-state: Only Core Options visible on fresh load',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @smoke @core @regression @bacom',
      data: {},
    },
    {
      tcid: '1',
      name: '@lpb-confirm-disabled: Confirm disabled without all core fields',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @smoke @core @regression @bacom',
      data: {},
    },
    {
      tcid: '2',
      name: '@lpb-url-auto-generation: URL auto-generates from inputs',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @smoke @core @regression @bacom',
      data: {
        contentType: 'Guide',
        gated: 'Gated',
        region: 'US',
        headline: 'Nala LPB Test Auto URL',
      },
    },
    {
      tcid: '3',
      name: '@lpb-confirm-shows-form: Full form appears after confirm',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @smoke @core @regression @bacom',
      data: {
        contentType: 'Report',
        gated: 'Ungated',
        region: 'US',
        headline: 'Nala LPB Confirm Test',
      },
    },
    {
      tcid: '4',
      name: '@lpb-reset-form: Reset clears all fields and returns to initial state',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @core @regression @bacom',
      data: {
        contentType: 'Guide',
        gated: 'Gated',
        region: 'US',
        headline: 'Nala LPB Reset Test',
      },
    },

    // =========================================================
    // 1.2 Required Field Validation
    // =========================================================
    {
      tcid: '5',
      name: '@lpb-missing-required-error: Error toast when required fields missing',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @smoke @validation @regression @bacom',
      data: {
        contentType: 'Guide',
        gated: 'Ungated',
        region: 'US',
        headline: 'Nala LPB Validation Test',
      },
    },
    {
      tcid: '6',
      name: '@lpb-gated-validation: Gated-specific fields required',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @validation @gated @regression @bacom',
      data: {
        contentType: 'Guide',
        gated: 'Gated',
        region: 'US',
        headline: 'Nala LPB Gated Validation',
      },
    },

    // =========================================================
    // 1.3 Image Upload
    // =========================================================
    {
      tcid: '7',
      name: '@lpb-marquee-image-upload: Valid PNG upload shows preview',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @smoke @image @regression @bacom',
      data: {
        contentType: 'Guide',
        gated: 'Ungated',
        region: 'US',
        headline: 'Nala Image Upload Test',
        imagePath: SAMPLE_PNG,
      },
    },
    {
      tcid: '8',
      name: '@lpb-image-delete-reupload: Delete and re-upload image',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @image @regression @bacom',
      data: {
        contentType: 'Guide',
        gated: 'Ungated',
        region: 'US',
        headline: 'Nala Image Delete Test',
        imagePath: SAMPLE_PNG,
      },
    },

    // =========================================================
    // 1.4 PDF Upload
    // =========================================================
    {
      tcid: '9',
      name: '@lpb-pdf-upload: Valid PDF upload shows file info',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @smoke @pdf @regression @bacom',
      data: {
        contentType: 'Guide',
        gated: 'Gated',
        region: 'US',
        headline: 'Nala PDF Upload Test',
        pdfPath: SAMPLE_PDF,
      },
    },
    {
      tcid: '10',
      name: '@lpb-pdf-clear: Clear PDF and re-upload',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @pdf @regression @bacom',
      data: {
        contentType: 'Report',
        gated: 'Ungated',
        region: 'US',
        headline: 'Nala PDF Clear Test',
        pdfPath: SAMPLE_PDF,
      },
    },
    {
      tcid: '11',
      name: '@lpb-video-hides-pdf: Video/Demo hides PDF, shows video input',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @smoke @pdf @content-type @regression @bacom',
      data: {
        contentType: 'Video/Demo',
        gated: 'Ungated',
        region: 'US',
        headline: 'Nala Video Type Test',
      },
    },

    // =========================================================
    // 1.5 Multi-Select Products
    // =========================================================
    {
      tcid: '12',
      name: '@lpb-multi-select-products: Select multiple CaaS products',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @smoke @multi-select @regression @bacom',
      data: {
        contentType: 'Guide',
        gated: 'Ungated',
        region: 'US',
        headline: 'Nala Multi Select Test',
      },
    },
    {
      tcid: '13',
      name: '@lpb-remove-product-tag: Remove tag by clicking X',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @multi-select @regression @bacom',
      data: {
        contentType: 'Guide',
        gated: 'Ungated',
        region: 'US',
        headline: 'Nala Remove Tag Test',
      },
    },
    {
      tcid: '14',
      name: '@lpb-dropdown-close-outside: Dropdown closes on outside click',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @multi-select @regression @bacom',
      data: {
        contentType: 'Guide',
        gated: 'Ungated',
        region: 'US',
        headline: 'Nala Dropdown Close Test',
      },
    },

    // =========================================================
    // 1.6 Form State Persistence
    // =========================================================
    {
      tcid: '15',
      name: '@lpb-persist-on-refresh: Form data persists across refresh',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @smoke @persistence @regression @bacom',
      data: {
        contentType: 'Report',
        gated: 'Ungated',
        region: 'US',
        headline: 'Nala Persistence Test',
      },
    },
    {
      tcid: '16',
      name: '@lpb-reset-clears-storage: Reset clears localStorage',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @persistence @regression @bacom',
      data: {
        contentType: 'Guide',
        gated: 'Gated',
        region: 'US',
        headline: 'Nala Reset Storage Test',
      },
    },

    // =========================================================
    // 1.7 Rich Text Formatting
    // =========================================================
    {
      tcid: '17',
      name: '@lpb-rich-text-bold: Bold formatting in body description',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @rich-text @regression @bacom',
      data: {
        contentType: 'Guide',
        gated: 'Ungated',
        region: 'US',
        headline: 'Nala Rich Text Bold Test',
      },
    },
    {
      tcid: '18',
      name: '@lpb-rich-text-italic: Italic formatting in body description',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @rich-text @regression @bacom',
      data: {
        contentType: 'Guide',
        gated: 'Ungated',
        region: 'US',
        headline: 'Nala Rich Text Italic Test',
      },
    },
    {
      tcid: '19',
      name: '@lpb-rich-text-bullets: Bullet list in body description',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @rich-text @regression @bacom',
      data: {
        contentType: 'Guide',
        gated: 'Ungated',
        region: 'US',
        headline: 'Nala Rich Text Bullets Test',
      },
    },

    // =========================================================
    // 3.2 Template Link Regression
    // =========================================================
    {
      tcid: '20',
      name: '@lpb-template-link: Template link points to a real example page',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @content-type @regression @bacom',
      data: {
        contentType: 'Guide',
        gated: 'Gated',
        region: 'US',
      },
    },

    // =========================================================
    // 3.3 Region Coverage Tests
    // =========================================================
    {
      tcid: '21',
      name: '@lpb-region-jp-path-prefix: JP region uses the correct path prefix and persists',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @smoke @region @regression @bacom',
      data: {
        contentType: 'Guide',
        gated: 'Ungated',
        region: 'JP',
        storedRegion: '/jp/',
        headline: 'Nala JP Region Test',
      },
    },
    {
      tcid: '22',
      name: '@lpb-region-kr-path-prefix: KR region uses the correct path prefix and persists',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @smoke @region @regression @bacom',
      data: {
        contentType: 'Report',
        gated: 'Ungated',
        region: 'KR',
        storedRegion: '/kr/',
        headline: 'Nala KR Region Test',
      },
    },
    {
      tcid: '23',
      name: '@lpb-region-au-path-prefix: AU region uses the correct path prefix and persists',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @smoke @region @regression @bacom',
      data: {
        contentType: 'Infographic',
        gated: 'Gated',
        region: 'AU',
        storedRegion: '/au/',
        headline: 'Nala AU Region Test',
      },
    },

    // =========================================================
    // 2.1 Infographic Gating — Marquee Image Requirements
    // =========================================================
    {
      tcid: '24',
      name: '@lpb-infographic-gated-marquee-visible: Gated Infographic shows marquee image field as required',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @smoke @infographic @gated @validation @regression @bacom',
      data: {
        contentType: 'Infographic',
        gated: 'Gated',
        region: 'US',
        headline: 'Nala Infographic Gated Marquee Visible',
      },
    },
    {
      tcid: '25',
      name: '@lpb-infographic-ungated-marquee-hidden: Ungated Infographic hides marquee image field',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @smoke @infographic @ungated @validation @regression @bacom',
      data: {
        contentType: 'Infographic',
        gated: 'Ungated',
        region: 'US',
        headline: 'Nala Infographic Ungated Marquee Hidden',
      },
    },
    {
      tcid: '26',
      name: '@lpb-infographic-gated-save-blocked: Gated Infographic save blocked with inline error when marquee image missing',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @smoke @infographic @gated @validation @regression @bacom',
      data: {
        contentType: 'Infographic',
        gated: 'Gated',
        region: 'US',
        headline: 'Nala Infographic Gated Save Blocked',
      },
    },
    {
      tcid: '27',
      name: '@lpb-infographic-toggle-gated-to-ungated: Switching Gated to Ungated removes marquee image requirement without reload',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @infographic @gated @ungated @validation @regression @bacom',
      data: {
        contentType: 'Infographic',
        gated: 'Gated',
        region: 'US',
        headline: 'Nala Infographic Toggle Gated To Ungated',
      },
    },
    {
      tcid: '28',
      name: '@lpb-infographic-toggle-ungated-to-gated: Switching Ungated to Gated enforces marquee image requirement without reload',
      path: '/tools/generator/landing-page',
      tags: '@lpb @lpb-non-e2e @infographic @gated @ungated @validation @regression @bacom',
      data: {
        contentType: 'Infographic',
        gated: 'Ungated',
        region: 'US',
        headline: 'Nala Infographic Toggle Ungated To Gated',
      },
    },
  ],
};
