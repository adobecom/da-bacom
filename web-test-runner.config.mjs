/* eslint-disable import/no-extraneous-dependencies */
import { importMapsPlugin } from '@web/dev-server-import-maps';

export default {
  coverageConfig: {
    exclude: [
      '**/mocks/**',
      '**/node_modules/**',
      '**/test/**',
      '**/deps/**',
    ],
  },
  plugins: [
    importMapsPlugin({
      inject: {
        importMap: {
          imports: {
            'da-lit': 'https://da.live/nx/deps/lit/lit-core.min.js',
          },
        },
      },
    }),
  ],
  testRunnerHtml: (testFramework) => `
    <html>
      <head>
        <link rel="icon" href="/libs/img/favicons/favicon.ico" size="any">
        <script type='module'>
          const oldFetch = window.fetch;
          window.fetch = async (resource, options) => {
            if (!resource.startsWith('/') && !resource.startsWith('http://localhost')) {
              console.error(
                '** fetch request for an external resource is disallowed in unit tests, please find a way to mock! https://github.com/orgs/adobecom/discussions/814#discussioncomment-6060759 provides guidance on how to fix the issue.',
                resource
              );
            }
            return oldFetch.call(window, resource, options);
          };

          const oldXHROpen = XMLHttpRequest.prototype.open;
          XMLHttpRequest.prototype.open = async function (...args) {
            let [method, url, asyn] = args;
            if (!resource.startsWith('/') && url.startsWith('http://localhost')) {
              console.error(
                '** XMLHttpRequest request for an external resource is disallowed in unit tests, please find a way to mock! https://github.com/orgs/adobecom/discussions/814#discussioncomment-6060759 provides guidance on how to fix the issue.',
                url
              );
            }
            return oldXHROpen.apply(this, args);
          };

          const observer = new MutationObserver((mutationsList, observer) => {
            for(let mutation of mutationsList) {
              if (mutation.type === 'childList') {
                for(let node of mutation.addedNodes) {
                  if(node.nodeName === 'SCRIPT' && node.src && !node.src.startsWith('http://localhost')) {
                    console.error(
                      '** An external 3rd script has been added. This is disallowed in unit tests, please find a way to mock! https://github.com/orgs/adobecom/discussions/814#discussioncomment-6060891 provides guidance on how to fix the issue.',
                      node.src
                    );
                  }
                }
              }
            }
          });
          observer.observe(document.head, { childList: true });
        </script>
      </head>
      <body>
        <script type='module' src='${testFramework}'></script>
      </body>
    </html>`,
};
