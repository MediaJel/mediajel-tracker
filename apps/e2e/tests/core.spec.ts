import { expect, fixtureUrl, test } from "./fixtures";
import { named } from "../rig/micro";

/**
 * The signals the tag exists to send, each driven the way a client's page drives it.
 *
 * These assert against Snowplow Micro, which is a real collector and enricher: an event it files as
 * GOOD has already passed Iglu schema validation. So "it arrived" and "it is well formed" are one
 * assertion here, and a context that stops matching its schema fails as loudly as a missing event.
 */

const ORDER = {
  id: "E2E-1001",
  total: 88.5,
  tax: 6.5,
  shipping: 0,
  currency: "USD",
  city: "Denver",
  state: "CO",
  country: "USA",
  items: [
    { orderId: "E2E-1001", sku: "NET-1", name: "CBD Tincture", category: "wellness", unitPrice: 41, quantity: 2 },
  ],
};

test("a page view carries the app id it was configured with", async ({ page, micro }) => {
  await page.goto(fixtureUrl({ appId: "e2e-core-pageview", version: "2" }));

  const events = await micro.waitFor(named("page_view"), "a page view");

  expect(events.filter((e) => e.event?.event_name === "page_view")).toHaveLength(1);
  expect(events[0].event?.app_id).toBe("e2e-core-pageview");
});

test("a sign-up reaches the collector as its own self-describing event", async ({ page, micro }) => {
  // event=signup is read straight off the tag's query string: the tracker calls trackSignup with the
  // context it parsed, which is how a client's sign-up page fires one without writing any code.
  await page.goto(
    fixtureUrl({
      appId: "e2e-core-signup",
      version: "2",
      event: "signup",
      uuid: "e2e-signup-1",
      emailAddress: "someone@example.com",
      city: "Denver",
      state: "CO",
    }),
  );

  const events = await micro.waitFor((all) => all.some((e) => e.event?.event_name === "sign_up"), "a sign_up event");

  const signup = events.find((e) => e.event?.event_name === "sign_up");
  expect(signup?.event?.app_id).toBe("e2e-core-signup");
  // The version matters: the tracker names 1-0-4 explicitly, and a bump that outruns the registry
  // would quarantine every sign-up rather than fail at build time.
  expect(JSON.stringify(signup)).toContain("iglu:com.mediajel.events/sign_up/jsonschema/1-0-4");
  expect(await micro.bad()).toHaveLength(0);
});

test("a transaction arrives with its items and its enhanced_transaction context", async ({ page, micro }) => {
  await page.goto(fixtureUrl({ appId: "e2e-core-transaction", version: "2", event: "transaction" }));
  await expect(page.locator("body")).toHaveAttribute("data-tag", "loaded");

  // window.trackTrans is the tag's own public entry point (adapters/index.ts), the one a site calls
  // when it has no supported platform. Driving it here keeps this test about the tracker rather than
  // about any one platform's DOM.
  await page.waitForFunction(() => typeof (window as never as { trackTrans?: unknown }).trackTrans === "function");
  await page.evaluate((order) => (window as never as { trackTrans: (o: unknown) => void }).trackTrans(order), ORDER);

  const events = await micro.waitFor(named("transaction"), "a transaction");

  const transaction = events.find((e) => e.event?.event_name === "transaction");
  expect(transaction?.event?.tr_orderid).toBe("E2E-1001");
  expect(transaction?.event?.tr_total).toBe(88.5);
  expect(JSON.stringify(transaction)).toContain("iglu:com.mediajel.events/enhanced_transaction/jsonschema/1-0-1");

  // One transaction_item per line item, each joined to the order by its id.
  const items = events.filter((e) => e.event?.event_name === "transaction_item");
  expect(items).toHaveLength(1);
  expect(items[0].event?.ti_sku).toBe("NET-1");
  expect(items[0].event?.ti_orderid).toBe("E2E-1001");

  expect(await micro.bad()).toHaveLength(0);
});

test("add to cart and remove from cart each send their own event", async ({ page, micro }) => {
  await page.goto(fixtureUrl({ appId: "e2e-core-cart", version: "2", event: "transaction" }));
  await expect(page.locator("body")).toHaveAttribute("data-tag", "loaded");
  await page.waitForFunction(() => typeof (window as never as { addToCart?: unknown }).addToCart === "function");

  const item = {
    sku: "NET-1",
    name: "CBD Tincture",
    category: "wellness",
    unitPrice: 41,
    quantity: 1,
    currency: "USD",
  };
  await page.evaluate((cartItem) => {
    const w = window as never as { addToCart: (i: unknown) => void; removeFromCart: (i: unknown) => void };
    w.addToCart(cartItem);
    w.removeFromCart(cartItem);
  }, item);

  const events = await micro.waitFor(
    (all) => named("add_to_cart")(all) && named("remove_from_cart")(all),
    "an add_to_cart and a remove_from_cart",
  );

  expect(events.filter((e) => e.event?.event_name === "add_to_cart")).toHaveLength(1);
  expect(events.filter((e) => e.event?.event_name === "remove_from_cart")).toHaveLength(1);
  expect(await micro.bad()).toHaveLength(0);
});
