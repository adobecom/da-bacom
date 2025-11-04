/* eslint-disable max-len */
/* eslint-disable import/no-unresolved */
import { html, nothing } from 'da-lit';
import './image-dropzone/image-dropzone.js';

function optionsSelect(form, handleInput, optionName, optionLabel, options) {
  if (!options || options.length <= 1) {
    const value = options?.[0]?.value || '';
    const label = options?.[0]?.label || 'No options available';
    return html`<sl-select
      .value=${value}
      name="${optionName}"
      label="${optionLabel}"
      disabled>
        <option value="${value}">${label}</option>
    </sl-select>`;
  }

  return html`<sl-select
    .value=${form[optionName]}
    name="${optionName}"
    label="${optionLabel}"
    @change=${handleInput}>
      <option value="" ?selected=${form[optionName] === ''}>--Select--</option>
      ${options.map((item) => html`<option value="${item.value}" ?selected=${form[optionName] === item.value}>${item.label}</option>`)}
  </sl-select>`;
}

export function renderContentType(form, handleInput, isLocked = false) {
  return html`
    <div class="form-row core-options ${isLocked ? 'locked' : ''}">
      <h2>Core Options</h2>
      <sl-select
        .value=${form.contentType}
        name="contentType"
        label="Content Type"
        placeholder="Content Type"
        @change=${handleInput}>
        <option value="" ?selected=${form.contentType === ''}>--Select--</option>
        <option value="Guide" ?selected=${form.contentType === 'Guide'}>Guide</option>
        <option value="Infographic" ?selected=${form.contentType === 'Infographic'}>Infographic</option>
        <option value="Report" ?selected=${form.contentType === 'Report'}>Report</option>
        <option value="Video/Demo" ?selected=${form.contentType === 'Video/Demo'}>Video/Demo</option>
      </sl-select>
      <sl-select
        .value=${form.gated}
        name="gated"
        label="Gated / Ungated"
        @change=${handleInput}>
          <option value="" ?selected=${form.gated === ''}>--Select--</option>
          <option value="Ungated" ?selected=${form.gated === 'Ungated'}>Ungated</option>
          <option value="Gated" ?selected=${form.gated === 'Gated'}>Gated</option>
      </sl-select>
      <sl-input type="text" name="marqueeHeadline" .value=${form.marqueeHeadline} placeholder="Marquee Headline" label="Marquee Headline" @input=${handleInput}></sl-input>
      <sl-input type="text" name="url" .value=${form.url} placeholder="/resources/..." label="URL" @input=${handleInput}></sl-input>
    </div>
  `;
}

export function renderForm(form, handleInput, { marketoPOIOptions }) {
  // TODO: Identify additional form options, e.g. Title and Description
  return html`
    <div class="form-row">
    ${form.gated === 'Gated' ? html`
      <h2>Form</h2>
      <sl-select 
        .value=${form.formTemplate} 
        name="formTemplate" 
        label="Form Template" 
        placeholder="Form Template" 
        @change=${handleInput}>
          <option value="" ?selected=${form.formTemplate === ''}>--Select--</option>
          <option value="Long" ?selected=${form.formTemplate === 'Long'}>Long</option>
          <option value="Medium" ?selected=${form.formTemplate === 'Medium'}>Medium</option>
          <option value="Short" ?selected=${form.formTemplate === 'Short'}>Short</option>
      </sl-select>
      <sl-input 
        type="text" 
        name="campaignId" 
        .value=${form.campaignId} 
        placeholder="Campaign ID" 
        label="Campaign ID" 
        @input=${handleInput}>
      </sl-input>
      ${optionsSelect(form, handleInput, 'marketoPOI', 'Marketo Product of Interest', marketoPOIOptions)}`
    : nothing}
    </div>
  `;
}

