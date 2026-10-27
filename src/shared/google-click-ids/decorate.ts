/**
 * Link decoration: when a visitor follows a link, add the persisted click ID to it so the next route receives the ad
 * click in its URL, where our tag and Google's tag both read it. Outbound links (another domain, a third-party menu or
 * checkout) are always eligible; links within this site are when carryInUrl is on.
 */
import { ClickIds } from "./click-ids";
import { withinDomain } from "./domain";
import { appendParams, clickIdQuery, hasClickIdParam, lowerCaseKeys } from "./url-params";

export interface PageScope {
  hostname: string;
  /** Domain our cookie is set on; hosts inside it count as this site. */
  cookieDomain: string | null;
  /** Linker mode: decorate outbound links only to these hosts (and their subdomains). */
  onlyHosts?: string[];
  /** Also decorate links within this site, so the click ID carries over to the next route. */
  carryInUrl?: boolean;
  /** The current page URL, so links that only scroll within it are left alone. */
  pageUrl?: string;
}

const MAX_URL_LENGTH = 8000;
// Signed and OAuth URLs break when a parameter is added.
const UNSAFE_QUERY_KEY = /^(x-amz-|x-goog-)|^(signature|sig|hmac|token|redirect_uri)$/;
const ABSOLUTE_HREF = /^(https?:)?\/\//i;

const isSameSite = (target: URL, scope: PageScope): boolean => {
  const host = target.hostname.toLowerCase();
  return host === scope.hostname || withinDomain(host, scope.cookieDomain || scope.hostname);
};

// Same path and query as the current page: following it only scrolls, and adding a parameter would reload the page.
const isSameDocument = (target: URL, pageUrl?: string): boolean => {
  try {
    const page = new URL(pageUrl || "");
    return target.origin === page.origin && target.pathname === page.pathname && target.search === page.search;
  } catch {
    return false;
  }
};

const isEligible = (target: URL, scope: PageScope): boolean => {
  if (target.protocol !== "http:" && target.protocol !== "https:") return false;
  if (isSameSite(target, scope)) return !!scope.carryInUrl && !isSameDocument(target, scope.pageUrl);
  return !scope.onlyHosts || scope.onlyHosts.some((listed) => withinDomain(target.hostname, listed.trim().toLowerCase()));
};

const parse = (resolved: string): URL | null => {
  try {
    return new URL(resolved);
  } catch {
    return null;
  }
};

/**
 * The link's new href with the click IDs added, or null when it should be left alone. The IDs are appended to the
 * href text as written (before any `#fragment`), so relative links stay relative and the site's own query string
 * keeps its exact encoding.
 */
export const decorateHref = (raw: string, resolved: string, ids: ClickIds, scope: PageScope): string | null => {
  const addition = clickIdQuery(ids);
  const href = raw.trim();
  const target = parse(resolved);
  if (!addition || !href || href.charAt(0) === "#" || !target || !isEligible(target, scope)) return null;
  if (hasClickIdParam(target) || lowerCaseKeys(target).some((key) => UNSAFE_QUERY_KEY.test(key))) return null;

  // A relative href is kept as written when it stays on this site; one that resolves elsewhere (a <base>) is not.
  const base = ABSOLUTE_HREF.test(href) || isSameSite(target, scope) ? href : resolved;
  const decorated = appendParams(base, addition);
  return decorated.length > MAX_URL_LENGTH ? null : decorated;
};
