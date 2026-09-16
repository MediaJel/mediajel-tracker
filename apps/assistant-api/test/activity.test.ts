import { describe, expect, test } from "bun:test";

import { ApiError } from "~/features/integrations-assistant/errors";
import { IntegrationsAssistantController } from "~/features/integrations-assistant/integrations-assistant.controller";
import { IntegrationsAssistantService } from "~/features/integrations-assistant/integrations-assistant.service";
import type {
  DailyActivitySource,
  RawDailyRow,
} from "~/features/integrations-assistant/providers/daily-activity.source";
import type {
  RawActivity,
  RawPageUrlRow,
  TagActivitySource,
} from "~/features/integrations-assistant/providers/tag-activity.source";
import { ActivityService, TAG_ACTIVITY_DAYS } from "~/features/integrations-assistant/services/activity.service";

/**
 * Tag activity, per app ID.
 *
 * internal-service is a stub throughout, and its quirks are reproduced in what the stub hands back
 * — the epoch for "none", counts as strings — because absorbing them is most of what the service
 * is for. The tests that matter most are the isolation ones: one app ID failing must not cost the
 * operator the others, and must never read as a tag that records nothing.
 */

const recorded = (over: Partial<RawActivity> = {}): RawActivity => ({
  pageviews: 1200,
  sessions: 310,
  transactions: 12,
  signups: 4,
  impressions: 0,
  total: 1534.5,
  latest_transaction_event: "2026-09-16 21:04:05.123",
  latest_signup_event: "1970-01-01 00:00:00.000",
  ...over,
});

const row = (
  url: string,
  count: RawPageUrlRow["page_url_count"],
  total: RawPageUrlRow["tr_total"] = null,
): RawPageUrlRow => ({ page_url: url, page_url_count: count, tr_total: total });

const THANK_YOU = row("https://shop.example.com/thank-you", 12, 1534.5);

const day = (date: string, over: Partial<RawDailyRow> = {}): RawDailyRow => ({
  day: date,
  pageviews: 150,
  sessions: 40,
  transactions: 2,
  signups: 0,
  impressions: 0,
  total: 255.75,
  ...over,
});

const WEEK = ["2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13", "2026-09-14", "2026-09-15", "2026-09-16"].map(
  (date) => day(date),
);

type Answer<T> = (appId: string) => Promise<T>;

/** Answers every app ID the same way unless told otherwise, and records what it was asked for. */
const stubSource = (
  answers: {
    activity?: Answer<RawActivity>;
    pageUrls?: Answer<RawPageUrlRow[]>;
    configured?: boolean;
  } = {},
): TagActivitySource & { asked: string[] } => {
  const asked: string[] = [];
  return {
    asked,
    configured: () => answers.configured ?? true,
    activity: (appId, days) => {
      asked.push(`activity ${appId} ${days}`);
      return answers.activity ? answers.activity(appId) : Promise.resolve(recorded());
    },
    pageUrls: (appId, days) => {
      asked.push(`pageUrls ${appId} ${days}`);
      return answers.pageUrls ? answers.pageUrls(appId) : Promise.resolve([THANK_YOU]);
    },
  };
};

/** Answers the days the same way for every app ID unless told otherwise, and records what it was asked for. */
const stubDays = (
  answers: { daily?: Answer<RawDailyRow[]>; configured?: boolean } = {},
): DailyActivitySource & { asked: string[] } => {
  const asked: string[] = [];
  return {
    asked,
    configured: () => answers.configured ?? true,
    daily: (appId, days) => {
      asked.push(`daily ${appId} ${days}`);
      return answers.daily ? answers.daily(appId) : Promise.resolve(WEEK);
    },
  };
};

const failing =
  (message: string): Answer<never> =>
  async () => {
    throw new Error(message);
  };

const serviceWith = (
  source: TagActivitySource,
  clock = { now: 0 },
  days: DailyActivitySource = stubDays(),
): ActivityService => {
  const service = new ActivityService(source, days);
  service.useClock(() => clock.now);
  return service;
};

