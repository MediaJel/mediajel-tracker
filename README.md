<h1 align="center"><strong>Mediajel universal tracker</strong></h1>

<div align="center"><img src="https://github.com/MediaJel/mediajel-tracker/raw/staging/public/logo.png"width="200" height="200" /></div>

<p align="center">
  A <a href="https://bun.sh">Bun</a> + <a href="https://turbo.build/repo">Turborepo</a> monorepo
  housing the MediaJel universal tracking <strong>tag</strong> and an interactive
  <strong>training site</strong> that grades real events against a local Snowplow Micro pipeline.
</p>

---

## Table of contents

- [Overview](#overview)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
  - [Expected logs](#expected-logs)
  - [Ports & URLs](#ports--urls)
  - [Scripts](#scripts)
- [Tag parameters](#tag-parameters)
  - [Core](#core)
  - [E-commerce](#e-commerce)
  - [Plugins](#plugins)
  - [Impressions / DSP macros](#impressions--dsp-macros)
  - [Audience segments](#audience-segments)
  - [Control & debugging](#control--debugging)
  - [`window.overrides`](#windowoverrides)
  - [Examples](#examples)
- [Runtime `window.*` API](#runtime-window-api)
- [Privacy & compliance](#privacy--compliance)
  - [Standards & signals honored](#standards--signals-honored)
  - [Layer 1 — edge opt-out gate (this tag)](#layer-1--edge-opt-out-gate-this-tag)
  - [Data posture (when not opted out)](#data-posture-when-not-opted-out)
  - [Layer 2 — server-side opt-out (reactive removal)](#layer-2--server-side-opt-out-reactive-removal)
  - [Hardening backlog](#hardening-backlog)
- [Deployment](#deployment)
- [Tech stack](#tech-stack)

## Overview

The **tag** (`apps/tracker`) is a small, plug-and-play script you drop onto a site. Out of the box
it collects page views and e-commerce events (and impressions for DSPs) and ships them to a Snowplow
collector. It is configured entirely through **query-string parameters on the script URL** and can
be extended at runtime via a small `window.*` API.

The **training site** (`apps/integrations`) is an interactive, hands-on app that teaches the tag's
event model. Lessons and exercises run the locally-built tag inside a sandboxed iframe and grade
the resulting events against a **Snowplow Micro** instance running in Docker — all on one origin so
there is no CORS to fight.

Shared logic (the Snowplow tracker core, the 40+ platform integrations, the Iglu schemas, and the
lint/TS configs) lives in `packages/*`.

## Project structure

```text
mediajel-tracker/
├── apps/
│   ├── tracker/                  # The universal tracking tag (deployed to tags.cnna.io)
│   │   ├── src/
│   │   │   ├── index.ts          #   Tag entry: privacy gate → context → tracker → adapters
│   │   │   ├── adapters/         #   ecommerce / impressions adapters + window.* API wiring
│   │   │   └── scripts/          #   generate-environments codegen
│   │   ├── server/               #   Tiny Express dev server for the built tag (:3000)
│   │   ├── public/               #   index.test.html test harness page
│   │   ├── cypress/              #   E2E tests
│   │   ├── deploy/               #   pre/post-deploy hooks (AWS S3 / CloudFront)
│   │   └── dist/                 #   Parcel build output (generated, gitignored)
│   │
│   └── integrations/             # Interactive training site (React + Bun server)
│       ├── src/                  #   App.tsx, lessons.tsx, exercises.tsx, components, theme
│       ├── public/               #   index.html template
│       ├── server.ts             #   Bun dev server + same-origin Micro/tag proxy (:4321)
│       └── dist/                 #   Parcel build output (generated, gitignored)
│
├── packages/
│   ├── tracker-core/             # Core Snowplow tracking, segment builder, context, logger, utils
│   ├── tracker-environments/     # 40+ per-platform data sources (jane, shopify, dutchie, …)
│   ├── iglu-schemas/             # Vendored com.mediajel.* Iglu schemas (offline fallback)
│   ├── eslint-config/            # Shared ESLint config
│   └── tsconfig/                 # Shared TypeScript configs (base.json, react.json)
│
├── scripts/dev.ts                # `bun run dev` orchestrator (schemas → Micro → tag → site)
├── infra/micro/                  # Snowplow Micro config + Iglu resolver
├── docker-compose.yml            # Snowplow Micro service
├── turbo.json                    # Turborepo task pipeline
├── bunfig.toml                   # Bun config (hoisted linker — required by Parcel)
└── package.json                  # Workspaces + root scripts (Bun 1.3.8)
```

| Workspace | Package name | What it is |
|---|---|---|
| `apps/tracker` | `mediajel-tracker` | The deployable universal tag (Parcel-bundled). |
| `apps/integrations` | `@mediajel/integrations` | Interactive training site that grades against Snowplow Micro. |
| `packages/tracker-core` | `@mediajel/tracker-core` | Snowplow tracker, segment builder, context parsing, logger, utils. |
| `packages/tracker-environments` | `@mediajel/tracker-environments` | Per-platform e-commerce data sources (40+ integrations). |
| `packages/iglu-schemas` | `@mediajel/iglu-schemas` | Vendored Iglu JSON schemas; offline fallback for Micro. |
| `packages/eslint-config` | `@mediajel/eslint-config` | Shared ESLint rules. |
| `packages/tsconfig` | `@mediajel/tsconfig` | Shared TypeScript configs. |

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| [Bun](https://bun.sh) | **1.3.8** | Package manager, workspace tool, and runtime for the dev servers. |
| [Node.js](https://nodejs.org) | LTS | Parcel's CLI uses a Node internal Bun lacks; builds are wrapped via `scripts/run-parcel.mjs`. |
| [Docker](https://www.docker.com) | recent | Runs **Snowplow Micro** (the local event collector + validator). |

> **Note:** `bunfig.toml` pins the **hoisted** node-modules linker. Bun's default isolated linker
> breaks Parcel's plugin resolution, so do not change it.

An optional root `.env` (collector URLs and AWS deploy credentials) is needed only for deploying the
tag to staging/prod — ask the team for it. Local development does **not** require it.

## Getting started

```bash
bun install
bun run dev
```

`bun run dev` runs the orchestrator in [`scripts/dev.ts`](scripts/dev.ts), which brings up the whole
stack in order:

1. **Sync Iglu schemas** — best-effort; keeps the vendored mirrors if there's no registry access.
2. **Start Snowplow Micro** via Docker Compose.
3. **Wait for Micro** to report healthy on `:9090`.
4. **Build the tag** (`apps/tracker`) so the site can serve it at `/tag`.
5. **Launch the training site** (Parcel watch + Bun dev server with the Micro proxy).

When you `Ctrl-C`, the site stops but **Micro is left running** for fast restarts — stop it with
`bun run micro:down`.

### Expected logs

A healthy `bun run dev` prints:

```text
▸ Syncing Iglu schemas (best-effort)…
▸ Starting Snowplow Micro (docker compose)…
▸ Waiting for Micro on :9090 …
✓ Micro ready
▸ Building the tag (apps/tracker) for /tag …
✨ Built in 641ms                      # Parcel build summary + chunk list
▸ Launching the training site …

  ▸ Integrations training site →  http://localhost:4321
  ▸ Snowplow Micro proxied at  →  http://localhost:9090
```

Then open **http://localhost:4321**.

Common failure lines and what they mean:

```text
✗ docker compose up failed — is Docker running? (start Docker Desktop and retry)
✗ Micro did not become healthy. Check `bun run micro:logs`.
✗ tag build failed
(Micro left running — `bun run micro:down` to stop it.)   # printed on Ctrl-C
```

### Ports & URLs

| Service | URL | Started by |
|---|---|---|
| Integrations training site | http://localhost:4321 | `bun run dev` / `dev:site` |
| Snowplow Micro (collector + REST API) | http://localhost:9090 | `bun run dev` / `micro:up` |
| Tracker tag (Parcel watch) | http://localhost:1235 | `apps/tracker` `dev` |
| Tracker dev server (serves `dist/`) | http://localhost:3000 | `apps/tracker` `dev` |
| Tracker test page | http://localhost:1234 | `apps/tracker` `dev` |

The integrations server keeps the app, the built tag, and Micro on **one origin**. It serves the
tag at `/tag/*`, proxies the collector + `/micro/*` to Micro, and exposes a few mock endpoints used
by lessons/exercises: `/mock/orders`, `/api/checkout`, `/api/signup`.

### Scripts

Root (`package.json`):

| Command | Description |
|---|---|
| `bun run dev` | Full stack: schemas → Micro → build tag → training site. |
| `bun run dev:site` | Training site only (`turbo run dev --filter=@mediajel/integrations`). |
| `bun run dev:raw` | `turbo run dev` across all workspaces (no orchestration). |
| `bun run build` | Build everything (`turbo run build`). |
| `bun run check` | Type-check everything (`tsc --noEmit` per workspace). |
| `bun run lint` | Lint everything. |
| `bun run test` | Run tests (`turbo run test`). |
| `bun run tracker:build` | Build the tag only. |
| `bun run tracker:generate-environments` | Regenerate per-platform environment code. |
| `bun run micro:up` / `micro:down` / `micro:logs` | Manage Snowplow Micro directly. |
| `bun run schemas:sync` | Refresh vendored Iglu schemas from the registry. |

To work on the **tag in isolation** (tag watch `:1235`, dev server `:3000`, test page `:1234`):

```bash
cd apps/tracker && bun run dev
```

## Tag parameters

The tag reads **all** of its configuration from the script URL's query string
([`get-context.ts`](packages/tracker-core/src/utils/get-context.ts)). The authoritative list of keys
is the `QueryStringParams` type in
[`packages/tracker-core/src/types.ts`](packages/tracker-core/src/types.ts).

```html
<script src="https://tags.cnna.io/?appId=APP_ID_HERE&environment=CART_PLATFORM&test=true"></script>
```

### Core

| Param | Required | Default | Description |
|---|---|---|---|
| `appId` | ✅ | — | Account/advertiser the events are attributed to. Loading the tag triggers a pageview. |
| `mediajelAppId` | — | — | Legacy alias for `appId`. |
| `environment` | — | `production` | Platform integration(s) to load. Comma-separate for multiple, e.g. `jane,training`. |
| `event` | — | — | `impression` \| `transaction` \| `signup`. Omit for pageview-only. |
| `test` | — | — | `test=true` routes events to the **staging** collector instead of production. |
| `version` | — | `1` | Snowplow tracker version (`1` or `2`). |

Supported `environment` values come from `packages/tracker-environments` and include `jane`,
`shopify`, `woocommerce`, `magento`, `lightspeed`, `square`, `bigcommerce`, `ecwid`, `wix`,
`dutchie` (`dutchie-iframe`, `dutchie-subdomain`, `dutchieplus`), `blaze`, `meadow`, `olla`,
`leafly`, `greenrush`, `grassdoor`, `tymber`, `sweed`, `webjoint`, `weave`, plus `training` /
`exercise` (used by the training site). See the package for the full list.

### E-commerce

| Param | Required | Default | Description |
|---|---|---|---|
| `retailId` | — | — | Retail location id. Must persist from the first visit through checkout. |

### Plugins

Enable one or more plugins with a comma-separated `plugin` list, e.g. `plugin=googleAds,bingAds`.

**Google Ads** (`plugin=googleAds`):

| Param | Required | Description |
|---|---|---|
| `conversionId` | ✅ | Google Ads conversion id, e.g. `AW-XXXXXXXXXX` (the `AW-` prefix is added if missing). |
| `conversionLabel` | ✅ | Conversion label from the Google Ads "Conversions" tab. |
| `crossDomainSites` | — | Comma-separated domains for cross-domain conversion tracking. |

**Bing Ads** (`plugin=bingAds`):

| Param | Required | Description |
|---|---|---|
| `tagId` | ✅ | Bing Ads UET tag id, e.g. `11111111`. |

### Impressions / DSP macros

Used when `event=impression` (the tag served to DSPs). All optional; fill the macros your DSP
supports: `advertiserId`, `advertiserName`, `insertionOrder`, `lineItemId`, `creativeId`,
`publisherId`, `publisherName`, `siteId`, `siteName`, `liquidmAppId`, `appName`, `clickId`,
`GAID` (+ `GAID_MD5`, `GAID_SHA1`), `IDFA` (+ `IDFA_MD5`, `IDFA_SHA1`), `DSPIDENTIFIER`,
`DEVICEID`, `MAXMIND_CON_TYPE_NAME`, `MAXMIND_GEO_IDS`, `MAXMIND_ISP_ID`.

### Audience segments

Fire third-party audience beacons alongside tracking:

| Param | Description |
|---|---|
| `s1` / `segmentId` | LiquidM segment id (pageview beacon). |
| `s2` | Nexxen beacon — **legacy** (prefer `s2.pv` / `s2.tr`). |
| `s2.pv` / `s2.tr` | Nexxen page-visitor / transaction beacons. |
| `s3.pv` / `s3.tr` | Dstillery site-visitor (NC) / purchase (NC) beacons. |

### Control & debugging

| Param | Default | Description |
|---|---|---|
| `logs` | `true` | Console logging. Set `logs=false` to silence the tag (opt-out: logging is on unless disabled). |
| `enable` | `true` | Set `enable=false` to short-circuit the tag — it loads but does nothing. |
| `debug` | — | `debug=true` (with logging on) enables verbose data-source logging for debugging. |
| `sdkUrl` | — | Advanced: override the Snowplow SDK URL. |

### `window.overrides`

Define `window.overrides` **before** the tag loads to override context values per `appId` (e.g. a
custom `collector` or `logs`). The collector itself defaults from the `MJ_PRODUCTION_COLLECTOR_URL`
/ `MJ_STAGING_COLLECTOR_URL` env vars baked at build time.

```html
<script>
  window.overrides = {
    "my-app-id": { collector: "//my-collector.example.com", logs: "false" },
  };
</script>
<script src="https://tags.cnna.io/?appId=my-app-id&environment=jane"></script>
```

### Examples

```html
<!-- Basic page-view tracking -->
<script src="https://tags.cnna.io/?appId=my-app-tag"></script>

<!-- E-commerce on a specific platform, against the staging collector -->
<script src="https://tags.cnna.io/?appId=greenleaf&environment=jane&test=true"></script>

<!-- Multiple environments -->
<script src="https://tags.cnna.io/?appId=greenleaf&environment=jane,training"></script>

<!-- Google + Bing Ads in one tag -->
<script src="https://tags.cnna.io/?appId=my-app&plugin=googleAds,bingAds&conversionId=AW-10963714894&conversionLabel=LABEL&tagId=187009645&environment=shopify"></script>

<!-- Impressions tag for a DSP -->
<script src="https://tags.cnna.io/?appId=LiquidM&event=impression&environment=liquidm&advertiserId=CUSTOMER_ID&insertionOrder=CAMPAIGN_ID&creativeId=AD_NAME&publisherId=PUBLISHER_ID&clickId=CLICK_ID&GAID=GAID"></script>

<!-- Disable the tag without removing it -->
<script src="https://tags.cnna.io/?appId=my-app&enable=false"></script>
```

## Runtime `window.*` API

Once loaded, the tag attaches helpers for firing events from your own code
([`adapters/index.ts`](apps/tracker/src/adapters/index.ts)):

| Function | Description |
|---|---|
| `window.trackTrans(transaction)` | Track an e-commerce transaction / purchase. |
| `window.trackSignUp(signup)` | Track a user sign-up. |
| `window.addToCart(item)` | Track an add-to-cart. |
| `window.removeFromCart(item)` | Track a remove-from-cart. |
| `window.tracker(command, ...args)` | Raw Snowplow API, e.g. `window.tracker("trackStructEvent", {...})`. |
| `window.mjApplyExtension(fn)` | Register a custom extension that wraps/intercepts tracker methods. |
| `window.parseRetailId(config)` | Detect and apply a retail id based on DOM elements present on the page. |

Payload shapes ([`types.ts`](packages/tracker-core/src/types.ts)):

```ts
// window.trackTrans
type TransactionEvent = {
  id: string; total: number; tax: number; shipping: number;
  city: string; state: string; country: string; currency: string;
  affiliateId?: string; userId?: string; discount?: number; couponCode?: string;
  alternativeTransactionIds?: string[];
  items: { sku: string; name: string; category: string; unitPrice: number; quantity: number; currency: string; orderId: string }[];
};

// window.addToCart / window.removeFromCart
type CartEvent = { sku: string; name: string; category: string; unitPrice: number; quantity: number; currency: string; userId?: string };

// window.trackSignUp
type SignupParams = { uuid: string; firstName?: string; lastName?: string; gender?: string; emailAddress?: string; hashedEmailAddress?: string; address?: string; city?: string; state?: string; phoneNumber?: string; advertiser?: string };
```

## Privacy & compliance

The tag is **opt-out-first**: it reads the visitor's browser privacy signals and, if they have opted
out, does nothing at all. This section documents the mechanisms we implement and the regulations they
are designed to support.

> **Not legal advice.** These mechanisms *support* compliance; whether a given deployment is compliant
> also depends on how the embedding site is configured, what data it passes to the tag, and the
> contracts governing downstream use.

### Standards & signals honored

| Signal | Read from | Recognized by |
|---|---|---|
| **Global Privacy Control (GPC)** | `navigator.globalPrivacyControl === true` | The primary, legally-recognized opt-out signal under **California CCPA/CPRA**, the **Colorado Privacy Act (CPA)**, and the **Connecticut Data Privacy Act (CTDPA)**, and honored under other US state laws that recognize a universal opt-out mechanism (e.g. Texas TDPSA, Oregon OCPA, Montana MCDPA). |
| **Do Not Track (DNT)** | `navigator.doNotTrack` / `navigator.msDoNotTrack` / `window.doNotTrack` = `"1"` or `"yes"` | Legacy [W3C DNT](https://www.w3.org/TR/tracking-dnt/), honored as a courtesy fallback. |

GPC is the [Global Privacy Control](https://globalprivacycontrol.org/) spec. The tag reads these
signals **directly from the browser** — no consent banner, cookie, or per-site integration required —
and they are **not** overridable by query-string params.

### Layer 1 — edge opt-out gate (this tag)

`isUsPrivacyOptOut()` ([`privacy-opt-out.ts`](packages/tracker-core/src/utils/privacy-opt-out.ts))
runs at the very top of [`apps/tracker/src/index.ts`](apps/tracker/src/index.ts), right after the
script URL is parsed and **before any network or storage**. If any opt-out signal is present the tag
**hard-exits** — a true no-track:

- ❌ no Snowplow events (pageview, e-commerce, sign-up, impression)
- ❌ no cookies, `localStorage`, or `sessionStorage`
- ❌ no third-party audience beacons
- ❌ no custom-tag or app-ID tag loads

All four signals are covered by E2E tests in
[`privacy-opt-out.spec.cy.ts`](apps/tracker/cypress/e2e/privacy-opt-out.spec.cy.ts), which assert
zero collector requests **and** zero Snowplow cookies/`localStorage` on opt-out.

### Data posture (when **not** opted out)

The Snowplow tracker is created with a privacy-conscious configuration
([`snowplow/v1/init.ts`](packages/tracker-core/src/snowplow/v1/init.ts) /
[`v2/init.ts`](packages/tracker-core/src/snowplow/v2/init.ts)):

| Setting | Value | Why |
|---|---|---|
| `stateStorageStrategy` | `cookieAndLocalStorage` | First-party identity only; no third-party cookies. |
| `cookieSameSite` | `Lax` | Cookies are not sent on cross-site subrequests. |
| `cookieSecure` | `true` | Cookies only travel over HTTPS. |
| `respectDoNotTrack` | `true` | SDK-level DNT respect, as defense-in-depth behind the edge gate. |
| `eventMethod` | `post` | Events are POSTed to a first-party collector path (`/analytics/track`). |

**Storage used:** the Snowplow session/identity (first-party cookie + `localStorage`), a
de-duplication list in `localStorage` (keys `${appId}_<event>`), and a retail-id marker in
`sessionStorage`.

**Data categories:** page views (with Snowplow's standard browser context — user agent, screen,
referrer, locale), e-commerce transactions and cart items, optional sign-up identifiers, and — for
impression tags — DSP macros (advertiser/creative ids and mobile ad ids such as GAID/IDFA). The tag
collects only what the embedding site passes to it plus Snowplow's standard context.

**Form tracking:** form interactions are captured with **PII/sensitive fields excluded** — fields
whose `name`, `id`, or input `type` matches email, password, phone, payment, SSN, or similar are
filtered out and never recorded
([`form-pii-filter.ts`](packages/tracker-core/src/snowplow/form-pii-filter.ts)).

**Third-party audience beacons:** when audience segment ids are supplied (`s1` / `s2*` / `s3*`), the
tag also fires partner pixels — LiquidM, Nexxen, Dstillery
([`segment-builder`](packages/tracker-core/src/segment-builder)). The LiquidM beacon forwards
`gdpr` / `gdpr_consent` parameters. This is a US-opt-out model; the tag does **not** itself implement
GDPR consent management.

### Layer 2 — server-side opt-out (reactive removal)

Formal opt-out / deletion requests are honored downstream by the sibling **`mediajel-gql-service`**
(separate repository): a suppression-list ETL removes opted-out subjects from the analytics store.
Layer 1 (this tag) stops *new* collection at the edge; Layer 2 handles *removal* of already-collected
data. See [`privacy-compliance-deck.html`](privacy-compliance-deck.html) for the full briefing on both
layers.

### Hardening backlog

Tracked follow-ups (not yet implemented):

- **E-mail minimization** — prefer `hashedEmailAddress` over plaintext `emailAddress` in sign-up and
  transaction `userId`, so raw PII never reaches the collector.

## Deployment

The tag builds with Parcel to `apps/tracker/dist/` and is published to S3 / CloudFront via the
`predeploy` / `postdeploy` hooks (which read the root `.env`). It is served at `tags.cnna.io`
(production) and a staging host configured via `.env`. CI/CD lives in `.circleci/` and `.github/`.

```bash
cd apps/tracker && bun run deploy   # requires .env
```

## Tech stack

[Bun](https://bun.sh) · [Turborepo](https://turbo.build/repo) · [Parcel](https://parceljs.org) ·
[React 18](https://react.dev) (training site) · [Snowplow](https://snowplow.io) +
[Snowplow Micro](https://docs.snowplow.io/docs/testing-debugging/snowplow-micro/) ·
[Docker](https://www.docker.com) · TypeScript · ESLint.
