import { LIBS } from '../../scripts/scripts.js';

let decorateBlockText;
let createTag;
let getFederatedUrl;

function isLinkOnlyContent(linkContainer, aTag) {
  return aTag && aTag.textContent.trim() === linkContainer.textContent.trim();
}

const isSvgUrl = (url) => /\.svg(\?.*)?$/i.test(url || '');

const MAX_GRID_ITEMS = 3;

const isRtl = () => document.documentElement.getAttribute('dir') === 'rtl';

const ARROW_ICON = `
  <svg class="news-carousel-arrow-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    <path d="M4 10h12M11 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>`;

function scrollByCard(container, direction) {
  const card = container.querySelector('.news-item');
  if (!card) return;
  const gap = parseFloat(getComputedStyle(container).columnGap) || 0;
  const amount = (card.offsetWidth + gap) * direction * (isRtl() ? -1 : 1);
  container.scrollBy({ left: amount, behavior: 'smooth' });
}

function isLastCardVisible(container) {
  const cards = container.querySelectorAll('.news-item');
  const lastCard = cards[cards.length - 1];
  if (!lastCard) return true;
  const cardRect = lastCard.getBoundingClientRect();
  const frameRect = container.getBoundingClientRect();
  return cardRect.left >= frameRect.left - 1 && cardRect.right <= frameRect.right + 1;
}

function updateArrowState(container, prevBtn, nextBtn) {
  const { scrollLeft } = container;
  prevBtn.disabled = isRtl() ? scrollLeft >= -1 : scrollLeft <= 1;
  nextBtn.disabled = isLastCardVisible(container);
}

function buildCarouselControls(container) {
  const controls = createTag('div', { class: 'news-carousel-controls' });
  const prevBtn = createTag('button', { type: 'button', class: 'news-carousel-arrow news-carousel-arrow-prev', 'aria-label': 'Previous' }, ARROW_ICON);
  const nextBtn = createTag('button', { type: 'button', class: 'news-carousel-arrow news-carousel-arrow-next', 'aria-label': 'Next' }, ARROW_ICON);

  prevBtn.addEventListener('click', () => scrollByCard(container, -1));
  nextBtn.addEventListener('click', () => scrollByCard(container, 1));
  controls.append(prevBtn, nextBtn);

  const refresh = () => updateArrowState(container, prevBtn, nextBtn);
  container.addEventListener('scroll', refresh);
  window.addEventListener('resize', refresh);
  requestAnimationFrame(refresh);

  return controls;
}

function formatHeader(row) {
  row.classList.add('news-headline');
  const headlineText = row.querySelector('h1, h2, h3, h4, h5, h6, p:not(:has(picture))');
  const headlinePicture = row.querySelector('picture');
  headlineText.classList.add('eyebrow');
  const headlineEl = createTag('div', { class: 'headline-text' }, headlineText);
  const headline = createTag('div', { class: 'headline' }, headlineEl);
  row.appendChild(headline);

  if (headlinePicture) {
    const iconImg = headlinePicture.querySelector('img');
    if (iconImg?.hasAttribute('src') && isSvgUrl(iconImg?.src)) iconImg.src = getFederatedUrl(iconImg.getAttribute('src'));
    iconImg.classList.add('icon');
    headline.prepend(headlinePicture);
  }
  row.firstElementChild.remove();
}

export default async function init(el) {
  ({ decorateBlockText } = await import(`${LIBS}/utils/decorate.js`));
  ({ createTag, getFederatedUrl } = await import(`${LIBS}/utils/utils.js`));

  let rows = el.querySelectorAll(':scope > div');
  if (rows.length === 1) return;
  const [head, ...tail] = rows;
  formatHeader(head);
  rows = tail;
  const isCarousel = rows.length > MAX_GRID_ITEMS;
  const upsMap = { 2: 'two-up', 3: 'three-up', 4: 'four-up', 6: 'six-up' };
  const itemsClass = isCarousel
    ? 'news-items news-carousel'
    : `news-items parallax-stagger-ltr ${upsMap[rows.length || 3]}`;
  const newsItems = createTag('div', { class: itemsClass }, rows);
  el.appendChild(newsItems);
  rows.forEach((row) => {
    row.classList.add('news-item');
    row.querySelector(':scope > div:not([class])').classList.add('foreground');
    decorateBlockText(row, { heading: '5' });
    const contents = row.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
    contents.forEach((content, indx) => {
      const linkEl = content.querySelector('a');
      if (indx === 0) content.classList.add('news-item-headline');
      else if (isLinkOnlyContent(content, linkEl)) {
        content.classList.add('news-item-link');
        linkEl.classList.add('standalone-link', 'label', `${el.classList.contains('quiet') ? 'quiet' : ''}`);
      } else content.classList.add('news-item-body');
    });
  });

  if (isCarousel) el.appendChild(buildCarouselControls(newsItems));
}
