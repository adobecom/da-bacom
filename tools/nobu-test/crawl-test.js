// eslint-disable-next-line import/no-unresolved
import { crawl } from 'https://da.live/nx/public/utils/tree.js';
// eslint-disable-next-line import/no-unresolved
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

const PATH = '/adobecom/da-bacom/products/analytics/';

(async function init() {
  // Create cancel button
  const { context, token } = await DA_SDK;
  const DA_ORIGIN = 'https://admin.da.live';

  const fullPath = `${DA_ORIGIN}/list${PATH}`;

  const HEADERS = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const opts = {
    method: 'GET',
    headers: HEADERS,
  };

  const resp = await fetch(fullPath, opts);
  if (resp.ok) {
    const json = await resp.json();
    console.log(json);
  }
}());
