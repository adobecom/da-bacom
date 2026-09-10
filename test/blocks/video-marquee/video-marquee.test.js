import { expect } from '@esm-bundle/chai';
import init from '../../../blocks/video-marquee/video-marquee.js';

const TWO_ROW_HTML = `<div class="video-marquee">
  <div><div><picture><img alt="" src="/logo.svg"></picture></div></div>
  <div><div><h1>From idea to impact.</h1><p>Subcopy.</p></div></div>
  <div><div><a href="https://video.tv.adobe.com/v/3497295">https://video.tv.adobe.com/v/3497295</a></div></div>
  <div><div><picture><img alt="https://example.com/media_x.mp4#_autoplay1 | Play overview video" src="/poster.png"></picture></div></div>
</div>`;

// Controllable window.matchMedia so tests can pin the viewport and fire breakpoint changes.
function installMatchMedia(initial = {}) {
  const original = window.matchMedia;
  const state = { ...initial };
  const registry = new Map();
  window.matchMedia = (query) => {
    if (!registry.has(query)) {
      const listeners = new Set();
      registry.set(query, {
        listeners,
        mql: {
          media: query,
          get matches() { return Boolean(state[query]); },
          addEventListener: (_type, cb) => listeners.add(cb),
          removeEventListener: (_type, cb) => listeners.delete(cb),
          addListener: (cb) => listeners.add(cb),
          removeListener: (cb) => listeners.delete(cb),
          dispatchEvent: () => true,
        },
      });
    }
    return registry.get(query).mql;
  };
  return {
    set(query, value) {
      state[query] = value;
      registry.get(query)?.listeners.forEach((cb) => cb({ matches: value, media: query }));
    },
    restore() { window.matchMedia = original; },
  };
}

const liveMediaCount = () => document.querySelectorAll('.video-marquee video, .video-marquee iframe').length;

