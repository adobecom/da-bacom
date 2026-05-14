# Primary Product Name Dropdown Tests

This folder contains the Playwright coverage for the Primary Product Name dropdown in the DA metadata builder.

## Key Model

This suite behaves more like a DA authoring tool flow than a published-page Nala test:

- It opens `da.live/edit`
- It depends on an authenticated DA session
- It validates metadata builder behavior inside the author UI

The edit URL is built from:

- `https://da.live/edit?ref=md-form-block#/adobecom/da-bacom`

with draft paths from [ppn-dropdown.spec.js](/Users/xiasun/Documents/Workspace/da-bacom/nala/blocks/ppn-dropdown/ppn-dropdown.spec.js).

## First-Time Setup

Log into DA first so Playwright can reuse the saved session:

```bash
npm run nala:login
```

This saves your session to:

- [auth.json](/Users/xiasun/Documents/Workspace/da-bacom/nala/utils/auth.json)

If the saved session expires, run `npm run nala:login` again.

## What the Suite Covers

- Functional dropdown behavior
- Regression checks for previously reported issues
- DA UI integration
- Edge cases around multiple property-value rows and removal

The suite is tagged with:

- `@ppn-dropdown`
- `@functional`
- `@bug-regression`
- `@non-functional`
- `@edge-case`

## Common Commands

Run the full PPN dropdown suite through Nala:

```bash
npm run nala local @ppn-dropdown
```

Run only the smoke subset:

```bash
npm run nala local "@ppn-dropdown @smoke"
```

Run one specific test case by tag:

```bash
npm run nala local @tc1
```

Run the suite directly with Playwright on Chromium:

```bash
npx playwright test nala/blocks/ppn-dropdown/ppn-dropdown.test.js --project=da-bacom-live-chromium
```

Run in headed mode for debugging:

```bash
npm run nala local @ppn-dropdown mode=headed
```

Run one test in Playwright UI mode:

```bash
npx playwright test nala/blocks/ppn-dropdown/ppn-dropdown.test.js \
--project=da-bacom-live-chromium --grep @tc1 --ui
```

## Recommended Workflow

1. Run `npm run nala:login`
2. Confirm `nala/utils/auth.json` was created or refreshed
3. Run the desired PPN command
4. If DA redirects you back to login during a run, refresh auth and rerun

## Notes

- These tests are intended for intentional manual execution, not casual PR coverage
- Because they depend on DA authentication, they are best run in headed mode when debugging author-side behavior
