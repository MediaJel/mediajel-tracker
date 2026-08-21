/* global RequestInfo, RequestInit */
import { guard } from "@mediajel/tracker-core/utils/guard";
import { pollForElement } from "@mediajel/tracker-core/sources/utils/poll-for-element";
import { tryParseJSONObject } from "@mediajel/tracker-core/utils/try-parse-json";
import { VerifyInterceptor } from "@mediajel/tracker-widget/verify/interceptor";

/**
 * Widget-side implementations of the frictionless helpers, keyed by the exact import
 * specifiers the generated file used. Behavior mirrors the real library:
 * `isTrackTransLoaded` resolves immediately (the interceptor guarantees the function
 * exists, tracker or no tracker), `datalayerSource` REPLAYS existing entries before
 * patching push — with the interceptor told when a call originates from replay, so the
 * UI can label "fired from an entry that was already there" honestly.
 */

type Shims = Record<string, Record<string, unknown>>;

export const buildShims = (interceptor: VerifyInterceptor): Shims => {
  const sha256 = async (value: string): Promise<string> => {
    const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  };

  const datalayerSource = (
    callback: (data: unknown) => void,
    layer: unknown[] = (window.dataLayer as unknown[]) || [],
  ): void => {
    if (!layer || typeof layer.push !== "function") return;
    interceptor.setReplaying(true);
    try {
      for (const entry of layer) guard(() => callback(entry), "verify-datalayer-replay")();
    } finally {
      interceptor.setReplaying(false);
    }
    const originalPush = layer.push.bind(layer);
    layer.push = ((...items: unknown[]): number => {
      const result = originalPush(...items);
      for (const item of items) guard(() => callback(item), "verify-datalayer-live")();
      return result;
    }) as typeof layer.push;
  };

  const xhrResponseSource = (callback: (xhr: XMLHttpRequest) => void): void => {
    const open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: unknown[]) {
      this.addEventListener(
        "load",
        guard(() => callback(this), "verify-xhr"),
      );
      return (open as (...a: unknown[]) => unknown).apply(this, args);
    } as typeof XMLHttpRequest.prototype.open;
  };

  const fetchSource = (
    requestCallback: (input: unknown, init?: unknown) => void,
    responseCallback: (response: Response, body: unknown) => void,
  ): void => {
    const original = window.fetch;
    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      guard(() => requestCallback(input, init), "verify-fetch-req")();
      const response = await original.call(window, input, init);
      guard(async () => {
        try {
          const clone = response.clone();
          const type = clone.headers.get("content-type") ?? "";
          const body = /json/.test(type) ? await clone.json() : await clone.text();
          responseCallback(response, body);
        } catch {
          responseCallback(response, undefined);
        }
      }, "verify-fetch-res")();
      return response;
    }) as typeof fetch;
  };

  const postMessageSource = (callback: (event: MessageEvent) => void): void => {
    window.addEventListener("message", guard(callback, "verify-postmessage"));
  };

  return {
    "../libs/utils/is-trackTrans-loaded": {
      // The interceptor put a callable on window.trackTrans before this runs.
      isTrackTransLoaded: (callback: () => void) => guard(callback, "verify-tracktrans-ready")(),
    },
    "../libs/utils/is-tracker-loaded": {
      isTrackerLoaded: (callback: () => void) => guard(callback, "verify-tracker-ready")(),
    },
    "../libs/sources/google-datalayer-source": { datalayerSource },
    "../libs/sources/poll-for-element": { pollForElement },
    "../libs/sources/xhr-response-source": { xhrResponseSource },
    "../libs/sources/fetch-source": { fetchSource },
    "../libs/sources/post-message-source": { postMessageSource },
    "../libs/utils/sha256-encode": { sha256 },
    "../libs/utils/tryParseJSONObject": { tryParseJSONObject },
  };
};
