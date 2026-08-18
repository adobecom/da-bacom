import { LIBS } from '../../scripts/scripts.js';

let decorateBlockText;
let createTag;
let getFederatedUrl;
let sendAnalytics;
let processTrackingLabels;

const leaveTimeouts = new WeakMap();
let hoverTracked = false;
const rewindIntervals = new WeakMap();
const slideLeaveTimeouts = new WeakMap();

const isSvgUrl = (url) => /\.svg(\?.*)?$/i.test(url || '');
const isRtl = () => document.documentElement.getAttribute('dir') === 'rtl';
const isMobile = () => window.innerWidth <= 768;

// Inline icons for the expand-content variant (kept in JS to avoid extra network requests).
const EXPAND_PLUS_ICON = `
  <svg class="elastic-carousel-expand-icon elastic-carousel-expand-icon-plus" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    <path d="M10 4.5v11M4.5 10h11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
  </svg>`;
const EXPAND_MINUS_ICON = `
  <svg class="elastic-carousel-expand-icon elastic-carousel-expand-icon-minus" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    <circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" stroke-width="1.5" />
    <path d="M6.5 10h7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
  </svg>`;

const CAROUSEL_ARROW_ICON = `
  <svg class="elastic-carousel-limited-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    <path d="M4 10h12M11 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>`;

// Trailing chevron for the footer heading CTA (path/geometry from the Figma design). Uses
// currentColor so it always matches the heading text.
const FOOTER_CHEVRON_ICON = `
  <svg class="elastic-carousel-footer-chevron" viewBox="0 0 4.5 7.5" aria-hidden="true" focusable="false">
    <path d="M0.75 6.75L3.75 3.75L0.75 0.75" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>`;

const getCarouselName = (link) => link?.innerText?.split('|')?.[1]?.trim() || 'Adobe slides';

const stopRewind = (video) => {
  clearInterval(rewindIntervals.get(video));
  rewindIntervals.delete(video);
};

const rewindVideo = (video) => {
  stopRewind(video);
  video.pause();
  const startSystemTime = Date.now();
  const startVideoTime = video.currentTime;
  const intervalRewind = setInterval(() => {
    if (video.currentTime === 0) {
      stopRewind(video);
      video.load();
    } else {
      const elapsed = Date.now() - startSystemTime;
      video.currentTime = Math.max(startVideoTime - elapsed / 1000, 0);
    }
  }, 30);
  rewindIntervals.set(video, intervalRewind);
};

const handleMobileAutoplay = (carousel) => {
  const slides = [...carousel.querySelectorAll('.elastic-carousel-item')];
  const observers = [];

  slides.forEach((slide, index) => {
    const video = slide.querySelector('video');
    if (!video) return;

    const nextSlide = slides[index + 1];

    // Play when this slide enters view — but not if the next slide is already covering it
    const slideObserver = new IntersectionObserver(
      ([entry]) => {
        if (!isMobile()) return;
        if (entry.isIntersecting) {
          const nextRect = nextSlide?.getBoundingClientRect();
          const isCovered = nextRect && nextRect.top < window.innerHeight * 0.7;
          if (!isCovered) video.play().catch(() => { });
        }
      },
      { threshold: 0.6 },
    );
    slideObserver.observe(slide);
    observers.push(slideObserver);

    if (!nextSlide) return;

    // Rewind when the next slide starts covering this one;
    // play again when it uncovers (user scrolls back up)
    const nextSlideObserver = new IntersectionObserver(
      ([entry]) => {
        if (!isMobile()) return;
        if (entry.isIntersecting) {
          rewindVideo(video);
        } else {
          const rect = slide.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= window.innerHeight) {
            video.play().catch(() => { });
          }
        }
      },
      { threshold: 0.6 },
    );
    nextSlideObserver.observe(nextSlide);
    observers.push(nextSlideObserver);
  });

  return observers;
};

const disableHoverOnScroll = (carousel) => {
  let timer;
  const controller = new AbortController();
  window.addEventListener('wheel', () => {
    clearTimeout(timer);
    carousel.classList.add('disable-hover');
    timer = setTimeout(() => {
      carousel.classList.remove('disable-hover');
    }, 100);
  }, { signal: controller.signal });
  return controller;
};

const isVariant = (carousel) => !!carousel
  && (carousel.classList.contains('expand-content') || carousel.classList.contains('limited'));

