/**
 * Which iframes on the page may receive the click IDs: frames on this site, on a host the tag lists in
 * crossDomainSites, or on a menu/checkout platform clients embed in their stores. An ad or widget frame elsewhere on
 * the page that merely asks gets nothing.
 */
import { withinDomain } from "./domain";

// Embedded menus and checkouts that run our tag inside clients' stores, where many of their purchases happen.
const MENU_PLATFORMS = ["dutchie.com", "dispenseapp.com", "sweedpos.com"];

export const frameOriginAllowed = (origin: string, site: string, listed: string[]): boolean => {
  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }
  return [site].concat(listed, MENU_PLATFORMS).some((domain) => !!domain && withinDomain(host, domain));
};
