/* eslint-disable max-len */
/* eslint-disable class-methods-use-this */
/* eslint-disable import/no-unresolved */
import 'components';
import getStyle from 'styles';
import DA_SDK from 'da-sdk';
import { LitElement, html, createRef, ref, nothing } from 'da-lit';
import { createToast, TOAST_TYPES } from './toast/toast.js';
import { getSource, saveImage } from './da-utils.js';
import {
  getStorageItem,
  setStorageItem,
  getCachedData,
  setCachedData,
  withTimeout,
} from './generator.js';
import { fetchMarketoPOIOptions, fetchContentTypeOptions, fetchPrimaryProductOptions } from './data-sources.js';
import {
  renderContentType,
  renderForm,
  renderMarquee,
  renderBody,
  renderCard,
  renderCaas,
  renderSeo,
  renderExperienceFragment,
  renderAssetDelivery,
  renderUrl,
} from './form-sections.js';

const style = await getStyle(import.meta.url.split('?')[0]);

const SDK_TIMEOUT = 3000;
const AEM_PAGE = 'https://main--da-bacom--adobecom.aem.live';
const DA_EDIT = 'https://da.live/edit#/adobecom/da-bacom';
const PREVIEW_PARAMS = '?martech=off&dapreview=on';
const FORM_STORAGE_KEY = 'landing-page-form-state';
const OPTIONS_LOADING = [{ value: 'loading', label: 'Loading...' }];
const OPTIONS_ERROR = [{ value: 'error', label: 'Error loading options' }];

const TEMPLATE_MAP = {
  guide: {
    gated: '/tools/page-builder/prd-template-basic',
    ungated: '/tools/page-builder/prd-template-basic-ungated',
  },
  report: {
    gated: '/tools/page-builder/prd-template-basic',
    ungated: '/tools/page-builder/prd-template-basic-ungated',
  },
  'video/demo': {
    gated: '/tools/page-builder/prd-template-basic',
    ungated: '/tools/page-builder/prd-template-video',
  },
  infographic: {
    gated: '/tools/page-builder/prd-template-basic',
    ungated: '/tools/page-builder/prd-template-basic-ungated',
  },
};

const FORM_SCHEMA = {
  contentType: '',
  gated: '',
  formTemplate: '',
  campaignId: '',
  marketoPOI: '',
  marqueeEyebrow: '',
  marqueeHeadline: '',
  marqueeDescription: '',
  marqueeImage: null,
  bodyDescription: '',
  cardTitle: '',
  cardDescription: '',
  contentTypeCaas: '',
  primaryProduct: '',
  seoMetadataTitle: '',
  seoMetadataDescription: '',
  experienceFragment: '',
  videoAsset: '',
  url: '',
};

class LandingPageForm extends LitElement {
  static styles = style;

