import { describe, expect, test } from "bun:test";

import { TAG_URL_ATTRIBUTES, TagSearch, readPageContext, tagsAmong } from "@mediajel/assistant-core/context";

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

describe("finding tags in copies of a page's scripts", () => {
  /** What reading a script out of a page in another realm yields: its URL attributes and its base. */
  const copyOf = (attributes: Record<string, string>, baseURI = "https://www.eaze.com/") => ({
    baseURI,
    getAttribute: (name: string) => attributes[name] ?? null,
  });

  test("reads a Next.js-injected tag — as www.eaze.com serves it — from a copy of its script", () => {
    // next/script's afterInteractive inserts this after hydration, long after the document loaded.
    const nextScript = copyOf({
      src: "https://tags.cnna.io/?appId=Eaze&version=2",
      id: "mediajel",
      "data-nscript": "afterInteractive",
    });

    expect(tagsAmong([nextScript])).toEqual([
      { appId: "Eaze", environment: "production", version: "2", delayed: false },
    ]);
  });

  test("resolves a URL against the page it came from, and knows a held-back tag", () => {
    expect(tagsAmong([copyOf({ "data-rocket-src": "//tags.cnna.io?appId=held" })])).toEqual([
      { appId: "held", environment: "production", version: "1", delayed: true },
    ]);
  });

  test("finds the same tags in copies as in the live page", () => {
    const markup = `${WP_ROCKET_TAG}<script src="https://tags.cnna.io/?appId=acme&environment=weave"></script>`;
    const live = Array.from(pageWith(markup).document.getElementsByTagName("script"));
    const copies = live.map((script) =>
      copyOf(Object.fromEntries(TAG_URL_ATTRIBUTES.map((name) => [name, script.getAttribute(name) ?? ""]))),
    );

    expect(tagsAmong(copies)).toEqual(readPageContext(pageWith(markup)).tags);
  });
});
