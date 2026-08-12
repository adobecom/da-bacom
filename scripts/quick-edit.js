import { loadPage } from './scripts.js';

const importMap = {
  imports: {
    'da-lit': 'https://da.live/deps/lit/dist/index.js',
    'da-y-wrapper': 'https://da.live/deps/da-y-wrapper/dist/index.js',
  },
};

function addImportmap() {
  const importmapEl = document.createElement('script');
  importmapEl.type = 'importmap';
  importmapEl.textContent = JSON.stringify(importMap);
  document.head.appendChild(importmapEl);
}

async function loadModule(origin, payload) {
  const { default: loadQuickEdit } = await import(`${origin}/nx/public/plugins/quick-edit/quick-edit.js`);
  loadQuickEdit(payload, loadPage);
}

// creates sidekick payload when loading QE from query param
function generateSidekickPayload() {
  let { hostname } = window.location;
  if (hostname === 'localhost') {
    hostname = document.querySelector('meta[property="hlx:proxyUrl"]').content;
  }
  const parts = hostname.split('.')[0].split('--');
  const [, repo, owner] = parts;

  return {
    detail: {
      config: { mountpoint: `https://content.da.live/${owner}/${repo}/` },
      location: { pathname: window.location.pathname },
    },
  };
}

// AEM ref/branch names are limited to alphanumerics and hyphens. Rejecting
// anything else stops the `quick-edit` param from smuggling a foreign host
// (or a path on a trusted host) into the module origin (VULN-36795).
const REF_PATTERN = /^[a-zA-Z0-9-]+$/;

export function resolveOrigin(ref) {
  if (!ref || ref === 'on') return 'https://da.live';
  if (ref === 'local') return 'http://localhost:6456';
  if (REF_PATTERN.test(ref)) return `https://${ref}--da-nx--adobe.aem.live`;
  return null;
}

export default function init(payload) {
  const { search } = window.location;
  const ref = new URLSearchParams(search).get('quick-edit');
  const origin = resolveOrigin(ref);
  if (!origin) return;
  addImportmap();
  loadModule(origin, payload || generateSidekickPayload());
}
