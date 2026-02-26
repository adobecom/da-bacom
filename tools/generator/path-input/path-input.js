/* eslint-disable import/no-unresolved, no-underscore-dangle, class-methods-use-this */
import { LitElement, html, nothing } from 'da-lit';
import getStyle from 'styles';
import getSvg from 'svg';

const style = await getStyle(import.meta.url.split('?')[0]);
const icons = await getSvg({
  paths: [
    '/tools/ui/progress.svg',
    '/tools/ui/checkmark.svg',
    '/tools/ui/warning.svg',
  ],
});
const DEBOUNCE_DELAY = 800;
const TOOLTIP_ERROR_DURATION = 4000;
const TOOLTIP_INFO_DURATION = 2000;
const STATUS = {
  EMPTY: 'empty',
  CHECKING: 'checking',
  AVAILABLE: 'available',
  CONFLICT: 'conflict',
};
const MESSAGES = {
  CHECKING: 'Checking if this path is available.',
  AVAILABLE: 'This path is available.',
  CONFLICT: 'This path is already in use. Please choose a different name.',
};

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
    _tooltipVisible: { type: Boolean, state: true },
  };

  constructor() {
    super();
    this._internals = this.attachInternals();
    this._debounceTimer = null;
    this._tooltipTimer = null;
    this._tooltipVisible = false;
    this._previousPrefix = '';
    this._loadValidated = false;
    this.name = '';
    this.value = '';
    this.prefix = '';
    this.suggestion = '';
    this.status = STATUS.EMPTY;
    this.error = '';
    this.label = 'Page Path';
    this.disabled = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.append(...icons.map((icon) => icon.cloneNode(true)));
    this._internals.setFormValue(this.value || '');
    this._previousPrefix = this.prefix;
    this._boundHandleApplySuggestion = this._handleApplySuggestionEvent.bind(this);
    document.addEventListener('path-input-apply-suggestion', this._boundHandleApplySuggestion);
  }

  disconnectedCallback() {
    document.removeEventListener('path-input-apply-suggestion', this._boundHandleApplySuggestion);
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
    if (this._tooltipTimer) {
      clearTimeout(this._tooltipTimer);
    }
    super.disconnectedCallback();
  }

  _handleApplySuggestionEvent(e) {
    const targetName = e.detail?.name;
    if (targetName !== undefined && targetName !== this.name) return;
    this.useSuggested();
  }

  updated(changedProperties) {
    if (changedProperties.has('value')) {
      this._internals.setFormValue(this.value || '');
    }

    if (this._savedSelection) {
      const input = this.shadowRoot?.querySelector('.path-input');
      if (input && document.activeElement === input) {
        const { start, end } = this._savedSelection;
        const len = (this.value || '').length;
        input.setSelectionRange(Math.min(start, len), Math.min(end, len));
      }
      this._savedSelection = null;
    }

    const hasRealPrefix = this.prefix?.includes('/');
    const prefixChanged = changedProperties.has('prefix') && this._previousPrefix !== this.prefix;

    if (prefixChanged) {
      if (hasRealPrefix && this.value && this.status !== STATUS.EMPTY) {
        this.dispatchStatusChange(STATUS.CHECKING);
        this.dispatchValidateRequest(this.value, false);
      }
      this._previousPrefix = this.prefix;
    }

    if (
      !prefixChanged
      && this.value
      && hasRealPrefix
      && (this.status === STATUS.AVAILABLE || this.status === STATUS.CONFLICT)
      && !this._loadValidated
    ) {
      this._loadValidated = true;
      this.dispatchStatusChange(STATUS.CHECKING);
      this.dispatchValidateRequest(this.value, false);
    }

    if (changedProperties.has('status') && this.status !== STATUS.EMPTY) {
      if (this.status === STATUS.CONFLICT) {
        this.showTooltip(TOOLTIP_ERROR_DURATION);
      } else {
        this.showTooltip(TOOLTIP_INFO_DURATION);
      }
    }
  }

  get form() {
    return this._internals.form;
  }

  showTooltip(duration = TOOLTIP_ERROR_DURATION) {
    if (this._tooltipTimer) {
      clearTimeout(this._tooltipTimer);
      this._tooltipTimer = null;
    }
    this._tooltipVisible = true;
    this._tooltipTimer = setTimeout(() => {
      this._tooltipVisible = false;
      this._tooltipTimer = null;
    }, duration);
  }

  sanitizeInput(input) {
    if (!input) return '';
    return input
      .replace(/^[\s-]+/, '')
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/[\s-]+/g, '-')
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

  useSuggested() {
    if (this.value) return;
    const sanitized = this.sanitizeInput(this.suggestion ?? '');
    if (!sanitized) return;
    this.value = sanitized;
    this._internals.setFormValue(sanitized);
    this.dispatchEvent(new CustomEvent('input', {
      bubbles: true,
      composed: true,
      detail: { name: this.name, value: sanitized },
    }));
    const hasRealPrefix = this.prefix?.includes('/');
    if (hasRealPrefix) {
      this.dispatchStatusChange(STATUS.CHECKING);
      this.dispatchValidateRequest(sanitized, true);
    }
  }

  handleInput = (e) => {
    const input = e.target;
    const sanitized = this.sanitizeInput(input.value);
    const len = sanitized.length;
    this._savedSelection = {
      start: Math.min(input.selectionStart, len),
      end: Math.min(input.selectionEnd, len),
    };
    input.value = sanitized;
    this.value = sanitized;

    this.dispatchEvent(new CustomEvent('input', {
      bubbles: true,
      composed: true,
      detail: { name: this.name, value: sanitized },
    }));

    if (!sanitized) {
      requestAnimationFrame(() => {
        this.dispatchStatusChange(STATUS.EMPTY);
      });
      return;
    }

    this.startDebounce(sanitized);
  };

  startDebounce(value) {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }

    this._debounceTimer = setTimeout(() => {
      this.dispatchStatusChange(STATUS.CHECKING);
      this.dispatchValidateRequest(value, false);
    }, DEBOUNCE_DELAY);
  }

  handleIconClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (this.disabled) return;
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
    if (!this.value) {
      this.useSuggested();
      return;
    }
    this.dispatchStatusChange(STATUS.CHECKING);
    this.dispatchValidateRequest(this.value, false);
  };

  renderValidationIcon() {
    const iconMap = {
      [STATUS.CHECKING]: 'progress',
      [STATUS.AVAILABLE]: 'checkmark',
      [STATUS.CONFLICT]: 'warning',
    };

    const iconId = iconMap[this.status];
    if (!iconId) return nothing;

    const tooltipText = MESSAGES[this.status.toUpperCase()];

    return html`
      <span class="validation-wrapper ${this._tooltipVisible ? 'tooltip-visible' : ''}">
        <span class="validation-tooltip" role="tooltip">${tooltipText}</span>
        <button type="button" class="validation-icon-button" aria-label="Check path availability" @click=${this.handleIconClick}>
          <svg class="validation-icon ${this.status}">
            <use href="#${iconId}"/>
          </svg>
        </button>
      </span>
    `;
  }

  focusInput = () => {
    const input = this.shadowRoot?.querySelector('.path-input');
    input?.focus();
  };

  render() {
    const hasError = this.error && this.error.length > 0;

    return html`
      <div class="path-input-wrapper">
        <label class="path-label">${this.label}</label>
        <div class="path-input-row">
          <div class="path-input-container ${hasError ? 'error' : ''} ${this.status}">
            ${this.prefix && !this.disabled ? html`<button type="button" class="path-prefix" @click=${this.focusInput}>${this.prefix}</button>` : nothing}
            <input
              type="text"
              class="path-input"
              name="${this.name}"
              .value=${this.value || ''}
              placeholder=${this.disabled ? this.prefix : this.sanitizeInput(this.suggestion ?? '')}
              ?disabled=${this.disabled}
              @input=${this.handleInput}
              @keydown=${this.handleKeydown}
            />
            ${this.renderValidationIcon()}
          </div>
        </div>
        <p class="path-description">Enter only the page name url slug. The path set automatically from your Content Type and Region.</p>
        ${hasError ? html`<div class="error-message">${this.error}</div>` : nothing}
      </div>
    `;
  }
}

if (!customElements.get('path-input')) customElements.define('path-input', PathInput);

export { STATUS };
export default PathInput;
