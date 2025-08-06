/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-unresolved */
import 'https://da.live/nx/public/sl/components.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import { LitElement, html, nothing } from 'da-lit';
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { crawl } from 'https://da.live/nx/public/utils/tree.js';
import CountItem from './counts/counts.js';
import matchPageToMetadata from './document-utils.js';
import { getDaSourceText } from './fetch-utils.js';

const style = await getStyle(import.meta.url);
const COPY_TO_CLIPBOARD = 'Copy paths to clipboard';

// For testing purposes, to remove later
const pth = 'drafts/slavin/nobu';
// const pth = 'products'

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
    _copyText: { type: String },
    _updatedPaths: { type: Array },
    _metadataSearchProps: { type: Array },
  };

  constructor() {
    super();
    this._pages = [];
    this._duration = 0;
    this._cancelCallback = () => {};
    this._cancelCallbackAcitve = false;
    this._metaDataProperties = [];
    this._willModify = false;
    this._updatedPaths = [];
    this._copyText = COPY_TO_CLIPBOARD;
    this.addEventListener('updatedMetadata', async (e) => {
      const updatedPages = e.detail.updatePayload;
      this._pages = this._pages.map((page) => {
        const updatedPage = updatedPages.find((up) => up.path.path === page.path);
        if (updatedPage) {
          return {
            ...page,
            foundProperty: updatedPage.updatedValue,
          };
        }
        return page;
      });

      this.showCounts();
      const { context } = await DA_SDK;
      const updatedPaths = e.detail.updatePayload.map((p) => {
        const daPath = p.path.path;
        const trimmed = daPath.replace(`/${context.org}/${context.repo}/`, '');
        const aemPath = `https://main--${context.repo}--${context.org}.aem.page/${trimmed}`;
        return aemPath;
      });
      // Use Set to ensure no duplicates
      const uniquePaths = [...new Set([...updatedPaths, ...this._updatedPaths])];
      this._updatedPaths = uniquePaths;
    });
    this._metadataSearchProps = [];
  }

  async connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
    // To modify after PoC
    const mdAllowSheetUrl = 'https://main--da-bacom--adobecom.aem.live/drafts/slavin/nobu/allowed-ppn.json';
    const mdAllowSheetResp = await fetch(mdAllowSheetUrl);
    if (mdAllowSheetResp.ok) {
      const json = await mdAllowSheetResp.json();
      const allowedSearches = Object.keys(json.data[0]).reduce((list, key) => {
        list.push(key);
        return list;
      }, []);
      this._metadataSearchProps = allowedSearches;
    }
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

    // Create a new array to trigger reactivity
    this._metaDataProperties = [...result];
    return result;
  }

  // function to parse results
  async getListFromPath() {
    const { context, token } = await DA_SDK;
    const targetProject = `${context.org}/${context.repo}`;
    const folderPath = `/${targetProject}/${this._path}/`;

    // Create the callback to fire when a file is returned
    const callback = async (file) => {
      const htmlText = await getDaSourceText(file.path, token);
      const { foundValue } = matchPageToMetadata(htmlText, this._property);
      this._pages.push({
        path: file.path,
        foundProperty: foundValue.innerText,
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

  handleCopy(e) {
    e.preventDefault();
    if (this._updatedPaths.length > 0) {
      const pathsText = this._updatedPaths.join('\n');
      navigator.clipboard.writeText(pathsText).then(() => {
        this._copyText = 'Copied';
        setTimeout(() => {
          this._copyText = COPY_TO_CLIPBOARD;
        }, 1500);
      }).catch(() => {
        this._copyText = 'Error';
        setTimeout(() => {
          this._copyText = COPY_TO_CLIPBOARD;
        }, 1500);
      });
    } else {
      this._copyText = 'No updated paths to copy';
      setTimeout(() => {
        this._copyText = COPY_TO_CLIPBOARD;
      }, 1500);
    }
  }

  // Function to show results
  handleSubmit(e) {
    e.preventDefault();
    this._pages = [];
    this._metaDataProperties = [];
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
      <section class='main-ui'>
        <form class="metadata-manager">
          <div class='fieldgroup'>
            <label for="path">Path</label>
            <sl-input type="text" id="path" name="path" placeholder="path" value=${pth}></sl-input>
          </div>
          <div class='fieldgroup'>
            <label for="property">Property</label>
            <select type="text" id="property" name="property" placeholder="property">
              ${this._metadataSearchProps.map((prop) => html`<option name=${prop}>${prop}</option>`)}
            </select>
          </div>
          <div class="submit">
              <sl-button @click=${this.handleSubmit}>Search Metadata</sl-button>
            </div>
          </div>
        </form>
        ${this._updatedPaths.length > 0 ? html`<sl-button class='copy' @click=${this.handleCopy}>${this._copyText}</sl-button>` : nothing}
      </section>
      <section class="results">
        <div> 
          <h3>Counts</h3>
          ${this._metaDataProperties.length > 0 ? this._metaDataProperties.map((countItem) => html`<da-count-item .selectedProp=${this._property} .countItem=${countItem} .pages=${this._pages}>`) : nothing}
        </div>
      </section>
      <section class='crawl'> 
        <div>
          <p>Crawl duration:</p>
          <p>${this._duration}</p>
        </div>
        <div class='cancel'>
          ${this._cancelCallbackAcitve ? html`<sl-button @click=${this._cancelCallback}>Cancel crawl</sl-button>` : nothing}
        </div>
      </section>
    `;
  }
}

customElements.define('da-metadata-manager', MetadataManager);
customElements.define('da-count-item', CountItem);
