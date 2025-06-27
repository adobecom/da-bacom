/* eslint-disable class-methods-use-this */
/* eslint-disable import/no-unresolved */
import 'https://da.live/nx/public/sl/components.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import { LitElement, html } from 'da-lit';

const style = await getStyle(import.meta.url);

// Data
// TODO: Fetch POI options from Marketo Configurator options
// TODO: Fetch Tags from AEM for CaaS Content Type & Primary Product Name

// Lists
// TODO: Get Eyebrow copy
// TODO: Get Fragment list

// Features
// TODO: If select "ungated" don't show show form template, campaign template, POI
// TODO: Page generator will generate URL based on the content type and marquee title

class LandingPageForm extends LitElement {
  static properties = { _data: { state: true } };

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
  }

  async handleSubmit(e) {
    e.preventDefault();
  }

  render() {
    return html`
      <h1>Campaign Landing Page Generator</h1>
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
          <sl-input type="file" name="marqueeImage" placeholder="Upload Marquee Image" label="Upload Marquee Image"></sl-input>
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
          <sl-select value="" name="primaryProductName" label="Primary Product Name"">
            <option value="TODO">TODO: Fetch BACOM Tags from AEM</option>
          </sl-select>
        </div>
        <div class="form-row">
          <h2>SEO Metadata</h2>
          <sl-input type="text" name="seoMetadataTitle" placeholder="Max 70 characters" label="SEO Metadata Title"></sl-input>
          <sl-input type="text" name="seoMetadataDescription" placeholder="Max 155 characters" label="SEO Metadata Title"></sl-input>
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

customElements.define('da-generator', LandingPageForm);

export default async function init(el) {
  const bulk = document.createElement('da-generator');
  el.append(bulk);
}

init(document.querySelector('main'));
