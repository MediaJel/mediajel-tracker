import { TimelineEvent } from "@mediajel/assistant-core/types";

/**
 * Plain-language readings of recorded events — what a site owner would say happened, not what
 * the browser API was called. Also pulls the facts a purchase or sign-up is made of (order id,
 * total, item count, email shape) out of whatever payload carried them, so the timeline and
 * the suggestion cards can show "Order T4821 · $84.00 · 2 items" instead of JSON.
 */

export interface EventFacts {
  orderId?: string;
  total?: string;
  items?: number;
  email?: string;
  eventName?: string;
}

export interface EventReading {
  /** One short line a layperson understands. */
  title: string;
  /** Supporting specifics, already formatted ("Order T4821 · $84.00 · 2 items"). */
  facts: EventFacts;
  /** True for rows that are usually noise (our own tracker, pre-recording replays). */
  background: boolean;
}

const ID_KEYS = /^(transaction_?id|order_?id|order_?number|orderid|checkout_?id|confirmation|reference|id)$/i;
const TOTAL_KEYS = /^(value|total|grand_?total|amount|order_?total|revenue|subtotal)$/i;
const ITEMS_KEYS = /^(items|products|line_?items|order_?items|cart_?items)$/i;
const EMAIL_KEYS = /email/i;
const PURCHASE_EVENT = /purchase|order|transaction|checkout_complete|conversion/i;

const money = (value: unknown): string | undefined => {
  const number = typeof value === "number" ? value : typeof value === "string" ? parseFloat(value) : NaN;
  if (!Number.isFinite(number)) return undefined;
  return number >= 1000 ? `$${number.toFixed(0)}` : `$${number.toFixed(2)}`;
};

const walk = (value: unknown, depth: number, facts: EventFacts, allowBareId: boolean): void => {
  if (depth > 4 || value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const entry of value.slice(0, 20)) walk(entry, depth + 1, facts, allowBareId);
    return;
  }
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (facts.eventName === undefined && key === "event" && typeof entry === "string") facts.eventName = entry;
    if (facts.orderId === undefined && ID_KEYS.test(key) && (typeof entry === "string" || typeof entry === "number")) {
      const text = String(entry);
      const bare = key.toLowerCase() === "id";
      if (text.length <= 40 && (!bare || (allowBareId && depth <= 1))) facts.orderId = text;
    }
    if (facts.total === undefined && TOTAL_KEYS.test(key)) {
      const formatted = money(entry);
      if (formatted) facts.total = formatted;
    }
    if (facts.items === undefined && ITEMS_KEYS.test(key) && Array.isArray(entry)) facts.items = entry.length;
    if (facts.email === undefined && EMAIL_KEYS.test(key) && typeof entry === "string" && entry.includes("@")) {
      facts.email = entry;
    }
    if (entry && typeof entry === "object") walk(entry, depth + 1, facts, allowBareId);
  }
};

/**
 * Depth-limited walk for the facts. Named id keys (order_id, transaction_id…) win over a bare
 * `id`, which is only accepted on a second pass when nothing better was found.
 */
export const extractFacts = (value: unknown, depth = 0, facts: EventFacts = {}): EventFacts => {
  walk(value, depth, facts, false);
  if (facts.orderId === undefined) walk(value, depth, facts, true);
  return facts;
};

const parseBody = (body: string): unknown => {
  if (!body) return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
};

const pathOf = (url: string): string => {
  try {
    const parsed = new URL(url, typeof location === "undefined" ? "https://page.invalid/" : location.href);
    return parsed.pathname + (parsed.search.length > 1 && parsed.search.length < 40 ? parsed.search : "");
  } catch {
    return url;
  }
};

export const factsLine = (facts: EventFacts): string =>
  [
    facts.orderId ? `Order ${facts.orderId}` : null,
    facts.total ?? null,
    facts.items !== undefined ? `${facts.items} item${facts.items === 1 ? "" : "s"}` : null,
    facts.email ?? null,
  ]
    .filter(Boolean)
    .join(" · ");

export const describeEvent = (event: TimelineEvent): EventReading => {
  switch (event.kind) {
    case "network": {
      if (event.category === "tracker") {
        return { title: event.summary.replace(/^tracker sent/, "The MediaJel tag sent"), facts: {}, background: true };
      }
      const facts = extractFacts(parseBody(event.resBody));
      extractFacts(parseBody(event.reqBody), 0, facts);
      const verb = event.method === "GET" ? "Loaded" : "Sent";
      const status = event.status >= 400 ? ` — failed (${event.status})` : event.status > 0 ? ` (${event.status})` : "";
      return { title: `${verb} ${pathOf(event.url)}${status}`, facts, background: false };
    }
    case "datalayer": {
      const facts = extractFacts(event.data);
      const name = facts.eventName;
      const title = name
        ? PURCHASE_EVENT.test(name)
          ? `“${name}” event on the data layer`
          : `Data layer event “${name}”`
        : `Data pushed to ${event.layer}`;
      return { title, facts, background: !!event.replayed };
    }
    case "form": {
      const facts: EventFacts = {};
      const email = event.fields.find((field) => /email/i.test(field.name))?.value;
      if (email) facts.email = email;
      return {
        title: `Submitted a form (${event.fields.length} field${event.fields.length === 1 ? "" : "s"})`,
        facts,
        background: false,
      };
    }
    case "click":
      return {
        title: event.text ? `Clicked “${event.text}”` : `Clicked ${event.tag.toLowerCase()}`,
        facts: {},
        background: false,
      };
    case "nav":
      return { title: `Went to ${pathOf(event.to)}`, facts: {}, background: false };
    case "page":
      return { title: `Page: ${pathOf(event.summary.replace(/^page /, ""))}`, facts: {}, background: true };
    case "dom": {
      const first = event.items[0]?.text ?? "";
      return {
        title: `The page showed “${first.slice(0, 70)}${first.length > 70 ? "…" : ""}”`,
        facts: {},
        background: false,
      };
    }
    case "storage":
      return {
        title: `Saved “${event.key}” to ${event.area === "local" ? "local" : "session"} storage`,
        facts: {},
        background: true,
      };
    case "message": {
      const facts = extractFacts(event.data);
      return { title: `Message from ${event.origin || "an embedded frame"}`, facts, background: false };
    }
    case "platform":
      return {
        title: event.detected ? `Built on ${event.detected}` : "Platform not recognised",
        facts: {},
        background: true,
      };
    default:
      return { title: (event as TimelineEvent).summary, facts: {}, background: false };
  }
};
