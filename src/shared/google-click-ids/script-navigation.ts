/**
 * Carries the click on navigations a page starts from script, the way link decoration does for links a visitor
 * follows, and with the same rules for which URLs change:
 *   - window.open(url), in every browser;
 *   - location.href = … and location.assign/replace(…), through the Navigation API where the browser has it (Chromium;
 *     Safari 26 and later): the navigation is cancelled and redone with the click added.
 * Link clicks (decorated when clicked), form posts, downloads, back/forward, reloads and changes within the page are
 * left alone, and a failure here never stops the navigation.
 */
import { ClickIds } from "./click-ids";
import { decorateHref, PageScope } from "./decorate";

interface NavigateEvent {
  cancelable: boolean;
  userInitiated: boolean;
  sourceElement?: Element | null;
  formData: unknown;
  downloadRequest: string | null;
  hashChange: boolean;
  navigationType: string;
  destination: { url: string; sameDocument: boolean };
  preventDefault: () => void;
}

const withClick = (url: string, win: Window, ids: ClickIds | null, scope: PageScope): string | null => {
  if (!ids) return null;
  const page = win.location.href;
  return decorateHref(url, new URL(url, page).href, ids, { ...scope, pageUrl: page });
};

const decorateWindowOpen = (win: Window, getIds: () => ClickIds | null, scope: PageScope): void => {
  const open = win.open;
  if (typeof open !== "function") return;
  win.open = function (this: Window, ...args: Parameters<Window["open"]>) {
    try {
      const decorated = args[0] ? withClick(String(args[0]), win, getIds(), scope) : null;
      if (decorated) args[0] = decorated;
    } catch {
      // never get in the way of the popup
    }
    return open.apply(this, args);
  };
};

// A link or form element started it (the link rules already decided). Browsers that report the element say so
// directly; Safari also marks a script navigation inside a click handler as user-initiated, so that flag is only the
// fallback where sourceElement isn't reported.
const startedByElement = (event: NavigateEvent): boolean =>
  "sourceElement" in event ? !!event.sourceElement : event.userInitiated;

// Started by the page's script, leaving the page, and redoable.
const isScriptNavigation = (event: NavigateEvent): boolean =>
  event.cancelable &&
  !startedByElement(event) &&
  !event.formData &&
  !event.downloadRequest &&
  !event.hashChange &&
  !event.destination.sameDocument &&
  (event.navigationType === "push" || event.navigationType === "replace");

const redoScriptNavigations = (win: Window, getIds: () => ClickIds | null, scope: PageScope): void => {
  const navigation = win.navigation;
  if (!navigation || typeof navigation.addEventListener !== "function") return;
  navigation.addEventListener("navigate", (event: NavigateEvent) => {
    let decorated: string | null = null;
    try {
      decorated = isScriptNavigation(event) ? withClick(event.destination.url, win, getIds(), scope) : null;
    } catch {
      decorated = null;
    }
    if (!decorated) return;
    event.preventDefault();
    const go = (url: string) => (event.navigationType === "replace" ? win.location.replace(url) : win.location.assign(url));
    try {
      go(decorated);
    } catch {
      go(event.destination.url);
    }
  });
};

export const decorateScriptNavigations = (win: Window, getIds: () => ClickIds | null, scope: PageScope): void => {
  decorateWindowOpen(win, getIds, scope);
  redoScriptNavigations(win, getIds, scope);
};
