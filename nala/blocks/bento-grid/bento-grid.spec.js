// Default target: the dedicated Nala test page. Run against the ISWA
// integration page instead with env ISWA_INTEGRATION_PAGE=<path>.
//   LOCAL_TEST_LIVE_URL=https://stage--da-bacom--adobecom.aem.live
const INTEGRATION_PAGE = process.env.ISWA_INTEGRATION_PAGE;
const pagePath = (dedicated) => INTEGRATION_PAGE || dedicated;

module.exports = {
  name: 'BACOM Bento Grid Block',
  features: [
    {
      tcid: 'BENTO-01',
      name: '@bento-grid-structure',
      path: pagePath('/drafts/nala/blocks/bento-grid/bento-grid?martech=off'),
      description: 'Block shell, responsive views, section header, featured video bento and carousel cards render.',
      tags: '@bento-grid @bacom @smoke @regression @bacomSmoke',
      expected: {
        role: 'region',
        ariaLabel: 'Featured video gallery',
        minCards: 4,
      },
    },
    {
      tcid: 'BENTO-02',
      name: '@bento-grid-video-modal',
      path: pagePath('/drafts/nala/blocks/bento-grid/bento-grid?martech=off'),
      description: 'Clicking the featured video opens the video modal, plays the mp4, and closing removes it.',
      tags: '@bento-grid @bacom @regression',
    },
    {
      tcid: 'BENTO-03',
      name: '@bento-grid-carousel-nav',
      path: pagePath('/drafts/nala/blocks/bento-grid/bento-grid?martech=off'),
      description: 'Prev arrow starts disabled; Next scrolls the carousel and enables Prev.',
      tags: '@bento-grid @bacom @regression',
    },
    {
      tcid: 'BENTO-04',
      name: '@bento-grid-responsive',
      path: pagePath('/drafts/nala/blocks/bento-grid/bento-grid?martech=off'),
      description: 'Desktop shows featured + carousel; mobile collapses to a single carousel with arrow controls.',
      tags: '@bento-grid @bacom @regression',
    },
    {
      tcid: 'BENTO-05',
      name: '@bento-grid-play-icon-topright',
      path: pagePath('/drafts/nala/blocks/bento-grid/bento-grid?martech=off'),
      description: 'AC: the video play icon sits in the top-right corner of the featured and carousel bento images.',
      tags: '@bento-grid @bacom @regression',
    },
    {
      tcid: 'BENTO-06',
      name: '@bento-grid-partial-vs-full',
      path: pagePath('/drafts/nala/blocks/bento-grid/bento-grid?martech=off'),
      description: 'AC: desktop is a partial carousel (overflows, multiple cards visible); mobile is a full-width single carousel with arrow controls.',
      tags: '@bento-grid @bacom @regression',
    },
    {
      tcid: 'BENTO-07',
      name: '@bento-grid-secondary-bg',
      path: pagePath('/drafts/nala/blocks/bento-grid/bento-grid?martech=off'),
      description: 'Figma-confirmed (red until built): secondary cards carry the featured card light-grey rounded background on desktop and mobile.',
      tags: '@bento-grid @bacom @regression @iswa-v2',
    },
    {
      tcid: 'BENTO-08',
      name: '@bento-grid-card-radius',
      path: pagePath('/drafts/nala/blocks/bento-grid/bento-grid?martech=off'),
      description: 'Figma-confirmed (red until built): card corner radius matches the radius of the creative image it contains.',
      tags: '@bento-grid @bacom @regression @iswa-v2',
    },
  ],
};
