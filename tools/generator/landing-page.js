/* eslint-disable max-len */
/* eslint-disable class-methods-use-this */
/* eslint-disable import/no-unresolved */
import 'components';
import getStyle from 'styles';
import DA_SDK from 'da-sdk';
import { LitElement, html, createRef, ref } from 'da-lit';
import { createToast, TOAST_TYPES } from './toast/toast.js';
import { getSource, saveImage } from './da-utils.js';
import {
  getStorageItem,
  setStorageItem,
  getCachedData,
  setCachedData,
  marketoUrl,
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

const AEM_PAGE = 'https://main--da-bacom--adobecom.aem.live';
const DA_EDIT = 'https://da.live/edit#/adobecom/da-bacom';
const PREVIEW_PARAMS = '?martech=off&dapreview=on';
const FORM_STORAGE_KEY = 'landing-page-builder';
const OPTIONS_LOADING = [{ value: 'loading', label: 'Loading...' }];
const OPTIONS_ERROR = [{ value: 'error', label: 'Error loading options' }];
const PREVIEW_MODE_STORAGE_KEY = 'landing-page-preview-mode';
const PREVIEW_PATH = '/tools/generator/preview.html';
const IFRAME_DELAY = 300;

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
    if (formToSave.marqueeImage?.url?.startsWith('blob:')) {
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
    this.getMarqueeImage();
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
    const iframeEl = this.iframeRef?.value;
    if (!iframeEl || !iframeEl.contentWindow) return;
    const placeholders = this.templatePlaceholders(this.form);
    iframeEl.contentWindow.postMessage({ type: 'update', payload: { placeholders, template } }, window.location.origin);
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
    this.saveFormState();
    this.debouncedUpdatePreview();
  };

  getMarqueeImage() {
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
    this.requestUpdate();
  }

  handleToast(e) {
    e.stopPropagation();
    e.preventDefault();
    const detail = e.detail || {};
    const toast = createToast(detail.message, detail.type, detail.timeout);
    document.body.appendChild(toast);
    // eslint-disable-next-line no-console
    if (detail.type === 'error') console.error('Error:', detail.message, console.trace());
  }

  disconnectedCallback() {
    document.removeEventListener('show-toast', this.handleToast);
    window.removeEventListener('message', this.handleMessage);
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

  async uploadFile(file, path) {
    try {
      const imageUrl = await saveImage(path, file);
      if (!imageUrl) throw new Error('Failed to upload file');

      return imageUrl;
    } catch (e) {
      document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: 'Failed to upload file' } }));
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
        document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'success', message: 'Image Uploaded' } }));
      }).catch((error) => {
        document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', message: `Upload failed: ${error.message}` } }));
      });
    this.saveFormState();
    this.debouncedUpdatePreview();
  }

  async handleSubmit(e) {
    e.preventDefault();
    // TODO: Validate form data
    if (!this.isFormComplete()) {
      document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: 'Please complete all required fields' } }));
      return;
    }
    // TODO: Create page in DA and upload assets, uploadTemplatedText
    // eslint-disable-next-line no-console
    console.table(this.form);
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
    const isFormComplete = this.isFormComplete();
    const templatePath = this.getTemplatePath();

    const templateUrl = `${AEM_PAGE}${templatePath}${PREVIEW_PARAMS}`;
    // TODO: Update URLs based on created page
    const viewUrl = `${AEM_PAGE}${templatePath}`;
    const editUrl = `${DA_EDIT}${templatePath}`;
    const isGenerated = this.previewMode === 'generated';
    const iframeSrc = isGenerated ? PREVIEW_PATH : templateUrl;

    return html`
      <h1>Landing Page Builder</h1>
      <div class="builder-container">
        <form>
    ${renderContentType(this.form, this.handleInput)}
    ${renderForm(this.form, this.handleInput, { marketoPOIOptions: this.marketoPOIOptions })}
    ${renderMarquee(this.form, this.handleInput, this.handleImageChange.bind(this))}
    ${renderBody(this.form, this.handleInput, this.handleImageChange.bind(this))}
    ${renderCard(this.form, this.handleInput, this.handleImageChange.bind(this))}
    ${renderCaas(this.form, this.handleInput, { contentTypeOptions: this.contentTypeOptions, primaryProductOptions: this.primaryProductOptions })}
    ${renderSeo(this.form, this.handleInput)}
    ${renderExperienceFragment(this.form, this.handleInput)}
    ${renderAssetDelivery(this.form, this.handleInput)}
    ${renderUrl(this.form, this.handleInput)}
          <div class="submit-row">
            <sl-button type="submit" @click=${this.handleSubmit} ?disabled=${!isFormComplete}>
            Generate
            </sl-button>
            <sl-button @click=${() => window.open(viewUrl, '_blank')} ?disabled=${!isFormComplete}>
            View Page
            </sl-button>
            <sl-button class="warning" @click=${() => window.open(editUrl, '_blank')} ?disabled=${!isFormComplete}>
            Edit Content
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
              <sl-button size="small" class=${isGenerated ? 'default' : 'primary'} @click=${() => this.setPreviewMode('template')}>Template</sl-button>
              <sl-button size="small" class=${isGenerated ? 'primary' : 'default'} @click=${() => this.setPreviewMode('generated')}>Generated</sl-button>
            </div>
          </div>
          ${templatePath ? html`
            ${isGenerated ? html`<p>Live generated preview</p>` : html`<p>${this.form.contentType} ${this.form.gated}: <a href=${viewUrl} target="_blank">${templatePath}</a></p>`}
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
