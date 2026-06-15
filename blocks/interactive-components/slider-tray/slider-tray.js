/* eslint-disable no-case-declarations */
/* eslint-disable no-use-before-define */
import { LIBS } from '../../../scripts/scripts.js';

let createTag;
let getConfig;

let tabbing = false;
document.addEventListener('keydown', () => { tabbing = true; });
document.addEventListener('keyup', () => { tabbing = false; });

function defineDeviceByScreenSize() {
  const { innerWidth } = window;
  if (innerWidth <= 600) return 'MOBILE';
  if (innerWidth >= 1200) return 'DESKTOP';
  return 'TABLET';
}

const CSSRanges = {
  hue: { min: -180, zero: 0, max: 180 },
  saturation: { min: 0, zero: 100, max: 300 },
};

const PsRanges = {
  hue: { min: -180, zero: 0, max: 180 },
  saturation: { min: -100, zero: 0, max: 100 },
};

export default async function stepInit(data) {
  ({ createTag, getConfig } = await import(`${LIBS}/utils/utils.js`));
  const imgObj = {};
  const layer = createTag('div', { class: `layer layer-${data.stepIndex}` });
  await createSelectorTray(data, layer);
  sliderEvent(data.target, layer, imgObj);
  uploadImage(data.target, layer, imgObj);
  continueToPs(layer, imgObj);
  return layer;
}

async function createSelectorTray(data, layer) {
  const sliderTray = createTag('div', { class: 'tray-wrapper' });
  const menu = createTag('div', { class: 'menu' });
  const config = data.stepConfigs[data.stepIndex];
  const options = config.querySelectorAll(':scope > div ul .icon, :scope > div ol .icon');
  [...options].forEach((o) => { handleInput(o, sliderTray, menu, layer); });
  layer.prepend(sliderTray);
  observeSliderTray(sliderTray, data.target, menu);
}

function handleInput(option, sliderTray, menu, layer) {
  let inputType = option.classList[1].split('icon-')[1];
  const sliderType = inputType.split('-')[0];
  if (inputType.includes('slider')) inputType = 'slider';
  const sibling = option.nextSibling;
  const text = sibling?.nodeValue?.trim() ?? '';
  let picture = '';
  if (sibling.nextSibling && sibling.nextSibling.tagName === 'PICTURE') {
    picture = sibling.nextSibling;
  }
  switch (inputType) {
    case 'slider':
      createSlider(sliderType, text, menu, sliderTray);
      break;
    case 'upload':
      createUploadButton(text, picture, sliderTray, menu);
      break;
    case 'upload-ps':
      createUploadPSButton(text, picture, layer);
      break;
    default:
      window.lana.log(`Unknown input type: ${inputType}`);
      break;
  }
}

function observeSliderTray(sliderTray, targets) {
  const options = { threshold: 0.7 };
  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const menu = sliderTray.querySelector('.menu');
      const outerCircle = menu.querySelector('.outer-circle');
      if (!outerCircle) return;
      outerCircle.classList.add('show-outer-border');
      setTimeout(() => { animateSlider(menu, targets); }, 800);
      observer.unobserve(entry.target);
    });
  }, options);
  io.observe(sliderTray);
}

function createSlider(sliderType, details, menu, sliderTray) {
  const sliderLabel = createTag('label', { for: `${sliderType}` }, details.trim());
  const sliderContainer = createTag('div', { class: `slider-container ${sliderType.toLowerCase()}` });
  const outerCircle = createTag('a', {
    class: 'outer-circle',
    href: '#',
    tabindex: '-1',
    'aria-label': 'slideRunner',
  });
  const analyticsHolder = createTag('div', { class: 'interactive-link-analytics-text' }, `Adjust ${sliderType} slider`);
  const input = createTag('input', {
    type: 'range',
    min: CSSRanges[sliderType].min,
    max: CSSRanges[sliderType].max,
    class: `options ${sliderType.toLowerCase()}-input`,
    'aria-label': 'slider',
    value: `${sliderType === 'hue' ? '0' : '150'}`,
  });
  outerCircle.append(analyticsHolder);
  sliderContainer.append(input, outerCircle);
  menu.append(sliderLabel, sliderContainer);
  sliderTray.append(menu);
  outerCircle.addEventListener('click', (e) => {
    e.preventDefault();
  });
  applyAccessibility(input, outerCircle);
}

