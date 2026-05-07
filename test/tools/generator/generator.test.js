/* eslint-disable import/no-unresolved */
import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';
import { applyTemplateData, injectAssetHeadlineIfMissing } from '../../../tools/generator/generator.js';
import { LIBS } from '../../../scripts/scripts.js';

const { loadArea } = await import(`${LIBS}/utils/utils.js`);

const gated = await readFile({ path: './mocks/template-gated.html' });
const ungated = await readFile({ path: './mocks/template-ungated.html' });

const data = {
  contentType: 'Webinar',
  marqueeHeadline: 'Join our upcoming webinar',
  pdfAsset: '/path/to/pdf',
  sectionStyle: 'light',
  bodyDescription: 'Adobe is proud to be recognized as a Leader',
  bodyBackground: 'white',
  cardTitle: 'Webinar Title',
  cardLink: '/path/to/card',
  allResourcesLink: '/path/to/all/resources',
  cardDate: '2025-05-21',
  cardImage: 'http://localhost:3000/resources/reports/media_16c066517a3696208ca4c721dc7d5855e6c4f0d98.png',
  cardDescription: 'Description of the webinar',
  caasContentType: 'Webinar',
  caasPrimaryProduct: 'Product A',
  marketoDataUrl: 'https://milo.adobe.com/tools/marketo#',
  experienceFragment: 'http://localhost:3000/fragments/resources/cards/thank-you-collections/advertising',
  marqueeImage: 'http://localhost:3000/media_1df026981984b08eea7a3e56f0ed6014bd00bde08.png',
  formDescription: 'Please fill out the form to register for the webinar.',
  formSuccessType: 'thank-you',
  formSuccessSection: 'form-success',
  formSuccessContent: 'You will receive a confirmation email shortly.',
};

describe('Generator', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  it('applies ungated template fields correctly', async () => {
    document.body.innerHTML = ungated;
    const result = applyTemplateData(ungated, data);
    document.body.innerHTML = result;
    await loadArea();
    const remainingFields = result.match(/{{[^}]+}}/g) || [];
    expect(remainingFields).to.deep.equal([]);
  });

  it.skip('applies gated template fields correctly', async () => {
    document.body.innerHTML = gated;
    const result = applyTemplateData(gated, data);
    document.body.innerHTML = result;
    await loadArea();
    const remainingFields = result.match(/{{[^}]+}}/g) || [];
    expect(remainingFields).to.deep.equal([]);
  });

  it('replaces asset-headline placeholder with provided h2 content', () => {
    const template = '<div>{{asset-headline}}<p>{{pdf-asset}}</p></div>';
    const result = applyTemplateData(template, {
      assetHeadline: '<h2>Digital Trends Report</h2>',
      pdfAsset: '/path/to/pdf',
    });
    expect(result).to.include('<h2>Digital Trends Report</h2>');
    expect(result).to.not.include('{{asset-headline}}');
  });

  it('removes asset-headline placeholder when value is empty', () => {
    const template = '<div>{{asset-headline}}<p>{{pdf-asset}}</p></div>';
    const result = applyTemplateData(template, {
      assetHeadline: '',
      pdfAsset: '/path/to/pdf',
    });
    expect(result).to.not.include('{{asset-headline}}');
    expect(result).to.not.include('<h2>');
  });

  it('injectAssetHeadlineIfMissing adds h2 before PDF link when template has no placeholder', () => {
    const template = '<div class="form-success"><p>{{pdf-asset}}</p></div>';
    const pdfUrl = 'https://main--da-bacom--adobecom.aem.page/resources/reports/file.pdf';
    const applied = applyTemplateData(template, { pdfAsset: pdfUrl, pdfAssetName: 'file.pdf' });
    const headline = '<h2>Industry outlook</h2>';
    const out = injectAssetHeadlineIfMissing(template, applied, headline, pdfUrl);
    expect(out).to.include(headline);
    expect(out.indexOf(headline)).to.be.lessThan(out.indexOf('<a href='));
  });

  it('injectAssetHeadlineIfMissing is a no-op when template includes asset-headline placeholder', () => {
    const template = '<div>{{asset-headline}}<p>{{pdf-asset}}</p></div>';
    const pdfUrl = 'https://example.com/doc.pdf';
    const applied = applyTemplateData(template, {
      assetHeadline: '<h2>Title</h2>',
      pdfAsset: pdfUrl,
    });
    const out = injectAssetHeadlineIfMissing(template, applied, '<h2>Duplicate</h2>', pdfUrl);
    expect(out).to.include('<h2>Title</h2>');
    expect(out).to.not.include('<h2>Duplicate</h2>');
  });
});
