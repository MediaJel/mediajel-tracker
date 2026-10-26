/**
 * Frame bridge: our tag running inside an embedded menu or checkout (a cross-origin iframe, whose storage is
 * separate from the page's) asks the page around it for the click IDs our tag persisted there.
 *
 * Messages are JSON strings with a fixed `{"mjcid":1,` prefix, never objects, so the site's other `message`
 * listeners (several read `event.data` without checks) see an ordinary string. The page answers only its own
 * descendant frames, only from allowed origins (this site, or a host the tag lists in crossDomainSites — never an
 * ad or widget frame that merely asks), only for the same tag (appId), only to the requesting origin, and only with
 * the click IDs. The frame accepts answers only from its parent or top window.
 */
import { CLICK_ID_NAMES, ClickIdSet, toClickIdSet } from "./click-ids";

const PREFIX = '{"mjcid":1,';
const RETRY_DELAYS_MS = [0, 1000, 3000, 7000];
const MAX_FRAME_DEPTH = 3;

export type BridgeMessage = { t: "req"; appId: string } | { t: "ids"; appId: string; set: ClickIdSet };

export interface BridgeDeps {
  win: Window;
  appId: string;
  /** Click IDs this page may share right now (null when there are none or privacy blocks it). */
  current: () => ClickIdSet | null;
  /** Keep IDs received from the parent page. */
  offer: (set: ClickIdSet) => void;
  schedule: (fn: () => void, ms: number) => void;
  /** Frame origins this page may share click IDs with. */
  allowedOrigin: (origin: string) => boolean;
}

const encodeRequest = (appId: string): string => JSON.stringify({ mjcid: 1, t: "req", appId });

const encodeReply = (appId: string, set: ClickIdSet): string => {
  const ids: Record<string, string> = {};
  CLICK_ID_NAMES.forEach((name) => {
    if (set.ids[name]) ids[name] = set.ids[name] as string;
  });
  return JSON.stringify({ mjcid: 1, t: "ids", appId, ids, ts: set.ts });
};

export const decodeBridgeMessage = (data: unknown): BridgeMessage | null => {
  if (typeof data !== "string" || data.indexOf(PREFIX) !== 0) return null;
  let message: any;
  try {
    message = JSON.parse(data);
  } catch {
    return null;
  }
  if (!message || typeof message.appId !== "string" || !message.appId) return null;
  if (message.t === "req") return { t: "req", appId: message.appId };
  if (message.t !== "ids" || !message.ids || typeof message.ids !== "object") return null;
  const set = toClickIdSet(message.ids, message.ts);
  return set ? { t: "ids", appId: message.appId, set } : null;
};

const isDescendant = (source: unknown, win: any, depth: number): boolean => {
  if (!source) return false;
  try {
    for (let i = 0; i < win.frames.length; i++) {
      if (win.frames[i] === source || (depth > 1 && isDescendant(source, win.frames[i], depth - 1))) return true;
    }
  } catch {
    // a frame refused access: treat as not ours
  }
  return false;
};

const acceptsOrigin = (origin: string, win: Window): boolean =>
  origin !== "null" && (origin.indexOf("https://") === 0 || win.location.protocol === "http:");

export const startFrameBridge = ({ win, appId, current, offer, schedule, allowedOrigin }: BridgeDeps): void => {
  const framed = !!win.parent && win.parent !== win;
  let answered = false;

  // Page side: share the IDs with one of our own frames from an allowed origin, at that origin only.
  const answerRequest = (event: MessageEvent): void => {
    if (!acceptsOrigin(event.origin, win) || !allowedOrigin(event.origin)) return;
    if (!isDescendant(event.source, win, MAX_FRAME_DEPTH)) return;
    const set = current();
    if (set) (event.source as Window).postMessage(encodeReply(appId, set), event.origin);
  };

  // Frame side: keep IDs only when they come from the page around us.
  const acceptReply = (event: MessageEvent, set: ClickIdSet): void => {
    if (!framed || (event.source !== win.parent && event.source !== win.top)) return;
    answered = true;
    offer(set);
  };

  const onMessage = (event: MessageEvent): void => {
    const message = decodeBridgeMessage(event.data);
    if (!message || message.appId !== appId) return;
    if (message.t === "req") answerRequest(event);
    else acceptReply(event, message.set);
  };

  win.addEventListener("message", (event: MessageEvent) => {
    try {
      onMessage(event);
    } catch {
      // never let a message break the host page
    }
  });

  if (!framed) return;
  const ask = () => {
    if (answered) return;
    try {
      win.parent.postMessage(encodeRequest(appId), "*");
      if (win.top && win.top !== win.parent) win.top.postMessage(encodeRequest(appId), "*");
    } catch {
      // the parent is gone or refused the message
    }
  };
  RETRY_DELAYS_MS.forEach((ms) => schedule(ask, ms));
};
