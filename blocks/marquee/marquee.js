import { LIBS } from '../../scripts/scripts.js';

/*
 * Authoring model (rows are the block's direct child divs):
 *  1. Content row - one cell: [Heading] [subcopy paragraph(s)]. The Adobe
 *                   logo eyebrow is not authored, it's always injected.
 *  2. Video row   - one cell containing either a link to an .mp4 file or an
 *                   authored <video> element.
 */

const LANA_OPTIONS = { tags: 'marquee', errorType: 'i' };

const PLAY_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
  <path d="M7 4L20 12L7 20V4Z" fill="currentColor"/>
</svg>`;

const PAUSE_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
  <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
  <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
</svg>`;

const UNMUTE_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
  <path d="M4 9V15H8L13 20V4L8 9H4Z" fill="currentColor"/>
  <path d="M16.5 12C16.5 10.23 15.73 8.71 14.5 7.68V16.32C15.73 15.29 16.5 13.77 16.5 12Z" fill="currentColor"/>
  <path d="M18.5 5.36L17.23 6.63C19.07 8.1 20 9.95 20 12C20 14.05 19.07 15.9 17.23 17.37L18.5 18.64C20.72 16.9 22 14.6 22 12C22 9.4 20.72 7.1 18.5 5.36Z" fill="currentColor"/>
</svg>`;

const MUTE_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
  <path d="M4 9V15H8L13 20V4L8 9H4Z" fill="currentColor"/>
  <path d="M19.8 12L21.9 9.9L20.5 8.5L18.4 10.6L16.3 8.5L14.9 9.9L17 12L14.9 14.1L16.3 15.5L18.4 13.4L20.5 15.5L21.9 14.1L19.8 12Z" fill="currentColor"/>
</svg>`;

const ADOBE_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="127" height="30" viewBox="0 0 127 30" fill="none" role="img" aria-label="Adobe">
  <path d="M19.6843 29.5706L17.2724 23.0131H11.2234L16.3092 10.499L24.0246 29.5706H33.1867L20.9558 0.856861H12.3196L0 29.5706H19.6843ZM53.7475 28.2843V0H46.1188V7.1149C45.1536 6.9002 44.2328 6.8155 43.314 6.8155C37.4403 6.8155 31.7843 10.8004 31.7843 18.6008C31.7843 26.4012 37.6156 30 44.4967 30C48.2668 30 51.9925 29.0565 53.7475 28.2863V28.2843ZM39.4109 18.4708C39.4109 14.6573 41.7342 12.8135 44.2771 12.8135C44.9783 12.8135 45.5929 12.9416 46.1188 13.1563V23.5706C45.5929 23.742 44.9783 23.8286 44.3214 23.8286C41.7785 23.8286 39.4109 22.1563 39.4109 18.4708ZM79.1302 18.3861C79.1302 11.0151 73.7381 6.8155 67.3365 6.8155C60.9349 6.8155 55.5872 11.0151 55.5872 18.3861C55.5872 25.7571 60.9349 29.9567 67.3365 29.9567C73.7381 29.9567 79.1302 25.7571 79.1302 18.3861ZM63.1716 18.3861C63.1716 14.7439 65.0999 13.0282 67.3365 13.0282C69.5731 13.0282 71.5458 14.742 71.5458 18.3861C71.5458 22.0302 69.5731 23.7439 67.3365 23.7439C65.0999 23.7439 63.1716 22.0302 63.1716 18.3861ZM102.977 18.0847C102.977 10.6271 97.4544 6.77019 91.4477 6.77019C90.5269 6.77019 89.5637 6.89823 88.5986 7.0696V0H80.9698V28.3276C83.3374 29.3992 87.1075 30 90.0876 30C97.0574 30 102.975 25.9718 102.975 18.0867L102.977 18.0847ZM90.4402 12.8569C92.9831 12.8569 95.3507 14.5706 95.3507 18.1714C95.3507 22.0282 92.8965 23.8286 90.3093 23.8286C89.6524 23.8286 89.0822 23.7439 88.5986 23.5706V13.1996C89.1688 12.9849 89.739 12.8569 90.4402 12.8569ZM117.665 29.9567C120.427 29.9567 123.101 29.4859 125.336 28.371V22.6704C122.924 23.6986 120.776 24.2561 118.452 24.2561C115.603 24.2561 113.322 23.0565 112.49 20.5272H126.825C126.956 19.5837 127 18.6422 127 17.6553C127 10.4123 121.739 6.81353 115.996 6.81353C109.859 6.81353 104.73 11.1845 104.73 18.3427C104.73 25.501 110.387 29.9567 117.663 29.9567H117.665ZM116.085 12.4274C117.796 12.4274 119.46 13.4143 119.855 15.8569H112.401C112.972 13.4576 114.463 12.4274 116.085 12.4274Z" fill="#EB1000"/>