  static get properties() {
    return {
      form: { type: Object },
      marketoPOIOptions: { type: Array },
      contentTypeOptions: { type: Array },
      primaryProductOptions: { type: Array },
      isInitialized: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.form = { ...FORM_SCHEMA };
    this.marketoPOIOptions = OPTIONS_LOADING;
    this.contentTypeOptions = OPTIONS_LOADING;
    this.primaryProductOptions = OPTIONS_LOADING;
    this.isInitialized = false;
    this.iframeRef = createRef();
    this.template = null;
    this.currentTemplateKey = null;
  }

  resetForm() {
    this.form = { ...FORM_SCHEMA };
    localStorage.removeItem(FORM_STORAGE_KEY);
    if (this.isInitialized) {
      this.requestUpdate();
    }
  }

  saveFormState() {
    const formToSave = { ...this.form };
    // TODO: Handle other images
    if (formToSave.marqueeImage && formToSave.marqueeImage.url && formToSave.marqueeImage.url.startsWith('blob:')) {
      formToSave.marqueeImage = null;
    }
    setStorageItem(FORM_STORAGE_KEY, formToSave);
  }

  loadFormState() {
    try {
      const savedForm = getStorageItem(FORM_STORAGE_KEY);
      if (!savedForm) return;
      this.form = { ...FORM_SCHEMA, ...savedForm };
    } catch (error) {
      this.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: 'Failed to load saved form data' } }));
    }
  }

  async fetchCachedOptions(cacheKey, fetchFunction, ...args) {
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const data = await fetchFunction(...args);
      return setCachedData(cacheKey, data);
    } catch (error) {
      return [];
    }
  }

  async connectedCallback() {
    super.connectedCallback();
    this.addEventListener('show-toast', this.handleToast);
    this.loadFormState();

    try {
      const { context, token } = await withTimeout(DA_SDK, SDK_TIMEOUT);
      this.context = context;
      this.token = token;

      const [marketoOptions, contentTypes, primaryProducts] = await Promise.all([
        this.fetchCachedOptions('marketo-poi', fetchMarketoPOIOptions),
        this.fetchCachedOptions('caas-content-types', fetchContentTypeOptions, context, token),
        this.fetchCachedOptions('caas-primary-products', fetchPrimaryProductOptions, context, token),
      ]);

      this.marketoPOIOptions = marketoOptions;
      this.contentTypeOptions = contentTypes;
      this.primaryProductOptions = primaryProducts;

      this.isInitialized = true;
      this.requestUpdate();
    } catch (error) {
      this.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: `Error loading options: ${error.message}` } }));

      this.marketoPOIOptions = OPTIONS_ERROR;
      this.contentTypeOptions = OPTIONS_ERROR;
      this.primaryProductOptions = OPTIONS_ERROR;
      this.requestUpdate();
    }
  }

  async getTemplateContent() {
    const { contentType, gated } = this.form;
    if (!contentType || !gated) return '';

    const contentTypeKey = contentType.toLowerCase();
    const gatedKey = gated.toLowerCase();
    const templateKey = `${contentTypeKey}-${gatedKey}`;

    if (this.currentTemplateKey !== templateKey) {
      this.template = null;
      this.currentTemplateKey = templateKey;
    }

    if (!this.template) {
      const templatePath = TEMPLATE_MAP[contentTypeKey]?.[gatedKey];
      this.template = await getSource(templatePath);
    }

    return this.template?.body;
  }

  async updatePreview() {
    // TODO: Template generation and preview
  }

  handleInput = (e) => {
    if (!this.isInitialized) return;

    const { name, value, files } = e.target;
    const newForm = { ...this.form };

    if (name === 'contentType') {
      newForm.marqueeEyebrow = value;
    }
    if (files && files.length) {
      const [file] = files;
      newForm[name] = file;
    } else {
      newForm[name] = value;
    }

    this.form = newForm;
    this.updatePreview();
    this.saveFormState();
  };

  updateMarqueeImage() {
    const template = this.template?.body;
    if (!template) return;

    // TODO: Handle other images
    const marquee = template.querySelector('.marquee');
    const marqueeImage = marquee?.querySelector('img');
    if (marqueeImage?.src) {
      this.form.marqueeImage = {
        url: marqueeImage.src,
        name: marqueeImage.alt || 'Marquee Image',
      };
    }
  }

  handleToast(e) {
    e.stopPropagation();
    e.preventDefault();
    const detail = e.detail || {};
    const toast = createToast(detail.message, detail.type, detail.timeout);
    document.body.appendChild(toast);
    // eslint-disable-next-line no-console
    if (detail.type === 'error') console.error('Error:', detail.message, detail);
  }

  disconnectedCallback() {
    this.removeEventListener('show-toast', this.handleToast);
    Object.values(this.form).forEach((value) => {
      if (value?.url && value.url.startsWith('blob:')) {
        URL.revokeObjectURL(value.url);
      }
    });

    super.disconnectedCallback();
  }

  handleIframeLoad = () => {
    // TODO: Initialize preview when iframe loads
    this.updatePreview();
  };

  async uploadFile(file, path) {
    try {
      const imageUrl = await saveImage(path, file);
      if (!imageUrl) throw new Error('Failed to upload file');

      return imageUrl;
    } catch (e) {
      this.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: 'Failed to upload file' } }));
      return null;
    }
  }

  handleImageChange(e) {
    if (this.form.marqueeImage?.url && this.form.marqueeImage.url.startsWith('blob:')) {
      URL.revokeObjectURL(this.form.marqueeImage.url);
    }
    this.form.marqueeImage = { url: '', name: '' };
    const { file } = e.detail;
    if (!file) return;

    // TODO: update template after page generation to correct path
    const path = '/tools/page-builder/.prd-template/';
    this.uploadFile(file, path)
      .then((url) => {
        if (!url) return;
        this.form.marqueeImage = { url, name: file.name };
        this.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'success', message: 'Image Uploaded' } }));
      }).catch((error) => {
        this.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', message: `Upload failed: ${error.message}` } }));
      });
    this.updatePreview();
    this.saveFormState();
  }

  async handleSubmit(e) {
    e.preventDefault();
    // TODO: Validate form data
    if (!this.isFormComplete()) {
      this.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: 'Please complete all required fields' } }));
      return;
    }
    // TODO: Create page in DA and upload assets, uploadTemplatedText
    // eslint-disable-next-line no-console
    console.table(this.form);
  }

  getSections() {
    return [
      () => renderContentType(this.form, this.handleInput),
      () => renderForm(this.form, this.handleInput, { marketoPOIOptions: this.marketoPOIOptions }),
      () => renderMarquee(this.form, this.handleInput, this.handleImageChange.bind(this)),
      () => renderBody(this.form, this.handleInput, this.handleImageChange.bind(this)),
      () => renderCard(this.form, this.handleInput, this.handleImageChange.bind(this)),
      () => renderCaas(this.form, this.handleInput, {
        contentTypeOptions: this.contentTypeOptions,
        primaryProductOptions: this.primaryProductOptions,
      }),
      () => renderSeo(this.form, this.handleInput),
      () => renderExperienceFragment(this.form, this.handleInput),
      () => renderAssetDelivery(this.form, this.handleInput),
      () => renderUrl(this.form, this.handleInput),
    ];
  }

  getTemplatePath() {
    const { contentType, gated } = this.form;
    if (!contentType || !gated) return '';

    const contentTypeKey = contentType.toLowerCase();
    const gatedKey = gated.toLowerCase();

    const template = TEMPLATE_MAP[contentTypeKey]?.[gatedKey];
    return template ? `${template}` : '';
  }

  isFormComplete() {
    const required = ['contentType', 'gated', 'url'];
    const hasRequired = required.every((field) => this.form[field]);

    if (this.form.contentType === 'video/demo' && !this.form.videoAsset) {
      return false;
    }

    return hasRequired;
  }

  render() {
    const sections = this.getSections();
    const isFormComplete = this.isFormComplete();
    const templatePath = this.getTemplatePath();

    const previewUrl = `${AEM_PAGE}${templatePath}${PREVIEW_PARAMS}`;
    // TODO: Update URLs based on created page
    const viewUrl = `${AEM_PAGE}${templatePath}`;
    const editUrl = `${DA_EDIT}${templatePath}`;

    return html`
      <h1>Landing Page Builder</h1>
      <div class="builder-container">
        <form>
          ${sections.map((renderSection) => renderSection())}
          <div class="submit-row">
            <sl-button type="submit" @click=${this.handleSubmit} ?disabled=${!isFormComplete}>
            Generate
            </sl-button>
            <sl-button @click=${() => window.open(viewUrl, '_blank')} ?disabled=${!isFormComplete}>
            View Page
            </sl-button>
            <sl-button variant="warning" @click=${() => window.open(editUrl, '_blank')} ?disabled=${!isFormComplete}>
            Edit Content
            </sl-button>
            <sl-button variant="reset" @click=${this.resetForm}>
            Reset Form
            </sl-button>
          </div>
        </form>
        <div class="preview">
          <h2>Template</h2>
          ${templatePath ? html`<p>${this.form.contentType} ${this.form.gated}: <a href=${viewUrl} target="_blank">${templatePath}</a></p><iframe ${ref(this.iframeRef)} src="${previewUrl}" @load=${this.handleIframeLoad}></iframe>` : nothing}
        </div>
      </div>
    `;
  }
}

if (!customElements.get('da-generator')) customElements.define('da-generator', LandingPageForm);

export default async function init(el) {
  const bulk = document.createElement('da-generator');
  el.append(bulk);
}

init(document.querySelector('main'));
