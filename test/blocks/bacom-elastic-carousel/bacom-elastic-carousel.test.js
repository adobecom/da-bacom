import { expect } from '@esm-bundle/chai';
import init from '../../../blocks/bacom-elastic-carousel/bacom-elastic-carousel.js';

// Builds the authored (pre-block-decoration) markup: a block with `count` slides, each slide a
// div with a left column (icon img, eyebrow, heading, description, cta link) and a right column
// (picture asset + media link) — the shape buildSlide() expects.
const buildBlock = (count, variantClasses = '') => {
  const slides = Array.from({ length: count }, (_, i) => `
    <div>
      <div>
        <p><img alt="icon ${i}"></p>
        <p>Eyebrow ${i}</p>
        <h3 id="heading-${i}">Heading ${i}</h3>
        <p>Description text for card ${i}.</p>
        <p><a href="https://example.com/card-${i}">Card ${i} | Adobe slides</a></p>
      </div>
      <div>
        <picture><img alt="media ${i}"></picture>
        <a href="https://example.com/media-${i}.mp4">media ${i}</a>
      </div>
    </div>`).join('');
  document.body.innerHTML = `<div class="bacom-elastic-carousel ${variantClasses}">${slides}</div>`;
  return document.querySelector('.bacom-elastic-carousel');
};

describe('bacom-elastic-carousel', () => {
  describe('base (no variant)', () => {
    it('decorates slides without variant scaffolding', async () => {
      const el = buildBlock(4);
      await init(el);
      expect(el.querySelectorAll('.elastic-carousel-item').length).to.equal(4);
      // additive guarantee: variant-only nodes must not appear on a plain carousel
      expect(el.querySelector('.elastic-carousel-viewport')).to.be.null;
      expect(el.querySelector('.elastic-carousel-limited-controls')).to.be.null;
      expect(el.querySelector('.elastic-carousel-expand-toggle')).to.be.null;
      expect(el.querySelector('.elastic-carousel-footer-chevron')).to.be.null;
    });
  });

  describe('expand-content', () => {
    it('adds a toggle per card and expands/collapses independently', async () => {
      const el = buildBlock(3, 'expand-content');
      await init(el);

      const toggles = el.querySelectorAll('.elastic-carousel-expand-toggle');
      expect(toggles.length).to.equal(3);
      toggles.forEach((t) => expect(t.getAttribute('aria-expanded')).to.equal('false'));

      const [first, second] = [...el.querySelectorAll('.elastic-carousel-item')];
      const firstToggle = first.querySelector('.elastic-carousel-expand-toggle');

      firstToggle.click();
      expect(firstToggle.getAttribute('aria-expanded')).to.equal('true');
      expect(first.classList.contains('expanded')).to.be.true;
      // per-card: the second card stays collapsed
      expect(second.classList.contains('expanded')).to.be.false;

      firstToggle.click();
      expect(firstToggle.getAttribute('aria-expanded')).to.equal('false');
      expect(first.classList.contains('expanded')).to.be.false;
    });

    it('toggle click does not navigate the card link', async () => {
      const el = buildBlock(3, 'expand-content');
      await init(el);
      const item = el.querySelector('.elastic-carousel-item');
      let navigated = false;
      item.addEventListener('click', (e) => { navigated = true; e.preventDefault(); });
      item.querySelector('.elastic-carousel-expand-toggle').click();
      // stopPropagation keeps the click from reaching the anchor
      expect(navigated).to.be.false;
    });

    it('moves the description into the expandable panel', async () => {
      const el = buildBlock(1, 'expand-content');
      await init(el);
      const panel = el.querySelector('.elastic-carousel-expand-content .elastic-carousel-expand-content-inner');
      expect(panel).to.exist;
      expect(panel.textContent).to.contain('Description text for card 0');
    });

    it('appends the CTA chevron inside each footer heading', async () => {
      const el = buildBlock(3, 'expand-content');
      await init(el);
      const headings = [...el.querySelectorAll('.elastic-carousel-item-footer h3')];
      expect(headings.length).to.equal(3);
      headings.forEach((h) => {
        const chevron = h.querySelector('svg.elastic-carousel-footer-chevron');
        expect(chevron).to.exist;
        expect(chevron).to.equal(h.lastElementChild); // trails the text
      });
    });
  });

  describe('limited', () => {
    it('wraps the row in a clipping viewport and renders paging controls', async () => {
      const el = buildBlock(8, 'limited');
      const controller = await init(el);

      const viewport = el.querySelector('.elastic-carousel-viewport');
      expect(viewport).to.exist;
      expect(viewport.querySelector('.elastic-carousel-container')).to.exist;

      const controls = el.querySelector('.elastic-carousel-limited-controls');
      expect(controls).to.exist;
      expect(controls.querySelector('.elastic-carousel-limited-control.prev')).to.exist;
      expect(controls.querySelector('.elastic-carousel-limited-control.next')).to.exist;

      controller?.abort?.();
    });

    // Layout-independent state machine. Without the block CSS the visible count falls back to 3,
    // so 8 slides -> last index 5. (The per-breakpoint pixel paging is covered by e2e.)
    it('advances and clamps the prev/next disabled state at the ends', async () => {
      const el = buildBlock(8, 'limited');
      const controller = await init(el);
      const prev = el.querySelector('.elastic-carousel-limited-control.prev');
      const next = el.querySelector('.elastic-carousel-limited-control.next');

      expect(prev.disabled).to.be.true; // start
      expect(next.disabled).to.be.false;

      next.click();
      expect(prev.disabled).to.be.false; // advanced off the start

      for (let i = 0; i < 8; i += 1) next.click(); // page past the end; clamps
      expect(next.disabled).to.be.true; // reached the last page
      expect(prev.disabled).to.be.false;

      for (let i = 0; i < 8; i += 1) prev.click(); // back to the start; clamps
      expect(prev.disabled).to.be.true;
      expect(next.disabled).to.be.false;

      controller?.abort?.();
    });

    it('hides controls when there is nothing to page (<= 2 slides)', async () => {
      const el = buildBlock(2, 'limited');
      await init(el);
      // viewport still wraps, but no controls since 2 cards never overflow at any breakpoint
      expect(el.querySelector('.elastic-carousel-viewport')).to.exist;
      expect(el.querySelector('.elastic-carousel-limited-controls')).to.be.null;
    });
  });

  describe('mobile stack (variant, > 5 cards)', () => {
    it('assigns an increasing z-index and stack vars to every card', async () => {
      const el = buildBlock(8, 'expand-content');
      await init(el);
      const items = [...el.querySelectorAll('.elastic-carousel-item')];
      // base CSS only covers nth-child(1..5); the 6th+ must be generalized in JS
      expect(items[5].style.zIndex).to.equal('6');
      expect(items[7].style.zIndex).to.equal('8');
      expect(items[5].style.getPropertyValue('--stack-offset')).to.not.equal('');
      expect(items[5].style.getPropertyValue('--stack-contrast')).to.not.equal('');
    });
  });
});
