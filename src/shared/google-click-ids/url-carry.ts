/**
 * Keeps the persisted click in the address bar of every next route, always as a search parameter (`?gclid=…`): once
 * the page has loaded, and after every SPA route change (pushState / replaceState / back-forward / hash change).
 * - The site's own history calls run first with their arguments untouched, and its code sees exactly the URL it set:
 *   our update follows once its URL changes settle, so a burst of changes gets a single update from us.
 * - The update goes to the browser's own History.prototype.replaceState, so a script that hooked history before us
 *   (GA4 page-change tracking, Tag Manager history triggers, session recorders) doesn't see it as a new page.
 * - At most 20 updates in any 30 seconds, well inside Safari's limit of about 100 history calls per 30 seconds.
 * history.state passes through unchanged, so routers (Next.js, React Router, …) keep their state.
 */
import { ClickIds } from "./click-ids";
import { appendParams, clickIdQuery, hasClickIdParam } from "./url-params";

const NAVIGATION_METHODS: ("pushState" | "replaceState")[] = ["pushState", "replaceState"];
const SETTLE_MS = 200;
const MAX_UPDATES = 20;
const UPDATE_WINDOW_MS = 30 * 1000;

/** `href` with the click IDs appended, or null when it already holds a click ID (a new click) or there is none. */
export const urlWithClickIds = (href: string, ids: ClickIds | null): string | null => {
  const addition = clickIdQuery(ids);
  if (!addition) return null;
  try {
    if (hasClickIdParam(new URL(href))) return null;
  } catch {
    return null;
  }
  return appendParams(href, addition);
};

// The browser's own method, which a script that hooked history on the page (or our wrapper below) can't intercept.
const browserReplaceState = (history: History): History["replaceState"] => {
  const proto = Object.getPrototypeOf(history);
  return proto && typeof proto.replaceState === "function" ? proto.replaceState : history.replaceState;
};

// Allows at most `max` calls in any `windowMs`.
const rateLimit = (max: number, windowMs: number, now: () => number) => {
  let recent: number[] = [];
  return (): boolean => {
    const at = now();
    recent = recent.filter((earlier) => at - earlier < windowMs);
    if (recent.length >= max) return false;
    recent.push(at);
    return true;
  };
};

export const keepClickIdsInUrl = (
  win: Window,
  getIds: () => ClickIds | null,
  now: () => number = () => Date.now(),
): void => {
  const history = win.history;
  const replaceState = browserReplaceState(history);
  const allowed = rateLimit(MAX_UPDATES, UPDATE_WINDOW_MS, now);
  const update = (): void => {
    try {
      const next = urlWithClickIds(win.location.href, getIds());
      if (next && allowed()) replaceState.call(history, history.state, "", next);
    } catch {
      // never let this interfere with the site's navigation
    }
  };
  let timer: number | undefined;
  const schedule = (): void => {
    try {
      win.clearTimeout(timer);
      timer = win.setTimeout(update, SETTLE_MS);
    } catch {
      // never let this interfere with the site's navigation
    }
  };

  NAVIGATION_METHODS.forEach((method) => {
    const original = history[method];
    history[method] = function (this: History, ...args: Parameters<History["pushState"]>) {
      const result = original.apply(this, args);
      schedule();
      return result;
    };
  });
  win.addEventListener("popstate", schedule);
  win.addEventListener("hashchange", schedule);
  // A framework hydrating the page sets its router up from the URL it was served; the first update waits for the
  // page to finish loading so it never lands in the middle of that.
  if (win.document.readyState === "complete") schedule();
  else win.addEventListener("load", schedule);
};
