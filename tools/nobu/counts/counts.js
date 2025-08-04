/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-unresolved */
import 'https://da.live/nx/public/sl/components.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import { LitElement, html, nothing } from 'da-lit';
import ModifyProperty from '../modify-property/modify-property.js';

const style = await getStyle(import.meta.url);

class CountItem extends LitElement {
  static properties = { _modify: { state: true } };

  constructor() {
    super();
    this._modify = false;
  }

  async connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
  }

  toggleModify() {
    this._modify = !this._modify;
  }

  render() {
    const matchingPages = this.pages.filter(
      (page) => page.foundProperty === this.countItem.property,
    );

    return html`
      <section class="property-counts">
        <div class="found-property"> 
          <h3>Property: ${this.countItem.property}</h3>
          <h3>Count: ${this.countItem.count}<h3>
          <sl-button @click=${this.toggleModify}>Modify</sl-button>
          ${this._modify ? html`<da-modify-property .paths=${matchingPages} .mdProperty=${this.countItem.property}></da-modify-property>` : nothing}
        </div>
        <div class="found-paths">
          <h3>Paths:</h3>
          <ul>
            ${matchingPages.map((page) => html`<li>${page.path}</li>`)}
          </ul>
          </div>
      </section>
    `;
  }
}

customElements.define('da-modify-property', ModifyProperty);

export default CountItem;
