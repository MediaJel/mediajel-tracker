# The Playwright harness

End-to-end checks of the Integrations Assistant as Chrome actually runs it: the production build
loaded as an unpacked extension into Playwright's Chromium, shown real pages, and read from the
outside. The unit tests in `../test` stand a fake `chrome` in front of the code; these stand
outside the real one.

## Running it

```sh
cd apps/extension
bun run build            # the harness loads dist/chrome-mv3-prod
bun x playwright install chromium   # once per machine
bun run e2e              # every spec
bun run e2e -- e2e/fixtures.spec.ts # one spec
bun run e2e -- e2e/panel.spec.ts --update-snapshots=all   # regenerate every reference (=all: a diff inside the tolerance is not rewritten otherwise)
```

Everything the harness generates lands under `e2e/out/` (gitignored). The reference screenshots
under `e2e/__screenshots__/` are committed on purpose: they are the pictures a UI change is compared
against.

## The specs

- `fixtures.spec.ts` — two local pages carrying the production tag build. `old.html` installs it
  the ordinary way; `held.html` the way WP Rocket leaves it, inert until the first `mousemove`.
  Both must end with the tag heard sending for app ID `e2e-old` and with the stub collector holding
  the `payload_data` batch that named it. `old.html` also carries a segment for every partner
  (`s1`, `s2.pv`, `s2.tr`, `s3.pv`, `s3.tr`), so the tag fires the partners' page-view pixels; the
  ledger must hold one row per partner (see "What the ledger assertions check").
- `announcing.spec.ts` — `new.html` carries this repo's tag build, which announces itself: the
  record says `installed` from the tag's own word before anything is sent, then `running`, then
  `sending` with the collector holding the batch, every row `announced: true`; under GPC it says
  `opted-out` and the collector hears nothing.
- `terrabis.spec.ts` — a real client site whose tag arrives late through Google Tag Manager. It
  checks detection, that the ledger holds what the tag did as it booted, that the record outlives a
  stopped service worker, what a `chrome.runtime.reload()` does to it, and (signed in) the panel's
  tally. The signed-in part needs `apps/extension/.env.e2e` with `MJ_E2E_USERNAME` and
  `MJ_E2E_PASSWORD` (gitignored; never printed) and is skipped without it.
- `panel.spec.ts` — the visual matrix: every screen of the side panel and the popup, in both
  themes, rendered against a stubbed `chrome` (see below) and compared pixel-for-pixel.

## How the tag's traffic is kept local

The production bundle posts its events to `//collector-azsx401.dmp.cnna.io/analytics/track`.
Chrome is launched with `--host-resolver-rules="MAP *.dmp.cnna.io 127.0.0.1"`, so every MediaJel
collector resolves to this machine for the whole run and no test page view reaches the pipeline.
The URL stays a `*.cnna.io` one, which is what the extension's `chrome.webRequest` filter listens for.

