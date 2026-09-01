import { LIBS, PLAY_SVG } from '../../scripts/scripts.js';

function createTag(tag, attributes, html, options = {}) {
  const el = document.createElement(tag);
  if (html) {
    if (html.nodeType === Node.ELEMENT_NODE
      || html instanceof SVGElement
      || html instanceof DocumentFragment) {
      el.append(html);
    } else if (Array.isArray(html)) {
      el.append(...html);
    } else {
      el.insertAdjacentHTML('beforeend', html);
    }
  }
  if (attributes) {
    Object.entries(attributes).forEach(([key, val]) => {
      el.setAttribute(key, val);
    });
  }
  options.parent?.append(el);
  return el;
}

const LANA_OPTIONS = { tags: 'bento-grid', errorType: 'i' };
const VIEW_TYPES = ['mobile', 'desktop'];
const MIN_CAROUSEL_FOR_CONTROLS = 3;
const ARROW_ICON = `
  <svg class="grid-carousel-arrow-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    <path d="M4 10h12M11 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>`;

const DEFAULT_LABELS = {
  watchVideo: 'Watch video',
  previous: 'Previous',
  next: 'Next',
  regionLabel: 'Featured video gallery',
  videoUnavailable: 'This video is currently unavailable.',
};

const PLACEHOLDER_KEYS = ['watch-video', 'previous', 'next', 'featured-video-gallery', 'video-unavailable'];

function logError(message, error) {
  window.lana?.log(`Bento grid ${message}: ${error}`, LANA_OPTIONS);
}

function isRtl() {
  return document.documentElement.getAttribute('dir') === 'rtl';
}

// Resolve localized labels for the strings the block generates (i.e. not authored),
// falling back to English when the placeholder sheet is unavailable (e.g. in tests).
async function loadLabels() {
  try {
    const { getConfig } = await import(`${LIBS}/utils/utils.js`);
    const { replaceKeyArray } = await import(`${LIBS}/features/placeholders.js`);
    const config = getConfig();
    const keys = Object.keys(DEFAULT_LABELS);
    const values = await replaceKeyArray(PLACEHOLDER_KEYS, config);
    const labels = { ...DEFAULT_LABELS };
    keys.forEach((key, i) => {
      const value = values[i];
      const notFound = value === PLACEHOLDER_KEYS[i].replaceAll('-', ' ');
      if (value && !notFound) labels[key] = value;
    });
    return labels;
  } catch {
    return DEFAULT_LABELS;
  }
}

const isHeading = (node) => /^H[1-6]$/.test(node.tagName);

const MP4_RE = /https?:\/\/\S+\.mp4\S*/i;