const onSlideLeave = (event) => {
  const slide = event.currentTarget;
  if (isVariant(slide?.closest('.bacom-elastic-carousel'))) slide.classList.remove('hovered');

  const video = slide?.querySelector('video');
  if (!video) return;

  clearTimeout(slideLeaveTimeouts.get(video));
  slideLeaveTimeouts.set(video, setTimeout(() => {
    rewindVideo(video);
  }, 100));
};

const removeHovered = (carousel) => {
  const slides = carousel?.querySelectorAll('.elastic-carousel-item');
  [...slides]?.forEach((sld) => sld.classList.remove('hovered'));
};

const onCarouselLeave = (event) => {
  const carouselContainer = event.target;
  clearTimeout(leaveTimeouts.get(carouselContainer));
  leaveTimeouts.set(carouselContainer, setTimeout(() => {
    carouselContainer.classList.remove('stick-left', 'stick-right');
    removeHovered(carouselContainer.closest('.bacom-elastic-carousel'));
  }, 10));
};

const onHover = (event) => {
  const slideEl = event.target;
  const carouselContainer = slideEl.closest('.elastic-carousel-container');
  if (!carouselContainer) return;
  clearTimeout(leaveTimeouts.get(carouselContainer));

  const video = slideEl.querySelector('video');
  clearTimeout(slideLeaveTimeouts.get(video));
  slideLeaveTimeouts.delete(video);

  if (video) {
    stopRewind(video);
    video.play().catch(() => { });
  }

  const slideIndex = slideEl.dataset.index * 1;
  const container = slideEl.parentElement;
  if (!container) return;

  removeHovered(slideEl.closest('.bacom-elastic-carousel'));
  slideEl.classList.add('hovered');

  if (isRtl()) {
    container.classList.toggle('stick-right', slideIndex <= 3);
    container.classList.toggle('stick-left', slideIndex === 5);
  } else {
    container.classList.toggle('stick-left', slideIndex <= 3);
    container.classList.toggle('stick-right', slideIndex === 5);
  }

  if (!hoverTracked) {
    hoverTracked = true;
    const block = slideEl.closest('[daa-lh]');
    const blockName = block?.getAttribute('daa-lh');
    const section = block?.parentElement?.closest('[daa-lh]');
    const sectionName = section?.getAttribute('daa-lh');
    sendAnalytics(`user-hover|${sectionName}|${blockName}`);
  }
};

const buildSlide = ({ slide, index, slidesTotal }) => {
  const children = [...slide.children];
  const left = children[0];
  const right = children[1];
  const leftChildren = [...left.children];
  const hasIcon = !!leftChildren[0]?.querySelector('img');
  const iconContainer = hasIcon ? leftChildren.shift() : null;
  const [heading, linkName, description] = leftChildren;
  const icon = iconContainer?.querySelector('img');
  const asset = right.children[0];
  const link = left.lastElementChild?.querySelector('a');

  if (asset?.dataset.videoSource) {
    asset.setAttribute('preload', 'none');
    asset.appendChild(createTag('source', { src: asset?.dataset.videoSource, type: 'video/mp4' }));
    asset.setAttribute('muted', true);
    asset.setAttribute('tabindex', '-1');
    asset.removeAttribute('controls');
  }

  if (isSvgUrl(asset?.src)) asset.src = getFederatedUrl(asset.src);
  if (isSvgUrl(icon?.src)) icon.src = getFederatedUrl(icon.src);

  // TODO: update to ensure classes are mapped to C2 variables
  // TODO: see if eyebrow class can be applied directly to footer headline
  decorateBlockText(left);

  const content = `
    <div class='elastic-carousel-item-container' id='elastic-carousel-slide-${index + 1}'>
      <div class='elastic-carousel-item-header'>
        ${icon?.outerHTML || ''}
        ${heading?.outerHTML}
      </div>
      <div class='elastic-carousel-item-media'>
        <div class='elastic-carousel-item-media-asset'>${asset.outerHTML}</div>
      </div>
      <div class='elastic-carousel-item-footer'>
        ${linkName?.outerHTML}
        ${description?.outerHTML}
      </div>
    </div>
  `;

  let ariaLabel = `${index + 1} of ${slidesTotal}`;
  // assign unique aria-label to the first slide
  if (index === 0) ariaLabel = `${getCarouselName(link)}, carousel. ${ariaLabel}`;

  const slideEl = createTag('a', {
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

  slideEl.addEventListener('mouseleave', onSlideLeave);
  slideEl.addEventListener('mouseenter', onHover);
  slideEl.addEventListener('focus', onHover);
  return slideEl;
};

const toggleExpandContent = (event) => {
  // The card itself is an anchor; keep the toggle from navigating the card.
  event.preventDefault();
  event.stopPropagation();
  const toggle = event.currentTarget;
  const item = toggle.closest('.elastic-carousel-item');
  const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!isExpanded));
  item?.classList.toggle('expanded', !isExpanded);
};

