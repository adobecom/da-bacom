/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-unresolved */
import 'https://da.live/nx/public/sl/components.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import { LitElement, html, nothing } from 'da-lit';

// const style = await getStyle(import.meta.url);

class MetadataManager extends LitElement {
  static properties = {
    _data: { state: true },
    _loading: { state: true },
    _status: { state: true },
    _time: { state: true },
  };

  h1Title = 'Metadata Mananger';

  render() {
    return html`
      <h1>${this.h1Title}</h1>
      <div>Hello world</div>
      <form>
        <div class='fieldgroup'>
          <label for="path">Path</label>
          <sl-input type="text" id="path" name="path" placeholder="path"></sl-input>
        </div>
        <div>
          <label for="property">Property</label>
          <sl-input type="text" id="property" name="property" placeholder="property"></sl-input>
        </div>
      </form>
    `;
  }
}

customElements.define('da-metadata-manager', MetadataManager);
