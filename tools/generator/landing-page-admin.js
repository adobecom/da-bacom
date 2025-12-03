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
  getCaasCollections,
  fetchPageOptions,
} from './data-sources.js';

// ============================================================================
// UTILITY FUNCTIONS - Data Structure Helpers
// ============================================================================

/**
 * Compare two items for equality (value and label)
 * Works with the new data structure: { value, label }
 */
function itemsEqual(item1, item2) {
  if (!item1 || !item2) return false;
  return item1.value === item2.value && item1.label === item2.label;
}

/**
 * Get item count from processed data structure
 * data[sheet][value] = { live, stored, metadata }
 */
function getItemCount(data) {
  if (!data || typeof data !== 'object') return 0;

  let count = 0;
  Object.values(data).forEach((sheet) => {
    if (sheet && typeof sheet === 'object') {
      count += Object.keys(sheet).length;
    }
  });
  return count;
}

/**
 * Get live item count from processed data structure
 */
function getLiveCount(data) {
  if (!data || typeof data !== 'object') return 0;

  let count = 0;
  Object.values(data).forEach((sheet) => {
    if (sheet && typeof sheet === 'object') {
      Object.values(sheet).forEach((item) => {
        if (item.live) count += 1;
      });
    }
  });
  return count;
}

/**
 * Get stored item count from processed data structure
 */
function getStoredCount(data) {
  if (!data || typeof data !== 'object') return 0;

  let count = 0;
  Object.values(data).forEach((sheet) => {
    if (sheet && typeof sheet === 'object') {
      Object.values(sheet).forEach((item) => {
        if (item.stored) count += 1;
      });
    }
  });
  return count;
}

await DA_SDK;

const style = await getStyle(import.meta.url.split('?')[0]);

const DATA_PATH = '/tools/page-builder/landing-page/data/';
const EDIT_PATH = 'https://da.live/sheet#/adobecom/da-bacom/';
const TOAST_DEFAULT_TIMEOUT = 5000;
const DEBOUNCE_DELAY = 1000; // Auto-save delay in milliseconds
const ITEM_STATES = {
  SYNCED: 'synced',
  DRIFTED: 'drifted',
  NEW: 'new',
  BLOCKED: 'blocked',
  MANUAL: 'manual',
  STALE: 'stale',
  MODIFIED: 'modified',
  UNKNOWN: 'unknown',
};
const SHEET_STATES = {
  LOADING: 'loading',
  STORED_NOT_FOUND: 'stored-not-found',
  LIVE_NOT_FOUND: 'live-not-found',
  ERROR: 'error',
  OUT_OF_SYNC: 'out-of-sync',
  SYNCED: 'synced',
  SYNCED_WITH_MODIFIED: 'synced-with-modified',
};
const METADATA_SHEET = 'settings';
const DATA_SOURCES = [
  {
    name: 'Marketo POI',
    id: 'marketo-poi',
    path: 'marketo-poi-options.json',
    fetchFn: fetchMarketoPOIOptions,
  },
  {
    name: 'Marketo Template Rules',
    id: 'marketo-template-rules',
    path: 'marketo-template-rules.json',
    fetchFn: fetchMarketoTemplateRules,
  },
  {
    name: 'Caas Collections',
    id: 'caas-collections',
    path: 'caas-collections.json',
    fetchFn: getCaasCollections,
  },
  {
    name: 'Page Options',
    id: 'page-options',
    path: 'page-options.json',
    fetchFn: fetchPageOptions,
  },
];

class LandingPageAdmin extends LitElement {
  static styles = style;

