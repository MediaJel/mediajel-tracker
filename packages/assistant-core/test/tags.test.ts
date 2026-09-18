import { describe, expect, test } from "bun:test";

import { Evidence, TabTags, merge, nothingKnown, trackerStatus } from "@mediajel/assistant-core/tags";

/**
 * How the evidence about a page's tags adds up. The rules that matter: rows never move, a tag is
 * never forgotten, a state never slides back, and no warning ever asks anyone to reload anything.
 */

const SITE = "shop.example.com";
const NOW = 1_000;

/** Applies evidence in order and returns what is known at the end. */
const after = (...evidence: Evidence[]): TabTags =>
  evidence.reduce<TabTags | null>((tab, item) => merge(tab, SITE, item, NOW) ?? tab, null) ?? nothingKnown(SITE);

const script = (appId: string, delayed = false) => ({ appId, environment: "weave", version: "2", delayed });

describe("merging evidence", () => {
  test("a tag heard from several sources is one row, in the order first seen, whatever the order of arrival", () => {
    const tab = after(
      { kind: "beacon", appIds: ["second"] },
      { kind: "scripts", tags: [script("first"), script("second")] },
      { kind: "running", appIds: ["first"] },
    );

    expect(tab.tags.map((tag) => [tag.appId, tag.state])).toEqual([
      ["second", "sending"],
      ["first", "running"],
    ]);
  });

  test("a state never slides back: a tag heard sending stays sending whatever is read later", () => {
    const tab = after(
      { kind: "beacon", appIds: ["acme"] },
      { kind: "scripts", tags: [script("acme", true)] },
      { kind: "running", appIds: ["acme"] },
    );
    expect(tab.tags[0].state).toBe("sending");
  });

  test("a script fills in what the wire could not say, and never overwrites what is known", () => {
    const tab = after(
      { kind: "beacon", appIds: ["acme"] },
      { kind: "scripts", tags: [script("acme")] },
      { kind: "scripts", tags: [{ appId: "acme", environment: "other", version: "1", delayed: false }] },
    );
    expect(tab.tags[0]).toMatchObject({ environment: "weave", version: "2", announced: false });
  });

  test("a held-back script becomes installed once a re-read finds it released — and not the other way once it has run", () => {
    const held = after({ kind: "scripts", tags: [script("acme", true)] });
    expect(held.tags[0].state).toBe("held-back");

    const released = merge(held, SITE, { kind: "scripts", tags: [script("acme")] }, NOW);
    expect(released?.tags[0].state).toBe("installed");

    const running = after({ kind: "running", appIds: ["acme"] }, { kind: "scripts", tags: [script("acme", true)] });
    expect(running.tags[0].state).toBe("running");
  });

  test("what the tag announces about itself wins over what its script said", () => {
    const tab = after(
      { kind: "scripts", tags: [script("acme")] },
      {
        kind: "announced",
        tag: { appId: "acme", environment: "jane", version: "2", event: "transaction", state: "running" },
      },
    );
    expect(tab.tags[0]).toMatchObject({ state: "running", environment: "jane", event: "transaction", announced: true });
  });

  test("an announcement in a state this build does not know counts as installed", () => {
    const tab = after({ kind: "announced", tag: { appId: "acme", state: "warming-up" } });
    expect(tab.tags[0].state).toBe("installed");
  });

  test("a failed tag keeps its reason; a lower-ranked announcement changes nothing", () => {
    const tab = after(
      { kind: "announced", tag: { appId: "acme", state: "failed", error: "appId is required" } },
      { kind: "announced", tag: { appId: "acme", state: "installed" } },
    );
    expect(tab.tags[0]).toMatchObject({ state: "failed", error: "appId is required" });
  });

  test("a browser that opted out marks every tag that has not spoken for itself", () => {
    const tab = after(
      { kind: "scripts", tags: [script("quiet")] },
      { kind: "announced", tag: { appId: "loud", state: "running" } },
      { kind: "facts", facts: { trackTransPresent: false, optedOut: true } },
    );
    expect(tab.tags.map((tag) => tag.state)).toEqual(["opted-out", "running"]);
  });

  test("a new document keeps the records but starts the settling over", () => {
    const tab = after(
      { kind: "beacon", appIds: ["acme"] },
      { kind: "facts", facts: { trackTransPresent: true, optedOut: false } },
      { kind: "settled" },
      { kind: "document" },
    );
    expect(tab).toMatchObject({ settled: false, facts: null });
    expect(tab.tags).toHaveLength(1);
  });

  test("another site starts from nothing", () => {
    const here = after({ kind: "beacon", appIds: ["acme"] });
    const there = merge(here, "other.example.com", { kind: "settled" }, NOW);
    expect(there).toEqual({ site: "other.example.com", settled: true, facts: null, tags: [] });
  });

  test("evidence that changes nothing answers null, so nothing is written or pushed", () => {
    const tab = after({ kind: "beacon", appIds: ["acme"] });
    expect(merge(tab, SITE, { kind: "beacon", appIds: ["acme"] }, NOW)).toBeNull();
    expect(merge(tab, SITE, { kind: "document" }, NOW)).toBeNull();
  });
});

