/* eslint-disable class-methods-use-this */
/* eslint-disable import/no-unresolved */
import 'components';
import getStyle from 'styles';
import DA_SDK from 'da-sdk';
import { LitElement, html } from 'da-lit';
import ImageDropzone from './image-dropzone/image-dropzone.js';
import ToastMessage, { createToast } from './toast/toast.js';
import { getSource, saveSource, saveImage } from './da-utils.js';

const style = await getStyle(import.meta.url.split('?')[0]);

const SDK_TIMEOUT = 3000;
const TOAST_TIMEOUT = 5000;
const DOCUMENT_NAME = 'generator';
const DOCUMENT_PATH = `/drafts/bmarshal/${DOCUMENT_NAME}`;
const MEDIA_PATH = `/drafts/bmarshal/.${DOCUMENT_NAME}/`;
const EDIT_DOCUMENT_URL = `https://da.live/edit#/adobecom/da-bacom${DOCUMENT_PATH}`;

// Data
// TODO: Fetch POI options from Marketo Configurator options
// TODO: Fetch Tags from AEM for CaaS Content Type & Primary Product Name

// Lists
// TODO: Get Eyebrow copy
// TODO: Get Fragment list

// Features
// TODO: If select "ungated" don't show show form template, campaign template, POI
// TODO: Page generator will generate URL based on the content type and marquee title

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => { setTimeout(() => reject(new Error('timeout')), ms); })]);
}

class LandingPageForm extends LitElement {
  static properties = {
    data: { state: true },
    marqueeImage: { state: true },
  };

  static styles = style;

  constructor() {
    super();
    this.data = {};
    this.marqueeImage = null;
  }

