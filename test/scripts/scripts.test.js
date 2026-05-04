import { readFile, setViewport } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';
import {
  setLibs,
  LIBS,
  getLCPImages,
  transformExlLinks,
  applyIswaTypography,
  injectMarqueePlayIcon,
  getMarketoLibs,
} from '../../scripts/scripts.js';

describe('Libs', () => {
  const tests = [
    ['https://business.adobe.com', '/libs'],
    ['https://business.adobe.com?milolibs=foo', '/libs'],
    ['https://business.stage.adobe.com', '/libs'],
    ['https://business.stage.adobe.com?milolibs=foo', 'https://foo--milo--adobecom.aem.live/libs'],
    ['https://business.stage.adobe.com?milolibs=awesome--milo--forkedowner', 'https://awesome--milo--forkedowner.aem.live/libs'],
    ['https://main--da-bacom--adobecom.aem.page/', 'https://main--milo--adobecom.aem.live/libs'],
    ['https://main--da-bacom--adobecom.aem.page/?milolibs=foo', 'https://foo--milo--adobecom.aem.live/libs'],
    ['https://main--da-bacom--adobecom.aem.page/?milolibs=local', 'http://localhost:6456/libs'],
    ['https://main--da-bacom--adobecom.aem.page/?milolibs=awesome--milo--forkedowner', 'https://awesome--milo--forkedowner.aem.live/libs'],
    ['https://main--da-bacom--adobecom.aem.live/', 'https://main--milo--adobecom.aem.live/libs'],
    ['https://main--da-bacom--adobecom.aem.live/?milolibs=foo', 'https://foo--milo--adobecom.aem.live/libs'],
    ['https://main--da-bacom--adobecom.aem.live/?milolibs=local', 'http://localhost:6456/libs'],
    ['https://main--da-bacom--adobecom.aem.live/?milolibs=awesome--milo--forkedowner', 'https://awesome--milo--forkedowner.aem.live/libs'],
    ['http://localhost:3000', 'https://main--milo--adobecom.aem.live/libs'],
    ['http://localhost:3000?milolibs=foo', 'https://foo--milo--adobecom.aem.live/libs'],
    ['http://localhost:3000?milolibs=local', 'http://localhost:6456/libs'],
    ['http://localhost:3000?milolibs=awesome--milo--forkedowner', 'https://awesome--milo--forkedowner.aem.live/libs'],
  ];

  tests.forEach(([url, expected]) => {
    it(`Sets libs for ${url}`, () => {
      const location = new URL(url);
      const libs = setLibs(location);
      expect(libs).to.equal(expected);
    });
  });

  it('Sets LIBS', () => {
    expect(LIBS).to.equal('https://main--milo--adobecom.aem.live/libs');
  });
});

const marqueeByDeviceBody = await readFile({ path: './mocks/marquee-by-device.html' });
const heroMarqueeByDeviceBody = await readFile({ path: './mocks/hero-marquee-by-device.html' });

describe('getLCPImages', () => {
  it('Gets background image from marquee', async () => {
    document.body.innerHTML = await readFile({ path: './mocks/marquee.html' });
    await setViewport({ width: 1400, height: 700 });
    const lcpImages = getLCPImages(document);
    expect(lcpImages[0]).to.equal(document.querySelector('#correct-image'));
  });

  it('Gets foreground image from marquee if no background for width', async () => {
    document.body.innerHTML = await readFile({ path: './mocks/marquee-foreground.html' });
    await setViewport({ width: 400, height: 200 });
    const lcpImages = getLCPImages(document);
    expect(lcpImages[0]).to.equal(document.querySelector('#mobile-image'));
  });

  it('Gets mobile background image from marquee', async () => {
    document.body.innerHTML = marqueeByDeviceBody;
    await setViewport({ width: 400, height: 200 });
    const lcpImages = getLCPImages(document);
    expect(lcpImages[0]).to.equal(document.querySelector('#mobile-image'));
  });

  it('Gets tablet background image from marquee', async () => {
    document.body.innerHTML = marqueeByDeviceBody;
    await setViewport({ width: 900, height: 400 });
    const lcpImages = getLCPImages(document);
    expect(lcpImages[0]).to.equal(document.querySelector('#tablet-image'));
  });

  it('Gets desktop background image from marquee', async () => {
    document.body.innerHTML = marqueeByDeviceBody;
    await setViewport({ width: 1400, height: 700 });
    const lcpImages = getLCPImages(document);
    expect(lcpImages[0]).to.equal(document.querySelector('#desktop-image'));
  });

  it('Gets mobile background image from hero marquee', async () => {
    document.body.innerHTML = heroMarqueeByDeviceBody;
    await setViewport({ width: 400, height: 200 });
    const lcpImages = getLCPImages(document);
    expect(lcpImages[0]).to.equal(document.querySelector('#mobile-image'));
  });

  it('Gets tablet background image from hero marquee', async () => {
    document.body.innerHTML = heroMarqueeByDeviceBody;
    await setViewport({ width: 900, height: 400 });
    const lcpImages = getLCPImages(document);
    expect(lcpImages[0]).to.equal(document.querySelector('#tablet-image'));
  });

  it('Gets desktop foreground image from hero marquee', async () => {
    document.body.innerHTML = heroMarqueeByDeviceBody;
    await setViewport({ width: 1400, height: 700 });
    const lcpImages = getLCPImages(document);
    expect(lcpImages[0]).to.equal(document.querySelector('#desktop-image'));
  });

  it('Gets background image from section', async () => {
    document.body.innerHTML = await readFile({ path: './mocks/section.html' });
    const lcpImages = getLCPImages(document);
    expect(lcpImages[0]).to.equal(document.querySelector('#correct-image'));
  });

  it('Gets image from outside marquee section', async () => {
    document.body.innerHTML = await readFile({ path: './mocks/img-outside-marquee.html' });
    const lcpImages = getLCPImages(document);
    expect(lcpImages[0]).to.equal(document.querySelector('#correct-image'));
  });
});

