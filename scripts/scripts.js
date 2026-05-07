import LOCALES from './locales.js';

const STYLES = ['/styles/styles.css'];
const CONFIG = {
  imsClientId: 'bacom',
  imsScope: 'AdobeID,openid,gnav,pps.read,firefly_api,additional_info.roles,read_organizations,account_cluster.read',
  local: {
    pdfViewerClientId: '3b685312b5784de6943647df19f1f492',
    pdfViewerReportSuite: 'adbadobedxqa',
  },
  page: {
    pdfViewerClientId: 'ce759fc714064892aec63d71b39b6f3e',
    pdfViewerReportSuite: 'adbadobedxqa',
  },
  live: {
    pdfViewerClientId: 'c4728f7d1a344f74b04252d1259a986c',
    pdfViewerReportSuite: 'adbadobedxqa',
  },
  stage: {
    edgeConfigId: '7d1ba912-10b6-4384-a8ff-4bfb1178e869',
    pdfViewerClientId: '1573324fdb644866b51580fbaa5b6465',
    pdfViewerReportSuite: 'adbadobedxqa',
  },
  prod: {
    edgeConfigId: '65acfd54-d9fe-405c-ba04-8342d6782ab0',
    pdfViewerClientId: '16769f4e1e7b4e3b94c1ed23eafb8870',
    pdfViewerReportSuite: 'adbadobenonacdcprod,adbadobedxprod,adbadobeprototype',
  },
  locales: LOCALES,
  geoRouting: 'on',
  productionDomain: 'business.adobe.com',
  prodDomains: ['business.adobe.com', 'www.adobe.com', 'helpx.adobe.com'],
  autoBlocks: [
    { iframe: 'https://adobe-ideacloud.forgedx.com' },
    { iframe: 'https://adobe.ideacloud.com' },
  ],
  htmlExclude: [
    /business\.adobe\.com\/(\w\w(_\w\w)?\/)?blog(\/.*)?/,
    /experience\.adobe\.com(\/.*)?/,
  ],
  useDotHtml: true,
  dynamicNavKey: 'bacom',
  stageDomainsMap: {
    'business.stage.adobe.com': {
      'business.adobe.com': 'origin',
      'helpx.adobe.com': 'helpx.stage.adobe.com',
    },
    '.business-graybox.adobe.com': { 'business.adobe.com': 'origin' },
  },
  jarvis: {
    id: 'BACOMChat1-Worldwide',
    version: '1.0',
    onDemand: false,
  },
  atvCaptionsKey: 'bacom',
  uniqueSiteId: 'da-bacom',
  mepLingoCountryToRegion: {
    africa: ['ke', 'mu', 'ng', 'za'],
    la: ['bo', 'cr', 'do', 'ec', 'gt', 'pa', 'pr', 'py', 'sv', 'uy', 've', 'ar', 'co', 'cl', 'mx', 'pe'],
    mena_en: ['bh', 'dz', 'iq', 'ir', 'jo', 'lb', 'ly', 'om', 'ps', 'qa', 'sy', 'tn', 'ye'],
  },
  lingoProjectSuccessLogging: 'on',
  onlybanner: true,
};

const PLAY_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18" class="icon-milo icon-milo-play"><path fill="currentColor" fill-rule="evenodd" d="M4.73,2H3.5a.5.5,0,0,0-.5.5v13a.5.5,0,0,0,.5.5H4.73a1,1,0,0,0,.5035-.136l11.032-6.433a.5.5,0,0,0,0-.862L5.2335,2.136A1,1,0,0,0,4.73,2Z"/></svg>';

const eagerLoad = (img) => {
  img?.setAttribute('loading', 'eager');
  img?.setAttribute('fetchpriority', 'high');
};

const loadStyle = (path) => {
  const link = document.createElement('link');
  link.setAttribute('rel', 'stylesheet');
  link.setAttribute('href', path);
  document.head.appendChild(link);
};

export const getLCPImages = (doc) => {
  const lcpSection = doc.querySelector('.marquee, .hero-marquee, .section-metadata img');
  if (!lcpSection) return [doc.querySelector('img')];
  if (lcpSection.nodeName === 'IMG') return [lcpSection];
  if (lcpSection.classList.contains('split')) return lcpSection.querySelectorAll('img');
  const marqueeDiv = lcpSection.firstElementChild;
  const foregroundImg = lcpSection.querySelector(':scope > div:last-child img');
  if (marqueeDiv.childElementCount > 1) {
    if (window.innerWidth < 600) return [marqueeDiv.querySelector(':scope > div:first-child img') || foregroundImg];
    if (window.innerWidth >= 600 && window.innerWidth < 1200) return [marqueeDiv.querySelector(':scope > div:nth-child(2) img') || foregroundImg];
    if (window.innerWidth >= 1200) return [marqueeDiv.querySelector(':scope > div:last-child img') || foregroundImg];
  }
  return [lcpSection.querySelector('img') || doc.querySelector('img')];
};

