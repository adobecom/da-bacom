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
import { getSource, saveSource, saveFile } from './da-utils.js';
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
const searchParams = new URLSearchParams(window.location.search);

const ADMIN_URL = 'https://admin.hlx.page';
const AEM_LIVE = 'https://main--da-bacom--adobecom.aem.live';
const PREVIEW_PARAMS = '?martech=off&dapreview=on';
const FORM_STORAGE_KEY = 'landing-page-builder';
const OPTIONS_LOADING = [{ value: 'loading', label: 'Loading...' }];
const OPTIONS_ERROR = [{ value: 'error', label: 'Error loading options' }];
const PREVIEW_MODE_STORAGE_KEY = 'landing-page-preview-mode';
const DRAFT_PATH = '/drafts/landing-page-builder/';
const BRANCH = searchParams.get('ref') || '';
const DEBUG = searchParams.get('debug') || false;

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
const FILES = ['pdfAsset'];

const FORM_SCHEMA = {
  contentType: '',
  gated: '',
  region: '',
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
  pdfAsset: null,
  url: '',
};

const delay = (milliseconds) => new Promise((resolve) => { setTimeout(resolve, milliseconds); });

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
      missingFields: { type: Object },
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
    this.missingFields = {};
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
    this.missingFields = {};
    localStorage.removeItem(FORM_STORAGE_KEY);
    localStorage.removeItem(PREVIEW_MODE_STORAGE_KEY);
    if (this.isInitialized) {
      this.requestUpdate();
    }
  }

  saveFormState() {
    const formToSave = { ...this.form };
    [...IMAGES, ...FILES].forEach((field) => {
      if (!hasOwnProperty.call(formToSave, field)) return;
      if (formToSave[field]?.url?.startsWith('blob:')) {
        formToSave[field] = null;
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
    const token = await initIms();
    this.token = token?.accessToken?.token;
    this.options = await fetchPageOptions();
    this.loadFormState();
    this.coreLocked = this.form.url !== '';

    try {
      if (!this.token) throw new Error('Failed to get token');
      // removed cached layer for uta testing
      this.marketoPOIOptions = await fetchMarketoPOIOptions().catch(() => OPTIONS_ERROR);
      this.contentTypeOptions = await fetchContentTypeOptions(this.token).catch(() => OPTIONS_ERROR);
      this.primaryProductOptions = await fetchPrimaryProductOptions(this.token).catch(() => OPTIONS_ERROR);

      if (this.form.url) {
        const sourceResult = await getSource(this.form.url);
        this.hasEdit = sourceResult?.body?.innerHTML !== null;
      }
      this.isInitialized = true;
      this.requestUpdate();
    } catch (error) {
      document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: `Error loading options: ${error.message}` } }));
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
      formDescription: `Please share your contact information to get the ${form.contentType.toLowerCase()}.`,
      formSuccessContent: `Thank you. Your ${form.contentType.toLowerCase()} is ready below.`,
      caasPrimaryProduct: form.primaryProduct,
      caasContentType: form.contentTypeCaas,
      cardDate: new Date().toISOString().split('T')[0],
      marqueeImage: form.marqueeImage?.url,
      bodyImage: form.bodyImage?.url,
      cardImage: form.cardImage?.url,
      pdfAsset: form.pdfAsset?.url,
      pdfAssetName: form.pdfAsset?.name,
    };
  }

  generateUrl(form) {
    if (form.marqueeHeadline && form.contentType && form.gated && form.region) {
      const pageName = form.marqueeHeadline?.toLowerCase().trim().replace(/[^a-z0-9\-\s_/]/g, '').replace(/[\s_/]+/g, '-') || '';
      const contentType = form.contentType?.toLowerCase().replace('/', '-') || '';
      const region = form.region.replace(/\/$/, '') || '';
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;
      return `${region}${DRAFT_PATH}${contentType}/${year}/${month}/${pageName}.html`;
    }
    return '';
  }

  handleInput = (e) => {
    if (!this.isInitialized) return;

    const { name, value } = e.target;
    const newForm = { ...this.form };

    if (name === 'contentType') {
      newForm.marqueeEyebrow = value;
    }

    newForm[name] = value;

    if (['marqueeHeadline', 'contentType', 'gated', 'region'].includes(name)) {
      newForm.url = this.generateUrl(newForm);
    }

    if (this.missingFields[name]) this.missingFields[name] = false;

    this.form = newForm;
    this.saveFormState();
  };

  handleConfirm = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const { contentType, gated, marqueeHeadline } = this.form;
    if (!contentType || !gated || !marqueeHeadline) {
      document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: 'Please fill in all core options before confirming' } }));
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
      if (DEBUG) {
        console.trace();
      }
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

  async uploadImage(file, path) {
    const result = await saveFile(path, file);
    const url = result?.source?.contentUrl;
    if (!url) throw new Error('Failed to upload image');

    return url;
  }

  async uploadFile(file, path) {
    const result = await saveFile(path, file);
    const url = result?.aem?.previewUrl;
    if (!url) throw new Error('Failed to upload file');

    return url;
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

    if (this.missingFields[name]) this.missingFields[name] = false;

    // Update template after page generation to correct path
    const path = computeAssetDirFromUrl(this.form.url);
    // TODO: Check if path is ready to be uploaded to
    this.uploadImage(file, path)
      .then((url) => {
        if (!url) return;
        this.form[name] = { url, name: file.name };
        document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'success', message: 'Image Uploaded', timeout: 5000 } }));
      }).catch((error) => {
        document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', message: `Upload failed: ${error.message}` } }));
      }).finally(() => {
        this.saveFormState();
      });
  }

  async handlePdfChange(e) {
    const input = e.currentTarget || e.target;
    const file = input?.files?.[0];

    if (!file) {
      this.form.pdfAsset = null;
      document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.INFO, message: 'PDF cleared', timeout: 3000 } }));

      this.saveFormState();
      this.requestUpdate();
      return;
    }

    if (file.type !== 'application/pdf') {
      document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: 'Please upload a PDF file' } }));
      input.value = '';
      return;
    }

    if (this.missingFields.pdfAsset) this.missingFields.pdfAsset = false;
    const path = computeAssetDirFromUrl(this.form.url);
    document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.INFO, message: 'Uploading PDF...', timeout: 3000 } }));

    try {
      const url = await this.uploadFile(file, path);
      if (!url) {
        throw new Error('Upload failed');
      }

      this.form.pdfAsset = { url, name: file.name };
      document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.SUCCESS, message: 'PDF uploaded successfully', timeout: 5000 } }));
    } catch (error) {
      document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: `PDF upload failed: ${error.message}` } }));
      input.value = '';
    } finally {
      this.saveFormState();
      this.requestUpdate();
    }
  }

  async savePage() {
    document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.INFO, message: 'Saving page...', timeout: 5000 } }));
    await this.getTemplateContent();
    const placeholders = this.templatePlaceholders(this.form);
    if (DEBUG) {
      console.table(placeholders);
    }
    const generatedPage = applyTemplateData(this.templateHTML, placeholders);
    try {
      const sourcePath = await saveSource(this.form.url, generatedPage);
      this.hasEdit = !!sourcePath;
      this.requestUpdate();
      return true;
    } catch (error) {
      return false;
    }
  }

  async previewPage() {
    document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.INFO, message: 'Previewing page...', timeout: 5000 } }));
    const path = this.form.url.replace('.html', '');
    const previewApi = `${ADMIN_URL}/preview/adobecom/da-bacom/main${path}`;
    const previewApiResponse = await fetch(previewApi, { method: 'POST' });
    if (!previewApiResponse.ok) {
      return false;
    }
    const previewApiData = await previewApiResponse.json();
    if (previewApiData?.preview?.status === 200) {
      window.open(previewApiData.preview.url, '_blank');
    } else {
      return false;
    }
    return true;
  }

  async handleSubmit(e) {
    e.preventDefault();
    if (!this.isFormComplete()) {
      const required = this.getRequiredFields();
      const newMissingFields = {};
      required.forEach((field) => {
        if (!this.form[field]) {
          newMissingFields[field] = true;
        }
      });
      this.missingFields = { ...this.missingFields, ...newMissingFields };
      document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: 'Please complete all required fields', timeout: 5000 } }));
      return;
    }

    document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.INFO, message: 'Saving page...', timeout: 5000 } }));
    const saveSuccess = await this.savePage();
    if (!saveSuccess) {
      document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: 'Failed to save page', timeout: 5000 } }));
      return;
    }
    document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.SUCCESS, message: 'Page saved', timeout: 5000 } }));
    await delay(1000);
    document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.INFO, message: 'Updating preview...', timeout: 5000 } }));
    const previewSuccess = await this.previewPage();
    if (!previewSuccess) {
      document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: 'Failed to update preview', timeout: 5000 } }));
      return;
    }
    document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.SUCCESS, message: 'Preview updated', timeout: 5000 } }));
  }

  getRequiredFields() {
    const required = [
      'contentType',
      'gated',
      'region',
      'url',
      'marqueeEyebrow',
      'marqueeHeadline',
      'marqueeImage',
      'bodyDescription',
      'cardTitle',
      'cardDescription',
      'cardImage',
      'contentTypeCaas',
      'seoMetadataTitle',
      'seoMetadataDescription',
      'primaryProductName',
      'experienceFragment',
    ];

    if (this.form.gated === 'Gated') {
      required.push('formTemplate', 'campaignId', 'marketoPOI');
    }

    const typeKey = (this.form.contentType || '').toLowerCase();
    if (typeKey === 'video/demo') {
      required.push('videoAsset');
    } else {
      required.push('pdfAsset');
    }

    return required;
  }

  isFormComplete() {
    const required = this.getRequiredFields();
    const hasRequired = required.every((field) => this.form[field]);
    return hasRequired;
  }

  hasError(fieldName) {
    return this.missingFields[fieldName] && !this.form[fieldName] ? 'This field is required.' : '';
  }

  render() {
    const { templatePath } = this.getTemplate();
    const iframeSrc = `${AEM_LIVE}${templatePath}${PREVIEW_PARAMS}`;
    const canConfirm = this.form.url !== '';
    const hasError = this.hasError.bind(this);

    return html`
      <h1>Landing Page Builder ${BRANCH ? `- ${BRANCH.toUpperCase()}` : ''}</h1>
      <div class="builder-container">
        <form @submit=${this.handleSubmit}>
          ${renderContentType(this.form, this.handleInput, this.options?.regions, this.coreLocked, hasError)}
          ${this.coreLocked ? html`
            ${renderForm(this.form, this.handleInput, { marketoPOIOptions: this.marketoPOIOptions, hasError })}
            ${renderMarquee(this.form, this.handleInput, this.handleImageChange.bind(this), hasError)}
            ${renderBody(this.form, this.handleInput, this.handleImageChange.bind(this), hasError)}
            ${renderCard(this.form, this.handleInput, this.handleImageChange.bind(this), hasError)}
            ${renderCaas(this.form, this.handleInput, { contentTypeOptions: this.contentTypeOptions, primaryProductOptions: this.primaryProductOptions, hasError })}
            ${renderSeo(this.form, this.handleInput, { primaryProductNameOptions: this.options?.primaryProductName }, hasError)}
            ${renderExperienceFragment(this.form, this.handleInput, { fragmentOptions: this.options?.experienceFragment }, hasError)}
            ${renderAssetDelivery(this.form, this.handleInput, this.handlePdfChange.bind(this), hasError)}
            <div class="submit-row">
              <sl-button type="submit" @click=${this.handleSubmit}>
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
