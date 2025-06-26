import 'https://da.live/nx/public/sl/components.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import { LitElement, html, nothing } from 'da-lit';

const style = await getStyle(import.meta.url);

const fields = [
  {
    category: 'contentType', label: 'Content Type', fields: [
      { name: 'contentType', label: 'Content Type', type: 'select', options: ['PDF', 'Video'] },
    ],
  },
  {
    category: 'form', label: 'Form', fields: [
      { name: 'gated', label: 'Gated / Ungated', type: 'select', options: ['Gated', 'Ungated'] },
      { name: 'formTemplate', label: 'Form Template', type: 'select', options: ['long', 'medium', 'short'] },
      { name: 'campaignId', label: 'Campaign ID', type: 'text' },
      { name: 'poi', label: 'POI', type: 'text' },
    ],
  },
  {
    category: 'marquee', label: 'Marquee', fields: [
      { name: 'marqueeEyebrow', label: 'Marquee Eyebrow', type: 'text' },
      { name: 'marqueeHeadline', label: 'Marquee Headline', type: 'text' },
      { name: 'marqueeDescription', label: 'Marquee Description', type: 'textarea' },
      { name: 'marqueeImage', label: 'Upload Marquee Image', type: 'file' },
    ],
  },
  {
    category: 'body', label: 'Body', fields: [
      { name: 'bodyDescription', label: 'Body Description', type: 'textarea' },
      { name: 'bodyImage', label: 'Upload Body Image', type: 'file' },
    ],
  },
  {
    category: 'card', label: 'Card', fields: [
      { name: 'cardTitle', label: 'Card Title', type: 'text' },
      { name: 'cardDescription', label: 'Card Description', type: 'textarea' },
      { name: 'cardImage', label: 'Upload Card Image', type: 'file' },
    ],
  },
  {
    category: 'caas', label: 'CaaS Content', fields: [
      { name: 'caasContentType', label: 'CaaS Content Type', type: 'select', options: ['Article', 'Blog'] },
      { name: 'caasPrimaryProduct', label: 'CaaS Primary Product', type: 'text' },
      { name: 'primaryProductName', label: 'Primary Product Name', type: 'text' },
    ],
  },
  {
    category: 'seo', label: 'SEO Metadata', fields: [
      { name: 'seoMetadataTitle', label: 'SEO Metadata Title', type: 'text' },
      { name: 'seoMetadataDescription', label: 'SEO Metadata Description', type: 'textarea' },
    ],
  },
  {
    category: 'experienceFragment', label: 'Experience Fragment', fields: [
      { name: 'experienceFragment', label: 'Experience Fragment', type: 'text' },
    ],
  },
  {
    category: 'assetDelivery', label: 'Asset Delivery', fields: [
      { name: 'assetDelivery', label: 'Asset Delivery', type: 'select', options: ['CDN', 'AEM'] },
      { name: 'pdfAsset', label: 'Upload PDF Asset', type: 'file' },
    ],
  },
  {
    category: 'url', label: 'URL', fields: [
      { name: 'url', label: 'URL', type: 'text' },
    ],
  },
];

class LandingPageForm extends LitElement {
  static properties = {
    _data: { state: true },
    _loading: { state: true },
    _status: { state: true },
    _time: { state: true },
  };

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
  }


  async handleSubmit(e) {
    e.preventDefault();
  }

  getField(field) {
    if (field.type === 'select') {
      return html`
        <sl-select name="${field.name}" label="${field.label}" value="" placeholder="${field.label}">
          ${field.options.map(option => html`<option value="${option}">${option}</option>`)}
        </sl-select>
      `;
    } else if (field.type === 'textarea') {
      return html`
        <sl-textarea
          name="${field.name}"
          label="${field.label}"
          .value="${this._data?.[field.name] || ''}"
          class="${field.class || ''}"
          error="${field.error || ''}"
        ></sl-textarea>
      `;
    } else if (field.type === 'file') {
      return html`
        <sl-input type="file" name="${field.name}" placeholder="${field.label}" label="${field.label}"></sl-input>
      `;
    } else {
      return html`
        <sl-input type="${field.type}" name="${field.name}" placeholder="${field.label}" label="${field.label}"></sl-input>
      `;
    }
  }

  getFields() {
    return fields.map(category => html`
      <div class="form-row">
        <h2>${category.label}</h2>
        ${category.fields.map(field => this.getField(field))}
      </div>
    `);
  }


  render() {
    return html`
      <h1>Campaign Landing Page Generator</h1>
      <form @submit=${this.handleSubmit}>
        ${this.getFields()}
        <div class="submit-row">
          <sl-button type="submit" variant="primary" class="accent">Generate</sl-button>
          <sl-button variant="secondary" @click=${() => window.location.reload()}>Reset</sl-button>
          <sl-button variant="success" @click=${() => alert('View Page functionality not implemented yet')}>View Page</sl-button>
          <sl-button variant="warning" @click=${() => alert('Edit Content functionality not implemented yet')}>Edit Content</sl-button>
        </div>
      </form>
    `;
  }
}

customElements.define('da-generator', LandingPageForm);


export default async function init(el) {
  const bulk = document.createElement('da-generator');
  el.append(bulk);
}

init(document.querySelector('main'));
