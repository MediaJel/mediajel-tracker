import logger from "@mediajel/tracker-core/logger";

/**
 * Page URL / referrer the host page hands the tag when the tag can't read them itself.
 *
 * Why: a Shopify custom pixel runs our tag inside a sandboxed iframe, so window.location is the
 * sandbox document (https://<store>/web-pixels@<hash>/custom/web-pixel-<id>@<n>/sandbox/modern/)
 * and every page view, page ping and link click collapses to that one URL. The pixel reads the real
 * URL from Shopify's event.context.document and passes it as `pageUrl` / `referrer` on the script
 * URL (or via window.overrides). See packages/tracker-environments/docs/shopify-custom-pixel.md.
 */
export interface PageContextInput {
  pageUrl?: string;
  referrer?: string;
}

/** Shopify serves custom pixels from /web-pixels@<hash>/... on the store's own domain. */
export const isShopifyPixelSandbox = (pathname: string = window.location?.pathname ?? ""): boolean =>
  pathname.includes("/web-pixels@");

/** Only absolute http(s) URLs are used; anything else is dropped so a bad param can't poison page_url. */
export const toHttpUrl = (value?: string): string | undefined => {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Points Snowplow at the supplied page URL / referrer. Must run after newTracker and before the
 * first trackPageView: setCustomUrl / setReferrerUrl apply to every event sent after them
 * (page views, page pings, link clicks, ecommerce).
 */
export const applyPageContext = ({ pageUrl, referrer }: PageContextInput): void => {
  const url = toHttpUrl(pageUrl);
  const ref = toHttpUrl(referrer);

  if (url) window.tracker("setCustomUrl", url);
  if (ref) window.tracker("setReferrerUrl", ref);

  if (!url && isShopifyPixelSandbox()) {
    logger.warn(
      "Running inside a Shopify pixel sandbox without a pageUrl: page views will report the sandbox URL. " +
        "Pass event.context.document.location.href as pageUrl.",
    );
  }
};
