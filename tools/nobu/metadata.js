/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-unresolved */
import 'https://da.live/nx/public/sl/components.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import { LitElement, html, nothing } from 'da-lit';
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { crawl } from 'https://da.live/nx/public/utils/tree.js';

// const style = await getStyle(import.meta.url);
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
  };

  constructor() {
    super();
    this._pages = [];
    this._duration = 0;
    this._cancelCallback = () => {};
    this._cancelCallbackAcitve = false;
    this._metaDataProperties = [];
  }
  // Function to take take the path and crawl pages

  // function to store the html returned into state
  async getHtml(path, opts) {
    const daLivePath = `https://admin.da.live/source${path}`;
    const resp = await fetch(daLivePath, opts);
    if (!resp.ok) return;
    const text = await resp.text();
    this._pages.push({
      path,
      html: text,
    });
  }

  parseMetadata(page) {
    const newParser = new DOMParser();
    const parsedPage = newParser.parseFromString(page.html, 'text/html');
    const metadata = parsedPage.querySelectorAll('.metadata > div');
    metadata.forEach((pair) => {
      const key = pair?.children[0]?.children[0];
      const value = pair?.children[1]?.children[0];
      console.log(`Key ${key?.innerText} Value ${value?.innerText}`);
      if (key.innerText === ppn) {
        page.foundProperty = value.innerText;
      }
    });
    return page;
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
    console.log('get list from path');
    const { context, token } = await DA_SDK;
    const targetProject = `${context.org}/${context.repo}`;

    const DA_ORIGIN = 'https://admin.da.live';
    const partPath = `/${targetProject}/${this._path}/`;
    const listPath = `${DA_ORIGIN}/list/${targetProject}/${this._path}/`;
    console.log(`This is the list path: ${listPath}`);

    const HEADERS = {
      'Content-Type': 'application/json',
      // eslint-disable-next-line quote-props
      'Authorization': `Bearer ${token}`,
    };

    const opts = {
      method: 'GET',
      headers: HEADERS,
    };

    const resp = await fetch(listPath, opts);
    if (resp.ok) {
      const json = await resp.json();
      console.log(json);
    }

    // Create the callback to fire when a file is returned
    const callback = async (file) => {
      await this.getHtml(file.path, opts);
    };

    // Start the crawl
    const { results, getDuration, cancelCrawl } = crawl({ path: partPath, callback, throttle: 10 });

    // Asign the cancel button the cancel event
    this._cancelCallbackAcitve = true;
    this._cancelCallback = cancelCrawl;

    // Await the results to finish
    await results;

    this._duration = getDuration();
    console.log(results, 'results');

    this._pages.forEach((page) => {
      const primary = this.parseMetadata(page);
      console.log(primary);
    });

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

    console.log(entries, formData);
    this.getListFromPath();
  }

  renderCounts(countItem) {
    const matchingPages = this._pages.filter((page) => page.foundProperty === countItem.property);

    return html`
      <div>
        <p>Property: ${countItem.property}</p>
        <p>Count: ${countItem.count}<p>
        <p>Paths:</p>
        <ul>
          ${matchingPages.map((page) => html`<li>${page.path}</li>`)}
        </ul>
      </div>
    `;
  }

  render() {
    return html`
      <h1>${this.h1Title}</h1>
      <form>
        <div class='fieldgroup'>
          <label for="path">Path</label>
          <sl-input type="text" id="path" name="path" placeholder="path" value=${pth}></sl-input>
        </div>
        <div>
          <label for="property">Property</label>
          <sl-input type="text" id="property" name="property" placeholder="property" value=${ppn}></sl-input>
        </div>
        <div>
            <sl-button @click=${this.handleSubmit}>Search Metadata</sl-button>
          </div>
        </div>
      </form>
      <section class="results">
        <div> 
          <p>Counts<p>
          ${this._metaDataProperties.length > 0 ? this._metaDataProperties.map((countItem) => this.renderCounts(countItem)) : nothing}
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
