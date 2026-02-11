import { getTags, getAemRepo, getRootTags } from '../tags/tag-utils.js';

const OPTIONS_URL = 'https://main--da-bacom--adobecom.aem.live/tools/landing-page.json';
const POI_URL = 'https://milo.adobe.com/tools/marketo-options.json';
const COLLECTION_NAME = 'dx-tags/dx-caas';
const JCR_TITLE = 'jcr:title';
const CAAS_CONTENT_TYPE = 'caas:content-type';
const CAAS_PRODUCTS = 'caas:products';
const CAAS_INDUSTRY = 'caas:industry';
const PROJECT = { org: 'adobecom', repo: 'da-bacom' };
const MARKETO_RULES_ORIGIN = 'https://main--da-marketo--adobecom.aem.live';
const MARKETO_RULES_URL = `${MARKETO_RULES_ORIGIN}/tools/marketo-rules/marketo.html`;
const MARKETO_RULES_TIMEOUT = 5000;

function normalizeOption(item, valueKey, labelKey) {
  const valueEntry = Object.entries(item).find(([k]) => k.toLowerCase() === valueKey.toLowerCase());
  const labelEntry = Object.entries(item).find(([k]) => k.toLowerCase() === labelKey.toLowerCase());
  const value = valueEntry ? valueEntry[1] : undefined;
  const label = labelEntry ? labelEntry[1] : undefined;
  return (value && label) ? { value, label } : null;
}

async function fetchCaasCollections(token) {
  const authOptions = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

  const aemConfig = await getAemRepo(PROJECT, authOptions);
  if (!aemConfig?.aemRepo) throw new Error('AEM repository not available');

  const namespaces = aemConfig.namespaces?.split(',').map((ns) => ns.trim()) || [];
  const rootTags = await getRootTags(namespaces, aemConfig, authOptions);
  if (!rootTags?.length) throw new Error('No root tags found');

  const targetCollection = await rootTags.reduce(async (acc, tag) => {
    const result = await acc;
    if (result.length) return result;

    const collection = await getTags(tag.path, authOptions);
    return collection.find((t) => t?.activeTag === COLLECTION_NAME) ? collection : [];
  }, Promise.resolve([]));

  const contentTypeFilter = (tag) => tag.details[JCR_TITLE]?.includes(CAAS_CONTENT_TYPE);
  const productFilter = (tag) => tag.details[JCR_TITLE]?.includes(CAAS_PRODUCTS);
  const industryFilter = (tag) => tag.details[JCR_TITLE]?.includes(CAAS_INDUSTRY);

  const result = {
    contentTypes: targetCollection.filter(contentTypeFilter),
    primaryProducts: targetCollection.filter(productFilter),
    industries: targetCollection.filter(industryFilter),
  };
  return result;
}

export async function getCaasOptions(token) {
  try {
    const collections = await fetchCaasCollections(token);

    return {
      contentTypes: collections.contentTypes.map((tag) => normalizeOption(tag, 'title', 'name')).filter(Boolean),
      primaryProducts: collections.primaryProducts.map((tag) => normalizeOption(tag, 'title', 'name')).filter(Boolean),
      industries: collections.industries.map((tag) => normalizeOption(tag, 'title', 'name')).filter(Boolean),
    };
  } catch (error) {
    throw new Error(`CAAS Collections: ${error.message}`);
  }
}

async function getMarketoPOI() {
  const response = await fetch(POI_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

  const json = await response.json();
  const validItem = (item) => item.Key?.length && item.Value?.length;
  const result = json.poi?.data?.filter(validItem) || [];
  return result;
}

export async function fetchMarketoPOIOptions() {
  try {
    const poiData = await getMarketoPOI();
    const data = poiData.map((item) => normalizeOption(item, 'Key', 'Value')).filter(Boolean);
    return { data };
  } catch (error) {
    throw new Error(`Marketo POI Options: ${error.message}`);
  }
}

export async function fetchPageOptions() {
  try {
    const response = await fetch(OPTIONS_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const json = await response.json();
    const options = {};
    json[':names'].forEach((name) => {
      if (name.startsWith(':')) return;
      options[name] = json[name]?.data?.map((item) => normalizeOption(item, 'Key', 'Value')).filter(Boolean);
    });
    return options;
  } catch (error) {
    throw new Error(`Page Options: ${error.message}`);
  }
}

function extractRuleValue(rule) {
  if (!rule) return '';
  if (Array.isArray(rule)) {
    return rule[0]?.split(':')?.[0] || '';
  }
  return rule;
}

export function flattenTemplateRules(rules) {
  const result = {};

  const simpleProps = ['formVersion', 'purpose', 'formSuccessType'];
  const objectProps = ['field_visibility', 'field_filters'];
  const arrayProps = ['auto_complete', 'enrichment_fields'];

  rules.forEach((ruleObj) => {
    const templateName = Object.keys(ruleObj)[0];
    const templateData = ruleObj[templateName];
    if (!templateData) return;

    const sheetData = [];

    simpleProps.forEach((prop) => {
      sheetData.push({
        value: prop,
        label: extractRuleValue(templateData[prop]),
      });
    });

    objectProps.forEach((propName) => {
      if (templateData[propName]) {
        Object.entries(templateData[propName]).forEach(([fieldName, fieldRule]) => {
          sheetData.push({
            value: `${propName}.${fieldName}`,
            label: extractRuleValue(fieldRule),
          });
        });
      }
    });

    arrayProps.forEach((propName) => {
      if (Array.isArray(templateData[propName])) {
        templateData[propName].forEach((field, index) => {
          sheetData.push({
            value: `${propName}.${index}`,
            label: field,
          });
        });
      }
    });

    result[templateName] = sheetData;
  });

  return result;
}

export async function fetchMarketoTemplateRules() {
  const iframe = document.createElement('iframe');
  iframe.src = MARKETO_RULES_URL;
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;bottom:0;right:0;width:800px;height:600px;opacity:0;pointer-events:none;z-index:-1;';

  let timeoutId;
  let messageHandler;

  const cleanup = () => {
    clearTimeout(timeoutId);
    window.removeEventListener('message', messageHandler);
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };

  return new Promise((resolve, reject) => {
    messageHandler = (event) => {
      if (event.origin !== MARKETO_RULES_ORIGIN) return;
      if (event.data.type !== 'templateRules') return;

      cleanup();

      if (!event.data.data) {
        reject(new Error('Marketo Template Rules: Data not available'));
        return;
      }

      resolve(flattenTemplateRules(event.data.data));
    };

    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Marketo Template Rules: Request timed out'));
    }, MARKETO_RULES_TIMEOUT);

    window.addEventListener('message', messageHandler);
    document.body.appendChild(iframe);
  });
}
