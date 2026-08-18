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
const VIEW_TYPES = ['mobile', 'tablet', 'desktop'];
const MIN_CAROUSEL_FOR_CONTROLS = 3;
// Full arrow (shaft + head) matching bacom-elastic-carousel's nav controls, rather than
// a bare chevron/caret. Uses currentColor so it inherits the button's color.
const ARROW_ICON = `
  <svg class="grid-carousel-arrow-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    <path d="M4 10h12M11 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>`;

function logError(message, error) {
  window.lana?.log(`Bento grid ${message}: ${error}`, LANA_OPTIONS);
}

function isRtl() {
  return document.documentElement.getAttribute('dir') === 'rtl';
}

function parseConfigBlock(configContainer) {
  const configMap = {};

  Array.from(configContainer.children).forEach((viewportDiv) => {
    const paragraphs = Array.from(viewportDiv.querySelectorAll('p'));

    if (paragraphs.length === 0) return;

    let currentViewport = null;
    const currentProps = {};

    paragraphs.forEach((p) => {
      const text = p.textContent.trim();
      const separatorIndex = text.indexOf('=');
      if (separatorIndex === -1) return;
      const key = text.slice(0, separatorIndex).trim().toLowerCase();
      const val = text.slice(separatorIndex + 1).trim();
      if (key === 'viewport') {
        currentViewport = val.toLowerCase();
      } else {
        const rowMatch = key.match(/^r-?(\d+)--(.+)/);
        if (rowMatch) {
          const rowNum = parseInt(rowMatch[1], 10);
          const prop = rowMatch[2];
          if (!currentProps[rowNum]) {
            currentProps[rowNum] = { left: 0 };
          }

          if (prop === 'left') {
            currentProps[rowNum].left = parseFloat(val);
          } else if (prop === 'start-index') {
            currentProps[rowNum].startIndex = parseInt(val, 10);
          }
        }
      }
    });
    if (currentViewport) {
      configMap[currentViewport] = currentProps;
    }
  });
  return configMap;
}

const isHeading = (node) => /^H[1-6]$/.test(node.tagName);

const MP4_RE = /https?:\/\/\S+\.mp4\S*/i;

const isMp4 = (url) => /\.mp4(\?|#|$)/i.test(url || '');

// The card's play target may take several forms:
//   1. a direct .mp4 link (old: the url is the link text; new: the url is the href)
//   2. Milo's video autoblock replaces that .mp4 <a> with <video data-video-source="…mp4">
//      (plus a lazily-added <source>) and removes the <a> — so the mp4 lives on the media el
//   3. a raw Milo video-fragment link: <a href="/fragments/…#hash">Watch video</a>
//   4. a Milo-decorated modal link: <a href="#hash" data-modal-path="/fragments/…">
// Return the mp4 src (played in the custom <video> modal) or the fragment path + hash (opened
// as a Milo modal), plus the source node so its paragraph is kept out of the description.
function resolveCellVideo(after) {
  const anchors = after.flatMap((node) => [...node.querySelectorAll('a')]);

  // 1) direct mp4 link
  const mp4Anchor = anchors.find((a) => isMp4(a.getAttribute('href')) || MP4_RE.test(a.textContent));
  if (mp4Anchor) {
    const href = mp4Anchor.getAttribute('href') || '';
    const videoSrc = (isMp4(href) && href)
      || href.match(MP4_RE)?.[0]
      || mp4Anchor.textContent.match(MP4_RE)?.[0];
    return { videoSrc, fragmentPath: null, fragmentHash: null, node: mp4Anchor };
  }

  // 2) mp4 link already turned into a <video data-video-source>/<source> by Milo's autoblock
  const mediaEl = after
    .flatMap((node) => [...node.querySelectorAll('video, source')])
    .find((m) => isMp4(m.getAttribute('data-video-source')) || isMp4(m.getAttribute('src')));
  if (mediaEl) {
    const videoSrc = mediaEl.getAttribute('data-video-source') || mediaEl.getAttribute('src');
    return { videoSrc, fragmentPath: null, fragmentHash: null, node: mediaEl };
  }

  // 3 & 4) Milo video-fragment / modal link
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

    const heading = after.find(isHeading);
    const paragraphs = after.filter((node) => node.tagName === 'P');
    const { videoSrc, fragmentPath, fragmentHash, node } = resolveCellVideo(after);
    const ctaPara = node ? paragraphs.find((p) => p.contains(node)) : null;
    const descPara = paragraphs.find((p) => p !== ctaPara
      && !p.querySelector('picture')
      && p.textContent.trim());

    return {
      pictureHTML: pic ? pic.outerHTML : '',
      videoSrc: videoSrc || null,
      fragmentPath,
      fragmentHash,
      heading: heading?.textContent.trim() || '',
      description: descPara?.textContent.trim() || '',
      sectionHeading: sectionHeading?.textContent.trim() || '',
      sectionSubtext: sectionSubtext?.textContent.trim() || '',
    };
  });
}