function createUploadButton(details, picture, sliderTray, menu) {
  const currentVP = defineDeviceByScreenSize().toLocaleLowerCase();
  const btn = createTag('input', { class: 'inputFile', type: 'file', accept: 'image/*', 'aria-label': 'upload image' });
  const labelBtn = createTag('a', { class: `upload-btn body-${currentVP === 'mobile' ? 'm' : 'xl'}` }, details);
  const analyticsHolder = createTag('div', { class: 'interactive-link-analytics-text' }, `${details}`);
  labelBtn.append(btn, analyticsHolder);
  appendSVGToButton(picture, labelBtn);
  const clone = labelBtn.cloneNode(true);
  clone.classList.add('upload-btn-mobile');
  const mobileInput = clone.querySelector('.inputFile');
  menu.append(clone);
  sliderTray.append(labelBtn);
  applyAccessibility(btn, labelBtn);
  applyAccessibility(mobileInput, clone);
}

function applyAccessibility(inputEle, target) {
  inputEle.addEventListener('focus', () => {
    if (tabbing) target.classList.add('upload-btn-focus');
  });
  inputEle.addEventListener('blur', () => {
    target.classList.remove('upload-btn-focus');
  });
}

function createUploadPSButton(details, picture, layer) {
  const btn = createTag('a', { class: 'continue-button body-xl hide', tabindex: '0' }, details);
  const analyticsHolder = createTag('div', { class: 'interactive-link-analytics-text' }, `${details}`);
  btn.append(analyticsHolder);
  appendSVGToButton(picture, btn);
  layer.append(btn);
}

function appendSVGToButton(picture, button) {
  if (!picture) return;
  const svg = picture.querySelector('img[src*=svg]');
  if (!svg) return;
  const svgClone = svg.cloneNode(true);
  const svgCTACont = createTag('div', { class: 'svg-icon-container' });
  svgCTACont.append(svgClone);
  button.prepend(svgCTACont);
}

function sliderEvent(media, layer, imgObj) {
  let hue = 0;
  let saturation = 100;
  ['hue', 'saturation'].forEach((sel) => {
    const sliderEl = layer.querySelector(`.${sel.toLowerCase()}-input`);
    if (!sliderEl) return;
    sliderEl.addEventListener('input', () => {
      const image = media.querySelector('.interactive-holder picture > img');
      const { value } = sliderEl;
      sliderEl.setAttribute('value', value);
      const outerCircle = sliderEl.nextSibling;
      const value1 = (value - sliderEl.min) / (sliderEl.max - sliderEl.min);
      const thumbPercent = 3 + (value1 * 94);
      const interactiveBlock = media.closest('.marquee') || media.closest('.aside') || media.closest('.media');
      const isRowReversed = interactiveBlock.classList.contains('row-reversed') || interactiveBlock.classList.contains('media-reversed');
      if ((document.dir === 'rtl' || isRowReversed)) {
        outerCircle.style.right = `${thumbPercent}%`;
      } else {
        outerCircle.style.left = `${thumbPercent}%`;
      }
      switch (sel.toLowerCase()) {
        case ('hue'):
          hue = value;
          break;
        case ('saturation'):
          saturation = parseInt(value, 10);
          break;
        default:
          break;
      }
      image.style.filter = `hue-rotate(${hue}deg) saturate(${saturation}%)`;
      cssToPhotoshop(imgObj, sel.toLowerCase(), value);
    });
    sliderEl.addEventListener('change', () => {
      const outerCircle = sliderEl.nextSibling;
      outerCircle.click();
    });
  });
}

function cssToPhotoshop(imgObj, adjustment, value) {
  const unitValue = convertToUnit(adjustment, value, CSSRanges);
  imgObj[adjustment] = convertFromUnit(adjustment, unitValue, PsRanges);
}

function convertToUnit(adjustment, value, ranges) {
  if (value < ranges[adjustment].min || value > ranges[adjustment].max) {
    window.lana.log(`value out of range ${adjustment}:${value}`);
  }
  if (value < ranges[adjustment].zero) {
    const spread = ranges[adjustment].zero - ranges[adjustment].min;
    return (value - ranges[adjustment].min) / spread - 1;
  }
  const spread = ranges[adjustment].max - ranges[adjustment].zero;
  return (value - ranges[adjustment].zero) / spread;
}

