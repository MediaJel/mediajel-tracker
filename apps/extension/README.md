# MediaJel Integrations Assistant (Chrome extension)

Record a client's purchase or sign-up on their real page, have MediaJel's assistant write the
frictionless custom tag for it, prove the tag on that page, and deploy it — from a side panel,
signed in with the MediaJel account you already have.

This replaces the in-page widget that used to ship inside the universal tag. The tag is just the
tracker again.

## What changed, and why it matters

| | In the tag | In the extension |
|---|---|---|
| Where it runs | injected into the client's page, under their CSP | our own origin, our own CSP |
| Getting in | `window.enableTrackerWidget()` in the console | sign in once, MediaJel account |
| Credentials | a GitHub PAT pasted into a third party's page | none — the service holds the deploy token |
| A job | died with the tab | one per site, resumable across days |
| Cost to visitors | ~1 KB on every page view of every client | nothing |

## How it fits together

```
page (MAIN world)          contents/page-bridge.ts   the recorder and Verify: window.fetch,
   │  window.postMessage                             XMLHttpRequest, dataLayer, trackTrans
   ▼
relay (ISOLATED)           contents/relay.ts         the hop that has chrome.* — carries, decides nothing
   │  chrome.runtime port
   ▼
background service worker  background/              jobs, the signed-in account, every call out
   │  port + sendMessage
   ▼
side panel                 sidepanel/, ui/          the work order
```

The split is forced, not stylistic. The recorder has to patch page-realm globals, which a content
script's isolated world cannot see; code in the main world has no `chrome.*` at all. So the page
half observes and posts, the background half holds everything, and a recording survives the
navigation from cart to thank-you that this product is entirely about.

`page-bridge.ts` is declared for every http(s) page and is **inert on all of them** — until a
`start-recording` arrives it wraps nothing, reads nothing and reports nothing. Plasmo registers it
through `chrome.scripting.registerContentScripts` from the service worker (main-world scripts are
filtered out of the manifest by design) and adds the `scripting` permission for us.

## Signing in

`amazon-cognito-identity-js` against the same user pool the MediaJel dashboard uses, over SRP —
the password proves itself to Cognito and is never sent anywhere, including to us. The pool has
TOTP MFA set to optional and admin-created accounts start on a temporary password, so both
challenges are ordinary states of the sign-in form.

What is kept is the ID token, in `chrome.storage.local`, readable only by the extension. It is the
credential every call to the assistant service carries; the service verifies it against the pool
and attributes the deploy commit to whoever it says signed in.

## Build configuration

Only `PLASMO_PUBLIC_*` names reach extension code. Copy `.env.example` to `.env.development` for
`plasmo dev`, or `.env.production` for a build; CI writes the latter from the CircleCI context.

| Name | What it is |
|---|---|
| `PLASMO_PUBLIC_WIDGET_API_URL` | the assistant service's Function URL (`yarn sls info --stage <stage>` in mediajel-serverless) |
| `PLASMO_PUBLIC_COGNITO_USER_POOL_ID`, `..._CLIENT_ID`, `..._REGION` | the pool to sign into — public identifiers, and the app client has no secret, which is what lets a browser authenticate directly |
| `PLASMO_PUBLIC_FRICTIONLESS_CUSTOMTAG_URL` | where a deployed tag is served from, so the receipt can name its URL |
| `PLASMO_PUBLIC_TAG_URL`, `PLASMO_PUBLIC_TAG_ORIGIN` | the tag "load the tag on this page" injects, for sites that have not installed it yet |
| `CRX_PUBLIC_KEY` | pins the extension id across reinstalls, so a rebuild does not orphan saved jobs |

An unset `PLASMO_PUBLIC_*` used in `host_permissions` leaves a literal `$NAME/*` in the manifest,
which Chrome refuses to load. CI fails the build on that rather than shipping it.

## Local development

```sh
nvm use                                 # Node 22 — see below; the repo root carries an .nvmrc
bun install
cp .env.example .env.development        # point WIDGET_API_URL at http://localhost:3011
bun run dev                             # then load dist/chrome-mv3-dev at chrome://extensions
```

**Node 22, not newer.** Plasmo's watcher rides `@parcel/watcher`'s FSEvents backend, which on Node
23+ throws an uncaught `Events were dropped by the FSEvents client` and takes `plasmo dev` down
with it — the build succeeds, then the process exits and the panel silently stops rebuilding. 22
is also what CircleCI builds against. The pin lives in `.nvmrc` and **not** in an `engines` field:
Parcel derives its build targets from `engines`, so `engines.node` here makes it treat the
extension as a Node package and module resolution collapses.

Run the assistant service beside it with `yarn dev:widget-api` in `../../../mediajel-serverless`.
It needs `OPENAI_API_KEY` and, to deploy, `GITHUB_TOKEN` in that repo's `.env.staging`.

Checks: `bun run check` (types) · `bun run lint` · `bun run test` (bun test + happy-dom) ·
`bun run build` (writes `dist/chrome-mv3-prod` and a zip beside it).

## Things that will bite

- **zod is aliased to its CommonJS build** (see `alias` in `package.json`). Its ESM entry is
  `import * as z` over a chain of `export *` in a package marked `sideEffects: false`; Parcel drops
  that graph and `z` arrives with no `.string`. It fails at runtime, not at build time, so it is
  only visible by opening the page.
- **`@plasmohq/storage` defaults to the `sync` area**, which caps an item at ~8 KB and would
  silently drop a recording. Every instance here is constructed `{ area: "local" }`.
- **The service worker is not a process that stays alive.** Nothing may live only in a module
  variable that matters: jobs are mirrored to storage behind a 200 ms debounce, and events marked
  `flush` — the ones a navigation is about to destroy — bypass it.
- **Verify still injects into the client's page**, so the `securitypolicyviolation` listener in
  `verify/runner.ts` is still load-bearing. The CSP handling around the *service* call is gone;
  that call is made from our own origin now.

## Design

See [DESIGN.md](DESIGN.md). The short version: the panel is one job sheet per site, kept as carbon
copies — every finished step seals into a stamped slip that stays readable above the live work,
and the one next action is pinned at the bottom saying what it will do.

Two things about it are easy to undo by accident. **Mono is only for machine text** — code, field
identifiers, function names, the `+12s` column, the live REC readout. Reaching for it because
something feels technical is what made this look like a console. And **machine facts live behind
the ⓘ disclosures**: file paths, shas, the exact commit message, field tallies. The surface is
written in sentences a person can act on; nothing is hidden, it is one click away.

The two faces are self-hosted (`src/ui/fonts/`) because a stack could not deliver them — see the
README in that folder before changing them.
