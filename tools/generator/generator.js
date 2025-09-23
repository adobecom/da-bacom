import { LIBS } from '../../scripts/scripts.js';

const { utf8ToB64 } = await import(`${LIBS}/utils/utils.js`);

const DA_ORIGIN = 'https://admin.da.live';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const ORG = 'adobecom';
const REPO = 'da-bacom';

// Template questions
// Should we have Asset H2?
// Should we have Form Title and Description?
const templatedFields = {
  contentType: '{{content-type}}',
  gated: '{{gated}}',
  formTemplate: '{{form-template}}',
  formDescription: '{{form-description}}',
  formSuccessType: '{{form-success-type}}',
  formSuccessSection: '{{form-success-section}}',
  formSuccessContent: '{{form-success-content}}',
  campaignId: '{{campaign-id}}',
  poi: '{{poi}}',
  marqueeEyebrow: '{{marquee-eyebrow}}',
  marqueeHeadline: '{{marquee-headline}}',
  marqueeDescription: '{{marquee-description}}',
  marqueeImage: '{{marquee-image}}',
  bodyDescription: '{{body-description}}',
  bodyImage: '{{body-image}}',
  cardTitle: '{{card-title}}',
  cardDescription: '{{card-description}}',
  cardImage: '{{card-image}}',
  cardDate: '{{card-date}}',
  caasContentType: '{{caas-content-type}}',
  caasPrimaryProduct: '{{caas-primary-product}}',
  primaryProductName: '{{primary-product-name}}',
  seoMetadataTitle: '{{seo-metadata-title}}',
  seoMetadataDescription: '{{seo-metadata-description}}',
  experienceFragment: '{{experience-fragment}}',
  assetDelivery: '{{asset-delivery}}',
  pdfAsset: '{{pdf-asset}}',
  marketoDataUrl: '{{marketo-data-url}}',
};

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

export function applyTemplateFields(templateString, data) {
  return Object.entries(templatedFields).reduce(
    (text, [key, placeholder]) => {
      if (!data[key]) return text;
      return text.replaceAll(placeholder, data[key]);
    },
    templateString,
  );
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
  const templatedText = applyTemplateFields(text, data);
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
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors
  }
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
  setStorageItem(key, { data, timestamp: Date.now() });
  return data;
}
