import { LIBS } from '../../scripts/scripts.js';

const { getMetadata, getConfig } = await import(`${LIBS}/utils/utils.js`);
const { replaceKey } = await import(`${LIBS}/features/placeholders.js`);

const DEFAULT_COMPANY = 'Adobe';
const DEFAULT_COMPANY_URL = 'https://www.adobe.com/';

const SOCIAL_PLATFORMS = {
  'linkedin.com': { name: 'LinkedIn', icon: 'linkedin' },
  'twitter.com': { name: 'X', icon: 'twitter' },
  'x.com': { name: 'X', icon: 'twitter' },
  'facebook.com': { name: 'Facebook', icon: 'facebook' },
  'instagram.com': { name: 'Instagram', icon: 'instagram' },
};

function resolvePlatform(href) {
  if (!href) return null;
  const match = Object.keys(SOCIAL_PLATFORMS).find((domain) => href.includes(domain));
  return match ? SOCIAL_PLATFORMS[match] : null;
}

function buildPersonSchema({
  name, imageUrl, title, descriptionText, company, socialLinks,
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    url: window.location.href,
    jobTitle: title,
    worksFor: {
      '@type': 'Organization',
      name: company || DEFAULT_COMPANY,
      url: DEFAULT_COMPANY_URL,
    },
  };

  if (imageUrl) schema.image = imageUrl;
  if (descriptionText) schema.description = descriptionText;
  const sameAs = socialLinks?.map((l) => l.href).filter(Boolean);
  if (sameAs?.length) schema.sameAs = sameAs;

  return schema;
}

function injectSchema(data) {
  const script = document.createElement('script');
  script.setAttribute('type', 'application/ld+json');
  script.textContent = JSON.stringify(buildPersonSchema(data));
  document.head.append(script);
}

async function buildAuthorElements({
  picture, name, title, descriptionHtml, socialLinks, subscribe,
}) {
  const infoEl = document.createElement('div');
  infoEl.className = 'blog-author-info';

  const nameEl = document.createElement('p');
  nameEl.textContent = name;
  infoEl.append(nameEl);

  if (title) {
    const titleEl = document.createElement('p');
    titleEl.textContent = title;
    infoEl.append(titleEl);
  }

  if (descriptionHtml) {
    const descEl = document.createElement('div');
    descEl.className = 'blog-author-description';
    descEl.innerHTML = descriptionHtml;
    infoEl.append(descEl);
  }

  if (socialLinks?.length) {
    const socialEl = document.createElement('div');
    socialEl.className = 'blog-author-social';

    socialLinks.forEach(({ href }) => {
      const platform = resolvePlatform(href);
      if (!platform) return;

      const a = document.createElement('a');
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', platform.name);
      const icon = document.createElement('span');
      icon.className = `icon icon-${platform.icon}`;
      a.append(icon);
      socialEl.append(a);
    });

    if (socialEl.children.length) infoEl.append(socialEl);
  }

  if (subscribe?.href) {
    const subEl = document.createElement('div');
    subEl.className = 'blog-author-subscribe';

    const cfg = getConfig();
    const [subscribeText, subscribeBtnText] = cfg.locale
      ? await Promise.all([
        replaceKey('get-the-latest-articles', cfg),
        replaceKey('subscribe', cfg),
      ])
      : ['Get the latest articles sent to your inbox.', 'Subscribe'];

    const textEl = document.createElement('p');
    textEl.textContent = subscribeText;

    const btn = document.createElement('a');
    btn.href = subscribe.href;
    btn.textContent = subscribeBtnText;

    subEl.append(textEl, btn);
    infoEl.append(subEl);
  }

  return [picture, infoEl].filter(Boolean);
}

function decorateSocialIcons(el) {
  const spans = el.querySelectorAll('span.icon');
  if (!spans.length) return;
  import(`${LIBS}/features/icons/icons.js`)
    .then(({ default: loadIcons }) => loadIcons(spans))
    .catch(() => {});
}

export default async function init(el) {
  const name = getMetadata('author');
  if (!name) {
    window.lana?.log('blog-author: missing author metadata', { tags: 'blog-author', severity: 'warning' });
    return;
  }

  const imageUrl = getMetadata('author-image') || '';
  const title = getMetadata('author-title') || '';
  const descriptionHtml = getMetadata('author-description') || '';
  const descriptionText = descriptionHtml.replace(/<[^>]+>/g, '');
  const company = getMetadata('author-company') || DEFAULT_COMPANY;
  const socialLinksRaw = getMetadata('author-social-links') || '';
  const socialLinks = socialLinksRaw.split(',').map((s) => s.trim()).filter(Boolean).map((href) => ({ href }));

  let picture = null;
  if (imageUrl) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = name;
    picture = document.createElement('picture');
    picture.append(img);
  }

  const data = {
    picture,
    imageUrl,
    name,
    title,
    descriptionHtml,
    descriptionText,
    socialLinks,
    subscribe: null,
    company,
  };

  el.replaceChildren(...await buildAuthorElements(data));
  injectSchema(data);
  decorateSocialIcons(el);
}
