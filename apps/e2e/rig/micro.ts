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

  /**
   * The filtered form of /micro/good, which Micro supports as a POST body: `schema` (implies a
   * self-describing event), `contexts` (every named entity must be attached), `event_type` and
   * `limit`. Filtering in Micro rather than in the test keeps a failure message about the events
   * that matter instead of everything the page happened to send.
   */
  matching(filters: {
    schema?: string;
    contexts?: string[];
    event_type?: string;
    limit?: number;
  }): Promise<GoodEvent[]> {
    return json<GoodEvent[]>(`${this.base}/micro/good`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(filters),
    });
  }

  /**
   * Whether Micro's Iglu resolver can find a schema — /micro/iglu/{vendor}/{name}/jsonschema/{ver}.
   * A resolved schema answers with itself; an unresolved one answers with the repositories it tried
   * and why each failed. Worth asking BEFORE sending anything: a schema the tracker names but the
   * registry does not have quarantines every event that carries it, and the only clue in the bad
   * event is a resolution error several layers down.
   */
  async resolves(iglu: string): Promise<{ ok: boolean; detail: unknown }> {
    const path = iglu.replace(/^iglu:/, "");
    const response = await fetch(`${this.base}/micro/iglu/${path}`);
    const body = await response.json();
    return { ok: response.ok && typeof body === "object" && body !== null && "$schema" in body, detail: body };
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

  /**
   * total === good + bad. Snowplow's own test helpers assert this, and it is worth asserting: a
   * mismatch means Micro counted a payload it could neither validate nor quarantine, which is a
   * pipeline problem rather than a tracking one and should not read as a failed tag.
   */
  async consistent(): Promise<boolean> {
    const { total, good, bad } = await this.counts();
    return total === good + bad;
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
