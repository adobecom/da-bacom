/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-unresolved */
import 'https://da.live/nx/public/sl/components.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import { LitElement, html, nothing } from 'da-lit';
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { crawl } from 'https://da.live/nx/public/utils/tree.js';

class ModifyProperty extends LitElement {
  async handleSubmit() {
    for (const path of this.paths) {
      console.log(path);
      const { context, token } = await DA_SDK;
      const targetProject = `${context.org}/${context.repo}`;

      const DA_ORIGIN = 'https://admin.da.live/source';
      const listPath = `${DA_ORIGIN}${path.path}`;
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log(listPath);

      const HEADERS = {
        'Content-Type': 'application/json',
        // eslint-disable-next-line quote-props
        'Authorization': `Bearer ${token}`,
      };

      const opts = {
        method: 'GET',
        headers: HEADERS,
      };

      const getData = await fetch(listPath, opts);
      if (!getData.ok) {
        return;
      }
      const htmlResp = await getData.text();
      console.log(htmlResp);

      const newParser = new DOMParser();
      const parsedPage = newParser.parseFromString(htmlResp, 'text/html');
      const metadata = parsedPage.querySelectorAll('.metadata > div');
      let foundValue;
      metadata.forEach((pair) => {
        const key = pair?.children[0]?.children[0];
        const value = pair?.children[1]?.children[0];
        console.log(`Key ${key?.innerText} Value ${value?.innerText}`);
        if (value.innerText === this.mdProperty) {
          foundValue = value;
        }
      });
      console.log(foundValue);

      // Now we modify and post 
    }
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
