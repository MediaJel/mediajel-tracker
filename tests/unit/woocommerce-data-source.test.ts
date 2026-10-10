/**
 * Unit tests for the WooCommerce data source (src/shared/environment-data-sources/woocommerce.ts).
 *
 * Run: `bun test tests` from the repo root. bun only; there is no jest/vitest setup in this repo.
 *
 * How they work: each test sets window.transactionOrder / window.transactionItems the way a client's
 * thank-you page would, runs the data source once, and inspects what it emitted on the events observable.
 * Nothing reaches Snowplow; the tracker isn't loaded.
 *
 * What they cover:
 *   - the payload shapes seen on live sites (flattened: torchdrinks.com; REST / get_data(): greatcbdshop.com)
 *   - the sku fallback chain product_id ?? sku ?? "N/A", including the #867 regression (#869)
 *   - unit price and quantity rules
 *   - the order id fallback (id → transaction_id → number)
 *   - every skip condition (nothing must be emitted)
 *
 * Adding a regression test for a new site or failure: copy the site's real payload into
 * __fixtures__/woocommerce-payloads.ts (replace personal data), add a test that asserts the emitted event,
 * and check it fails without the fix (revert the fix, run, restore).
 */
import { describe, expect, test } from "bun:test";

import woocommerceDataSource from "../../src/shared/environment-data-sources/woocommerce";
import observable from "../../src/shared/utils/create-events-observable";
import {
  flattenedTransactionItems,
  flattenedTransactionOrder,
  getDataTransactionItems,
  getDataTransactionOrder,
  restApiTransactionItems,
  restApiTransactionOrder,
} from "./__fixtures__/woocommerce-payloads";

/**
 * Runs the data source once against the given page globals and returns everything it emitted.
 * Puts a fake `window` on globalThis (bun has no DOM), listens on the shared observable for the run,
 * then removes both so tests don't leak into each other.
 *
 * @returns the observable notifications: [] when the data source skipped, [{ transactionEvent }] when it emitted
 */
const runDataSource = (transactionOrder: unknown, transactionItems: unknown) => {
  (globalThis as any).window = { transactionOrder, transactionItems };
  const notifications: any[] = [];
  const listener = (data: any) => notifications.push(data);
  observable.subscribe(listener);

  woocommerceDataSource();

  observable.unsubscribe(listener);
  delete (globalThis as any).window;
  return notifications;
};

