/**
 * Everything the service must know about writing a frictionless custom tag.
 *
 * This is the answer to "does the backend know about integrations": it does, because the
 * knowledge lives HERE rather than being posted in by whatever client happens to call. Ported
 * verbatim from packages/assistant-core/src/ai/knowledge.ts, which the extension used to ship
 * to every browser and send back over the wire on every generate.
 *
 * The types are verbatim from mediajel-frictionless-custom-tag/src/types.ts (the generated file
 * compiles against THAT repo's ambient types, whose SignupParams fields are optional — unlike
 * tracker-core's). The templates are real shipped tags from that repo, normalized to the
 * annotation-free JS-in-TS the generator is required to produce.
 *
 * When this module moves to amplication-nestjs-microservices these constants become the
 * fallback behind KnowledgeProvider, with knowledge-base's vector search in front.
 */

export const FRICTIONLESS_TYPES = `export interface CartEvent {
  sku: string;
  name: string;
  category: string;
  unitPrice: number;
  quantity: number;
  currency: string;
  userId?: string;
}

export interface TransactionCartItem extends CartEvent {
  orderId: string;
}

export interface TransactionEvent {
  id: string;
  affiliateId?: string;
  total: number;
  tax: number;
  shipping: number;
  city: string;
  state: string;
  country: string;
  currency: string;
  userId?: string;
  discount?: number;
  couponCode?: string;
  alternativeTransactionIds?: string[];
  items: TransactionCartItem[];
}

export type SignupParams = {
  uuid: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  emailAddress?: string;
  hashedEmailAddress?: string;
  address?: string;
  city?: string;
  state?: string;
  phoneNumber?: string;
  advertiser?: string;
};`;

export const HELPER_SIGNATURES = `// The ONLY imports a tag may use, all relative to src/domains/ or src/app-ids/:
import { isTrackTransLoaded } from "../libs/utils/is-trackTrans-loaded";
//   isTrackTransLoaded(callback) — polls every 100ms until window.trackTrans exists, then calls back once. Wrap EVERYTHING in it.
import { isTrackerLoaded } from "../libs/utils/is-tracker-loaded";
//   isTrackerLoaded(callback) — same, for window.tracker.
import { datalayerSource } from "../libs/sources/google-datalayer-source";
//   datalayerSource(callback, layer = window.dataLayer) — REPLAYS every existing entry, then patches push; callback(entry) for each. Default choice.
import { ecommDatalayerSource } from "../libs/sources/ecomm-datalayer-source";
//   ecommDatalayerSource(callback, contextWindow = window) — patches push only, callback(lastEntry). Does NOT replay, so a purchase already pushed before the tag loaded is missed. Prefer datalayerSource.
import { pollForElement } from "../libs/sources/poll-for-element";
//   pollForElement(selectors, callback, interval = 100, timeout = 30000) — waits until ALL selectors match, then calls back once.
import { waitForUrlSubstring } from "../libs/utils/url-detector";
//   waitForUrlSubstring(callback, urlSubstring = "/thank-you", intervalMs = 500) — calls back once the URL contains the substring, and keeps checking, so it survives client-side routing. The route gate for SPA checkouts.
import { xhrResponseSource } from "../libs/sources/xhr-response-source";
//   xhrResponseSource(callback) — callback(xhr) on every completed XMLHttpRequest; read xhr.responseText / xhr.responseURL.
import { xhrRequestSource } from "../libs/sources/xhr-request-source";
//   xhrRequestSource(callback) — callback(requestBody) for what the page SENT. Use when the order data is in the request and the response is empty.
import fetchSource from "../libs/sources/fetch-source";
//   fetchSource(requestCallback, responseCallback) — responseCallback(response, parsedBody) for every fetch on the page. Default or named import; both are valid.
import { postMessageSource } from "../libs/sources/post-message-source";
//   postMessageSource(callback) — callback(event) for every window message (embedded/iframe checkouts).
import { getBeacons } from "../libs/sources/get-beacons";
//   getBeacons({ nexxenTR, nexxenPV, nexxenSU, dstilleryTR, dstilleryPV, orderId, total }) — fires partner conversion pixels. Use ONLY when the brief names the beacon ids; never invent one.
import { createImagePixel } from "../libs/utils/create-image-pixel";
//   createImagePixel(url) — returns a detached 1x1 <img>. You must appendChild it yourself.
import { createScript } from "../libs/utils/create-script-pixel";
//   createScript(id, attributes) — returns a <script> element, deduped by id + src.
import { createUTMPersistor } from "../libs/utils/persist-utm";
//   createUTMPersistor(config?) — persists UTM parameters across the session.
import { sha256 } from "../libs/utils/sha256-encode";
//   sha256(value) — Promise<string>, lowercase hex. Always await it for hashedEmailAddress.
import { tryParseJSONObject } from "../libs/utils/tryParseJSONObject";
//   tryParseJSONObject(value) — parsed object or undefined; never throws.`;

