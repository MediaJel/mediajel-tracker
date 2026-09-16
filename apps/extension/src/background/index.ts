import { Request, Response } from "~/bridge/api";
import { BridgeDown, BridgeUp } from "~/bridge/protocol";
import { PANEL_PORT, RELAY_PORT } from "~/lib/ports";
import { failureAnswer } from "~/background/answer";
import { listenForTags } from "~/background/beacons";
import { handle, rememberStatus } from "~/background/handle";
import { flushAll, openJob, peekJob, subscribeJobs, updateJob } from "~/store/jobs";
import { siteOf } from "~/lib/site";

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

/** Panel ports, by the tab each panel is bound to, so events reach the right one. */
const panels = new Map<number, chrome.runtime.Port>();

const toPanel = (tabId: number, message: unknown): void => {
  try {
    panels.get(tabId)?.postMessage(message);
  } catch {
    panels.delete(tabId);
  }
};

const handleUp = async (tabId: number, site: string, message: BridgeUp): Promise<void> => {
  switch (message.type) {
    case "ready":
      // A new document in a tab we are recording: the sources were re-installed by the fresh
      // page-bridge, so tell it to pick the recording back up from where the clock was.
      {
        const session = peekJob(site);
        if (session?.step === "recording") {
          void sendToTab(tabId, { type: "start-recording", startedAt: session.startedAt });
        }
        if (session?.step === "verify" && session.generation) {
          void sendToTab(tabId, { type: "verify", code: session.generation.code });
        }
      }
      // A panel is open on this tab, so the new document should watch for tags as the panel's own
      // snapshot would have: next/script and GTM insert the tag after the document has loaded.
      if (panels.has(tabId)) void sendToTab(tabId, { type: "snapshot" });
      return;

    case "event": {
      // A recording that has been stopped must not keep growing. The page-bridge can miss its
      // `stop-recording`: the relay's port dies with a recycled worker, so the command goes
      // nowhere, and the relay only reconnects on the next message going UP — this one. Re-send
      // the stop now that there is a live port again, and drop the event rather than appending
      // it to a record the operator has already closed.
      const session = peekJob(site);
      if (!session) return;
      if (session.step !== "recording") {
        void sendToTab(tabId, { type: "stop-recording" });
        return;
      }
      updateJob(site, (draft) => draft.timeline.push(message.event), { flush: message.flush });
      return;
    }

    case "page":
      updateJob(site, (draft) => draft.pages.push(message.page));
      return;

    case "verify-capture":
      updateJob(
        site,
        (draft) => {
          const verify = draft.verify ?? { captured: [], errors: [] };
          draft.verify = { ...verify, captured: [...verify.captured, message.capture] };
        },
        { flush: true },
      );
      return;

    case "verify-result":
      updateJob(site, (draft) => {
        const verify = draft.verify ?? { captured: [], errors: [] };
        draft.verify = { ...verify, errors: message.errors };
      });
      toPanel(tabId, { type: "verify-result", ok: message.ok, errors: message.errors });
      return;

    case "status":
      rememberStatus(tabId, site, message.status);
      toPanel(tabId, message);
      return;

    case "dedup-cleared":
      toPanel(tabId, message);
      return;
  }
};

/**
 * Which tab each site's panel is bound to, so a session change can be pushed to the right one.
 * A site is only ever open in one panel at a time in practice; when it is not, the last panel
 * to bind wins, which is also the one the operator is looking at.
 */
const panelSites = new Map<string, number>();

// Every tag a tab's page is heard sending events from reaches that tab's panel the moment it is
// first heard — however late the tag loaded, and whether or not the page's scripts can still talk.
listenForTags((tabId, site, appIds) => toPanel(tabId, { type: "tags-heard", site, appIds }));

subscribeJobs((site, session) => {
  const tabId = panelSites.get(site);
  if (tabId !== undefined) toPanel(tabId, { type: "session", session });
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === RELAY_PORT) {
    const tabId = port.sender?.tab?.id;
    const url = port.sender?.tab?.url ?? port.sender?.url ?? "";
    const site = siteOf(url);
    if (tabId === undefined || !site) return;

    relays.set(tabId, port);
    port.onDisconnect.addListener(() => {
      if (relays.get(tabId) === port) relays.delete(tabId);
    });
    port.onMessage.addListener((message: BridgeUp) => {
      void openJob(site).then(() => handleUp(tabId, site, message));
    });
    return;
  }

  if (port.name.startsWith(`${PANEL_PORT}:`)) {
    const tabId = Number(port.name.slice(PANEL_PORT.length + 1));
    if (!Number.isFinite(tabId)) return;
    panels.set(tabId, port);
    void chrome.tabs
      .get(tabId)
      .then((tab) => {
        const site = siteOf(tab.url ?? "");
        if (site) panelSites.set(site, tabId);
      })
      .catch(() => undefined);
    port.onDisconnect.addListener(() => {
      if (panels.get(tabId) === port) panels.delete(tabId);
      for (const [site, bound] of panelSites) if (bound === tabId) panelSites.delete(site);
    });
  }
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
