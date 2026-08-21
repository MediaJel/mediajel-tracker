import { describe, expect, test } from "bun:test";

import { QueryStringContext } from "@mediajel/tracker-core/types";
import { categorize, isOwnTraffic, peekTrackerEvent } from "@mediajel/tracker-widget/recorder/classify";

const tag = { collector: "//collector.cnna.io" } as unknown as QueryStringContext;

describe("categorize", () => {
  test("collector traffic and snowplow paths are tracker, the shop's own calls are page", () => {
    expect(categorize("https://collector.cnna.io/com.snowplowanalytics.snowplow/tp2", tag)).toBe("tracker");
    expect(categorize("https://shop.example.com/analytics/track", tag)).toBe("tracker");
    expect(categorize("https://shop.example.com/api/checkout", tag)).toBe("page");
  });
});

describe("isOwnTraffic", () => {
  test("provider and GitHub calls are the widget's own and never recorded", () => {
    for (const url of [
      "https://ai-gateway.vercel.sh/v4/ai",
      "https://api.openai.com/v1/chat",
      "https://api.anthropic.com/v1/messages",
      "https://api.github.com/repos/MediaJel/mediajel-frictionless-custom-tag/contents/x",
    ]) {
      expect(isOwnTraffic(url), url).toBe(true);
    }
    expect(isOwnTraffic("https://shop.example.com/api/checkout")).toBe(false);
  });
});

describe("peekTrackerEvent", () => {
  test("reads what the tag sent from a collector payload", () => {
    expect(peekTrackerEvent('{"data":[{"e":"tr","tr_id":"T1"}]}')).toBe("transaction");
    expect(peekTrackerEvent("schema%22%3A%22iglu%3Acom.mediajel.events%2Fsign_up")).toBe("sign-up");
    expect(peekTrackerEvent('{"e":"pv"}')).toBe("pageview");
    expect(peekTrackerEvent("nothing to see")).toBeNull();
  });
});
