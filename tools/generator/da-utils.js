/* eslint-disable import/no-unresolved */
import { daFetch, replaceHtml } from 'da-fetch';
import { DA_ORIGIN } from 'constants';

const ORG = 'adobecom';
const REPO = 'da-bacom';

function getDaPath(path) {
  return `${DA_ORIGIN}/source/${ORG}/${REPO}${path}`;
}

export async function getSource(path) {
  const daPath = `${getDaPath(path)}.html`;
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
  const main = document.querySelector('main');
  const text = main.innerHTML;
  const daPath = `${getDaPath(path)}.html`;
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
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`Couldn't save ${daPath}`, error);
  }
  return null;
}

export async function saveImage(path, file) {
  const daPath = getDaPath(`${path}${file.name}`);
  const formData = new FormData();
  const opts = { method: 'PUT', body: formData };

  formData.append('data', file);
  try {
    const resp = await daFetch(daPath, opts);

    if (resp.ok) {
      const json = await resp.json();
      return json?.source?.contentUrl;
    }

    return null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`Couldn't save ${path}${file.name}`, error);

    return null;
  }
}
