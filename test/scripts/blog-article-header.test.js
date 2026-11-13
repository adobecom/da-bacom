import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import * as scripts from '../../scripts/scripts.js';

const { buildBlogArticleHeader } = scripts;

describe('Blog article auto-blocking', () => {
  let metadata;
  let originalLana;

  beforeEach(() => {
    originalLana = window.lana;
    window.lana = { log: sinon.spy() };
    metadata = [
      ['publication-date', '08-10-2023'],
      ['category', 'The Latest'],
    ].map(([name, content]) => {
      const meta = document.createElement('meta');
      meta.name = name;
      meta.content = content;
      document.head.append(meta);
      return meta;
    });
    document.body.innerHTML = `
      <main>
        <div>
          <h1>Blog article title</h1>
          <p><picture><img alt="Featured article image"></picture></p>
          <p>Article body text.</p>
        </div>
      </main>`;
  });

  afterEach(() => {
    sinon.restore();
    metadata.forEach((meta) => meta.remove());
    window.lana = originalLana;
    document.body.innerHTML = '';
  });

  it('builds the article header from the authored title and media', async () => {
    const title = document.querySelector('main h1');
    const picture = document.querySelector('main picture');

    await buildBlogArticleHeader();

    const header = document.querySelector('main .article-header');
    expect(header).to.exist;
    expect(header.querySelector('h1')).to.equal(title);
    expect(header.querySelector('picture')).to.equal(picture);
    expect(document.querySelectorAll('main h1')).to.have.lengthOf(1);
  });

  it('does not include the authored category in the header', async () => {
    await buildBlogArticleHeader();

    const header = document.querySelector('main .article-header');
    expect(header).to.exist;
    expect(header.textContent).not.to.include(document.querySelector('meta[name="category"]').content);
  });

  it('preserves a featured video link in the article header', async () => {
    document.querySelector('main picture').parentElement.innerHTML = `
      <a href="https://video.tv.adobe.com/v/332632">Watch the featured video</a>`;
    const video = document.querySelector('main a');

    await buildBlogArticleHeader();

    const header = document.querySelector('main .article-header');
    expect(header).to.exist;
    expect(header.querySelector(':scope > div:nth-child(4) a')).to.equal(video);
    expect(video.href).to.equal('https://video.tv.adobe.com/v/332632');
  });

  it('returns safely when there is no main element', async () => {
    document.body.innerHTML = '';

    await buildBlogArticleHeader();

    expect(document.querySelector('.article-header')).not.to.exist;
    expect(window.lana.log.called).to.be.false;
  });

  it('catches and logs failures while building the header', async () => {
    const error = new Error('Article header construction failed');
    const querySelector = sinon.stub(document.querySelector('main'), 'querySelector').callThrough();
    querySelector.withArgs('h1').throws(error);

    await buildBlogArticleHeader();

    expect(window.lana.log.calledOnce).to.be.true;
    expect(window.lana.log.firstCall.args[0]).to.include(error.message);
    expect(window.lana.log.firstCall.args[1]).to.deep.equal({
      tags: 'autoBlock',
      severity: 'error',
    });
  });
});
