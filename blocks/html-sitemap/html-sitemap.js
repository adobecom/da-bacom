import { LIBS } from '../../scripts/scripts.js';

const HEADING_SELECTOR = 'h1,h2,h3,h4,h5,h6,strong,b';
const FOOTER_WAIT_TIMEOUT = 1500;

const titleCase = (text) => text
  .split(/[\s_-]+/)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const normalizePathname = (path) => {
  try {
    const url = new URL(path, window.location.origin);
    const pathname = url.pathname.replace(/\/$/, '');
    return pathname || '/';
  } catch (e) {
    return path;
  }
};

const getSectionKey = (path, localeKey) => {
  const cleanPath = normalizePathname(path).replace(/\.html$/, '');
  const segments = cleanPath.split('/').filter(Boolean);
  if (localeKey && segments[0] === localeKey) segments.shift();
  return segments[0] || 'home';
};

const dedupeLinks = (links) => {
  const seen = new Set();
  return links.filter(({ href }) => {
    const key = normalizePathname(href);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildSection = (title, links, createTag) => {
  if (!links.length) return null;

  const section = createTag('div', { class: 'html-sitemap-section' });
  const heading = createTag('h3', { class: 'html-sitemap-section-title' }, title);
  const list = createTag('ul', { class: 'html-sitemap-links' });

  dedupeLinks(links).sort((a, b) => a.label.localeCompare(b.label))
    .forEach(({ href, label }) => {
      const item = createTag('li');
      const anchor = createTag('a', { href }, label || href);
      item.append(anchor);
      list.append(item);
    });

  section.append(heading, list);
  return section;
};

const parseAuthoredSections = (el) => {
  const rows = [...el.children].filter((child) => child.tagName === 'DIV');
  const sections = rows.map((row, index) => {
    const heading = row.querySelector(HEADING_SELECTOR);
    const links = [...row.querySelectorAll('a')].map((link) => ({
      href: link.href || link.getAttribute('href'),
      label: link.textContent.trim() || link.href,
    })).filter(({ href }) => !!href);

    if (!links.length) return null;
    const title = heading?.textContent.trim() || `Links ${index + 1}`;
    return { title, links: dedupeLinks(links) };
  }).filter(Boolean);

  return sections;
};

const parseFooterSections = (footer) => {
  if (!footer) return [];

  const sections = [];
  const footerHeadings = footer.querySelectorAll('h2, h3, h4, h5, h6, strong');

  footerHeadings.forEach((heading) => {
    const headingText = heading.textContent?.trim();
    const list = heading.closest('div')?.querySelector('ul') || heading.parentElement?.querySelector('ul');
    const links = list ? [...list.querySelectorAll('a')] : [];

    if (headingText && links.length) {
      sections.push({
        title: headingText,
        links: dedupeLinks(links.map((link) => ({
          href: link.href || link.getAttribute('href'),
          label: link.textContent.trim() || link.href,
        })).filter(({ href }) => !!href)),
      });
    }
  });

  if (!sections.length) {
    const fallbackLinks = dedupeLinks([...footer.querySelectorAll('a')]
      .map((link) => ({
        href: link.href || link.getAttribute('href'),
        label: link.textContent.trim() || link.href,
      }))
      .filter(({ href }) => !!href));

    if (fallbackLinks.length) {
      sections.push({ title: 'Footer links', links: fallbackLinks });
    }
  }

  return sections;
};

const waitForFooterSections = (timeout = FOOTER_WAIT_TIMEOUT) => new Promise((resolve) => {
  const start = performance.now();
  const check = () => {
    const footer = document.querySelector('footer');
    const sections = parseFooterSections(footer);
    const elapsed = performance.now() - start;

    if (sections.length || elapsed > timeout) {
      resolve(sections);
    } else {
      requestAnimationFrame(check);
    }
  };

  check();
});

const fetchQueryIndex = async (localeKey) => {
  const base = localeKey ? `/${localeKey}/query-index.json` : '/query-index.json';
  let url = new URL(base, window.location.origin);
  const records = [];

  while (url) {
    // eslint-disable-next-line no-await-in-loop
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to load ${url}`);

    // eslint-disable-next-line no-await-in-loop
    const json = await response.json();
    const { total = 0, offset = 0, limit = 0, data = [] } = json[':type'] === 'multi-sheet' ? json.sitemap : json;
    if (!Array.isArray(data) || data.length === 0) break;

    records.push(...data);
    const remaining = total - offset - limit;

    if (!limit || remaining <= 0) {
      url = null;
    } else {
      url = new URL(base, window.location.origin);
      url.searchParams.set('limit', limit);
      url.searchParams.set('offset', offset + limit);
    }
  }

  return records;
};

const getLocaleInfo = (locales = {}) => {
  const path = window.location.pathname;
  const localeKey = Object.keys(locales).find((key) => key && path.startsWith(`/${key}/`)) || '';
  const locale = locales[localeKey] || locales[''] || {};
  const baseKey = locale.base ?? localeKey;
  const targetLocales = Object.entries(locales)
    .filter(([key, info]) => (info.base ?? key) === baseKey)
    .map(([key]) => key);

  if (!targetLocales.includes(localeKey)) targetLocales.push(localeKey);

  return { localeKey, baseKey, targetLocales };
};

const buildDynamicSections = async (localeInfo, createTag) => {
  const { targetLocales } = localeInfo;
  const sectionsMap = new Map();

  const results = await Promise.allSettled(targetLocales.map(async (localeKey) => ({
    localeKey,
    data: await fetchQueryIndex(localeKey),
  })));

  results.forEach((result, index) => {
    if (result.status !== 'fulfilled') {
      const localeKey = targetLocales[index];
      window.lana?.log(`html-sitemap: failed to load sitemap for ${localeKey}`, { tags: 'info,html-sitemap' });
      return;
    }

    const { localeKey, data } = result.value;
    data.forEach((page) => {
      if (page.robots?.toLowerCase().includes('noindex')) return;
      const href = normalizePathname(page.path);
      const sectionKey = getSectionKey(href, localeKey);
      if (!sectionsMap.has(sectionKey)) sectionsMap.set(sectionKey, []);
      sectionsMap.get(sectionKey).push({
        href,
        label: page.title || href,
      });
    });
  });

  return [...sectionsMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sectionKey, links]) => buildSection(titleCase(sectionKey), links, createTag))
    .filter(Boolean);
};

const renderGroup = (title, sections, createTag) => {
  if (!sections.length) return null;
  const group = createTag('section', { class: 'html-sitemap-group' });
  const heading = createTag('h2', { class: 'html-sitemap-group-title' }, title);
  const listWrapper = createTag('div', { class: 'html-sitemap-section-list' });

  sections.forEach((section) => listWrapper.append(section));
  group.append(heading, listWrapper);
  return group;
};

export default async function init(el) {
  const { createTag, getConfig } = await import(`${LIBS}/utils/utils.js`);
  const authoredSections = parseAuthoredSections(el);
  const wrapper = createTag('div', { class: 'html-sitemap-wrapper' });

  const staticGroupPlaceholder = createTag('div', { class: 'html-sitemap-placeholder html-sitemap-placeholder-static' });
  const dynamicGroupPlaceholder = createTag('div', { class: 'html-sitemap-placeholder html-sitemap-placeholder-dynamic' }, 'Loading sitemap…');

  wrapper.append(staticGroupPlaceholder, dynamicGroupPlaceholder);
  el.replaceChildren(wrapper);

  const staticSections = authoredSections.length ? authoredSections
    : await waitForFooterSections();

  const renderedStatic = renderGroup('Static links', staticSections.map(({ title, links }) => (
    buildSection(title, links, createTag)
  )).filter(Boolean), createTag);

  if (renderedStatic) {
    staticGroupPlaceholder.replaceWith(renderedStatic);
  } else {
    staticGroupPlaceholder.remove();
  }

  const localeInfo = getLocaleInfo(getConfig()?.locales);
  const dynamicSections = await buildDynamicSections(localeInfo, createTag);
  const renderedDynamic = renderGroup('Dynamic links', dynamicSections, createTag);

  if (renderedDynamic) {
    dynamicGroupPlaceholder.replaceWith(renderedDynamic);
  } else {
    dynamicGroupPlaceholder.textContent = 'No sitemap entries found.';
  }
}
