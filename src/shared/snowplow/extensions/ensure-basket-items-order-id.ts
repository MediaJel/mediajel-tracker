import { SnowplowTracker } from "src/shared/snowplow/types";

/**
 *
 * This extension ensures that the orderId for the basket items is the same as the orderId for the transaction.
 * This is important for Shopify integrations since the orderId for the basket items is the product id and not the order id.
 */
const withEnsureBasketItemsOrderId = (snowplow: SnowplowTracker) => {
  const trackTransaction = snowplow.ecommerce.trackTransaction;

  snowplow.ecommerce.trackTransaction = (input) => {
    trackTransaction({
      id: input.id,
      total: input.total,
      tax: input.tax,
      shipping: input.shipping,
      city: input.city,
      state: input.state,
      country: input.country,
      currency: input.currency,
      items: input.items.map((item) => ({
        orderId: input.id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        currency: item.currency,
      })),
    });
  };

  return snowplow;
};

export default withEnsureBasketItemsOrderId;
