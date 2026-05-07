// eslint-disable-next-line import/no-unresolved
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

function getAppLocWithToken(appLoc, token) {
  if (token) return `${appLoc}&token=${token}`;
  return appLoc;
}

function getAppLocWithCollab(appLoc, search) {
  const searchParams = new URLSearchParams(search);
  const collabId = searchParams.get('streamCollabId');
  if (collabId) return `${appLoc}&collabId=${collabId}`;
  return appLoc;
}

async function getEnvEps() {
  const response = await fetch('https://main--stream-mapper--adobecom.aem.live/configuration/app-endpoints.json');
  const envInfo = await response.json();
  const endpointByEnv = Object.fromEntries(
    envInfo.data.map(({ env, endpoint }) => [env, endpoint]),
  );
  return endpointByEnv;
}

(async () => {
  try {
    const { context, token } = await DA_SDK;
    const { repo, ref, search } = context;
    const endpointByEnv = await getEnvEps();
    const appPath = endpointByEnv[ref] ? endpointByEnv[ref] : endpointByEnv.prod;
    let appLoc = `${appPath}?tenant=${repo}`;
    appLoc = getAppLocWithToken(appLoc, token);
    appLoc = getAppLocWithCollab(appLoc, search);
    window.location.replace(appLoc);
  } catch (error) {
    console.error('Error initializing app:', error);
  }
})();
