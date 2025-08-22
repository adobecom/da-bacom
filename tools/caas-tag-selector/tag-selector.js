/* eslint-disable no-underscore-dangle, import/no-unresolved */
import 'https://da.live/nx/public/sl/components.js';
import { LitElement, html, } from 'https://da.live/nx/deps/lit/lit-core.min.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { getTags, getAemRepo, getRootTags } from '../tags/tag-utils.js';

const style = await getStyle(import.meta.url);
const { context, token } = await DA_SDK.catch(() => null);
const options = { headers: { Authorization: `Bearer ${token}` } };
const collectionName = 'dx-tags/dx-caas';

async function processRootTags(opts) {
  const aemConfig = await getAemRepo(context, opts).catch(() => null);
  if (!aemConfig || !aemConfig.aemRepo) {
    console.log('error');
  }

  const namespaces = aemConfig?.namespaces.split(',').map((namespace) => namespace.trim()) || [];
  const rootTags = await getRootTags(namespaces, aemConfig, opts);

  if (!rootTags || rootTags.length === 0) {
    console.log('error');
  }
  return rootTags;
}

async function getTagCollection(root, name, opts) {
  let collection = [];
  for (const tag of root) {
    const currentCollection = await getTags(tag.path, opts);
    const firstTag = currentCollection[0];
    if (firstTag && firstTag?.activeTag === name) {
      collection = currentCollection;
      return collection;
    }
  }
  return collection;
}
class DaTagSelector extends LitElement {
  static properties = {
    _tags: { state: true },
    _caasPPN: { state: true },
    _contentTypes: { state: true },
  };

  constructor() {
    super();
    this._tags = [];
    this._contentTypes = [];
    this._caasPPN = [];
  }

  async connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
    const rootCollections = await processRootTags(options);
    const currentCollection = await getTagCollection(rootCollections, collectionName, options);
    this._tags = currentCollection;
    const caasContentTypeCollection = this._tags.filter((tag) => tag.details['jcr:title'].includes('caas:content-type'));
    const caasPrimaryProductCollection = this._tags.filter((tag) => tag.details['jcr:title'].includes('caas:products'));
    this._contentTypes = caasContentTypeCollection;
    this._caasPPN = caasPrimaryProductCollection;
  }

  render() {
    return html`
      <div class="tag-selector-group">
        <label for="caas-content-type">CaaS Content Type</label>
        <select name="caas-content-type" id="caas-content-type">
          <option value=''>--Select--</option>
          ${this._contentTypes.map((item) => html`<option value=${item.title}>${item.name}</option>`)}
        </select>
        <label for="caas-primary-product">CaaS Primary Product</label>
        <select name="caas-primary-product" id="caas-primary-product">
          <option value=''>--Select--</option>
          ${this._caasPPN.map((item) => html`<option value=${item.title}>${item.name}</option>`)}
        </select>
      </div>
    `;
  }
}

customElements.define('da-tag-selector', DaTagSelector);