/** The one app ID's answer, narrowed to a successful read. */
const onlyTag = async (source: TagActivitySource, days?: DailyActivitySource) => {
  const [tag] = (await serviceWith(source, { now: 0 }, days).read(["app-1"])).tags;
  if (tag?.status !== "ok") throw new Error(`expected an answer, got ${JSON.stringify(tag)}`);
  return tag;
};

describe("each app ID stands alone", () => {
  test("one internal-service cannot read is unavailable, and the others still answer, in the order asked", async () => {
    const refused = "internal-service answered 400: Timeout exceeded: elapsed 30.2 seconds.";
    const source = stubSource({
      activity: async (appId) => {
        // The first answers last, so request order is not simply completion order.
        if (appId === "first") await new Promise((resolve) => setTimeout(resolve, 10));
        return appId === "broken" ? failing(refused)(appId) : recorded();
      },
    });

    const { tags } = await serviceWith(source).read(["first", "broken", "last"]);

    expect(tags.map((tag) => [tag.appId, tag.status])).toEqual([
      ["first", "ok"],
      ["broken", "unavailable"],
      ["last", "ok"],
    ]);
    // The whole entry, so nothing like zeroed totals can ride along with the failure.
    expect(tags[1]).toEqual({ appId: "broken", status: "unavailable", message: refused });
  });

  test("a page breakdown that fails leaves the totals standing, and says the answer is partial", async () => {
    const tag = await onlyTag(
      stubSource({ pageUrls: failing("MediaJel's tag activity service did not answer within 20 seconds.") }),
    );

    expect(tag).toMatchObject({ pages: null, truncated: false, partial: true });
    expect(tag.totals.transactions).toBe(12);
  });

  test("a body that is not the shape it should be fails that app ID, not the request", async () => {
    const source = stubSource({
      activity: async (appId) => (appId === "odd" ? (null as unknown as RawActivity) : recorded()),
    });

    const { tags } = await serviceWith(source).read(["odd", "fine"]);

    expect(tags.map((tag) => tag.status)).toEqual(["unavailable", "ok"]);
  });

  test("every app ID is read over the same seven days, and the answer says which", async () => {
    const source = stubSource();
    const days = stubDays();
    const result = await serviceWith(source, { now: 0 }, days).read(["app-1"]);

    expect(result.days).toBe(7);
    expect(source.asked).toEqual([`activity app-1 ${TAG_ACTIVITY_DAYS}`, `pageUrls app-1 ${TAG_ACTIVITY_DAYS}`]);
    expect(days.asked).toEqual([`daily app-1 ${TAG_ACTIVITY_DAYS}`]);
  });
});

describe("internal-service's quirks", () => {
  test("ClickHouse's epoch means none in the window, and a real timestamp becomes ISO-8601 in UTC", async () => {
    const tag = await onlyTag(stubSource());

    expect(tag.lastTransactionAt).toBe("2026-09-16T21:04:05.123Z");
    expect(tag.lastSignUpAt).toBeNull();
  });

  test("an absent timestamp is none too, rather than an invalid date", async () => {
    const tag = await onlyTag(
      stubSource({
        activity: async () => recorded({ latest_transaction_event: null, latest_signup_event: undefined }),
      }),
    );

    expect([tag.lastTransactionAt, tag.lastSignUpAt]).toEqual([null, null]);
  });

  test("counts that arrive as strings are numbers, unreadable ones are zero, and money is to the cent", async () => {
    const tag = await onlyTag(
      stubSource({
        activity: async () => recorded({ pageviews: "1200", signups: "4", impressions: "n/a", total: "1534.4999" }),
      }),
    );

    expect(tag.totals).toEqual({
      pageviews: 1200,
      sessions: 310,
      transactions: 12,
      signups: 4,
      impressions: 0,
      transactionTotal: 1534.5,
    });
  });

  test("pages come most-converted first, capped at 250, and truncated says there were more", async () => {
    // Ascending, and every count a string: the order has to be this service's, not the source's.
    // Slugs rather than bare numbers, which are identifiers — 260 of those would be one page.
    const rows = Array.from({ length: 260 }, (_, i) =>
      row(`https://shop.example.com/p/page-${i}`, String(i), i % 2 ? `${i}.25` : null),
    );

    const tag = await onlyTag(stubSource({ pageUrls: async () => rows }));

    expect(tag.truncated).toBe(true);
    expect(tag.pages).toHaveLength(250);
    expect(tag.pages?.slice(0, 2)).toEqual([
      { pageUrl: "https://shop.example.com/p/page-259", conversions: 259, transactionTotal: 259.25 },
      { pageUrl: "https://shop.example.com/p/page-258", conversions: 258, transactionTotal: null },
    ]);
    expect(tag.pages?.at(-1)?.conversions).toBe(10);
  });

  test("a list that fits is not truncated", async () => {
    const tag = await onlyTag(stubSource());

    expect(tag.pages).toEqual([
      { pageUrl: "https://shop.example.com/thank-you", conversions: 12, transactionTotal: 1534.5 },
    ]);
    expect([tag.truncated, tag.partial]).toEqual([false, false]);
  });
});