const onToggleKeydown = (event) => {
  if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
  toggleExpandContent(event);
};

const decorateExpandSlide = (item) => {
  const header = item.querySelector('.elastic-carousel-item-header');
  const media = item.querySelector('.elastic-carousel-item-media');
  const description = item.querySelector('.elastic-carousel-item-footer p');
  if (!header || !media || !description) return;

  const regionId = `${item.querySelector('.elastic-carousel-item-container')?.id || item.dataset.index}-expand`;
  const inner = createTag('div', { class: 'elastic-carousel-expand-content-inner' }, description);
  const region = createTag('div', { class: 'elastic-carousel-expand-content', id: regionId }, inner);
  media.prepend(region);

  const toggle = createTag('span', {
    class: 'elastic-carousel-expand-toggle',
    role: 'button',
    tabindex: '0',
    'aria-expanded': 'false',
    'aria-controls': regionId,
    'aria-label': 'Toggle description',
  }, `${EXPAND_PLUS_ICON}${EXPAND_MINUS_ICON}`);
  toggle.addEventListener('click', toggleExpandContent);
  toggle.addEventListener('keydown', onToggleKeydown);
  header.append(toggle);
};

const decorateExpandContent = (carousel) => {
  if (!carousel.classList.contains('expand-content')) return;
  carousel.querySelectorAll('.elastic-carousel-item').forEach(decorateExpandSlide);
};

const decorateFooterChevron = (carousel) => {
  carousel.querySelectorAll('.elastic-carousel-item-footer :is(h1, h2, h3, h4, h5, h6)')
    .forEach((heading) => heading.insertAdjacentHTML('beforeend', FOOTER_CHEVRON_ICON));
};

// Fewest cards. Guessed 2 for tablet.
const LIMITED_MIN_VISIBLE = 2;

// Step between adjacent cards' horizontal shrink in the mobile stack (matches the base
// design's 3/2.25/1.5/.75/0rem ramp: a 0.75rem step).
const STACK_SHRINK_STEP = '0.75rem';

const decorateMobileStack = (carousel) => {
  const slides = [...carousel.querySelectorAll('.elastic-carousel-item')];
  const total = slides.length;
  if (total < 2) return;
  slides.forEach((slide, i) => {
    const n = i + 1;
    const fromEnd = total + 1 - n;
    slide.style.zIndex = `${n}`;
    slide.style.setProperty('--stack-contrast', `${(n - 1) / (total - 1)}`);
    slide.style.setProperty('--stack-shrink', `calc(${total - n} * ${STACK_SHRINK_STEP})`);
    slide.style.setProperty(
      '--stack-offset',
      `calc(var(--last-offset) - (var(--last-offset) / ${total} * ${fromEnd}) - var(--offset-variance-index) * ${fromEnd})`,
    );
  });
};

// How many cards the current breakpoint shows whole (3 desktop, 2 tablet) is read straight off
// the CSS var the layout itself is built on, so this stays in lockstep with
// bacom-elastic-carousel.css instead of duplicating the breakpoint thresholds here.
const getVisibleSlides = (carousel) => {
  const raw = parseFloat(getComputedStyle(carousel).getPropertyValue('--limited-visible-slides'));
  return Number.isFinite(raw) ? raw : 3;
};

// Native scroll (rather than a transform offset) guarantees the row can never reveal a
// previous card on the left: there's nothing to render before scrollLeft 0. Only the right
// side can bleed past the visible cards, matching the peek/bleed the design calls for.
const updateLimitedControls = (carousel, container, prevBtn, nextBtn, totalSlides) => {
  const maxScroll = container.scrollWidth - container.clientWidth;
  const { scrollLeft } = container;
  if (isRtl()) {
    prevBtn.disabled = scrollLeft >= -1;
    nextBtn.disabled = scrollLeft <= -maxScroll + 1;
  } else {
    prevBtn.disabled = scrollLeft <= 1;
    nextBtn.disabled = scrollLeft >= maxScroll - 1;
  }
  // Hides the whole controls row once the current breakpoint already shows every card at
  // once (<=3 desktop, <=2 tablet). scrollWidth alone isn't a reliable signal for this: the
  // trailing bleed-space spacer inflates it even when there's no real card left to page to.
  carousel.classList.toggle('limited-static', totalSlides <= getVisibleSlides(carousel));
};

