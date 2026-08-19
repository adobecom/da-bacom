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

    // Paging now rides native scroll (scrollLeft/scrollWidth), so this needs real dimensions
    // that the external block CSS would normally supply but isn't loaded here.
    it('advances and clamps the prev/next disabled state at the ends', async () => {
      const el = buildBlock(8, 'limited');
      const style = document.createElement('style');
      style.textContent = `
        .elastic-carousel-viewport { width: 300px; }
        .elastic-carousel-container { display: flex; overflow-x: auto; column-gap: 10px; }
        .elastic-carousel-item { flex: 0 0 100px; width: 100px; }
      `;
      document.head.appendChild(style);

      const controller = await init(el);
      const container = el.querySelector('.elastic-carousel-container');
      const prev = el.querySelector('.elastic-carousel-limited-control.prev');
      const next = el.querySelector('.elastic-carousel-limited-control.next');

      await new Promise((resolve) => { requestAnimationFrame(resolve); });
      expect(prev.disabled).to.be.true; // start: nothing to scroll back to
      expect(next.disabled).to.be.false; // 8 cards overflow the 300px viewport

      await new Promise((resolve) => {
        container.addEventListener('scrollend', resolve, { once: true });
        next.click();
      });
      expect(container.scrollLeft).to.be.greaterThan(0); // a real click actually scrolled
      expect(prev.disabled).to.be.false; // advanced off the start

      // Jump to the extremes directly (native clamp) rather than waiting out animated clicks.
      container.scrollLeft = container.scrollWidth;
      container.dispatchEvent(new Event('scroll'));
      expect(next.disabled).to.be.true; // reached the last page
      expect(prev.disabled).to.be.false;

      container.scrollLeft = -1;
      container.dispatchEvent(new Event('scroll'));
      expect(prev.disabled).to.be.true;
      expect(next.disabled).to.be.false;

      controller?.abort?.();
      document.head.removeChild(style);
    });

    it('hides controls when there is nothing to page (<= 2 slides)', async () => {
      const el = buildBlock(2, 'limited');
      await init(el);
      // viewport still wraps, but no controls since 2 cards never overflow at any breakpoint
      expect(el.querySelector('.elastic-carousel-viewport')).to.exist;
      expect(el.querySelector('.elastic-carousel-limited-controls')).to.be.null;
    });

    // --limited-visible-slides is the same CSS var bacom-elastic-carousel.css sets to 3 on
    // desktop and 2 on tablet; setting it inline here stands in for each breakpoint since the
    // real stylesheet (and its media queries) isn't loaded in this test environment.
    it('hides the whole controls row once the breakpoint already shows every card (3 desktop, 2 tablet)', async () => {
      const el = buildBlock(3, 'limited');
      el.style.setProperty('--limited-visible-slides', '3');
      const controller = await init(el);
      // decorateLimitedCarousel's initial check runs on the next animation frame.
      await new Promise((resolve) => { requestAnimationFrame(resolve); });

      expect(el.classList.contains('limited-static')).to.be.true; // 3 slides <= 3 visible (desktop)

      el.style.setProperty('--limited-visible-slides', '2');
      window.dispatchEvent(new Event('resize'));
      expect(el.classList.contains('limited-static')).to.be.false; // 3 slides > 2 visible (tablet)

      controller?.abort?.();
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

  describe('missing icon', () => {
    // Authors can remove the icon entirely, which removes its wrapping element rather than
    // leaving an empty placeholder — the left column shifts up by one child.
    it('decorates the card correctly when the icon element is absent', async () => {
      document.body.innerHTML = `<div class="bacom-elastic-carousel">
        <div>
          <div>
            <p>Eyebrow label</p>
            <h3 id="heading-noicon">No Icon Heading</h3>
            <p>Description text for the no-icon card.</p>
            <p><a href="https://example.com/no-icon">No Icon | Adobe slides</a></p>
          </div>
          <div>
            <picture><img alt="media"></picture>
            <a href="https://example.com/media.mp4">media</a>
          </div>
        </div>
      </div>`;
      const el = document.querySelector('.bacom-elastic-carousel');
      await init(el);

      const item = el.querySelector('.elastic-carousel-item');
      const header = item.querySelector('.elastic-carousel-item-header');
      expect(header.querySelector('img')).to.be.null;
      expect(header.textContent).to.not.contain('undefined');
      expect(header.textContent.trim()).to.equal('Eyebrow label');
      expect(item.querySelector('.elastic-carousel-item-footer h3')?.textContent).to.equal('No Icon Heading');
      expect(item.href).to.equal('https://example.com/no-icon');
    });
  });

  describe('headline tag-agnostic header', () => {
    // Authors changed their pattern and mark the card headline up as an <h3> instead of a <p>.
    // The header must keep its compact style regardless of the authored tag, so the block
    // normalizes the headline to a <p> rather than letting decorateBlockText size a heading large.
    const buildSimpleBlock = (count = 3, variantClasses = '') => {
      const slides = Array.from({ length: count }, (_, i) => `
        <div>
          <div>
            <h3 id="headline-${i}">Headline ${i}</h3>
            <p>Description text for card ${i}.</p>
            <p><a href="https://example.com/card-${i}">Explore ${i}</a></p>
          </div>
          <div>
            <picture><img alt="media ${i}"></picture>
          </div>
        </div>`).join('');
      document.body.innerHTML = `<div class="bacom-elastic-carousel ${variantClasses}">${slides}</div>`;
      return document.querySelector('.bacom-elastic-carousel');
    };

    it('renders the headline as a paragraph even when authored as a heading', async () => {
      const el = buildSimpleBlock(3);
      await init(el);
      const header = el.querySelector('.elastic-carousel-item-header');
      expect(header.querySelector('h1, h2, h3, h4, h5, h6')).to.be.null;
      const p = header.querySelector('p');
      expect(p).to.exist;
      expect(p.textContent).to.contain('Headline 0');
    });

    it('appends the CTA chevron to a footer link authored as an anchor', async () => {
      const el = buildSimpleBlock(3, 'expand-content');
      await init(el);
      const footerLinks = [...el.querySelectorAll('.elastic-carousel-item-footer a')];
      expect(footerLinks.length).to.equal(3);
      footerLinks.forEach((link) => {
        expect(link.querySelector('svg.elastic-carousel-footer-chevron')).to.exist;
      });
    });
  });
});
