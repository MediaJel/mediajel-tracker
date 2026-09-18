/* global RequestInfo, RequestInit */
import { guard } from "@mediajel/tracker-core/utils/guard";
import { pollForElement } from "@mediajel/tracker-core/sources/utils/poll-for-element";
import { tryParseJSONObject } from "@mediajel/tracker-core/utils/try-parse-json";
import { VerifyInterceptor } from "@mediajel/assistant-core/verify/interceptor";

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

  /** Patches push only — unlike `datalayerSource`, the real helper does NOT replay. */
  const ecommDatalayerSource = (callback: (data: unknown) => void, contextWindow: Window = window): void => {
    const layer = ((contextWindow as Window & { dataLayer?: unknown[] }).dataLayer ?? []) as unknown[];
    if (typeof layer.push !== "function") return;
    const originalPush = layer.push.bind(layer);
    layer.push = ((...items: unknown[]): number => {
      const result = originalPush(...items);
      guard(() => callback(layer[layer.length - 1]), "verify-ecomm-datalayer")();
      return result;
    }) as typeof layer.push;
  };

  /** The request side of XHR: the body as it was sent, on every readystatechange. */
  const xhrRequestSource = (callback: (body: unknown) => void): void => {
    const send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, body?: unknown) {
      this.addEventListener(
        "readystatechange",
        guard(() => callback(body), "verify-xhr-request"),
      );
      return (send as (...a: unknown[]) => unknown).call(this, body);
    } as typeof XMLHttpRequest.prototype.send;
  };

  /**
   * Route gate for client-routed checkouts. `timer` is declared before `check` runs, which the
   * library version is not: there, an immediate match reaches `clearInterval(timer)` inside the
   * const's temporal dead zone and throws — on exactly the thank-you page it exists to catch.
   */
  const waitForUrlSubstring = (callback: () => void, urlSubstring = "/thank-you", intervalMs = 500): void => {
    let timer: number | undefined;
    const check = guard(() => {
      if (!window.location.href.includes(urlSubstring)) return;
      if (timer !== undefined) window.clearInterval(timer);
      callback();
    }, "verify-url-detector");
    check();
    timer = window.setInterval(check, intervalMs);
  };

  /**
   * The three below are deliberately INERT. A verify run is a rehearsal, on the operator's own
   * browser, of a tag that has not been approved yet — and these are the helpers that leave the
   * page. Letting them fire would put real conversions in an ad network's reporting for an
   * order that was already counted, from a tag nobody has agreed to ship. The generated file
   * still runs, and the URL it would have requested is left on the element to be inspected.
   */
  const createImagePixel = (url: string): HTMLImageElement => {
    const pixel = document.createElement("img");
    pixel.dataset.mjVerifyPixel = url;
    pixel.width = 1;
    pixel.height = 1;
    pixel.style.position = "absolute";
    pixel.style.left = "-9999px";
    return pixel;
  };

  const createScript = (id: string, attributes: Record<string, string> = {}): HTMLScriptElement => {
    const script = document.createElement("script");
    script.id = id;
    for (const [key, value] of Object.entries(attributes)) {
      if (key === "src") script.dataset.mjVerifySrc = value;
      else script.setAttribute(key, value);
    }
    return script;
  };

  const getBeacons = async (): Promise<void> => {};

  /** Writes cookies and storage that outlive the rehearsal, so it does nothing here. */
  const createUTMPersistor = (): void => {};

  return {
    "../libs/utils/is-trackTrans-loaded": {
      // The interceptor put a callable on window.trackTrans before this runs.
      isTrackTransLoaded: (callback: () => void) => guard(callback, "verify-tracktrans-ready")(),
    },
    "../libs/utils/is-tracker-loaded": {
      isTrackerLoaded: (callback: () => void) => guard(callback, "verify-tracker-ready")(),
    },
    "../libs/sources/google-datalayer-source": { datalayerSource },
    "../libs/sources/ecomm-datalayer-source": { ecommDatalayerSource },
    "../libs/sources/poll-for-element": { pollForElement },
    "../libs/sources/xhr-response-source": { xhrResponseSource },
    "../libs/sources/xhr-request-source": { xhrRequestSource },
    // Both spellings resolve to the same function, because the library exports it both ways.
    "../libs/sources/fetch-source": { fetchSource, default: fetchSource },
    "../libs/sources/post-message-source": { postMessageSource },
    "../libs/sources/get-beacons": { getBeacons },
    "../libs/utils/url-detector": { waitForUrlSubstring },
    "../libs/utils/create-image-pixel": { createImagePixel },
    "../libs/utils/create-script-pixel": { createScript },
    "../libs/utils/persist-utm": { createUTMPersistor },
    "../libs/utils/sha256-encode": { sha256 },
    "../libs/utils/tryParseJSONObject": { tryParseJSONObject },
  };
};
