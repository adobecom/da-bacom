/* eslint-disable max-len */
/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */
/* eslint-disable import/no-unresolved */
import 'components';
import getStyle from 'styles';
import DA_SDK from 'da-sdk';
import { initIms } from 'da-fetch';
import { LitElement, html, nothing } from 'da-lit';
import { createToast, TOAST_TYPES } from './toast/toast.js';
import { getSheets, saveSheets } from './da-utils.js';
import {
  fetchMarketoPOIOptions,
  fetchMarketoTemplateRules,
  getCaasOptions,
  fetchPageOptions,
} from './data-sources.js';
import {
  METADATA_SHEET,
  ITEM_STATES,
  SHEET_STATES,
  STATUS_CONFIG,
  ITEM_STATE_LABELS,
  countItems,
  getBlockedSheets,
  getItemState,
  computeSheetStats,
} from './page-builder-utils.js';

await DA_SDK;

const style = await getStyle(import.meta.url.split('?')[0]);

const DATA_PATH = '/tools/page-builder/landing-page/data/';
const EDIT_PATH = 'https://da.live/sheet#/adobecom/da-bacom/';
const TOAST_DEFAULT_TIMEOUT = 5000;

const DATA_SOURCES = [
  { name: 'Marketo POI', id: 'marketo-poi', path: 'marketo-poi-options.json', fetchFn: fetchMarketoPOIOptions },
  { name: 'Marketo Template Rules', id: 'marketo-template-rules', path: 'marketo-template-rules.json', fetchFn: fetchMarketoTemplateRules },
  { name: 'Caas Collections', id: 'caas-collections', path: 'caas-collections.json', fetchFn: getCaasOptions },
  { name: 'Page Options', id: 'page-options', path: 'page-options.json', fetchFn: fetchPageOptions },
];

class PageBuilderAdmin extends LitElement {
  static styles = style;

