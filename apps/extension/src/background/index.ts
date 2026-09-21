import { Request, Response } from "~/bridge/api";
import { BridgeDown, BridgeUp } from "~/bridge/protocol";
import { PANEL_PORT, RELAY_PORT } from "~/lib/ports";
import { Evidence, trackerStatus } from "@mediajel/assistant-core/tags";
import { Outcome, PendingEvent } from "@mediajel/assistant-core/wire/types";

import { failureAnswer } from "~/background/answer";
import { attachAll } from "~/background/attach";
import { handle } from "~/background/handle";
import { forgetLedger, recordEvents, settleEvents } from "~/background/ledger";
import { readTagsOnPage } from "~/background/page-tags";
import { panelRegistry } from "~/background/panels";
import { resumption } from "~/background/resume";
import { armTab, forgetPage, markTab, reportFromPage, simulationView } from "~/background/simulation";
import { forgetTab, learn } from "~/background/tag-state";
import { listenAbroad, listenForOutcomes, listenForWire } from "~/background/wire";
import { flushAll, openJob, peekJob, subscribeJobs, updateJob } from "~/store/jobs";
import { siteOf } from "~/lib/site";
import { Captured, heard, heardFromBridge } from "~/lib/wire";

/**
 * The service worker: the one place that knows which tab is working on which site, holds every
 * job, and speaks to the assistant service. Both other realms are deliberately thin — the page
 * bridge observes, the panel renders — so this is where the product's state actually is.
 *
 * A service worker is not a process that stays alive. Chrome stops it whenever it looks idle
 * and starts it again on the next event, so nothing here may live only in a module variable
 * that matters: jobs are mirrored into `chrome.storage.local` behind a debounce, and the tab
 * bindings below are cheap enough to rebuild from the ports themselves.
 */

/** Open relay ports, by tab. A tab has exactly one live document, so one port each. */
const relays = new Map<number, chrome.runtime.Port>();

/**
 * Delivers a command to a tab's page, resolving false only when nothing in the page can receive it.
 *
 * The relay's port is the usual way down, but this worker cannot count on having one: Chrome stops
 * the worker after thirty idle seconds, which closes every port, and a relay only reopens its port
 * when its page next sends something up. A page that is not recording sends nothing, so a snapshot
 * or a start-recording used to vanish — the panel waited forever for tags, a recording captured
 * nothing. The relay also listens for one-off messages, and those reach it without a port.
 */
export const sendToTab = async (tabId: number, message: BridgeDown): Promise<boolean> => {
  const port = relays.get(tabId);
  try {
    if (port) {
      port.postMessage(message);
      return true;
    }
  } catch {
    relays.delete(tabId);
  }
  try {
    await chrome.tabs.sendMessage(tabId, message, { frameId: 0 });
    return true;
  } catch {
    // No relay of this extension in the page: a tab opened before it was installed, updated or reloaded.
    return false;
  }
};

/** Removes the broad listener; null while no panel is open and it is not registered. */
let stopAbroad: (() => void) | null = null;

/**
 * Panel ports, by the tab each panel is bound to, so events reach the right one. Other vendors'
 * trackers are heard from the first panel opening to the last one closing, and never otherwise.
 */
const panels = panelRegistry(
  () => {
    stopAbroad = listenAbroad(panels.watching, onWire, onOutcome);
  },
  () => {
    stopAbroad?.();
    stopAbroad = null;
  },
);

const toPanel = (tabId: number, message: unknown): void => panels.send(tabId, message);

/**
 * Something was learned about a tab's tags. The owner keeps it; the panel bound to the tab hears
 * about it only when it is news.
 */
const publish = async (tabId: number, site: string, evidence: Evidence): Promise<void> => {
  const tab = await learn(tabId, site, evidence);
  if (tab) toPanel(tabId, { type: "tags", site, tags: tab.tags, settled: tab.settled, status: trackerStatus(tab) });
};

/** The scripts in the page, read by this worker, are one more piece of evidence about it. */
const readScripts = async (tabId: number, site: string): Promise<void> => {
  const found = await readTagsOnPage(tabId);
  if (found) await publish(tabId, site, { kind: "scripts", tags: found });
};

/** A new document in a tab mid-job: pick the recording, or the proof, back up. */
const resume = (tabId: number, site: string): void => {
  const command = resumption(peekJob(site));
  if (command) void sendToTab(tabId, command);
};

/** Appends rows to a tab's ledger, and tells the bound panel what changed. */
const appendToLedger = async (tabId: number, site: string, events: PendingEvent[]): Promise<void> => {
  const delta = await recordEvents(tabId, site, events);
  if (delta) toPanel(tabId, { type: "events", site, ...delta });
};