  updateMarqueeImage() {
    const marquee = this.data.document?.querySelector('.marquee');
    const marqueeImage = marquee?.querySelector('img');
    if (marqueeImage?.src) {
      this.marqueeImage = {
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

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener('show-toast', this.handleToast);

    withTimeout(DA_SDK, SDK_TIMEOUT)
      .then(({ context, token }) => {
        this.data = { context, token };
        return getSource(DOCUMENT_PATH);
      }).then((document) => {
        if (!document) {
          this.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', message: 'Error fetching document' } }));
          return;
        }
        this.data = { ...this.data, document };
        this.updateMarqueeImage();
      }).catch((error) => {
        this.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', message: `Error connecting to DA SDK: ${error.message}` } }));
      });
  }

  disconnectedCallback() {
    this.removeEventListener('show-toast', this.handleToast);

    if (this.marqueeImage?.url && this.marqueeImage.url.startsWith('blob:')) {
      URL.revokeObjectURL(this.marqueeImage.url);
    }

    super.disconnectedCallback();
  }

  updateDocumentMarquee(imageUrl) {
    const marqueeBlock = this.data.document.querySelector('.marquee');
    if (!marqueeBlock) return;

    const img = marqueeBlock.querySelector('img');
    if (img) img.src = imageUrl;
  }

  async uploadFile(file) {
    try {
      const imageUrl = await saveImage(MEDIA_PATH, file);

      if (!imageUrl) throw new Error('Failed to upload file');

      this.marqueeImage = { url: imageUrl, name: file.name };

      return imageUrl;
    } catch (e) {
      this.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', message: 'Failed to upload file' } }));
      return null;
    }
  }

  handleImageChange(e) {
    if (this.marqueeImage?.url && this.marqueeImage.url.startsWith('blob:')) {
      URL.revokeObjectURL(this.marqueeImage.url);
    }

    this.marqueeImage = { url: '', name: '' };

    const { file } = e.detail;
    if (!file) return;

    this.uploadFile(file)
      .then((url) => {
        if (!url) return;

        this.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'success', message: 'Image Uploaded', timeout: TOAST_TIMEOUT } }));
        this.updateDocumentMarquee(url);
        saveSource(DOCUMENT_PATH, this.data.document)
          .then(() => {
            this.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'success', message: 'Document Marquee Updated', timeout: TOAST_TIMEOUT } }));
          })
          .catch((error) => {
            this.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', message: `Failed to save document: ${error.message}` } }));
          });
      }).catch((error) => {
        this.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', message: `Upload failed: ${error.message}` } }));
      });
  }

  async handleSubmit(e) {
    e.preventDefault();
  }

  render() {
    return html`
      <h1>Campaign Landing Page Generator</h1>
      <p>Page URL: <a href=${EDIT_DOCUMENT_URL} target="_blank">${EDIT_DOCUMENT_URL}</a></p>
      <form @submit=${this.handleSubmit}>
        <div class="form-row">
          <h2>Content Type</h2>
          <sl-select value="" name="contentType" label="Content Type" placeholder="Content Type">
            <option value="Guide">Guide</option>
            <option value="Infographic">Infographic</option>
            <option value="Report">Report</option>
            <option value="Video/Demo">Video/Demo</option>
          </sl-select>
        </div>
        <div class="form-row">
          <h2>Form</h2>
          <sl-select value="" name="gated" label="Gated / Ungated" placeholder="Gated / Ungated">
            <option value="Gated">Gated</option>
            <option value="Ungated">Ungated</option>
          </sl-select>
          <sl-select value="" name="formTemplate" label="Form Template" placeholder="Form Template">
            <option value="Long">Long</option>
            <option value="Medium">Medium</option>
            <option value="Short">Short</option>
          </sl-select>
          <sl-input type="text" name="campaignId" placeholder="Campaign ID" label="Campaign ID"></sl-input>
          <sl-select value="" name="poi" label="POI" placeholder="POI">
            <option value="TODO">TODO: Fetch Marketo Configurator POI options</option>
          </sl-select>
        </div>
        <div class="form-row">
          <h2>Marquee</h2>
          <sl-select value="" name="marqueeEyebrow" label="Marquee Eyebrow" placeholder="Marquee Eyebrow">
            <option value="TODO">TODO: Generate the Eyebrow based on the selected content type</option>
          </sl-select>
          <sl-input type="text" name="marqueeHeadline" placeholder="Marquee Headline" label="Marquee Headline"></sl-input>
          <sl-input type="text" name="marqueeDescription" placeholder="Marquee Description" label="Marquee Description"></sl-input>
          <div class="image-dropzone-container">
            <label>Marquee Image</label>
            <div class="dropzone-wrapper">
              <image-dropzone .file=${this.marqueeImage} @image-change=${this.handleImageChange}>
                <label slot="img-label">Upload Marquee Image</label>
              </image-dropzone>
            </div>
          </div>
        </div>
        <div class="form-row">
          <h2>Body</h2>
          <sl-input type="text" name="bodyDescription" placeholder="Body Description" label="Body Description"></sl-input>
          <sl-input type="file" name="bodyImage" placeholder="Upload Body Image" label="Upload Body Image"></sl-input>
        </div>
        <div class="form-row">
          <h2>Card</h2>
          <sl-input type="text" name="cardTitle" placeholder="Card Title" label="Card Title"></sl-input>
          <sl-input type="text" name="cardDescription" placeholder="Card Description" label="Card Description"></sl-input>
          <sl-input type="file" name="cardImage" placeholder="Upload Card Image" label="Upload Card Image"></sl-input>
        </div>
        <div class="form-row">
          <h2>CaaS Content</h2>
          <sl-select value="" name="caasContentType" label="CaaS Content Type">
            <option value="TODO">TODO: Fetch BACOM Tags from AEM</option>
          </sl-select>
          <sl-select value="" name="caasPrimaryProduct" label="CaaS Primary Product">
            <option value="TODO">TODO: Fetch BACOM Tags from AEM</option>
          </sl-select>
          <sl-select value="" name="primaryProductName" label="Primary Product Name">
            <option value="TODO">TODO: Fetch BACOM Tags from AEM</option>
          </sl-select>
        </div>
        <div class="form-row">
          <h2>SEO Metadata</h2>
          <sl-input type="text" name="seoMetadataTitle" placeholder="Max 70 characters" label="SEO Metadata Title"></sl-input>
          <sl-input type="text" name="seoMetadataDescription" placeholder="Max 155 characters" label="SEO Metadata Description"></sl-input>
        </div>
        <div class="form-row">
          <h2>Experience Fragment</h2>
          <sl-select value="" name="experienceFragment" label="Experience Fragment">
            <option value="TODO">TODO: Show Experience Fragment from a predefined list</option>
          </sl-select>
        </div>
        <div class="form-row">
          <h2>Asset Delivery</h2>
          <sl-input type="text" name="videoAsset" placeholder="https://video.tv.adobe.com/v/..." label="Video Asset"></sl-input>
          <sl-input type="file" name="pdfAsset" placeholder="Upload PDF Asset" label="Upload PDF Asset"></sl-input>
        </div>
        <div class="form-row">
          <h2>URL</h2>
          <sl-input type="text" name="url" placeholder="/resources/sdk/mixing-agile-and-waterfall.html" label="URL"></sl-input>
        </div>
        <div class="submit-row">
          <sl-button type="submit" variant="primary" class="accent">Generate</sl-button>
          <sl-button variant="success">View Page</sl-button>
          <sl-button variant="warning">Edit Content</sl-button>
        </div>
      </form>
    `;
  }
}

customElements.define('image-dropzone', ImageDropzone);
customElements.define('da-generator', LandingPageForm);
customElements.define('toast-message', ToastMessage);

export default async function init(el) {
  const bulk = document.createElement('da-generator');
  el.append(bulk);
}

init(document.querySelector('main'));
