/**
 * Everything the model must know about writing a frictionless custom tag, embedded as
 * constants. The types are verbatim from mediajel-frictionless-custom-tag/src/types.ts (the
 * generated file compiles against THAT repo's ambient types, whose SignupParams fields are
 * optional — unlike tracker-core's). The templates are real shipped tags from that repo,
 * normalized to the annotation-free JS-in-TS the generator is required to produce.
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
//   datalayerSource(callback, layer = window.dataLayer) — REPLAYS every existing entry, then patches push; callback(entry) for each.
import { pollForElement } from "../libs/sources/poll-for-element";
//   pollForElement(selectors, callback, interval = 100, timeout = 30000) — waits until ALL selectors match, then calls back once.
import { xhrResponseSource } from "../libs/sources/xhr-response-source";
//   xhrResponseSource(callback) — callback(xhr) on every completed XMLHttpRequest; read xhr.responseText / xhr.responseURL.
import { fetchSource } from "../libs/sources/fetch-source";
//   fetchSource(requestCallback, responseCallback) — responseCallback(response, parsedBody) for every fetch on the page.
import { postMessageSource } from "../libs/sources/post-message-source";
//   postMessageSource(callback) — callback(event) for every window message (embedded checkouts).
import { sha256 } from "../libs/utils/sha256-encode";
//   sha256(value) — Promise<string>, lowercase hex. Always await it for hashedEmailAddress.
import { tryParseJSONObject } from "../libs/utils/tryParseJSONObject";
//   tryParseJSONObject(value) — parsed object or undefined; never throws.`;

export const TEMPLATE_DATALAYER = `// Real shipped tag — GA4 purchase push on the dataLayer (the most common shape).
import { datalayerSource } from "../libs/sources/google-datalayer-source";
import { isTrackTransLoaded } from "../libs/utils/is-trackTrans-loaded";

const seaweedrbny = () => {
  isTrackTransLoaded(() => {
    datalayerSource((data) => {
      if (data.event === "purchase") {
        const purchase = data.ecommerce;
        const items = purchase.items;

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

export const CONVENTIONS = `RULES the file MUST follow (deploy is refused otherwise):
1. Shape: allowlisted imports, then \`const <slug> = () => { isTrackTransLoaded(() => { ... }); };\` and \`<slug>();\` as the last line. No IIFE, no export. <slug> is a short camelCase name derived from the site.
2. Language: the file is deployed as TypeScript but MUST also be valid plain JavaScript — NO type annotations, interfaces, generics, "as", enums, or non-null "!". Optional chaining ?. and ?? are fine. Stick to ES2017 (no Object.fromEntries, Array.flat, allSettled).
3. Only window.trackTrans(...) and/or window.trackSignUp(...) — NEVER window.tracker(...), never your own fetch/XHR, no eval, no document.write, no external scripts, and NEVER assign window.overrides.
4. Dedup: guard with localStorage key "mj-<slug>-" + <businessValue> (order id for transactions, normalized email for sign-ups), SET BEFORE ANY await. The tag runs on every page view forever — without this the event double-fires.
5. Defaults ONLY when the recording carries no value, and each one must appear in fieldCoverage as status "default": city/state/country "N/A", currency "USD" (unless the recording shows another), parseFloat(x) || 0 for total/tax/shipping, quantity || 1, sku/name/category || "N/A". Ids: always .toString()/String(...).
6. items: map every purchased item (orderId = transaction id on each). If the recording has no item data, use items: [] and set items.trackable=false with the reason.
7. Prefer the most stable signal: a dataLayer push > a network response body > DOM text. Route-gate with window.location.href.includes("<route>") when the signal only exists on a confirmation page.
8. Sign-ups: uuid required (email is a good uuid), hashedEmailAddress = await sha256(email.trim().toLowerCase()), never preventDefault on the site's own controls.
9. NAMING TRAPS: window.trackSignUp has a capital U. The transaction key is "id" (not orderId). Items use "unitPrice" (not price). Do not send userId/test (the pipeline drops them).`;
