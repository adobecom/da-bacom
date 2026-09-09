import { LIBS, PLAY_SVG } from '../../scripts/scripts.js';

const PAUSE_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/></svg>';
const MUTE_SVG = '<svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true" focusable="false"><path d="M30.0481 28.3828L3.64806 1.98279C3.17931 1.51404 2.41993 1.51404 1.95118 1.98279C1.48243 2.45154 1.48243 3.21092 1.95118 3.67967L6.30587 8.03436H5.19961C3.21524 8.03436 1.59961 9.64999 1.59961 11.6344V20.4344C1.59961 22.4187 3.21524 24.0344 5.19961 24.0344H7.80587C8.12305 24.0344 8.43243 24.1625 8.6543 24.3844L12.8199 28.5515C13.3574 29.089 14.0699 29.3734 14.7965 29.3734C15.1574 29.3734 15.5215 29.3031 15.8699 29.1578C16.9215 28.7234 17.5996 27.7078 17.5996 26.5703V19.3281L28.3512 30.0797C28.5855 30.314 28.8918 30.4312 29.1996 30.4312C29.5074 30.4312 29.8137 30.314 30.048 30.0797C30.5168 29.6109 30.5168 28.8515 30.0481 28.3828ZM15.1996 26.5703C15.1996 26.8031 15.0449 26.9031 14.9527 26.9406C14.859 26.9797 14.6793 27.0156 14.5168 26.8547L10.3512 22.6875C9.6715 22.0078 8.76836 21.6344 7.80587 21.6344H5.19961C4.53867 21.6344 3.99961 21.0953 3.99961 20.4344V11.6344C3.99961 10.9734 4.53867 10.4344 5.19961 10.4344H8.70587L15.1996 16.9281L15.1996 26.5703Z" fill="currentColor"/><path d="M13.2145 6.51724L14.5176 5.21412C14.6848 5.05005 14.8629 5.09224 14.9535 5.12661C15.066 5.17349 15.2004 5.27504 15.2004 5.49693V9.64224C15.2004 10.3047 15.7379 10.8422 16.4004 10.8422C17.0629 10.8422 17.6004 10.3047 17.6004 9.64224V5.49693C17.6004 4.361 16.9223 3.34536 15.8723 2.90943C14.8207 2.47661 13.6254 2.71412 12.8207 3.51724L11.5176 4.82036C11.0488 5.28911 11.0488 6.04848 11.5176 6.51724C11.9863 6.98599 12.7457 6.98599 13.2145 6.51724Z" fill="currentColor"/><path d="M21.1558 15.7203C21.2199 16.3375 21.7402 16.7969 22.348 16.7969C22.3886 16.7969 22.4308 16.7953 22.473 16.7906C23.1324 16.7219 23.612 16.1328 23.5433 15.4734C23.3839 13.9328 22.6261 12.6031 21.4652 11.8297C20.9136 11.4641 20.1683 11.6125 19.8011 12.1625C19.4339 12.7141 19.5824 13.4594 20.1339 13.8266C20.6902 14.1969 21.0714 14.9047 21.1558 15.7203Z" fill="currentColor"/><path d="M27.6008 16.0282C27.6008 17.4141 27.1461 18.7266 26.3196 19.7235C25.8977 20.2344 25.9696 20.9907 26.4789 21.4141C26.7039 21.5985 26.9743 21.6891 27.2446 21.6891C27.5883 21.6891 27.9321 21.5407 28.1696 21.2547C29.3508 19.8266 30.0008 17.9704 30.0008 16.0282C30.0008 13.3313 28.7243 10.8032 26.668 9.42974C26.1117 9.06256 25.3696 9.21099 25.0024 9.76099C24.6352 10.3126 24.7836 11.0579 25.3336 11.4266C26.7321 12.3594 27.6008 14.1235 27.6008 16.0282Z" fill="currentColor"/></svg>';
const UNMUTE_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M4 9V15H8L13 20V4L8 9H4Z" fill="currentColor"/><path d="M16.5 12C16.5 10.23 15.73 8.71 14.5 7.68V16.32C15.73 15.29 16.5 13.77 16.5 12Z" fill="currentColor"/><path d="M18.5 5.36L17.23 6.63C19.07 8.1 20 9.95 20 12C20 14.05 19.07 15.9 17.23 17.37L18.5 18.64C20.72 16.9 22 14.6 22 12C22 9.4 20.72 7.1 18.5 5.36Z" fill="currentColor"/></svg>';

const DEFAULT_LABELS = {
  playVideo: 'Play video',
  pauseVideo: 'Pause video',
  muteVideo: 'Mute video',
  unmuteVideo: 'Unmute video',
  showCaptions: 'Show captions',
  hideCaptions: 'Hide captions',
  videoProgress: 'Video progress',
};

