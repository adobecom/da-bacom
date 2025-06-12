// eslint-disable-next-line import/no-unresolved
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

(async function init() {
  const { context, token } = await DA_SDK;
  const { org, repo } = context;
  const opts = {
    headers: { Authorization: `Bearer ${token}` },
    method: 'GET',
  };
  const fullpath = `https://admin.da.live/source/${org}/${repo}/drafts/slavin/nobu/nobu.html`;
  const resp = await fetch(fullpath, opts);
  const text = await resp.text();
  const newParser = new DOMParser();
  const page = newParser.parseFromString(text, 'text/html');
  const number = page.querySelector('.number');

  if (number) {
    let toIterate = parseInt(number.innerHTML, 10);
    toIterate += 1;
    number.innerHTML = toIterate;
  } else {
    const num = document.createElement('div');
    num.classList.add('number');
    page.body.append(num);
  }

  const blob = new Blob([page], { type: 'text/html' });
  const body = new FormData();
  body.append('data', blob);
  const postOpts = {
    headers: { Authorization: `Bearer ${token}` },
    method: 'POST',
    body,
  };
  const postResp = await fetch(fullpath, postOpts);
  console.log(postResp.status);
}());