describe('Transform Experience League Links', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <a href="https://experienceleague.adobe.com/en/docs/experience-manager">Link 1</a>
      <a href="https://experienceleague.adobe.com/docs/experience-manager.html?lang=en">Link 2</a>
      <a href="https://experienceleague.adobe.com/en/docs/experience-manager#_dnt">Link 3</a>
      <a href="https://business.adobe.com">Link 4</a>
    `;
  });

  it('does not transform links when locale is US', () => {
    const locale = { ietf: 'en-US' };
    transformExlLinks(locale);
    const links = document.querySelectorAll('a');
    expect(links[0].href).to.equal('https://experienceleague.adobe.com/en/docs/experience-manager');
    expect(links[1].href).to.equal('https://experienceleague.adobe.com/docs/experience-manager.html?lang=en');
  });

  it('does not transform links when locale has no exl property', () => {
    const locale = { ietf: 'fr-FR' };
    transformExlLinks(locale);
    const links = document.querySelectorAll('a');
    expect(links[0].href).to.equal('https://experienceleague.adobe.com/en/docs/experience-manager');
    expect(links[1].href).to.equal('https://experienceleague.adobe.com/docs/experience-manager.html?lang=en');
  });

  it('transforms links with .html?lang=en', () => {
    const locale = { ietf: 'fr-FR', exl: 'fr' };
    transformExlLinks(locale);
    const links = document.querySelectorAll('a');
    expect(links[1].href).to.equal('https://experienceleague.adobe.com/fr/docs/experience-manager');
  });

  it('transforms links with /en/', () => {
    const locale = { ietf: 'fr-FR', exl: 'fr' };
    transformExlLinks(locale);
    const links = document.querySelectorAll('a');
    expect(links[0].href).to.equal('https://experienceleague.adobe.com/fr/docs/experience-manager');
  });

  it('does not transform links with #_dnt', () => {
    const locale = { ietf: 'fr-FR', exl: 'fr' };
    transformExlLinks(locale);
    const links = document.querySelectorAll('a');
    expect(links[2].href).to.equal('https://experienceleague.adobe.com/en/docs/experience-manager#_dnt');
  });

  it('does not transform non-experienceleague links', () => {
    const locale = { ietf: 'fr-FR', exl: 'fr' };
    transformExlLinks(locale);
    const links = document.querySelectorAll('a');
    expect(links[3].href).to.equal('https://business.adobe.com/');
  });
});

describe('ISWA Typography', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main>
        <div class="section">
          <div class="text center">Text block</div>
          <div class="carousel">Carousel block</div>
          <div class="icon-block">Icon block</div>
          <div class="brick">Brick block</div>
        </div>
      </main>
    `;
  });

  it('adds iswa-main class to main', () => {
    applyIswaTypography();
    const main = document.querySelector('main');
    expect(main.classList.contains('iswa-main')).to.be.true;
  });

  it('adds iswa class to blocks', () => {
    applyIswaTypography();
    expect(document.querySelector('.text').classList.contains('iswa')).to.be.true;
    expect(document.querySelector('.carousel').classList.contains('iswa')).to.be.true;
    expect(document.querySelector('.brick').classList.contains('iswa')).to.be.true;
  });

  it('does not add iswa class to icon-block', () => {
    applyIswaTypography();
    expect(document.querySelector('.icon-block').classList.contains('iswa')).to.be.false;
  });

  it('does nothing when main is not present', () => {
    document.body.innerHTML = '';
    applyIswaTypography();
    expect(document.querySelector('.iswa-main')).to.not.exist;
  });
});

