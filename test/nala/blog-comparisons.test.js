import { expect } from '@esm-bundle/chai';
import { normalizeLinks, compareLinks } from '../../nala/blog/comparisons/comparison.page.js';

describe('Blog comparison reports', () => {
  it('normalizes each environment origin without changing external destinations', () => {
    const baseline = normalizeLinks([
      [' Article ', 'https://main.example/blog/article?view=full#details'],
      ['External', 'https://external.example/blog/article'],
    ], 'https://main.example/blog/');
    const target = normalizeLinks([
      ['Article', 'https://branch.example/blog/article?view=full#details'],
      ['External', 'https://external.example/blog/article'],
    ], 'https://branch.example/blog/');

    expect(compareLinks(baseline, target)).to.deep.equal({});
    expect(baseline.External).to.deep.equal(['https://external.example/blog/article']);
    expect(baseline.Article).to.deep.equal(['/blog/article?view=full#details']);
  });

  it('retains repeated link labels and compares destinations independently of order', () => {
    const baseline = normalizeLinks([
      ['Read more', '/blog/b'],
      ['Read more', '/blog/a'],
    ], 'https://main.example/blog/');
    const target = normalizeLinks([
      ['Read more', '/blog/a'],
      ['Read more', '/blog/b'],
    ], 'https://branch.example/blog/');

    expect(baseline['Read more']).to.deep.equal(['/blog/a', '/blog/b']);
    expect(compareLinks(baseline, target)).to.deep.equal({});
    expect(compareLinks(baseline, { 'Read more': ['/blog/a'] })).to.deep.equal({ 'Read more': { baseline: ['/blog/a', '/blog/b'], target: ['/blog/a'] } });
  });

  it('reports changed or missing source links without flagging additional target links', () => {
    const differences = compareLinks(
      { Article: ['/blog/original'], External: ['https://external.example/'] },
      { Article: ['/blog/changed'], Extra: ['/blog/new'] },
    );

    expect(differences).to.deep.equal({
      Article: { baseline: ['/blog/original'], target: ['/blog/changed'] },
      External: { baseline: ['https://external.example/'], target: [] },
    });
  });

  it('reports missing destinations when the target has no links', () => {
    expect(compareLinks({ Article: ['/blog/article'] }, {})).to.deep.equal({ Article: { baseline: ['/blog/article'], target: [] } });
  });
});
