import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

const { default: init } = await import('../../../blocks/bento-grid/bento-grid.js');

window.lana = { log: () => {} };

describe('Bento Grid', () => {
  describe('basic content', () => {
    before(async () => {
      document.body.innerHTML = await readFile({ path: './mocks/basic.html' });
      await init(document.querySelector('.bento-grid'));
    });

    it('adds the con-block class and region role', () => {
      const block = document.querySelector('.bento-grid');
      expect(block.classList.contains('con-block')).to.be.true;
      expect(block.getAttribute('role')).to.equal('region');
    });

    it('builds mobile, tablet, and desktop views', () => {
      expect(document.querySelector('.grid-view.view-mobile')).to.exist;
      expect(document.querySelector('.grid-view.view-tablet')).to.exist;
      expect(document.querySelector('.grid-view.view-desktop')).to.exist;
    });

    it('renders the section header from the leading heading/paragraph', () => {
      const desktopView = document.querySelector('.grid-view.view-desktop');
      const header = desktopView.querySelector('.bento-section-header');
      expect(header).to.exist;
      expect(header.querySelector('.bento-section-heading').textContent).to.equal('Leadership POV');
      expect(header.querySelector('.bento-section-subtext').textContent).to.equal('Section subtext goes here.');
    });

    it('builds a featured card with heading, description, and watch link', () => {
      const desktopView = document.querySelector('.grid-view.view-desktop');
      const featured = desktopView.querySelector('.bento-featured');
      expect(featured).to.exist;
      expect(featured.querySelector('.bento-heading').textContent).to.equal('Featured heading');
      expect(featured.querySelector('.bento-description').textContent).to.equal('Featured description text.');
      expect(featured.querySelector('.bento-watch-link')).to.exist;
      expect(featured.querySelector('.grid-item-play')).to.exist;
    });

    it('resolves the featured card video source from the mp4 link and makes it a link', () => {
      const desktopView = document.querySelector('.grid-view.view-desktop');
      const featured = desktopView.querySelector('.bento-featured');
      expect(featured.tagName).to.equal('A');
      expect(featured.getAttribute('href')).to.equal('https://example.com/video1.mp4');
      expect(featured.classList.contains('has-video')).to.be.true;
    });

    it('builds the remaining cells into the carousel, excluding the featured cell', () => {
      const desktopView = document.querySelector('.grid-view.view-desktop');
      const cards = desktopView.querySelectorAll('.grid-carousel .grid-item');
      // row 1 has 2 cells (1 featured + 1 carousel), row 2 has 4 cells
      expect(cards.length).to.equal(5);
    });

    it('shows the play icon and watch link on every carousel card', () => {
      const desktopView = document.querySelector('.grid-view.view-desktop');
      const cards = [...desktopView.querySelectorAll('.grid-carousel .grid-item')];
      cards.forEach((card) => {
        expect(card.querySelector('.grid-item-play')).to.exist;
        expect(card.querySelector('.bento-watch-link')).to.exist;
      });
    });

    it('shows carousel arrow controls when there are more than 3 cards', () => {
      const desktopView = document.querySelector('.grid-view.view-desktop');
      expect(desktopView.querySelector('.grid-carousel-controls')).to.exist;
    });

    it('combines the featured cell into a single swipeable row on mobile', () => {
      const mobileView = document.querySelector('.grid-view.view-mobile');
      expect(mobileView.querySelector('.bento-featured')).to.not.exist;
      expect(mobileView.querySelector('.grid-carousel-controls')).to.not.exist;
      const cards = mobileView.querySelectorAll('.grid-carousel .grid-item');
      // all 6 cells (2 in row 1 + 4 in row 2) become carousel cards on mobile
      expect(cards.length).to.equal(6);
    });
  });

  describe('small content', () => {
    before(async () => {
      document.body.innerHTML = await readFile({ path: './mocks/small.html' });
      await init(document.querySelector('.bento-grid'));
    });

    it('does not render a section header when there is no leading heading', () => {
      const desktopView = document.querySelector('.grid-view.view-desktop');
      expect(desktopView.querySelector('.bento-section-header')).to.not.exist;
    });

    it('renders a plain div for cards without a video link', () => {
      const desktopView = document.querySelector('.grid-view.view-desktop');
      const featured = desktopView.querySelector('.bento-featured');
      expect(featured.tagName).to.equal('DIV');
      expect(featured.classList.contains('has-video')).to.be.false;
    });

    it('hides carousel arrow controls when there are 3 or fewer cards', () => {
      const desktopView = document.querySelector('.grid-view.view-desktop');
      const cards = desktopView.querySelectorAll('.grid-carousel .grid-item');
      expect(cards.length).to.equal(2);
      expect(desktopView.querySelector('.grid-carousel-controls')).to.not.exist;
    });
  });

  describe('video-fragment links (new authoring)', () => {
    before(async () => {
      document.body.innerHTML = await readFile({ path: './mocks/fragment.html' });
      await init(document.querySelector('.bento-grid'));
    });

    it('detects an mp4 from the link href even when the text is a friendly label', () => {
      const featured = document.querySelector('.grid-view.view-desktop .bento-featured');
      expect(featured.tagName).to.equal('A');
      expect(featured.getAttribute('href')).to.contain('.mp4');
      expect(featured.classList.contains('has-video')).to.be.true;
    });

    it('makes a raw /fragments/ "Watch video" link a modal trigger', () => {
      const cards = [...document.querySelectorAll('.grid-view.view-desktop .grid-carousel .grid-item')];
      const satya = cards.find((c) => c.dataset.modalPath === '/fragments/resources/videos/news-satya');
      expect(satya).to.exist;
      expect(satya.tagName).to.equal('A');
      expect(satya.getAttribute('href')).to.equal('#satya');
      expect(satya.dataset.modalHash).to.equal('#satya');
      expect(satya.querySelector('.grid-item-play')).to.exist;
    });

    it('makes a Milo-decorated modal link a modal trigger', () => {
      const cards = [...document.querySelectorAll('.grid-view.view-desktop .grid-carousel .grid-item')];
      const rachel = cards.find((c) => c.dataset.modalPath === '/fragments/resources/videos/news-rachel');
      expect(rachel).to.exist;
      expect(rachel.tagName).to.equal('A');
      expect(rachel.getAttribute('href')).to.equal('#rachel');
    });
  });

  describe('mp4 replaced by Milo video autoblock', () => {
    // Milo's video autoblock turns a raw .mp4 link into <video data-video-source="…"> (and a
    // lazy <source>), removing the <a>. Bento must still find the mp4 and open the modal.
    before(async () => {
      document.body.innerHTML = await readFile({ path: './mocks/mp4-decorated.html' });
      await init(document.querySelector('.bento-grid'));
    });

    it('opens the modal for the featured card from a <video data-video-source>', () => {
      const featured = document.querySelector('.grid-view.view-desktop .bento-featured');
      expect(featured.tagName).to.equal('A');
      expect(featured.getAttribute('href')).to.equal('https://example.com/media_feat.mp4');
      expect(featured.classList.contains('has-video')).to.be.true;
      expect(featured.querySelector('.grid-item-play')).to.exist;
    });

    it('does not leak the video url into the description', () => {
      const featured = document.querySelector('.grid-view.view-desktop .bento-featured');
      expect(featured.querySelector('.bento-description').textContent).to.equal('Featured description.');
    });

    it('opens the modal for a carousel card from a nested <source>', () => {
      const cards = [...document.querySelectorAll('.grid-view.view-desktop .grid-carousel .grid-item')];
      const card = cards.find((c) => c.getAttribute('href') === 'https://example.com/media_two.mp4');
      expect(card).to.exist;
      expect(card.tagName).to.equal('A');
      expect(card.classList.contains('has-video')).to.be.true;
    });
  });

  describe('missing structure', () => {
    it('logs an error and does not throw when rows are missing', async () => {
      document.body.innerHTML = await readFile({ path: './mocks/missing.html' });
      let loggedMessage;
      window.lana.log = (message) => { loggedMessage = message; };

      await init(document.querySelector('.bento-grid'));

      expect(loggedMessage).to.contain('Missing required structure');
      expect(document.querySelector('.foreground')).to.not.exist;
    });
  });
});
