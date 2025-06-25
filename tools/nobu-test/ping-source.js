import DA_SDK from 'https://da.live/nx/utils/sdk.js';

(async function init() {
  const { context, token } = await DA_SDK;
  const { org, repo } = context;
  const opts = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    method: 'GET',
  };
  const fullpath = `https://admin.da.live/source/${org}/${repo}/drafts/slavin/nobu/nobu.html`;
  const resp = await fetch(fullpath, opts);
  const text = await resp.text();
  const newParser = new DOMParser();
  const page = newParser.parseFromString(text, 'text/html');
  console.log(page, resp.status, text);
}());
