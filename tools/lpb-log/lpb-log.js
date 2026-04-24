/* eslint-disable import/no-unresolved */
/* eslint-disable no-use-before-define */
import DA_SDK from 'da-sdk';
import { getLog, rebuildLog, LOG_PATH } from '../generator/lpb-log.js';
import { ORG, REPO, AEM_LIVE_ORIGIN } from '../generator/paths-config.js';

const EDIT_URL = `https://da.live/sheet#/${ORG}/${REPO}${LOG_PATH}`;
const PUBLIC_URL = `${AEM_LIVE_ORIGIN}${LOG_PATH}.json`;

const STATUS_LABELS = { active: 'Active', removed: 'Removed' };
const COLUMNS = [
  { key: 'url', label: 'Page URL' },
  { key: 'publishedAt', label: 'Published' },
  { key: 'publisher', label: 'Publisher' },
  { key: 'contentType', label: 'Content Type' },
  { key: 'version', label: 'LPB Version' },
  { key: 'lastSeenAt', label: 'Last Seen' },
  { key: 'status', label: 'Status' },
];

const state = {
  rows: [],
  filter: 'active',
  sortKey: 'publishedAt',
  sortDir: 'desc',
  scanning: false,
  progress: '',
  error: null,
};

const DEFAULT_SORT = { key: 'publishedAt', dir: 'desc' };

let root;

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return escapeHtml(value);
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
  if (state.filter === 'active') rows = rows.filter((r) => r.status !== 'removed');
  else if (state.filter === 'removed') rows = rows.filter((r) => r.status === 'removed');
  rows.sort((a, b) => compareRows(a, b, state.sortKey, state.sortDir));
  return rows;
}

function renderTable(rows) {
  if (rows.length === 0) {
    return '<div class="lpb-empty">No pages logged yet. Publish a landing page or run a scan.</div>';
  }

  const head = COLUMNS.map((col) => {
    const active = state.sortKey === col.key;
    let indicator = '';
    if (active) indicator = state.sortDir === 'asc' ? ' ▲' : ' ▼';
    return `<th data-sort-key="${col.key}" class="${active ? 'sorted' : ''}">${escapeHtml(col.label)}${indicator}</th>`;
  }).join('');

  const body = rows.map((row) => {
    const livePath = row.url.startsWith('/') ? row.url : `/${row.url}`;
    const liveHref = `${AEM_LIVE_ORIGIN}${livePath}`;
    const statusLabel = STATUS_LABELS[row.status] || row.status || '—';
    return `
      <tr class="row-${escapeHtml(row.status || 'active')}">
        <td class="col-url"><a href="${escapeHtml(liveHref)}" target="_blank" rel="noopener">${escapeHtml(row.url)}</a></td>
        <td>${formatDate(row.publishedAt)}</td>
        <td>${escapeHtml(row.publisher || '—')}</td>
        <td>${escapeHtml(row.contentType || '—')}</td>
        <td>${escapeHtml(row.version || '—')}</td>
        <td>${formatDate(row.lastSeenAt)}</td>
        <td><span class="status-pill status-${escapeHtml(row.status || 'active')}">${escapeHtml(statusLabel)}</span></td>
      </tr>
    `;
  }).join('');

  return `
    <table class="lpb-table">
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

async function loadLog() {
  try {
    state.rows = await getLog();
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
    const result = await rebuildLog({ onProgress: (path) => { state.progress = path; render(); } });
    if (!result.saved) throw new Error('Save failed');
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
}

function render() {
  const rows = getVisibleRows();
  const total = state.rows.length;
  const active = state.rows.filter((r) => r.status !== 'removed').length;
  const removed = total - active;

  root.innerHTML = `
    <header class="lpb-header">
      <div class="lpb-title-row">
        <h1>Landing Page Builder Log</h1>
        <div class="lpb-actions">
          <a class="lpb-btn lpb-btn-secondary" href="${escapeHtml(EDIT_URL)}" target="_blank" rel="noopener">Open sheet</a>
          <a class="lpb-btn lpb-btn-secondary" href="${escapeHtml(PUBLIC_URL)}" target="_blank" rel="noopener">Public JSON</a>
          <button class="lpb-btn lpb-btn-primary" data-action="rebuild" ${state.scanning ? 'disabled' : ''}>
            ${state.scanning ? 'Scanning…' : 'Rebuild from scan'}
          </button>
        </div>
      </div>
      <p class="lpb-subtitle">
        Pages built with the landing page builder, logged in real time on publish and reconciled via a crawl of <code>/resources</code>.
      </p>
      <div class="lpb-stats">
        <span class="lpb-chip"><strong>${active}</strong> active</span>
        <span class="lpb-chip lpb-chip-muted"><strong>${removed}</strong> removed</span>
        <span class="lpb-chip lpb-chip-muted"><strong>${total}</strong> total</span>
      </div>
      ${state.scanning && state.progress ? `<div class="lpb-progress">Scanning: <code>${escapeHtml(state.progress)}</code></div>` : ''}
      ${state.error ? `<div class="lpb-error" role="alert">${escapeHtml(state.error)}</div>` : ''}
      <div class="lpb-filters" role="tablist">
        ${['active', 'removed', 'all'].map((f) => `
          <button role="tab" aria-selected="${state.filter === f}" class="lpb-filter ${state.filter === f ? 'is-active' : ''}" data-filter="${f}">
            ${f[0].toUpperCase()}${f.slice(1)}
          </button>
        `).join('')}
      </div>
    </header>
    <section class="lpb-table-wrap">
      ${renderTable(rows)}
    </section>
  `;

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

  await loadLog();
}());
