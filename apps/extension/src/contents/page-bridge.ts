import type { PlasmoCSConfig } from "plasmo";

import { readPageContext } from "@mediajel/assistant-core/context";
import type { PageSimulation } from "@mediajel/assistant-core/simulation";
import { Recorder, RecorderSink, createRecorder } from "@mediajel/assistant-core/recorder/recorder";
import { askRunningTags } from "@mediajel/assistant-core/trackers";
import { runGenerated } from "@mediajel/assistant-core/verify/runner";
import isUsPrivacyOptOut from "@mediajel/tracker-core/utils/privacy-opt-out";

import { listenForAnnouncements } from "~/bridge/announcements";
import { claimBridge } from "~/bridge/claim";
import { BridgeDown, BridgeUp, WIRE_VERSION, unwrap, wrap } from "~/bridge/protocol";
import { installSimulatedTag, serveEdits } from "~/bridge/simulate";
import { watchThirdPartyTags } from "~/bridge/third-party";
import { TAG_SEARCH } from "~/lib/tags";

/**
 * The assistant's half that has to live in the page.
 *
 * `world: "MAIN"` puts this in the page's own realm, which is the only place `window.fetch`,
 * `XMLHttpRequest.prototype`, `history.pushState`, `window.dataLayer`, `window.trackTrans` and
 * the tag's Snowplow queue actually exist as the page sees them — an isolated content script
 * gets its own copies and would record an empty timeline while swearing everything was fine.
 *
 * The price is that `chrome.*` is gone here. Nothing in this file stores, fetches or decides
 * anything: it observes, and it posts. The background holds the session and everything known
 * about the page's tags, so a recording survives the navigation from cart to thank-you that this
 * whole product is about.
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
 * arrives it wraps nothing. What it does unasked is ask the tag's Snowplow, once it appears,
 * which trackers it holds, and say when the page has settled — the two things the panel cannot
 * learn from outside the page.
 */

export const config: PlasmoCSConfig = {
  matches: ["http://*/*", "https://*/*"],
  world: "MAIN",
  run_at: "document_start",
  all_frames: false,
  css: [],
};

/** How often, and for how long after a page loads, to look for the tag's Snowplow loader. */
const QUEUE_POLL_MS = 100;
const QUEUE_POLL_FOR_MS = 60_000;
/** The page's moment to load a tag after `load`; "no tag" means nothing before it. */
const SETTLE_AFTER_LOAD_MS = 1_000;

let recorder: Recorder | null = null;
let startedAt = Date.now();
let standingDown = false;

const send = (message: BridgeUp): void => {
  if (!standingDown) window.postMessage(wrap("up", message), "*");
};

const sink: RecorderSink = {
  event: (event, opts) => send({ type: "event", event, flush: opts?.flush }),
  page: (entry) => send({ type: "page", page: entry }),
  // The background debounces its own writes and flushes on every event marked `flush`, so
  // there is nothing left to do here — the events are already gone from this realm.
  flush: () => undefined,
};

/** What only the page can say about itself, read fresh every time it is asked. */
const facts = (): void =>
  send({
    type: "page-facts",
    facts: { trackTransPresent: typeof window.trackTrans === "function", optedOut: isUsPrivacyOptOut() },
  });

/** Asks the tag's Snowplow which trackers it holds; false when there is no loader to ask yet. */
const askQueue = (): boolean => askRunningTags(window, (appIds) => send({ type: "tags-running", appIds }));

let queuePoll: ReturnType<typeof setInterval> | null = null;

const stopWatchingQueue = (): void => {
  if (queuePoll) clearInterval(queuePoll);
  queuePoll = null;
};

/**
 * The tag's loader is not there at document_start — the tag arrives with the page, from GTM, or
 * when a page-speed plugin lets it — so the queue is looked for on the cadence MediaJel's own
 * helpers use, and asked once it exists. Snowplow answers whenever its SDK has loaded.
 */
const watchQueue = (): void => {
  if (askQueue()) {
    stopWatchingQueue();
    return;
  }
  if (queuePoll) return;
  const until = Date.now() + QUEUE_POLL_FOR_MS;
  queuePoll = setInterval(() => {
    if (askQueue() || Date.now() > until) stopWatchingQueue();
  }, QUEUE_POLL_MS);
};

let settleTimer: ReturnType<typeof setTimeout> | null = null;

const settle = (): void => {
  settleTimer = setTimeout(() => {
    settleTimer = null;
    facts();
    watchQueue();
    send({ type: "settled" });
  }, SETTLE_AFTER_LOAD_MS);
};

