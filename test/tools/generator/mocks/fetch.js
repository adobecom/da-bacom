import { stub } from 'sinon';

export const ogFetch = window.fetch;

export const mockFetch = () => {
  window.fetch = stub();
  window.fetch.callsFake(async (url, options = {}) => {
    const method = options.method || 'GET';

    if (url.includes('admin.hlx.page/preview') && method === 'POST') {
      return {
        ok: true,
        json: async () => ({
          preview: {
            status: 200,
            url: 'https://main--da-bacom--adobecom.aem.page/test',
          },
        }),
      };
    }

    return {
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not Found' }),
      text: async () => 'Not Found',
    };
  });
};

export const restoreFetch = () => {
  window.fetch = ogFetch;
};
