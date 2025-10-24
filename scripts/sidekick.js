/* eslint-disable import/no-unresolved */

import { saveDaVersion } from 'https://da.live/blocks/edit/utils/helpers.js';
import { setImsDetails } from 'https://da.live/nx/utils/daFetch.js';
import { LIBS } from '../../scripts/scripts.js';

const { loadIms } = await import(`${LIBS}/utils/utils.js`);

export async function getIMS() {
  if (window.adobeIMS) return window.adobeIMS;

  await loadIms();
  return window.adobeIMS;
}

export async function getIMSAccessToken() {
  try {
    const ims = await getIMS();
    const { token } = ims?.getAccessToken() ?? {};
    return token;
  } catch (e) {
    return null;
  }
}

const postVersion = async ({ detail: path }) => {
  const token = await getIMSAccessToken();
  console.log(token);
  if (!token) return;
  setImsDetails(token);
  await saveDaVersion(path);
};

const sk = document.querySelector('aem-sidekick');
sk.addEventListener('published', postVersion);