const isMp4 = (url) => /\.mp4(\?|#|$)/i.test(url || '');

function resolveCellVideo(after) {
  const anchors = after.flatMap((node) => [...node.querySelectorAll('a')]);

  const mp4Anchor = anchors.find((a) => isMp4(a.getAttribute('href')) || MP4_RE.test(a.textContent));
  if (mp4Anchor) {
    const href = mp4Anchor.getAttribute('href') || '';
    const videoSrc = (isMp4(href) && href)
      || href.match(MP4_RE)?.[0]
      || mp4Anchor.textContent.match(MP4_RE)?.[0];
    return { videoSrc, fragmentPath: null, fragmentHash: null, node: mp4Anchor };
  }

  const mediaEl = after
    .flatMap((node) => [...node.querySelectorAll('video, source')])
    .find((m) => isMp4(m.getAttribute('data-video-source')) || isMp4(m.getAttribute('src')));
  if (mediaEl) {
    const videoSrc = mediaEl.getAttribute('data-video-source') || mediaEl.getAttribute('src');
    return { videoSrc, fragmentPath: null, fragmentHash: null, node: mediaEl };
  }

  const modalAnchor = anchors.find((a) => a.dataset.modalPath
    || /\/fragments\//i.test(a.getAttribute('href') || ''));
  if (modalAnchor) {
    const href = modalAnchor.getAttribute('href') || '';
    const fragmentPath = modalAnchor.dataset.modalPath || href.split('#')[0];
    const fragmentHash = modalAnchor.dataset.modalHash
      || (href.includes('#') ? `#${href.split('#').pop()}` : '');
    return { videoSrc: null, fragmentPath, fragmentHash, node: modalAnchor };
  }

  return { videoSrc: null, fragmentPath: null, fragmentHash: null, node: null };
}

// Read an authored CTA link ("<visible text> | <aria-label>") so we can render what the
// author wrote instead of a hardcoded literal. A raw URL (not a real label) yields no text.
function resolveCellCta(node) {
  const anchor = node?.tagName === 'A' ? node : null;
  if (!anchor) return { ctaText: '', ctaAria: '' };
  const href = anchor.getAttribute('href') || '';
  const raw = anchor.textContent.trim();
  const [labelPart, ...ariaParts] = raw.split('|');
  const visible = (labelPart || '').trim();
  const ctaAria = ariaParts.join('|').trim();
  const looksLikeUrl = /^https?:\/\//i.test(visible) || MP4_RE.test(visible) || visible === href;
  return { ctaText: looksLikeUrl ? '' : visible, ctaAria };
}

function extractCells(container) {
  if (!container) return [];
  return Array.from(container.children).map((child) => {
    const pic = child.querySelector('picture');
    const nodes = Array.from(child.children);
    const picHolderIndex = nodes.findIndex((node) => pic && node.contains(pic));
    const before = picHolderIndex === -1 ? [] : nodes.slice(0, picHolderIndex);
    const after = picHolderIndex === -1 ? nodes : nodes.slice(picHolderIndex + 1);

    const sectionHeading = before.find(isHeading);
    const sectionSubtext = before.find((node) => node.tagName === 'P');

    const headingIndex = after.findIndex(isHeading);
    const heading = headingIndex === -1 ? undefined : after[headingIndex];
    const { videoSrc, fragmentPath, fragmentHash, node } = resolveCellVideo(after);
    const { ctaText, ctaAria } = resolveCellCta(node);
    const ctaPara = node ? after.find((p) => p.tagName === 'P' && p.contains(node)) : null;
    const isTextPara = (p) => p.tagName === 'P'
      && p !== ctaPara
      && !p.querySelector('picture')
      && p.textContent.trim();

    // Optional eyebrow: the first text paragraph authored before the heading.
    const eyebrowPara = headingIndex > 0
      ? after.slice(0, headingIndex).find(isTextPara)
      : null;
    // Description: the first text paragraph after the heading (any, if no heading).
    const descScope = headingIndex === -1 ? after : after.slice(headingIndex + 1);
    const descPara = descScope.find((p) => p !== eyebrowPara && isTextPara(p));

    return {
      pictureHTML: pic ? pic.outerHTML : '',
      videoSrc: videoSrc || null,
      fragmentPath,
      fragmentHash,
      ctaText,
      ctaAria,
      eyebrow: eyebrowPara?.textContent.trim() || '',
      heading: heading?.textContent.trim() || '',
      description: descPara?.textContent.trim() || '',
      sectionHeading: sectionHeading?.textContent.trim() || '',
      sectionSubtext: sectionSubtext?.textContent.trim() || '',
    };
  });
}

async function openVideoModal(videoSrc, unavailableLabel) {
  const { loadStyle } = await import(`${LIBS}/utils/utils.js`);
  const { getModal } = await import(`${LIBS}/blocks/modal/modal.js`);
  loadStyle(`${LIBS}/c2/blocks/modal/modal.css`);

  const wrapper = document.createElement('div');
  wrapper.className = 'grid-video-modal-inner';

  const video = document.createElement('video');
  video.className = 'grid-video-modal-player';
  video.controls = true;
  video.playsInline = true;
  video.autoplay = true;

  const source = document.createElement('source');
  source.type = 'video/mp4';
  source.src = videoSrc;
  video.appendChild(source);

  const errorMessage = document.createElement('p');
  errorMessage.className = 'grid-video-modal-error';
  errorMessage.textContent = unavailableLabel;
  errorMessage.hidden = true;

  video.addEventListener('error', () => {
    video.hidden = true;
    errorMessage.hidden = false;
  }, { once: true });

  wrapper.append(video, errorMessage);

  await getModal(null, {
    id: 'bento-grid-video-modal',
    class: 'grid-video-modal',
    content: wrapper,
    closeCallback: () => video.pause(),
  });
}

function addPlayIcon(mediaEl) {
  const playIcon = document.createElement('span');
  playIcon.className = 'grid-item-play';
  playIcon.setAttribute('aria-hidden', 'true');
  playIcon.innerHTML = PLAY_SVG;
  mediaEl.appendChild(playIcon);
}

function attachVideoTrigger(item, mediaEl, videoSrc, labels) {
  item.href = videoSrc;
  item.classList.add('has-video');

  addPlayIcon(mediaEl || item);

  item.addEventListener('click', (event) => {
    event.preventDefault();
    openVideoModal(videoSrc, labels.videoUnavailable);
  });
}

async function openFragmentModal(path, hash) {
  const { loadStyle } = await import(`${LIBS}/utils/utils.js`);
  const { getModal } = await import(`${LIBS}/blocks/modal/modal.js`);
  loadStyle(`${LIBS}/blocks/modal/modal.css`);
  const id = (hash || '').replace('#', '') || 'bento-grid-video-modal';
  await getModal({ path, id });
}

function attachFragmentTrigger(item, mediaEl, path, hash) {
  item.href = hash || path;
  item.classList.add('has-video');
  item.dataset.modalPath = path;
  if (hash) item.dataset.modalHash = hash;

  addPlayIcon(mediaEl || item);

  item.addEventListener('click', (event) => {
    event.preventDefault();
    openFragmentModal(path, hash);
  });
}

function buildTextBlock({ className, eyebrow, heading, description, watchLabel }) {
  const wrap = document.createElement('div');
  wrap.className = className;

  if (eyebrow) {
    const eyebrowEl = createTag('p', { class: 'bento-eyebrow' }, eyebrow);
    wrap.appendChild(eyebrowEl);
  }
  if (heading) {
    const headingEl = document.createElement('h3');
    headingEl.className = 'bento-heading';
    headingEl.textContent = heading;
    wrap.appendChild(headingEl);
  }
  if (description) {
    const descEl = document.createElement('p');
    descEl.className = 'bento-description';
    descEl.textContent = description;
    wrap.appendChild(descEl);
  }
  if (watchLabel) {
    const watchEl = document.createElement('span');
    watchEl.className = 'bento-watch-link';
    watchEl.textContent = watchLabel;
    wrap.appendChild(watchEl);
  }

  return wrap;
}

function buildMedia(cell, loadMode, className) {
  const temp = document.createElement('div');
  temp.innerHTML = cell.pictureHTML;
  const pic = temp.querySelector('picture');
  if (!pic) return null;

  const img = pic.querySelector('img');
  if (img) {
    img.setAttribute('loading', loadMode);
    img.loading = loadMode;
  }

  const media = document.createElement('div');
  media.className = className;
  media.appendChild(pic);
  return media;
}

function buildSectionHeader(cell) {
  if (!cell?.sectionHeading) return null;

  const header = createTag('div', { class: 'bento-section-header' });
  const heading = document.createElement('h2');
  heading.className = 'bento-section-heading';
  heading.textContent = cell.sectionHeading;
  header.appendChild(heading);

  if (cell.sectionSubtext) {
    const subtext = document.createElement('p');
    subtext.className = 'bento-section-subtext';
    subtext.textContent = cell.sectionSubtext;
    header.appendChild(subtext);
  }

  return header;
}

function buildFeatured(cell, labels) {
  if (!cell?.pictureHTML) return null;

  const media = buildMedia(cell, 'eager', 'bento-featured-media');
  if (!media) return null;

  const text = buildTextBlock({
    className: 'bento-featured-text',
    eyebrow: cell.eyebrow,
    heading: cell.heading,
    description: cell.description,
    watchLabel: cell.ctaText || labels.watchVideo,
  });

  const item = document.createElement(cell.videoSrc || cell.fragmentPath ? 'a' : 'div');
  item.className = 'bento-featured';
  if (cell.ctaAria) item.setAttribute('aria-label', cell.ctaAria);
  item.append(text, media);

  if (cell.videoSrc) {
    attachVideoTrigger(item, media, cell.videoSrc, labels);
  } else if (cell.fragmentPath) {
    attachFragmentTrigger(item, media, cell.fragmentPath, cell.fragmentHash);
  } else {
    addPlayIcon(media);
  }

  return item;
}

function buildCarouselCard(cell, loadMode, labels) {
  if (!cell?.pictureHTML) return null;

  const media = buildMedia(cell, loadMode, 'grid-item-media');
  if (!media) return null;

  const item = document.createElement(cell.videoSrc || cell.fragmentPath ? 'a' : 'div');
  item.className = 'grid-item';
  if (cell.ctaAria) item.setAttribute('aria-label', cell.ctaAria);
  item.appendChild(media);

  item.appendChild(buildTextBlock({
    className: 'grid-item-text',
    heading: cell.heading,
    description: cell.description,
    watchLabel: cell.ctaText || labels.watchVideo,
  }));

  if (cell.videoSrc) {
    attachVideoTrigger(item, media, cell.videoSrc, labels);
  } else if (cell.fragmentPath) {
    attachFragmentTrigger(item, media, cell.fragmentPath, cell.fragmentHash);
  } else {
    addPlayIcon(media);
  }

  return item;
}

function isCardFullyVisible(card, frame) {
  const cardRect = card.getBoundingClientRect();
  const frameRect = frame.getBoundingClientRect();
  return cardRect.left >= frameRect.left - 1 && cardRect.right <= frameRect.right + 1;
}

function updateArrowState(container, prevBtn, nextBtn, frame) {
  const { scrollLeft } = container;
  const cards = container.querySelectorAll('.grid-item');
  const lastCard = cards[cards.length - 1];

  prevBtn.disabled = isRtl() ? scrollLeft >= -1 : scrollLeft <= 1;
  nextBtn.disabled = !lastCard || isCardFullyVisible(lastCard, frame);
}

function scrollByCard(container, direction) {
  const card = container.querySelector('.grid-item');
  if (!card) return;
  const gap = parseFloat(getComputedStyle(container).columnGap) || 0;
  const amount = (card.offsetWidth + gap) * direction * (isRtl() ? -1 : 1);
  container.scrollBy({ left: amount, behavior: 'smooth' });
}

function updateEndSpacer(container, spacer, frame) {
  const cards = container.querySelectorAll('.grid-item');
  if (!cards.length) return;
  const gap = parseFloat(getComputedStyle(container).columnGap) || 0;
  const width = container.clientWidth - frame.getBoundingClientRect().width - gap;
  spacer.style.display = width > 0 ? '' : 'none';
  spacer.style.width = `${width}px`;
}

function buildCarouselControls(container, labels) {
  const spacer = createTag('div', { class: 'grid-carousel-end-spacer', 'aria-hidden': 'true' }, null, { parent: container });

  const controls = createTag('div', { class: 'grid-carousel-controls' });
  const prevBtn = createTag('button', {
    type: 'button',
    class: 'grid-carousel-arrow grid-carousel-arrow-prev',
    'aria-label': labels.previous,
  }, ARROW_ICON);
  const nextBtn = createTag('button', {
    type: 'button',
    class: 'grid-carousel-arrow grid-carousel-arrow-next',
    'aria-label': labels.next,
  }, ARROW_ICON);

  prevBtn.addEventListener('click', () => scrollByCard(container, -1));
  nextBtn.addEventListener('click', () => scrollByCard(container, 1));

  controls.append(prevBtn, nextBtn);

  const refresh = () => {
    updateArrowState(container, prevBtn, nextBtn, controls);
    updateEndSpacer(container, spacer, controls);
  };

  container.addEventListener('scroll', () => updateArrowState(container, prevBtn, nextBtn, controls));
  window.addEventListener('resize', refresh);
  requestAnimationFrame(refresh);

  return controls;
}

function buildCarouselRow(cells, labels, { showControls = true } = {}) {
  const container = createTag('div', { class: 'grid-carousel-container' });

  cells.forEach((cell, index) => {
    const card = buildCarouselCard(cell, index === 0 ? 'eager' : 'lazy', labels);
    if (card) container.appendChild(card);
  });

  const wrapper = createTag('div', { class: 'grid-carousel' });
  wrapper.appendChild(container);

  if (showControls && container.children.length > MIN_CAROUSEL_FOR_CONTROLS) {
    wrapper.appendChild(buildCarouselControls(container, labels));
  }

  return wrapper;
}

function createViewElement(type, featuredCells, carouselCells, labels) {
  const wrapper = createTag('div', { class: `grid-view view-${type}` });

  const sectionHeader = buildSectionHeader(featuredCells[0]);
  if (sectionHeader) wrapper.appendChild(sectionHeader);

  if (type === 'mobile') {
    // Mobile collapses the featured cell and the rest into one swipeable carousel.
    wrapper.appendChild(buildCarouselRow([...featuredCells, ...carouselCells], labels));
    return wrapper;
  }

  const [featuredCell, ...restFeatured] = featuredCells;
  const featured = buildFeatured(featuredCell, labels);
  if (featured) wrapper.appendChild(featured);

  wrapper.appendChild(buildCarouselRow([...restFeatured, ...carouselCells], labels));

  return wrapper;
}

function decorateContent(el, labels) {
  try {
    if (!el) return;

    // Only picture-bearing rows are content. This tolerates a legacy authored config
    // row (viewport / r-N--*), which carries no picture, so the first real content row
    // becomes the featured cell whether or not that config row has been removed.
    const rowContainers = Array.from(el.children).filter((row) => row.querySelector('picture'));
    if (rowContainers.length === 0) {
      logError('Missing required structure (row content)');
      return;
    }

    const featuredCells = extractCells(rowContainers[0]);
    const carouselCells = rowContainers.slice(1).flatMap((container) => extractCells(container));

    el.innerHTML = '';
    const foreground = createTag('div', { class: 'foreground' });
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', labels.regionLabel);

    const fragment = document.createDocumentFragment();
    VIEW_TYPES.forEach((type) => {
      const viewEl = createViewElement(type, featuredCells, carouselCells, labels);
      fragment.appendChild(viewEl);
    });
    foreground.appendChild(fragment);
    el.appendChild(foreground);
  } catch (err) {
    logError('Failed to decorate content', err);
  }
}

export default async function init(el) {
  try {
    el.classList.add('con-block');
    const labels = await loadLabels();
    decorateContent(el, labels);
  } catch (err) {
    window.lana?.log(`Bento grid Init Error: ${err}`, LANA_OPTIONS);
  }
}
