// eslint-disable-next-line import/no-unresolved
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

const MOCK_PAGE = `
  <body>
    <header></header>
    <main><div class="section"><h1>Hello Nobu</h1></div></main>
    <footer></footer>
  </body>`;

(async function init() {
  // Create cancel button
  const { context, token } = await DA_SDK;
  const { org, repo } = context;

  const blob = new Blob([MOCK_PAGE], { type: 'text/html' });
  const body = new FormData();
  body.append('data', blob);
  const opts = {
    headers: { Authorization: `Bearer ${token}` },
    method: 'POST',
    body,
  };
  const fullpath = `https://admin.da.live/source/${org}/${repo}/drafts/slavin/nobu/nobu.html`;
  const resp = await fetch(fullpath, opts);
  console.log(resp.status);
}());
