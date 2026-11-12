export function normalizeLinks(links, pageURL) {
  const { origin } = new URL(pageURL);
  const groups = new Map();
  for (const [text, href] of links) {
    const label = text.trim().replace(/\s+/g, ' ');
    const url = new URL(href, pageURL);
    const destination = url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : url.href;
    const destinations = groups.get(label) || [];
    destinations.push(destination);
    groups.set(label, destinations);
  }
  return Object.fromEntries([...groups].map(([label, destinations]) => [label, destinations.sort()]));
}

export function compareLinks(baseline, target) {
  return Object.fromEntries(Object.entries(baseline).flatMap(([label, destinations]) => {
    const targetDestinations = Object.prototype.hasOwnProperty.call(target, label) ? target[label] : [];
    return JSON.stringify(destinations) === JSON.stringify(targetDestinations)
      ? []
      : [[label, { baseline: destinations, target: targetDestinations }]];
  }));
}

export default class BlogComparison {
  constructor(page) {
    this.page = page;
  }

  async open(url) {
    const response = await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    const result = {
      requestedURL: url,
      url: this.page.url(),
      status: response?.status() ?? null,
      ok: response?.ok() ?? false,
    };
    if (result.ok) await this.page.locator('main').waitFor({ state: 'visible' });
    return result;
  }

  async readLinks(url) {
    const result = await this.open(url);
    if (!result.ok) return { ...result, links: null };

    await this.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await this.page.waitForLoadState('networkidle', { timeout: 15000 });
    const links = await this.page.locator('main a[href]').evaluateAll(
      (elements) => elements.map((link) => [link.textContent, link.href]),
    );
    return { ...result, links: normalizeLinks(links, this.page.url()) };
  }

  async capture(url, path) {
    const result = await this.open(url);
    if (!result.ok) return result;

    await this.page.locator('footer .feds-footer-privacyLink').first().waitFor({ state: 'visible', timeout: 20000 });
    await this.page.screenshot({ path, fullPage: true, animations: 'disabled' });
    return { ...result, screenshot: path };
  }
}
