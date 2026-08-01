import { LIBS } from '../../scripts/scripts.js';

let decorateBlockText;
let createTag;
let getFederatedUrl;
let processTrackingLabels;

const MIN_SLIDES_FOR_CONTROLS = 3;

const isSvgUrl = (url) => /\.svg(\?.*)?$/i.test(url || '');
const isRtl = () => document.documentElement.getAttribute('dir') === 'rtl';
const isMobile = () => window.innerWidth <= 768;

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
  const toggle = item.querySelector('.elastic-carousel-item-toggle');
  const footer = item.querySelector('.elastic-carousel-item-footer');
  if (!toggle || !footer) return;
  toggle.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const expanded = footer.classList.toggle('expanded');
    toggle.setAttribute('aria-expanded', String(expanded));
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

  const content = `
    <div class='elastic-carousel-item-container' id='elastic-carousel-slide-${index + 1}'>
      <div class='elastic-carousel-item-header'>
        ${icon.outerHTML}
        ${heading?.outerHTML}
      </div>
      <div class='elastic-carousel-item-media'>
        ${asset.outerHTML}
      </div>
      <div class='elastic-carousel-item-footer'>
        <div class='elastic-carousel-item-title-row'>
          ${linkName?.outerHTML}
          <button type='button' class='elastic-carousel-item-toggle' aria-expanded='false' aria-label='Show more'>
            <span class='elastic-carousel-item-toggle-icon'></span>
          </button>
        </div>
        ${description?.outerHTML}
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

  return item;
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
  updateArrowState(container, prevBtn, nextBtn);

  controls.append(prevBtn, nextBtn);
  return controls;
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
