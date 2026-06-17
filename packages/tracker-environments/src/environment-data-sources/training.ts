import logger from "@mediajel/tracker-core/logger";
import observable from "@mediajel/tracker-core/utils/create-events-observable";
import { SnowplowTracker } from "@mediajel/tracker-core/snowplow/types";
import { applyExtensions } from "@mediajel/tracker-core/snowplow/extensions";
import { datalayerSource } from "@mediajel/tracker-core/sources/google-datalayer-source";
import { fetchSource } from "@mediajel/tracker-core/sources/fetch-source";
import { postMessageSource } from "@mediajel/tracker-core/sources/post-message-source";
import { TransactionCartItem } from "@mediajel/tracker-core/types";

/**
 * The `training` environment is a generic data source used by the Integrations
 * training site (apps/integrations). Unlike the 38 vendor environments, it isn't
 * tied to one platform — it demonstrates the three auto-capture mechanisms learners
 * practice in lessons 5–7, reusing the EXACT same source modules the real tracker uses:
 *
 *   - Google dataLayer  (GA4 `purchase` push)        -> lesson 5
 *   - Network requests   (fetch returning order JSON) -> lesson 6
 *   - Iframes            (postMessage TRAINING_PURCHASE) -> lesson 7
 *
 * Each mechanism normalizes its payload and `observable.notify({ transactionEvent })`;
 * the ecommerce adapter's existing subscription forwards it to Snowplow.
 */

type LooseRecord = Record<string, any>;

const num = (v: unknown): number => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? (n as number) : 0;
};

const str = (v: unknown): string => (v === undefined || v === null ? "" : String(v));

/**
 * Normalize a GA4-style `ecommerce` object OR a plain order object into our
 * TransactionEvent shape. Accepts both naming conventions so lessons stay forgiving:
 *   GA4:   { transaction_id, value, tax, shipping, currency, items:[{item_id,item_name,item_category,price,quantity}] }
 *   order: { id, total, tax, shipping, currency, items:[{sku,name,category,unitPrice,quantity}] }
 */
const normalizeTransaction = (raw: LooseRecord) => {
  const id = str(raw.transaction_id ?? raw.id ?? raw.orderId);
  const total = num(raw.value ?? raw.total);
  const currency = str(raw.currency || "USD") || "USD";
  const items = Array.isArray(raw.items) ? raw.items : [];

  return {
    id,
    total,
    tax: num(raw.tax),
    shipping: num(raw.shipping),
    currency,
    city: str(raw.city || "N/A") || "N/A",
    state: str(raw.state || "N/A") || "N/A",
    country: str(raw.country || "USA") || "USA",
    items: items.map((item: LooseRecord): TransactionCartItem => ({
      orderId: id,
      sku: str(item.sku ?? item.item_id ?? item.id),
      name: str(item.name ?? item.item_name),
      category: str(item.category ?? item.item_category ?? "N/A") || "N/A",
      unitPrice: num(item.unitPrice ?? item.price),
      quantity: num(item.quantity ?? item.qty ?? 1) || 1,
      currency,
    })),
  };
};

const isOrderLike = (body: unknown): body is LooseRecord =>
  !!body &&
  typeof body === "object" &&
  Array.isArray((body as LooseRecord).items) &&
  ((body as LooseRecord).transaction_id !== undefined ||
    (body as LooseRecord).id !== undefined ||
    (body as LooseRecord).orderId !== undefined);

const TrainingDataSource = (snowplow?: SnowplowTracker): void => {
  // Advanced "build an extension" lesson: let learner code apply a real Snowplow extension
  // (a (tracker) => tracker function that wraps tracker methods, exactly like withDeduplicationExtension)
  // to the live tracker, then rebind the window.* helpers to the newly-wrapped methods.
  if (snowplow) {
    (window as any).mjApplyExtension = (ext: (t: SnowplowTracker) => SnowplowTracker): SnowplowTracker => {
      const extended = applyExtensions(snowplow, [ext]);
      window.trackTrans = extended.ecommerce?.trackTransaction ?? window.trackTrans;
      window.trackSignUp = extended.trackSignup ?? window.trackSignUp;
      window.addToCart = extended.ecommerce?.trackAddToCart ?? window.addToCart;
      window.removeFromCart = extended.ecommerce?.trackRemoveFromCart ?? window.removeFromCart;
      return extended;
    };
  }

  // Lesson 5 — Google dataLayer: standard GA4 `purchase` event.
  datalayerSource((data: LooseRecord) => {
    if (data && data.event === "purchase" && data.ecommerce) {
      logger.debug("[training] dataLayer purchase", data);
      observable.notify({ transactionEvent: normalizeTransaction(data.ecommerce) });
    }
  });

  // Lesson 6 — Network requests: any fetch response shaped like an order.
  fetchSource(
    () => {},
    (_response: Response, body: any) => {
      if (isOrderLike(body)) {
        logger.debug("[training] fetch order", body);
        observable.notify({ transactionEvent: normalizeTransaction(body) });
      }
    },
  );

  // Lesson 7 — Iframes: a child frame posts { type: "TRAINING_PURCHASE", order }.
  postMessageSource((event: MessageEvent<any>) => {
    const msg = event && event.data;
    if (msg && msg.type === "TRAINING_PURCHASE" && msg.order) {
      logger.debug("[training] postMessage purchase", msg);
      observable.notify({ transactionEvent: normalizeTransaction(msg.order) });
    }
  });

  logger.debug("[training] data source active (dataLayer + fetch + postMessage)");
};

export default TrainingDataSource;
