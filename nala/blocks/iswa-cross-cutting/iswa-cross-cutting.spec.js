// Cross-cutting page-level checks run against the assembled ISWA page — the Nala
// copy of the finished page (public on stage). Override with ISWA_INTEGRATION_PAGE.
//   LOCAL_TEST_LIVE_URL=https://stage--da-bacom--adobecom.aem.live
const PAGE = process.env.ISWA_INTEGRATION_PAGE
  || '/drafts/nala/blocks/resources/it-starts-with-adobe?martech=off';

module.exports = {
  name: 'ISWA Cross-cutting',
  features: [
    {
      tcid: 'CROSS-01',
      name: '@iswa-footer-not-squished',
      path: PAGE,
      description: 'AC (MWPW-205058): the global footer renders at its standard height and is not vertically squished.',
      tags: '@iswa-cross-cutting @bacom @regression',
    },
    {
      tcid: 'CROSS-02',
      name: '@iswa-nav-renders',
      path: PAGE,
      description: 'AC (MWPW-205271): the standard global navigation renders (not collapsed / not the C2 fallback).',
      tags: '@iswa-cross-cutting @bacom @regression',
    },
    {
      tcid: 'CROSS-03',
      name: '@iswa-content-alignment',
      path: PAGE,
      description: 'AC (MWPW-204904 / 204890): blocks share a common content-column left edge; centered blocks have equal left/right margins.',
      tags: '@iswa-cross-cutting @bacom @regression',
    },
    {
      tcid: 'CROSS-04',
      name: '@iswa-mobile-marquee-full-width',
      path: PAGE,
      description: 'AC (MWPW-205025): on mobile the video-marquee spans the full viewport width with no right-side white gutter.',
      tags: '@iswa-cross-cutting @bacom @regression',
    },
  ],
};
