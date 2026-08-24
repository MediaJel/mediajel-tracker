import type { TrackerStatus } from "@mediajel/assistant-core/recorder/context";
import type { TimelineEvent, VerifyCapture, WidgetPage } from "@mediajel/assistant-core/types";

/**
 * The wire between three realms.
 *
 * The recorder has to run in the page's OWN world — it patches `window.fetch`,
 * `XMLHttpRequest.prototype`, `history.pushState` and reads `window.dataLayer`, none of which
 * a content script's isolated world can see. Code in the main world has no `chrome.*` at all,
 * so it can only speak `window.postMessage`. That gives us three hops:
 *
 *     page-bridge (MAIN)  ──postMessage──▶  relay (ISOLATED)  ──port──▶  background  ──▶  panel
 *
 * Every message on the postMessage hop carries an `__mj` key. That is a label, not a secret,
 * and it is deliberately not treated as one: anything in the page can read and forge anything
 * in the page's own realm, so a nonce here would buy nothing but the appearance of a boundary.
 * What actually holds is that no message on this channel can make the extension act on the
 * page's behalf — every `BridgeUp` is recorded evidence, which the panel renders as data, and
 * a page that wanted to lie about its own behaviour could simply behave that way instead.
 *
 * The key doubles as the filter the recorder's postMessage source already applies: it skips
 * `__mj`-keyed messages, so the bridge never records its own chatter.
 */

export const ENVELOPE = "__mj" as const;

/** What the page-bridge sends up. */
export type BridgeUp =
  | { type: "ready" }
  | { type: "event"; event: TimelineEvent; flush?: boolean }
  | { type: "page"; page: WidgetPage }
  | { type: "status"; status: TrackerStatus }
  | { type: "verify-result"; ok: boolean; errors: string[] }
  | { type: "verify-capture"; capture: VerifyCapture }
  | { type: "dedup-cleared"; count: number };

/** What the background sends down. */
export type BridgeDown =
  | { type: "start-recording"; startedAt: number }
  | { type: "stop-recording" }
  | { type: "snapshot" }
  | { type: "verify"; code: string }
  | { type: "inject-tag"; url: string }
  | { type: "clear-dedup"; appId: string };

/** Which way a message is travelling, so the two listeners on one window never cross. */
export type Direction = "up" | "down";

export interface Envelope<T> {
  [ENVELOPE]: Direction;
  payload: T;
}

export const wrap = <T>(direction: Direction, payload: T): Envelope<T> => ({ [ENVELOPE]: direction, payload });

/** Reads a payload off a MessageEvent, or null when it is not ours or not our direction. */
export const unwrap = <T>(event: MessageEvent, direction: Direction): T | null => {
  if (event.source !== window) return null;
  const data = event.data as Partial<Envelope<T>> | null;
  if (!data || typeof data !== "object" || data[ENVELOPE] !== direction) return null;
  return (data.payload ?? null) as T | null;
};
