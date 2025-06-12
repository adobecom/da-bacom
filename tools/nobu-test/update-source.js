// eslint-disable-next-line import/no-unresolved
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

(async function init() {
  const { context, token } = await DA_SDK;
  const { org, repo } = context;
  // const opts = {
  //   headers: { Authorization: `Bearer ${token}` },
  //   method: 'GET',
  // };
  const fullpath = 'https://main--da-bacom--adobecom.aem.page/drafts/slavin/nobu/nobu';
  const resp = await fetch(fullpath);
  const text = await resp.text();
  const newParser = new DOMParser();
  const page = newParser.parseFromString(text, 'text/html');
  console.log(text, page, resp.status);
  const section = page.querySelector('.text div div');
  const number = section.querySelector('p');
  console.log('SECTION', section);

  if (number) {
    let toIterate = parseInt(number.innerHTML, 10);
    toIterate += 1;
    number.innerHTML = toIterate;
  } else {
    const num = document.createElement('p');
    num.classList.add('number');
    num.innerHTML = 1;
    section.append(num);
  }
  console.log(page, 'update');

  const updatePath = `https://admin.da.live/source/${org}/${repo}/drafts/slavin/nobu/nobu.html`;

  const xmlSer = new XMLSerializer();
  const newText = xmlSer.serializeToString(page);

  const blob = new Blob([newText], { type: 'text/html' });
  const body = new FormData();
  body.append('data', blob);
  const postOpts = {
    headers: { Authorization: `Bearer ${token}` },
    method: 'POST',
    body,
  };
  const postResp = await fetch(updatePath, postOpts);
  console.log(postResp.status);
}());
