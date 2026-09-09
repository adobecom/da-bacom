/* eslint-disable no-underscore-dangle */
// Spy for Milo's C2 modal module: /libs/c2/blocks/modal/modal.js
export function getModal() {
  window.__bentoGetModalCalls = window.__bentoGetModalCalls || [];
  window.__bentoGetModalCalls.push('c2');
  return Promise.resolve(document.createElement('div'));
}
export function findDetails() {
  return Promise.resolve({ id: '', path: '' });
}
export default function init() {
  return null;
}
