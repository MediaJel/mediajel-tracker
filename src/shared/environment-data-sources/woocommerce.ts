/**
 * WooCommerce transaction data source
 * ===================================
 *
 * What it does
 *   Turns the order a WooCommerce site prints on its thank-you page
 *   (/checkout/order-received/<order id>/?key=wc_order_...) into one MediaJel transaction event:
 *   a Snowplow transaction plus one transaction item per line item.
 *
 * What triggers it
 *   The tag parameter `environment=woocommerce`, e.g.
 *     <script src="https://tags.cnna.io/?appId=<appId>&environment=woocommerce"></script>
 *   src/adapters/ecommerce.ts lazy-loads this file (deployed as woocommerce.<hash>.js on tags.cnna.io)
 *   and calls it once, after the tracker has initialised. It does not poll: the globals below must
 *   already exist on the page by then.
 *
 * What it reads (printed by the client's site, not by MediaJel)
 *   window.transactionOrder: the order, as an object or a JSON string, in one of these shapes:
 *     - WC_Order::get_data() or the WooCommerce REST API order (e.g. greatcbdshop.com): id, number, total,
 *       total_tax, shipping_total, currency, billing { city, state, country, email }, and transaction_id
 *       (the payment gateway's charge id, NOT the order id)
 *     - flattened (e.g. torchdrinks.com): id, number, total, tax, shipping, currency, and no billing object
 *   window.transactionItems: the line items, as an array or a JSON string of an array. Each item has
 *     product_id, name, quantity and total (the line total); sku is often absent.
 *   Example site snippet matching the get_data() shape (unverified; each site's snippet differs):
 *     window.transactionOrder = <?php echo wp_json_encode($order->get_data()); ?>;
 *     window.transactionItems = <?php echo wp_json_encode(array_values(array_map(
 *       fn($item) => $item->get_data(), $order->get_items()))); ?>;
 *
 * When it sends nothing (silently: no console output)
 *   - window.transactionOrder is missing or empty (any page that isn't a thank-you page)
 *   - window.transactionItems is not an array after parsing (missing, or an object keyed by item id)
 *   - the order total doesn't parse as a number (e.g. "$134.00")
 *   - the order has no id, transaction_id or number
 *   - anything throws while the event is built (caught at the bottom)
 *
 * What it sends
 *   observable.notify({ transactionEvent }) → src/adapters/ecommerce.ts → tracker.ecommerce.trackTransaction,
 *   which:
 *     - skips order ids already sent from this browser (localStorage key "<appId>_transaction"),
 *     - sends Snowplow addTrans, one addItem per item, then trackTrans
 *       (lands in SNOWPLOW.COMMERCE_TRANSACTIONS_VIEW; TR_ORDERID is the order id below),
 *     - fires the Nexxen / Dstillery purchase pixels when the tag has s2 / s3 values.
 *   Each field's source is commented where the event is built below.
 *
 * Tests
 *   tests/unit/woocommerce-data-source.test.ts, with fixtures in tests/unit/__fixtures__/woocommerce-payloads.ts
 *   (real payloads from torchdrinks.com and greatcbdshop.com, personal data replaced).
 *   Run: `bun test tests` (every test should pass).
 *   Covers: each payload shape, each skip condition, the unit-price and quantity rules, the order id
 *   fallback, and the sku fallback chain, including the #867 regression (a product_id 0 line item).
 *
 * Dry-run on a live thank-you page (DevTools console)
 *   - `window.transactionOrder` and `window.transactionItems` must exist, and the items must be an array.
 *   - Look for "[MJ:Deduplication] DEBUG : existingIds" in the console. It is logged only when this file
 *     emitted an event and trackTransaction was reached (unless the tag has logs=false).
 *   - Verdict: copy this one line into the console. "OK: sends order <id> with <n> item(s)" means this file
 *     would emit the order; "SKIP: ..." names the check that fails. It repeats the checks in
 *     woocommerceDataSource below, so update it whenever they change.
 *     (w=>{const p=v=>{try{return typeof v=="string"?JSON.parse(v):v}catch{return v}},o=p(w.transactionOrder),i=p(w.transactionItems),id=o&&(o.id??o.transaction_id??o.number);return !w.transactionOrder?"SKIP: no window.transactionOrder":!Array.isArray(i)?"SKIP: transactionItems is not an array":isNaN(parseFloat(o.total))?"SKIP: total is not a number: "+o.total:id==null?"SKIP: no id / transaction_id / number":"OK: sends order "+id+" with "+i.length+" item(s)"})(window)
 *   - Dedup: copy this line to list the order ids this browser has already sent. A listed id is never sent
 *     again from this browser, so a reload or repeat visit sends nothing for it.
 *     Object.keys(localStorage).filter(k=>k.endsWith("_transaction")).map(k=>k+" = "+localStorage.getItem(k))
 *
 * How to repair
 *   Symptom: transactions drop while thank-you page views don't.
 *     1. Place a test order (a retail order, not a wholesale account) with DevTools open and "Preserve log" on.
 *     2. On the thank-you page, check the two globals against every "sends nothing" condition above, and
 *        that every item has a product_id or a sku.
 *     3. No "[MJ:Deduplication]" line means this file bailed out; the failing condition says why.
 *     4. Compare when the drop started with deploys: `curl -sI https://tags.cnna.io/<this chunk>.js` and
 *        read last-modified. main deploys to tags.cnna.io within minutes of a merge.
 *   Symptom: an order is missing only after a reload or repeat visit.
 *     Expected: its id is already in localStorage "<appId>_transaction" in that browser.
 *   Symptom: TR_ORDERID doesn't match the number in the thank-you URL.
 *     The site's payload has no id, so the gateway's transaction_id was used; ask the site to include id.
 *
 * Incidents
 *   - Until 2026-08-31: flattened payloads with no billing object (torchdrinks.com) threw on billing.email
 *     and were dropped. Fixed by #867 (live 2026-08-31 20:10 UTC): billing reads became optional.
 *   - 2026-08-31 20:10 → 2026-10-09 23:11 UTC: #867 also changed the item sku to (product_id || sku).toString().
 *     A line item with product_id 0 and no sku (greatcbdshop.com's "Shipping Protection") threw, which
 *     dropped about 93% of greatcbdshop's orders. Fixed by #869: product_id ?? sku ?? "N/A".
 */
