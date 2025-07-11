/* eslint-disable import/no-unresolved */
import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import '../../../tools/locale-nav/locale-selector.js';

const locales = [
  {
    code: 'uk',
    path: '/uk/blog/index',
    edit: 'https://da.live/edit#/adobecom/da-bacom-blog/uk/blog/index',
    preview: 'https://main--da-bacom-blog--adobecom.aem.page/uk/blog/',
    live: 'https://main--da-bacom-blog--adobecom.aem.live/uk/blog/',
  },
  {
    code: 'au',
    path: '/au/blog/index',
    edit: 'https://da.live/edit#/adobecom/da-bacom-blog/au/blog/index',
    preview: 'https://main--da-bacom-blog--adobecom.aem.page/au/blog/',
    live: 'https://main--da-bacom-blog--adobecom.aem.live/au/blog/',
  },
  {
    code: 'de',
    path: '/de/blog/index',
    edit: 'https://da.live/edit#/adobecom/da-bacom-blog/de/blog/index',
    preview: 'https://main--da-bacom-blog--adobecom.aem.page/de/blog/',
    live: 'https://main--da-bacom-blog--adobecom.aem.live/de/blog/',
  },
  {
    code: 'fr',
    path: '/fr/blog/index',
    edit: 'https://da.live/edit#/adobecom/da-bacom-blog/fr/blog/index',
    preview: 'https://main--da-bacom-blog--adobecom.aem.page/fr/blog/',
    live: 'https://main--da-bacom-blog--adobecom.aem.live/fr/blog/',
  },
  {
    code: 'kr',
    path: '/kr/blog/index',
    edit: 'https://da.live/edit#/adobecom/da-bacom-blog/kr/blog/index',
    preview: 'https://main--da-bacom-blog--adobecom.aem.page/kr/blog/',
    live: 'https://main--da-bacom-blog--adobecom.aem.live/kr/blog/',
  },
  {
    code: 'ja',
    path: '/ja/blog/index',
    edit: 'https://da.live/edit#/adobecom/da-bacom-blog/ja/blog/index',
    preview: 'https://main--da-bacom-blog--adobecom.aem.page/ja/blog/',
    live: 'https://main--da-bacom-blog--adobecom.aem.live/ja/blog/',
  },
  {
    code: 'en',
    path: '/blog/index',
    edit: 'https://da.live/edit#/adobecom/da-bacom-blog/blog/index',
    preview: 'https://main--da-bacom-blog--adobecom.aem.page/blog/',
    live: 'https://main--da-bacom-blog--adobecom.aem.live/blog/',
  },
  {
    code: 'langstore/en',
    path: '/langstore/en/blog/index',
    edit: 'https://da.live/edit#/adobecom/da-bacom-blog/langstore/en/blog/index',
    preview: 'https://main--da-bacom-blog--adobecom.aem.page/langstore/en/blog/',
    live: 'https://main--da-bacom-blog--adobecom.aem.live/langstore/en/blog/',
  },
];

const status = {
  '/uk/blog/index': { preview: 200, live: 200 },
  '/au/blog/index': { preview: 200, live: 404 },
  '/de/blog/index': { preview: 200, live: 404 },
  '/fr/blog/index': { preview: 200, live: 404 },
  '/kr/blog/index': { preview: 200, live: 404 },
  '/ja/blog/index': { preview: 200, live: 404 },
  '/blog/index': { preview: 200, live: 200 },
  '/langstore/en/blog/index': {},
};

const ogLana = window.lana;

const delay = (milliseconds) => new Promise((resolve) => { setTimeout(resolve, milliseconds); });

const init = (localeCode = '') => {
  const localeNav = document.createElement('da-locale-selector');
  const altLocales = locales.filter((locale) => locale.code !== localeCode);
  const currLocale = locales.find((locale) => locale.code === localeCode);

  localeNav.altLocales = altLocales;
  localeNav.currLocale = currLocale;
  localeNav.status = status;
  document.body.append(localeNav);

  return localeNav;
};

describe('Locale Selector', () => {
  beforeEach(async () => {
    document.body.innerHTML = '';
    window.lana = { log: sinon.spy() };
  });

  afterEach(() => {
    window.lana = ogLana;
  });

  it('render the locale selector', async () => {
    const localeSelector = init('en');
    await delay(100);

    expect(localeSelector).to.exist;
    expect(localeSelector.shadowRoot).to.exist;

    const localeSelectorEl = localeSelector.shadowRoot.querySelector('.locale-selector');
    expect(localeSelectorEl).to.exist;

    const currentLocale = localeSelectorEl.querySelector('.current .detail');
    expect(currentLocale).to.exist;
    expect(currentLocale.querySelector('span').textContent).to.equal('en');
    expect(currentLocale.querySelector('.edit').href).to.equal('https://da.live/edit#/adobecom/da-bacom-blog/blog/index');
    expect(currentLocale.querySelector('.preview').href).to.equal('https://main--da-bacom-blog--adobecom.aem.page/blog/');
    expect(currentLocale.querySelector('.live').href).to.equal('https://main--da-bacom-blog--adobecom.aem.live/blog/');
  });

  it('handle search', async () => {
    const localeSelector = init('uk');
    await delay(100);

    const localeSelectorEl = localeSelector.shadowRoot.querySelector('.locale-selector');
    expect(localeSelectorEl).to.exist;

    const searchInput = localeSelectorEl.querySelector('.locale-search');
    searchInput.value = 'en';
    searchInput.dispatchEvent(new Event('keyup'));

    const localeElements = localeSelectorEl.querySelectorAll('.locales li');
    localeElements.forEach((element) => {
      if (element.textContent.includes('en')) {
        expect(element.style.display).to.equal('');
      } else {
        expect(element.style.display).to.equal('none');
      }
    });
  });
});