describe("pages, which are reported by shape rather than by URL", () => {
  /** The page URLs that come back for the given ones, each recorded once. */
  const shapesOf = async (...urls: string[]): Promise<string[]> => {
    const tag = await onlyTag(stubSource({ pageUrls: async () => urls.map((url) => row(url, "1")) }));
    return (tag.pages ?? []).map((page) => page.pageUrl);
  };

  test("every order's confirmation URL is one page, its conversions and totals added up", async () => {
    const tag = await onlyTag(
      stubSource({
        pageUrls: async () => [
          row(
            "https://shop.example.com/checkout/order-received/1001?key=wc_order_aB3dE5fG7hJ9k&utm_nooverride=1",
            "4",
            1030.2,
          ),
          row("https://shop.example.com/checkout/order-received/1002?key=wc_order_Zy8xW6vU4tS2r", "1", 49.95),
        ],
      }),
    );

    expect(tag.pages).toEqual([
      { pageUrl: "https://shop.example.com/checkout/order-received/:id", conversions: 5, transactionTotal: 1080.15 },
    ]);
  });

  test("no query string, fragment or credential comes back, even from a value that is not a URL", async () => {
    expect(
      await shapesOf(
        "https://shop.example.com/cart?session=abc123#summary",
        "https://shop.example.com/thanks?",
        "https://customer:secret@shop.example.com/account#orders",
        "not a url?token=abc123#x",
      ),
    ).toEqual([
      "https://shop.example.com/cart",
      "https://shop.example.com/thanks",
      "https://shop.example.com/account",
      "not a url",
    ]);
  });

  test("identifiers become :id, and an ordinary product path is left alone", async () => {
    expect(
      await shapesOf(
        "https://shop.example.com/products/delta-8-gummies",
        "https://shop.example.com/orders/3f2504e0-4f89-41d3-9a0c-0305e82c3301/thanks",
        "https://shop.example.com/receipt/9f86d081884c7d65",
      ),
    ).toEqual([
      "https://shop.example.com/products/delta-8-gummies",
      "https://shop.example.com/orders/:id/thanks",
      "https://shop.example.com/receipt/:id",
    ]);
  });

  test("a page none of whose rows had a transaction total keeps null, and one that had any adds up", async () => {
    const tag = await onlyTag(
      stubSource({
        pageUrls: async () => [
          row("https://shop.example.com/contact?ref=newsletter", "2"),
          row("https://shop.example.com/contact?ref=footer", "1"),
          row("https://shop.example.com/checkout/order-received/1003", "1"),
          row("https://shop.example.com/checkout/order-received/1004", "1", "25"),
        ],
      }),
    );

    expect(tag.pages).toEqual([
      { pageUrl: "https://shop.example.com/contact", conversions: 3, transactionTotal: null },
      { pageUrl: "https://shop.example.com/checkout/order-received/:id", conversions: 2, transactionTotal: 25 },
    ]);
  });
});

