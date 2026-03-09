#!/usr/bin/env node

const path = require('path');
const { chromium } = require('playwright');

const ADMIN_DA_ORIGIN = 'https://admin.da.live';
const ADMIN_HLX_ORIGIN = 'https://admin.hlx.page';
const DA_LIVE_URL = 'https://da.live';
const ORG = 'adobecom';
const REPO = 'da-bacom';
const REF = 'main';
const AUTH_FILE = path.resolve(__dirname, '../../utils/auth.json');

const PAGE_PREFIXES = [
  'nala-auto-',
  'nala-e2e-',
  'nala-uat-',
  'nala-lpb-',
];

const REGIONS = ['', '/jp', '/kr', '/au'];
const CONTENT_TYPES = ['guide', 'report', 'infographic', 'video-demo'];
const EXECUTE = process.argv.includes('--execute');

function getFolderPaths() {
  const folders = [];
  REGIONS.forEach((region) => {
    CONTENT_TYPES.forEach((contentType) => {
      folders.push(`${region}/resources/${contentType}`);
    });
  });
  return folders;
}

function shouldDelete(name) {
  return PAGE_PREFIXES.some((prefix) => name.startsWith(prefix));
}

async function pageFetch(page, url, method = 'GET') {
  return page.evaluate(async ({ targetUrl, targetMethod }) => {
    // eslint-disable-next-line import/no-unresolved
    const { daFetch } = await import('https://da.live/nx/utils/daFetch.js');
    const response = await daFetch(targetUrl, { method: targetMethod });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text };
  }, { targetUrl: url, targetMethod: method });
}

async function listFolder(page, folderPath) {
  const response = await pageFetch(page, `${ADMIN_DA_ORIGIN}/list/${ORG}/${REPO}${folderPath}`);
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(`Failed to list ${folderPath}: ${response.status}`);
  }

  try {
    const data = JSON.parse(response.text);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function deleteUrl(page, url) {
  const response = await pageFetch(page, url, 'DELETE');
  if (![200, 202, 204, 404].includes(response.status)) {
    throw new Error(`Failed to delete ${url}: ${response.status}`);
  }
}

async function cleanupPage(page, folderPath, slug) {
  const pagePath = `${folderPath}/${slug}`;
  const assetPath = `${folderPath}/.${slug}`;

  console.log(`${EXECUTE ? 'Deleting' : 'Would delete'} ${pagePath}.html`);

  const assetItems = await listFolder(page, assetPath);
  for (const item of assetItems) {
    if (item?.name) {
      console.log(`  ${EXECUTE ? 'Deleting' : 'Would delete'} asset ${assetPath}/${item.name}`);
      if (EXECUTE) {
        await deleteUrl(page, `${ADMIN_DA_ORIGIN}/source/${ORG}/${REPO}${assetPath}/${item.name}`);
      }
    }
  }

  if (EXECUTE) {
    await deleteUrl(page, `${ADMIN_DA_ORIGIN}/source/${ORG}/${REPO}${assetPath}`);
    await deleteUrl(page, `${ADMIN_HLX_ORIGIN}/preview/${ORG}/${REPO}/${REF}${pagePath}`);
    await deleteUrl(page, `${ADMIN_HLX_ORIGIN}/live/${ORG}/${REPO}/${REF}${pagePath}`);
    await deleteUrl(page, `${ADMIN_DA_ORIGIN}/source/${ORG}/${REPO}${pagePath}.html`);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: AUTH_FILE });
  try {
    const page = await context.newPage();
    await page.goto(DA_LIVE_URL);
    await page.waitForLoadState('domcontentloaded');

    for (const folderPath of getFolderPaths()) {
      const entries = await listFolder(page, folderPath);
      const generatedPages = entries.filter((entry) => entry?.name && shouldDelete(entry.name));
      if (generatedPages.length) {
        console.log(`\nFolder: ${folderPath}`);
        for (const entry of generatedPages) {
          await cleanupPage(page, folderPath, entry.name);
        }
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
