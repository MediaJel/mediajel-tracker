/**
 * Privacy signals that gate Google Ads features (the plugin's gtag.js loading and conversions, and click-ID
 * persistence). Read them at every use, so a later consent update applies.
 */

const isArrayLike = (value: unknown): value is ArrayLike<unknown> =>
  !!value && typeof value === "object" && typeof (value as ArrayLike<unknown>).length === "number";

/**
 * Whether Google consent mode currently denies ad storage on this page, from the site's own `gtag('consent', …)`
 * commands in `window.dataLayer`. The latest default/update wins; region-scoped defaults count too (strictest
 * reading). No consent commands at all means the site doesn't use consent mode.
 */
export const adStorageDenied = (dataLayer: unknown): boolean => {
  if (!Array.isArray(dataLayer)) return false;
  let latest: unknown = null;
  dataLayer.forEach((entry) => {
    if (!isArrayLike(entry) || entry[0] !== "consent" || (entry[1] !== "default" && entry[1] !== "update")) return;
    const settings = entry[2] as { ad_storage?: unknown } | null | undefined;
    if (settings && (settings.ad_storage === "granted" || settings.ad_storage === "denied")) {
      latest = settings.ad_storage;
    }
  });
  return latest === "denied";
};

/** The browser's Global Privacy Control signal (navigator.globalPrivacyControl; not in TypeScript's DOM types). */
export const gpcEnabled = (nav: unknown): boolean =>
  !!nav && (nav as { globalPrivacyControl?: unknown }).globalPrivacyControl === true;
