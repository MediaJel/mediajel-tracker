import { describe, expect, test } from "bun:test";

import { ClickHouseDailySource } from "~/features/integrations-assistant/providers/clickhouse-daily.source";

/**
 * The ClickHouse half of the days: exactly what is asked, how, and what a refusal becomes. The
 * client is a stub that never opens a socket; the query itself was checked against production by
 * hand, and its counting rules are internal-service's own.
 */

const CONFIGURED = {
  CLICKHOUSE_URL: "https://clickhouse.test:8443",
  CLICKHOUSE_USER: "reader",
  CLICKHOUSE_PASSWORD: "secret",
};

const sourceWith = (values: Record<string, string | undefined> = CONFIGURED): ClickHouseDailySource =>
  new ClickHouseDailySource({ get: (key: string) => values[key] } as never);

interface Asked {
  query: string;
  query_params?: Record<string, unknown>;
  format?: string;
  clickhouse_settings?: Record<string, unknown>;
}

/** A client that answers every query with these rows — or refuses — and records what it was asked. */
const clientAnswering = (answer: unknown[] | Error): { asked: Asked[]; client: never } => {
  const asked: Asked[] = [];
  const client = {
    query: async (params: Asked) => {
      asked.push(params);
      if (answer instanceof Error) throw answer;
      return { json: async () => answer };
    },
    close: async () => undefined,
  };
  return { asked, client: client as never };
};

const ROW = { day: "2026-09-16", pageviews: 491, sessions: 221, transactions: 0, signups: 0, impressions: 0, total: 0 };

describe("what ClickHouse is asked", () => {
  test("the app ID and the days as parameters — never in the text — read-only, with a ceiling on its time", async () => {
    const { asked, client } = clientAnswering([ROW]);
    const source = sourceWith();
    source.useClient(client);

    await source.daily("shop 1/a", 7);

    expect(asked).toHaveLength(1);
    const [sent] = asked;
    expect(sent.query_params).toEqual({ appId: "shop 1/a", daysToTrack: 7 });
    expect(sent.query).not.toContain("shop 1/a");
    expect(sent.query).toContain("{appId:String}");
    expect(sent.query).toContain("{daysToTrack:Int64}");
    expect(sent.format).toBe("JSONEachRow");
    expect(sent.clickhouse_settings).toMatchObject({ readonly: "2", max_execution_time: 20 });
  });

  test("counts the way internal-service's activity query counts, over the same tables", async () => {
    const { asked, client } = clientAnswering([ROW]);
    const source = sourceWith();
    source.useClient(client);

    await source.daily("app-1", 7);

    const [sent] = asked;
    expect(sent.query).toContain("SNOWPLOW.TAG_ACTIVITY_TABLE");
    expect(sent.query).toContain("SNOWPLOW.SNOWPLOW_SESSIONS_MV");
    expect(sent.query).toContain("EVENT_NAME = 'transaction' AND TR_ORDERID != '' AND TR_TOTAL IS NOT NULL");
    expect(sent.query).toContain("'emailAddress'");
    // Every day in the window gets a row, so a quiet day is a zero and not a gap.
    expect(sent.query).toContain("WITH FILL");
  });

  test("hands the rows over as they came", async () => {
    const { client } = clientAnswering([ROW]);
    const source = sourceWith();
    source.useClient(client);

    expect(await source.daily("app-1", 7)).toEqual([ROW]);
  });
});

describe("a refusal", () => {
  test("names ClickHouse and carries its own words", async () => {
    const { client } = clientAnswering(new Error("Timeout exceeded: elapsed 20.1 seconds"));
    const source = sourceWith();
    source.useClient(client);

    await expect(source.daily("app-1", 7)).rejects.toThrow(
      "ClickHouse could not answer for the days: Timeout exceeded: elapsed 20.1 seconds",
    );
  });
});

describe("whether the source is configured", () => {
  test("needs the URL, the user and the password", () => {
    expect(sourceWith().configured()).toBe(true);
    expect(sourceWith({ ...CONFIGURED, CLICKHOUSE_URL: undefined }).configured()).toBe(false);
    expect(sourceWith({ ...CONFIGURED, CLICKHOUSE_USER: undefined }).configured()).toBe(false);
    expect(sourceWith({ ...CONFIGURED, CLICKHOUSE_PASSWORD: undefined }).configured()).toBe(false);
  });

  test("does not count blanks as set", () => {
    expect(sourceWith({ ...CONFIGURED, CLICKHOUSE_URL: "   " }).configured()).toBe(false);
  });
});
