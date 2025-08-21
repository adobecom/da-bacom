/* eslint-disable no-underscore-dangle, import/no-unresolved */
import { LitElement, html, nothing } from 'https://da.live/nx/deps/lit/lit-core.min.js';
import getStyle from 'https://da.live/nx/utils/styles.js';

const style = await getStyle(import.meta.url);

class DaTagSelector extends LitElement {
  static properties = {
  };

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
    this.addEventListener('blur', this.handleBlur, true);
  }

  render() {
    if (this._tags.length === 0) return nothing;
    return html`
      <div class="tag-selector-group">
        <label for"caas-content-type">CaaS Content Type</label>
        <select name="caas-content-type" id="caas-content-type">
          <option value=''>--Select--</option>
          ${this._contentTypes ? this._contentTypes.map((val) => html`<option value=${val}>${val}</option>`) : nothing}
        </select>
        <label for"caas-primary-product">CaaS Primary Product</label>
        <select name="caas-primary-product" id="caas-primary-product">
          <option value=''>--Select--</option>
          ${this._caasPPN ? this._caasPPN.map((val) => html`<option value=${val}>${val}</option>`) : nothing}
        </select>
        <label for"primary-product-name">Primary Product Name</label>
        <select name="primary-product-name" id="primary-product-name">
          <option value=''>--Select--</option>
          ${this._ppn ? this._ppn.map((val) => html`<option value=${val}>${val}</option>`) : nothing}
        </select>
      </div>
    `;
  }
}

customElements.define('da-tag-selector', DaTagSelector);
