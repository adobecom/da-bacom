module.exports = {
  name: 'BACOM C2 Section Metadata Block',
  // Section metadata is authored page content, so there is no isolated block
  // page for it — these assertions run against the c2 parity page, which authors
  // the style + background metadata under test. Values below reflect the current
  // c2-blocks-parity authoring; update them if the page changes. Override base
  // URL at run time with LOCAL_TEST_LIVE_URL.
  features: [
    {
      tcid: 'C2-01',
      name: '@c2-section-metadata-style',
      path: '/drafts/slavin/iswa/iswa-v2/c2-blocks-parity?martech=off',
      description: 'Section-metadata style classes are applied to the owning section.',
      tags: '@c2-section-metadata @bacom @regression',
      expected: {
        // The spacing class is responsive: spacing-md-bottom on desktop,
        // spacing-xl-bottom on mobile.
        styleClasses: ['rounded-corners-bottom', 'wide'],
        spacingPattern: '^spacing-(md|xl)-bottom$',
      },
    },
    {
      tcid: 'C2-02',
      name: '@c2-section-metadata-background',
      path: '/drafts/slavin/iswa/iswa-v2/c2-blocks-parity?martech=off',
      description: 'Background metadata adds has-background and a .section-background layer.',
      tags: '@c2-section-metadata @bacom @regression',
    },
  ],
};
