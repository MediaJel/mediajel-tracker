# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Today:** MediaJel integration engineers. They open DevTools on a client's live site (or in the `apps/integrations` training sandbox), run `window.enableTrackerWidget()`, and work through one integration at a time — usually while a client is waiting for tracking to be confirmed.
- **Roadmap (confirmed 2026-08-21):** clients themselves — site owners or their developers — so the assistant must already read as a client-facing MediaJel product: plain language, explicit consent for anything that leaves the browser, no internal jargon in primary copy, and key/provider handling behind an interface that a MediaJel-hosted backend can replace.

## Product Purpose

The MediaJel universal tag (`apps/tracker`, served from tags.cnna.io) measures e-commerce transactions and sign-ups for advertisers. Sites the 42 built-in platform adapters don't cover need a hand-written "frictionless custom tag" (a `.ts` file in `MediaJel/mediajel-frictionless-custom-tag`) that finds the site's purchase or sign-up signal and calls `window.trackTrans` / `window.trackSignUp`. The Integrations Assistant turns that hours-long, error-prone craft into a guided session: record the real page while the user simulates the event, mark the event, let a model write the tag in house conventions with an honest field-coverage report, verify it on the page with nothing sent to the collector, then deploy it. Success = a verified, deployed tag in one sitting, and no broken file ever reaching the frictionless repo.

## Positioning

It writes code against the *actual* page — the recorded network, dataLayer, forms and DOM of the visitor's own session — not against a screenshot or a description, and it proves the code on that page before anything ships. No neighboring tag manager or generic AI coding tool runs inside the client's page with the tracker's runtime API, conventions, and deploy pipeline in hand.

## Operating Context

- Runs inside third-party pages of every kind (Shopify, WooCommerce, dispensary menus in iframes, custom checkouts) under the page's own CSS, CSP and scripts; light and dark pages; SPA and multi-page checkouts that navigate between cart and thank-you.
- Enabled only from the console (or a prefill call); it must never appear for a visitor who did not enable it in that tab.
- A session spans full page loads; it persists in the tab and resumes itself.
- The collector (Snowplow) must not receive test events during verification; the tracker's own dedup (`localStorage` `${appId}_*`) silently drops repeated test fires.
- Deploy target is `master` of the frictionless repo, which goes live through its GitHub Action within minutes — and a syntax error there freezes every future tag deploy.
- Keys (model provider, GitHub PAT) are the engineer's own, entered in the widget, kept per tab by default.

## Capabilities and Constraints

- Flows: Track Transactions, Track Sign Ups (exactly these two).
- Steps: Home → Record (timeline of fetch/XHR/beacon, dataLayer, forms, clicks, navigation, DOM changes, storage, postMessage, platform snapshot) → Review & mark → Generate (structured output: code + field coverage + warnings + suggested target) → Verify on page (trackTrans/trackSignUp intercepted) → Deploy (domain folder or app-id folder) → Done (commit + CDN URL).
- Runtime API the generated code targets: `window.trackTrans(TransactionEvent)`, `window.trackSignUp(SignupParams)`; conventions of the frictionless repo (allowlisted helper imports, `isTrackTransLoaded`, dedup before await, `"N/A"`/`"USD"` defaults, valid-JS syntax).
- Technical constraints: lazy Parcel chunk compiled with the tag's `since 2017-06` browserslist and `--no-scope-hoist`; all UI inside a Shadow DOM host; styles via adopted stylesheets; no webfonts (client CSP); the always-loaded tag gains < 1 KB.
- Privacy: the widget works when GPC/DNT has stopped the tracker and says so; PII is masked before anything reaches a model; every outbound payload is previewable first.
- Undecided product facts: when clients get access, how deploys are gated (review/approval) and who holds provider keys — record, do not invent.

## Brand Commitments

- The MediaJel brand system in `docs/tracker-overview/` is binding: identity blue `#1F4FE0`, platform green `#0B8F6B`, partner orange `#DB4A15`, privacy purple `#6C34E8`, paper `#E6E9EB`, card `#FFFFFF`, ink `#14161A` / `#565C66` / `#8A9199`, rule `#C7CDD3`; dark-mode variants `#7FA0FF`, `#4FD6AC`, `#FF9666`, `#C0A6FF`. Display: Futura / Futura PT / Century Gothic / Avenir Next; body: Avenir Next / Avenir; mono: SF Mono — system stacks only on client pages.
- The MJ mark (`apps/tracker/public/logo.png`, `docs/tracker-overview/logo-mark.png`) and its peak-and-valley **zigzag** motif (`docs/tracker-overview/pptx_kit.py` `zigzag()`) are the recognizable traits to carry.
- Voice: precise, calm, plain; it states what it did and what it will send; it never hypes.

## Evidence on Hand

- Real conventions and templates: `mediajel-frictionless-custom-tag/src/domains/*.ts` (seaweedrbny.com, www.choicehospice.org, www.prolificcannabis.com), `src/types.ts`; deploy bot conventions in `frictionless-tags-factory/src`.
- Real tracker API and types: `packages/tracker-core/src/{types.ts,interface.ts}`; adapters in `packages/tracker-environments`.
- A working training store with checkout/sign-up endpoints: `apps/integrations` (server.ts echo routes, exercises).
- No testimonials, benchmarks, or usage metrics exist — do not fabricate any.

## Product Principles

1. **Evidence before code.** Everything the model writes traces to a marked event the engineer chose; coverage is reported field by field, defaults are labeled as defaults.
2. **Prove it on the page.** Nothing deploys that has not fired (intercepted) on the real page.
3. **Show what leaves.** Any byte leaving the browser is previewable first, masked, and sent only on an explicit action.
4. **Guest in someone else's house.** No layout shift, no covering their checkout, no styles leaking, no weight until enabled, never visible to their visitors.
5. **Client-ready by default.** Copy and flow must make sense to a site owner, not only to an engineer.

## Accessibility & Inclusion

Keyboard reachable with visible focus throughout; respects `prefers-reduced-motion`; legible over both light and dark host pages; no color-only status (every state carries a label or icon).
