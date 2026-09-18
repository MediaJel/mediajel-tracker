import { describe, expect, test } from "bun:test";

import {
  Evidence,
  RecordedTag,
  TabTags,
  TagRecord,
  merge,
  nothingKnown,
  trackerStatus,
  withDefaults,
} from "@mediajel/assistant-core/tags";
import { TagSummary } from "@mediajel/assistant-core/context";

/**
 * How the evidence about a page's tags adds up. The rules that matter: rows never move, a tag is
 * never forgotten, a state never slides back, a source higher up wins key by key over one below
 * it, and no warning ever asks anyone to reload anything.
 */

const SITE = "shop.example.com";
const NOW = 1_000;

/** Applies evidence in order and returns what is known at the end. */
const after = (...evidence: Evidence[]): TabTags =>
  evidence.reduce<TabTags | null>((tab, item) => merge(tab, SITE, item, NOW) ?? tab, null) ?? nothingKnown(SITE);

const script = (appId: string, delayed = false, params: Record<string, string> = {}): TagSummary => ({
  appId,
  environment: "weave",
  version: "2",
  event: "",
  delayed,
  params,
  src: `https://tags.cnna.io/?appId=${appId}&environment=weave&version=2`,
  element: "",
});

/** What the tag's own record event says, as the wire decoder hands it over. */
const recorded = (appId: string, params: Record<string, string>, extra: Partial<RecordedTag> = {}): RecordedTag => ({
  appId,
  environment: "dutchie",
  version: "2",
  event: "",
  collector: "collector-azsx401.dmp.cnna.io",
  config: {
    params,
    src: "",
    element: `<script src="https://tags.cnna.io/?appId=${appId}"></script>`,
    source: "record",
  },
  ...extra,
});

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
      { kind: "scripts", tags: [{ ...script("acme"), environment: "other", version: "1" }] },
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

    const announcement: Evidence = { kind: "announced", tag: { appId: "acme", state: "running", environment: "jane" } };
    const told = after(announcement, { kind: "scripts", tags: [script("acme")] });
    expect(merge(told, SITE, announcement, NOW)).toBeNull();
    expect(merge(told, SITE, { kind: "scripts", tags: [script("acme")] }, NOW)).toBeNull();
  });
});

describe("what the wire and the tag's own record event say", () => {
  test("a beacon says the tag is sending, where to — filled once — and when it was last heard", () => {
    const heard = after({ kind: "beacon", appIds: ["acme"], collector: "collector-a.dmp.cnna.io" });
    expect(heard.tags[0]).toMatchObject({ state: "sending", collector: "collector-a.dmp.cnna.io", lastHeardAt: NOW });
    expect(trackerStatus(heard).collector).toBe("collector-a.dmp.cnna.io");

    const again = merge(
      heard,
      SITE,
      { kind: "beacon", appIds: ["acme"], collector: "collector-b.dmp.cnna.io" },
      NOW + 1,
    );
    expect(again?.tags[0]).toMatchObject({ collector: "collector-a.dmp.cnna.io", lastHeardAt: NOW + 1 });
  });

  test("the record event outranks the announcement, which outranks the script — key by key, gaps filled from below", () => {
    const tab = after(
      { kind: "scripts", tags: [script("acme", false, { s1: "from-script", logs: "false" })] },
      {
        kind: "announced",
        tag: {
          appId: "acme",
          state: "running",
          environment: "jane",
          collector: "//collector-b.dmp.cnna.io",
          src: "https://tags.cnna.io/?appId=acme&s1=from-announcement&environment=jane",
        },
      },
      { kind: "beacon", appIds: ["acme"], records: [recorded("acme", { s1: "from-record", "s3.pv": "00000" })] },
    );
    const [tag] = tab.tags;
    expect(tag).toMatchObject({
      environment: "dutchie",
      version: "2",
      collector: "collector-azsx401.dmp.cnna.io",
      enabled: true,
      config: {
        params: { s1: "from-record", "s3.pv": "00000", logs: "false" },
        src: "https://tags.cnna.io/?appId=acme&s1=from-announcement&environment=jane",
        element: `<script src="https://tags.cnna.io/?appId=acme"></script>`,
        source: "record",
      },
    });

    // Sources below the record fill gaps only, and change nothing when there are none to fill.
    expect(merge(tab, SITE, { kind: "scripts", tags: [script("acme", false, { s1: "read-again" })] }, NOW)).toBeNull();
    expect(
      merge(tab, SITE, { kind: "announced", tag: { appId: "acme", state: "running", environment: "late" } }, NOW)
        ?.tags[0].environment,
    ).toBeUndefined();
  });

  test("a script is the first word on a tag's configuration, and an announcement is the next", () => {
    const fromScript = after({ kind: "scripts", tags: [script("acme", false, { s1: "from-script" })] });
    expect(fromScript.tags[0].config).toMatchObject({ params: { s1: "from-script" }, source: "script" });
    expect(fromScript.tags[0].config?.src).toBe("https://tags.cnna.io/?appId=acme&environment=weave&version=2");

    const announced = merge(
      fromScript,
      SITE,
      { kind: "announced", tag: { appId: "acme", state: "running", src: "https://tags.cnna.io/?appId=acme&s1=told" } },
      NOW,
    )!;
    expect(announced.tags[0].config).toMatchObject({ params: { s1: "told" }, source: "announcement" });
    expect(announced.tags[0].config?.src).toBe("https://tags.cnna.io/?appId=acme&s1=told");
  });

  test("enable=false disables the tag, from whichever source says so last by rank", () => {
    expect(after({ kind: "scripts", tags: [script("acme", false, { enable: "false" })] }).tags[0].enabled).toBe(false);
    expect(
      after({ kind: "announced", tag: { appId: "acme", state: "disabled", enable: false } }).tags[0],
    ).toMatchObject({
      state: "disabled",
      enabled: false,
    });
    const overridden = after(
      { kind: "scripts", tags: [script("acme", false, { enable: "false" })] },
      { kind: "announced", tag: { appId: "acme", state: "running", enable: true } },
    );
    expect(overridden.tags[0].enabled).toBe(true);
    expect(after({ kind: "beacon", appIds: ["acme"] }).tags[0].enabled).toBe(true);
  });

  test("a tag heard only on the wire has no configuration yet", () => {
    expect(after({ kind: "beacon", appIds: ["acme"] }).tags[0].config).toBeNull();
  });

  test("a row an older worker wrote is completed — on its own, and when new evidence arrives", () => {
    const old = {
      appId: "old",
      state: "installed",
      environment: "weave",
      version: "2",
      event: "",
      announced: false,
      firstSeenAt: 1,
    } as TagRecord;
    expect(withDefaults(old)).toEqual({ ...old, collector: "", enabled: true, config: null, lastHeardAt: null });
    const complete = withDefaults(old);
    expect(withDefaults(complete)).toBe(complete);

    const tab: TabTags = { site: SITE, settled: true, facts: null, tags: [old] };
    const upgraded = merge(tab, SITE, { kind: "document" }, NOW);
    expect(upgraded?.tags[0]).toEqual({ ...complete, ...withDefaults(old) });
    expect(merge(upgraded, SITE, { kind: "settled" }, NOW)?.tags).toBe(upgraded!.tags);
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
