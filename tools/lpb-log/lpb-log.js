/* eslint-disable import/no-unresolved */
/* eslint-disable no-use-before-define */
import DA_SDK from 'da-sdk';
import { getLog, rebuildLog } from '../generator/lpb-log.js';
import { AEM_LIVE_ORIGIN, getDAEditUrl } from '../generator/paths-config.js';

const STATUS_LABELS = { active: 'Active', removed: 'Removed' };
const LS_LAST_REBUILD = 'da-bacom-lpb-log-last-rebuild';
const COLUMNS = [
  { key: 'url', label: 'Page URL' },
  { key: 'author', label: 'Author' },
  { key: 'publishedAt', label: 'First Previewed' },
  { key: 'publishState', label: 'Publish State' },
  { key: 'publisher', label: 'Publisher' },
  { key: 'contentType', label: 'Content Type' },
];
/** Table columns plus audit fields useful in spreadsheets */
const CSV_COLUMNS = [
  ...COLUMNS,
  { key: 'status', label: 'Status' },
  { key: 'lastSeenAt', label: 'Last Seen (sheet)' },
  { key: 'removedAt', label: 'Removed At' },
];

const state = {
  rows: [],
  filter: 'published',
  sortKey: 'publishedAt',
  sortDir: 'desc',
  scanning: false,
  progress: '',
  error: null,
  /** ISO time of last successful Rebuild From Scan (this browser). */
  lastRebuildAt: null,
};

const DEFAULT_SORT = { key: 'publishedAt', dir: 'desc' };

let root;

