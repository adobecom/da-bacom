import { LIBS } from '../../scripts/scripts.js';

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

const LANA_OPTIONS = { tags: 'featured-stories', errorType: 'i' };
const VIEW_TYPES = ['mobile', 'tablet', 'desktop'];
const MIN_CAROUSEL_FOR_CONTROLS = 3;

const PLAY_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18" class="icon-milo icon-milo-play"><path fill="currentColor" fill-rule="evenodd" d="M4.73,2H3.5a.5.5,0,0,0-.5.5v13a.5.5,0,0,0,.5.5H4.73a1,1,0,0,0,.5035-.136l11.032-6.433a.5.5,0,0,0,0-.862L5.2335,2.136A1,1,0,0,0,4.73,2Z"/></svg>';
const ARROW_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" class="fs-carousel-arrow-svg"><path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function logError(message, error) {
  window.lana?.log(`Featured stories ${message}: ${error}`, LANA_OPTIONS);
}

function isRtl() {
  return document.documentElement.getAttribute('dir') === 'rtl';
}

const isHeading = (node) => /^H[1-6]$/.test(node.tagName);

function extractCell(cell) {
  const pic = cell.querySelector('picture');
  const heading = Array.from(cell.children).find(isHeading);
  const paragraphs = Array.from(cell.querySelectorAll('p'));
  const videoPara = paragraphs.find((p) => /https?:\/\/\S+\.mp4\b/i.test(p.textContent));
  const descPara = paragraphs.find((p) => p !== videoPara
    && !p.querySelector('picture')
    && p.textContent.trim());
  const videoMatch = (videoPara || cell).textContent.match(/https?:\/\/\S+\.mp4\b/i);

  return {
    pictureHTML: pic ? pic.outerHTML : '',
    videoSrc: videoMatch?.[0] || null,
    heading: heading?.textContent.trim() || '',
    description: descPara?.textContent.trim() || '',
  };
}

function extractCells(el) {
  if (!el) return [];
  return Array.from(el.children)
    .flatMap((row) => Array.from(row.children))
    .map(extractCell);
}

async function openVideoModal(videoSrc) {
  const { loadStyle } = await import(`${LIBS}/utils/utils.js`);
  const { getModal } = await import(`${LIBS}/blocks/modal/modal.js`);
  loadStyle(`${LIBS}/c2/blocks/modal/modal.css`);

  const wrapper = document.createElement('div');
  wrapper.className = 'fs-video-modal-inner';

  const video = document.createElement('video');
  video.className = 'fs-video-modal-player';
  video.controls = true;
  video.playsInline = true;
  video.autoplay = true;

  const source = document.createElement('source');
  source.type = 'video/mp4';
  source.src = videoSrc;
  video.appendChild(source);

  const errorMessage = document.createElement('p');
  errorMessage.className = 'fs-video-modal-error';
  errorMessage.textContent = 'This video is currently unavailable.';
  errorMessage.hidden = true;

  video.addEventListener('error', () => {
    video.hidden = true;
    errorMessage.hidden = false;
  }, { once: true });

  wrapper.append(video, errorMessage);

  await getModal(null, {
    id: 'featured-stories-video-modal',
    class: 'fs-video-modal',
    content: wrapper,
    closeCallback: () => video.pause(),
  });
}