/** Settles a request's rows with how it ended; the panel hears when any were waiting. */
const settleInLedger = async (tabId: number, request: string, outcome: Outcome): Promise<void> => {
  const settled = await settleEvents(tabId, request, outcome);
  if (settled) toPanel(tabId, { type: "events", site: settled.site, ...settled.delta });
};

/**
 * A recorded event from the page. A recording that has been stopped must not keep growing: the
 * page-bridge can miss its `stop-recording` — the relay's port dies with a recycled worker, so the
 * command goes nowhere, and the relay only reconnects on the next message going UP, this one.
 * Re-send the stop now that there is a live port again, and drop the event rather than appending
 * it to a record the operator has already closed.
 */
const recordTimelineEvent = (tabId: number, site: string, message: Extract<BridgeUp, { type: "event" }>): void => {
  const session = peekJob(site);
  if (!session) return;
  if (session.step !== "recording") {
    void sendToTab(tabId, { type: "stop-recording" });
    return;
  }
  updateJob(site, (draft) => draft.timeline.push(message.event), { flush: message.flush });
};

type Up<K extends BridgeUp["type"]> = Extract<BridgeUp, { type: K }>;
type Handler<K extends BridgeUp["type"]> = (
  tabId: number,
  site: string,
  message: Up<K>,
  pageKey: string,
) => void | Promise<void>;

/** What each message from a page's bridge does here, by its type. */
const UP: { [K in BridgeUp["type"]]: Handler<K> } = {
  ready: (tabId, site) => {
    void publish(tabId, site, { kind: "document" });
    resume(tabId, site);
    void armTab(tabId, site, sendToTab);
  },
  "tags-running": (tabId, site, message) => publish(tabId, site, { kind: "running", appIds: message.appIds }),
  "tag-announced": (tabId, site, message) => publish(tabId, site, { kind: "announced", tag: message.tag }),
  "page-facts": (tabId, site, message) => publish(tabId, site, { kind: "facts", facts: message.facts }),
  settled: async (tabId, site) => {
    await publish(tabId, site, { kind: "settled" });
    await readScripts(tabId, site);
  },
  event: recordTimelineEvent,
  page: (_tabId, site, message) => {
    updateJob(site, (draft) => draft.pages.push(message.page));
  },
  "verify-capture": (_tabId, site, message) => {
    updateJob(
      site,
      (draft) => {
        const verify = draft.verify ?? { captured: [], errors: [] };
        draft.verify = { ...verify, captured: [...verify.captured, message.capture] };
      },
      { flush: true },
    );
  },
  "verify-result": (tabId, site, message) => {
    updateJob(site, (draft) => {
      const verify = draft.verify ?? { captured: [], errors: [] };
      draft.verify = { ...verify, errors: message.errors };
    });
    toPanel(tabId, { type: "verify-result", ok: message.ok, errors: message.errors });
  },
  "dedup-cleared": (tabId, _site, message) => toPanel(tabId, message),
  "third-party-registered": (tabId, site, message, pageKey) =>
    appendToLedger(tabId, site, [heardFromBridge(message, pageKey, Date.now())]),
  "third-party-fired": (tabId, site, message, pageKey) =>
    appendToLedger(tabId, site, [heardFromBridge(message, pageKey, Date.now())]),
  "third-party-settled": (tabId, _site, message) => settleInLedger(tabId, message.key, message.outcome),
  "simulate-report": async (tabId, site, message) => {
    reportFromPage(tabId, { installFailed: message.installFailed });
    toPanel(tabId, { type: "simulation", site, view: await simulationView(tabId, site) });
  },
};

const handleUp = (tabId: number, site: string, message: BridgeUp, pageKey: string): void | Promise<void> =>
  (UP[message.type] as Handler<BridgeUp["type"]>)(tabId, site, message, pageKey);

/** Evidence about the page needs no job of its own; the recording and the proof do. */
const NEEDS_JOB = new Set<BridgeUp["type"]>(["ready", "event", "page", "verify-capture", "verify-result"]);

/**
 * Which tab each site's panel is bound to, so a session change can be pushed to the right one.
 * A site is only ever open in one panel at a time in practice; when it is not, the last panel
 * to bind wins, which is also the one the operator is looking at.
 */
const panelSites = new Map<string, number>();

/**
 * A request the tab's page made to one of the hosts on the wire. Every tag it named reaches the
 * tab's owner the moment it is heard — however late the tag loaded, and whether or not the page's
 * scripts can still talk — with what the tag's own record event said about its configuration;
 * every row it amounts to goes into the tab's ledger, and the bound panel hears of both.
 */
const onWire = (captured: Captured): void => {
  const { events, appIds, collector, records } = heard(captured);
  if (appIds.length > 0) void publish(captured.tabId, captured.site, { kind: "beacon", appIds, collector, records });
  void appendToLedger(captured.tabId, captured.site, events);
};

