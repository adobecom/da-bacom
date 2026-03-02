/* eslint-disable max-len */
/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */
/* eslint-disable import/no-unresolved */
import 'components';
import getStyle from 'styles';
import DA_SDK from 'da-sdk';
import { initIms } from 'da-fetch';
import { LitElement, html, nothing } from 'da-lit';
import { LIBS } from '../../scripts/scripts.js';
import { createToast, TOAST_TYPES } from './toast/toast.js';
import { getSource, saveSource, saveFile, getSheets, checkPath } from './da-utils.js';
import {
  getStorageItem,
  setStorageItem,
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
const FORM_STORAGE_KEY = 'landing-page-builder';
const OPTIONS_LOADING = [{ value: 'loading', label: 'Loading...' }];
const OPTIONS_ERROR = [{ value: 'error', label: 'Error loading options' }];
const BRANCH = searchParams.get('ref') || '';
const DEBUG = searchParams.get('debug') || false;
const DATA_PATH = '/tools/page-builder/landing-page/data/';
const DATA_SOURCES = {
  MARKETO_POI: 'marketo-poi-options.json',
  MARKETO_TEMPLATE_RULES: 'marketo-template-rules.json',
  CAAS_COLLECTIONS: 'caas-collections.json',
  PAGE_OPTIONS: 'page-options.json',
};

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

const CORE_FIELDS = ['contentType', 'gated', 'region', 'marqueeHeadline', 'pageName'];
const TEMPLATE_FIELDS = ['contentType', 'gated'];
const IMAGES = ['marqueeImage', 'bodyImage', 'cardImage'];
const FILES = ['pdfAsset'];

const FORM_TEMPLATE_MAP = {
  Medium: 'flex_event',
  Short: 'flex_content',
};

const TEMPLATE_RULE_MAPPING = {
  formVersion: 'form.id',
  purpose: 'form.purpose',
  formSuccessType: 'form.success.type',
  field_visibility: 'field_visibility',
  field_filters: 'field_filters',
  auto_complete: 'auto_complete',
  enrichment_fields: 'enrichment_fields',
};

const FORM_SCHEMA = {
  contentType: '',
  gated: '',
  region: '',
  pageName: '',
  pathStatus: 'empty',
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
  primaryProducts: [],
  caasIndustry: '',
  seoMetadataTitle: '',
  seoMetadataDescription: '',
  experienceFragment: '',
  videoAsset: '',
  pdfAsset: null,
  url: '',
  templatePath: '',
};

const MESSAGES = {
  NOT_SIGNED_IN: 'Please sign in to use the Landing Page Builder.',
  WRONG_ORG: 'Please make sure you are in the Skyline org to use the Landing Page Builder.',
  DRAFT_LOAD_FAILED: "We couldn't load your draft. You can start a new page.",
  ADDRESS_IN_USE: 'This page address is already in use. Please choose a different one.',
  ADDRESS_CHECK_FAILED: "We couldn't check if this address is available. Please try again.",
  FILL_CORE_OPTIONS: 'Please fill in all core options before confirming',
  IMAGE_UPLOADED: 'Image Uploaded',
  IMAGE_UPLOAD_FAILED: 'Image upload failed. Please try again.',
  PDF_CLEARED: 'PDF cleared',
  UPLOAD_PDF_FILE: 'Please upload a PDF file',
  UPLOADING_PDF: 'Uploading PDF...',
  PDF_UPLOADED: 'PDF uploaded successfully',
  PDF_UPLOAD_FAILED: 'PDF upload failed. Please try again.',
  COMPLETE_REQUIRED_FIELDS: 'Please complete all required fields',
  SAVING_PAGE: 'Saving page...',
  SAVE_PAGE_FAILED: "We couldn't save your page. Please try again.",
  PAGE_SAVED: 'Page saved',
  UPDATING_PREVIEW: 'Updating preview...',
  PREVIEW_OPEN_FAILED: "We couldn't open the preview. Use the link below to view your page.",
  PREVIEW_PDF_LINK_FAILED: "Preview was updated, but we couldn't refresh the PDF link.",
  PREVIEW_UPDATED: 'Preview updated',
};

const delay = (milliseconds) => new Promise((resolve) => { setTimeout(resolve, milliseconds); });

function showToast(message, type, timeout) {
  const detail = { type: type ?? TOAST_TYPES.INFO, message };
  if (timeout != null) detail.timeout = timeout;
  document.dispatchEvent(new CustomEvent('show-toast', { detail }));
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

  static properties = {
    form: { type: Object },
    marketoPOIOptions: { type: Array },
    primaryProductOptions: { type: Array },
    industryOptions: { type: Array },
    isInitialized: { type: Boolean },
    showForm: { type: Boolean },
    missingFields: { type: Object },
    authStatus: { type: String },
    previewUrl: { type: String },
  };

  constructor() {
    super();
    this.form = { ...FORM_SCHEMA };
    this.marketoPOIOptions = OPTIONS_LOADING;
    this.primaryProductOptions = OPTIONS_LOADING;
    this.industryOptions = OPTIONS_LOADING;
    this.isInitialized = false;
    this.template = null;
    this.currentTemplateKey = null;
    this.showForm = false;
    this.missingFields = {};
    this.authStatus = null;
    this.previewUrl = '';
  }

  resetForm() {
    this.form = { ...FORM_SCHEMA };
    this.showForm = false;
    this.missingFields = {};
    this.previewUrl = '';
    localStorage.removeItem(FORM_STORAGE_KEY);
    if (this.isInitialized) {
      this.requestUpdate();
    }
  }

  saveFormState() {
    const formToSave = { ...this.form };
    [...IMAGES, ...FILES].forEach((field) => {
      if (!Object.hasOwn(formToSave, field)) return;
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
    } catch {
      showToast(MESSAGES.DRAFT_LOAD_FAILED, TOAST_TYPES.ERROR);
    }
  }

  async connectedCallback() {
    super.connectedCallback();
    document.addEventListener('show-toast', this.handleToast);
    const token = await initIms();
    this.token = token?.accessToken?.token;
    this.loadFormState();

    if (!this.form.contentType || !this.form.gated || !this.form.region) this.form.pageName = '';
    this.showForm = this.form.pageName !== '';

    if (!this.token) {
      this.authStatus = 'NOT_SIGNED_IN';
      this.requestUpdate();
      return;
    }

    try {
      const [
        options,
        marketoPOIData,
        caasCollections,
        templateRules,
      ] = await Promise.all([
        getSheets(`${DATA_PATH}${DATA_SOURCES.PAGE_OPTIONS}`),
        getSheets(`${DATA_PATH}${DATA_SOURCES.MARKETO_POI}`),
        getSheets(`${DATA_PATH}${DATA_SOURCES.CAAS_COLLECTIONS}`),
        getSheets(`${DATA_PATH}${DATA_SOURCES.MARKETO_TEMPLATE_RULES}`),
      ]);

      if (options == null) {
        if (DEBUG) console.error('Options load failed: PAGE_OPTIONS returned null (e.g. 403 Forbidden)');
        this.authStatus = 'WRONG_ORG';
        this.requestUpdate();
        return;
      }

      this.options = options ?? {};
      this.marketoPOIOptions = marketoPOIData?.data ?? OPTIONS_ERROR;
      this.primaryProductOptions = caasCollections?.primaryProducts ?? OPTIONS_ERROR;
      this.industryOptions = caasCollections?.industries ?? OPTIONS_ERROR;
      this.templateRules = templateRules ?? null;

      this.authStatus = 'ok';
      this.isInitialized = true;
      this.requestUpdate();
    } catch (error) {
      if (DEBUG) console.error('Options load failed:', error);
      this.authStatus = 'WRONG_ORG';
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
    if (this.isEmpty(contentType) || this.isEmpty(gated)) return { templateKey: '', templatePath: '' };
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

  getMarketoState(form) {
    const marketoState = {
      'program.campaignids.sfdc': form.campaignId,
      'program.poi': form.marketoPOI,
    };

    const applyRulesToState = (rules) => {
      Object.entries(TEMPLATE_RULE_MAPPING).forEach(([key, prop]) => {
        rules
          .filter((r) => r.value === key || r.value.startsWith(`${key}.`))
          .forEach((rule) => {
            marketoState[rule.value.replace(key, prop)] = rule.label;
          });
      });
    };

    if (form.gated === 'Gated' && form.formTemplate) {
      const templateKey = FORM_TEMPLATE_MAP[form.formTemplate];
      const selectedRules = this.templateRules[templateKey] || null;
      marketoState['form.template'] = templateKey;
      if (selectedRules) {
        applyRulesToState(selectedRules);
      }
    }
    if (DEBUG) console.table(marketoState);

    return marketoState;
  }

  getCaasContentType(contentType) {
    const CAAS_CONTENT_TYPE_MAP = {
      Guide: 'caas:content-type/guide',
      Infographic: 'caas:content-type/infographic',
      Report: 'caas:content-type/report',
      'Video/Demo': 'caas:content-type/demos-and-video',
    };
    return CAAS_CONTENT_TYPE_MAP[contentType] || '';
  }

  async templatePlaceholders(form) {
    const { getConfig } = await import(`${LIBS}/utils/utils.js`);
    const { replaceKeyArray } = await import(`${LIBS}/features/placeholders.js`);
    const config = getConfig();

    const marketoState = this.getMarketoState(form);
    const [formDescription, formSuccessContent] = await replaceKeyArray(
      [
        `Please share your contact information to get the ${form.contentType.toLowerCase()}.`,
        `Thank you. Your ${form.contentType.toLowerCase()} is ready below.`,
      ],
      config,
    );

    const dateStr = new Date().toLocaleString('us-EN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });

    const placeholders = {
      ...form,
      marketoDataUrl: marketoUrl(marketoState),
      marketoDataUrlName: `Marketo Configurator ${dateStr}`,
      poi: form.marketoPOI,
      formDescription,
      formSuccessContent,
      caasPrimaryProducts: Array.isArray(form.primaryProducts) ? form.primaryProducts.join(', ') : form.primaryProducts,
      caasContentType: this.getCaasContentType(form.contentType),
      cardDate: new Date().toISOString().split('T')[0],
      marqueeImage: form.marqueeImage?.url,
      bodyImage: form.bodyImage?.url,
      cardImage: form.cardImage?.url,
    };

    if (form.pdfAsset) {
      placeholders.pdfAsset = form.pdfAsset?.url;
      placeholders.pdfAssetName = form.pdfAsset?.name;
    }
    return placeholders;
  }

  handleInput = (e) => {
    if (!this.isInitialized) return;

    const name = e.detail?.name || e.target.name;
    const value = e.detail?.value !== undefined ? e.detail.value : e.target.value;
    const newForm = { ...this.form };

    if (name === 'contentType') {
      newForm.marqueeEyebrow = value;
    }

    newForm[name] = value;

    if (CORE_FIELDS.includes(name) && name !== 'pageName') {
      if (CORE_FIELDS.some((field) => this.isEmpty(newForm[field]))) {
        newForm.pathStatus = 'empty';
        newForm.url = '';
        this.showForm = false;
      }
    }

    if (TEMPLATE_FIELDS.includes(name)) {
      if (!TEMPLATE_FIELDS.some((field) => this.isEmpty(newForm[field]))) {
        const templateKey = `${newForm.contentType.toLowerCase()}-${newForm.gated.toLowerCase()}`;
        newForm.templatePath = this.getTemplatePath(templateKey);
      } else {
        newForm.templatePath = '';
      }
    }

    if (this.missingFields[name]) this.missingFields[name] = false;

    this.form = newForm;
    this.saveFormState();
  };

  handlePathStatusChange = (e) => {
    const { status } = e.detail;
    const updates = { pathStatus: status };

    if (status === 'empty') {
      updates.pageName = '';
      updates.url = '';
    } else if (status === 'stale') {
      updates.url = '';
    }

    this.form = { ...this.form, ...updates };
  };

  handleValidateRequest = async (e) => {
    const { fullPath, value } = e.detail;

    try {
      const exists = await checkPath(fullPath);

      if (exists) {
        this.form = { ...this.form, pageName: value, pathStatus: 'conflict', url: '' };
        showToast(MESSAGES.ADDRESS_IN_USE, TOAST_TYPES.WARNING, 5000);
      } else {
        this.form = { ...this.form, pageName: value, pathStatus: 'available', url: `${fullPath}.html` };
      }
    } catch {
      this.form = { ...this.form, pathStatus: 'empty', url: '' };
      showToast(MESSAGES.ADDRESS_CHECK_FAILED, TOAST_TYPES.ERROR);
    }

    this.saveFormState();
    this.requestUpdate();
  };

  handleConfirm = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const { contentType, gated, marqueeHeadline, pageName } = this.form;
    if (this.isEmpty(contentType) || this.isEmpty(gated) || this.isEmpty(marqueeHeadline) || this.isEmpty(pageName)) {
      showToast(MESSAGES.FILL_CORE_OPTIONS, TOAST_TYPES.ERROR, 5000);
      return;
    }
    this.showForm = true;
  };

  handleToast = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const detail = e.detail || {};
    const toast = createToast(detail.message, detail.type, detail.timeout);
    document.body.appendChild(toast);
    if (detail.type === 'error' && DEBUG) {
      console.error('Error:', detail.message);
      console.trace();
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

  async uploadAsset(file, path, type = 'image') {
    const result = await saveFile(path, file);
    const url = result?.aem?.previewUrl;
    if (!url) throw new Error(`Failed to upload ${type}`);

    return url;
  }

  handleImageChange(e) {
    const { name } = e?.target || {};
    if (!name || !Object.hasOwn(this.form, name)) return;
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

    const path = computeAssetDirFromUrl(this.form.url);
    this.uploadAsset(file, path, 'image')
      .then(async (url) => {
        if (!url) return;
        this.form[name] = { url, name: file.name };
        showToast(MESSAGES.IMAGE_UPLOADED, TOAST_TYPES.SUCCESS, 5000);
        await this.previewAsset(url);
      }).catch(() => {
        showToast(MESSAGES.IMAGE_UPLOAD_FAILED, TOAST_TYPES.ERROR);
      }).finally(() => {
        this.saveFormState();
      });
  }

  async handlePdfChange(e) {
    const input = e.currentTarget || e.target;
    const file = input?.files?.[0];

    if (!file) {
      this.form.pdfAsset = null;
      showToast(MESSAGES.PDF_CLEARED, TOAST_TYPES.INFO, 3000);

      this.saveFormState();
      this.requestUpdate();
      return;
    }

    if (file.type !== 'application/pdf') {
      showToast(MESSAGES.UPLOAD_PDF_FILE, TOAST_TYPES.ERROR);
      input.value = '';
      return;
    }

    if (this.missingFields.pdfAsset) this.missingFields.pdfAsset = false;
    const path = computeAssetDirFromUrl(this.form.url);
    showToast(MESSAGES.UPLOADING_PDF, TOAST_TYPES.INFO, 3000);

    try {
      const url = await this.uploadAsset(file, path, 'file');
      if (!url) {
        throw new Error('Upload failed');
      }

      this.form.pdfAsset = { url, name: file.name };
      showToast(MESSAGES.PDF_UPLOADED, TOAST_TYPES.SUCCESS, 5000);
      await this.previewAsset(url);
    } catch (error) {
      showToast(MESSAGES.PDF_UPLOAD_FAILED, TOAST_TYPES.ERROR);
      input.value = '';
    } finally {
      this.saveFormState();
      this.requestUpdate();
    }
  }

  async savePage() {
    await this.getTemplateContent();
    const placeholders = await this.templatePlaceholders(this.form);
    if (DEBUG) {
      console.table(placeholders);
    }
    const generatedPage = applyTemplateData(this.templateHTML, placeholders);
    try {
      await saveSource(this.form.url, generatedPage);
      this.requestUpdate();
      return true;
    } catch (error) {
      console.error('Failed to save page:', error);
      return false;
    }
  }

  async previewPage() {
    const path = this.form.url.replace('.html', '');
    const previewApi = `${ADMIN_URL}/preview/adobecom/da-bacom/main${path}`;
    const previewApiResponse = await fetch(previewApi, { method: 'POST' });
    if (!previewApiResponse.ok) {
      return { success: false };
    }
    const previewApiData = await previewApiResponse.json();
    if (previewApiData?.preview?.status === 200) {
      const businessStageUrl = previewApiData.preview.url.replace('main--da-bacom--adobecom.aem.page', 'business.stage.adobe.com');
      return { success: true, url: businessStageUrl };
    }
    return { success: false };
  }

  async previewAsset(assetUrl) {
    if (!assetUrl) return false;
    let path;
    try {
      path = assetUrl.startsWith('http') ? new URL(assetUrl).pathname : assetUrl;
    } catch {
      return false;
    }
    path = path.startsWith('/') ? path : `/${path}`;
    const previewApi = `${ADMIN_URL}/preview/adobecom/da-bacom/main${path}`;
    const resp = await fetch(previewApi, { method: 'POST' });
    if (!resp.ok) return false;
    const data = await resp.json();
    return data?.preview?.status === 200;
  }

  async previewPdfAsset() {
    if (!this.form.pdfAsset?.url) return { success: true, skipped: true };
    const success = await this.previewAsset(this.form.pdfAsset.url);
    return { success };
  }

  async handleSubmit(e) {
    e.preventDefault();
    if (!this.isFormComplete()) {
      const required = this.getRequiredFields();
      const newMissingFields = {};
      required.forEach((field) => {
        const value = this.form[field];
        if (this.isEmpty(value)) {
          newMissingFields[field] = true;
        }
      });
      this.missingFields = { ...this.missingFields, ...newMissingFields };
      showToast(MESSAGES.COMPLETE_REQUIRED_FIELDS, TOAST_TYPES.ERROR, 5000);
      return;
    }

    showToast(MESSAGES.SAVING_PAGE, TOAST_TYPES.INFO, 5000);
    const saveSuccess = await this.savePage();
    if (!saveSuccess) {
      showToast(MESSAGES.SAVE_PAGE_FAILED, TOAST_TYPES.ERROR, 5000);
      return;
    }
    showToast(MESSAGES.PAGE_SAVED, TOAST_TYPES.SUCCESS, 5000);
    await delay(1000);
    showToast(MESSAGES.UPDATING_PREVIEW, TOAST_TYPES.INFO, 5000);

    const [pageResult, pdfResult] = await Promise.all([
      this.previewPage(),
      this.previewPdfAsset(),
    ]);

    this.previewUrl = pageResult.url;
    this.requestUpdate();

    if (!pageResult.success) {
      showToast(MESSAGES.PREVIEW_OPEN_FAILED, TOAST_TYPES.ERROR, 5000);
    }
    if (!pdfResult.success) {
      showToast(MESSAGES.PREVIEW_PDF_LINK_FAILED, TOAST_TYPES.ERROR, 5000);
    }
    if (pageResult.success && pdfResult.success) {
      showToast(MESSAGES.PREVIEW_UPDATED, TOAST_TYPES.SUCCESS, 5000);
      window.open(this.previewUrl, '_blank');
    }
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

  isEmpty(value) {
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).every((v) => this.isEmpty(v));
    }
    if (typeof value === 'string') {
      const textContent = value.replace(/<[^>]*>/g, '').trim();
      return !textContent;
    }
    return !value;
  }

  isFormComplete() {
    const required = this.getRequiredFields();
    return required.every((field) => !this.isEmpty(this.form[field]));
  }

  hasError(fieldName) {
    const value = this.form[fieldName];
    return this.missingFields[fieldName] && this.isEmpty(value) ? 'This field is required.' : '';
  }

  render() {
    const canConfirm = this.form.contentType && this.form.gated && this.form.region && this.form.marqueeHeadline;
    const hasError = this.hasError.bind(this);
    const showBuilder = DEBUG || this.authStatus === 'ok';
    const bannerMessage = MESSAGES[this.authStatus];

    return html`
      <h1>Landing Page Builder ${BRANCH ? `- ${BRANCH.toUpperCase()}` : ''}</h1>
      ${bannerMessage ? html`<div class="banner banner-error" role="alert">${bannerMessage}</div>` : nothing}
      ${showBuilder ? html`
      <div class="builder-container">
        <form @submit=${this.handleSubmit}>
          ${renderContentType(this.form, this.handleInput, this.options?.regions, { isLocked: this.showForm && !DEBUG, hasError, onValidateRequest: this.handleValidateRequest, onStatusChange: this.handlePathStatusChange })}
          ${this.showForm ? html`
            ${renderForm(this.form, this.handleInput, { marketoPOIOptions: this.marketoPOIOptions, hasError })}
            ${renderMarquee(this.form, this.handleInput, this.handleImageChange.bind(this), hasError)}
            ${renderBody(this.form, this.handleInput, this.handleImageChange.bind(this), hasError)}
            ${renderCard(this.form, this.handleInput, this.handleImageChange.bind(this), hasError)}
            ${renderCaas(this.form, this.handleInput, { primaryProductOptions: this.primaryProductOptions, industryOptions: this.industryOptions })}
            ${renderSeo(this.form, this.handleInput, { primaryProductNameOptions: this.options?.primaryProductName }, hasError)}
            ${renderExperienceFragment(this.form, this.handleInput, { fragmentOptions: this.options?.experienceFragment }, hasError)}
            ${renderAssetDelivery(this.form, this.handleInput, this.handlePdfChange.bind(this), hasError)}
            <div class="submit-row">
              <sl-button class="reset primary" @click=${this.resetForm}>
                Reset Form
              </sl-button>
              <sl-button class="submit" type="submit" @click=${this.handleSubmit}>
                Save & Preview
              </sl-button>
            </div>
            ${this.previewUrl ? html`
            <div class="preview-success">
              <p>Page saved. <a href="${this.previewUrl}" target="_blank" rel="noopener">Open your preview</a></p>
            </div>
            ` : nothing}
          ` : html`
            <div class="submit-row">
              <sl-button class="reset primary" @click=${this.resetForm}>
                Reset Form
              </sl-button>
              <sl-button class="confirm"
                ?disabled=${!canConfirm}
                @click=${this.handleConfirm}>
                Confirm
              </sl-button>
              ${!canConfirm ? html`<p class="help-text">Please fill in Content Type, Gated/Ungated, Region, and Marquee Headline to confirm.</p>` : nothing}
            </div>
            `}
        </form>
      </div>
      ` : nothing}
    `;
  }
}

if (!customElements.get('da-generator')) customElements.define('da-generator', LandingPageForm);
