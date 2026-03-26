# Progressive Profiling Nala Tests

This suite lives in:

- [progressive-profiling.spec.js](/Users/xiasun/Documents/Workspace/da-bacom/nala/blocks/progressive-profiling/progressive-profiling.spec.js)
- [progressive-profiling.test.js](/Users/xiasun/Documents/Workspace/da-bacom/nala/blocks/progressive-profiling/progressive-profiling.test.js)
- [progressive-profiling.page.js](/Users/xiasun/Documents/Workspace/da-bacom/nala/blocks/progressive-profiling/progressive-profiling.page.js)

## What the suite covers

- `@staged`: staged PP test pages across locales
- `@ongoing`: live ongoing PP pages
- `@out-of-scope`: pages that should not show PP behavior
- `@journey`: manual email-link flows
- `@pp`: umbrella tag for the entire PP suite

## Environment variables

- `LOCAL_TEST_LIVE_URL`
  - Standard Nala base URL for the repo under test
  - Example for stage preview validation:
    - `https://stage--da-bacom--adobecom.aem.live`
- `PP_BUSINESS_ORIGIN`
  - Business site origin used by the PP URLs in the spec
  - Defaults to `https://business.stage.adobe.com`
  - Set this to prod when you want to run the business URLs on production
- `PP_REVISIT_DELAY_MS`
  - Optional override for the known-visitor wait time before revisit validation
  - Default is `60000`

## Run on stage

Run the whole PP suite on Chromium:

```bash
env LOCAL_TEST_LIVE_URL=https://stage--da-bacom--adobecom.aem.live \
PP_BUSINESS_ORIGIN=https://business.stage.adobe.com \
npx playwright test nala/blocks/progressive-profiling/progressive-profiling.test.js \
--project=da-bacom-live-chromium --grep @pp
```

Run only the ongoing pages on Safari desktop:

```bash
env LOCAL_TEST_LIVE_URL=https://stage--da-bacom--adobecom.aem.live \
PP_BUSINESS_ORIGIN=https://business.stage.adobe.com \
npx playwright test nala/blocks/progressive-profiling/progressive-profiling.test.js \
--project=da-bacom-live-webkit --grep @ongoing
```

Run only the out-of-scope pages on Firefox:

```bash
env LOCAL_TEST_LIVE_URL=https://stage--da-bacom--adobecom.aem.live \
PP_BUSINESS_ORIGIN=https://business.stage.adobe.com \
npx playwright test nala/blocks/progressive-profiling/progressive-profiling.test.js \
--project=da-bacom-live-firefox --grep @out-of-scope
```

## Run on prod

To point the business URLs at prod, change only `PP_BUSINESS_ORIGIN`:

```bash
env LOCAL_TEST_LIVE_URL=https://www.adobe.com \
PP_BUSINESS_ORIGIN=https://business.adobe.com \
npx playwright test nala/blocks/progressive-profiling/progressive-profiling.test.js \
--project=da-bacom-live-chromium --grep @ongoing
```

Example for prod out-of-scope validation:

```bash
env LOCAL_TEST_LIVE_URL=https://www.adobe.com \
PP_BUSINESS_ORIGIN=https://business.adobe.com \
npx playwright test nala/blocks/progressive-profiling/progressive-profiling.test.js \
--project=da-bacom-live-webkit --grep @out-of-scope
```

## Recommended targeted runs

Run only the PP suite:

```bash
npx playwright test nala/blocks/progressive-profiling/progressive-profiling.test.js --grep @pp
```

Run only one test:

```bash
npx playwright test nala/blocks/progressive-profiling/progressive-profiling.test.js \
--grep @PP-Ongoing-US-RequestConsultation
```

Run only multistep out-of-scope pages:

```bash
npx playwright test nala/blocks/progressive-profiling/progressive-profiling.test.js \
--grep "@out-of-scope|@multi-step"
```

## PR behavior

PP tests are tagged with `@pp`.

Default PR Nala runs exclude `@pp` through:

- [pr.run.sh](/Users/xiasun/Documents/Workspace/da-bacom/nala/utils/pr.run.sh)

That means:

- PP tests do not run in default PR Nala execution
- PP tests can still be run manually on purpose with `--grep @pp`

## Notes

- `@journey` tests are manual and also tagged `@nopr`, so they are not part of default PR automation
- If you want faster revisit checks during local debugging, set `PP_REVISIT_DELAY_MS` to a smaller value
