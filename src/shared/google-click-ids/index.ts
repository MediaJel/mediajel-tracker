/**
 * Google Ads click-ID persistence.
 *
 * When any MediaJel tag sees a Google Ads click ID (gclid / gbraid / wbraid) it keeps it, first-party, for Google's
 * 90-day click window, and carries it to every next route through to checkout:
 *   - in the URL: kept in the address bar after every route change, and added to same-site links when followed;
 *   - across pages and subdomains: a cookie on the site's root domain (+ localStorage);
 *   - across domains: added to outbound links at the moment a visitor follows them;
 *   - into embedded menus/checkouts running our tag in an iframe: handed over by postMessage;
 *   - to Google: before our Google Ads conversion fires, Google's own click cookie is restored if it is missing.
 *
 * On by default for every website tag. Tag params: clickIds=false (off), carryInUrl=false (keep it out of URLs on
 * this site), decorateLinks=false|linker (no link decoration, or outbound only to the crossDomainSites hosts),
 * seedGoogleCookie=false (never write Google's cookies). Global Privacy Control turns it off and clears what we
 * stored; consent mode denying ad_storage stops all reads, writes and sharing.
 */
import logger from "src/shared/logger";
import { QueryStringContext } from "src/shared/types";
import { adStorageDenied, gpcEnabled } from "src/shared/utils/privacy-signals";

import { ClickIdSet, clickIdsFromUrl, pickLatest } from "./click-ids";
import { buildCookie, readCookie } from "./cookies";
import { PageScope } from "./decorate";
import { startFrameBridge } from "./frame-bridge";
import { installLinkDecoration } from "./link-listener";
import { discoverCookieDomain } from "./root-domain";
import { createClickIdStore } from "./store";
import { keepClickIdsInUrl } from "./url-carry";
import { withinDomain } from "./url-params";

export interface ClickIdRuntime {
  /** The click to use right now, or null when there is none or privacy blocks it. */
  current: () => ClickIdSet | null;
  /** Makes the click visible to Google's tag before a conversion fires; returns the cookies written. */
  prepareConversion: () => string[];
}

const PROBE_COOKIE = "_mj_gcl_probe";

const isFramed = (win: Window): boolean => {
  try {
    return win.self !== win.top;
  } catch {
    return true;
  }
};

const storageOf = (win: Window): Storage | null => {
  try {
    return win.localStorage;
  } catch {
    return null;
  }
};

// The URL the page was loaded with, even if an SPA has since rewritten the address bar.
const navigationUrl = (win: Window): string => {
  try {
    const entries = win.performance.getEntriesByType("navigation");
    return entries.length ? entries[0].name : "";
  } catch {
    return "";
  }
};

const cookieAccepted = (doc: Document, domain: string, secure: boolean): boolean => {
  const options = { domain, secure, framed: false };
  doc.cookie = buildCookie(PROBE_COOKIE, "1", { ...options, maxAge: 10 });
  const accepted = readCookie(doc.cookie, PROBE_COOKIE) === "1";
  if (accepted) doc.cookie = buildCookie(PROBE_COOKIE, "", { ...options, maxAge: 0 });
  return accepted;
};

const listedHosts = (context: QueryStringContext): string[] =>
  (context.crossDomainSites || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

const scopeFor = (context: QueryStringContext, win: Window, cookieDomain: string | null): PageScope => ({
  hostname: win.location.hostname,
  cookieDomain,
  carryInUrl: context.carryInUrl !== "false",
  onlyHosts: context.decorateLinks === "linker" ? listedHosts(context) : undefined,
});

// Frames on this site, or on a host the tag lists in crossDomainSites, may receive the click IDs; an ad or widget
// frame elsewhere on the page that merely asks does not.
const frameOriginAllowed = (origin: string, site: string, listed: string[]): boolean => {
  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }
  return withinDomain(host, site) || listed.some((listedHost) => withinDomain(host, listedHost));
};

export const createClickIdRuntime = (
  context: QueryStringContext,
  win: Window,
  nowSec: () => number = () => Math.floor(Date.now() / 1000),
): ClickIdRuntime | null => {
  if (context.event === "impression" || context.clickIds === "false") return null;

  const doc = win.document;
  const secure = win.location.protocol === "https:";
  const framed = isFramed(win);
  const cookieDomain = framed
    ? null
    : discoverCookieDomain(win.location.hostname, (domain) => cookieAccepted(doc, domain, secure));
  const store = createClickIdStore({
    getCookies: () => doc.cookie,
    setCookie: (cookie) => {
      doc.cookie = cookie;
    },
    storage: storageOf(win),
    cookieDomain,
    secure,
    framed,
    nowSec,
  });

  if (gpcEnabled(win.navigator)) {
    store.clear();
    return null;
  }

  const blocked = () => gpcEnabled(win.navigator) || adStorageDenied((win as any).dataLayer);
  const onPage = (): (ClickIdSet | null)[] => [
    clickIdsFromUrl(win.location.href, nowSec()),
    clickIdsFromUrl(navigationUrl(win), nowSec()),
  ];
  const current = (): ClickIdSet | null => (blocked() ? null : pickLatest(onPage().concat(store.load()), nowSec()));
  const capture = (received: ClickIdSet | null = null): ClickIdSet | null => {
    if (blocked()) return null;
    const set = pickLatest(onPage().concat(received, store.load()), nowSec());
    if (set) store.save(set);
    return set;
  };

  capture();
  const currentIds = () => {
    const set = current();
    return set ? set.ids : null;
  };
  if (context.decorateLinks !== "false") installLinkDecoration(doc, currentIds, scopeFor(context, win, cookieDomain));
  if (context.carryInUrl !== "false") keepClickIdsInUrl(win, currentIds);
  startFrameBridge({
    win,
    appId: context.appId,
    current,
    offer: (set) => {
      capture(set);
    },
    schedule: (fn, ms) => {
      win.setTimeout(fn, ms);
    },
    allowedOrigin: (origin) => frameOriginAllowed(origin, cookieDomain || win.location.hostname, listedHosts(context)),
  });

  return {
    current,
    prepareConversion: () => {
      if (context.seedGoogleCookie === "false") return [];
      // Restored whenever Google's own cookie is missing: a click carried in the URL doesn't mean gtag processed it.
      const set = capture();
      return set ? store.seedGoogle(set) : [];
    },
  };
};

let active: ClickIdRuntime | null = null;
let started = false;

/** Starts persistence for this tag instance (once). Never throws into the host page. */
export const startClickIds = (context: QueryStringContext): void => {
  if (started) return;
  started = true;
  try {
    active = createClickIdRuntime(context, window);
  } catch (error) {
    logger.warn("Google click ID persistence could not start", error);
  }
};

/** Called by the Google Ads extension right before it fires a conversion. */
export const prepareGoogleConversion = (): string[] => {
  try {
    return active ? active.prepareConversion() : [];
  } catch (error) {
    logger.warn("Google click ID could not be prepared for the conversion", error);
    return [];
  }
};
