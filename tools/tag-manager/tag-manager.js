/* eslint-disable no-underscore-dangle, import/no-unresolved */
import { LitElement, html, nothing } from 'https://da.live/nx/deps/lit/lit-core.min.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import {
  SHEET_URL, fetchGroups, fetchGroupTags, getGroupChoices, readSheet,
  applyStagedChanges, saveSheet, refreshPreview,
} from './tag-manager-utils.js';

const style = await getStyle(import.meta.url);
const SELECTED_GROUP_KEY = 'da-tag-manager-group';

function renderGroupCounts(group) {
  return html`
    <span class="group-counts">
      <span class="count browser-count">Browser ${group.sheetCount}</span>
      <span class="count caas-count">CaaS ${group.caasCount}</span>
    </span>
  `;
}

export default class DaTagManager extends LitElement {
  static properties = {
    daFetch: { attribute: false },
    _groups: { state: true },
    _groupId: { state: true },
    _sheet: { state: true },
    _tags: { state: true },
    _staged: { state: true },
    _initializing: { state: true },
    _loading: { state: true },
    _saving: { state: true },
    _needsReload: { state: true },
    _previewPending: { state: true },
    _status: { state: true },
    _statusKind: { state: true },
    _editing: { state: true },
  };

  constructor() {
    super();
    this._groups = [];
    this._groupId = '';
    try {
      this._groupId = sessionStorage.getItem(SELECTED_GROUP_KEY) || '';
    } catch {
      // Storage can be blocked in embedded apps.
    }
    this._sheet = null;
    this._tags = null;
    this._staged = new Map();
    this._editing = null;
    this._customId = 0;
    this._initializing = false;
    this._loading = false;
    this._saving = false;
    this._needsReload = false;
    this._previewPending = false;
    this._status = 'Loading tags...';
    this._statusKind = 'info';
    this._groupRequest = 0;
    this._initRequest = 0;
    this._beforeUnload = (event) => {
      if (!this._staged.size && !this._editing) return;
      event.preventDefault();
      event.returnValue = '';
    };
    this._outsideGroupPicker = (event) => {
      const picker = this.shadowRoot.querySelector('.group-picker');
      if (picker && !event.composedPath().includes(picker)) picker.open = false;
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
    window.addEventListener('beforeunload', this._beforeUnload);
    window.addEventListener('pointerdown', this._outsideGroupPicker);
  }

  disconnectedCallback() {
    this._groupRequest += 1;
    this._initRequest += 1;
    window.removeEventListener('beforeunload', this._beforeUnload);
    window.removeEventListener('pointerdown', this._outsideGroupPicker);
    super.disconnectedCallback();
  }

  updated(changed) {
    if (changed.has('daFetch') && typeof this.daFetch === 'function') this.initialize();
  }

  setStatus(message, kind = 'info') {
    this._status = message;
    this._statusKind = kind;
  }

  get busy() {
    return this._initializing || this._saving;
  }

  get canStage() {
    return Boolean(this._sheet) && !this.busy && !this._loading && !this._needsReload;
  }

  async initialize() {
    this._initRequest += 1;
    const request = this._initRequest;
    this._groupRequest += 1;
    this._initializing = true;
    this._loading = false;
    this._needsReload = true;
    this.setStatus('Loading your sheet and tag groups...');
    try {
      const [loaded, sheet] = await Promise.all([fetchGroups(), readSheet(this.daFetch)]);
      if (request !== this._initRequest) return;
      this._groups = getGroupChoices(sheet, loaded.groups);
      this._sheet = sheet;
      this._staged = new Map();
      this._needsReload = false;
      if (!this._groups.some(({ id }) => id === this._groupId)) {
        this._groupId = this._groups.find(({ id }) => id === 'caas:blog-author')?.id
          || this._groups[0].id;
      }
      this._initializing = false;
      await this.loadGroup(this._groupId);
    } catch (error) {
      if (request === this._initRequest) {
        this.setStatus(`${error.message} Refresh this tool to try again.`, 'error');
      }
    } finally {
      if (request === this._initRequest) this._initializing = false;
    }
  }

  async loadGroup(groupId) {
    this._groupRequest += 1;
    const request = this._groupRequest;
    this._groupId = groupId;
    try {
      sessionStorage.setItem(SELECTED_GROUP_KEY, groupId);
    } catch {
      // Keep group selection usable when storage is blocked.
    }
    this._tags = null;
    this._loading = true;
    this.setStatus('Loading suggested changes for this group...');
    try {
      const group = this._groups.find(({ id }) => id === groupId);
      const loaded = group?.inCaas === false
        ? { tags: [] } : await fetchGroupTags(groupId);
      if (request !== this._groupRequest) return;
      this._tags = loaded.tags;
      this._groups = this._groups.map((item) => (item.id === groupId
        ? { ...item, caasCount: loaded.tags.length } : item));
      this.setStatus('Tag data loaded.');
    } catch (error) {
      if (request === this._groupRequest) this.setStatus(error.message, 'error');
    } finally {
      if (request === this._groupRequest) this._loading = false;
    }
  }

  async toggleChange(key, change) {
    if (!this.canStage || this._editing) return;
    const staged = new Map(this._staged);
    if (staged.has(key)) staged.delete(key);
    else staged.set(key, { ...change, groupId: this._groupId });
    try {
      applyStagedChanges(this._sheet, [...staged.values()]);
    } catch (error) {
      this.setStatus(error.message, 'error');
      return;
    }
    this._staged = staged;
    await this.updateComplete;
    [...this.shadowRoot.querySelectorAll('[data-change-key]')]
      .find((button) => button.dataset.changeKey === key)?.focus();
  }

  undoChange(key) {
    if (this.busy) return;
    const staged = new Map(this._staged);
    staged.delete(key);
    this._staged = staged;
  }

  async saveChanges() {
    if (!this.canStage || !this._staged.size || this._editing) return;
    this._saving = true;
    this.setStatus('Creating a backup and saving your staged changes...');
    try {
      const next = applyStagedChanges(this._sheet, [...this._staged.values()]);
      const previewed = await saveSheet(this.daFetch, this._sheet, next);
      this._sheet = next;
      this._groups = getGroupChoices(next, this._groups.filter(({ inCaas }) => inCaas));
      if (!this._groups.some(({ id }) => id === this._groupId)) {
        await this.loadGroup(this._groups[0].id);
      }
      this._staged = new Map();
      this._previewPending = !previewed;
      this.setStatus(
        previewed
          ? 'Staged changes saved and browser preview refreshed. Nothing was published live.'
          : 'Changes saved, but the browser preview could not be refreshed. Retry it below.',
        previewed ? 'success' : 'warning',
      );
    } catch (error) {
      this._needsReload = true;
      this.setStatus(`${error.message} Refresh this tool before saving again.`, 'error');
    } finally {
      this._saving = false;
    }
  }

  async retryPreview() {
    if (this.busy) return;
    this._saving = true;
    const previewed = await refreshPreview(this.daFetch);
    this._previewPending = !previewed;
    this.setStatus(
      previewed ? 'Browser preview refreshed. Nothing was published live.'
        : 'The sheet is saved, but the browser preview could not be refreshed. Please try again.',
      previewed ? 'success' : 'warning',
    );
    this._saving = false;
  }

  selectGroup(event, groupId) {
    if (this._editing) {
      this.setStatus('Apply or cancel your edit before switching groups.', 'warning');
      return;
    }
    const picker = event.currentTarget.closest('details');
    picker.open = false;
    picker.querySelector('summary').focus();
    this.loadGroup(groupId);
  }

  onGroupKeydown(event) {
    const picker = event.currentTarget;
    const summary = picker.querySelector('summary');
    if (event.key === 'Escape') {
      picker.open = false;
      summary.focus();
      event.preventDefault();
      return;
    }
    if (this.busy || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    picker.open = true;
    const options = [...picker.querySelectorAll('.group-option')];
    if (!options.length) return;
    const index = options.indexOf(this.shadowRoot.activeElement);
    let next;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    else if (index === -1) next = options.findIndex((option) => option.getAttribute('aria-pressed') === 'true');
    else next = (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
    options[Math.max(0, next)].focus();
  }

  async editTag(key, tag, change) {
    if (!this.canStage) return;
    this._editing = { key, ...tag, change };
    await this.updateComplete;
    this.shadowRoot.querySelector('.tag-editor input')?.focus();
  }

  applyEdit(event) {
    event.preventDefault();
    if (!this.canStage) return;
    const form = event.currentTarget;
    const title = form.elements.title.value.trim();
    const name = form.elements.name.value.trim();
    const { key, change } = this._editing;
    const staged = new Map(this._staged);
    const next = { ...change, title, groupId: this._groupId };
    if (change.kind === 'update') next.newName = name;
    else next.name = name;
    staged.set(key, next);
    if (change.kind === 'update') {
      const original = this._sheet['CaaS tags'].data[change.rowIndex];
      if (original.title === title && original.value === name) staged.delete(key);
    }
    try {
      applyStagedChanges(this._sheet, [...staged.values()]);
      this._staged = staged;
      this._editing = null;
      this.setStatus('Edits staged. Save changes to update the tag sheet.');
    } catch (error) {
      this.setStatus(error.message, 'error');
    }
  }

  renderEditor() {
    return html`
      <tr class="tag-editor"><td colspan="5">
        <form @submit=${this.applyEdit}>
          <label>Title
            <input name="title" .value=${this._editing.title} required ?disabled=${!this.canStage}>
          </label>
          <label>Value
            <input name="name" .value=${this._editing.name} required ?disabled=${!this.canStage}>
          </label>
          <div class="row-actions">
            <button type="submit" ?disabled=${!this.canStage}>Apply edit</button>
            <button type="button" class="secondary" @click=${() => { this._editing = null; }}>Cancel</button>
          </div>
        </form>
      </td></tr>
    `;
  }

  renderCurrentRow(row, rowIndex, tagMap) {
    const key = `row:${rowIndex}`;
    const staged = this._staged.get(key);
    if (this._editing?.key === key) return this.renderEditor();
    const title = staged?.title ?? row.title;
    const name = staged?.newName ?? row.value;
    const tag = tagMap.get(name);
    return html`
      <tr data-row=${rowIndex} data-kind=${staged?.kind || ''}>
        <td>${title}</td>
        <td>${tag?.title || '-'}</td>
        <td class="tag-name">${name}</td>
        <td>${staged ? `${staged.kind === 'remove' ? 'Removal' : 'Edit'} staged` : 'Current'}</td>
        <td><div class="row-actions">
          ${staged?.kind !== 'remove' ? html`
            <button class="secondary" data-action="edit" ?disabled=${!this.canStage || Boolean(this._editing)}
              aria-label=${`Edit ${title}`}
              @click=${() => this.editTag(key, { title, name }, { kind: 'update', rowIndex, name: row.value })}>Edit</button>
          ` : nothing}
          ${staged ? html`
            <button class="secondary" data-change-key=${key} ?disabled=${!this.canStage || Boolean(this._editing)}
              aria-label=${`Undo change to ${row.title}`}
              @click=${() => this.toggleChange(key, staged)}>Undo</button>
          ` : html`
            ${tag && tag.title !== row.title ? html`
              <button data-action="update" data-change-key=${key} ?disabled=${!this.canStage || Boolean(this._editing)}
                aria-label=${`Update title of ${row.title} to ${tag.title}`}
                @click=${() => this.toggleChange(key, { kind: 'update', rowIndex, name: row.value, title: tag.title })}>Update</button>
            ` : nothing}
            <button class="secondary danger" data-action="remove" data-change-key=${key}
              ?disabled=${!this.canStage || Boolean(this._editing)} aria-label=${`Remove ${row.title}`}
              @click=${() => this.toggleChange(key, { kind: 'remove', rowIndex, name: row.value, title: row.title })}>Remove</button>
          `}
        </div></td>
      </tr>
    `;
  }

  renderAvailableRow(tag, tagMap, key = `add:${tag.name}`) {
    const staged = this._staged.get(key);
    const name = staged?.name ?? tag.name;
    return html`
      <tr data-name=${name} data-kind=${staged ? 'add' : ''}>
        <td></td>
        <td>${tagMap.get(name)?.title || '-'}</td>
        <td class="tag-name">${name}</td>
        <td>${staged ? 'Addition staged' : 'Available'}</td>
        <td><div class="row-actions">
          <button class=${staged ? 'secondary' : ''} data-action="add" data-change-key=${key} ?disabled=${!this.canStage || Boolean(this._editing)}
            aria-label=${`${staged ? 'Undo addition of' : 'Add'} ${tag.title}`}
            @click=${() => this.toggleChange(key, { kind: 'add', name: tag.name, title: tag.title })}>
            ${staged ? 'Undo Add' : 'Add'}
          </button>
        </div></td>
      </tr>
    `;
  }

  render() {
    const rows = this._sheet?.['CaaS tags'].data || [];
    const current = rows.map((row, rowIndex) => ({ row, rowIndex }))
      .filter(({ row }) => row.value.startsWith(`${this._groupId}/`));
    const names = new Set(rows.map(({ value }) => value));
    this._staged.forEach((change, key) => {
      if (change.kind === 'update') names.add(change.newName ?? change.name);
      if (change.kind === 'add' && key !== `add:${change.name}`) names.add(change.name);
    });
    const available = (this._tags || []).filter(({ name }) => !names.has(name));
    const custom = [...this._staged].filter(([key, change]) => key.startsWith('custom:')
      && change.groupId === this._groupId);
    const tagMap = new Map((this._tags || []).map((tag) => [tag.name, tag]));
    const selectedGroup = this._groups.find(({ id }) => id === this._groupId);
    return html`
      <div class="tag-manager">
        <header>
          <div>
            <h1>Tag Manager</h1>
          </div>
          <a href=${SHEET_URL} target="_blank" rel="noopener noreferrer">Open tag sheet</a>
        </header>
        <div class="card toolbar">
          <span id="tag-group-label">CaaS Tag Group</span>
          <div class="group-controls">
            <details class="group-picker" @keydown=${this.onGroupKeydown}
              @focusout=${(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
  }}>
              <summary id="tag-group" aria-labelledby="tag-group-label tag-group"
                aria-disabled=${this.busy || !this._groups.length}
                tabindex=${this.busy || !this._groups.length ? -1 : 0}
                @click=${(event) => {
    if (this.busy || !this._groups.length) event.preventDefault();
  }}>
                <span class="group-title">${selectedGroup?.title || 'Loading tag groups...'}</span>
                ${selectedGroup ? renderGroupCounts(selectedGroup) : nothing}
              </summary>
              <div class="group-options" role="group" aria-labelledby="tag-group-label">
                ${this._groups.map((group) => html`
                  <button class="group-option" type="button" data-group-id=${group.id}
                    aria-pressed=${group.id === this._groupId} ?disabled=${this.busy}
                    @click=${(event) => this.selectGroup(event, group.id)}>
                    <span class="group-title">${group.title}</span>
                    ${renderGroupCounts(group)}
                  </button>
                `)}
              </div>
            </details>
            <button id="save-changes" ?disabled=${!this.canStage || !this._staged.size || Boolean(this._editing)}
              @click=${this.saveChanges}>${this._staged.size ? `Save ${this._staged.size} changes` : 'Save changes'}</button>
          </div>
        </div>
        <p id="status" class="status-line" data-kind=${this._statusKind}
          ?hidden=${this._statusKind === 'info' && !this._loading && !this.busy}
          role=${this._statusKind === 'error' ? 'alert' : 'status'}
          aria-live="polite">${this._status}</p>
        ${this._sheet ? html`
            <section class="card tags" aria-labelledby="tags-heading">
              <div class="table-heading">
                <h2 id="tags-heading">Tags <span class="count">${current.length + available.length + custom.length}</span></h2>
                <button id="add-custom-tag" ?disabled=${!this.canStage || Boolean(this._editing)}
                  @click=${() => {
    this._customId += 1;
    this.editTag(`custom:${this._customId}`, { title: '', name: `${this._groupId}/` }, { kind: 'add' });
  }}>Add custom tag</button>
              </div>
              ${this._loading ? html`<p>Loading suggestions...</p>` : nothing}
              ${!this._tags && !this._loading ? html`<p>Suggestions are unavailable. Current tags can still be edited.</p>` : nothing}
                <div class="table-wrap" tabindex="0" role="region" aria-label="Tags">
                  <table>
                    <thead><tr><th scope="col">Title</th><th scope="col">CaaS Title</th><th scope="col">Value</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
                    <tbody>
                      ${current.map(({ row, rowIndex }) => this.renderCurrentRow(row, rowIndex, tagMap))}
                      ${available.map((tag) => this.renderAvailableRow(tag, tagMap))}
                      ${custom.map(([key, tag]) => this.renderAvailableRow(tag, tagMap, key))}
                      ${this._editing?.key.startsWith('custom:') && !this._staged.has(this._editing.key) ? this.renderEditor() : nothing}
                    </tbody>
                  </table>
                </div>
              ${!current.length && !available.length && !custom.length && !this._editing && !this._loading
    ? html`<p>No tags in this group. Add a custom tag to get started.</p>` : nothing}
            </section>
        ` : nothing}
        ${this._previewPending ? html`
          <button id="retry-preview" class="secondary" ?disabled=${this.busy} @click=${this.retryPreview}>Refresh browser preview</button>
        ` : nothing}
      </div>
    `;
  }
}

customElements.define('da-tag-manager', DaTagManager);
