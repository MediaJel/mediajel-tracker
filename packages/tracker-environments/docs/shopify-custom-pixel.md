# Installing the tag as a Shopify custom pixel

Shopify runs custom pixels (admin → **Settings → Customer events**) inside a sandboxed iframe. Inside
it, `window.location` is the sandbox document, not the storefront page:

```
https://<store>/web-pixels@<hash>/custom/web-pixel-<id>@<n>/sandbox/modern/
```

A tag that reads its own location reports that URL for every page view, page ping and link click, which
breaks page-level attribution, landing-page reports and URL-based audience rules. The pixel has to
read the real URL from Shopify's event API and pass it to the tag as `pageUrl` / `referrer`. The tag
then calls Snowplow `setCustomUrl` / `setReferrerUrl` before its first page view
(`packages/tracker-core/src/snowplow/page-context.ts`).

If the tag runs in the sandbox without a `pageUrl`, it logs a warning:
*Running inside a Shopify pixel sandbox without a pageUrl*.

## The pixel

Copy the advertiser's existing tag parameters into `MJ_PARAMS` (`appId`, `version`, any plugins), then
paste the snippet as a custom pixel. Keep `environment: "shopify"` so purchases are tracked.

```js
// MediaJel tag: Shopify custom pixel
const MJ_PARAMS = { appId: "APP_ID_HERE", environment: "shopify" };

let mjLoaded = false;
let mjLastUrl = "";
const mjLoad = (document) => {
  if (mjLoaded) return;
  mjLoaded = true;
  mjLastUrl = document.location.href;
  const params = new URLSearchParams({
    ...MJ_PARAMS,
    pageUrl: document.location.href,
    referrer: document.referrer || "",
  });
  const script = window.document.createElement("script");
  script.async = true;
  script.src = `https://tags.cnna.io/?${params}`;
  window.document.head.appendChild(script);
};

const isThankYouPage = (document) => /\/(thank[-_]you|orders\/)/.test(document.location.pathname);

analytics.subscribe("page_viewed", (event) => {
  const document = event.context.document;

  // Another page view in the same sandbox (one-page checkout steps): the tag is already running.
  // Same URL means the tag's own first page view already covered it.
  if (mjLoaded) {
    if (window.tracker && document.location.href !== mjLastUrl) {
      mjLastUrl = document.location.href;
      window.tracker("setCustomUrl", document.location.href);
      window.tracker("trackPageView");
    }
    return;
  }

  // On the thank-you page, wait for checkout_completed so the order is in place when the tag reads it.
  // Fall back after 3s so the page view is never lost.
  if (isThankYouPage(document)) {
    setTimeout(() => mjLoad(document), 3000);
    return;
  }

  mjLoad(document);
});

analytics.subscribe("checkout_completed", (event) => {
  // Read by the shopify environment (tracker-environments/src/environment-data-sources/shopify.ts).
  window.transactionOrder = event.data.checkout;
  window.transactionItems = event.data.checkout.lineItems;
  mjLoad(event.context.document);
});
```

## Checking it

1. Admin → Customer events → the pixel → **Test**. Browse a few pages: `page_viewed` events show the
   real `https://<store>/...` URLs.
2. On the live store, DevTools → Network, filter by the collector domain. The `url` (`page_url`) field
   in each payload is the storefront page, not `/web-pixels@.../sandbox/modern/`.
3. Compare page views for the advertiser grouped by URL in ClickHouse before and after. The sandbox
   URL should stop appearing.

## Not verified yet

- **Cookies and storage in the sandbox.** Snowplow stores its domain user id in `document.cookie` and
  `localStorage`. Whether the sandbox iframe keeps first-party cookies across page loads decides whether
  sessions and user ids stay stable. Check `_sp_id.*` on two page views in a row. If it changes, the
  next step is persisting the id with Shopify's `browser.cookie` API.
- **Collector CORS** for requests made from the sandbox document.
- **Customer privacy.** The pixel's *Permission* setting in Customer events decides when Shopify lets it
  run. Set it to match the store's consent banner.
