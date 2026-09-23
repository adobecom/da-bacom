import { readFile } from '@web/test-runner-commands';
import { expect } from 'chai';

describe('Page Generator CaaS Tag Selector Entry Point', () => {
  let entryPoint;

  before(async () => {
    const source = await readFile({ path: '../../../tools/caas-tag-selector/index.html' });
    entryPoint = new DOMParser().parseFromString(source, 'text/html');
  });

  it('includes the tag selector component', () => {
    expect(entryPoint.querySelector('pg-caas-tag-selector')).to.exist;
  });

  it('loads the tag selector module', () => {
    const script = entryPoint.querySelector('script[src="/tools/caas-tag-selector/tag-selector.js"]');
    expect(script).to.exist;
  });

  it('loads scripts as ES modules', () => {
    const scripts = [...entryPoint.querySelectorAll('script[src]')];
    expect(scripts).to.have.length(2);
    expect(scripts.every((script) => script.type === 'module')).to.be.true;
  });
});
