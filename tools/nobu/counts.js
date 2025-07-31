/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-unresolved */
import 'https://da.live/nx/public/sl/components.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import { LitElement, html, nothing } from 'da-lit';
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { crawl } from 'https://da.live/nx/public/utils/tree.js';

class CountItem extends LitElement {
  // static properties = {
  //   _paths: { state: true },
  // }

  // constructor() {
  //   super();
  //   this._paths = [];
  // }

  handleSubmit() {
    this._paths.forEach((p) => {
      console.log(p);
    });
  }

  render() {
    const matchingPages = this.pages.filter(
      (page) => page.foundProperty === this.countItem.property
    );

    return html`
      <section class="property-counts">
        <div class="found-property"> 
          <h3>Property: ${this.countItem.property}</h3>
          <h3>Count: ${this.countItem.count}<h3>
          <sl-button>Modify</sl-button>
          <da-modify-property .paths=${matchingPages}></da-modify-property>
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

export { CountItem };
