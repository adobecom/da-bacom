// Default target: the dedicated Nala test page. Run against the ISWA
// integration page instead with env ISWA_INTEGRATION_PAGE=<path>.
//   LOCAL_TEST_LIVE_URL=https://stage--da-bacom--adobecom.aem.live
// NOTE: the C2 gradient background (MWPW-204891) is applied via section-metadata,
// which is not authored on the dedicated page — it is covered by the
// c2-section-metadata suite / verified on the finished page.
const INTEGRATION_PAGE = process.env.ISWA_INTEGRATION_PAGE;
const pagePath = (dedicated) => INTEGRATION_PAGE || dedicated;

module.exports = {
  name: 'BACOM Resource Showcase Block',
  features: [
    {
      tcid: 'RESOURCE-01',
      name: '@resource-showcase-structure',
      path: pagePath('/drafts/nala/blocks/resource-showcase/resource-showcase?martech=off'),
      description: 'Section heading, featured card (image/title/description/CTA + chevron) and secondary list render.',
      tags: '@resource-showcase @bacom @smoke @regression @bacomSmoke',
      expected: { minItems: 1 },
    },
    {
      tcid: 'RESOURCE-02',
      name: '@resource-showcase-featured-link',
      path: pagePath('/drafts/nala/blocks/resource-showcase/resource-showcase?martech=off'),
      description: 'Featured card becomes a single link with an aria-label matching its title.',
      tags: '@resource-showcase @bacom @regression',
    },
    {
      tcid: 'RESOURCE-03',
      name: '@resource-showcase-secondary-items',
      path: pagePath('/drafts/nala/blocks/resource-showcase/resource-showcase?martech=off'),
      description: 'Every secondary item exposes a title, a chevron CTA and an authored destination href.',
      tags: '@resource-showcase @bacom @regression',
    },
    {
      tcid: 'RESOURCE-04',
      name: '@resource-showcase-featured-image-top',
      path: pagePath('/drafts/nala/blocks/resource-showcase/resource-showcase?martech=off'),
      description: 'AC: featured image sits above the title/description/CTA body and is served responsively.',
      tags: '@resource-showcase @bacom @regression',
    },
    {
      tcid: 'RESOURCE-05',
      name: '@resource-showcase-responsive',
      path: pagePath('/drafts/nala/blocks/resource-showcase/resource-showcase?martech=off'),
      description: 'AC: two columns on desktop; stacks to a single column with the featured card first below the tablet breakpoint.',
      tags: '@resource-showcase @bacom @regression',
    },
    {
      tcid: 'RESOURCE-06',
      name: '@resource-showcase-a11y',
      path: pagePath('/drafts/nala/blocks/resource-showcase/resource-showcase?martech=off'),
      description: 'AC: one section H2 heading, item titles are H3, featured image has alt text, featured card is keyboard-focusable.',
      tags: '@resource-showcase @bacom @regression @a11y',
    },
  ],
};
