/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-unresolved */
import DA_SDK from 'da-sdk';
import { daFetch } from 'da-fetch';
import { LitElement, html, nothing } from 'da-lit';
import getStyle from 'styles';
import { extractMarketoBlocks } from './mkto-scanner.js';
import {
  LOCALES,
  ORG,
  REPO,
  ADMIN_DA_ORIGIN,
  AEM_PAGE_ORIGIN,
  AEM_LIVE_ORIGIN,
  getDAEditUrl,
  getHelixResourceStatusUrl,
  getRepoRelativePath,
} from '../generator/paths-config.js';

const REPO_PREFIX = `/${ORG}/${REPO}`;

const SUGGESTED_PATHS = [
  '/resources',
  '/customer-success-stories',
  '/products',
  '/solutions',
  '/blog',
  '/events',
  '/newsletters',
  '/webinars',
];

const CSV_COLUMNS = [
  { key: 'path', label: 'Page Path' },
  { key: 'author', label: 'Edit' },
  { key: 'variantClass', label: 'Block Variant' },
  { key: 'multiStepMethod', label: 'Multi-step' },
  { key: 'formId', label: 'Form ID' },
  { key: 'template', label: 'Template' },
  { key: 'poi', label: 'POI' },
  { key: 'successType', label: 'Success Type' },
  { key: 'successContent', label: 'Success Content' },
  { key: 'stepPref', label: 'Step Pref' },
  { key: 'previewedAt', label: 'Previewed' },
  { key: 'previewedBy', label: 'Previewed By' },
  { key: 'publishedAt', label: 'Published' },
  { key: 'publishedBy', label: 'Published By' },
];

const TABLE_COLS = [
  { key: 'path', label: 'Path' },
  { key: 'formId', label: 'Form ID' },
  { key: 'template', label: 'Template' },
  { key: 'multiStepMethod', label: 'Multi-step' },
  { key: 'poi', label: 'POI' },
  { key: 'successType', label: 'Success Type' },
];

const style = await getStyle(import.meta.url);

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function compareRows(a, b, key, dir) {
  const av = String(a[key] ?? '');
  const bv = String(b[key] ?? '');
  const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
  return dir === 'asc' ? cmp : -cmp;
}