export function renderMarquee(form, handleInput, handleImageChange) {
  return html`
    <div class="form-row">
      <h2>Marquee</h2>
      <sl-select .value=${form.marqueeEyebrow} name="marqueeEyebrow" label="Marquee Eyebrow" placeholder="Marquee Eyebrow" @change=${handleInput}>
        <option value=${form.marqueeEyebrow}>${form.marqueeEyebrow}</option>
      </sl-select>
      <sl-input type="text" name="marqueeDescription" .value=${form.marqueeDescription} placeholder="Marquee Description" label="Marquee Description" @input=${handleInput}></sl-input>
      <div class="image-dropzone-container">
        <label>Marquee Image</label>
        <div class="dropzone-wrapper">
          <image-dropzone name="marqueeImage" .file=${form.marqueeImage} @image-change=${handleImageChange}>
            <label slot="img-label">Upload Marquee Image</label>
          </image-dropzone>
        </div>
      </div>
    </div>
  `;
}

export function renderBody(form, handleInput, handleImageChange) {
  return html`
    <div class="form-row">
      <h2>Body</h2>
      <sl-input type="text" name="bodyDescription" .value=${form.bodyDescription} placeholder="Body Description" label="Body Description" @input=${handleInput}></sl-input>
        <div class="image-dropzone-container">
        <label>Body Image</label>
        <div class="dropzone-wrapper">
          <image-dropzone name="bodyImage" .file=${form.bodyImage} @image-change=${handleImageChange}>
            <label slot="img-label">Upload Body Image</label>
          </image-dropzone>
        </div>
      </div>
    </div>
  `;
}

export function renderCard(form, handleInput, handleImageChange) {
  return html`
    <div class="form-row">
      <h2>Card</h2>
      <sl-input type="text" name="cardTitle" .value=${form.cardTitle} placeholder="Card Title" label="Card Title" @input=${handleInput}></sl-input>
      <sl-input type="text" name="cardDescription" .value=${form.cardDescription} placeholder="Card Description" label="Card Description" @input=${handleInput}></sl-input>
      <div class="image-dropzone-container">
        <label>Card Image</label>
        <image-dropzone name="cardImage" .file=${form.cardImage} @image-change=${handleImageChange}>
          <label slot="img-label">Upload Card Image</label>
        </image-dropzone>
      </div>
    </div>
  `;
}

export function renderCaas(form, handleInput, { contentTypeOptions, primaryProductOptions }) {
  return html`
    <div class="form-row">
      <h2>CaaS Content</h2>
      ${optionsSelect(form, handleInput, 'contentTypeCaas', 'Content Type', contentTypeOptions)}
      ${optionsSelect(form, handleInput, 'primaryProduct', 'Primary Product', primaryProductOptions)}
    </div>
  `;
}

export function renderSeo(form, handleInput, { primaryProductNameOptions }) {
  return html`
    <div class="form-row">
      <h2>Metadata</h2>
      <sl-input type="text" name="seoMetadataTitle" .value=${form.seoMetadataTitle} placeholder="Max 70 characters" label="SEO Metadata Title" @input=${handleInput}></sl-input>
      <sl-input type="text" name="seoMetadataDescription" .value=${form.seoMetadataDescription} placeholder="Max 155 characters" label="SEO Metadata Description" @input=${handleInput}></sl-input>
      ${optionsSelect(form, handleInput, 'primaryProductName', 'Primary Product Name', primaryProductNameOptions)}
    </div>
  `;
}

export function renderExperienceFragment(form, handleInput, { fragmentOptions }) {
  return html`
    <div class="form-row">
      <h2>Experience Fragment</h2>
      ${optionsSelect(form, handleInput, 'experienceFragment', 'Experience Fragment', fragmentOptions)}
    </div>
  `;
}

export function renderAssetDelivery(form, handleInput) {
  return html`
    <div class="form-row">
      <h2>Asset Delivery</h2>
      ${(form.contentType || '').toLowerCase().includes('video') ? html`
        <sl-input type="text" name="videoAsset" .value=${form.videoAsset} placeholder="https://video.tv.adobe.com/v/..." label="Video Asset" @input=${handleInput}></sl-input>`
    : html`<sl-input type="file" name="pdfAsset" label="Upload PDF Asset" @input=${handleInput}></sl-input>`}
    </div>
  `;
}
