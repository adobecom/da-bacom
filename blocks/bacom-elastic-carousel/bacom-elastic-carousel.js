import { LIBS } from '../../scripts/scripts.js';

let decorateBlockText;
let createTag;
let getFederatedUrl;
let processTrackingLabels;

const MIN_SLIDES_FOR_CONTROLS = 3;

const isSvgUrl = (url) => /\.svg(\?.*)?$/i.test(url || '');
const isRtl = () => document.documentElement.getAttribute('dir') === 'rtl';
const isMobile = () => window.matchMedia('(width < 768px)').matches;

const getCarouselName = (link) => link?.innerText?.split('|')?.[1]?.trim() || 'Adobe slides';

const ARROW_ICON = '<span class="elastic-carousel-arrow-icon"></span>';

function attachHoverVideo(item) {
  const video = item.querySelector('.elastic-carousel-item-media video');
  if (!video) return;
  const play = () => { video.play().catch(() => {}); };
  const rewind = () => { video.pause(); video.currentTime = 0; };
  item.addEventListener('mouseenter', play);
  item.addEventListener('mouseleave', rewind);
  item.addEventListener('focus', play);
  item.addEventListener('blur', rewind);
}

function attachDescriptionToggle(item) {
  const container = item.querySelector('.elastic-carousel-item-container');
  const toggle = item.querySelector('.elastic-carousel-item-toggle');
  if (!container || !toggle) return;
  toggle.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!container.classList.contains('expanded')) {
      container.style.height = `${container.getBoundingClientRect().height}px`;
    }
    const expanded = container.classList.toggle('expanded');
    if (!expanded) container.style.height = '';
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? 'Show less' : 'Show more');
  });
}

const buildSlide = ({ slide, index, slidesTotal }) => {
  const children = [...slide.children];
  const left = children[0];
  const right = children[1];

  const [iconContainer, heading, linkName, description] = left.children;
  const icon = iconContainer?.querySelector('img');
  const asset = right.children[0];
  const link = left.lastElementChild?.querySelector('a');
  const videoUrlMatch = right.textContent.match(/https?:\/\/\S+\.mp4\b/i);
  const videoSource = videoUrlMatch?.[0] || asset?.dataset.videoSource;

  linkName?.classList.add('elastic-carousel-item-title');
  description?.classList.add('elastic-carousel-item-description');

  if (videoSource) {
    asset.removeAttribute('src');
    asset.setAttribute('preload', 'none');
    asset.appendChild(createTag('source', { src: videoSource, type: 'video/mp4' }));
    asset.setAttribute('muted', true);
    asset.setAttribute('tabindex', '-1');
    asset.removeAttribute('controls');
  }

  if (isSvgUrl(asset?.src)) asset.src = getFederatedUrl(asset.src);
  if (isSvgUrl(icon?.src)) icon.src = getFederatedUrl(icon.src);

  decorateBlockText(left);

  const headingClass = linkName && [...linkName.classList].find((c) => c.startsWith('heading-'));
  if (headingClass) linkName.classList.remove(headingClass);

  const content = `
    <div class='elastic-carousel-item-container' id='elastic-carousel-slide-${index + 1}'>
      <div class='elastic-carousel-item-header'>
        <div class='elastic-carousel-item-header-row'>
          ${icon.outerHTML}
          ${heading?.outerHTML}
          <button type='button' class='elastic-carousel-item-toggle' aria-expanded='false' aria-label='Show more'>
            <span class='elastic-carousel-item-toggle-icon'></span>
          </button>
        </div>
        ${description?.outerHTML}
      </div>
      <div class='elastic-carousel-item-media'>
        ${asset.outerHTML}
      </div>
      <div class='elastic-carousel-item-footer'>
        ${linkName?.outerHTML}
        <span class='elastic-carousel-item-chevron'></span>
      </div>
    </div>
  `;

  let ariaLabel = `${index + 1} of ${slidesTotal}`;
  if (index === 0) ariaLabel = `${getCarouselName(link)}, carousel. ${ariaLabel}`;

  const item = createTag('a', {
    class: 'elastic-carousel-item',
    tabindex: 0,
    href: link?.href,
    'data-index': index + 1,
    role: 'link',
    ...(isMobile() && {
      'aria-roledescription': 'slide',
      'aria-label': ariaLabel,
    }),
    'aria-describedby': `elastic-carousel-slide-${index + 1}`,
    'daa-ll': `${processTrackingLabels(linkName?.textContent)}-${index + 1}--${processTrackingLabels(heading?.textContent)}`,
  }, content);

  attachHoverVideo(item);
  attachDescriptionToggle(item);

  item.addEventListener('click', (event) => {
    if (isMobile() && !event.target.closest('.elastic-carousel-item-footer')) {
      event.preventDefault();
    }
  });

  const wrap = createTag('div', { class: 'elastic-carousel-item-wrap' });
  wrap.append(item);
  return wrap;
};

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
  const card = container.querySelector('.elastic-carousel-item');
  if (!card) return;
  const gap = parseFloat(getComputedStyle(container).columnGap) || 0;
  const amount = (card.offsetWidth + gap) * direction * (isRtl() ? -1 : 1);
  container.scrollBy({ left: amount, behavior: 'smooth' });
}