function addPlayIcon(mediaEl) {
  const playIcon = document.createElement('span');
  playIcon.className = 'fs-item-play';
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

function buildTextBlock({ className, eyebrow, heading, description, showWatchLink }) {
  const wrap = document.createElement('div');
  wrap.className = className;

  if (eyebrow) {
    const eyebrowEl = createTag('p', { class: 'fs-eyebrow' }, eyebrow);
    wrap.appendChild(eyebrowEl);
  }
  if (heading) {
    const headingEl = document.createElement('h3');
    headingEl.className = 'fs-heading';
    headingEl.textContent = heading;
    wrap.appendChild(headingEl);
  }
  if (description) {
    const descEl = document.createElement('p');
    descEl.className = 'fs-description';
    descEl.textContent = description;
    wrap.appendChild(descEl);
  }
  if (showWatchLink) {
    const watchEl = document.createElement('span');
    watchEl.className = 'fs-watch-link';
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

  const media = buildMedia(cell, 'eager', 'fs-featured-media');
  if (!media) return null;

  const text = buildTextBlock({
    className: 'fs-featured-text',
    eyebrow: 'Featured video',
    heading: cell.heading,
    description: cell.description,
    showWatchLink: true,
  });

  const item = document.createElement(cell.videoSrc ? 'a' : 'div');
  item.className = 'fs-featured';
  item.append(text, media);

  if (cell.videoSrc) {
    attachVideoTrigger(item, media, cell.videoSrc);
  } else {
    addPlayIcon(media);
  }

  return item;
}

function buildCarouselCard(cell, loadMode) {
  if (!cell?.pictureHTML) return null;

  const media = buildMedia(cell, loadMode, 'fs-item-media');
  if (!media) return null;

  const item = document.createElement(cell.videoSrc ? 'a' : 'div');
  item.className = 'fs-item';
  item.appendChild(media);

  item.appendChild(buildTextBlock({
    className: 'fs-item-text',
    heading: cell.heading,
    description: cell.description,
    showWatchLink: true,
  }));

  if (cell.videoSrc) {
    attachVideoTrigger(item, media, cell.videoSrc);
  } else {
    addPlayIcon(media);
  }

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
  const card = container.querySelector('.fs-item');
  if (!card) return;
  const gap = parseFloat(getComputedStyle(container).columnGap) || 0;
  const amount = (card.offsetWidth + gap) * direction * (isRtl() ? -1 : 1);
  container.scrollBy({ left: amount, behavior: 'smooth' });
}

function buildCarouselControls(container) {
  const controls = createTag('div', { class: 'fs-carousel-controls' });
  const prevBtn = createTag('button', {
    type: 'button',
    class: 'fs-carousel-arrow fs-carousel-arrow-prev',
    'aria-label': 'Previous',
  }, ARROW_SVG);
  const nextBtn = createTag('button', {
    type: 'button',
    class: 'fs-carousel-arrow fs-carousel-arrow-next',
    'aria-label': 'Next',
  }, ARROW_SVG);

  prevBtn.addEventListener('click', () => scrollByCard(container, -1));
  nextBtn.addEventListener('click', () => scrollByCard(container, 1));

  container.addEventListener('scroll', () => updateArrowState(container, prevBtn, nextBtn));
  window.addEventListener('resize', () => updateArrowState(container, prevBtn, nextBtn));
  requestAnimationFrame(() => updateArrowState(container, prevBtn, nextBtn));

  controls.append(prevBtn, nextBtn);
  return controls;
}

function buildCarouselRow(cells, { showControls = true } = {}) {
  const container = createTag('div', { class: 'fs-carousel-container' });

  cells.forEach((cell, index) => {
    const card = buildCarouselCard(cell, index === 0 ? 'eager' : 'lazy');
    if (card) container.appendChild(card);
  });

  const wrapper = createTag('div', { class: 'fs-carousel' });
  wrapper.appendChild(container);

  if (showControls && container.children.length > MIN_CAROUSEL_FOR_CONTROLS) {
    wrapper.appendChild(buildCarouselControls(container));
  }

  return wrapper;
}

function createViewElement(type, cells) {
  const wrapper = createTag('div', { class: `fs-view view-${type}` });
  const [featuredCell, ...restCells] = cells;

  if (type === 'mobile') {
    wrapper.appendChild(buildCarouselRow(cells));
    return wrapper;
  }

  const featured = buildFeatured(featuredCell);
  if (featured) wrapper.appendChild(featured);

  wrapper.appendChild(buildCarouselRow(restCells));

  return wrapper;
}

function decorateContent(el) {
  try {
    if (!el) return;

    const cells = extractCells(el);
    if (cells.length === 0) {
      logError('Missing required structure (no cells found)');
      return;
    }

    el.innerHTML = '';
    const foreground = createTag('div', { class: 'foreground' });
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Featured stories gallery');

    const fragment = document.createDocumentFragment();
    VIEW_TYPES.forEach((type) => {
      fragment.appendChild(createViewElement(type, cells));
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
    window.lana?.log(`Featured stories Init Error: ${err}`, LANA_OPTIONS);
  }
}