import observable from "src/shared/utils/create-events-observable";

import { TransactionCartItem } from "../types";
import { tryParseJSONObject } from "../utils/try-parse-json";

/**
 * Reads the thank-you page globals and emits one `transactionEvent` on the shared events observable.
 * Runs once per page load and returns nothing. It never throws: every failure is a silent skip, so a
 * malformed payload can't break the client's page.
 *
 * @example
 *   window.transactionOrder = { id: 2430058, total: "12.54", shipping_total: "9.99", currency: "USD", billing: {...} }
 *   window.transactionItems = [
 *     { product_id: 97865, name: "Mystery Item only $1", quantity: 1, total: "1" },
 *     { product_id: 0, name: "Shipping Protection", quantity: 1, total: "1.55" },
 *   ]
 *   // emits: { id: "2430058", total: 12.54, shipping: 9.99, items: [{ sku: "97865", unitPrice: 1 }, { sku: "0", unitPrice: 1.55 }] }
 */
const woocommerceDataSource = () => {
  // No order printed: this isn't a thank-you page, or the site doesn't print the globals. Nothing to send.
  if (!window.transactionOrder) {
    return;
  }

  // Everything below is wrapped so that a malformed payload is skipped instead of breaking the page.
  try {
    // Both globals may be objects or JSON strings: tryParseJSONObject returns objects as they are and
    // parses strings. An unparseable string comes back unchanged and fails the checks below.
    const transaction = tryParseJSONObject(window.transactionOrder);
    const products = tryParseJSONObject(window.transactionItems);

    // Skip unless the items are a real array (missing, or an object keyed by item id, both fail). Sending
    // items: [] instead would claim this order id in the deduplicator and block a correct send later.
    if (!Array.isArray(products)) {
      return;
    }

    // The order total, including tax and shipping: "12.54" → 12.54. A total that isn't a plain number
    // (e.g. "$134.00") is skipped rather than sent as NaN or $0.
    const total = parseFloat(transaction.total);
    if (Number.isNaN(total)) {
      // logger.error("WooCommerce: unparseable transaction total", transaction.total);
      return;
    }
    // Order key varies: id, transaction_id, or customer-facing number. Without
    // one the event can't be deduped or joined — skip instead of throwing.
    // id is the WooCommerce order id (the number in /checkout/order-received/<id>/) and is what
    // TR_ORDERID should hold. transaction_id is often the payment gateway's charge id (greatcbdshop's
    // NMI sends "12660878870"), so it is only a fallback for payloads that lack id.
    const transactionId =
      transaction.id ?? transaction.transaction_id ?? transaction.number;
    if (transactionId === undefined || transactionId === null) {
      // logger.error("WooCommerce: transaction payload has no order id", transaction);
      return;
    }
    // Billing email, sent as the Snowplow user id. Flattened payloads have no billing object, hence ?. and "N/A".
    const email = transaction.billing?.email || "N/A";
    // ISO currency code from the order, used on the transaction and on every item; defaults to USD.
    const currency = (transaction.currency || "USD").toString();

    // Hand the event to src/adapters/ecommerce.ts, which calls tracker.ecommerce.trackTransaction
    // (dedup by order id per browser, then Snowplow, then the partner purchase pixels).
    observable.notify({
      transactionEvent: {
        // Becomes TR_ORDERID in Snowplow, e.g. "2430058".
        id: transactionId.toString(),
        // Parsed above, e.g. 12.54.
        total,
        // total_tax in the get_data()/REST shape, tax in the flattened shape; anything non-numeric → 0.
        tax: parseFloat(transaction.total_tax || transaction.tax) || 0,
        // shipping_total in the get_data()/REST shape, shipping in the flattened shape. In the get_data()/REST
        // shape `shipping` is the shipping ADDRESS object, so it parses to NaN, and || 0 keeps that out.
        shipping: parseFloat(transaction.shipping_total || transaction.shipping) || 0,
        // Billing address fields; "N/A" for flattened payloads, which have no billing object.
        city: (transaction.billing?.city || "N/A").toString(),
        state: (transaction.billing?.state || "N/A").toString(),
        country: (transaction.billing?.country || "N/A").toString(),
        currency,
        userId: email,
        // One Snowplow transaction item per line item, in the order the site printed them.
        items: products.map((product) => {
          const { name, product_id, sku, total, quantity } = product;
          // Divide by the float quantity so fractional lines keep the true
          // unit price; a parseable zero stays zero, not a phantom unit.
          // The reported quantity is the integer part: "3.5" → 3. Missing or non-numeric → 1.
          const parsedQuantity = parseInt(quantity);
          const itemQuantity = Number.isNaN(parsedQuantity) ? 1 : parsedQuantity;

          return {
            // Every item carries the order's id so Snowplow can join items to their transaction.
            orderId: transactionId.toString(),
            // ?? not ||: line items with no product (e.g. a Shipping Protection
            // add-on) have product_id 0 and no sku; send "0" as before, don't throw.
            // product_id wins whenever it is set (even 0); then sku; then "N/A". With || here, #867
            // threw on product_id 0 and dropped the whole order (fixed in #869).
            sku: (product_id ?? sku ?? "N/A").toString(),
            name: (name || "N/A").toString(),
            category: "N/A", // No Category Field for WooCommerce in transactionItems
            // Unit price = line total / quantity: total "21.99" with quantity 2 → 10.995.
            unitPrice: (parseFloat(total) || 0) / (parseFloat(quantity) || 1),
            quantity: itemQuantity,
            currency,
          } as TransactionCartItem;
        }),
      },
    });
  } catch (error) {
    // Deliberately silent (matching the other data sources): the order is dropped with no console output.
    // To debug, use the dry-run steps in the header comment.
    // logger.error("WooCommerce: failed to emit transaction", error);
  }
};

export default woocommerceDataSource;
