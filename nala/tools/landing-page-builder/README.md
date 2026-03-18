# Landing Page Builder Tests

This folder contains the Playwright coverage for the Landing Page Builder authoring flow.

## Key Model

LPB is different from most Nala tests:

- Most Nala tests validate published pages.
- LPB tests validate the author experience.
- The LPB author app lives on `da.live`.
- The published or preview page created by LPB can live on `localhost`, `stage`, a branch URL, or `main`.

That means LPB has 2 different targets:

- Author app: `https://da.live/app/adobecom/da-bacom/tools/generator/landing-page?ref=<ref>`
- Preview or publish environment: controlled by `npm run nala <env>`

## First-Time Setup

Log into DA first so Playwright can reuse the saved session:

```bash
npm run nala:login
```

If the saved session expires, run that again.

## Test Types

- `landing-page-builder.test.js`: form and field coverage
- `landing-page-builder-e2e.test.js`: full page creation and preview journeys

Only the E2E tests create reusable authored pages. Those scenarios use stable slugs and clean up existing authored content before each run.

## Common Commands

Run LPB smoke tests:

```bash
LPB_REF=stage npm run nala local "@lpb-non-e2e @smoke"
```

For the non-E2E smoke subset, keep `@lpb-non-e2e` and `@smoke` together in one quoted argument.

Run all non-E2E LPB tests:

```bash
LPB_REF=stage npm run nala local @lpb-non-e2e
```

Run only LPB E2E:

```bash
LPB_REF=stage npm run nala stage @lpb-e2e
```

Run one LPB E2E in UI mode:

```bash
LPB_REF=stage npm run nala local "@lpb-e2e-gated-guide" mode=ui
```

Run one LPB test file directly:

```bash
LPB_REF=stage npx playwright test nala/tools/landing-page-builder/landing-page-builder.test.js --project=da-bacom-live-chromium
```

## Environment Mapping

Use `LPB_REF` to choose the LPB author build on `da.live`.

Examples:

```bash
LPB_REF=stage npm run nala stage @lpb
LPB_REF=main npm run nala main @lpb
LPB_REF=local npm run nala local @lpb
LPB_REF=my-feature-branch npm run nala my-feature-branch @lpb
```

Recommended usage:

- Non-E2E form tests: `LPB_REF` matters most.
- E2E tests: keep `LPB_REF` and `npm run nala <env>` aligned when possible.

Example branch run:

```bash
LPB_REF=my-feature-branch npm run nala my-feature-branch @lpb-e2e
```

## Local Development With `aem up`

For manual author-side development and debugging, you can run the LPB on your local environment.

This repo serves the LPB page locally when you run:

```bash
aem up
```

This serves the local LPB page at:

```text
http://localhost:3000/tools/generator/landing-page
```

When the DA author app sees `ref=local`, it uses the **local environment** (`localhost:3000`).

```text
https://da.live/app/adobecom/da-bacom/tools/generator/landing-page?ref=local
```

With this URL, the DA author app loads the LPB in an iframe pointing to your local server with the same URL used by the DA author app on da.live when `ref=local`.

*You get full DA authoring context (auth and APIs) with your local LPB code.* 

### Option A: Author on local URL only (No DA Context)

Directly test the LPB page on your local server for form/field and smoke tests without the DA wrapper.

- `LPB_URL` changes the author app target from `da.live` to your local `aem up` page.

```bash
LPB_URL=http://localhost:3000/tools/generator/landing-page npm run nala local @lpb-non-e2e
LPB_URL=http://localhost:3000/tools/generator/landing-page npm run nala local "@lpb-non-e2e @smoke"
```

Recommended scope:
- form and field tests
- smoke coverage

*Upload/Preview/Publish will not work without the DA context.*

### Option B: Author on da.live with local environment (recommended)

Test LPB through the DA author app on `da.live`, used for full LPB testing with DA Context.

- **LPB_REF=local** opens da.live with `?ref=local`, pointing DA to your local `aem up` page.

Recommended scope:
- form and field tests
- smoke coverage
- E2E tests

```bash
LPB_REF=local npm run nala local @lpb-non-e2e
LPB_REF=local npm run nala local "@lpb-non-e2e @smoke"
LPB_REF=local npm run nala local @lpb-e2e
```

## Stable Slugs

Only the E2E scenarios use stable reusable slugs:

- `nala-auto-guide-gated-us`
- `nala-auto-report-ungated-us`
- `nala-auto-video-demo-ungated-us`
- `nala-auto-infographic-ungated-jp`

These are defined in [landing-page-builder-e2e.spec.js](/Users/xiasun/Documents/Workspace/da-bacom/nala/tools/landing-page-builder/landing-page-builder-e2e.spec.js).

## Cleanup Script

The cleanup script is for E2E and maintenance use only.

Use it when:

- old generated LPB pages need to be removed
- a failed E2E run left authored pages or assets behind
- you want to inspect what old `nala-auto-*` content still exists

The script scans generated LPB content in supported regions and content-type folders and targets pages with prefixes such as:

- `nala-auto-`
- `nala-e2e-`
- `nala-uat-`
- `nala-lpb-`

Dry run first:

```bash
node nala/tools/landing-page-builder/cleanup-generated-pages.js
```

That only prints what would be deleted.

Delete for real:

```bash
node nala/tools/landing-page-builder/cleanup-generated-pages.js --execute
```

Recommended workflow:

1. Run the dry run.
2. Review the listed pages and assets.
3. Run again with `--execute` if the list looks correct.

This script is not required for normal non-E2E LPB test runs.
