/* eslint-disable max-len */
/* eslint-disable import/no-unresolved */
import { html, nothing } from 'da-lit';
import './image-dropzone/image-dropzone.js';

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
      ${marketoPOIOptions?.length > 1 ? html`<sl-select
        .value=${form.marketoPOI}
        name="marketoPOI"
        label="Marketo Product of Interest"
        @change=${handleInput}>
        <option value="" ?selected=${form.marketoPOI === ''}>--Select--</option>
        ${(marketoPOIOptions || []).map((item) => html`<option value=${item.value} ?selected=${form.marketoPOI === item.value}>${item.label}</option>`)}
        </sl-select>
      ` : html`<sl-input type="text" label="Marketo Product of Interest" value=${marketoPOIOptions[0]?.label} disabled></sl-input>`}`
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
        ${contentTypeOptions?.length > 1 ? html`<sl-select
          .value=${form.contentTypeCaas}
          name="contentTypeCaas"
          label="Content Type"
          key="${contentTypeOptions?.length}-options"
          @change=${handleInput}>
            <option value="" ?selected=${form.contentTypeCaas === ''}>--Select--</option>
            ${(contentTypeOptions || []).map((item) => html`<option value=${item.value} ?selected=${form.contentTypeCaas === item.value}>${item.label}</option>`)}
        </sl-select>`
    : html`<sl-input type="text" label="Content Type" value=${contentTypeOptions[0]?.label} disabled></sl-input>`}
        ${primaryProductOptions?.length > 1 ? html`<sl-select
            .value=${form.primaryProduct}
            name="primaryProduct"
            label="Primary Product"
            key="${primaryProductOptions?.length}-options"
            @change=${handleInput}>
              <option value="" ?selected=${form.primaryProduct === ''}>--Select--</option>
              ${(primaryProductOptions || []).map((item) => html`<option value=${item.value} ?selected=${form.primaryProduct === item.value}>${item.label}</option>`)}
        </sl-select>`
    : html`<sl-input type="text" label="Primary Product" value=${primaryProductOptions[0]?.label} disabled></sl-input>`}
    </div>
  `;
}

export function renderSeo(form, handleInput) {
  return html`
    <div class="form-row">
      <h2>SEO Metadata</h2>
      <sl-input type="text" name="seoMetadataTitle" .value=${form.seoMetadataTitle} placeholder="Max 70 characters" label="SEO Metadata Title" @input=${handleInput}></sl-input>
      <sl-input type="text" name="seoMetadataDescription" .value=${form.seoMetadataDescription} placeholder="Max 155 characters" label="SEO Metadata Description" @input=${handleInput}></sl-input>
    </div>
  `;
}

export function renderExperienceFragment(form, handleInput) {
  const fragments = [
    { value: '', label: '--Select--' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/generic', label: 'Generic' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/generic-cc', label: 'Generic CC' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/generic-dx', label: 'Generic DX' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/advertising', label: 'Advertising' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/analytics', label: 'Analytics' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/audience-manager', label: 'Audience Manager' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/campaign', label: 'Campaign' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/commerce', label: 'Commerce' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/connect', label: 'Connect' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/content-supply-chain', label: 'Content Supply Chain' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/customer-journey-analytics', label: 'Customer Journey Analytics' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/experience-manager-assets', label: 'Experience Manager Assets' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/experience-manager-forms', label: 'Experience Manager Forms' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/experience-manager-guides', label: 'Experience Manager Guides' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/experience-manager-sites', label: 'Experience Manager Sites' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/genstudio', label: 'Genstudio' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/ajo', label: 'AJO' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/ajo-b2b', label: 'AJO B2B' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/learning-manager', label: 'Learning Manager' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/llm-optimizer', label: 'LLM Optimizer' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/marketo-engage', label: 'Marketo Engage' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/mix-modeler', label: 'Mix Modeler' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/rtcdp', label: 'RTCDP' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/target', label: 'Target' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/workfront', label: 'Workfront' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/acrobat', label: 'Acrobat' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/adobe-sign', label: 'Adobe Sign' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/creative-cloud-for-enterprise', label: 'Creative Cloud for Enterprise' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/adobe-express', label: 'Adobe Express' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/firefly', label: 'Firefly' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/frame-io', label: 'Frame.io' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/adobe-stock', label: 'Adobe Stock' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/substance', label: 'Substance' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/automotive-mobility', label: 'Automotive Mobility' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/consumer-goods', label: 'Consumer Goods' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/financial-services', label: 'Financial Services' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/government', label: 'Government' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/healthcare', label: 'Healthcare' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/high-tech', label: 'High Tech' },
    { value: 'https://main--da-bacom--adobecom.aem.page/fragments/resources/cards/thank-you-collections/manufacturing', label: 'Manufacturing' },
  ];
  return html`
    <div class="form-row">
      <h2>Experience Fragment</h2>
      <sl-select .value=${form.experienceFragment} name="experienceFragment" label="Experience Fragment" @change=${handleInput}>
        ${(fragments || []).map((item) => html`<option value=${item.value} ?selected=${form.experienceFragment === item.value}>${item.label}</option>`)}
      </sl-select>
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
