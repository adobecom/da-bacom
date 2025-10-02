/* eslint-disable no-underscore-dangle, import/no-unresolved */
import 'https://da.live/nx/public/sl/components.js';
import { LitElement, html } from 'https://da.live/nx/deps/lit/lit-core.min.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

const style = await getStyle(import.meta.url);
const { context, token } = await DA_SDK.catch(() => null);
const options = { headers: { Authorization: `Bearer ${token}` } };
const marqueeSource = 'https://admin.da.live/source/adobecom/da-bacom/drafts/slavin/my-tests/marquee.html';

const allowedBlocks = ['marquee', 'text'];
const textTypes = ['p', 'h1', 'h2', 'h3', 'h4', 'h5'];

class BlockToForm extends LitElement {
  static properties = {
    propCollection: { Type: Array },
    _title: { Type: String },
    _inputObjects: { Type: Array },
    _document: { state: true },
  };

  constructor() {
    super();
    this._title = 'Block to Form';
    this._inputObjects = {};
    this._document = {};
  }

  static styles = style;

  parseDomForBlocks(doc) {
    const cleanUpClasses = [];
    const sections = doc.querySelectorAll('main > div');
    const blocksWithPlaceholders = {};

    sections.forEach((section, i) => {
      const sectionClass = `section-${i}`;
      section.classList.add(sectionClass);
      section.classList.add('section');
      cleanUpClasses.push(sectionClass);
    });

    const blocks = doc.querySelectorAll('main > div > div');
    console.log(sections, blocks);

    blocks.forEach((block, i) => {
      const blockClass = block.classList[0];
      if (allowedBlocks.includes(blockClass)) {
        const sectionClass = block.closest('.section').classList[0];
        blocksWithPlaceholders[sectionClass] = [];
        const queryKey = `${sectionClass}-${blockClass}-${i}`;
        block.classList.add(`${queryKey}`);
        cleanUpClasses.push(queryKey);

        const placeholders = Array.from(block.querySelectorAll('*')).filter((node) => node.children.length === 0 && node.textContent.includes('{{'));
        placeholders.forEach((placeholder) => {
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

  render() {
    return html`
      <div class="block-to-form">
        <h1>${this._title}</h1>
        <div class='preview'></div>
      </div>
    `;
  }
}

customElements.define('block-to-form', BlockToForm);
