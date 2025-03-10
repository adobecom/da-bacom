function globToRegex(glob) {
  return new RegExp(`^${glob.replace(/\*/g, '(.*)').replace(/\?/g, '(.)').replace(/\//g, '\\/')}$`);
}

export function activateRedirects(data) {
  return data.map((o) => Object.entries(o)
    .reduce((acc, [k, v]) => {
      if (k.toLowerCase() === 'from') {
        acc.from = globToRegex(v);
      } else if (k.toLowerCase() === 'to') {
        acc.to = (...replacements) => {
          replacements.shift();
          const result = v.replace(/(\$\d+|\*)/g, (matched) => {
            if (matched.startsWith('$')) {
              return replacements[matched.slice(1) - 1];
            }
            if (matched === '*') {
              return replacements.shift();
            }
            return matched;
          });
          return result;
        };
      } else if (k.toLowerCase() === 'start') {
        acc.start = new Date(
          Date.UTC(1899, 11, 30, 0, 0, 0)
          + (v - Math.floor(v)) * 86400000 + Math.floor(v) * 86400000,
        );
      }
      return acc;
    }, {}));
}
export async function fetchRedirects(path = '/smart-redirects.json?limit=100000') {
  try {
    const response = await fetch(path);
    const redirects = await response.json();
    if (redirects.data) {
      return activateRedirects(redirects.data);
    }
    return [];
  } catch (error) {
    return [];
  }
}

export async function getRedirect(redirects, path, currentURL) {
  const redirect = (await redirects)
    .filter((r) => typeof r.start === 'undefined' || r.start.getTime() <= Date.now())
    .find((r) => r.from.test(path));
  if (redirect) {
    const target = redirect.to(path, ...redirect.from.exec(path).slice(1));
    const targetURL = new URL(target, currentURL);
    // Copy all URL parameters from currentURL to targetURL
    currentURL.searchParams.forEach((value, key) => {
      targetURL.searchParams.set(key, value);
    });

    targetURL.searchParams.set('redirect_from', path);
    return targetURL.toString();
  }
  return null;
}

export async function isValidRedirect(url) {
  // we try to fetch the URL, if it fails we return false
  try {
    const response = await fetch(url);
    return response.ok && response.status === 200;
  } catch (error) {
    return false;
  }
}

export async function applyRedirects(
  redirects = fetchRedirects(),
  path = window.location.pathname.replace('.html', ''),
) {
  const redirect = await getRedirect(redirects, path, new URL(window.location.href));
  if (redirect && await isValidRedirect(redirect)) {
    window.location.replace(redirect);
  }
  return path;
}
