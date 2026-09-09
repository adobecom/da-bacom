/* eslint-disable no-underscore-dangle */
// Spy for /libs/utils/utils.js used by the bento-grid modal helpers.
export function loadStyle(path) {
  window.__bentoLoadStyles = window.__bentoLoadStyles || [];
  window.__bentoLoadStyles.push(path);
}
export function getConfig() {
  return {};
}
export function getMetadata(name) {
  const meta = document.querySelector(`meta[name="${name}"]`);
  return meta ? meta.getAttribute('content') : '';
}
