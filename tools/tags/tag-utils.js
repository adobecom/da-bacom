/* eslint-disable import/no-unresolved */
import { DA_ORIGIN } from 'https://da.live/nx/public/utils/constants.js';

const cache = new Map();

export const tagPathConfig = {
  root: '/content/cq:tags',
  ext: '.1.json',
};

export function setTagPathConfig({ root, ext }) {
  tagPathConfig.root = root;
  tagPathConfig.ext = ext;
}

export async function getAemRepo(project, opts) {
  const configUrl = `${DA_ORIGIN}/config/${project.org}/${project.repo}`;
  const resp = await fetch(configUrl, opts);
  if (!resp.ok) return null;
  const json = await resp.json();
  const data = Array.isArray(json.data?.data) ? json.data.data : json.data;
  const aemRepo = data?.find((entry) => entry.key === 'aem.repositoryId')?.value;
  const namespaces = data?.find((entry) => entry.key === 'aem.tags.namespaces')?.value;
  return { aemRepo, namespaces };
}

export async function getTags(path, opts) {
  const activeTag = path.split('cq:tags').pop().replace('.1.json', '').slice(1);
  let json;
  if (cache.has(path)) {
    json = cache.get(path);
  } else {
    const resp = await fetch(path, opts);
    if (!resp.ok) {
      return null;
    }
    json = await resp.json();
    cache.set(path, json);
  }
  const tags = Object.keys(json).reduce((acc, key) => {
    if (json[key]['jcr:primaryType'] === 'cq:Tag') {
      const tagPath = `${path.replace(tagPathConfig.ext, '')}/${key}${tagPathConfig.ext}`;
      const childActiveTag = activeTag ? `${activeTag}/${key}` : key;
      const details = json[key];

      const children = Object.keys(details).reduce((childAcc, childKey) => {
        if (details[childKey]?.['jcr:primaryType'] === 'cq:Tag') {
          childAcc.push({
            path: `${tagPath.replace(tagPathConfig.ext, '')}/${childKey}${tagPathConfig.ext}`,
            activeTag: childActiveTag,
            name: childKey,
            title: details[childKey]['jcr:title'] || childKey,
            details: details[childKey],
            children: [],
          });
        }
        return childAcc;
      }, []);

      acc.push({
        path: tagPath,
        activeTag,
        name: key,
        title: details['jcr:title'] || key,
        details,
        children,
      });
    }
    return acc;
  }, []);

  return tags;
}

export const getRootTags = async (namespaces, aemConfig, opts) => {
  const createTagUrl = (namespace = '') => `https://${aemConfig.aemRepo}${tagPathConfig.root}${namespace ? `/${namespace}` : ''}${tagPathConfig.ext}`;

  if (namespaces.length === 0) {
    return getTags(createTagUrl(), opts).catch(() => null);
  }

  if (namespaces.length === 1) {
    const namespace = namespaces[0].toLowerCase().replaceAll(' ', '-');
    return getTags(createTagUrl(namespace), opts).catch(() => null);
  }

  const namespacePromises = namespaces.map(async (title) => {
    const namespace = title.toLowerCase().replaceAll(' ', '-');
    const path = createTagUrl(namespace);
    const tags = await getTags(path, opts).catch(() => []);

    return {
      path,
      name: namespace,
      title,
      activeTag: '',
      details: {},
      children: tags,
    };
  });

  return Promise.all(namespacePromises);
};