describe("the days", () => {
  test("come oldest first, counts as numbers and money to the cent, however ClickHouse sent them", async () => {
    const tag = await onlyTag(
      stubSource(),
      stubDays({
        daily: async () => [
          day("2026-09-16", { pageviews: "491", sessions: "221", total: "10.456" }),
          day("2026-09-15", { transactions: "3", signups: 1 }),
        ],
      }),
    );

    expect(tag.daily).toEqual([
      { day: "2026-09-15", pageviews: 150, sessions: 40, transactions: 3, signups: 1, transactionTotal: 255.75 },
      { day: "2026-09-16", pageviews: 491, sessions: 221, transactions: 2, signups: 0, transactionTotal: 10.46 },
    ]);
  });

  test("a row whose day is not a date has nowhere on the chart to go, and is left out", async () => {
    const tag = await onlyTag(stubSource(), stubDays({ daily: async () => [day("yesterday"), day("2026-09-16")] }));

    expect(tag.daily?.map((point) => point.day)).toEqual(["2026-09-16"]);
  });

  test("a daily read that fails leaves daily null, and the totals and pages standing", async () => {
    const tag = await onlyTag(
      stubSource(),
      stubDays({ daily: failing("ClickHouse could not answer for the days: Timeout exceeded: elapsed 20.1 seconds") }),
    );

    expect(tag).toMatchObject({ daily: null, partial: false });
    expect(tag.totals.pageviews).toBe(1200);
    expect(tag.pages).toHaveLength(1);
  });

  test("a service with no ClickHouse configuration answers without days, asks nothing, and keeps the answer", async () => {
    const source = stubSource();
    const days = stubDays({ configured: false });
    const service = serviceWith(source, { now: 0 }, days);

    const first = await service.read(["app-1"]);
    await service.read(["app-1"]);

    expect(first.tags[0]).toMatchObject({ status: "ok", daily: null });
    expect(days.asked).toEqual([]);
    expect(source.asked).toHaveLength(2);
  });
});

describe("the five-minute cache", () => {
  test("a second read inside five minutes does not ask internal-service again, per app ID", async () => {
    const clock = { now: 0 };
    const source = stubSource();
    const service = serviceWith(source, clock);

    await service.read(["app-1"]);
    clock.now += 4 * 60_000 + 59_000;
    await service.read(["app-1", "app-2"]);

    expect(source.asked).toEqual(["activity app-1 7", "pageUrls app-1 7", "activity app-2 7", "pageUrls app-2 7"]);
  });

  test("after five minutes it does", async () => {
    const clock = { now: 0 };
    const source = stubSource();
    const service = serviceWith(source, clock);

    await service.read(["app-1"]);
    clock.now += 5 * 60_000;
    await service.read(["app-1"]);

    expect(source.asked).toHaveLength(4);
  });

  test("an unavailable answer is not kept, so the next read tries again", async () => {
    const source = stubSource({ activity: failing("internal-service answered 400.") });
    const service = serviceWith(source);

    await service.read(["app-1"]);
    await service.read(["app-1"]);

    expect(source.asked).toHaveLength(4);
  });

  test("nor is a partial one, so a recovered breakdown shows up on the next read", async () => {
    let pagesFail = true;
    const source = stubSource({
      pageUrls: async () => {
        if (pagesFail) throw new Error("MediaJel's tag activity service did not answer within 20 seconds.");
        return [THANK_YOU];
      },
    });
    const service = serviceWith(source);

    await service.read(["app-1"]);
    pagesFail = false;
    const { tags } = await service.read(["app-1"]);

    expect(tags[0]).toMatchObject({ status: "ok", partial: false });
  });

  test("nor is one without its days, so the chart appears once ClickHouse can give them", async () => {
    let daysFail = true;
    const days = stubDays({
      daily: async () => {
        if (daysFail) throw new Error("ClickHouse could not answer for the days: connect ECONNREFUSED");
        return WEEK;
      },
    });
    const service = serviceWith(stubSource(), { now: 0 }, days);

    await service.read(["app-1"]);
    daysFail = false;
    const { tags } = await service.read(["app-1"]);

    expect(tags[0]).toMatchObject({ status: "ok", daily: expect.any(Array) });
  });
});

