import { LIBS, PLAY_SVG } from '../../scripts/scripts.js';

const ICON_BASE = '/blocks/video-marquee/icons';
const FEDERATED_ICON_NAMES = new Set(['play', 'pause']);
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

async function fetchFederatedIcon(name) {
  try {
    const { getFederatedContentRoot } = await import(`${LIBS}/utils/utils.js`);
    const fedRoot = getFederatedContentRoot();
    const resp = await fetch(`${fedRoot}/federal/assets/svgs/accessibility-${name}.svg`);
    return resp.ok ? await resp.text() : '';
  } catch {
    return '';
  }
}

async function fetchLocalIcon(name) {
  try {
    const resp = await fetch(`${ICON_BASE}/${name}.svg`);
    return resp.ok ? await resp.text() : '';
  } catch {
    return '';
  }
}

function loadIcon(name) {
  if (!iconCache.has(name)) {
    const promise = (async () => {
      if (FEDERATED_ICON_NAMES.has(name)) {
        const federated = await fetchFederatedIcon(name);
        if (federated) return federated;
      }
      if (name === 'play') return PLAY_SVG;
      return fetchLocalIcon(name);
    })();
    iconCache.set(name, promise);
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
    loadIcon(isPaused ? 'play' : 'pause').then((svg) => { playPauseBtn.innerHTML = svg; });
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

/*
 * Mirrors the playback flags supported by Milo's decorateAnchorVideo:
 *  #hoverplay    - plays only while hovered, no autoplay
 *  #viewportplay - autoplays only once scrolled into view (>=80% visible)
 *  (default)     - autoplays immediately, still pauses/resumes with viewport
 */
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

      // The first time the default (non-viewportplay) video enters view, its own
      // autoplay attribute already starts it, so skip triggering play() here.
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

function decorateVideo(cell, labels) {
  if (!cell) return;

  const existingVideo = cell.querySelector('video');
  const link = cell.querySelector('a[href*=".mp4" i]');
  const captionsLink = cell.querySelector('a[href*=".vtt" i]');
  const src = existingVideo?.querySelector('source')?.src || existingVideo?.currentSrc || link?.href;
  if (!src) return;

  const hash = (link?.hash || '').toLowerCase();
  const hoverPlay = hash.includes('hoverplay');
  const viewportPlay = hash.includes('viewportplay');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  if (!prefersReducedMotion && !hoverPlay && !viewportPlay) video.autoplay = true;

  const source = document.createElement('source');
  source.src = src;
  source.type = 'video/mp4';
  video.append(source);

  let userPaused = false;
  const controls = buildControls(video, labels, (paused) => { userPaused = paused; });

  if (captionsLink?.href) {
    const track = document.createElement('track');
    track.kind = 'captions';
    track.src = captionsLink.href;
    track.srclang = 'en';
    track.label = 'English';
    video.append(track);
    controls.append(buildCaptionsToggle(track.track, labels));
  }

  cell.classList.add('marquee-media');
  cell.replaceChildren(video, controls);

  watchReducedMotion(video);
  if (hoverPlay) {
    watchHoverPlayback(video, cell, () => userPaused);
  } else {
    watchViewportPlayback(video, cell, { viewportPlay, isUserPaused: () => userPaused });
  }
}

export default async function init(el) {
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
    const labels = await loadLabels();
    decorateVideo(videoRow.querySelector(':scope > div') || videoRow, labels);
  }

  const inner = document.createElement('div');
  inner.className = 'marquee-inner';
  inner.append(contentRow);
  if (videoRow) inner.append(videoRow);
  el.append(inner);
}
