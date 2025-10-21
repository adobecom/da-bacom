/* eslint-disable max-len */
/* eslint-disable class-methods-use-this */
/* eslint-disable import/no-unresolved */
/* eslint-disable no-console */
import 'components';
import getStyle from 'styles';
import DA_SDK from 'da-sdk';
import { LitElement, html, createRef, ref } from 'da-lit';
import { createToast, TOAST_TYPES } from './toast/toast.js';
import { getSource, saveSource, saveImage } from './da-utils.js';
import { fetchMarketoPOIOptions, fetchContentTypeOptions, fetchPrimaryProductOptions } from './data-sources.js';
import {
  getStorageItem,
  setStorageItem,
  getCachedData,
  setCachedData,
  marketoUrl,
  applyTemplateData,
} from './generator.js';
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
} from './form-sections.js';

const style = await getStyle(import.meta.url.split('?')[0]);

const AEM_LIVE = 'https://main--da-bacom--adobecom.aem.live';
const DA_EDIT = 'https://da.live/edit#/adobecom/da-bacom';
const PREVIEW_PARAMS = '?martech=off&dapreview=on';
const FORM_STORAGE_KEY = 'landing-page-builder';
const OPTIONS_LOADING = [{ value: 'loading', label: 'Loading...' }];
const OPTIONS_ERROR = [{ value: 'error', label: 'Error loading options' }];
const PREVIEW_MODE_STORAGE_KEY = 'landing-page-preview-mode';
const PREVIEW_PATH = '/tools/generator/preview.html';
const DRAFT_PATH = '/drafts/page-builder/resources/';
const IFRAME_DELAY = 300;
const DEBUG = window.location.search.includes('debug');

