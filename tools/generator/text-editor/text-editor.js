/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable class-methods-use-this */
import { LitElement, html, nothing, createRef, ref } from 'da-lit';
import getStyle from 'styles';

const style = await getStyle(import.meta.url.split('?')[0]);

class TextEditor extends LitElement {
  static formAssociated = true;

  static styles = style;

  static properties = {
    name: { type: String },
    value: { type: String },
    label: { type: String },
    error: { type: String },
  };

  constructor() {
    super();
    this._internals = this.attachInternals();
    this.editorRef = createRef();
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.createRange = () => document.createRange();
    this._internals.setFormValue(this.value || '');
  }

  firstUpdated() {
    const editor = this.editorRef.value;
    if (editor && this.value) {
      editor.innerHTML = this.value;
    }

    if (editor) {
      editor.addEventListener('mouseup', () => this.requestUpdate());
      editor.addEventListener('keyup', () => this.requestUpdate());
      editor.addEventListener('focus', () => this.requestUpdate());
    }
  }

  getTags() {
    const editor = this.editorRef.value;
    const tags = [];

    if (!editor || this.shadowRoot.activeElement !== editor) {
      return tags;
    }

    if (document.queryCommandState('bold')) {
      tags.push('strong');
    }
    if (document.queryCommandState('italic')) {
      tags.push('em');
    }
    if (document.queryCommandState('insertUnorderedList')) {
      tags.push('ul');
    }

    return tags;
  }

  handleInput(e) {
    const htmlContent = e.target.innerHTML;
    this.value = htmlContent;
    this._internals.setFormValue(htmlContent);

    const inputEvent = new Event('input', { bubbles: true, composed: true });
    this.dispatchEvent(inputEvent);
  }

  handlePaste(e) {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);

    const editor = this.editorRef.value;
    this.handleInput({ target: editor });
  }

  handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      this.executeCommand('bold');
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      this.executeCommand('italic');
    }
  }

  executeCommand(command) {
    const editor = this.editorRef.value;
    if (!editor) return;

    editor.focus();

    document.execCommand(command, false, null);

    this.handleInput({ target: editor });
    this.requestUpdate();
  }

  get form() {
    return this._internals.form;
  }

  handleButtonClick(e, action) {
    e.preventDefault();

    const commandMap = {
      list: 'insertUnorderedList',
      strong: 'bold',
      em: 'italic',
    };

    this.executeCommand(commandMap[action]);
  }

  render() {
    const tags = this.getTags();

    return html`
      <div class="inputfield text-editor">
        ${this.label ? html`<label for="${this.name}">${this.label}</label>` : nothing}
        <div class="editor-toolbar">
          <button
            type="button"
            class="toolbar-btn bold ${tags.includes('strong') || tags.includes('b') ? 'is-active' : ''}"
            @mousedown=${(e) => e.preventDefault()}
            @click=${(e) => this.handleButtonClick(e, 'strong')}
            title="Bold (Ctrl+B / Cmd+B)"
            aria-label="Bold (Ctrl+B)">
          </button>
          <button
            type="button"
            class="toolbar-btn italic ${tags.includes('em') || tags.includes('i') ? 'is-active' : ''}"
            @mousedown=${(e) => e.preventDefault()}
            @click=${(e) => this.handleButtonClick(e, 'em')}
            title="Italic (Ctrl+I / Cmd+I)"
            aria-label="Italic (Ctrl+I)">
          </button>
          <button
            type="button"
            class="toolbar-btn list ${tags.includes('ul') ? 'is-active' : ''}"
            @mousedown=${(e) => e.preventDefault()}
            @click=${(e) => this.handleButtonClick(e, 'list')}
            title="Bullet List"
            aria-label="Bullet List">
          </button>
        </div>
        <div
          ${ref(this.editorRef)}
          class="editor-content ${this.error ? 'has-error' : ''}"
          contenteditable="true"
          @input=${this.handleInput}
          @paste=${this.handlePaste}
          @keydown=${this.handleKeyDown}>
        </div>
        ${this.error ? html`<p class="inputfield-error">${this.error}</p>` : nothing}
      </div>
    `;
  }
}

customElements.define('text-editor', TextEditor);
