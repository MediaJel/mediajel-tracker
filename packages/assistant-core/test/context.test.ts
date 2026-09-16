import { describe, expect, test } from "bun:test";

import { TagSearch, readPageContext } from "@mediajel/assistant-core/context";
import { snapshotTracker } from "@mediajel/assistant-core/recorder/context";
import { askRunningTags } from "@mediajel/assistant-core/trackers";

/**
 * Which MediaJel tags a page carries decides what the panel can look up and what it warns about,
 * so detection is exercised against real markup. A parsed document never loads its scripts, which
 * keeps the tag URLs below from reaching the network.
 */

const pageWith = (html: string): Window =>
  ({
    document: new DOMParser().parseFromString(
      `<!doctype html><html><head>${html}</head><body></body></html>`,
      "text/html",
    ),
    location: { href: "https://www.seedoflifelabs.com/", hostname: "www.seedoflifelabs.com" },
  }) as unknown as Window;

const tagsOn = (html: string, search: TagSearch = {}) => readPageContext(pageWith(html), search).tags;

// Verbatim from www.seedoflifelabs.com, where WP Rocket delays every third-party script.
const WP_ROCKET_TAG = `<script type="text/rocketlazyloadscript" data-rocket-type='text/javascript' data-rocket-src='https://tags.cnna.io?appId=7bc01df0-c859-4392-b90d-a949e95dfe6f&environment=weave&segmentId=JWdonBJ-xqVx13qmvHGm8g&version=2' data-rocket-defer defer></script>`;

describe("finding MediaJel tags", () => {
  test("reads a tag's configuration back out of its script URL", () => {
    const page = readPageContext(
      pageWith(`<script src="https://tags.cnna.io/?appId=acme&environment=weave&version=2"></script>`),
    );

    expect(page.tagPresent).toBe(true);
    expect(String(page.tag.appId)).toBe("acme");
    expect(page.tags).toEqual([{ appId: "acme", environment: "weave", version: "2", delayed: false }]);
  });

  test("a tag a page-speed plugin is holding back is still a tag — it just has not run", () => {
    expect(tagsOn(WP_ROCKET_TAG)).toEqual([
      { appId: "7bc01df0-c859-4392-b90d-a949e95dfe6f", environment: "weave", version: "2", delayed: true },
    ]);
    expect(tagsOn(`<script data-src="https://tags.cnna.io/?appId=lite"></script>`)[0]?.delayed).toBe(true);
    expect(tagsOn(`<script data-pmdelayedscript="https://tags.cnna.io/?appId=perf"></script>`)[0]?.appId).toBe("perf");
  });

  test("finds every tag on the page, once per app ID, in document order", () => {
    const tags = tagsOn(
      [
        `<script src="https://tags.cnna.io/?appId=pageviews"></script>`,
        `<script src="https://tags.cnna.io/?appId=transactions&version=2"></script>`,
        `<script src="https://tags.cnna.io/?appId=pageviews&event=impression"></script>`,
      ].join(""),
    );

    expect(tags.map((tag) => tag.appId)).toEqual(["pageviews", "transactions"]);
  });

  test("another vendor's appId parameter is not a MediaJel tag", () => {
    const page = readPageContext(pageWith(`<script src="https://widget.chat.example/loader.js?appId=xyz"></script>`));

    expect(page.tagPresent).toBe(false);
    expect(page.tags).toEqual([]);
  });

  test("mediajelAppId is ours wherever the tag is served from", () => {
    expect(tagsOn(`<script src="https://cdn.client.example/mj.js?mediajelAppId=proxied"></script>`)[0]?.appId).toBe(
      "proxied",
    );
  });

  test("the training sandbox's localhost tag and a build's own tag origin both count", () => {
    const staging = `<script src="https://tags.staging.example/?appId=staging"></script>`;

    expect(tagsOn(`<script src="http://localhost:1234/?appId=sandbox"></script>`)[0]?.appId).toBe("sandbox");
    expect(tagsOn(staging)).toEqual([]);
    expect(tagsOn(staging, { origins: ["https://tags.staging.example"] })[0]?.appId).toBe("staging");
  });
});

describe("tags Snowplow says are running", () => {
  /** Snowplow's loader: a command function with a queue, running function commands with its trackers. */
  const snowplowWith = (trackers: Record<string, unknown>) => {
    const tracker = Object.assign(
      (command: unknown) => {
        if (typeof command === "function") command.call(trackers);
      },
      { q: [] as unknown[] },
    );
    return { tracker } as unknown as Window;
  };

  test("answers with the app IDs the page's trackers are named after", () => {
    const answers: string[][] = [];
    askRunningTags(snowplowWith({ "7bc01df0": {}, "83bd0b2c": {} }), (appIds) => answers.push(appIds));
    expect(answers).toEqual([["7bc01df0", "83bd0b2c"]]);
  });

  test("leaves a page's own `tracker` global alone when it is not Snowplow's", () => {
    let called = false;
    const page = { tracker: () => (called = true) } as unknown as Window;
    askRunningTags(page, () => (called = true));
    expect(called).toBe(false);
  });

  test("a Snowplow that throws does not throw into the page", () => {
    const page = {
      tracker: Object.assign(
        () => {
          throw new Error("broken");
        },
        { q: [] },
      ),
    } as unknown as Window;
    expect(() => askRunningTags(page, () => undefined)).not.toThrow();
  });

  test("a running tag with no readable script is still found, and names the page's tag", () => {
    const page = readPageContext(pageWith(""), { running: ["proxied-app"] });

    expect(page.tagPresent).toBe(true);
    expect(String(page.tag.appId)).toBe("proxied-app");
    expect(page.tags).toEqual([{ appId: "proxied-app", environment: "", version: "", delayed: false }]);
  });

  test("a delayed script whose tag has since run is one tag, and not delayed", () => {
    const page = readPageContext(pageWith(WP_ROCKET_TAG), { running: ["7bc01df0-c859-4392-b90d-a949e95dfe6f"] });

    expect(page.tags).toEqual([
      { appId: "7bc01df0-c859-4392-b90d-a949e95dfe6f", environment: "weave", version: "2", delayed: false },
    ]);
  });
});

describe("the tracker status", () => {
  test("says a delayed tag is delayed, rather than missing", () => {
    const status = snapshotTracker(readPageContext(pageWith(WP_ROCKET_TAG)));

    expect(status.appId).toBe("7bc01df0-c859-4392-b90d-a949e95dfe6f");
    expect(status.tags).toHaveLength(1);
    expect(status.warnings.join(" ")).toContain("delayed by a page-speed plugin");
    expect(status.warnings.join(" ")).not.toContain("No MediaJel tag");
  });

  test("still says so when there is no tag at all", () => {
    const status = snapshotTracker(readPageContext(pageWith("")));

    expect(status.tags).toEqual([]);
    expect(status.warnings[0]).toContain("No MediaJel tag on this page");
  });

  test("keeps the loading warning for a tag that is not held back", () => {
    const status = snapshotTracker(
      readPageContext(pageWith(`<script src="https://tags.cnna.io/?appId=acme"></script>`)),
    );

    expect(status.warnings.join(" ")).toContain("window.trackTrans is not on the page (yet)");
  });
});
