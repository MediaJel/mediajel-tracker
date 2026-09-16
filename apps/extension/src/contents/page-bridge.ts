import type { PlasmoCSConfig } from "plasmo";

import { TagSearch, readPageContext } from "@mediajel/assistant-core/context";
import { snapshotTracker, watchTrackTrans } from "@mediajel/assistant-core/recorder/context";
import { askRunningTags } from "@mediajel/assistant-core/trackers";
import { Recorder, RecorderSink, createRecorder } from "@mediajel/assistant-core/recorder/recorder";
import { runGenerated } from "@mediajel/assistant-core/verify/runner";

import { BridgeDown, BridgeUp, unwrap, wrap } from "~/bridge/protocol";

/**
 * The assistant's half that has to live in the page.
 *
 * `world: "MAIN"` puts this in the page's own realm, which is the only place `window.fetch`,
 * `XMLHttpRequest.prototype`, `history.pushState`, `window.dataLayer` and `window.trackTrans`
 * actually exist as the page sees them — an isolated content script gets its own copies and
 * would record an empty timeline while swearing everything was fine.
 *
 * The price is that `chrome.*` is gone here. Nothing in this file stores, fetches or decides
 * anything: it observes, and it posts. The background holds the session, so a recording
 * survives the navigation from cart to thank-you that this whole product is about.
 *
 * `run_at: document_start` is not a preference. `fetch` must be wrapped before the page's own
 * code gets a reference to it, or the first checkout call is invisible.
 *
 * This config does not become a `content_scripts` entry: Plasmo filters main-world scripts out
 * of the manifest and has the background register them with `chrome.scripting.registerContentScripts`
 * instead (it generates that call, with this file's built URL, into the service worker). The
 * effect is the same, and the `scripting` permission it needs is added for us.
 *
 * It matches every http(s) page, and is nearly inert on all of them: until a `start-recording`
 * arrives it wraps nothing, and until the panel asks about the page it watches nothing. All it does
 * unasked is read the page's script tags once the document settles, to say which MediaJel tags are
 * there.
 */

export const config: PlasmoCSConfig = {
  matches: ["http://*/*", "https://*/*"],
  world: "MAIN",
  run_at: "document_start",
  all_frames: false,
  css: [],
};

let recorder: Recorder | null = null;
let startedAt = Date.now();

const send = (message: BridgeUp): void => {
  window.postMessage(wrap("up", message), "*");
};

const sink: RecorderSink = {
  event: (event, opts) => send({ type: "event", event, flush: opts?.flush }),
  page: (entry) => send({ type: "page", page: entry }),
  // The background debounces its own writes and flushes on every event marked `flush`, so
  // there is nothing left to do here — the events are already gone from this realm.
  flush: () => undefined,
};

/** The tag origin this build injects, so a staging build recognises its own tag as MediaJel's. */
const TAG_SEARCH: TagSearch = { origins: [(process.env.PLASMO_PUBLIC_TAG_ORIGIN ?? "").trim()].filter(Boolean) };

/**
 * Read fresh every time. At `document_start` there are no script tags yet, so a context
 * captured at load would report every tagged page as untagged — and the tag can arrive later
 * still, through GTM or an injection of our own.
 */
/** App IDs the page's Snowplow last said it is tracking with — the tags that have actually run. */
let running: string[] = [];

const search = (): TagSearch => ({ ...TAG_SEARCH, running });

const status = (): ReturnType<typeof snapshotTracker> => snapshotTracker(readPageContext(window, search()));

let lastReported = "";

/** Tells the panel about the page's tags — unless nothing it shows has changed since last time. */
const report = (force = false): void => {
  const next = status();
  const key = JSON.stringify([next.tags, next.trackTransPresent, next.optedOut]);
  if (!force && key === lastReported) return;
  lastReported = key;
  send({ type: "status", status: next });
};

