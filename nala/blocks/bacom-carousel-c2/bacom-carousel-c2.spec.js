// Default targets: the dedicated carousel-c2 page for structure / logo /
// left-alignment. The dedicated page does not author a stat eyebrow, so the
// stat AC defaults to the ISWA integration page (which authors both).
// ISWA_INTEGRATION_PAGE=<path> points the whole suite at the integration page.
// The block decorates lazily, so the page object waits for the eyebrow first.
//   LOCAL_TEST_LIVE_URL=https://stage--da-bacom--adobecom.aem.live
const INTEGRATION_PAGE = process.env.ISWA_INTEGRATION_PAGE;
const pagePath = (dedicated) => INTEGRATION_PAGE || dedicated;

module.exports = {
  name: 'BACOM Carousel C2 Block',
  features: [
    {
      tcid: 'CAROUSEL-C2-01',
      name: '@carousel-c2-structure',
      path: pagePath('/drafts/nala/blocks/carousel/carousel-c2?martech=off'),
      description: 'Ingested carousel-c2 renders with slides and at least one eyebrow.',
      tags: '@carousel-c2 @bacom @smoke @regression @bacomSmoke',
    },
    {
      tcid: 'CAROUSEL-C2-02',
      name: '@carousel-c2-eyebrow-logo',
      path: pagePath('/drafts/nala/blocks/carousel/carousel-c2?martech=off'),
      description: 'AC: a logo image can be authored in the eyebrow (an .eyebrow with an img).',
      tags: '@carousel-c2 @bacom @regression',
    },
    {
      tcid: 'CAROUSEL-C2-03',
      name: '@carousel-c2-eyebrow-stat',
      path: pagePath('/drafts/nala/blocks/resources/it-starts-with-adobe?martech=off'),
      description: 'AC: a stat can be authored in the eyebrow (.eyebrow.stat = strong number + .stat-description).',
      tags: '@carousel-c2 @bacom @regression',
    },
    {
      tcid: 'CAROUSEL-C2-04',
      name: '@carousel-c2-left-aligned',
      path: pagePath('/drafts/nala/blocks/carousel/carousel-c2?martech=off'),
      description: 'AC: all content components are left aligned (shared left edge, text-align start).',
      tags: '@carousel-c2 @bacom @regression',
    },
  ],
};
