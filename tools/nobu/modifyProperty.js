/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-unresolved */
import 'https://da.live/nx/public/sl/components.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import { LitElement, html, nothing } from 'da-lit';
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { crawl } from 'https://da.live/nx/public/utils/tree.js';

class ModifyProperty extends LitElement {
  handleSubmit() {
    console.log('click', this.paths);
    this.paths.forEach((p) => {
      console.log(p);
    });
  }

  render() {
    return html`
      <form class="modify-property">
        <div class='fieldgroup'>
          <label for="new-property">New Property</label>
          <sl-input type="text" id="new-property" name="new-property" placeholder="new property" value=""></sl-input>
        </div>
        <div class="submit">
            <sl-button @click=${this.handleSubmit}>Modify Property</sl-button>
          </div>
        </div>
      </form>
    `;
  }
}

export { ModifyProperty };
