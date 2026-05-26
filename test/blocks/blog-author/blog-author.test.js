import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import init from '../../../blocks/blog-author/blog-author.js';

window.lana = { log: sinon.stub() };

const AUTHOR_HTML = `
<div class="blog-author">
  <div><div>image</div><div><picture><img src="https://example.com/author.jpg" alt="Jane Doe"></picture></div></div>
  <div><div>name</div><div>Jane Doe</div></div>
  <div><div>title</div><div>Senior Director, Marketing</div></div>
  <div><div>description</div><div><p>Jane has 15 years of experience.</p></div></div>
  <div><div>social</div><div><a href="https://linkedin.com/in/janedoe">LinkedIn</a><a href="https://twitter.com/janedoe">Twitter</a></div></div>
  <div><div>company</div><div>Adobe</div></div>
  <div><div>subscribe</div><div><a href="https://example.com/subscribe">Subscribe</a></div></div>
</div>`;

function getPersonSchema() {
  const scripts = [...document.head.querySelectorAll('script[type="application/ld+json"]')];
  const script = scripts.find((s) => {
    try { return JSON.parse(s.textContent)['@type'] === 'Person'; } catch { return false; }
  });
  return script ? JSON.parse(script.textContent) : null;
}

describe('Blog Author', () => {
  afterEach(() => {
    sinon.restore();
    window.lana.log.resetHistory();
    document.head.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove());
  });

  describe('manual authoring', () => {
    beforeEach(() => {
      document.body.innerHTML = AUTHOR_HTML;
    });

    it('renders author name and title', async () => {
      await init(document.querySelector('.blog-author'));
      expect(document.querySelector('.blog-author-name').textContent).to.equal('Jane Doe');
      expect(document.querySelector('.blog-author-title').textContent).to.equal('Senior Director, Marketing');
    });

    it('renders author image', async () => {
      await init(document.querySelector('.blog-author'));
      expect(document.querySelector('.blog-author-image picture')).to.exist;
    });

    it('renders description', async () => {
      await init(document.querySelector('.blog-author'));
      const desc = document.querySelector('.blog-author-description');
      expect(desc).to.exist;
      expect(desc.textContent).to.include('15 years');
    });

    it('renders social links as icon buttons with aria-labels', async () => {
      await init(document.querySelector('.blog-author'));
      const links = document.querySelectorAll('.blog-author-social a');
      expect(links).to.have.length(2);
      expect(links[0].getAttribute('aria-label')).to.equal('LinkedIn');
      expect(links[1].getAttribute('aria-label')).to.equal('Twitter');
      expect(links[0].target).to.equal('_blank');
      expect(links[0].rel).to.equal('noopener noreferrer');
    });

    it('renders icon spans for known platforms', async () => {
      await init(document.querySelector('.blog-author'));
      const links = document.querySelectorAll('.blog-author-social a');
      expect(links[0].querySelector('.icon-linkedin')).to.exist;
      expect(links[1].querySelector('.icon-twitter')).to.exist;
    });

    it('does not crash when a social link has no href', async () => {
      document.body.innerHTML = `
        <div class="blog-author">
          <div><div>name</div><div>Jane Doe</div></div>
          <div><div>social</div><div><a>No href</a></div></div>
        </div>`;
      await init(document.querySelector('.blog-author'));
      expect(document.querySelector('.blog-author-name').textContent).to.equal('Jane Doe');
    });

    it('falls back to text for unknown platforms', async () => {
      document.body.innerHTML = `
        <div class="blog-author">
          <div><div>name</div><div>Jane Doe</div></div>
          <div><div>social</div><div><a href="https://example.com/profile">My Profile</a></div></div>
        </div>`;
      await init(document.querySelector('.blog-author'));
      const link = document.querySelector('.blog-author-social a');
      expect(link.textContent).to.equal('My Profile');
      expect(link.querySelector('.icon')).to.be.null;
    });

    it('renders subscribe CTA when row is authored', async () => {
      await init(document.querySelector('.blog-author'));
      const sub = document.querySelector('.blog-author-subscribe');
      expect(sub).to.exist;
      expect(sub.querySelector('p').textContent).to.include('latest articles');
      expect(sub.querySelector('.blog-author-subscribe-btn').href).to.include('subscribe');
      expect(sub.querySelector('.blog-author-subscribe-btn').textContent).to.equal('Subscribe');
    });

    it('omits subscribe CTA when row is absent', async () => {
      document.body.innerHTML = `
        <div class="blog-author">
          <div><div>name</div><div>Jane Doe</div></div>
        </div>`;
      await init(document.querySelector('.blog-author'));
      expect(document.querySelector('.blog-author-subscribe')).to.be.null;
    });

    it('injects Person JSON-LD schema', async () => {
      await init(document.querySelector('.blog-author'));
      const schema = getPersonSchema();
      expect(schema).to.exist;
      expect(schema['@context']).to.equal('https://schema.org');
      expect(schema['@type']).to.equal('Person');
      expect(schema.name).to.equal('Jane Doe');
      expect(schema.jobTitle).to.equal('Senior Director, Marketing');
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
      document.body.innerHTML = `
        <div class="blog-author">
          <div><div>name</div><div>No Image Author</div></div>
        </div>`;
      await init(document.querySelector('.blog-author'));
      const schema = getPersonSchema();
      expect(schema.image).to.be.undefined;
      expect(schema.sameAs).to.be.undefined;
    });
  });

  describe('CaaS tag row path', () => {
    it('fetches and renders author from CaaS tag', async () => {
      document.body.innerHTML = '<div class="blog-author"><div><div>caas:blog-authors/jane-doe</div></div></div>';

      sinon.stub(window, 'fetch').resolves({
        ok: true,
        json: () => ({
          data: [{
            name: 'Jane Doe',
            'job-title': 'Marketing Director',
            description: '<p>Jane bio.</p>',
            image: 'https://example.com/jane.jpg',
            'social-links': 'https://linkedin.com/in/janedoe',
            company: 'Adobe',
          }],
        }),
      });

      await init(document.querySelector('.blog-author'));
      expect(document.querySelector('.blog-author-name').textContent).to.equal('Jane Doe');
      expect(document.querySelector('.blog-author-title').textContent).to.equal('Marketing Director');
    });

    it('strips XSS from CaaS description', async () => {
      document.body.innerHTML = '<div class="blog-author"><div><div>caas:blog-authors/xss-test</div></div></div>';
      sinon.stub(window, 'fetch').resolves({
        ok: true,
        json: () => ({
          data: [{
            name: 'XSS Author',
            'job-title': 'Tester',
            description: '<p onmouseover="alert(1)">Safe text</p><script>alert(2)</script>',
            image: '',
            'social-links': '',
            company: '',
          }],
        }),
      });
      await init(document.querySelector('.blog-author'));
      const desc = document.querySelector('.blog-author-description');
      expect(desc).to.exist;
      expect(desc.querySelector('script')).to.be.null;
      expect(desc.querySelector('[onmouseover]')).to.be.null;
      expect(desc.textContent).to.include('Safe text');
    });

    it('logs warning when CaaS returns no data', async () => {
      document.body.innerHTML = '<div class="blog-author"><div><div>caas:blog-authors/unknown</div></div></div>';
      sinon.stub(window, 'fetch').resolves({ ok: false });

      await init(document.querySelector('.blog-author'));
      expect(window.lana.log.called).to.be.true;
      expect(document.querySelector('.blog-author-name')).to.be.null;
    });
  });

  describe('edge cases', () => {
    it('returns early for empty block', async () => {
      document.body.innerHTML = '<div class="blog-author"></div>';
      await init(document.querySelector('.blog-author'));
      expect(document.querySelector('.blog-author-info')).to.be.null;
    });

    it('logs warning and skips render when name is missing', async () => {
      document.body.innerHTML = '<div class="blog-author"><div><div></div></div></div>';
      sinon.stub(window, 'fetch').resolves({ ok: false });
      await init(document.querySelector('.blog-author'));
      expect(document.querySelector('.blog-author-name')).to.be.null;
    });
  });
});
