# Sidekick & DA Library Config

There are two separate configuration systems here — they control different things.

## AEM Sidekick Plugins — Config Service

Sidekick plugins (e.g. Preflight, Rollout, Quick Edit) are managed via the **AEM config service**.

Edit via the admin editor:
`https://tools.aem.live/tools/admin-edit/index.html`

Admin URL:
`https://admin.hlx.page/config/adobecom/sites/da-bacom.json`

Event-based plugins fire `custom:<event>` on the sidekick element. The listener in `scripts/scripts.js` handles these at runtime.

## DA Library — `https://da.live/config#/adobecom/da-bacom/`

Controls the **DA library tools** — tools available inside the da.live editor (e.g. Tag Browser, Locale Nav). Edit the "library" sheet there.

### Testing with a ref

Set a `ref` in the DA config sheet to test against a specific branch before going live.

Example:

```
// da-bacom config sheet
ref: methomas-tag-browser

// Test page with ?ref=methomas-tag-browser
https://da.live/edit?ref=methomas-tag-browser#/adobecom/da-bacom/drafts/methomas/brand-concierge
```

The ref pulls code from `https://<ref>--da-bacom--adobecom.aem.live`, so it must match your branch name if you have corresponding code changes.
