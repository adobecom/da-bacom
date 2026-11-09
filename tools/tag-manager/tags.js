/* eslint-disable import/no-unresolved */
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

async function init() {
  const main = document.querySelector('main');
  let timer;
  try {
    const sdk = await Promise.race([
      DA_SDK,
      new Promise((resolve) => { timer = setTimeout(() => resolve(null), 10000); }),
    ]);
    if (!sdk?.context || typeof sdk.actions?.daFetch !== 'function') {
      throw new Error('Open Tag Manager as a Document Authoring app and sign in to access the tag sheet.');
    }
    await import('./tag-manager.js');
    const manager = document.createElement('da-tag-manager');
    manager.daFetch = sdk.actions.daFetch;
    main.replaceChildren(manager);
  } catch (error) {
    const message = document.createElement('p');
    message.setAttribute('role', 'alert');
    message.textContent = error.message;
    const retry = document.createElement('button');
    retry.textContent = 'Try again';
    retry.addEventListener('click', init);
    main.replaceChildren(message, retry);
  } finally {
    clearTimeout(timer);
  }
}

init();