describe('injectMarqueePlayIcon', () => {
  const MILO_EVENTS = { DEFERRED: 'milo:deferred-test' };

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('injects play SVG and marks the icon when marquee contains span.icon-play', () => {
    document.body.innerHTML = `
      <div class="marquee">
        <span class="icon icon-play"></span>
      </div>
    `;
    injectMarqueePlayIcon(MILO_EVENTS);
    const icon = document.querySelector('span.icon-play');
    expect(icon.querySelector('svg.icon-milo-play')).to.exist;
    expect(icon.dataset.svgInjected).to.equal('true');
    expect(icon.classList.contains('margin-inline-end')).to.be.true;
  });

  it('does nothing when there is no marquee', () => {
    document.body.innerHTML = '<div class="aside">Aside block<span class="icon icon-play"></span></div>';
    injectMarqueePlayIcon(MILO_EVENTS);
    expect(document.querySelector('svg')).to.not.exist;
  });

  it('does nothing when marquee has no play icon', () => {
    document.body.innerHTML = '<div class="marquee"><span class="icon icon-other"></span></div>';
    injectMarqueePlayIcon(MILO_EVENTS);
    expect(document.querySelector('svg')).to.not.exist;
  });
});

describe('Marketo Libs', () => {
  const tests = [
    ['https://business.adobe.com', '', null],
    ['https://business.adobe.com?marketolibs=main', '', 'https://main--da-marketo--adobecom.aem.live/mkto'],
    ['https://business.adobe.com?marketolibs=stage', '', 'https://stage--da-marketo--adobecom.aem.live/mkto'],
    ['https://business.adobe.com?marketolibs=foo', '', null],
    ['https://business.adobe.com?marketolibs=awesome--da-marketo--forkedowner', '', null],
    ['https://business.adobe.com', 'main', 'https://main--da-marketo--adobecom.aem.live/mkto'],
    ['https://business.adobe.com', 'stage', 'https://stage--da-marketo--adobecom.aem.live/mkto'],
    ['https://business.adobe.com', 'local', null],
    ['https://business.adobe.com', 'foo', null],
    ['https://business.stage.adobe.com', '', null],
    ['https://business.stage.adobe.com?marketolibs=main', '', 'https://main--da-marketo--adobecom.aem.live/mkto'],
    ['https://business.stage.adobe.com?marketolibs=awesome--da-marketo--forkedowner', '', 'https://awesome--da-marketo--forkedowner.aem.live/mkto'],
    ['https://business.stage.adobe.com', 'awesome--da-marketo--forkedowner', 'https://awesome--da-marketo--forkedowner.aem.live/mkto'],
    ['https://main--da-bacom--adobecom.aem.page/', '', null],
    ['https://main--da-bacom--adobecom.aem.page/?marketolibs=foo', '', 'https://foo--da-marketo--adobecom.aem.live/mkto'],
    ['https://main--da-bacom--adobecom.aem.page/?marketolibs=local', '', 'http://localhost:6586/mkto'],
    ['https://main--da-bacom--adobecom.aem.page/?marketolibs=awesome--da-marketo--forkedowner', '', 'https://awesome--da-marketo--forkedowner.aem.live/mkto'],
    ['http://localhost:3000', '', null],
    ['http://localhost:3000?marketolibs=foo', '', 'https://foo--da-marketo--adobecom.aem.live/mkto'],
    ['http://localhost:3000?marketolibs=local', '', 'http://localhost:6586/mkto'],
    ['http://localhost:3000?marketolibs=awesome--da-marketo--forkedowner', '', 'https://awesome--da-marketo--forkedowner.aem.live/mkto'],
  ];

  tests.forEach(([url, metadata, expected]) => {
    it(`Sets marketo libs for ${url} ${metadata ? `with metadata ${metadata}` : ''}`, () => {
      const location = new URL(url);
      const libs = getMarketoLibs(location, () => metadata);

      expect(libs).to.equal(expected);
    });
  });
});