function escapeCsvCell(value) {
  const s = value == null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function fetchPageStatus(repoRelativePath, signal) {
  const empty = {
    previewedAt: null,
    previewedBy: null,
    publishedAt: null,
    publishedBy: null,
  };
  try {
    const res = await daFetch(getHelixResourceStatusUrl(`${repoRelativePath}.html`), { signal });
    if (!res.ok) return empty;
    const json = await res.json();
    return {
      previewedAt: json.preview?.lastModified
        ? new Date(json.preview.lastModified).toISOString() : null,
      previewedBy: json.preview?.lastModifiedBy || null,
      publishedAt: json.live?.lastModified
        ? new Date(json.live.lastModified).toISOString() : null,
      publishedBy: json.live?.lastModifiedBy || null,
    };
  } catch {
    return empty;
  }
}

function renderAemBtn(origin, path, date, label) {
  const href = `${origin}${path}`;
  const dateText = date ? formatDate(date) : `Not ${label.toLowerCase()}`;
  return html`
    <a class="aem-btn${date ? ' is-active' : ''}" href="${href}" target="_blank" rel="noopener"
       aria-label="Open ${label.toLowerCase()}">
      <div class="aem-btn-icon"></div>
      <div class="aem-btn-details">
        <p class="aem-btn-title">${label}</p>
        <p class="aem-btn-date">${dateText}</p>
      </div>
    </a>
  `;
}

function renderDetailRow(row, colSpan) {
  return html`
    <tr class="detail-row">
      <td colspan="${colSpan}">
        <div class="detail-inner">
          <dl class="detail-grid">
            <div><dt>Block Variant</dt><dd>${row.variantClass || '—'}</dd></div>
            <div><dt>Step Pref</dt><dd>${row.stepPref || '—'}</dd></div>
            <div><dt>Success Content</dt><dd>${row.successContent || '—'}</dd></div>
          </dl>
          <div class="aem-btns">
            ${renderAemBtn(AEM_PAGE_ORIGIN, row.path, row.previewedAt, 'Previewed')}
            ${renderAemBtn(AEM_LIVE_ORIGIN, row.path, row.publishedAt, 'Published')}
          </div>
        </div>
      </td>
    </tr>
  `;
}

export default class MktoScan extends LitElement {
  static properties = {
    _rows: { state: true },
    _scanning: { state: true },
    _signedIn: { state: true },
    _error: { state: true },
    _filter: { state: true },
    _sortKey: { state: true },
    _sortDir: { state: true },
    _locale: { state: true },
    _customPath: { state: true },
    _pagesScanned: { state: true },
    _scanDuration: { state: true },
    _expandedRows: { state: true },
  };

  constructor() {
    super();
    this._rows = [];
    this._scanning = false;
    this._signedIn = false;
    this._error = null;
    this._filter = '';
    this._sortKey = 'path';
    this._sortDir = 'asc';
    this._locale = '';
    this._customPath = '';
    this._pagesScanned = 0;
    this._scanDuration = null;
    this._expandedRows = new Set();
    // Plain instance fields — not reactive
    this._cancelCrawl = null;
    this._controller = null;
    this._startTime = 0;
  }

  async connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
    const sdk = await DA_SDK.catch(() => null);
    if (!sdk?.context) {
      this._error = 'Missing DA context. Open this tool from https://da.live/app/…';
      return;
    }
    this._signedIn = !!sdk.token;
  }

  get _sortedRows() {
    return [...this._rows].sort((a, b) => compareRows(a, b, this._sortKey, this._sortDir));
  }

  get _visibleRows() {
    const q = this._filter.trim().toLowerCase();
    if (!q) return this._sortedRows;
    const FILTER_KEYS = ['path', 'formId', 'template', 'poi', 'successType', 'successContent', 'variantClass'];
    return this._sortedRows.filter((r) => FILTER_KEYS.some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
  }

  async _processPage(item, signal) {
    if (item.ext !== 'html') return;
    this._pagesScanned += 1;
    this._scanDuration = ((Date.now() - this._startTime) / 1000).toFixed(1);
    const repoPath = getRepoRelativePath(item.path).replace(/\.html$/, '');
    try {
      const res = await daFetch(`${ADMIN_DA_ORIGIN}/source/${ORG}/${REPO}${repoPath}.html`, { signal });
      if (!res.ok) return;
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      const blocks = extractMarketoBlocks(doc);
      if (!blocks.length) return;
      const status = await fetchPageStatus(repoPath, signal);
      const newRows = blocks.map((block) => ({ path: repoPath, ...block, ...status }));
      const updatedRows = [...this._rows, ...newRows];
      this._rows = updatedRows;
    } catch (err) {
      if (err.name === 'AbortError') throw err;
    }
  }

  async _runScan() {
    if (this._scanning || !this._signedIn) return;
    this._scanning = true;
    this._rows = [];
    this._error = null;
    this._pagesScanned = 0;
    this._scanDuration = null;
    this._expandedRows = new Set();
    this._startTime = Date.now();

    const controller = new AbortController();
    this._controller = controller;

    try {
      const { crawl } = await import('https://da.live/nx/public/utils/tree.js');
      const rootPath = this._locale ? `/${this._locale}${this._customPath}` : this._customPath;
      const { results, cancelCrawl } = crawl({
        path: `${REPO_PREFIX}${rootPath}`,
        callback: (item) => this._processPage(item, controller.signal),
        concurrent: 5,
        throttle: 100,
      });
      this._cancelCrawl = cancelCrawl;
      await results;
    } catch (err) {
      if (err.name !== 'AbortError') {
        this._error = `Scan failed: ${err?.message || err}`;
        window.lana?.log?.(`mkto-scan failed: ${err?.message || err}`, { severity: 'error', tags: 'mkto-scan' });
      }
    } finally {
      this._scanDuration = ((Date.now() - this._startTime) / 1000).toFixed(1);
      this._scanning = false;
      this._cancelCrawl = null;
      this._controller = null;
    }
  }

  _handleCancel() {
    this._cancelCrawl?.();
    this._controller?.abort();
  }

  _sortIndicator() {
    return this._sortDir === 'asc' ? ' ▲' : ' ▼';
  }

  _handleSort(key) {
    if (this._sortKey === key) {
      this._sortDir = this._sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this._sortKey = key;
      this._sortDir = key.endsWith('At') ? 'desc' : 'asc';
    }
  }

  _toggleRow(path) {
    const next = new Set(this._expandedRows);
    if (next.has(path)) next.delete(path); else next.add(path);
    this._expandedRows = next;
  }

  _handleDownloadCsv() {
    if (!this._rows.length) return;
    const header = CSV_COLUMNS.map((c) => escapeCsvCell(c.label)).join(',');
    const lines = this._visibleRows.map((row) => CSV_COLUMNS.map((col) => {
      if (col.key === 'path') return escapeCsvCell(`${AEM_LIVE_ORIGIN}${row.path}`);
      if (col.key === 'author') return escapeCsvCell(getDAEditUrl(row.path) ?? '');
      return escapeCsvCell(row[col.key] ?? '');
    }).join(','));
    const csv = [header, ...lines].join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mkto-scan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  _renderStats() {
    if (!this._rows.length && !this._pagesScanned) return nothing;
    const pagesWithBlocks = new Set(this._rows.map((r) => r.path)).size;
    const multiStepCount = this._rows.filter((r) => r.multiStepMethod).length;
    const duration = this._scanDuration ? ` in ${this._scanDuration} seconds` : '';
    const blockWord = this._rows.length === 1 ? 'block' : 'blocks';
    const pageWord = pagesWithBlocks === 1 ? 'page' : 'pages';
    return html`
      <div class="stats">
        <span class="chip">
        Found <strong>${this._rows.length}</strong> ${blockWord} on <strong>${pagesWithBlocks}</strong> of <strong>${this._pagesScanned}</strong> ${pageWord} ${duration}
        </span>
        ${multiStepCount ? html`<span class="chip"><strong>${multiStepCount}</strong> multi-step</span>` : nothing}
      </div>
    `;
  }

  _renderRow(row, colSpan) {
    const expanded = this._expandedRows.has(row.path);
    const editUrl = getDAEditUrl(row.path);
    const rowClass = `item-row${row.multiStepMethod ? ' row-multi' : ''}${expanded ? ' is-expanded' : ''}`;
    return html`
      <tr class="${rowClass}">
        <td class="col-path">
          <a href="${getDAEditUrl(row.path)}" target="_blank" rel="noopener">${row.path}</a>
        </td>
        <td>${row.formId ?? '—'}</td>
        <td>${row.template ?? '—'}</td>
        <td>${row.multiStepMethod ?? '—'}</td>
        <td>${row.poi ?? '—'}</td>
        <td>${row.successType ?? '—'}</td>
        <td class="col-expand">
          <button class="expand-btn"
                  @click="${() => this._toggleRow(row.path)}"
                  aria-label="Toggle details"
                  aria-expanded="${expanded}">
          </button>
        </td>
      </tr>
      ${expanded ? renderDetailRow(row, colSpan, editUrl) : nothing}
    `;
  }

  _renderTable() {
    const rows = this._visibleRows;
    if (!rows.length && !this._scanning) {
      return html`<div class="empty">No results. Select a scope and run a scan.</div>`;
    }
    if (!rows.length) return nothing;
    const colSpan = TABLE_COLS.length + 1;
    return html`
      <table class="table">
        <colgroup>
          <col class="col-path">
          ${TABLE_COLS.slice(1).map(() => html`<col>`)}
          <col class="col-expand">
        </colgroup>
        <thead>
          <tr>
            ${TABLE_COLS.map((col) => html`
              <th class="${this._sortKey === col.key ? 'sorted' : ''}"
                  @click="${() => this._handleSort(col.key)}">
                ${col.label}${this._sortKey === col.key ? this._sortIndicator() : ''}
              </th>
            `)}
            <th class="col-expand"></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => this._renderRow(row, colSpan))}
        </tbody>
      </table>
    `;
  }

  render() {
    return html`
      <header class="header">
        <div class="title-row">
          <h1>Marketo Block Report</h1>
          <div class="actions">
            <button class="btn btn-secondary"
                    ?disabled="${!this._rows.length}"
                    @click="${this._handleDownloadCsv}">
              Download CSV
            </button>
          </div>
        </div>

        <div class="scope-row">
          <label for="mkto-locale">Locale</label>
          <select id="mkto-locale" @change="${(e) => { this._locale = e.target.value; }}">
            <option value="" ?selected="${!this._locale}">EN (default)</option>
            ${Object.keys(LOCALES).filter((k) => k !== '').sort().map((key) => html`
              <option value="${key}" ?selected="${key === this._locale}">${key}</option>
            `)}
          </select>

          <label for="mkto-path">Path</label>
          <input id="mkto-path" type="text" list="mkto-path-list" .value="${this._customPath}"
                 @change="${(e) => { this._customPath = e.target.value.trim() || '/'; }}" />
          <datalist id="mkto-path-list">
            ${SUGGESTED_PATHS.map((p) => html`<option value="${p}"></option>`)}
          </datalist>

          ${this._scanning
    ? html`<button class="btn btn-danger" @click="${this._handleCancel}">Stop</button>`
    : html`<button class="btn btn-primary"
                         ?disabled="${!this._signedIn}"
                         @click="${this._runScan}">Search</button>`}
        </div>

        ${!this._signedIn
    ? html`<div class="warning">Sign in to run a scan.</div>`
    : nothing}
        ${this._error
    ? html`<div class="error" role="alert">${this._error}</div>`
    : nothing}

        ${this._renderStats()}

        ${this._rows.length ? html`
          <div class="filter-row">
            <input type="search" placeholder="Filter results…"
                   .value="${this._filter}"
                   @input="${(e) => { this._filter = e.target.value; }}" />
          </div>
        ` : nothing}
      </header>

      <section class="table-wrap">
        ${this._renderTable()}
      </section>
    `;
  }
}

customElements.define('mkto-scan', MktoScan);
