/* eslint-disable no-console */
/* eslint-disable import/no-unresolved */
import { daFetch, replaceHtml } from 'da-fetch';
import { DA_ORIGIN } from 'constants';

const ORG = 'adobecom';
const REPO = 'da-bacom';

function getDaPath(path, isHtml) {
  const basePath = path.replace(/\.html$/, '');
  const htmlPath = isHtml ? `${basePath}.html` : basePath;
  return `${DA_ORIGIN}/source/${ORG}/${REPO}${htmlPath}`;
}

function getSheetData(json) {
  if (json[':type'] === 'sheet') return { data: json.data ?? [] };
  if (json[':type'] === 'multi-sheet') {
    return json[':names'].sort().reduce((sheets, name) => {
      sheets[name] = json[name]?.data ?? [];
      return sheets;
    }, {});
  }
  return {};
}

export async function getSheets(path) {
  const daPath = getDaPath(path, false);
  const opts = { method: 'GET', headers: { accept: 'application/json' } };

  try {
    const response = await daFetch(daPath, opts);
    if (response.ok) {
      const json = await response.json();
      return getSheetData(json);
    }
  } catch (error) {
    console.error(`Error fetching stored data from ${path}:`, error);
  }
  return null;
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
    console.log(`Error fetching document ${daPath}`, error);
  }
  return null;
}

function createSheetObject(data, sheetName = 'data') {
  return {
    total: data.length,
    limit: data.length,
    offset: 0,
    data,
    ':type': 'sheet',
    ...(sheetName && { ':sheetname': sheetName }),
  };
}

export function toSheetFormat(data) {
  if (!data) return null;

  if (Array.isArray(data)) {
    return createSheetObject(data);
  }

  const sheets = Object.keys(data);

  if (sheets.length === 0) {
    return createSheetObject([]);
  }

  if (sheets.length === 1) {
    const sheetName = sheets[0];
    const sheetData = Array.isArray(data[sheetName]) ? data[sheetName] : [];
    return createSheetObject(sheetData, sheetName);
  }

  const result = {};
  const includedSheets = [];

  sheets.forEach((sheetName) => {
    const sheetData = Array.isArray(data[sheetName]) ? data[sheetName] : [];
    if (sheetData.length > 0) {
      const sheetObj = createSheetObject(sheetData, sheetName);
      delete sheetObj[':sheetname'];
      result[sheetName] = sheetObj;
      includedSheets.push(sheetName);
    }
  });

  result[':type'] = 'multi-sheet';
  result[':names'] = includedSheets;
  result[':version'] = 3;

  return result;
}

export async function saveSheets(path, data) {
  const daPath = `${DA_ORIGIN}/source/${ORG}/${REPO}${path}`;
  const formData = new FormData();

  const jsonData = toSheetFormat(data);
  const blob = new Blob([JSON.stringify(jsonData)], { type: 'application/json' });

  formData.append('data', blob);
  const opts = { method: 'PUT', body: formData };
  return daFetch(daPath, opts);
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
  formData.append('data', blob);
  const opts = { method: 'PUT', body: formData };

  try {
    const daResp = await daFetch(daPath, opts);
    if (daResp.ok) {
      const json = await daResp.json();

      return json?.source?.contentUrl;
    }
  /* c8 ignore next 5 */
  } catch (error) {
    console.log(`Couldn't save ${daPath}`, error);
  }
  return null;
}

export async function saveFile(path, file) {
  const daPath = getDaPath(`${path}${file.name}`, false);
  const formData = new FormData();
  const opts = { method: 'PUT', body: formData };

  formData.append('data', file);
  try {
    const resp = await daFetch(daPath, opts);

    if (resp.ok) {
      const json = await resp.json();
      const liveUrl = json?.aem?.liveUrl.replace('hlx.page', 'aem.page').replace('hlx.live', 'aem.live');
      const previewUrl = json?.aem?.previewUrl.replace('hlx.page', 'aem.page').replace('hlx.live', 'aem.live');

      return { source: json?.source, aem: { liveUrl, previewUrl } };
    }
    /* c8 ignore next 7 */
    return null;
  } catch (error) {
    throw new Error(`Couldn't save ${path}${file.name}`, error);
  }
}

export async function checkPath(path) {
  const parentDir = path.replace(/\/[^/]+$/, '');
  const listUrl = `${DA_ORIGIN}/list/${ORG}/${REPO}${parentDir}`;
  try {
    const listResponse = await daFetch(listUrl, { method: 'GET' });

    if (!listResponse.ok) {
      return false;
    }

    const listData = await listResponse.json();
    const hasSources = listData.sources && listData.sources.length > 0;

    return hasSources;
  } catch (error) {
    throw new Error(`Path conflict check failed for ${path}: ${error}`);
  }
}
