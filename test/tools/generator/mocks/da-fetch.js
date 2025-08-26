import sinon from 'sinon';

export const daFetch = sinon.stub();

daFetch.callsFake(async (url, options = {}) => {
  const method = options.method || 'GET';

  if (method === 'GET') {
    if (url.includes('.html')) {
      return {
        ok: true,
        text: async () => `
          <html>
            <head><title>Mock Document</title></head>
            <body>
              <main>
                <div class="marquee">
                  <img src="mocks/mock-image.jpg" alt="Mock Image" />
                  <h1>Mock Headline</h1>
                  <p>Mock description</p>
                </div>
                <div class="content">
                  <p>Mock content</p>
                </div>
              </main>
            </body>
          </html>
        `,
        json: async () => ({ success: true }),
      };
    }

    return {
      ok: true,
      text: async () => 'Mock response',
      json: async () => ({ success: true }),
    };
  }

  if (method === 'PUT') {
    return {
      ok: true,
      json: async () => ({
        source: {
          contentUrl: url.includes('image') || url.includes('.jpg') || url.includes('.png')
            ? '/test/tools/generator/mocks/mock-image.jpg'
            : '/test/tools/generator/mocks/mock-document.html',
        },
      }),
    };
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

export default { daFetch, replaceHtml };
