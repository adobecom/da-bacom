/* eslint-disable no-underscore-dangle, import/no-unresolved */
import 'https://da.live/nx/public/sl/components.js';
import { LitElement, html } from 'https://da.live/nx/deps/lit/lit-core.min.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

const style = await getStyle(import.meta.url);
const { token } = await DA_SDK.catch(() => null);
const options = { headers: { Authorization: `Bearer ${token}` } };
const marqueeSource = 'https://admin.da.live/source/adobecom/da-bacom/drafts/slavin/my-tests/marquee.html';

const allowedBlocks = ['marquee', 'text'];

class BlockToForm extends LitElement {
  static properties = {
    propCollection: { Type: Array },
    _title: { Type: String },
    _inputObjects: { Type: Array },
    _document: { state: true },
    _inputKeys: { Type: Array },
    _cleanupClasses: { Type: Array },
  };

  constructor() {
    super();
    this._title = 'Block to Form';
    this._inputObjects = {};
    this._document = {};
    this._inputKeys = [];
    this._cleanupClasses = [];
  }

  static styles = style;

  parseDomForBlocks(doc) {
    const sections = doc.querySelectorAll('main > div');
    const blocksWithPlaceholders = {};

    sections.forEach((section, i) => {
      const sectionClass = `section-${i}`;
      section.classList.add(sectionClass);
      this._cleanupClasses.push(sectionClass);
      section.classList.add('section');
    });

    const blocks = doc.querySelectorAll('main > div > div');
    console.log(sections, blocks);

    blocks.forEach((block, i) => {
      const blockClass = block.classList[0];
      if (allowedBlocks.includes(blockClass)) {
        const sectionClass = block.closest('.section').classList[0];
        blocksWithPlaceholders[sectionClass] = blocksWithPlaceholders[sectionClass] || [];

        const placeholders = Array.from(block.querySelectorAll('*')).filter((node) => node.children.length === 0 && node.textContent.includes('{{'));
        placeholders.forEach((placeholder, j) => {
          const queryKey = `${sectionClass}-${blockClass}-${i}-placeholder-${j}`;
          this._inputKeys.push(queryKey);
          placeholder.classList.add(`${queryKey}`);
          this._cleanupClasses.push(queryKey);

          const tag = placeholder.tagName;
          const content = placeholder.textContent.replace('{{', '').replace('}}', '');
          blocksWithPlaceholders[sectionClass].push({
            tag,
            content,
            block: blockClass,
            replaceKey: placeholder.textContent,
            queryKey,
            section: sectionClass,
            blockId: `${blockClass}-${i}`,
          });
        });
      }
    });

    console.log(blocksWithPlaceholders);
    this._inputObjects = blocksWithPlaceholders;
    this._document = doc;
  }

  async connectedCallback() {
    super.connectedCallback();
    const marqueePage = await fetch(marqueeSource, options);
    if (!marqueePage.ok) console.log('noop');
    const text = await marqueePage.text();
    const newParser = new DOMParser();
    const page = newParser.parseFromString(text, 'text/html');

    this.parseDomForBlocks(page);
  }

  renderInputs(input) {
    const inputLabel = input.blockId.split('-').join(' ');
    return html`
      <div>
        <label for='${input.queryKey}'>${inputLabel} ${input.content}</label>
        <input type='text' id='${input.queryKey}' name='${input.queryKey}' placeholder='${input.content}'></input>
      </div>
    `;
  }

  async addValues(e, doc) {
    e.preventDefault();
    const formData = new FormData(e.target.closest('form'));
    const entries = Object.fromEntries(formData.entries());
    console.log(entries);

    Object.keys(entries).forEach((key) => {
      const placeholder = doc.querySelector(`.${key}`);
      placeholder.innerText = entries[key];
    });

    doc.querySelectorAll('.section').forEach((s) => s.classList.remove('section'));

    this._cleanupClasses.forEach((cc) => {
      doc.querySelector(`.${cc}`).classList.remove(cc);
    });

    console.log(doc);

    const updatePath = `https://admin.da.live/source/adobecom/da-bacom/drafts/slavin/my-tests/block-to-form.html`;

    const xmlSer = new XMLSerializer();
    const newText = xmlSer.serializeToString(doc);

    const blob = new Blob([newText], { type: 'text/html' });
    const body = new FormData();
    body.append('data', blob);
    const postOpts = {
      headers: { Authorization: `Bearer ${token}` },
      method: 'POST',
      body,
    };
    const postResp = await fetch(updatePath, postOpts);
    console.log(postResp.status);
  }

  renderSection(key) {
    const sectionName = key.split('-').join(' ');

    return html`
      <section class='form-${sectionName}'>
        <h4>${sectionName}</h4>
        ${this._inputObjects[key].map((input) => this.renderInputs(input))}
      </section>
    `;
  }

  render() {
    return html`
      <div class="block-to-form">
        <h1>${this._title}</h1>
        <form class='preview'>
          ${Object.keys(this._inputObjects).map((key) => this.renderSection(key))}
          <button @click=${(e) => this.addValues(e, this._document)}>Create Page</submit>
        </form>
      </div>
    `;
  }
}

customElements.define('block-to-form', BlockToForm);
