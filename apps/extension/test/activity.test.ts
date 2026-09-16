import { describe, expect, test } from "bun:test";

import type { TagActivity } from "~/service/client";
import { ago, pageLabel, pageListing, shortAppId, tallyNumber, tallySentence } from "~/ui/activity";

/**
 * The words the panel uses about a client's traffic. A tally that says "nothing was recorded"
 * when page views are arriving — or that links a forged `javascript:` page URL — would be worse
 * than no tally at all.
 */

const NOW = Date.parse("2026-09-17T12:00:00Z");

const answered = (appId: string, totals: Partial<Extract<TagActivity, { status: "ok" }>["totals"]>, last = {}) =>
  ({
    appId,
    status: "ok",
    totals: { pageviews: 0, sessions: 0, transactions: 0, signups: 0, impressions: 0, transactionTotal: 0, ...totals },
    lastTransactionAt: null,
    lastSignUpAt: null,
    pages: [],
    truncated: false,
    partial: false,
    ...last,
  }) as TagActivity;

describe("the tally's sentence", () => {
  test("page views without the job's event is the thing to say — it is why the job exists", () => {
    const results = [answered("7bc01df0-c859-4392-b90d-a949e95dfe6f", { pageviews: 4088, sessions: 1672 })];

    expect(tallySentence(results, "transaction", NOW)).toBe(
      "Page views are arriving, but no transactions were recorded.",
    );
    expect(tallySentence(results, "signup", NOW)).toBe("Page views are arriving, but no sign-ups were recorded.");
  });

  test("names the most recent event of the job's kind, and the tag it came from when there are several", () => {
    const results = [
      answered("pageviews-tag", { pageviews: 900 }),
      answered("83bd0b2c-f64b", { transactions: 3 }, { lastTransactionAt: "2026-09-17T10:00:00.000Z" }),
    ];

    expect(tallySentence(results, "transaction", NOW)).toBe("Last transaction recorded 2 hours ago, by tag 83bd0b2c.");
  });

  test("says nothing was recorded only when nothing was", () => {
    expect(tallySentence([answered("a", {})], "transaction", NOW)).toBe(
      "Nothing was recorded for this tag in the last 7 days.",
    );
  });

  test("stays quiet when no tag could be read — a failure is not a quiet week", () => {
    expect(tallySentence([{ appId: "a", status: "unavailable", message: "timed out" }], "transaction", NOW)).toBe("");
  });
});

describe("numbers and names", () => {
  test("keeps four columns inside the panel by going compact past 9,999", () => {
    expect(tallyNumber(4088)).toBe("4,088");
    expect(tallyNumber(12_940)).toBe("12.9K");
  });

  test("a short app ID is enough to tell two tags apart", () => {
    expect(shortAppId("7bc01df0-c859-4392-b90d-a949e95dfe6f")).toBe("7bc01df0");
    expect(shortAppId("Nexxen")).toBe("Nexxen");
  });

  test("says how long ago in the largest whole unit", () => {
    expect(ago("2026-09-17T11:59:30Z", NOW)).toBe("this minute");
    expect(ago("2026-09-16T11:00:00Z", NOW)).toBe("yesterday");
  });
});

describe("the page list", () => {
  const pages = Array.from({ length: 14 }, (_, index) => ({ pageUrl: `https://shop.example.com/page-${index}` }));

  test("lists ten, offers the rest, and filters only once all of them are showing", () => {
    expect(pageListing(pages, false, "")).toMatchObject({ canFilter: false, canShowAll: true });
    expect(pageListing(pages, false, "").shown).toHaveLength(10);
    expect(pageListing(pages, true, "").shown).toHaveLength(14);
    expect(pageListing(pages, true, " PAGE-1").shown.map((page) => page.pageUrl)).toEqual([
      "https://shop.example.com/page-1",
      "https://shop.example.com/page-10",
      "https://shop.example.com/page-11",
      "https://shop.example.com/page-12",
      "https://shop.example.com/page-13",
    ]);
  });

  test("a short list has nothing more to offer and nothing to filter", () => {
    expect(pageListing(pages.slice(0, 3), false, "")).toMatchObject({
      canFilter: false,
      canShowAll: false,
      grouped: false,
    });
  });

  test("knows when a row stands for many pages", () => {
    const shaped = [{ pageUrl: "https://www.binoidcbd.com/checkout/order-received/:id" }];
    expect(pageListing(shaped, false, "").grouped).toBe(true);
  });
});

describe("page URLs", () => {
  test("shows the path, and the host only when it is somewhere other than the job's site", () => {
    expect(pageLabel("https://www.seedoflifelabs.com/location/billings/?ref=1", "www.seedoflifelabs.com")).toEqual({
      path: "/location/billings/?ref=1",
      host: "",
      href: "https://www.seedoflifelabs.com/location/billings/?ref=1",
    });
    expect(pageLabel("https://checkout.dutchie.com/thank-you", "www.seedoflifelabs.com").host).toBe(
      "checkout.dutchie.com",
    );
  });

  test("a grouped page shape is not a link — it stands for many pages and is none of them", () => {
    expect(pageLabel("https://www.binoidcbd.com/checkout/order-received/:id", "www.binoidcbd.com")).toEqual({
      path: "/checkout/order-received/:id",
      host: "",
      href: null,
    });
  });

  test("never turns a forged javascript: URL into a link", () => {
    expect(pageLabel("javascript:alert(1)", "shop.example.com").href).toBeNull();
    expect(pageLabel("not a url", "shop.example.com")).toEqual({ path: "not a url", host: "", href: null });
  });
});
