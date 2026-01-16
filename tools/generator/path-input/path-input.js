/* eslint-disable import/no-unresolved, no-underscore-dangle, class-methods-use-this */
import { LitElement, html, nothing } from 'da-lit';
import getStyle from 'styles';

const style = await getStyle(import.meta.url.split('?')[0]);
const DEBOUNCE_DELAY = 800;

class PathInput extends LitElement {
  static formAssociated = true;

  static styles = style;

  static properties = {
    name: { type: String },
    value: { type: String },
    prefix: { type: String },
    suggestion: { type: String },
    status: { type: String },
    error: { type: String },
    label: { type: String },
    disabled: { type: Boolean },
  };

  constructor() {
    super();
    this._internals = this.attachInternals();
    this._debounceTimer = null;
    this._previousPrefix = '';
    this.name = '';
    this.value = '';
    this.prefix = '';
    this.suggestion = '';
    this.status = 'empty';
    this.error = '';
    this.label = 'Page Path';
    this.disabled = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this._internals.setFormValue(this.value || '');
    this._previousPrefix = this.prefix;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
  }

  updated(changedProperties) {
    if (changedProperties.has('value')) {
      this._internals.setFormValue(this.value || '');
    }

    if (changedProperties.has('prefix') && this._previousPrefix !== this.prefix) {
      if (this.value && this.status !== 'empty') {
        this.dispatchStatusChange('stale');
      }
      this._previousPrefix = this.prefix;
    }
  }

  get form() {
    return this._internals.form;
  }

  get sanitizedSuggestion() {
    return this.suggestion ? this.sanitizeInput(this.suggestion) : '';
  }

  get fullPath() {
    return `${this.prefix}${this.value}`;
  }

  get showButton() {
    if (!this.sanitizedSuggestion || this.disabled) return false;

    if (!this.value) return true;

    const buttonStates = ['conflict', 'stale'];
    if (buttonStates.includes(this.status)) return true;

    return false;
  }

  get buttonLabel() {
    if (this.status === 'stale') return 'Check';
    if (this.status === 'conflict' && this.value !== this.sanitizedSuggestion) {
      return 'Check';
    }
    return 'Check';
  }

  sanitizeInput(input) {
    if (!input) return '';
    return input
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/[\s]+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();
  }

  dispatchStatusChange(newStatus) {
    this.dispatchEvent(new CustomEvent('status-change', {
      bubbles: true,
      composed: true,
      detail: { status: newStatus },
    }));
  }

  dispatchValidateRequest(value, isSuggestion = false) {
    this.dispatchEvent(new CustomEvent('validate-request', {
      bubbles: true,
      composed: true,
      detail: {
        name: this.name,
        value,
        fullPath: `${this.prefix}${value}`,
        isSuggestion,
      },
    }));
  }

  handleInput(e) {
    const sanitized = this.sanitizeInput(e.target.value);
    e.target.value = sanitized;
    this.value = sanitized;
    this._internals.setFormValue(sanitized);

    this.dispatchEvent(new CustomEvent('input', {
      bubbles: true,
      composed: true,
      detail: { name: this.name, value: sanitized },
    }));

    if (!sanitized) {
      this.dispatchStatusChange('empty');
      return;
    }

    this.startDebounce(sanitized);
  }

  startDebounce(value) {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }

    this._debounceTimer = setTimeout(() => {
      this.dispatchStatusChange('checking');
      this.dispatchValidateRequest(value, false);
    }, DEBOUNCE_DELAY);
  }

  handleButtonClick(e) {
    e.preventDefault();
    e.stopPropagation();

    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }

    const valueToValidate = this.status === 'stale' ? this.value : this.sanitizedSuggestion;

    if (this.status !== 'stale' && this.value !== this.sanitizedSuggestion) {
      this.value = this.sanitizedSuggestion;
      this._internals.setFormValue(this.sanitizedSuggestion);

      this.dispatchEvent(new CustomEvent('input', {
        bubbles: true,
        composed: true,
        detail: { name: this.name, value: this.sanitizedSuggestion },
      }));
    }

    this.dispatchStatusChange('checking');
    this.dispatchValidateRequest(valueToValidate, this.status !== 'stale');
  }

  renderValidationIcon() {
    const iconStates = ['checking', 'available', 'conflict', 'stale'];
    if (!iconStates.includes(this.status)) return nothing;

    return html`<span class="validation-icon ${this.status}"></span>`;
  }

  renderButton() {
    if (!this.showButton) return nothing;

    return html`
      <button
        type="button"
        class="path-action-btn"
        @click=${this.handleButtonClick}
      >
        ${this.buttonLabel}
      </button>
    `;
  }

  render() {
    const hasError = this.error && this.error.length > 0;

    return html`
      <div class="path-input-wrapper">
        <label class="path-label">${this.label}</label>
        <div class="path-input-row">
          <div class="path-input-container ${hasError ? 'error' : ''} ${this.status}">
            ${this.prefix && !this.disabled ? html`<span class="path-prefix">${this.prefix}</span>` : nothing}
            <input
              type="text"
              class="path-input"
              name="${this.name}"
              .value=${this.value || ''}
              placeholder=${this.disabled ? this.prefix : this.sanitizedSuggestion}
              ?disabled=${this.disabled}
              @input=${this.handleInput}
            />
            ${this.renderValidationIcon()}
          </div>
          ${this.renderButton()}
        </div>
        ${hasError ? html`<div class="error-message">${this.error}</div>` : nothing}
      </div>
    `;
  }
}

if (!customElements.get('path-input')) customElements.define('path-input', PathInput);

export default PathInput;
