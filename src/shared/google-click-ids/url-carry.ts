/**
 * Keeps the persisted click in the address bar of every next route: on load, and after every SPA route change
 * (pushState / replaceState / back-forward / hash change). The site's own history calls run first with their
 * arguments untouched; afterwards, if the URL has no click ID, it is appended with the native replaceState, passing
 * history.state through unchanged so routers (Next.js, React Router, …) keep their state.
 */
import { ClickIds } from "./click-ids";
import { appendParams, clickIdQuery, hasClickIdParam } from "./url-params";

const NAVIGATION_METHODS: ("pushState" | "replaceState")[] = ["pushState", "replaceState"];

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

export const keepClickIdsInUrl = (win: Window, getIds: () => ClickIds | null): void => {
  const history = win.history;
  // Captured before wrapping: our own update must not run through the wrappers, or every sync would trigger another.
  const nativeReplaceState = history.replaceState;
  const sync = (): void => {
    try {
      const next = urlWithClickIds(win.location.href, getIds());
      if (next) nativeReplaceState.call(history, history.state, "", next);
    } catch {
      // never let this interfere with the site's navigation
    }
  };

  NAVIGATION_METHODS.forEach((method) => {
    const original = history[method];
    history[method] = function (this: History, ...args: Parameters<History["pushState"]>) {
      const result = original.apply(this, args);
      sync();
      return result;
    };
  });
  win.addEventListener("popstate", sync);
  win.addEventListener("hashchange", sync);
  sync();
};
