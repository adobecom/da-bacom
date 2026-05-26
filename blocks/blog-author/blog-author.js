const CAAS_AUTHOR_PREFIX = 'caas:blog-authors/';
const DEFAULT_COMPANY = 'Adobe';
const DEFAULT_COMPANY_URL = 'https://www.adobe.com/';

const SOCIAL_PLATFORMS = {
  'linkedin.com': { name: 'LinkedIn', icon: 'linkedin' },
  'twitter.com': { name: 'Twitter', icon: 'twitter' },
  'x.com': { name: 'X', icon: 'x' },
  'facebook.com': { name: 'Facebook', icon: 'facebook' },
  'instagram.com': { name: 'Instagram', icon: 'instagram' },
  'youtube.com': { name: 'YouTube', icon: 'youtube' },
  'reddit.com': { name: 'Reddit', icon: 'reddit' },
};

function getMetadata(name) {
  return document.querySelector(`meta[name="${name}"]`)?.content || '';
}

function resolvePlatform(href) {
  if (!href) return null;
  const match = Object.keys(SOCIAL_PLATFORMS).find((domain) => href.includes(domain));
  return match ? SOCIAL_PLATFORMS[match] : null;
}

function resolveLinkText(href, text) {
  if (text && text !== href) return text;
  return resolvePlatform(href)?.name || href;
}

function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, iframe, object, embed').forEach((el) => el.remove());
  [...doc.body.querySelectorAll('*')].forEach((el) => {
    [...el.attributes].forEach((attr) => {
      if (/^on/i.test(attr.name) || (attr.name === 'href' && /^javascript:/i.test(attr.value))) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return doc.body;
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

function buildAuthorElements(data) {
  const {
    picture, name, title, descriptionHtml, socialLinks, subscribe,
  } = data;

  let imageEl = null;
  if (picture) {
    imageEl = document.createElement('div');
    imageEl.className = 'blog-author-image';
    imageEl.append(picture);
  }

  const nameEl = document.createElement('p');
  nameEl.className = 'blog-author-name';
  nameEl.textContent = name;

  const infoEl = document.createElement('div');
  infoEl.className = 'blog-author-info';
  infoEl.append(nameEl);

  if (title) {
    const titleEl = document.createElement('p');
    titleEl.className = 'blog-author-title';
    titleEl.textContent = title;
    infoEl.append(titleEl);
  }

  if (descriptionHtml) {
    const descEl = document.createElement('div');
    descEl.className = 'blog-author-description';
    descEl.append(...sanitizeHtml(descriptionHtml).childNodes);
    infoEl.append(descEl);
  }

  if (socialLinks?.length) {
    const socialEl = document.createElement('div');
    socialEl.className = 'blog-author-social';

    socialLinks.forEach(({ href, text }) => {
      const platform = resolvePlatform(href);
      const a = document.createElement('a');
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', resolveLinkText(href, text));

      if (platform) {
        const icon = document.createElement('span');
        icon.className = `icon icon-${platform.icon}`;
        a.append(icon);
      } else {
        a.textContent = resolveLinkText(href, text);
      }

      socialEl.append(a);
    });

    infoEl.append(socialEl);
  }

  if (subscribe?.href) {
    const subEl = document.createElement('div');
    subEl.className = 'blog-author-subscribe';

    const textEl = document.createElement('p');
    textEl.textContent = 'Get the latest articles sent to your inbox.';

    const btn = document.createElement('a');
    btn.href = subscribe.href;
    btn.className = 'blog-author-subscribe-btn';
    btn.textContent = 'Subscribe';

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
      .map((href) => ({ href, text: href }));

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
  const fields = {};
  rows.forEach((row) => {
    const [keyCell, valueCell] = [...row.querySelectorAll(':scope > div')];
    const key = keyCell?.textContent?.trim().toLowerCase();
    if (key && valueCell) fields[key] = valueCell;
  });

  const img = fields.image?.querySelector('img');
  const socialAnchors = [...(fields.social?.querySelectorAll('a') || [])];
  const subscribeHref = fields.subscribe?.querySelector('a')?.getAttribute('href') || '';

  return {
    picture: fields.image?.querySelector('picture') || null,
    imageUrl: img?.src || '',
    name: fields.name?.textContent?.trim() || '',
    title: fields.title?.textContent?.trim() || '',
    descriptionHtml: fields.description?.innerHTML?.trim() || '',
    descriptionText: fields.description?.textContent?.trim() || '',
    socialLinks: socialAnchors.map((a) => ({ href: a.getAttribute('href'), text: a.textContent.trim() })),
    company: fields.company?.textContent?.trim() || DEFAULT_COMPANY,
    subscribe: subscribeHref ? { href: subscribeHref } : null,
  };
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
      el.replaceChildren(...buildAuthorElements(caasData));
      injectSchema(caasData);
    }
    return;
  }

  const data = parseRows(rows);

  // CaaS metadata fallback: use page caas-tags meta to populate missing content
  if (!data.name) {
    const authorTag = getMetadata('caas-tags')
      .split(',')
      .map((t) => t.trim())
      .find((t) => t.startsWith(CAAS_AUTHOR_PREFIX));

    if (authorTag) {
      const slug = authorTag.replace(CAAS_AUTHOR_PREFIX, '');
      const caasData = await fetchCaasAuthor(slug);
      if (caasData) {
        el.replaceChildren(...buildAuthorElements(caasData));
        injectSchema(caasData);
        return;
      }
    }

    window.lana?.log('blog-author: missing author name', { tags: 'blog-author', severity: 'warning' });
    return;
  }

  el.replaceChildren(...buildAuthorElements(data));
  injectSchema(data);
}