/**
 * Asks the page's Snowplow which MediaJel tags are running, so a tag is found however it was loaded
 * — GTM, a proxy, a script that removed itself. The answer may come later, when the SDK loads; a
 * changed answer is reported like any other change. Only ever asked once the panel has asked.
 */
const askSnowplow = (): void =>
  askRunningTags(window, (appIds) => {
    running = appIds;
    report();
  });

const touchesScript = (record: MutationRecord): boolean =>
  record.type === "attributes"
    ? record.target.nodeName === "SCRIPT"
    : Array.from(record.addedNodes).some((node) => node.nodeName === "SCRIPT");

let watchingTags = false;
let stopTrackTransWatch: (() => void) | null = null;

/**
 * Tags keep arriving after the first read: GTM inserts them late, and a page-speed plugin gives a
 * delayed tag its real `src` only once the visitor interacts. Each changes which app IDs the panel
 * shows and whether Verify can run, so once the panel has asked about this page, script insertions
 * and `src` changes are watched — nothing else — and `trackTrans`, which the tag assigns late, is
 * polled for a minute after one. A page the panel never asked about is never watched.
 */
const watchTags = (): void => {
  if (watchingTags) return;
  watchingTags = true;
  new MutationObserver((records) => {
    if (!records.some(touchesScript)) return;
    report();
    if (stopTrackTransWatch || typeof window.trackTrans === "function") return;
    // trackTrans appearing is the tag having run: its tracker exists now, so Snowplow is asked again.
    const stop = watchTrackTrans(() => {
      report();
      askSnowplow();
    });
    stopTrackTransWatch = stop;
    setTimeout(() => {
      stop();
      if (stopTrackTransWatch === stop) stopTrackTransWatch = null;
    }, 60_000);
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
};

const startRecording = (at: number): void => {
  startedAt = at;
  recorder ??= createRecorder({
    page: readPageContext(window, search()),
    sink,
    now: () => Math.max(0, Date.now() - startedAt),
  });
  recorder.start();
};

const verify = (code: string): void => {
  const result = runGenerated(code, (capture) => send({ type: "verify-capture", capture }));
  send({ type: "verify-result", ok: result.ok, errors: result.errors });
};

/**
 * Loads the MediaJel tag into a page that does not have one yet, so an integration can be
 * written and proved before the client has installed anything. The script runs in the page's
 * realm, exactly as it will when the client installs it — which is the point; a bundled copy
 * would prove the bundle, not the tag.
 */
const injectTag = (url: string): void => {
  const script = document.createElement("script");
  script.src = url;
  script.async = true;
  script.addEventListener("load", () => report(true));
  (document.head ?? document.documentElement).appendChild(script);
};

/** The tag's dedup silently swallows repeated test fires; clearing it is a test-run reset. */
const clearDedup = (appId: string): void => {
  let count = 0;
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${appId}_`)) doomed.push(key);
    }
    for (const key of doomed) localStorage.removeItem(key);
    count = doomed.length;
  } catch {
    /* blocked storage — the operator sees a count of zero, which is the truth */
  }
  send({ type: "dedup-cleared", count });
};

window.addEventListener("message", (event: MessageEvent) => {
  const message = unwrap<BridgeDown>(event, "down");
  if (!message) return;
  try {
    switch (message.type) {
      case "start-recording":
        return startRecording(message.startedAt);
      case "stop-recording":
        return recorder?.stop();
      case "snapshot":
        watchTags();
        report(true);
        return askSnowplow();
      case "verify":
        return verify(message.code);
      case "inject-tag":
        return injectTag(message.url);
      case "clear-dedup":
        return clearDedup(message.appId);
    }
  } catch (err) {
    // This runs inside a client's production page. A throw here would surface as their error.

    console.warn("[MJ:Assistant] bridge command failed:", err);
  }
});

send({ type: "ready" });

// A tag that loads after us — through GTM, or through our own injection — changes what Verify
// can do, so the panel is told once the document has settled rather than being left with the
// empty answer document_start can give.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => report(true), { once: true });
} else {
  report(true);
}
