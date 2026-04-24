/* eslint-disable import/no-unresolved */
import { daFetch } from 'da-fetch';
import { crawl } from 'https://da.live/nx/public/utils/tree.js';
import { getSource, getSheets, saveSheets } from './da-utils.js';
import { ORG, REPO, getAdminPreviewUrl } from './paths-config.js';

export const LOG_PATH = '/tools/page-builder/landing-page/data/lpb-log';
export const SCAN_ROOT = '/resources';
export const MARKER_SELECTOR = '.table.hide-block.page-builder';
export const MARKER_NAME = 'landing-page-builder';

const REPO_PREFIX = `/${ORG}/${REPO}`;

function toRepoRelative(path) {
  if (!path) return path;
  return path.startsWith(REPO_PREFIX) ? path.slice(REPO_PREFIX.length) : path;
}

function stripHtmlExt(path) {
  return path?.replace(/\.html$/, '') ?? path;
}

export function extractMarker(doc) {
  if (!doc?.querySelector) return null;
  const el = doc.querySelector(MARKER_SELECTOR);
  if (!el) return null;
  const data = {};
  el.querySelectorAll(':scope > div').forEach((row) => {
    const cells = row.querySelectorAll(':scope > div');
    if (cells.length < 2) return;
    const key = cells[0].textContent?.trim();
    const value = cells[1].textContent?.trim();
    if (key) data[key] = value;
  });
  return data.name === MARKER_NAME ? data : null;
}

/**
 * Derive a content type from a page path, e.g. /resources/guides/foo -> guide.
 * Returns null if the path doesn't match a known bucket.
 */
export function deriveContentType(path) {
  if (!path) return null;
  const match = path.match(/\/resources\/([^/]+)\//);
  if (!match) return null;
  const bucket = match[1].toLowerCase();
  const map = {
    guides: 'guide',
    reports: 'report',
    videos: 'video/demo',
    infographics: 'infographic',
    sdk: 'ungated',
  };
  return map[bucket] ?? bucket;
}

/**
 * Decode an Adobe IMS JWT and return a best-effort publisher identifier.
 * Falls back to 'unknown' if the token can't be decoded.
 */
export function publisherFromToken(token) {
  if (!token || typeof token !== 'string') return 'unknown';
  const parts = token.split('.');
  if (parts.length < 2) return 'unknown';
  try {
    const payload = JSON.parse(
      decodeURIComponent(
        atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
          .split('')
          .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
          .join(''),
      ),
    );
    return payload.email || payload.user_id || payload.sub || 'unknown';
  } catch {
    return 'unknown';
  }
}

export function resolvePublisher(context, token) {
  return context?.user?.email
    || context?.user?.id
    || publisherFromToken(token);
}

async function readLog() {
  const sheet = await getSheets(LOG_PATH).catch(() => null);
  return Array.isArray(sheet?.data) ? sheet.data : [];
}

/**
 * Append or refresh a single row (called from LPB on publish).
 * Non-throwing: logs via lana on failure so publish flow is never blocked.
 */
export async function appendLogRow({ url, publisher, version, contentType } = {}) {
  if (!url) return null;
  const normalizedUrl = stripHtmlExt(url);
  const now = new Date().toISOString();
  try {
    const existing = await readLog();
    const index = existing.findIndex((row) => row.url === normalizedUrl);
    const prev = index >= 0 ? existing[index] : null;
    const row = {
      url: normalizedUrl,
      publishedAt: prev?.publishedAt || now,
      publisher: publisher || prev?.publisher || 'unknown',
      version: version || prev?.version || '',
      contentType: contentType || prev?.contentType || deriveContentType(normalizedUrl) || '',
      lastSeenAt: now,
      status: 'active',
    };
    const next = index >= 0
      ? existing.map((r, i) => (i === index ? { ...r, ...row } : r))
      : [...existing, row];
    const res = await saveSheets(LOG_PATH, next);
    if (res?.ok) {
      try { await daFetch(getAdminPreviewUrl(`${LOG_PATH}.json`), { method: 'POST' }); } catch { /* preview best-effort */ }
    }
    return res;
  } catch (error) {
    window.lana?.log?.(`LPB log append failed: ${error?.message || error}`, { severity: 'warning', tags: 'landing-page-builder,lpb-log' });
    return null;
  }
}

/**
 * Walk SCAN_ROOT with DA's crawl utility, loading every HTML page and
 * extracting the LPB marker table when present.
 */
export async function scanResources({ onProgress, throttle = 10 } = {}) {
  const found = [];
  const callback = async (item) => {
    if (item.ext !== 'html') return;
    const relativePath = toRepoRelative(item.path);
    onProgress?.(relativePath);
    const doc = await getSource(relativePath).catch(() => null);
    const marker = extractMarker(doc);
    if (marker) {
      found.push({
        url: stripHtmlExt(relativePath),
        version: marker.version ?? '',
        contentType: deriveContentType(relativePath) || '',
      });
    }
  };

  const { results } = crawl({ path: `${REPO_PREFIX}${SCAN_ROOT}`, callback, throttle });
  await results;
  return found;
}

/**
 * Full rebuild: scan the resources folder, reconcile with the current sheet,
 * soft-delete rows for pages that no longer carry the marker, and persist.
 */
export async function rebuildLog({ onProgress, throttle = 10 } = {}) {
  const [found, existing] = await Promise.all([
    scanResources({ onProgress, throttle }),
    readLog(),
  ]);
  const now = new Date().toISOString();
  const byUrl = new Map(existing.map((row) => [row.url, row]));
  const foundUrls = new Set(found.map((row) => row.url));

  const active = found.map((row) => {
    const prev = byUrl.get(row.url);
    return {
      url: row.url,
      publishedAt: prev?.publishedAt || now,
      publisher: prev?.publisher || 'unknown',
      version: row.version || prev?.version || '',
      contentType: row.contentType || prev?.contentType || '',
      lastSeenAt: now,
      status: 'active',
    };
  });

  const removed = existing
    .filter((row) => !foundUrls.has(row.url))
    .map((row) => ({
      ...row,
      status: 'removed',
      removedAt: row.removedAt || now,
    }));

  const next = [...active, ...removed];
  const res = await saveSheets(LOG_PATH, next).catch((error) => {
    window.lana?.log?.(`LPB log rebuild save failed: ${error?.message || error}`, { severity: 'warning', tags: 'landing-page-builder,lpb-log' });
    return null;
  });
  if (res?.ok) {
    try { await daFetch(getAdminPreviewUrl(`${LOG_PATH}.json`), { method: 'POST' }); } catch { /* preview best-effort */ }
  }
  return { rows: next, active: active.length, removed: removed.length, saved: !!res?.ok };
}

export async function getLog() {
  return readLog();
}
