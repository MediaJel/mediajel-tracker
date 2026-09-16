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

/**
 * Which build of this wire a message was written for. Bump it whenever a message's shape changes.
 *
 * More than one copy of the assistant can share a page — an older build still installed beside
 * this one, or a tab that outlived an update — and every copy's page-bridge answers every relay on
 * the window. Unversioned, a status from a bridge that predates `tags` blanked the panel, and one
 * whose detection predates delayed tags answered "No MediaJel tag" over this build's answer.
 * A message written for another version of the wire is not this build's to read.
 */
const WIRE_VERSION = 2;

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
  v: number;
  payload: T;
}

export const wrap = <T>(direction: Direction, payload: T): Envelope<T> => ({
  [ENVELOPE]: direction,
  v: WIRE_VERSION,
  payload,
});

/** Whether a message is this build's, travelling this way. */
const isOurs = (data: unknown, direction: Direction): data is Envelope<unknown> =>
  !!data &&
  typeof data === "object" &&
  (data as Partial<Envelope<unknown>>)[ENVELOPE] === direction &&
  (data as Partial<Envelope<unknown>>).v === WIRE_VERSION;

/** Reads a payload off a MessageEvent, or null when it is not ours, not our direction, or another build's. */
export const unwrap = <T>(event: MessageEvent, direction: Direction): T | null => {
  if (event.source !== window || !isOurs(event.data, direction)) return null;
  return (event.data.payload ?? null) as T | null;
};
