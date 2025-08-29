/* eslint-disable import/no-unresolved */
import { LitElement, html } from 'da-lit';
import getStyle from 'styles';

const style = await getStyle(import.meta.url.split('?')[0]);

const FADE_TIMEOUT = 300;

export default class ToastMessage extends LitElement {
  static properties = {
    message: { type: String },
    type: { type: String },
    timeout: { type: Number },
    visible: { type: Boolean, reflect: true },
  };

  static styles = style;

  constructor() {
    super();
    this.message = '';
    this.type = 'info';
    this.timeout = 0;
    this.visible = false;
  }

  connectedCallback() {
    super.connectedCallback();
    setTimeout(() => {
      this.visible = true;
      if (this.timeout > 0) {
        setTimeout(() => this.hide(), this.timeout);
      }
    }, FADE_TIMEOUT);
  }

  hide() {
    this.visible = false;
    setTimeout(() => this.remove(), FADE_TIMEOUT);
  }

  render() {
    return html`
      <div class="toast ${this.type}" role="alert" aria-live="polite">
        ${this.message}
        <button @click=${this.hide} aria-label="Close notification">x</button>
      </div>
    `;
  }
}

export const createToast = (message, type = 'info', timeout = 0) => {
  const toast = document.createElement('toast-message');
  toast.message = message;
  toast.type = type;
  toast.timeout = timeout;

  return toast;
};