const TEMPLATE_MAP = {
  guide: {
    gated: '/tools/page-builder/prd-template-basic',
    ungated: '/tools/page-builder/prd-template-basic-ungated',
  },
  report: {
    gated: '/tools/page-builder/landing-pages/one-page-gated-lp-placeholders',
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

const IMAGES = ['marqueeImage', 'bodyImage', 'cardImage'];

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
  bodyImage: null,
  cardTitle: '',
  cardDescription: '',
  cardImage: null,
  contentTypeCaas: '',
  primaryProduct: '',
  seoMetadataTitle: '',
  seoMetadataDescription: '',
  experienceFragment: '',
  videoAsset: '',
  url: '',
};

function debounce(fn, delay = 1000) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

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
    this.previewMode = this.getInitialPreviewMode();
    this.debouncedUpdatePreview = debounce(this.updatePreview.bind(this), IFRAME_DELAY);
    this.hasEdit = false;
    this.hasPreview = false;
  }

  resetForm() {
    this.form = { ...FORM_SCHEMA };
    localStorage.removeItem(FORM_STORAGE_KEY);
    localStorage.removeItem(PREVIEW_MODE_STORAGE_KEY);
    if (this.isInitialized) {
      this.requestUpdate();
    }
  }

  saveFormState() {
    const formToSave = { ...this.form };
    IMAGES.forEach((image) => {
      if (!hasOwnProperty.call(formToSave, image)) return;
      if (formToSave[image]?.url?.startsWith('blob:')) {
        formToSave[image] = null;
      }
    });
    setStorageItem(FORM_STORAGE_KEY, formToSave);
  }

  loadFormState() {
    try {
      const savedForm = getStorageItem(FORM_STORAGE_KEY);
      if (!savedForm) return;
      this.form = { ...FORM_SCHEMA, ...savedForm };
    } catch (error) {
      document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: 'Failed to load saved form data' } }));
    }
  }

  getInitialPreviewMode() {
    const saved = getStorageItem(PREVIEW_MODE_STORAGE_KEY);
    if (saved === 'generated' || saved === 'template') return saved;
    return 'template';
  }

  setPreviewMode(mode) {
    if (mode !== 'template' && mode !== 'generated') return;
    if (this.previewMode === mode) return;
    this.previewMode = mode;
    setStorageItem(PREVIEW_MODE_STORAGE_KEY, mode);
    this.requestUpdate();
  }

  async fetchCachedOptions(cacheKey, fetchFunction, ...args) {
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    const data = await fetchFunction(...args);
    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new Error('No data received');
    }
    return setCachedData(cacheKey, data);
  }

  async connectedCallback() {
    super.connectedCallback();
    document.addEventListener('show-toast', this.handleToast);
    window.addEventListener('message', this.handleMessage);
    this.loadFormState();

    try {
      if (!this.context || !this.token) throw new Error('Failed to get context or token');

      [this.marketoPOIOptions, this.contentTypeOptions, this.primaryProductOptions] = await Promise.all([
        ['marketo-poi', fetchMarketoPOIOptions, []],
        ['caas-content-types', fetchContentTypeOptions, [this.context, this.token]],
        ['caas-primary-products', fetchPrimaryProductOptions, [this.context, this.token]],
      ].map(([cacheKey, fetchFn, args]) => this.fetchCachedOptions(cacheKey, fetchFn, ...args).catch(() => OPTIONS_ERROR)));

      this.isInitialized = true;
      this.requestUpdate();
      if (this.form.contentType && this.form.gated) {
        this.debouncedUpdatePreview();
      }
    } catch (error) {
      document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: `Error loading options: ${error.message}` } }));
      this.requestUpdate();
    }
  }

  async getTemplateContent() {
    const { contentType, gated } = this.form;
    if (!contentType || !gated) return '';

    const contentTypeKey = contentType.toLowerCase();
    const gatedKey = gated.toLowerCase();
    const templateKey = `${contentTypeKey}-${gatedKey}`;

    if (this.currentTemplateKey === templateKey) {
      return this.templateHTML;
    }

    this.currentTemplateKey = templateKey;
    const templatePath = TEMPLATE_MAP[contentTypeKey]?.[gatedKey];
    this.template = await getSource(templatePath);
    this.templateHTML = this.template?.body?.innerHTML;
    return this.templateHTML;
  }

  templatePlaceholders(form) {
    // TODO: Update dynamic placeholders
    const state = {
      'form id': '2277',
      'marketo munckin': '360-KCI-804',
      'marketo host': 'engage.adobe.com',
      'form type': 'marketo_form',
      'program.campaignids.sfdc': form.campaignId,
      'program.poi': form.marketoPOI,
    };

    return {
      ...form,
      marketoDataUrl: marketoUrl(state),
      poi: form.marketoPOI,
      primaryProductName: form.primaryProduct,
      caasContentType: form.contentTypeCaas,
      cardDate: new Date().toISOString().split('T')[0],
      marqueeImage: form.marqueeImage?.url,
      bodyImage: form.bodyImage?.url,
      cardImage: form.cardImage?.url,
    };
  }

  async updatePreview() {
    const { contentType, gated } = this.form;
    const iframe = this.iframeRef?.value;
    if (this.previewMode !== 'generated') return;
    if (!iframe || !contentType || !gated) return;

    await this.getTemplateContent();
    const template = this.templateHTML;
    if (!template) return;
    const iframeEl = this.iframeRef?.value;
    if (!iframeEl || !iframeEl.contentWindow) return;
    const placeholders = this.templatePlaceholders(this.form);
    iframeEl.contentWindow.postMessage({ type: 'update', payload: { placeholders, template } }, window.location.origin);
  }

  handleInput = (e) => {
    if (!this.isInitialized) return;

    const { name, value } = e.target;
    const newForm = { ...this.form };

    if (name === 'contentType') {
      newForm.marqueeEyebrow = value;
    }

    if (name === 'marqueeHeadline') {
      const pageName = value.toLowerCase().trim().replace(/[^a-z0-9\-\s_/]/g, '').replace(/[\s_/]+/g, '-');
      newForm.url = `${DRAFT_PATH}${pageName}.html`;
    }

    newForm[name] = value;
    this.form = newForm;
    this.saveFormState();
    this.debouncedUpdatePreview();
  };

  handleToast(e) {
    e.stopPropagation();
    e.preventDefault();
    const detail = e.detail || {};
    const toast = createToast(detail.message, detail.type, detail.timeout);
    document.body.appendChild(toast);
    if (detail.type === 'error') {
      console.error('Error:', detail.message);
      if (DEBUG) {
        console.trace();
      }
    }
  }

  disconnectedCallback() {
    document.removeEventListener('show-toast', this.handleToast);
    window.removeEventListener('message', this.handleMessage);
    if (this.headAbortController) { try { this.headAbortController.abort(); } catch { /* no-op */ } }
    Object.values(this.form).forEach((value) => {
      if (value?.url && value.url.startsWith('blob:')) {
        URL.revokeObjectURL(value.url);
      }
    });

    super.disconnectedCallback();
  }

  handleMessage = (e) => {
    const iframeEl = this.iframeRef?.value;
    const { type } = e.data || {};
    if (e.origin !== window.location.origin) return;
    if (this.previewMode !== 'generated') return;
    if (!iframeEl || e.source !== iframeEl.contentWindow) return;

    if (type === 'ready') {
      this.debouncedUpdatePreview();
    }
    if (type === 'updated') {
      const iframeDoc = iframeEl.contentDocument || iframeEl.contentWindow.document;
      const height = iframeDoc.body.scrollHeight;
      iframeEl.style.height = `${height}px`;
    }
  };

  // eslint-disable-next-line no-unused-vars
  async uploadFile(file, path) {
    document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: 'Not implemented' } }));
  }

  handleImageChange(e) {
    const { name } = e?.target || {};
    if (!name || !hasOwnProperty.call(this.form, name)) return;
    if (this.form[name]?.url && this.form[name].url.startsWith('blob:')) {
      URL.revokeObjectURL(this.form[name].url);
    }
    this.form[name] = { url: '', name: '' };
    const { file } = e.detail;
    if (!file) {
      this.saveFormState();
      this.debouncedUpdatePreview();
      return;
    }

    if (!this.form.url) {
      document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: 'Page URL is not set' } }));
      return;
    }
    saveImage(this.form.url, file)
      .then((url) => {
        if (!url) return;
        this.form[name] = { url, name: file.name };
        document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.SUCCESS, message: 'Image Uploaded', timeout: 5000 } }));
      }).catch((error) => {
        document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: `Upload failed: ${error.message}` } }));
      }).finally(() => {
        this.saveFormState();
        this.debouncedUpdatePreview();
      });
  }

  async handleSubmit(e) {
    e.preventDefault();
    // TODO: Validate form data and required fields
    if (!this.isFormComplete()) {
      document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: 'Please complete all required fields' } }));
      return;
    }
    if (DEBUG) {
      console.table(this.form);
    }
    await this.getTemplateContent();
    const placeholders = this.templatePlaceholders(this.form);
    const generatedPage = applyTemplateData(this.templateHTML, placeholders);
    try {
      const sourcePath = await saveSource(this.form.url, generatedPage);
      this.hasEdit = true;
      document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.SUCCESS, message: `Page saved to ${sourcePath}`, timeout: 5000 } }));
      this.requestUpdate();
    } catch (error) {
      document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: `Failed to save page: ${error.message}` } }));
    }
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

    const typeKey = (this.form.contentType || '').toLowerCase();
    if (typeKey === 'video/demo' && !this.form.videoAsset) {
      return false;
    }

    return hasRequired;
  }

  render() {
    const isFormComplete = this.isFormComplete();
    const templatePath = this.getTemplatePath();

    const templateUrl = `${AEM_LIVE}${templatePath}${PREVIEW_PARAMS}`;
    const viewUrl = this.form.url ? `${AEM_LIVE}${this.form.url.replace('.html', '')}` : `${AEM_LIVE}${templatePath}`;
    const editUrl = this.form.url ? `${DA_EDIT}${this.form.url.replace('.html', '')}` : `${DA_EDIT}${templatePath}`;
    const showGenerated = this.previewMode === 'generated';
    const iframeSrc = showGenerated ? PREVIEW_PATH : templateUrl;

    return html`
      <h1>Landing Page Builder</h1>
      <div class="builder-container">
        <form @submit=${this.handleSubmit}>
    ${renderContentType(this.form, this.handleInput)}
    ${renderForm(this.form, this.handleInput, { marketoPOIOptions: this.marketoPOIOptions })}
    ${renderMarquee(this.form, this.handleInput, this.handleImageChange.bind(this))}
    ${renderBody(this.form, this.handleInput, this.handleImageChange.bind(this))}
    ${renderCard(this.form, this.handleInput, this.handleImageChange.bind(this))}
    ${renderCaas(this.form, this.handleInput, { contentTypeOptions: this.contentTypeOptions, primaryProductOptions: this.primaryProductOptions })}
    ${renderSeo(this.form, this.handleInput)}
    ${renderExperienceFragment(this.form, this.handleInput)}
    ${renderAssetDelivery(this.form, this.uploadFile)}
          <div class="submit-row">
            <sl-button ?disabled=${!isFormComplete} type="submit">
            Generate
            </sl-button>
            <sl-button class="warning" ?disabled=${!this.hasEdit} @click=${() => window.open(editUrl, '_blank')}>
            Edit Page
            </sl-button>
            <sl-button ?disabled=${!this.hasPreview} @click=${() => window.open(viewUrl, '_blank')}>
            View Page
            </sl-button>
            <sl-button class="reset" @click=${this.resetForm}>
            Reset Form
            </sl-button>
          </div>
        </form>
        <div class="preview">
          <div class="preview-header">
            <h2>Preview</h2>
            <div class="preview-switcher">
              <sl-button size="small" class=${showGenerated ? 'default' : 'primary'} @click=${() => this.setPreviewMode('template')}>Template</sl-button>
              <sl-button size="small" class=${showGenerated ? 'primary' : 'default'} @click=${() => this.setPreviewMode('generated')}>Generated</sl-button>
            </div>
          </div>
          ${templatePath ? html`
            ${showGenerated ? html`<p>Live generated preview</p>` : html`<p>${this.form.contentType} ${this.form.gated}: <a href=${viewUrl} target="_blank">${templatePath}</a></p>`}
            <iframe ${ref(this.iframeRef)} src="${iframeSrc}"></iframe>
          ` : html`<p>Please select a content type and gated option to preview.</p>`}
        </div>
      </div>
    `;
  }
}

if (!customElements.get('da-generator')) customElements.define('da-generator', LandingPageForm);

export default async function init(el) {
  const { context, token } = await DA_SDK;
  const bulk = document.createElement('da-generator');
  bulk.context = context;
  bulk.token = token;
  el.append(bulk);
}

init(document.querySelector('main'));
