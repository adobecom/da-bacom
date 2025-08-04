/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-unresolved */
import 'https://da.live/nx/public/sl/components.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import { LitElement, html, nothing } from 'da-lit';
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { crawl } from 'https://da.live/nx/public/utils/tree.js';
import CountItem from './counts/counts.js';
import { matchPageToMetadata } from './document-utils.js';
import fetchDaSource from './fetch-utils.js';

const style = await getStyle(import.meta.url);

// For testing purposes, to remove later
const ppn = 'primaryProductName';
const pth = 'drafts/slavin/nobu';

class MetadataManager extends LitElement {
  static properties = {
    _path: { state: true },
    _property: { state: true },
    _pages: { state: true },
    _duration: { state: true },
    _cancelCallback: { state: true },
    _cancelCallbackAcitve: { state: true },
    _metaDataProperties: { state: true },
    _willModify: { state: true },
  };

  constructor() {
    super();
    this._pages = [];
    this._duration = 0;
    this._cancelCallback = () => {};
    this._cancelCallbackAcitve = false;
    this._metaDataProperties = [];
    this._willModify = false;
  }

  async connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
  }

  showCounts() {
    const propertyCounts = {};

    this._pages.forEach((page) => {
      const property = page.foundProperty;
      if (property) {
        propertyCounts[property] = (propertyCounts[property] || 0) + 1;
      }
    });

    // Convert to array of objects with property and count
    const result = Object.entries(propertyCounts).map(([property, count]) => ({
      property,
      count,
    }));

    this._metaDataProperties = result;
  }

  // function to parse results
  async getListFromPath() {
    const { context, token } = await DA_SDK;
    const targetProject = `${context.org}/${context.repo}`;
    const folderPath = `/${targetProject}/${this._path}/`;

    const HEADERS = {
      'Content-Type': 'application/json',
      // eslint-disable-next-line quote-props
      'Authorization': `Bearer ${token}`,
    };

    const opts = {
      method: 'GET',
      headers: HEADERS,
    };

    // Create the callback to fire when a file is returned
    const callback = async (file) => {
      const htmlText = await fetchDaSource(file.path, opts);
      const metadataProp = matchPageToMetadata(htmlText, ppn);
      this._pages.push({
        path: file.path,
        foundProperty: metadataProp,
      });
    };

    // Start the crawl
    const { results, getDuration, cancelCrawl } = crawl(
      { path: folderPath, callback, throttle: 10 },
    );

    // Asign the cancel button the cancel event
    this._cancelCallbackAcitve = true;
    this._cancelCallback = cancelCrawl;

    // Await the results to finish
    await results;

    this._duration = getDuration();
    this.showCounts();
  }

  // Function to show results
  handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target.closest('form'));
    const entries = Object.fromEntries(formData.entries());
    const empty = Object.keys(entries).some((key) => !entries[key]);

    if (empty) {
      this._status = { type: 'error', message: 'Some fields empty.' };
      return;
    }

    this._path = entries.path;
    this._property = entries.property;
    this.getListFromPath();
  }

  render() {
    return html`
      <h1>Metadata Manager</h1>
      <form>
        <div class='fieldgroup'>
          <label for="path">Path</label>
          <sl-input type="text" id="path" name="path" placeholder="path" value=${pth}></sl-input>
        </div>
        <div class='fieldgroup'>
          <label for="property">Property</label>
          <sl-input type="text" id="property" name="property" placeholder="property" value=${ppn}></sl-input>
        </div>
        <div class="submit">
            <sl-button @click=${this.handleSubmit}>Search Metadata</sl-button>
          </div>
        </div>
      </form>
      <section class="results">
        <div> 
          <p>Counts<p>
          ${this._metaDataProperties.length > 0 ? this._metaDataProperties.map((countItem) => html`<da-count-item .countItem=${countItem} .pages=${this._pages}>`) : nothing}
        </div>
      </section>
      <div>
        <p>${this._duration}</p>
      </div>
      <div>
        ${this._cancelCallbackAcitve ? html`<button @click=${this._cancelCallback}>Cancel crawl</button>` : nothing}
      </div>
    `;
  }
}

customElements.define('da-metadata-manager', MetadataManager);
customElements.define('da-count-item', CountItem);
