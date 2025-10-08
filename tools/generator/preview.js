/* eslint-disable no-console */
import { applyTemplateData } from './generator.js';

const ORIGIN = window.location.origin;

let currentPlaceholders = {};
let currentTemplate = '';

function highlightSections(changedSections = []) {
  const sections = document.querySelectorAll('main > div');
  sections.forEach((section, i) => {
    section.id = `section-${i}`;
    section.classList.remove('live-highlight');
    if (changedSections.includes(i)) {
      section.classList.add('live-highlight');
    }
  });
}

function updateTemplate() {
  if (!currentTemplate || !currentPlaceholders) return;
  // TODO: Update Images
  const newHtml = applyTemplateData(currentTemplate, currentPlaceholders);
  const parser = new DOMParser();
  const nextDoc = parser.parseFromString(newHtml, 'text/html');
  const newSections = nextDoc.querySelectorAll('main > div');
  const oldSections = document.querySelectorAll('main > div');
  const sectionCount = Math.max(newSections.length, oldSections.length);
  const changedSections = Array.from({ length: sectionCount }).reduce((acc, _, i) => {
    if (newSections[i]?.textContent !== oldSections[i]?.textContent) acc.push(i);
    return acc;
  }, []);

  document.body.innerHTML = nextDoc.body.innerHTML;
  highlightSections(changedSections);
}

window.addEventListener('message', async (e) => {
  if (e.origin !== ORIGIN) return;
  const data = e.data || {};
  const { type, payload } = data;

  if (type === 'update') {
    const { placeholders } = payload || {};
    currentPlaceholders = placeholders || {};
    currentTemplate = payload.template || '';
    updateTemplate();
    window.parent?.postMessage({ type: 'updated' }, ORIGIN);
  }
});

window.parent?.postMessage({ type: 'ready' }, ORIGIN);