describe("the status derived for the Record step", () => {
  test("names the first tag and says nothing about a page that has not settled", () => {
    const status = trackerStatus(
      after({ kind: "scripts", tags: [script("acme")] }, { kind: "running", appIds: ["acme"] }),
    );
    expect(status).toMatchObject({ appId: "acme", environment: "weave", version: "2", tagPresent: true, warnings: [] });
    expect(trackerStatus(nothingKnown(SITE)).warnings).toEqual([]);
  });

  test("after the page settled with nothing, says so without asking for a reload", () => {
    const [warning] = trackerStatus(after({ kind: "settled" })).warnings;
    expect(warning).toContain("No MediaJel tag has spoken up");
  });

  test("a held-back tag, an installed one that has not started, an opted-out browser, a disabled or failed tag", () => {
    expect(trackerStatus(after({ kind: "scripts", tags: [script("acme", true)] })).warnings.join(" ")).toContain(
      "held back by a page-speed plugin",
    );
    expect(
      trackerStatus(after({ kind: "scripts", tags: [script("acme")] }, { kind: "settled" })).warnings.join(" "),
    ).toContain("hasn't finished starting");
    expect(
      trackerStatus(
        after(
          { kind: "scripts", tags: [script("acme")] },
          { kind: "facts", facts: { trackTransPresent: false, optedOut: true } },
        ),
      ).optedOut,
    ).toBe(true);
    expect(
      trackerStatus(after({ kind: "announced", tag: { appId: "acme", state: "disabled" } })).warnings.join(" "),
    ).toContain("disabled (enable=false)");
    expect(
      trackerStatus(after({ kind: "announced", tag: { appId: "acme", state: "failed", error: "boom" } })).warnings.join(
        " ",
      ),
    ).toContain("failed to start: boom");
  });

  test("an impression or sign-up tag warns that trackTrans is a no-op", () => {
    const tab = after({ kind: "announced", tag: { appId: "acme", state: "running", event: "impression" } });
    expect(trackerStatus(tab).warnings.join(" ")).toContain("event=impression");
  });

  test("no warning, in any state, mentions reloading", () => {
    const tabs = [
      nothingKnown(SITE),
      after({ kind: "settled" }),
      after({ kind: "scripts", tags: [script("a", true)] }),
      after({ kind: "scripts", tags: [script("a")] }, { kind: "settled" }),
      after(
        { kind: "facts", facts: { trackTransPresent: false, optedOut: true } },
        { kind: "scripts", tags: [script("a")] },
      ),
      after({ kind: "announced", tag: { appId: "a", state: "disabled" } }),
      after({ kind: "announced", tag: { appId: "a", state: "failed", error: "x" } }),
    ];
    for (const tab of tabs) expect(trackerStatus(tab).warnings.join(" ")).not.toMatch(/reload/i);
  });
});
