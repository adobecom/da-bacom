/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-unresolved */
import 'https://da.live/nx/public/sl/components.js';
import { LitElement, html } from 'da-lit';
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { getDaSourceText, updateDaPage } from '../fetch-utils.js';
import matchPageToMetadata from '../document-utils.js';

class ModifyProperty extends LitElement {
  static properties = { _inputVal: { state: true } };

  constructor() {
    super();
    this._inputVal = '';
  }

  handleInput(e) {
    this._inputVal = e.target.value;
  }

  async handleSubmit() {
    for (const path of this.paths) {
      const { token } = await DA_SDK;

      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 100));

      const htmlResp = await getDaSourceText(path.path, token);
      const { foundValue, parsedPage } = matchPageToMetadata(htmlResp, this.mdProperty, false);
      // Now we modify and post
      foundValue.innerText = this._inputVal;

      const updateStatus = await updateDaPage(parsedPage, path.path, token);
      if (updateStatus === 200) {
        alert('We did it!');
      }
    }
  }

  render() {
    return html`
      <form class="modify-property">
        <div class='fieldgroup'>
          <label for="new-property">New Property</label>
          <sl-input type="text" id="new-property" name="new-property" placeholder="new property" value=${this._inputVal} @input=${this.handleInput}></sl-input>
        </div>
        <div class="submit">
            <sl-button @click=${this.handleSubmit}>Modify Property</sl-button>
          </div>
        </div>
      </form>
    `;
  }
}

export default ModifyProperty;