The fixtures need the beacon to actually arrive somewhere, so a stub collector listens on
127.0.0.1:4443 and answers 200 to anything (with the CORS headers the tag's preflight needs). Port
443 cannot be bound without privileges on this machine, and a TLS stub would need a certificate, so
`vendor-tag.mjs` makes one edit to the vendored copy of the bundle: the collector host becomes
`collector-azsx401.dmp.cnna.io:4443`. The fixture pages are served over plain HTTP, the bundle's
collector URL is protocol-relative, so the beacon goes to `http://collector-azsx401.dmp.cnna.io:4443`
and lands on the stub with no TLS anywhere. The production tag on terrabis.co is not rewritten; its
beacon resolves to a closed port on this machine, which the extension hears all the same.

The partner hosts the tag fires pixels at from its segment parameters — `r.turn.com` (Nexxen),
`action.dstillery.com` and its companion `action.media6degrees.com` (Dstillery), `tracking.lqm.io`
(LiquidM) and `bat.bing.com` (Bing) — are in the same host rule (`PARTNER_HOSTS` in `extension.ts`,
the list the extension listens on), so they resolve to this machine too. Nothing listens on their
ports, so each pixel lands on a closed port: the page is unaffected, the extension still hears the
request go out, and the ledger records it as never sent. No page view a spec causes reaches a
partner. The tag's custom-tag host (`test-custom-tags.cnna.io` in the production bundle) is not
mapped: it is MediaJel's own, and the fetch is what the custom-tag rows are read from.

`vendor-tag.mjs` fetches `https://tags.cnna.io/index.js` and every hashed chunk it names into
`e2e/fixtures/vendor/` (gitignored) on the first run. Delete that directory to refresh the copy.

`build-announcing-tag.mjs` builds this repo's own tag — the one that announces itself — from
`apps/tracker` with `COLLECTOR_URL` pointed at the stub's host and port, into
`e2e/fixtures/announcing/` (gitignored), once; `new.html` loads it from 127.0.0.1:3002. Delete
that directory to rebuild after a tag change.

## The visual matrix

`build-preview.mjs` copies `dist/chrome-mv3-prod` to `e2e/out/site`, inserts
`<meta name="darkreader-lock">` and `<script src="/chrome-stub.js">` at the start of `<head>` in
`sidepanel.html` and `popup.html`, and copies the stub in. `stub/chrome-stub.js` installs a
`window.chrome` before the bundle runs: `runtime.sendMessage` answers every request type in
`src/bridge/api.ts` according to `?scenario=` in the page's query string, `runtime.connect` gives
the panel a port the stub pushes session changes through (so clicks advance the job the way the
real background would), and `tabs`, `storage` and `sidePanel` are in-memory stand-ins. `?theme=`
is what `settings/read` answers.

`panel.spec.ts` serves that directory at a root (the built pages use absolute asset paths), opens
`/sidepanel.html?scenario=<name>&theme=<light|dark>` at 400×1000 for every scenario, waits for the
scenario's ready selector, checks nothing is `disabled`, and asserts `toHaveScreenshot`. The clock
is pinned to one instant so elapsed times, "2h ago" and the day axis never move. A separate run
renders the recording screen under `prefers-reduced-motion: reduce` and requires two captures two
seconds apart to be identical.

## What the ledger assertions check

The background's ledger of a tab is `events/<tabId>` in its session storage: one row per request
the tab's page made that the extension keeps, oldest first, each settled with how it ended (`ok`,
`failed`, `blocked`, or still `pending`). `readTabLedger` and `pollTabLedger` in `extension.ts`
read it the way `readTabRecord` and `pollTabRecord` read the tag record.

- `fixtures.spec.ts` (`old.html`): after the tag is heard sending, the ledger holds a `partner`
  row for each of Nexxen (`purpose: audience`, `segment: e2e-nexxen-pv`), Dstillery
  (`audience`, `e2e-dstillery-pv`, not `unconfigured`) and LiquidM (`sync`, `e2e-liquidm`), every one
  with an outcome of `blocked` or `failed` — the hosts resolve to this machine, so none was sent;
  the tag's own `record` event for `e2e-old`, whose `record.config.params` carry `s1`, `s2.pv` and
  `s3.pv` as the tag URL set them — it follows the page view because the stub collector answers;
  and any `custom-tag` row the vendored bundle produced, named for what it asked for: the domain
  file for `127.0.0.1`, the app-id file for `e2e-old`.
- `terrabis.spec.ts` (detection, signed out): within 20 s of the page view the ledger holds a
  collector page view for `5f976cbb-7d29-46ce-bf07-0f701478d800`; a custom-tag fetch named
  `terrabis.co`; and a Dstillery signal and a LiquidM sync whose segments equal the `s3.pv` and `s1`
  of the tab's tag record — the wire matches the configuration. The `record` event is not asserted
  here and cannot be: the collector resolves to this machine so the page view's POST is refused,
  and the tracker's outbound queue holds the record event behind it until a collector answers.

## What a run prints

The background's record of a tab is `tags/<tabId>` in its session storage: a state per tag
(`installed`, `held-back`, `running`, `sending`, `opted-out`, `disabled`, `failed`) that only ever
moves forward. Each spec prints the state it saw the app ID in, what `job/open` named, and — where
it reads the ledger — one entry per row it found, so a failed expectation reads as
expected-versus-observed rather than as a bare assertion.
