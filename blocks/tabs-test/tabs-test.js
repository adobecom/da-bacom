export default async function init() {
  const tabOverrideStyles = `
    @media screen and (max-width: 600px) {
      .section .tabs div[role="tablist"] .tab-list-container {
        flex-direction: column;
      }

      .section .tabs div[role="tablist"] button[aria-selected="true"] {
        background: none;
        background-color: #d5d5d5;
      }

      .section .tabs.center div[role="tablist"] .tab-list-container {
        width: 100%;
        margin: 0 30px 30px;
      }

      .section .tabs div[role="tablist"] button {
        border-radius: 0;
        font-size: 24px;
        white-space: unset;
        word-wrap: break-word;
        line-height: 30px;
        padding: 8px 16px;
      }

      .section .tabs div[role="tablist"] {
        margin: 0;
        box-shadow: 0 -1px 0 inset var(--tabs-border-color);
      }
    }
  `;
  const tabsOverideStylesheet = document.createElement('style');
  tabsOverideStylesheet.textContent = tabOverrideStyles;
  document.head.append(tabsOverideStylesheet);

  const isMobileDevice = () => /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const clickToScroll = () => {
    if (window.innerWidth > 600 || !isMobileDevice()) return;

    const tabs = document.querySelectorAll('.tabList button');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const correspondingTabContent = tab.getAttribute('aria-controls');
        const content = document.querySelector(`#${correspondingTabContent}`);
        const rects = content.getBoundingClientRect();
        const topOffset = rects.top + window.scrollY;
        window.scrollTo({
          top: topOffset,
          behavior: 'smooth',
        });
      });
    });
  };

  // to remove during milo impl, race condition with tab loading
  setTimeout(clickToScroll, 500);
}
