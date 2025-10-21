/* eslint-disable import/no-unresolved */
import { daFetch, replaceHtml } from 'da-fetch';
import { DA_ORIGIN } from 'constants';

const ORG = 'adobecom';
const REPO = 'da-bacom';

function getDaPath(path, isHtml) {
  if (isHtml) {
    const htmlPath = path.endsWith('.html') ? path : `${path}.html`;
    return `${DA_ORIGIN}/source/${ORG}/${REPO}${htmlPath}`;
  }
  return `${DA_ORIGIN}/source/${ORG}/${REPO}${path.replace('.html', '')}`;
}

function getAssetPath(path) {
  const assetPath = `${path.replace('.html', '')}/`;
  return assetPath.split('/').map((part, index, arr) => (index === arr.length - 2 ? `.${part}` : part)).join('/');
}

export async function getSource(path) {
  const daPath = getDaPath(path, true);
  const opts = { method: 'GET', headers: { accept: '*/*' } };

  try {
    const response = await daFetch(daPath, opts);
    if (response.ok) {
      const html = await response.text();
      const newParser = new DOMParser();
      const parsedPage = newParser.parseFromString(html, 'text/html');

      return parsedPage;
    }
  /* c8 ignore next 5 */
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`Error fetching document ${daPath}`, error);
  }
  return null;
}

export async function saveSource(path, document) {
  let parsedDocument = document;
  if (typeof parsedDocument === 'string') {
    const parser = new DOMParser();
    parsedDocument = parser.parseFromString(parsedDocument, 'text/html');
  }

  const main = parsedDocument.querySelector('main');
  const text = main.innerHTML;
  const daPath = getDaPath(path, true);
  const body = replaceHtml(text, ORG, REPO);
  const blob = new Blob([body], { type: 'text/html' });
  const formData = new FormData();
  const opts = { method: 'PUT', body: formData };

  formData.append('data', blob);
  try {
    const daResp = await daFetch(daPath, opts);
    if (daResp.ok) {
      const json = await daResp.json();

      return json?.source?.contentUrl;
    }
  /* c8 ignore next 5 */
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`Couldn't save ${daPath}`, error);
  }
  return null;
}

export async function saveImage(path, file) {
  const assetPath = getAssetPath(path);
  const daPath = getDaPath(`${assetPath}${file.name}`, false);
  const formData = new FormData();
  const opts = { method: 'PUT', body: formData };

  formData.append('data', file);
  try {
    const resp = await daFetch(daPath, opts);

    if (resp.ok) {
      const json = await resp.json();
      return json?.source?.contentUrl;
    }
    /* c8 ignore next 7 */
    return null;
  } catch (error) {
    throw new Error(`Couldn't save ${path}${file.name}`, error);
  }
}
