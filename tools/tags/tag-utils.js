/* eslint-disable import/no-unresolved */
import { DA_ORIGIN } from 'https://da.live/nx/public/utils/constants.js';

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
  const resp = await fetch(path, opts);
  if (!resp.ok) return null;
  const json = await resp.json();
  const tags = Object.keys(json).reduce((acc, key) => {
    if (json[key]['jcr:primaryType'] === 'cq:Tag') {
      acc.push({
        path: `${path.replace(tagPathConfig.ext, '')}/${key}${tagPathConfig.ext}`,
        activeTag,
        name: key,
        title: json[key]['jcr:title'] || key,
        details: json[key],
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

  return namespaces.map((title) => {
    const namespace = title.toLowerCase().replaceAll(' ', '-');
    return {
      path: createTagUrl(namespace),
      name: namespace,
      title,
      activeTag: '',
      details: {},
    };
  });
};
