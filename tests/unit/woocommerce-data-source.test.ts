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
          sku: "td-black-cherry-lite-5mg-single",
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
          sku: "SKU-93",
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

  test("emits empty items when transactionItems is missing", () => {
    const notifications = runDataSource(flattenedTransactionOrder, undefined);

    expect(notifications).toHaveLength(1);
    expect(notifications[0].transactionEvent.items).toEqual([]);
  });
});
