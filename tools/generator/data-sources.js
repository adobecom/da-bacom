/* eslint-disable no-underscore-dangle, import/no-unresolved */
import { getTags, getAemRepo, getRootTags } from '../tags/tag-utils.js';
import { TOAST_TYPES } from './toast/toast.js';
import { DEFAULT_PRIMARY_PRODUCTS } from './default-tags.js';

const OPTIONS_URL = 'https://main--da-bacom--adobecom.aem.live/tools/landing-page.json';
const POI_URL = 'https://milo.adobe.com/tools/marketo-options.json';
const COLLECTION_NAME = 'dx-tags/dx-caas';
const JCR_TITLE = 'jcr:title';
const CAAS_CONTENT_TYPE = 'caas:content-type';
const CAAS_PRODUCTS = 'caas:products';
const CAAS_INDUSTRY = 'caas:industry';
const PROJECT = { org: 'adobecom', repo: 'da-bacom' };

function dispatchError(message) {
  const error = new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message } });
  document.dispatchEvent(error);
}

function dispatchInfo(message) {
  const info = new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.INFO, message, timeout: 10000 } });
  document.dispatchEvent(info);
}

function normalizeOption(item, valueKey, labelKey) {
  const valueEntry = Object.entries(item).find(([k]) => k.toLowerCase() === valueKey.toLowerCase());
  const labelEntry = Object.entries(item).find(([k]) => k.toLowerCase() === labelKey.toLowerCase());
  const value = valueEntry ? valueEntry[1] : undefined;
  const label = labelEntry ? labelEntry[1] : undefined;
  return (value && label) ? { value, label } : null;
}

async function getCaasCollections(token) {
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

async function getMarketoPOI() {
  const response = await fetch(POI_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

  const data = await response.json();
  const validItem = (item) => item.Key?.length && item.Value?.length;
  const result = data.poi?.data?.filter(validItem) || [];
  return result;
}

export async function fetchMarketoPOIOptions() {
  try {
    const poiData = await getMarketoPOI();
    return poiData.map((item) => normalizeOption(item, 'Key', 'Value')).filter(Boolean);
  } catch (error) {
    dispatchError(`Marketo POI Options: ${error.message}`);
    return [];
  }
}

export async function fetchPrimaryProductOptions(token) {
  try {
    const { primaryProducts } = await getCaasCollections(token);
    return primaryProducts.map((tag) => normalizeOption(tag, 'title', 'name')).filter(Boolean);
  } catch (error) {
    dispatchInfo('Could not access primary product tags, using backup options');
    return DEFAULT_PRIMARY_PRODUCTS;
  }
}

export async function fetchIndustryOptions(token) {
  try {
    const { industries } = await getCaasCollections(token);
    return industries.map((tag) => normalizeOption(tag, 'title', 'name')).filter(Boolean);
  } catch (error) {
    dispatchError(`Industry Options: ${error.message}`);
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
