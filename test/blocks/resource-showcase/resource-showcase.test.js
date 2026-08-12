import { expect } from '@esm-bundle/chai';
import init from '../../../blocks/resource-showcase/resource-showcase.js';

describe('Resource Showcase', () => {
  it('renders the heading, featured card, and secondary list', async () => {
    document.body.innerHTML = `<div class="resource-showcase">
      <div><div><p>Boost your AI knowledge</p></div></div>
      <div>
        <div>
          <p><picture><img src=""></picture></p>
          <h3>Measure your org's readiness to scale CX with AI.</h3>
          <p>Lorem ipsum dolor sit amet.</p>
        </div>
        <div><p><a href="https://example.com/assessment">Start assessment</a></p></div>
      </div>
      <div>
        <div><h3>How AI is shaping trends</h3><p>Lorem ipsum.</p></div>
        <div><p><a href="https://example.com/watch">Watch now</a></p></div>
      </div>
    </div>`;

    await init(document.querySelector('.resource-showcase'));

    const heading = document.querySelector('.resource-showcase-heading');
    expect(heading).to.exist;
    expect(heading.localName).to.equal('h2');
    expect(heading.textContent.trim()).to.equal('Boost your AI knowledge');

    const featured = document.querySelector('.resource-showcase-featured');
    expect(featured).to.exist;
    expect(featured.querySelector('.resource-showcase-featured-title').localName).to.equal('h3');
    expect(featured.querySelector('picture')).to.exist;

    const items = document.querySelectorAll('.resource-showcase-item');
    expect(items.length).to.equal(1);
    expect(items[0].querySelector('.resource-showcase-item-title').textContent.trim())
      .to.equal('How AI is shaping trends');
  });

  it('makes the whole featured card a link with an accessible label, hiding duplicate content', async () => {
    document.body.innerHTML = `<div class="resource-showcase">
      <div><div><p>Heading</p></div></div>
      <div>
        <div>
          <h3>Measure your org's readiness to scale CX with AI.</h3>
          <p>Description text.</p>
        </div>
        <div><p><a href="https://example.com/assessment">Start assessment</a></p></div>
      </div>
    </div>`;

    await init(document.querySelector('.resource-showcase'));

    const featured = document.querySelector('.resource-showcase-featured');
    expect(featured.localName).to.equal('a');
    expect(featured.href).to.equal('https://example.com/assessment');
    expect(featured.getAttribute('aria-label')).to.equal("Measure your org's readiness to scale CX with AI.");

    // the featured content is hidden from AT since the card's aria-label covers it
    expect(featured.querySelector('.resource-showcase-featured-image').getAttribute('aria-hidden')).to.equal('true');
    expect(featured.querySelector('.resource-showcase-featured-body').getAttribute('aria-hidden')).to.equal('true');

    // the original CTA link is demoted to a non-interactive span (no nested link)
    const cta = featured.querySelector('.resource-showcase-cta');
    expect(cta.localName).to.equal('span');
    expect(cta.querySelector('.resource-showcase-chevron')).to.exist;
  });

  it('renders the featured card as a plain div when there is no CTA link', async () => {
    document.body.innerHTML = `<div class="resource-showcase">
      <div><div><p>Heading</p></div></div>
      <div>
        <div><h3>Title only</h3><p>Description text.</p></div>
        <div></div>
      </div>
    </div>`;

    await init(document.querySelector('.resource-showcase'));

    const featured = document.querySelector('.resource-showcase-featured');
    expect(featured.localName).to.equal('div');
    expect(featured.getAttribute('aria-label')).to.be.null;
  });

  it('omits the secondary list when there are no secondary rows', async () => {
    document.body.innerHTML = `<div class="resource-showcase">
      <div><div><p>Heading</p></div></div>
      <div>
        <div><h3>Title</h3><p>Description.</p></div>
        <div><p><a href="https://example.com">CTA</a></p></div>
      </div>
    </div>`;

    await init(document.querySelector('.resource-showcase'));

    expect(document.querySelector('.resource-showcase-list')).to.not.exist;
  });

  it('does nothing when there is no heading or featured row', async () => {
    document.body.innerHTML = '<div class="resource-showcase"></div>';

    await init(document.querySelector('.resource-showcase'));

    expect(document.querySelector('.resource-showcase-content')).to.not.exist;
  });
});
