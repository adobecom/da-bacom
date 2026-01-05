export const utf8ToB64 = (str) => window.btoa(unescape(encodeURIComponent(str)));

const DEFAULT_MARKETO_STATE = {
  'form id': '2277',
  'marketo munckin': '360-KCI-804',
  'marketo host': 'engage.adobe.com',
  'form type': 'marketo_form',
  'form.success.type': 'message',
  'form.success.content': 'Thank you',
};

export function marketoUrl(state) {
  const url = 'https://milo.adobe.com/tools/marketo';
  return `${url}#${utf8ToB64(JSON.stringify({ ...DEFAULT_MARKETO_STATE, ...state }))}`;
}

function placeholderToFieldName(templateField) {
  return templateField.charAt(0).toLowerCase() + templateField.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('').slice(1);
}

function findPlaceholders(templateStr) {
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
    if ((field.includes('url') || field.includes('fragment') || field.includes('asset')) && fieldValue.startsWith('http')) {
      const urlText = data[`${fieldName}Name`] || fieldValue;
      const urlHtml = `<a href="${fieldValue}" target="_blank">${urlText}</a>`;
      return text.replaceAll(`{{${field}}}`, urlHtml);
    }
    return text.replaceAll(`{{${field}}}`, fieldValue);
  }, templateStr);
  return html.replaceAll('template-', '');
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
