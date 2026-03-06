export const ORG = 'adobecom';
export const REPO = 'da-bacom';
export const BRANCH = 'main';

export const STAGE_ORIGIN = 'https://business.stage.adobe.com';
export const CONTENT_ORIGIN = 'https://content.da.live';
export const ADMIN_ORIGIN = 'https://admin.hlx.page';
export const AEM_PAGE_ORIGIN = `https://${BRANCH}--${REPO}--${ORG}.aem.page`;
export const AEM_LIVE_ORIGIN = `https://${BRANCH}--${REPO}--${ORG}.aem.live`;

export const CONTENT_PATH_PREFIX = `/${ORG}/${REPO}`;
export const TEMPLATES_BASE_PATH = '/docs/library/templates/';

export const ADMIN_STATUS_URL = `${ADMIN_ORIGIN}/status/${ORG}/${REPO}/${BRANCH}/`;

export function getPathFromUrl(url) {
  if (!url || typeof url !== 'string') return url;
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return url;
  }
}

export function getRepoRelativePath(path) {
  if (!path || typeof path !== 'string') return path;
  const stripped = path.replace(new RegExp(`^${CONTENT_PATH_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), '');
  if (!stripped) return path;
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

export function getContentUrl(path) {
  if (!path) return undefined;
  const repoRelative = getRepoRelativePath(path.startsWith('/') ? path : `/${path}`);
  return CONTENT_ORIGIN + CONTENT_PATH_PREFIX + repoRelative;
}

export function getDisplayUrl(path) {
  if (!path || typeof path !== 'string') return undefined;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const repoRelative = getRepoRelativePath(normalized);
  return STAGE_ORIGIN + repoRelative;
}

export function getAemPageUrl(path) {
  if (!path || typeof path !== 'string') return undefined;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const repoRelative = getRepoRelativePath(normalized);
  return AEM_PAGE_ORIGIN + repoRelative;
}

export function getCacheBustUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_t=${Date.now()}`;
}

export function getTemplateLink(name) {
  return `${AEM_LIVE_ORIGIN}${TEMPLATES_BASE_PATH}${name}`;
}

export function getAdminPreviewUrl(path) {
  return `${ADMIN_ORIGIN}/preview/${ORG}/${REPO}/${BRANCH}${path}`;
}
