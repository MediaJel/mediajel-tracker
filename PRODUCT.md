# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Today:** MediaJel integration engineers. They install the Chrome extension (`apps/extension`), sign in once with their MediaJel account, and open the side panel on a client's live site (or in the `apps/integrations` training sandbox) — usually while a client is waiting for tracking to be confirmed.
- **Roadmap (confirmed 2026-08-21):** clients themselves — site owners or their developers — so the assistant must already read as a client-facing MediaJel product: plain language, explicit consent for anything that leaves the browser, no internal jargon in primary copy, and key/provider handling behind an interface that a MediaJel-hosted backend can replace.

## Product Purpose

The MediaJel universal tag (`apps/tracker`, served from tags.cnna.io) measures e-commerce transactions and sign-ups for advertisers. Sites the 42 built-in platform adapters don't cover need a hand-written "frictionless custom tag" (a `.ts` file in `MediaJel/mediajel-frictionless-custom-tag`) that finds the site's purchase or sign-up signal and calls `window.trackTrans` / `window.trackSignUp`. The Integrations Assistant turns that hours-long, error-prone craft into a guided session: record the real page while the user simulates the event, mark the event, let a model write the tag in house conventions with an honest field-coverage report, verify it on the page with nothing sent to the collector, then deploy it. Success = a verified, deployed tag in one sitting, and no broken file ever reaching the frictionless repo.

## Positioning

It writes code against the *actual* page — the recorded network, dataLayer, forms and DOM of the visitor's own session — not against a screenshot or a description, and it proves the code on that page before anything ships. No neighboring tag manager or generic AI coding tool runs inside the client's page with the tracker's runtime API, conventions, and deploy pipeline in hand.

## Operating Context

- Observes third-party pages of every kind (Shopify, WooCommerce, dispensary menus in iframes, custom checkouts); SPA and multi-page checkouts that navigate between cart and thank-you. The interface lives in the browser's side panel, on MediaJel's own origin — the client's CSS and CSP no longer constrain it, but the recorder and Verify still run inside their page and always will.
- Installed only by MediaJel staff, and inert on every page until a job is started there; a client's visitor is never running it.
- A job spans full page loads and browser restarts: one per site, kept until deleted, resumable days later.
- The collector (Snowplow) must not receive test events during verification; the tracker's own dedup (`localStorage` `${appId}_*`) silently drops repeated test fires.
- Deploy target is `master` of the frictionless repo, which goes live through its GitHub Action within minutes — and a syntax error there freezes every future tag deploy.
- The model, its key and the deploy credential all live in MediaJel's assistant service (decided 2026-08-24). The engineer holds no credential at all: they sign in with the MediaJel account they already use for the dashboard (AWS Cognito, SRP — the password is never sent), and the service attributes the deploy commit to that verified identity.

## Capabilities and Constraints

- Flows: Track Transactions, Track Sign Ups (exactly these two).
- Steps: Home → Record (timeline of fetch/XHR/beacon, dataLayer, forms, clicks, navigation, DOM changes, storage, postMessage, platform snapshot) → Review & mark → Generate (structured output: code + field coverage + warnings + suggested target) → Verify on page (trackTrans/trackSignUp intercepted) → Deploy (domain folder or app-id folder) → Done (commit + CDN URL).
- Runtime API the generated code targets: `window.trackTrans(TransactionEvent)`, `window.trackSignUp(SignupParams)`; conventions of the frictionless repo (allowlisted helper imports, `isTrackTransLoaded`, dedup before await, `"N/A"`/`"USD"` defaults, valid-JS syntax).
- Technical constraints: a Chrome MV3 extension (Plasmo, React). The recorder and Verify must run in the page's own JavaScript realm — an isolated content script cannot see `window.fetch`, `dataLayer` or `trackTrans` — and must be installed at `document_start`, so the assistant is split across three realms with a message bridge between them. The always-loaded tag now gains nothing at all.
- Privacy: the widget works when GPC/DNT has stopped the tracker and says so; PII is masked before anything reaches a model; every outbound payload is previewable first.
- Undecided product facts: when clients get access and how deploys are gated (review/approval) — record, do not invent. Distribution is currently a CI-built zip loaded unpacked; there is no Chrome Web Store listing.

## Brand Commitments

- The MediaJel brand system in `docs/tracker-overview/` is binding for the four inks: identity blue `#1F4FE0`, platform green `#0B8F6B`, partner orange `#DB4A15`, privacy purple `#6C34E8`; dark-mode variants `#7FA0FF`, `#4FD6AC`, `#FF9666`, `#C0A6FF`. These are the recognizable part and are used unchanged.
- **Revised 2026-08-24, on the brief "more beautiful, less tech":** the extension's *neutrals* are warm stock rather than the recorded cool `#E6E9EB` / `#FFFFFF` / `#14161A` — screen paper was half of why the panel read as a console. And the display/body faces are now **self-hosted Jost and Mulish** (both SIL OFL) rather than the `Futura → Century Gothic` and `Avenir Next` stacks: Jost is a Futura revival and Mulish carries Avenir's proportions, so the pinned faces are actually delivered instead of falling through to whatever a given machine has. The tag itself never had this option and no longer needs it. See `apps/extension/DESIGN.md`.
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
4. **Guest in someone else's house.** What runs in a client's page observes and calls through; it never blocks, restyles, or costs their visitors anything. Nothing of ours runs there until an engineer starts a job on that site.
5. **Client-ready by default.** Copy and flow must make sense to a site owner, not only to an engineer.

## Accessibility & Inclusion

Keyboard reachable with visible focus throughout; respects `prefers-reduced-motion`; legible over both light and dark host pages; no color-only status (every state carries a label or icon).