function convertFromUnit(adjustment, value, ranges) {
  if (value < -1 || value > 1) {
    window.lana.log(`value out of range ${adjustment}:${value}`);
  }
  if (value < 0) {
    const spread = ranges[adjustment].zero - ranges[adjustment].min;
    const t = value + 1;
    return t * spread + ranges[adjustment].min;
  }
  const spread = ranges[adjustment].max - ranges[adjustment].zero;
  return value * spread + ranges[adjustment].zero;
}

function uploadImage(media, layer, imgObj) {
  layer.querySelectorAll('.upload-btn').forEach((btn) => {
    const analyticsBtn = btn.querySelector('.interactive-link-analytics-text');
    btn.addEventListener('cancel', () => {
      cancelAnalytics(btn);
    });
    btn.addEventListener('change', (event) => {
      const image = media.querySelector('picture > img');
      const file = event.target.files[0];
      if (!file.type.startsWith('image/')) return;
      if (file) {
        imgObj.fileName = file.name;
        const imageUrl = URL.createObjectURL(file);
        image.src = imageUrl;
        imgObj.imgSrc = imageUrl;
        analyticsBtn.innerHTML = 'Upload Button';
        const continueBtn = layer.querySelector('.continue-button');
        if (continueBtn) {
          continueBtn.classList.remove('hide');
        }
      } else {
        cancelAnalytics(btn);
      }
    });
  });
}

/* eslint-disable max-len */
function continueToPs(layer, imgObj) {
  layer.querySelectorAll('.continue-button').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        const actionJSONData = []; // hue/sat adjustment payload for PS
        const { openInPsWeb } = await import('../../../deps/openInPsWeb/openInPsWeb.js');
        const imageData = await (await fetch(imgObj.imgSrc)).blob();
        const cs = getConfig();
        const enConf = cs.prodDomains.includes(window.location.host) ? cs.prod.psUrl : cs.stage.psUrl;
        openInPsWeb(enConf, imgObj.fileName, [{ filename: imgObj.fileName, imageData }], actionJSONData);
      } catch (e) {
        window.lana.log(`continueToPs failed: ${e.message}`, { severity: 'error', tags: 'slider-tray' });
      }
    });
  });
}
/* eslint-enable max-len */

function cancelAnalytics(btn) {
  const x = (e) => {
    e.preventDefault();
  };
  btn.addEventListener('click', x);
  const cancelEvent = new Event('click', { detail: { message: 'Cancel button clicked in file dialog' } });
  btn.setAttribute('daa-ll', 'Cancel Upload');
  btn.dispatchEvent(cancelEvent);
  btn.removeEventListener('click', x);
  btn.setAttribute('daa-ll', 'Upload Image');
}

function animateSlider(menu, target) {
  const option = menu.querySelector('.options');
  const aobj = { interrupted: false };
  const outerCircle = option.nextElementSibling;
  outerCircle.classList.add('animate');
  ['mousedown', 'touchstart', 'keyup'].forEach((e) => {
    option.closest('.tray-wrapper').addEventListener(e, () => {
      aobj.interrupted = true;
      outerCircle.classList.remove('show-outer-border', 'animate', 'animateout');
    }, { once: true });
  });
  outerCircle.addEventListener('transitionend', () => {
    setTimeout(() => {
      const min = parseInt(option.min, 10);
      const max = parseInt(option.max, 10);
      const middle = (min + max) / 2;
      sliderScroll(option, middle, max, 1200, outerCircle, target, aobj);
    }, 500);
  }, { once: true });
}

function sliderScroll(slider, start, end, duration, outerCircle, target, aobj) {
  let current = start;
  let step = ((end - start) / duration) * 10;
  let direction = 1;
  function stepAnimation() {
    slider.value = current;
    current += step;
    if (aobj.interrupted) return;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    if ((step > 0 && current >= (start + 70)) || (step < 0 && current >= (start + 70))) {
      step = -step;
      setTimeout(stepAnimation, 10);
    } else if ((step > 0 && current <= (start - 70)) || (step < 0 && current <= (start - 70))) {
      step = -step;
      setTimeout(stepAnimation, 10);
      direction = -1;
    } else if (Math.abs(current - start) < Math.abs(step) && direction === -1) {
      slider.value = current;
      const image = target.querySelector('picture > img');
      image.style.filter = `hue-rotate(${0}deg)`;
      setTimeout(() => {
        outerCircle.classList.remove('animate');
        outerCircle.classList.add('animateout');
      }, 500);
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      setTimeout(stepAnimation, 10);
    }
  }
  setTimeout(stepAnimation, 10);
}
