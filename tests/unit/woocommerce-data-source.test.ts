import { describe, expect, test } from "bun:test";

import woocommerceDataSource from "../../src/shared/environment-data-sources/woocommerce";
import observable from "../../src/shared/utils/create-events-observable";
import {
  flattenedTransactionItems,
  flattenedTransactionOrder,
  restApiTransactionItems,
  restApiTransactionOrder,
} from "./__fixtures__/woocommerce-payloads";

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

  test("ignores a non-numeric shipping field instead of producing NaN", () => {
    const { shipping_total, ...withoutShippingTotal } = restApiTransactionOrder;

    const notifications = runDataSource(
      withoutShippingTotal,
      restApiTransactionItems
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0].transactionEvent.shipping).toBe(0);
  });

  test("divides unitPrice by the float quantity for fractional-quantity lines", () => {
    const notifications = runDataSource(flattenedTransactionOrder, [
      { ...flattenedTransactionItems[0], quantity: "3.5", total: "35.00" },
    ]);

    expect(notifications).toHaveLength(1);
    expect(notifications[0].transactionEvent.items[0].unitPrice).toBe(10);
    expect(notifications[0].transactionEvent.items[0].quantity).toBe(3);
  });

  test("keeps a zero quantity as zero instead of counting a phantom unit", () => {
    const notifications = runDataSource(flattenedTransactionOrder, [
      { ...flattenedTransactionItems[0], quantity: "0", total: "0.00" },
    ]);

    expect(notifications).toHaveLength(1);
    expect(notifications[0].transactionEvent.items[0].quantity).toBe(0);
    expect(notifications[0].transactionEvent.items[0].unitPrice).toBe(0);
  });

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

  test("does not emit when the payload has no order id at all", () => {
    const { id, number, ...orderWithoutAnyId } = flattenedTransactionOrder;

    const notifications = runDataSource(
      orderWithoutAnyId,
      flattenedTransactionItems
    );

    expect(notifications).toHaveLength(0);
  });

  test("does not emit a $0 event when the total is unparseable", () => {
    const notifications = runDataSource(
      { ...flattenedTransactionOrder, total: "$1,299.00" },
      flattenedTransactionItems
    );

    expect(notifications).toHaveLength(0);
  });

  test("does not emit when transactionItems is missing", () => {
    const notifications = runDataSource(flattenedTransactionOrder, undefined);

    expect(notifications).toHaveLength(0);
  });

  test("does not emit when transactionItems is object-shaped (PHP json_encode of id-keyed array)", () => {
    const notifications = runDataSource(flattenedTransactionOrder, {
      "315": flattenedTransactionItems[0],
    });

    expect(notifications).toHaveLength(0);
  });
});
