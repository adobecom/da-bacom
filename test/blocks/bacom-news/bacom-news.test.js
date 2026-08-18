import { expect } from '@esm-bundle/chai';
import init from '../../../blocks/bacom-news/bacom-news.js';

window.lana = { log: () => {} };

// Builds the authored (pre-block-decoration) markup: a header row followed by
// `count` news-item rows, each with a headline, body copy, and a standalone
// "Read story" link — the shape init() expects.
const buildBlock = (count, variantClasses = '') => {
  const items = Array.from({ length: count }, (_, i) => `
    <div>
      <div>
        <h3 id="headline-${i}">Headline ${i}</h3>
        <p>Body copy for story ${i}.</p>
        <p><a href="https://example.com/story-${i}">Read story | Story ${i}</a></p>
      </div>
    </div>`).join('');
  document.body.innerHTML = `
    <div class="bacom-news ${variantClasses}">
      <div>
        <div>
          <p><a href="https://example.com/icon.svg">https://example.com/icon.svg | Adobe news</a></p>
          <h2 id="adobe-news">Adobe News</h2>
        </div>
      </div>
      ${items}
    </div>`;
  return document.querySelector('.bacom-news');
};

describe('bacom-news', () => {
  describe('grid mode (<= 3 items)', () => {
    let el;
    before(async () => {
      el = buildBlock(3, 'quiet');
      await init(el);
    });

    it('keeps the N-up grid for 3 items', () => {
      const items = el.querySelector('.news-items');
      expect(items).to.exist;
      expect(items.classList.contains('three-up')).to.be.true;
      expect(items.classList.contains('news-carousel')).to.be.false;
    });

    it('does not render carousel controls', () => {
      expect(el.querySelector('.news-carousel-controls')).to.be.null;
      expect(el.querySelectorAll('.news-item').length).to.equal(3);
    });
  });

  describe('carousel mode (> 3 items)', () => {
    let el;
    before(async () => {
      el = buildBlock(5, 'quiet');
      await init(el);
    });

    it('switches the items container to a carousel and drops the n-up grid class', () => {
      const items = el.querySelector('.news-items');
      expect(items.classList.contains('news-carousel')).to.be.true;
      ['two-up', 'three-up', 'four-up', 'six-up'].forEach((cls) => {
        expect(items.classList.contains(cls)).to.be.false;
      });
    });

    it('renders every news item as a card', () => {
      expect(el.querySelectorAll('.news-items.news-carousel .news-item').length).to.equal(5);
    });

    it('renders prev/next arrow controls with accessible labels', () => {
      const controls = el.querySelector('.news-carousel-controls');
      expect(controls).to.exist;
      const prev = controls.querySelector('.news-carousel-arrow-prev');
      const next = controls.querySelector('.news-carousel-arrow-next');
      expect(controls.querySelectorAll('.news-carousel-arrow').length).to.equal(2);
      expect(prev.getAttribute('type')).to.equal('button');
      expect(prev.getAttribute('aria-label')).to.have.length.greaterThan(0);
      expect(next.getAttribute('aria-label')).to.have.length.greaterThan(0);
    });

    it('renders an arrow icon in each control', () => {
      const icons = el.querySelectorAll('.news-carousel-arrow .news-carousel-arrow-icon');
      expect(icons.length).to.equal(2);
    });
  });

  describe('single row', () => {
    it('returns early and does not decorate', async () => {
      document.body.innerHTML = '<div class="bacom-news"><div><div><h2>Only</h2></div></div></div>';
      const el = document.querySelector('.bacom-news');
      await init(el);
      expect(el.querySelector('.news-items')).to.be.null;
    });
  });
});
