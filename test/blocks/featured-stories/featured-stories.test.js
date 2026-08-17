import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

const { default: init } = await import('../../../blocks/featured-stories/featured-stories.js');

window.lana = { log: () => {} };

describe('Featured Stories', () => {
  describe('basic content', () => {
    before(async () => {
      document.body.innerHTML = await readFile({ path: './mocks/basic.html' });
      await init(document.querySelector('.featured-stories'));
    });

    it('adds the con-block class and region role', () => {
      const block = document.querySelector('.featured-stories');
      expect(block.classList.contains('con-block')).to.be.true;
      expect(block.getAttribute('role')).to.equal('region');
      expect(block.getAttribute('aria-label')).to.equal('Featured stories gallery');
    });

    it('builds mobile, tablet, and desktop views', () => {
      expect(document.querySelector('.fs-view.view-mobile')).to.exist;
      expect(document.querySelector('.fs-view.view-tablet')).to.exist;
      expect(document.querySelector('.fs-view.view-desktop')).to.exist;
    });

    it('builds a featured card from the first cell with heading, description, and watch link', () => {
      const desktopView = document.querySelector('.fs-view.view-desktop');
      const featured = desktopView.querySelector('.fs-featured');
      expect(featured).to.exist;
      expect(featured.querySelector('.fs-heading').textContent).to.equal('Featured heading');
      expect(featured.querySelector('.fs-description').textContent).to.equal('Featured description text.');
      expect(featured.querySelector('.fs-watch-link')).to.exist;
      expect(featured.querySelector('.fs-item-play')).to.exist;
    });

    it('resolves the featured card video source from the mp4 link and makes it a link', () => {
      const desktopView = document.querySelector('.fs-view.view-desktop');
      const featured = desktopView.querySelector('.fs-featured');
      expect(featured.tagName).to.equal('A');
      expect(featured.getAttribute('href')).to.equal('https://example.com/video1.mp4');
      expect(featured.classList.contains('has-video')).to.be.true;
    });

    it('builds the remaining cells into the carousel, excluding the featured cell', () => {
      const desktopView = document.querySelector('.fs-view.view-desktop');
      const cards = desktopView.querySelectorAll('.fs-carousel .fs-item');
      expect(cards.length).to.equal(4);
    });

    it('shows the play icon and watch link on every carousel card', () => {
      const desktopView = document.querySelector('.fs-view.view-desktop');
      const cards = [...desktopView.querySelectorAll('.fs-carousel .fs-item')];
      cards.forEach((card) => {
        expect(card.querySelector('.fs-item-play')).to.exist;
        expect(card.querySelector('.fs-watch-link')).to.exist;
      });
    });

    it('shows carousel arrow controls when there are more than 3 cards', () => {
      const desktopView = document.querySelector('.fs-view.view-desktop');
      expect(desktopView.querySelector('.fs-carousel-controls')).to.exist;
    });

    it('combines every cell, including the featured one, into a single swipeable row on mobile', () => {
      const mobileView = document.querySelector('.fs-view.view-mobile');
      expect(mobileView.querySelector('.fs-featured')).to.not.exist;
      const cards = mobileView.querySelectorAll('.fs-carousel .fs-item');
      expect(cards.length).to.equal(5);
    });

    it('shows carousel arrow controls on mobile when there are more than 3 cards', () => {
      const mobileView = document.querySelector('.fs-view.view-mobile');
      expect(mobileView.querySelector('.fs-carousel-controls')).to.exist;
    });
  });

  describe('small content', () => {
    before(async () => {
      document.body.innerHTML = await readFile({ path: './mocks/small.html' });
      await init(document.querySelector('.featured-stories'));
    });

    it('renders a plain div for cards without a video link', () => {
      const desktopView = document.querySelector('.fs-view.view-desktop');
      const featured = desktopView.querySelector('.fs-featured');
      expect(featured.tagName).to.equal('DIV');
      expect(featured.classList.contains('has-video')).to.be.false;
    });

    it('hides carousel arrow controls when there are 3 or fewer remaining cards', () => {
      const desktopView = document.querySelector('.fs-view.view-desktop');
      const cards = desktopView.querySelectorAll('.fs-carousel .fs-item');
      expect(cards.length).to.equal(1);
      expect(desktopView.querySelector('.fs-carousel-controls')).to.not.exist;
    });

    it('hides carousel arrow controls on mobile when there are 3 or fewer cards', () => {
      const mobileView = document.querySelector('.fs-view.view-mobile');
      expect(mobileView.querySelector('.fs-carousel-controls')).to.not.exist;
    });
  });

  describe('missing structure', () => {
    it('logs an error and does not throw when there are no cells', async () => {
      document.body.innerHTML = await readFile({ path: './mocks/missing.html' });
      let loggedMessage;
      window.lana.log = (message) => { loggedMessage = message; };

      await init(document.querySelector('.featured-stories'));

      expect(loggedMessage).to.contain('Missing required structure');
      expect(document.querySelector('.foreground')).to.not.exist;
    });
  });
});
