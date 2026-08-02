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
const ARROW_ICON = '<span class="grid-carousel-arrow-icon"></span>';

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

function extractCells(container) {
  if (!container) return [];
  return Array.from(container.children).map((child) => {
    const pic = child.querySelector('picture');
    const heading = child.querySelector('h1, h2, h3, h4, h5, h6');
    const paragraphs = Array.from(child.querySelectorAll('p'));
    const videoPara = paragraphs.find((p) => /https?:\/\/\S+\.mp4\b/i.test(p.textContent));
    const descPara = paragraphs.find((p) => p !== videoPara
      && !p.querySelector('picture')
      && p.textContent.trim());
    const videoMatch = (videoPara || child).textContent.match(/https?:\/\/\S+\.mp4\b/i);

    return {
      pictureHTML: pic ? pic.outerHTML : '',
      videoSrc: videoMatch?.[0] || null,
      heading: heading?.textContent.trim() || '',
      description: descPara?.textContent.trim() || '',
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

function attachVideoTrigger(item, mediaEl, videoSrc) {
  item.href = videoSrc;
  item.classList.add('has-video');

  const playIcon = document.createElement('span');
  playIcon.className = 'grid-item-play';
  playIcon.setAttribute('aria-hidden', 'true');
  playIcon.innerHTML = PLAY_SVG;
  (mediaEl || item).appendChild(playIcon);

  item.addEventListener('click', (event) => {
    event.preventDefault();
    openVideoModal(videoSrc);
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

  const item = document.createElement(cell.videoSrc ? 'a' : 'div');
  item.className = 'bento-featured';
  item.append(text, media);

  if (cell.videoSrc) attachVideoTrigger(item, media, cell.videoSrc);

  return item;
}

function buildCarouselCard(cell, loadMode) {
  if (!cell?.pictureHTML) return null;

  const media = buildMedia(cell, loadMode, 'grid-item-media');
  if (!media) return null;

  const item = document.createElement(cell.videoSrc ? 'a' : 'div');
  item.className = 'grid-item';
  item.appendChild(media);

  if (cell.heading || cell.description) {
    item.appendChild(buildTextBlock({
      className: 'grid-item-text',
      heading: cell.heading,
      description: cell.description,
      showWatchLink: !!cell.videoSrc,
    }));
  }

  if (cell.videoSrc) attachVideoTrigger(item, media, cell.videoSrc);

  return item;
}

function updateArrowState(container, prevBtn, nextBtn) {
  const maxScroll = container.scrollWidth - container.clientWidth;
  const { scrollLeft } = container;
  if (isRtl()) {
    prevBtn.disabled = scrollLeft >= -1;
    nextBtn.disabled = scrollLeft <= -maxScroll + 1;
  } else {
    prevBtn.disabled = scrollLeft <= 1;
    nextBtn.disabled = scrollLeft >= maxScroll - 1;
  }
}

function scrollByCard(container, direction) {
  const card = container.querySelector('.grid-item');
  if (!card) return;
  const gap = parseFloat(getComputedStyle(container).columnGap) || 0;
  const amount = (card.offsetWidth + gap) * direction * (isRtl() ? -1 : 1);
  container.scrollBy({ left: amount, behavior: 'smooth' });
}

function buildCarouselControls(container) {
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

  container.addEventListener('scroll', () => updateArrowState(container, prevBtn, nextBtn));
  window.addEventListener('resize', () => updateArrowState(container, prevBtn, nextBtn));
  updateArrowState(container, prevBtn, nextBtn);

  controls.append(prevBtn, nextBtn);
  return controls;
}

function rotateByStartIndex(cells, startIndex) {
  if (!startIndex || startIndex <= 0 || cells.length === 0) return cells;
  const rotation = (startIndex - 1) % cells.length;
  return [...cells.slice(rotation), ...cells.slice(0, rotation)];
}

function buildCarouselRow(cells, rowConfig) {
  const container = createTag('div', { class: 'grid-carousel-container' });
  if (rowConfig.left) container.style.marginLeft = `${rowConfig.left}px`;

  cells.forEach((cell, index) => {
    const card = buildCarouselCard(cell, index === 0 ? 'eager' : 'lazy');
    if (card) container.appendChild(card);
  });

  const wrapper = createTag('div', { class: 'grid-carousel' });
  wrapper.appendChild(container);

  if (container.children.length > MIN_CAROUSEL_FOR_CONTROLS) {
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

  const row1Config = config[1] || { left: 0 };
  const orderedFeatured = rotateByStartIndex(featuredCells, row1Config.startIndex);
  const [featuredCell, ...restRow1] = orderedFeatured;

  const featured = buildFeatured(featuredCell);
  if (featured) wrapper.appendChild(featured);

  const row2Config = config[2] || { left: 0 };
  const carousel = buildCarouselRow([...restRow1, ...carouselCells], row2Config);
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
