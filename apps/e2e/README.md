# @mediajel/e2e

Proof that a **built** tag delivers its signals to a **real** Snowplow pipeline.

Everything else in this repo tests source: types, lint, unit tests on the data sources. None of it
notices when the bundle ships with nowhere to post, when a schema version outruns the registry, or
when an adapter reads the wrong field and sends a transaction with the wrong total. This suite
drives a real Chromium against the real `apps/tracker/dist` and asserts on what Snowplow Micro
actually received.

## Run it

```sh
bun run micro:up                                           # from the repo root; Snowplow Micro on :9090
COLLECTOR_URL=http://localhost:4330 bun x turbo run build --filter=mediajel-tracker
bun x turbo run e2e --filter=@mediajel/e2e
bun run micro:down
```

`COLLECTOR_URL` matters: `tests/collector.spec.ts` reads what the build baked in rather than
overriding it at runtime, which is the only way to catch the class of bug that shipped a null
collector to staging ([`b8b29f56`](../../)).

To poke at a fixture by hand: `bun run rig/serve.ts`, then open
`http://localhost:4330/?appId=whatever&stimulus=woocommerce`.

## How it fits together

```
Chromium ──▶ localhost:4330 ─┬─▶ fixtures/page.html   the client's page
   (Playwright)              ├─▶ /tag/index.js        apps/tracker/dist, the real build
                             └─▶ /analytics/track ──▶ Snowplow Micro :9090 ──▶ Iglu
                                 /micro/*              (collector + enricher + validation)
```

One origin on purpose. The tag posts with `eventMethod: "post"` and reads cookies; a cross-origin
collector drags CORS preflights and SameSite into every assertion, and a failure there looks exactly
like a tag that never fired.

Micro is a real collector **and enricher**, so an event it files as good has passed Iglu validation.
"It arrived" and "it is well formed" are therefore one assertion, and a context that stops matching
its schema fails as loudly as a missing event.

## The specs

| | |
|---|---|
| `collector.spec.ts` | the configured collector is in the bundle, **and** a page with no overrides delivers to it |
| `core.spec.ts` | page view, sign-up, transaction with its items and context, add/remove from cart |
| `platforms.spec.ts` | one case per e-commerce platform, asserting the transaction it extracts |
| `privacy.spec.ts` | GPC and DNT send **nothing** — each paired with a positive control |
| `form-pii.spec.ts` | form tracking sends the harmless fields and never the sensitive ones |
| `schemas.spec.ts` | every Iglu schema the tag names resolves, before anything is sent |

## Adding a platform

Two things: a stimulus and a row.

1. `fixtures/stimuli/<name>.json` — what the site presents.
   - `globals` and `dataLayer` are put in place **before** the tag loads, which is where a thank-you
     page's printed order lives. The dataLayer source replays what is already there, so a
     gtag-style push belongs here too.
   - `after` is for sites that only produce the order once the page is live. `needs: "xhr"` or
     `"fetch"` makes the page wait for that capture to be installed — the environment module
     lazy-loads well after the tag's own load event — then fires the request the storefront would.
2. A row in `PLATFORMS` in `tests/platforms.spec.ts` with the order id, total and items you expect.

Then check it actually bites: break the data source, confirm the test fails, put it back.

## Assertions that are an absence

The privacy specs assert that nothing arrives. That is the easiest kind of test to pass by accident
— a stopped collector, a broken rig and a correctly silent tag are indistinguishable from outside.
So every one of them is paired with a positive control on the same build with only the signal
flipped. If the control stops arriving, the suite says so instead of quietly reporting that privacy
still works.

## Notes

- One worker, no retries. Every spec asserts against one shared Micro and resets it between tests,
  so parallel specs would read each other's events, and a retry would hide the timing bugs this
  suite exists to find.
- The Snowplow SDK (`sp.js` for v1, `cnna.js` for v2) is fetched from its CDN at runtime, because
  both tracker inits hardcode that URL — the documented `sdkUrl` parameter is destructured and only
  logged, never used (`packages/tracker-core/src/snowplow/v{1,2}/init.ts`). So this suite needs
  network egress to CloudFront and S3.
