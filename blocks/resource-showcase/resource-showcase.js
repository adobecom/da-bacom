import { LIBS } from '../../scripts/scripts.js';

/*
 * Authoring model (rows are the block's direct child divs):
 *  1. Heading row      - section heading text (or heading element)
 *  2. Featured row     - two cells: [picture + Heading 3 title + description paragraph(s)],
 *                        [CTA link]
 *  3+. Secondary rows  - two cells: [Heading 3 title + description paragraph(s)], [CTA link]
 *                        (one row per item, no picture)
 *
 * The CTA cell must contain an authored hyperlink (link text = CTA label,
 * link href = CTA destination), not plain text.
 */

const LANA_OPTIONS = { tags: 'resource-showcase', errorType: 'i' };

const CHEVRON_ICON = `<svg class="resource-showcase-chevron" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" focusable="false">
  <path d="M2.5 1L7.5 5L2.5 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function decorateCTA(link) {
  if (!link) return null;
  link.classList.add('resource-showcase-cta');
  link.insertAdjacentHTML('beforeend', CHEVRON_ICON);
  return link;
}

function buildItemBody(contentCell, ctaCell, { headingClass, descriptionClass }) {
  const heading = contentCell?.querySelector('h1, h2, h3, h4, h5, h6');
  const paragraphs = [...contentCell?.querySelectorAll('p') ?? []]
    .filter((p) => p.textContent.trim());

  const title = document.createElement('h3');
  title.className = headingClass;
  title.innerHTML = heading ? heading.innerHTML : '';

  const body = document.createElement('div');
  body.append(title);

  paragraphs.forEach((p) => {
    p.className = descriptionClass;
    body.append(p);
  });

  const cta = decorateCTA(ctaCell?.querySelector('a'));
  if (cta) body.append(cta);

  return body;
}

function buildFeatured(row) {
  const [contentCell, ctaCell] = row.querySelectorAll(':scope > div');
  const picture = contentCell?.querySelector('picture');

  const image = document.createElement('div');
  image.className = 'resource-showcase-featured-image';
  if (picture) image.append(picture);

  const body = buildItemBody(contentCell, ctaCell, {
    headingClass: 'resource-showcase-featured-title',
    descriptionClass: 'resource-showcase-featured-description',
  });
  body.className = 'resource-showcase-featured-body';

  const featured = document.createElement('div');
  featured.className = 'resource-showcase-featured';
  featured.append(image, body);
  return featured;
}

function buildSecondaryList(rows) {
  const list = document.createElement('ul');
  list.className = 'resource-showcase-list';

  rows.forEach((row) => {
    const [contentCell, ctaCell] = row.querySelectorAll(':scope > div');
    const body = buildItemBody(contentCell, ctaCell, {
      headingClass: 'resource-showcase-item-title',
      descriptionClass: 'resource-showcase-item-description',
    });
    body.className = 'resource-showcase-item-body';

    const item = document.createElement('li');
    item.className = 'resource-showcase-item';
    item.append(body);
    list.append(item);
  });

  return list;
}

export default async function init(el) {
  try {
    const { decorateBlockAnalytics } = await import(`${LIBS}/martech/attributes.js`);
    decorateBlockAnalytics(el);

    const rows = [...el.querySelectorAll(':scope > div')];
    const [headingRow, featuredRow, ...secondaryRows] = rows;
    if (!headingRow || !featuredRow) return;

    const headingSrc = headingRow.querySelector('h1, h2, h3, h4, h5, h6');
    const heading = document.createElement('h2');
    heading.className = 'resource-showcase-heading';
    heading.innerHTML = headingSrc ? headingSrc.innerHTML : headingRow.innerHTML;

    const content = document.createElement('div');
    content.className = 'resource-showcase-content';
    content.append(buildFeatured(featuredRow));
    if (secondaryRows.length) content.append(buildSecondaryList(secondaryRows));

    el.innerHTML = '';
    el.append(heading, content);
  } catch (err) {
    window.lana?.log(`Resource Showcase: ${err}`, LANA_OPTIONS);
  }
}
