/* eslint-disable no-underscore-dangle, import/no-unresolved */
import { LitElement, html, nothing } from 'https://da.live/nx/deps/lit/lit-core.min.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import getSvg from 'https://da.live/nx/utils/svg.js';

const style = await getStyle(import.meta.url);
const icons = await getSvg({ paths: ['/tools/ui/chevron.svg', '/tools/ui/add-circle.svg'] });

class DaTagBrowser extends LitElement {
  static properties = {
    rootTags: { type: Array },
    actions: { type: Object },
    getTags: { type: Function },
    tagValue: { type: String },
    _tags: { state: true },
    _activeTag: { state: true },
    _searchQuery: { state: true },
    _secondaryTags: { state: true },
  };

  constructor() {
    super();
    this._tags = [];
    this._activeTag = {};
    this._searchQuery = '';
    this._secondaryTags = false;
  }

  getTagSegments() {
    return (this._activeTag.activeTag ? this._activeTag.activeTag.split('/') : []).concat(this._activeTag.name);
  }

  getTagValue() {
    if (this.tagValue === 'title') return this._activeTag.title;
    const tagSegments = this.getTagSegments();
    return tagSegments.join(tagSegments.length > 2 ? '/' : ':').replace('/', ':');
  }

  handleBlur() {
    this._secondaryTags = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
    this.shadowRoot.append(...icons);
    this.addEventListener('blur', this.handleBlur, true);
  }

  disconnectedCallback() {
    this.removeEventListener('blur', this.handleBlur, true);
    super.disconnectedCallback();
  }

  updated(changedProperties) {
    if (changedProperties.has('rootTags')) {
      this._tags = [this.rootTags];
      this._activeTag = {};
    }

    if (changedProperties.has('_tags')) {
      setTimeout(() => {
        const groups = this.renderRoot.querySelector('.tag-groups');
        if (!groups) return;
        const firstTag = groups.lastElementChild?.querySelector('.tag-title');
        firstTag?.focus();
        groups.scrollTo({ left: groups.scrollWidth, behavior: 'smooth' });
      }, 100);
    }
  }

  async fetchChildren(tags) {
    if (!this.getTags || !tags?.length) return;

    const fetchPromises = tags.map(async (tag) => {
      if (tag.children && tag.children.length > 0) return;
      const children = await this.getTags(tag).catch(() => null);
      if (!children?.length) return;
      tag.children = children;
      this._tags = [...this._tags];
    });

    await Promise.all(fetchPromises);
  }

  handleTagClick(tag, idx) {
    this._activeTag = tag;
    if (!tag.children || tag.children.length === 0) return;
    this._tags = [...this._tags.toSpliced(idx + 1), tag.children];
    this.fetchChildren(tag.children);
  }

  handleTagInsert(tag) {
    this._activeTag = tag;
    const tagValue = this._secondaryTags ? `, ${this.getTagValue()}` : this.getTagValue();
    this.actions.sendText(tagValue);
    this._secondaryTags = true;
  }

  handleBackClick() {
    if (this._tags.length === 0) return;
    this._tags = this._tags.slice(0, -1);
    this._activeTag = this._tags[this._tags.length - 1]
      .find((tag) => this._activeTag.activeTag?.includes(tag.name)) || {};
  }

  handleSearchInput(event) {
    this._searchQuery = event.target.value.toLowerCase();
  }

  filterTags(tags) {
    if (!this._searchQuery) return tags;
    return tags.filter((tag) => tag.title.toLowerCase().includes(this._searchQuery));
  }

  renderSearchBar() {
    return html`
      <section class="tag-search">
        <div class="search-details">
          <input 
            type="text" 
            placeholder="Search tags..." 
            @input=${this.handleSearchInput} 
            value=${this._searchQuery} 
          />
          ${(this._tags.length > 1) ? html`
            <button class="tag-back" @click=${this.handleBackClick} aria-label="Go back">
              <svg class="icon"><use href="#spectrum-ChevronDown"/></svg>
            </button>
          ` : nothing}
        </div>
      </section>
    `;
  }

  renderTag(tag, idx) {
    const active = this.getTagSegments()[idx] === tag.name;
    const hasChildren = tag.children && tag.children.length > 0;
    return html`
      <li class="tag-group">
        <div class="tag-details">
          <button 
            class="tag-title ${active ? 'active' : ''} ${hasChildren ? 'has-children' : ''}" 
            @click=${() => this.handleTagClick(tag, idx)}
            aria-pressed="${active}">
            ${tag.title.split('/').pop()}
          </button>
          ${hasChildren ? html`
            <button 
              class="tag-navigate"
              @click=${() => this.handleTagClick(tag, idx)}
              aria-label="Navigate to ${tag.title}">
              <svg class="icon"><use href="#spectrum-ChevronDown"/></svg>
            </button>
          ` : nothing}
          <button 
            class="tag-insert"
            @click=${() => this.handleTagInsert(tag)} 
            aria-label="Insert tag ${tag.title}">
            <svg class="icon"><use href="#spectrum-AddCircle"/></svg>
          </button>
        </div>
      </li>
    `;
  }

  renderTagGroup(group, idx) {
    const filteredGroup = this.filterTags(group);
    return html`
      <ul class="tag-group-list">
        ${filteredGroup.map((tag) => this.renderTag(tag, idx))}
      </ul>
    `;
  }

  render() {
    if (this._tags.length === 0) return nothing;
    return html`
      <div class="tag-browser">
        ${this.renderSearchBar()}
        <ul class="tag-groups">
          ${this._tags.map((group, idx) => html`
            <li class="tag-group-column">
              ${this.renderTagGroup(group, idx)}
            </li>
          `)}
        </ul>
      </div>
    `;
  }
}

customElements.define('da-tag-browser', DaTagBrowser);
