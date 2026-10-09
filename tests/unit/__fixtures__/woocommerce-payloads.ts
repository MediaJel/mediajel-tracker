// Verbatim payload injected on torchdrinks.com/checkout/order-received/
// (torchdrinks.com.har, 2026-08-26) — the flattened shape, no `billing` object.
export const flattenedTransactionOrder = {
  id: 185250,
  number: "185250",
  currency: "USD",
  total: "13.98",
  subtotal: "3.99",
  tax: "0.00",
  shipping: "9.99",
  discount: "0.00",
  coupons: [],
};

export const flattenedTransactionItems = [
  {
    sku: "td-black-cherry-lite-5mg-single",
    product_id: 128903,
    variant_id: 0,
    name: "Black Cherry Lite 5mg THC Seltzer (12oz)",
    quantity: 1,
    price: "3.99",
    total: "3.99",
  },
];

// WooCommerce REST API v3 order shape — what the data source was originally
// written against. `shipping` here is an address OBJECT, not an amount.
export const restApiTransactionOrder = {
  id: 727,
  status: "processing",
  currency: "USD",
  total: "29.35",
  total_tax: "1.35",
  shipping_total: "5.00",
  discount_total: "0.00",
  billing: {
    first_name: "John",
    last_name: "Doe",
    address_1: "969 Market",
    city: "San Francisco",
    state: "CA",
    postcode: "94103",
    country: "US",
    email: "john.doe@example.com",
    phone: "(555) 555-5555",
  },
  shipping: {
    first_name: "John",
    last_name: "Doe",
    address_1: "969 Market",
    city: "San Francisco",
    state: "CA",
    postcode: "94103",
    country: "US",
  },
};

// REST API line items: `sku` can be an empty string when unset in WooCommerce.
export const restApiTransactionItems = [
  {
    id: 315,
    order_id: 727,
    name: "Woo Single #1",
    product_id: 93,
    quantity: 2,
    total: "21.99",
    sku: "SKU-93",
  },
  {
    id: 316,
    order_id: 727,
    name: "Handmade Mug",
    product_id: 22,
    quantity: 1,
    total: "7.00",
    sku: "",
  },
];
