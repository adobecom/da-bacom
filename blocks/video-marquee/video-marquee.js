import { LIBS, PLAY_SVG } from '../../scripts/scripts.js';

const ICON_BASE = '/blocks/video-marquee/icons';
const iconCache = new Map();

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

function loadIcon(name) {
  if (!iconCache.has(name)) {
    iconCache.set(name, fetch(`${ICON_BASE}/${name}.svg`)
      .then((resp) => (resp.ok ? resp.text() : ''))
      .catch(() => ''));
  }
  return iconCache.get(name);
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
    if (isPaused) {
      playPauseBtn.innerHTML = PLAY_SVG;
    } else {
      loadIcon('pause').then((svg) => { playPauseBtn.innerHTML = svg; });
    }
  };

  const updateMute = () => {
    muteBtn.setAttribute('aria-label', video.muted ? labels.unmuteVideo : labels.muteVideo);
    muteBtn.setAttribute('aria-pressed', String(video.muted));
    loadIcon(video.muted ? 'mute' : 'unmute').then((svg) => { muteBtn.innerHTML = svg; });
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

// A video cell can be authored as an inline video ("video in doc") or a link,
// and either an mp4 (native <video>) or a video.tv.adobe.com link (MPC iframe).
// Resolve the cell to one of: an already-decorated MPC embed, a tv.adobe.com
// link, or an mp4 source (from an existing <video>, an mp4 link, or a poster
// <picture> whose img alt encodes the mp4 as `url#flags | label`).
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
