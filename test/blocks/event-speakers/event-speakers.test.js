import { expect } from '@esm-bundle/chai';
import { readFile, setViewport } from '@web/test-runner-commands';
import init from '../../../blocks/event-speakers/event-speakers.js';

describe('Event Speakers', () => {
  it('adds ellipsis and button for long description', () => {
    document.body.innerHTML = `<div class="event-speakers"><div>
      <div><picture></picture></div>
      <div><h3>Firstname Lastname</h3></div>
      <div><p>Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Maecenas porttitor congue massa.</p></div>
      <div>Open me</div>
    </div></div>`;

    init(document.querySelector('.event-speakers'));
    expect(document.querySelector('.ellipsis')).to.exist;
    document.querySelector('button').click();
    expect(document.querySelector('.ellipsis')).to.be.null;
  });

  it('shows entire description if short', () => {
    document.body.innerHTML = `<div class="event-speakers"><div>
      <div><picture></picture></div>
      <div>Firstname Lastname</div>
      <div><p>Lorem ipsum dolor sit amet.</p></div>
    </div></div>`;
    const expected = `Firstname Lastname

Lorem ipsum dolor sit amet.`;

    init(document.querySelector('.event-speakers'));
    expect(document.querySelector('.text').innerText).equals(expected);
  });

  describe('avatar spacing', () => {
    let style;
    let originalViewport;

    before(async () => {
      originalViewport = { width: window.innerWidth, height: window.innerHeight };
      style = document.createElement('style');
      style.textContent = await readFile({ path: '../../../blocks/event-speakers/event-speakers.css' });
      document.head.append(style);
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    after(async () => {
      style.remove();
      await setViewport(originalViewport);
    });

    ['ltr', 'rtl'].forEach((direction) => {
      [320, 599, 600, 1280].forEach((width) => {
        it(`separates the avatar and text in ${direction} at ${width}px`, async () => {
          await setViewport({ width, height: 800 });
          document.body.innerHTML = `<div class="event-speakers" dir="${direction}" lang="${direction === 'rtl' ? 'ar' : 'en'}">
            <div>
              <div><picture></picture></div>
              <div><h3>Firstname Lastname</h3></div>
              <div><p>Speaker biography.</p></div>
            </div>
          </div>`;
          const block = document.querySelector('.event-speakers');
          init(block);
          const avatar = block.querySelector('.speaker > div').getBoundingClientRect();
          const text = block.querySelector('.text').getBoundingClientRect();
          const gap = direction === 'rtl' ? avatar.left - text.right : text.left - avatar.right;
          const [mobileGap, desktopGap] = direction === 'rtl' ? [16, 24] : [24, 48];
          expect(gap).to.be.closeTo(width < 600 ? mobileGap : desktopGap, 0.1);
        });
      });
    });
  });
});
