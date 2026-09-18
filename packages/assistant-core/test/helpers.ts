import { TimelineEvent, WIDGET_SESSION_VERSION, WidgetSession } from "@mediajel/assistant-core/types";

/**
 * Builders for the tests. They produce real, complete objects — every test in this package
 * asserts against the actual modules, never against a mock of the code under test.
 */

/**
 * Real elapsed time. The store's debounce is a real `setTimeout`, and faking the clock would
 * only prove that the fake fires — these few waits keep the assertions about the real thing.
 */
export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

let seq = 0;

const defaultsByKind: Record<TimelineEvent["kind"], Record<string, unknown>> = {
  page: {},
  network: {
    sub: "fetch",
    method: "POST",
    url: "https://shop.example.com/checkout",
    status: 200,
    reqType: "application/json",
    reqBody: "{}",
    resType: "application/json",
    resBody: "{}",
    ms: 12,
    category: "page",
  },
  datalayer: { layer: "dataLayer", data: { event: "purchase" } },
  form: { selector: "form#checkout", action: "/pay", method: "post", fields: [] },
  click: { selector: "button#pay", tag: "BUTTON", text: "Pay", href: null },
  nav: { sub: "pushState", from: "/cart", to: "/thank-you" },
  dom: { items: [] },
  storage: { area: "local", op: "set", key: "cart", value: "1" },
  message: { origin: "https://pay.example.com", data: { ok: true } },
  platform: { detected: "Shopify", globals: ["Shopify"], spa: false },
};

export const makeEvent = (overrides: Partial<TimelineEvent> & Pick<TimelineEvent, "kind">): TimelineEvent => {
  seq += 1;
  return {
    id: `e${seq}`,
    t: seq,
    pageId: "p1",
    summary: `${overrides.kind} event`,
    score: 0,
    ...defaultsByKind[overrides.kind],
    ...overrides,
  } as TimelineEvent;
};

export const makeSession = (overrides: Partial<WidgetSession> = {}): WidgetSession => ({
  v: WIDGET_SESSION_VERSION,
  id: "s1",
  goal: "transaction",
  step: "home",
  startedAt: 1_700_000_000_000,
  pages: [{ id: "p1", url: "https://shop.example.com/cart", title: "Cart", t: 0 }],
  timeline: [],
  markedIds: [],
  ...overrides,
});

/**
 * A real shipped frictionless tag, kept here as a fixture.
 *
 * It used to be imported from the knowledge base, which now lives in the assistant service
 * (apps/assistant-api) rather than in the client — but the verify runner still has to prove it
 * can rewrite and run the genuine article, not a toy. Copied rather than referenced across the
 * repo boundary on purpose: this is a test fixture and should stay stable even when the
 * service's prompt corpus changes.
 */
export const REAL_DATALAYER_TAG = `// Real shipped tag — GA4 purchase push on the dataLayer (the most common shape).
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