(async function loadLCPImage() {
  const lcpImages = getLCPImages(document);
  lcpImages?.forEach(eagerLoad);
}());

export function setLibs(location) {
  const { hostname, search } = location;
  if (!['.aem.', '.hlx.', '.stage.', 'local', '.da.'].some((i) => hostname.includes(i))) return '/libs';
  const branch = new URLSearchParams(search).get('milolibs') || 'main';
  if (!/^[a-zA-Z0-9_-]+$/.test(branch)) throw new Error('Invalid branch name.');
  if (branch === 'local') return 'http://localhost:6456/libs';
  if (branch === 'main' && hostname.includes('.stage.')) return '/libs';
  return branch.includes('--') ? `https://${branch}.aem.live/libs` : `https://${branch}--milo--adobecom.aem.live/libs`;
}

export function getMarketoLibs(location = window.location, getMetadata = null) {
  const { search, hostname } = location;
  const branch = new URLSearchParams(search).get('marketolibs') || getMetadata?.('marketo-libs');
  if (!branch) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(branch)) throw new Error('Invalid branch name.');
  if (!['.aem.', '.hlx.', '.stage.', 'local', '.da.'].some((i) => hostname.includes(i))) {
    if (branch === 'main') return 'https://main--da-marketo--adobecom.aem.live/mkto';
    if (branch === 'stage') return 'https://stage--da-marketo--adobecom.aem.live/mkto';
    return null;
  }
  if (branch === 'local') return 'http://localhost:6586/mkto';
  return branch.includes('--') ? `https://${branch}.aem.live/mkto` : `https://${branch}--da-marketo--adobecom.aem.live/mkto`;
}

export const LIBS = setLibs(window.location);

(function loadStyles() {
  const paths = [`${LIBS}/styles/styles.css`];
  if (STYLES) {
    paths.push(...(Array.isArray(STYLES) ? STYLES : [STYLES]));
  }
  paths.forEach(loadStyle);
}());

export function applyIswaTypography() {
  const main = document.querySelector('main');
  if (!main) return;
  main.classList.add('iswa-main');
  main.querySelectorAll('.section > div[class]').forEach((block) => {
    if (!block.classList.contains('icon-block') && block.classList.length > 0) block.classList.add('iswa');
  });
}

export function transformExlLinks(locale, root = document) {
  if (locale.ietf === 'en-US' || !locale.exl) return;
  const exLinks = root.querySelectorAll('a[href*="experienceleague.adobe.com"]');
  exLinks.forEach((link) => {
    if (link.href.includes('#_dnt')) return;
    if (link.href.includes('.html?lang=en')) {
      link.href = link.href.replace('.html?lang=en', '').replace('https://experienceleague.adobe.com/', `https://experienceleague.adobe.com/${locale.exl}/`);
    }
    link.href = link.href.replace('/en/', `/${locale.exl}/`);
  });
}

export function injectMarqueePlayIcon(MILO_EVENTS) {
  const marquee = document.querySelector('.marquee, .hero-marquee');
  const marqueePlayIcon = marquee?.querySelector('span.icon-play');
  if (!marqueePlayIcon) return;

  marqueePlayIcon.innerHTML = PLAY_SVG;
  marqueePlayIcon.dataset.svgInjected = 'true';
  marqueePlayIcon.classList.add('margin-inline-end');
  document.addEventListener(MILO_EVENTS.DEFERRED, async () => {
    const marqueePlaySvg = marqueePlayIcon.querySelector('svg');
    const { default: loadIcons } = await import(`${LIBS}/features/icons/icons.js`);
    delete marqueePlayIcon.dataset.svgInjected;
    await loadIcons([marqueePlayIcon]);
    marqueePlaySvg?.remove();
  }, { once: true });
}

export const EVENT_LIBS = (() => {
  const version = 'v1';
  const { hostname, search } = window.location;

  if (!['.aem.', '.hlx.', 'local'].some((i) => hostname.includes(i))) return `/event-libs/${version}`;
  const branch = new URLSearchParams(search).get('eventlibs') || 'main';
  if (branch === 'local') return `http://localhost:3868/event-libs/${version}`;
  if (branch.includes('--')) return `https://${branch}.aem.live/event-libs/${version}`;
  return `https://${branch}--event-libs--adobecom.aem.live/event-libs/${version}`;
})();

let eventsError;

