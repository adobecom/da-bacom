/* eslint-disable max-len */
/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */
/* eslint-disable import/no-unresolved */
import 'components';
import getStyle from 'styles';
import DA_SDK from 'da-sdk';
import { initIms } from 'da-fetch';
import { LitElement, html, createRef, ref, nothing } from 'da-lit';
import { createToast, TOAST_TYPES } from './toast/toast.js';
import { getSource, saveSource, saveImage } from './da-utils.js';
import { fetchMarketoPOIOptions, fetchContentTypeOptions, fetchPrimaryProductOptions, fetchPageOptions } from './data-sources.js';
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

await DA_SDK;

const style = await getStyle(import.meta.url.split('?')[0]);

const ADMIN_URL = 'https://admin.hlx.page';
const AEM_LIVE = 'https://main--da-bacom--adobecom.aem.live';
const AEM_PAGE = 'https://main--da-bacom--adobecom.aem.page';
const PREVIEW_PARAMS = '?martech=off&dapreview=on';
const FORM_STORAGE_KEY = 'landing-page-builder';
const OPTIONS_LOADING = [{ value: 'loading', label: 'Loading...' }];
const OPTIONS_ERROR = [{ value: 'error', label: 'Error loading options' }];
const PREVIEW_MODE_STORAGE_KEY = 'landing-page-preview-mode';
const DRAFT_PATH = '/drafts/page-builder/';
const DEBUG = window.location.search.includes('debug');

