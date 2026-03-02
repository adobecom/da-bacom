import sinon from 'sinon';

export const daFetch = sinon.stub();
export const initIms = sinon.stub();

const mockPageOptions = {
  ':type': 'multi-sheet',
  ':names': ['regions', 'primaryProductName', 'experienceFragment', 'marqueeEyebrow', 'templateMap'],
  regions: {
    data: [
      { value: '/', label: 'US' },
      { value: '/jp/', label: 'Japan' },
      { value: '/fr/', label: 'France' },
    ],
  },
  primaryProductName: {
    data: [
      { value: 'adobe-analytics', label: 'Adobe Analytics' },
      { value: 'adobe-experience-manager', label: 'Adobe Experience Manager' },
      { value: 'adobe-target', label: 'Adobe Target' },
    ],
  },
  experienceFragment: {
    data: [
      { value: '/fragments/resources/cards/thank-you-collections/advertising', label: 'Advertising Thank You' },
      { value: '/fragments/resources/cards/thank-you-collections/analytics', label: 'Analytics Thank You' },
    ],
  },
  marqueeEyebrow: {
    data: [
      { value: 'Guide', label: 'Guide' },
      { value: 'Report', label: 'Report' },
      { value: 'Infographic', label: 'Infographic' },
    ],
  },
  templateMap: { data: [] },
};

const mockMarketoPOI = {
  ':type': 'sheet',
  data: [
    { value: 'adobe-analytics', label: 'Adobe Analytics' },
    { value: 'adobe-target', label: 'Adobe Target' },
    { value: 'adobe-experience-manager', label: 'Adobe Experience Manager' },
  ],
};

const mockCaasCollections = {
  ':type': 'multi-sheet',
  ':names': ['primaryProducts', 'industries'],
  primaryProducts: {
    data: [
      { value: 'caas:products/adobe-analytics', label: 'Adobe Analytics' },
      { value: 'caas:products/adobe-target', label: 'Adobe Target' },
      { value: 'caas:products/adobe-experience-manager', label: 'Adobe Experience Manager' },
    ],
  },
  industries: {
    data: [
      { value: 'caas:industry/retail', label: 'Retail' },
      { value: 'caas:industry/finance', label: 'Finance' },
      { value: 'caas:industry/healthcare', label: 'Healthcare' },
    ],
  },
};

const mockTemplateRules = {
  ':type': 'multi-sheet',
  ':names': ['Medium', 'Short'],
  Medium: {
    data: [
      { value: 'formVersion', label: '2345' },
      { value: 'purpose', label: 'Event Registration' },
    ],
  },
  Short: {
    data: [
      { value: 'formVersion', label: '1234' },
      { value: 'purpose', label: 'Content Download' },
    ],
  },
};

const mockTemplate = `
  <html>
    <head><title>Mock Template</title></head>
    <body>
      <main>
        <div class="marquee">
          <img src="{{marquee-image}}" alt="{{marquee-headline}}" />
          <h1>{{marquee-headline}}</h1>
          <p>{{marquee-description}}</p>
        </div>
        <div class="content">
          <p>{{body-description}}</p>
        </div>
      </main>
    </body>
  </html>
`;

daFetch.callsFake(async (url, options = {}) => {
  const method = options.method || 'GET';
  const path = new URL(url).pathname;

  if (method === 'GET') {
    if (path.startsWith('/list/')) {
      return { ok: true, json: async () => ({ sources: [] }) };
    }

    if (path.startsWith('/source/')) {
      if (path.includes('page-options.json')) {
        return { ok: true, json: async () => mockPageOptions };
      }

      if (path.includes('marketo-poi-options.json')) {
        return { ok: true, json: async () => mockMarketoPOI };
      }

      if (path.includes('caas-collections.json')) {
        return { ok: true, json: async () => mockCaasCollections };
      }

      if (path.includes('marketo-template-rules.json')) {
        return { ok: true, json: async () => mockTemplateRules };
      }

      if (path.includes('/tools/page-builder/') && path.includes('.html')) {
        return {
          ok: true,
          text: async () => mockTemplate,
        };
      }
    }
  }

  if (method === 'PUT') {
    if (path.startsWith('/source/')) {
      if (path.includes('mock-image.jpg')) {
        return {
          ok: true,
          json: async () => ({
            source: { contentUrl: '/test/tools/generator/mocks/mock-image.jpg' },
            aem: { previewUrl: '/test/tools/generator/mocks/mock-image.jpg' },
          }),
        };
      }

      if (path.includes('mock-document.html')) {
        return {
          ok: true,
          json: async () => ({
            source: { contentUrl: '/test/tools/generator/mocks/mock-document.html' },
            aem: { previewUrl: '/test/tools/generator/mocks/mock-document.html' },
          }),
        };
      }
    }
  }

  return {
    ok: false,
    status: 404,
    statusText: 'Not Found',
    text: async () => 'Not Found',
    json: async () => ({ error: 'Not Found' }),
  };
});

export const replaceHtml = (html, org, repo) => html.replace(/href="([^"]*?)"/g, (match, url) => {
  if (url.startsWith('/')) {
    return `href="https://main--${repo}--${org}.hlx.page${url}"`;
  }
  return match;
});

initIms.callsFake(async () => ({ accessToken: { token: 'mock-token' } }));
