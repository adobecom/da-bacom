const { paths } = require('./link-paths');
const { pages } = require('./visual-pages');

module.exports = {
  name: 'BACOM Blog Comparison Reports',
  features: [
    {
      tcid: 'BLOG-11',
      name: '@blog-link-comparison',
      description: 'Report main-content link differences between stable BACOM and the selected branch across the full legacy inventory.',
      tags: '@blog @bacom @comparison @nopr',
      paths,
    },
    {
      tcid: 'BLOG-12',
      name: '@blog-visual-comparison',
      description: 'Capture paired full-page screenshots of the legacy visual pages for manual review.',
      tags: '@blog @bacom @comparison @nopr',
      pages,
    },
  ],
};
