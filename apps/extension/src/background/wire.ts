import { Outcome } from "@mediajel/assistant-core/wire/types";

import { Captured, Ended, WIRE_TYPES, WIRE_URLS, capturedFrom, isWireUrl, outcomeOf } from "~/lib/wire";

/**
 * The requests each tab's page makes, heard as they go out and as they end.
 *
 * The narrow listeners — MediaJel's hosts, the partners' — are registered at the top of the
 * worker, so a stopped worker is woken by every matching request: a tag heard a minute before
 * the panel opened is not a tag missed. The broad one, for other vendors' trackers on every
 * other host, is registered only while a panel is open, so the worker is never woken for every
 * request on every Snowplow site. What is heard goes to the tab's owners: `tag-state.ts` for
 * what it says about the tags, `ledger.ts` for the events themselves.
 */

const FILTER: chrome.webRequest.RequestFilter = { urls: WIRE_URLS, types: WIRE_TYPES };

/** Every host: the trackers that are not ours. */
const ABROAD: chrome.webRequest.RequestFilter = { urls: ["<all_urls>"], types: WIRE_TYPES };

type OnHeard = (captured: Captured) => void;
type OnOutcome = (tabId: number, request: string, outcome: Outcome) => void;

/** Only a real tab's own page: the top frame. */
const ownFrame = (details: { tabId: number; frameId: number }): boolean => details.tabId >= 0 && details.frameId === 0;

/** Calls back with every request a tab's own page sends to a wire host, body and all. */
export const listenForWire = (onHeard: OnHeard): void => {
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      const captured = capturedFrom(details);
      if (captured) onHeard(captured);
      return undefined;
    },
    FILTER,
    ["requestBody"],
  );
};

/** Calls back with how each of those requests ended — answered, sent on to another URL, refused, or never sent. */
export const listenForOutcomes = (onOutcome: OnOutcome): void => {
  const settle = (details: Ended): void => {
    if (ownFrame(details)) onOutcome(details.tabId, details.requestId, outcomeOf(details));
  };
  chrome.webRequest.onCompleted.addListener(settle, FILTER);
  chrome.webRequest.onErrorOccurred.addListener(settle, FILTER);
  chrome.webRequest.onBeforeRedirect.addListener(settle, FILTER);
};

/**
 * Hears other vendors' trackers on the tabs a panel is watching, and how their requests end.
 * The narrow listeners' hosts are left to them, so nothing is heard twice. Returns the function
 * that removes the listeners — by reference, so it is these and no others.
 */
export const listenAbroad = (
  watching: (tabId: number) => boolean,
  onHeard: OnHeard,
  onOutcome: OnOutcome,
): (() => void) => {
  const hear = (details: chrome.webRequest.OnBeforeRequestDetails): undefined => {
    const captured = watching(details.tabId) ? capturedFrom(details) : null;
    if (captured && !isWireUrl(captured.url)) onHeard(captured);
    return undefined;
  };
  const settle = (details: Ended): void => {
    if (watching(details.tabId) && ownFrame(details) && !isWireUrl(details.url)) {
      onOutcome(details.tabId, details.requestId, outcomeOf(details));
    }
  };
  chrome.webRequest.onBeforeRequest.addListener(hear, ABROAD, ["requestBody"]);
  chrome.webRequest.onCompleted.addListener(settle, ABROAD);
  chrome.webRequest.onErrorOccurred.addListener(settle, ABROAD);
  return () => {
    chrome.webRequest.onBeforeRequest.removeListener(hear);
    chrome.webRequest.onCompleted.removeListener(settle);
    chrome.webRequest.onErrorOccurred.removeListener(settle);
  };
};