describe('Video Marquee', () => {
  it('decorates the heading and subcopy with no logo row (2-row model)', async () => {
    document.body.innerHTML = `<div class="video-marquee">
      <div><div>
        <h1>From idea to impact.</h1>
        <p>Adobe's cutting-edge customer experience orchestration technology.</p>
      </div></div>
      <div><div>
        <p><a href="https://example.com/video.mp4">Video</a></p>
      </div></div>
    </div>`;

    await init(document.querySelector('.video-marquee'));

    const heading = document.querySelector('.marquee-headline');
    expect(heading).to.exist;
    expect(heading.localName).to.equal('h1');
    expect(document.querySelector('.marquee-subcopy')).to.exist;
    expect(document.querySelector('.marquee-eyebrow')).to.not.exist;
    expect(document.querySelector('.marquee-inner')).to.exist;
  });

  it('supports an authored logo row (3-row model) and removes the leftover row', async () => {
    document.body.innerHTML = `<div class="video-marquee">
      <div><div><picture></picture></div></div>
      <div><div>
        <h1>From idea to impact.</h1>
        <p>Subcopy text.</p>
      </div></div>
      <div><div>
        <p><a href="https://example.com/video.mp4">Video</a></p>
      </div></div>
    </div>`;

    await init(document.querySelector('.video-marquee'));

    const eyebrow = document.querySelector('.marquee-eyebrow');
    expect(eyebrow).to.exist;
    expect(eyebrow.querySelector('picture')).to.exist;

    const content = document.querySelector('.marquee-content');
    expect(content.children[0]).to.equal(eyebrow);
    expect(content.children[1]).to.equal(document.querySelector('.marquee-headline'));

    // the block should only have the rebuilt .marquee-inner as a child, no leftover logo row
    const block = document.querySelector('.video-marquee');
    expect(block.children.length).to.equal(1);
    expect(block.children[0].className).to.equal('marquee-inner');
  });

  it('builds a muted, autoplaying video with play/pause, mute, and scrubber controls', async () => {
    document.body.innerHTML = `<div class="video-marquee">
      <div><div><h1>Heading</h1></div></div>
      <div><div>
        <p><a href="https://example.com/video.mp4">Video</a></p>
      </div></div>
    </div>`;

    await init(document.querySelector('.video-marquee'));

    const video = document.querySelector('.marquee-media video');
    expect(video).to.exist;
    expect(video.muted).to.be.true;
    expect(video.loop).to.be.true;
    expect(video.playsInline).to.be.true;
    expect(video.autoplay).to.be.true;
    expect(video.querySelector('source').src).to.equal('https://example.com/video.mp4');

    expect(document.querySelector('.marquee-play-pause')).to.exist;
    expect(document.querySelector('.marquee-mute')).to.exist;
    expect(document.querySelector('.marquee-scrubber')).to.exist;
    expect(document.querySelector('.marquee-captions')).to.not.exist;
  });

  it('toggles mute state and aria attributes when the mute button is clicked', async () => {
    document.body.innerHTML = `<div class="video-marquee">
      <div><div><h1>Heading</h1></div></div>
      <div><div>
        <p><a href="https://example.com/video.mp4">Video</a></p>
      </div></div>
    </div>`;

    await init(document.querySelector('.video-marquee'));

    const video = document.querySelector('.marquee-media video');
    const muteBtn = document.querySelector('.marquee-mute');

    expect(video.muted).to.be.true;
    expect(muteBtn.getAttribute('aria-label')).to.equal('Unmute video');
    expect(muteBtn.getAttribute('aria-pressed')).to.equal('true');

    muteBtn.click();

    expect(video.muted).to.be.false;
    expect(muteBtn.getAttribute('aria-label')).to.equal('Mute video');
    expect(muteBtn.getAttribute('aria-pressed')).to.equal('false');
  });

  it('adds a captions toggle only when a .vtt link is authored', async () => {
    document.body.innerHTML = `<div class="video-marquee">
      <div><div><h1>Heading</h1></div></div>
      <div><div>
        <p><a href="https://example.com/video.mp4">Video</a></p>
        <p><a href="https://example.com/captions.vtt">Captions</a></p>
      </div></div>
    </div>`;

    await init(document.querySelector('.video-marquee'));

    const track = document.querySelector('.marquee-media video track');
    expect(track).to.exist;
    expect(track.getAttribute('kind')).to.equal('captions');
    expect(track.src).to.equal('https://example.com/captions.vtt');
    expect(track.getAttribute('srclang')).to.exist;
    expect(track.getAttribute('label')).to.exist;

    const captionsBtn = document.querySelector('.marquee-captions');
    expect(captionsBtn).to.exist;
    expect(captionsBtn.getAttribute('aria-label')).to.equal('Show captions');
  });

  it('does nothing when there is no content row', async () => {
    document.body.innerHTML = '<div class="video-marquee"></div>';

    await init(document.querySelector('.video-marquee'));

    expect(document.querySelector('.marquee-inner')).to.not.exist;
  });

  it('renders without a video row', async () => {
    document.body.innerHTML = `<div class="video-marquee">
      <div><div><h1>Heading only</h1></div></div>
    </div>`;

    await init(document.querySelector('.video-marquee'));

    expect(document.querySelector('.marquee-headline')).to.exist;
    expect(document.querySelector('.marquee-media')).to.not.exist;
  });

  it('does not autoplay immediately when the video link has a #hoverplay flag', async () => {
    document.body.innerHTML = `<div class="video-marquee">
      <div><div><h1>Heading</h1></div></div>
      <div><div>
        <p><a href="https://example.com/video.mp4#hoverplay">Video</a></p>
      </div></div>
    </div>`;

    await init(document.querySelector('.video-marquee'));

    const video = document.querySelector('.marquee-media video');
    expect(video.autoplay).to.be.false;
  });

  it('does not autoplay immediately when the video link has a #viewportplay flag', async () => {
    document.body.innerHTML = `<div class="video-marquee">
      <div><div><h1>Heading</h1></div></div>
      <div><div>
        <p><a href="https://example.com/video.mp4#viewportplay">Video</a></p>
      </div></div>
    </div>`;

    await init(document.querySelector('.video-marquee'));

    const video = document.querySelector('.marquee-media video');
    expect(video.autoplay).to.be.false;
  });

  it('with two video rows on desktop, builds only the desktop video and leaves the mobile row empty', async () => {
    const mm = installMatchMedia({ '(min-width: 600px)': true });
    try {
      document.body.innerHTML = TWO_ROW_HTML;
      await init(document.querySelector('.video-marquee'));

      const mobile = document.querySelector('.marquee-video-mobile');
      const desktop = document.querySelector('.marquee-video-desktop');

      // desktop mp4-in-alt poster -> native video with source + poster
      const video = desktop.querySelector('video');
      expect(Boolean(video)).to.equal(true);
      expect(video.querySelector('source').getAttribute('src')).to.equal('https://example.com/media_x.mp4');
      expect(video.getAttribute('poster')).to.contain('poster.png');

      // mobile row holds no live media
      expect(Boolean(mobile.querySelector('iframe'))).to.equal(false);
      expect(Boolean(mobile.querySelector('video'))).to.equal(false);
      expect(liveMediaCount()).to.equal(1);
    } finally {
      mm.restore();
    }
  });

  it('with two video rows on mobile, builds only the mobile video and leaves the desktop row empty', async () => {
    const mm = installMatchMedia({ '(min-width: 600px)': false });
    try {
      document.body.innerHTML = TWO_ROW_HTML;
      await init(document.querySelector('.video-marquee'));

      const mobile = document.querySelector('.marquee-video-mobile');
      const desktop = document.querySelector('.marquee-video-desktop');

      // mobile tv.adobe.com link -> MPC iframe
      const iframe = mobile.querySelector('iframe.marquee-atv');
      expect(Boolean(iframe)).to.equal(true);
      expect(iframe.getAttribute('src')).to.equal('https://video.tv.adobe.com/v/3497295');

      // desktop row holds no live media
      expect(Boolean(desktop.querySelector('video'))).to.equal(false);
      expect(Boolean(desktop.querySelector('iframe'))).to.equal(false);
      expect(liveMediaCount()).to.equal(1);
    } finally {
      mm.restore();
    }
  });

  it('swaps the live video when the breakpoint changes, tearing down the previous one', async () => {
    const mm = installMatchMedia({ '(min-width: 600px)': false });
    try {
      document.body.innerHTML = TWO_ROW_HTML;
      await init(document.querySelector('.video-marquee'));

      const mobile = document.querySelector('.marquee-video-mobile');
      const desktop = document.querySelector('.marquee-video-desktop');

      // starts on mobile
      expect(Boolean(mobile.querySelector('iframe.marquee-atv'))).to.equal(true);
      expect(Boolean(desktop.querySelector('video'))).to.equal(false);
      expect(liveMediaCount()).to.equal(1);

      // cross up to desktop
      mm.set('(min-width: 600px)', true);
      expect(Boolean(desktop.querySelector('video'))).to.equal(true);
      expect(Boolean(mobile.querySelector('iframe'))).to.equal(false);
      expect(liveMediaCount()).to.equal(1);

      // cross back down to mobile
      mm.set('(min-width: 600px)', false);
      expect(Boolean(mobile.querySelector('iframe.marquee-atv'))).to.equal(true);
      expect(Boolean(desktop.querySelector('video'))).to.equal(false);
      expect(liveMediaCount()).to.equal(1);
    } finally {
      mm.restore();
    }
  });

  it('does not add mobile/desktop classes for a single video (back-compat)', async () => {
    document.body.innerHTML = `<div class="video-marquee">
      <div><div><h1>Heading</h1></div></div>
      <div><div>
        <p><a href="https://example.com/video.mp4">Video</a></p>
      </div></div>
    </div>`;

    await init(document.querySelector('.video-marquee'));

    expect(document.querySelector('.marquee-media video')).to.exist;
    expect(document.querySelector('.marquee-video-mobile')).to.not.exist;
    expect(document.querySelector('.marquee-video-desktop')).to.not.exist;
  });
});
