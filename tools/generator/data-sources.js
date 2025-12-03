/* eslint-disable no-underscore-dangle, import/no-unresolved */
import { getTags, getAemRepo, getRootTags } from '../tags/tag-utils.js';
import { TOAST_TYPES } from './toast/toast.js';
import { DEFAULT_CONTENT_TYPES, DEFAULT_PRIMARY_PRODUCTS } from './default-tags.js';
import { DEFAULT_TEMPLATE_RULES } from './default-template-rules.js';

const OPTIONS_URL = 'https://main--da-bacom--adobecom.aem.live/tools/landing-page.json';
const POI_URL = 'https://milo.adobe.com/tools/marketo-options.json';
const COLLECTION_NAME = 'dx-tags/dx-caas';
const JCR_TITLE = 'jcr:title';
const CAAS_CONTENT_TYPE = 'caas:content-type';
const CAAS_PRODUCTS = 'caas:products';
const PROJECT = { org: 'adobecom', repo: 'da-bacom' };

function dispatchError(message) {
  const error = new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message } });
  document.dispatchEvent(error);
}

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

  // TODO: Add industry options
  const contentTypeFilter = (tag) => tag.details[JCR_TITLE]?.includes(CAAS_CONTENT_TYPE);
  const productFilter = (tag) => tag.details[JCR_TITLE]?.includes(CAAS_PRODUCTS);

  const result = {
    contentTypes: targetCollection.filter(contentTypeFilter),
    primaryProducts: targetCollection.filter(productFilter),
  };
  return result;
}

export async function getCaasCollections(token) {
  try {
    const collections = await fetchCaasCollections(token);

    return {
      contentTypes: collections.contentTypes.map((tag) => normalizeOption(tag, 'title', 'name')).filter(Boolean),
      primaryProducts: collections.primaryProducts.map((tag) => normalizeOption(tag, 'title', 'name')).filter(Boolean),
    };
  } catch (error) {
    dispatchError(`CAAS Collections: ${error.message}`);
    return {
      contentTypes: DEFAULT_CONTENT_TYPES,
      primaryProducts: DEFAULT_PRIMARY_PRODUCTS,
    };
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
    dispatchError(`Marketo POI Options: ${error.message}`);
    return [];
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
    dispatchError(`Page Options: ${error.message}`);
    return {};
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

  rules.forEach((ruleObj) => {
    const templateName = Object.keys(ruleObj)[0];
    const templateData = ruleObj[templateName];
    const sheetData = [];

    sheetData.push({
      value: 'formVersion',
      label: extractRuleValue(templateData.formVersion),
    });
    sheetData.push({
      value: 'purpose',
      label: extractRuleValue(templateData.purpose),
    });
    sheetData.push({
      value: 'formSuccessType',
      label: extractRuleValue(templateData.formSuccessType),
    });

    if (templateData.field_visibility) {
      Object.entries(templateData.field_visibility).forEach(([fieldName, fieldRule]) => {
        sheetData.push({
          value: `field_visibility.${fieldName}`,
          label: extractRuleValue(fieldRule),
        });
      });
    }

    if (templateData.field_filters) {
      Object.entries(templateData.field_filters).forEach(([fieldName, fieldRule]) => {
        sheetData.push({
          value: `field_filters.${fieldName}`,
          label: extractRuleValue(fieldRule),
        });
      });
    }

    if (templateData.auto_complete && Array.isArray(templateData.auto_complete)) {
      templateData.auto_complete.forEach((field, index) => {
        sheetData.push({
          value: `auto_complete.${index}`,
          label: field,
        });
      });
    }

    // Enrichment fields
    if (templateData.enrichment_fields && Array.isArray(templateData.enrichment_fields)) {
      templateData.enrichment_fields.forEach((field, index) => {
        sheetData.push({
          value: `enrichment_fields.${index}`,
          label: field,
        });
      });
    }

    result[templateName] = sheetData;
  });

  return result;
}

export function unflattenTemplateRules(flattenedData) {
  const rules = [];

  Object.entries(flattenedData).forEach(([templateName, sheetData]) => {
    if (templateName.startsWith(':')) return;

    const templateData = {
      formVersion: [],
      purpose: [],
      formSuccessType: [],
      field_visibility: {},
      field_filters: {},
      auto_complete: [],
      enrichment_fields: [],
    };

    if (Array.isArray(sheetData)) {
      sheetData.forEach((row) => {
        const key = row.value || row.Key || row.key;
        const val = row.label || row.Value || row.value;

        if (!key || !val) return;

        if (key === 'formVersion') {
          templateData.formVersion = [val];
        } else if (key === 'purpose') {
          templateData.purpose = [val];
        } else if (key === 'formSuccessType') {
          templateData.formSuccessType = [val];
        } else if (key.startsWith('field_visibility.')) {
          const fieldName = key.replace('field_visibility.', '');
          templateData.field_visibility[fieldName] = [val];
        } else if (key.startsWith('field_filters.')) {
          const fieldName = key.replace('field_filters.', '');
          templateData.field_filters[fieldName] = [val];
        } else if (key.startsWith('auto_complete.')) {
          templateData.auto_complete.push(val);
        } else if (key.startsWith('enrichment_fields.')) {
          templateData.enrichment_fields.push(val);
        }
      });
    }

    rules.push({ [templateName]: templateData });
  });

  return rules;
}

export async function fetchMarketoTemplateRules() {
  const iframe = document.createElement('iframe');
  // TODO: Fix this - attempt to fetch from live Marketo configurator
  const formData = btoa(JSON.stringify({ 'form id': '2277' })); // Production form ID
  iframe.src = `https://milo.adobe.com/tools/marketo#${formData}`;
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      // Fallback to default template rules after timeout
      const flattened = flattenTemplateRules(DEFAULT_TEMPLATE_RULES);
      resolve(flattened);
      document.body.removeChild(iframe);
    }, 100);

    // Listen for post message from iframe
    window.addEventListener('message', (event) => {
      if (event.data.type === 'templateRules') {
        clearTimeout(timeout);
        const flattened = flattenTemplateRules(event.data.data);
        resolve(flattened);
        document.body.removeChild(iframe);
      }
    });
  });
}