export const TEMPLATE_DATALAYER = `// Real shipped tag — GA4 purchase push on the dataLayer (the most common shape).
// One edit from the deployed file: the dedup guard. Without it this exact shape double-counts,
// because datalayerSource REPLAYS entries already in the array — so every later page view with
// the purchase push still there fires the transaction again. The deployed version has no guard.
import { datalayerSource } from "../libs/sources/google-datalayer-source";
import { isTrackTransLoaded } from "../libs/utils/is-trackTrans-loaded";

const seaweedrbny = () => {
  isTrackTransLoaded(() => {
    datalayerSource((data) => {
      if (data.event === "purchase") {
        const purchase = data.ecommerce;
        const items = purchase.items;

        const seen = "mj-seaweedrbny-" + purchase.transaction_id;
        if (localStorage.getItem(seen)) return;
        localStorage.setItem(seen, "1");

        window.trackTrans({
          id: purchase.transaction_id.toString(),
          total: parseFloat(purchase.value),
          tax: parseFloat(purchase.tax) || 0,
          shipping: parseFloat(purchase.shipping) || 0,
          city: "N/A",
          country: "N/A",
          currency: "USD",
          state: "N/A",
          items: items.map((item) => ({
            orderId: purchase.transaction_id.toString(),
            sku: item.item_id || "N/A",
            name: item.item_name,
            category: item.item_category || "N/A",
            unitPrice: item.price || 0,
            quantity: item.quantity || 1,
            currency: "USD",
          })),
        });
      }
    });
  });
};

seaweedrbny();`;

export const TEMPLATE_XHR = `// Real shipped tag — order confirmation read from an XHR response body.
import { isTrackTransLoaded } from "../libs/utils/is-trackTrans-loaded";
import { xhrResponseSource } from "../libs/sources/xhr-response-source";
import { tryParseJSONObject } from "../libs/utils/tryParseJSONObject";

const terpsstation = () => {
  isTrackTransLoaded(() => {
    xhrResponseSource((xhr) => {
      const getData = tryParseJSONObject(xhr.responseText);
      if (!getData || !getData.data || getData.data.type !== "orders") return;
      const transaction = getData.data.attributes;
      const orderId = transaction.order_number.toString();

      const dedupKey = "mj-terpsstation-" + orderId;
      if (localStorage.getItem(dedupKey)) return;
      localStorage.setItem(dedupKey, "1");

      const address = transaction.delivery_address || {};
      window.trackTrans({
        id: orderId,
        total: parseFloat(String(transaction.total.amount / 100)) || 0,
        tax: parseFloat(String(transaction.tax_total.amount / 100)) || 0,
        shipping: 0,
        city: (address.city || "N/A").toString(),
        country: (address.country || "N/A").toString(),
        currency: "USD",
        state: (address.state || "N/A").toString(),
        items: (getData.included || [])
          .filter((product) => product.type === "order_items")
          .map((product) => ({
            orderId: orderId,
            sku: product.id.toString(),
            name: "N/A",
            category: "N/A",
            unitPrice: product.attributes.final_price.amount / 100 || 0,
            quantity: parseInt(product.attributes.quantity || 1),
            currency: "USD",
          })),
      });
    });
  });
};

terpsstation();`;

export const TEMPLATE_SIGNUP = `// Real shipped tag — form sign-up with sha256 hashing and a dedup flag set BEFORE the await.
import { isTrackTransLoaded } from "../libs/utils/is-trackTrans-loaded";
import { pollForElement } from "../libs/sources/poll-for-element";
import { sha256 } from "../libs/utils/sha256-encode";

const hospice = () => {
  isTrackTransLoaded(() => {
    if (window.location.href.includes("/contact")) {
      const elements = ["#wpforms-form-999", 'input[name="wpforms[fields][2]"]', "#wpforms-submit-999"];

      pollForElement(elements, () => {
        const form = document.querySelector("#wpforms-form-999");
        const emailElement = form ? form.querySelector('input[name="wpforms[fields][2]"]') : null;
        const submitButton = form ? form.querySelector("#wpforms-submit-999") : null;
        if (!submitButton) return;

        // No preventDefault: cancelling the click would block the site's real submission.
        submitButton.addEventListener("click", async () => {
          const email = emailElement && emailElement.value ? emailElement.value.trim().toLowerCase() : "";
          if (!email) return;

          // One signup per email per browser; the flag lands before the async hash so a
          // double-click cannot fire twice.
          const dedupKey = "mj-hospice-signup-" + email;
          if (localStorage.getItem(dedupKey)) return;
          localStorage.setItem(dedupKey, "1");

          const hashedEmailAddress = await sha256(email);
          window.trackSignUp({
            uuid: email,
            emailAddress: email,
            hashedEmailAddress: hashedEmailAddress,
          });
        });
      });
    }
  });
};

hospice();`;

