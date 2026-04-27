/* eslint-disable max-len */
/* eslint-disable no-console */
/* eslint-disable import/no-unresolved */
import { daFetch, replaceHtml } from 'da-fetch';
import {
  ORG,
  REPO,
  ADMIN_DA_ORIGIN,
  getHelixResourceStatusUrl,
  getAdminDaVersionListUrl,
} from './paths-config.js';

function getDaPath(path, isHtml) {
  const basePath = path.replace(/\.html$/, '');
  const htmlPath = isHtml ? `${basePath}.html` : basePath;
  return `${ADMIN_DA_ORIGIN}/source/${ORG}/${REPO}${htmlPath}`;
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

/**
 * Best-effort: read "last modified by" / editor attribution from a Source GET response.
 * DA does not document a stable header name; we try known keys then fuzzy-match `x-da-*`.
 * Note: browsers only expose headers listed in Access-Control-Expose-Headers for CORS responses.
 */
export function lastModifiedByFromSourceResponse(response) {
  if (!response?.headers?.get) return null;
  const h = response.headers;
  const directKeys = [
    'x-da-last-modified-by',
    'x-da-modified-by',
    'x-da-editor',
    'x-da-user',
    'x-da-author',
    'x-github-commit-author',
  ];
  for (let i = 0; i < directKeys.length; i += 1) {
    const v = h.get(directKeys[i]);
    if (v && String(v).trim()) return String(v).trim();
  }
  try {
    const entries = typeof h.entries === 'function' ? [...h.entries()] : [];
    for (let i = 0; i < entries.length; i += 1) {
      const [key, value] = entries[i];
      if (value && String(value).trim()) {
        const kl = key.toLowerCase();
        if ((kl.startsWith('x-da-') || kl.includes('da-'))
          && (kl.includes('user') || kl.includes('author') || kl.includes('editor') || kl.includes('by'))) {
          return String(value).trim();
        }
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Parse DA `versionlist` JSON: newest version first, return first usable user label/email.
 */
export function lastAuthorFromVersionListPayload(data) {
  if (!Array.isArray(data) || data.length === 0) return null;
  const sorted = [...data].sort(
    (a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0),
  );
  for (let i = 0; i < sorted.length; i += 1) {
    const users = sorted[i]?.users;
    if (Array.isArray(users)) {
      for (let j = 0; j < users.length; j += 1) {
        const u = users[j];
        if (u) {
          if (typeof u === 'string' && u.trim()) return u.trim();
          if (typeof u.email === 'string' && u.email.trim()) return u.email.trim();
          if (typeof u.name === 'string' && u.name.trim()) return u.name.trim();
        }
      }
    }
  }
  return null;
}

async function fetchVersionListLastAuthor(repoRelativePath) {
  try {
    const url = getAdminDaVersionListUrl(repoRelativePath);
    const res = await daFetch(url, { method: 'GET', headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    return lastAuthorFromVersionListPayload(data);
  } catch {
    return null;
  }
}

async function fetchHelixLastModifiedBy(repoRelativePath) {
  try {
    const url = getHelixResourceStatusUrl(repoRelativePath);
    const res = await daFetch(url, { method: 'GET', headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    const by = data?.live?.lastModifiedBy || data?.preview?.lastModifiedBy;
    if (by && String(by).trim()) return String(by).trim();
    return null;
  } catch {
    return null;
  }
}

/**
 * GET HTML source and parse document, plus optional DA "last modified by" from response headers.
 */
export async function getSourceWithMeta(path) {
  const daPath = getDaPath(path, true);
  const opts = { method: 'GET', headers: { accept: '*/*' } };

  try {
    const response = await daFetch(daPath, opts);
    if (!response.ok) {
      return { doc: null, lastModifiedBy: null };
    }
    let lastModifiedBy = lastModifiedByFromSourceResponse(response);
    if (!lastModifiedBy) {
      lastModifiedBy = await fetchVersionListLastAuthor(path);
    }
    if (!lastModifiedBy) {
      lastModifiedBy = await fetchHelixLastModifiedBy(path);
    }
    const html = await response.text();
    const newParser = new DOMParser();
    const parsedPage = newParser.parseFromString(html, 'text/html');
    return { doc: parsedPage, lastModifiedBy };
  /* c8 ignore next 5 */
  } catch (error) {
    console.log(`Error fetching document ${daPath}`, error);
  }
  return { doc: null, lastModifiedBy: null };
}

export async function getSource(path) {
  const { doc } = await getSourceWithMeta(path);
  return doc;
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
  const daPath = `${ADMIN_DA_ORIGIN}/source/${ORG}/${REPO}${path}`;
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

function normalizeAemUrl(url) {
  if (!url || typeof url !== 'string') return null;
  return url.replace('hlx.page', 'aem.page').replace('hlx.live', 'aem.live');
}

export const AEM_MAX_FULL_PATH_LENGTH = 900;

export function sanitizeFileName(filename, pathPrefix = '') {
  if (pathPrefix.length >= AEM_MAX_FULL_PATH_LENGTH) return null;
  const maxNameLen = AEM_MAX_FULL_PATH_LENGTH - pathPrefix.length;
  if (maxNameLen < 1) return null;

  const lower = filename && typeof filename === 'string' ? filename.toLowerCase() : '';
  const lastDot = lower.lastIndexOf('.');
  let ext = lastDot > 0 ? lower.slice(lastDot) : '';
  if (ext) {
    const extBody = ext.slice(1).replace(/[^a-z0-9]/g, '');
    ext = extBody ? `.${extBody}` : '';
  }
  let base = lastDot > 0 ? lower.slice(0, lastDot) : lower;
  base = base
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'asset';

  if (ext.length > maxNameLen) return null;
  const maxBaseLen = maxNameLen - ext.length;
  if (maxBaseLen < 1) return null;
  if (base.length > maxBaseLen) {
    base = base.slice(0, maxBaseLen).replace(/-+$/, '') || 'a';
  }
  const name = base + ext;
  return name.length <= maxNameLen ? name : null;
}

export async function saveFile(path, file) {
  const safeName = sanitizeFileName(file.name, path);
  if (!safeName) {
    console.error(`Couldn't save file: path exceeds AEM ${AEM_MAX_FULL_PATH_LENGTH} character limit or file name cannot fit`);
    return null;
  }
  const fileToUpload = safeName !== file.name ? new File([file], safeName, { type: file.type }) : file;
  const daPath = getDaPath(`${path}${fileToUpload.name}`, false);
  const formData = new FormData();
  formData.append('data', fileToUpload);
  const opts = { method: 'POST', body: formData };
  try {
    const resp = await daFetch(daPath, opts);

    if (resp.ok) {
      const json = await resp.json();
      const liveUrl = normalizeAemUrl(json?.aem?.liveUrl);
      const previewUrl = normalizeAemUrl(json?.aem?.previewUrl);

      return { source: json?.source, aem: { liveUrl, previewUrl }, fileName: safeName };
    }
    /* c8 ignore next 7 */
    return null;
  } catch (error) {
    console.error(`Couldn't save ${path}${fileToUpload.name}:`, error);
    return null;
  }
}

export async function checkPath(path) {
  const parentDir = path.replace(/\/[^/]+$/, '');
  const fileName = path.split('/').pop();
  const listUrl = `${ADMIN_DA_ORIGIN}/list/${ORG}/${REPO}${parentDir}`;
  try {
    const listResponse = await daFetch(listUrl, { method: 'GET' });
    if (!listResponse.ok) return false;

    const listData = await listResponse.json();
    if (!Array.isArray(listData)) return false;

    return listData.some((item) => item.name === fileName);
  } catch (error) {
    throw new Error(`Path conflict check failed for ${path}: ${error}`);
  }
}
