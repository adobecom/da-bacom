/* eslint-disable import/no-unresolved */
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { getAemRepo, getTags, getRootTags } from './tag-utils.js';
import './tag-browser.js';

const UI_TAG_PATH = '/ui#/aem/aem/tags';

function showError(message, link = null) {
  const mainElement = document.body.querySelector('main');
  const errorMessage = document.createElement('p');
  errorMessage.textContent = message;

  if (link) {
    const linkEl = document.createElement('a');
    linkEl.textContent = 'View Here';
    linkEl.href = link;
    linkEl.target = '_blank';
    errorMessage.append(linkEl);
  }

  const reloadButton = document.createElement('button');
  reloadButton.textContent = 'Reload';
  reloadButton.addEventListener('click', () => window.location.reload());

  mainElement.append(errorMessage, reloadButton);
}

(async function init() {
  const { context, actions, token } = await DA_SDK.catch(() => null);
  if (!context || !actions || !token) {
    showError('Please log in to view tags.');
    return;
  }

  const opts = { headers: { Authorization: `Bearer ${token}` } };
  const aemConfig = await getAemRepo(opts).catch(() => null);
  if (!aemConfig || !aemConfig.aemRepo) {
    showError('Failed to retrieve config. ', `https://da.live/config#/${context.org}/${context.repo}/`);
    return;
  }

  const namespaces = aemConfig?.namespaces.split(',').map((namespace) => namespace.trim()) || [];
  const rootTags = await getRootTags(namespaces, aemConfig, opts);

  if (!rootTags || rootTags.length === 0) {
    showError('Could not load tags. ', `https://${aemConfig.aemRepo}${UI_TAG_PATH}`);
    return;
  }

  const daTagBrowser = document.createElement('da-tag-browser');
  daTagBrowser.tabIndex = 0;
  daTagBrowser.rootTags = rootTags;
  daTagBrowser.getTags = async (tag) => getTags(tag.path, opts);
  daTagBrowser.tagValue = aemConfig.namespaces ? 'title' : 'path';
  daTagBrowser.actions = actions;
  document.body.querySelector('main').append(daTagBrowser);
}());