async function openVideoModal(videoSrc) {
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
  errorMessage.textContent = 'This video is currently unavailable.';
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

function attachVideoTrigger(item, mediaEl, videoSrc) {
  item.href = videoSrc;
  item.classList.add('has-video');

  addPlayIcon(mediaEl || item);

  item.addEventListener('click', (event) => {
    event.preventDefault();
    openVideoModal(videoSrc);
  });
}

// Milo video-fragment links point at a fragment (not a raw mp4), so play them by
// loading that fragment into a Milo modal rather than the custom <video> modal.
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

function buildTextBlock({ className, eyebrow, heading, description, showWatchLink }) {
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
  if (showWatchLink) {
    const watchEl = document.createElement('span');
    watchEl.className = 'bento-watch-link';
    watchEl.textContent = 'Watch video';
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

function buildFeatured(cell) {
  if (!cell?.pictureHTML) return null;

  const media = buildMedia(cell, 'eager', 'bento-featured-media');
  if (!media) return null;

  const text = buildTextBlock({
    className: 'bento-featured-text',
    eyebrow: 'Featured video',
    heading: cell.heading,
    description: cell.description,
    showWatchLink: true,
  });

  const item = document.createElement(cell.videoSrc || cell.fragmentPath ? 'a' : 'div');
  item.className = 'bento-featured';
  item.append(text, media);

  if (cell.videoSrc) {
    attachVideoTrigger(item, media, cell.videoSrc);
  } else if (cell.fragmentPath) {
    attachFragmentTrigger(item, media, cell.fragmentPath, cell.fragmentHash);
  } else {
    addPlayIcon(media);
  }

  return item;
}

function buildCarouselCard(cell, loadMode) {
  if (!cell?.pictureHTML) return null;

  const media = buildMedia(cell, loadMode, 'grid-item-media');
  if (!media) return null;

  const item = document.createElement(cell.videoSrc || cell.fragmentPath ? 'a' : 'div');
  item.className = 'grid-item';
  item.appendChild(media);

  item.appendChild(buildTextBlock({
    className: 'grid-item-text',
    heading: cell.heading,
    description: cell.description,
    showWatchLink: true,
  }));

  if (cell.videoSrc) {
    attachVideoTrigger(item, media, cell.videoSrc);
  } else if (cell.fragmentPath) {
    attachFragmentTrigger(item, media, cell.fragmentPath, cell.fragmentHash);
  } else {
    addPlayIcon(media);
  }

  return item;
}

// Rect-based (not scrollLeft-based) so it works the same in LTR and RTL,
// and so "next" disables as soon as the last card is fully within the
// constrained card column — not just anywhere in the container, which on
// desktop bleeds wider than that column so it can peek the next card.
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

// Pads the end of the carousel so the browser's native max scroll lands
// exactly where the last card fills the constrained card column (frame),
// flush with no gap. Without this, the container's own width (which bleeds
// wider than that column) lets native scroll/swipe go further, past the
// point where the last card is flush, into a dead zone that shows fewer
// than a full set of cards with blank space trailing them.
function updateEndSpacer(container, spacer, frame) {
  const cards = container.querySelectorAll('.grid-item');
  if (!cards.length) return;
  const gap = parseFloat(getComputedStyle(container).columnGap) || 0;
  const width = container.clientWidth - frame.getBoundingClientRect().width - gap;
  // When no padding is needed (e.g. tablet, where the container doesn't
  // bleed past the card column), remove the spacer from the flex flow
  // entirely — leaving it at width 0 would still add one flex `gap` after
  // the last card, throwing off the exact-multiple-of-a-card math.
  spacer.style.display = width > 0 ? '' : 'none';
  spacer.style.width = `${width}px`;
}

function buildCarouselControls(container) {
  const spacer = createTag('div', { class: 'grid-carousel-end-spacer', 'aria-hidden': 'true' }, null, { parent: container });

  const controls = createTag('div', { class: 'grid-carousel-controls' });
  const prevBtn = createTag('button', {
    type: 'button',
    class: 'grid-carousel-arrow grid-carousel-arrow-prev',
    'aria-label': 'Previous',
  }, ARROW_ICON);
  const nextBtn = createTag('button', {
    type: 'button',
    class: 'grid-carousel-arrow grid-carousel-arrow-next',
    'aria-label': 'Next',
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

function rotateByStartIndex(cells, startIndex) {
  if (!startIndex || startIndex <= 0 || cells.length === 0) return cells;
  const rotation = (startIndex - 1) % cells.length;
  return [...cells.slice(rotation), ...cells.slice(0, rotation)];
}

function buildCarouselRow(cells, { showControls = true } = {}) {
  const container = createTag('div', { class: 'grid-carousel-container' });

  cells.forEach((cell, index) => {
    const card = buildCarouselCard(cell, index === 0 ? 'eager' : 'lazy');
    if (card) container.appendChild(card);
  });

  const wrapper = createTag('div', { class: 'grid-carousel' });
  wrapper.appendChild(container);

  if (showControls && container.children.length > MIN_CAROUSEL_FOR_CONTROLS) {
    wrapper.appendChild(buildCarouselControls(container));
  }

  return wrapper;
}

function resolveViewData(targetType, availableDataMap) {
  const fallbackOrder = [targetType, 'desktop', 'tablet', 'mobile'];
  const foundKey = fallbackOrder.find((key) => availableDataMap[key]);
  return availableDataMap[foundKey] || {};
}

function createViewElement(type, config, featuredCells, carouselCells) {
  const wrapper = createTag('div', { class: `grid-view view-${type}` });

  const sectionHeader = buildSectionHeader(featuredCells[0]);
  if (sectionHeader) wrapper.appendChild(sectionHeader);

  const row1Config = config[1] || { left: 0 };
  const orderedFeatured = rotateByStartIndex(featuredCells, row1Config.startIndex);
  const [featuredCell, ...restRow1] = orderedFeatured;

  if (type === 'mobile') {
    const row2Config = config[2] || {};
    const allCells = [featuredCell, ...restRow1, ...carouselCells];
    const orderedCells = rotateByStartIndex(allCells, row2Config.startIndex);
    wrapper.appendChild(buildCarouselRow(orderedCells, { showControls: false }));
    return wrapper;
  }

  const featured = buildFeatured(featuredCell);
  if (featured) wrapper.appendChild(featured);

  const row2Config = config[2] || {};
  const remainingCells = [...restRow1, ...carouselCells];
  const orderedCarousel = rotateByStartIndex(remainingCells, row2Config.startIndex);
  const carousel = buildCarouselRow(orderedCarousel);
  wrapper.appendChild(carousel);

  return wrapper;
}

function decorateContent(el) {
  try {
    if (!el) return;

    const children = Array.from(el.children);
    const configContainer = children[0];
    const rowContainers = children.slice(1);

    if (!configContainer || rowContainers.length === 0) {
      logError('Missing required structure (Config, Row content)');
      return;
    }

    const configMap = parseConfigBlock(configContainer);
    const featuredCells = extractCells(rowContainers[0]);
    const carouselCells = rowContainers.slice(1).flatMap((container) => extractCells(container));

    el.innerHTML = '';
    const foreground = createTag('div', { class: 'foreground' });
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Featured video gallery');

    const fragment = document.createDocumentFragment();
    VIEW_TYPES.forEach((type) => {
      const config = resolveViewData(type, configMap);
      const viewEl = createViewElement(type, config, featuredCells, carouselCells);
      fragment.appendChild(viewEl);
    });
    foreground.appendChild(fragment);
    el.appendChild(foreground);
  } catch (err) {
    logError('Failed to decorate content', err);
  }
}

export default function init(el) {
  try {
    el.classList.add('con-block');
    decorateContent(el);
  } catch (err) {
    window.lana?.log(`Bento grid Init Error: ${err}`, LANA_OPTIONS);
  }
}