export async function loadPage() {
  const {
    loadArea, loadLana, setConfig, getConfig, createTag, getMetadata, getLocale, MILO_EVENTS,
  } = await import(`${LIBS}/utils/utils.js`);

  let eventUtils;
  const eventMD = getMetadata('event-id');

  if (eventMD) {
    try {
      eventUtils = await import(`${EVENT_LIBS}/libs.js`);
    } catch (e) {
      eventsError = [`Could not import event-libs. ${e}`, { tags: 'event-libs' }];
    }
  }

  if (getMetadata('template') === '404') window.SAMPLE_PAGEVIEWS_AT_RATE = 'high';

  const metaCta = document.querySelector('meta[name="chat-cta"]');
  if (metaCta && !document.querySelector('.chat-cta')) {
    const isMetaCtaDisabled = metaCta?.content === 'off';
    if (!isMetaCtaDisabled) {
      const chatDiv = createTag('div', { class: 'chat-cta meta-cta', 'data-content': metaCta.content });
      const lastSection = document.body.querySelector('main > div:last-of-type');
      if (lastSection) lastSection.insertAdjacentElement('beforeend', chatDiv);
    }
  }

  const chatWidgetFrag = document.querySelector('meta[name="chat-widget"');
  if (chatWidgetFrag) {
    const a = createTag('a', { href: chatWidgetFrag.content }, chatWidgetFrag.content);
    const lastSection = document.body.querySelector('main > div:last-of-type');
    if (lastSection) lastSection.insertAdjacentElement('beforeend', a);
  }

  let eventConfigItems;

  if (eventUtils) {
    eventConfigItems = {
      decorateArea: (area = document) => eventUtils?.decorateEvent(area),
      externalLibs: [
        {
          base: EVENT_LIBS,
          blocks: eventUtils.EVENT_BLOCKS, // or your custom EVENT_BLOCKS_OVERRIDE
        },
      ],
    };
  }

  const locale = getLocale(CONFIG.locales);
  const baseDecorateArea = eventConfigItems?.decorateArea;
  const decorateArea = (area) => {
    transformExlLinks(locale, area);
    baseDecorateArea?.(area);
  };
  setConfig({ ...CONFIG, ...eventConfigItems, decorateArea, miloLibs: LIBS });

  if (eventMD && eventUtils?.setEventConfig) eventUtils.setEventConfig({ cmsType: 'DA' }, CONFIG);
  if (eventMD && eventUtils?.decorateEvent) eventUtils.decorateEvent(document);

  loadLana({
    clientId: 'bacom',
    tags: 'bacom',
    endpoint: 'https://business.adobe.com/lana/ll',
    endpointStage: 'https://business.stage.adobe.com/lana/ll',
  });
  transformExlLinks(locale);
  injectMarqueePlayIcon(MILO_EVENTS);

  const MARKETO_LIBS = getMarketoLibs(window.location, getMetadata);

  if (MARKETO_LIBS) {
    try {
      const mkto = await import(`${MARKETO_LIBS}/libs.js`);
      mkto.register({ getConfig, setConfig });
    } catch (e) {
      window.lana?.log(`Could not load marketo-libs. ${e}`, { tags: 'marketo-libs', severity: 'error' });
    }
  }

  await loadArea();

  if (getMetadata('iswa-typography') === 'on') applyIswaTypography();

  if (eventMD && eventUtils?.eventsDelayedActions) {
    eventUtils.eventsDelayedActions();
  }

  if (document.querySelector('meta[name="aa-university"]')) {
    const { default: registerAAUniversity } = await import('./aa-university.js');
    window.addEventListener('mktoSubmit', registerAAUniversity);
  }
  if (document.querySelector('.faas')) {
    loadStyle('/styles/faas.css');
  }
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.responseStatus === 404) {
        window.lana?.log(
          `The resource ${entry.name} returned a 404 status.`,
          { severity: 'warning', tags: 'resource-404' },
        );
      }
    });
  });
  observer.observe({ type: 'resource', buffered: true });
}
loadPage();

// DA Live Preview
(async function loadDa() {
  const { searchParams } = new URL(window.location.href);
  if (!searchParams.get('dapreview')) return;
  // eslint-disable-next-line import/no-unresolved
  import('https://da.live/scripts/dapreview.js').then(({ default: daPreview }) => daPreview(loadPage));
  const hasQE = searchParams.has('quick-edit');
  // eslint-disable-next-line import/no-unresolved
  if (hasQE) import('./quick-edit.js').then((mod) => mod.default());
}());

if (eventsError) {
  window.lana?.log([eventsError[0], eventsError[1]], { severity: 'error', tags: 'events' });
}
