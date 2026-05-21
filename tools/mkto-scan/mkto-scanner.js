const MULTI_STEP_VARIANTS = ['multi-2', 'multi-3', 'multi-step'];

export function getMultiStepMethod(classString) {
  const classes = String(classString || '').split(/\s+/);
  return MULTI_STEP_VARIANTS.find((v) => classes.includes(v)) ?? null;
}

function decodeHashConfig(hash) {
  try {
    // escape/unescape reverses milo's utf8ToB64: btoa(unescape(encodeURIComponent(str)))
    return JSON.parse(decodeURIComponent(escape(atob(hash))));
  } catch {
    return null;
  }
}

export function parseConfiguratorUrl(href) {
  const empty = { formId: null, template: null, poi: null, successType: null, stepPref: null };
  if (!href) return empty;
  try {
    const url = new URL(href);

    // Current format: hash contains base64-encoded JSON config object
    if (url.hash.length > 1) {
      const config = decodeHashConfig(url.hash.slice(1));
      if (config && typeof config === 'object') {
        const rawStepPref = config['form.step.pref'] || config['form.fldStepPref'] || null;
        let stepPref = null;
        if (typeof rawStepPref === 'string' && rawStepPref) {
          stepPref = rawStepPref;
        } else if (rawStepPref && typeof rawStepPref === 'object') {
          const stepCount = Object.keys(rawStepPref).length;
          if (stepCount > 1) stepPref = `multi-${stepCount}`;
        }
        return {
          formId: config['form id'] || null,
          template: config['form.template'] || null,
          poi: config['program.poi'] || null,
          successType: config['form.success.type'] || null,
          stepPref,
        };
      }
    }

    // Legacy format: query params with form.fld* prefix
    const { searchParams } = url;
    return {
      formId: searchParams.get('form.fldFormId'),
      template: searchParams.get('form.fldTemplate'),
      poi: searchParams.get('form.fldPOI'),
      successType: searchParams.get('form.fldSuccessType'),
      stepPref: searchParams.get('form.fldStepPref'),
    };
  } catch {
    return empty;
  }
}

function getMultiStepMethodLabel(variantMatch, stepPref) {
  if (variantMatch) return `variant:${variantMatch}`;
  if (stepPref) return `url:${stepPref}`;
  return null;
}

export function extractMarketoBlocks(doc) {
  if (!doc?.querySelectorAll) return [];
  const blocks = [];

  doc.querySelectorAll('div.marketo, div.da-marketo').forEach((el) => {
    const variantClass = [...el.classList].join(' ');
    const multiStepVariant = getMultiStepMethod(variantClass);

    const link = el.querySelector(':scope > div:first-child a');
    const href = link?.getAttribute('href') || null;
    const config = parseConfiguratorUrl(href);

    const kv = {};
    [...el.querySelectorAll(':scope > div')].slice(1).forEach((row) => {
      const cells = [...row.querySelectorAll(':scope > div')];
      if (cells.length >= 2) {
        const key = cells[0].textContent?.trim().toLowerCase();
        const val = cells[1].textContent?.trim();
        if (key) kv[key] = val;
      }
    });

    // KV row values override URL params — block body is the authoritative config
    const formId = kv['form id'] || config.formId || null;
    const template = kv.template || config.template || null;
    const poi = kv.poi || config.poi || null;
    const successType = kv['success type'] || kv['destination type'] || config.successType || null;
    const stepPref = kv['step pref'] || config.stepPref || null;

    blocks.push({
      variantClass,
      configuratorUrl: href,
      formId,
      template,
      poi,
      successType,
      successContent: kv['success content'] || kv['destination url'] || null,
      stepPref,
      multiStepMethod: getMultiStepMethodLabel(multiStepVariant, stepPref),
    });
  });

  return blocks;
}