async function loadLabels() {
  try {
    const { getConfig } = await import(`${LIBS}/utils/utils.js`);
    const { replaceKeyArray } = await import(`${LIBS}/features/placeholders.js`);
    const config = getConfig();
    const keys = Object.keys(DEFAULT_LABELS);
    const placeholderKeys = ['play-video', 'pause-video', 'mute-video', 'unmute-video', 'show-captions', 'hide-captions', 'video-progress'];
    const values = await replaceKeyArray(placeholderKeys, config);
    const labels = { ...DEFAULT_LABELS };
    keys.forEach((key, i) => {
      const value = values[i];
      const notFound = value === placeholderKeys[i].replaceAll('-', ' ');
      if (value && !notFound) labels[key] = value;
    });
    return labels;
  } catch {
    return DEFAULT_LABELS;
  }
}

async function getLocaleInfo() {
  const fallback = { srclang: 'en', label: 'English' };
  try {
    const { getConfig } = await import(`${LIBS}/utils/utils.js`);
    const ietf = getConfig()?.locale?.ietf || 'en-US';
    const srclang = ietf.split('-')[0];
    // eslint-disable-next-line compat/compat -- guarded by try/catch, falls back to English
    const label = new Intl.DisplayNames([ietf], { type: 'language' }).of(srclang);
    return { srclang, label: label || fallback.label };
  } catch {
    return fallback;
  }
}

function buildScrubber(video, labels) {
  const scrubber = document.createElement('input');
  scrubber.type = 'range';
  scrubber.className = 'marquee-scrubber';
  scrubber.min = '0';
  scrubber.max = '100';
  scrubber.value = '0';
  scrubber.step = '0.1';
  scrubber.setAttribute('aria-label', labels.videoProgress);

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

function buildControls(video, labels, onUserToggle) {
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
    playPauseBtn.setAttribute('aria-label', isPaused ? labels.playVideo : labels.pauseVideo);
    playPauseBtn.setAttribute('aria-pressed', String(!isPaused));
    playPauseBtn.innerHTML = isPaused ? PLAY_SVG : PAUSE_SVG;
  };

  const updateMute = () => {
    muteBtn.setAttribute('aria-label', video.muted ? labels.unmuteVideo : labels.muteVideo);
    muteBtn.setAttribute('aria-pressed', String(video.muted));
    muteBtn.innerHTML = video.muted ? MUTE_SVG : UNMUTE_SVG;
  };

  playPauseBtn.addEventListener('click', () => {
    if (video.paused || video.ended) {
      onUserToggle?.(false);
      video.play();
    } else {
      onUserToggle?.(true);
      video.pause();
    }
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

  controls.append(playPauseBtn, muteBtn, buildScrubber(video, labels));
  return controls;
}

function buildCaptionsToggle(track, labels) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'marquee-video-control marquee-captions';
  btn.textContent = 'CC';

  const update = () => {
    const isShowing = track.mode === 'showing';
    btn.setAttribute('aria-pressed', String(isShowing));
    btn.setAttribute('aria-label', isShowing ? labels.hideCaptions : labels.showCaptions);
  };

  btn.addEventListener('click', () => {
    track.mode = track.mode === 'showing' ? 'hidden' : 'showing';
    update();
  });

  update();
  return btn;
}

function watchViewportPlayback(video, cell, { viewportPlay, isUserPaused }) {
  let hasPlayedOnce = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ intersectionRatio }) => {
      const inView = intersectionRatio > 0.8;

      if (!inView) {
        if (!video.paused) video.pause();
        return;
      }

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion || isUserPaused()) return;

      if (!viewportPlay && !hasPlayedOnce) {
        hasPlayedOnce = true;
        return;
      }

      hasPlayedOnce = true;
      if (video.paused) video.play();
    });
  }, { threshold: [0, 0.8, 1] });

  observer.observe(cell);
}

function watchHoverPlayback(video, cell, isUserPaused) {
  cell.addEventListener('mouseenter', () => {
    if (!isUserPaused()) video.play();
  });
  cell.addEventListener('mouseleave', () => {
    video.pause();
  });
}

function watchReducedMotion(video) {
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
    if (e.matches && !video.paused) video.pause();
  });
}