describe("woocommerceDataSource", () => {
  // Regression: torchdrinks.com order 185250 — the flattened payload has no
  // `billing` object, which used to throw before notify and be swallowed.
  test("emits a transaction for the flattened shape (no billing object)", () => {
    const notifications = runDataSource(
      flattenedTransactionOrder,
      flattenedTransactionItems
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0].transactionEvent).toEqual({
      id: "185250",
      total: 13.98,
      tax: 0,
      shipping: 9.99,
      city: "N/A",
      state: "N/A",
      country: "N/A",
      currency: "USD",
      userId: "N/A",
      items: [
        {
          orderId: "185250",
          sku: "128903",
          name: "Black Cherry Lite 5mg THC Seltzer (12oz)",
          category: "N/A",
          unitPrice: 3.99,
          quantity: 1,
          currency: "USD",
        },
      ],
    });
  });

  // Happy path for the WooCommerce REST API order shape: billing.* fills city/state/country/userId and
  // total_tax / shipping_total fill tax / shipping. Items are keyed on product_id (not sku), as before #867.
  test("emits a transaction for the REST API shape, reading billing and *_total fields", () => {
    const notifications = runDataSource(
      restApiTransactionOrder,
      restApiTransactionItems
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0].transactionEvent).toEqual({
      id: "727",
      total: 29.35,
      tax: 1.35,
      shipping: 5,
      city: "San Francisco",
      state: "CA",
      country: "US",
      currency: "USD",
      userId: "john.doe@example.com",
      items: [
        {
          orderId: "727",
          sku: "93",
          name: "Woo Single #1",
          category: "N/A",
          unitPrice: 10.995,
          quantity: 2,
          currency: "USD",
        },
        {
          orderId: "727",
          sku: "22",
          name: "Handmade Mug",
          category: "N/A",
          unitPrice: 7,
          quantity: 1,
          currency: "USD",
        },
      ],
    });
  });

  // In the REST / get_data() shape `shipping` is the shipping ADDRESS object. Without shipping_total the
  // fallback reads that object, which parses to NaN; the event must carry shipping 0, not NaN.
  test("ignores a non-numeric shipping field instead of producing NaN", () => {
    const { shipping_total, ...withoutShippingTotal } = restApiTransactionOrder;

    const notifications = runDataSource(
      withoutShippingTotal,
      restApiTransactionItems
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0].transactionEvent.shipping).toBe(0);
  });

  // Regression: greatcbdshop.com order 2430058 — a "Shipping Protection" line
  // item has product_id 0 and no sku, which threw in the item map and dropped
  // the whole transaction. Before PR #867 it was sent with sku "0".
  test("emits a transaction when a line item has product_id 0 and no sku", () => {
    const notifications = runDataSource(
      getDataTransactionOrder,
      getDataTransactionItems
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0].transactionEvent.id).toBe("2430058");
    expect(notifications[0].transactionEvent.total).toBe(12.54);
    expect(notifications[0].transactionEvent.items).toEqual([
      {
        orderId: "2430058",
        sku: "97865",
        name: "Mystery Item only $1",
        category: "N/A",
        unitPrice: 1,
        quantity: 1,
        currency: "USD",
      },
      {
        orderId: "2430058",
        sku: "0",
        name: "Shipping Protection",
        category: "N/A",
        unitPrice: 1.55,
        quantity: 1,
        currency: "USD",
      },
    ]);
  });

  // sku is product_id ?? sku ?? "N/A": product_id wins whenever it is set,
  // including 0, so these cover each fallback in that chain.
  test("keeps product_id 0 as the sku even when the item has a sku", () => {
    const notifications = runDataSource(getDataTransactionOrder, [
      { ...getDataTransactionItems[1], sku: "SP-1" },
    ]);

    expect(notifications).toHaveLength(1);
    expect(notifications[0].transactionEvent.items[0].sku).toBe("0");
  });

  // Second link of the chain: no product_id at all (undefined) → the item's own sku is used.
  test("falls back to the sku when product_id is missing", () => {
    const { product_id, ...itemWithoutProductId } = getDataTransactionItems[0];

    const notifications = runDataSource(getDataTransactionOrder, [
      { ...itemWithoutProductId, sku: "MYSTERY-1" },
    ]);

    expect(notifications).toHaveLength(1);
    expect(notifications[0].transactionEvent.items[0].sku).toBe("MYSTERY-1");
  });

  // Last link of the chain: neither field → "N/A". #867's (product_id || sku).toString() threw here.
  test("sends sku N/A when an item has neither product_id nor sku", () => {
    const { product_id, ...itemWithoutProductId } = getDataTransactionItems[0];

    const notifications = runDataSource(getDataTransactionOrder, [itemWithoutProductId]);

    expect(notifications).toHaveLength(1);
    expect(notifications[0].transactionEvent.items[0].sku).toBe("N/A");
  });

  // Weight-priced lines can have fractional quantities: unit price uses the real quantity (35 / 3.5 = 10),
  // while the reported quantity is the integer part (3).
  test("divides unitPrice by the float quantity for fractional-quantity lines", () => {
    const notifications = runDataSource(flattenedTransactionOrder, [
      { ...flattenedTransactionItems[0], quantity: "3.5", total: "35.00" },
    ]);

    expect(notifications).toHaveLength(1);
    expect(notifications[0].transactionEvent.items[0].unitPrice).toBe(10);
    expect(notifications[0].transactionEvent.items[0].quantity).toBe(3);
  });

  // A parseable "0" quantity stays 0 (not defaulted to 1), and the unit price stays 0 instead of dividing by 0.
  test("keeps a zero quantity as zero instead of counting a phantom unit", () => {
    const notifications = runDataSource(flattenedTransactionOrder, [
      { ...flattenedTransactionItems[0], quantity: "0", total: "0.00" },
    ]);

    expect(notifications).toHaveLength(1);
    expect(notifications[0].transactionEvent.items[0].quantity).toBe(0);
    expect(notifications[0].transactionEvent.items[0].unitPrice).toBe(0);
  });

  // Order id fallback: id → transaction_id → number. Here only number exists, and both the event id and every
  // item's orderId must use it.
  test("falls back to the order number when id and transaction_id are missing", () => {
    const { id, ...orderKeyedByNumberOnly } = flattenedTransactionOrder;

    const notifications = runDataSource(
      orderKeyedByNumberOnly,
      flattenedTransactionItems
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0].transactionEvent.id).toBe("185250");
    expect(notifications[0].transactionEvent.items[0].orderId).toBe("185250");
  });

  // Skip condition: no id, transaction_id or number. Without an order id the event can't be deduped or
  // joined, so nothing is sent (and nothing throws).
  test("does not emit when the payload has no order id at all", () => {
    const { id, number, ...orderWithoutAnyId } = flattenedTransactionOrder;

    const notifications = runDataSource(
      orderWithoutAnyId,
      flattenedTransactionItems
    );

    expect(notifications).toHaveLength(0);
  });

  // Skip condition: a formatted total like "$1,299.00" parses to NaN. Skipping beats sending a NaN or $0 purchase.
  test("does not emit a $0 event when the total is unparseable", () => {
    const notifications = runDataSource(
      { ...flattenedTransactionOrder, total: "$1,299.00" },
      flattenedTransactionItems
    );

    expect(notifications).toHaveLength(0);
  });

  // Skip condition: no items global. An items: [] event would claim the order id in the deduplicator and
  // block a correct send later, so nothing is sent.
  test("does not emit when transactionItems is missing", () => {
    const notifications = runDataSource(flattenedTransactionOrder, undefined);

    expect(notifications).toHaveLength(0);
  });

  // Skip condition: PHP's json_encode turns an array keyed by item id into an object ({"315": {...}}), not a
  // list. That isn't an array, so nothing is sent.
  test("does not emit when transactionItems is object-shaped (PHP json_encode of id-keyed array)", () => {
    const notifications = runDataSource(flattenedTransactionOrder, {
      "315": flattenedTransactionItems[0],
    });

    expect(notifications).toHaveLength(0);
  });
});