describe("a service with no internal-service configuration", () => {
  test("refuses with a 503 that names what a MediaJel engineer has to set, before asking anything", async () => {
    const source = stubSource({ configured: false });

    const refused = await serviceWith(source)
      .read(["app-1"])
      .catch((err: unknown) => err);

    expect(refused).toBeInstanceOf(ApiError);
    expect((refused as ApiError).getStatus()).toBe(503);
    expect((refused as ApiError).code).toBe("activity-not-configured");
    expect((refused as ApiError).message).toContain("INTERNAL_SERVICE_URL and INTERNAL_SERVICE_BEARER_TOKEN");
    expect(source.asked).toEqual([]);
  });

  test("says so on /health, the way it says whether a deploy can be made", () => {
    const assistant = new IntegrationsAssistantService(
      {} as never,
      {} as never,
      { configured: true } as never,
      new ActivityService(stubSource({ configured: false }), stubDays()),
      { modelId: () => "stub-model" } as never,
    );

    const health = new IntegrationsAssistantController(assistant).health({
      mjUser: { username: "pacholo", email: "pacholo@mediajel.com", name: "Pacholo", sub: "s-1" },
    } as never);

    expect(health).toMatchObject({ deployConfigured: true, activityConfigured: false, dailyConfigured: true });
  });
});

describe("the appIds a request names", () => {
  /** The real controller in front of a façade that only records what reached it. */
  const controller = (asked: string[][] = []): IntegrationsAssistantController =>
    new IntegrationsAssistantController({
      who: () => ({ username: "pacholo" }),
      readActivity: async (appIds: string[]) => {
        asked.push(appIds);
        return { days: 7, tags: [] };
      },
    } as never);

  const refusal = async (query: unknown): Promise<ApiError> => {
    const refused = await controller()
      .activity({} as never, query)
      .catch((err: unknown) => err);
    expect(refused).toBeInstanceOf(ApiError);
    expect((refused as ApiError).getStatus()).toBe(400);
    return refused as ApiError;
  };

  test("are trimmed, emptied of blanks and de-duplicated in the order written", async () => {
    const asked: string[][] = [];
    await controller(asked).activity({} as never, { appIds: "a, b,,a" });

    expect(asked).toEqual([["a", "b"]]);
  });

  test("may arrive as a repeated parameter, which Express hands over as an array", async () => {
    const asked: string[][] = [];
    await controller(asked).activity({} as never, { appIds: ["a", "b, c"] });

    expect(asked).toEqual([["a", "b", "c"]]);
  });

  test("are required, and a list of only commas is not a list", async () => {
    expect((await refusal({})).message).toBe(
      "Invalid activity query: appIds — name one to five app IDs, separated by commas.",
    );
    expect((await refusal({ appIds: " , ," })).message).toContain("name one to five app IDs");
  });

  test("are five at most", async () => {
    expect((await refusal({ appIds: "a,b,c,d,e,f" })).message).toContain("at most five app IDs");
  });

  test("are refused when they are not app IDs", async () => {
    expect((await refusal({ appIds: "a,shop/checkout" })).message).toContain(
      "appIds.1 — an app ID is 1 to 128 letters, numbers, dots, dashes or underscores",
    );
    expect((await refusal({ appIds: "x".repeat(129) })).message).toContain("1 to 128");
  });

  test("may not climb out of internal-service's path — '..' passes the character rule", async () => {
    expect((await refusal({ appIds: ".." })).message).toContain("may not be a relative path");
    expect((await refusal({ appIds: "." })).message).toContain("may not be a relative path");
  });
});
