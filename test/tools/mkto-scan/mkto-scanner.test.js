import { expect } from '@esm-bundle/chai';
import {
  getMultiStepMethod,
  parseConfiguratorUrl,
  extractMarketoBlocks,
} from '../../../tools/mkto-scan/mkto-scanner.js';

describe('getMultiStepMethod', () => {
  it('returns null for plain marketo class', () => {
    expect(getMultiStepMethod('marketo')).to.be.null;
  });
  it('returns null for unrelated classes', () => {
    expect(getMultiStepMethod('marketo form dark')).to.be.null;
  });
  it('detects multi-2', () => {
    expect(getMultiStepMethod('marketo multi-2')).to.equal('multi-2');
  });
  it('detects multi-3', () => {
    expect(getMultiStepMethod('marketo multi-3')).to.equal('multi-3');
  });
  it('detects multi-step', () => {
    expect(getMultiStepMethod('marketo multi-step')).to.equal('multi-step');
  });
  it('returns null for null input', () => {
    expect(getMultiStepMethod(null)).to.be.null;
  });
  it('returns null for undefined input', () => {
    expect(getMultiStepMethod(undefined)).to.be.null;
  });
});

describe('parseConfiguratorUrl', () => {
  it('returns null fields for null input', () => {
    const r = parseConfiguratorUrl(null);
    expect(r.formId).to.be.null;
    expect(r.template).to.be.null;
    expect(r.poi).to.be.null;
    expect(r.successType).to.be.null;
    expect(r.stepPref).to.be.null;
  });

  it('returns null fields for non-URL string', () => {
    const r = parseConfiguratorUrl('not-a-url');
    expect(r.formId).to.be.null;
  });

  it('extracts all form fields', () => {
    const url = 'https://milo.adobe.com/tools/marketo-configurator?form.fldFormId=1234&form.fldTemplate=gated&form.fldPOI=mypoi&form.fldSuccessType=redirect';
    const r = parseConfiguratorUrl(url);
    expect(r.formId).to.equal('1234');
    expect(r.template).to.equal('gated');
    expect(r.poi).to.equal('mypoi');
    expect(r.successType).to.equal('redirect');
    expect(r.stepPref).to.be.null;
  });

  it('extracts stepPref when present', () => {
    const url = 'https://example.com?form.fldFormId=1&form.fldStepPref=multi-2';
    expect(parseConfiguratorUrl(url).stepPref).to.equal('multi-2');
  });

  it('returns null for missing params', () => {
    const r = parseConfiguratorUrl('https://example.com?other=val');
    expect(r.formId).to.be.null;
    expect(r.template).to.be.null;
  });

  it('decodes base64 hash JSON format', () => {
    const cfg = {
      'form id': '2277',
      'form.template': 'flex_contact',
      'program.poi': 'TEST_POI',
      'form.success.type': 'redirect',
    };
    const url = `https://milo.adobe.com/tools/marketo#${btoa(JSON.stringify(cfg))}`;
    const r = parseConfiguratorUrl(url);
    expect(r.formId).to.equal('2277');
    expect(r.template).to.equal('flex_contact');
    expect(r.poi).to.equal('TEST_POI');
    expect(r.successType).to.equal('redirect');
    expect(r.stepPref).to.be.null;
  });

  it('coerces empty string fields to null in hash format', () => {
    const cfg = { 'form id': '1', 'form.template': '', 'program.poi': '' };
    const url = `https://milo.adobe.com/tools/marketo#${btoa(JSON.stringify(cfg))}`;
    const r = parseConfiguratorUrl(url);
    expect(r.template).to.be.null;
    expect(r.poi).to.be.null;
  });

  it('extracts stepPref from hash JSON form.step.pref string key', () => {
    const cfg = { 'form id': '1', 'form.step.pref': 'multi-2' };
    const url = `https://milo.adobe.com/tools/marketo#${btoa(JSON.stringify(cfg))}`;
    expect(parseConfiguratorUrl(url).stepPref).to.equal('multi-2');
  });

  it('derives stepPref from form.fldStepPref object (field grouping format)', () => {
    const cfg = {
      'form id': '2277',
      'form.fldStepPref': { 1: ['email', 'country'], 2: ['name', 'phone'], 3: ['company'] },
    };
    const url = `https://milo.adobe.com/tools/marketo#${btoa(JSON.stringify(cfg))}`;
    expect(parseConfiguratorUrl(url).stepPref).to.equal('multi-3');
  });

  it('falls back to query params when hash is not valid base64 JSON', () => {
    const url = 'https://example.com?form.fldFormId=9&form.fldTemplate=t1#not-base64';
    const r = parseConfiguratorUrl(url);
    expect(r.formId).to.equal('9');
    expect(r.template).to.equal('t1');
  });

  it('decodes non-ASCII characters in hash config', () => {
    const cfg = { 'form id': '1234', 'program.poi': '日本語POI' };
    // Encode using milo's utf8ToB64 algorithm: btoa(unescape(encodeURIComponent(str)))
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(cfg))));
    const url = `https://milo.adobe.com/tools/marketo#${encoded}`;
    const r = parseConfiguratorUrl(url);
    expect(r.formId).to.equal('1234');
    expect(r.poi).to.equal('日本語POI');
  });
});