  static get properties() {
    return {
      dataSources: { type: Array },
      editingSource: { type: String },
      activeSheet: { type: String },
      mergedItems: { type: Array },
      isSaving: { type: Boolean },
      hasUnsavedChanges: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.dataSources = DATA_SOURCES.map((source) => ({
      ...source,
      status: SHEET_STATES.LOADING,
      error: null,
    }));
    this.editingSource = null;
    this.activeSheet = null;
    this.mergedItems = [];
    this.blockedSheets = new Set();
    this.isSaving = false;
    this.hasUnsavedChanges = false;
    this.saveDebounceTimer = null;
  }

  async connectedCallback() {
    super.connectedCallback();
    document.addEventListener('show-toast', this.handleToast);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    const token = await initIms();
    this.token = token?.accessToken?.token;
    await this.loadAllDataSources();
  }

  disconnectedCallback() {
    document.removeEventListener('show-toast', this.handleToast);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    super.disconnectedCallback();
  }

  handleBeforeUnload = (e) => {
    if (this.hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
    return undefined;
  };

  handleToast = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const detail = e.detail || {};
    const toast = createToast(detail.message, detail.type, detail.timeout);
    document.body.appendChild(toast);
  };

  /**
   * Normalize item to ensure consistent field names
   * Handles: value/label (standard), Key/Value (alternate capitalization)
   * All data sources should normalize to { value, label } at the source
   */
  normalizeItem(item) {
    if (!item) return null;

    // Standard fields with fallback for capitalization variants
    const value = item.value || item.Value;
    const label = item.label || item.Label;

    return (value && label) ? { value, label } : null;
  }

  /**
   * Maps a single sheet's data into the new structure
   * Returns: { [value]: { live, stored, metadata } }
   */
  mapSheet(liveData = [], storedData = [], metadata = []) {
    const data = {};
    const metadataMap = new Map(); // Maps modifiedValue -> original value

    // Index all live items by their value (normalize first)
    liveData.forEach((item) => {
      const normalized = this.normalizeItem(item);
      if (!normalized) return;

      const { value } = normalized;
      if (!data[value]) data[value] = {};
      data[value].live = normalized;
    });

    // Index metadata and build reverse lookup for modified values
    metadata.forEach((meta) => {
      const { value, modifiedValue } = meta;
      if (!value) return;

      // Ensure entry exists
      if (!data[value]) data[value] = {};
      data[value].metadata = meta;

      // If there's a modifiedValue, create reverse mapping
      if (modifiedValue) {
        metadataMap.set(modifiedValue, value);
      }
    });

    // Index stored items, mapping them to original live values if modified
    storedData.forEach((item) => {
      const normalized = this.normalizeItem(item);
      if (!normalized) return;

      const { value } = normalized;

      // Check if this stored value is a modified version of a live value
      const originalValue = metadataMap.get(value) || value;

      if (!data[originalValue]) data[originalValue] = {};
      data[originalValue].stored = normalized;
    });

    return data;
  }

  /**
   * Analyze sheet state and return comprehensive status object
   * Returns detailed state including counts and sync status
   */
  getSheetState(sheetName, sheetData, liveSheet, storedSheet, metadata) {
    const state = {
      status: SHEET_STATES.OUT_OF_SYNC,
      blocked: false,
      itemCounts: {
        total: 0,
        live: 0,
        stored: 0,
        synced: 0,
        drifted: 0,
        new: 0,
        stale: 0,
        modified: 0,
        blocked: 0,
      },
    };

    // Check if sheet is blocked
    if (metadata?.[METADATA_SHEET]) {
      const meta = metadata[METADATA_SHEET].find((m) => m.sheetName === sheetName);
      if (meta?.blocked) {
        state.blocked = true;
        state.status = SHEET_STATES.BLOCKED;
      }
    }

    // Check if data exists
    if (!liveSheet && !storedSheet) {
      state.status = SHEET_STATES.ERROR;
      return state;
    }

    if (!liveSheet) {
      state.status = SHEET_STATES.LIVE_NOT_FOUND;
      return state;
    }

    if (!storedSheet) {
      state.status = SHEET_STATES.STORED_NOT_FOUND;
      return state;
    }

    // Analyze items in the sheet
    let allSynced = true;
    let hasModified = false;
    let hasOutOfSync = false; // Track items that are truly out of sync (not just modified)

    Object.values(sheetData).forEach((item) => {
      state.itemCounts.total += 1;

      const itemState = this.getItemState(item);

      // Count by state
      if (itemState === ITEM_STATES.SYNCED) state.itemCounts.synced += 1;
      else if (itemState === ITEM_STATES.DRIFTED) state.itemCounts.drifted += 1;
      else if (itemState === ITEM_STATES.NEW) state.itemCounts.new += 1;
      else if (itemState === ITEM_STATES.STALE) state.itemCounts.stale += 1;
      else if (itemState === ITEM_STATES.MODIFIED) state.itemCounts.modified += 1;
      else if (itemState === ITEM_STATES.BLOCKED) state.itemCounts.blocked += 1;

      // Count by source
      if (item.live) state.itemCounts.live += 1;
      if (item.stored) state.itemCounts.stored += 1;

      // Track sync status - modified items don't count as out of sync
      if (itemState !== ITEM_STATES.SYNCED && itemState !== ITEM_STATES.MODIFIED) {
        allSynced = false;
      }

      // Track if we have items that are truly out of sync (drifted, new, stale)
      if (itemState === ITEM_STATES.DRIFTED || itemState === ITEM_STATES.NEW || itemState === ITEM_STATES.STALE) {
        hasOutOfSync = true;
      }

      if (itemState === ITEM_STATES.MODIFIED) hasModified = true;
    });

    // Determine overall sheet status
    // Modified items are intentional changes, not out of sync
    if (allSynced && !hasModified) {
      state.status = SHEET_STATES.SYNCED;
    } else if (hasModified && !hasOutOfSync) {
      state.status = SHEET_STATES.SYNCED_WITH_MODIFIED;
    } else if (hasOutOfSync) {
      state.status = SHEET_STATES.OUT_OF_SYNC;
    } else {
      state.status = SHEET_STATES.SYNCED;
    }

    return state;
  }

  /**
   * Process all data sources into the new structure
   * da-utils already filters out : keys, so we can safely use Object.keys
   */
  processData(liveData, storedData, metadata) {
    const data = {};
    const status = {};

    // Get all unique sheet names (da-utils getSheets already removed : keys)
    const liveSheets = liveData ? Object.keys(liveData) : [];
    const storedSheets = storedData ? Object.keys(storedData) : [];
    const allSheets = [...new Set([...liveSheets, ...storedSheets])];

    allSheets.forEach((sheetName) => {
      const liveSheet = liveData?.[sheetName];
      const storedSheet = storedData?.[sheetName];
      const sheetMetadata = metadata?.[sheetName];

      // Map the sheet data
      data[sheetName] = this.mapSheet(liveSheet, storedSheet, sheetMetadata);

      // Get comprehensive sheet state
      status[sheetName] = this.getSheetState(
        sheetName,
        data[sheetName],
        liveSheet,
        storedSheet,
        metadata,
      );
    });

    return { data, status };
  }

  /**
   * Load and process a data source
   * Fetches live data, stored data, and metadata, then processes into new structure
   */
  async loadDataSource(sourceId) {
    const index = this.dataSources.findIndex((s) => s.id === sourceId);
    if (index === -1) return;

    const source = this.dataSources[index];
    const path = `${DATA_PATH}${source.path}`;
    const metadataPath = path.replace('.json', '-meta.json');

    this.dataSources[index].status = SHEET_STATES.LOADING;
    this.requestUpdate();

    try {
      const { fetchFn } = source;

      // Fetch all data sources
      const metadata = await getSheets(metadataPath).catch(() => ({}));
      const storedData = await getSheets(path).catch(() => null);
      const liveData = await fetchFn(this.token);

      // Process data into new structure
      const { data, status: sheetStatus } = this.processData(liveData, storedData, metadata);

      // Calculate overall counts
      const liveCount = getLiveCount(data);
      const storedCount = getStoredCount(data);
      const totalCount = getItemCount(data);

      // Determine overall data source status
      // Modified items should not count as out of sync
      let overallStatus = SHEET_STATES.SYNCED;

      if (!liveData) {
        overallStatus = SHEET_STATES.LIVE_NOT_FOUND;
      } else if (!storedData) {
        overallStatus = SHEET_STATES.STORED_NOT_FOUND;
      } else {
        // Check if any sheets are truly out of sync (not just modified)
        const hasOutOfSync = Object.values(sheetStatus).some(
          (s) => s.status === SHEET_STATES.OUT_OF_SYNC,
        );
        const hasModified = Object.values(sheetStatus).some(
          (s) => s.status === SHEET_STATES.SYNCED_WITH_MODIFIED,
        );

        if (hasOutOfSync) {
          overallStatus = SHEET_STATES.OUT_OF_SYNC;
        } else if (hasModified) {
          overallStatus = SHEET_STATES.SYNCED_WITH_MODIFIED;
        }
      }

      this.dataSources[index] = {
        ...source,
        status: overallStatus,
        data,
        sheetStatus,
        liveCount,
        storedCount,
        totalCount,
        liveData,
        storedData,
        metadata,
        error: null,
      };
    } catch (error) {
      console.error(`Error loading ${source.name}:`, error);
      this.dataSources[index] = {
        ...source,
        status: SHEET_STATES.ERROR,
        error: error.message,
      };
    }

    this.requestUpdate();
  }

  async loadAllDataSources() {
    await Promise.all(this.dataSources.map(async (source) => {
      await this.loadDataSource(source.id);
    }));
  }

  /**
   * Determine the state of an individual item
   * Uses the simplified itemsEqual function for comparison
   */
  getItemState({ live, stored, metadata }) {
    const hasLive = !!live;
    const hasStored = !!stored;
    const isBlocked = metadata?.blocked || false;
    const isEdited = metadata?.edited || false;

    // Blocked state takes precedence
    if (isBlocked) {
      return ITEM_STATES.BLOCKED;
    }

    if (hasLive) {
      if (hasStored) {
        // Use simplified itemsEqual (checks both value and label)
        const matchesExactly = itemsEqual(live, stored);
        if (matchesExactly) {
          return ITEM_STATES.SYNCED;
        }
        if (isEdited) {
          return ITEM_STATES.MODIFIED;
        }
        return ITEM_STATES.DRIFTED;
      }
      return ITEM_STATES.NEW;
    }

    if (hasStored) {
      if (isEdited) {
        return ITEM_STATES.MANUAL;
      }
      return ITEM_STATES.STALE;
    }

    return ITEM_STATES.UNKNOWN;
  }

  // ============================================================================
  // EDITOR HELPERS - Data transformation and management
  // ============================================================================

  /**
   * Check if an item should be synced
   * Returns true for NEW or DRIFTED items that have live data and aren't blocked
   */
  isSyncableItem(item) {
    if (!item.live || item.blocked) return false;
    return item.state === ITEM_STATES.NEW || item.state === ITEM_STATES.DRIFTED;
  }

  /**
   * Transform processed data into flat array for UI rendering
   * Converts: data[sheet][value] = { live, stored, metadata }
   * Into: [{ currentValue, currentLabel, state, sheetName, ... }]
   */
  buildMergedItems(source) {
    const items = [];
    const { data } = source;

    Object.entries(data).forEach(([sheetName, sheetData]) => {
      Object.entries(sheetData).forEach(([key, item]) => {
        const state = this.getItemState(item);
        const currentValue = item.stored?.value || item.live?.value || '';
        const currentLabel = item.stored?.label || item.live?.label || '';

        items.push({
          // Display values (what user sees/edits)
          currentValue,
          currentLabel,
          // Item state
          state,
          // Tracking
          itemKey: key,
          sheetName,
          // Source data
          live: item.live,
          stored: item.stored,
          metadata: item.metadata,
          // Flags
          blocked: item.metadata?.blocked || false,
          edited: item.metadata?.edited || false,
          lastSynced: item.metadata?.lastSynced || '',
        });
      });
    });

    return items;
  }

  /**
   * Get items for currently active sheet
   */
  getCurrentSheetItems() {
    if (!this.activeSheet) {
      return this.mergedItems.filter((m) => !m.sheetName);
    }
    return this.mergedItems.filter((m) => m.sheetName === this.activeSheet);
  }

  /**
   * Check if a sheet is blocked
   */
  isSheetBlocked(sheetName) {
    return this.blockedSheets.has(sheetName);
  }

  /**
   * Calculate statistics for a set of items
   */
  computeSheetStats(items) {
    return {
      synced: items.filter((i) => i.state === ITEM_STATES.SYNCED).length,
      drifted: items.filter((i) => i.state === ITEM_STATES.DRIFTED).length,
      new: items.filter((i) => i.state === ITEM_STATES.NEW).length,
      blocked: items.filter((i) => i.state === ITEM_STATES.BLOCKED).length,
      manual: items.filter((i) => i.state === ITEM_STATES.MANUAL).length,
      stale: items.filter((i) => i.state === ITEM_STATES.STALE).length,
      modified: items.filter((i) => i.state === ITEM_STATES.MODIFIED).length,
    };
  }

  // ============================================================================
  // EDITOR EVENT HANDLERS
  // ============================================================================

  /**
   * Open editor for a data source
   */
  handleEdit(sourceId) {
    const source = this.dataSources.find((s) => s.id === sourceId);
    if (!source) return;

    this.editingSource = sourceId;
    this.mergedItems = this.buildMergedItems(source);

    // Load blocked sheets from metadata
    this.blockedSheets = new Set();
    if (source.metadata?.[METADATA_SHEET]) {
      source.metadata[METADATA_SHEET].forEach((meta) => {
        if (meta.blocked && meta.sheetName) {
          this.blockedSheets.add(meta.sheetName);
        }
      });
    }

    // Set active sheet (first sheet or null for single-sheet)
    const sheets = Object.keys(source.data);
    this.activeSheet = sheets.length > 0 ? sheets[0] : null;

    this.requestUpdate();
  }

  /**
   * Close editor
   */
  handleCancelEdit() {
    if (this.hasUnsavedChanges) {
      // eslint-disable-next-line no-alert
      const shouldClose = window.confirm('You have unsaved changes. Discard them?');
      if (!shouldClose) return;
    }

    this.editingSource = null;
    this.mergedItems = [];
    this.activeSheet = null;
    this.blockedSheets = new Set();
    this.hasUnsavedChanges = false;
    this.requestUpdate();
  }

  /**
   * Switch to a different sheet
   */
  handleSheetChange(sheetName) {
    this.activeSheet = sheetName;
    this.requestUpdate();
  }

  /**
   * Handle field input (value or label editing)
   */
  handleFieldInput(itemKey, field, value) {
    const item = this.mergedItems.find((m) => m.itemKey === itemKey);
    if (!item) return;

    // Update value
    if (field === 'value') item.currentValue = value;
    else item.currentLabel = value;

    // Mark as changed
    this.hasUnsavedChanges = true;

    // Update metadata edited flag based on whether item differs from live
    if (!item.metadata) item.metadata = {};

    const currentData = { value: item.currentValue, label: item.currentLabel };

    if (item.live) {
      // Item has live data - check if it's been modified
      const matchesLive = itemsEqual(item.live, currentData);
      if (matchesLive) {
        // Matches live exactly - not edited
        item.metadata.edited = false;
        item.edited = false;
      } else {
        // Differs from live - edited
        item.metadata.edited = true;
        item.edited = true;
      }
    } else {
      // No live data - this is a manual item, always edited
      item.metadata.edited = true;
      item.edited = true;
    }

    // Recalculate state
    item.state = this.getItemState({
      live: item.live,
      stored: currentData,
      metadata: item.metadata,
    });

    this.requestUpdate();
    this.debouncedSave();
  }

  /**
   * Handle field blur (save immediately)
   */
  handleFieldBlur() {
    this.saveImmediately();
  }

  /**
   * Debounced save - saves after typing stops
   */
  debouncedSave() {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    this.saveDebounceTimer = setTimeout(() => {
      this.saveChanges();
      this.saveDebounceTimer = null;
    }, DEBOUNCE_DELAY);
  }

  /**
   * Save immediately (called on blur or explicit actions)
   */
  saveImmediately() {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
    if (this.hasUnsavedChanges) {
      this.saveChanges();
    }
  }

  /**
   * Sync/revert item to live values
   */
  handleSyncItem(itemKey) {
    const item = this.mergedItems.find((m) => m.itemKey === itemKey);
    if (!item || !item.live) return;

    // Update current values to match live
    item.currentValue = item.live.value;
    item.currentLabel = item.live.label;

    // Clear edited flag since we're syncing to live
    if (item.metadata) {
      item.metadata.edited = false;
    }
    item.edited = false;

    // Recalculate state - should now be SYNCED
    item.state = this.getItemState({
      live: item.live,
      stored: { value: item.currentValue, label: item.currentLabel },
      metadata: item.metadata,
    });

    // Mark as having unsaved changes and save
    this.hasUnsavedChanges = true;
    this.requestUpdate();
    this.saveImmediately();
  }

  /**
   * Toggle item blocked state
   */
  handleToggleBlock(itemKey) {
    const item = this.mergedItems.find((m) => m.itemKey === itemKey);
    if (!item) return;

    // Toggle blocked state
    item.blocked = !item.blocked;

    // Update metadata
    if (!item.metadata) item.metadata = {};
    item.metadata.blocked = item.blocked;

    // Recalculate state - blocked takes precedence
    item.state = this.getItemState({
      live: item.live,
      stored: { value: item.currentValue, label: item.currentLabel },
      metadata: item.metadata,
    });

    this.hasUnsavedChanges = true;
    this.requestUpdate();
    this.saveImmediately();
  }

  /**
   * Remove item from list
   */
  handleRemoveItem(itemKey) {
    // Filter out the item
    this.mergedItems = this.mergedItems.filter((m) => m.itemKey !== itemKey);

    this.hasUnsavedChanges = true;
    this.requestUpdate();
    this.saveImmediately();
  }

  /**
   * Sync all items in current sheet
   * Syncs new/drifted items and removes stale items
   * Does NOT sync modified items (those are intentional user edits)
   */
  handleSyncSheet() {
    const currentItems = this.getCurrentSheetItems();

    // Find items to sync (excludes MODIFIED - those are intentional edits)
    const itemsToSync = currentItems.filter((item) => this.isSyncableItem(item));

    // Find stale items to remove (orphaned from live, not manual)
    const staleItems = currentItems.filter((item) => item.state === ITEM_STATES.STALE);

    if (itemsToSync.length === 0 && staleItems.length === 0) {
      return; // Nothing to sync or remove
    }

    // Sync each item to live values
    itemsToSync.forEach((item) => {
      item.currentValue = item.live.value;
      item.currentLabel = item.live.label;

      // Clear edited flag
      if (item.metadata) {
        item.metadata.edited = false;
      }
      item.edited = false;

      // Recalculate state
      item.state = this.getItemState({
        live: item.live,
        stored: { value: item.currentValue, label: item.currentLabel },
        metadata: item.metadata,
      });
    });

    // Remove stale items (not in live anymore)
    if (staleItems.length > 0) {
      const staleKeys = new Set(staleItems.map((item) => item.itemKey));
      this.mergedItems = this.mergedItems.filter((item) => !staleKeys.has(item.itemKey));
    }

    this.hasUnsavedChanges = true;
    this.requestUpdate();
    this.saveImmediately();
  }

  /**
   * Toggle sheet blocked state
   */
  handleToggleSheetBlock() {
    if (!this.activeSheet) return;

    const wasBlocked = this.blockedSheets.has(this.activeSheet);

    if (wasBlocked) {
      this.blockedSheets.delete(this.activeSheet);
    } else {
      this.blockedSheets.add(this.activeSheet);
    }

    this.hasUnsavedChanges = true;
    this.requestUpdate();
    this.saveImmediately();
  }

  /**
   * Sync all items
   * Syncs new/drifted items and removes stale items
   * Does NOT sync modified items (those are intentional user edits)
   */
  handleSyncAll() {
    // Find items to sync (excludes MODIFIED - those are intentional edits)
    const itemsToSync = this.mergedItems.filter((item) => this.isSyncableItem(item));

    // Find stale items to remove (orphaned from live, not manual)
    const staleItems = this.mergedItems.filter((item) => item.state === ITEM_STATES.STALE);

    if (itemsToSync.length === 0 && staleItems.length === 0) {
      return; // Nothing to sync or remove
    }

    // Sync each item to live values
    itemsToSync.forEach((item) => {
      item.currentValue = item.live.value;
      item.currentLabel = item.live.label;

      // Clear edited flag
      if (item.metadata) {
        item.metadata.edited = false;
      }
      item.edited = false;

      // Recalculate state
      item.state = this.getItemState({
        live: item.live,
        stored: { value: item.currentValue, label: item.currentLabel },
        metadata: item.metadata,
      });
    });

    // Remove stale items (not in live anymore)
    if (staleItems.length > 0) {
      const staleKeys = new Set(staleItems.map((item) => item.itemKey));
      this.mergedItems = this.mergedItems.filter((item) => !staleKeys.has(item.itemKey));
    }

    this.hasUnsavedChanges = true;
    this.requestUpdate();
    this.saveImmediately();
  }

  /**
   * Add new manual item
   */
  handleAddItem() {
    const timestamp = Date.now();
    const newItem = {
      currentValue: '',
      currentLabel: '',
      state: ITEM_STATES.MANUAL,
      itemKey: `${this.activeSheet || 'item'}-new-${timestamp}`,
      sheetName: this.activeSheet,
      live: null,
      stored: null,
      metadata: { edited: true },
      blocked: false,
      edited: true,
      lastSynced: '',
    };

    // Add to the beginning of the list for visibility
    this.mergedItems.unshift(newItem);

    this.hasUnsavedChanges = true;
    this.requestUpdate();
    // No save needed - item is empty
  }

  // ============================================================================
  // SAVE OPERATIONS
  // ============================================================================

  /**
   * Build final data structure for saving
   * Transforms mergedItems back into sheet format
   */
  buildFinalData(source) {
    const sheets = Object.keys(source.data);
    const isMultiSheet = sheets.length > 1;

    if (isMultiSheet) {
      const result = {};

      // Preserve metadata keys from original data
      Object.keys(source.liveData).forEach((key) => {
        if (key.startsWith(':')) {
          result[key] = source.liveData[key];
        }
      });

      // Process ALL sheets to preserve multi-sheet structure
      sheets.forEach((sheetName) => {
        // Check if sheet is blocked
        if (this.isSheetBlocked(sheetName)) {
          // Keep stored data unchanged for blocked sheets
          const storedSheetData = source.storedData?.[sheetName];
          if (storedSheetData && storedSheetData.length > 0) {
            result[sheetName] = storedSheetData;
          } else {
            // Even blocked sheets should exist (empty array if no data)
            result[sheetName] = [];
          }
          return;
        }

        // Get items for this sheet
        const sheetItems = this.mergedItems.filter((m) => m.sheetName === sheetName);

        // Filter and transform items
        const finalItems = sheetItems
          .filter((item) => {
            // Exclude blocked items
            if (item.blocked) return false;

            // Exclude NEW items (they haven't been synced yet)
            if (item.state === ITEM_STATES.NEW) return false;

            // Exclude items with empty values
            if (!item.currentValue || !item.currentValue.trim()) return false;

            return true;
          })
          .map((item) => ({
            value: item.currentValue.trim(),
            label: item.currentLabel.trim(),
          }));

        // Always include the sheet, even if empty (preserve multi-sheet structure)
        result[sheetName] = finalItems;
      });

      return result;
    }

    // Single sheet format (no sheet names)
    return this.mergedItems
      .filter((item) => {
        if (item.blocked) return false;
        if (item.state === ITEM_STATES.NEW) return false;
        if (!item.currentValue || !item.currentValue.trim()) return false;
        return true;
      })
      .map((item) => ({
        value: item.currentValue.trim(),
        label: item.currentLabel.trim(),
      }));
  }

  /**
   * Build metadata structure for saving
   * Tracks item states, modifications, and blocked sheets
   */
  buildFinalMetadata(source) {
    const metadata = { [METADATA_SHEET]: [] };
    const isMultiSheet = Object.keys(source.data).length > 1;

    // Add blocked sheets to settings
    this.blockedSheets.forEach((sheetName) => {
      metadata[METADATA_SHEET].push({
        sheetName,
        blocked: true,
        lastUpdated: new Date().toISOString(),
      });
    });

    // Process each item
    this.mergedItems
      .filter((item) => item.currentValue && item.currentValue.trim())
      .forEach((item) => {
        const { sheetName, currentValue, state, live } = item;
        let { lastSynced } = item;

        // Update lastSynced if item is now synced or modified
        if (state === ITEM_STATES.SYNCED || state === ITEM_STATES.MODIFIED) {
          lastSynced = new Date().toISOString();
        }

        // Determine sheet name
        // For multi-sheet sources, sheetName should always be set
        // For single-sheet sources, use 'data' as fallback
        const sheet = isMultiSheet ? sheetName : (sheetName || 'data');

        if (!sheet) {
          console.warn('Item missing sheetName in multi-sheet source:', item);
          return;
        }

        if (!metadata[sheet]) {
          metadata[sheet] = [];
        }

        // Determine the original value and modified value
        let value = currentValue;
        let modifiedValue = '';

        if (live) {
          // If there's live data, the original value is from live
          value = live.value;
          // If current differs from live, store as modifiedValue
          if (live.value !== currentValue) {
            modifiedValue = currentValue;
          }
        }

        const metadataEntry = {
          value,
          modifiedValue,
          blocked: item.blocked,
          edited: item.edited,
          lastSynced,
        };

        metadata[sheet].push(metadataEntry);
      });

    return metadata;
  }

  /**
   * Save changes to DA
   */
  async saveChanges() {
    const source = this.dataSources.find((s) => s.id === this.editingSource);
    if (!source) return false;

    // Validate items
    const invalidItems = this.mergedItems.filter(
      (item) => !item.blocked && item.state !== ITEM_STATES.NEW && !item.currentValue.trim(),
    );

    if (invalidItems.length > 0) {
      const message = `${invalidItems.length} item${invalidItems.length > 1 ? 's have' : ' has'} empty values and will be skipped`;
      document.dispatchEvent(
        new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.WARNING, message } }),
      );
    }

    this.isSaving = true;
    this.requestUpdate();

    const finalData = this.buildFinalData(source);
    const finalMetadata = this.buildFinalMetadata(source);

    try {
      const path = `${DATA_PATH}${source.path}`;
      const metadataPath = path.replace('.json', '-meta.json');

      const [dataResponse, metadataResponse] = await Promise.all([
        saveSheets(path, finalData),
        saveSheets(metadataPath, finalMetadata),
      ]);

      if (dataResponse.ok && metadataResponse.ok) {
        this.hasUnsavedChanges = false;
        await this.reloadCurrentSource();
        const successMsg = `${source.name} saved successfully`;
        document.dispatchEvent(
          new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.SUCCESS, message: successMsg, timeout: TOAST_DEFAULT_TIMEOUT } }),
        );
        return true;
      }

      if (!metadataResponse.ok) {
        const warnMsg = 'Data saved but metadata update failed';
        document.dispatchEvent(
          new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.WARNING, message: warnMsg, timeout: TOAST_DEFAULT_TIMEOUT } }),
        );
      }

      return dataResponse.ok;
    } catch (error) {
      console.error('Error saving:', error);
      const errorMsg = `Save failed: ${error.message}`;
      document.dispatchEvent(
        new CustomEvent('show-toast', { detail: { type: TOAST_TYPES.ERROR, message: errorMsg } }),
      );
      return false;
    } finally {
      this.isSaving = false;
      this.requestUpdate();
    }
  }

  /**
   * Reload current editing source after save
   */
  async reloadCurrentSource() {
    if (!this.editingSource) return;

    await this.loadDataSource(this.editingSource);

    const updatedSource = this.dataSources.find((s) => s.id === this.editingSource);
    if (updatedSource) {
      // Reload blocked sheets
      this.blockedSheets = new Set();
      if (updatedSource.metadata?.[METADATA_SHEET]) {
        updatedSource.metadata[METADATA_SHEET].forEach((meta) => {
          if (meta.blocked && meta.sheetName) {
            this.blockedSheets.add(meta.sheetName);
          }
        });
      }

      this.mergedItems = this.buildMergedItems(updatedSource);
      this.requestUpdate();
    }
  }

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  /**
   * Render status badge for data source cards
   */
  renderStatusBadge(status) {
    const statusConfig = {
      [SHEET_STATES.LOADING]: { label: 'Loading...', class: 'status-loading', icon: '⏳' },
      [SHEET_STATES.SYNCED]: { label: 'Synced', class: 'status-synced', icon: '✓' },
      [SHEET_STATES.SYNCED_WITH_MODIFIED]: { label: 'Modified', class: 'status-modified', icon: '✏️' },
      [SHEET_STATES.OUT_OF_SYNC]: { label: 'Out of Sync', class: 'status-out-of-sync', icon: '⚠' },
      [SHEET_STATES.STORED_NOT_FOUND]: { label: 'Not Stored', class: 'status-not-found', icon: '✕' },
      [SHEET_STATES.LIVE_NOT_FOUND]: { label: 'Live Error', class: 'status-error', icon: '⚠' },
      [SHEET_STATES.ERROR]: { label: 'Error', class: 'status-error', icon: '⚠' },
      [SHEET_STATES.BLOCKED]: { label: 'Blocked', class: 'status-blocked', icon: '🔒' },
    };

    const config = statusConfig[status] || statusConfig[SHEET_STATES.ERROR];
    return html`<span class="status-badge ${config.class}">${config.icon} ${config.label}</span>`;
  }

  /**
   * Render a data source card showing status and counts
   */
  renderDataSourceCard(source) {
    return html`
      <div class="data-source-card">
        <div class="card-header">
          <h3>${source.name}</h3>
          ${this.renderStatusBadge(source.status)}
        </div>

        <div class="card-body">
          ${source.error ? html`
            <div class="error-message">
              <span>${source.error}</span>
            </div>
          ` : html`
            <div class="data-info">
              <div class="info-row">
                <span class="label">Live Items:</span>
                <span class="value">${source.liveCount || 0}</span>
              </div>
              <div class="info-row">
                <span class="label">Stored Items:</span>
                <span class="value">${source.storedCount || 0}</span>
              </div>
              <div class="info-row">
                <span class="label">Total Items:</span>
                <span class="value">${source.totalCount || 0}</span>
              </div>
              ${source.data ? html`
                <div class="info-row">
                  <span class="label">Sheets:</span>
                  <span class="value">${Object.keys(source.data).length}</span>
                </div>
              ` : nothing}
              <div class="info-row">
                <span class="label">File Name:</span>
                <span class="value path">${source.path}</span>
              </div>
            </div>
          `}
        </div>

        <div class="card-actions">
          <sl-button
            size="small"
            ?disabled=${source.status === SHEET_STATES.LOADING}
            @click=${() => this.handleEdit(source.id)}>
            Manage
          </sl-button>
          <sl-button
            size="small"
            ?disabled=${source.status === SHEET_STATES.LOADING}
            @click=${() => this.handleOpenInDA(source)}>
            View Data
          </sl-button>
          <sl-button
            size="small"
            ?disabled=${source.status === SHEET_STATES.LOADING}
            @click=${() => this.loadDataSource(source.id)}>
            Refresh
          </sl-button>
        </div>
      </div>
    `;
  }

  /**
   * Render editor header
   */
  renderEditorHeader(source) {
    return html`
      <div class="editor-header">
        <div class="header-left">
          <h2>Manage ${source.name}</h2>
          <p class="editor-description">
            ${Object.keys(source.data).length} sheet(s) •
            ${this.hasUnsavedChanges ? '⚠️ Unsaved changes' : 'All changes saved'}
          </p>
        </div>
        <div class="header-right">
          <sl-button size="small" @click=${() => this.handleOpenInDA(source)}>
            📄 View Data
          </sl-button>
          <sl-button size="small" @click=${() => this.handleOpenInDA(source, true)}>
            📋 View Metadata
          </sl-button>
          <button class="close-btn" @click=${this.handleCancelEdit}>✕</button>
        </div>
      </div>
    `;
  }

  /**
   * Render sheet tabs
   */
  renderSheetTabs(source, sheets) {
    return html`
      <div class="sheet-tabs-container">
        <div class="sheet-tabs">
          ${sheets.map((sheet) => {
    const sheetItems = this.mergedItems.filter((m) => m.sheetName === sheet);
    const isBlocked = this.isSheetBlocked(sheet);
    const isActive = this.activeSheet === sheet;

    return html`
              <button
                class="sheet-tab ${isActive ? 'active' : ''} ${isBlocked ? 'blocked' : ''}"
                @click=${() => this.handleSheetChange(sheet)}>
                ${isBlocked ? '🔒 ' : ''}${sheet}
                <span class="tab-count">${sheetItems.length}</span>
              </button>
            `;
  })}
        </div>
      </div>
    `;
  }

  /**
   * Render toolbar with stats and actions
   */
  renderToolbar(stats, hasSheets) {
    const isBlocked = hasSheets && this.isSheetBlocked(this.activeSheet);

    return html`
      <div class="editor-toolbar">
        <div class="toolbar-left">
          <span class="current-sheet-name">
            ${isBlocked ? '🔒 ' : ''}
            <strong>${this.activeSheet || 'All Items'}</strong>
          </span>
          ${stats ? html`
            <div class="toolbar-stats">
              <span class="stat-chip synced">${stats.synced} synced</span>
              <span class="stat-chip drifted">${stats.drifted} drifted</span>
              <span class="stat-chip new">${stats.new} new</span>
              <span class="stat-chip modified">${stats.modified} modified</span>
              <span class="stat-chip manual">${stats.manual} manual</span>
              <span class="stat-chip stale">${stats.stale} stale</span>
              <span class="stat-chip blocked">${stats.blocked} blocked</span>
            </div>
          ` : nothing}
        </div>
        <div class="toolbar-right">
          ${hasSheets ? html`
            <sl-button size="small" variant="primary" ?disabled=${isBlocked}
              @click=${this.handleSyncSheet}>
              ⚡ Sync Sheet
            </sl-button>
            <sl-button size="small"
              variant="${isBlocked ? 'success' : 'default'}"
              @click=${this.handleToggleSheetBlock}>
              ${isBlocked ? '🔓 Unblock' : '🔒 Block'}
            </sl-button>
          ` : html`
            <sl-button size="small" variant="primary"
              @click=${this.handleSyncAll}>
              ⚡ Sync All
            </sl-button>
          `}
          <sl-button size="small" ?disabled=${isBlocked}
            @click=${this.handleAddItem}>
            ➕ Add Item
          </sl-button>
        </div>
      </div>
    `;
  }

  /**
   * Render item actions based on state
   */
  renderItemActions(item, isSheetBlocked) {
    const canSync = item.state === ITEM_STATES.DRIFTED
      || item.state === ITEM_STATES.NEW
      || item.state === ITEM_STATES.MODIFIED;

    return html`
      <button class="action-btn sync-btn"
        ?disabled=${!canSync || isSheetBlocked}
        @click=${() => this.handleSyncItem(item.itemKey)}
        title="Sync from live">
        ${item.state === ITEM_STATES.MODIFIED ? 'Revert' : 'Sync'}
      </button>

      ${item.state !== ITEM_STATES.MANUAL ? html`
        <button class="action-btn ${item.blocked ? 'unblock-btn' : 'block-btn'}"
          ?disabled=${isSheetBlocked}
          @click=${() => this.handleToggleBlock(item.itemKey)}
          title="${item.blocked ? 'Unblock' : 'Block'} this item">
          ${item.blocked ? 'Unblock' : 'Block'}
        </button>
      ` : nothing}

      ${item.state === ITEM_STATES.MANUAL || item.state === ITEM_STATES.STALE ? html`
        <button class="action-btn delete-btn"
          ?disabled=${isSheetBlocked}
          @click=${() => this.handleRemoveItem(item.itemKey)}
          title="Delete this item">
          Delete
        </button>
      ` : nothing}
    `;
  }

  /**
   * Render individual item row
   */
  renderItemRow(item) {
    const isSheetBlocked = this.isSheetBlocked(item.sheetName);
    const isDifferent = item.live && !itemsEqual(
      item.live,
      { value: item.currentValue, label: item.currentLabel },
    );

    const stateLabels = {
      [ITEM_STATES.SYNCED]: 'Synced',
      [ITEM_STATES.DRIFTED]: 'Drifted',
      [ITEM_STATES.NEW]: 'New',
      [ITEM_STATES.BLOCKED]: 'Blocked',
      [ITEM_STATES.MANUAL]: 'Manual',
      [ITEM_STATES.STALE]: 'Stale',
      [ITEM_STATES.MODIFIED]: 'Modified',
    };

    return html`
      <div class="item-row ${item.state} ${isDifferent ? 'different' : ''}">
        <div class="item-col item-state">
          <span class="state-badge ${item.state}">${stateLabels[item.state]}</span>
        </div>

        <div class="item-col item-value">
          <input
            type="text"
            class="item-input"
            .value=${item.currentValue}
            ?disabled=${isSheetBlocked}
            @input=${(e) => this.handleFieldInput(item.itemKey, 'value', e.target.value)}
            @blur=${this.handleFieldBlur}
            placeholder="Value">
          ${isDifferent ? html`
            <input type="text" class="item-input live-value" disabled
              .value=${item.live.value} placeholder="Live value">
          ` : nothing}
        </div>

        <div class="item-col item-label">
          <input
            type="text"
            class="item-input"
            .value=${item.currentLabel}
            ?disabled=${isSheetBlocked}
            @input=${(e) => this.handleFieldInput(item.itemKey, 'label', e.target.value)}
            @blur=${this.handleFieldBlur}
            placeholder="Label">
          ${isDifferent ? html`
            <input type="text" class="item-input live-value" disabled
              .value=${item.live.label} placeholder="Live label">
          ` : nothing}
        </div>

        <div class="item-col item-actions">
          ${this.renderItemActions(item, isSheetBlocked)}
        </div>
      </div>
    `;
  }

  /**
   * Render item list with header
   */
  renderItemList(items) {
    const isBlocked = this.isSheetBlocked(this.activeSheet);

    if (items.length === 0) {
      return html`
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <h3>No items in this sheet</h3>
          ${!isBlocked ? html`
            <sl-button variant="primary" @click=${this.handleAddItem}>
              ➕ Add Item
            </sl-button>
          ` : html`
            <p>This sheet is blocked. Unblock it to add items.</p>
          `}
        </div>
      `;
    }

    return html`
      ${isBlocked ? html`
        <div class="blocked-sheet-banner">
          🔒 This sheet is locked and will not be synced
        </div>
      ` : nothing}

      <div class="item-list-container">
        <div class="item-header">
          <div class="item-col item-state">Status</div>
          <div class="item-col item-value">Value</div>
          <div class="item-col item-label">Label</div>
          <div class="item-col item-actions">Actions</div>
        </div>
        <div class="item-list">
          ${items.map((item) => this.renderItemRow(item))}
        </div>
      </div>
    `;
  }

  /**
   * Render complete editor overlay
   */
  renderEditor() {
    const source = this.dataSources.find((s) => s.id === this.editingSource);
    if (!source) return nothing;

    const sheets = Object.keys(source.data);
    const currentItems = this.getCurrentSheetItems();
    const stats = this.computeSheetStats(currentItems);

    return html`
      <div class="editor-overlay">
        <div class="editor-container">
          ${this.renderEditorHeader(source)}
          ${sheets.length > 0 ? this.renderSheetTabs(source, sheets) : nothing}
          ${this.renderToolbar(stats, sheets.length > 0)}
          <div class="editor-body">
            ${this.renderItemList(currentItems)}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Main render method
   */
  render() {
    // Only count truly out of sync sources, not modified ones
    const outOfSyncCount = this.dataSources.filter(
      (s) => s.status === SHEET_STATES.OUT_OF_SYNC || s.status === SHEET_STATES.STORED_NOT_FOUND,
    ).length;

    return html`
      <div class="admin-container">
        <div class="admin-header">
          <h1>Landing Page Builder Admin</h1>
          <p class="subtitle">Manage data sources for the Landing Page Builder</p>
        </div>

        ${outOfSyncCount > 0 ? html`
          <div class="sync-alert">
            <span>${outOfSyncCount} data source${outOfSyncCount > 1 ? 's are' : ' is'} out of sync</span>
          </div>
        ` : nothing}

        <div class="data-sources-grid">
          ${this.dataSources.map((source) => this.renderDataSourceCard(source))}
        </div>

        ${this.editingSource ? this.renderEditor() : nothing}
      </div>
    `;
  }

  /**
   * Open data or metadata file in DA
   */
  handleOpenInDA(source, isMetadata = false) {
    const path = isMetadata ? source.path.replace('.json', '-meta.json') : source.path;
    const fullPath = `${DATA_PATH}${path}`.replace(/^\//, '');
    window.open(`${EDIT_PATH}${fullPath}`, '_blank');
  }
}

if (!customElements.get('da-builder-admin')) customElements.define('da-builder-admin', LandingPageAdmin);
