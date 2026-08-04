const PROD_SDK_URL = 'https://commerce.adobe.com/watson/watson.min.js';
const STAGE_SDK_URL = 'https://commerce-stg.adobe.com/watson/watson.min.js';
const SESSION_STORAGE_KEY = 'arp-sessionid';

export function getArpSessionId() {
  let sessionId = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

export default async function loadArp({ clientId, prodEnv, loadScript }) {
  const sessionId = getArpSessionId();
  window.arpSessionId = sessionId;

  try {
    await loadScript(prodEnv ? PROD_SDK_URL : STAGE_SDK_URL);
  } catch (e) {
    window.lana?.log(`Could not load ArpJS. ${e}`, { tags: 'arp', severity: 'error' });
    return;
  }

  if (!window.WatsonSdk?.initAsync) {
    window.lana?.log('ArpJS script loaded but WatsonSdk.initAsync is unavailable.', { tags: 'arp', severity: 'error' });
    return;
  }

  await window.WatsonSdk.initAsync({
    clientId,
    sessionId,
    prodEnv,
    successCallback: ({ success, failure } = {}) => {
      window.lana?.log(`ArpJS vendors loaded. success: ${success?.join(',')} failure: ${failure?.join(',')}`, { tags: 'arp', severity: 'info' });
    },
    errorCallback: (message) => {
      window.lana?.log(`ArpJS vendor error: ${message}`, { tags: 'arp', severity: 'warning' });
    },
    tokenCallback: (token) => {
      window.arpToken = token;
      window.dispatchEvent(new CustomEvent('arp:token', { detail: { token, sessionId } }));
    },
    metadata: { source: 'da-bacom' },
  });
}
