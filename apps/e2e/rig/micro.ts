/**
 * Snowplow Micro's REST API, as the assertions use it.
 *
 * Micro is a real Snowplow collector + enricher: an event it reports as GOOD has passed Iglu schema
 * validation, so "the signal arrived" and "the signal is well formed" are one assertion here rather
 * than two. An event it reports as BAD was quarantined with the reason attached, which is almost
 * always the whole answer when a test fails.
 */

export interface GoodEvent {
  event: { app_id?: string; event_name?: string; tr_id?: string; tr_total?: number; [key: string]: unknown };
  contexts?: Record<string, unknown>;
  /** Present for self-describing events: `iglu:com.mediajel.events/sign_up/jsonschema/1-0-0`. */
  schema?: string;
  unstruct?: Record<string, unknown>;
}

export interface Counts {
  total: number;
  good: number;
  bad: number;
}

const json = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return (await response.json()) as T;
};

export class Micro {
  constructor(private readonly base: string) {}

  /** Drops everything Micro is holding. Between tests, never during one. */
  async reset(): Promise<void> {
    await fetch(`${this.base}/micro/reset`, { method: "POST" });
  }

  counts(): Promise<Counts> {
    return json<Counts>(`${this.base}/micro/all`);
  }

  good(): Promise<GoodEvent[]> {
    return json<GoodEvent[]>(`${this.base}/micro/good`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
  }

  bad(): Promise<unknown[]> {
    return json<unknown[]>(`${this.base}/micro/bad`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
  }

  /**
   * Waits for `predicate` to match, polling rather than sleeping: a fixed wait is either slower than
   * it needs to be or shorter than the pipeline, and the second kind passes locally and fails in CI.
   * Throws with what DID arrive, plus anything quarantined, because an empty list and a list of the
   * wrong events are different bugs and the message should say which one this is.
   */
  async waitFor(predicate: (events: GoodEvent[]) => boolean, what: string, timeoutMs = 20_000): Promise<GoodEvent[]> {
    const deadline = Date.now() + timeoutMs;
    let seen: GoodEvent[] = [];
    while (Date.now() < deadline) {
      seen = await this.good();
      if (predicate(seen)) return seen;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    const quarantined = await this.bad().catch(() => []);
    throw new Error(
      `timed out after ${timeoutMs}ms waiting for ${what}.\n` +
        `good (${seen.length}): ${JSON.stringify(seen.map(summarise), null, 2)}\n` +
        `bad (${quarantined.length}): ${JSON.stringify(quarantined, null, 2)}`,
    );
  }

  /** Waits out `ms` and answers what arrived — for the assertions whose expected answer is nothing. */
  async settle(ms = 2_500): Promise<GoodEvent[]> {
    await new Promise((resolve) => setTimeout(resolve, ms));
    return this.good();
  }
}

/** Enough of an event to recognise it in a failure message, without printing the whole payload. */
export const summarise = (event: GoodEvent) => ({
  app_id: event.event?.app_id,
  event_name: event.event?.event_name,
  schema: event.schema,
  tr_id: event.event?.tr_id,
});

export const named = (name: string) => (events: GoodEvent[]) => events.some((e) => e.event?.event_name === name);

export const transactions = (events: GoodEvent[]): GoodEvent[] =>
  events.filter((e) => e.event?.event_name === "transaction");
