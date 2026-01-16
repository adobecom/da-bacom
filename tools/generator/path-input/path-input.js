/* eslint-disable import/no-unresolved, no-underscore-dangle, class-methods-use-this */
import { LitElement, html, nothing } from 'da-lit';
import getStyle from 'styles';

const style = await getStyle(import.meta.url.split('?')[0]);

class PathInput extends LitElement {
  static formAssociated = true;

  static styles = style;

  static properties = {
    name: { type: String },
    value: { type: String },
    prefix: { type: String },
    status: { type: String },
    error: { type: String },
    placeholder: { type: String },
    label: { type: String },
    disabled: { type: Boolean },
  };

  constructor() {
    super();
    this._internals = this.attachInternals();
    this.name = '';
    this.value = '';
    this.prefix = '';
    this.status = 'idle';
    this.error = '';
    this.placeholder = '';
    this.label = 'Page Path';
    this.disabled = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this._internals.setFormValue(this.value || '');
  }

  updated(changedProperties) {
    if (changedProperties.has('value')) {
      this._internals.setFormValue(this.value || '');
    }
  }

  get form() {
    return this._internals.form;
  }

  sanitizeInput(input) {
    return input
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/[\s]+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();
  }

  handleInput(e) {
    const sanitized = this.sanitizeInput(e.target.value);
    e.target.value = sanitized;
    this.value = sanitized;
    this._internals.setFormValue(sanitized);

    const inputEvent = new CustomEvent('input', {
      bubbles: true,
      composed: true,
      detail: { name: this.name, value: sanitized },
    });
    this.dispatchEvent(inputEvent);
  }

  renderValidationIcon() {
    switch (this.status) {
      case 'checking':
        return html`<span class="validation-icon checking" aria-label="Checking availability"></span>`;
      case 'available':
        return html`<span class="validation-icon available" aria-label="Path available"></span>`;
      case 'conflict':
        return html`<span class="validation-icon conflict" aria-label="Path already exists"></span>`;
      default:
        return nothing;
    }
  }

  render() {
    const hasError = this.error && this.error.length > 0;
    const placeholderText = this.sanitizeInput(this.placeholder);

    return html`
      <div class="path-input-wrapper">
        <label class="path-label">${this.label}</label>
        <div class="path-input-container ${hasError ? 'error' : ''}">
          ${this.prefix ? html`<span class="path-prefix">${this.prefix}</span>` : nothing}
          <input
            type="text"
            class="path-input"
            name="${this.name}"
            .value=${this.value || ''}
            placeholder=${placeholderText}
            ?disabled=${this.disabled}
            @input=${this.handleInput}
          />
          ${this.renderValidationIcon()}
        </div>
        ${hasError ? html`<div class="error-message">${this.error}</div>` : nothing}
      </div>
    `;
  }
}

if (!customElements.get('path-input')) customElements.define('path-input', PathInput);

export default PathInput;
