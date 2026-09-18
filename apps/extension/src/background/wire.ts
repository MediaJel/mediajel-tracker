import { Outcome } from "@mediajel/assistant-core/wire/types";

import { Captured, WIRE_TYPES, WIRE_URLS, capturedFrom, outcomeOf } from "~/lib/wire";

/**
 * The requests each tab's page makes to MediaJel's hosts, heard as they go out and as they end.
 *
 * Both listeners are registered at the top of the worker, so a stopped worker is woken by every
 * matching request — a tag heard a minute before the panel opened is not a tag missed. What is
 * heard goes to the tab's owners: `tag-state.ts` for what it says about the tags, `ledger.ts`
 * for the events themselves.
 */

const FILTER: chrome.webRequest.RequestFilter = { urls: WIRE_URLS, types: WIRE_TYPES };

/** Calls back with every request a tab's own page sends to a wire host, body and all. */
export const listenForWire = (onHeard: (captured: Captured) => void): void => {
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

/** Calls back with how each of those requests ended — answered, refused, or never sent. */
export const listenForOutcomes = (onOutcome: (tabId: number, request: string, outcome: Outcome) => void): void => {
  const settle = (details: chrome.webRequest.OnCompletedDetails | chrome.webRequest.OnErrorOccurredDetails): void => {
    if (details.tabId >= 0 && details.frameId === 0) onOutcome(details.tabId, details.requestId, outcomeOf(details));
  };
  chrome.webRequest.onCompleted.addListener(settle, FILTER);
  chrome.webRequest.onErrorOccurred.addListener(settle, FILTER);
};
