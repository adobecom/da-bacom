import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import init from '../../../blocks/blog-author/blog-author.js';

window.lana = { log: sinon.stub() };

function setMeta(key, value) {
  let el = document.querySelector(`meta[name="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.name = key;
    document.head.append(el);
  }
  el.content = value;
}

function removeMeta(key) {
  document.querySelector(`meta[name="${key}"]`)?.remove();
}

function getPersonSchema() {
  const scripts = [...document.head.querySelectorAll('script[type="application/ld+json"]')];
  const script = scripts.find((s) => {
    try { return JSON.parse(s.textContent)['@type'] === 'Person'; } catch { return false; }
  });
  return script ? JSON.parse(script.textContent) : null;
}

describe('Blog Author', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="blog-author"></div>';
    setMeta('author', 'Jane Doe');
    setMeta('author-title', 'Senior Director, Marketing');
    setMeta('author-description', 'Jane has 15 years of experience.');
    setMeta('author-image', 'https://example.com/author.jpg');
    setMeta('author-social-links', 'https://linkedin.com/in/janedoe,https://twitter.com/janedoe');
    setMeta('author-company', 'Adobe');
  });

  afterEach(() => {
    sinon.restore();
    window.lana.log.resetHistory();
    document.head.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove());
    ['author', 'author-title', 'author-description', 'author-image', 'author-social-links', 'author-company'].forEach(removeMeta);
  });

  it('renders author name and title from metadata', async () => {
    await init(document.querySelector('.blog-author'));
    expect(document.querySelector('.blog-author-info > p:first-child').textContent).to.equal('Jane Doe');
    expect(document.querySelector('.blog-author-info > p:nth-child(2)').textContent).to.equal('Senior Director, Marketing');
  });

  it('renders author image from author-image metadata', async () => {
    await init(document.querySelector('.blog-author'));
    const img = document.querySelector('.blog-author picture img');
    expect(img).to.exist;
    expect(img.src).to.include('example.com/author.jpg');
    expect(img.alt).to.equal('Jane Doe');
  });

  it('renders description from author-description metadata', async () => {
    await init(document.querySelector('.blog-author'));
    const desc = document.querySelector('.blog-author-description');
    expect(desc).to.exist;
    expect(desc.textContent).to.include('15 years');
  });

  it('renders social links as icon buttons', async () => {
    await init(document.querySelector('.blog-author'));
    const links = document.querySelectorAll('.blog-author-social a');
    expect(links).to.have.length(2);
    expect(links[0].getAttribute('aria-label')).to.equal('LinkedIn');
    expect(links[1].getAttribute('aria-label')).to.equal('X');
    expect(links[0].target).to.equal('_blank');
    expect(links[0].rel).to.equal('noopener noreferrer');
  });

  it('renders icon spans for known social platforms', async () => {
    await init(document.querySelector('.blog-author'));
    const links = document.querySelectorAll('.blog-author-social a');
    expect(links[0].querySelector('.icon-linkedin')).to.exist;
    expect(links[1].querySelector('.icon-twitter')).to.exist;
  });

  it('omits image when author-image metadata is absent', async () => {
    removeMeta('author-image');
    await init(document.querySelector('.blog-author'));
    expect(document.querySelector('.blog-author picture')).to.be.null;
  });

  it('omits title when author-title metadata is absent', async () => {
    removeMeta('author-title');
    await init(document.querySelector('.blog-author'));
    expect(document.querySelector('.blog-author-info > p:nth-child(2)')).to.be.null;
  });

  it('omits social links when author-social-links metadata is absent', async () => {
    removeMeta('author-social-links');
    await init(document.querySelector('.blog-author'));
    expect(document.querySelector('.blog-author-social')).to.be.null;
  });

  it('injects Person JSON-LD schema', async () => {
    await init(document.querySelector('.blog-author'));
    const schema = getPersonSchema();
    expect(schema).to.exist;
    expect(schema['@context']).to.equal('https://schema.org');
    expect(schema['@type']).to.equal('Person');
    expect(schema.name).to.equal('Jane Doe');
    expect(schema.jobTitle).to.equal('Senior Director, Marketing');
    expect(schema.url).to.be.a('string');
  });

  it('includes worksFor in schema', async () => {
    await init(document.querySelector('.blog-author'));
    const schema = getPersonSchema();
    expect(schema.worksFor['@type']).to.equal('Organization');
    expect(schema.worksFor.name).to.equal('Adobe');
    expect(schema.worksFor.url).to.equal('https://www.adobe.com/');
  });

  it('includes sameAs social links in schema', async () => {
    await init(document.querySelector('.blog-author'));
    const schema = getPersonSchema();
    expect(schema.sameAs).to.include('https://linkedin.com/in/janedoe');
    expect(schema.sameAs).to.include('https://twitter.com/janedoe');
  });

  it('includes image URL in schema', async () => {
    await init(document.querySelector('.blog-author'));
    const schema = getPersonSchema();
    expect(schema.image).to.include('example.com/author.jpg');
  });

  it('omits absent optional fields from schema', async () => {
    removeMeta('author-image');
    removeMeta('author-social-links');
    await init(document.querySelector('.blog-author'));
    const schema = getPersonSchema();
    expect(schema.image).to.be.undefined;
    expect(schema.sameAs).to.be.undefined;
  });

  it('logs warning and skips render when author metadata is missing', async () => {
    removeMeta('author');
    await init(document.querySelector('.blog-author'));
    expect(window.lana.log.called).to.be.true;
    expect(document.querySelector('.blog-author-info')).to.be.null;
  });

  it('defaults worksFor to Adobe when author-company is absent', async () => {
    removeMeta('author-company');
    await init(document.querySelector('.blog-author'));
    const schema = getPersonSchema();
    expect(schema.worksFor.name).to.equal('Adobe');
  });
});