  static get properties() {
    return {
      dataSources: { type: Array },
      editingSource: { type: String },
      activeSheet: { type: String },
      mergedItems: { type: Array },
      isSaving: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.dataSources = DATA_SOURCES.map((source) => ({ ...source, status: SHEET_STATES.LOADING, error: null }));
    this.editingSource = null;
    this.activeSheet = null;
    this.mergedItems = [];
    this.blockedSheets = new Set();
    this.isSaving = false;
    this.pendingChanges = new Set();
  }

  async connectedCallback() {
    super.connectedCallback();
    document.addEventListener('show-toast', this.handleToast);
    const token = await initIms();
    this.token = token?.accessToken?.token;
    await this.loadAllDataSources();
  }

  disconnectedCallback() {
    document.removeEventListener('show-toast', this.handleToast);
    super.disconnectedCallback();
  }

  handleToast = (e) => {
    e.stopPropagation();
    const { message, type, timeout } = e.detail || {};
    document.body.appendChild(createToast(message, type, timeout));
  };

  normalizeItem(item) {
    if (!item) return null;
    const value = item.value || item.Value;
    const label = item.label || item.Label;
    return (value && label) ? { value, label } : null;
  }

  mapSheet(liveData = [], storedData = [], metadata = []) {
    const data = {};
    const metadataMap = new Map();

    liveData.forEach((item) => {
      const normalized = this.normalizeItem(item);
      if (!normalized) return;
      if (!data[normalized.value]) data[normalized.value] = {};
      data[normalized.value].live = normalized;
    });

    metadata.forEach((meta) => {
      if (!meta.value) return;
      if (!data[meta.value]) data[meta.value] = {};
      data[meta.value].metadata = meta;
      if (meta.modifiedValue) metadataMap.set(meta.modifiedValue, meta.value);
    });

    storedData.forEach((item) => {
      const normalized = this.normalizeItem(item);
      if (!normalized) return;
      const originalValue = metadataMap.get(normalized.value) || normalized.value;
      if (!data[originalValue]) data[originalValue] = {};
      data[originalValue].stored = normalized;
    });

    return data;
  }

  getSheetState(sheetName, sheetData, liveSheet, storedSheet, metadata) {
    const state = {
      status: SHEET_STATES.OUT_OF_SYNC,
      blocked: false,
      itemCounts: {
        total: 0, synced: 0, drifted: 0, new: 0, stale: 0, blocked: 0,
      },
    };

    if (getBlockedSheets(metadata).has(sheetName)) {
      state.blocked = true;
      state.status = SHEET_STATES.BLOCKED;
    }

    if (!liveSheet && !storedSheet) { state.status = SHEET_STATES.ERROR; return state; }
    if (!liveSheet) { state.status = SHEET_STATES.LIVE_NOT_FOUND; return state; }

    let allSynced = true;
    Object.values(sheetData).forEach((item) => {
      state.itemCounts.total += 1;
      const itemState = getItemState(item);
      state.itemCounts[itemState] = (state.itemCounts[itemState] || 0) + 1;
      if (itemState !== ITEM_STATES.SYNCED) allSynced = false;
    });

    state.status = allSynced ? SHEET_STATES.SYNCED : SHEET_STATES.OUT_OF_SYNC;
    return state;
  }

  processData(liveData, storedData, metadata) {
    const data = {};
    const status = {};
    const allSheets = [...new Set([...Object.keys(liveData || {}), ...Object.keys(storedData || {})])];

    allSheets.forEach((sheetName) => {
      data[sheetName] = this.mapSheet(liveData?.[sheetName], storedData?.[sheetName], metadata?.[sheetName]);
      status[sheetName] = this.getSheetState(sheetName, data[sheetName], liveData?.[sheetName], storedData?.[sheetName], metadata);
    });

    return { data, status };
  }

  async loadDataSource(sourceId) {
    const index = this.dataSources.findIndex((s) => s.id === sourceId);
    if (index === -1) return;

    const source = this.dataSources[index];
    this.dataSources[index].status = SHEET_STATES.LOADING;
    this.requestUpdate();

    try {
      const path = `${DATA_PATH}${source.path}`;
      const metadataPath = path.replace('.json', '-meta.json');

      const [metadata, storedData, liveData] = await Promise.all([
        getSheets(metadataPath).catch(() => ({})),
        getSheets(path).catch(() => null),
        source.fetchFn(this.token),
      ]);

      const { data, status: sheetStatus } = this.processData(liveData, storedData, metadata);

      let overallStatus = SHEET_STATES.SYNCED;
      if (!liveData) overallStatus = SHEET_STATES.LIVE_NOT_FOUND;
      else if (!storedData) overallStatus = SHEET_STATES.STORED_NOT_FOUND;
      else {
        const blockedSet = getBlockedSheets(metadata);
        const hasOutOfSync = Object.entries(sheetStatus).some(
          ([name, s]) => !blockedSet.has(name)
            && (s.itemCounts.new > 0 || s.itemCounts.drifted > 0 || s.itemCounts.stale > 0),
        );
        if (hasOutOfSync) overallStatus = SHEET_STATES.OUT_OF_SYNC;
      }

      this.dataSources[index] = {
        ...source,
        status: overallStatus,
        data,
        sheetStatus,
        liveCount: countItems(data, (item) => item.live),
        storedCount: countItems(data, (item) => item.stored),
        totalCount: countItems(data),
        liveData,
        storedData,
        metadata,
        error: null,
      };
    } catch (error) {
      console.error(`Error loading ${source.name}:`, error);
      this.dataSources[index] = { ...source, status: SHEET_STATES.ERROR, error: error.message };
    }
    this.requestUpdate();
  }

  async loadAllDataSources() {
    await Promise.all(this.dataSources.map((s) => this.loadDataSource(s.id)));
  }

  buildMergedItems(source) {
    const items = [];
    Object.entries(source.data).forEach(([sheetName, sheetData]) => {
      Object.entries(sheetData).forEach(([key, item]) => {
        items.push({
          currentValue: item.stored?.value || item.live?.value || '',
          currentLabel: item.stored?.label || item.live?.label || '',
          state: getItemState(item),
          itemKey: `${sheetName}:${key}`,
          sheetName,
          live: item.live,
          stored: item.stored,
          metadata: item.metadata,
          blocked: item.metadata?.blocked || false,
        });
      });
    });
    return items;
  }

  getCurrentSheetItems() {
    return this.activeSheet ? this.mergedItems.filter((m) => m.sheetName === this.activeSheet) : this.mergedItems;
  }

  isSheetBlocked(sheetName) {
    return this.blockedSheets.has(sheetName);
  }

  handleEdit(sourceId) {
    const source = this.dataSources.find((s) => s.id === sourceId);
    if (!source) return;

    this.editingSource = sourceId;
    this.mergedItems = this.buildMergedItems(source);
    this.blockedSheets = getBlockedSheets(source.metadata);
    this.pendingChanges = new Set();

    const sheets = Object.keys(source.data);
    this.activeSheet = sheets.length > 0 ? sheets[0] : null;
    this.requestUpdate();
  }

  handleCancelEdit() {
    const sourceId = this.editingSource;
    this.editingSource = null;
    this.mergedItems = [];
    this.activeSheet = null;
    this.blockedSheets = new Set();
    this.pendingChanges = new Set();
    this.requestUpdate();
    if (sourceId) this.loadDataSource(sourceId);
  }

  handleSheetChange(sheetName) {
    this.activeSheet = sheetName;
    this.requestUpdate();
  }

  handleSyncItem(itemKey) {
    const item = this.mergedItems.find((m) => m.itemKey === itemKey);
    if (!item?.live) return;

    item.currentValue = item.live.value;
    item.currentLabel = item.live.label;
    item.state = ITEM_STATES.SYNCED;
    this.pendingChanges.add(itemKey);
    this.requestUpdate();
  }

  handleToggleBlock(itemKey) {
    const item = this.mergedItems.find((m) => m.itemKey === itemKey);
    if (!item) return;

    item.blocked = !item.blocked;
    if (!item.metadata) item.metadata = {};
    item.metadata.blocked = item.blocked;
    item.state = getItemState({ live: item.live, stored: item.stored, metadata: item.metadata });
    this.pendingChanges.add(itemKey);
    this.requestUpdate();
  }

  handleRemoveItem(itemKey) {
    this.mergedItems = this.mergedItems.filter((m) => m.itemKey !== itemKey);
    this.pendingChanges.add(itemKey);
    this.requestUpdate();
  }

  syncItems(items) {
    const syncable = items.filter((i) => i.live && !i.blocked && [ITEM_STATES.NEW, ITEM_STATES.DRIFTED].includes(i.state));
    const stale = items.filter((i) => i.state === ITEM_STATES.STALE);

    syncable.forEach((item) => {
      Object.assign(item, { currentValue: item.live.value, currentLabel: item.live.label, state: ITEM_STATES.SYNCED });
      this.pendingChanges.add(item.itemKey);
    });

    if (stale.length) {
      const staleKeys = new Set(stale.map((i) => i.itemKey));
      this.mergedItems = this.mergedItems.filter((i) => !staleKeys.has(i.itemKey));
      stale.forEach((i) => this.pendingChanges.add(i.itemKey));
    }
    this.requestUpdate();
  }

  handleSyncSheet() { this.syncItems(this.getCurrentSheetItems()); }

  handleToggleSheetBlock() {
    if (!this.activeSheet) return;
    if (this.blockedSheets.has(this.activeSheet)) this.blockedSheets.delete(this.activeSheet);
    else this.blockedSheets.add(this.activeSheet);
    this.pendingChanges.add(`sheet:${this.activeSheet}`);
    this.requestUpdate();
  }

  handleSyncAll() { this.syncItems(this.mergedItems); }

  buildFinalData(source) {
    const sheets = Object.keys(source.data);
    const isMultiSheet = sheets.length > 1;

    if (isMultiSheet) {
      const result = {};
      Object.keys(source.liveData).forEach((k) => { if (k.startsWith(':')) result[k] = source.liveData[k]; });

      sheets.forEach((sheetName) => {
        if (this.isSheetBlocked(sheetName)) return;
        const items = this.mergedItems.filter((m) => m.sheetName === sheetName && !m.blocked && m.state !== ITEM_STATES.NEW && m.currentValue?.trim());
        result[sheetName] = items.map((i) => ({ value: i.currentValue.trim(), label: i.currentLabel.trim() }));
      });
      return result;
    }

    return this.mergedItems
      .filter((i) => !i.blocked && i.state !== ITEM_STATES.NEW && i.currentValue?.trim())
      .map((i) => ({ value: i.currentValue.trim(), label: i.currentLabel.trim() }));
  }

  buildFinalMetadata(source) {
    const metadata = { [METADATA_SHEET]: [] };
    const isMultiSheet = Object.keys(source.data).length > 1;

    this.blockedSheets.forEach((sheetName) => {
      metadata[METADATA_SHEET].push({ sheetName, blocked: true, lastUpdated: new Date().toISOString() });
    });

    this.mergedItems.filter((i) => i.currentValue?.trim()).forEach((item) => {
      const sheet = isMultiSheet ? item.sheetName : (item.sheetName || 'data');
      if (!metadata[sheet]) metadata[sheet] = [];

      metadata[sheet].push({
        value: item.live?.value || item.currentValue,
        modifiedValue: item.live && item.live.value !== item.currentValue ? item.currentValue : '',
        blocked: item.blocked,
        lastSynced: item.state === ITEM_STATES.SYNCED ? new Date().toISOString() : (item.metadata?.lastSynced || ''),
      });
    });

    return metadata;
  }

  async handleSave() {
    if (this.pendingChanges.size === 0) {
      document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.WARNING, message: 'No changes to save', timeout: TOAST_DEFAULT_TIMEOUT } }));
      return;
    }

    const source = this.dataSources.find((s) => s.id === this.editingSource);
    if (!source) return;

    this.isSaving = true;
    this.requestUpdate();

    try {
      const path = `${DATA_PATH}${source.path}`;
      const metadataPath = path.replace('.json', '-meta.json');

      const [dataRes, metaRes] = await Promise.all([
        saveSheets(path, this.buildFinalData(source)),
        saveSheets(metadataPath, this.buildFinalMetadata(source)),
      ]);

      if (dataRes.ok && metaRes.ok) {
        document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.SUCCESS, message: `${source.name} saved successfully`, timeout: TOAST_DEFAULT_TIMEOUT } }));
        this.pendingChanges.clear();
        await this.loadDataSource(this.editingSource);
        this.mergedItems = this.buildMergedItems(this.dataSources.find((s) => s.id === this.editingSource));
      } else {
        document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: 'Save failed' } }));
      }
    } catch (error) {
      console.error('Error saving:', error);
      document.dispatchEvent(new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: `Save failed: ${error.message}` } }));
    } finally {
      this.isSaving = false;
      this.requestUpdate();
    }
  }

  renderStatusBadge(status) {
    const config = STATUS_CONFIG[status] || { label: 'Unknown', class: 'status-error', icon: '?' };
    return html`<span class="status-badge ${config.class}">${config.icon} ${config.label}</span>`;
  }

  getSyncSummary(source) {
    if (!source.sheetStatus) return null;
    const blockedSheets = getBlockedSheets(source.metadata);

    let synced = 0; let newCount = 0; let drifted = 0; let stale = 0; let blocked = 0;
    Object.entries(source.sheetStatus).forEach(([name, s]) => {
      if (blockedSheets.has(name)) {
        blocked += s.itemCounts.total || 0;
        return;
      }
      synced += s.itemCounts.synced || 0;
      newCount += s.itemCounts.new || 0;
      drifted += s.itemCounts.drifted || 0;
      stale += s.itemCounts.stale || 0;
      blocked += s.itemCounts.blocked || 0;
    });
    return {
      synced, newCount, drifted, stale, blocked, blockedSheets: blockedSheets.size,
    };
  }

  renderDataSourceCard(source) {
    const summary = this.getSyncSummary(source);
    const sheetCount = source.data ? Object.keys(source.data).length : 0;

    return html`
      <div class="data-source-card ${source.status === SHEET_STATES.OUT_OF_SYNC ? 'needs-sync' : ''}">
        <div class="card-header">
          <div class="card-title">
            <h3>${source.name}</h3>
            <a class="file-link" href="${EDIT_PATH}${DATA_PATH.slice(1)}${source.path.replace('.json', '')}" target="_blank">${source.path}</a>
          </div>
          ${this.renderStatusBadge(source.status)}
        </div>
        <div class="card-body">
          ${source.error ? html`<div class="error-message">${source.error}</div>` : html`
            <div class="card-stats">
              <div class="stat-group"><span class="stat-value">${source.liveCount || 0}</span><span class="stat-label">Live</span></div>
              <div class="stat-group"><span class="stat-value">${source.storedCount || 0}</span><span class="stat-label">Stored</span></div>
              <div class="stat-group"><span class="stat-value">${sheetCount}</span><span class="stat-label">Sheets</span></div>
            </div>
            ${summary ? html`
              <div class="card-chips">
                ${summary.synced > 0 ? html`<span class="sync-chip synced">${summary.synced} synced</span>` : nothing}
                ${summary.newCount > 0 ? html`<span class="sync-chip new">${summary.newCount} new</span>` : nothing}
                ${summary.drifted > 0 ? html`<span class="sync-chip drifted">${summary.drifted} drifted</span>` : nothing}
                ${summary.stale > 0 ? html`<span class="sync-chip stale">${summary.stale} stale</span>` : nothing}
                ${summary.blockedSheets > 0 ? html`<span class="sync-chip blocked">${summary.blockedSheets} blocked</span>` : nothing}
              </div>
            ` : nothing}
          `}
        </div>
        <div class="card-actions">
          <sl-button variant="primary" size="small" ?disabled=${source.status === SHEET_STATES.LOADING} @click=${() => this.handleEdit(source.id)}>Manage</sl-button>
          <sl-button variant="text" size="small" ?disabled=${source.status === SHEET_STATES.LOADING} @click=${() => this.loadDataSource(source.id)}>↻ Refresh</sl-button>
        </div>
      </div>
    `;
  }

  renderEditorHeader(source) {
    return html`
      <div class="editor-header">
        <div class="header-left">
          <div class="header-title-row">
            <h2>Manage ${source.name}</h2>
            ${this.renderStatusBadge(source.status)}
          </div>
          <p class="editor-description">${Object.keys(source.data).length} sheet(s) • ${this.pendingChanges.size} pending change(s)</p>
        </div>
        <div class="header-right">
          <sl-button size="small" @click=${() => window.open(`${EDIT_PATH}${DATA_PATH.slice(1)}${source.path.replace('.json', '')}`, '_blank')}>📄 View Data</sl-button>
          <sl-button size="small" @click=${() => window.open(`${EDIT_PATH}${DATA_PATH.slice(1)}${source.path.replace('.json', '-meta')}`, '_blank')}>📋 View Meta</sl-button>
          <sl-button size="small" variant="primary" ?disabled=${this.isSaving || this.pendingChanges.size === 0} @click=${this.handleSave}>${this.isSaving ? 'Saving...' : 'Save'}</sl-button>
          <button class="close-btn" @click=${this.handleCancelEdit}>✕</button>
        </div>
      </div>
    `;
  }

  getSheetStatusClass(items, isBlocked) {
    if (isBlocked) return 'blocked';
    if (items.some((i) => [ITEM_STATES.NEW, ITEM_STATES.DRIFTED, ITEM_STATES.STALE].includes(i.state))) return 'needs-attention';
    if (items.some((i) => i.state === ITEM_STATES.BLOCKED)) return 'has-edits';
    return 'synced';
  }

  renderSheetTabs(source, sheets) {
    const showScroll = sheets.length > 5;
    return html`
      <div class="sheet-tabs-container ${showScroll ? 'has-scroll' : ''}">
        ${showScroll ? html`<button class="tab-scroll-btn left" @click=${() => this.shadowRoot?.querySelector('.sheet-tabs')?.scrollBy({ left: -200, behavior: 'smooth' })}>‹</button>` : nothing}
        <div class="sheet-tabs">
          ${sheets.map((sheet) => {
    const items = this.mergedItems.filter((m) => m.sheetName === sheet);
    return html`<button class="sheet-tab ${this.activeSheet === sheet ? 'active' : ''} ${this.getSheetStatusClass(items, this.isSheetBlocked(sheet))}" @click=${() => this.handleSheetChange(sheet)}>${sheet}<span class="tab-count">${items.length}</span></button>`;
  })}
        </div>
        ${showScroll ? html`<button class="tab-scroll-btn right" @click=${() => this.shadowRoot?.querySelector('.sheet-tabs')?.scrollBy({ left: 200, behavior: 'smooth' })}>›</button>` : nothing}
      </div>
    `;
  }

  renderToolbar(stats, hasSheets) {
    const isBlocked = hasSheets && this.isSheetBlocked(this.activeSheet);
    return html`
      <div class="editor-toolbar">
        <div class="toolbar-left">
          <strong>${this.activeSheet || 'All Items'}</strong>
          ${stats ? html`
            <div class="toolbar-stats">
              <span class="stat-chip synced ${stats.synced === 0 ? 'zero' : ''}">${stats.synced} synced</span>
              <span class="stat-chip drifted ${stats.drifted === 0 ? 'zero' : ''}">${stats.drifted} drifted</span>
              <span class="stat-chip new ${stats.new === 0 ? 'zero' : ''}">${stats.new} new</span>
              <span class="stat-chip stale ${stats.stale === 0 ? 'zero' : ''}">${stats.stale} stale</span>
              <span class="stat-chip blocked ${stats.blocked === 0 ? 'zero' : ''}">${stats.blocked} blocked</span>
            </div>
          ` : nothing}
        </div>
        <div class="toolbar-right">
          ${hasSheets ? html`
            <sl-button size="small" variant="primary" ?disabled=${isBlocked} @click=${this.handleSyncSheet}>⚡ Sync Sheet</sl-button>
            <sl-button size="small" variant="${isBlocked ? 'success' : 'default'}" @click=${this.handleToggleSheetBlock}>${isBlocked ? '🔓 Unblock' : '🔒 Block'}</sl-button>
          ` : html`<sl-button size="small" variant="primary" @click=${this.handleSyncAll}>⚡ Sync All</sl-button>`}
        </div>
      </div>
    `;
  }

  renderItemRow(item) {
    const isSheetBlocked = this.isSheetBlocked(item.sheetName);
    const displayState = isSheetBlocked ? ITEM_STATES.BLOCKED : item.state;
    const canSync = [ITEM_STATES.DRIFTED, ITEM_STATES.NEW].includes(item.state);

    return html`
      <div class="item-row ${displayState}">
        <div class="item-col item-state"><span class="state-badge ${displayState}">${ITEM_STATE_LABELS[displayState]}</span></div>
        <div class="item-col item-value">${item.currentValue}${item.live && item.live.value !== item.currentValue ? html`<span class="live-hint">Live: ${item.live.value}</span>` : nothing}</div>
        <div class="item-col item-label">${item.currentLabel}${item.live && item.live.label !== item.currentLabel ? html`<span class="live-hint">Live: ${item.live.label}</span>` : nothing}</div>
        <div class="item-col item-actions">
          <button class="action-btn sync-btn" ?disabled=${!canSync || isSheetBlocked} @click=${() => this.handleSyncItem(item.itemKey)}>Sync</button>
          <button class="action-btn ${item.blocked ? 'unblock-btn' : 'block-btn'}" ?disabled=${isSheetBlocked} @click=${() => this.handleToggleBlock(item.itemKey)}>${item.blocked ? 'Unblock' : 'Block'}</button>
          ${item.state === ITEM_STATES.STALE ? html`<button class="action-btn delete-btn" ?disabled=${isSheetBlocked} @click=${() => this.handleRemoveItem(item.itemKey)}>Delete</button>` : nothing}
        </div>
      </div>
    `;
  }

  renderItemList(items) {
    const isBlocked = this.isSheetBlocked(this.activeSheet);
    if (items.length === 0) return html`<div class="empty-state"><div class="empty-icon">📝</div><h3>No items in this sheet</h3></div>`;

    return html`
      ${isBlocked ? html`<div class="blocked-sheet-banner">🔒 This sheet is locked and will not be synced</div>` : nothing}
      <div class="item-list-container">
        <div class="item-header">
          <div class="item-col item-state">Status</div>
          <div class="item-col item-value">Value</div>
          <div class="item-col item-label">Label</div>
          <div class="item-col item-actions">Actions</div>
        </div>
        <div class="item-list">${items.map((item) => this.renderItemRow(item))}</div>
      </div>
    `;
  }

  renderEditor() {
    const source = this.dataSources.find((s) => s.id === this.editingSource);
    if (!source) return nothing;

    const sheets = Object.keys(source.data);
    const items = this.getCurrentSheetItems();
    const stats = computeSheetStats(items, this.isSheetBlocked(this.activeSheet));

    return html`
      <div class="editor-overlay">
        <div class="editor-container">
          ${this.renderEditorHeader(source)}
          ${sheets.length > 0 ? this.renderSheetTabs(source, sheets) : nothing}
          ${this.renderToolbar(stats, sheets.length > 0)}
          <div class="editor-body">${this.renderItemList(items)}</div>
        </div>
      </div>
    `;
  }

  renderStatusBanner() {
    const isLoading = this.dataSources.some((s) => s.status === SHEET_STATES.LOADING);
    const outOfSync = this.dataSources.filter((s) => s.status === SHEET_STATES.OUT_OF_SYNC || s.status === SHEET_STATES.STORED_NOT_FOUND).length;

    if (isLoading) return html`<div class="status-banner loading">Loading data sources...</div>`;
    if (outOfSync > 0) return html`<div class="status-banner warning">${outOfSync} data source${outOfSync > 1 ? 's need' : ' needs'} sync</div>`;
    return html`<div class="status-banner success">✓ All data sources synced</div>`;
  }

  render() {
    return html`
      <div class="admin-container">
        <div class="admin-header">
          <h1>Page Builder Admin</h1>
          <p class="subtitle">Manage data sources for the Page Builder</p>
        </div>
        ${this.renderStatusBanner()}
        <div class="data-sources-grid">${this.dataSources.map((s) => this.renderDataSourceCard(s))}</div>
        ${this.editingSource ? this.renderEditor() : nothing}
      </div>
    `;
  }
}

if (!customElements.get('da-page-builder-admin')) customElements.define('da-page-builder-admin', PageBuilderAdmin);
