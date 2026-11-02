import { LIBS } from '../../scripts/scripts.js';

export default async function init(el) {
  const { createTag, loadScript } = await import(`${LIBS}/utils/utils.js`);
  el.replaceChildren(createTag('div', { id: 'semrush-website-traffic-checker' }));
  await loadScript('https://static.semrush.com/free-tools-assets/development/widget-demo/v20.10.2026-2f0ffd6e61d864b34d18503b0fad8355/website-traffic-checker.js');
}