function slugHeaderKey(key) {
  return String(key || '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

/** Sheet JSON may use different column headers than our code (camelCase). */
function normalizeLogRow(row) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  const lastSeenSlugs = new Set(['lastseen', 'lastseenat', 'lastupdate', 'lastupdatedat']);
  for (const [k, v] of Object.entries(row)) {
    if (v != null && v !== '' && lastSeenSlugs.has(slugHeaderKey(k))) {
      out.lastSeenAt = v;
      break;
    }
  }
  if (out.status != null && out.status !== '') {
    out.status = String(out.status).trim().toLowerCase();
  }
  return out;
}

function readLastRebuildFromStorage() {
  try {
    return sessionStorage.getItem(LS_LAST_REBUILD) || null;
  } catch {
    /* Storage can throw (private mode, disabled cookies/storage). Hint is optional. */
    return null;
  }
}

function writeLastRebuildToStorage(iso) {
  try {
    sessionStorage.setItem(LS_LAST_REBUILD, iso);
  } catch {
    /* Same as read: optional UX hint only; do not fail rebuild/render. */
  }
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function compareRows(a, b, key, dir) {
  const av = a[key] ?? '';
  const bv = b[key] ?? '';
  const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
  return dir === 'asc' ? cmp : -cmp;
}

function getVisibleRows() {
  let rows = state.rows.slice();
  if (state.filter === 'published') rows = rows.filter((r) => r.status !== 'removed' && r.publishState === 'published');
  else if (state.filter === 'unpublished') rows = rows.filter((r) => r.status !== 'removed' && r.publishState !== 'published');
  else if (state.filter === 'deleted') rows = rows.filter((r) => r.status === 'removed');
  rows.sort((a, b) => compareRows(a, b, state.sortKey, state.sortDir));
  return rows;
}

/** After rebuild, active rows share the same `lastSeenAt` (shown as last full scan). */
function inferLastFullReconcileAt(rows) {
  const active = rows.filter((r) => r.status !== 'removed');
  if (active.length === 0) return null;
  const times = active.map((r) => r.lastSeenAt).filter(Boolean);
  if (times.length !== active.length) return null;
  const ms = times.map((t) => new Date(t).getTime());
  if (ms.some((n) => Number.isNaN(n))) return null;
  const min = Math.min(...ms);
  const max = Math.max(...ms);
  if (max - min > 2000) return null;
  return times[0];
}

/** Trusted copy only (no sheet data). */
function appendReconcileHint(p) {
  p.innerHTML = 'No single scan time to show — active rows were updated at different times '
    + '(for example after individual publishes). Run <strong>Rebuild From Scan</strong> '
    + 'to refresh every active row at once.';
}

function createReconcileEl(rows, activeCount, lastRebuildBrowserAt) {
  if (lastRebuildBrowserAt) {
    const p = document.createElement('p');
    p.className = 'lpb-reconcile';
    const label = document.createElement('span');
    label.className = 'lpb-reconcile-label';
    label.textContent = 'Last rebuild';
    p.append(label, document.createTextNode(' '));
    const time = document.createElement('time');
    time.dateTime = lastRebuildBrowserAt;
    time.textContent = formatDate(lastRebuildBrowserAt);
    p.append(time);
    const sub = document.createElement('span');
    sub.className = 'lpb-reconcile-sub';
    sub.textContent = ' (scan from this browser)';
    p.appendChild(sub);
    return p;
  }
  const reconcileAt = inferLastFullReconcileAt(rows);
  if (reconcileAt) {
    const p = document.createElement('p');
    p.className = 'lpb-reconcile';
    const label = document.createElement('span');
    label.className = 'lpb-reconcile-label';
    label.textContent = 'Last full reconciliation (scan)';
    p.append(label, document.createTextNode(' '));
    const time = document.createElement('time');
    time.dateTime = reconcileAt;
    time.textContent = formatDate(reconcileAt);
    p.appendChild(time);
    return p;
  }
  if (activeCount > 0) {
    const p = document.createElement('p');
    p.className = 'lpb-reconcile lpb-reconcile-muted';
    appendReconcileHint(p);
    return p;
  }
  return null;
}

function escapeCsvCell(value) {
  const s = value == null ? '' : String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(rows) {
  const headerLine = CSV_COLUMNS.map((col) => escapeCsvCell(col.label)).join(',');
  const dataLines = rows.map((row) => CSV_COLUMNS.map((col) => {
    let v = row[col.key];
    if (col.key === 'author') v = getDAEditUrl(row.url) ?? '';
    if (col.key === 'status') v = STATUS_LABELS[v] || v || '';
    return escapeCsvCell(v ?? '');
  }).join(','));
  return [headerLine, ...dataLines].join('\r\n');
}

function triggerCsvDownload(filename, text) {
  const blob = new Blob([`\uFEFF${text}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function handleDownloadCsv() {
  const rows = getVisibleRows();
  if (rows.length === 0) return;
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `lpb-log-${state.filter}-${dateStamp}.csv`;
  triggerCsvDownload(filename, buildCsv(rows));
}

function rowStatusClass(status) {
  const s = String(status || 'active').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'active';
  return `row-${s}`;
}

function createTableEl(rows) {
  if (rows.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'lpb-empty';
    empty.textContent = 'No pages logged yet. Publish a landing page or run a scan.';
    return empty;
  }

  const table = document.createElement('table');
  table.className = 'lpb-table';

  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  COLUMNS.forEach((col) => {
    const th = document.createElement('th');
    th.dataset.sortKey = col.key;
    if (state.sortKey === col.key) {
      th.classList.add('sorted');
      th.textContent = `${col.label}${state.sortDir === 'asc' ? ' ▲' : ' ▼'}`;
    } else {
      th.textContent = col.label;
    }
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.className = rowStatusClass(row.status);

    const urlPath = String(row.url ?? '');
    const livePath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
    const urlTd = document.createElement('td');
    urlTd.className = 'col-url';
    const a = document.createElement('a');
    a.href = `${AEM_LIVE_ORIGIN}${livePath}`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = urlPath;
    urlTd.appendChild(a);
    tr.appendChild(urlTd);

    const authorTd = document.createElement('td');
    const editUrl = getDAEditUrl(livePath);
    if (editUrl) {
      const editA = document.createElement('a');
      editA.href = editUrl;
      editA.target = '_blank';
      editA.rel = 'noopener';
      editA.textContent = 'Link';
      authorTd.appendChild(editA);
    }
    tr.appendChild(authorTd);

    const pubTd = document.createElement('td');
    pubTd.textContent = formatDate(row.publishedAt);
    tr.appendChild(pubTd);

    ['publishState', 'publisher', 'contentType'].forEach((key) => {
      const td = document.createElement('td');
      const v = row[key];
      td.textContent = v != null && v !== '' ? String(v) : '—';
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function appendStatChip(parent, count, label, muted) {
  const span = document.createElement('span');
  span.className = muted ? 'lpb-chip lpb-chip-muted' : 'lpb-chip';
  const strong = document.createElement('strong');
  strong.textContent = String(count);
  span.append(strong, document.createTextNode(` ${label}`));
  parent.appendChild(span);
}

async function loadLog() {
  try {
    const raw = await getLog();
    state.rows = Array.isArray(raw) ? raw.map(normalizeLogRow) : [];
    state.sortKey = DEFAULT_SORT.key;
    state.sortDir = DEFAULT_SORT.dir;
  } catch (error) {
    state.error = `Could not load log: ${error?.message || error}`;
    state.rows = [];
  }
  render();
}

async function handleRebuild() {
  if (state.scanning) return;
  state.scanning = true;
  state.progress = '';
  state.error = null;
  render();

  try {
    const result = await rebuildLog({
      onProgress: ({ rootsDone, rootsTotal, pagesFound }) => {
        state.progress = `Scanning root ${rootsDone} of ${rootsTotal} — ${pagesFound} pages found`;
        render();
      },
    });
    if (!result.saved) {
      throw new Error(result.saveError || 'Save failed (no details)');
    }
    const rebuildIso = new Date().toISOString();
    state.lastRebuildAt = rebuildIso;
    writeLastRebuildToStorage(rebuildIso);
    await loadLog();
  } catch (error) {
    state.error = `Rebuild failed: ${error?.message || error}`;
    window.lana?.log?.(`LPB log rebuild failed: ${error?.message || error}`, { severity: 'error', tags: 'landing-page-builder,lpb-log' });
  } finally {
    state.scanning = false;
    state.progress = '';
    render();
  }
}

function bindEvents() {
  root.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.filter = btn.dataset.filter;
      render();
    });
  });

  root.querySelectorAll('[data-sort-key]').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sortKey;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortKey = key;
        state.sortDir = key.endsWith('At') ? 'desc' : 'asc';
      }
      render();
    });
  });

  const rebuildBtn = root.querySelector('[data-action="rebuild"]');
  if (rebuildBtn) rebuildBtn.addEventListener('click', handleRebuild);

  const csvBtn = root.querySelector('[data-action="download-csv"]');
  if (csvBtn) csvBtn.addEventListener('click', handleDownloadCsv);
}

function render() {
  const rows = getVisibleRows();
  const total = state.rows.length;
  const active = state.rows.filter((r) => r.status !== 'removed').length;

  root.replaceChildren();

  const header = document.createElement('header');
  header.className = 'lpb-header';

  const titleRow = document.createElement('div');
  titleRow.className = 'lpb-title-row';
  const h1 = document.createElement('h1');
  h1.textContent = 'Landing Page Builder Log';
  titleRow.appendChild(h1);

  const actions = document.createElement('div');
  actions.className = 'lpb-actions';
  const csvBtn = document.createElement('button');
  csvBtn.type = 'button';
  csvBtn.className = 'lpb-btn lpb-btn-secondary';
  csvBtn.dataset.action = 'download-csv';
  csvBtn.title = 'Exports the current tab and sort order as CSV';
  csvBtn.textContent = 'Download CSV';
  csvBtn.disabled = rows.length === 0;
  actions.appendChild(csvBtn);
  const rebuildBtn = document.createElement('button');
  rebuildBtn.className = 'lpb-btn lpb-btn-primary';
  rebuildBtn.dataset.action = 'rebuild';
  rebuildBtn.textContent = state.scanning ? 'Scanning…' : 'Rebuild From Scan';
  rebuildBtn.disabled = state.scanning;
  actions.appendChild(rebuildBtn);
  titleRow.appendChild(actions);
  header.appendChild(titleRow);

  const subtitle = document.createElement('p');
  subtitle.className = 'lpb-subtitle';
  subtitle.innerHTML = 'Pages built with the landing page builder, logged in real time on Save &amp; Preview and reconciled via a crawl of <code>/resources</code>.';
  header.appendChild(subtitle);

  const published = state.rows.filter((r) => r.status !== 'removed' && r.publishState === 'published').length;
  const unpublished = state.rows.filter((r) => r.status !== 'removed' && r.publishState !== 'published').length;
  const deleted = total - active;

  const stats = document.createElement('div');
  stats.className = 'lpb-stats';
  appendStatChip(stats, published, 'published', false);
  appendStatChip(stats, unpublished, 'unpublished', true);
  appendStatChip(stats, deleted, 'deleted', true);
  appendStatChip(stats, total, 'total', true);
  header.appendChild(stats);

  const reconcileEl = createReconcileEl(state.rows, active, state.lastRebuildAt);
  if (reconcileEl) header.appendChild(reconcileEl);

  if (state.scanning) {
    const progress = document.createElement('div');
    progress.className = 'lpb-progress';
    progress.textContent = state.progress || 'Scanning…';
    header.appendChild(progress);
  }

  if (state.error) {
    const err = document.createElement('div');
    err.className = 'lpb-error';
    err.setAttribute('role', 'alert');
    err.textContent = state.error;
    header.appendChild(err);
  }

  const filters = document.createElement('div');
  filters.className = 'lpb-filters';
  filters.setAttribute('role', 'tablist');
  ['published', 'unpublished', 'deleted', 'all'].forEach((f) => {
    const btn = document.createElement('button');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', state.filter === f ? 'true' : 'false');
    btn.className = `lpb-filter${state.filter === f ? ' is-active' : ''}`;
    btn.dataset.filter = f;
    btn.textContent = `${f[0].toUpperCase()}${f.slice(1)}`;
    filters.appendChild(btn);
  });
  header.appendChild(filters);

  const section = document.createElement('section');
  section.className = 'lpb-table-wrap';
  section.appendChild(createTableEl(rows));

  root.append(header, section);

  bindEvents();
}

(async function init() {
  const sdk = await DA_SDK.catch(() => null);
  root = document.querySelector('.lpb-log-app');
  if (!root) return;
  root.removeAttribute('aria-busy');

  if (!sdk?.context) {
    state.error = 'Missing DA context. Open this tool from https://da.live/app/…';
    render();
    return;
  }

  state.lastRebuildAt = readLastRebuildFromStorage();
  await loadLog();
}());
