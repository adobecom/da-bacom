/*
 * Authoring model (rows are the block's direct child divs):
 *  1. Logo row    - one cell containing a logo image.
 *  2. Content row - one cell: [Heading] [subcopy paragraph(s)]
 *  3. Video row   - one cell containing either a link to an .mp4 file or an
 *                   authored <video> element.
 */

const PLAY_ICON = `<svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true" focusable="false">
  <path d="M7.59843 28.8063C6.96171 28.8063 6.32578 28.6344 5.75312 28.2922C4.65546 27.636 4 26.4797 4 25.2016V6.79845C4 5.52032 4.65547 4.36408 5.75312 3.70783C6.85 3.05314 8.17734 3.02032 9.3039 3.62815L26.4258 12.8297C27.5945 13.4578 28.3203 14.6735 28.3203 16C28.3203 17.3266 27.5945 18.5422 26.4258 19.1704L9.3039 28.3719C8.76562 28.6626 8.18125 28.8063 7.59843 28.8063Z" fill="currentColor"/>
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

const MUTE_ICON = `<svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true" focusable="false">
  <path d="M30.0481 28.3828L3.64806 1.98279C3.17931 1.51404 2.41993 1.51404 1.95118 1.98279C1.48243 2.45154 1.48243 3.21092 1.95118 3.67967L6.30587 8.03436H5.19961C3.21524 8.03436 1.59961 9.64999 1.59961 11.6344V20.4344C1.59961 22.4187 3.21524 24.0344 5.19961 24.0344H7.80587C8.12305 24.0344 8.43243 24.1625 8.6543 24.3844L12.8199 28.5515C13.3574 29.089 14.0699 29.3734 14.7965 29.3734C15.1574 29.3734 15.5215 29.3031 15.8699 29.1578C16.9215 28.7234 17.5996 27.7078 17.5996 26.5703V19.3281L28.3512 30.0797C28.5855 30.314 28.8918 30.4312 29.1996 30.4312C29.5074 30.4312 29.8137 30.314 30.048 30.0797C30.5168 29.6109 30.5168 28.8515 30.0481 28.3828ZM15.1996 26.5703C15.1996 26.8031 15.0449 26.9031 14.9527 26.9406C14.859 26.9797 14.6793 27.0156 14.5168 26.8547L10.3512 22.6875C9.6715 22.0078 8.76836 21.6344 7.80587 21.6344H5.19961C4.53867 21.6344 3.99961 21.0953 3.99961 20.4344V11.6344C3.99961 10.9734 4.53867 10.4344 5.19961 10.4344H8.70587L15.1996 16.9281L15.1996 26.5703Z" fill="currentColor"/>
  <path d="M13.2145 6.51724L14.5176 5.21412C14.6848 5.05005 14.8629 5.09224 14.9535 5.12661C15.066 5.17349 15.2004 5.27504 15.2004 5.49693V9.64224C15.2004 10.3047 15.7379 10.8422 16.4004 10.8422C17.0629 10.8422 17.6004 10.3047 17.6004 9.64224V5.49693C17.6004 4.361 16.9223 3.34536 15.8723 2.90943C14.8207 2.47661 13.6254 2.71412 12.8207 3.51724L11.5176 4.82036C11.0488 5.28911 11.0488 6.04848 11.5176 6.51724C11.9863 6.98599 12.7457 6.98599 13.2145 6.51724Z" fill="currentColor"/>
  <path d="M21.1558 15.7203C21.2199 16.3375 21.7402 16.7969 22.348 16.7969C22.3886 16.7969 22.4308 16.7953 22.473 16.7906C23.1324 16.7219 23.612 16.1328 23.5433 15.4734C23.3839 13.9328 22.6261 12.6031 21.4652 11.8297C20.9136 11.4641 20.1683 11.6125 19.8011 12.1625C19.4339 12.7141 19.5824 13.4594 20.1339 13.8266C20.6902 14.1969 21.0714 14.9047 21.1558 15.7203Z" fill="currentColor"/>
  <path d="M27.6008 16.0282C27.6008 17.4141 27.1461 18.7266 26.3196 19.7235C25.8977 20.2344 25.9696 20.9907 26.4789 21.4141C26.7039 21.5985 26.9743 21.6891 27.2446 21.6891C27.5883 21.6891 27.9321 21.5407 28.1696 21.2547C29.3508 19.8266 30.0008 17.9704 30.0008 16.0282C30.0008 13.3313 28.7243 10.8032 26.668 9.42974C26.1117 9.06256 25.3696 9.21099 25.0024 9.76099C24.6352 10.3126 24.7836 11.0579 25.3336 11.4266C26.7321 12.3594 27.6008 14.1235 27.6008 16.0282Z" fill="currentColor"/>
</svg>`;

function buildScrubber(video) {
  const scrubber = document.createElement('input');
  scrubber.type = 'range';
  scrubber.className = 'marquee-scrubber';
  scrubber.min = '0';
  scrubber.max = '100';
  scrubber.value = '0';
  scrubber.step = '0.1';
  scrubber.setAttribute('aria-label', 'Video progress');

  let isScrubbing = false;

  video.addEventListener('loadedmetadata', () => {
    if (video.duration) scrubber.max = String(video.duration);
  });

  video.addEventListener('timeupdate', () => {
    if (!isScrubbing) scrubber.value = String(video.currentTime);
  });

  scrubber.addEventListener('input', () => {
    isScrubbing = true;
    video.currentTime = Number(scrubber.value);
  });

  scrubber.addEventListener('change', () => {
    isScrubbing = false;
  });

  return scrubber;
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

  controls.append(playPauseBtn, muteBtn, buildScrubber(video));
  return controls;
}

function decorateVideo(cell) {
  if (!cell) return;

  const existingVideo = cell.querySelector('video');
  const link = cell.querySelector('a[href*=".mp4" i]');
  const src = existingVideo?.querySelector('source')?.src || existingVideo?.currentSrc || link?.href;
  if (!src) return;

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

  cell.classList.add('marquee-media');
  cell.replaceChildren(video, buildControls(video));
}

export default function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];
  const [logoRow, contentRow, videoRow] = rows.length >= 3 ? rows : [undefined, ...rows];
  if (!contentRow) return;

  const contentCell = contentRow.querySelector(':scope > div') || contentRow;
  contentCell.classList.add('marquee-content');
  contentRow.classList.add('marquee-content-row');

  const logoCell = logoRow?.querySelector(':scope > div') || logoRow;
  const logo = logoCell?.querySelector('picture');
  if (logo) {
    const eyebrow = document.createElement('div');
    eyebrow.className = 'marquee-eyebrow';
    eyebrow.append(logo);
    contentCell.prepend(eyebrow);
  }
  logoRow?.remove();

  const heading = contentCell.querySelector('h1, h2, h3, h4, h5, h6');
  heading?.classList.add('marquee-headline');

  contentCell.querySelectorAll('p').forEach((p) => {
    if (p.textContent?.trim()) p.classList.add('marquee-subcopy');
  });

  if (videoRow) {
    videoRow.classList.add('marquee-video-row');
    decorateVideo(videoRow.querySelector(':scope > div') || videoRow);
  }

  const inner = document.createElement('div');
  inner.className = 'marquee-inner';
  inner.append(contentRow);
  if (videoRow) inner.append(videoRow);
  el.append(inner);
}
