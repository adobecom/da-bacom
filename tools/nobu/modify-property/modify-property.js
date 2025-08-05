/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-unresolved */
import 'https://da.live/nx/public/sl/components.js';
import { LitElement, html } from 'da-lit';
import getStyle from 'https://da.live/nx/utils/styles.js';
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { getDaSourceText, updateDaPage } from '../fetch-utils.js';
import matchPageToMetadata from '../document-utils.js';

const style = await getStyle(import.meta.url);

class ModifyProperty extends LitElement {
  static properties = {
    _inputVal: { state: true },
    _updating: { state: true },
  };

  constructor() {
    super();
    this._inputVal = '';
    this._updating = false;
  }

  async connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
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
      await new Promise((resolve) => setTimeout(resolve, 100));

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
            <sl-input type="text" id="new-property" name="new-property" placeholder="new property" value=${this._inputVal} @input=${this.handleInput}></sl-input>
          </div>
          <div class="submit">
              <sl-button @click=${this.handleSubmit}>Modify Property</sl-button>
            </div>
          </div>
        </form>`}
      </section>
    `;
  }
}

export default ModifyProperty;
