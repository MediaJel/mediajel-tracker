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
 * A `Storage` that behaves like the real one (string coercion, `length`, `key(i)`) and can be
 * told to start refusing writes the way Safari does when the tab's quota is gone.
 */
export class FakeStorage implements Storage {
  private data = new Map<string, string>();
  /** When set, `setItem` throws once the serialized payload exceeds this many characters. */
  quota = Infinity;
  writes = 0;

  get length(): number {
    return this.data.size;
  }
  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }
  getItem(key: string): string | null {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.writes += 1;
    if (String(value).length > this.quota) {
      const err = new Error("The quota has been exceeded.");
      err.name = "QuotaExceededError";
      throw err;
    }
    this.data.set(String(key), String(value));
  }
  removeItem(key: string): void {
    this.data.delete(String(key));
  }
  clear(): void {
    this.data.clear();
  }
}