describe('extractMarketoBlocks', () => {
  function makeDoc(html) {
    return new DOMParser().parseFromString(html, 'text/html');
  }

  it('returns empty array when no marketo blocks', () => {
    expect(extractMarketoBlocks(makeDoc('<p>Hello</p>'))).to.deep.equal([]);
  });

  it('returns empty array for null input', () => {
    expect(extractMarketoBlocks(null)).to.deep.equal([]);
  });

  it('extracts a basic marketo block with all fields', () => {
    const doc = makeDoc(`
      <div class="marketo">
        <div><div><a href="https://example.com?form.fldFormId=42&form.fldTemplate=gated&form.fldPOI=p1&form.fldSuccessType=redirect">L</a></div></div>
      </div>
    `);
    const [block] = extractMarketoBlocks(doc);
    expect(block.formId).to.equal('42');
    expect(block.template).to.equal('gated');
    expect(block.poi).to.equal('p1');
    expect(block.successType).to.equal('redirect');
    expect(block.multiStepMethod).to.be.null;
    expect(block.variantClass).to.equal('marketo');
    expect(block.stepPref).to.be.null;
  });

  it('detects multi-2 from variant class', () => {
    const doc = makeDoc(`
      <div class="marketo multi-2">
        <div><div><a href="https://example.com?form.fldFormId=1">L</a></div></div>
      </div>
    `);
    const [block] = extractMarketoBlocks(doc);
    expect(block.variantClass).to.equal('marketo multi-2');
    expect(block.multiStepMethod).to.equal('variant:multi-2');
  });

  it('detects multi-3 from variant class', () => {
    const doc = makeDoc('<div class="marketo multi-3"><div><div><a href="https://example.com?form.fldFormId=1">L</a></div></div></div>');
    expect(extractMarketoBlocks(doc)[0].multiStepMethod).to.equal('variant:multi-3');
  });

  it('detects multi-step from URL param when no variant class', () => {
    const doc = makeDoc(`
      <div class="marketo">
        <div><div><a href="https://example.com?form.fldFormId=1&form.fldStepPref=multi-3">L</a></div></div>
      </div>
    `);
    const [block] = extractMarketoBlocks(doc);
    expect(block.multiStepMethod).to.equal('url:multi-3');
    expect(block.stepPref).to.equal('multi-3');
  });

  it('prefers variant class over URL stepPref for multiStepMethod', () => {
    const doc = makeDoc(`
      <div class="marketo multi-2">
        <div><div><a href="https://example.com?form.fldStepPref=multi-3">L</a></div></div>
      </div>
    `);
    const [block] = extractMarketoBlocks(doc);
    expect(block.multiStepMethod).to.equal('variant:multi-2');
    expect(block.stepPref).to.equal('multi-3');
  });

  it('falls back to kv row for successType when not in URL', () => {
    const doc = makeDoc(`
      <div class="marketo">
        <div><div><a href="https://example.com?form.fldFormId=1">L</a></div></div>
        <div><div>Success Type</div><div>register</div></div>
      </div>
    `);
    expect(extractMarketoBlocks(doc)[0].successType).to.equal('register');
  });

  it('kv row successType overrides URL param', () => {
    const doc = makeDoc(`
      <div class="marketo">
        <div><div><a href="https://example.com?form.fldFormId=1&form.fldSuccessType=redirect">L</a></div></div>
        <div><div>Success Type</div><div>register</div></div>
      </div>
    `);
    expect(extractMarketoBlocks(doc)[0].successType).to.equal('register');
  });

  it('kv row overrides URL param for formId, template, poi, and stepPref', () => {
    const doc = makeDoc(`
      <div class="marketo">
        <div><div><a href="https://example.com?form.fldFormId=1&form.fldTemplate=gated&form.fldPOI=url-poi&form.fldStepPref=multi-2">L</a></div></div>
        <div><div>Form ID</div><div>999</div></div>
        <div><div>Template</div><div>flex</div></div>
        <div><div>POI</div><div>kv-poi</div></div>
        <div><div>Step Pref</div><div>multi-3</div></div>
      </div>
    `);
    const [block] = extractMarketoBlocks(doc);
    expect(block.formId).to.equal('999');
    expect(block.template).to.equal('flex');
    expect(block.poi).to.equal('kv-poi');
    expect(block.stepPref).to.equal('multi-3');
  });

  it('falls back to URL param when kv row is absent', () => {
    const doc = makeDoc(`
      <div class="marketo">
        <div><div><a href="https://example.com?form.fldFormId=42&form.fldTemplate=gated&form.fldPOI=mypoi">L</a></div></div>
      </div>
    `);
    const [block] = extractMarketoBlocks(doc);
    expect(block.formId).to.equal('42');
    expect(block.template).to.equal('gated');
    expect(block.poi).to.equal('mypoi');
  });

  it('extracts multiple blocks from one document', () => {
    const doc = makeDoc(`
      <div class="marketo"><div><div><a href="https://example.com?form.fldFormId=1">L</a></div></div></div>
      <div class="marketo multi-2"><div><div><a href="https://example.com?form.fldFormId=2">L</a></div></div></div>
    `);
    const blocks = extractMarketoBlocks(doc);
    expect(blocks).to.have.length(2);
    expect(blocks[0].formId).to.equal('1');
    expect(blocks[1].formId).to.equal('2');
  });

  it('ignores non-marketo divs', () => {
    const doc = makeDoc(`
      <div class="text marketo-adjacent"><p>Not a block</p></div>
      <div class="marketo"><div><div><a href="https://example.com?form.fldFormId=5">L</a></div></div></div>
    `);
    expect(extractMarketoBlocks(doc)).to.have.length(1);
  });

  it('handles a block with no configurator link', () => {
    const doc = makeDoc(`
      <div class="marketo">
        <div><div>No link here</div></div>
        <div><div>Success Type</div><div>redirect</div></div>
      </div>
    `);
    const [block] = extractMarketoBlocks(doc);
    expect(block.configuratorUrl).to.be.null;
    expect(block.formId).to.be.null;
    expect(block.successType).to.equal('redirect');
    expect(block.multiStepMethod).to.be.null;
  });

  it('extracts successContent from "success content" kv row', () => {
    const doc = makeDoc(`
      <div class="marketo">
        <div><div><a href="https://example.com?form.fldFormId=1">L</a></div></div>
        <div><div>Success Content</div><div>/resources/thank-you</div></div>
      </div>
    `);
    expect(extractMarketoBlocks(doc)[0].successContent).to.equal('/resources/thank-you');
  });

  it('extracts successContent from "destination url" kv row alias', () => {
    const doc = makeDoc(`
      <div class="marketo">
        <div><div><a href="https://example.com?form.fldFormId=1">L</a></div></div>
        <div><div>Destination URL</div><div>https://adobe.com/thanks</div></div>
      </div>
    `);
    expect(extractMarketoBlocks(doc)[0].successContent).to.equal('https://adobe.com/thanks');
  });

  it('successContent is null when no kv row present', () => {
    const doc = makeDoc(`
      <div class="marketo">
        <div><div><a href="https://example.com?form.fldFormId=1">L</a></div></div>
      </div>
    `);
    expect(extractMarketoBlocks(doc)[0].successContent).to.be.null;
  });

  it('handles "destination type" as alias for successType', () => {
    const doc = makeDoc(`
      <div class="marketo">
        <div><div><a href="https://example.com?form.fldFormId=1">L</a></div></div>
        <div><div>Destination Type</div><div>section</div></div>
      </div>
    `);
    expect(extractMarketoBlocks(doc)[0].successType).to.equal('section');
  });
});
