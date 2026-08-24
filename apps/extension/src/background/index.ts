import { Request, Response } from "~/bridge/api";
import { BridgeDown, BridgeUp } from "~/bridge/protocol";
import { PANEL_PORT, RELAY_PORT } from "~/lib/ports";
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

export const sendToTab = (tabId: number, message: BridgeDown): boolean => {
  const port = relays.get(tabId);
  if (!port) return false;
  try {
    port.postMessage(message);
    return true;
  } catch {
    relays.delete(tabId);
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
          sendToTab(tabId, { type: "start-recording", startedAt: session.startedAt });
        }
        if (session?.step === "verify" && session.generation) {
          sendToTab(tabId, { type: "verify", code: session.generation.code });
        }
      }
      return;

    case "event":
      updateJob(site, (draft) => draft.timeline.push(message.event), { flush: message.flush });
      return;

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
      rememberStatus(tabId, message.status);
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
    (err: unknown) => {
      const error = err instanceof Error ? err.message : String(err);
      const code = (err as { code?: string })?.code;
      respond({ ok: false, error, code } satisfies Response<never>);
    },
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
