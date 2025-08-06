/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-unresolved */
import 'https://da.live/nx/public/sl/components.js';
import { LitElement, html, nothing } from 'da-lit';
import getStyle from 'https://da.live/nx/utils/styles.js';
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { getDaSourceText, updateDaPage } from '../fetch-utils.js';
import matchPageToMetadata from '../document-utils.js';

const style = await getStyle(import.meta.url);

class ModifyProperty extends LitElement {
  static properties = {
    _inputVal: { state: true },
    _updating: { state: true },
    _allowedProperties: { type: Array },
    _isUpdated: { state: true },
  };

  constructor() {
    super();
    this._inputVal = '';
    this._updating = false;
    this._allowedProperties = [];
    this._isUpdated = false;
  }

  async connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
    const allowedPropListUrl = 'https://main--da-bacom--adobecom.aem.live/drafts/slavin/nobu/allowed-ppn.json';
    const allowedPropList = await fetch(allowedPropListUrl);
    if (allowedPropList.ok) {
      const json = await allowedPropList.json();
      // We're going to want to expand this method to include any metadata properties on the list
      // And match it to the input value of the initial search
      const allowed = json.data.reduce((list, obj) => {
        if (obj[this.selectedProp] !== '') {
          list.push(obj[this.selectedProp]);
        }
        return list;
      }, []);
      this._allowedProperties = allowed;
    }
  }

  handleInput(e) {
    this._inputVal = e.target.value;
  }

  async handleSubmit() {
    const updatePayload = [];
    let updateStatus = false;
    this._updating = true;

    for (const path of this.paths) {
      const { token } = await DA_SDK;

      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 50));

      const htmlResp = await getDaSourceText(path.path, token);
      const { foundValue, parsedPage } = matchPageToMetadata(htmlResp, this.mdProperty, false);
      // Now we modify and post
      foundValue.innerText = this._inputVal;

      updateStatus = await updateDaPage(parsedPage, path.path, token);
      if (updateStatus === 200) {
        updatePayload.push({
          path,
          updatedValue: this._inputVal,
          status: updateStatus,
        });
      } else {
        updatePayload.push({
          path,
          updatedValue: this._inputVal,
          status: 'failure',
        });
      }
    }
    const updateEvent = new CustomEvent('updatedMetadata', { bubbles: true, composed: true, detail: { updatePayload } });
    this.dispatchEvent(updateEvent);
    this._updating = false;
    this._isUpdated = true;
  }

  render() {
    return html`
      <section class='modify-property-container'>
        ${this._updating
    ? html`
      <div class='modify-progress'>
          <p class='updating-ellipsis'>Updating<p>
      </div>`
    : html`<form class="modify-property">
          <div class='fieldgroup'>
            <label for="new-property">New Property</label>
            <select type="select" id="new-property" name="new-property" placeholder="new property" value=${this._inputVal} @input=${this.handleInput}>
              ${this._allowedProperties.map((prop) => html`<option name=${prop}>${prop}</option>`)}
            </select>
          </div>
          <div class="submit">
              <sl-button @click=${this.handleSubmit}>Modify Property</sl-button>
            </div>
          </div>
        </form>`}
        ${this._isUpdated ? html`<button>Copy</button> ` : nothing}
      </section>
    `;
  }
}

export default ModifyProperty;
