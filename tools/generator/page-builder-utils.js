export const METADATA_SHEET = 'settings';

export const ITEM_STATES = {
  SYNCED: 'synced',
  DRIFTED: 'drifted',
  NEW: 'new',
  STALE: 'stale',
  BLOCKED: 'blocked',
};

export const SHEET_STATES = {
  LOADING: 'loading',
  STORED_NOT_FOUND: 'stored-not-found',
  LIVE_NOT_FOUND: 'live-not-found',
  ERROR: 'error',
  OUT_OF_SYNC: 'out-of-sync',
  SYNCED: 'synced',
};

export const STATUS_CONFIG = {
  [SHEET_STATES.LOADING]: { label: 'Loading...', class: 'status-loading' },
  [SHEET_STATES.SYNCED]: { label: 'Synced', class: 'status-synced' },
  [SHEET_STATES.OUT_OF_SYNC]: { label: 'Needs Sync', class: 'status-out-of-sync' },
  [SHEET_STATES.STORED_NOT_FOUND]: { label: 'Not Saved', class: 'status-not-found' },
  [SHEET_STATES.LIVE_NOT_FOUND]: { label: 'Source Error', class: 'status-error' },
  [SHEET_STATES.ERROR]: { label: 'Error', class: 'status-error' },
};

export const ITEM_STATE_LABELS = {
  [ITEM_STATES.SYNCED]: 'Synced',
  [ITEM_STATES.DRIFTED]: 'Drifted',
  [ITEM_STATES.NEW]: 'New',
  [ITEM_STATES.STALE]: 'Stale',
  [ITEM_STATES.BLOCKED]: 'Blocked',
};

export function itemsEqual(item1, item2) {
  if (!item1 || !item2) return false;
  return item1.value === item2.value && item1.label === item2.label;
}

export function countItems(data, predicate = () => true) {
  if (!data || typeof data !== 'object') return 0;
  return Object.values(data).reduce((count, sheet) => (
    count + (sheet ? Object.values(sheet).filter(predicate).length : 0)
  ), 0);
}

export function getBlockedSheets(metadata) {
  const blocked = new Set();
  metadata?.[METADATA_SHEET]?.forEach((m) => {
    if (m.blocked && m.sheetName) blocked.add(m.sheetName);
  });
  return blocked;
}

export function getItemState({ live, stored, metadata }) {
  if (metadata?.blocked) return ITEM_STATES.BLOCKED;
  if (!live) return stored ? ITEM_STATES.STALE : ITEM_STATES.SYNCED;
  if (!stored) return ITEM_STATES.NEW;
  return itemsEqual(live, stored) ? ITEM_STATES.SYNCED : ITEM_STATES.DRIFTED;
}

export function computeSheetStats(items, isSheetBlocked) {
  if (isSheetBlocked) {
    return { synced: 0, drifted: 0, new: 0, stale: 0, blocked: items.length };
  }
  const stats = { synced: 0, drifted: 0, new: 0, stale: 0, blocked: 0 };
  items.forEach((item) => { stats[item.state] = (stats[item.state] || 0) + 1; });
  return stats;
}