function buildControls(container) {
  const controls = createTag('div', { class: 'elastic-carousel-controls' });
  const prevBtn = createTag('button', {
    type: 'button',
    class: 'elastic-carousel-arrow elastic-carousel-arrow-prev',
    'aria-label': 'Previous',
  }, ARROW_ICON);
  const nextBtn = createTag('button', {
    type: 'button',
    class: 'elastic-carousel-arrow elastic-carousel-arrow-next',
    'aria-label': 'Next',
  }, ARROW_ICON);

  prevBtn.addEventListener('click', () => scrollByCard(container, -1));
  nextBtn.addEventListener('click', () => scrollByCard(container, 1));

  container.addEventListener('scroll', () => updateArrowState(container, prevBtn, nextBtn));
  window.addEventListener('resize', () => updateArrowState(container, prevBtn, nextBtn));
  requestAnimationFrame(() => updateArrowState(container, prevBtn, nextBtn));

  controls.append(prevBtn, nextBtn);
  return controls;
}

const STACK_PEEK_HEIGHT = 20;
const STACK_MAX_PEEKS = 2;
const STACK_SWIPE_THRESHOLD = 30;
const STACK_CONTAINER_HEIGHT = 485 + (STACK_MAX_PEEKS * STACK_PEEK_HEIGHT);

function buildScrubber(total) {
  const scrubber = createTag('div', { class: 'elastic-carousel-scrubber' });
  const fill = createTag('div', { class: 'elastic-carousel-scrubber-fill' });
  scrubber.append(fill);

  const update = (index) => {
    const progress = total > 1 ? index / (total - 1) : 0;
    fill.style.transform = `scaleY(${Math.min(1, Math.max(0, progress))})`;
  };
  update(0);

  return { scrubber, update };
}

function attachMobileStack(wraps, onIndexChange) {
  let current = 0;

  const render = () => {
    wraps.forEach((wrap, i) => {
      if (!isMobile()) {
        wrap.style.top = '';
        return;
      }
      const rel = i - current;
      if (rel > 0) {
        wrap.style.top = `${STACK_CONTAINER_HEIGHT}px`;
      } else {
        const clampedRel = Math.max(rel, -STACK_MAX_PEEKS);
        wrap.style.top = `${(clampedRel + STACK_MAX_PEEKS) * STACK_PEEK_HEIGHT}px`;
      }
    });
    onIndexChange(current);
  };

  const goTo = (index) => {
    current = Math.min(wraps.length - 1, Math.max(0, index));
    render();
  };

  render();
  window.addEventListener('resize', render);

  let startY = null;
  const onStart = (event) => { if (isMobile()) startY = (event.touches?.[0] ?? event).clientY; };
  const onEnd = (event) => {
    if (startY === null) return;
    const endY = (event.changedTouches?.[0] ?? event).clientY;
    const delta = startY - endY;
    startY = null;
    if (Math.abs(delta) < STACK_SWIPE_THRESHOLD) return;
    goTo(current + (delta > 0 ? 1 : -1));
  };

  return { onStart, onEnd, goTo };
}

function upgradeVideoPreload(carousel) {
  const videos = [...carousel.querySelectorAll('video')];
  if (!videos.length) return;
  const controller = new AbortController();
  const upgrade = () => {
    videos.forEach((video) => { video.preload = 'metadata'; });
    controller.abort();
  };
  ['scroll', 'mousemove', 'touchstart', 'keydown'].forEach((event) => {
    window.addEventListener(event, upgrade, { signal: controller.signal, once: true });
  });
}

const decorateCarousel = (carousel) => {
  const slides = [...carousel.children];
  if (isRtl()) slides.reverse();
  const decoratedSlides = slides.map((slide, index) => buildSlide(
    { slide, index, slidesTotal: slides.length },
  ));

  const carouselContainer = createTag('div', { class: 'elastic-carousel-container' });
  carouselContainer.append(...decoratedSlides);

  carousel.replaceChildren();
  carousel.append(carouselContainer);

  if (slides.length > MIN_SLIDES_FOR_CONTROLS) {
    carousel.append(buildControls(carouselContainer));
  }

  const { scrubber, update: updateScrubber } = buildScrubber(decoratedSlides.length);
  carousel.append(scrubber);

  let currentIndex = 0;
  const stack = attachMobileStack(decoratedSlides, (index) => {
    currentIndex = index;
    updateScrubber(index);
  });
  carouselContainer.addEventListener('touchstart', stack.onStart, { passive: true });
  carouselContainer.addEventListener('touchend', stack.onEnd);
  carouselContainer.addEventListener('mousedown', stack.onStart);
  carouselContainer.addEventListener('mouseup', stack.onEnd);

  let wheelCooldown = false;
  carouselContainer.addEventListener('wheel', (event) => {
    if (!isMobile() || wheelCooldown) return;
    event.preventDefault();
    wheelCooldown = true;
    setTimeout(() => { wheelCooldown = false; }, 400);
    stack.goTo(currentIndex + (event.deltaY > 0 ? 1 : -1));
  }, { passive: false });

  carousel.dataset.role = 'group';
  carousel.dataset.ariaRoledescription = 'carousel';
  carousel.dataset.ariaLabel = getCarouselName(slides[0]?.querySelector('a'));
  carousel.dataset.ariaRole = 'group';
  return carousel;
};

export default async function init(el) {
  ({ decorateBlockText } = await import(`${LIBS}/utils/decorate.js`));
  ({ createTag, getFederatedUrl } = await import(`${LIBS}/utils/utils.js`));
  ({ processTrackingLabels } = await import(`${LIBS}/martech/attributes.js`));

  upgradeVideoPreload(decorateCarousel(el));
}
