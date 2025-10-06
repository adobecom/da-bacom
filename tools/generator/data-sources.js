/* eslint-disable no-underscore-dangle, import/no-unresolved */
import { getTags, getAemRepo, getRootTags } from '../tags/tag-utils.js';
import { TOAST_TYPES } from './toast/toast.js';

const POI_URL = 'https://milo.adobe.com/tools/marketo-options.json';
const COLLECTION_NAME = 'dx-tags/dx-caas';
const JCR_TITLE = 'jcr:title';
const CAAS_CONTENT_TYPE = 'caas:content-type';
const CAAS_PRODUCTS = 'caas:products';

function dispatchError(message) {
  const error = new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message } });
  document.dispatchEvent(error);
}

function normalizeOption(item, valueKey, labelKey) {
  const value = item[valueKey];
  const label = item[labelKey];
  return (value && label) ? { value, label } : null;
}

async function getCaasCollections(context, token) {
  const authOptions = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

  const aemConfig = await getAemRepo(context, authOptions);
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

  const result = {
    contentTypes: targetCollection.filter(contentTypeFilter),
    primaryProducts: targetCollection.filter(productFilter),
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
    return poiData.map((item) => normalizeOption(item, 'Value', 'Key')).filter(Boolean);
  } catch (error) {
    dispatchError(`Marketo POI Options: ${error.message}`);
    return [];
  }
}

export async function fetchContentTypeOptions(context, token) {
  try {
    const { contentTypes } = await getCaasCollections(context, token);
    return contentTypes.map((tag) => normalizeOption(tag, 'title', 'name')).filter(Boolean);
  } catch (error) {
    dispatchError(`Content Type Options: ${error.message}`);
    return [];
  }
}

export async function fetchPrimaryProductOptions(context, token) {
  try {
    const { primaryProducts } = await getCaasCollections(context, token);
    return primaryProducts.map((tag) => normalizeOption(tag, 'title', 'name')).filter(Boolean);
  } catch (error) {
    dispatchError(`Primary Product Options: ${error.message}`);
    return [];
  }
}
