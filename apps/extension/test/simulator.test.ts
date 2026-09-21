import { describe, expect, test } from "bun:test";

import { TagRecord } from "@mediajel/assistant-core/tags";

import { simulatedStatus, urlConfiguration } from "~/ui/simulator";

/** What the simulator slip says about a URL before it runs, and about the tag once it does. */

const APP = "5f976cbb-7d29-46ce-bf07-0f701478d800";
const INSTALL = { url: `https://tags.cnna.io/?appId=${APP}&version=2`, appId: APP };

const tag = (appId: string, state: TagRecord["state"]): TagRecord => ({
  appId,
  state,
  environment: "",
  version: "2",
  event: "",
  announced: false,
  firstSeenAt: 0,
  collector: "",
  enabled: true,
  config: null,
});

describe("a pasted URL's configuration", () => {
  const view = urlConfiguration({
    url: `https://tags.cnna.io/?appId=${APP}&environment=dutchie&version=2&s3.pv=Terrabis-PV&plugin=googleAds`,
    appId: APP,
    params: { appId: APP, environment: "dutchie", version: "2", "s3.pv": "Terrabis-PV", plugin: "googleAds" },
  });

  test("prints in the configuration slip's groups, said to come from the URL", () => {
    expect(view.groups.map((group) => group.title)).toEqual(["Identity", "Audience segments", "Plugins", "Controls"]);
    expect(view.source).toBe("Read from the URL: what the tag runs with before any overrides.");
  });

  test("leaves the collector out: it is the tag build's own, not the URL's", () => {
    expect(view.groups[0].entries.map((entry) => entry.label)).toEqual(["App ID", "Environment", "Version", "Event"]);
  });

  test("carries no script block: the URL is already on screen", () => {
    expect(view.markup).toBe("");
  });
});

describe("what became of a simulated tag", () => {
  test("still loading, until the page's tags say otherwise", () => {
    expect(simulatedStatus(INSTALL, null, [], false)).toBe("loading");
  });

  test("running on its own, or beside the page's own tag", () => {
    expect(simulatedStatus(INSTALL, null, [tag(APP, "sending")], true)).toBe("running");
    expect(simulatedStatus(INSTALL, null, [tag(APP, "running"), tag("page-tag", "sending")], true)).toBe("beside");
  });

  test("silent, when the page has settled with its own tag running and this one never started", () => {
    expect(simulatedStatus(INSTALL, null, [tag("page-tag", "sending")], true)).toBe("silent");
    expect(simulatedStatus(INSTALL, null, [tag("page-tag", "sending")], false)).toBe("loading");
  });

  test("opted out, and refused by the page, each said before anything else", () => {
    expect(simulatedStatus(INSTALL, null, [tag(APP, "opted-out")], true)).toBe("opted-out");
    expect(simulatedStatus(INSTALL, { installFailed: true }, [tag(APP, "sending")], true)).toBe("failed");
  });
});
