/**
 * Makes sure Google's tag (gtag.js) runs for a Google Ads conversion ID, without disturbing a Google tag the site
 * already has: an existing gtag() is kept, gtag.js is added only when nothing on the page already serves
 * window.dataLayer, and the 'js' start command is sent only for a gtag.js we add ourselves into a dataLayer nothing
 * has started (a second gtm.js/js start can re-fire GTM page-view triggers). While consent mode denies ad_storage we add no
 * gtag.js (sites using consent mode's basic setup hold Google tags until consent); our commands stay queued in the
 * dataLayer for a Google tag the site loads after consent.
 */
import { adStorageDenied } from "src/shared/utils/privacy-signals";

const GTAG_PATH = "googletagmanager.com/gtag/js";

// A gtag.js loaded with `l=<name>` reads a renamed dataLayer and won't see our commands.
const servesDefaultDataLayer = (src: string): boolean => src.indexOf(GTAG_PATH) !== -1 && !/[?&]l=/.test(src);

const hasStarted = (dataLayer: any[]): boolean =>
  dataLayer.some((entry) => !!entry && (entry[0] === "js" || entry.event === "gtm.js"));

/**
 * Returns false (and changes nothing) when the page's dataLayer isn't an array we can safely push to.
 * `linkerDomains` (the tag's crossDomainSites) are set on Google's linker before the config command.
 */
export const ensureGtag = (win: any, doc: Document, conversionId: string, linkerDomains: string[] = []): boolean => {
  if (win.dataLayer === undefined) win.dataLayer = [];
  if (!Array.isArray(win.dataLayer)) return false;

  let created = false;
  if (typeof win.gtag !== "function") {
    win.gtag = function gtag() {
      // gtag.js only processes Arguments objects, not arrays, so this must push `arguments` itself
      win.dataLayer.push(arguments);
    };
    created = true;
  }

  const alreadyLoaded =
    (win.google_tag_manager && win.google_tag_manager[conversionId]) ||
    Array.prototype.some.call(doc.getElementsByTagName("script"), (script: HTMLScriptElement) =>
      servesDefaultDataLayer(script.src || ""),
    );
  const loadOurs = !alreadyLoaded && !adStorageDenied(win.dataLayer);
  if (loadOurs) {
    const script = doc.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(conversionId)}`;
    (doc.head || doc.documentElement).appendChild(script);
  }

  if (created && loadOurs && !hasStarted(win.dataLayer)) win.gtag("js", new Date());
  if (linkerDomains.length > 0) win.gtag("set", "linker", { domains: linkerDomains });
  win.gtag("config", conversionId);
  return true;
};
