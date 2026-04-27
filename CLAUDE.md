# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **da-bacom** (Adobe for Business), a Franklin/Helix-based project for business.adobe.com. It uses AEM (Adobe Experience Manager) with the milo-college architecture pattern.

- **Org**: adobecom
- **Main branch**: `main`
- **Stage branch**: `stage`
- **Live**: https://main--da-bacom--adobecom.aem.live
- **Stage**: https://stage--da-bacom--adobecom.aem.live

## Commands

### Development
```bash
aem up              # Start local server at http://localhost:3000
```
For Milo integration testing: run `npm run libs` in the Milo folder (port 6456), then add `?milolibs=local` to URLs.

### Unit Tests (Web Test Runner)
```bash
npm run test              # Run all unit tests with coverage
npm run test:watch        # Watch mode
npm run test:file         # Run specific test file
npm run test:file:watch   # Run specific test file in watch mode
```

### E2E Tests (Playwright/Nala)
```bash
npm run nala local                                    # All tests locally
npm run nala local accordion.test.js                  # Specific test file
npm run nala local @accordion                         # Tests by tag
npm run nala local mode=ui                            # UI mode
npm run nala stage                                    # Against stage
npm run nala:login                                    # Login to DA (required for LPB tests)
```

Nala options: `browser=chrome|firefox|webkit`, `device=desktop|mobile`, `mode=headless|ui|debug|headed`, `milolibs=local|prod|code|<branch>`

**Landing Page Builder tests** require DA login and use env vars:
```bash
npm run nala:login
LPB_REF=stage npm run nala local @lpb-non-e2e
LPB_URL=http://localhost:3000 npm run nala local landing-page-builder.test.js
```

### Linting
```bash
npm run lint          # JS + CSS
npm run lint:fix      # Fix JS + CSS
npm run lint:js       # JS only
npm run lint:css      # CSS only
```

Setup a hook to run lint:fix after each file edit, e.g. Cursor:
```json
// .cursor/hooks.json:
{
  "hooks": {
    "afterFileEdit": [
      "npm run lint:fix"
    ]
  }
}
```

## Architecture

### Block System
`/blocks/` contains reusable UI components following the Franklin block pattern. Each block is a directory with its own JS and CSS files.

### Tools
`/tools/` contains authoring tools:
- **`/generator/`** — Landing Page Builder (LPB), the primary active development area. Key files:
  - `landing-page.js` — Main UI and logic
  - `form-sections.js` — Form component rendering
  - `da-utils.js` — Digital Assets SDK integration
  - `paths-config.js` — URL/path construction
  - `page-builder-admin.js` — Admin interface
- **`/caas-tag-selector/`**, **`/locale-nav/`**, **`/ui/`** — Other authoring utilities

### Scripts
`/scripts/scripts.js` is the core site initialization script with 100+ locale configurations.

### Testing Structure
- **Unit tests**: `test/**/*.test.js` and `test/**/*.test.html` — run via Web Test Runner
- **E2E tests**: `nala/**/*.test.js` — run via Playwright
  - `nala/libs/config.js` — environment configuration
  - `nala/libs/constants.js` — shared constants and URLs
  - `nala/tools/landing-page-builder/` — LPB-specific E2E tests with their own README

### Logging
Use `window.lana.log()` instead of `console.log()`. Logs go to Splunk.
```js
window.lana.log('message', { severity: 'warning', tags: 'block-name' });
```
Severity levels: `critical`, `error`, `warning`, `info`, `debug`.

## Key Conventions

- **Pre-commit hooks** (Husky) run ESLint, Stylelint, and tests automatically. Bypass with `git commit --no-verify` only when necessary.
- **LPB E2E tests** use stable reusable slugs (`nala-auto-guide-gated-us`, etc.) and a cleanup script: `node nala/tools/landing-page-builder/cleanup-generated-pages.js`
- **Unit test coverage** excludes: `**/mocks/**`, `**/node_modules/**`, `**/test/**`, `**/deps/**`
- **ESLint config**: airbnb-base + react-hooks + compat + ecmalist
