import { LIBS } from '../../scripts/scripts.js';

const { getMetadata, getConfig } = await import(`${LIBS}/utils/utils.js`);
const { replaceKey } = await import(`${LIBS}/features/placeholders.js`);

const CAAS_AUTHOR_PREFIX = 'caas:blog-authors/';
const DEFAULT_COMPANY = 'Adobe';
const DEFAULT_COMPANY_URL = 'https://www.adobe.com/';

// Only platforms with icons available in the Milo/federal sprite.
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

async function buildAuthorElements(data) {
  const {
    picture, name, title, descriptionHtml, socialLinks, subscribe,
  } = data;

  const imageEl = picture || null;

  const nameEl = document.createElement('p');
  nameEl.textContent = name;

  const infoEl = document.createElement('div');
  infoEl.className = 'blog-author-info';
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

  return [imageEl, infoEl].filter(Boolean);
}

async function fetchCaasAuthor(slug) {
  try {
    const res = await fetch(`/blog/authors/${slug}.json`);
    if (!res.ok) {
      window.lana?.log(`blog-author: CaaS fetch failed for ${slug} (${res.status})`, { tags: 'blog-author', severity: 'warning' });
      return null;
    }
    const item = (await res.json())?.data?.[0];
    if (!item) {
      window.lana?.log(`blog-author: no CaaS data for ${slug}`, { tags: 'blog-author', severity: 'warning' });
      return null;
    }

    const socialLinks = (item['social-links'] || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((href) => ({ href }));

    return {
      picture: null,
      imageUrl: item.image || '',
      name: item.name || '',
      title: item['job-title'] || '',
      descriptionHtml: item.description || '',
      descriptionText: (item.description || '').replace(/<[^>]+>/g, ''),
      socialLinks,
      subscribe: null,
      company: item.company || DEFAULT_COMPANY,
    };
  } catch {
    window.lana?.log(`blog-author: CaaS fetch failed for ${slug}`, { tags: 'blog-author', severity: 'warning' });
    return null;
  }
}

function parseRows(rows) {
  let picture = null;
  let imageUrl = '';
  let name = '';
  let title = '';
  let descriptionHtml = '';
  let descriptionText = '';
  let socialLinks = [];
  let subscribe = null;

  for (const row of rows) {
    const cell = row.querySelector(':scope > div') || row;

    if (cell.querySelector('picture')) {
      picture = cell.querySelector('picture');
      imageUrl = cell.querySelector('img')?.src || '';
    } else if (cell.querySelector('a')) {
      const anchors = [...cell.querySelectorAll('a')].filter((a) => a.getAttribute('href'));
      const socialAnchors = anchors.filter((a) => resolvePlatform(a.getAttribute('href')));
      if (socialAnchors.length) {
        socialLinks = socialAnchors.map((a) => ({ href: a.getAttribute('href') }));
      } else if (anchors.length === 1) {
        subscribe = { href: anchors[0].getAttribute('href') };
      }
    } else {
      const parts = cell.innerHTML.split(/<br\s*\/?>/i).map((s) => s.trim()).filter(Boolean);
      if (parts.length) {
        [name] = parts;
        if (parts.length >= 2) [, title] = parts;
        if (parts.length >= 3) {
          descriptionHtml = parts.slice(2).join('<br>');
          descriptionText = parts.slice(2).map((s) => s.replace(/<[^>]+>/g, '')).join(' ').trim();
        }
      }
    }
  }

  return {
    picture,
    imageUrl,
    name,
    title,
    descriptionHtml,
    descriptionText,
    socialLinks,
    subscribe,
    company: DEFAULT_COMPANY,
  };
}

function decorateSocialIcons(el) {
  const spans = el.querySelectorAll('span.icon');
  if (!spans.length) return;
  import(`${LIBS}/features/icons/icons.js`)
    .then(({ default: loadIcons }) => loadIcons(spans))
    .catch(() => {});
}

export default async function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];
  if (!rows.length) return;

  // CaaS tag path: single row containing only a caas:blog-authors/ tag
  const firstCellText = rows[0]?.querySelector(':scope > div')?.textContent?.trim() || '';
  if (rows.length === 1 && firstCellText.startsWith(CAAS_AUTHOR_PREFIX)) {
    const slug = firstCellText.replace(CAAS_AUTHOR_PREFIX, '');
    const caasData = await fetchCaasAuthor(slug);
    if (caasData) {
      el.replaceChildren(...await buildAuthorElements(caasData));
      injectSchema(caasData);
      decorateSocialIcons(el);
    }
    return;
  }

  const data = parseRows(rows);

  // CaaS metadata fallback: use page caas-tags meta to populate missing content
  if (!data.name) {
    const authorTag = (getMetadata('caas-tags') ?? '')
      .split(',')
      .map((t) => t.trim())
      .find((t) => t.startsWith(CAAS_AUTHOR_PREFIX));

    if (authorTag) {
      const slug = authorTag.replace(CAAS_AUTHOR_PREFIX, '');
      const caasData = await fetchCaasAuthor(slug);
      if (caasData) {
        el.replaceChildren(...await buildAuthorElements(caasData));
        injectSchema(caasData);
        decorateSocialIcons(el);
        return;
      }
    }

    window.lana?.log('blog-author: missing author name', { tags: 'blog-author', severity: 'warning' });
    return;
  }

  el.replaceChildren(...await buildAuthorElements(data));
  injectSchema(data);
  decorateSocialIcons(el);
}
