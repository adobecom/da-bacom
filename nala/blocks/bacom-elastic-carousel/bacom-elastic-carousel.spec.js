// Default target: the dedicated Nala test page (the current `expand-content
// limited` variant). Run against the ISWA integration page instead with env
// ISWA_INTEGRATION_PAGE=<path>.
//   LOCAL_TEST_LIVE_URL=https://stage--da-bacom--adobecom.aem.live
const INTEGRATION_PAGE = process.env.ISWA_INTEGRATION_PAGE;
const pagePath = (dedicated) => INTEGRATION_PAGE || dedicated;

module.exports = {
  name: 'BACOM Elastic Carousel Block',
  features: [
    {
      tcid: 'ELASTIC-01',
      name: '@elastic-carousel-structure',
      path: pagePath('/drafts/nala/blocks/carousel/elastic-carousel?martech=off'),
      description: 'Carousel renders items with header (logo/headline/expand toggle), media asset and footer.',
      tags: '@elastic-carousel @bacom @smoke @regression @bacomSmoke',
      expected: { minSlides: 3 },
    },
    {
      tcid: 'ELASTIC-02',
      name: '@elastic-carousel-expand',
      path: pagePath('/drafts/nala/blocks/carousel/elastic-carousel?martech=off'),
      description: 'AC: clicking the expand icon reveals the description under the heading and re-crops (shortens) the image; clicking again collapses.',
      tags: '@elastic-carousel @bacom @regression @a11y',
    },
    {
      tcid: 'ELASTIC-03',
      name: '@elastic-carousel-nav',
      path: pagePath('/drafts/nala/blocks/carousel/elastic-carousel?martech=off'),
      description: 'AC: with more than 3 cards, carousel controls render; Next scrolls the viewport.',
      tags: '@elastic-carousel @bacom @regression',
    },
    {
      tcid: 'ELASTIC-04',
      name: '@elastic-carousel-3up',
      path: pagePath('/drafts/nala/blocks/carousel/elastic-carousel?martech=off'),
      description: 'AC: desktop shows a 3-up view (three cards across the viewport).',
      tags: '@elastic-carousel @bacom @regression',
    },
    {
      tcid: 'ELASTIC-05',
      name: '@elastic-carousel-toggle-placement',
      path: pagePath('/drafts/nala/blocks/carousel/elastic-carousel?martech=off'),
      description: 'AC: the expand icon sits next to the headline (same row, to its right).',
      tags: '@elastic-carousel @bacom @regression',
    },
  ],
};
