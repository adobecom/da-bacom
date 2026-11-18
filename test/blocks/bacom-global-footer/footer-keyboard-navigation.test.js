import { expect } from '@esm-bundle/chai';
import { setViewport } from '@web/test-runner-commands';
import { setupFooterKeyboardNav } from '../../../blocks/bacom-global-footer/footer-keyboard-navigation.js';

describe('BACOM footer language menu', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('closes the desktop region dropdown on Escape', async () => {
    await setViewport({ width: 1440, height: 900 });
    document.body.innerHTML = `
      <footer class="bacom-global-footer">
        <div class="feds-regionPicker-wrapper feds-dropdown--active">
          <a class="feds-regionPicker" href="#" role="button"
            aria-haspopup="true" aria-expanded="true">Change region</a>
          <ul id="language-menu">
            <li><a href="/blog/">US (English)</a></li>
            <li><a href="/jp/blog/">Japan</a></li>
          </ul>
        </div>
      </footer>`;
    await setupFooterKeyboardNav();

    const regionButton = document.querySelector('.feds-regionPicker');
    const dropdown = document.querySelector('.feds-regionPicker-wrapper');
    regionButton.focus();
    regionButton.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      bubbles: true,
    }));

    expect(regionButton.getAttribute('aria-expanded')).to.equal('false');
    expect(dropdown.classList.contains('feds-dropdown--active')).to.be.false;
  });
});
