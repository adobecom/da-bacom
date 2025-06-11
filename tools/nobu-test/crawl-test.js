// eslint-disable-next-line import/no-unresolved
import { crawl } from 'https://da.live/nx/public/utils/tree.js';

const PATH = '/adobecom/da-bacom/products/analytics/';

(async function init() {
  // Create cancel button
  const crawlTestSection = document.querySelector('.crawl-test');
  const button = document.createElement('button');
  button.innerText = 'Cancel';
  crawlTestSection.append(button);

  // Create the callback to fire when a file is returned
  const callback = (file) => {
    button.insertAdjacentHTML('afterend', `<p>${file.path}</p>`);
  };

  // Start the crawl
  const { results, getDuration, cancelCrawl } = crawl({ path: PATH, callback, throttle: 10 });

  // Asign the cancel button the cancel event
  button.addEventListener('click', cancelCrawl);

  // Await the results to finish
  await results;

  // Add the duration after the results are finished
  button.insertAdjacentHTML('beforebegin', `<p>${getDuration()}</p>`);
}());
