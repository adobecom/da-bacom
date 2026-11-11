module.exports = {
  name: 'BACOM Blog Article',
  features: [
    {
      tcid: 'BLOG-01',
      name: '@blog-article-header',
      path: '/blog/drafts/jsandlan/10-dam-good-reasons-to-attend-adobe-summit',
      description: 'The automatic article header preserves the authored title, author and date without displaying the category.',
      tags: '@blog @bacom @smoke @regression @bacomSmoke',
    },
    {
      tcid: 'BLOG-02',
      name: '@blog-article-content',
      path: '/blog/drafts/jsandlan/10-dam-good-reasons-to-attend-adobe-summit',
      description: 'The featured image loads and body text renders without horizontal overflow on desktop and mobile.',
      tags: '@blog @bacom @regression',
      viewports: [
        { name: 'desktop', width: 1440, height: 900 },
        { name: 'mobile', width: 390, height: 844 },
      ],
    },
    {
      tcid: 'BLOG-03',
      name: '@blog-recommendations',
      path: '/blog/drafts/jsandlan/10-dam-good-reasons-to-attend-adobe-summit',
      description: 'Recommended article cards render with titles, images and blog links, and selecting a card opens its article.',
      tags: '@blog @bacom @smoke @regression',
    },
  ],
};
