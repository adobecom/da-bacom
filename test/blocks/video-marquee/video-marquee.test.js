import { expect } from '@esm-bundle/chai';
import init from '../../../blocks/video-marquee/video-marquee.js';

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

  it('splits two video rows into mobile and desktop, constructing each source', async () => {
    document.body.innerHTML = `<div class="video-marquee">
      <div><div><picture><img alt="" src="/logo.svg"></picture></div></div>
      <div><div><h1>From idea to impact.</h1><p>Subcopy.</p></div></div>
      <div><div><a href="https://video.tv.adobe.com/v/3497295">https://video.tv.adobe.com/v/3497295</a></div></div>
      <div><div><picture><img alt="https://example.com/media_x.mp4#_autoplay1 | Play overview video" src="/poster.png"></picture></div></div>
    </div>`;

    await init(document.querySelector('.video-marquee'));

    const mobile = document.querySelector('.marquee-video-mobile');
    const desktop = document.querySelector('.marquee-video-desktop');
    expect(mobile).to.exist;
    expect(desktop).to.exist;

    // mobile tv.adobe.com link -> MPC iframe (no native video)
    const iframe = mobile.querySelector('iframe.marquee-atv');
    expect(iframe).to.exist;
    expect(iframe.getAttribute('src')).to.equal('https://video.tv.adobe.com/v/3497295');
    expect(mobile.querySelector('video')).to.not.exist;

    // desktop mp4-in-alt poster -> native video with source + poster
    const video = desktop.querySelector('video');
    expect(video).to.exist;
    expect(video.querySelector('source').getAttribute('src')).to.equal('https://example.com/media_x.mp4');
    expect(video.getAttribute('poster')).to.contain('poster.png');
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
