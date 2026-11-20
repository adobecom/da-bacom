import { expect } from '@esm-bundle/chai';
import { readFile, setViewport } from '@web/test-runner-commands';

const css = await readFile({ path: '../../../styles/styles-c2.css' });

describe('C2 footer language contrast', () => {
  let style;
  let fixture;

  before(() => {
    style = document.createElement('style');
    style.textContent = css;
    document.head.append(style);
  });

  after(() => style.remove());

  beforeEach(() => {
    fixture = document.createElement('div');
    fixture.innerHTML = `
      <footer class="global-footer">
        <div class="feds-footer-wrapper"
          style="color: var(--s2a-color-gray-25); background: var(--s2a-color-gray-1000)">
          <div class="language-dropdown">
            <ul class="language-list">
              <li class="language-item selected">
                <a class="language-link" href="#english" role="option" aria-selected="true">
                  <span class="language-name">English (US)</span>
                </a>
              </li>
              <li class="language-item">
                <a class="language-link" href="#global" role="option" aria-selected="false">
                  <span class="language-name">Global EN</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
      <header style="background: var(--s2a-color-gray-25)">
        <div class="language-dropdown">
          <a class="language-link" href="#header">English (US)</a>
        </div>
      </header>`;
    document.body.append(fixture);
  });

  afterEach(() => fixture.remove());

  [1440, 390].forEach((width) => {
    it(`keeps footer language names light before and after focus at ${width}px`, async () => {
      await setViewport({ width, height: 900 });
      const wrapper = fixture.querySelector('.feds-footer-wrapper');
      const foreground = getComputedStyle(wrapper).color;

      fixture.querySelectorAll('footer .language-link').forEach((link) => {
        const name = link.querySelector('.language-name');
        expect(getComputedStyle(name).color).to.equal(foreground);
        link.focus();
        expect(getComputedStyle(name).color).to.equal(foreground);
      });
    });
  });

  it('preserves dark language text outside the footer on a light background', () => {
    const headerLink = fixture.querySelector('header .language-link');
    expect(getComputedStyle(headerLink).color).to.equal('rgb(0, 0, 0)');
  });
});
