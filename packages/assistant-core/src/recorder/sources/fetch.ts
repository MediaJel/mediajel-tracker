/* global RequestInfo, RequestInit */
/* ^ eslint no-undef: DOM lib types used in type positions; the shared config declares no TS-lib globals (same debt tracker-core carries). */
import { guard } from "@mediajel/tracker-core/utils/guard";
import { categorize, isOwnTraffic, peekTrackerEvent } from "@mediajel/assistant-core/recorder/classify";
import { Source } from "@mediajel/assistant-core/recorder/recorder";
import { maskText } from "@mediajel/assistant-core/session/masking";

/**
 * Watches `window.fetch` without consuming it (the snifferBridge contract: every wrapper
 * calls through). Modeled on tracker-core's fetch-source, hardened for a page we don't own:
 * accepts Request objects, reads bodies defensively, and re-wraps itself when the site
 * replaces `fetch` after us (a 1s watchdog — Sentry and GTM both do this).
 */

const TEXT_TYPES = /json|text|x-www-form-urlencoded/i;
const MAX_PARSE_BYTES = 1_000_000;
/** Sources keep their own capture inside the store's clamp so megabyte bodies never transit. */
const CAPTURE_CAP = 4_096;

const bodyToText = async (body: unknown): Promise<string> => {
  if (body == null) return "";
  if (typeof body === "string") return body;
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof FormData) {
    const pairs: string[] = [];
    body.forEach((value, key) => pairs.push(`${key}=${typeof value === "string" ? value : "[file]"}`));
    return pairs.join("&");
  }
  if (body instanceof Blob) return body.type.match(TEXT_TYPES) ? body.text() : `[blob ${body.size}b]`;
  return "[body]";
};

export const fetchSource: Source = ({ page, emit }) => {
  let wrapped: typeof fetch | null = null;
  let disposed = false;

  const wrap = (base: typeof fetch): typeof fetch => {
    const wrapper = async function (this: unknown, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const startedAt = Date.now();
      const request = input instanceof Request ? input : null;
      const url = String(request ? request.url : input);
      const method = (init?.method ?? request?.method ?? "GET").toUpperCase();

      let reqBody = "";
      try {
        reqBody = await bodyToText(init?.body ?? (request && method !== "GET" ? await request.clone().text() : ""));
      } catch {
        reqBody = "[unreadable]";
      }

      const response = await base.call(window, input as RequestInfo, init);

      if (!disposed && !isOwnTraffic(url)) {
        guard(async () => {
          const resType = response.headers.get("content-type") ?? "";
          const length = Number(response.headers.get("content-length") ?? 0);
          let resBody = "";
          if (TEXT_TYPES.test(resType) && length < MAX_PARSE_BYTES) {
            try {
              resBody = (await response.clone().text()).slice(0, CAPTURE_CAP);
            } catch {
              resBody = "[unreadable]";
            }
          }
          const category = categorize(url, page.tag);
          const tracker = category === "tracker" ? peekTrackerEvent(`${url} ${reqBody}`) : null;
          emit(
            {
              kind: "network",
              sub: "fetch",
              method,
              url,
              status: response.status,
              reqType: String(
                init?.headers
                  ? (new Headers(init.headers).get("content-type") ?? "")
                  : (request?.headers.get("content-type") ?? ""),
              ),
              reqBody: maskText(reqBody.slice(0, CAPTURE_CAP)),
              resType,
              resBody: maskText(resBody),
              ms: Date.now() - startedAt,
              category,
              summary:
                category === "tracker"
                  ? `tracker sent ${tracker ?? "an event"}`
                  : `${method} ${url} → ${response.status}`,
            },
            { flush: true, scoreText: `${url} ${reqBody} ${resBody}` },
          );
        }, "fetch-record")();
      }

      return response;
    };
    return wrapper as typeof fetch;
  };

  wrapped = wrap(window.fetch);
  window.fetch = wrapped;

  // The re-wrap watchdog: if the site swapped fetch after us, chain onto the new one. Chain,
  // never loop — the new fetch already calls whatever it wrapped (possibly ours).
  const watchdog = setInterval(
    guard(() => {
      if (disposed || window.fetch === wrapped) return;
      wrapped = wrap(window.fetch);
      window.fetch = wrapped;
    }, "fetch-rewrap"),
    1_000,
  );

  return () => {
    disposed = true;
    clearInterval(watchdog);
    // Unwrapping would break whoever chained onto us after; the wrapper stays but records
    // nothing once disposed. Same trade tracker-core makes.
  };
};
