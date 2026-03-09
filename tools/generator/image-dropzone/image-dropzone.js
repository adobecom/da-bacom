/* eslint-disable import/no-unresolved */
/* eslint-disable class-methods-use-this */
import { LitElement, html } from 'da-lit';
import getStyle from 'styles';
import getSvg from 'svg';

const MAX_FILE_SIZE = 26214400; // 25MB

const style = await getStyle(import.meta.url.split('?')[0]);
const progressIcons = await getSvg({ paths: ['/tools/ui/progress.svg'] });

async function isImageTypeValid(file) {
  const validTypes = ['jpeg', 'jpg', 'png', 'svg'];
  let currentFileType = '';

  const blob = file.slice(0, 128);

  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const signatures = {
    jpeg: [0xFF, 0xD8, 0xFF],
    png: [0x89, 0x50, 0x4E, 0x47],
  };

  if (signatures.jpeg.every((byte, i) => byte === bytes[i])) {
    const extension = file.name.split('.').pop().toLowerCase();
    /* c8 ignore next 7 */
    if (extension === 'jpg' || extension === 'jpeg') {
      currentFileType = extension;
    } else {
      currentFileType = 'jpeg';
    }
  }

  if (signatures.png.every((byte, i) => byte === bytes[i])) {
    currentFileType = 'png';
  }

  const text = await blob.text();

  if (text.trim().startsWith('<svg')) {
    currentFileType = 'svg';
  }

  return validTypes.includes(currentFileType);
}

function isImageSizeValid(file, maxSize) {
  return file.size <= maxSize;
}

export default class ImageDropzone extends LitElement {
  static properties = {
    file: { type: Object, reflect: true },
    handleImage: { type: Function },
    handleDelete: { type: Function },
    name: { type: String },
    error: { type: String },
    uploading: { type: Boolean },
  };

  static styles = style;

  constructor() {
    super();
    this.file = null;
    this.handleImage = () => {};
    this.handleDelete = this.handleDelete || null;
    this.name = '';
    this.error = '';
    this.uploading = false;
  }

  connectedCallback() {
    super.connectedCallback();
    if (progressIcons?.length) {
      this.shadowRoot.append(...progressIcons.filter(Boolean).map((icon) => icon.cloneNode(true)));
    }
    this.boundOnUploadComplete = (e) => {
      if (e.detail?.name === this.name) {
        this.uploading = false;
        this.requestUpdate();
      }
    };
    document.addEventListener('upload-complete', this.boundOnUploadComplete);
  }

  cleanupFile() {
    if (this.file?.url && this.file.url.startsWith('blob:')) {
      URL.revokeObjectURL(this.file.url);
      this.file.url = null;
    }
  }

  disconnectedCallback() {
    document.removeEventListener('upload-complete', this.boundOnUploadComplete);
    this.cleanupFile();
    super.disconnectedCallback();
  }

  updated(changedProperties) {
    super.updated?.(changedProperties);
    if (changedProperties.has('file') && this.file?.path && this.uploading) {
      this.uploading = false;
    }
  }

  async setFile(files) {
    const [file] = files;

    if (!isImageSizeValid(file, MAX_FILE_SIZE)) {
      document.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'error', message: 'File size should be less than 25MB', timeout: 0 },
        bubbles: true,
        composed: true,
      }));
      return;
    }

    const isValid = await isImageTypeValid(file);
    if (isValid) {
      this.cleanupFile();
      this.file = file;
      this.requestUpdate();
    } else {
      document.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'error', message: 'Invalid file type. The image file should be in one of the following format: .jpeg, .jpg, .png, .svg', timeout: 0 },
        bubbles: true,
        composed: true,
      }));
    }
  }

  getFile() {
    return this.file;
  }

  async handleImageDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const { files } = e.dataTransfer;

    if (files.length > 0) {
      await this.setFile(files);
      this.handleImage();
    }
    if (this.file) {
      this.uploading = true;
      this.dispatchEvent(new CustomEvent('image-change', { detail: { file: this.file } }));
    }
  }

  async onImageChange(e) {
    const { files } = e.currentTarget;

    if (files.length > 0) {
      await this.setFile(files);
      this.handleImage();
    }
    if (this.file) {
      this.uploading = true;
      this.dispatchEvent(new CustomEvent('image-change', { detail: { file: this.file } }));
    }
  }

  handleDragover(e) {
    e.preventDefault();
    e.stopPropagation();

    e.currentTarget.classList.add('dragover');
  }

  handleDragleave(e) {
    e.preventDefault();
    e.stopPropagation();

    e.currentTarget.classList.remove('dragover');
  }

  deleteImage() {
    this.cleanupFile();
    this.file = null;

    this.dispatchEvent(new CustomEvent('image-change', { detail: { file: this.file } }));
  }

  render() {
    const hasError = this.error && this.error.length > 0;
    const displayUrl = this.file?.url && !this.file.url.startsWith('blob:');
    let previewBlock;
    if (this.uploading) {
      previewBlock = html`
        <div class="img-file-input-wrapper solid-border">
          <div class="preview-wrapper">
            <div class="preview-img-placeholder preview-spinner-wrapper">
              <svg class="preview-spinner" aria-hidden="true" viewBox="0 0 18 18"><use href="#progress"/></svg>
            </div>
          </div>
        </div>`;
    } else if (displayUrl) {
      previewBlock = html`
        <div class="img-file-input-wrapper solid-border">
          <div class="preview-wrapper">
            <div class="preview-img-placeholder">
              <img src="${this.file.url}" alt="preview image">
            </div>
            <img src="/tools/generator/image-dropzone/delete.svg" alt="delete icon" class="icon icon-delete" @click=${this.handleDelete ? this.handleDelete : this.deleteImage}>
          </div>
        </div>`;
    } else {
      previewBlock = html`
        <div class="img-file-input-wrapper ${hasError ? 'error' : ''}">
          <label class="img-file-input-label" @dragover=${this.handleDragover} @dragleave=${this.handleDragleave} @drop=${this.handleImageDrop}>
            <input type="file" class="img-file-input" accept="image/png, image/jpeg, image/jpg, image/svg+xml" @change=${this.onImageChange}>
            <img src="/tools/generator/image-dropzone/image-add.svg" alt="add image icon" class="icon icon-image-add">
            <slot name="img-label"></slot>
          </label>
        </div>`;
    }
    return html`
      ${previewBlock}
      ${hasError ? html`<div class="error-message">${this.error}</div>` : ''}
    `;
  }
}

if (!customElements.get('image-dropzone')) customElements.define('image-dropzone', ImageDropzone);
