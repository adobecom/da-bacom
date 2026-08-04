import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import loadArp, { getArpSessionId } from '../../scripts/arp.js';

describe('getArpSessionId', () => {
  beforeEach(() => {
    window.sessionStorage.removeItem('arp-sessionid');
  });

  it('generates and persists a session id', () => {
    const sessionId = getArpSessionId();
    expect(sessionId).to.be.a('string').that.is.not.empty;
    expect(window.sessionStorage.getItem('arp-sessionid')).to.equal(sessionId);
  });

  it('reuses the persisted session id on subsequent calls', () => {
    const first = getArpSessionId();
    const second = getArpSessionId();
    expect(second).to.equal(first);
  });
});

describe('loadArp', () => {
  let loadScript;
  let initAsync;
  let lanaLog;

  beforeEach(() => {
    window.sessionStorage.removeItem('arp-sessionid');
    delete window.arpSessionId;
    delete window.arpToken;
    delete window.WatsonSdk;

    initAsync = sinon.stub().resolves();
    window.WatsonSdk = { initAsync };
    loadScript = sinon.stub().resolves();
    lanaLog = sinon.stub();
    window.lana = { log: lanaLog };
  });

  afterEach(() => {
    delete window.WatsonSdk;
    delete window.lana;
    sinon.restore();
  });

  it('loads the production SDK url when prodEnv is true', async () => {
    await loadArp({ clientId: 'client-1', prodEnv: true, loadScript });
    expect(loadScript.calledWith('https://commerce.adobe.com/watson/watson.min.js')).to.be.true;
  });

  it('loads the stage SDK url when prodEnv is false', async () => {
    await loadArp({ clientId: 'client-1', prodEnv: false, loadScript });
    expect(loadScript.calledWith('https://commerce-stg.adobe.com/watson/watson.min.js')).to.be.true;
  });

  it('initializes WatsonSdk with the client config and exposes the session id', async () => {
    await loadArp({ clientId: 'client-1', prodEnv: true, loadScript });
    expect(initAsync.calledOnce).to.be.true;
    const config = initAsync.firstCall.args[0];
    expect(config.clientId).to.equal('client-1');
    expect(config.prodEnv).to.be.true;
    expect(config.sessionId).to.equal(window.arpSessionId);
    expect(config.sessionId).to.equal(getArpSessionId());
  });

  it('stores the token and dispatches an event when tokenCallback fires', async () => {
    const tokenSpy = sinon.stub();
    window.addEventListener('arp:token', tokenSpy);

    await loadArp({ clientId: 'client-1', prodEnv: true, loadScript });
    const config = initAsync.firstCall.args[0];
    config.tokenCallback('base64-token');

    expect(window.arpToken).to.equal('base64-token');
    expect(tokenSpy.calledOnce).to.be.true;
    expect(tokenSpy.firstCall.args[0].detail.token).to.equal('base64-token');

    window.removeEventListener('arp:token', tokenSpy);
  });

  it('logs and exits early when the script fails to load', async () => {
    loadScript = sinon.stub().rejects(new Error('network error'));
    await loadArp({ clientId: 'client-1', prodEnv: true, loadScript });
    expect(initAsync.called).to.be.false;
    expect(lanaLog.calledOnce).to.be.true;
    expect(lanaLog.firstCall.args[1].severity).to.equal('error');
  });

  it('logs and exits early when WatsonSdk is unavailable after load', async () => {
    delete window.WatsonSdk;
    await loadArp({ clientId: 'client-1', prodEnv: true, loadScript });
    expect(lanaLog.calledOnce).to.be.true;
    expect(lanaLog.firstCall.args[1].severity).to.equal('error');
  });
});
