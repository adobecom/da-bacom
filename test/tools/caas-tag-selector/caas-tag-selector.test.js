import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

describe('Page Generator CaaS Tag Selector Fetching Data', () => {
  before(async () => {
    document.body.innerHTML = await readFile({ path: '../../../tools/caas-tag-selector/index.html' });
    // Stub fetch to avoid actual network requests
    sinon.stub(window, 'fetch').callsFake((url) => {
      // Return mock responses for expected URLs
      if (url.includes('da.live/config/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [
              { key: 'aem.repositoryId', value: 'test-aem-repo.com' },
              { key: 'aem.tags.namespaces', value: 'namespace1, namespace2' },
            ],
          }),
        });
      }

      if (url.includes('content/cq:tags')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            'test-tag': {
              'jcr:primaryType': 'cq:Tag',
              'jcr:title': 'caas:content-type',
            },
          }),
        });
      }

      // Default mock response for any other URLs
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('{}'),
      });
    });
  });

  it('Renders the component', () => {
    const tagSelector = document.createElement('pg-caas-tag-selector');
    document.body.append(tagSelector);
    const renderedTagSelector = document.querySelector('pg-caas-tag-selector');
    expect(renderedTagSelector).to.not.be.null;
  });

  it('Makes the correct fetch requests when rendering', () => {
    // Get the existing fetch stub to track calls
    const fetchStub = window.fetch;

    // Create the component
    const tagSelector = document.createElement('pg-caas-tag-selector');
    document.body.append(tagSelector);

    // Wait a bit for the component to initialize and make fetch calls
    setTimeout(() => {
      // Verify that fetch was called
      expect(fetchStub.called).to.be.true;

      // Get all the URLs that were fetched
      const fetchCalls = fetchStub.getCalls();
      const fetchUrls = fetchCalls.map((call) => call.args[0]);

      // Check that the component made calls to expected endpoints
      expect(fetchUrls.some((url) => url.includes('da.live/config/'))).to.be.true;
      expect(fetchUrls.some((url) => url.includes('content/cq:tags'))).to.be.true;
    }, 100);
  });

  it('Renders with the correct options in the select inputs', () => {
    // Create the component
    const tagSelector = document.createElement('pg-caas-tag-selector');
    document.body.append(tagSelector);

    // Wait for the component to render
    setTimeout(() => {
      // Check that the component has a shadow root
      expect(tagSelector.shadowRoot).to.exist;

      // Check the main container structure
      const tagSelectorGroup = tagSelector.shadowRoot.querySelector('.tag-selector-group');
      expect(tagSelectorGroup).to.exist;

      // Check content type select structure
      const contentTypeSelect = tagSelector.shadowRoot.querySelector('#caas-content-type');
      expect(contentTypeSelect).to.exist;
      expect(contentTypeSelect.name).to.equal('caas-content-type');
      expect(contentTypeSelect.id).to.equal('caas-content-type');

      // Check content type options
      const contentTypeOptions = contentTypeSelect.querySelectorAll('option');
      expect(contentTypeOptions).to.have.length(1); // Should have default "--Select--" option
      expect(contentTypeOptions[0].value).to.equal('');
      expect(contentTypeOptions[0].textContent).to.equal('--Select--');

      // Check primary product select structure
      const productSelect = tagSelector.shadowRoot.querySelector('#caas-primary-product');
      expect(productSelect).to.exist;
      expect(productSelect.name).to.equal('caas-primary-product');
      expect(productSelect.id).to.equal('caas-primary-product');

      // Check primary product options
      const productOptions = productSelect.querySelectorAll('option');
      expect(productOptions).to.have.length(1); // Should have default "--Select--" option
      expect(productOptions[0].value).to.equal('');
      expect(productOptions[0].textContent).to.equal('--Select--');

      // Check labels are present and correct
      const labels = tagSelector.shadowRoot.querySelectorAll('label');
      expect(labels).to.have.length(2);

      const contentTypeLabel = tagSelector.shadowRoot.querySelector('label[for="caas-content-type"]');
      expect(contentTypeLabel).to.exist;
      expect(contentTypeLabel.textContent).to.include('CaaS Content Type');

      const productLabel = tagSelector.shadowRoot.querySelector('label[for="caas-primary-product"]');
      expect(productLabel).to.exist;
      expect(productLabel.textContent).to.include('CaaS Primary Product');

      // Check that labels are properly associated with their selects
      expect(contentTypeLabel.getAttribute('for')).to.equal(contentTypeSelect.id);
      expect(productLabel.getAttribute('for')).to.equal(productSelect.id);
    }, 100);
  });
});