const scrollLimitedByCard = (container, direction) => {
  const card = container.querySelector('.elastic-carousel-item');
  if (!card) return;
  const gap = parseFloat(getComputedStyle(container).columnGap) || 0;
  const amount = (card.getBoundingClientRect().width + gap) * direction * (isRtl() ? -1 : 1);
  container.scrollBy({ left: amount, behavior: 'smooth' });
};

const decorateLimitedCarousel = (carousel) => {
  if (!carousel.classList.contains('limited')) return null;
  const container = carousel.querySelector('.elastic-carousel-container');
  const slides = container ? [...container.querySelectorAll('.elastic-carousel-item')] : [];
  if (!container || !slides.length) return null;

  const viewport = createTag('div', { class: 'elastic-carousel-viewport' });
  container.before(viewport);
  viewport.append(container);

  if (slides.length <= LIMITED_MIN_VISIBLE) return null;

  // Cancels out the "peek room" built into the row's width (so a partial next card can bleed
  // into view at rest) once scrolled to the end, so the final native scroll position always
  // lands flush on a whole card instead of stopping mid-card.
  container.append(createTag('div', { class: 'elastic-carousel-limited-spacer', 'aria-hidden': 'true' }));

  const prevBtn = createTag('button', { class: 'elastic-carousel-limited-control prev', type: 'button', 'aria-label': 'Previous cards' }, CAROUSEL_ARROW_ICON);
  const nextBtn = createTag('button', { class: 'elastic-carousel-limited-control next', type: 'button', 'aria-label': 'Next cards' }, CAROUSEL_ARROW_ICON);
  prevBtn.addEventListener('click', () => scrollLimitedByCard(container, -1));
  nextBtn.addEventListener('click', () => scrollLimitedByCard(container, 1));

  const controls = createTag('div', { class: 'elastic-carousel-limited-controls' });
  controls.append(prevBtn, nextBtn);
  carousel.append(controls);

  const controller = new AbortController();
  const update = () => updateLimitedControls(carousel, container, prevBtn, nextBtn, slides.length);
  container.addEventListener('scroll', update, { signal: controller.signal });
  window.addEventListener('resize', update, { signal: controller.signal });
  requestAnimationFrame(update);

  return controller;
};

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
  carousel.dataset.role = 'group';
  carousel.dataset.ariaRoledescription = 'carousel';
  carousel.dataset.ariaLabel = getCarouselName(slides[0]?.querySelector('a'));
  carousel.dataset.ariaRole = 'group';
  return carousel;
};

const upgradeVideoPreload = (carousel) => {
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
};

export default async function init(el) {
  ({ decorateBlockText } = await import(`${LIBS}/utils/decorate.js`));
  ({ createTag, getFederatedUrl } = await import(`${LIBS}/utils/utils.js`));
  ({ sendAnalytics } = await import(`${LIBS}/martech/helpers.js`));
  ({ processTrackingLabels } = await import(`${LIBS}/martech/attributes.js`));

  const decoratedCarousel = decorateCarousel(el);
  decorateExpandContent(decoratedCarousel);
  if (isVariant(decoratedCarousel)) {
    decorateMobileStack(decoratedCarousel);
    decorateFooterChevron(decoratedCarousel);
  }
  const limitedController = decorateLimitedCarousel(decoratedCarousel);
  upgradeVideoPreload(decoratedCarousel);
  const scrollController = disableHoverOnScroll(decoratedCarousel);
  decoratedCarousel.querySelector('.elastic-carousel-container')?.addEventListener('mouseleave', onCarouselLeave);
  const mobileObservers = handleMobileAutoplay(decoratedCarousel);

  new MutationObserver((_, observer) => {
    if (!document.contains(el)) {
      scrollController.abort();
      limitedController?.abort();
      mobileObservers.forEach((o) => o.disconnect());
      observer.disconnect();
    }
  }).observe(document.body, { childList: true, subtree: true });
}