/** How one of those requests ended. */
const onOutcome = (tabId: number, request: string, outcome: Outcome): void => {
  void settleInLedger(tabId, request, outcome);
};

listenForWire(onWire);
listenForOutcomes(onOutcome);

/**
 * A page that has finished loading is read once more, and given its moment to load a tag —
 * whether or not a bridge could run in it. The bridge's own `settled` usually comes first; the
 * owner ignores what it already knows.
 */
chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (change.status !== "complete") return;
  const site = siteOf(tab.url ?? "");
  if (!site) return;
  void readScripts(tabId, site);
  setTimeout(() => void publish(tabId, site, { kind: "settled" }), 2_000);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void forgetTab(tabId);
  void forgetLedger(tabId);
  forgetPage(tabId);
});

// Every tab says SIM on the toolbar while its site has a simulated tag, from the moment it navigates.
chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (change.status === "loading") void markTab(tabId, tab.url ?? "");
});

// Installed, updated, or reloaded over open tabs: give every one of them a relay and a bridge now,
// so nothing has to be reloaded to be seen — every dev rebuild included.
chrome.runtime.onInstalled.addListener(() => void attachAll());

subscribeJobs((site, session) => {
  const tabId = panelSites.get(site);
  if (tabId !== undefined) toPanel(tabId, { type: "session", session });
});

/** The URL of the page a port was opened from: its tab's, or the sender's own. */
const urlOf = (sender: chrome.runtime.MessageSender): string => sender.tab?.url ?? sender.url ?? "";

/** Which tab a relay's port speaks for, and the URL of the page it was opened from. */
const senderOf = (port: chrome.runtime.Port): { tabId?: number; url: string } =>
  port.sender ? { tabId: port.sender.tab?.id, url: urlOf(port.sender) } : { url: "" };

const originOf = (url: string): string => {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
};

/**
 * The document a relay's port speaks for, keyed as the wire keys it: the browser's id for the
 * document, so what the bridge reports sits under the same page as what `webRequest` heard — or
 * its origin, when the browser gave none.
 */
const documentKeyOf = (port: chrome.runtime.Port, url: string): string =>
  port.sender?.documentId ?? `origin:${originOf(url)}`;

const bindRelay = (port: chrome.runtime.Port): void => {
  const { tabId, url } = senderOf(port);
  const site = siteOf(url);
  if (tabId === undefined || !site) return;
  const pageKey = documentKeyOf(port, url);

  relays.set(tabId, port);
  port.onDisconnect.addListener(() => {
    // Read, or Chrome logs "Unchecked runtime.lastError" when the page went into the
    // back/forward cache and took the port with it — expected, not an error of ours.
    void chrome.runtime.lastError;
    if (relays.get(tabId) === port) relays.delete(tabId);
  });
  port.onMessage.addListener((message: BridgeUp) => {
    const ready = NEEDS_JOB.has(message.type) ? openJob(site) : Promise.resolve();
    void ready.then(() => handleUp(tabId, site, message, pageKey));
  });
};

const bindPanel = (port: chrome.runtime.Port): void => {
  const tabId = Number(port.name.slice(PANEL_PORT.length + 1));
  if (!Number.isFinite(tabId)) return;
  panels.bind(tabId, port);
  void chrome.tabs
    .get(tabId)
    .then((tab) => {
      const site = siteOf(tab.url ?? "");
      if (site) panelSites.set(site, tabId);
    })
    .catch(() => undefined);
  port.onDisconnect.addListener(() => {
    void chrome.runtime.lastError;
    panels.unbind(tabId, port);
    for (const [site, bound] of panelSites) if (bound === tabId) panelSites.delete(site);
  });
};

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === RELAY_PORT) bindRelay(port);
  else if (port.name.startsWith(`${PANEL_PORT}:`)) bindPanel(port);
});

/**
 * One request in, one answer out. Every throw below becomes `{ ok: false, error }` carrying the
 * thrower's own message — which is why the messages in this codebase are written as sentences
 * an operator can act on rather than as diagnostics.
 */
chrome.runtime.onMessage.addListener((request: Request, _sender, respond) => {
  handle(request, sendToTab, toPanel).then(
    (value) => respond({ ok: true, value } satisfies Response<unknown>),
    (err: unknown) => void failureAnswer(err).then(respond),
  );
  return true; // the answer is asynchronous
});

/** Clicking the toolbar icon opens the panel for that tab. */
void chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);

// The worker can be stopped at any time; anything still sitting behind the write debounce goes
// out first. Recording a purchase and losing it to an idle timeout is not a failure mode we
// are prepared to have.
chrome.runtime.onSuspend?.addListener(() => {
  void flushAll();
});

export {};
