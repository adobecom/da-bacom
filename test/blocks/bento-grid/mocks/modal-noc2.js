/* eslint-disable no-underscore-dangle */
// Spy for Milo's C1 (non-C2) modal module: /libs/blocks/modal/modal.js
export function getModal() {
  window.__bentoGetModalCalls = window.__bentoGetModalCalls || [];
  window.__bentoGetModalCalls.push('noc2');
  return Promise.resolve(document.createElement('div'));
}
export function findDetails() {
  return Promise.resolve({ id: '', path: '' });
}
export default function init() {
  return null;
}