const ATV_RE = /tv\.adobe\.com\/v\//i;
const MP4_RE = /\.mp4(\?|#|$)/i;

function resolveSource(cell) {
  if (!cell) return null;

  const embed = cell.querySelector('.milo-video, iframe.adobetv, iframe[src*="tv.adobe.com" i]');
  if (embed) return { type: 'embed' };

  const atvLink = [...cell.querySelectorAll('a')]
    .find((a) => ATV_RE.test(a.getAttribute('href') || ''));
  if (atvLink) return { type: 'atv', url: atvLink.getAttribute('href') };

  const existingVideo = cell.querySelector('video');
  if (existingVideo) {
    const src = existingVideo.querySelector('source')?.src
      || existingVideo.currentSrc
      || existingVideo.getAttribute('data-video-source');
    if (src) return { type: 'mp4', src, hash: '' };
  }

  const mp4Link = [...cell.querySelectorAll('a')]
    .find((a) => MP4_RE.test(a.getAttribute('href') || ''));
  if (mp4Link) return { type: 'mp4', src: mp4Link.href, hash: (mp4Link.hash || '').toLowerCase() };

  const posterImg = [...cell.querySelectorAll('picture img')]
    .find((img) => MP4_RE.test(img.getAttribute('alt') || ''));
  if (posterImg) {
    const [urlPart] = (posterImg.getAttribute('alt') || '').split('|');
    const [src, hashPart] = urlPart.trim().split('#');
    return {
      type: 'mp4',
      src,
      hash: hashPart ? `#${hashPart}`.toLowerCase() : '',
      poster: posterImg.currentSrc || posterImg.getAttribute('src') || '',
    };
  }

  return null;
}

function buildAtvIframe(url) {
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.className = 'marquee-atv';
  iframe.title = 'Adobe Video Publishing Cloud Player';
  iframe.setAttribute('scrolling', 'no');
  iframe.setAttribute('allow', 'encrypted-media; fullscreen');
  iframe.setAttribute('loading', 'lazy');
  return iframe;
}

function decorateVideo(cell, labels, locale) {
  if (!cell) return;

  const info = resolveSource(cell);
  if (!info) return;

  cell.classList.add('marquee-media');

  if (info.type === 'embed') return;

  if (info.type === 'atv') {
    cell.replaceChildren(buildAtvIframe(info.url));
    return;
  }

  const captionsLink = cell.querySelector('a[href*=".vtt" i]');
  const hash = info.hash || '';
  const hoverPlay = hash.includes('hoverplay');
  const viewportPlay = hash.includes('viewportplay');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  if (info.poster) video.poster = info.poster;
  if (!prefersReducedMotion && !hoverPlay && !viewportPlay) video.autoplay = true;

  const source = document.createElement('source');
  source.src = info.src;
  source.type = 'video/mp4';
  video.append(source);

  let userPaused = false;
  const controls = buildControls(video, labels, (paused) => { userPaused = paused; });

  if (captionsLink?.href) {
    const track = document.createElement('track');
    track.kind = 'captions';
    track.src = captionsLink.href;
    track.srclang = locale.srclang;
    track.label = locale.label;
    video.append(track);
    controls.append(buildCaptionsToggle(track.track, labels));
  }

  cell.replaceChildren(video, controls);

  watchReducedMotion(video);
  if (hoverPlay) {
    watchHoverPlayback(video, cell, () => userPaused);
  } else {
    watchViewportPlayback(video, cell, { viewportPlay, isUserPaused: () => userPaused });
  }
}

export default async function init(el) {
  const { decorateBlockAnalytics } = await import(`${LIBS}/martech/attributes.js`);
  decorateBlockAnalytics(el);
  el.classList.add('dark');

  const rows = [...el.querySelectorAll(':scope > div')];
  const cellOf = (row) => row.querySelector(':scope > div') || row;

  // Classify rows by content, so a logo is optional and one or two video rows
  // are both supported (first video = mobile, second = desktop).
  const videoRows = rows.filter((row) => resolveSource(cellOf(row)));
  const nonVideoRows = rows.filter((row) => !videoRows.includes(row));
  const contentRow = nonVideoRows.find((row) => row.querySelector('h1, h2, h3, h4, h5, h6'))
    || nonVideoRows.find((row) => [...row.querySelectorAll('p')].some((p) => p.textContent.trim()));
  if (!contentRow) return;
  const logoRow = nonVideoRows.find((row) => row !== contentRow && row.querySelector('picture'));

  const contentCell = cellOf(contentRow);
  contentCell.classList.add('marquee-content');
  contentRow.classList.add('marquee-content-row');

  const logoCell = logoRow ? cellOf(logoRow) : null;
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

  if (videoRows.length) {
    const [labels, locale] = await Promise.all([loadLabels(), getLocaleInfo()]);
    videoRows.forEach((videoRow, i) => {
      videoRow.classList.add('marquee-video-row');
      if (videoRows.length > 1) {
        videoRow.classList.add(i === 0 ? 'marquee-video-mobile' : 'marquee-video-desktop');
      }
      decorateVideo(cellOf(videoRow), labels, locale);
    });
  }

  const inner = document.createElement('div');
  inner.className = 'marquee-inner';
  inner.append(contentRow);
  videoRows.forEach((videoRow) => inner.append(videoRow));
  el.append(inner);
}