const startRecording = (at: number): void => {
  startedAt = at;
  recorder ??= createRecorder({
    page: readPageContext(window, TAG_SEARCH),
    sink,
    now: () => Math.max(0, Date.now() - startedAt),
  });
  recorder.start();
};

const verify = (code: string): void => {
  const result = runGenerated(code, (capture) => send({ type: "verify-capture", capture }));
  send({ type: "verify-result", ok: result.ok, errors: result.errors });
};

/** The edits tried on this page, served until the page goes or the bridge stands down. */
let stopServingEdits = (): void => undefined;

/** Edits to the page's tags, served with their app-id files; a tag that fetched its file first is said. */
const serve = (tried: PageSimulation["tried"]): void => {
  stopServingEdits();
  if (Object.keys(tried).length === 0) return;
  const served = serveEdits(window, tried);
  stopServingEdits = served.stop;
  if (served.late.length > 0) send({ type: "simulate-report", late: served.late });
};

/**
 * The site's simulation, on this page. Edits first, so they are armed before the simulated tag can
 * ask for its app-id file. The tag loads from its own URL in the page's realm, exactly as it runs
 * when a client installs it — which is the point; a bundled copy would prove the bundle, not the
 * tag. Once it has loaded, the page is read again so its row fills in; a refusal is said.
 */
const simulate = ({ install, tried }: PageSimulation): void => {
  serve(tried);
  if (!install) return;
  installSimulatedTag(document, install, {
    loaded: () => {
      facts();
      watchQueue();
    },
    failed: () => send({ type: "simulate-report", installFailed: true }),
  });
};

/** The keys the tag's dedup keeps for an app ID in local storage. */
const dedupKeys = (appId: string): string[] => {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${appId}_`)) keys.push(key);
  }
  return keys;
};

/** The tag's dedup silently swallows repeated test fires; clearing it is a test-run reset. */
const clearDedup = (appId: string): void => {
  let count = 0;
  try {
    const doomed = dedupKeys(appId);
    for (const key of doomed) localStorage.removeItem(key);
    count = doomed.length;
  } catch {
    /* blocked storage — the operator sees a count of zero, which is the truth */
  }
  send({ type: "dedup-cleared", count });
};

/** The panel asked about this page: say what it can see now, and look for the tag again. */
const snapshot = (): void => {
  facts();
  watchQueue();
};

/** What each command from the background does here, by its type. */
const COMMANDS: { [K in BridgeDown["type"]]: (message: Extract<BridgeDown, { type: K }>) => void } = {
  "start-recording": (message) => startRecording(message.startedAt),
  "stop-recording": () => recorder?.stop(),
  snapshot: () => snapshot(),
  verify: (message) => verify(message.code),
  simulate: (message) => simulate(message),
  "clear-dedup": (message) => clearDedup(message.appId),
};

const onCommand = (event: MessageEvent): void => {
  const message = unwrap<BridgeDown>(event, "down");
  if (!message) return;
  try {
    (COMMANDS[message.type] as (command: BridgeDown) => void)(message);
  } catch (err) {
    // This runs inside a client's production page. A throw here would surface as their error.

    console.warn("[MJ:Assistant] bridge command failed:", err);
  }
};

// The tag's own word about itself, whenever it has one: every announcement from here on, and
// whatever was on record before this bridge arrived.
const stopListeningForAnnouncements = listenForAnnouncements(window, (tag) => send({ type: "tag-announced", tag }));

// The third-party tags the page registers with the tag, and each one the tag fires. Started only
// after the claim below: a copy being stood down gives `window.registerThirdPartyTags` back to the
// tag first, so this copy takes it from the tag and never from the old copy's wrapper.
let stopWatchingThirdParty = (): void => undefined;

// A bridge injected over a live one — the extension attaching to a tab it was installed over —
// takes the old one's place; two would record every event twice.
claimBridge(window, WIRE_VERSION, () => {
  standingDown = true;
  window.removeEventListener("message", onCommand);
  window.removeEventListener("load", settle);
  stopListeningForAnnouncements();
  stopWatchingQueue();
  stopWatchingThirdParty();
  stopServingEdits();
  if (settleTimer) clearTimeout(settleTimer);
  recorder?.stop();
});

stopWatchingThirdParty = watchThirdPartyTags(window, {
  registered: (key, triggers) => send({ type: "third-party-registered", key, pageUrl: window.location.href, triggers }),
  fired: (key, fire) => send({ type: "third-party-fired", key, pageUrl: window.location.href, ...fire }),
  settled: (key, outcome) => send({ type: "third-party-settled", key, outcome }),
});

window.addEventListener("message", onCommand);
watchQueue();
if (document.readyState === "complete") settle();
else window.addEventListener("load", settle, { once: true });

send({ type: "ready" });
