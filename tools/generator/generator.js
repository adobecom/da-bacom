export const utf8ToB64 = (str) => window.btoa(unescape(encodeURIComponent(str)));
export const b64ToUtf8 = (str) => decodeURIComponent(escape(window.atob(str)));

const DA_ORIGIN = 'https://admin.da.live';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const ORG = 'adobecom';
const REPO = 'da-bacom';

// Template questions
// Should we have Asset H2?
// Should we have Form Title and Description?

export function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => { setTimeout(() => reject(new Error('timeout')), ms); })]);
}

// TODO: Use default URL or generated URL
export function marketoUrl(state) {
  const url = 'https://milo.adobe.com/tools/marketo';
  return `${url}#${utf8ToB64(JSON.stringify(state))}`;
}

async function fetchTemplate(daPath) {
  const res = await fetch(daPath);
  if (!res.ok) throw new Error(`Failed to fetch template: ${res.statusText}`);
  return res.text();
}

function placeholderToFieldName(templateField) {
  return templateField.charAt(0).toLowerCase() + templateField.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('').slice(1);
}

export function findPlaceholders(templateStr) {
  const regex = /\{\{(.*?)\}\}/g;
  const fields = templateStr.match(regex) || [];
  return fields.map((field) => field.replace('{{', '').replace('}}', ''));
}

export function applyTemplateData(templateStr, data) {
  const fields = findPlaceholders(templateStr);
  return fields.reduce((text, field) => {
    const fieldName = placeholderToFieldName(field);
    if (!data[fieldName]) return text;
    return text.replaceAll(`{{${field}}}`, data[fieldName]);
  }, templateStr);
}

async function uploadTemplatedText(daPath, templatedText) {
  const formData = new FormData();
  const blob = new Blob([templatedText], { type: 'text/html' });
  formData.set('data', blob);
  const updateRes = await fetch(daPath, { method: 'POST', body: formData });
  if (!updateRes.ok) throw new Error(`Failed to update template: ${updateRes.statusText}`);
}

export async function template(path, data) {
  const daPath = `${DA_ORIGIN}/source/${ORG}/${REPO}${path}`;
  const text = await fetchTemplate(daPath);
  const templatedText = applyTemplateData(text, data);
  await uploadTemplatedText(daPath, templatedText);
}

export async function replaceTemplate(data) {
  const templatePaths = ['/index.html', '/nav.html', '/footer.html'];

  await Promise.all(templatePaths.map((path) => template(path, data)));
}

export function getStorageItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStorageItem(key, value) {
  if (!value || (Array.isArray(value) && value.length === 0)) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getCachedData(key) {
  try {
    const cached = getStorageItem(key);
    if (cached && cached.timestamp && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return cached.data;
    }
    if (cached) {
      localStorage.removeItem(key);
    }
    return null;
  } catch {
    return null;
  }
}

export function setCachedData(key, data) {
  if (!data || (Array.isArray(data) && data.length === 0)) return data;
  setStorageItem(key, { data, timestamp: Date.now() });
  return data;
}
