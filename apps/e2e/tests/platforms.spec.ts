import { expect, test } from "./fixtures";
import { named } from "../rig/micro";

/**
 * One case per e-commerce platform the tag claims to support, driven the way that platform actually
 * presents its order: globals printed into the thank-you page, a gtag-style dataLayer push, or an
 * XHR the storefront makes once the page is live.
 *
 * Each case is a stimulus file plus a row here. Adding a platform is those two things, which is the
 * point — there are ~38 data sources in packages/tracker-environments and they are all one `switch`
 * away from each other in apps/tracker/src/adapters/ecommerce.ts.
 *
 * These assert the TRANSACTION, not just that something arrived: an adapter that reads the wrong
 * field sends a transaction with the wrong total, which is worse than sending nothing and is
 * invisible to a test that only counts events.
 */

interface Platform {
  /** The stimulus file under fixtures/stimuli, and the test's name. */
  stimulus: string;
  /** What should land in Snowplow's atomic transaction fields. */
  expect: { orderId: string; total: number; tax?: number; shipping?: number };
  /** Each item's sku and unit price, in the order the site listed them. */
  items: { sku: string; unitPrice: number; quantity: number }[];
  /** Set when the site only produces the order after the page is live. */
  fire?: boolean;
}

const PLATFORMS: Platform[] = [
  {
    stimulus: "woocommerce",
    expect: { orderId: "2430058", total: 12.54, tax: 0, shipping: 9.99 },
    // The second item is the #869 regression: product_id 0 and no sku. It must arrive as "0".
    items: [
      { sku: "97865", unitPrice: 1, quantity: 1 },
      { sku: "0", unitPrice: 1.55, quantity: 1 },
    ],
  },
  {
    stimulus: "woocommerce-flattened",
    // The #867 regression: no billing object at all. The order must still be sent.
    expect: { orderId: "185250", total: 48, tax: 3.5, shipping: 0 },
    items: [{ sku: "551", unitPrice: 24, quantity: 2 }],
  },
  {
    stimulus: "shopify",
    expect: { orderId: "SHOP-5512", total: 64, tax: 4.8, shipping: 5 },
    items: [{ sku: "SHOP-SKU-1", unitPrice: 32, quantity: 2 }],
  },
  {
    stimulus: "posabit",
    expect: { orderId: "POS-9001", total: 75.25, tax: 6.25, shipping: 0 },
    items: [
      { sku: "POS-SKU-1", unitPrice: 35, quantity: 1 },
      { sku: "POS-SKU-2", unitPrice: 40.25, quantity: 1 },
    ],
  },
  {
    stimulus: "treez",
    expect: { orderId: "TRZ-4417", total: 120, tax: 9.6, shipping: 5 },
    items: [{ sku: "TRZ-SKU-1", unitPrice: 60, quantity: 2 }],
    fire: true,
  },
];

for (const platform of PLATFORMS) {
  test(`${platform.stimulus} sends its transaction`, async ({ page, micro }) => {
    const appId = `e2e-${platform.stimulus}`;
    await page.goto(`/?${new URLSearchParams({ stimulus: platform.stimulus, appId, version: "2" })}`);
    await expect(page.locator("body")).toHaveAttribute("data-tag", "loaded");

    if (platform.fire) {
      // Returns a sentence rather than throwing, so a capture that never installed reads as that
      // instead of as a transaction which never arrived.
      expect(await page.evaluate(() => (window as never as { __fire: () => Promise<string> }).__fire())).toBe("fired");
    }

    const events = await micro.waitFor(named("transaction"), `a transaction from ${platform.stimulus}`);

    const transaction = events.find((e) => e.event?.event_name === "transaction");
    expect(transaction?.event?.app_id).toBe(appId);
    expect(transaction?.event?.tr_orderid).toBe(platform.expect.orderId);
    expect(transaction?.event?.tr_total).toBe(platform.expect.total);
    if (platform.expect.tax !== undefined) expect(transaction?.event?.tr_tax).toBe(platform.expect.tax);
    if (platform.expect.shipping !== undefined) expect(transaction?.event?.tr_shipping).toBe(platform.expect.shipping);

    const items = events.filter((e) => e.event?.event_name === "transaction_item");
    expect(items).toHaveLength(platform.items.length);
    for (const expected of platform.items) {
      const item = items.find((e) => e.event?.ti_sku === expected.sku);
      expect(item, `no transaction_item with sku ${expected.sku}`).toBeDefined();
      expect(item?.event?.ti_price).toBeCloseTo(expected.unitPrice, 2);
      expect(item?.event?.ti_quantity).toBe(expected.quantity);
      // Every item joins back to its order; a mismatch here breaks the warehouse join silently.
      expect(item?.event?.ti_orderid).toBe(platform.expect.orderId);
    }

    expect(await micro.bad()).toHaveLength(0);
    expect(await micro.consistent()).toBe(true);
  });
}
