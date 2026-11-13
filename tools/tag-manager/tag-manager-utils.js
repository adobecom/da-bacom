import { LIBS } from '../../scripts/scripts.js';

const SHEET_PATH = '/adobecom/da-bacom/.da/tag-browser.json';
const SHEET_TAB = 'CaaS tags';
const CHIMERA_URL = 'https://www.adobe.com/chimera-api/tags';
export const SOURCE_URL = `https://admin.da.live/source${SHEET_PATH}`;
export const SHEET_URL = `https://da.live/sheet#${SHEET_PATH.replace(/\.json$/, '')}`;
export const PREVIEW_URL = 'https://admin.hlx.page/preview/adobecom/milo/main/drafts/bmarshal/tags.json';

async function getGroups(groupId) {
  const { loadCaasTags } = await import(`${LIBS}/blocks/caas/utils.js`);

  const url = new URL(CHIMERA_URL);
  url.searchParams.set('v', '1');
  if (groupId) url.searchParams.set('include', groupId);
  let result;
  try {
    result = await loadCaasTags(url.toString());
  } catch {
    throw new Error("Could not load Adobe's tag library. Please try again.");
  }
  const groups = result?.tags;
  if (!groups || typeof groups !== 'object' || Array.isArray(groups)) {
    throw new Error("Adobe's tag library did not return CaaS groups. Please try again.");
  }
  return {
    groups: Object.values(groups),
    fallback: result.errorMsg !== undefined || Boolean(result.error),
  };
}

function flattenGroupTags(groupId, children) {
  const tags = new Map();
  const visit = (tag) => {
    if (typeof tag?.tagID !== 'string' || !tag.tagID.startsWith(`${groupId}/`)
      || typeof tag.title !== 'string' || !tag.title.trim()
      || (tag.tags && (typeof tag.tags !== 'object' || Array.isArray(tag.tags)))) {
      throw new Error('This tag group contains incomplete tags. No changes have been saved.');
    }
    if (tags.has(tag.tagID) && tags.get(tag.tagID).title !== tag.title) {
      throw new Error('This tag group contains conflicting titles. No changes have been saved.');
    }
    tags.set(tag.tagID, { name: tag.tagID, title: tag.title });
    Object.values(tag.tags || {}).forEach(visit);
  };
  Object.values(children).forEach(visit);
  return [...tags.values()];
}

export async function fetchGroups() {
  const { groups, fallback } = await getGroups();
  if (!groups.length || groups.some((group) => typeof group?.tagID !== 'string'
    || !group.tagID.startsWith('caas:')
    || typeof group.title !== 'string' || !group.title.trim())) {
    throw new Error("Adobe's tag library returned an incomplete group list. Please try again.");
  }
  return {
    groups: groups.map(({ tagID, title, tags }) => {
      const caasCount = flattenGroupTags(tagID, tags || {}).length;
      return { id: tagID, title, caasCount };
    })
      .sort((a, b) => a.title.localeCompare(b.title)),
    fallback,
  };
}

export async function fetchGroupTags(groupId) {
  const { groups, fallback } = await getGroups(groupId);
  const group = groups.find((item) => item?.tagID === groupId);
  if (!group || !group.tags || typeof group.tags !== 'object' || Array.isArray(group.tags)) {
    if (fallback && !group) {
      throw new Error("This group is not in the built-in tag list. Please try again when Adobe's tag library is available.");
    }
    throw new Error('This tag group could not be read. Please check for updates again.');
  }
  return { tags: flattenGroupTags(groupId, group.tags), fallback };
}

function getSheetTab(sheet) {
  const tab = sheet?.[SHEET_TAB];
  if (!Array.isArray(tab?.data) || tab.data.some((row) => typeof row?.value !== 'string'
    || typeof row.title !== 'string')) {
    throw new Error('The CaaS tags sheet needs a value and a title for every row. Please open the sheet to check it.');
  }
  if (Number(tab.offset || 0) !== 0 || tab.total > tab.data.length) {
    throw new Error('Only part of the tag sheet was returned. No changes can be saved safely.');
  }
  return tab;
}

export function getGroupChoices(sheet, caasGroups) {
  const groups = new Map(caasGroups.map((group) => [
    group.id, { ...group, sheetCount: 0, inCaas: true },
  ]));
  getSheetTab(sheet).data.forEach(({ value }) => {
    const slash = value.indexOf('/');
    if (!value.startsWith('caas:') || slash <= 5 || slash === value.length - 1) return;
    const id = value.slice(0, slash);
    if (!groups.has(id)) {
      const title = id.slice(5).replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
      groups.set(id, { id, title, sheetCount: 0, caasCount: 0, inCaas: false });
    }
    groups.get(id).sheetCount += 1;
  });
  return [...groups.values()].sort((a, b) => a.title.localeCompare(b.title));
}

async function requestDa(daFetch, url, options, message) {
  let response;
  try {
    response = await daFetch(url, options);
  } catch {
    throw new Error(message);
  }
  if (response.status === 401) {
    throw new Error('Your sign-in expired. Please reopen this tool from Document Authoring.');
  }
  if (response.status === 403) throw new Error('You do not have access to change this tag sheet.');
  if (!response.ok) throw new Error(message);
  return response;
}

