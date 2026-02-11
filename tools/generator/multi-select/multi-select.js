/* eslint-disable import/no-unresolved, no-underscore-dangle */
import { LitElement, html } from 'da-lit';
import getStyle from 'styles';

const style = await getStyle(import.meta.url.split('?')[0]);

class MultiSelect extends LitElement {
  static formAssociated = true;

  static properties = {
    name: { type: String },
    label: { type: String },
    value: { type: Array },
    options: { type: Array },
    isOpen: { type: Boolean, state: true },
  };

  static styles = style;

  constructor() {
    super();
    this.name = '';
    this.label = '';
    this.value = [];
    this.options = [];
    this.isOpen = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this._internals = this.attachInternals();
    this._internals.setFormValue(JSON.stringify(this.value));
    document.addEventListener('click', this.handleClickOutside);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleClickOutside);
  }

  update(props) {
    if (props.has('value')) {
      this._internals.setFormValue(JSON.stringify(this.value));
    }
    super.update(props);
  }

  handleClickOutside = (e) => {
    const path = e.composedPath();
    const clickedInside = path.includes(this);
    if (!clickedInside && this.isOpen) {
      this.isOpen = false;
    }
  };

  toggleDropdown(e) {
    e?.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  isSelected(optionValue) {
    return this.value.includes(optionValue);
  }

  handleValueChange(newValue) {
    this.value = newValue;
    this._internals.setFormValue(JSON.stringify(newValue));

    const changeEvent = new CustomEvent('change', {
      detail: { name: this.name, value: newValue },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(changeEvent);
  }

  toggleOption(optionValue, e) {
    e.stopPropagation();

    const newValue = this.isSelected(optionValue) ? this.value.filter((v) => v !== optionValue)
      : [...this.value, optionValue];

    this.handleValueChange(newValue);
  }

  removeTag(optionValue, e) {
    e.stopPropagation();
    const newValue = this.value.filter((v) => v !== optionValue);
    this.handleValueChange(newValue);
  }

  getOptionLabel(optionValue) {
    const option = this.options.find((opt) => opt.value === optionValue);
    return option ? option.label : optionValue;
  }

  render() {
    const hasSelections = this.value && this.value.length > 0;

    return html`
      <div class="sl-inputfield">
        ${this.label ? html`<label for="${this.name}">${this.label}</label>` : ''}
        <div class="dropdown-container">
          <div
            class="selected-items${this.isOpen ? ' open' : ''}"
            @click=${(e) => this.toggleDropdown(e)}>
            ${hasSelections ? this.value.map((val) => html`
              <span class="selected-tag">
                ${this.getOptionLabel(val)}
                <button @click=${(e) => this.removeTag(val, e)} aria-label="Remove ${this.getOptionLabel(val)}">×</button>
              </span>`) : html`<span class="placeholder">--Select--</span>`}
          </div>
          <div class="dropdown-menu ${this.isOpen ? '' : 'hidden'}">
            ${this.options?.length > 0 ? this.options.map((option) => html`
              <div
                class="dropdown-option ${this.isSelected(option.value) ? 'selected' : ''}"
                @click=${(e) => this.toggleOption(option.value, e)}>
                <div class="checkbox ${this.isSelected(option.value) ? 'checked' : ''}"></div>
                <span>${option.label}</span>
              </div>`) : html`<div class="no-options">No options available</div>`}
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('multi-select', MultiSelect);
