/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-unresolved */
import 'https://da.live/nx/public/sl/components.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import { LitElement, html, nothing } from 'da-lit';
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { crawl } from 'https://da.live/nx/public/utils/tree.js';

const style = await getStyle(import.meta.url);

// For testing purposes, to remove later
const mdConfig = 'https://main--da-bacom--adobecom.aem.live/drafts/slavin/metadata-selector/md-config.json';
// const pth = 'products'

class MdForm extends LitElement {
  static properties = {
    _title: { state: true },
    _formFields: { state: true },
    _addSelection: { state: true },
  };

  constructor() {
    super();
    this._title = 'Metadata Builder';
    this._formFields = [
      { label: 'Title', placeholder: 'page title' },
      { label: 'Description', placeholder: 'page description' },
    ];
    this._addSelection = [];
  }

  async connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
  }

  handleAdd(e) {
    e.preventDefault();
    const formData = new FormData(e.target.closest('form'));
    console.log(formData, e.target.closest('form'));
    const entries = Object.fromEntries(formData.entries());
    const empty = Object.keys(entries).some((key) => !entries[key]);

    if (empty) {
      // this._status = { type: 'error', message: 'Some fields empty.' };
      // return;
      console.log('empty');
    }

    console.log(entries);
    this._addSelection = entries;
  }

  render() {
    return html`
    <section class='metadata-builder'>
      <h1>${this._title}</h1>
      <section>
        <div class='builder-form'>
          <form>
            <div class='copy-as-table'>
              <!-- this is the submit button -->
              <button><span class='copy-icon'></span>Copy as table</button>
            </div>
            ${this._formFields.map((fg) => html`
              <div class='fieldgroup'>
                <label for=${fg.label}>${fg.label}</label>
                <input type='text' name=${fg.label} id=${fg.label} placeholder=${fg.placeholder}></input>
              </div>
              `)}
          </form>
          <form class='add-fields'>
            <select name='key' id='key-select'>
              <option value="select-key">Select key</option>
              <option value="key-opt">Opt 2</option>
            </select>
            <select name='choice' id='choice-select'>
              <option value="select-choice">Select your choice here</option>
              <option value="choice-opt">Opt 2</option>
            </select> 
            <button @click=${this.handleAdd}>Add</button>
          </form>
        </div>
      </section>
    </section>`;
  }
}

customElements.define('da-md-form', MdForm);
