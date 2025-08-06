/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-unresolved */
import 'https://da.live/nx/public/sl/components.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import { LitElement, html, nothing } from 'da-lit';
import ModifyProperty from '../modify-property/modify-property.js';

const style = await getStyle(import.meta.url);

class CountItem extends LitElement {
  static properties = {
    selectedProp: { type: String },
    countItem: { type: Object },
    pages: { type: Array },
    _modify: { state: true },
    _updateOpen: { state: true },
    _pathsShown: { type: String },
  };

  constructor() {
    super();
    this._modify = false;
    this._updateOpen = '';
    this._pathsShown = '';
    this.addEventListener('updatedMetadata', () => {
      this.toggleModify();
    });
  }

  async connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
  }

  togglePathsList() {
    console.log(this._pathsShown);
    if (this._pathsShown === '') {
      this._pathsShown = 'shown';
    } else {
      this._pathsShown = '';
    }
  }

  toggleModify() {
    this._modify = !this._modify;
    if (this._updateOpen === '') {
      this._updateOpen = 'update-open';
    } else {
      this._updateOpen = '';
    }
  }

  render() {
    const matchingPages = this.pages.filter(
      (page) => page.foundProperty === this.countItem.property,
    );

    return html`
      <section class="property-counts">
        <div class="found-property"> 
          <h3>Property: ${this.countItem.property}</h3>
          <h3>Count: ${this.countItem.count}</h3>
        </div>
        <div class="found-paths">
          <div class="title"> 
            <h3>Paths:</h3>
            <button @click=${this.togglePathsList}>Expand</button>
          </div>
          <ul class="paths-list ${this._pathsShown}">
            ${matchingPages.map((page) => html`<li>${page.path}</li>`)}
          </ul>
        </div>
        <div class='modify-container'>
         <button @click=${this.toggleModify} class='modify-button ${this._updateOpen}'>Modify</button>
          ${this._modify ? html`<da-modify-property .selectedProp=${this.selectedProp} .paths=${matchingPages} .mdProperty=${this.countItem.property}></da-modify-property>` : nothing}
        </div>
      </section>
    `;
  }
}

customElements.define('da-modify-property', ModifyProperty);

export default CountItem;
