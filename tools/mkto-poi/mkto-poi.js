/* eslint-disable no-underscore-dangle, import/no-unresolved */
import getStyle from 'https://da.live/nx/utils/styles.js';
import { LitElement, html } from 'da-lit';

const POI_URL = 'https://milo.adobe.com/tools/marketo-options.json';

async function getMarketoPOI() {
  const resp = await fetch(POI_URL);
  if (!resp.ok) {
    const error = 'Error fetching marketo options';
    const mktoError = new CustomEvent('mktoOptionsError', { detail: { message: error } });
    document.dispatchEvent(mktoError);
    return [];
  }

  const data = await resp.json();
  return data;
}

function poiPair(data) {
  const poiList = data.poi.data;
  return poiList.reduce((rdx, item) => {
    const { Key, Value } = item;
    rdx.push({ Key, Value });
    return rdx;
  }, []);
}

export default class mktoPoiSelector extends LitElement {
  static properties = {
    propOptions: { Type: Array },
    style: { Type: String },
    _options: { state: true },
  };

  constructor() {
    super();
    this._options = [];
  }

  async connectedCallback() {
    super.connectedCallback();
    const style = this._style ? await getStyle(this._style) : await getStyle(import.meta.url);
    this.shadowRoot.adoptedStyleSheets = [style];

    if (!this.propOptions) {
      const data = await getMarketoPOI();
      this._options = poiPair(data);
    } else {
      this._options = this.propOptions;
    }
  }

  render() {
    return html`
      <section class="mkto-poi">
        <label for="mkto-poi">POI</label>
        <select name="mkto-poi" id="mkto-poi">
          <option value=''>--Select--</option>
          ${this._options.map(({ Key, Value }) => html`<option value=${Value}>${Key}</option>`)}
        </section>
      </div>
    `;
  }
}
