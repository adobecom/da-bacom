import { expect } from '@esm-bundle/chai';
import { resolveOrigin } from '../../scripts/quick-edit.js';

describe('quick-edit resolveOrigin (input allowlist)', () => {
  it('defaults to da.live when the ref is missing or "on"', () => {
    expect(resolveOrigin(null)).to.equal('https://da.live');
    expect(resolveOrigin('')).to.equal('https://da.live');
    expect(resolveOrigin('on')).to.equal('https://da.live');
  });

  it('uses localhost for the "local" keyword', () => {
    expect(resolveOrigin('local')).to.equal('http://localhost:6456');
  });

  it('builds an aem.live origin for a valid ref name', () => {
    expect(resolveOrigin('my-branch')).to.equal('https://my-branch--da-nx--adobe.aem.live');
    expect(resolveOrigin('stage')).to.equal('https://stage--da-nx--adobe.aem.live');
  });

  it('rejects a foreign host injected via the ref (VULN-36795)', () => {
    expect(resolveOrigin('attacker.com/')).to.equal(null);
    expect(resolveOrigin('attacker.com')).to.equal(null);
    expect(resolveOrigin('evil.com/?x=')).to.equal(null);
  });

  it('rejects a path smuggled onto a trusted host via the ref', () => {
    // `da.live/evil` would otherwise pass the hostname check downstream.
    expect(resolveOrigin('da.live/evil')).to.equal(null);
    expect(resolveOrigin('localhost/evil')).to.equal(null);
  });

  it('rejects any ref containing unsafe characters', () => {
    ['a/b', 'a.b', 'a:b', 'a@b', 'a b', 'a\\b', '//evil', '..', 'a#b'].forEach((ref) => {
      expect(resolveOrigin(ref), ref).to.equal(null);
    });
  });
});