const TEMPLATE_MAP = {
  'guide-gated': '/tools/page-builder/prd-template-basic',
  'guide-ungated': '/tools/page-builder/prd-template-basic-ungated',
  'report-gated': '/tools/page-builder/landing-pages/one-page-gated-lp-placeholders',
  'report-ungated': '/tools/page-builder/landing-pages/sdk-indexed-placeholders',
  'video/demo-gated': '/tools/page-builder/prd-template-basic',
  'video/demo-ungated': '/tools/page-builder/landing-pages/ungated-video-landing-page-placeholders',
  'infographic-gated': '/tools/page-builder/prd-template-basic',
  'infographic-ungated': '/tools/page-builder/prd-template-basic-ungated',
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

const delay = (milliseconds) => new Promise((resolve) => { setTimeout(resolve, milliseconds); });

function showToast(message, type, timeout) {
  document.dispatchEvent(new CustomEvent('show-toast', { detail: { type, message, timeout } }));
  if (DEBUG && type === 'error') {
    console.trace();
  }
}

function computeAssetDirFromUrl(url) {
  let path = '/tools/page-builder/.prd-template/';
  if (!url) return path;
  path = `${url.replace('.html', '')}/`;
  path = path.split('/').map((part, index, arr) => (index === arr.length - 2 ? `.${part}` : part)).join('/');
  return path;
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
      coreLocked: { type: Boolean },
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
    this.hasEdit = false;
    this.coreLocked = false;
  }

  handleIframeLoad = () => {
    const iframe = this.iframeRef?.value;
    if (!iframe) return;
    const channel = new MessageChannel();
    setTimeout(() => {
      channel.port1.onmessage = (e) => { iframe.style.height = e.data; };
      iframe.contentWindow.postMessage({ init: true }, '*', [channel.port2]);
      channel.port1.postMessage({ get: 'height' });
    }, 1500);
  };

  resetForm() {
    this.form = { ...FORM_SCHEMA };
    this.coreLocked = false;
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
      showToast('Failed to load saved form data', TOAST_TYPES.ERROR);
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
    const token = await initIms();
    this.token = token?.accessToken?.token;
    this.options = await fetchPageOptions();
    this.loadFormState();
    this.coreLocked = this.form.contentType && this.form.gated && this.form.marqueeHeadline;

    try {
      if (!this.token) throw new Error('Failed to get token');

      [this.marketoPOIOptions, this.contentTypeOptions, this.primaryProductOptions] = await Promise.all([
        this.fetchCachedOptions('cached-marketo-poi', fetchMarketoPOIOptions).catch(() => OPTIONS_ERROR),
        this.fetchCachedOptions('cached-caas-content-types', fetchContentTypeOptions, this.token).catch(() => OPTIONS_ERROR),
        this.fetchCachedOptions('cached-caas-primary-products', fetchPrimaryProductOptions, this.token).catch(() => OPTIONS_ERROR),
      ]);
      if (this.form.url) {
        const sourceResult = await getSource(this.form.url);
        this.hasEdit = sourceResult?.body?.innerHTML !== null;
      }
      this.isInitialized = true;
      this.requestUpdate();
    } catch (error) {
      showToast(`Error loading options: ${error.message}`, TOAST_TYPES.ERROR);
      this.requestUpdate();
    }
  }

  getTemplatePath(templateKey) {
    if (this.options?.templateMap) {
      const customTemplate = this.options.templateMap.find(
        (template) => template.value === templateKey,
      );
      if (customTemplate?.label) return customTemplate.label;
    }

    return TEMPLATE_MAP[templateKey] || '';
  }

  getTemplate() {
    const { contentType, gated } = this.form;
    if (!contentType || !gated) return { templateKey: '', templatePath: '' };
    const templateKey = `${contentType.toLowerCase()}-${gated.toLowerCase()}`;
    const templatePath = this.getTemplatePath(templateKey);

    return { templateKey, templatePath };
  }

  async getTemplateContent() {
    const { templateKey, templatePath } = this.getTemplate();
    if (this.currentTemplateKey === templateKey) {
      return this.templateHTML;
    }

    this.currentTemplateKey = templateKey;
    this.template = await getSource(templatePath);
    this.templateHTML = this.template?.body?.innerHTML;
    return this.templateHTML;
  }

  templatePlaceholders(form) {
    // TODO: Update dynamic placeholders
    const state = {
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

  handleInput = (e) => {
    if (!this.isInitialized) return;

    const { name, value } = e.target;
    const newForm = { ...this.form };

    if (name === 'contentType') {
      newForm.marqueeEyebrow = value;
    }

    newForm[name] = value;

    if (name === 'marqueeHeadline' || name === 'contentType') {
      const pageName = newForm.marqueeHeadline?.toLowerCase().trim().replace(/[^a-z0-9\-\s_/]/g, '').replace(/[\s_/]+/g, '-') || '';
      const contentType = newForm.contentType?.toLowerCase().replace('/', '-') || '';
      newForm.url = `${DRAFT_PATH}${contentType}/${pageName}.html`;
    }

    this.form = newForm;
    this.saveFormState();
  };

  handleConfirm = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const { contentType, gated, marqueeHeadline } = this.form;
    if (!contentType || !gated || !marqueeHeadline) {
      showToast('Please fill in all core options before confirming', TOAST_TYPES.ERROR);
      return;
    }
    this.coreLocked = true;
  };

  handleEditCoreOptions = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.coreLocked = false;
  };

  handleToast = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const detail = e.detail || {};
    const toast = createToast(detail.message, detail.type, detail.timeout);
    document.body.appendChild(toast);
    if (detail.type === 'error') {
      console.error('Error:', detail.message);
    }
  };

  disconnectedCallback() {
    document.removeEventListener('show-toast', this.handleToast);
    Object.values(this.form).forEach((value) => {
      if (value?.url && value.url.startsWith('blob:')) {
        URL.revokeObjectURL(value.url);
      }
    });

    super.disconnectedCallback();
  }

  async uploadFile(file, path) {
    try {
      const imageUrl = await saveImage(path, file);
      if (!imageUrl) throw new Error('Failed to upload file');

      return imageUrl;
    } catch (e) {
      showToast('Failed to upload file', TOAST_TYPES.ERROR);
      return null;
    }
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
      return;
    }

    // Update template after page generation to correct path
    const path = computeAssetDirFromUrl(this.form.url);
    // TODO: Check if path is ready to be uploaded to
    this.uploadFile(file, path)
      .then((url) => {
        if (!url) return;
        this.form[name] = { url, name: file.name };
        showToast('Image Uploaded', 'success', 5000);
      }).catch((error) => {
        showToast(`Upload failed: ${error.message}`, 'error');
      }).finally(() => {
        this.saveFormState();
      });
  }

  async generatePage() {
    await this.getTemplateContent();
    const placeholders = this.templatePlaceholders(this.form);
    const generatedPage = applyTemplateData(this.templateHTML, placeholders);
    try {
      await saveSource(this.form.url, generatedPage);
      this.hasEdit = true;
      return true;
    } catch (error) {
      return false;
    }
  }

  async updatePreview() {
    const path = this.form.url.replace('.html', '');
    const previewApi = `${ADMIN_URL}/preview/adobecom/da-bacom/main${path}`;
    let previewUrl = `${AEM_PAGE}${path}`;
    const previewApiResponse = await fetch(previewApi, { method: 'POST' });
    if (!previewApiResponse.ok) {
      window.open(previewUrl, '_blank');
      return false;
    }
    const previewApiData = await previewApiResponse.json();
    if (previewApiData?.preview?.status === 200) {
      previewUrl = previewApiData.preview.url;
      const iframe = this.iframeRef?.value;
      iframe.src = `${previewUrl}${PREVIEW_PARAMS}`;
    } else {
      window.open(previewUrl, '_blank');
      return false;
    }
    return true;
  }

  async handleSubmit(e) {
    e.preventDefault();
    // TODO: Validate form data
    if (!this.isFormComplete()) {
      showToast('Please complete all required fields', TOAST_TYPES.ERROR);
      return;
    }
    if (DEBUG) {
      console.table(this.form);
    }

    showToast('Saving page...', 'info', 5000);
    const saveSuccess = await this.generatePage();
    if (saveSuccess) {
      showToast('Page saved', 'success', 5000);
    } else {
      showToast('Failed to save page', TOAST_TYPES.ERROR);
    }
    await delay(1000);

    showToast('Updating preview...', TOAST_TYPES.INFO, 5000);
    const previewSuccess = await this.updatePreview();
    if (previewSuccess) {
      showToast('Preview updated', 'success', 5000);
    } else {
      showToast('Failed to update preview', TOAST_TYPES.ERROR);
    }
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
    const { templatePath } = this.getTemplate();
    const iframeSrc = `${AEM_LIVE}${templatePath}${PREVIEW_PARAMS}`;
    const canConfirm = this.form.contentType && this.form.gated && this.form.marqueeHeadline;

    return html`
      <h1>Landing Page Builder</h1>
      <div class="builder-container">
        <form @submit=${this.handleSubmit}>
          ${renderContentType(this.form, this.handleInput, this.coreLocked)}
          ${this.coreLocked ? html`
            ${renderForm(this.form, this.handleInput, { marketoPOIOptions: this.marketoPOIOptions })}
            ${renderMarquee(this.form, this.handleInput, this.handleImageChange.bind(this))}
            ${renderBody(this.form, this.handleInput, this.handleImageChange.bind(this))}
            ${renderCard(this.form, this.handleInput, this.handleImageChange.bind(this))}
            ${renderCaas(this.form, this.handleInput, { contentTypeOptions: this.contentTypeOptions, primaryProductOptions: this.primaryProductOptions })}
            ${renderSeo(this.form, this.handleInput, { primaryProductNameOptions: this.options?.primaryProductName })}
            ${renderExperienceFragment(this.form, this.handleInput, { fragmentOptions: this.options?.experienceFragment })}
            ${renderAssetDelivery(this.form, this.handleInput)}
            <div class="submit-row">
              <sl-button ?disabled=${!isFormComplete} type="submit" @click=${this.handleSubmit}>
                Save & Preview
              </sl-button>
              <sl-button class="reset" @click=${this.resetForm}>
                Reset Form
              </sl-button>
            </div>
          ` : html`
            <div class="submit-row">
              <sl-button 
                class="primary" 
                ?disabled=${!canConfirm}
                @click=${this.handleConfirm}>
                Confirm & Continue
              </sl-button>
              <sl-button class="reset" @click=${this.resetForm}>
                Reset Form
              </sl-button>
              ${!canConfirm ? html`<p class="help-text">Please fill in Content Type, Gated/Ungated, and Marquee Headline to continue.</p>` : nothing}
            </div>
            `}
        </form>
        <div class="preview">
          ${templatePath
    ? html`<iframe ${ref(this.iframeRef)} src="${iframeSrc}" @load=${this.handleIframeLoad}></iframe>`
    : html`<p>Please select a content type and gated option to view template.</p>`}
        </div>
      </div>
    `;
  }
}

if (!customElements.get('da-generator')) customElements.define('da-generator', LandingPageForm);