export async function readSheet(daFetch) {
  const response = await requestDa(
    daFetch,
    SOURCE_URL,
    { cache: 'no-store' },
    'Could not load the tag sheet.',
  );
  const sheet = await response.json().catch(() => {
    throw new Error('The tag sheet could not be read. Please open the sheet to check it.');
  });
  getSheetTab(sheet);
  return sheet;
}

export function reconcileSheet(sheet, groupId, tags, removeMissing = false) {
  getSheetTab(sheet);
  const incoming = new Map();
  tags.forEach(({ name, title }) => {
    if (typeof name !== 'string' || !name.startsWith(`${groupId}/`)
      || typeof title !== 'string' || !title.trim()) {
      throw new Error('The new tags do not belong to this group. Please check for updates again.');
    }
    incoming.set(name, { name, title });
  });
  const result = JSON.parse(JSON.stringify(sheet));
  const seen = new Set();
  const added = [];
  const updated = [];
  const missing = [];
  const rows = result[SHEET_TAB].data.flatMap((row) => {
    if (!row.value.startsWith(`${groupId}/`)) return [row];
    const tag = incoming.get(row.value);
    if (!tag) {
      missing.push(row);
      return removeMissing ? [] : [row];
    }
    seen.add(row.value);
    if (row.title !== tag.title) updated.push({ ...tag, before: row.title });
    return [{ ...row, title: tag.title }];
  });
  incoming.forEach((tag) => {
    if (seen.has(tag.name)) return;
    added.push(tag);
    rows.push({ value: tag.name, title: tag.title });
  });
  Object.assign(
    result[SHEET_TAB],
    { data: rows, total: rows.length, limit: rows.length, offset: 0 },
  );
  return { sheet: result, added, updated, missing, removed: removeMissing ? missing : [] };
}

export function applyStagedChanges(sheet, changes) {
  const source = getSheetTab(sheet).data;
  const existing = new Map();
  const additions = [];
  changes.forEach((change) => {
    const {
      kind, groupId, name, title, rowIndex, newName = name,
    } = change;
    if (typeof groupId !== 'string' || !groupId.startsWith('caas:')
      || typeof name !== 'string' || !name.startsWith(`${groupId}/`)
      || !['add', 'update', 'remove'].includes(kind)) {
      throw new Error('A staged change does not belong to its group.');
    }
    if (kind !== 'remove' && (typeof newName !== 'string'
      || !newName.startsWith(`${groupId}/`) || newName.length <= groupId.length + 1
      || newName.trim() !== newName)) {
      throw new Error('A tag value must include a tag path within the selected group.');
    }
    if (kind !== 'remove' && (typeof title !== 'string' || !title.trim())) {
      throw new Error('A staged tag needs a title.');
    }
    if (kind === 'add') {
      additions.push({ value: newName, title });
    } else {
      if (!Number.isInteger(rowIndex) || source[rowIndex]?.value !== name
        || existing.has(rowIndex)) {
        throw new Error('A staged row no longer matches the sheet.');
      }
      existing.set(rowIndex, change);
    }
  });
  const result = JSON.parse(JSON.stringify(sheet));
  const data = result[SHEET_TAB].data.flatMap((row, index) => {
    const change = existing.get(index);
    if (change?.kind === 'remove') return [];
    return [change ? { ...row, value: change.newName ?? row.value, title: change.title } : row];
  });
  const names = new Set(source.filter((row, index) => {
    const change = existing.get(index);
    return !change || (change.kind !== 'remove' && (change.newName ?? row.value) === row.value);
  }).map(({ value }) => value));
  const renamed = [...existing.values()].filter((change) => change.kind === 'update'
    && change.newName !== undefined && change.newName !== change.name);
  [...renamed.map((change) => ({ value: change.newName })), ...additions].forEach(({ value }) => {
    if (names.has(value)) throw new Error('This tag is already in the sheet or staged.');
    names.add(value);
  });
  data.push(...additions);
  Object.assign(
    result[SHEET_TAB],
    { data, total: data.length, limit: data.length, offset: 0 },
  );
  return result;
}

export async function refreshPreview(daFetch) {
  try {
    return (await daFetch(PREVIEW_URL, { method: 'POST' })).ok;
  } catch {
    return false;
  }
}

export async function saveSheet(daFetch, baseline, next) {
  getSheetTab(next);
  const latest = await readSheet(daFetch);
  if (JSON.stringify(latest) !== JSON.stringify(baseline)) {
    throw new Error('The sheet changed since it was loaded.');
  }
  await requestDa(daFetch, `https://admin.da.live/versionsource${SHEET_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label: 'Before Tag Manager update' }),
  }, 'A backup could not be created.');
  const body = new FormData();
  body.set('data', new Blob([JSON.stringify(next)], { type: 'application/json' }), 'tags.json');
  await requestDa(
    daFetch,
    SOURCE_URL,
    { method: 'PUT', body },
    'We could not confirm the save.',
  );
  try {
    if (JSON.stringify(await readSheet(daFetch)) !== JSON.stringify(next)) throw new Error();
  } catch {
    throw new Error('The sheet was saved, but its contents could not be confirmed. Please open the sheet before trying again.');
  }
  return refreshPreview(daFetch);
}
