/* eslint-disable import/no-unresolved */
import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';
import { applyTemplateFields } from '../../../tools/generator/generator.js';
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
    const result = applyTemplateFields(ungated, data);
    document.body.innerHTML = result;
    await loadArea();
    const remainingFields = result.match(/{{[^}]+}}/g) || [];
    expect(remainingFields).to.deep.equal([]);
  });

  it('applies gated template fields correctly', async () => {
    document.body.innerHTML = gated;
    const result = applyTemplateFields(gated, data);
    document.body.innerHTML = result;
    await loadArea();
    const remainingFields = result.match(/{{[^}]+}}/g) || [];
    expect(remainingFields).to.deep.equal([]);
  });
});
