export const utf8ToB64 = (str) => window.btoa(unescape(encodeURIComponent(str)));
export const b64ToUtf8 = (str) => decodeURIComponent(escape(window.atob(str)));

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const DEFAULT_MARKETO_STATE = {
  'form id': '2277',
  'marketo munckin': '360-KCI-804',
  'marketo host': 'engage.adobe.com',
  'form type': 'marketo_form',
  'form.success.type': 'message',
  'form.success.content': 'Thank you',
};

export function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => { setTimeout(() => reject(new Error('timeout')), ms); })]);
}

export function marketoUrl(state) {
  const url = 'https://milo.adobe.com/tools/marketo';
  return `${url}#${utf8ToB64(JSON.stringify({ ...DEFAULT_MARKETO_STATE, ...state }))}`;
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
  const html = fields.reduce((text, field) => {
    const fieldName = placeholderToFieldName(field);
    const fieldValue = data[fieldName];
    if (!fieldValue) return text.replaceAll(`{{${field}}}`, '');
    if (field.includes('image') && fieldValue.startsWith('http')) {
      const imgHtml = `<img src="${fieldValue}" alt="${fieldName}" />`;
      return text.replaceAll(`{{${field}}}`, imgHtml);
    }
    if ((field.includes('url') || field.includes('fragment')) && fieldValue.startsWith('http')) {
      const urlHtml = `<a href="${fieldValue}" target="_blank">${fieldValue}</a>`;
      return text.replaceAll(`{{${field}}}`, urlHtml);
    }
    return text.replaceAll(`{{${field}}}`, fieldValue);
  }, templateStr);
  return html;
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
