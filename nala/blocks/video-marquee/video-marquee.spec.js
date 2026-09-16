// Default target: the dedicated Nala test page. Run the whole suite against the
// ISWA integration page instead with env ISWA_INTEGRATION_PAGE=<path>.
//   LOCAL_TEST_LIVE_URL=https://stage--da-bacom--adobecom.aem.live
const INTEGRATION_PAGE = process.env.ISWA_INTEGRATION_PAGE;
const pagePath = (dedicated) => INTEGRATION_PAGE || dedicated;

module.exports = {
  name: 'BACOM Video Marquee Block',
  features: [
    {
      tcid: 'MARQUEE-01',
      name: '@video-marquee-structure',
      path: pagePath('/drafts/nala/blocks/marquee/marquee-video?martech=off'),
      description: 'Left content renders eyebrow logo, a headline and subcopy; a right-side video panel renders.',
      tags: '@video-marquee @bacom @smoke @regression @bacomSmoke',
    },
    {
      tcid: 'MARQUEE-02',
      name: '@video-marquee-embed',
      path: pagePath('/drafts/nala/blocks/marquee/marquee-video?martech=off'),
      description: 'AC: video autoplays and exposes captions — the Adobe TV embed is configured with autoplay + captions.',
      tags: '@video-marquee @bacom @regression',
    },
    {
      tcid: 'MARQUEE-03',
      name: '@video-marquee-rounded',
      path: pagePath('/drafts/nala/blocks/marquee/marquee-video?martech=off'),
      description: 'AC (MWPW-204832): the video panel renders with rounded corners (and clips its content).',
      tags: '@video-marquee @bacom @regression',
    },
    {
      tcid: 'MARQUEE-04',
      name: '@video-marquee-logo',
      path: pagePath('/drafts/nala/blocks/marquee/marquee-video?martech=off'),
      description: 'AC (MWPW-204832): the eyebrow logo renders (not shrunk to nothing) with its aspect ratio preserved.',
      tags: '@video-marquee @bacom @regression',
    },
    {
      tcid: 'MARQUEE-05',
      name: '@video-marquee-full-bleed',
      path: pagePath('/drafts/nala/blocks/marquee/marquee-video?martech=off'),
      description: 'AC (MWPW-204832): on large desktop the marquee spans the full browser width (no white side gutters).',
      tags: '@video-marquee @bacom @regression',
    },
  ],
};