export const TEMPLATE_SPA = `// Real shipped tag — a client-routed checkout, where the purchase signal and the confirmation
// route arrive at different moments. Two edits from the deployed file: the type annotations are
// gone (the file must also be valid plain JS), and it imports waitForUrlSubstring instead of
// carrying an inlined copy — the copy in the shipped version calls clearInterval(timer) above
// the line that declares timer, which throws the moment the URL already matches.
import { datalayerSource } from "../libs/sources/google-datalayer-source";
import { isTrackTransLoaded } from "../libs/utils/is-trackTrans-loaded";
import { waitForUrlSubstring } from "../libs/utils/url-detector";

const theraleaf = () => {
  isTrackTransLoaded(() => {
    // The router swaps the page without a page load, so what the operator picked on an earlier
    // route is only reachable through storage. Write it when it is on screen, read it later.
    navigation.addEventListener("navigate", () => {
      const value = document.querySelector(".shopping_mode_indicator")?.textContent;
      if (value === "Pickup") localStorage.setItem("MJ_retail_id", "pickup");
      else if (value === "Delivery") localStorage.setItem("MJ_retail_id", "delivery");
    });

    datalayerSource((data) => {
      if (data.event !== "purchase") return;
      const purchase = data.ecommerce;

      // The push lands BEFORE the confirmation route. Hold the payload and fire on arrival —
      // a plain href check here would run once, on the wrong route, and never again.
      waitForUrlSubstring(
        () => {
          const key = "mj-theraleaf-" + purchase.transaction_id;
          if (localStorage.getItem(key)) return;
          localStorage.setItem(key, "1");

          window.trackTrans({
            id: String(purchase.transaction_id),
            total: parseFloat(purchase.value) || 0,
            tax: parseFloat(purchase.tax) || 0,
            shipping: parseFloat(purchase.shipping) || 0,
            discount: 0,
            city: "N/A",
            state: "N/A",
            country: "N/A",
            currency: "USD",
            items: purchase.items.map((item) => ({
              orderId: String(purchase.transaction_id),
              sku: item.item_id || "N/A",
              name: item.item_name || "N/A",
              category: item.item_category || "N/A",
              quantity: item.quantity || 1,
              unitPrice: item.price,
              currency: "USD",
            })),
          });
        },
        "/thank-you",
        500,
      );
    });
  });
};

theraleaf();`;

export const CONVENTIONS = `RULES the file MUST follow (deploy is refused otherwise):
1. Shape: allowlisted imports, then \`const <slug> = () => { isTrackTransLoaded(() => { ... }); };\` and \`<slug>();\` as the last line. No IIFE, no export. <slug> is a short camelCase name derived from the site.
2. Language: the file is deployed as TypeScript but MUST also be valid plain JavaScript — NO type annotations, interfaces, generics, "as", enums, or non-null "!". Optional chaining ?. and ?? are fine. Stick to ES2017 (no Object.fromEntries, Array.flat, allSettled).
3. Only window.trackTrans(...) and/or window.trackSignUp(...) — NEVER window.tracker(...), never your own fetch/XHR, no eval, no document.write, no external scripts, and NEVER assign window.overrides.
4. Dedup: the tag runs on every page view forever, so guard the fire or it double-counts. Read a storage key derived from the business value (order id for transactions, normalized email for sign-ups) and write it back. Preferred: localStorage "mj-<slug>-" + <businessValue>; sessionStorage is accepted. SET IT BEFORE ANY await.
5. Defaults ONLY when the recording carries no value, and each one must appear in fieldCoverage as status "default": city/state/country "N/A", currency "USD" (unless the recording shows another), parseFloat(x) || 0 for total/tax/shipping, quantity || 1, sku/name/category || "N/A". Ids: always .toString()/String(...).
6. items: map every purchased item (orderId = transaction id on each). If the recording has no item data, use items: [] and set items.trackable=false with the reason.
7. Prefer the most stable signal: a dataLayer push > a network response body > DOM text. Route-gate with window.location.href.includes("<route>") when the signal only exists on a confirmation page.
7b. SPA / CROSS-PAGE: when the value you need is on one route and the confirmation is on another (Wix, Shopify, most headless checkouts), do not try to read both at once. On the first route, attach a listener and write what you learn to storage under one namespaced key. On the confirmation route, read it back, fire window.trackTrans, and CLEAR the key so the next order starts clean. Gate the confirmation route with waitForUrlSubstring, not a one-shot href check — a client-routed navigation fires no page load, so code that ran at document_start never runs again. Bind listeners once: a router can re-enter the same route, so set a flag (e.g. document.documentElement.dataset.<slug>Bound) before addEventListener. A capture-phase listener on document survives re-renders that replace the button you bound to.
8. Sign-ups: uuid required (email is a good uuid), hashedEmailAddress = await sha256(email.trim().toLowerCase()), never preventDefault on the site's own controls.
9. NAMING TRAPS: window.trackSignUp has a capital U. The transaction key is "id" (not orderId). Items use "unitPrice" (not price). Do not send userId/test (the pipeline drops them).`;