</svg>`;

function buildContent(cell) {
  const content = document.createElement('div');
  content.className = 'marquee-content';

  const eyebrow = document.createElement('div');
  eyebrow.className = 'marquee-eyebrow';
  eyebrow.innerHTML = ADOBE_LOGO_SVG;
  content.append(eyebrow);

  if (!cell) return content;

  const heading = cell.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    heading.classList.add('marquee-headline');
    content.append(heading);
  }

  [...cell.querySelectorAll('p')].forEach((p) => {
    if (!p.textContent?.trim()) return;
    p.classList.add('marquee-subcopy');
    content.append(p);
  });

  return content;
}

function buildVideoEl(cell) {
  if (!cell) return null;
  const existingVideo = cell.querySelector('video');
  const link = cell.querySelector('a[href*=".mp4" i]');
  const src = existingVideo?.querySelector('source')?.src || existingVideo?.currentSrc || link?.href;
  if (!src) return null;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  if (!prefersReducedMotion) video.autoplay = true;

  const source = document.createElement('source');
  source.src = src;
  source.type = 'video/mp4';
  video.append(source);

  return video;
}

function buildControls(video) {
  const controls = document.createElement('div');
  controls.className = 'marquee-video-controls';

  const playPauseBtn = document.createElement('button');
  playPauseBtn.type = 'button';
  playPauseBtn.className = 'marquee-video-control marquee-play-pause';

  const muteBtn = document.createElement('button');
  muteBtn.type = 'button';
  muteBtn.className = 'marquee-video-control marquee-mute';

  const updatePlayPause = () => {
    const isPaused = video.paused || video.ended;
    playPauseBtn.innerHTML = isPaused ? PLAY_ICON : PAUSE_ICON;
    playPauseBtn.setAttribute('aria-label', isPaused ? 'Play video' : 'Pause video');
    playPauseBtn.setAttribute('aria-pressed', String(!isPaused));
  };

  const updateMute = () => {
    muteBtn.innerHTML = video.muted ? MUTE_ICON : UNMUTE_ICON;
    muteBtn.setAttribute('aria-label', video.muted ? 'Unmute video' : 'Mute video');
    muteBtn.setAttribute('aria-pressed', String(video.muted));
  };

  playPauseBtn.addEventListener('click', () => {
    if (video.paused || video.ended) video.play();
    else video.pause();
  });

  muteBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    updateMute();
  });

  video.addEventListener('play', updatePlayPause);
  video.addEventListener('pause', updatePlayPause);
  video.addEventListener('ended', updatePlayPause);

  updatePlayPause();
  updateMute();

  controls.append(playPauseBtn, muteBtn);
  return controls;
}

function buildMedia(cell) {
  const video = buildVideoEl(cell);
  if (!video) return null;

  const media = document.createElement('div');
  media.className = 'marquee-media';
  media.append(video, buildControls(video));
  return media;
}

export default async function init(el) {
  try {
    const { decorateBlockAnalytics } = await import(`${LIBS}/martech/attributes.js`);
    decorateBlockAnalytics(el);

    const [contentRow, videoRow] = [...el.querySelectorAll(':scope > div')];
    if (!contentRow) return;

    const content = buildContent(contentRow.querySelector(':scope > div') || contentRow);
    const media = buildMedia(videoRow?.querySelector(':scope > div') || videoRow);

    const inner = document.createElement('div');
    inner.className = 'marquee-inner';
    inner.append(content);
    if (media) inner.append(media);

    el.innerHTML = '';
    el.append(inner);
  } catch (err) {
    window.lana?.log(`Marquee: ${err}`, LANA_OPTIONS);
    // eslint-disable-next-line no-console
    console.error('Marquee init failed:', err);
  }
}
