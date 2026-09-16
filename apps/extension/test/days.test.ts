import { describe, expect, test } from "bun:test";

import { Day, axisLabel, bandsFor, dayAfterKey, dayAt, daysToDraw, readoutLabel, todayOf, topOf } from "~/ui/days";

/**
 * Every decision the by-day figure makes before it draws anything: which days, which bands, where a
 * band tops out, and which day a pointer or a key is reading.
 */

const day = (date: string, over: Partial<Day> = {}): Day => ({
  day: date,
  pageviews: 500,
  sessions: 200,
  transactions: 0,
  signups: 0,
  transactionTotal: 0,
  ...over,
});

/** The eight days internal-service fills for a 7-day window: a partial first day, then a week. */
const EIGHT = ["09", "10", "11", "12", "13", "14", "15", "16"].map((d) => day(`2026-09-${d}`));

describe("which days are drawn", () => {
  test("the last seven — the eighth, oldest one has had its early events expire", () => {
    expect(daysToDraw(EIGHT).map((d) => d.day)).toEqual(EIGHT.slice(1).map((d) => d.day));
  });

  test("fewer than seven are all drawn", () => {
    expect(daysToDraw(EIGHT.slice(5))).toHaveLength(3);
  });
});

describe("which bands are drawn", () => {
  test("the four counts always, in the order the report prints them", () => {
    expect(bandsFor(EIGHT).map((band) => band.measure)).toEqual(["pageviews", "transactions", "signups", "sessions"]);
  });

  test("the transaction total only once there is any money to show", () => {
    const week = [...EIGHT.slice(0, 6), day("2026-09-16", { transactions: 1, transactionTotal: 42.5 })];
    expect(bandsFor(week).map((band) => band.measure)).toContain("transactionTotal");
  });
});

describe("where a band tops out", () => {
  test("at a clean number just above the busiest day, printed compact", () => {
    const [top] = bandsFor(EIGHT);
    const week = [...EIGHT.slice(0, 6), day("2026-09-16", { pageviews: 4321 })];
    expect(topOf(week, "pageviews")).toBe(4500);
    expect(top.short(topOf(week, "pageviews"))).toBe("4,500");
    expect(top.short(topOf([day("2026-09-16", { pageviews: 43210 })], "pageviews"))).toBe("45K");
  });

  test("a band with nothing in it tops out at nothing, so a flat week reads as none rather than as a scale", () => {
    expect(topOf(EIGHT, "transactions")).toBe(0);
  });
});

describe("naming a day", () => {
  const today = "2026-09-16";

  test("today is today, in UTC — the calendar the counts are kept in", () => {
    expect(todayOf(Date.parse("2026-09-16T23:30:00Z"))).toBe("2026-09-16");
    expect(axisLabel("2026-09-16", today)).toBe("Today");
    expect(readoutLabel("2026-09-16", today)).toBe("Today so far · Wed, Sep 16");
  });

  test("any other day is its weekday, and its date in the readout", () => {
    expect(axisLabel("2026-09-13", today)).toBe("Sun");
    expect(readoutLabel("2026-09-13", today)).toBe("Sun, Sep 13");
  });
});

describe("which day is being read", () => {
  test("under a pointer, every day owns its whole column, edge to edge", () => {
    expect(dayAt(0, 700, 7)).toBe(0);
    expect(dayAt(99, 700, 7)).toBe(0);
    expect(dayAt(100, 700, 7)).toBe(1);
    expect(dayAt(699, 700, 7)).toBe(6);
    expect(dayAt(900, 700, 7)).toBe(6);
    expect(dayAt(-5, 700, 7)).toBe(0);
  });

  test("the arrow keys step from the day at rest, which is the last one, and stop at the ends", () => {
    expect(dayAfterKey("ArrowLeft", null, 7)).toBe(5);
    expect(dayAfterKey("ArrowRight", null, 7)).toBe(6);
    expect(dayAfterKey("ArrowLeft", 0, 7)).toBe(0);
    expect(dayAfterKey("ArrowRight", 3, 7)).toBe(4);
    expect(dayAfterKey("Home", 3, 7)).toBe(0);
    expect(dayAfterKey("End", 3, 7)).toBe(6);
  });

  test("any other key is not a move, and nothing moves in an empty week", () => {
    expect(dayAfterKey("Tab", 3, 7)).toBeUndefined();
    expect(dayAfterKey("ArrowLeft", null, 0)).toBeUndefined();
  });
});
