# @mediajel/tracker-widget — the Integrations Assistant

A floating "integration work order" that lives inside the universal tag as a lazy chunk.
An operator enables it on a client's page, records the page while simulating a transaction
or sign-up, pins the event that *is* the signal, has a model write the frictionless custom
tag in house conventions, **verifies it on the same page with the tracker intercepted**, and
deploys it to `master` of `MediaJel/mediajel-frictionless-custom-tag` — where it goes live
through that repo's CI.

## Enable

On any page running the tag (or the integrations sandbox):

```js
await window.enableTrackerWidget();          // opens the work order, bottom right
await window.enableTrackerWidget({ open: false, provider: "gateway", model: "anthropic/claude-sonnet-5" }); // optional prefill
await window.disableTrackerWidget();         // exits and clears the session
await window.disableTrackerWidget({ forget: true }); // … and drops stored keys
```

The widget auto-resumes after navigations while a session is active in the tab
(`sessionStorage["mj-widget:active"]`). It is never visible to a visitor who did not enable
it in that tab.

## Settings (the gear)

- **Provider + model + API key** — generation runs browser-direct through the Vercel AI SDK
  (`gateway` | `anthropic` | `openai` | `google`). Keys stay in this tab (sessionStorage)
  unless "Remember on this device" is ticked, which moves them to localStorage — readable by
  any script on that site, and the UI says so. Prefer a Gateway key with a spend limit.
- **GitHub token** — a fine-grained PAT with **Contents: Read & write** on
  `MediaJel/mediajel-frictionless-custom-tag` only. Deploy commits carry the
  frictionless-tags-factory bot identity with "Created by: you (email)" in the body.
- **Clear tracker dedup state** — removes `localStorage["<appId>_*"]` so repeated test
  orders fire again (the tag's dedup extension silently swallows them otherwise).

## What leaves the browser, and when

1. Nothing, until **Generate** — which sends the pinned events (in full), the rest of the
   timeline (compressed one-liners), and the page/tag context to the chosen provider. PII is
   masked at capture (emails, phones, cards, sensitive form fields — a superset of the
   tracker's own form-PII filter); the Evidence screen states exactly what will be sent.
2. Nothing again, until **Deploy** — which sends the tag file to GitHub with your token.

Verify runs the generated code **on the page** with `window.trackTrans`/`trackSignUp`
intercepted: captures are displayed, nothing reaches the collector, and the tag's dedup keys
are never written. The interception stays for the rest of the page's lifetime (the generated
code attached real listeners); reload the page to restore live tracking.

## Deploy semantics

- **Domain file** `src/domains/<hostname>.ts` — runs on this exact hostname for every
  MediaJel tag on it. **App-ID file** `src/app-ids/<appId>.ts` — runs wherever that
  advertiser's tag is installed. Names are byte-exact (the tag fetches
  `${FRICTIONLESS_CUSTOMTAG_URL}/<domains|app-ids>/<base64(name)>.js`).
- The repo is checked first; an existing file becomes an explicit **Update** (with the sha
  and a preview of what is being replaced).
- **The commit goes straight to `master` and is live after that repo's GitHub Action — no
  review in between.** The generated file is machine-checked before every deploy (allowlisted
  imports only, `trackTrans`/`trackSignUp` only, dedup guard required, no `window.overrides`
  in app-id files, and a `new Function` parse gate — a syntax error in that repo freezes all
  future tag deploys).

## Architecture notes

- Third-party code (`ai`, providers, `preact`, `zod`) enters ONLY through
  `vendor/entry.ts`, pre-bundled by `bun build` into `dist/vendor.js` (see the `//vendor`
  note in package.json for the two Parcel failures that make this necessary). The package's
  `build` script runs before the tag build via turbo.
- The always-loaded tag carries only a ~1 KB stub (`apps/tracker/src/widget-stub.ts`); the
  widget is one lazy Parcel chunk (`widget.<hash>.js`, ~1 MB min / ~250 KB gz — an
  on-demand internal tool).
- The recorder observes and calls through (fetch/XHR/beacon, dataLayer, forms, clicks,
  routes, confirmation DOM text, storage, postMessage, platform snapshot); its own traffic
  and the provider/GitHub calls ride the pristine `fetch` captured at chunk load and are
  never recorded.
- Works when GPC/DNT stopped the tracker (and says so): recording, generation and verify do
  not need the tracker; the deployed tag will honor the privacy gate like everything else.

## Local dev build

`COLLECTOR_URL` (and `FRICTIONLESS_CUSTOMTAG_URL`) are build-time env vars Parcel inlines into
the tag; CI supplies them from CircleCI contexts, and Parcel's `.env` loading is unreliable in
this monorepo (its project root moves — see `apps/tracker/package.json`). For a local build
that talks to a real collector, export them:

```sh
COLLECTOR_URL=//collector.dmp.cnna.io bun x turbo run build --filter=mediajel-tracker --force
```

Without `COLLECTOR_URL` the tag posts to `http://analytics/track` and the console fills with
`ERR_NAME_NOT_RESOLVED` — harmless for the widget (it never needs the collector) but noisy.

## Tests

```sh
cd packages/tracker-widget && bun run test          # 177 unit tests (bun test + happy-dom)
cd apps/tracker && npx cypress run \
  --spec cypress/e2e/widget-spike.spec.cy.ts,cypress/e2e/widget-recording.spec.cy.ts
```

The Cypress specs drive the whole journey in a real browser with the model mocked
(`window.__MJ_WIDGET_MOCK_MODEL__ = { json: … }` rides the real `generateText` path) and
GitHub intercepted. They expect the tag's `dist/` served on :3000 (or :3010 with a rewritten
harness — see the specs) and a store page on :1234.
